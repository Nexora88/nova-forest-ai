/* One consistent PWA install control for all pages. */
(() => {
  const installed = () => window.matchMedia("(display-mode: standalone)").matches || window.navigator.standalone === true;
  function boot() {
    if (installed()) return;
    let deferred = null;
    const button = document.createElement("button");
    button.id = "nexora-install";
    button.type = "button";
    button.className = "nexora-install-button";
    button.setAttribute("aria-label", "Install NexoraWildfire AI");
    button.innerHTML = '<span class="nexora-install-icon" aria-hidden="true">↓</span><span class="nexora-install-label">Install app</span>';
    button.hidden = false;
    document.body.appendChild(button);

    const hide = () => {
      button.remove();
      try { localStorage.setItem("nexorawildfire-installed-v1", "true"); } catch {}
    };
    try { if (localStorage.getItem("nexorawildfire-installed-v1") === "true") { button.remove(); return; } } catch {}
    window.addEventListener("beforeinstallprompt", event => {
      if (installed()) return;
      event.preventDefault();
      deferred = event;
      button.hidden = false;
    });
    button.addEventListener("click", async () => {
      if (!deferred) {
        button.querySelector(".nexora-install-label").textContent = /iphone|ipad|ipod/i.test(navigator.userAgent) ? "Share → Add to Home Screen" : "Use your browser menu to install";
        return;
      }
      const promptEvent = deferred;
      deferred = null;
      await promptEvent.prompt();
      const choice = await promptEvent.userChoice;
      if (choice?.outcome === "accepted") hide();
      else button.hidden = false;
    });
    window.addEventListener("appinstalled", hide);
    const media = window.matchMedia("(display-mode: standalone)");
    media.addEventListener?.("change", event => { if (event.matches) hide(); });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot, {once:true});
  else boot();

  window.NovaEnablePush = async function() {
    try {
      if (!("Notification" in window) || !("serviceWorker" in navigator) || !("PushManager" in window)) return {ok:false,reason:"unsupported"};
      const permission = Notification.permission === "granted" ? "granted" : await Notification.requestPermission();
      if (permission !== "granted") return {ok:false,reason:"permission"};
      if (window.NovaAlert?.enablePush) {
        const area = JSON.parse(localStorage.getItem("nexorawildfire-push-area-v1") || "null") || {name:"General Nova-Alert",lat:41.0082,lon:28.9784};
        return await window.NovaAlert.enablePush(area);
      }
      return {ok:true};
    } catch (error) { return {ok:false,reason:"error"}; }
  };
  const script = document.currentScript;
  const root = new URL("../", script?.src || location.href);
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => navigator.serviceWorker.register(new URL("sw.js",root), {scope:root.pathname}).catch(error => console.warn("Nexora PWA:",error)));
  }
})();