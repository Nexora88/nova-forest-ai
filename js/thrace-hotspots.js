/* NASA FIRMS 24-hour hotspot overlay for the existing Leaflet map. */
(() => {
  "use strict";
  const API_BASE = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/, "");
  const BBOX = {west:25.5,south:39.5,east:29.5,north:42.2};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, ch => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[ch]));
  function init() {
    const mapElement = document.getElementById("map");
    const host = document.querySelector(".map-section");
    if (!mapElement || !host || !window.L) return;
    const panel = document.createElement("section");
    panel.className = "sources thrace-hotspot-panel";
    panel.style.margin = "12px 0";
    panel.innerHTML = '<h2>NASA FIRMS · Son 24 saat</h2><p data-hotspot-status role="status">Sıcak nokta verisi sorgulanıyor…</p><button type="button" data-hotspot-refresh>Veriyi yenile</button> <small>Termal anomali gözlemleri; doğrulanmış yangın kaydı değildir. Kaynak: NASA FIRMS VIIRS SNPP NRT.</small>';
    host.insertAdjacentElement("afterend", panel);
    const status = panel.querySelector("[data-hotspot-status]");
    const refresh = panel.querySelector("[data-hotspot-refresh]");
    const layer = L.layerGroup();
    let enabled = false;
    const setStatus = message => { if (status) status.textContent = message; };
    async function load() {
      refresh.disabled = true;
      setStatus("NASA FIRMS verisi alınıyor…");
      try {
        const query = new URLSearchParams({...BBOX, days:"1"});
        const response = await fetch(API_BASE + "/satellite/firms?" + query.toString(), {cache:"no-store",headers:{Accept:"application/json"}});
        const payload = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(payload.detail?.message || "API HTTP " + response.status);
        if (payload.status !== "available") {
          layer.clearLayers();
          if (enabled) { map.removeLayer(layer); enabled = false; }
          setStatus(payload.status === "not_configured" ? "NASA FIRMS anahtarı sunucuda yapılandırılmamış; koordinat gösterilmiyor." : "NASA FIRMS verisi şu an kullanılamıyor (" + String(payload.status || "bilinmiyor") + ").");
          return;
        }
        const alerts = Array.isArray(payload.alerts) ? payload.alerts : [];
        layer.clearLayers();
        alerts.forEach(point => {
          const lat = Number(point.latitude), lon = Number(point.longitude);
          if (!Number.isFinite(lat) || !Number.isFinite(lon) || lat < BBOX.south || lat > BBOX.north || lon < BBOX.west || lon > BBOX.east) return;
          const marker = L.circleMarker([lat,lon], {radius:7,color:"#7f1d1d",weight:1.5,fillColor:"#ef4444",fillOpacity:.9});
          const detail = [
            "<strong>NASA FIRMS sıcak nokta</strong>",
            "Koordinat: " + lat.toFixed(4) + ", " + lon.toFixed(4),
            "Tarih: " + esc(point.acq_date || "sağlanmadı"),
            "Saat (UTC): " + esc(point.acq_time || "sağlanmadı"),
            "Güven: " + esc(point.confidence || "sağlanmadı"),
            "FRP: " + esc(point.frp ?? "sağlanmadı"),
            "<small>Termal anomali; saha teyidi değildir.</small>"
          ].join("<br>");
          marker.bindPopup(detail);
          marker.bindTooltip("FIRMS · " + (point.acq_date || "tarih yok"));
          layer.addLayer(marker);
        });
        if (alerts.length && !enabled) { layer.addTo(map); enabled = true; }
        else if (!alerts.length && enabled) { map.removeLayer(layer); enabled = false; }
        const checked = payload.checked_at_utc ? new Date(payload.checked_at_utc).toLocaleString("tr-TR") : "zaman bilgisi yok";
        setStatus(alerts.length + " gözlem alındı · sorgu: " + checked + ". " + (alerts.length ? "Kırmızı noktalar haritada gösteriliyor." : "Bu sorguda gözlem dönmedi; bu, risk olmadığı anlamına gelmez."));
      } catch (error) {
        console.warn("NASA FIRMS hotspot layer unavailable", error);
        setStatus("Sıcak nokta katmanı yüklenemedi; API bağlantısı ve FIRMS yapılandırması kontrol edilmeli.");
      } finally { refresh.disabled = false; }
    }
    refresh.addEventListener("click", load);
    load();
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
