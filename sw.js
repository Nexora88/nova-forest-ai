

const CACHE_NAME = "nexorawildfire-shell-v34";
const DATA_CACHE = "nexorawildfire-data-v12";

const APP_SHELL = [
  "./",
  "./index.html",
  "./pages/map.html",
  "./pages/areas.html",
  "./pages/weather.html",
  "./pages/satellite.html",
  "./pages/about.html",
  "./pages/vision.html",
  "./pages/feedback.html",
  "./pages/enterprise.html",
  "./pages/events.html",
  "./pages/legal.html",
  "./pages/auth.html",
  "./pages/account.html",
  "./css/style.css",
  "./css/field-ui.css",
  "./css/evacuation-sim.css?v=20261011b",
  "./js/map.js",
  "./js/evacuation-sim.js?v=20261011d",
  "./js/global-nav.js?v=20261011c",
  "./js/mobile-nav.js?v=20261011c",
  "./js/pwa.js?v=20261011b",
  "https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.min.css",
  "https://unpkg.com/leaflet-gesture-handling@1.2.2/dist/leaflet-gesture-handling.min.js",
  "./js/map-intelligence.js",
  "./js/areas.js",
  "./js/notification-ui.js",
  "./js/onboarding.js",
  "./js/dashboard.js",
  "./js/role-dashboard.js?v=20261011c",
  "./js/map.js?v=20261011b",
  "./js/i18n.js?v=20261011j",
  "./js/i18n-extra.js?v=20261011d",
  "./js/asset-guard.js?v=20261011b",
  "./js/auth.js?v=20261011e",
  "./js/global-demo.js?v=20261011g",
  "./js/nova-storage.js",
  "./js/nova-offline-engine.js",
  "./js/install-update.js",
  "./js/pwa.js",
  "./js/edge-ui.js",
  "./js/live-risk-raster.js",
  "./js/nexora-product.js",
  "./css/product-ui.css",
  "./css/special-days.css",
  "./css/legal.css?v=20261011b",
  "./css/field-events.css?v=20261011b",
  "./js/special-days.js",
  "./js/legal.js?v=20261011e",
  "./js/field-events.js?v=20261011d",
  "./js/ataturk-quotes.js?v=20261010f",
  "./assets/nexora-wildfire-logo.png",
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
      .then(cache => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
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
    icon: data.icon || new URL("./assets/nexora-wildfire-logo.png", self.registration.scope).href,
    badge: data.icon || new URL("./assets/nexora-wildfire-logo.png", self.registration.scope).href,
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
