/* A transparent global-coordinate smoke demo; it does not pretend to provide satellite or ML data. */
(() => {
  function init() {
    const mapElement = document.getElementById("map");
    const host = document.querySelector(".map-section");
    if (!mapElement || !host || typeof L === "undefined" || typeof map === "undefined") return;
    const panel = document.createElement("section");
    panel.className = "global-demo-panel";
    panel.style.cssText = "margin:16px 0;padding:16px;border:1px solid #285a38;border-radius:14px;background:#07100a;color:#dfffe7";
    panel.innerHTML = '<div style="font-weight:800;color:#00ff66;margin-bottom:8px">GLOBAL SCALE TEST</div><p style="margin:0 0 12px;line-height:1.5">Load a sample GeoJSON polygon near Napa Valley, California, and request live weather for its representative coordinate. Satellite and trained-ML availability are reported separately.</p><button type="button" data-global-demo style="min-height:44px;padding:10px 14px;border:1px solid #00ff66;border-radius:9px;background:#06110a;color:#eaffef;font-weight:700">Demo: Global Scale Test · Napa Valley</button><div data-global-demo-status role="status" aria-live="polite" style="margin-top:10px;font-size:13px;color:#a8b9ad">No global demo has been run yet.</div>';
    host.insertAdjacentElement("afterend",panel);
    const status = panel.querySelector("[data-global-demo-status]");
    panel.querySelector("[data-global-demo]").addEventListener("click", async () => {
      // WGS84 sample boundary near Napa Valley, California; intentionally small for a quick map smoke test.
      const geojson = {type:"Feature",properties:{name:"Napa Valley global demo",demo:true},geometry:{type:"Polygon",coordinates:[[[-122.55,38.20],[-122.20,38.20],[-122.20,38.55],[-122.55,38.55],[-122.55,38.20]]]}};
      if (window.nexoraGlobalLayer) map.removeLayer(window.nexoraGlobalLayer);
      window.nexoraGlobalLayer = L.geoJSON(geojson,{style:{color:"#00ff66",weight:3,fillColor:"#00ff66",fillOpacity:.15}}).addTo(map);
      map.fitBounds(window.nexoraGlobalLayer.getBounds(),{padding:[24,24],maxZoom:10});
      status.textContent = "GeoJSON rendered at Napa Valley, California. Requesting current weather…";
      try {
        const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=38.375&longitude=-122.375&current=temperature_2m,relative_humidity_2m,wind_speed_10m&timezone=auto");
        if (!response.ok) throw new Error("Weather provider returned HTTP " + response.status);
        const data = await response.json();
        const current = data.current || {};
        status.textContent = "GeoJSON: PASS · Open-Meteo: " + (current.time || "current observation") + " · Temperature " + (current.temperature_2m ?? "unavailable") + " °C · Humidity " + (current.relative_humidity_2m ?? "unavailable") + "% · Wind " + (current.wind_speed_10m ?? "unavailable") + " km/h. NASA FIRMS, Copernicus processing, and trained ML are not implied by this demo; their configured status must be checked separately.";
      } catch (error) {
        status.textContent = "GeoJSON: PASS · Open-Meteo request unavailable (" + (error?.message || "network error") + "). No weather values were fabricated. Satellite and trained-ML status remain unverified.";
      }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();