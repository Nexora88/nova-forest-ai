/* Live weather panel for the three Thrace pilot provinces. No placeholder values. */
(() => {
  "use strict";
  const regions = [
    { name: "Edirne", latitude: 41.6771, longitude: 26.5557 },
    { name: "Kırklareli", latitude: 41.7355, longitude: 27.2252 },
    { name: "Tekirdağ", latitude: 40.9781, longitude: 27.5110 }
  ];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  const api = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/, "");
  function renderShell() {
    const old = document.querySelector("main .cards");
    if (!old) return null;
    const section = document.createElement("section");
    section.className = "cards thrace-live-weather";
    section.setAttribute("aria-live", "polite");
    section.innerHTML = '<div class="card"><h3>📍 Edirne</h3><strong data-weather="Edirne">Yükleniyor…</strong><p>Sıcaklık · Bağıl nem · Rüzgâr</p><p data-weather-time="Edirne">Open-Meteo sorgulanıyor</p></div>' +
      '<div class="card"><h3>📍 Kırklareli</h3><strong data-weather="Kırklareli">Yükleniyor…</strong><p>Sıcaklık · Bağıl nem · Rüzgâr</p><p data-weather-time="Kırklareli">Open-Meteo sorgulanıyor</p></div>' +
      '<div class="card"><h3>📍 Tekirdağ</h3><strong data-weather="Tekirdağ">Yükleniyor…</strong><p>Sıcaklık · Bağıl nem · Rüzgâr</p><p data-weather-time="Tekirdağ">Open-Meteo sorgulanıyor</p></div>';
    old.replaceWith(section);
    const hero = document.querySelector("main .hero");
    if (hero && !document.getElementById("weatherSourceNote")) {
      const note = document.createElement("p");
      note.id = "weatherSourceNote";
      note.className = "popup-source";
      note.innerHTML = 'Kaynak: <a href="https://open-meteo.com/" target="_blank" rel="noopener noreferrer">Open-Meteo</a>. Değerler seçilen koordinat için sağlayıcının güncel koşullarıdır; istasyon ölçümü veya yangın tahmini değildir.';
      hero.appendChild(note);
    }
    return section;
  }
  async function loadRegion(region) {
    const node = document.querySelector('[data-weather="' + region.name + '"]');
    const timeNode = document.querySelector('[data-weather-time="' + region.name + '"]');
    try {
      const url = new URL("https://api.open-meteo.com/v1/forecast");
      url.searchParams.set("latitude", String(region.latitude));
      url.searchParams.set("longitude", String(region.longitude));
      url.searchParams.set("current", "temperature_2m,relative_humidity_2m,wind_speed_10m");
      url.searchParams.set("timezone", "Europe/Istanbul");
      url.searchParams.set("wind_speed_unit", "kmh");
      const response = await fetch(url.toString(), {cache: "no-store", headers: {Accept: "application/json"}});
      if (!response.ok) throw new Error("Open-Meteo HTTP " + response.status);
      const payload = await response.json();
      const current = payload.current || {};
      const temperature = current.temperature_2m;
      const humidity = current.relative_humidity_2m;
      const wind = current.wind_speed_10m;
      if ([temperature, humidity, wind].some(value => value === null || value === undefined || !Number.isFinite(Number(value)))) throw new Error("Gerekli ölçümler eksik");
      if (node) node.textContent = Number(temperature).toFixed(1) + " °C · " + Number(humidity).toFixed(0) + " % · " + Number(wind).toFixed(1) + " km/sa";
      if (timeNode) {
        const observedAt = current.time ? new Date(current.time) : null;
        timeNode.textContent = "Veri zamanı: " + (observedAt && !Number.isNaN(observedAt.getTime()) ? observedAt.toLocaleString("tr-TR", {dateStyle:"short", timeStyle:"short"}) : "sağlanmadı") + " · Open-Meteo";
      }
    } catch (error) {
      console.warn("Thrace weather unavailable for " + region.name, error);
      if (node) node.textContent = "Veri alınamadı";
      if (timeNode) timeNode.textContent = "Bağlantı/ölçüm sorunu; değer uydurulmadı.";
    }
  }
  function init() {
    if (!renderShell()) return;
    Promise.all(regions.map(loadRegion));
    const status = document.querySelector("header .status");
    if (status) status.innerHTML = "<span></span> TRAKYA CANLI HAVA";
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
