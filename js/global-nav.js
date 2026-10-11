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
  const pathFor = (path, inPages) => inPages ? (path === "index.html" ? "../index.html" : path.replace(/^pages\//,"")) : path;
  function render() {
    const nav = document.querySelector("body > nav");
    if (!nav) return;
    const pathname = location.pathname.replace(/\\/g,"/");
    const current = pathname.split("/").pop() || "index.html";
    const inPages = pathname.includes("/pages/");
    const english = isEnglish();
    const existing = nav.dataset.nxReady === "true";
    if (existing) {
      // mobile-nav has already moved overflow links into its More menu. Update
      // those anchors in place; replacing nav children here breaks mobile UX.
      nav.querySelectorAll("a").forEach(a => {
        const item = links.find(([path]) => path.split("/").pop() === a.pathname.split("/").pop());
        if (!item) return;
        const [path,tr,en] = item;
        a.href = pathFor(path,inPages);
        a.dataset.tr = tr;
        a.dataset.en = en;
        a.textContent = english ? en : tr;
        a.classList.toggle("active",path.split("/").pop() === current);
      });
    } else {
      nav.replaceChildren();
      for (const [path,tr,en] of links) {
        const a = document.createElement("a");
        a.href = pathFor(path,inPages);
        a.dataset.tr = tr;
        a.dataset.en = en;
        a.textContent = english ? en : tr;
        if (path.split("/").pop() === current) a.className = "active";
        nav.appendChild(a);
      }
    }
    nav.setAttribute("aria-label", english ? "Main navigation" : "Ana gezinme");
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", render, {once:true});
  else render();
  window.addEventListener("nexora:languagechange", render);
})();