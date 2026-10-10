const KEY="nexorawildfire-my-areas-v1";
const areasEl=document.getElementById("areas"),emptyEl=document.getElementById("empty"),countEl=document.getElementById("count");
let areaCache=[];
function getAreas(){return areaCache.length?areaCache:JSON.parse(localStorage.getItem(KEY)||"[]")}
async function loadAreas(){
  try{const rows=await window.NovaStore.getAll("areas");if(rows.length){areaCache=rows;localStorage.setItem(KEY,JSON.stringify(rows));return rows}}catch{}
  areaCache=JSON.parse(localStorage.getItem(KEY)||"[]");
  for(const a of areaCache){try{await window.NovaStore.put("areas",{...a,id:String(a.id),updatedAt:Date.now()})}catch{}}
  return areaCache;
}
async function removeArea(id){if(window.NovaAuth?.isLoggedIn()){try{await window.NovaAuth.deleteArea(String(id))}catch(e){console.warn("Cloud area delete",e)}}areaCache=areaCache.filter(a=>String(a.id)!==String(id));localStorage.setItem(KEY,JSON.stringify(areaCache));try{await window.NovaStore.remove("areas",String(id))}catch{}}

function center(points){let lat=0,lon=0;points.forEach(p=>{lat+=p[0];lon+=p[1]});return[lat/points.length,lon/points.length]}
function scoreRisk(w){let s=0;if(w.t>=40)s+=30;else if(w.t>=30)s+=15;else if(w.t>=25)s+=7;if(w.h<=20)s+=25;else if(w.h<=40)s+=10;else if(w.h<=55)s+=4;if(w.wind>=40)s+=25;else if(w.wind>=20)s+=10;else if(w.wind>=12)s+=4;if(w.soil<.18)s+=10;return Math.min(100,s)}
function crop(w){return Math.max(0,Math.min(100,100-(w.soil<.15?65:w.soil<.2?40:w.soil<.27?15:0)-(w.et0>5?20:w.et0>3?8:0)-(w.vpd>2?12:w.vpd>1.5?5:0)))}
function bee(w,pollen){let s=100;if(w.t<14||w.t>34)s-=30;if(w.wind>25)s-=35;else if(w.wind>15)s-=15;if(w.precip>1)s-=35;if(pollen>120)s-=5;return Math.max(0,Math.min(100,s))}
async function live(lat,lon){const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit");u.searchParams.set("daily","et0_fao_evapotranspiration,precipitation_sum");u.searchParams.set("forecast_days","3");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(r=>r.json());const c=j.current||{},d=j.daily||{};const w={t:Number(c.temperature_2m||0),h:Number(c.relative_humidity_2m||0),wind:Number(c.wind_speed_10m||0),precip:Number(c.precipitation||0),soil:Number(c.soil_moisture_0_to_7cm||0),vpd:Number(c.vapour_pressure_deficit||0),et0:Number(d.et0_fao_evapotranspiration?.[0]||0)};let pollen=0;try{const p=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");p.searchParams.set("latitude",lat);p.searchParams.set("longitude",lon);p.searchParams.set("current","alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen");p.searchParams.set("timezone","Europe/Istanbul");const q=(await fetch(p).then(r=>r.json())).current||{};pollen=Math.max(...["alder_pollen","birch_pollen","grass_pollen","mugwort_pollen","olive_pollen","ragweed_pollen"].map(k=>Number(q[k]||0)))}catch{}let specialized=null;try{const base=(window.NOVA_API_BASE||"").replace(/\/$/,"");if(base){const su=new URL(base+"/specialized");su.searchParams.set("lat",lat);su.searchParams.set("lon",lon);su.searchParams.set("pollen",pollen);specialized=await fetch(su).then(r=>r.json())}}catch{}return{w,pollen,risk:scoreRisk(w),crop:crop(w),bee:bee(w,pollen),specialized}}
async function satellite(a){try{const base=(window.NOVA_API_BASE||"").replace(/\/$/,"");if(!base)return{status:"backend_bekleniyor",series:[]};const ring=a.coordinates.map(p=>[p[1],p[0]]);ring.push(ring[0]);const r=await fetch(base+"/ndvi/area-timeseries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({geometry:{type:"Polygon",coordinates:[ring]},days:180,interval:"P30D"})});return await r.json()}catch{return{status:"error",series:[]}}}
function alerts(a,d,sat){const out=[];if(d.w.soil<.15)out.push(["SU STRESİ","Toprak nemi çok düşük. Sulama kontrolü gerekli.","warn"]);else if(d.w.soil<.20)out.push(["NEM DÜŞÜYOR","Toprak nemi izleme eşiğinin altında.","info"]);if(d.w.vpd>2)out.push(["HAVA / SU KAYBI","VPD yüksek; bitkinin su kaybı baskısı artıyor.","warn"]);if(d.w.wind>25)out.push(["RÜZGAR","Rüzgar yüksek; arıcılık uçuş koşulu zayıflayabilir.","warn"]);if(d.w.precip>5)out.push(["YAĞIŞ","Yağış yüksek; tarla operasyonunu kontrol et.","info"]);if(a.type.includes("arı")&&d.bee<50)out.push(["ARICILIK UYARISI","Uçuş koşulu şu anda elverişli görünmüyor.","warn"]);if(a.type.includes("çift")&&d.crop<45)out.push(["TARIM UYARISI","Koşullar bitki stresi yönünde; uyduyla teyit edilmeli.","warn"]);if(sat?.status==="available"&&sat.latest?.ndmi!=null&&sat.latest.ndmi<0.05)out.push(["UYDU SU STRESİ","NDMI düşük; bitki su durumu zayıflıyor olabilir. Hava/toprak verisiyle birlikte kontrol et.","warn"]);if(sat?.status==="available"&&sat.delta?.ndmi!=null&&sat.delta.ndmi<-0.05)out.push(["UYDU TRENDİ","NDMI son dönemde düşmüş; alanı yakından izle.","info"]);if(!out.length)out.push(["SİSTEM NORMAL","Belirgin otomatik olay eşiği aşılmadı.","ok"]);return out}
function satelliteBox(sat){if(sat.status==="available"&&sat.series?.length){const last=sat.series[sat.series.length-1],prev=sat.series.length>1?sat.series[sat.series.length-2]:null;const delta=prev?(last.ndvi-prev.ndvi):null;const ndmi=last.ndmi;const ndmiDelta=prev&&ndmi!=null&&prev.ndmi!=null?(ndmi-prev.ndmi):null;return '<div class="sat-mini"><div><span>UYDU ZAMAN SERİSİ</span><b>'+last.ndvi.toFixed(2)+' NDVI · '+(ndmi==null?"—":ndmi.toFixed(2)+" NDMI")+"</b></div><small>"+last.classification+(delta===null?"":" · NDVI "+(delta>=0?"+":"")+delta.toFixed(2))+(ndmiDelta===null?"":" · NDMI "+(ndmiDelta>=0?"+":"")+ndmiDelta.toFixed(2))+'</small></div>'}if(sat.status==="not_configured")return '<div class="sat-mini muted"><span>UYDU</span><b>CDSE bağlantısı bekleniyor</b><small>Backend’e Sentinel Hub OAuth bilgileri tanımlanınca gerçek NDVI zaman serisi çalışır.</small></div>';return '<div class="sat-mini muted"><span>UYDU</span><b>Sahne/işleme bekleniyor</b><small>Alan bazlı Sentinel-2 istatistiği hazırlanıyor.</small></div>'}
async function card(a){const [lat,lon]=center(a.coordinates);const [d,sat]=await Promise.all([live(lat,lon),satellite(a)]);const alertsHtml=alerts(a,d,sat).map(x=>'<div class="area-alert '+x[2]+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join("");return '<article class="area-card"><div class="area-card-head"><div><div class="eyebrow">'+a.type.toUpperCase()+'</div><h3>'+a.name+'</h3><p>'+a.province+(a.district?" · "+a.district:"")+'</p></div><button data-delete="'+a.id+'">Sil</button></div><div class="area-card-actions"><a class="secondary-action" href="map.html?area='+encodeURIComponent(a.id)+'">Haritada görüntüle →</a><button type="button" data-area-push="'+a.id+'">Bu alan için bildirimleri aç</button><span data-area-push-status="'+a.id+'" role="status" aria-live="polite"></span></div><div class="area-mini-map" id="area-map-'+a.id+'" aria-label="'+a.name+' harita görünümü"></div><div class="area-live"><span>CANLI DURUM</span><strong>'+d.risk+'/100 risk</strong><small>Güncelleme: '+new Date().toLocaleTimeString("tr-TR",{hour:"2-digit",minute:"2-digit"})+'</small></div><div class="area-metrics"><div><span>Sıcaklık</span><b>'+d.w.t+' °C</b></div><div><span>Toprak nemi</span><b>'+Math.round(d.w.soil*100)+' %</b></div><div><span>ET₀</span><b>'+d.w.et0.toFixed(1)+' mm</b></div><div><span>VPD</span><b>'+d.w.vpd.toFixed(2)+'</b></div><div><span>Tarım skoru</span><b>'+d.crop+'/100</b></div><div><span>Arı uçuş</span><b>'+d.bee+'/100</b></div></div>'+satelliteBox(sat)+'<div class="area-alerts"><h4>Otomatik olaylar</h4>'+alertsHtml+'</div><div class="area-footer">Koordinat merkezi: '+lat.toFixed(4)+', '+lon.toFixed(4)+' · Hava/toprak modeli canlıdır. Uydu zaman serisi Sentinel-2 sahneleri geldikçe güncellenir.</div></article>'}
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
async function render(){const areas=await loadAreas();countEl.textContent=areas.length+" alan";if(!areas.length){areasEl.innerHTML="";emptyEl.style.display="grid";return}emptyEl.style.display="none";areasEl.innerHTML='<div class="loading-area">Alanların yerel/online durumu hesaplanıyor…</div>';const html=await Promise.all(areas.map(card));areasEl.innerHTML=html.join("");areasEl.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{await removeArea(b.dataset.delete);render()})}
async function liveEdge(lat,lon){
  try{
    const d=await live(lat,lon);
    try{await window.NovaStore.put("observations",{id:"weather:"+lat.toFixed(4)+":"+lon.toFixed(4),lat,lon,data:d,updatedAt:Date.now()})}catch{}
    return {...d,mode:"live"};
  }catch{
    try{
      const rows=await window.NovaStore.getAll("observations");
      const hit=rows.find(x=>Math.abs(x.lat-lat)<.02&&Math.abs(x.lon-lon)<.02);
      if(hit?.data){const e=window.NovaOfflineEngine.evaluate(hit.data.w,hit.data);return {...hit.data,risk:e.risk,offline:true,mode:"offline",offlineAlerts:e.alerts,updatedAt:hit.updatedAt}}
    }catch{}
    return {w:{t:0,h:0,wind:0,precip:0,soil:0,vpd:0,et0:0},pollen:0,risk:0,crop:0,bee:0,offline:true,mode:"offline-empty"};
  }
}
async function cardEdge(a){
  const [lat,lon]=center(a.coordinates);
  const [d,sat]=await Promise.all([liveEdge(lat,lon),satellite(a)]);
  const baseAlerts=alerts(a,d,sat);
  const edgeAlerts=d.offlineAlerts||[];
  const all=edgeAlerts.length?edgeAlerts.map(x=>[x.title,x.message,"warn"]):baseAlerts;
  try{for(const x of all.filter(a=>a[2]!=="ok"))await window.NovaStore.put("alerts",{id:"local:"+a.id+":"+x[0]+":"+new Date().toISOString().slice(0,13),areaId:a.id,area:a.name,title:x[0],message:x[1],level:x[2],createdAt:Date.now(),source:d.offline?"offline-engine":"live-data"})}catch{}
  const alertsHtml=all.map(x=>'<div class="area-alert '+x[2]+'"><b>'+x[0]+'</b><span>'+x[1]+'</span></div>').join("");
  return '<article class="area-card"><div class="area-card-head"><div><div class="eyebrow">'+a.type.toUpperCase()+'</div><h3>'+a.name+'</h3><p>'+a.province+(a.district?" · "+a.district:"")+'</p></div><button data-delete="'+a.id+'">Sil</button></div><div class="area-card-actions"><a class="secondary-action" href="map.html?area='+encodeURIComponent(a.id)+'">Haritada görüntüle →</a><button type="button" data-area-push="'+a.id+'">Bu alan için bildirimleri aç</button><span data-area-push-status="'+a.id+'" role="status" aria-live="polite"></span></div><div class="area-mini-map" id="area-map-'+a.id+'" aria-label="'+a.name+' harita görünümü"></div><div class="area-live"><span>'+(d.offline?"ÇEVRİMDIŞI / SON VERİ":"CANLI DURUM")+'</span><strong>'+d.risk+'/100 risk</strong><small>'+(d.updatedAt?"Son kayıt: "+new Date(d.updatedAt).toLocaleString("tr-TR"):"Yeni veri yok")+'</small></div><div class="area-metrics"><div><span>Sıcaklık</span><b>'+d.w.t+' °C</b></div><div><span>Toprak nemi</span><b>'+Math.round(d.w.soil*100)+' %</b></div><div><span>ET₀</span><b>'+d.w.et0.toFixed(1)+' mm</b></div><div><span>VPD</span><b>'+d.w.vpd.toFixed(2)+'</b></div><div><span>Tarım skoru</span><b>'+d.crop+'/100</b></div><div><span>Arı uçuş</span><b>'+d.bee+'/100</b></div></div>'+satelliteBox(sat)+'<div class="area-alerts"><h4>Yerel olay merkezi</h4>'+alertsHtml+'</div><div class="area-footer">'+(d.offline?"NEXORAWILDFIRE EDGE: internet yok. Son kayıt üzerinden yerel karar motoru çalıştı.":"Canlı hava/toprak verisi. Yeni kayıtlar yerel veri deposuna alınır.")+'</div></article>';
}
async function render(){
  const areas=await loadAreas();countEl.textContent=areas.length+" alan";
  if(!areas.length){areasEl.innerHTML="";emptyEl.style.display="grid";return}
  emptyEl.style.display="none";areasEl.innerHTML='<div class="loading-area">NEXORAWILDFIRE EDGE alan verilerini hazırlıyor…</div>';
  const html=await Promise.all(areas.map(cardEdge));areasEl.innerHTML=html.join("");
  areasEl.querySelectorAll("[data-delete]").forEach(b=>b.onclick=async()=>{await removeArea(b.dataset.delete);render()});
  renderAreaMiniMaps();
  areasEl.querySelectorAll("[data-area-push]").forEach(button=>button.onclick=async()=>{
    const area=getAreas().find(a=>String(a.id)===button.dataset.areaPush);
    const status=areasEl.querySelector('[data-area-push-status="'+button.dataset.areaPush+'"]');
    if(!area||!window.NovaAlert?.enablePush){if(status)status.textContent="Bildirim modülü yüklenemedi.";return}
    const [lat,lon]=center(area.coordinates);
    if(status)status.textContent="Tarayıcı izni ve hesap bağlantısı kontrol ediliyor…";
    const result=await window.NovaAlert.enablePush({name:area.name,lat,lon});
    if(status)status.textContent=result.ok?"Bu alan için Web Push aboneliği kaydedildi. Bu cihaz ve hesapta arka plan bildirimi için sunucu bağlantısı gerekir.":result.reason==="login_required"?"Arka plan bildirimi için giriş yapmalısın.":result.reason==="permission"?"Tarayıcı bildirim izni verilmedi.":result.reason==="server"?"Sunucu Web Push yapılandırması hazır değil; alanın kaydı korunuyor.":"Bildirim kurulumu tamamlanamadı; daha sonra tekrar dene.";
  });
}
async function checkNativeAlerts(){
  const base=(window.NOVA_API_BASE||"").replace(/\/$/,"");
  const settings=window.NovaAlert?.settings?.()||{enabled:true,threshold:70};
  if(!base||settings.enabled===false||!window.NovaAlert)return;
  const areas=getAreas();
  for(const a of areas){
    try{
      const [lat,lon]=center(a.coordinates);
      const u=new URL(base+"/notifications/evaluate");
      u.searchParams;
      const r=await fetch(u,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat,lon,area_name:a.name,threshold:Number(settings.threshold||70)})});
      const result=await r.json();
      if(result.alert){
        const alert={area:a.name,risk:result.risk,level:result.level,message:result.message,title:result.title};
        const before=JSON.parse(localStorage.getItem("nexorawildfire-alerts-v1")||"[]");
        const existed=before.some(x=>x.fingerprint===[alert.area,alert.risk,alert.level,alert.message].join("|")&&Date.now()-x.createdAt<6*60*60*1000);
        window.NovaAlert.save(alert);
        if(!existed)window.NovaAlert.browser(alert);
      }
    }catch{}
  }
}
render();document.addEventListener("nova:auth-ready",()=>render());document.addEventListener("nova:areas-synced",()=>render());checkNativeAlerts();setInterval(()=>{render();checkNativeAlerts()},300000);
