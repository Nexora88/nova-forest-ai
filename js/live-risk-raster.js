let sentinelRiskLayer=L.layerGroup().addTo(map);
let sentinelRasterTimer=null;
let sentinelRasterLoading=false;

function incidentBanner(){
  if(document.querySelector('.nova-incident-banner'))return;
  const b=document.createElement('div');
  b.className='nova-incident-banner';
  b.innerHTML='<span class="incident-pulse"></span><div><strong>CANLI OLAY UYARISI</strong><span data-incident-text>NASA FIRMS kontrol ediliyor…</span></div><button data-incident-close>×</button>';
  document.body.prepend(b);
  b.querySelector('[data-incident-close]').onclick=()=>b.classList.remove('show');
}

async function checkLiveIncidents(){
  incidentBanner();
  if(!API_BASE)return;
  try{
    const r=await fetch(API_BASE+'/risk-analysis',{cache:'no-store'}).then(x=>x.json());
    const hits=(r.regions||[]).filter(x=>x.satellite?.nasa_firms?.nearby_hotspot);
    const b=document.querySelector('.nova-incident-banner');
    const t=b?.querySelector('[data-incident-text]');
    if(hits.length){
      b?.classList.add('show');
      if(t)t.textContent=hits.length+' bölgede NASA FIRMS termal anomali tespit edildi. Bu kesin yangın doğrulaması değildir; sahada teyit gerekir.';
    }else{
      b?.classList.remove('show');
      if(t)t.textContent='Son 24 saatte bölgesel NASA FIRMS termal anomali bulunmadı.';
    }
  }catch{}
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
