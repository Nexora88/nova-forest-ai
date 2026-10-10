/* Minimal EDGE status and update control; installation is managed by pwa.js. */
(() => {
  function boot() {
    let host = document.querySelector("[data-edge-controls]");
    if (!host) {
      host = document.createElement("aside");
      host.className = "edge-dock";
      host.setAttribute("data-edge-controls", "");
      document.body.appendChild(host);
    }
    host.innerHTML = '<div class="edge-status"><span class="edge-dot"></span><div><b>NEXORAWILDFIRE EDGE</b><small>Local data + offline decision engine</small></div></div><button class="edge-update" data-update hidden>↻ Update ready</button>';
    host.querySelector("[data-update]").addEventListener("click", () => window.NovaApplyUpdate?.());
    document.addEventListener("nova:update-ready", () => { host.querySelector("[data-update]").hidden = false; });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();
})();