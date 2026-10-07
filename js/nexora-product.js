(()=>{
const $=(s,r=document)=>r.querySelector(s);
const esc=s=>String(s??'').replace(/[&<>\"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[m]));
function brand(){
 document.documentElement.dataset.brand='nexora';
 if(!document.querySelector('link[rel="icon"]')){const l=document.createElement('link');l.rel='icon';l.type='image/png';l.href=(location.pathname.includes('/pages/')?'../':'')+'favicon.png';document.head.appendChild(l)}
 const logo=$('.logo');if(logo&&!logo.dataset.nexora){logo.dataset.nexora='1';logo.innerHTML='<div class="brand-lockup"><img src="'+(location.pathname.includes('/pages/')?'../':'')+'assets/nexora-logo.png" alt="Nexora"><div><div class="brand-parent">NEXORA</div><h1>NexoraWildfire</h1><p>Ã‡evresel istihbarat Â· karar destek Â· EDGE</p></div></div>'}
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
 const sec=document.createElement('section');sec.className='product-center';sec.innerHTML='<div class="eyebrow">NEXORA / PRODUCT</div><h2>Biz kimiz?</h2><p>Nexora Ã§atÄ±sÄ± altÄ±nda geliÅŸtirilen NexoraWildfire; Türkiye ve Ä°stanbul Ã§evresini il â†’ ilÃ§e â†’ kÃ¶y/mahalle â†’ alan seviyesinde izleyen, gerÃ§ek veri kaynaklarÄ±nÄ± anlaÅŸÄ±lÄ±r karar destek sinyallerine dÃ¶nÃ¼ÅŸtÃ¼ren Ã§evresel istihbarat Ã¼rÃ¼nÃ¼dÃ¼r.</p><div class="product-grid"><article><span>ÃœRÃœN</span><strong>NexoraWildfire</strong><p>TarÄ±m, orman, arÄ±cÄ±lÄ±k, su-toprak, polen ve Ã§evresel riskleri tek operasyon ekranÄ±nda birleÅŸtirir.</p></article><article><span>ALTYAPI</span><strong>NexoraWildfire EDGE</strong><p>PWA + IndexedDB + servis Ã§alÄ±ÅŸanÄ± sayesinde son geÃ§erli veriler ve yerel karar motoru baÄŸlantÄ± kesilse bile Ã§alÄ±ÅŸmaya devam eder.</p></article><article><span>VERÄ°</span><strong>GerÃ§ek kaynaklar</strong><p>Open-Meteo, OpenStreetMap/Nominatim, Copernicus Sentinel-2 ve yapÄ±landÄ±rÄ±ldÄ±ÄŸÄ±nda NASA FIRMS. Ãœretilmeyen veri Ã¼retilmiÅŸ gibi gÃ¶sterilmez.</p></article><article><span>Ä°LK SAHA</span><strong>Edirne</strong><p>Ä°lk Ã¼rÃ¼nleÅŸme fazÄ±nda Edirne&#39;nin ilÃ§e ve kÃ¶y/mahalle hiyerarÅŸisi ayrÄ±ntÄ±lÄ± biÃ§imde ele alÄ±nÄ±r; daha sonra bÃ¶lgesel kapsam geniÅŸletilir.</p></article></div><div class="product-actions"><button class="primary-action" data-enable-notifications>Bildirimleri etkinleÅŸtir</button><button class="secondary-action" data-test-notification>Nova-Alert test bildirimi</button><a class="secondary-action" href="https://github.com/Nexora88/nexorawildfire-ai" target="_blank" rel="noopener">GitHub â†’</a></div><div class="alert-center"><div class="alert-center-head"><div><div class="eyebrow">NOVA-ALERT</div><h3>Yerel bildirim merkezi</h3></div><button data-refresh-alerts>Yenile</button></div><div data-alert-list>Yerel kayÄ±tlar okunuyorâ€¦</div></div>';
 main.appendChild(sec);
 $('[data-enable-notifications]',sec)?.addEventListener('click',async()=>{try{const p=await Notification.requestPermission();toast('Nova-Alert',p==='granted'?'Bildirimler etkinleÅŸtirildi.':'Bildirim izni verilmedi.',p==='granted'?'success':'warning')}catch{toast('Nova-Alert','TarayÄ±cÄ± bildirim API kullanÄ±labilir deÄŸil.','warning')}});
 $('[data-test-notification]',sec)?.addEventListener('click',()=>notify('NexoraWildfire','Yerel Nova-Alert merkezi aktif.','success'));
 $('[data-refresh-alerts]',sec)?.addEventListener('click',()=>renderAlerts(sec));renderAlerts(sec);
}
async function renderAlerts(sec){const out=$('[data-alert-list]',sec);if(!out)return;try{const rows=(await window.NovaStore?.getAll('alerts'))||[];rows.sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));if(!rows.length){out.innerHTML='<div class="empty-alert">HenÃ¼z yerel uyarÄ± yok. AlanlarÄ±m ve offline karar motoru yeni uyarÄ±larÄ± burada tutar.</div>';return}out.innerHTML=rows.slice(0,20).map(a=>'<div class="alert-row"><span class="alert-dot alert-'+esc(a.severity||'info')+'"></span><div><b>'+esc(a.title||'Nova-Alert')+'</b><p>'+esc(a.message||'')+'</p><small>'+new Date(a.createdAt||Date.now()).toLocaleString('tr-TR')+'</small></div></div>').join('')}catch{out.textContent='Yerel bildirim deposu ÅŸu anda okunamadÄ±.'}}
function areaStyle(){
 document.querySelectorAll('#map svg path, #map .leaflet-overlay-pane path').forEach(()=>{});
}
window.NovaProduct={brand,toast,notify,systemCenter,areaStyle};
brand();systemCenter();
})();

