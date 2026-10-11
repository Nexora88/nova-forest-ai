/* One canonical, bilingual navigation map for every app page. */
(() => {
  const links = [
    ["index.html", "Ana Panel", "Dashboard"],
    ["pages/map.html", "Risk Haritası", "Risk Map"],
    ["pages/areas.html", "Alanlarım", "My Areas"],
    ["pages/weather.html", "Atmosfer", "Weather"],
    ["pages/events.html", "Etkinlikler", "Events"],
    ["pages/satellite.html", "Uydu Merkezi", "Satellite Hub"],
    ["pages/account.html", "Profil", "Profile"],
    ["pages/about.html", "Sistem", "About"],
    ["pages/vision.html", "Vizyon", "Vision"],
    ["pages/feedback.html", "Geri Bildirim", "Feedback"],
    ["pages/legal.html", "Yasal Bilgiler", "Legal & Privacy"]
  ];
  const isEnglish = () => /^en(?:-|$)/i.test(
    document.documentElement.dataset.language || document.documentElement.lang || "tr"
  );
  const pathFor = (path, inPages) =>
    inPages ? (path === "index.html" ? "../index.html" : path.replace(/^pages\//, "")) : path;

  function render() {
    const nav = document.querySelector("body > nav");
    if (!nav) return;
    const pathname = location.pathname.replace(/\\/g, "/");
    const current = pathname.split("/").pop() || "index.html";
    const inPages = pathname.includes("/pages/");
    const english = isEnglish();
    const prepared = nav.dataset.nxReady === "true";
    const toggle = prepared ? nav.querySelector(":scope > .nx-nav-toggle") : null;
    const more = prepared ? nav.querySelector(":scope > .nx-nav-more") : null;
    const moreLinks = more?.querySelector(".nx-nav-more-links") || null;
    const existing = new Map();
    nav.querySelectorAll("a").forEach(anchor => {
      const name = (anchor.pathname || anchor.getAttribute("href") || "").split("/").pop().split("?")[0];
      if (name && !existing.has(name)) existing.set(name, anchor);
    });

    const canonical = links.map(([path, tr, en]) => {
      const name = path.split("/").pop();
      const anchor = existing.get(name) || document.createElement("a");
      anchor.href = pathFor(path, inPages);
      anchor.dataset.tr = tr;
      anchor.dataset.en = en;
      anchor.textContent = english ? en : tr;
      anchor.classList.toggle("active", name === current);
      anchor.removeAttribute("target");
      return anchor;
    });

    // Keep mobile-nav's buttons/listeners but rebuild its links from one source of truth.
    nav.querySelectorAll("a").forEach(anchor => anchor.remove());
    if (toggle && more && moreLinks) {
      canonical.slice(0, 3).forEach(anchor => nav.insertBefore(anchor, more));
      moreLinks.replaceChildren(...canonical.slice(3));
      nav.appendChild(more);
    } else {
      nav.replaceChildren(...canonical);
    }
    nav.setAttribute("aria-label", english ? "Main navigation" : "Ana gezinme");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, { once: true });
  else render();
  window.addEventListener("nexora:languagechange", render);
})();
