(function(){
  const root=document.documentElement;
  function setNetwork(){
    const online=navigator.onLine;
    root.dataset.network=online?"online":"offline";
    let bar=document.querySelector(".nova-offline-bar");
    if(!bar){bar=document.createElement("div");bar.className="nova-offline-bar";document.body.prepend(bar)}
    bar.innerHTML=online?"<strong>● İNTERNET VAR</strong> <span>• Canlı veri ve yerel depo aktif</span>":"<strong>● İNTERNET YOK</strong> <span>• Yerel karar motoru ve son veriler aktif</span>";
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