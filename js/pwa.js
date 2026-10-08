(function(){
  const script=document.currentScript;
  const root=new URL('../',script?.src||location.href);
  if('serviceWorker' in navigator){
    window.addEventListener('load',()=>navigator.serviceWorker.register(new URL('sw.js',root),{scope:root.pathname}).catch(e=>console.warn('Nexora PWA:',e)));
  }
  let deferred=null;
  window.addEventListener('beforeinstallprompt',e=>{
    e.preventDefault(); deferred=e;
    const old=document.getElementById('nexora-install'); if(old) old.remove();
    const b=document.createElement('button'); b.id='nexora-install'; b.type='button';
    b.innerHTML='<img src="'+new URL('assets/nexora-wildfire-logo.png',root).href+'" alt=""><span>Uygulamayı yükle</span>';
    b.onclick=async()=>{if(!deferred)return;deferred.prompt();await deferred.userChoice;deferred=null;b.remove()};
    document.body.appendChild(b);
  });
})();
