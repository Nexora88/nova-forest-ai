/* Shared, compact desktop navigation and full-screen mobile navigation. */
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
  const english = () => language() === "en";

  function installConnectivity() {
    const header = document.querySelector("body > header");
    if (!header || header.querySelector(".nx-device-status")) return;
    const brandLine = header.querySelector(".brand-lockup .logo p, .logo p");
    const chip = document.createElement("div");
    chip.className = "nx-device-status";
    chip.setAttribute("role", "status");
    chip.setAttribute("aria-live", "polite");
    chip.innerHTML = '<span class="nx-device-dot" aria-hidden="true"></span><span class="nx-device-label"></span>';
    header.appendChild(chip);
    const paint = () => {
      if (brandLine && header.querySelector("h1")?.textContent.includes("NexoraWildfire")) {
        brandLine.textContent = english() ? "Environmental Intelligence" : "Çevresel Zekâ";
      }
      chip.querySelector(".nx-device-label").textContent = navigator.onLine
        ? (english() ? "Device active · Internet connected" : "Cihaz aktif · İnternet bağlı")
        : (english() ? "Device active · Offline" : "Cihaz aktif · Çevrimdışı");
      chip.title = english()
        ? "Browser connection status only; it does not guarantee every provider is available."
        : "Yalnızca tarayıcı bağlantısını gösterir; tüm veri sağlayıcılarının çalıştığını garanti etmez.";
      chip.classList.toggle("is-offline", !navigator.onLine);
    };
    window.addEventListener("online", paint);
    window.addEventListener("offline", paint);
    new MutationObserver(paint).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
    paint();
  }

  function initNavigation() {
    installConnectivity();
    const inPages = /\/pages\//.test(location.pathname);
    document.querySelectorAll("body > nav").forEach(nav => {
      if (nav.dataset.nxReady === "true") return;
      const current = location.pathname.split("/").pop() || "index.html";
      nav.replaceChildren();
      nav.classList.add("nx-nav");
      nav.setAttribute("aria-label", english() ? "Main navigation" : "Ana gezinme");

      const mobileToggle = document.createElement("button");
      mobileToggle.type = "button";
      mobileToggle.className = "nx-nav-toggle";
      mobileToggle.setAttribute("aria-expanded", "false");
      mobileToggle.innerHTML = '<span aria-hidden="true">☰</span><span class="nx-nav-toggle-label"></span>';
      nav.appendChild(mobileToggle);

      const more = document.createElement("div");
      more.className = "nx-nav-more";
      const moreToggle = document.createElement("button");
      moreToggle.type = "button";
      moreToggle.className = "nx-nav-more-toggle";
      moreToggle.setAttribute("aria-expanded", "false");
      const moreLinks = document.createElement("div");
      moreLinks.className = "nx-nav-more-links";
      more.append(moreToggle, moreLinks);

      const links = [];
      entries.forEach(([path, tr, en], index) => {
        const target = inPages ? (path === "index.html" ? "../index.html" : path.replace(/^pages\//, "")) : path;
        const link = document.createElement("a");
        link.href = target;
        link.dataset.navTr = tr;
        link.dataset.navEn = en;
        link.textContent = english() ? en : tr;
        const page = path.split("/").pop();
        if (page === current || (current === "" && page === "index.html")) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }
        (index < 3 ? nav : moreLinks).appendChild(link);
        links.push(link);
      });
      nav.appendChild(more);
      nav.dataset.nxReady = "true";

      const closeMobile = () => {
        nav.classList.remove("nx-nav-open");
        document.body.classList.remove("nx-menu-open");
        document.body.style.overflow = "";
        document.body.style.overscrollBehavior = "";
        mobileToggle.setAttribute("aria-expanded", "false");
        mobileToggle.querySelector(".nx-nav-toggle-label").textContent = english() ? "Menu" : "Menü";
        mobileToggle.querySelector('[aria-hidden="true"]').textContent = "☰";
      };
      const closeMore = () => {
        nav.classList.remove("nx-more-open");
        moreToggle.setAttribute("aria-expanded", "false");
      };
      mobileToggle.addEventListener("click", () => {
        if (nav.classList.contains("nx-nav-open")) {
          closeMobile();
          return;
        }
        closeMore();
        nav.classList.add("nx-nav-open");
        document.body.classList.add("nx-menu-open");
        document.body.style.overflow = "hidden";
        document.body.style.overscrollBehavior = "none";
        mobileToggle.setAttribute("aria-expanded", "true");
        mobileToggle.querySelector(".nx-nav-toggle-label").textContent = english() ? "Close menu" : "Menüyü kapat";
        mobileToggle.querySelector('[aria-hidden="true"]').textContent = "×";
      });
      moreToggle.addEventListener("click", () => {
        const open = !nav.classList.contains("nx-more-open");
        nav.classList.toggle("nx-more-open", open);
        moreToggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a")) {
          closeMobile();
          closeMore();
        }
      });
      nav.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          if (nav.classList.contains("nx-nav-open")) { closeMobile(); mobileToggle.focus(); }
          else if (nav.classList.contains("nx-more-open")) { closeMore(); moreToggle.focus(); }
        }
      });

      const updateLanguage = () => {
        nav.setAttribute("aria-label", english() ? "Main navigation" : "Ana gezinme");
        links.forEach(link => { link.textContent = english() ? link.dataset.navEn : link.dataset.navTr; });
        mobileToggle.querySelector(".nx-nav-toggle-label").textContent =
          nav.classList.contains("nx-nav-open") ? (english() ? "Close menu" : "Menüyü kapat") : (english() ? "Menu" : "Menü");
        moreToggle.textContent = (english() ? "More" : "Daha fazla") + (nav.classList.contains("nx-more-open") ? " ▴" : " ▾");
        moreToggle.setAttribute("aria-label", english() ? "More navigation links" : "Diğer gezinme bağlantıları");
      };
      new MutationObserver(updateLanguage).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
      updateLanguage();
    });
  }

  const css = [
    "body>nav.nx-nav{display:flex;flex-wrap:nowrap;align-items:center;justify-content:center;gap:5px;padding:10px clamp(10px,2vw,28px);position:relative;z-index:50;background:rgba(3,8,5,.97);border-bottom:1px solid #163d25;box-sizing:border-box;max-width:100%;}",
    "body>nav.nx-nav>a{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 10px;border:1px solid transparent;border-radius:9px;color:#a8b9ad;text-decoration:none;font:600 12px/1.35 system-ui,sans-serif;background:transparent;white-space:nowrap;}",
    "body>nav.nx-nav>a:hover,body>nav.nx-nav .nx-nav-more-toggle:hover{color:#eaffef;border-color:#235b36;}",
    "body>nav.nx-nav>a.active{color:#001c08;background:#00ff66;border-color:#00ff66;}",
    "body>nav.nx-nav .nx-nav-toggle{display:none;align-items:center;justify-content:center;gap:9px;min-height:42px;padding:9px 13px;border:1px solid #245b36;border-radius:10px;background:#07130b;color:#eaffef;font:700 12px system-ui;cursor:pointer;}",
    "body>nav.nx-nav .nx-nav-more{position:relative;flex:0 0 auto;}",
    "body>nav.nx-nav .nx-nav-more-toggle{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:38px;padding:8px 11px;border:1px solid #245b36;border-radius:9px;background:#07130b;color:#d5e7da;font:700 12px system-ui;cursor:pointer;white-space:nowrap;}",
    "body>nav.nx-nav .nx-nav-more-links{display:none;position:absolute;top:calc(100% + 7px);right:0;min-width:210px;max-width:min(280px,90vw);padding:7px;border:1px solid #245b36;border-radius:12px;background:#041008;box-shadow:0 16px 36px #0009;z-index:10001;}",
    "body>nav.nx-nav.nx-more-open .nx-nav-more-links{display:flex;flex-direction:column;gap:3px;}",
    "body>nav.nx-nav .nx-nav-more-links>a{display:flex;align-items:center;min-height:38px;padding:9px 11px;border-radius:8px;color:#b9cbbf;text-decoration:none;font:600 12px system-ui;white-space:normal;}",
    "body>nav.nx-nav .nx-nav-more-links>a:hover{background:#0b2112;color:#effff3;}",
    ".nx-device-status{display:inline-flex;align-items:center;gap:8px;max-width:100%;box-sizing:border-box;padding:8px 11px;border:1px solid #245b36;border-radius:999px;background:#07130b;color:#baf8ca;font:700 11px/1.35 system-ui,sans-serif;overflow-wrap:anywhere;}",
    ".nx-device-dot{width:8px;height:8px;border-radius:50%;background:#00ff66;box-shadow:0 0 10px #00ff6670;flex:0 0 auto;}",
    ".nx-device-status.is-offline{border-color:#6a5228;color:#ffdfa0;}.nx-device-status.is-offline .nx-device-dot{background:#ffca66;box-shadow:0 0 8px #ffca6660;}",
    "@media(max-width:900px){body>nav.nx-nav{justify-content:flex-start;flex-wrap:wrap;gap:5px;padding:8px 12px;}body>nav.nx-nav>a,body>nav.nx-nav .nx-nav-more{display:none;}body>nav.nx-nav .nx-nav-toggle{display:inline-flex;}}",
    "@media(max-width:900px){body>nav.nx-nav.nx-nav-open{position:fixed;inset:0;display:flex;align-content:flex-start;align-items:stretch;justify-content:flex-start;flex-direction:column;flex-wrap:nowrap;overflow-y:auto;overscroll-behavior:contain;padding:calc(18px + env(safe-area-inset-top)) 16px calc(22px + env(safe-area-inset-bottom));background:#020704;z-index:10000;gap:7px;}",
    "body>nav.nx-nav.nx-nav-open>a{display:flex;width:100%;box-sizing:border-box;justify-content:flex-start;padding:13px;min-height:46px;font-size:14px;white-space:normal;}",
    "body>nav.nx-nav.nx-nav-open .nx-nav-more{display:contents;}body>nav.nx-nav.nx-nav-open .nx-nav-more-toggle{display:none;}body>nav.nx-nav.nx-nav-open .nx-nav-more-links{display:contents;position:static;min-width:0;max-width:none;padding:0;border:0;background:transparent;box-shadow:none;}",
    "body>nav.nx-nav .nx-nav-toggle:focus-visible,body>nav.nx-nav>a:focus-visible,body>nav.nx-nav .nx-nav-more-toggle:focus-visible{outline:2px solid #fff;outline-offset:3px;}body.nx-menu-open{overscroll-behavior:none;}",
    "body>header .nx-device-status{font-size:10px;padding:7px 9px;}",
    "}",
    "@media(max-width:390px){body>header{gap:10px;}body>header .nx-device-status{width:100%;justify-content:center;}}"
  ].join("\n");
  const style = document.createElement("style");
  style.textContent = css;
  document.head.appendChild(style);
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  else initNavigation();
})();