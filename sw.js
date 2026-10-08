

const CACHE_NAME = "nexorawildfire-shell-v9";
const DATA_CACHE = "nexorawildfire-data-v9";

const APP_SHELL = [
  "./",
  "./index.html",
  "./pages/map.html",
  "./pages/areas.html",
  "./pages/weather.html",
  "./pages/satellite.html",
  "./pages/about.html",
  "./css/style.css",
  "./css/field-ui.css",
  "./js/map.js",
  "./js/map-intelligence.js",
  "./js/areas.js",
  "./js/notification-ui.js",
  "./js/onboarding.js",
  "./js/dashboard.js",
  "./js/nova-storage.js",
  "./js/nova-offline-engine.js",
  "./js/install-update.js",
  "./js/pwa.js",
  "./js/edge-ui.js",
  "./js/live-risk-raster.js",
  "./js/nexora-product.js",
  "./css/product-ui.css",
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
