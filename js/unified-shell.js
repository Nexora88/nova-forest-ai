/* One shared, accessible header/navigation/connectivity shell for every page. */
(function(){
  'use strict';
  const root=document.documentElement;
  const base=location.pathname.includes('/pages/')?'../':'./';
  const appMarkUrl=base+'assets/nexora-wildfire-mark.png?v=20261111a';
  const wordmarkUrl=base+'assets/nexora-wildfire-official.webp?v=20261115a';
  function brandHeader(){
    const header=document.querySelector('body>header');
    if(!header)return;
    header.innerHTML=
      '<a class="brand-lockup" href="'+base+'index.html" aria-label="NexoraWildfire AI ana sayfa">'+
        '<img class="brand-logo" src="'+wordmarkUrl+'" alt="" width="48" height="48">'+
        '<span class="brand-copy"><strong>NexoraWildfire AI</strong><small>Çevresel istihbarat platformu</small></span>'+
      '</a>'+
      '<div class="status" title="Trakya pilot alanı. Canlı veri kapsamı, ilgili sağlayıcının durumuna bağlıdır."><span></span> TRAKYA · PİLOT</div>';
  }
  function connectivity(){
    document.querySelectorAll('.nova-offline-bar').forEach(node=>node.remove());
    let bar=document.querySelector('.nx-connectivity-bar');
    if(!bar){
      bar=document.createElement('div');bar.className='nx-connectivity-bar';
      const nav=document.querySelector('body>nav');
      if(nav)nav.insertAdjacentElement('afterend',bar);else document.body.prepend(bar);
    }
    const header=document.querySelector('body>header');
    if(header&&header.previousElementSibling!==bar)header.insertAdjacentElement('beforebegin',bar);
    const paint=()=>{
      root.dataset.network=navigator.onLine?'online':'offline';
      bar.dataset.network=navigator.onLine?'online':'offline';
    };
    window.addEventListener('online',paint);
    window.addEventListener('offline',paint);
    paint();
  }
  function navigation(){
    const nav=document.querySelector('body>nav');
    if(!nav || nav.querySelector('.nx-nav-toggle'))return;
    nav.classList.add('nx-nav');
    if(!nav.hasAttribute('aria-label'))nav.setAttribute('aria-label','Ana gezinme');
    if(!nav.querySelector('.nav-brand')){
      const label=document.createElement('span');
      label.className='nav-brand';
      label.textContent='NexoraWildfire AI';
      nav.prepend(label);
    }
    let toggle=nav.querySelector('.nx-nav-toggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='nx-nav-toggle';
      toggle.setAttribute('aria-expanded','false');
      toggle.innerHTML='<span>☰ Menü</span><span class="nx-nav-current"></span>';
      nav.prepend(toggle);
    }
    const current=nav.querySelector('a.active')?.textContent?.trim()||'NexoraWildfire';
    const currentLabel=toggle.querySelector('.nx-nav-current');
    if(currentLabel)currentLabel.textContent=current;
    function close(){nav.classList.remove('nx-nav-open');toggle.setAttribute('aria-expanded','false');toggle.querySelector('span:first-child').textContent='☰ Menü'}
    toggle.addEventListener('click',()=>{
      const open=nav.classList.toggle('nx-nav-open');
      toggle.setAttribute('aria-expanded',String(open));
      toggle.querySelector('span:first-child').textContent=open?'× Menüyü kapat':'☰ Menü';
    });
    nav.querySelectorAll('a').forEach(a=>a.addEventListener('click',close));
    document.addEventListener('keydown',e=>{if(e.key==='Escape')close()});
  }
  function icons(){
    document.querySelectorAll('link[rel~="icon"],link[rel="apple-touch-icon"]').forEach(link=>link.remove());
    const favicon=document.createElement('link');favicon.rel='icon';favicon.type='image/png';favicon.href=appMarkUrl;document.head.appendChild(favicon);
    const touch=document.createElement('link');touch.rel='apple-touch-icon';touch.href=appMarkUrl;document.head.appendChild(touch);
  }
  function utilityRow(){
    let row=document.querySelector('.nx-utility-row');
    if(!row){
      row=document.createElement('div');row.className='nx-utility-row';row.setAttribute('role','group');row.setAttribute('aria-label','Uygulama araçları');
      const main=document.querySelector('body>main'),footer=document.querySelector('body>footer');
      if(main)main.insertAdjacentElement('afterend',row);else if(footer)footer.insertAdjacentElement('beforebegin',row);else document.body.appendChild(row);
    }
    const move=()=>{
      ['.nexora-language-toggle','#nexora-install','.nexora-support-panel','.edge-dock'].forEach(selector=>{
        const item=document.querySelector(selector);
        if(item&&item.parentElement!==row)row.appendChild(item);
      });
      const account=document.querySelector('.nova-account-dock');
      if(account)account.remove();
    };
    move();
    const observer=new MutationObserver(move);
    observer.observe(document.body,{childList:true});
  }
  function boot(){
    document.body.classList.add('nx-unified-shell');
    if(!document.querySelector('link[data-nx-ux-polish]')){const style=document.createElement('link');style.rel='stylesheet';style.href=base+'css/ux-polish.css?v=20261115a';style.dataset.nxUxPolish='true';document.head.appendChild(style);}
    icons();
    brandHeader();
    connectivity();
    navigation();
    utilityRow();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();