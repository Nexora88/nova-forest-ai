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
  const b=map.getBounds();
  const u=new URL(API_BASE+'/ndvi/risk-raster',location.origin);
  u.searchParams.set('west',b.getWest().toFixed(6));
  u.searchParams.set('south',b.getSouth().toFixed(6));
  u.searchParams.set('east',b.getEast().toFixed(6));
  u.searchParams.set('north',b.getNorth().toFixed(6));
  u.searchParams.set('width','720');
  u.searchParams.set('height','520');

  try{
    const r=await fetch(u,{cache:'no-store'});
    if(!r.ok)throw new Error(await r.text());
    const blob=await r.blob();
    const url=URL.createObjectURL(blob);
    L.imageOverlay(
      url,
      [[b.getSouth(),b.getWest()],[b.getNorth(),b.getEast()]],
      {opacity:.64,interactive:false}
    ).addTo(sentinelRiskLayer);
    setTimeout(()=>URL.revokeObjectURL(url),120000);

    const wr=Number(r.headers.get('X-Nexora-Weather-Risk'));
    setStatus(riskRasterMessage(wr));
    updateRasterPanel(wr,r.headers.get('X-Nexora-Weather-Time'));
  }catch(e){
    const msg=e.message||'';
    setStatus(msg.includes('CDSE')?'Sentinel-2 kimlik bilgileri bekleniyor':'Yangın risk rasterı alınamadı');
    updateRasterPanel(null,null,msg.includes('CDSE')?'CDSE kimlik bilgileri gerekli':'Backend / Sentinel-2 yanıtı bekleniyor');
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
