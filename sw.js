

const CACHE_NAME = "nexorawildfire-shell-v5";
const DATA_CACHE = "nexorawildfire-data-v5";

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
  "./js/install-update.js",`n  "./js/pwa.js",
  "./js/edge-ui.js",
  "./js/nexora-product.js",
  "./css/product-ui.css",
  "./assets/nexora-mark.svg",
  "./assets/nexora-logo.png",`n  "./assets/nexora-wildfire-logo.png",
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

self.addEventListener("message", event => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});
