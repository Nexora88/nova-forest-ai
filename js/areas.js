const KEY="nexorawildfire-my-areas-v1";
const AREA_TOMBSTONES_KEY="nexorawildfire-deleted-area-ids-v1";
const areasEl=document.getElementById("areas"),emptyEl=document.getElementById("empty"),countEl=document.getElementById("count");
function escapeHtml(value){return String(value??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]))}
function validArea(area){return !!area&&area.id!=null&&typeof area.name==="string"&&Array.isArray(area.coordinates)&&area.coordinates.length>=3&&area.coordinates.every(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))&&Math.abs(Number(p[0]))<=90&&Math.abs(Number(p[1]))<=180)}
function readLocalAreas(){try{const raw=localStorage.getItem(KEY);const parsed=raw===null?[]:JSON.parse(raw);return Array.isArray(parsed)?parsed.filter(validArea):[]}catch{return []}}
function readAreaTombstones(){try{const raw=JSON.parse(localStorage.getItem(AREA_TOMBSTONES_KEY)||"[]");return Array.isArray(raw)?raw.map(String):[]}catch{return []}}
let areaCache=readLocalAreas();
function getAreas(){return areaCache}
async function loadAreas(){
  let raw=null,local=null,localValid=false;
  try{raw=localStorage.getItem(KEY);if(raw!==null){const parsed=JSON.parse(raw);if(Array.isArray(parsed)){local=parsed.filter(validArea);localValid=true;}}}catch{}
  let indexed=[];try{indexed=await window.NovaStore.getAll("areas")}catch{}
  // A valid localStorage array is authoritative, including []. Merging IndexedDB here
  // resurrected deleted records when localStorage intentionally contained no areas.
  if(localValid)areaCache=local;else areaCache=Array.isArray(indexed)?indexed.filter(validArea):[];
  try{localStorage.setItem(KEY,JSON.stringify(areaCache))}catch{}
  for(const area of areaCache){try{await window.NovaStore.put("areas",{...area,id:String(area.id),updatedAt:Number(area.updatedAt)||Date.parse(area.createdAt)||Date.now()})}catch{}}
  return areaCache;
}
async function removeArea(id){
  const key=String(id);let cloudDeleted=false;
  if(window.NovaAuth?.isLoggedIn()){try{await window.NovaAuth.deleteArea(key);cloudDeleted=true}catch(e){console.warn("Cloud area delete queued",e)}}
  const tombstones=new Set(readAreaTombstones());if(!cloudDeleted)tombstones.add(key);else tombstones.delete(key);
  try{localStorage.setItem(AREA_TOMBSTONES_KEY,JSON.stringify([...tombstones]))}catch{}
  areaCache=areaCache.filter(a=>String(a.id)!==key);
  try{localStorage.setItem(KEY,JSON.stringify(areaCache))}catch{}
  try{await window.NovaStore.remove("areas",key)}catch{}
  return true;
}

const AREA_ALERT_PREFS_KEY="nexorawildfire-area-alert-prefs-v1";
function getAreaAlertPrefs(){try{return JSON.parse(localStorage.getItem(AREA_ALERT_PREFS_KEY)||"{}")}catch{return {}}}
function areaAlertsEnabled(id){return getAreaAlertPrefs()[String(id)]!==false}
function center(points){const valid=Array.isArray(points)?points.filter(p=>Array.isArray(p)&&p.length>=2&&Number.isFinite(Number(p[0]))&&Number.isFinite(Number(p[1]))):[];if(!valid.length)throw new Error("Alan koordinatları geçersiz.");let lat=0,lon=0;valid.forEach(p=>{lat+=Number(p[0]);lon+=Number(p[1])});return[lat/valid.length,lon/valid.length]}
function finite(value){return value!==null&&value!==undefined&&value!==""&&Number.isFinite(Number(value))}
function scoreRisk(w){if(!finite(w.t)||!finite(w.h)||!finite(w.wind))return null;let s=0;if(w.t>=40)s+=30;else if(w.t>=30)s+=15;else if(w.t>=25)s+=7;if(w.h<=20)s+=25;else if(w.h<=40)s+=10;else if(w.h<=55)s+=4;if(w.wind>=40)s+=25;else if(w.wind>=20)s+=10;else if(w.wind>=12)s+=4;if(finite(w.soil)&&w.soil<.18)s+=10;return Math.min(100,s)}
function crop(w){if(!finite(w.soil)||!finite(w.et0)||!finite(w.vpd))return null;return Math.max(0,Math.min(100,100-(w.soil<.15?65:w.soil<.2?40:w.soil<.27?15:0)-(w.et0>5?20:w.et0>3?8:0)-(w.vpd>2?12:w.vpd>1.5?5:0)))}
function bee(w,pollen){if(!finite(w.t)||!finite(w.wind)||!finite(w.precip))return null;let s=100;if(w.t<14||w.t>34)s-=30;if(w.wind>25)s-=35;else if(w.wind>15)s-=15;if(w.precip>1)s-=35;if(finite(pollen)&&pollen>120)s-=5;return Math.max(0,Math.min(100,s))}
async function live(lat,lon){
  const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
  u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit");
  u.searchParams.set("daily","et0_fao_evapotranspiration,precipitation_sum");u.searchParams.set("forecast_days","3");u.searchParams.set("timezone","Europe/Istanbul");
  const response=await fetch(u);if(!response.ok)throw new Error("Open-Meteo HTTP "+response.status);const j=await response.json();if(j.error)throw new Error(j.reason||"Open-Meteo veri hatası");
  const current=j.current||{},daily=j.daily||{},num=k=>finite(current[k])?Number(current[k]):null;
  const w={t:num("temperature_2m"),h:num("relative_humidity_2m"),wind:num("wind_speed_10m"),precip:num("precipitation"),soil:num("soil_moisture_0_to_7cm"),vpd:num("vapour_pressure_deficit"),et0:finite(daily.et0_fao_evapotranspiration?.[0])?Number(daily.et0_fao_evapotranspiration[0]):null};
  if(!finite(w.t)||!finite(w.h)||!finite(w.wind)||!finite(w.precip))throw new Error("Gerekli güncel hava alanları sağlayıcı yanıtında yok.");
  let pollen=null;try{const p=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");p.searchParams.set("latitude",lat);p.searchParams.set("longitude",lon);p.searchParams.set("current","alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen");p.searchParams.set("timezone","Europe/Istanbul");const pr=await fetch(p);if(pr.ok){const q=(await pr.json()).current||{},vals=["alder_pollen","birch_pollen","grass_pollen","mugwort_pollen","olive_pollen","ragweed_pollen"].map(k=>finite(q[k])?Number(q[k]):null).filter(v=>v!==null);if(vals.length)pollen=Math.max(...vals)}}catch{}
  let specialized=null;try{const base=(window.NOVA_API_BASE||"").replace(/\/$/,"");if(base){const su=new URL(base+"/specialized");su.searchParams.set("lat",lat);su.searchParams.set("lon",lon);if(pollen!==null)su.searchParams.set("pollen",pollen);const sr=await fetch(su);if(sr.ok)specialized=await sr.json()}}catch{}
  return{dataAvailable:true,w,pollen,risk:scoreRisk(w),crop:crop(w),bee:bee(w,pollen),specialized,source:"Open-Meteo",observedAt:current.time||null,updatedAt:Date.now()};
}
async function satellite(a){try{const base=(window.NOVA_API_BASE||"").replace(/\/$/,"");if(!base)return{status:"backend_bekleniyor",series:[]};const ring=a.coordinates.map(p=>[p[1],p[0]]);ring.push(ring[0]);const r=await fetch(base+"/ndvi/area-timeseries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({geometry:{type:"Polygon",coordinates:[ring]},days:180,interval:"P30D"})});return await r.json()}catch{return{status:"error",series:[]}}}
function alerts(a,d,sat){
  if(!d.dataAvailable)return [["VERİ YOK","Canlı veri erişilemiyor ve kullanılabilir yerel kayıt bulunamadı. Bu durum sıfır risk anlamına gelmez.","info"]];
  const out=[],w=d.w||{};
  if(finite(w.soil)&&w.soil<.15)out.push(["SU STRESİ","Toprak nemi çok düşük. Sulama kontrolü gerekli.","warn"]);else if(finite(w.soil)&&w.soil<.20)out.push(["NEM DÜŞÜYOR","Toprak nemi izleme eşiğinin altında.","info"]);
  if(finite(w.vpd)&&w.vpd>2)out.push(["HAVA / SU KAYBI","VPD yüksek; bitkinin su kaybı baskısı artıyor.","warn"]);
  if(finite(w.wind)&&w.wind>25)out.push(["RÜZGAR","Rüzgâr yüksek; arıcılık uçuş koşulu zayıflayabilir.","warn"]);
  if(finite(w.precip)&&w.precip>5)out.push(["YAĞIŞ","Yağış yüksek; tarla operasyonunu kontrol et.","info"]);
  if(String(a.type||"").includes("arı")&&finite(d.bee)&&d.bee<50)out.push(["ARICILIK UYARISI","Uçuş koşulu şu anda elverişli görünmüyor.","warn"]);
  if(String(a.type||"").includes("çift")&&finite(d.crop)&&d.crop<45)out.push(["TARIM UYARISI","Koşullar bitki stresi yönünde; uyduyla teyit edilmeli.","warn"]);
  if(sat?.status==="available"&&finite(sat.latest?.ndmi)&&sat.latest.ndmi<.05)out.push(["UYDU SU STRESİ","NDMI düşük; bitki su durumu zayıflıyor olabilir. Hava/toprak verisiyle birlikte kontrol et.","warn"]);
  if(sat?.status==="available"&&finite(sat.delta?.ndmi)&&sat.delta.ndmi<-.05)out.push(["UYDU TRENDİ","NDMI son dönemde düşmüş; alanı yakından izle.","info"]);
  if(!out.length)out.push(["SİSTEM NORMAL","Tanımlı otomatik olay eşikleri aşılmadı; bu ifade yangın olmadığına dair teyit değildir.","ok"]);
  return out;
}
function satelliteBox(sat){if(sat?.status==="available"&&Array.isArray(sat.series)&&sat.series.length){const last=sat.series[sat.series.length-1],prev=sat.series.length>1?sat.series[sat.series.length-2]:null;const ndvi=finite(last.ndvi)?Number(last.ndvi):null,ndmi=finite(last.ndmi)?Number(last.ndmi):null,delta=prev&&finite(prev.ndvi)&&ndvi!==null?ndvi-Number(prev.ndvi):null,ndmiDelta=prev&&finite(prev.ndmi)&&ndmi!==null?ndmi-Number(prev.ndmi):null;return '<div class="sat-mini"><div><span>UYDU ZAMAN SERİSİ</span><b>'+(ndvi===null?"—":ndvi.toFixed(2))+' NDVI · '+(ndmi===null?"—":ndmi.toFixed(2)+" NDMI")+"</b></div><small>"+escapeHtml(last.classification||"Sınıflandırma yok")+(delta===null?"":" · NDVI "+(delta>=0?"+":"")+delta.toFixed(2))+(ndmiDelta===null?"":" · NDMI "+(ndmiDelta>=0?"+":"")+ndmiDelta.toFixed(2))+'</small></div>'}if(sat?.status==="not_configured")return '<div class="sat-mini muted"><span>UYDU</span><b>CDSE bağlantısı bekleniyor</b><small>Sentinel-2 alan zaman serisi, sağlayıcı yapılandırıldığında kullanılabilir.</small></div>';return '<div class="sat-mini muted"><span>UYDU</span><b>Uydu verisi mevcut değil</b><small>Veri eksikliği, NDVI/NDMI değerinin sıfır olduğu anlamına gelmez.</small></div>'}
async function card(a){const [lat,lon]=center(a.coordinates);const [d,sat]=await Promise.all([live(lat,lon),satellite(a)]);const alertsHtml=alerts(a,d,sat).map(x=>'<div class="area-alert '+x[2]+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join("");return '<article class="area-card"><div class="area-card-head"><div><div class="eyebrow">'+a.type.toUpperCase()+'</div><h3>'+a.name+'</h3><p>'+a.province+(a.district?" · "+a.district:"")+'</p></div><button data-delete="'+a.id+'">Sil</button></div><div class="area-card-actions"><a class="secondary-action" href="map.html?area='+encodeURIComponent(a.id)+'">Haritada görüntüle →</a><button type="button" data-area-push="'+a.id+'">Bu alan için bildirimleri aç</button><span data-area-push-status="'+a.id+'" role="status" aria-live="polite"></span><label class="area-alert-toggle"><input type="checkbox" data-area-alert-toggle="'+a.id+'" '+(areaAlertsEnabled(a.id)?"checked":"")+'><span>Bu alanın risk uyarılarını izle</span></label></div><div class="area-mini-map" id="area-map-'+a.id+'" aria-label="Kaydedilmiş alan harita görünümü"></div><div class="area-live"><span>CANLI DURUM</span><strong>'+d.risk+'/100 risk</strong><small>Güncelleme: '+new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})+'</small></div><div class="area-metrics"><div><span>Sıcaklık</span><b>'+d.w.t+' °C</b></div><div><span>Toprak nemi</span><b>'+Math.round(d.w.soil*100)+' %</b></div><div><span>ET₀</span><b>'+d.w.et0.toFixed(1)+' mm</b></div><div><span>VPD</span><b>'+d.w.vpd.toFixed(2)+'</b></div><div><span>Tarım skoru</span><b>'+d.crop+'/100</b></div><div><span>Arı uçuş</span><b>'+d.bee+'/100</b></div></div>'+satelliteBox(sat)+'<div class="area-alerts"><h4>Otomatik olaylar</h4>'+alertsHtml+'</div><div class="area-footer">Koordinat merkezi: '+lat.toFixed(4)+', '+lon.toFixed(4)+' · Hava/toprak modeli canlıdır. Uydu zaman serisi Sentinel-2 sahneleri geldikçe güncellenir.</div></article>'}
function renderAreaMiniMaps(){
  if(!window.L)return;
  const areas=getAreas();
  areasEl.querySelectorAll(".area-mini-map").forEach(host=>{
    const area=areas.find(item=>"area-map-"+item.id===host.id);
    if(!area||!Array.isArray(area.coordinates)||area.coordinates.length<3)return;
    try{
      const mini=L.map(host,{zoomControl:false,scrollWheelZoom:false,doubleClickZoom:false,dragging:!matchMedia("(max-width:700px)").matches,touchZoom:true,attributionControl:false});
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(mini);
      const polygon=L.polygon(area.coordinates,{color:"#00ff66",weight:3,fillColor:"#00ff66",fillOpacity:.18}).addTo(mini);
      mini.fitBounds(polygon.getBounds(),{padding:[12,12],maxZoom:15});
      setTimeout(()=>mini.invalidateSize(),80);
    }catch(error){host.textContent="Harita önizlemesi şu anda yüklenemedi."}
  });
}
async function liveEdge(lat,lon){
  try{const d=await live(lat,lon);try{await window.NovaStore.put("observations",{id:"weather:"+lat.toFixed(4)+":"+lon.toFixed(4),lat,lon,data:d,updatedAt:Date.now()})}catch{}return {...d,mode:"live",offline:false}}
  catch(error){try{const rows=await window.NovaStore.getAll("observations");const hit=rows.find(x=>Math.abs(x.lat-lat)<.02&&Math.abs(x.lon-lon)<.02&&x.data?.dataAvailable!==false&&finite(x.data?.w?.t)&&finite(x.data?.w?.h)&&finite(x.data?.w?.wind));if(hit?.data&&window.NovaOfflineEngine?.evaluate){const e=window.NovaOfflineEngine.evaluate(hit.data.w,hit.data);return {...hit.data,risk:e.risk,offline:true,mode:"offline",offlineAlerts:e.alerts,updatedAt:hit.updatedAt,dataAvailable:true}}}catch{}return {dataAvailable:false,w:{t:null,h:null,wind:null,precip:null,soil:null,vpd:null,et0:null},pollen:null,risk:null,crop:null,bee:null,offline:true,mode:"offline-empty",updatedAt:null,error:"weather_unavailable"}}
}
async function cardEdge(a){
  const [lat,lon]=center(a.coordinates),[d,sat]=await Promise.all([liveEdge(lat,lon),satellite(a)]);
  const baseAlerts=alerts(a,d,sat),edgeAlerts=d.offlineAlerts||[],all=d.dataAvailable&&edgeAlerts.length?edgeAlerts.map(x=>[x.title,x.message,"warn"]):baseAlerts;
  try{for(const x of all.filter(item=>item[2]!=="ok"))await window.NovaStore.put("alerts",{id:"local:"+a.id+":"+x[0]+":"+new Date().toISOString().slice(0,13),areaId:String(a.id),area:a.name,title:x[0],message:x[1],level:x[2],createdAt:Date.now(),source:d.offline?"offline-engine":d.dataAvailable?"live-data":"unavailable"})}catch{}
  const alertsHtml=all.map(x=>'<div class="area-alert '+escapeHtml(x[2])+'"><b>'+escapeHtml(x[0])+'</b><span>'+escapeHtml(x[1])+'</span></div>').join("");
  const status=!d.dataAvailable?"VERİ YOK":d.offline?"ÇEVRİMDIŞI / SON VERİ":"CANLI GÖZLEM",score=d.dataAvailable&&finite(d.risk)?escapeHtml(d.risk)+"/100 meteorolojik gösterge":"— · veri yok";
  const metric=(value,digits=1)=>finite(value)?Number(value).toFixed(digits):"—",soil=finite(d.w.soil)?Math.round(d.w.soil*100)+" %":"—";
  return '<article class="area-card"><div class="area-card-head"><div><div class="eyebrow">'+escapeHtml(String(a.type||"genel").toUpperCase())+'</div><h3 data-user-content>'+escapeHtml(a.name)+'</h3><p>'+escapeHtml(a.province||"")+(a.district?" · "+escapeHtml(a.district):"")+'</p></div><button type="button" data-delete="'+escapeHtml(a.id)+'">Sil</button></div><div class="area-card-actions"><a class="secondary-action" href="map.html?area='+encodeURIComponent(a.id)+'">Haritada görüntüle →</a><button type="button" data-area-push="'+escapeHtml(a.id)+'">Bu alan için bildirimleri aç</button><span data-area-push-status="'+escapeHtml(a.id)+'" role="status" aria-live="polite"></span><label class="area-alert-toggle"><input type="checkbox" data-area-alert-toggle="'+escapeHtml(a.id)+'" '+(areaAlertsEnabled(a.id)?"checked":"")+'><span>Bu alanın risk uyarılarını izle</span></label></div><div class="area-mini-map" id="area-map-'+escapeHtml(a.id)+'" aria-label="Kaydedilmiş alan harita görünümü"></div><div class="area-live"><span>'+status+'</span><strong>'+score+'</strong><small>'+(d.observedAt?"Gözlem zamanı: "+escapeHtml(d.observedAt):d.updatedAt?"Son yerel kayıt: "+escapeHtml(new Date(d.updatedAt).toLocaleString("tr-TR")):"Gözlem zamanı mevcut değil")+'</small></div><div class="area-metrics"><div><span>Sıcaklık</span><b>'+metric(d.w.t)+' °C</b></div><div><span>Toprak nemi</span><b>'+soil+'</b></div><div><span>ET₀</span><b>'+metric(d.w.et0)+' mm</b></div><div><span>VPD</span><b>'+metric(d.w.vpd,2)+'</b></div><div><span>Tarım göstergesi</span><b>'+(finite(d.crop)?d.crop+"/100":"—")+'</b></div><div><span>Arı uçuş göstergesi</span><b>'+(finite(d.bee)?d.bee+"/100":"—")+'</b></div></div>'+satelliteBox(sat)+'<div class="area-alerts"><h4>Yerel olay merkezi</h4>'+alertsHtml+'</div><div class="area-footer">'+(d.offline?(d.dataAvailable?"İnternet yok; son kullanılabilir yerel gözlem gösteriliyor.":"İnternet yok ve yerel gözlem bulunamadı. Risk skoru üretilmedi."):"Veri kaynağı: "+escapeHtml(d.source||"Open-Meteo")+" · Bu göstergeler resmî yangın uyarısı değildir.")+'</div></article>';
}
function renderAreaMiniMaps(){if(!window.L)return;const areas=getAreas();areasEl.querySelectorAll(".area-mini-map").forEach(host=>{const area=areas.find(item=>"area-map-"+item.id===host.id);if(!area||!validArea(area))return;try{const mini=L.map(host,{zoomControl:false,scrollWheelZoom:false,doubleClickZoom:false,dragging:!matchMedia("(max-width:700px)").matches,touchZoom:true,attributionControl:false});L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"© OpenStreetMap"}).addTo(mini);const polygon=L.polygon(area.coordinates,{color:"#00ff66",weight:3,fillColor:"#00ff66",fillOpacity:.18}).addTo(mini);mini.fitBounds(polygon.getBounds(),{padding:[12,12],maxZoom:15});setTimeout(()=>mini.invalidateSize(),80)}catch(error){host.textContent="Harita önizlemesi şu anda yüklenemedi."}})}
async function render(){
  const areas=await loadAreas();countEl.textContent=areas.length+" alan";if(!areas.length){areasEl.innerHTML="";emptyEl.style.display="grid";return}
  emptyEl.style.display="none";areasEl.innerHTML='<div class="loading-area">NEXORAWILDFIRE EDGE alan verilerini hazırlıyor…</div>';
  const html=await Promise.all(areas.map(cardEdge));areasEl.innerHTML=html.join("");
  areasEl.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{b.disabled=true;try{await removeArea(b.dataset.delete);await render()}catch(error){b.disabled=false;console.error("Area delete failed",error);b.textContent="Tekrar dene"}});
  renderAreaMiniMaps();
  areasEl.querySelectorAll("[data-area-alert-toggle]").forEach(input=>input.onchange=()=>{const prefs=getAreaAlertPrefs();prefs[String(input.dataset.areaAlertToggle)]=input.checked;try{localStorage.setItem(AREA_ALERT_PREFS_KEY,JSON.stringify(prefs))}catch{}});
  areasEl.querySelectorAll("[data-area-push]").forEach(button=>button.onclick=async()=>{const area=getAreas().find(a=>String(a.id)===button.dataset.areaPush),status=areasEl.querySelector('[data-area-push-status="'+button.dataset.areaPush+'"]');if(!area||!window.NovaAlert?.enablePush){if(status)status.textContent="Bildirim modülü yüklenemedi.";return}let point;try{point=center(area.coordinates)}catch{if(status)status.textContent="Alan koordinatları geçersiz.";return}if(status)status.textContent="Tarayıcı izni ve hesap bağlantısı kontrol ediliyor…";try{const result=await window.NovaAlert.enablePush({name:area.name,lat:point[0],lon:point[1]});if(status)status.textContent=result.ok?"Bu alan için Web Push aboneliği kaydedildi. Arka plan bildirimi için sunucu yapılandırması gerekir.":result.reason==="login_required"?"Arka plan bildirimi için giriş yapmalısın.":result.reason==="permission"?"Tarayıcı bildirim izni verilmedi.":result.reason==="server"?"Sunucu Web Push yapılandırması hazır değil; alanın kaydı korunuyor.":"Bildirim kurulumu tamamlanamadı; daha sonra tekrar dene."}catch{if(status)status.textContent="Bildirim kurulumu tamamlanamadı; daha sonra tekrar dene."}});
}
async function checkNativeAlerts(){
  const base=(window.NOVA_API_BASE||"").replace(/\/$/,"");
  const settings=window.NovaAlert?.settings?.()||{enabled:true,threshold:70};
  if(!base||settings.enabled===false||!window.NovaAlert)return;
  const areas=getAreas();
  for(const a of areas){
    if(!areaAlertsEnabled(a.id))continue;
    try{
      const [lat,lon]=center(a.coordinates);
      const u=new URL(base+"/notifications/evaluate");
            const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat,lon,area_name:a.name,threshold:Number(settings.threshold||70)})});
      if(!r.ok)continue;
      const result=await r.json();
      if(result.status==="unavailable"||result.status==="error")continue;
      if(result.alert){
        const alert={area:a.name,risk:result.risk,level:result.level,message:result.message,title:result.title};
        let before=[];try{const raw=JSON.parse(localStorage.getItem("nexorawildfire-alerts-v1")||"[]");if(Array.isArray(raw))before=raw}catch{}
        const existed=before.some(x=>x.fingerprint===[alert.area,alert.risk,alert.level,alert.message].join("|")&&Date.now()-x.createdAt<6*60*60*1000);
        window.NovaAlert.save(alert);
        if(!existed)window.NovaAlert.browser(alert);
      }
    }catch{}
  }
}
render();
document.addEventListener("nova:auth-ready",()=>render());
document.addEventListener("nova:areas-synced",()=>render());
window.addEventListener("nova:areas-updated",()=>render());
window.addEventListener("storage",event=>{if(event.key===KEY)render()});
window.addEventListener("nova:idb-ready",()=>render());
checkNativeAlerts();setInterval(()=>{render();checkNativeAlerts()},300000);
