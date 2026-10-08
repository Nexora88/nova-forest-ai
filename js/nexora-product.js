(()=>{
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function brand(){
 document.documentElement.dataset.brand='nexora';
 if(!document.querySelector('link[rel="icon"]')){const l=document.createElement('link');l.rel='icon';l.type='image/png';l.href=(location.pathname.includes('/pages/')?'../':'')+'favicon.png';document.head.appendChild(l)}
 const existingBrand=$('.brand-lockup'); const logo=existingBrand?null:$('.logo'); if(logo&&!logo.dataset.nexora){logo.dataset.nexora='1';logo.innerHTML='<div class="brand-lockup"><img src="'+(location.pathname.includes('/pages/')?'../':'')+'assets/nexora-wildfire-logo.png" alt="NexoraWildfire AI"><div><div class="brand-parent">NEXORA</div><h1>NexoraWildfire AI</h1><p>Çevresel istihbarat · karar destek · EDGE</p></div></div>'}
 const nav=document.querySelector('nav');if(nav&&!nav.querySelector('.nav-brand')){const b=document.createElement('span');b.className='nav-brand';b.textContent='NEXORA / ENVIRONMENTAL INTELLIGENCE';nav.prepend(b)}
}
function toast(title,msg,type='info'){
 let box=$('.nova-toast-stack');if(!box){box=document.createElement('div');box.className='nova-toast-stack';document.body.appendChild(box)}
 const el=document.createElement('div');el.className='nova-toast nova-toast-'+type;el.innerHTML='<b>'+esc(title)+'</b><span>'+esc(msg)+'</span>';box.appendChild(el);setTimeout(()=>el.remove(),6500)
}
async function notify(title,msg,type='info'){
 toast(title,msg,type);
 try{if('Notification' in window){if(Notification.permission==='default')await Notification.requestPermission();if(Notification.permission==='granted')new Notification(title,{body:msg,icon:(location.pathname.includes('/pages/')?'../':'')+'favicon.png',tag:'nova-'+title})}}catch{}
 try{await window.NovaStore?.put('alerts',{id:'ui:'+Date.now(),title,message:msg,severity:type,source:'Nova-Alert',createdAt:Date.now(),read:false})}catch{}
}
window.NovaNotify=notify;
function systemCenter(){
 if(!location.pathname.endsWith('/about.html'))return;
 const main=document.querySelector('main');if(!main||$('.product-center'))return;
 const sec=document.createElement('section');sec.className='product-center';sec.innerHTML='<div class="eyebrow">NEXORA / PRODUCT</div><h2>Biz kimiz?</h2><p>Nexora çatısı altında geliştirilen NexoraWildfire AI; Trakya ve İstanbul çevresini il → ilçe → köy/mahalle → alan seviyesinde izleyen, gerçek veri kaynaklarını anlaşılır karar destek sinyallerine dönüştüren çevresel istihbarat ürünüdür.</p><div class="product-grid"><article><span>ÜRÜN</span><strong>NexoraWildfire AI</strong><p>Tarım, orman, arıcılık, su-toprak, polen ve çevresel riskleri tek operasyon ekranında birleştirir.</p></article><article><span>ALTYAPI</span><strong>NexoraWildfire EDGE</strong><p>PWA + IndexedDB + servis çalışanı sayesinde son geçerli veriler ve yerel karar motoru bağlantı kesilse bile çalışmaya devam eder.</p></article><article><span>VERİ</span><strong>Gerçek kaynaklar</strong><p>Open-Meteo, OpenStreetMap/Nominatim, Copernicus Sentinel-2 ve yapılandırıldığında NASA FIRMS. Üretilmeyen veri üretilmiş gibi gösterilmez.</p></article><article><span>İLK SAHA</span><strong>Edirne</strong><p>İlk ürünleşme fazında Edirne&#39;nin ilçe ve köy/mahalle hiyerarşisi ayrıntılı biçimde ele alınır; daha sonra bölgesel kapsam genişletilir.</p></article></div><div class="product-actions"><button class="primary-action" data-enable-notifications>Bildirimleri etkinleştir</button><button class="secondary-action" data-test-notification>Nova-Alert test bildirimi</button></div><div class="alert-center"><div class="alert-center-head"><div><div class="eyebrow">NOVA-ALERT</div><h3>Yerel bildirim merkezi</h3></div><button data-refresh-alerts>Yenile</button></div><div data-alert-list>Yerel kayıtlar okunuyor…</div></div>';
 main.appendChild(sec);
 $('[data-enable-notifications]',sec)?.addEventListener('click',async()=>{
  try{
    const areas=JSON.parse(localStorage.getItem('nexorawildfire-my-areas-v1')||'[]');
    const area=areas[0];
    if(!area?.coordinates?.length){toast('Nova-Alert','Önce Alanlarım bölümüne en az bir alan ekle.','warning');return}
    const lat=area.coordinates.reduce((s,p)=>s+p[0],0)/area.coordinates.length;
    const lon=area.coordinates.reduce((s,p)=>s+p[1],0)/area.coordinates.length;
    const result=await window.NovaAlert?.enablePush?.({name:area.name,lat,lon});
    toast('Nova-Alert',result?.ok?'Web Push aktif. Site kapalıyken de bu alan için cihaz bildirimi alınacak.':'Bildirim kurulamadı: '+(result?.reason||'bilinmeyen hata'),result?.ok?'success':'warning');
  }catch{toast('Nova-Alert','Web Push kurulumu başarısız.','warning')}
});
 $('[data-test-notification]',sec)?.addEventListener('click',()=>notify('NexoraWildfire AI','Yerel Nova-Alert merkezi aktif.','success'));
 $('[data-refresh-alerts]',sec)?.addEventListener('click',()=>renderAlerts(sec));renderAlerts(sec);
}
async function renderAlerts(sec){const out=$('[data-alert-list]',sec);if(!out)return;try{const rows=(await window.NovaStore?.getAll('alerts'))||[];rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));if(!rows.length){out.innerHTML='<div class="empty-alert">Henüz yerel uyarı yok. Alanlarım ve offline karar motoru yeni uyarıları burada tutar.</div>';return}out.innerHTML=rows.slice(0,20).map(a=>'<div class="alert-row"><span class="alert-dot alert-'+esc(a.severity||'info')+'"></span><div><b>'+esc(a.title||'Nova-Alert')+'</b><p>'+esc(a.message||'')+'</p><small>'+new Date(a.createdAt||Date.now()).toLocaleString('tr-TR')+'</small></div></div>').join('')}catch{out.textContent='Yerel bildirim deposu şu anda okunamadı.'}}
function areaStyle(){
 document.querySelectorAll('#map svg path, #map .leaflet-overlay-pane path').forEach(()=>{});
}
window.NovaProduct={brand,toast,notify,systemCenter,areaStyle};
brand();systemCenter();
})();
