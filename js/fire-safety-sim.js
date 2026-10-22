/* Educational wind exposure and evacuation-readiness scenario. Not a fire-spread or route engine. */
(()=>{
  const provinces={
    "Edirne":{lat:41.6771,lon:26.5557},"Tekirdağ":{lat:40.9781,lon:27.5117},
    "Kırklareli":{lat:41.7351,lon:27.2252},"Çanakkale":{lat:40.1553,lon:26.4142},
    "İstanbul":{lat:41.0082,lon:28.9784}
  };
  const root=document.querySelector("[data-fire-safety-sim]");
  if(!root||!window.L||typeof map==="undefined")return;
  const $=s=>root.querySelector(s);
  let corridor=null,marker=null,lastWeather=null;
  const language=()=>document.documentElement.dataset.language||"tr";
  const t=(tr,en)=>language()==="en"?en:tr;
  const evacChecks=[...document.querySelectorAll("[data-evac-check]")];
  function updateEvacuationReadiness(){
    const done=evacChecks.filter(input=>input.checked).length,total=evacChecks.length;
    const label=document.querySelector("[data-evac-progress]");
    const bar=document.querySelector("[data-evac-progress-bar]");
    const progress=bar?.parentElement;
    if(label){label.dataset.languageFixed="";label.textContent=t("Tamamlanan hazırlık adımı: ","Readiness steps completed: ")+done+"/"+total;}
    if(bar)bar.style.width=(total?done/total*100:0)+"%";
    progress?.setAttribute("aria-valuenow",String(done));
    const note=document.querySelector("[data-evac-note]");
    if(note){note.dataset.languageFixed="";note.textContent=done===total
      ?t("Kontrol listesi tamamlandı; bu, resmî tahliye izni veya güvenli rota onayı değildir.","Checklist complete; this is not official evacuation clearance or confirmation of a safe route.")
      :t("Bu liste hazırlık kontrolüdür; resmî tahliye talimatının yerine geçmez.","This is a preparedness checklist; it does not replace official evacuation instructions.");}
  }
  const province=()=>provinces[$("[data-sim-province]").value]||provinces.Edirne;
  const status=text=>{$("[data-sim-status]").textContent=text;};
  const pointAt=(lat,lon,bearing,distanceKm)=>{
    const R=6371,br=bearing*Math.PI/180,dr=distanceKm/R,p1=lat*Math.PI/180,l1=lon*Math.PI/180;
    const p2=Math.asin(Math.sin(p1)*Math.cos(dr)+Math.cos(p1)*Math.sin(dr)*Math.cos(br));
    const l2=l1+Math.atan2(Math.sin(br)*Math.sin(dr)*Math.cos(p1),Math.cos(dr)-Math.sin(p1)*Math.sin(p2));
    return [p2*180/Math.PI,((l2*180/Math.PI+540)%360)-180];
  };
  function clear(){if(corridor)map.removeLayer(corridor);if(marker)map.removeLayer(marker);corridor=marker=null;}
  function simulate(){
    const p=province(),from=Number($("[data-sim-direction]").value),speed=Number($("[data-sim-speed]").value),hours=Number($("[data-sim-hours]").value);
    const bearing=(from+180)%360;
    const length=Math.min(15,Math.max(1,speed*hours*.12));
    const width=Math.min(4,Math.max(.4,.4+speed*.035));
    const left=pointAt(p.lat,p.lon,bearing-90,width),right=pointAt(p.lat,p.lon,bearing+90,width);
    const end=pointAt(p.lat,p.lon,bearing,length),endLeft=pointAt(end[0],end[1],bearing-90,width*1.8),endRight=pointAt(end[0],end[1],bearing+90,width*1.8);
    clear();
    corridor=L.polygon([left,right,endRight,end,endLeft,left],{color:"#f97316",weight:2,fillColor:"#fb923c",fillOpacity:.2,dashArray:"7 5"}).addTo(map);
    marker=L.marker([p.lat,p.lon]).addTo(map).bindPopup(t("Senaryo başlangıç noktası · "+$("[data-sim-province]").value,"Scenario origin · "+$("[data-sim-province]").value));
    map.fitBounds(corridor.getBounds(),{padding:[24,24],maxZoom:10});
    const windTo=["K","KD","D","GD","G","GB","B","KB"][Math.round(bearing/45)%8];
    status(t("Görsel senaryo: rüzgâr "+speed+" km/sa; etki yönü "+windTo+". Kaynak: "+(lastWeather?.time||"manuel senaryo")+".","Illustrative scenario: wind "+speed+" km/h; direction "+windTo+". Source: "+(lastWeather?.time||"manual scenario")+"."));
    $("[data-sim-result]").textContent=t("Turuncu koridor yalnızca rüzgâr yönü ve seçilen senaryo süresini görselleştirir. Yangının yayılma mesafesini, dumanı, araziyi veya güvenli tahliye yolunu hesaplamaz.","The orange corridor only visualizes wind direction and the selected scenario duration. It does not calculate fire spread, smoke, terrain, or a safe evacuation route.");
  }
  $("[data-sim-direction]").addEventListener("input",e=>{$("[data-sim-direction-label]").textContent=e.target.value+"°";});
  $("[data-sim-speed]").addEventListener("input",e=>{$("[data-sim-speed-label]").textContent=e.target.value+" km/sa";});
  $("[data-sim-hours]").addEventListener("change",()=>{});
  $("[data-sim-run]").addEventListener("click",simulate);
  $("[data-sim-reset]").addEventListener("click",()=>{clear();status(t("Senaryo sıfırlandı.","Scenario reset."));$("[data-sim-result]").textContent="";});
  $("[data-sim-weather]").addEventListener("click",async()=>{
    const p=province();status(t("Güncel rüzgâr verisi alınıyor…","Loading current wind data…"));
    try{
      const url=new URL("https://api.open-meteo.com/v1/forecast");
      url.search=new URLSearchParams({latitude:p.lat,longitude:p.lon,current:"wind_speed_10m,wind_direction_10m",wind_speed_unit:"kmh",timezone:"Europe/Istanbul"});
      const r=await fetch(url,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);
      const data=await r.json(),current=data.current;
      if(!current||!Number.isFinite(Number(current.wind_speed_10m))||!Number.isFinite(Number(current.wind_direction_10m)))throw Error("Missing wind fields");
      lastWeather={time:current.time};
      $("[data-sim-speed]").value=Math.max(0,Math.min(100,Math.round(current.wind_speed_10m)));
      $("[data-sim-speed-label]").textContent=$("[data-sim-speed]").value+" km/sa";
      $("[data-sim-direction]").value=Math.round(current.wind_direction_10m);
      $("[data-sim-direction-label]").textContent=$("[data-sim-direction]").value+"°";
      status(t("Open-Meteo gözlemi: ","Open-Meteo observation: ")+current.time);
    }catch(e){lastWeather=null;status(t("Rüzgâr verisi alınamadı. Manuel değerlerle devam edebilirsin.","Wind data unavailable. You can continue with manual values."));}
  });
  evacChecks.forEach(input=>input.addEventListener("change",updateEvacuationReadiness));
  updateEvacuationReadiness();
  document.addEventListener("click",e=>{if(e.target.closest("#nexora-language-toggle"))setTimeout(()=>{if(lastWeather)status(t("Open-Meteo gözlemi: ","Open-Meteo observation: ")+lastWeather.time);updateEvacuationReadiness();},0);});
})();
