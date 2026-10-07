/* NexoraWildfire EDGE control surface. */
(function(){
  function boot(){
    let host=document.querySelector("[data-edge-controls]");
    if(!host){
      host=document.createElement("aside");
      host.className="edge-dock";
      host.setAttribute("data-edge-controls","");
      document.body.appendChild(host);
    }
    host.innerHTML='<div class="edge-status"><span class="edge-dot"></span><div><b>NEXORAWILDFIRE EDGE</b><small>Yerel veri + offline karar motoru</small></div></div><button class="edge-install" data-install>↥ CİHAZA YÜKLE</button><button class="edge-update" data-update hidden>↻ YENİ SÜRÜM HAZIR</button>';
    const install=host.querySelector("[data-install]");
    install.onclick=async()=>{const ok=await window.NovaInstall?.();if(!ok)install.textContent="Tarayıcı menüsünden yükle";};
    host.querySelector("[data-update]").onclick=()=>window.NovaApplyUpdate?.();
    document.addEventListener("nova:install-ready",()=>install.removeAttribute("disabled"));
    document.addEventListener("nova:update-ready",()=>{host.querySelector("[data-update]").hidden=false});
  }
  document.addEventListener("DOMContentLoaded",boot);
})();