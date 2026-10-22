let sentinelRiskLayer=L.layerGroup().addTo(map);
let sentinelRasterTimer=null;
let sentinelRasterLoading=false;
let incidentPointLayer=L.layerGroup().addTo(map);

const FIRMS_PILOT_PROVINCES=["Edirne","Tekirdağ","Kırklareli","Çanakkale","İstanbul"];
const FIRMS_PROVINCE_CENTERS={"Edirne":[41.6771,26.5557],"Tekirdağ":[40.9781,27.5117],"Kırklareli":[41.7351,27.2252],"Çanakkale":[40.1553,26.4142],"İstanbul":[41.0082,28.9784]};
let incidentDetails=[];
function incidentBanner(){
 if(document.querySelector(".nova-incident-banner"))return;
 const b=document.createElement("section");b.className="nova-incident-banner";b.setAttribute("role","status");b.setAttribute("aria-live","polite");
 b.innerHTML=`<span class="incident-pulse" aria-hidden="true"></span><div class="incident-copy"><strong data-incident-title>ORMAN RİSK SİNYALİ</strong><span data-incident-text>NASA FIRMS kontrol ediliyor…</span><div class="incident-actions"><button type="button" data-incident-details>Haritada incele</button><button type="button" data-incident-close aria-label="Uyarıyı kapat">Kapat ×</button></div></div>`;
 document.body.prepend(b);b.querySelector("[data-incident-close]").onclick=()=>b.classList.remove("show");
 b.querySelector("[data-incident-details]").onclick=()=>{
  const dialog=document.createElement("dialog");dialog.className="nova-incident-dialog";
  dialog.innerHTML=`<div class="incident-dialog-head"><div><small>NASA FIRMS · PİLOT BÖLGE</small><h2>Termal anomali sinyalleri</h2></div><button type="button" data-dialog-close aria-label="Kapat">×</button></div><p>Termal anomali kesin yangın doğrulaması değildir. Konum il düzeyindedir; bu veri uç noktası kesin sıcak nokta koordinatlarını sağlamaz. Kaynak gözlem zamanı yoksa son kontrol saati gözlem zamanı olarak sunulmaz.</p><ul data-incident-list></ul><button type="button" class="incident-dialog-done">Kapat</button>`;
  const list=dialog.querySelector("[data-incident-list]");
  if(incidentDetails.length){
    incidentDetails.forEach(region=>{
      if(region.hotspots.length){
        region.hotspots.forEach(point=>{
          const li=document.createElement("li"),name=document.createElement("strong"),time=document.createElement("span"),coords=document.createElement("span"),open=document.createElement("button");
          const stamp=point.observed_at_utc?new Date(point.observed_at_utc):null;
          name.textContent=region.name+" · NASA FIRMS termal anomali";
          time.textContent=stamp&&!Number.isNaN(stamp.getTime())?stamp.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"})+" (Türkiye saati)":"Kaynak gözlem zamanı bildirilmedi";
          coords.textContent="Konum: "+Number(point.latitude).toFixed(4)+", "+Number(point.longitude).toFixed(4)+(point.distance_km!=null?" · Bölge merkezine "+point.distance_km+" km":"")+(point.confidence?" · Güven: "+point.confidence:"")+(point.frp?" · FRP: "+point.frp:"");
          open.type="button";open.textContent="Haritada konumu aç";
          open.onclick=()=>{const ll=[Number(point.latitude),Number(point.longitude)];map.setView(ll,11);incidentPointLayer.eachLayer(layer=>{const p=layer.getLatLng?.();if(p&&Math.abs(p.lat-ll[0])<0.001&&Math.abs(p.lng-ll[1])<0.001)layer.openPopup();});dialog.close();};
          li.append(name,time,coords,open);list.append(li);
        });
      }else{
        const li=document.createElement("li"),name=document.createElement("strong"),time=document.createElement("span");
        name.textContent=region.name;time.textContent=region.time+" · Kaynak bu bölge için sıcak nokta koordinatı döndürmedi.";li.append(name,time);list.append(li);
      }
    });
  }else{const li=document.createElement("li");li.textContent="Beş pilot ilde bölgesel sinyal bulunmuyor.";list.append(li);}
  document.body.appendChild(dialog);dialog.querySelectorAll("[data-dialog-close],.incident-dialog-done").forEach(x=>x.onclick=()=>dialog.close());dialog.addEventListener("close",()=>dialog.remove());
  const centers=incidentDetails.map(x=>FIRMS_PROVINCE_CENTERS[x.name]).filter(Boolean);
  if(typeof map!=="undefined"&&centers.length===1)map.setView(centers[0],8);else if(typeof map!=="undefined"&&centers.length>1)map.fitBounds(L.latLngBounds(centers),{padding:[30,30],maxZoom:7});
  if(dialog.showModal)dialog.showModal();else dialog.setAttribute("open","");
 };
}
function normalizeProvinceName(value){return String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLocaleLowerCase("tr-TR").replace(/ı/g,"i").trim();}
function pilotProvinceName(region){const raw=region?.province||region?.province_name||region?.name||region?.region||region?.il||"";const normalized=normalizeProvinceName(raw);if(normalized.startsWith("istanbul"))return "İstanbul";return FIRMS_PILOT_PROVINCES.find(name=>normalizeProvinceName(name)===normalized)||null;}
function incidentSourceTime(region,payload){const value=region?.satellite?.nasa_firms?.observed_at||region?.satellite?.nasa_firms?.acquired_at||region?.satellite?.nasa_firms?.last_observation||payload?.nasa_firms_observed_at||null;if(!value)return "Kaynak gözlem zamanı bildirilmedi";const d=new Date(value);return Number.isNaN(d.getTime())?String(value):d.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"});}
async function checkLiveIncidents(){
  incidentBanner();
  if(!API_BASE){window.NovaProviderStatus?.update("firms","error","Backend API yapılandırılmamış; NASA FIRMS durumu doğrulanamıyor.");return;}
  window.NovaProviderStatus?.update("firms","loading","Backend üzerinden NASA FIRMS olay kontrolü sürüyor.");
  try{
    const r=await fetch(API_BASE+'/risk-analysis',{cache:'no-store'}).then(x=>x.json());
    if(!r||!Array.isArray(r.regions)||!r.regions.length)throw new Error("Risk yanıtında doğrulanabilir bölge kaydı yok");
    if(r.regions.some(x=>!x.satellite||!x.satellite.nasa_firms||typeof x.satellite.nasa_firms.nearby_hotspot!=="boolean"))throw new Error("NASA FIRMS alanı eksik; bu durum sıfır olay anlamına gelmez");
    const hits=r.regions.filter(x=>x.satellite.nasa_firms.nearby_hotspot);
    const scopedHits=hits.map(region=>({region,name:pilotProvinceName(region)})).filter(x=>x.name);
    incidentDetails=scopedHits.map(({region,name})=>({name,time:incidentSourceTime(region,r),hotspots:region.satellite.nasa_firms.hotspot_details_24h||[]}));
    incidentPointLayer.clearLayers();
    incidentDetails.forEach(region=>region.hotspots.forEach(point=>{
      const lat=Number(point.latitude),lon=Number(point.longitude);
      if(!Number.isFinite(lat)||!Number.isFinite(lon)||Math.abs(lat)>90||Math.abs(lon)>180)return;
      const stamp=point.observed_at_utc?new Date(point.observed_at_utc):null;
      const time=stamp&&!Number.isNaN(stamp.getTime())?stamp.toLocaleString("tr-TR",{timeZone:"Europe/Istanbul"}):"Kaynak gözlem zamanı bildirilmedi";
      L.circleMarker([lat,lon],{radius:7,color:"#fff",weight:2,fillColor:"#ff3b30",fillOpacity:.92})
        .bindPopup("<strong>"+escapeIncidentHtml(region.name)+" · NASA FIRMS</strong><br>"+escapeIncidentHtml(time)+"<br>Kesin yangın doğrulaması değildir.")
        .addTo(incidentPointLayer);
    }));
    window.NovaProviderStatus?.update("firms",scopedHits.length?"ok":"empty",scopedHits.length+" pilot ilde bölgesel FIRMS sinyali; kesin yangın doğrulaması değildir.",r.nasa_firms_observed_at||null);
    const b=document.querySelector('.nova-incident-banner');
    const t=b?.querySelector('[data-incident-text]');
    const title=b?.querySelector('[data-incident-title]');
    if(scopedHits.length){
      b?.classList.add('show');
      if(title)title.textContent='ORMAN RİSK SİNYALİ · '+scopedHits.length+' PİLOT İL';
      if(t)t.textContent=scopedHits.length+' pilot ilde termal anomali sinyali. Ayrıntı ve kaynak zamanını görmek için haritada incele.';
    }else{
      b?.classList.remove('show');
      if(title)title.textContent='NASA FIRMS · SON KONTROL';
      if(t)t.textContent='Beş pilot ilde son başarılı kontrolde bölgesel termal anomali sinyali bulunmadı. Son kontrol: '+new Date().toLocaleString('tr-TR',{timeZone:'Europe/Istanbul'})+'.';
    }
  }catch(error){
    const b=document.querySelector('.nova-incident-banner');
    b?.classList.add('show');
        const t=b?.querySelector('[data-incident-text]');
    const title=b?.querySelector('[data-incident-title]');
    window.NovaProviderStatus?.update("firms","error","NASA FIRMS kontrolü başarısız; sıfır olay olarak yorumlanmamalıdır.");
    if(title)title.textContent='NASA FIRMS · DURUM DOĞRULANAMADI';
    if(t)t.textContent='Veri alınamadı; bu sıfır olay anlamına gelmez. Bağlantıyı ve sağlayıcı durumunu kontrol edin.';
  }
}

function riskRasterMessage(weatherRisk){
  const pct=Number(weatherRisk)*100;
  if(Number.isFinite(pct))return 'Yangın Risk Rasterı aktif • meteorolojik sinyal '+pct.toFixed(0)+'/100';
  return 'Yangın Risk Rasterı aktif';
}

async function loadSentinelRiskRaster(){
  if(sentinelRasterLoading)return;
  sentinelRasterLoading=true;
  sentinelRiskLayer.clearLayers();
  if(!API_BASE){
    setStatus('Yangın risk rasterı için backend gerekli');
    sentinelRasterLoading=false;
    return;
  }

  const bounds=map.getBounds();
  const payload={
    west:Number(bounds.getWest().toFixed(6)),
    south:Number(bounds.getSouth().toFixed(6)),
    east:Number(bounds.getEast().toFixed(6)),
    north:Number(bounds.getNorth().toFixed(6)),
    width:720,
    height:520
  };

  try{
    const client=window.NovaAuth?.client?.();
    if(!client)throw new Error('Bu ağır raster katmanı için hesap girişi gerekli. Temel harita giriş gerektirmez.');
    const sessionResult=await client.auth.getSession();
    const token=sessionResult?.data?.session?.access_token;
    if(!token)throw new Error('Uydu rasterını kuyruğa almak için giriş yapın. Temel harita giriş gerektirmez.');

    const submitted=await fetch(API_BASE+'/jobs/risk-raster',{
      method:'POST',
      headers:{'Authorization':'Bearer '+token,'Content-Type':'application/json'},
      body:JSON.stringify(payload),
      cache:'no-store'
    });
    if(!submitted.ok){
      let detail='';
      try{detail=JSON.stringify(await submitted.json())}catch{detail=await submitted.text()}
      throw new Error(detail||'Uydu işleme görevi kuyruğa alınamadı.');
    }
    const job=await submitted.json();
    if(!job.job_id)throw new Error('Worker görev kimliği döndürmedi.');

    setStatus('Uydu rasterı kuyrukta işleniyor…');
    updateRasterPanel(null,null,'Uydu işleme kuyruğunda; sonuç bekleniyor');
    let result=null;
    for(let attempt=0;attempt<80;attempt++){
      await new Promise(resolve=>setTimeout(resolve,2500));
      const response=await fetch(API_BASE+'/jobs/'+encodeURIComponent(job.job_id),{
        headers:{'Authorization':'Bearer '+token},
        cache:'no-store'
      });
      if(!response.ok){
        let detail='';
        try{detail=JSON.stringify(await response.json())}catch{detail=await response.text()}
        throw new Error(detail||'Görev durumu alınamadı.');
      }
      const state=await response.json();
      if(state.status==='finished'){result=state.result;break}
      if(state.status==='failed')throw new Error(state.error||'Uydu rasterı worker tarafından işlenemedi.');
      setStatus('Uydu rasterı işleniyor… ('+state.status+')');
    }
    if(!result?.artifact_url)throw new Error('Uydu işlemi zamanında tamamlanmadı veya raster çıktısı yok.');

    const imageResponse=await fetch(result.artifact_url,{cache:'no-store'});
    if(!imageResponse.ok)throw new Error('Özel uydu rasterı indirilemedi; görev sonucunu yenileyin.');
    const blob=await imageResponse.blob();
    const imageUrl=URL.createObjectURL(blob);
    L.imageOverlay(
      imageUrl,
      [[bounds.getSouth(),bounds.getWest()],[bounds.getNorth(),bounds.getEast()]],
      {opacity:.64,interactive:false}
    ).addTo(sentinelRiskLayer);
    setTimeout(()=>URL.revokeObjectURL(imageUrl),120000);

    setStatus(riskRasterMessage(result.weather_risk_signal));
    updateRasterPanel(result.weather_risk_signal,result.weather_observed_at);
  }catch(e){
    const msg=String(e.message||'');
    const lower=msg.toLowerCase();
    let userMessage='Worker / Sentinel-2 yanıtı bekleniyor';
    if(lower.includes('worker_not_configured')||lower.includes('worker')&&lower.includes('503'))userMessage='Ayrı uydu worker servisi henüz yapılandırılmadı';
    else if(lower.includes('giriş')||lower.includes('hesap'))userMessage=msg;
    else if(lower.includes('cdse')||lower.includes('storage')||lower.includes('kimlik'))userMessage='CDSE veya özel çıktı deposu yapılandırması gerekli';
    setStatus(userMessage);
    updateRasterPanel(null,null,userMessage);
  }finally{
    sentinelRasterLoading=false;
  }
}

function updateRasterPanel(weatherRisk,observedAt,errorText){
  const box=document.querySelector('.nova-sentinel-raster');
  if(!box)return;
  const status=box.querySelector('[data-raster-status]');
  if(errorText){
    if(status)status.textContent=errorText;
    return;
  }
  const pct=Number(weatherRisk)*100;
  const time=observedAt?(' • '+observedAt.replace('T',' ')):''; 
  if(status)status.textContent=(Number.isFinite(pct)?'Meteorolojik sinyal: '+pct.toFixed(0)+'/100':'Meteorolojik sinyal yüklendi')+time;
}

function addSentinelRasterControl(){
  if(document.querySelector('.nova-sentinel-raster'))return;
  const box=document.createElement('div');
  box.className='nova-sentinel-raster';
  box.innerHTML='<strong>YANGIN RİSK RASTERI</strong><label><input type="checkbox" data-sentinel-raster> Gerçek Sentinel-2 NDVI + NDMI + meteoroloji</label><small>Raster bileşimi: %65 uydu tabanlı bitki stresi/kuruluk + %35 canlı meteorolojik risk. Bu bir yangın tespit modeli değildir; karar destek yüzeyidir.</small><small data-raster-status>CDSE + Open-Meteo bekleniyor</small>';
  document.querySelector('.map-section')?.appendChild(box);
  box.querySelector('input').onchange=e=>{
    if(e.target.checked){
      loadSentinelRiskRaster();
      clearInterval(sentinelRasterTimer);
      sentinelRasterTimer=setInterval(loadSentinelRiskRaster,15*60*1000);
    }else{
      clearInterval(sentinelRasterTimer);
      sentinelRiskLayer.clearLayers();
      updateRasterPanel(null,null,'Raster kapalı');
    }
  };
}

let rasterMoveTimer=null;
map.on('moveend',()=>{
  const input=document.querySelector('[data-sentinel-raster]');
  if(!input?.checked)return;
  clearTimeout(rasterMoveTimer);
  rasterMoveTimer=setTimeout(loadSentinelRiskRaster,900);
});

setTimeout(()=>{
  addSentinelRasterControl();
  incidentBanner();
  checkLiveIncidents();
  setInterval(checkLiveIncidents,5*60*1000);
},1200);
