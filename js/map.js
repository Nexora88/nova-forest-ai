const REGION_DATA = {
  "Edirne": { coords:[41.6771,26.5557], area:6145 },
  "Kırklareli": { coords:[41.7355,27.2252], area:6459 },
  "Tekirdağ": { coords:[40.9781,27.5110], area:6313 },
  "Çanakkale": { coords:[40.1553,26.4142], area:9817 },
  "İstanbul Avrupa": { coords:[41.1500,28.6500], area:5461 }
};

const API_BASE = (window.NOVA_API_BASE || "").replace(/\/$/, "");
const map = L.map("map", { zoomControl: true }).setView([41.25, 27.30], 8);

const baseMap = L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom:18, attribution:"&copy; OpenStreetMap katkıda bulunanlar"
}).addTo(map);
const satelliteTiles = L.tileLayer(
  "https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",
  {maxZoom:18, attribution:"Tiles &copy; Esri"}
);
L.control.layers({"Temel Harita":baseMap,"Uydu Görünümü":satelliteTiles},null,{collapsed:false,position:"topright"}).addTo(map);

const riskLayer = L.layerGroup().addTo(map);
const historyKey = "nova-forest-risk-history-v1";

function riskColor(score) {
  if (score < 25) return "#16c784";
  if (score < 50) return "#f5c542";
  if (score < 75) return "#ff7a18";
  return "#ff3b30";
}
function riskLabel(score) {
  if (score < 25) return "DÜŞÜK";
  if (score < 50) return "ORTA";
  if (score < 75) return "YÜKSEK";
  return "KRİTİK";
}
function areaLabel(area) {
  return area.toLocaleString("tr-TR") + " km²";
}
function calculateRisk(w) {
  let score=0;
  if(w.temperature>=40) score+=30; else if(w.temperature>=30) score+=15; else if(w.temperature>=25) score+=7;
  if(w.humidity<=20) score+=25; else if(w.humidity<=40) score+=10; else if(w.humidity<=55) score+=4;
  if(w.wind>=40) score+=25; else if(w.wind>=20) score+=10; else if(w.wind>=12) score+=4;
  return Math.min(100,score);
}
function specialWarnings(weather, score, firms) {
  const warnings=[];
  if(weather.temperature>=35) warnings.push("Yüksek sıcaklık");
  if(weather.humidity<=30) warnings.push("Düşük nem");
  if(weather.wind>=25) warnings.push("Kuvvetli rüzgar");
  if((firms?.nearby_hotspots_24h||0)>0) warnings.push("Yakın sıcak nokta");
  if((firms?.nearby_hotspots_7d||0)>=3) warnings.push("7 günde tekrarlanan aktivite");
  if(!warnings.length) warnings.push("Olağandışı sinyal yok");
  return warnings;
}
function saveHistory(regions) {
  const now=new Date().toISOString();
  const old=JSON.parse(localStorage.getItem(historyKey)||"[]");
  regions.forEach(r=>{
    if(!r.analysis) return;
    old.push({
      time:now, region:r.region, score:Number(r.analysis.risk_score||0),
      level:r.analysis.risk_level||riskLabel(Number(r.analysis.risk_score||0)),
      hotspots7d:Number(r.satellite?.nasa_firms?.nearby_hotspots_7d||0)
    });
  });
  localStorage.setItem(historyKey,JSON.stringify(old.slice(-300)));
}
function getHistory(region) {
  const old=JSON.parse(localStorage.getItem(historyKey)||"[]");
  return old.filter(x=>x.region===region).slice(-8).reverse();
}
function historyText(region) {
  const h=getHistory(region);
  if(!h.length) return "Bu tarayıcıda henüz geçmiş gözlem kaydı yok.";
  return h.map(x=>new Date(x.time).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+" · "+x.score+"/100 · "+x.level).join("<br>");
}
function popup(region, score, weather, satellite, source) {
  const d=REGION_DATA[region], color=riskColor(score);
  const ndvi=satellite?.sentinel_2?.ndvi ?? satellite?.ndvi ?? "Henüz hesaplanmadı";
  const firms=satellite?.nasa_firms||{};
  const warnings=specialWarnings(weather,score,firms);
  return '<div class="risk-popup">'+
    '<div class="popup-kicker">NOVA-FOREST / BÖLGESEL GÖZLEM</div>'+
    '<h3>'+region+'</h3>'+
    '<div class="popup-area">'+areaLabel(d.area)+'</div>'+
    '<div class="popup-score" style="color:'+color+'">'+score+'<small>/100</small></div>'+
    '<div class="popup-level" style="border-color:'+color+';color:'+color+'">'+riskLabel(score)+'</div>'+
    '<div class="popup-grid">'+
    '<span>Sıcaklık</span><b>'+weather.temperature+' °C</b>'+
    '<span>Nem</span><b>'+weather.humidity+' %</b>'+
    '<span>Rüzgar</span><b>'+weather.wind+' km/s</b>'+
    '<span>24s sıcak nokta</span><b>'+Number(firms.nearby_hotspots_24h||0)+'</b>'+
    '<span>7g geçmiş</span><b>'+Number(firms.nearby_hotspots_7d||0)+' olay</b>'+
    '<span>Sentinel-2</span><b>'+(satellite?.sentinel_2?'Gözlem kaynağı':'Bekliyor')+'</b>'+
    '<span>NDVI</span><b>'+ndvi+'</b></div>'+
    '<div class="popup-warning"><strong>Özel uyarılar</strong><br>'+warnings.join(" · ")+'</div>'+
    '<div class="popup-history"><strong>Son gözlemler</strong><br>'+historyText(region)+'</div>'+
    '<div class="popup-source">Kaynak: '+source+'</div></div>';
}
function renderRegion(region,weather,score,satellite,source) {
  const d=REGION_DATA[region]; if(!d)return;
  const color=riskColor(score), areaRadius=7000+Math.sqrt(d.area)*430;
  const content=popup(region,score,weather,satellite,source);
  L.circle(d.coords,{radius:areaRadius,color:color,weight:2,opacity:.7,fillColor:color,fillOpacity:.18}).bindPopup(content,{maxWidth:330}).addTo(riskLayer);
  L.circleMarker(d.coords,{radius:7+Math.min(score/15,5),color:"#fff",weight:2,fillColor:color,fillOpacity:1}).bindPopup(content,{maxWidth:330}).addTo(riskLayer);
  L.marker(d.coords,{interactive:false,icon:L.divIcon({
    className:"region-label",
    html:'<span>'+region+'</span><strong>'+areaLabel(d.area)+'</strong>',
    iconSize:[170,48],iconAnchor:[-8,24]
  })}).addTo(riskLayer);
}
async function loadBackend(){
  if(!API_BASE) throw new Error("API adresi tanımlı değil");
  const r=await fetch(API_BASE+"/risk-analysis",{cache:"no-store"});
  if(!r.ok)throw new Error("Risk API erişilemedi");
  return r.json();
}
async function loadOpenMeteoFallback(){
  const results=await Promise.all(Object.entries(REGION_DATA).map(async([region,d])=>{
    const u=new URL("https://api.open-meteo.com/v1/forecast");
    u.searchParams.set("latitude",d.coords[0]); u.searchParams.set("longitude",d.coords[1]);
    u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m");
    u.searchParams.set("timezone","Europe/Istanbul");
    const r=await fetch(u.toString(),{cache:"no-store"}); if(!r.ok)throw new Error("Hava verisi alınamadı");
    const c=(await r.json()).current||{};
    const weather={temperature:Number(c.temperature_2m??0),humidity:Number(c.relative_humidity_2m??0),wind:Number(c.wind_speed_10m??0)};
    const score=calculateRisk(weather);
    return {region,weather,analysis:{risk_score:score,risk_level:riskLabel(score)},satellite:{nasa_firms:{nearby_hotspots_24h:0,nearby_hotspots_7d:0}},data_source:["Open-Meteo"]};
  }));
  return {regions:results,source:"Open-Meteo canlı yedek akış"};
}
async function loadRiskMap(){
  const status=document.querySelector("[data-map-status]");
  try{
    let data,source;
    try{data=await loadBackend();source="Nova-Forest API";}
    catch(_){data=await loadOpenMeteoFallback();source="Open-Meteo canlı yedek akış";}
    riskLayer.clearLayers();
    (data.regions||[]).forEach(r=>{if(r.weather&&r.analysis)renderRegion(r.region,r.weather,Number(r.analysis.risk_score||0),r.satellite||{},source);});
    const valid=(data.regions||[]).filter(r=>r.analysis);
    saveHistory(valid);
    const avg=valid.length?Math.round(valid.reduce((s,r)=>s+Number(r.analysis.risk_score||0),0)/valid.length):0;
    const activeWarnings=valid.reduce((n,r)=>n+specialWarnings(r.weather,Number(r.analysis.risk_score||0),r.satellite?.nasa_firms).filter(x=>x!=="Olağandışı sinyal yok").length,0);
    if(status){status.textContent="CANLI • "+valid.length+" BÖLGE • ORTALAMA RİSK "+avg+"/100 • "+activeWarnings+" ÖZEL UYARI";status.dataset.state="live";}
    const notice=document.querySelector("[data-alert-summary]");
    if(notice)notice.textContent=activeWarnings?activeWarnings+" özel uyarı aktif — riskli alanları açarak ayrıntıları inceleyin.":"Şu an olağandışı bir sinyal tespit edilmedi.";
    const history=document.querySelector("[data-history-summary]");
    if(history)history.textContent="Tarayıcıdaki son gözlemler otomatik kaydediliyor. Bu kayıtlar cihazına özeldir.";
  }catch(e){
    console.error("Nova-Forest harita:",e);
    if(status){status.textContent="VERİ YÜKLENEMEDİ — YENİDEN DENENİYOR";status.dataset.state="error";}
  }
}
loadRiskMap();
setInterval(loadRiskMap,300000);
