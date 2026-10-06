// NOVA-FOREST AI — Live Environmental Risk Map
const REGION_COORDS = {
  "Edirne": [41.6771, 26.5557],
  "Kırklareli": [41.7355, 27.2252],
  "Tekirdağ": [40.9781, 27.5110],
  "Çanakkale": [40.1553, 26.4142],
  "İstanbul Avrupa": [41.1500, 28.6500]
};

const API_BASE = (window.NOVA_API_BASE || "").replace(/\/$/, "");
const map = L.map("map", { zoomControl: true }).setView([41.25, 27.30], 8);

const osm = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18,
  attribution: "&copy; OpenStreetMap contributors"
}).addTo(map);

const satelliteTiles = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18, attribution: "Tiles &copy; Esri" }
);

const overlays = { "Temel Harita": osm, "Uydu Görünümü": satelliteTiles };
L.control.layers(null, overlays, { collapsed: false, position: "topright" }).addTo(map);

const riskLayer = L.layerGroup().addTo(map);
const alertLayer = L.layerGroup().addTo(map);

function riskColor(score) {
  if (score < 25) return "#16c784";
  if (score < 50) return "#f5c542";
  if (score < 75) return "#ff7a18";
  return "#ff3b30";
}

function riskLabel(score) {
  if (score < 25) return "DÜŞÜK";
  if (score < 50) return "ORTA";
  if (score < 75) return "YÜKSEK";
  return "KRİTİK";
}

function calculateRisk(w) {
  let score = 0;
  if (w.temperature >= 40) score += 30;
  else if (w.temperature >= 30) score += 15;
  else if (w.temperature >= 25) score += 7;
  if (w.humidity <= 20) score += 25;
  else if (w.humidity <= 40) score += 10;
  else if (w.humidity <= 55) score += 4;
  if (w.wind >= 40) score += 25;
  else if (w.wind >= 20) score += 10;
  else if (w.wind >= 12) score += 4;
  return Math.min(100, score);
}

function popup(region, score, weather, source = "Open-Meteo") {
  const color = riskColor(score);
  return `
    <div class="risk-popup">
      <div class="popup-kicker">NOVA-FOREST // REGIONAL NODE</div>
      <h3>${region}</h3>
      <div class="popup-score" style="color:${color}">${score}<small>/100</small></div>
      <div class="popup-level" style="border-color:${color};color:${color}">${riskLabel(score)}</div>
      <div class="popup-grid">
        <span>Sıcaklık</span><b>${weather.temperature} °C</b>
        <span>Nem</span><b>${weather.humidity} %</b>
        <span>Rüzgar</span><b>${weather.wind} km/h</b>
      </div>
      <div class="popup-source">Kaynak: ${source}</div>
    </div>`;
}

function renderRegion(region, weather, score, source) {
  const coords = REGION_COORDS[region];
  if (!coords) return;
  const color = riskColor(score);
  const radius = 9000 + score * 180;

  L.circle(coords, {
    radius,
    color,
    weight: 1,
    opacity: 0.35,
    fillColor: color,
    fillOpacity: 0.08
  }).addTo(riskLayer);

  L.circleMarker(coords, {
    radius: 9 + Math.min(score / 12, 6),
    color: "#ffffff",
    weight: 2,
    fillColor: color,
    fillOpacity: 0.92
  }).bindPopup(popup(region, score, weather, source)).addTo(riskLayer);

  L.marker(coords, {
    interactive: false,
    icon: L.divIcon({
      className: "region-label",
      html: `<span>${region}</span><strong>${score}</strong>`,
      iconSize: [140, 42],
      iconAnchor: [-8, 21]
    })
  }).addTo(riskLayer);
}

async function loadBackend() {
  if (!API_BASE) return null;
  const response = await fetch(`${API_BASE}/risk-analysis`, { cache: "no-store" });
  if (!response.ok) throw new Error("Backend risk API unavailable");
  return response.json();
}

async function loadOpenMeteoFallback() {
  const entries = Object.entries(REGION_COORDS);
  const results = await Promise.all(entries.map(async ([region, [lat, lon]]) => {
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", lat);
    url.searchParams.set("longitude", lon);
    url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m");
    url.searchParams.set("timezone", "Europe/Istanbul");
    const response = await fetch(url, { cache: "no-store" });
    if (!response.ok) throw new Error(`Weather failed: ${region}`);
    const data = await response.json();
    const c = data.current || {};
    const weather = {
      temperature: Number(c.temperature_2m ?? 0),
      humidity: Number(c.relative_humidity_2m ?? 0),
      wind: Number(c.wind_speed_10m ?? 0)
    };
    return {
      region,
      weather,
      analysis: {
        risk_score: calculateRisk(weather),
        risk_level: riskLabel(calculateRisk(weather)),
        engine: "Nova-Forest Weather Risk v1",
        ndvi_status: "no_live_ndvi"
      },
      data_source: ["Open-Meteo"]
    };
  }));
  return { regions: results, status: "online", source: "Open-Meteo direct fallback" };
}

async function loadRiskMap() {
  const status = document.querySelector("[data-map-status]");
  try {
    let data;
    let source;
    try {
      data = await loadBackend();
      source = "Nova-Forest API";
    } catch (_) {
      data = await loadOpenMeteoFallback();
      source = "Open-Meteo live fallback";
    }

    riskLayer.clearLayers();
    alertLayer.clearLayers();

    const regions = data.regions || [];
    regions.forEach(r => {
      if (r.weather && r.analysis) renderRegion(
        r.region,
        r.weather,
        Number(r.analysis.risk_score || 0),
        source
      );
    });

    const valid = regions.filter(r => r.analysis);
    const avg = valid.length ? Math.round(valid.reduce((s, r) => s + Number(r.analysis.risk_score || 0), 0) / valid.length) : 0;
    if (status) {
      status.textContent = `LIVE • ${valid.length} BÖLGE • ORTALAMA RİSK ${avg}/100`;
      status.dataset.state = "live";
    }
  } catch (error) {
    console.error("Nova-Forest map:", error);
    if (status) {
      status.textContent = "VERİ BAĞLANTISI KESİLDİ";
      status.dataset.state = "error";
    }
  }
}

loadRiskMap();
setInterval(loadRiskMap, 5 * 60 * 1000);
