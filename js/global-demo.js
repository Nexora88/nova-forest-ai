/* Global place/coordinate search with live provider checks. No synthetic weather or hotspot values. */
(() => {
  const API_BASE = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/, "");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function init() {
    const mapElement = document.getElementById("map");
    const host = document.querySelector(".map-section");
    if (!mapElement || !host) return;
    const panel = document.createElement("section");
    panel.className = "global-demo-panel";
    panel.style.cssText = "margin:16px 0;padding:16px;border:1px solid #285a38;border-radius:14px;background:#07100a;color:#dfffe7";
    panel.innerHTML = '<div style="font-weight:800;color:#00ff66;margin-bottom:8px">GLOBAL LOCATION / COORDINATES</div><p style="margin:0 0 12px;line-height:1.5">Search a place anywhere in the world or enter latitude and longitude. This checks real current weather and NASA FIRMS coverage for the selected area; it does not claim a trained global fire model.</p><form data-global-form style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px"><label style="display:grid;gap:5px;font-size:12px">Place name<input data-place aria-label="Place name" placeholder="e.g. Napa Valley, California" style="min-height:42px;padding:9px;border-radius:8px;border:1px solid #285a38;background:#020704;color:#eaffef"></label><label style="display:grid;gap:5px;font-size:12px">Latitude<input data-lat type="number" min="-90" max="90" step="any" placeholder="38.375" style="min-height:42px;padding:9px;border-radius:8px;border:1px solid #285a38;background:#020704;color:#eaffef"></label><label style="display:grid;gap:5px;font-size:12px">Longitude<input data-lon type="number" min="-180" max="180" step="any" placeholder="-122.375" style="min-height:42px;padding:9px;border-radius:8px;border:1px solid #285a38;background:#020704;color:#eaffef"></label><button type="submit" style="align-self:end;min-height:42px;padding:10px 14px;border:1px solid #00ff66;border-radius:9px;background:#06110a;color:#eaffef;font-weight:700">Go to location &amp; analyze</button></form><div data-global-demo-status role="status" aria-live="polite" style="margin-top:12px;font-size:13px;color:#a8b9ad">Enter a place or coordinates to request live data.</div>';
    host.insertAdjacentElement("afterend", panel);
    const form = panel.querySelector("[data-global-form]");
    const status = panel.querySelector("[data-global-demo-status]");
    const place = panel.querySelector("[data-place]");
    const latInput = panel.querySelector("[data-lat]");
    const lonInput = panel.querySelector("[data-lon]");
    let marker = null, hotspotLayer = null, polygonLayer = null, requestId = 0;
    function parseCoords() {
      const latText = latInput.value.trim(), lonText = lonInput.value.trim();
      if (!latText && !lonText) return null;
      const lat = Number(latText), lon = Number(lonText);
      if (!latText || !lonText || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error("Latitude must be −90…90 and longitude −180…180.");
      return {lat, lon, label: "Coordinates " + lat + ", " + lon};
    }
    async function geocode(query) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      const response = await fetch(url, {headers: {"Accept-Language": document.documentElement.lang || "en"}});
      if (!response.ok) throw new Error("Place search unavailable (HTTP " + response.status + "). You can enter coordinates instead.");
      const results = await response.json();
      if (!results.length) throw new Error("No place found. Try a more specific name or enter coordinates.");
      return {lat: Number(results[0].lat), lon: Number(results[0].lon), label: results[0].display_name};
    }
    async function run(e) {
      e?.preventDefault();
      const id = ++requestId;
      try {
        let target = parseCoords();
        if (!target) {
          const query = place.value.trim();
          if (!query) throw new Error("Enter a place name or both coordinates.");
          status.textContent = "Searching for location…";
          target = await geocode(query);
        }
        if (id !== requestId) return;
        const {lat, lon, label} = target;
        latInput.value = String(lat); lonInput.value = String(lon);
        if (typeof L !== "undefined" && window.map && typeof window.map.setView === "function") {
          window.map.setView([lat, lon], 10, {animate: true});
          if (marker) window.map.removeLayer(marker);
          marker = L.marker([lat, lon]).addTo(window.map).bindPopup("<b>" + esc(label) + "</b><br>Global live-data check").openPopup();
          if (polygonLayer) window.map.removeLayer(polygonLayer);
        }
        const half = 0.15;
        const west = Math.max(-180, lon-half), east = Math.min(180, lon+half);
        const south = Math.max(-90, lat-half), north = Math.min(90, lat+half);
        if (typeof L !== "undefined" && window.map && typeof window.map.setView === "function") {
          polygonLayer = L.rectangle([[south,west],[north,east]], {color:"#00ff66",weight:2,fillColor:"#00ff66",fillOpacity:.08,dashArray:"5 5"}).addTo(window.map);
          if (hotspotLayer) window.map.removeLayer(hotspotLayer);
          hotspotLayer = L.layerGroup().addTo(window.map);
        }
        status.textContent = "Location selected. Fetching current Open-Meteo weather and NASA FIRMS response…";
        const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
        weatherUrl.search = new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",timezone:"auto"}).toString();
        const firmsUrl = new URL(API_BASE + "/satellite/firms");
        Object.entries({west,south,east,north,days:1}).forEach(([k,v])=>firmsUrl.searchParams.set(k,String(v)));
        const [weatherResult,firmsResult] = await Promise.allSettled([
          fetch(weatherUrl).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}),
          fetch(firmsUrl).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()})
        ]);
        if (id !== requestId) return;
        const lines = ["Location: " + label];
        if (weatherResult.status === "fulfilled") {
          const c = weatherResult.value.current || {};
          lines.push("Open-Meteo live: " + (c.time || "time unavailable") + " · " + (c.temperature_2m ?? "—") + " °C · humidity " + (c.relative_humidity_2m ?? "—") + "% · wind " + (c.wind_speed_10m ?? "—") + " km/h · precipitation " + (c.precipitation ?? "—") + " mm");
        } else lines.push("Open-Meteo unavailable: " + (weatherResult.reason?.message || "network error") + ". No weather values were fabricated.");
        if (firmsResult.status === "fulfilled") {
          const firms = firmsResult.value;
          if (firms.status === "available" && Array.isArray(firms.alerts)) {
            firms.alerts.forEach(a => {
              const aLat = Number(a.latitude), aLon = Number(a.longitude);
              if (!Number.isFinite(aLat) || !Number.isFinite(aLon)) return;
              if (typeof L !== "undefined" && hotspotLayer) L.circleMarker([aLat,aLon],{radius:6,color:"#ff453a",weight:1,fillColor:"#ff453a",fillOpacity:.9})
                .bindTooltip("NASA FIRMS · " + (a.confidence || "confidence unavailable") + " · " + (a.acq_date || "date unavailable"))
                .addTo(hotspotLayer);
            });
            lines.push("NASA FIRMS: AVAILABLE · " + (firms.alert_count ?? firms.alerts.length) + " hotspot observations. No observations do not prove zero risk.");
          } else lines.push("NASA FIRMS: " + (firms.status || "unavailable") + (firms.message ? " · " + firms.message : firms.error ? " · " + firms.error : "") + ". No hotspot data is claimed.");
        } else lines.push("NASA FIRMS endpoint unavailable: " + (firmsResult.reason?.message || "network error") + ".");
        lines.push("This is a provider connectivity check, not an official warning or a validated global prediction.");
        status.textContent = lines.join(" · ");
      } catch (error) {
        status.textContent = error?.message || "Unable to analyze this location.";
      }
    }
    form.addEventListener("submit", run);
    place.addEventListener("keydown", e => { if (e.key === "Enter") run(e); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();
