/* One shared, accessible header/navigation/connectivity shell for every page. */
(function(){
  'use strict';
  const root=document.documentElement;
  const base=location.pathname.includes('/pages/')?'../':'./';
  const logoUrl=base+'assets/nexora-wildfire-official.webp?v=20261107b';
  const appMarkUrl=base+'assets/nexora-wildfire-mark.png?v=20261111a';
  function brandHeader(){
    const header=document.querySelector('body>header');
    if(!header)return;
    header.innerHTML=
      '<a class="brand-lockup" href="'+base+'index.html" aria-label="NexoraWildfire AI ana sayfa">'+
        '<img class="brand-logo" src="'+logoUrl+'" alt="" width="44" height="44">'+
        '<div class="logo">'+
          '<div class="brand-parent">NEXORA</div>'+
          '<h1><span class="nx-brand-nexora">Nexora</span><span class="nx-brand-wildfire">Wildfire</span><span class="nx-brand-ai">AI</span></h1>'+
          '<p>Çevresel istihbarat · karar destek · EDGE</p>'+
        '</div>'+
      '</a>'+
      '<div class="status" title="Trakya pilot alanı. Canlı veri kapsamı, ilgili sağlayıcının durumuna bağlıdır."><span></span> TRAKYA · PİLOT</div>';
  }
  function connectivity(){
    let bar=document.querySelector('.nova-offline-bar');
    if(!bar){bar=document.createElement('div');bar.className='nova-offline-bar';document.body.prepend(bar)}
    function update(){
      const online=navigator.onLine;
      root.dataset.network=online?'online':'offline';
      bar.innerHTML=online
        ?'<strong>● BAĞLANTI VAR</strong><span>· Cihaz çevrimiçi; veri sağlayıcılarının durumu ayrıca doğrulanır</span>'
        :'<strong>● ÇEVRİMDIŞI</strong><span>· Son kayıtlı veriler ve yerel özellikler kullanılabilir</span>';
    }
    window.addEventListener('online',update);
    window.addEventListener('offline',update);
    update();
  }
  function navigation(){
    const nav=document.querySelector('body>nav');
    if(!nav)return;
    nav.classList.add('nx-nav');
    if(!nav.hasAttribute('aria-label'))nav.setAttribute('aria-label','Ana gezinme');
    if(!nav.querySelector('.nav-brand')){
      const label=document.createElement('span');
      label.className='nav-brand';
      label.textContent='NEXORA / ENVIRONMENTAL INTELLIGENCE';
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
      const account=document.querySelector('.nova-account-dock'),header=document.querySelector('body>header');
      if(account&&header&&account.parentElement!==header)header.appendChild(account);
    };
    move();
    const observer=new MutationObserver(move);
    observer.observe(document.body,{childList:true});
  }
  function boot(){
    document.body.classList.add('nx-unified-shell');
    icons();
    brandHeader();
    connectivity();
    navigation();
    utilityRow();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',boot,{once:true});
  else boot();
})();