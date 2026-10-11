/* Map planning overlays: user-drawn draft zones and routes. Not official safety guidance. */
(() => {
  const map = window.map;
  if (!map || !window.L || document.getElementById("nx-planning-tools")) return;
  const key = "nexorawildfire-planning-overlays-v1";
  const panel = document.createElement("section");
  panel.id = "nx-planning-tools";
  panel.className = "nx-planning-tools";
  panel.innerHTML = `
    <div class="nx-plan-heading"><span class="nx-plan-pulse"></span><div><strong>SAHA PLANLAMA ARAÇLARI</strong><small>Alan ve hat taslakları · cihazında saklanır</small></div></div>
    <p class="nx-plan-warning">Önemli: Buradaki şekiller kullanıcı tarafından çizilen planlama taslaklarıdır; resmî güvenli bölge, tahliye rotası veya acil durum talimatı değildir. Acil durumda 112 ve yetkili kurumların yönlendirmelerini takip et.</p>
    <div class="nx-plan-actions">
      <button type="button" data-plan="zone">＋ Güvenli alan taslağı</button>
      <button type="button" data-plan="line">／ Hat / rota taslağı</button>
      <button type="button" data-plan="finish" disabled>✓ Çizimi bitir</button>
      <button type="button" data-plan="cancel">İptal</button>
      <button type="button" data-plan="clear">Taslakları temizle</button>
    </div>
    <div class="nx-plan-status" role="status" aria-live="polite">Haritadan alan veya hat çizimi başlat. Kayıt yalnızca bu cihazda tutulur.</div>
    <div class="nx-plan-legend"><span class="zone-key"></span>Alan taslağı <span class="line-key"></span>Hat / rota taslağı</div>`;
  document.querySelector(".map-section")?.insertAdjacentElement("afterend", panel);
  const layer = L.featureGroup().addTo(map);
  const status = panel.querySelector(".nx-plan-status");
  const finish = panel.querySelector('[data-plan="finish"]');
  let mode = null, points = [], preview = null;
  const say = text => { status.textContent = text; };
  const stored = () => { try { return JSON.parse(localStorage.getItem(key) || '{"type":"FeatureCollection","features":[]}'); } catch { return {type:"FeatureCollection",features:[]}; } };
  function paintSaved() {
    layer.clearLayers();
    const data = stored();
    L.geoJSON(data, {style:f => ({color:f.properties?.kind==="zone"?"#00ff88":"#48baff",weight:f.properties?.kind==="zone"?2:4,dashArray:f.properties?.kind==="zone"?"7 5":"10 8",fillColor:"#00ff88",fillOpacity:f.properties?.kind==="zone"?.12:0,className:f.properties?.kind==="zone"?"nx-safe-zone-outline":"nx-animated-route"}), pointToLayer:(f,ll)=>L.circleMarker(ll,{radius:5,color:"#eaffef",fillColor:"#00ff88",fillOpacity:1})}).eachLayer(item => {
      const p = item.feature?.properties || {};
      item.bindPopup("<strong>"+(p.kind==="zone"?"Güvenli alan taslağı":"Hat / rota taslağı")+"</strong><br><small>Resmî güvenlik verisi değildir.</small>");
      layer.addLayer(item);
    });
  }
  function persist(feature) {
    const data = stored(); data.features.push(feature);
    try { localStorage.setItem(key, JSON.stringify(data)); paintSaved(); say("Taslak bu cihaza kaydedildi. Resmî güvenlik alanı veya doğrulanmış rota değildir."); }
    catch { say("Cihaz depolamasına kaydedilemedi. Tarayıcı depolama iznini kontrol et."); }
  }
  function stop(message) {
    mode = null; points = []; finish.disabled = true;
    if (preview) { map.removeLayer(preview); preview = null; }
    map.off("click", onMapClick);
    say(message);
  }
  function start(kind) {
    stop(kind==="zone"?"Alan çizimi başlatıldı. Köşeleri seç, sonra ‘Çizimi bitir’e bas.":"Hat çizimi başlatıldı. En az iki nokta seç, sonra ‘Çizimi bitir’e bas.");
    mode = kind; points = []; finish.disabled = true;
    map.on("click", onMapClick);
  }
  function onMapClick(e) {
    if (!mode) return;
    points.push([e.latlng.lat,e.latlng.lng]);
    if (preview) map.removeLayer(preview);
    if (mode==="zone" && points.length>=2) preview = L.polygon(points,{color:"#00ff88",weight:2,dashArray:"6 5",fillOpacity:.08,className:"nx-safe-zone-outline"}).addTo(map);
    if (mode==="line" && points.length>=2) preview = L.polyline(points,{color:"#48baff",weight:4,dashArray:"10 8",className:"nx-animated-route"}).addTo(map);
    finish.disabled = points.length < (mode==="zone"?3:2);
    say(points.length+" nokta seçildi. Çizimi bitirdiğinde taslak cihazına kaydedilir.");
  }
  function complete() {
    if (!mode || points.length < (mode==="zone"?3:2)) { say(mode==="zone"?"Alan için en az 3 köşe gerekir.":"Hat için en az 2 nokta gerekir."); return; }
    const kind = mode;
    const geometry = kind==="zone" ? {type:"Polygon",coordinates:[[...points.map(([lat,lon])=>[lon,lat]),[points[0][1],points[0][0]]]]} : {type:"LineString",coordinates:points.map(([lat,lon])=>[lon,lat])};
    persist({type:"Feature",geometry,properties:{kind,createdAt:new Date().toISOString(),label:kind==="zone"?"Kullanıcı alan taslağı":"Kullanıcı hat taslağı",official:false}});
    stop("Çizim kaydedildi. Lütfen bunu gerçek güvenlik/tahliye yönlendirmesi olarak kullanma.");
  }
  panel.querySelectorAll("[data-plan]").forEach(btn => btn.addEventListener("click", () => {
    const action=btn.dataset.plan;
    if(action==="zone"||action==="line") start(action);
    else if(action==="finish") complete();
    else if(action==="cancel") stop("Çizim iptal edildi.");
    else if(action==="clear") {
      if(!confirm("Bu cihazdaki tüm alan ve hat taslakları silinsin mi?")) return;
      try { localStorage.removeItem(key); paintSaved(); stop("Bu cihazdaki taslaklar silindi."); }
      catch { say("Taslaklar silinemedi."); }
    }
  }));
  paintSaved();
})();