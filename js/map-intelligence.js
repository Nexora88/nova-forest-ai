const NOVA_PROFILE_KEY="nexorawildfire-profile-v1";
const NOVA_NOTIFY_KEY="nexorawildfire-notify-v1";
let forecastTarget=null, forecastDays=[];
let fireLayer=L.layerGroup().addTo(map), ndviLayer=L.layerGroup().addTo(map);
function profile(){try{return JSON.parse(localStorage.getItem(NOVA_PROFILE_KEY)||"null")}catch{return null}}
function savedAreas(){try{return JSON.parse(localStorage.getItem(areaKey)||"[]")}catch{return[]}}
function finiteOrNull(value){if(value===null||value===undefined||value==="")return null;const n=Number(value);return Number.isFinite(n)?n:null}
function forecastRisk(t,h,wind,precip){if(t===null||h===null||wind===null)return null;let s=0;if(t>=40)s+=30;else if(t>=30)s+=15;else if(t>=25)s+=7;if(h<=20)s+=25;else if(h<=40)s+=10;else if(h<=55)s+=4;if(wind>=40)s+=25;else if(wind>=20)s+=10;else if(wind>=12)s+=4;if(precip!==null&&precip>=20)s=Math.max(0,s-12);return Math.min(100,s)}
async function forecastAt(lat,lon){const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude",lat);u.searchParams.set("longitude",lon);u.searchParams.set("daily","temperature_2m_max,temperature_2m_min,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum,et0_fao_evapotranspiration");u.searchParams.set("forecast_days","4");u.searchParams.set("timezone","Europe/Istanbul");const j=await fetch(u).then(r=>r.json()),d=j.daily||{};return(d.time||[]).map((date,i)=>{const t=finiteOrNull(d.temperature_2m_max?.[i]),tmin=finiteOrNull(d.temperature_2m_min?.[i]),h=finiteOrNull(d.relative_humidity_2m_min?.[i]),wind=finiteOrNull(d.wind_speed_10m_max?.[i]),precip=finiteOrNull(d.precipitation_sum?.[i]),et0=finiteOrNull(d.et0_fao_evapotranspiration?.[i]);return{date,t,tmin,h,wind,precip,et0,risk:forecastRisk(t,h,wind,precip)}})}
function riskWord(v){if(v===null||v===undefined)return "VER\u0130 YOK";return v>=75?"KRİTİK":v>=50?"YÜKSEK":v>=25?"ORTA":"DÜŞÜK"}
function renderTimeline(){const box=el(".nova-timeline");if(!box)return;const target=forecastTarget;box.innerHTML='<div class="timeline-head"><div><strong>4 G\u00dcNL\u00dcK R\u0130SK \u00d6NG\u00d6R\u00dcS\u00dc</strong><small>'+(target?.name||"Seçili konum")+' · Open-Meteo tahmini</small></div><span>TAHMİN / KARAR DESTEĞİ</span></div><div class="timeline-track">'+forecastDays.slice(0,4).map((d,i)=>'<button data-day="'+i+'" class="timeline-day '+(i===0?"active":"")+'"><small>'+new Date(d.date+"T12:00:00").toLocaleDateString("tr-TR",{weekday:"short",day:"2-digit",month:"2-digit"})+'</small><b>'+(d.risk===null?'VER\u0130 YOK':d.risk)+'</b><span>'+riskWord(d.risk)+'</span></button>').join("")+'</div><div class="timeline-detail" data-timeline-detail></div>';
box.querySelectorAll("[data-day]").forEach(b=>b.onclick=()=>{box.querySelectorAll("[data-day]").forEach(x=>x.classList.remove("active"));b.classList.add("active");showForecastDetail(Number(b.dataset.day))});showForecastDetail(0)}
function showForecastDetail(i){const d=forecastDays[i],x=el("[data-timeline-detail]");if(!d||!x)return;const fmt=(v,suffix="",digits=1)=>v===null||v===undefined?"No data":(typeof v==="number"?v.toFixed(digits):v)+suffix;x.innerHTML='<div><span>SICAKLIK</span><b>'+fmt(d.tmin,'\u00b0')+' \u2013 '+fmt(d.t,' \u00b0C')+'</b></div><div><span>NEM M\u0130N.</span><b>'+fmt(d.h,' %')+'</b></div><div><span>R\u00dcZGAR</span><b>'+fmt(d.wind,' km/sa')+'</b></div><div><span>YA\u011eI\u015e</span><b>'+fmt(d.precip,' mm')+'</b></div><div><span>ET\u2080</span><b>'+fmt(d.et0,' mm')+'</b></div><div><span>R\u0130SK</span><b style="color:'+(d.risk===null?'#91a59a':color(d.risk))+'">'+(d.risk===null?'VER\u0130 YOK':d.risk+'/100 \u00b7 '+riskWord(d.risk))+'</b></div>'}
async function setForecastTarget(name,lat,lon){forecastTarget={name,lat,lon};try{forecastDays=await forecastAt(lat,lon);renderTimeline()}catch{forecastDays=[];renderTimeline()}}
function addSearchUI(){
  if(el(".nova-map-search"))return;
  const box=document.createElement("div");box.className="nova-map-search";
  const form=document.createElement("form");
  const input=document.createElement("input");input.name="q";input.placeholder="K\u00f6y, il\u00e7e veya koordinat ara\u2026";input.autocomplete="off";input.setAttribute("aria-label","K\u00f6y, il\u00e7e veya koordinat ara");
  const submit=document.createElement("button");submit.type="submit";submit.textContent="Ara";
  form.append(input,submit);
  const help=document.createElement("div");help.className="search-help";help.textContent='\u00d6rn. \u201cKe\u015fan\u201d, \u201cYaylak\u00f6y\u201d veya \u201c41.15, 27.10\u201d';
  const result=document.createElement("div");result.className="search-results";result.setAttribute("aria-live","polite");
  box.append(form,help,result);
  const section=el(".map-section"),mapNode=el("#map");
  if(mapNode&&mapNode.parentNode===section)section.insertBefore(box,mapNode);else section.appendChild(box);
  form.onsubmit=async event=>{
    event.preventDefault();const query=input.value.trim();if(!query)return;
    result.textContent="Aran\u0131yor\u2026";
    const coordinate=query.match(/^(-?\d+(?:\.\d+)?)\s*[, ]\s*(-?\d+(?:\.\d+)?)$/);
    try{
      let rows=[];
      if(coordinate){
        const lat=Number(coordinate[1]),lon=Number(coordinate[2]);
        if(lat < -90 || lat > 90 || lon < -180 || lon > 180){result.textContent="Koordinatlar ge\u00e7erli aral\u0131kta de\u011fil.";return;}
        rows=[{lat,lon,display_name:query}];
      }else{
        const url=new URL("https://nominatim.openstreetmap.org/search");
        url.searchParams.set("format","jsonv2");url.searchParams.set("limit","5");url.searchParams.set("q",query+", T\u00fcrkiye");url.searchParams.set("addressdetails","1");url.searchParams.set("accept-language","tr");
        rows=await fetch(url).then(response=>{if(!response.ok)throw new Error("Search unavailable");return response.json()});
      }
      if(!rows.length){result.textContent="Sonu\u00e7 bulunamad\u0131.";return;}
      result.replaceChildren();
      rows.forEach((row,index)=>{
        const choice=document.createElement("button");choice.type="button";choice.textContent=String(row.display_name||query);choice.dataset.index=String(index);
        choice.addEventListener("click",async()=>{
          const selected=rows[index],lat=Number(selected.lat),lon=Number(selected.lon);
          if(!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat > 90||lon < -180||lon > 180){result.textContent="Konum koordinatlar\u0131 ge\u00e7ersiz.";return;}
          map.setView([lat,lon],13);
          const popup=document.createElement("div"),heading=document.createElement("strong"),caption=document.createElement("div");
          heading.textContent=String(selected.display_name||query);caption.textContent="Arama sonucu \u00b7 \u00e7evresel karar deste\u011fi";popup.append(heading,caption);
          L.marker([lat,lon]).addTo(settlementLayer).bindPopup(popup).openPopup();
          await setForecastTarget(String(selected.display_name||query).split(",")[0],lat,lon);
          result.textContent="Konum se\u00e7ildi \u00b7 "+String(selected.display_name||query);
        });
        result.append(choice);
      });
    }catch{result.textContent="Arama servisine ula\u015f\u0131lamad\u0131.";}
  };
}
function addTimelineUI(){if(el(".nova-timeline"))return;const box=document.createElement("section");box.className="nova-timeline";(()=>{const section=el(".map-section"),mapNode=el("#map");if(mapNode&&mapNode.parentNode===section)section.insertBefore(box,mapNode);else section.appendChild(box)})();const a=savedAreas()[0],h=JSON.parse(localStorage.getItem("nexorawildfire-home-v1")||"null");if(a){const [lat,lon]=coords({coordinates:a.coordinates});setForecastTarget(a.name,lat,lon)}else if(h){setForecastTarget(h.name,h.lat,h.lon)}else{const center=map.getCenter();setForecastTarget("Harita merkezi",center.lat,center.lng)}}
function addLayerManager(){if(el(".nova-layer-manager"))return;const box=document.createElement("div");box.className="nova-layer-manager";box.innerHTML='<strong>KATMANLAR</strong><label><input type="checkbox" data-layer="risk" checked> Hava / çevre riski</label><label><input type="checkbox" data-layer="ndvi"> Bitki örtüsü / NDVI</label><label><input type="checkbox" data-layer="firms"> Aktif yangınlar / NASA FIRMS</label><small>NDVI ve FIRMS yalnızca gerçek veri kaynağı yapılandırılmışsa gösterilir.</small>';(()=>{const section=el(".map-section"),mapNode=el("#map");if(mapNode&&mapNode.parentNode===section)section.insertBefore(box,mapNode);else section.appendChild(box)})();box.onchange=async e=>{const k=e.target.dataset.layer;if(!k)return;if(k==="risk")map.getZoom();if(k==="ndvi"){if(e.target.checked)await loadNdviPointLayer();else ndviLayer.clearLayers()}if(k==="firms"){if(e.target.checked)await loadFirmsLayer();else fireLayer.clearLayers()}}}
async function loadFirmsLayer(){fireLayer.clearLayers();if(!API_BASE){setStatus("NASA FIRMS katmanı için backend bağlantısı gerekli");return}try{const r=await fetch(API_BASE+"/risk-analysis").then(x=>x.json());(r.regions||[]).forEach(g=>{(g.satellite?.nasa_firms?.history||[]).forEach(f=>{if(f.latitude&&f.longitude)L.circleMarker([f.latitude,f.longitude],{radius:7,color:"#ff4b3e",fillColor:"#ff4b3e",fillOpacity:.85,weight:2}).bindPopup("<b>NASA FIRMS sıcak noktası</b><br>"+(f.acq_date||"")+" "+(f.acq_time||"")+"<br>Mesafe: "+(f.distance_km||"—")+" km").addTo(fireLayer)})})}catch{setStatus("NASA FIRMS verisi alınamadı")}}
async function loadNdviPointLayer(){ndviLayer.clearLayers();const a=savedAreas()[0];if(!API_BASE||!a){setStatus("NDVI için backend ve kayıtlı alan gerekli");return}try{const ring=a.coordinates.map(p=>[p[1],p[0]]);ring.push(ring[0]);const r=await fetch(API_BASE+"/ndvi/area-timeseries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({geometry:{type:"Polygon",coordinates:[ring]},days:180,interval:"P30D"})}).then(x=>x.json());if(r.latest?.ndvi!=null){const c=coords({coordinates:a.coordinates});L.circleMarker(c,{radius:11,color:"#8be28f",fillColor:"#8be28f",fillOpacity:.35,weight:2}).bindPopup("<b>Sentinel-2 NDVI</b><br>NDVI: "+Number(r.latest.ndvi).toFixed(2)+"<br>Kaynak: Copernicus Sentinel-2").addTo(ndviLayer)}}catch{setStatus("NDVI verisi alınamadı")}}
function notificationPrefs(){try{return JSON.parse(localStorage.getItem(NOVA_NOTIFY_KEY)||"{}")}catch{return{}}}
async function evaluateNotifications(){const p=notificationPrefs();if(!p.enabled||!API_BASE||!p.channel||!p.destination)return;const areas=savedAreas();for(const a of areas){const [lat,lon]=center(a.coordinates);try{const r=await fetch(API_BASE+"/notifications/evaluate",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({lat,lon,area_name:a.name,channel:p.channel,destination:p.destination,threshold:Number(p.threshold||70)})}).then(x=>x.json());if(r.status==="sent")console.info("NexoraWildfire bildirim gönderildi",a.name)}catch{}}}
function initMapIntelligence(){addSearchUI();addTimelineUI();addLayerManager();setTimeout(evaluateNotifications,2500);setInterval(evaluateNotifications,300000)}
setTimeout(initMapIntelligence,700);
