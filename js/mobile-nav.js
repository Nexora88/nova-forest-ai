/* Canonical, accessible navigation shared by all NexoraWildfire pages. */
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
  function initNavigation() {
    const inPages = /\/pages\//.test(location.pathname);
  
    document.querySelectorAll("body > nav").forEach((nav, index) => {
      if (nav.dataset.nxReady === "true") return;
      const current = location.pathname.split("/").pop() || "index.html";
      const lang = document.documentElement.dataset.language || localStorage.getItem("nexorawildfire-language-v1") || "tr";
      nav.replaceChildren();
      nav.classList.add("nx-nav");
      nav.setAttribute("aria-label", lang === "en" ? "Main navigation" : "Ana gezinme");
      entries.forEach(([path,tr,en]) => {
        const target = inPages ? (path === "index.html" ? "../index.html" : path.replace(/^pages\//, "")) : path;
        const link = document.createElement("a");
        link.href = target;
        link.textContent = lang === "en" ? en : tr;
        const page = path.split("/").pop();
        if (page === current || (current === "" && page === "index.html")) {
          link.classList.add("active");
          link.setAttribute("aria-current", "page");
        }
        nav.appendChild(link);
      });
      nav.dataset.nxReady = "true";
      nav.classList.add("nx-nav");
      const links = Array.from(nav.querySelectorAll(":scope > a"));
      const toggle = document.createElement("button");
      toggle.type = "button";
      toggle.className = "nx-nav-toggle";
      toggle.setAttribute("aria-expanded", "false");
      toggle.innerHTML = '<span aria-hidden="true">☰</span><span class="nx-nav-toggle-label">' + (lang === "en" ? "Menu" : "Menü") + '</span>';
      const linksId = "nx-nav-links-" + index;
      const more = document.createElement("div");
      more.className = "nx-nav-more";
      const moreToggle = document.createElement("button");
      moreToggle.type = "button";
      moreToggle.className = "nx-nav-more-toggle";
      moreToggle.setAttribute("aria-expanded", "false");
      moreToggle.innerHTML = (lang === "en" ? "More" : "Daha fazla") + ' <span aria-hidden="true">▾</span>';
      const moreLinks = document.createElement("div");
      moreLinks.className = "nx-nav-more-links";
      moreLinks.id = linksId;
      links.forEach((link, i) => {
        if (i < 3) nav.appendChild(link);
        else moreLinks.appendChild(link);
      });
      more.append(moreToggle, moreLinks);
      nav.insertBefore(toggle, nav.firstChild);
      nav.appendChild(more);
      toggle.addEventListener("click", () => {
        const open = nav.classList.toggle("nx-nav-open");
        document.body.classList.toggle("nx-menu-open", open);
        document.body.style.overflow = open ? "hidden" : "";
        document.body.style.overscrollBehavior = open ? "none" : "";
        toggle.setAttribute("aria-expanded", String(open));
        toggle.querySelector(".nx-nav-toggle-label").textContent = open ? (lang === "en" ? "Close" : "Kapat") : (lang === "en" ? "Menu" : "Menü");
      });
      moreToggle.addEventListener("click", () => {
        const open = more.classList.toggle("nx-nav-more-open");
        moreToggle.setAttribute("aria-expanded", String(open));
      });
      nav.addEventListener("click", event => {
        if (event.target.closest("a") && nav.classList.contains("nx-nav-open")) {
          nav.classList.remove("nx-nav-open");
          document.body.classList.remove("nx-menu-open");
          document.body.style.overflow = "";
          document.body.style.overscrollBehavior = "";
          toggle.setAttribute("aria-expanded", "false");
        }
      });
      nav.addEventListener("keydown", event => {
        if (event.key === "Escape") {
          nav.classList.remove("nx-nav-open");
          more.classList.remove("nx-nav-more-open");
          document.body.classList.remove("nx-menu-open");
          document.body.style.overflow = "";
          document.body.style.overscrollBehavior = "";
          toggle.setAttribute("aria-expanded", "false");
          moreToggle.setAttribute("aria-expanded", "false");
          toggle.focus();
        }
      });
      const navObserver = new MutationObserver(() => {
        const nextLang = document.documentElement.dataset.language || localStorage.getItem("nexorawildfire-language-v1") || "tr";
        nav.setAttribute("aria-label", nextLang === "en" ? "Main navigation" : "Ana gezinme");
        links.forEach((link, i) => link.textContent = nextLang === "en" ? entries[i][2] : entries[i][1]);
        toggle.querySelector(".nx-nav-toggle-label").textContent = nextLang === "en" ? "Menu" : "Menü";
        moreToggle.innerHTML = (nextLang === "en" ? "More" : "Daha fazla") + ' <span aria-hidden="true">▾</span>';
      });
      navObserver.observe(document.documentElement, {attributes:true, attributeFilter:["data-language"]});
    });
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, {once:true});
  else initNavigation();
  const navStyle = document.createElement("style");
  navStyle.textContent = `
    body>nav.nx-nav{display:flex;flex-wrap:wrap;align-items:center;gap:6px;padding:10px clamp(12px,3vw,36px);position:relative;z-index:50;background:rgba(3,8,5,.96);border-bottom:1px solid #163d25}
    body>nav.nx-nav>a,body>nav.nx-nav .nx-nav-more-toggle{display:inline-flex;align-items:center;justify-content:center;min-height:38px;padding:8px 11px;border:1px solid transparent;border-radius:9px;color:#a8b9ad;text-decoration:none;font:600 12px/1.3 system-ui,sans-serif;background:transparent;cursor:pointer}
    body>nav.nx-nav>a:hover,body>nav.nx-nav .nx-nav-more-toggle:hover{color:#eaffef;border-color:#235b36}
    body>nav.nx-nav>a.active{color:#001c08;background:#00ff66;border-color:#00ff66}
    .nx-nav-toggle{display:none;align-items:center;gap:9px;min-height:42px;padding:9px 13px;border:1px solid #245b36;border-radius:10px;background:#07130b;color:#eaffef;font:700 12px system-ui;cursor:pointer}
    .nx-nav-more{position:relative;display:flex;align-items:center}
    .nx-nav-more-links{display:contents}
    .nx-nav-more-toggle{display:none;border-color:#1a3925!important}
    @media(max-width:780px){
      body>nav.nx-nav{justify-content:space-between}
      .nx-nav-toggle{display:inline-flex}
      .nx-nav-more-toggle{display:inline-flex}
      .nx-nav-more-links a.active{display:flex!important}
      body>nav.nx-nav>a{display:none}
      body>nav.nx-nav>a.active{display:inline-flex}
      .nx-nav-more{margin-left:auto}
      .nx-nav-more-links{display:none;position:absolute;right:0;top:calc(100% + 8px);min-width:min(270px,calc(100vw - 30px));padding:8px;border:1px solid #245b36;border-radius:13px;background:#041009;box-shadow:0 16px 42px #0009;z-index:100;flex-direction:column;align-items:stretch}
      .nx-nav-more-links a{display:flex;align-items:center;min-height:42px;padding:10px 12px;color:#cce0d1;text-decoration:none;border-radius:8px;font:600 12px system-ui}
      .nx-nav-more-links a.active{color:#001b08;background:#00ff66}
      .nx-nav-more.nx-nav-more-open .nx-nav-more-links{display:flex}
      body>nav.nx-nav.nx-nav-open{position:fixed;inset:0;align-content:flex-start;align-items:flex-start;justify-content:flex-start;flex-direction:column;overflow:auto;padding:18px;background:#020704;z-index:10000}
      body>nav.nx-nav.nx-nav-open>a{display:flex;width:100%;justify-content:flex-start;padding:13px}
      body>nav.nx-nav.nx-nav-open>a.active{display:flex}
      body>nav.nx-nav.nx-nav-open .nx-nav-more{width:100%;display:block}
      body>nav.nx-nav.nx-nav-open .nx-nav-more-toggle{width:100%;justify-content:space-between}
      body>nav.nx-nav.nx-nav-open .nx-nav-more-links{position:static;width:100%;margin-top:8px}
      body>nav.nx-nav.nx-nav-open .nx-nav-more-links a{display:flex}
      body>nav.nx-nav.nx-nav-open .nx-nav-toggle{margin-bottom:12px}
    }`;
  document.head.appendChild(navStyle);
})();
