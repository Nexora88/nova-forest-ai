/* Role-aware dashboard shortcuts. Content reflects the saved profile; no risk values are invented. */
(() => {
  const labels = {
    beekeeper: {
      title: "🐝 Nova-Bee · Arıcı paneli",
      desc: "Arılık alanlarını, rüzgâr/yağış koşullarını ve bölgesel arıcılık duyurularını birlikte takip et.",
      links: [["Arılık ve alanlarım", "pages/areas.html"], ["Hava ve polen", "pages/weather.html"], ["Arıcılık etkinlikleri", "pages/events.html"]]
    },
    farmer: {
      title: "🌾 Tarla · Üretici paneli",
      desc: "Tarlalarını kaydet, güncel meteoroloji sinyallerini incele ve kullanılabilir olduğunda uydu NDVI analizini başlat.",
      links: [["Tarlalarım", "pages/areas.html"], ["Uydu / NDVI", "pages/satellite.html"], ["Tarım duyuruları", "pages/events.html"]]
    },
    forest: {
      title: "🌲 Orman · Saha paneli",
      desc: "Risk haritasını ve uydu gözlemlerini takip et; resmî orman duyurularını bölgeye göre bul.",
      links: [["Risk haritası", "pages/map.html"], ["Uydu merkezi", "pages/satellite.html"], ["Orman duyuruları", "pages/events.html"]]
    },
    environment: {
      title: "🌿 Çevre · Gözlem paneli",
      desc: "Seçili çevre alanlarını, hava göstergelerini ve doğrulanabilir yerel etkinlik kaynaklarını tek yerden aç.",
      links: [["Çevre haritası", "pages/map.html"], ["Atmosfer", "pages/weather.html"], ["Etkinlikler", "pages/events.html"]]
    }
  };
  const english = {
    "🐝 Nova-Bee · Arıcı paneli":"🐝 Nova-Bee · Beekeeper dashboard",
    "Arılık alanlarını, rüzgâr/yağış koşullarını ve bölgesel arıcılık duyurularını birlikte takip et.":"Track apiary areas, wind/rain conditions, and regional beekeeping notices together.",
    "Arılık ve alanlarım ↗":"My apiary and areas ↗","Hava ve polen ↗":"Weather and pollen ↗","Arıcılık etkinlikleri ↗":"Beekeeping events ↗",
    "🌾 Tarla · Üretici paneli":"🌾 Field · Farmer dashboard",
    "Tarlalarını kaydet, güncel meteoroloji sinyallerini incele ve kullanılabilir olduğunda uydu NDVI analizini başlat.":"Save fields, review current weather signals, and start satellite NDVI analysis when available.",
    "Tarlalarım ↗":"My fields ↗","Uydu / NDVI ↗":"Satellite / NDVI ↗","Tarım duyuruları ↗":"Agriculture notices ↗",
    "🌲 Orman · Saha paneli":"🌲 Forestry · Field dashboard",
    "Risk haritasını ve uydu gözlemlerini takip et; resmî orman duyurularını bölgeye göre bul.":"Monitor the risk map and satellite observations; find official forestry notices by region.",
    "Risk haritası ↗":"Risk map ↗","Uydu merkezi ↗":"Satellite hub ↗","Orman duyuruları ↗":"Forestry notices ↗",
    "🌿 Çevre · Gözlem paneli":"🌿 Environment · Observer dashboard",
    "Seçili çevre alanlarını, hava göstergelerini ve doğrulanabilir yerel etkinlik kaynaklarını tek yerden aç.":"Access selected environmental areas, weather indicators, and verifiable local event sources in one place.",
    "Çevre haritası ↗":"Environmental map ↗","Atmosfer ↗":"Atmosphere ↗","Etkinlikler ↗":"Events ↗",
    "Sana özel saha paneli":"Your field workspace",
    "Profilindeki rolü değiştirerek sana uygun araçları öne çıkar.":"Change your profile role to surface the tools most relevant to you.",
    "Profili kişiselleştir ↗":"Personalise profile ↗",
    "Saha panelini görmek için giriş yap.":"Sign in to see your personalised field workspace."
  };
  const esc = value => String(value).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
  function render() {
    const host = document.querySelector(".nx-signal-strip");
    if (!host || document.getElementById("role-dashboard")) return;
    const profile = window.NovaAuth?.profile?.();
    const session = window.NovaAuth?.session?.();
    const role = session ? (profile?.role || "user") : "guest";
    const data = labels[role];
    const section = document.createElement("section");
    section.id = "role-dashboard";
    section.className = "role-dashboard";
    const style = document.createElement("style");
    style.textContent = ".role-dashboard{margin:16px 0;padding:18px;border:1px solid #244a30;border-radius:15px;background:linear-gradient(125deg,#07130a,#030604);color:#e5f3e8}.role-dashboard .eyebrow{color:#00d958;font:700 10px monospace;letter-spacing:1.3px}.role-dashboard h2{font-size:clamp(19px,3vw,25px);margin:8px 0}.role-dashboard p{font-size:12px;line-height:1.65;color:#a2b3a6;max-width:760px}.role-dashboard nav{display:flex;flex-wrap:wrap;gap:8px;padding:0;margin-top:12px}.role-dashboard nav a{border:1px solid #2b5938;border-radius:9px;padding:10px 12px;color:#bde9c9;text-decoration:none;font-size:11px}.role-dashboard nav a:hover{border-color:#00ff66}.role-dashboard .role-dashboard-empty{color:#b5c5b9}";
    if (!document.getElementById("role-dashboard-style")) {style.id="role-dashboard-style";document.head.appendChild(style)}
    let title,desc,links;
    if(data){title=data.title;desc=data.desc;links=data.links.map(([label,url])=>({label,url}))}
    else {title="Sana özel saha paneli";desc="Saha panelini görmek için giriş yap.";links=[{label:"Profili kişiselleştir ↗",url:"pages/auth.html"}]}
    section.innerHTML='<div class="eyebrow" data-tr="NOVA / KİŞİSEL SAHA PANELİ" data-en="NOVA / PERSONAL WORKSPACE">NOVA / PERSONAL WORKSPACE</div><h2>'+esc(title)+'</h2><p>'+esc(desc)+'</p><nav aria-label="Personal workspace shortcuts">'+links.map(x=>'<a href="'+esc(x.url)+'">'+esc(x.label)+' ↗</a>').join("")+'</nav>';
    host.insertAdjacentElement("afterend",section);
    const applyLanguage=()=>{const en=/^en/i.test(document.documentElement.dataset.language||document.documentElement.lang||"tr");if(en){section.querySelectorAll("h2,p,a").forEach(el=>{const original=el.dataset.originalText||(el.dataset.originalText=el.textContent);el.textContent=english[original]||original});}else{section.querySelectorAll("h2,p,a").forEach(el=>{if(el.dataset.originalText)el.textContent=el.dataset.originalText})}const nav=section.querySelector("nav");if(nav)nav.setAttribute("aria-label",en?"Personal workspace shortcuts":"Saha paneli kısayolları")};
    applyLanguage();
    window.addEventListener("nexora:languagechange",applyLanguage);
  }
  document.addEventListener("nova:auth-ready",()=>{document.getElementById("role-dashboard")?.remove();render()});
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",render,{once:true});else render();
})();
