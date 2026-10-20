/* Honest network state: connectivity is not proof that any provider is healthy or fresh. */
(function(){
  const root=document.documentElement;
  function setNetwork(){
    const online=navigator.onLine;
    root.dataset.network=online?"online":"offline";
    let bar=document.querySelector(".nova-offline-bar");
    if(!bar){
      bar=document.createElement("div");
      bar.className="nova-offline-bar";
      bar.setAttribute("role","status");
      bar.setAttribute("aria-live","polite");
      document.body.prepend(bar);
    }
    bar.replaceChildren();
    const strong=document.createElement("strong");
    const message=document.createElement("span");
    if(online){
      strong.textContent="● BAĞLANTI VAR";
      message.textContent=" • İnternet erişilebilir; FIRMS, hava durumu ve uydu sağlayıcılarının durumu ayrıca doğrulanmalıdır.";
    }else{
      strong.textContent="● ÇEVRİMDIŞI";
      message.textContent=" • Önbellekteki arayüz kullanılabilir; canlı veriler güncel olmayabilir veya hiç bulunmayabilir.";
    }
    bar.append(strong,message);
  }
  window.addEventListener("online",setNetwork);
  window.addEventListener("offline",setNetwork);
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",setNetwork,{once:true});
  else setNetwork();
  if("serviceWorker" in navigator)window.addEventListener("load",async()=>{
    try{
      const reg=await navigator.serviceWorker.register("./sw.js");
      reg.update().catch(()=>{});
    }catch(error){
      root.dataset.serviceWorker="unavailable";
      window.dispatchEvent(new CustomEvent("nova:service-worker-error",{detail:{message:"Service worker registration failed"}}));
    }
  });
})();
