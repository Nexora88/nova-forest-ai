/* NexoraWildfire AI — keyless wind observation overlay + transparent educational fire-spread scenario. */
(() => {
  "use strict";
  const root=document.querySelector(".nx-wind-lab"),mapEl=document.getElementById("map");
  if(!root||!mapEl||!window.L||typeof map==="undefined")return;
  const $=s=>root.querySelector(s),tr=()=>((document.documentElement.dataset.language||localStorage.getItem("nexorawildfire-language-v1")||"tr")==="tr");
  const state={wind:null,windOn:false,pick:false,origin:null,marker:null,playing:false,minutes:0,duration:6,fuel:55,windSpeed:18,windDir:270,lastFrame:0,particles:[],raf:0};
  const canvas=document.createElement("canvas");canvas.className="nx-wind-canvas";canvas.setAttribute("aria-hidden","true");mapEl.appendChild(canvas);const ctx=canvas.getContext("2d");
  const windBtn=$("[data-wind-toggle]"),pickBtn=$("[data-sim-pick]"),startBtn=$("[data-sim-start]"),sim=$("[data-sim-panel]");
  const lang=(a,b)=>tr()?a:b;
  function cardinal(deg){const dirs=tr()?["K","KD","D","GD","G","GB","B","KB"]:["N","NE","E","SE","S","SW","W","NW"];return dirs[Math.round((((deg%360)+360)%360)/45)%8]}
  function setText(sel,value){const n=$(sel);if(n)n.textContent=value}
  function setWindStatus(text){setText("[data-wind-state]",text)}
  function updateMetrics(){
    if(!state.wind){setText("[data-wind-speed]","—");setText("[data-wind-direction]",lang("Canlı veri yok","No live data"));setText("[data-wind-weather]",lang("Bekleniyor","Pending"));setText("[data-wind-time]","—");return}
    const w=state.wind;setText("[data-wind-speed]",Math.round(w.speed)+" km/sa");setText("[data-wind-direction]",cardinal(w.direction)+" · "+Math.round(w.direction)+"°");setText("[data-wind-weather]",Math.round(w.temp)+"°C · %"+Math.round(w.humidity));setText("[data-wind-time]",new Date(w.time).toLocaleTimeString(tr()?"tr-TR":"en-GB",{hour:"2-digit",minute:"2-digit"}));
  }
  async function loadWind(){
    const u=new URL("https://api.open-meteo.com/v1/forecast");u.searchParams.set("latitude","41.15");u.searchParams.set("longitude","27.1");u.searchParams.set("current","wind_speed_10m,wind_direction_10m,temperature_2m,relative_humidity_2m");u.searchParams.set("timezone","Europe/Istanbul");
    try{const r=await fetch(u,{cache:"no-store"});if(!r.ok)throw Error("HTTP "+r.status);const j=await r.json(),c=j.current||{};if(c.wind_speed_10m==null||c.wind_direction_10m==null)throw Error("wind fields missing");state.wind={speed:Number(c.wind_speed_10m),direction:Number(c.wind_direction_10m),temp:Number(c.temperature_2m),humidity:Number(c.relative_humidity_2m),time:c.time?new Date(c.time).getTime():Date.now()};state.windSpeed=state.wind.speed;state.windDir=state.wind.direction;const ws=$("[data-wind-speed]");updateMetrics();setWindStatus(lang("CANLI GÖZLEM · Open-Meteo","LIVE OBSERVATION · Open-Meteo"));if(state.windOn)seedParticles();if(state.playing)draw();return true}catch(e){console.warn("Wind observation unavailable",e);setWindStatus(lang("RÜZGÂR VERİSİ ALINAMADI","WIND DATA UNAVAILABLE"));updateMetrics();return false}
  }
  function resize(){const r=mapEl.getBoundingClientRect(),d=Math.min(window.devicePixelRatio||1,2);canvas.width=Math.max(1,Math.round(r.width*d));canvas.height=Math.max(1,Math.round(r.height*d));canvas.style.width=r.width+"px";canvas.style.height=r.height+"px";ctx.setTransform(d,0,0,d,0,0)}
  function seedParticles(){const r=mapEl.getBoundingClientRect();state.particles=Array.from({length:Math.max(45,Math.min(110,Math.round(r.width/5)))},()=>({x:Math.random()*r.width,y:Math.random()*r.height,age:Math.random()*100,tail:5+Math.random()*10}))}
  function flowVector(){const direction=((state.wind?.direction??state.windDir)+180)%360,rad=direction*Math.PI/180;return{x:Math.sin(rad),y:-Math.cos(rad)}}
  function drawWind(dt){
    if(!state.windOn||!state.wind)return;const r=mapEl.getBoundingClientRect(),v=flowVector(),scale=.12+Math.min(state.wind.speed,80)*.018;
    ctx.save();ctx.lineWidth=1.4;ctx.strokeStyle="rgba(105,245,166,.66)";ctx.fillStyle="rgba(160,255,195,.8)";
    for(const p of state.particles){p.x+=v.x*scale*dt;p.y+=v.y*scale*dt;p.age+=dt;if(p.x< -25||p.x>r.width+25||p.y< -25||p.y>r.height+25||p.age>180){p.x=Math.random()*r.width;p.y=Math.random()*r.height;p.age=0}
      const ex=p.x-v.x*p.tail,ey=p.y-v.y*p.tail;ctx.beginPath();ctx.moveTo(ex,ey);ctx.lineTo(p.x,p.y);ctx.stroke();ctx.beginPath();ctx.arc(p.x,p.y,1.4,0,Math.PI*2);ctx.fill();
    }ctx.restore();
  }
  function latLngToPx(lat,lon){return map.latLngToContainerPoint([lat,lon])}
  function simOrigin(){return state.origin||map.getCenter()}
  function drawSimulation(){
    if(!sim||sim.hidden||!state.origin)return;const o=latLngToPx(state.origin.lat,state.origin.lng),zoom=map.getZoom(),metersPerPx=156543.03392*Math.cos(state.origin.lat*Math.PI/180)/Math.pow(2,zoom),hours=state.minutes/60;
    const baseKm=hours*(.025+state.windSpeed*.0014+state.fuel*.00018),radius=baseKm*1000/Math.max(1,metersPerPx),stretch=1+Math.min(state.windSpeed,80)/48,v=flowVector(),angle=Math.atan2(v.y,v.x);
    ctx.save();ctx.translate(o.x,o.y);ctx.rotate(angle);ctx.beginPath();ctx.ellipse(0,0,Math.max(2,radius*stretch),Math.max(2,radius*.58),0,0,Math.PI*2);ctx.fillStyle="rgba(255,116,45,.13)";ctx.strokeStyle="rgba(255,151,72,.92)";ctx.lineWidth=2;ctx.setLineDash([7,5]);ctx.fill();ctx.stroke();ctx.setLineDash([]);
    ctx.beginPath();ctx.ellipse(0,0,Math.max(1,radius*stretch*.72),Math.max(1,radius*.58*.72),0,0,Math.PI*2);ctx.fillStyle="rgba(255,82,46,.13)";ctx.fill();ctx.restore();
    ctx.save();ctx.fillStyle="#ffd08b";ctx.strokeStyle="#28180b";ctx.lineWidth=3;ctx.beginPath();ctx.arc(o.x,o.y,6,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.font="700 11px system-ui";ctx.fillText(lang("SENARYO BAŞLANGICI","SCENARIO ORIGIN"),o.x+11,o.y-10);ctx.restore();
  }
  function draw(dt=16){resize();ctx.clearRect(0,0,canvas.width,canvas.height);drawWind(dt);drawSimulation()}
  function loop(ts){if(!state.playing&&!state.windOn)return;const dt=Math.min(50,ts-(state.lastFrame||ts));state.lastFrame=ts;if(state.playing){state.minutes=Math.min(state.duration*60,state.minutes+dt*.085);updateTimeline();if(state.minutes>=state.duration*60)pause()}draw(dt);if(state.playing||state.windOn)state.raf=requestAnimationFrame(loop)}
  function ensureLoop(){cancelAnimationFrame(state.raf);state.lastFrame=0;state.raf=requestAnimationFrame(loop)}
  function updateTimeline(){const t=$("[data-sim-timeline]");if(t){t.max=String(state.duration*60);t.value=String(Math.round(state.minutes))}setText("[data-sim-clock]",new Date(state.minutes*60000).toISOString().slice(14,19)+" / "+String(state.duration).padStart(2,"0")+":00")}
  function pause(){state.playing=false;const b=$("[data-sim-play]");if(b)b.textContent=lang("▶ Oynat","▶ Play");if(state.windOn)ensureLoop();else draw()}
  function selectOrigin(ll){state.origin=ll;if(state.marker)map.removeLayer(state.marker);state.marker=L.marker(ll,{keyboard:true,title:lang("Senaryo başlangıç noktası","Scenario origin")}).addTo(map).bindTooltip(lang("Senaryo başlangıcı","Scenario origin"),{permanent:false});state.pick=false;pickBtn.classList.remove("active");pickBtn.setAttribute("aria-pressed","false");draw()}
  windBtn.addEventListener("click",()=>{state.windOn=!state.windOn;windBtn.setAttribute("aria-pressed",String(state.windOn));windBtn.classList.toggle("active",state.windOn);windBtn.textContent=state.windOn?lang("〰 Rüzgâr akışını gizle","〰 Hide wind flow"):lang("〰 Rüzgâr akışını göster","〰 Show wind flow");if(state.windOn){if(!state.particles.length)seedParticles();if(!state.wind)loadWind();ensureLoop()}else{draw();if(!state.playing)cancelAnimationFrame(state.raf)}});
  pickBtn.addEventListener("click",()=>{state.pick=!state.pick;pickBtn.classList.toggle("active",state.pick);pickBtn.setAttribute("aria-pressed",String(state.pick));pickBtn.textContent=state.pick?lang("Haritaya dokun…","Tap the map…"):lang("⌖ Başlangıç noktası seç","⌖ Choose start point");mapEl.style.cursor=state.pick?"crosshair":""});
  map.on("click",e=>{if(state.pick){selectOrigin(e.latlng);if(!sim.hidden)draw()}});
  startBtn.addEventListener("click",()=>{sim.hidden=false;state.minutes=0;state.duration=Number($("[data-duration]").value)||6;state.fuel=Number($("[data-fuel]").value)||55;state.windSpeed=state.wind?.speed??18;state.windDir=state.wind?.direction??270;setText("[data-duration-value]",state.duration+" "+lang("saat","hours"));updateTimeline();if(!state.origin)state.origin=map.getCenter();state.playing=false;pause();draw();sim.scrollIntoView({behavior:matchMedia("(prefers-reduced-motion: reduce)").matches?"auto":"smooth",block:"nearest"})});
  $("[data-sim-play]").addEventListener("click",()=>{if(sim.hidden)sim.hidden=false;if(state.minutes>=state.duration*60)state.minutes=0;state.playing=!state.playing;$("[data-sim-play]").textContent=state.playing?lang("Ⅱ Duraklat","Ⅱ Pause"):lang("▶ Oynat","▶ Play");ensureLoop()});
  $("[data-sim-reset]").addEventListener("click",()=>{pause();state.minutes=0;updateTimeline();draw()});
  $("[data-sim-timeline]").addEventListener("input",e=>{pause();state.minutes=Number(e.target.value);updateTimeline();draw()});
  $("[data-fuel]").addEventListener("input",e=>{state.fuel=Number(e.target.value);setText("[data-fuel-value]","%"+state.fuel);draw()});
  $("[data-duration]").addEventListener("input",e=>{state.duration=Number(e.target.value);setText("[data-duration-value]",state.duration+" "+lang("saat","hours"));state.minutes=Math.min(state.minutes,state.duration*60);updateTimeline();draw()});
  map.on("move zoom resize",()=>{if(state.windOn||state.playing||(!sim.hidden&&state.origin))draw()});
  window.addEventListener("resize",()=>{if(state.windOn||state.playing)draw()});
  document.addEventListener("visibilitychange",()=>{if(document.hidden){pause()}});
  setText("[data-duration-value]","6 "+lang("saat","hours"));setText("[data-fuel-value]","%55");updateTimeline();resize();loadWind();setInterval(loadWind,600000);
})();