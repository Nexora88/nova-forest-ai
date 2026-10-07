/* Controlled PWA install/update lifecycle. */
(function(){
  let deferred=null;
  window.addEventListener("beforeinstallprompt",e=>{e.preventDefault();deferred=e;window.NovaInstallReady=true;document.dispatchEvent(new Event("nova:install-ready"))});
  window.NovaInstall=async function(){
    if(!deferred)return false;
    deferred.prompt();const r=await deferred.userChoice;deferred=null;return r.outcome==="accepted";
  };
  let registration=null;
  async function check(){
    if(!("serviceWorker" in navigator))return;
    registration=await navigator.serviceWorker.getRegistration();
    if(!registration)return;
    registration.addEventListener("updatefound",()=>{const w=registration.installing;if(!w)return;w.addEventListener("statechange",()=>{if(w.state==="installed"&&navigator.serviceWorker.controller){window.NovaUpdatePending=true;document.dispatchEvent(new Event("nova:update-ready"))}})});
    await registration.update();
  }
  window.NovaCheckUpdate=check;
  window.NovaApplyUpdate=function(){if(registration?.waiting){registration.waiting.postMessage("SKIP_WAITING");window.NovaUpdatePending=true}};
  navigator.serviceWorker?.addEventListener("controllerchange",()=>{if(window.NovaUpdatePending)window.location.reload()});
  window.addEventListener("load",()=>setTimeout(check,2500));
})();