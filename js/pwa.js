(function(){
  window.NovaEnablePush=async function(){
    try{
      if(!("Notification" in window)||!("serviceWorker" in navigator)||!("PushManager" in window))return {ok:false,reason:"unsupported"};
      const permission=Notification.permission==="granted"? "granted":await Notification.requestPermission();
      if(permission!=="granted")return {ok:false,reason:"permission"};
      if(window.NovaAlert?.enablePush){
        const area=JSON.parse(localStorage.getItem("nexorawildfire-push-area-v1")||"null")||{name:"Genel Nova-Alert",lat:41.0082,lon:28.9784};
        return await window.NovaAlert.enablePush(area);
      }
      return {ok:true};
    }catch(e){return {ok:false,reason:"error"}}
  };
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
