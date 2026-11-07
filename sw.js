

const CACHE_NAME = "nexorawildfire-shell-v34";
const DATA_CACHE = "nexorawildfire-data-v34";

const APP_SHELL = [
  "./",
  "./index.html",
  "./pages/map.html",
  "./pages/bee.html",
  "./pages/areas.html",
  "./pages/weather.html",
  "./pages/satellite.html",
  "./pages/uav-demo.html",
  "./pages/vision.html",
  "./pages/auth.html",
  "./pages/account.html",
  "./pages/enterprise.html",
  "./pages/feedback.html",
  "./pages/about.html",
  "./css/style.css",
  "./css/brand-layout-fix.css?v=20261107a",
  "./css/personal-brief.css?v=20261107a",
  "./css/style.css?v=20261010c",
  "./css/style.css?v=20261022a",
  "./css/style.css?v=20261024a",
  "./css/risk-map-premium.css?v=20261024a",
  "./css/wind-simulation.css?v=20261030a",
  "./css/personal-brief.css?v=20261030a",
  "./css/field-ui.css",
  "./css/field-ui.css?v=20261006",
  "./js/provider-status.js?v=20261020a",
  "./js/i18n.js?v=20261022a",
  "./js/fire-safety-sim.js?v=20261022a",
  "./js/wind-fire-simulation.js?v=20261030a",
  "./js/personal-field-brief.js?v=20261107a",
  "./js/areas.js?v=20261107a",
  "./js/map.js",
  "./js/map.js?v=20261012c",
  "./js/map.js?v=20261017c",
  "./js/map.js?v=20261024a",
  "./js/nova-bee.js?v=20261024a",
  "./js/i18n.js?v=20261024a",
  "./js/live-risk-raster.js?v=20261022a",
  "./js/mobile-nav.js",
  "./js/mobile-nav.js?v=20261012c",
  "./js/i18n.js",
  "./js/i18n.js?v=20261012c",
  "./js/mobile-nav.js?v=20261017b",
  "./js/mobile-nav.js?v=20261017c",
  "./js/auth.js?v=20261017b",
  "./js/i18n.js?v=20261017a",
  "./js/global-demo.js?v=20261017b",
  "./js/ataturk-quotes.js",
  "./js/ataturk-quotes.js?v=20261012c",
  "https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.min.css",
  "https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.min.js",
  "./js/map-intelligence.js",
  "./js/areas.js",
  "./js/notification-ui.js",
  "./js/onboarding.js",
  "./js/dashboard.js",
  "./js/nova-storage.js",
  "./js/nova-offline-engine.js",
  "./js/install-update.js",
  "./js/pwa.js",
  "./js/pwa.js?v=20261010h",
  "./js/edge-ui.js",
  "./js/live-risk-raster.js",
  "./js/nexora-product.js",
  "./css/product-ui.css",
  "./css/product-ui.css?v=20261012a",
  "./css/auth.css",
  "./css/auth.css?v=20261008a",
  "./css/special-days.css",
  "./css/special-days.css?v=20261008a",
  "./js/special-days.js",
  "./assets/nexora-wildfire-logo-fallback.svg",
  "./assets/nexora-wildfire-official.webp",
  "./assets/nexora-wildfire-official.webp",
  "./assets/nexora-wildfire-official.webp?v=20261107b",
  "./assets/nexora-wildfire-logo-fallback.svg?v=20261017c",
  "./assets/nexora-wildfire-official.webp",
  "./assets/nexora-wildfire-official.webp?v=20261017a",
  "./assets/ataturk-1925.jpg",
  "./favicon.png",
  "./manifest.webmanifest",
  "./data/admin/trakya_istanbul_districts.geojson",
  "./data/admin/tur_admin2.geojson",
  "./data/edirne_settlements.geojson",
  "https://unpkg.com/leaflet/dist/leaflet.css",
  "https://unpkg.com/leaflet/dist/leaflet.js"
];

self.addEventListener("install", event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(async cache => {
        // A single optional CDN/legacy asset must not prevent the local app shell from caching.
        await Promise.allSettled(APP_SHELL.map(asset => cache.add(asset)));
      })
      // Updated workers wait until the app explicitly approves activation.
  );
});

self.addEventListener("activate", event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => ![CACHE_NAME, DATA_CACHE].includes(k)).map(k => caches.delete(k)))
    ).then(() => self.clients.claim())
  );
});

function isDataRequest(url) {
  return url.hostname.includes("open-meteo.com") ||
         url.hostname.includes("nominatim.openstreetmap.org") ||
         url.hostname.includes("air-quality-api.open-meteo.com") ||
         url.pathname.includes("/risk") ||
         url.pathname.includes("/forecast-risk") ||
         url.pathname.includes("/ndvi") ||
         url.pathname.includes("/notifications");
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);

  // Never put authenticated or account-scoped responses into a shared origin cache.
  if (request.headers.has("authorization") || request.headers.has("cookie") || /(^|\/)(account|profiles|nexorawildfire_areas|nexorawildfire_push_subscriptions)(\/|$)/i.test(url.pathname)) {
    event.respondWith(fetch(request).catch(() => new Response(
      JSON.stringify({status:"offline",offline:true,message:"Bu hesap verisi çevrimdışıyken sunucudan doğrulanamıyor."}),
      {headers:{"Content-Type":"application/json","Cache-Control":"no-store"},status:503}
    )));
    return;
  }

  if (isDataRequest(url)) {
    event.respondWith(
      fetch(request).then(response => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(DATA_CACHE).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() =>
        caches.match(request).then(cached => cached || new Response(
          JSON.stringify({status:"offline",offline:true,message:"Bağlantı yok. Son geçerli veri mevcutsa yerel önbellekten gösterilir."}),
          {headers:{"Content-Type":"application/json"},status:200}
        ))
      )
    );
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).then(response => {
        const copy = response.clone();
        caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        return response;
      }).catch(() => caches.match(request).then(c => c || caches.match("./index.html")))
    );
    return;
  }

  event.respondWith(
    caches.match(request).then(cached =>
      cached || fetch(request).then(response => {
        if (response.ok && (url.origin === self.location.origin)) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
        }
        return response;
      }).catch(() => cached)
    )
  );
});

self.addEventListener("push", event => {
  let data = {};
  try { data = event.data ? event.data.json() : {}; } catch {}
  const title = data.title || "NexoraWildfire AI";
  const options = {
    body: data.message || "Yeni çevresel uyarı var.",
    icon: data.icon || new URL("./assets/nexora-wildfire-official.webp", self.registration.scope).href,
    badge: data.icon || new URL("./assets/nexora-wildfire-official.webp", self.registration.scope).href,
    tag: data.tag || "nexorawildfire-alert",
    renotify: true,
    data: { url: data.url || "./" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();
  const target = new URL(event.notification.data?.url || "./", self.location.origin).href;
  event.waitUntil(
    clients.matchAll({ type: "window", includeUncontrolled: true }).then(list => {
      for (const client of list) {
        if ("focus" in client) return client.focus();
      }
      if (clients.openWindow) return clients.openWindow(target);
    })
  );
});

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
