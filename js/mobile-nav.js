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