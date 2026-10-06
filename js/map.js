const API_BASE=(window.NOVA_API_BASE||"").replace(/\/$/,"");
const geoPath=document.location.pathname.includes("/pages/")?"../data/turkiye_iller.geojson":"data/turkiye_iller.geojson";
const TRAKYA=new Set(["Edirne","Kırklareli","Tekirdağ"]);
const map=L.map("map",{zoomControl:true}).setView([41.25,26.8],8);
const base=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap katkıda bulunanlar"}).addTo(map);
const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"Tiles &copy; Esri"});
L.control.layers({"Temel Harita":base,"Uydu Görünümü":sat},null,{collapsed:false}).addTo(map);
const layer=L.layerGroup().addTo(map);
const historyKey="nova-forest-trakya-history-v3";

function riskColor(s){return s<25?"#16c784":s<50?"#f5c542":s<75?"#ff7a18":"#ff3b30"}
function riskLabel(s){return s<25?"DÜŞÜK":s<50?"ORTA":s<75?"YÜKSEK":"KRİTİK"}
function riskScore(w){
 let s=0,t=Number(w.temperature),h=Number(w.humidity),wind=Number(w.wind);
 if(t>=40)s+=30;else if(t>=30)s+=15;else if(t>=25)s+=7;
 if(h<=20)s+=25;else if(h<=40)s+=10;else if(h<=55)s+=4;
 if(wind>=40)s+=25;else if(wind>=20)s+=10;else if(wind>=12)s+=4;
 if(Number(w.soil)<.18)s+=10;
 return Math.min(100,s);
}
function coordsOf(g){const a=[];function walk(x){if(typeof x[0]==="number")a.push(x);else x.forEach(walk)}walk(g.coordinates);if(!a.length)return null;return[a.reduce((s,p)=>s+p[1],0)/a.length,a.reduce((s,p)=>s+p[0],0)/a.length]}
function areaKm2(g){let total=0;function ringArea(r){let a=0,lat=0;r.forEach(p=>lat+=p[1]);lat/=r.length;const k=111.32,c=Math.cos(lat*Math.PI/180);for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]*c)*(r[i][1])-(r[i][0]*c)*(r[j][1]);return Math.abs(a)*k*k/2}function walk(x){if(!Array.isArray(x)||!x.length)return;if(typeof x[0][0]==="number")total+=ringArea(x);else x.forEach(walk)}walk(g.coordinates);return Math.round(total)}
function warnings(w,h){const a=[];if(w.temperature>=35)a.push("Yüksek sıcaklık");if(w.humidity<=30)a.push("Düşük nem");if(w.wind>=25)a.push("Kuvvetli rüzgar");if((h?.hotspots24||0)>0)a.push("Yakın sıcak nokta");if(w.soil!==null&&w.soil<.18)a.push("Toprak nemi düşük");if(w.frost)a.push("Don riski");return a.length?a:["Olağandışı sinyal yok"]}
function saveHistory(rows){const old=JSON.parse(localStorage.getItem(historyKey)||"[]"),now=new Date().toISOString();rows.forEach(r=>old.push({time:now,province:r.name,score:r.score}));localStorage.setItem(historyKey,JSON.stringify(old.slice(-300)))}
function historyFor(name){const h=JSON.parse(localStorage.getItem(historyKey)||"[]").filter(x=>x.province===name).slice(-6).reverse();return h.length?h.map(x=>new Date(x.time).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+" · "+x.score+"/100").join("<br>"):"Bu cihazda henüz geçmiş gözlem yok."}
function popup(p,w,score,area,h){
 const ws=warnings(w,h);
 return '<div class="risk-popup"><div class="popup-kicker">NOVA-FOREST / TRAKYA GÖZLEM</div><h3>'+p.name+'</h3><div class="popup-area">'+area.toLocaleString("tr-TR")+' km² · '+riskLabel(score)+'</div><div class="popup-score" style="color:'+riskColor(score)+'">'+score+'<small>/100</small></div><div class="popup-grid"><span>Sıcaklık</span><b>'+w.temperature+' °C</b><span>Nem</span><b>'+w.humidity+' %</b><span>Rüzgar</span><b>'+w.wind+' km/s</b><span>Toprak nemi</span><b>'+((w.soil??0)*100).toFixed(0)+' %</b><span>24s sıcak nokta</span><b>'+h.hotspots24+'</b></div><div class="popup-warning"><strong>Özel uyarılar</strong><br>'+ws.join(" · ")+'</div><div class="popup-history"><strong>Son gözlemler</strong><br>'+historyFor(p.name)+'</div></div>';
}
function drawFeature(feature,w,h){
 const p=feature.properties||{},name=p.il_adi||p.name||"İl",area=areaKm2(feature.geometry),score=riskScore(w),color=riskColor(score);
 const gj=L.geoJSON(feature,{style:{color:"#102218",weight:1.5,opacity:.95,fillColor:color,fillOpacity:.62},onEachFeature:(f,l)=>{
   l.bindPopup(popup({name},w,score,area,h),{maxWidth:340});
   l.on({mouseover:e=>e.target.setStyle({weight:3,fillOpacity:.82}),mouseout:e=>e.target.setStyle({weight:1.5,fillOpacity:.62})});
 }}).addTo(layer);return gj;
}
async function weatherFor(features){
 const centers=features.map(f=>coordsOf(f.geometry));const lat=centers.map(x=>x?.[0]??41.2).join(",");const lon=centers.map(x=>x?.[1]??26.8).join(",");
 const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
 u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit");
 u.searchParams.set("hourly","soil_moisture_0_to_7cm,soil_temperature_0_to_7cm,precipitation_probability");
 u.searchParams.set("daily","et0_fao_evapotranspiration,precipitation_sum,temperature_2m_min,temperature_2m_max");
 u.searchParams.set("forecast_days","3");u.searchParams.set("timezone","Europe/Istanbul");
 const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("Meteoroloji akışı alınamadı");const j=await r.json();return Array.isArray(j)?j:[j];
}
async function pollenFor(features){
 const centers=features.map(f=>coordsOf(f.geometry));const lat=centers.map(x=>x?.[0]??41.2).join(",");const lon=centers.map(x=>x?.[1]??26.8).join(",");
 const u=new URL("https://air-quality-api.open-meteo.com/v1/air-quality");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
 u.searchParams.set("current","european_aqi,pm2_5,pm10,alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen");u.searchParams.set("timezone","Europe/Istanbul");
 const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("Polen akışı alınamadı");const j=await r.json();return Array.isArray(j)?j:[j];
}
async function firmsFromBackend(){if(!API_BASE)return{};try{const r=await fetch(API_BASE+"/risk-analysis",{cache:"no-store"});if(!r.ok)throw 0;const j=await r.json();const out={};(j.regions||[]).forEach(x=>{out[x.region]={hotspots24:Number(x.satellite?.nasa_firms?.nearby_hotspots_24h||0),hotspots7:Number(x.satellite?.nasa_firms?.nearby_hotspots_7d||0)}});return out}catch{return{}}}
function beeScore(w){let s=100;if(w.temperature<15)s-=45;else if(w.temperature<18)s-=20;if(w.temperature>34)s-=30;if(w.wind>25)s-=35;else if(w.wind>15)s-=15;if(w.precipitation>.5)s-=30;return Math.max(0,Math.min(100,Math.round(s)))}
function beeLabel(s){return s>=75?"ÇOK UYGUN":s>=50?"UYGUN":s>=25?"SINIRLI":"UYGUN DEĞİL"}
function pollenLabel(v){return v>100?"YÜKSEK":v>30?"ORTA":"DÜŞÜK"}
function updateInsights(rows,pollen){
 const r=rows[0],p=pollen[0]?.current||{},w=r.w,b=beeScore(w),maxP=Math.max(Number(p.alder_pollen||0),Number(p.birch_pollen||0),Number(p.grass_pollen||0),Number(p.mugwort_pollen||0),Number(p.olive_pollen||0),Number(p.ragweed_pollen||0));
 const set=(s,v)=>{const e=document.querySelector(s);if(e)e.textContent=v};
 set("[data-farm-title]",w.soil<.18?"Su stresi izleniyor":"Toprak nemi uygun görünüyor");set("[data-farm-summary]",w.et0>4?"Buharlaşma talebi yüksek; sulama planı gözden geçirilmeli.":"ET₀ düşük/orta; sulama ihtiyacı hava koşullarıyla birlikte takip edilmeli.");set("[data-soil]",w.soil===null?"—":(w.soil*100).toFixed(0)+" %");set("[data-et0]",w.et0.toFixed(1)+" mm");
 set("[data-bee-title]",beeLabel(b));set("[data-bee-summary]","Bu gösterge meteorolojik uçuş koşulu tahminidir; arı sağlığı veya bal verimi ölçümü değildir.");set("[data-bee-score]",b+"/100");set("[data-pollen]",pollenLabel(maxP));
 set("[data-forest-title]",riskLabel(r.score));set("[data-forest-summary]",r.score>=50?"Orman yangını/kuraklık açısından dikkat gerektiren koşullar var.":"Mevcut meteorolojik koşullarda belirgin yüksek risk sinyali yok.");set("[data-forest-risk]",r.score+"/100");set("[data-forest-alert]",warnings(w,r.h).filter(x=>x!=="Olağandışı sinyal yok")[0]||"Normal");
}
async function loadNational(){
 const status=document.querySelector("[data-map-status]");
 try{
  const gj=await fetch(geoPath,{cache:"no-store"}).then(r=>r.json());const features=(gj.features||[]).filter(f=>TRAKYA.has((f.properties||{}).il_adi));
  const [weather,pollen,firmMap]=await Promise.all([weatherFor(features),pollenFor(features),firmsFromBackend()]);
  layer.clearLayers();
  const rows=features.map((f,i)=>{const p=f.properties||{},name=p.il_adi||p.name||"İl",c=weather[i]?.current||{},d=weather[i]?.daily||{};const w={temperature:Number(c.temperature_2m??0),humidity:Number(c.relative_humidity_2m??0),wind:Number(c.wind_speed_10m??0),precipitation:Number(c.precipitation??0),soil:c.soil_moisture_0_to_7cm==null?null:Number(c.soil_moisture_0_to_7cm),vpd:Number(c.vapour_pressure_deficit??0),et0:Number(d.et0_fao_evapotranspiration?.[0]??0),frost:Number(d.temperature_2m_min?.[0]??9)<=2};const h=firmMap[name]||{hotspots24:0,hotspots7:0};const score=riskScore(w);drawFeature(f,w,h);return{name,score,w,h}});
  saveHistory(rows);updateInsights(rows,pollen);
  const avg=Math.round(rows.reduce((a,r)=>a+r.score,0)/rows.length),alerts=rows.reduce((a,r)=>a+warnings(r.w,r.h).filter(x=>x!=="Olağandışı sinyal yok").length,0);
  if(status){status.textContent="CANLI • TRAKYA 3 İL • ORTALAMA RİSK "+avg+"/100 • "+alerts+" UYARI";status.dataset.state="live"}
 }catch(e){console.error(e);if(status){status.textContent="VERİ YÜKLENEMEDİ";status.dataset.state="error"}}
}
loadNational();setInterval(loadNational,300000);