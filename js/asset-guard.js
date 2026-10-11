/* Graceful fallback for broken content images. Leaflet map tiles and markers are left untouched. */
(() => {
  const STYLE_ID = "nx-asset-guard-style";
  function installStyle() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = ".nx-image-fallback{display:inline-flex;align-items:center;justify-content:center;box-sizing:border-box;overflow:hidden;max-width:100%;padding:8px;border:1px solid #28583a;border-radius:10px;background:#06100a;color:#9be9ae;font:600 11px/1.4 system-ui;text-align:center}.nx-image-fallback.nx-logo-fallback{width:44px;height:44px;flex:0 0 44px;border-radius:12px;font-size:18px;font-weight:900}.nx-image-fallback.nx-photo-fallback{min-height:72px}";
    document.head.appendChild(style);
  }
  function guard(img) {
    if (!(img instanceof HTMLImageElement) || img.dataset.nxGuarded === "1" || img.closest(".leaflet-container")) return;
    img.dataset.nxGuarded = "1";
    img.addEventListener("error", () => {
      if (!img.isConnected || img.dataset.nxFallbackDone === "1") return;
      img.dataset.nxFallbackDone = "1";
      const fallback = document.createElement("span");
      const logo = img.classList.contains("brand-logo") || /logo|nexora/i.test(img.alt || "");
      fallback.className = "nx-image-fallback " + (logo ? "nx-logo-fallback" : "nx-photo-fallback");
      fallback.setAttribute("role", "img");
      fallback.setAttribute("aria-label", img.alt || "Image unavailable");
      fallback.textContent = logo ? "N" : (img.alt || "Görsel yüklenemedi");
      const rect = img.getBoundingClientRect();
      if (!logo && rect.width > 0) fallback.style.width = Math.min(rect.width, 480) + "px";
      if (!logo && rect.height > 0) fallback.style.minHeight = Math.min(rect.height, 320) + "px";
      img.replaceWith(fallback);
    }, {once:true});
  }
  function scan(root=document) {
    if (root instanceof HTMLImageElement) guard(root);
    root.querySelectorAll?.("img").forEach(guard);
  }
  function boot() {
    installStyle();
    scan();
    new MutationObserver(records => records.forEach(record => record.addedNodes.forEach(node => {
      if (node.nodeType === Node.ELEMENT_NODE) scan(node);
    }))).observe(document.body, {childList:true,subtree:true});
  }
  if (document.body) boot(); else document.addEventListener("DOMContentLoaded",boot,{once:true});
})();