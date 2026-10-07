(function(){
  const root=document.documentElement;
  function setNetwork(){
    const online=navigator.onLine;
    root.dataset.network=online?"online":"offline";
    let bar=document.querySelector(".nova-offline-bar");
    if(!bar){
      bar=document.createElement("div");
      bar.className="nova-offline-bar";
      document.body.prepend(bar);
    }
    bar.textContent=online
      ?"BAĞLANTI VAR • Canlı veri yenilemesi etkin"
      :"ÇEVRİMDIŞI MOD • Son geçerli veriler gösteriliyor";
  }
  window.addEventListener("online",setNetwork);
  window.addEventListener("offline",setNetwork);
  document.addEventListener("DOMContentLoaded",setNetwork);

  if("serviceWorker" in navigator){
    window.addEventListener("load",()=>navigator.serviceWorker.register("./sw.js").catch(()=>{}));
  }
})();