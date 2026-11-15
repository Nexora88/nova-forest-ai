/* Honest network state: connectivity is not proof that any provider is healthy or fresh. */
(function(){
  const root=document.documentElement;
  let staleAt=0;
  function ageLabel(){
    if(!staleAt)return "";
    const hours=Math.max(0,Math.floor((Date.now()-staleAt)/3600000));
    return hours<1?"1 saatten kısa süre önce":hours+" saat önce";
  }
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
      message.textContent=staleAt?" • Son geçerli sağlayıcı verisi "+ageLabel()+" kaydedilmiş; yeni veri ayrıca doğrulanmalıdır.":" • İnternet erişilebilir; FIRMS, hava durumu ve uydu sağlayıcılarının durumu ayrıca doğrulanmalıdır.";
    }else{
      strong.textContent="● ÇEVRİMDIŞI";
      message.textContent=staleAt?" • Son geçerli sağlayıcı verisi "+ageLabel()+"; güncel olmayabilir.":" • Önbellekteki arayüz kullanılabilir; canlı veriler güncel olmayabilir veya hiç bulunmayabilir.";
    }
    bar.append(strong,message);
  }
  // Surface stale-but-usable provider responses without altering the response returned to app code.
  if(typeof window.fetch==="function"){
    const nativeFetch=window.fetch.bind(window);
    window.fetch=async function(...args){
      const response=await nativeFetch(...args);
      if(response.headers?.get("X-Nexora-Stale")==="true"){
        const age=Number(response.headers.get("X-Nexora-Stale-Age-Ms")||0);
        staleAt=Date.now()-Math.max(0,age);
        root.dataset.dataFreshness="stale";
        setNetwork();
      }
      return response;
    };
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
