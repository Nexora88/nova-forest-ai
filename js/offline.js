(function(){
  const root=document.documentElement;
  function setNetwork(){
    const online=navigator.onLine;
    root.dataset.network=online?"online":"offline";
    let bar=document.querySelector(".nova-offline-bar");
    if(!bar){bar=document.createElement("div");bar.className="nova-offline-bar";document.body.prepend(bar)}
    bar.textContent=online?"BAĞLANTI VAR • CANLI VERİ + YEREL DEPO AKTİF":"ÇEVRİMDIŞI MOD • YEREL KARAR MOTORU + SON VERİLER AKTİF";
  }
  window.addEventListener("online",setNetwork);window.addEventListener("offline",setNetwork);
  document.addEventListener("DOMContentLoaded",setNetwork);
  if("serviceWorker" in navigator)window.addEventListener("load",async()=>{
    try{
      const reg=await navigator.serviceWorker.register("./sw.js");
      setTimeout(()=>reg.update().catch(()=>{}),1500);
    }catch{}
  });
})();