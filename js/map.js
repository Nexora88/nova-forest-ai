const API_BASE=(window.NOVA_API_BASE||"").replace(/\/$/,"");
const provincePath=document.location.pathname.includes("/pages/")?"../data/turkiye_iller.geojson":"data/turkiye_iller.geojson";
const districtPath=document.location.pathname.includes("/pages/")?"../data/admin/trakya_istanbul_districts.geojson":"data/admin/trakya_istanbul_districts.geojson";
const TARGET=new Set(["edirne","kirklareli","tekirdag","istanbul"]);
function norm(s){return Array.from(String(s||"").normalize("NFD")).filter(c=>c.charCodeAt(0)<768).join("").toLocaleLowerCase("tr-TR").replaceAll("ı","i")}
const map=L.map("map",{zoomControl:true,doubleClickZoom:true}).setView([41.15,27.1],8);
const base=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap katkıda bulunanlar"}).addTo(map);
const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"Tiles © Esri"});
L.control.layers({"Temel Harita":base,"Uydu":sat},null,{collapsed:false}).addTo(map);

const provinceLayer=L.layerGroup().addTo(map),districtLayer=L.layerGroup().addTo(map),settlementLayer=L.layerGroup().addTo(map),fieldLayer=L.layerGroup().addTo(map);
const historyKey="nova-forest-region-history-v5", areaKey="nova-forest-my-areas-v1";
const palette={risk:["#19a974","#e4c441","#ef8b24","#d9363e"],water:["#d95757","#e7c85a","#67c8d9","#1f9ad6"],crop:["#b94b43","#e09c35","#72a84a","#b7cf4a"],pollen:["#7bc96f","#e3c94b","#e78b3b","#c94a62"],forest:["#d95757","#e09c35","#72a84a","#b7cf4a"]};
let mode="risk",provinceFeatures=[],districtFeatures=[],settlementRows=[],provinceRows=[],districtRows=[],selectedProvince=null,selectedDistrict=null,drawMode=false,drawingPoints=[],drawingLine=null,drawingPolygon=null;

function el(q){return document.querySelector(q)}
function setStatus(t){const x=el("[data-map-status]");if(x)x.textContent=t}
function band(v,kind){if(kind==="risk")return v<25?0:v<50?1:v<75?2:3;if(kind==="water")return v<.12?0:v<.20?1:v<.30?2:3;if(kind==="crop")return v<25?0:v<45?1:v<70?2:3;if(kind==="pollen")return v<20?0:v<60?1:v<120?2:3;return v<25?0:v<50?1:v<75?2:3}
function color(v){return palette[mode][band(Number(v)||0,mode)]}
function label(v,kind){if(kind==="water")return v<.12?"KRİTİK KURU":v<.20?"STRES":v<.30?"NORMAL":"İYİ";if(kind==="crop")return v<25?"STRES":v<45?"DÜŞÜK":v<70?"İYİ":"ÇOK İYİ";if(kind==="pollen")return v<20?"DÜŞÜK":v<60?"ORTA":v<120?"YÜKSEK":"ÇOK YÜKSEK";return v<25?"DÜŞÜK":v<50?"ORTA":v<75?"YÜKSEK":"KRİTİK"}
function riskScore(w,h=0){let s=0;if(w.t>=40)s+=30;else if(w.t>=30)s+=15;else if(w.t>=25)s+=7;if(w.h<=20)s+=25;else if(w.h<=40)s+=10;else if(w.h<=55)s+=4;if(w.wind>=40)s+=25;else if(w.wind>=20)s+=10;else if(w.wind>=12)s+=4;if(w.soil<.18)s+=10;if(h>0)s+=10;return Math.min(100,s)}
function cropScore(w){return Math.max(0,Math.min(100,100-(w.soil<.15?65:w.soil<.2?40:w.soil<.27?15:0)-(w.et0>5?20:w.et0>3?8:0)-(w.vpd>2?12:w.vpd>1.5?5:0)))}
function forestScore(w){return Math.max(0,100-riskScore(w))}
function beeScore(w,pollen=0){let s=100;if(w.t<14||w.t>34)s-=30;if(w.wind>25)s-=35;else if(w.wind>15)s-=15;if(w.precip>1)s-=35;if(pollen>120)s-=5;return Math.max(0,Math.min(100,s))}
function coords(g){const a=[];const walk=x=>{if(typeof x[0]==="number")a.push(x);else x.forEach(walk)};walk(g.coordinates);return a.length?[a.reduce((s,p)=>s+p[1],0)/a.length,a.reduce((s,p)=>s+p[0],0)/a.length]:[41.2,27]}
function hist(name){return JSON.parse(localStorage.getItem(historyKey)||"[]").filter(x=>x.name===name).slice(-5).reverse().map(x=>new Date(x.t).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+" · "+x.r).join("<br>")||"Henüz geçmiş yok."}
function scoreFor(r){return mode==="risk"?r.score:mode==="water"?r.w.soil:mode==="crop"?r.crop:mode==="pollen"?r.pollen:r.forest}
function popup(r,level="province"){const s=scoreFor(r);return '<div class="risk-popup"><div class="popup-kicker">NOVA-FOREST / '+level.toUpperCase()+'</div><h3>'+r.name+'</h3><div class="popup-area">'+(r.area?Math.round(r.area).toLocaleString("tr-TR")+" km²":"Çevresel analiz alanı")+'</div><div class="popup-score" style="color:'+color(s)+'">'+(mode==="water"?Math.round(s*100):Math.round(s))+'<small>/100</small></div><div class="popup-level">'+label(s,mode)+'</div><div class="popup-grid"><span>Sıcaklık</span><b>'+r.w.t+' °C</b><span>Nem</span><b>'+r.w.h+' %</b><span>Rüzgar</span><b>'+r.w.wind+' km/s</b><span>Toprak nemi</span><b>'+Math.round(r.w.soil*100)+' %</b><span>ET₀</span><b>'+r.w.et0.toFixed(1)+' mm</b><span>VPD</span><b>'+r.w.vpd.toFixed(2)+'</b></div><div class="popup-warning"><strong>'+label(s,mode)+'</strong><br>'+modeDescription(mode)+'</div><div class="popup-history"><strong>Geçmiş</strong><br>'+hist(r.name)+'</div><div class="popup-source">Kaynak: Open-Meteo + Nova-Forest karar motoru. Uydu verisi seçili alanın zaman serisine ayrıca bağlanır.</div></div>'}
function modeDescription(m){return m==="risk"?"Çevresel/yangın riski yükseldiğinde kırmızıya gider.":m==="water"?"Yeşil/mavi tonlar yeterli toprak nemini, kırmızı kuraklık stresini gösterir.":m==="crop"?"Bitki yetiştirme koşulu; nem, ET₀ ve VPD birlikte yorumlanır.":m==="pollen"?"Atmosferik polen yüküdür; bitki çeşitliliği anlamına gelmez.":"Bitki sağlığı için şimdilik risk ters skoru; gerçek uydu NDVI/NDMI zaman serisi sonraki katmandır."}
function area(g){return Number(g?.properties?.area_sqkm||0)}
function styleFor(r){return {color:"#102218",weight:1.3,fillColor:color(scoreFor(r)),fillOpacity:.68}}

function controls(){
 let old=el(".map-filters");if(old)old.remove();
 const box=document.createElement("div");box.className="map-filters";
 box.innerHTML='<strong>VERİ KATMANI</strong><div class="filter-buttons"><button data-m="risk" class="on">🔥 Risk</button><button data-m="forest">🌲 Orman</button><button data-m="water">💧 Su / Nem</button><button data-m="crop">🌾 Tarım</button><button data-m="pollen">🌼 Polen</button></div><div class="map-actions"><button data-action="back">← Geri</button><button data-action="add">＋ Alan Ekle</button><a href="'+(document.location.pathname.includes("/pages/")?"areas.html":"pages/areas.html")+'">Alanlarım →</a></div><div class="map-breadcrumb" data-breadcrumb>İL SEVİYESİ</div><div class="legend"><span style="background:#19a974"></span>Düşük / iyi <span style="background:#e4c441"></span>Orta <span style="background:#ef8b24"></span>Yüksek <span style="background:#d9363e"></span>Kritik</div><small>Yeşil her katmanda aynı şeyi ifade etmez. Seçili katmanın anlamı yukarıdaki açıklamaya göre okunur.</small>';
 el(".map-section").appendChild(box);
 box.onclick=e=>{const m=e.target.dataset.m,a=e.target.dataset.action;if(m){mode=m;box.querySelectorAll("[data-m]").forEach(x=>x.classList.toggle("on",x.dataset.m===mode));refreshView();return}if(a==="back")goBack();if(a==="add")toggleDraw()};
}
function breadcrumb(t){const x=el("[data-breadcrumb]");if(x)x.textContent=t}

function drawProvinces(){
 provinceLayer.clearLayers();districtLayer.clearLayers();settlementLayer.clearLayers();
 provinceFeatures.forEach((f,i)=>{const r=provinceRows[i];if(!r)return;L.geoJSON(f,{style:styleFor(r),onEachFeature:(x,l)=>{l.bindTooltip(r.name,{permanent:true,direction:"center",className:"region-label"});l.bindPopup(popup(r,"il"),{maxWidth:360});l.on("click",()=>openProvince(r.name));l.on({mouseover:e=>e.target.setStyle({weight:3,fillOpacity:.9}),mouseout:e=>e.target.setStyle({weight:1.3,fillOpacity:.68})})}}).addTo(provinceLayer)});
 breadcrumb("İL SEVİYESİ");setStatus("CANLI • "+provinceRows.length+" İL • "+mode.toUpperCase());
}
function drawDistricts(){
 provinceLayer.clearLayers();districtLayer.clearLayers();settlementLayer.clearLayers();
 districtFeatures.forEach((f,i)=>{const r=districtRows[i];L.geoJSON(f,{style:styleFor(r),onEachFeature:(x,l)=>{l.bindTooltip(r.name,{permanent:true,direction:"center",className:"region-label region-risk-"+band(scoreFor(r),mode)});l.bindPopup(popup(r,"ilçe"),{maxWidth:360});l.on("click",()=>chooseDistrict(r))}}).addTo(districtLayer)});
 breadcrumb(selectedProvince+" → İLÇELER");setStatus("CANLI • "+districtRows.length+" İLÇE • "+selectedProvince+" • "+mode.toUpperCase());
}
function chooseDistrict(r){
 selectedDistrict=null;
 let old=el(".district-picker");if(old)old.remove();
 const box=document.createElement("div");box.className="district-picker";
 box.innerHTML='<div><strong>İLÇE SEÇ</strong><button data-close>×</button></div><h3>'+r.name+'</h3><p>Bu ilçeyi açmak ve köy/mahalle seviyesine inmek için seç.</p><button class="district-open">İlçeyi aç →</button>';
 el(".map-section").appendChild(box);
 box.querySelector("[data-close]").onclick=()=>box.remove();
 box.querySelector(".district-open").onclick=()=>{box.remove();selectedDistrict=r.name;focusDistrict(r)};
}
async function weatherFor(coordsList){
 if(!coordsList.length)return[];
 const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",coordsList.map(x=>x[0]).join(","));u.searchParams.set("longitude",coordsList.map(x=>x[1]).join(","));u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit");u.searchParams.set("daily","et0_fao_evapotranspiration,precipitation_sum");u.searchParams.set("forecast_days","3");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(x=>x.json());return Array.isArray(j)?j:[j]}
async function pollenAt(lat,lon){try{const u=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);u.searchParams.set("current","alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(x=>x.json());const p=j.current||{};return Math.max(...["alder_pollen","birch_pollen","grass_pollen","mugwort_pollen","olive_pollen","ragweed_pollen"].map(k=>Number(p[k]||0)))}catch{return 0}}
function weatherRow(name,area,w,pollen=0,lat=null,lon=null){const risk=riskScore(w,0);return{name,area,w,score:risk,crop:cropScore(w),forest:forestScore(w),pollen,bee:beeScore(w,pollen),lat,lon}}
async function applyPollen(rows){if(mode!=="pollen")return;await Promise.all(rows.map(async r=>{if(r.lat!=null&&r.lon!=null)r.pollen=await pollenAt(r.lat,r.lon);r.bee=beeScore(r.w,r.pollen)}))}
async function loadProvinceData(){
 try{
  const gj=await fetch(provincePath).then(x=>x.json());
  provinceFeatures=(gj.features||[]).filter(f=>TARGET.has(norm((f.properties||{}).il_adi)));
  const ws=await weatherFor(provinceFeatures.map(f=>coords(f.geometry)));
  provinceRows=provinceFeatures.map((f,i)=>{const p=f.properties||{},c=ws[i]?.current||{},d=ws[i]?.daily||{};const w={t:Number(c.temperature_2m||0),h:Number(c.relative_humidity_2m||0),wind:Number(c.wind_speed_10m||0),soil:Number(c.soil_moisture_0_to_7cm||0),et0:Number(d.et0_fao_evapotranspiration?.[0]||0),vpd:Number(c.vapour_pressure_deficit||0),precip:Number(c.precipitation||0)};const cc=coords(f.geometry);return weatherRow(p.il_adi,area(f.geometry),w,0,cc[0],cc[1])});
  await applyPollen(provinceRows);drawProvinces();saveHistory(provinceRows);
  localStorage.setItem("nova-forest-map-cache-v1",JSON.stringify({savedAt:Date.now(),rows:provinceRows}));
  setStatus("CANLI • "+provinceRows.length+" İL • "+mode.toUpperCase());
 }catch(e){
  try{
   const cached=JSON.parse(localStorage.getItem("nova-forest-map-cache-v1")||"null");
   if(cached?.rows?.length){provinceRows=cached.rows;drawProvinces();setStatus("ÇEVRİMDIŞI • SON GEÇERLİ VERİ • "+new Date(cached.savedAt).toLocaleString("tr-TR"))}
   else setStatus("ÇEVRİMDIŞI • HENÜZ YEREL VERİ YOK");
  }catch{setStatus("ÇEVRİMDIŞI • YEREL VERİ OKUNAMADI")}
 }
}
async function openProvince(name){
 selectedProvince=name;selectedDistrict=null;setStatus("İLÇELER YÜKLENİYOR…");
 const gj=await fetch(districtPath).then(x=>x.json());districtFeatures=(gj.features||[]).filter(f=>norm((f.properties||{}).adm1_name1)===norm(name)||norm((f.properties||{}).adm1_name)===norm(name));
 const ws=await weatherFor(districtFeatures.map(f=>[Number(f.properties.center_lat),Number(f.properties.center_lon)]));
 districtRows=districtFeatures.map((f,i)=>{const p=f.properties||{},c=ws[i]?.current||{},d=ws[i]?.daily||{};const w={t:Number(c.temperature_2m||0),h:Number(c.relative_humidity_2m||0),wind:Number(c.wind_speed_10m||0),soil:Number(c.soil_moisture_0_to_7cm||0),et0:Number(d.et0_fao_evapotranspiration?.[0]||0),vpd:Number(c.vapour_pressure_deficit||0),precip:Number(c.precipitation||0)};return weatherRow(p.adm2_name1,p.area_sqkm,w,0,Number(p.center_lat),Number(p.center_lon))});
 await applyPollen(districtRows);drawDistricts();
 const bounds=L.geoJSON({type:"FeatureCollection",features:districtFeatures}).getBounds();if(bounds.isValid())map.fitBounds(bounds.pad(.08));
}
async function focusDistrict(r){
 const idx=districtRows.findIndex(x=>x.name===r.name);if(idx<0)return;
 const f=districtFeatures[idx],b=L.geoJSON(f).getBounds();if(b.isValid())map.fitBounds(b.pad(.08));
 const [lat,lon]=[r.lat||Number(f.properties.center_lat),r.lon||Number(f.properties.center_lon)];r.pollen=await pollenAt(lat,lon);r.bee=beeScore(r.w,r.pollen);await loadSettlements(r.name,lat,lon);
 const title=el("[data-map-status]");if(title)title.textContent=r.name+" • "+label(scoreFor(r),mode)+" • ALAN EKLE ile kendi parselini kaydedebilirsin";
 L.geoJSON(f,{style:{color:"#00ff66",weight:3,fillOpacity:.12}}).bindPopup(popup(r,"ilçe")).addTo(districtLayer).openPopup();
}
async function pollenFor(coordsList){if(!coordsList.length)return[];try{const u=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");u.searchParams.set("latitude",coordsList.map(x=>x[0]).join(","));u.searchParams.set("longitude",coordsList.map(x=>x[1]).join(","));u.searchParams.set("current","alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(x=>x.json());const arr=Array.isArray(j)?j:[j];return arr.map(q=>{const p=q.current||{};return Math.max(...["alder_pollen","birch_pollen","grass_pollen","mugwort_pollen","olive_pollen","ragweed_pollen"].map(k=>Number(p[k]||0)))})}catch{return coordsList.map(()=>0)}}
async function loadSettlements(district,lat,lon){
  settlementLayer.clearLayers();
  setStatus(district+" • KÖY / MAHALLELER YÜKLENİYOR…");
  try{
    const u=new URL("https://nominatim.openstreetmap.org/search");
    u.searchParams.set("format","jsonv2");u.searchParams.set("limit","80");
    u.searchParams.set("county",district);u.searchParams.set("state",selectedProvince||"");u.searchParams.set("country","Türkiye");
    u.searchParams.set("addressdetails","1");u.searchParams.set("accept-language","tr");
    let rows=await fetch(u,{headers:{"Accept":"application/json"}}).then(x=>x.json());
    rows=rows.filter(x=>["village","hamlet","suburb","neighbourhood","quarter"].includes(x.type)||["village","hamlet","suburb","neighbourhood","quarter"].includes(x.addresstype));
    settlementRows=rows;const pollenValues=mode==="pollen"?await pollenFor(rows.map(x=>[Number(x.lat),Number(x.lon)])):[];
    rows.forEach((x,i)=>{
      const score=mode==="pollen"?Number(pollenValues[i]||0):0;
      const markerColor=mode==="pollen"?palette.pollen[band(score,"pollen")]:"#00ff66";
      const m=L.circleMarker([Number(x.lat),Number(x.lon)],{radius:6,color:markerColor,weight:1,fillColor:markerColor,fillOpacity:.9});
      m.bindTooltip(x.display_name.split(",")[0],{direction:"top"});
      m.bindPopup('<div class="risk-popup"><div class="popup-kicker">NOVA-FOREST / YERLEŞİM</div><h3>'+x.display_name.split(",")[0]+'</h3><div class="popup-warning">Köy / mahalle yerleşim noktası.<br>Çevresel katmanları bu noktaya göre okumak için seçili veri katmanını kullan.</div><div class="popup-source">Kaynak: OpenStreetMap / Nominatim. Yerleşim noktası idari mülkiyet veya parsel sınırı değildir.</div></div>');
      m.addTo(settlementLayer);
    });
    breadcrumb(selectedProvince+" → "+district+" → KÖY / MAHALLE");
    setStatus("CANLI • "+rows.length+" KÖY / MAHALLE • "+district+" • "+mode.toUpperCase());
  }catch(e){settlementRows=[];setStatus(district+" • YERLEŞİM VERİSİ ALINAMADI");}
}
async function refreshView(){
  setStatus("VERİLER YENİLENİYOR…");
  if(selectedDistrict){
    const r=districtRows.find(x=>x.name===selectedDistrict);
    if(r){await focusDistrict(r);return;}
  }
  if(selectedProvince){await openProvince(selectedProvince);return;}
  await loadProvinceData();
}
function goBack(){if(selectedDistrict){selectedDistrict=null;settlementLayer.clearLayers();drawDistricts();return}if(selectedProvince){selectedProvince=null;drawProvinces();map.setView([41.15,27.1],8)}else map.setView([41.15,27.1],8)}
function saveHistory(rows){const old=JSON.parse(localStorage.getItem(historyKey)||"[]");rows.forEach(r=>old.push({t:new Date().toISOString(),name:r.name,r:r.score}));localStorage.setItem(historyKey,JSON.stringify(old.slice(-600)))}

function toggleDraw(){
 drawMode=!drawMode;drawingPoints=[];if(drawingLine)map.removeLayer(drawingLine);if(drawingPolygon)map.removeLayer(drawingPolygon);
 const b=el(".map-filters [data-action='add']");if(b)b.textContent=drawMode?"✓ Noktaları seç":"＋ Alan Ekle";
 if(drawMode){map.doubleClickZoom.disable();setStatus("ALAN ÇİZİMİ • Haritada köşe noktalarına tıkla • son noktada çift tıkla");map.on("click",drawClick)}
 else{map.doubleClickZoom.enable();map.off("click",drawClick)}
}
function drawClick(e){if(!drawMode)return;drawingPoints.push([e.latlng.lat,e.latlng.lng]);if(drawingLine)map.removeLayer(drawingLine);drawingLine=L.polyline(drawingPoints,{color:"#00ff66",weight:2,dashArray:"5 5"}).addTo(map);if(drawingPoints.length>=3){if(drawingPolygon)map.removeLayer(drawingPolygon);drawingPolygon=L.polygon(drawingPoints,{color:"#00ff66",fillOpacity:.16,weight:2}).addTo(map)}}
function finishDraw(){if(!drawMode||drawingPoints.length<3){setStatus("En az 3 nokta gerekli.");return}map.off("click",drawClick);map.doubleClickZoom.enable();const name=prompt("Alan adı","Yeni Tarla");if(!name){toggleDraw();return}const type=prompt("Alan türü: çiftçi / arıcı / orman / genel","çiftçi")||"genel";const areas=JSON.parse(localStorage.getItem(areaKey)||"[]");areas.push({id:Date.now().toString(),name,type:type.toLowerCase(),province:selectedProvince||"Trakya / İstanbul",district:"",coordinates:drawingPoints,createdAt:new Date().toISOString()});localStorage.setItem(areaKey,JSON.stringify(areas));toggleDraw();renderSavedAreas();setStatus("ALAN KAYDEDİLDİ • Alanlarım bölümünden canlı durumunu izle.");}
function renderSavedAreas(){fieldLayer.clearLayers();const areas=JSON.parse(localStorage.getItem(areaKey)||"[]");areas.forEach(a=>{L.polygon(a.coordinates,{color:"#00ff66",weight:2,fillOpacity:.08}).bindTooltip(a.name+" · "+a.type).addTo(fieldLayer)})}
map.on("dblclick",finishDraw);
async function load(){try{await loadProvinceData();controls();renderSavedAreas()}catch(e){console.error(e);setStatus("VERİ AKIŞI BEKLENİYOR")}}
load();setInterval(loadProvinceData,300000);
