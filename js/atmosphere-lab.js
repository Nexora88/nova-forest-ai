/* Atmosphere lab. Real weather is fetched live; all spread/impact figures are explicitly user-defined scenarios. */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const T = (tr, en) => ((document.documentElement.dataset.language || document.documentElement.lang || "tr").toLowerCase().startsWith("en") ? en : tr);
  const LOCATIONS = {
    edirne: {name:"Edirne, Türkiye", lat:41.6771, lon:26.5557},
    canakkale: {name:"Çanakkale, Türkiye", lat:40.1553, lon:26.4142},
    queensland: {name:"Queensland, Australia", lat:-27.4698, lon:153.0251},
    california: {name:"California, USA", lat:36.7783, lon:-119.4179}
  };
  let weather = null, cameraStream = null, testVideoUrl = null, weatherRequestId = 0;
  const ARCHIVE_VIDEO_URL = "https://eoimages.gsfc.nasa.gov/images/imagerecords/154000/154641/namblackcarbon_geos5_20250803.mp4";
  const number = (v, digits=1) => Number.isFinite(Number(v)) ? Number(v).toFixed(digits) : "—";
  const setText = (id, value) => { const el=$(id); if(el) el.textContent=value; };
  const clip = (v,min,max) => Math.min(max,Math.max(min,v));
  const dirName = deg => {
    if(!Number.isFinite(Number(deg))) return "—";
    const names = ["N","NE","E","SE","S","SW","W","NW"];
    const localized = T("K, KD, D, GD, G, GB, B, KB","N, NE, E, SE, S, SW, W, NW").split(", ");
    const index = Math.round(((Number(deg) % 360) + 360) % 360 / 45) % 8;
    return localized[index] || names[index];
  };
  function setStatus(tr,en,kind="ok") {
    const el=$("atmo-provider-status");
    if(!el) return;
    el.innerHTML = "<span></span><b></b>";
    el.querySelector("b").textContent=T(tr,en);
    el.dataset.state=kind;
    el.style.color=kind==="error"?"#ff9999":kind==="warn"?"#ffd47a":"#9affb8";
  }
  async function loadWeather() {
    const requestId = ++weatherRequestId;
    const loc = LOCATIONS[$("atmo-region").value] || LOCATIONS.edirne;
    weather = null;
    ["atmo-temp","atmo-humidity","atmo-wind","atmo-direction","atmo-score"].forEach(id => setText(id, "—"));
    setText("atmo-risk-label", T("Veri bekleniyor", "Waiting for data"));
    setText("atmo-model-status", T("GÖZLEM BEKLENİYOR", "AWAITING OBSERVATIONS"));
    setText("atmo-contributions", T("Geçerli gözlem geldiğinde katkılar hesaplanır.", "Contributions will be calculated when valid observations arrive."));
    setText("atmo-explanation", T("Model açıklaması burada görünecek.", "Model explanation will appear here."));
    const ring = $("atmo-score-ring");
    if (ring) ring.style.borderColor = "#254632";
    setStatus("Open-Meteo verisi isteniyor", "Requesting Open-Meteo data", "warn");
    setText("atmo-updated", T("Veri isteği sürüyor…", "Request in progress…"));
    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.search = new URLSearchParams({
      latitude: String(loc.lat), longitude: String(loc.lon),
      current: "temperature_2m,relative_humidity_2m,wind_speed_10m,wind_direction_10m,precipitation",
      hourly: "relative_humidity_2m,temperature_2m,wind_speed_10m",
      past_days: "3", forecast_days: "1", timezone: "auto"
    }).toString();
    try {
      const response = await fetch(url, {headers: {Accept: "application/json"}});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const payload = await response.json();
      if (requestId !== weatherRequestId) return;
      const c = payload.current || {};
      const required = [c.temperature_2m, c.relative_humidity_2m, c.wind_speed_10m, c.wind_direction_10m];
      if (!required.every(v => v !== null && v !== undefined && Number.isFinite(Number(v)))) {
        throw new Error("Incomplete current observation");
      }
      weather = {location: loc, current: c, hourly: payload.hourly || {}, units: payload.current_units || {}, retrievedAt: new Date().toISOString()};
      setText("atmo-temp", number(c.temperature_2m) + " °C");
      setText("atmo-humidity", number(c.relative_humidity_2m, 0) + " %");
      setText("atmo-wind", number(c.wind_speed_10m) + " " + T("km/sa", "km/h"));
      setText("atmo-direction", number(c.wind_direction_10m, 0) + "° · " + dirName(c.wind_direction_10m));
      setText("atmo-temp-meta", "Open-Meteo · " + (payload.current_units?.temperature_2m || "°C"));
      setText("atmo-humidity-meta", T("Gözlem: ", "Observed: ") + (c.time || "—"));
      setText("atmo-wind-meta", T("Kaynak: Open-Meteo", "Source: Open-Meteo"));
      setText("atmo-updated", T("Son gözlem zamanı: ", "Observation time: ") + (c.time || "—") + " · " + loc.name);
      setStatus("GÜNCEL METEOROLOJİ ALINDI", "CURRENT WEATHER RECEIVED", "ok");
      calculateRisk();
      if ($("atmo-origin-lat").value.trim() === "" && $("atmo-origin-lon").value.trim() === "") {
        $("atmo-origin-lat").value = loc.lat;
        $("atmo-origin-lon").value = loc.lon;
      }
      const originLat = Number($("atmo-origin-lat").value), originLon = Number($("atmo-origin-lon").value);
      if (Number.isFinite(originLat) && Number.isFinite(originLon)) updateWindArrow(c.wind_direction_10m);
      updateHumidityTrend(payload.hourly);
    } catch (error) {
      if (requestId !== weatherRequestId) return;
      weather = null;
      ["atmo-temp","atmo-humidity","atmo-wind","atmo-direction","atmo-score"].forEach(id => setText(id, "—"));
      setText("atmo-risk-label", T("Veri gerekli", "Data required"));
      setText("atmo-model-status", T("GÖZLEM YOK", "NO OBSERVATION"));
      setText("atmo-contributions", T("Canlı meteoroloji alınamadı. Risk puanı hesaplanmadı.", "Live weather unavailable. No risk score was calculated."));
      setText("atmo-explanation", T("Bağlantı veya sağlayıcı sorunu: ", "Connection/provider issue: ") + (error?.message || "unknown"));
      setText("atmo-updated", T("Güncel veri alınamadı; sayısal değerler gösterilmiyor.", "Current data unavailable; numeric values are not shown."));
      if (ring) ring.style.borderColor = "#254632";
      setStatus("VERİ SAĞLAYICISI KULLANILAMIYOR", "PROVIDER UNAVAILABLE", "error");
    }
  }
  function updateHumidityTrend(hourly) {
    const times=hourly?.time||[], values=hourly?.relative_humidity_2m||[];
    const valid=[];
    for(let i=0;i<Math.min(times.length,values.length);i++) if(Number.isFinite(Number(values[i]))) valid.push({time:times[i],v:Number(values[i])});
    const past=valid.filter(x=>new Date(x.time).getTime()<=Date.now());
    if(past.length<2) { setText("atmo-humidity-meta",T("Üç günlük eğilim kullanılamıyor","Three-day trend unavailable")); return; }
    const first=past[0],last=past[past.length-1],delta=first.v-last.v;
    const trend=delta>0?T("nem düşüşü ","humidity decrease "):delta<0?T("nem artışı ","humidity increase "):T("nem değişimi yok ","no humidity change ");
    setText("atmo-humidity-meta",trend+number(Math.abs(delta),0)+" puan / "+T("son ","last ")+(last.time||"").slice(0,16));
  }
  function calculateRisk() {
    if(!weather) return;
    const c=weather.current;
    const temp=clip(Number(c.temperature_2m),0,45);
    const wind=clip(Number(c.wind_speed_10m),0,60);
    const humidity=clip(Number(c.relative_humidity_2m),0,100);
    const contributions=[
      {name:T("Sıcaklık · %40","Temperature · 40%"),v:.4*(temp/45*100)},
      {name:T("Rüzgâr · %30","Wind · 30%"),v:.3*(wind/60*100)},
      {name:T("Kuru hava · %30","Dry air · 30%"),v:.3*(100-humidity)}
    ];
    const score=Math.round(clip(contributions.reduce((sum,x)=>sum+x.v,0),0,100));
    setText("atmo-score",String(score));
    const label=score<25?T("Düşük gösterge","Low indicator"):score<50?T("Orta gösterge","Moderate indicator"):score<75?T("Yüksek gösterge","High indicator"):T("Çok yüksek gösterge","Very high indicator");
    setText("atmo-risk-label",label);
    setText("atmo-model-status",T("HESAPLANDI · KURAL TABANLI","CALCULATED · RULE-BASED"));
    $("atmo-score-ring").style.borderColor=score<25?"#3c9b62":score<50?"#c3b454":score<75?"#e59d44":"#f06464";
    const target=$("atmo-contributions");
    target.className="";
    target.innerHTML="";
    contributions.forEach(item=>{
      const row=document.createElement("div");row.className="atmo-contribution";
      const name=document.createElement("span");name.textContent=item.name;
      const bar=document.createElement("div");bar.className="atmo-bar";
      const fill=document.createElement("i");fill.style.width=clip(item.v,0,100)+"%";bar.appendChild(fill);
      const value=document.createElement("b");value.textContent=number(item.v,1);
      row.append(name,bar,value);target.appendChild(row);
    });
    const top=[...contributions].sort((a,b)=>b.v-a.v)[0];
    setText("atmo-explanation",T("Bu prototip göstergesi ","This prototype indicator ")+score+"/100. "+T("En büyük matematiksel katkı: ","Largest mathematical contribution: ")+top.name+" ("+number(top.v,1)+"). "+T("Bu bir yangın olasılığı değildir; saha verisiyle doğrulanmamıştır.","This is not a fire probability and has not been validated with field data."));
  }
  function updateWindArrow(degrees) {
    const arrow=$("atmo-wind-arrow");
    if(!arrow||!Number.isFinite(Number(degrees))) return;
    // Meteorological direction indicates where wind comes from; scenario arrow points downwind.
    arrow.style.transform="translate(-50%,-50%) rotate("+(Number(degrees)+90)+"deg)";
    arrow.title=T("Rüzgârın geldiği yön: ","Wind comes from: ")+number(degrees,0)+"°; "+T("senaryo oku yaklaşık aşağı rüzgâr yönünü gösterir.","scenario arrow indicates approximate downwind direction.");
  }
  function calculateSpread() {
    const latText=$("atmo-origin-lat").value.trim(),lonText=$("atmo-origin-lon").value.trim();
    const lat=Number(latText),lon=Number(lonText),rate=Number($("atmo-spread-rate").value);
    if(!latText||!lonText||!Number.isFinite(lat)||!Number.isFinite(lon)||lat < -90||lat>90||lon < -180||lon>180) {
      setText("atmo-spread-results",T("Geçerli enlem ve boylam gir (enlem −90…90, boylam −180…180).","Enter valid latitude and longitude (latitude −90…90, longitude −180…180)."));return;
    }
    if(!Number.isFinite(rate)||rate<.1||rate>10) { setText("atmo-spread-results",T("İlerleme hızı 0,1–10 km/sa aralığında olmalı.","Spread rate must be between 0.1 and 10 km/h."));return; }
    const direction=weather?Number(weather.current.wind_direction_10m):null;
    const vegetation=$("atmo-vegetation").value;
    const factors={pine:{co2:50,cost:5000},mixed:{co2:35,cost:3500},grass:{co2:8,cost:800}};
    const rows=[30,60,120].map(minutes=>{
      const hours=minutes/60;
      const length=rate*hours;
      const width=Math.max(.05,length*.35);
      const area=Math.PI*(length/2)*(width/2);
      return {minutes,length,width,area};
    });
    const host=$("atmo-spread-results");host.innerHTML="";
    rows.forEach(r=>{
      const card=document.createElement("article");card.className="atmo-scenario-card";
      const title=document.createElement("span");title.textContent=r.minutes+" "+T("dakika","minutes");
      const area=document.createElement("strong");area.textContent=number(r.area,2)+" ha";
      const detail=document.createElement("small");detail.textContent=T("Eliptik senaryo alanı; varsayımsal hız ","Elliptical scenario area; assumed rate ")+number(rate,1)+" "+T("km/sa","km/h")+" · "+T("ilerleme uzunluğu ","travel distance ")+number(r.length,2)+" km";
      card.append(title,area,detail);host.appendChild(card);
    });
    $("atmo-ring-30").style.setProperty("--diameter",Math.max(45,Math.min(110,45+rows[0].length*14))+"px");
    $("atmo-ring-60").style.setProperty("--diameter",Math.max(75,Math.min(165,75+rows[1].length*14))+"px");
    $("atmo-ring-120").style.setProperty("--diameter",Math.max(110,Math.min(245,110+rows[2].length*14))+"px");
    if(direction!==null) updateWindArrow(direction);
    const assumptions=factors[vegetation];
    const latest=rows[2],co2=latest.area*Number($("atmo-co2-factor").value),cost=latest.area*Number($("atmo-cost-factor").value);
    const values=$("atmo-carbon-values");values.innerHTML="";
    [
      [T("120 dk senaryo alanı","120 min scenario area"),number(latest.area,2)+" ha",T("Geometrik varsayım; gerçek yangın alanı değildir.","Geometric assumption; not a real burned area.")],
      [T("CO₂ eşdeğeri","CO₂ equivalent"),number(co2,1)+" t",T("Kullanıcı katsayısı: ","User factor: ")+number(Number($("atmo-co2-factor").value),1)+" t/ha"],
      [T("Ekonomik etki","Economic impact"),"€"+Math.round(cost).toLocaleString("en-US"),T("Kullanıcı katsayısı: ","User factor: ")+"€"+Math.round(Number($("atmo-cost-factor").value)).toLocaleString("en-US")+"/ha"]
    ].forEach(item=>{const article=document.createElement("article"),small=document.createElement("small"),strong=document.createElement("strong"),note=document.createElement("small");small.textContent=item[0];strong.textContent=item[1];note.textContent=item[2];article.append(small,strong,note);values.appendChild(article);});
    const origin=$("atmo-map-origin");origin.title=T("Senaryo merkezi: ","Scenario origin: ")+lat+", "+lon;
  }
  async function startCamera() {
    const status = $("atmo-camera-status");
    if (!navigator.mediaDevices?.getUserMedia) {
      status.textContent = T("Bu tarayıcı güvenli kamera erişimini desteklemiyor. HTTPS üzerinden dene.", "This browser does not support secure camera access. Try HTTPS.");
      return;
    }
    try {
      cameraStream = await navigator.mediaDevices.getUserMedia({video: {facingMode: "environment"}, audio: false});
      const video = $("atmo-camera-video");
      video.pause();
      video.controls = false;
      video.srcObject = cameraStream;
      $("atmo-camera-start").disabled = true;
      $("atmo-camera-stop").disabled = false;
      status.textContent = T("Yerel kamera açık. YOLOv8 algılaması bağlı değil; nesne tespiti yapılmıyor.", "Local camera active. YOLOv8 is not connected; no object detection is running.");
    } catch (error) {
      status.textContent = T("Kamera açılamadı: ", "Camera could not start: ") + (error?.name || error?.message || "permission unavailable");
    }
  }
  function stopCamera() {
    const wasCameraActive = Boolean(cameraStream);
    if (cameraStream) cameraStream.getTracks().forEach(track => track.stop());
    cameraStream = null;
    const video = $("atmo-camera-video");
    if (video) {
      video.srcObject = null;
      if (wasCameraActive) {
        video.src = testVideoUrl || ARCHIVE_VIDEO_URL;
        video.controls = true;
        video.load();
      }
    }
    $("atmo-camera-start").disabled = false;
    $("atmo-camera-stop").disabled = true;
    setText("atmo-camera-status", T("Kamera kapalı", "Camera is off"));
  }
  function chooseVideo(file) {
    if(testVideoUrl) URL.revokeObjectURL(testVideoUrl);
    if(!file){
      testVideoUrl=null;
      const video=$("atmo-camera-video"); video.src=ARCHIVE_VIDEO_URL; video.controls=true; video.load();
      setText("atmo-video-status",T("NASA arşiv duman görüntüsü hazır (canlı yayın değil). İstersen cihazından test videosu seçebilirsin.","NASA archival smoke footage is ready (not live). You can choose a local test video."));
      return;
    }
    testVideoUrl=URL.createObjectURL(file);
    stopCamera();
    $("atmo-camera-video").srcObject=null;
    $("atmo-camera-video").src=testVideoUrl;
    $("atmo-camera-video").controls=true;
    $("atmo-camera-video").play().catch(()=>{});
    setText("atmo-video-status",T("Yerel test videosu: ","Local test video: ")+file.name+". "+T("Bu dosya algılama yapmaz; YOLO modeli bağlı değildir.","This file does not trigger detections; no YOLO model is connected."));
    setText("atmo-camera-status",T("Yerel test videosu oynatılıyor · algılama kapalı","Local test video playing · detection off"));
  }
  function prepareAlert() {
    const description=$("atmo-alert-description").value.trim();
    if(!description){$("atmo-alert-preview").value=T("Örnek olay açıklaması gir.","Enter a sample event description.");return;}
    const message=T("NEXORAWILDFIRE AI · TEST BİLDİRİMİ","NEXORAWILDFIRE AI · TEST ALERT")+"\n"+
      T("Durum: Bu bir test taslağıdır; gönderilmedi.","Status: This is a test draft; not sent.")+"\n"+
      T("Olay: ","Event: ")+description+"\n"+
      T("Konum: ","Location: ")+(weather?weather.location.name:T("seçilmedi","not selected"))+"\n"+
      T("Meteoroloji gözlemi: ","Weather observation: ")+(weather?weather.current.time:"—")+"\n"+
      T("Risk indikatörü: ","Risk indicator: ")+($("atmo-score").textContent===""?"—":$("atmo-score").textContent+"/100")+"\n"+
      T("Bu metin herhangi bir servise iletilmedi.","This message was not sent to any service.");
    $("atmo-alert-preview").value=message;
  }
  function bind() {
    $("atmo-refresh").addEventListener("click",loadWeather);
    $("atmo-region").addEventListener("change",()=>{
      const loc=LOCATIONS[$("atmo-region").value] || LOCATIONS.edirne;
      $("atmo-origin-lat").value=loc.lat; $("atmo-origin-lon").value=loc.lon;
      loadWeather();
    });
    $("atmo-run-spread").addEventListener("click",calculateSpread);
    $("atmo-camera-start").addEventListener("click",startCamera);
    $("atmo-camera-stop").addEventListener("click",stopCamera);
    $("atmo-test-video").addEventListener("change",e=>chooseVideo(e.target.files?.[0]));
    $("atmo-preview-alert").addEventListener("click",prepareAlert);
    $("atmo-co2-factor").addEventListener("change",()=>{if($("atmo-carbon-values").children.length)calculateSpread();});
    $("atmo-cost-factor").addEventListener("change",()=>{if($("atmo-carbon-values").children.length)calculateSpread();});
    window.addEventListener("nexora:languagechange",()=>{
      if(weather) { calculateRisk(); if($("atmo-carbon-values").children.length)calculateSpread(); }
      if($("atmo-alert-preview").value) prepareAlert();
      if($("atmo-test-video").files?.[0]) setText("atmo-video-status",T("Yerel test videosu oynatılıyor; algılama kapalı.","Local test video is playing; detection is off."));
    });
    window.addEventListener("beforeunload",()=>{stopCamera();if(testVideoUrl)URL.revokeObjectURL(testVideoUrl);});
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",()=>{bind();loadWeather();},{once:true});
  else {bind();loadWeather();}
})();
