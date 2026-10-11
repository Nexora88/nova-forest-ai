/* Global place/coordinate search with live provider checks. No synthetic weather or hotspot values. */
(() => {
  const API_BASE = (window.NOVA_API_BASE || "https://nova-forest-ai-backend.vercel.app/api").replace(/\/$/, "");
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  const T = (tr, en) => (/^en(?:-|$)/i.test(document.documentElement.dataset.language || document.documentElement.lang || "tr") ? en : tr);
  function init() {
    const mapElement = document.getElementById("map");
    const host = document.querySelector(".map-section");
    if (!mapElement || !host) return;
    const panel = document.createElement("section");
    panel.className = "global-demo-panel";
    panel.style.cssText = "margin:16px 0;padding:16px;border:1px solid #285a38;border-radius:14px;background:#07100a;color:#dfffe7";
    panel.innerHTML = '<div data-tr="KÜRESEL KONUM / KOORDİNATLAR" data-en="GLOBAL LOCATION / COORDINATES" style="font-weight:800;color:#00ff66;margin-bottom:8px">KÜRESEL KONUM / KOORDİNATLAR</div><p data-tr="Dünyanın herhangi bir yerini ara veya enlem-boylam gir. Seçilen alan için güncel hava ve NASA FIRMS kapsamı kontrol edilir; bu, eğitilmiş küresel yangın modeli olduğu iddiası değildir." data-en="Search a place anywhere in the world or enter latitude and longitude. This checks current weather and NASA FIRMS coverage; it does not claim a trained global fire model." style="margin:0 0 12px;line-height:1.5">Dünyanın herhangi bir yerini ara veya enlem-boylam gir. Seçilen alan için güncel hava ve NASA FIRMS kapsamı kontrol edilir; bu, eğitilmiş küresel yangın modeli olduğu iddiası değildir.</p><form data-global-form style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px"><label data-tr="Yer adı" data-en="Place name" style="display:grid;gap:5px;font-size:12px">Yer adı<input data-place aria-label="Yer adı" data-tr-placeholder="Örn. Edirne, Türkiye" data-en-placeholder="e.g. Edirne, Türkiye" placeholder="Örn. Edirne, Türkiye" style="min-height:42px;padding:9px;border-radius:8px;border:1px solid #285a38;background:#020704;color:#eaffef"></label><label data-tr="Enlem" data-en="Latitude" style="display:grid;gap:5px;font-size:12px">Enlem<input data-lat type="number" min="-90" max="90" step="any" placeholder="41.6771" style="min-height:42px;padding:9px;border-radius:8px;border:1px solid #285a38;background:#020704;color:#eaffef"></label><label data-tr="Boylam" data-en="Longitude" style="display:grid;gap:5px;font-size:12px">Boylam<input data-lon type="number" min="-180" max="180" step="any" placeholder="26.5557" style="min-height:42px;padding:9px;border-radius:8px;border:1px solid #285a38;background:#020704;color:#eaffef"></label><button data-tr="Konuma git ve analiz et" data-en="Go to location &amp; analyze" type="submit" style="align-self:end;min-height:42px;padding:10px 14px;border:1px solid #00ff66;border-radius:9px;background:#06110a;color:#eaffef;font-weight:700">Konuma git ve analiz et</button></form><div data-global-demo-status role="status" aria-live="polite" data-tr="Canlı veri istemek için yer adı veya koordinat gir." data-en="Enter a place or coordinates to request live data." style="margin-top:12px;font-size:13px;color:#a8b9ad">Canlı veri istemek için yer adı veya koordinat gir.</div>';
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
      if (!latText || !lonText || !Number.isFinite(lat) || !Number.isFinite(lon) || lat < -90 || lat > 90 || lon < -180 || lon > 180) throw new Error(T("Enlem −90…90, boylam −180…180 aralığında olmalı.","Latitude must be −90…90 and longitude −180…180."));
      return {lat, lon, label: "Coordinates " + lat + ", " + lon};
    }
    async function geocode(query) {
      const url = new URL("https://nominatim.openstreetmap.org/search");
      url.searchParams.set("q", query);
      url.searchParams.set("format", "jsonv2");
      url.searchParams.set("limit", "1");
      const response = await fetch(url, {headers: {"Accept-Language": document.documentElement.lang || "en"}});
      if (!response.ok) throw new Error(T("Yer araması kullanılamıyor (HTTP ","Place search unavailable (HTTP ") + response.status + T("). Bunun yerine koordinat girebilirsin.","). You can enter coordinates instead."));
      const results = await response.json();
      if (!results.length) throw new Error(T("Yer bulunamadı. Daha ayrıntılı ad dene veya koordinat gir.","No place found. Try a more specific name or enter coordinates."));
      return {lat: Number(results[0].lat), lon: Number(results[0].lon), label: results[0].display_name};
    }
    async function run(e) {
      e?.preventDefault();
      const id = ++requestId;
      try {
        let target = parseCoords();
        if (!target) {
          const query = place.value.trim();
          if (!query) throw new Error(T("Yer adı veya iki koordinatı da gir.","Enter a place name or both coordinates."));
          status.textContent = T("Konum aranıyor…","Searching for location…");
          target = await geocode(query);
        }
        if (id !== requestId) return;
        const {lat, lon, label} = target;
        latInput.value = String(lat); lonInput.value = String(lon);
        if (typeof L !== "undefined" && window.map && typeof window.map.setView === "function") {
          window.map.setView([lat, lon], 10, {animate: true});
          if (marker) window.map.removeLayer(marker);
          marker = L.marker([lat, lon]).addTo(window.map).bindPopup("<b>" + esc(label) + "</b><br>" + esc(T("Küresel canlı veri kontrolü","Global live-data check"))).openPopup();
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
        status.textContent = T("Konum seçildi. Güncel Open-Meteo hava verisi ve NASA FIRMS yanıtı alınıyor…","Location selected. Fetching current Open-Meteo weather and NASA FIRMS response…");
        const weatherUrl = new URL("https://api.open-meteo.com/v1/forecast");
        weatherUrl.search = new URLSearchParams({latitude:String(lat),longitude:String(lon),current:"temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",timezone:"auto"}).toString();
        const firmsUrl = new URL(API_BASE + "/satellite/firms", location.origin);
        Object.entries({west,south,east,north,days:1}).forEach(([k,v])=>firmsUrl.searchParams.set(k,String(v)));
        const [weatherResult,firmsResult] = await Promise.allSettled([
          fetch(weatherUrl).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()}),
          fetch(firmsUrl).then(r=>{if(!r.ok)throw new Error("HTTP "+r.status);return r.json()})
        ]);
        if (id !== requestId) return;
        const lines = [T("Konum: ","Location: ") + label];
        if (weatherResult.status === "fulfilled") {
          const c = weatherResult.value.current || {};
          lines.push(T("Open-Meteo canlı: ","Open-Meteo live: ") + (c.time || T("zaman yok","time unavailable")) + " · " + (c.temperature_2m ?? "—") + " °C · " + T("nem ","humidity ") + (c.relative_humidity_2m ?? "—") + "% · " + T("rüzgâr ","wind ") + (c.wind_speed_10m ?? "—") + " km/h · " + T("yağış ","precipitation ") + (c.precipitation ?? "—") + " mm");
        } else lines.push(T("Open-Meteo kullanılamıyor: ","Open-Meteo unavailable: ") + (weatherResult.reason?.message || T("ağ hatası","network error")) + T(". Hava değerleri uydurulmadı.",". No weather values were fabricated."));
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
            lines.push("NASA FIRMS: " + T("KULLANILABİLİR · ","AVAILABLE · ") + (firms.alert_count ?? firms.alerts.length) + T(" sıcak nokta gözlemi. Gözlem olmaması riskin sıfır olduğunu kanıtlamaz."," hotspot observations. No observations do not prove zero risk."));
          } else lines.push("NASA FIRMS: " + (firms.status || T("kullanılamıyor","unavailable")) + (firms.message ? " · " + firms.message : firms.error ? " · " + firms.error : "") + T(". Sıcak nokta verisi olduğu iddia edilmiyor.",". No hotspot data is claimed."));
        } else lines.push(T("NASA FIRMS uç noktası kullanılamıyor: ","NASA FIRMS endpoint unavailable: ") + (firmsResult.reason?.message || T("ağ hatası","network error")) + ".");
        lines.push(T("Bu, veri sağlayıcısı bağlantı kontrolüdür; resmî uyarı veya doğrulanmış küresel tahmin değildir.","This is a provider connectivity check, not an official warning or a validated global prediction."));
        status.textContent = lines.join(" · ");
      } catch (error) {
        status.textContent = error?.message || T("Bu konum analiz edilemedi.","Unable to analyze this location.");
      }
    }
    form.addEventListener("submit", run);
    place.addEventListener("keydown", e => { if (e.key === "Enter") run(e); });
  }
  window.addEventListener("nexora:languagechange", () => {
    const panel = document.querySelector(".global-demo-panel");
    if (!panel) return;
    panel.querySelectorAll("[data-tr][data-en]").forEach(el => {
      if (el.children.length === 0) el.textContent = T(el.dataset.tr, el.dataset.en);
      else {
        const direct = Array.from(el.childNodes).find(n => n.nodeType === Node.TEXT_NODE && n.nodeValue.trim());
        if (direct && Array.from(el.children).every(child => ["INPUT","IMG","SVG"].includes(child.tagName) || child.getAttribute("aria-hidden") === "true")) direct.nodeValue = T(el.dataset.tr, el.dataset.en);
      }
    });
    panel.querySelectorAll("[data-tr-placeholder][data-en-placeholder]").forEach(el => { el.placeholder = T(el.dataset.trPlaceholder, el.dataset.enPlaceholder); });
  });
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();
