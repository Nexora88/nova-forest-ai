const API_BASE=(window.NOVA_API_BASE||(location.hostname.endsWith("github.io")?"https://nova-forest-ai.vercel.app/api":"/api")).replace(/\/$/,"");
const provincePath=document.location.pathname.includes("/pages/")?"../data/turkiye_iller.geojson":"data/turkiye_iller.geojson";
const districtPath=document.location.pathname.includes("/pages/")?"../data/admin/tur_admin2.geojson":"data/admin/tur_admin2.geojson";
const edirneSettlementPath=document.location.pathname.includes("/pages/")?"../data/edirne_settlements.geojson":"data/edirne_settlements.geojson";
const ACTIVE_PROVINCES=new Set(["Edirne","Tekirdağ","Kırklareli","Çanakkale","İstanbul"].map(x=>norm(x)));
const TARGET=new Set(["adana","adiyaman","afyonkarahisar","agri","amasya","ankara","antalya","artvin","aydin","balikesir","bilecik","bingol","bitlis","bolu","burdur","bursa","canakkale","cankiri","corum","denizli","diyarbakir","edirne","elazig","erzincan","erzurum","eskisehir","gaziantep","giresun","gumushane","hakkari","hatay","isparta","istanbul","izmir","kahramanmaras","karabuk","karaman","kars","kastamonu","kayseri","kirikkale","kirklareli","kirsehir","kilis","kocaeli","konya","kutahya","malatya","manisa","mardin","mersin","mugla","mus","nevsehir","nigde","ordu","osmaniye","rize","sakarya","samsun","siirt","sinop","sivas","sirnak","tekirdag","tokat","trabzon","tunceli","sanliurfa","usak","van","yalova","yozgat","zonguldak","duzce"]);
function norm(s){return Array.from(String(s||"").normalize("NFD")).filter(c=>c.charCodeAt(0)<768).join("").toLocaleLowerCase("tr-TR").replaceAll("ı","i")}
const isMobile=matchMedia("(max-width: 700px)").matches; const mapLang=()=>document.documentElement.dataset.language||localStorage.getItem("nexorawildfire-language-v1")||"tr"; const gestureText=()=>mapLang()==="en"?{touch:"Use two fingers to move the map",scroll:"Use ctrl + scroll to zoom the map",scrollMac:"Use ⌘ + scroll to zoom the map"}:{touch:"Haritayı hareket ettirmek için iki parmağını kullan",scroll:"Haritayı yakınlaştırmak için Ctrl + kaydır",scrollMac:"Haritayı yakınlaştırmak için ⌘ + kaydır"}; const map=L.map("map",{zoomControl:true,doubleClickZoom:!isMobile,dragging:!isMobile,scrollWheelZoom:!isMobile,touchZoom:true,gestureHandling:isMobile,gestureHandlingOptions:{text:gestureText()}}).setView([41.15,27.1],8); let radarLayer=null; let radarEnabled=false; if(isMobile){map.touchZoom.enable();map.doubleClickZoom.disable();map.scrollWheelZoom.disable();if(!map.gestureHandling)map.dragging.disable();} const exifParams=new URLSearchParams(location.search);const exifLat=Number(exifParams.get("lat")),exifLon=Number(exifParams.get("lon"));if(exifParams.get("source")==="exif"&&Number.isFinite(exifLat)&&Number.isFinite(exifLon)&&Math.abs(exifLat)<=90&&Math.abs(exifLon)<=180){map.setView([exifLat,exifLon],14);L.marker([exifLat,exifLon]).addTo(map).bindPopup((mapLang()==="en"?"Photo EXIF location":"Fotoğraf EXIF konumu")+"<br>"+exifLat.toFixed(6)+", "+exifLon.toFixed(6)).openPopup();}
const refreshGestureLanguage=()=>{map.options.gestureHandlingOptions={...(map.options.gestureHandlingOptions||{}),text:gestureText()};const root=document.getElementById("map");if(root)root.querySelectorAll("*").forEach(node=>{if(node.children.length===0){const t=node.textContent.trim().toLowerCase();if(t.includes("two fingers")||t.includes("2 parmak")||t.includes("ctrl + scroll")||t.includes("ctrl + kaydır")||t.includes("⌘ + scroll")||t.includes("⌘ + kaydır"))node.textContent=t.includes("finger")||t.includes("parmak")?gestureText().touch:(t.includes("⌘")?gestureText().scrollMac:gestureText().scroll);}});};new MutationObserver(refreshGestureLanguage).observe(document.documentElement,{attributes:true,attributeFilter:["data-language"]});document.addEventListener("click",event=>{if(event.target.closest("#nexora-language-toggle"))queueMicrotask(refreshGestureLanguage);},true);
const base=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap katkıda bulunanlar"}).addTo(map);
const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"Tiles © Esri"});
const dark=L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png",{maxZoom:19,subdomains:"abcd",attribution:"© OpenStreetMap © CARTO"});
const light=L.tileLayer("https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png",{maxZoom:19,subdomains:"abcd",attribution:"© OpenStreetMap © CARTO"});
const topo=L.tileLayer("https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png",{maxZoom:17,attribution:"© OpenStreetMap contributors · © OpenTopoMap (CC-BY-SA)"});
const humanitarian=L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap contributors · Humanitarian style"});
L.control.layers({"OSM · Standart":base,"Uydu · Esri":sat,"Karanlık · CARTO":dark,"Açık · CARTO":light,"Topoğrafya · OpenTopoMap":topo,"İnsani harita · HOT":humanitarian},null,{collapsed:true,position:"topright"}).addTo(map);
const scan=document.createElement("div");scan.className="nova-satellite-scan";scan.innerHTML="<span>UYDU ANALİZİ • VECTOR OVERLAY • OFFLINE SINIRLAR</span><i></i>";document.querySelector(".map-section")?.appendChild(scan);
map.on("baselayerchange",e=>scan.classList.toggle("active",e.name.startsWith("Uydu")));

const provinceLayer=L.layerGroup().addTo(map),districtLayer=L.layerGroup().addTo(map),settlementLayer=L.layerGroup().addTo(map),fieldLayer=L.layerGroup().addTo(map);
const historyKey="nexorawildfire-region-history-v5", areaKey="nexorawildfire-my-areas-v1";
const palette={risk:["#00ff66","#ffe600","#ff7a00","#ff1744"],water:["#38bdf8","#00e5ff","#2563eb","#7c3aed"],crop:["#84cc16","#facc15","#fb923c","#f43f5e"],pollen:["#fef08a","#f59e0b","#ec4899","#a855f7"],forest:["#5cff8d","#38bdf8","#a78bfa","#ff4d6d"]};
let mode="risk",provinceFeatures=[],districtFeatures=[],settlementRows=[],provinceRows=[],districtRows=[],selectedProvince=null,selectedDistrict=null,selectedField=null,drawMode=false,drawingPoints=[],drawingLine=null,drawingPolygon=null;

function el(q){return document.querySelector(q)}
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function validSavedArea(a){return !!a&&a.id!=null&&typeof a.name==="string"&&Array.isArray(a.coordinates)&&a.coordinates.length>=3&&a.coordinates.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))&&Math.abs(Number(p[0]))<=90&&Math.abs(Number(p[1]))<=180)}
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
function popup(r,level="province"){
 if(r.dataAvailable===false)return '<div class="risk-popup"><div class="popup-kicker">NEXORAWILDFIRE / '+escapeHtml(level.toUpperCase())+'</div><h3>'+escapeHtml(r.name)+'</h3><div class="popup-warning">'+(mapLang()==="en"?"Live weather data is not available yet. This is not a zero-risk result; the province boundary is shown while data loads.":"Canlı hava verisi henüz alınmadı. Bu, riskin sıfır olduğu anlamına gelmez; veri yüklenirken il sınırı gösteriliyor.")+'</div></div>';
 const s=scoreFor(r);
 const action=(level==="province"||level==="il")
  ? '<button type="button" class="map-drill-button" data-open-province>İlçeleri aç →</button>'
  : level==="ilçe"
   ? '<button type="button" class="map-drill-button" data-open-district>İlçeyi aç · köy/mahalleleri göster →</button>'
   : "";
 return '<div class="risk-popup"><div class="popup-kicker">NEXORAWILDFIRE / '+level.toUpperCase()+'</div><h3>'+escapeHtml(r.name)+'</h3><div class="popup-area">'+(r.area?Math.round(r.area).toLocaleString("tr-TR")+" km²":"Çevresel analiz alanı")+'</div><div class="popup-score" style="color:'+color(s)+'">'+(mode==="water"?Math.round(s*100):Math.round(s))+'<small>/100</small></div><div class="popup-level">'+label(s,mode)+'</div><div class="popup-grid"><span>Sıcaklık</span><b>'+r.w.t+' °C</b><span>Nem</span><b>'+r.w.h+' %</b><span>Rüzgar</span><b>'+r.w.wind+' km/s</b><span>Toprak nemi</span><b>'+Math.round(r.w.soil*100)+' %</b><span>ET₀</span><b>'+r.w.et0.toFixed(1)+' mm</b><span>VPD</span><b>'+r.w.vpd.toFixed(2)+'</b></div><div class="popup-warning"><strong>'+label(s,mode)+'</strong><br>'+modeDescription(mode)+'</div><div class="popup-history"><strong>Geçmiş</strong><br>'+hist(r.name)+'</div>'+action+'<div class="popup-source">Kaynak: Open-Meteo + NexoraWildfire karar motoru. Uydu verisi seçili alanın zaman serisine ayrıca bağlanır.</div></div>';
}
function modeDescription(m){return m==="risk"?"Çevresel/yangın riski yükseldiğinde kırmızıya gider.":m==="water"?"Yeşil/mavi tonlar yeterli toprak nemini, kırmızı kuraklık stresini gösterir.":m==="crop"?"Bitki yetiştirme koşulu; nem, ET₀ ve VPD birlikte yorumlanır.":m==="pollen"?"Atmosferik polen yüküdür; bitki çeşitliliği anlamına gelmez.":"Bitki sağlığı için şimdilik risk ters skoru; gerçek uydu NDVI/NDMI zaman serisi sonraki katmandır."}
function num(v){const n=Number(String(v??0).replace(",","."));return Number.isFinite(n)?n:0}
function area(g){return num(g?.properties?.area_sqkm)}
function styleFor(r,forceSupported=false){const supported=forceSupported||ACTIVE_PROVINCES.has(norm(r.name));if(r.dataAvailable===false)return{color:supported?"#50745c":"#667085",weight:supported?1.5:.9,fillColor:supported?"#355640":"#667085",fillOpacity:supported ? 0.26 : 0.18,dashArray:"4 5"};return supported?{color:"#102218",weight:1.3,fillColor:color(scoreFor(r)),fillOpacity:.68}:{color:"#667085",weight:.9,fillColor:"#667085",fillOpacity:.24,dashArray:"3 4"}}

function enableMobileMapGesture(){
 if(!isMobile)return;
 map.touchZoom.enable(); map.scrollWheelZoom.disable();
 // GestureHandling uses two fingers for map pan/zoom and leaves one-finger swipes to the page.
 if(map.gestureHandling){map.gestureHandling.enable();} else {map.dragging.disable();}
}
function controls(){
 let old=el(".map-filters");if(old)old.remove();
 const box=document.createElement("div");box.className="map-filters";
 box.innerHTML='<div class="map-filters-head"><strong>İLÇE SEÇİMİ / KATMANLAR</strong><button type="button" class="map-panel-close" data-panel-close aria-label="Harita panelini kapat" title="Paneli kapat">×</button></div><div class="filter-buttons"><button data-action="radar" aria-pressed="false">🌧 Radar</button><button data-m="risk" class="on">🔥 Risk</button><button data-m="forest">🌲 Orman</button><button data-m="water">💧 Su / Nem</button><button data-m="crop">🌾 Tarım</button><button data-m="pollen">🌼 Polen</button></div><div class="map-actions"><button data-action="back">← Geri</button><button data-action="add">＋ Alan Ekle</button><a href="'+(document.location.pathname.includes("/pages/")?"areas.html":"pages/areas.html")+'">Alanlarım →</a></div><div class="map-breadcrumb" data-breadcrumb>İL SEVİYESİ</div><div class="legend"><span style="background:#19a974"></span>Düşük / iyi <span style="background:#e4c441"></span>Orta <span style="background:#ef8b24"></span>Yüksek <span style="background:#d9363e"></span>Kritik</div><small>Yeşil her katmanda aynı şeyi ifade etmez. Seçili katmanın anlamı yukarıdaki açıklamaya göre okunur.</small>';
 const section=el(".map-section"),mapNode=el("#map");if(mapNode&&mapNode.parentNode===section)section.insertBefore(box,mapNode);else section.appendChild(box);
 box.onclick=e=>{if(e.target.closest("[data-panel-close]")){box.hidden=true;let toggle=section.querySelector(".map-panel-reopen");if(!toggle){toggle=document.createElement("button");toggle.type="button";toggle.className="map-panel-reopen";toggle.textContent=mapLang()==="en"?"☷ Map controls":"☷ Harita kontrollerini aç";toggle.setAttribute("aria-label",mapLang()==="en"?"Open map controls":"Harita kontrollerini aç");toggle.onclick=()=>{box.hidden=false;toggle.remove()};section.appendChild(toggle)}return}const m=e.target.dataset.m,a=e.target.dataset.action;if(a==="radar"){toggleRainRadar(box);return}if(m){mode=m;box.querySelectorAll("[data-m]").forEach(x=>x.classList.toggle("on",x.dataset.m===mode));refreshView();return}if(a==="back")goBack();if(a==="add")toggleDraw()};
}

async function toggleRainRadar(box){
 const button=box.querySelector('[data-action="radar"]');
 if(radarEnabled&&radarLayer){map.removeLayer(radarLayer);radarLayer=null;radarEnabled=false;button?.classList.remove("on");button?.setAttribute("aria-pressed","false");setStatus(mapLang()==="en"?"RADAR OFF":"RADAR KAPALI");return}
 if(button){button.disabled=true;button.textContent=mapLang()==="en"?"Loading radar…":"Radar yükleniyor…"}
 try{
  const response=await fetch("https://api.rainviewer.com/public/weather-maps.json",{cache:"no-store"});
  if(!response.ok)throw new Error("radar metadata unavailable");
  const data=await response.json();
  const frame=data?.radar?.past?.slice(-1)[0]||data?.radar?.nowcast?.[0];
  if(!frame?.path)throw new Error("no radar frame");
  const host=String(data.host||"https://tilecache.rainviewer.com").replace(/\/$/,"");
  radarLayer=L.tileLayer(host+frame.path+"/256/{z}/{x}/{y}/2/1_1.png",{opacity:.62,attribution:'RainViewer radar',maxZoom:12});
  radarLayer.addTo(map);radarEnabled=true;button?.classList.add("on");button?.setAttribute("aria-pressed","true");
  setStatus((mapLang()==="en"?"RADAR FRAME · ":"RADAR KARESİ · ")+new Date(Number(frame.time)*1000).toLocaleTimeString(mapLang()==="en"?"en-GB":"tr-TR",{hour:"2-digit",minute:"2-digit"}));
 }catch(error){console.warn("Rain radar unavailable",error);setStatus(mapLang()==="en"?"RADAR UNAVAILABLE · CHECK CONNECTION":"RADAR KULLANILAMIYOR · BAĞLANTIYI KONTROL ET")}
 finally{if(button){button.disabled=false;button.textContent=(mapLang()==="en"?"🌧 Radar":"🌧 Radar")}}
}
function breadcrumb(t){const x=el("[data-breadcrumb]");if(x)x.textContent=t}

function drawProvinces(){
 provinceLayer.clearLayers();districtLayer.clearLayers();settlementLayer.clearLayers();
 provinceFeatures.forEach((f,i)=>{const r=provinceRows[i];if(!r)return;L.geoJSON(f,{style:styleFor(r),onEachFeature:(x,l)=>{if(ACTIVE_PROVINCES.has(norm(r.name))){l.bindTooltip(r.name,{permanent:true,direction:"center",className:"region-label"});l.bindPopup(popup(r,"il"),{maxWidth:360});l.on("popupopen",e=>{const b=e.popup.getElement()?.querySelector("[data-open-province]");if(b)b.addEventListener("click",()=>openProvince(r.name),{once:true})})}else{l.bindTooltip(r.name+' · Yakında',{permanent:true,direction:"center",className:"region-label region-label-muted"});l.on("click",()=>window.NexoraFeedback?.comingSoon(r.name))}l.on({mouseover:e=>e.target.setStyle(ACTIVE_PROVINCES.has(norm(r.name))?{weight:3,fillOpacity:.9}:{weight:1.2,fillOpacity:.32}),mouseout:e=>e.target.setStyle(styleFor(r))})}}).addTo(provinceLayer)});
 breadcrumb("İL SEVİYESİ");setStatus("CANLI • "+provinceRows.length+" İL • "+mode.toUpperCase());
}
function drawDistricts(){
 provinceLayer.clearLayers();districtLayer.clearLayers();settlementLayer.clearLayers();
 districtFeatures.forEach((f,i)=>{const r=districtRows[i];L.geoJSON(f,{style:styleFor(r,true),onEachFeature:(x,l)=>{l.bindTooltip(r.name,{permanent:true,direction:"center",className:"region-label region-"+mode+"-"+band(scoreFor(r),mode)});l.bindPopup(popup(r,"ilçe"),{maxWidth:360});l.on("popupopen",e=>{const b=e.popup.getElement()?.querySelector("[data-open-district]");if(b)b.addEventListener("click",()=>{selectedDistrict=r.name;focusDistrict(r)},{once:true})})}}).addTo(districtLayer)});
 breadcrumb(selectedProvince+" → İLÇELER");setStatus("CANLI • "+districtRows.length+" İLÇE • "+selectedProvince+" • "+mode.toUpperCase());
}
function chooseDistrict(r){selectedDistrict=r.name;focusDistrict(r)}
async function weatherFor(coordsList){
 if(!coordsList.length)return[];
 const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",coordsList.map(x=>x[0]).join(","));u.searchParams.set("longitude",coordsList.map(x=>x[1]).join(","));u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit");u.searchParams.set("daily","et0_fao_evapotranspiration,precipitation_sum");u.searchParams.set("forecast_days","3");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(x=>x.json());return Array.isArray(j)?j:[j]}
async function pollenAt(lat,lon){try{const u=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);u.searchParams.set("current","alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(x=>x.json());const p=j.current||{};return Math.max(...["alder_pollen","birch_pollen","grass_pollen","mugwort_pollen","olive_pollen","ragweed_pollen"].map(k=>Number(p[k]||0)))}catch{return 0}}
function weatherRow(name,area,w,pollen=0,lat=null,lon=null){const risk=riskScore(w,0);return{name,area,w,score:risk,crop:cropScore(w),forest:forestScore(w),pollen,bee:beeScore(w,pollen),lat,lon}}
async function applyPollen(rows){if(mode!=="pollen")return;await Promise.all(rows.map(async r=>{if(r.lat!=null&&r.lon!=null)r.pollen=await pollenAt(r.lat,r.lon);r.bee=beeScore(r.w,r.pollen)}))}
async function loadProvinceData(){
 try{
  // Draw the local administrative geometry before any remote weather request.
  const gj=await fetch(provincePath,{cache:"force-cache"}).then(response=>{if(!response.ok)throw new Error("Yerel il sınırı dosyası okunamadı");return response.json()});
  provinceFeatures=Array.isArray(gj.features)?gj.features:[];
  const cached=(()=>{try{return JSON.parse(localStorage.getItem("nexorawildfire-map-cache-v1")||"null")}catch{return null}})();
  if(cached?.rows?.length){
    const byName=new Map(cached.rows.map(row=>[norm(row.name),row]));
    provinceRows=provinceFeatures.map(f=>byName.get(norm(f.properties?.il_adi))||{...weatherRow(f.properties?.il_adi,area(f.geometry),{t:0,h:0,wind:0,soil:0,et0:0,vpd:0,precip:0},0,...coords(f.geometry)),dataAvailable:false});
  }else{
    provinceRows=provinceFeatures.map(f=>({...weatherRow(f.properties?.il_adi,area(f.geometry),{t:0,h:0,wind:0,soil:0,et0:0,vpd:0,precip:0},0,...coords(f.geometry)),dataAvailable:false}));
  }
  drawProvinces();
  controls();
  renderSavedAreas();
  setStatus(mapLang()==="en"?"BOUNDARIES READY · LOADING LIVE DATA":"SINIRLAR HAZIR · CANLI VERİ BEKLENİYOR");
  const pilotFeatures=provinceFeatures.filter(f=>ACTIVE_PROVINCES.has(norm((f.properties||{}).il_adi)));
  const ws=await weatherFor(pilotFeatures.map(f=>coords(f.geometry)));
  const weatherByProvince=new Map();
  pilotFeatures.forEach((f,i)=>{
    const c=ws[i]?.current||{},d=ws[i]?.daily||{};
    // Missing required weather fields are unavailable data, never zero-risk readings.
    if(c.temperature_2m==null||c.relative_humidity_2m==null||c.wind_speed_10m==null)return;
    weatherByProvince.set(norm(f.properties?.il_adi),{t:Number(c.temperature_2m),h:Number(c.relative_humidity_2m),wind:Number(c.wind_speed_10m),soil:Number(c.soil_moisture_0_to_7cm??0),et0:Number(d.et0_fao_evapotranspiration?.[0]??0),vpd:Number(c.vapour_pressure_deficit??0),precip:Number(c.precipitation??0)});
  });
  provinceRows=provinceFeatures.map(f=>{
    const p=f.properties||{},cc=coords(f.geometry),w=weatherByProvince.get(norm(p.il_adi));
    if(!w)return {...weatherRow(p.il_adi,area(f.geometry),{t:0,h:0,wind:0,soil:0,et0:0,vpd:0,precip:0},0,cc[0],cc[1]),dataAvailable:false};
    return {...weatherRow(p.il_adi,area(f.geometry),w,0,cc[0],cc[1]),dataAvailable:true};
  });
  await applyPollen(provinceRows);
  drawProvinces();saveHistory(provinceRows);
  localStorage.setItem("nexorawildfire-map-cache-v1",JSON.stringify({savedAt:Date.now(),rows:provinceRows}));
  setStatus(mapLang()==="en"?"LIVE · 5 PILOT PROVINCES · "+mode.toUpperCase():"CANLI · 5 PİLOT İL · "+mode.toUpperCase());
 }catch(e){
  console.warn("Risk map data refresh",e);
  try{
   const cached=JSON.parse(localStorage.getItem("nexorawildfire-map-cache-v1")||"null");
   if(cached?.rows?.length){
    provinceRows=provinceFeatures.map(f=>cached.rows.find(row=>norm(row.name)===norm(f.properties?.il_adi))).filter(Boolean);
    drawProvinces();
    setStatus((mapLang()==="en"?"OFFLINE · LAST SAVED OBSERVATIONS · ":"ÇEVRİMDIŞI · SON KAYITLI GÖZLEMLER · ")+new Date(cached.savedAt).toLocaleString(mapLang()==="en"?"en-GB":"tr-TR"));
   }else{
    drawProvinces();
    setStatus(mapLang()==="en"?"BOUNDARIES READY · LIVE DATA UNAVAILABLE":"SINIRLAR HAZIR · CANLI VERİ ALINAMADI");
   }
  }catch{setStatus(mapLang()==="en"?"LOCAL DATA COULD NOT BE READ":"YEREL VERİ OKUNAMADI")}
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
    let rows;
    if(norm(selectedProvince)==="edirne"){
      const gj=await fetch(edirneSettlementPath).then(x=>x.json());
      const target=districtFeatures.find(f=>norm(f.properties?.adm2_name1||f.properties?.name)===norm(district));
      const bounds=target?L.geoJSON(target).getBounds():null;
      rows=(gj.features||[]).filter(f=>{const c=f.geometry?.coordinates||[];return c.length===2&&(!bounds||bounds.contains([Number(c[1]),Number(c[0])]))}).map(f=>{const p=f.properties||{},c=f.geometry.coordinates;return {display_name:p.name+", "+district+", Edirne",lat:String(c[1]),lon:String(c[0]),type:p.place,addresstype:p.place,osm_type:p.osm_type,osm_id:p.osm_id}});
    }else{
      const u=new URL("https://nominatim.openstreetmap.org/search");
      u.searchParams.set("format","jsonv2");u.searchParams.set("limit","200");
      u.searchParams.set("county",district);u.searchParams.set("state",selectedProvince||"");u.searchParams.set("country","Türkiye");
      u.searchParams.set("addressdetails","1");u.searchParams.set("accept-language","tr");
      rows=await fetch(u,{headers:{"Accept":"application/json"}}).then(x=>x.json());
      rows=rows.filter(x=>["village","hamlet","suburb","neighbourhood","quarter"].includes(x.type)||["village","hamlet","suburb","neighbourhood","quarter"].includes(x.addresstype));
    }
    const seen=new Set();rows=rows.filter(x=>{const k=(x.osm_type||"")+":"+(x.osm_id||"");if(seen.has(k))return false;seen.add(k);return true});
    const coordsList=rows.map(x=>[Number(x.lat),Number(x.lon)]);
    const ws=mode!=="pollen"?await weatherFor(coordsList):[];
    const pollenValues=mode==="pollen"?await pollenFor(coordsList):[];
    rows=rows.map((x,i)=>{const c=ws[i]?.current||{},d=ws[i]?.daily||{};const w={t:Number(c.temperature_2m||0),h:Number(c.relative_humidity_2m||0),wind:Number(c.wind_speed_10m||0),soil:Number(c.soil_moisture_0_to_7cm||0),et0:Number(d.et0_fao_evapotranspiration?.[0]||0),vpd:Number(c.vapour_pressure_deficit||0),precip:Number(c.precipitation||0)};const pollen=Number(pollenValues[i]||0);const env=weatherRow(x.display_name.split(",")[0],0,w,pollen,Number(x.lat),Number(x.lon));return {...x,envScore:mode==="pollen"?pollen:scoreFor(env),envLabel:label(mode==="pollen"?pollen:scoreFor(env),mode),envWeather:w,_source:norm(selectedProvince)==="edirne"?"OpenStreetMap / Overpass":"OpenStreetMap / Nominatim"} });
    settlementRows=rows;
    try{await window.NovaStore.put("settlements",{id:"settlements:"+norm(selectedProvince||"")+"::"+norm(district),province:selectedProvince||"",district,rows,updatedAt:Date.now()})}catch{}
    rows.forEach((x,i)=>{
      const score=Number(x.envScore||0);
      const markerColor=palette[mode][band(score,mode)];
      const m=L.circleMarker([Number(x.lat),Number(x.lon)],{radius:6,color:markerColor,weight:1,fillColor:markerColor,fillOpacity:.92});
      m.bindTooltip(x.display_name.split(",")[0]+' · '+x.envLabel,{direction:"top"});
      m.bindPopup('<div class="risk-popup"><div class="popup-kicker">NEXORAWILDFIRE / YERLEŞİM</div><h3>'+x.display_name.split(",")[0]+'</h3><div class="popup-warning">Köy / mahalle yerleşim noktası.<br>Bu konumu <strong>seçili saha</strong> seviyesinde açarak çevresel sinyalleri incele.</div><button class="field-select-button" data-field-select>Seçili saha olarak aç →</button><div class="popup-source">Kaynak: '+(x._source||"OpenStreetMap")+'. Yerleşim noktası idari mülkiyet veya parsel sınırı değildir.</div></div>');
      m.on("popupopen",()=>{const b=document.querySelector("[data-field-select]");if(b)b.onclick=()=>selectSettlement(x)});
      m.addTo(settlementLayer);
    });
    breadcrumb(selectedProvince+" → "+district+" → KÖY / MAHALLE");
    setStatus("CANLI • "+rows.length+" KÖY / MAHALLE • "+district+" • "+mode.toUpperCase());
  }catch(e){
    try{
      const cached=await window.NovaStore.get("settlements","settlements:"+norm(selectedProvince||"")+"::"+norm(district));
      if(cached?.rows?.length){
        settlementRows=cached.rows;
        cached.rows.forEach(x=>{
          const m=L.circleMarker([Number(x.lat),Number(x.lon)],{radius:6,color:"#00ff66",weight:1,fillColor:"#00ff66",fillOpacity:.9});
          m.bindTooltip(x.display_name.split(",")[0],{direction:"top"});
          m.addTo(settlementLayer);
        });
        breadcrumb(selectedProvince+" → "+district+" → KÖY / MAHALLE");
        setStatus("ÇEVRİMDIŞI • "+cached.rows.length+" KÖY / MAHALLE • SON YEREL VERİ");
        return;
      }
    }catch{}
    settlementRows=[];setStatus(district+" • ÇEVRİMDIŞI • YEREL YERLEŞİM VERİSİ YOK");
  }
}
function selectSettlement(x){
 selectedField=x;
 const lat=Number(x.lat),lon=Number(x.lon);
 map.setView([lat,lon],Math.max(map.getZoom(),13));
 document.querySelector(".selected-field-panel")?.remove();
 const p=document.createElement("aside");p.className="selected-field-panel";
 const w=x.envWeather||{};
 p.innerHTML='<div class="selected-field-kicker">NEXORAWILDFIRE / SEÇİLİ SAHA</div><button class="selected-field-close" aria-label="Kapat">×</button><h3>'+x.display_name.split(",")[0]+'</h3><p class="field-path">'+selectedProvince+' → '+selectedDistrict+' → '+x.display_name.split(",")[0]+'</p><div class="field-score"><strong>'+Math.round(Number(x.envScore||0))+'</strong><span>/100 · '+x.envLabel+'</span></div><div class="field-metrics"><span>Sıcaklık <b>'+w.t+' °C</b></span><span>Nem <b>'+w.h+' %</b></span><span>Rüzgar <b>'+w.wind+' km/s</b></span><span>Toprak nemi <b>'+Math.round((w.soil||0)*100)+' %</b></span><span>ET₀ <b>'+Number(w.et0||0).toFixed(1)+' mm</b></span><span>VPD <b>'+Number(w.vpd||0).toFixed(2)+'</b></span></div><p class="field-note">Bu seviye seçili bir coğrafi gözlem noktasıdır; resmî parsel veya mülkiyet sınırı değildir. Kendi saha poligonunu kaydetmek için Alan Ekle kullanılabilir.</p><small>Kaynak: '+(x._source||"OpenStreetMap")+'</small>';
 document.querySelector(".map-section")?.appendChild(p);
 p.querySelector(".selected-field-close").onclick=()=>{selectedField=null;p.remove();breadcrumb(selectedProvince+" → "+selectedDistrict+" → KÖY / MAHALLE")};
 breadcrumb(selectedProvince+" → "+selectedDistrict+" → "+x.display_name.split(",")[0]+" → SEÇİLİ SAHA");
 setStatus("SEÇİLİ SAHA • "+x.display_name.split(",")[0]+" • "+x.envLabel);
}
window.NexoraMap={selectSettlement};
async function refreshView(){
  setStatus("VERİLER YENİLENİYOR…");
  if(selectedDistrict){
    const r=districtRows.find(x=>x.name===selectedDistrict);
    if(r){await focusDistrict(r);return;}
  }
  if(selectedProvince){await openProvince(selectedProvince);return;}
  await loadProvinceData();
}
function goBack(){if(selectedField){selectedField=null;document.querySelector(".selected-field-panel")?.remove();breadcrumb(selectedProvince+" → "+selectedDistrict+" → KÖY / MAHALLE");return}if(selectedDistrict){selectedDistrict=null;settlementLayer.clearLayers();drawDistricts();return}if(selectedProvince){selectedProvince=null;drawProvinces();map.setView([41.15,27.1],8)}else map.setView([41.15,27.1],8)}
function saveHistory(rows){const old=JSON.parse(localStorage.getItem(historyKey)||"[]");rows.forEach(r=>{const item={t:new Date().toISOString(),name:r.name,r:r.score};old.push(item);try{window.NovaStore.put("timeseries",{id:"risk:"+r.name+":"+Date.now(),...item,updatedAt:Date.now()})}catch{}});localStorage.setItem(historyKey,JSON.stringify(old.slice(-600)))}

function toggleDraw(){
 drawMode=!drawMode;drawingPoints=[];if(drawingLine)map.removeLayer(drawingLine);if(drawingPolygon)map.removeLayer(drawingPolygon);
 const b=el(".map-filters [data-action='add']");if(b)b.textContent=drawMode?"✓ Noktaları seç":"＋ Alan Ekle";
 if(drawMode){map.gestureHandling?.disable();map.dragging.enable();map.doubleClickZoom.disable();setStatus("ALAN ÇİZİMİ • Haritada köşe noktalarına tıkla • son noktada çift tıkla");map.on("click",drawClick)}
 else{map.doubleClickZoom.enable();map.off("click",drawClick);if(isMobile){map.dragging.disable();map.gestureHandling?.enable();}}
}
function drawClick(e){if(!drawMode)return;drawingPoints.push([e.latlng.lat,e.latlng.lng]);if(drawingLine)map.removeLayer(drawingLine);drawingLine=L.polyline(drawingPoints,{color:"#00ff66",weight:2,dashArray:"5 5"}).addTo(map);if(drawingPoints.length>=3){if(drawingPolygon)map.removeLayer(drawingPolygon);drawingPolygon=L.polygon(drawingPoints,{color:"#00ff66",fillOpacity:.16,weight:2}).addTo(map)}}
async function finishDraw(){
 if(!drawMode||drawingPoints.length<3){setStatus("En az 3 nokta gerekli.");return}
 map.off("click",drawClick);map.doubleClickZoom.enable();
 const rawName=prompt("Alan adı (en fazla 80 karakter)","Yeni Tarla");
 if(rawName===null||!rawName.trim()){toggleDraw();return}
 const name=rawName.trim().slice(0,80);
 const rawType=(prompt("Alan türü: çiftçi / arıcı / orman / genel","çiftçi")||"genel").trim().toLocaleLowerCase("tr-TR");
 const type=["çiftçi","arıcı","orman","genel"].includes(rawType)?rawType:"genel";
 const originalId=String(crypto.randomUUID?.()||Date.now().toString());
 const now=Date.now();
 const area={id:originalId,name:name.trim(),type:type||"genel",province:selectedProvince||"Trakya / İstanbul",district:selectedDistrict||"",coordinates:drawingPoints.map(p=>[Number(p[0]),Number(p[1])]),createdAt:new Date(now).toISOString(),updatedAt:now,syncStatus:"local"};
 // Local-first: persist the geometry before any network request can fail.
 let areas=[];try{areas=JSON.parse(localStorage.getItem(areaKey)||"[]")}catch{}
 areas=areas.filter(x=>String(x.id)!==originalId);areas.push(area);
 localStorage.setItem(areaKey,JSON.stringify(areas));
 try{await window.NovaStore?.put("areas",{...area,id:String(area.id),updatedAt:now})}catch(e){console.warn("Local IndexedDB save",e)}
 let cloudSynced=false;
 if(window.NovaAuth?.isLoggedIn()){
   area.syncStatus="pending";
   try{
     const cloud=await window.NovaAuth.saveArea(area);
     const cloudId=String(cloud.id);
     area.cloudId=cloudId;area.id=cloudId;area.createdAt=cloud.created_at||area.createdAt;area.updatedAt=Date.now();area.syncStatus="synced";delete area.syncError;
     if(cloudId!==originalId){try{await window.NovaStore?.remove("areas",originalId)}catch{}}
     cloudSynced=true;
     try{await window.NovaSeeds?.award("area","area:"+cloudId)}catch{}
   }catch(e){
     area.syncStatus="pending";area.syncError=e?.message||"network_error";
     console.warn("Cloud area sync pending",e);
   }
   let current=[];try{current=JSON.parse(localStorage.getItem(areaKey)||"[]")}catch{}
   current=current.filter(x=>String(x.id)!==originalId&&String(x.id)!==String(area.id));current.push(area);
   localStorage.setItem(areaKey,JSON.stringify(current));
   try{await window.NovaStore?.put("areas",{...area,id:String(area.id),updatedAt:area.updatedAt||Date.now()})}catch(e){console.warn("IndexedDB area sync",e)}
 }
 toggleDraw();renderSavedAreas();
 window.dispatchEvent(new CustomEvent("nova:areas-updated",{detail:{id:String(area.id)}}));
 setStatus(cloudSynced?"ALAN KAYDEDİLDİ • cihaz + hesap bulutu eşitlendi.":area.syncStatus==="pending"?"ALAN CİHAZA KAYDEDİLDİ • bulut eşitlemesi beklemede.":"ALAN CİHAZA KAYDEDİLDİ • giriş yaptığında eşitleyebilirsin.");
}
function renderSavedAreas(){fieldLayer.clearLayers();let areas=[];try{const raw=JSON.parse(localStorage.getItem(areaKey)||"[]");if(Array.isArray(raw))areas=raw.filter(validSavedArea)}catch{}const polygons=new Map();areas.forEach(a=>{try{const polygon=L.polygon(a.coordinates,{className:"nova-saved-field",color:"#8a6cff",weight:3,fillColor:"#8a6cff",fillOpacity:.16}).bindTooltip("ALANIM · "+escapeHtml(a.name)+" · "+escapeHtml(a.type),{className:"saved-field-label"}).addTo(fieldLayer);polygons.set(String(a.id),polygon)}catch(error){console.warn("Invalid saved area skipped",a?.id,error)}});const focusId=new URLSearchParams(location.search).get("area");if(focusId&&polygons.has(String(focusId))){const target=polygons.get(String(focusId));map.fitBounds(target.getBounds(),{padding:[30,30],maxZoom:15});target.openTooltip();setStatus("SEÇİLİ ALAN HARİTADA GÖSTERİLİYOR");}}
map.on("dblclick",finishDraw);
async function load(){controls();renderSavedAreas();setStatus(mapLang()==="en"?"OPENING LOCAL MAP…":"YEREL HARİTA AÇILIYOR…");try{await loadProvinceData()}catch(e){console.error(e);setStatus(mapLang()==="en"?"MAP READY · LIVE DATA PENDING":"HARİTA HAZIR · CANLI VERİ BEKLENİYOR")}}
load();enableMobileMapGesture();setInterval(()=>{if(!selectedProvince&&!selectedDistrict&&!drawMode)loadProvinceData()},300000);
