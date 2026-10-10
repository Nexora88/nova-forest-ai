/* A transparent global-coordinate smoke demo with live weather and optional NASA FIRMS data. */
(() => {
  function init() {
    const mapElement = document.getElementById("map");
    const host = document.querySelector(".map-section");
    if (!mapElement || !host || typeof L === "undefined" || typeof map === "undefined") return;
    const panel = document.createElement("section");
    panel.className = "global-demo-panel";
    panel.style.cssText = "margin:16px 0;padding:16px;border:1px solid #285a38;border-radius:14px;background:#07100a;color:#dfffe7";
    panel.innerHTML = '<div style="font-weight:800;color:#00ff66;margin-bottom:8px">GLOBAL SCALE TEST</div><p style="margin:0 0 12px;line-height:1.5">Load a sample GeoJSON polygon near Napa Valley, California, request current weather, and check NASA FIRMS for the same bounding box. Missing credentials or unavailable providers are reported explicitly.</p><button type="button" data-global-demo style="min-height:44px;padding:10px 14px;border:1px solid #00ff66;border-radius:9px;background:#06110a;color:#eaffef;font-weight:700">Demo: Global Scale Test · Napa Valley</button><div data-global-demo-status role="status" aria-live="polite" style="margin-top:10px;font-size:13px;color:#a8b9ad">No global demo has been run yet.</div>';
    host.insertAdjacentElement("afterend",panel);
    const status = panel.querySelector("[data-global-demo-status]");
    panel.querySelector("[data-global-demo]").addEventListener("click", async () => {
      // WGS84 sample boundary near Napa Valley, California; intentionally small for a quick map smoke test.
      const geojson = {type:"Feature",properties:{name:"Napa Valley global demo",demo:true},geometry:{type:"Polygon",coordinates:[[[-122.55,38.20],[-122.20,38.20],[-122.20,38.55],[-122.55,38.55],[-122.55,38.20]]]}};
      if (window.nexoraGlobalLayer) map.removeLayer(window.nexoraGlobalLayer);
      window.nexoraGlobalLayer = L.geoJSON(geojson,{style:{color:"#00ff66",weight:3,fillColor:"#00ff66",fillOpacity:.15}}).addTo(map);
      if (window.nexoraGlobalHotspots) map.removeLayer(window.nexoraGlobalHotspots);
      window.nexoraGlobalHotspots = L.layerGroup().addTo(map);
      map.fitBounds(window.nexoraGlobalLayer.getBounds(),{padding:[24,24],maxZoom:10});
      status.textContent = "GeoJSON rendered at Napa Valley, California. Requesting weather and NASA FIRMS status…";
      const apiBase = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/,"");
      const weatherUrl = "https://api.open-meteo.com/v1/forecast?latitude=38.375&longitude=-122.375&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto";
      const firmsUrl = apiBase + "/satellite/firms?west=-122.55&south=38.20&east=-122.20&north=38.55&days=1";
      const [weatherResult,firmsResult] = await Promise.allSettled([
        fetch(weatherUrl).then(response => { if(!response.ok) throw new Error("HTTP " + response.status); return response.json(); }),
        fetch(firmsUrl).then(response => { if(!response.ok) throw new Error("HTTP " + response.status); return response.json(); })
      ]);
      const lines = ["GeoJSON: PASS · Napa Valley, California"];
      if (weatherResult.status === "fulfilled") {
        const current = weatherResult.value.current || {};
        lines.push("Open-Meteo: " + (current.time || "current observation") + " · " + (current.temperature_2m ?? "unavailable") + " °C · humidity " + (current.relative_humidity_2m ?? "unavailable") + "% · wind " + (current.wind_speed_10m ?? "unavailable") + " km/h");
      } else {
        lines.push("Open-Meteo: unavailable (" + (weatherResult.reason?.message || "network error") + "); no weather values were fabricated.");
      }
      if (firmsResult.status === "fulfilled") {
        const firms = firmsResult.value;
        if (firms.status === "available" && Array.isArray(firms.alerts)) {
          firms.alerts.forEach(alert => {
            if (!Number.isFinite(Number(alert.latitude)) || !Number.isFinite(Number(alert.longitude))) return;
            L.circleMarker([Number(alert.latitude),Number(alert.longitude)],{radius:6,color:"#ff453a",weight:1,fillColor:"#ff453a",fillOpacity:.9})
              .bindTooltip("NASA FIRMS · " + (alert.confidence || "confidence unavailable") + " · " + (alert.acq_date || "date unavailable"))
              .addTo(window.nexoraGlobalHotspots);
          });
          lines.push("NASA FIRMS: AVAILABLE · " + firms.alert_count + " hotspot observations for the last day. Zero observations do not prove zero fire risk.");
        } else if (firms.status === "not_configured") {
          lines.push("NASA FIRMS: NOT CONFIGURED · set FIRMS_MAP_KEY in the backend environment to enable real hotspot queries.");
        } else {
          lines.push("NASA FIRMS: " + (firms.status || "unavailable") + (firms.error ? " · " + firms.error : "") + ". No hotspot data is claimed.");
        }
      } else {
        lines.push("NASA FIRMS: backend endpoint unavailable (" + (firmsResult.reason?.message || "network error") + ").");
      }
      lines.push("This demo checks map geometry, current weather, and the provider response only; it is not a trained California fire-risk model or an official alert.");
      status.textContent = lines.join(" · ");
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();