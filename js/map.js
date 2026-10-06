const REGION_COORDS = {
  "Edirne": [41.6771, 26.5557],
  "Kırklareli": [41.7355, 27.2252],
  "Tekirdağ": [40.9781, 27.5110],
  "Çanakkale": [40.1553, 26.4142],
  "İstanbul Avrupa": [41.1500, 28.6500]
};

const API_BASE = (window.NOVA_API_BASE || "").replace(/\/$/, "");
const map = L.map("map", { zoomControl: true }).setView([41.25, 27.30], 8);

const baseMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 18, attribution: "&copy; OpenStreetMap katkıda bulunanlar"
}).addTo(map);
const satelliteTiles = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  { maxZoom: 18, attribution: "Tiles &copy; Esri" }
);
L.control.layers(
  {"Temel Harita": baseMap, "Uydu Görünümü": satelliteTiles},
  null, {collapsed:false, position:"topright"}
).addTo(map);

const riskLayer = L.layerGroup().addTo(map);

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
function popup(region, score, weather, satellite, source) {
  const color = riskColor(score);
  const ndvi = satellite && satellite.ndvi != null ? satellite.ndvi : "Henüz hesaplanmadı";
  const scene = satellite && satellite.scene ? "SAHNE BULUNDU" : "SAHNE ARANIYOR";
  return '<div class="risk-popup">' +
    '<div class="popup-kicker">NOVA-FOREST / BÖLGESEL GÖZLEM</div>' +
    '<h3>' + region + '</h3>' +
    '<div class="popup-score" style="color:' + color + '">' + score + '<small>/100</small></div>' +
    '<div class="popup-level" style="border-color:' + color + ';color:' + color + '">' + riskLabel(score) + '</div>' +
    '<div class="popup-grid">' +
    '<span>Sıcaklık</span><b>' + weather.temperature + ' °C</b>' +
    '<span>Nem</span><b>' + weather.humidity + ' %</b>' +
    '<span>Rüzgar</span><b>' + weather.wind + ' km/s</b>' +
    '<span>Sentinel-2</span><b>' + scene + '</b>' +
    '<span>NDVI</span><b>' + ndvi + '</b></div>' +
    '<div class="popup-source">Kaynak: ' + source + '</div></div>';
}
function renderRegion(region, weather, score, satellite, source) {
  const coords = REGION_COORDS[region];
  if (!coords) return;
  const color = riskColor(score);
  const content = popup(region, score, weather, satellite, source);
  L.circle(coords, {
    radius: 9000 + score * 180, color: color, weight: 1, opacity: .45,
    fillColor: color, fillOpacity: .10
  }).bindPopup(content).addTo(riskLayer);
  L.circleMarker(coords, {
    radius: 10 + Math.min(score / 12, 6), color: "#fff", weight: 2,
    fillColor: color, fillOpacity: .95
  }).bindPopup(content).addTo(riskLayer);
  L.marker(coords, {
    interactive: false,
    icon: L.divIcon({
      className: "region-label",
      html: '<span>' + region + '</span><strong>' + score + '</strong>',
      iconSize: [160, 42], iconAnchor: [-8, 21]
    })
  }).addTo(riskLayer);
}
async function loadBackend() {
  if (!API_BASE) throw new Error("API adresi tanımlı değil");
  const r = await fetch(API_BASE + "/risk-analysis", {cache:"no-store"});
  if (!r.ok) throw new Error("Risk API erişilemedi");
  return r.json();
}
async function loadOpenMeteoFallback() {
  const results = await Promise.all(Object.entries(REGION_COORDS).map(async ([region, coords]) => {
    const lat = coords[0], lon = coords[1];
    const u = new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude", lat);
    u.searchParams.set("longitude", lon);
    u.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m");
    u.searchParams.set("timezone", "Europe/Istanbul");
    const r = await fetch(u.toString(), {cache:"no-store"});
    if (!r.ok) throw new Error("Hava verisi alınamadı: " + region);
    const c = (await r.json()).current || {};
    const weather = {
      temperature: Number(c.temperature_2m ?? 0),
      humidity: Number(c.relative_humidity_2m ?? 0),
      wind: Number(c.wind_speed_10m ?? 0)
    };
    const score = calculateRisk(weather);
    return {
      region: region, weather: weather,
      analysis: {risk_score: score, risk_level: riskLabel(score)},
      satellite: {status:"Yedek akış", ndvi:null},
      data_source: ["Open-Meteo"]
    };
  }));
  return {regions: results, source:"Open-Meteo canlı yedek akış"};
}
async function loadRiskMap() {
  const status = document.querySelector("[data-map-status]");
  try {
    let data, source;
    try { data = await loadBackend(); source = "Nova-Forest API"; }
    catch (_) { data = await loadOpenMeteoFallback(); source = "Open-Meteo canlı yedek akış"; }
    riskLayer.clearLayers();
    (data.regions || []).forEach(function(r) {
      if (r.weather && r.analysis) renderRegion(
        r.region, r.weather, Number(r.analysis.risk_score || 0), r.satellite || {}, source
      );
    });
    const valid = (data.regions || []).filter(function(r) { return r.analysis; });
    const avg = valid.length ? Math.round(valid.reduce(function(s,r) {
      return s + Number(r.analysis.risk_score || 0);
    },0) / valid.length) : 0;
    if (status) {
      status.textContent = "CANLI • " + valid.length + " BÖLGE • ORTALAMA RİSK " + avg + "/100";
      status.dataset.state = "live";
    }
  } catch (e) {
    console.error("Nova-Forest harita:", e);
    if (status) {
      status.textContent = "VERİ YÜKLENEMEDİ — YENİDEN DENENİYOR";
      status.dataset.state = "error";
    }
  }
}
loadRiskMap();
setInterval(loadRiskMap, 300000);
