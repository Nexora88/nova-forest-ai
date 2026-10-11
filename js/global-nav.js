/* One canonical navigation map for every main app page. */
(() => {
  const links = [
    ["index.html","Ana Panel","Dashboard"],
    ["pages/map.html","Risk Haritası","Risk Map"],
    ["pages/areas.html","Alanlarım","My Areas"],
    ["pages/weather.html","Atmosfer","Weather"],
    ["pages/events.html","Etkinlikler","Events"],
    ["pages/satellite.html","Uydu Merkezi","Satellite Hub"],
    ["pages/account.html","Profil","Profile"],
    ["pages/about.html","Sistem","About"],
    ["pages/vision.html","Vizyon","Vision"],
    ["pages/feedback.html","Geri Bildirim","Feedback"],
    ["pages/legal.html","Yasal Bilgiler","Legal & Privacy"]
  ];
  const isEnglish = () => /^en(?:-|$)/i.test(document.documentElement.dataset.language || document.documentElement.lang || "tr");
  const base = location.pathname.includes("/pages/") ? "" : "pages/";
  const normalPath = location.pathname.replace(/\\/g,"/");
  function render() {
    const nav = document.querySelector("body > nav");
    if (!nav) return;
    const current = normalPath.split("/").pop() || "index.html";
    const inPages = normalPath.includes("/pages/");
    nav.replaceChildren();
    for (const [path,tr,en] of links) {
      const a = document.createElement("a");
      a.href = inPages ? path.replace(/^pages\//,"") : path;
      const destination = path.split("/").pop();
      if (destination === current || (current === "" && destination === "index.html")) a.className = "active";
      a.dataset.tr = tr;
      a.dataset.en = en;
      a.textContent = isEnglish() ? en : tr;
      nav.appendChild(a);
    }
    nav.setAttribute("aria-label", isEnglish() ? "Main navigation" : "Ana gezinme");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, {once:true}); else render();
  window.addEventListener("nexora:languagechange", render);
})();