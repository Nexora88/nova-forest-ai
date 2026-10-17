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
    ["pages/vision.html", "Cumhuriyet Vizyonu", "Republic Vision"],
    ["pages/account.html", "Hesap Merkezi", "Account Center"],
    ["pages/auth.html", "Giriş / Kayıt", "Sign in / Sign up"],
    ["pages/enterprise.html", "Kurumsal Analiz", "Enterprise Analysis"]
  ];
  const language = () => document.documentElement.dataset.language || localStorage.getItem("nexorawildfire-language-v1") || "tr";
  const english = () => language() === "en";

  function installConnectivity() {
    const header = document.querySelector("body > header");
    const nav = document.querySelector("body > nav");
    if (!header || !nav || document.querySelector(".nx-device-status")) return;
    const brandLine = header.querySelector(".brand-lockup .logo p, .logo p");
    const chip = document.createElement("div");
    chip.className = "nx-device-status";
    chip.setAttribute("role", "status");
    chip.setAttribute("aria-live", "polite");
    chip.innerHTML = '<span class="nx-device-dot" aria-hidden="true"></span><span class="nx-device-label"></span>';
    const statusBar = document.createElement("div");
    statusBar.className = "nx-connectivity-bar";
    statusBar.appendChild(chip);
    nav.insertAdjacentElement("afterend", statusBar);
    const paint = () => {
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

  function installScientificNotice() {
    if (document.querySelector(".nx-science-notice")) return;
    const nav = document.querySelector("body > nav");
    if (!nav) return;
    const note = document.createElement("aside");
    note.className = "nx-science-notice";
    note.setAttribute("role", "note");
    note.textContent = english()
      ? "Scientific note: risk scores are experimental decision-support indicators, not confirmed wildfire detection, official alerts, or validated forecasts."
      : "Bilimsel not: risk puanları deneysel karar destek göstergeleridir; doğrulanmış yangın tespiti, resmî uyarı veya kesin tahmin değildir.";
    const style = document.createElement("style");
    style.textContent = ".nx-science-notice{box-sizing:border-box;max-width:1440px;margin:0 auto;padding:8px clamp(12px,3vw,24px);color:#c9b98a;background:#151208;border-bottom:1px solid #51421d;font:500 11px/1.55 system-ui,sans-serif;overflow-wrap:anywhere}.nx-science-notice::before{content:'ⓘ';font-weight:800;margin-right:7px;color:#f1ce6e}";
    document.head.appendChild(style);
    const status = nav.nextElementSibling?.classList.contains("nx-connectivity-bar") ? nav.nextElementSibling : nav;
    status.insertAdjacentElement("afterend", note);
    new MutationObserver(() => {
      note.textContent = english()
        ? "Scientific note: risk scores are experimental decision-support indicators, not confirmed wildfire detection, official alerts, or validated forecasts."
        : "Bilimsel not: risk puanları deneysel karar destek göstergeleridir; doğrulanmış yangın tespiti, resmî uyarı veya kesin tahmin değildir.";
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["data-language"] });
  }

  function initNavigation() {
    const logoBase = location.pathname.includes("/pages/") ? "../" : "";
    const bindLogoFallbacks = () => document.querySelectorAll("body > header .brand-lockup img, body > header img.nx-header-logo").forEach(img => {
      if (img.dataset.nxFallbackBound === "true") return;
      img.dataset.nxFallbackBound = "true";
      img.addEventListener("error", () => {
        if (img.dataset.nxFallbackApplied === "true") return;
        img.dataset.nxFallbackApplied = "true";
        img.src = logoBase + "assets/nexora-wildfire-logo-fallback.svg";
      });
      if (img.complete && img.naturalWidth === 0) img.src = logoBase + "assets/nexora-wildfire-logo-fallback.svg";
    });
    bindLogoFallbacks();
    const header = document.querySelector("body > header");
    if (header && !header.querySelector(".brand-lockup img") && !header.querySelector(".nx-header-logo")) {
      const logo = header.querySelector(".logo");
      if (logo) {
        const img = document.createElement("img");
        img.className = "nx-header-logo";
        img.src = (location.pathname.includes("/pages/") ? "../" : "") + "assets/nexora-wildfire-logo.png";
        img.alt = "NexoraWildfire AI";
        img.width = 44;
        img.height = 44;
        logo.prepend(img);
        logo.classList.add("nx-standard-logo");
      }
    }
    bindLogoFallbacks();
    if (header && !document.querySelector("body > nav")) {
      const nav = document.createElement("nav");
      header.insertAdjacentElement("afterend", nav);
    }
    const style = document.createElement("style");
    style.textContent = ".logo.nx-standard-logo{display:grid;grid-template-columns:44px minmax(0,1fr);align-items:center;column-gap:12px;min-width:0}.nx-header-logo{grid-column:1;grid-row:1/span 2;width:44px;height:44px;object-fit:contain;flex:0 0 44px}.logo.nx-standard-logo h1,.logo.nx-standard-logo p{grid-column:2;min-width:0;overflow-wrap:anywhere}.logo.nx-standard-logo h1{margin:0}.logo.nx-standard-logo p{margin:4px 0 0}@media(max-width:480px){.nx-header-logo{width:38px;height:38px}.logo.nx-standard-logo{grid-template-columns:38px minmax(0,1fr);column-gap:9px}}";
    document.head.appendChild(style);
    installConnectivity();
    installScientificNotice();
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
        (index < 4 ? nav : moreLinks).appendChild(link);
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

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initNavigation, { once: true });
  else initNavigation();
})();