/* Shared responsive navigation and truthful connectivity indicator for all product pages. */
(() => {
  const entries = [
    ["index.html", "Ana Panel", "Dashboard"],
    ["pages/map.html", "Risk Haritası", "Risk Map"],
    ["pages/areas.html", "Alanlarım", "My Areas"],
    ["pages/weather.html", "Atmosfer", "Atmosphere"],
    ["pages/satellite.html", "Uydu Merkezi", "Satellite Hub"],
    ["pages/uav-demo.html", "İHA / Yapay Zekâ", "UAV / AI"],
    ["pages/about.html", "Sistem", "About the System"],
    ["pages/feedback.html", "Geri Bildirim", "Feedback"],
    ["pages/vision.html", "Cumhuriyet Vizyonu", "Republic Vision"]
  ];
  const language = () => document.documentElement.dataset.language || localStorage.getItem("nexorawildfire-language-v1") || "tr";
  const inEnglish = () => language() === "en";
  function installConnectivity() {
    const header = document.querySelector("body > header");
    if (!header || header.querySelector(".nx-device-status")) return;
    const chip = document.createElement("div");
    chip.className = "nx-device-status";
    chip.setAttribute("role", "status");
    chip.setAttribute("aria-live", "polite");
    chip.innerHTML = '<span class="nx-device-dot" aria-hidden="true"></span><span class="nx-device-label"></span>';
    header.appendChild(chip);
    const paint = () => {
      chip.querySelector(".nx-device-label").textContent = navigator.onLine
        ? (inEnglish() ? "Device active · Internet connected" : "Cihaz aktif · İnternet bağlı")
        : (inEnglish() ? "Device active · Offline" : "Cihaz aktif · Çevrimdışı");
      chip.title = inEnglish() ? "Shows the browser connection state, not the health of every data provider." : "Tarayıcı bağlantısını gösterir; tüm veri sağlayıcılarının çalıştığını garanti etmez.";
      chip.classList.toggle("is-offline", !navigator.onLine);
    };
    window.addEventListener("online", paint);
    window.addEventListener("offline", paint);
    new MutationObserver(paint).observe(document.documentElement, {attributes:true, attributeFilter:["data-language"]});
    paint();
  }
  function initNavigation() {
    installConnectivity();
    const inPages = /\/pages\//.test(location.pathname);
    document.querySelectorAll("body > nav").forEach((nav, index) => {
      if (nav.dataset.nxReady === "true") return;
      const current = location.pathname.split("/").pop() || "index.html";
      nav.replaceChildren();
      nav.classList.add("nx-nav");
      nav.setAttribute("aria-label", inEnglish() ? "Main navigation" : "Ana gezinme");
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nx-nav-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = '<span aria-hidden="true">☰</span><span class="nx-nav-toggle-label"></span>';
      nav.appendChild(toggle);
      const links = [];
      entries.forEach(([path,tr,en]) => {
        const target = inPages ? (path === "index.html" ? "../index.html" : path.replace(/^pages\//, "")) : path;
        const link = document.createElement("a");
        link.href = target;
        link.dataset.navTr = tr;
        link.dataset.navEn = en;
        link.textContent = inEnglish() ? en : tr;
        const page = path.split("/").pop();
        if (page === current || (current === "" && page === "index.html")) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }
        nav.appendChild(link);
        links.push(link);
      });
      nav.dataset.nxReady = "true";
      const closeMenu = () => {
        nav.classList.remove("nx-nav-open");
        document.body.classList.remove("nx-menu-open");
        document.body.style.overflow = "";
        document.body.style.overscrollBehavior = "";
        toggle.setAttribute("aria-expanded", "false");
        toggle.querySelector(".nx-nav-toggle-label").textContent = inEnglish() ? "Menu" : "Menü";
        toggle.querySelector('[aria-hidden="true"]').textContent = "☰";
      };
      toggle.addEventListener("click", () => {
        const open = !nav.classList.contains("nx-nav-open");
        if (open) {
          nav.classList.add("nx-nav-open");
          document.body.classList.add("nx-menu-open");
          document.body.style.overflow = "hidden";
          document.body.style.overscrollBehavior = "none";
          toggle.setAttribute("aria-expanded", "true");
          toggle.querySelector(".nx-nav-toggle-label").textContent = inEnglish() ? "Close menu" : "Menüyü kapat";
          toggle.querySelector('[aria-hidden="true"]').textContent = "×";
        } else closeMenu();
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a") && nav.classList.contains("nx-nav-open")) closeMenu();
      });
      nav.addEventListener("keydown", event => {
        if (event.key === "Escape" && nav.classList.contains("nx-nav-open")) { closeMenu(); toggle.focus(); }
      });
      const updateLanguage = () => {
        nav.setAttribute("aria-label", inEnglish() ? "Main navigation" : "Ana gezinme");
        links.forEach(link => link.textContent = inEnglish() ? link.dataset.navEn : link.dataset.navTr);
        if (!nav.classList.contains("nx-nav-open")) toggle.querySelector(".nx-nav-toggle-label").textContent = inEnglish() ? "Menu" : "Menü";
      };
      new MutationObserver(updateLanguage).observe(document.documentElement, {attributes:true, attributeFilter:["data-language"]});
      updateLanguage();
    });
  }
  const css = document.createElement("style");
  css.textContent = `
    body>nav.nx-nav{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:7px;padding:10px clamp(12px,3vw,36px);position:relative;z-index:50;background:rgba(3,8,5,.97);border-bottom:1px solid #163d25;box-sizing:border-box}
    body>nav.nx-nav>a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 11px;border:1px solid transparent;border-radius:9px;color:#a8b9ad;text-decoration:none;font:600 12px/1.35 system-ui,sans-serif;background:transparent;white-space:normal}
    body>nav.nx-nav>a:hover{color:#eaffef;border-color:#235b36}
    body>nav.nx-nav>a.active{color:#001c08;background:#00ff66;border-color:#00ff66}
    body>nav.nx-nav .nx-nav-toggle{display:none;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:9px 13px;border:1px solid #245b36;border-radius:10px;background:#07130b;color:#eaffef;font:700 12px system-ui;cursor:pointer}
    .nx-device-status{display:inline-flex;align-items:center;gap:8px;max-width:100%;padding:9px 12px;border:1px solid #245b36;border-radius:999px;background:#07130b;color:#baf8ca;font:700 11px/1.35 system-ui,sans-serif;overflow-wrap:anywhere}
    .nx-device-dot{width:8px;height:8px;border-radius:50%;background:#00ff66;box-shadow:0 0 10px #00ff6670;flex:0 0 auto}
    .nx-device-status.is-offline{border-color:#6a5228;color:#ffdfa0}.nx-device-status.is-offline .nx-device-dot{background:#ffca66;box-shadow:0 0 8px #ffca6660}
    @media(max-width:780px){
      body>nav.nx-nav{justify-content:flex-start;gap:0;padding:8px 12px}
      body>nav.nx-nav .nx-nav-toggle{display:inline-flex}
      body>nav.nx-nav:not(.nx-nav-open)>a{display:none}
      body>nav.nx-nav.nx-nav-open{position:fixed;inset:0;align-content:flex-start;align-items:stretch;justify-content:flex-start;flex-direction:column;overflow-y:auto;overscroll-behavior:contain;padding:calc(18px + env(safe-area-inset-top)) 16px calc(22px + env(safe-area-inset-bottom));background:#020704;z-index:10000;gap:7px}
      body>nav.nx-nav.nx-nav-open>a{display:flex;width:100%;box-sizing:border-box;justify-content:flex-start;padding:13px;min-height:46px;font-size:14px}
      body>nav.nx-nav.nx-nav-open .nx-nav-toggle{align-self:flex-start;margin-bottom:8px}
      body>nav.nx-nav .nx-nav-toggle:focus-visible,body>nav.nx-nav>a:focus-visible{outline:2px solid #fff;outline-offset:3px}
      body.nx-menu-open{overscroll-behavior:none}
      body>header .nx-device-status{font-size:10px;padding:7px 9px}
    }`;
  document.head.appendChild(css);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, {once:true});
  else initNavigation();
})();