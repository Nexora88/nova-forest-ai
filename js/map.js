const API_BASE=(window.NOVA_API_BASE||"").replace(/\/$/,"");
const geoPath=document.location.pathname.includes("/pages/")?"../data/turkiye_iller.geojson":"data/turkiye_iller.geojson";
const map=L.map("map",{zoomControl:true}).setView([39.0,35.2],6);
const base=L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:18,attribution:"&copy; OpenStreetMap katkıda bulunanlar"}).addTo(map);
const sat=L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:18,attribution:"Tiles &copy; Esri"});
L.control.layers({"Temel Harita":base,"Uydu Görünümü":sat},null,{collapsed:false}).addTo(map);
const layer=L.layerGroup().addTo(map);
const historyKey="nova-forest-national-history-v2";

function riskColor(s){return s<25?"#16c784":s<50?"#f5c542":s<75?"#ff7a18":"#ff3b30"}
function riskLabel(s){return s<25?"DÜŞÜK":s<50?"ORTA":s<75?"YÜKSEK":"KRİTİK"}
function riskScore(w){
 let s=0,t=Number(w.temperature),h=Number(w.humidity),wind=Number(w.wind);
 if(t>=40)s+=30;else if(t>=30)s+=15;else if(t>=25)s+=7;
 if(h<=20)s+=25;else if(h<=40)s+=10;else if(h<=55)s+=4;
 if(wind>=40)s+=25;else if(wind>=20)s+=10;else if(wind>=12)s+=4;
 return Math.min(100,s);
}
function coordsOf(g){
 const a=[];
 function walk(x){if(typeof x[0]==="number")a.push(x);else x.forEach(walk)}
 walk(g.coordinates);
 if(!a.length)return null;
 return [a.reduce((s,p)=>s+p[1],0)/a.length,a.reduce((s,p)=>s+p[0],0)/a.length];
}
function areaKm2(g){
 let total=0;
 function ringArea(r){
   let a=0,lat=0;
   r.forEach(p=>lat+=p[1]);lat/=r.length;
   const k=111.32, c=Math.cos(lat*Math.PI/180);
   for(let i=0,j=r.length-1;i<r.length;j=i++)a+=(r[j][0]*c)*(r[i][1])-(r[i][0]*c)*(r[j][1]);
   return Math.abs(a)*k*k/2;
 }
 function walk(x){if(!Array.isArray(x)||!x.length)return;if(typeof x[0][0]==="number")total+=ringArea(x);else x.forEach(walk)}
 walk(g.coordinates);return Math.round(total);
}
function warnings(w,s){
 const a=[];
 if(w.temperature>=35)a.push("Yüksek sıcaklık");
 if(w.humidity<=30)a.push("Düşük nem");
 if(w.wind>=25)a.push("Kuvvetli rüzgar");
 if((s?.hotspots24||0)>0)a.push("Yakın sıcak nokta");
 return a.length?a:["Olağandışı sinyal yok"];
}
function saveHistory(rows){
 const old=JSON.parse(localStorage.getItem(historyKey)||"[]"),now=new Date().toISOString();
 rows.forEach(r=>old.push({time:now,province:r.name,score:r.score}));
 localStorage.setItem(historyKey,JSON.stringify(old.slice(-810)));
}
function historyFor(name){
 const h=JSON.parse(localStorage.getItem(historyKey)||"[]").filter(x=>x.province===name).slice(-8).reverse();
 return h.length?h.map(x=>new Date(x.time).toLocaleString("tr-TR",{day:"2-digit",month:"2-digit",hour:"2-digit",minute:"2-digit"})+" · "+x.score+"/100").join("<br>"):"Bu cihazda henüz geçmiş gözlem yok.";
}
function popup(p,w,score,area,hotspots){
 const ws=warnings(w,hotspots);
 return '<div class="risk-popup"><div class="popup-kicker">NOVA-FOREST / İLSEL GÖZLEM</div><h3>'+p.name+'</h3>'+
 '<div class="popup-area">'+area.toLocaleString("tr-TR")+' km² · '+riskLabel(score)+'</div>'+
 '<div class="popup-score" style="color:'+riskColor(score)+'">'+score+'<small>/100</small></div>'+
 '<div class="popup-grid"><span>Sıcaklık</span><b>'+w.temperature+' °C</b><span>Nem</span><b>'+w.humidity+' %</b><span>Rüzgar</span><b>'+w.wind+' km/s</b>'+
 '<span>24s sıcak nokta</span><b>'+hotspots.hotspots24+'</b><span>Veri</span><b>Open-Meteo</b></div>'+
 '<div class="popup-warning"><strong>Özel uyarılar</strong><br>'+ws.join(" · ")+'</div>'+
 '<div class="popup-history"><strong>Son gözlemler</strong><br>'+historyFor(p.name)+'</div></div>';
}
function drawFeature(feature,weather,hotspots){
 const p=feature.properties||{},name=p.il_adi||p.name||"İl",area=areaKm2(feature.geometry);
 const score=riskScore(weather),color=riskColor(score),content=popup({name},weather,score,area,hotspots);
 return L.geoJSON(feature,{style:{color:"#0b1510",weight:1.2,opacity:.95,fillColor:color,fillOpacity:.58},
 onEachFeature:(f,l)=>{
   l.bindPopup(content,{maxWidth:340});
   l.on({mouseover:e=>e.target.setStyle({weight:2.5,fillOpacity:.78}),mouseout:e=>e.target.setStyle({weight:1.2,fillOpacity:.58})});
 }}).addTo(layer);
}
async function nationalWeather(features){
 const centers=features.map(f=>coordsOf(f.geometry));
 const lat=centers.map(x=>x?x[0]:39).join(",");
 const lon=centers.map(x=>x?x[1]:35).join(",");
 const u=new URL("https://api.open-meteo.com/v1/forecast");
 u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);
 u.searchParams.set("current","temperature_2m,relative_humidity_2m,wind_speed_10m");
 u.searchParams.set("timezone","Europe/Istanbul");
 const r=await fetch(u.toString(),{cache:"no-store"});if(!r.ok)throw Error("Meteoroloji akışı alınamadı");
 const j=await r.json();return Array.isArray(j)?j:[j];
}
async function firmsFromBackend(){
 if(!API_BASE)return {};
 try{const r=await fetch(API_BASE+"/risk-analysis",{cache:"no-store"});if(!r.ok)throw 0;const j=await r.json();
  const out={};(j.regions||[]).forEach(x=>{out[x.region]={hotspots24:Number(x.satellite?.nasa_firms?.nearby_hotspots_24h||0),hotspots7:Number(x.satellite?.nasa_firms?.nearby_hotspots_7d||0)}});return out;
 }catch(e){return {}}
}
async function loadNational(){
 const status=document.querySelector("[data-map-status]");
 try{
  const gj=await fetch(new URL(geoPath,document.baseURI),{cache:"no-store"}).then(r=>r.json());
  const features=gj.features||[];
  const [weather,firmMap]=await Promise.all([nationalWeather(features),firmsFromBackend()]);
  layer.clearLayers();
  const rows=features.map((f,i)=>{
   const p=f.properties||{},name=p.il_adi||p.name||"İl",c=weather[i]?.current||{};
   const w={temperature:Number(c.temperature_2m??0),humidity:Number(c.relative_humidity_2m??0),wind:Number(c.wind_speed_10m??0)};
   const h=firmMap[name]||{hotspots24:0,hotspots7:0},score=riskScore(w);
   drawFeature(f,w,h);return{name,score,w,h};
  });
  saveHistory(rows);
  const avg=Math.round(rows.reduce((a,r)=>a+r.score,0)/rows.length);
  const alerts=rows.reduce((a,r)=>a+warnings(r.w,r.h).filter(x=>x!=="Olağandışı sinyal yok").length,0);
  if(status){status.textContent="CANLI • "+rows.length+" İL • ORTALAMA RİSK "+avg+"/100 • "+alerts+" UYARI";status.dataset.state="live"}
  const notice=document.querySelector("[data-alert-summary]");if(notice)notice.textContent=alerts+" aktif özel uyarı. Renkli alanlara tıklayarak il detayını aç.";
  const history=document.querySelector("[data-history-summary]");if(history)history.textContent="81 ilin son gözlemleri cihazda saklanıyor; il penceresinde geçmiş akışı görebilirsin.";
 }catch(e){console.error(e);if(status){status.textContent="VERİ YÜKLENEMEDİ";status.dataset.state="error"}}
}
loadNational();setInterval(loadNational,300000);
