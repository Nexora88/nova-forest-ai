/* Public-map safety-point discovery. OSM tags are not a guarantee of current or official safety. */
(() => {
  function init() {
    const map = window.map, L = window.L, host = document.querySelector(".map-section");
    if (!map || !L || !host || document.getElementById("nx-safety-points")) return;
    const panel = document.createElement("section");
    panel.id = "nx-safety-points";
    panel.className = "nx-safety-points";
    panel.innerHTML = `
      <div class="nx-safety-head"><span class="nx-safety-pulse" aria-hidden="true"></span><div><strong>HARİTADA KAYITLI GÜVENLİ NOKTALAR</strong><small>Toplanma alanı · barınak · itfaiye</small></div></div>
      <p class="nx-safety-warning">Bu arama OpenStreetMap'e katkı yapan kullanıcıların kaydettiği noktaları gösterir; resmî veya güncel güvenlik garantisi değildir. Haritayı aramak istediğin bölgeye getirip sorgula. Acil durumda 112'yi ara ve yetkili kurumların talimatlarına uy.</p>
      <div class="nx-safety-controls"><label>Arama yarıçapı <select data-safety-radius><option value="5000">5 km</option><option value="10000" selected>10 km</option><option value="25000">25 km</option></select></label><button type="button" data-safety-search>Yakındaki noktaları ara</button><button type="button" data-safety-clear>Katmanı temizle</button></div>
      <div class="nx-safety-status" role="status" aria-live="polite">Harita merkezinin çevresindeki kayıtlı noktaları aramak için düğmeye bas.</div>
      <div class="nx-safety-results" data-safety-results></div>
      <small class="nx-safety-source">Kaynak: OpenStreetMap · kayıtlar eksik veya güncelliğini yitirmiş olabilir.</small>`;
    host.insertAdjacentElement("afterend", panel);
    const status = panel.querySelector("[data-safety-status]");
    const search = panel.querySelector("[data-safety-search]");
    const clear = panel.querySelector("[data-safety-clear]");
    const radius = panel.querySelector("[data-safety-radius]");
    const results = panel.querySelector("[data-safety-results]");
    const layer = L.layerGroup().addTo(map);
    const esc = value => String(value || "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
    let requestId = 0;
    const say = text => { status.textContent = text; };
    clear.addEventListener("click", () => { requestId++; layer.clearLayers(); results.replaceChildren(); say("Güvenli nokta katmanı temizlendi."); });
    search.addEventListener("click", async () => {
      const id = ++requestId;
      const center = map.getCenter();
      const meters = Number(radius.value);
      const lat = center.lat.toFixed(5), lon = center.lng.toFixed(5);
      const query = `[out:json][timeout:25];(nwr(around:${meters},${lat},${lon})["emergency"="assembly_point"];nwr(around:${meters},${lat},${lon})["amenity"="shelter"];nwr(around:${meters},${lat},${lon})["emergency"="shelter"];nwr(around:${meters},${lat},${lon})["amenity"="fire_station"];);out center tags;`;
      search.disabled = true; say("OpenStreetMap kayıtları aranıyor…");
      try {
        const response = await fetch("https://overpass-api.de/api/interpreter", {method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded;charset=UTF-8"},body:"data="+encodeURIComponent(query)});
        if (!response.ok) throw new Error("Harita veri sağlayıcısı HTTP " + response.status + " yanıtı verdi.");
        const data = await response.json();
        if (id !== requestId) return;
        layer.clearLayers(); results.replaceChildren();
        const elements = (data.elements || []).filter(item => {
          const tags = item.tags || {};
          return tags.emergency === "assembly_point" || tags.amenity === "shelter" || tags.emergency === "shelter" || tags.amenity === "fire_station";
        });
        let count = 0;
        for (const item of elements) {
          const lat0 = Number(item.lat ?? item.center?.lat), lon0 = Number(item.lon ?? item.center?.lon);
          if (!Number.isFinite(lat0) || !Number.isFinite(lon0)) continue;
          const tags = item.tags || {};
          const isStation = tags.amenity === "fire_station";
          const kind = isStation ? "İtfaiye" : (tags.emergency === "assembly_point" ? "Toplanma alanı" : "Barınak");
          const label = tags.name || tags["name:tr"] || kind;
          const sourceUrl = "https://www.openstreetmap.org/" + encodeURIComponent(item.type) + "/" + encodeURIComponent(item.id);
          const marker = L.marker([lat0, lon0], {icon:L.divIcon({className:"nx-safety-marker-wrap",html:'<span class="nx-safety-marker '+(isStation?"is-station":"")+'"></span>',iconSize:[20,20],iconAnchor:[10,10]})});
          marker.bindPopup('<strong>'+esc(label)+'</strong><br>'+esc(kind)+'<br><small>OpenStreetMap kaydı · resmî güvenlik onayı değildir</small><br><a href="'+sourceUrl+'" target="_blank" rel="noopener noreferrer">Kaydı incele ↗</a>');
          marker.addTo(layer);
          const row = document.createElement("div"); row.className = "nx-safety-result";
          const strong = document.createElement("strong"); strong.textContent = label;
          const small = document.createElement("small"); small.textContent = kind + " · OpenStreetMap";
          const open = document.createElement("button"); open.type = "button"; open.textContent = "Haritada göster";
          open.addEventListener("click", () => { map.setView([lat0,lon0], Math.max(map.getZoom(),15), {animate:true}); marker.openPopup(); });
          row.append(strong,small,open); results.append(row); count++;
        }
        say(count ? count + " kayıt bulundu. Bunlar harita kayıtlarıdır; güncel güvenli bölge oldukları doğrulanmış değildir." : "Bu yarıçapta eşleşen kayıt bulunamadı. Bu, bölgede güvenli nokta olmadığı anlamına gelmez.");
      } catch (error) {
        if (id === requestId) say((error?.message || "Güvenli nokta verisi alınamadı.") + " Daha sonra tekrar dene.");
      } finally { if (id === requestId) search.disabled = false; }
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true}); else init();
})();