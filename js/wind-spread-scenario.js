/* Wind-aware fire-spread scenario overlay.
 * Uses live Open-Meteo wind observations, but the spread-rate adjustment is a
 * transparent illustrative heuristic, not a validated fire-behaviour model.
 */
(() => {
  "use strict";
  const $ = id => document.getElementById(id);
  const tr = () => !((document.documentElement.dataset.language || document.documentElement.lang || "tr").toLowerCase().startsWith("en"));
  const text = (turkish, english) => tr() ? turkish : english;
  const num = (value, digits=2) => Number.isFinite(value) ? value.toFixed(digits) : "—";
  const destination = (lat, lon, bearing, km) => {
    const R=6371, d=km/R, br=bearing*Math.PI/180, p1=lat*Math.PI/180, l1=lon*Math.PI/180;
    const p2=Math.asin(Math.sin(p1)*Math.cos(d)+Math.cos(p1)*Math.sin(d)*Math.cos(br));
    const l2=l1+Math.atan2(Math.sin(br)*Math.sin(d)*Math.cos(p1),Math.cos(d)-Math.sin(p1)*Math.sin(p2));
    return {lat:p2*180/Math.PI,lon:((l2*180/Math.PI+540)%360)-180};
  };
  const compass = degrees => {
    const labels = text("K, KD, D, GD, G, GB, B, KB","N, NE, E, SE, S, SW, W, NW").split(", ");
    return labels[Math.round(((degrees%360)+360)%360/45)%8];
  };
  function ensurePanel() {
    if ($("atmo-wind-projection")) return $("atmo-wind-projection");
    const results=$("atmo-spread-results");
    if(!results) return null;
    const panel=document.createElement("section");
    panel.id="atmo-wind-projection";
    panel.className="atmo-panel atmo-wind-projection";
    panel.style.marginTop="14px";
    panel.innerHTML='<div class="atmo-panel-head"><div><div class="atmo-eyebrow">WIND VECTOR / RÜZGÂR VEKTÖRÜ</div><h3 data-tr="Rüzgâr yönünde yayılım senaryosu" data-en="Downwind spread scenario">Rüzgâr yönünde yayılım senaryosu</h3></div><span class="atmo-badge atmo-badge-warn" data-tr="ARAŞTIRMA SENARYOSU" data-en="RESEARCH SCENARIO">ARAŞTIRMA SENARYOSU</span></div><p id="atmo-wind-projection-summary"></p><div id="atmo-wind-projection-cards" class="atmo-scenario-grid"></div><p id="atmo-wind-projection-caveat" class="atmo-footnote"></p>';
    results.insertAdjacentElement("afterend",panel);
    return panel;
  }
  function update() {
    const panel=ensurePanel(); if(!panel) return;
    const speedEl=$("atmo-wind"), directionEl=$("atmo-direction");
    const speedMatch=(speedEl?.textContent||"").match(/-?\d+(?:[.,]\d+)?/);
    const directionMatch=(directionEl?.textContent||"").match(/-?\d+(?:[.,]\d+)?/);
    const speed=speedMatch?Number(speedMatch[0].replace(",",".")):NaN;
    const from=directionMatch?Number(directionMatch[0].replace(",",".")):NaN;
    const lat=Number($("atmo-origin-lat")?.value),lon=Number($("atmo-origin-lon")?.value);
    const baseRate=Number($("atmo-spread-rate")?.value);
    const summary=$("atmo-wind-projection-summary"),cards=$("atmo-wind-projection-cards"),caveat=$("atmo-wind-projection-caveat");
    if(!Number.isFinite(speed)||!Number.isFinite(from)||!Number.isFinite(lat)||!Number.isFinite(lon)||!Number.isFinite(baseRate)||!($("atmo-score")?.textContent||"").trim()) {
      summary.textContent=text("Rüzgâr yönlü senaryo için güncel rüzgâr gözlemi, geçerli koordinatlar ve temel senaryo hızı gerekli. Veri yoksa tahmin gösterilmez.","A current wind observation, valid coordinates and a base scenario rate are required. No estimate is shown when data is missing.");
      cards.replaceChildren();caveat.textContent="";return;
    }
    const bearing=((from+180)%360+360)%360;
    // Transparent, capped heuristic: base rate is increased by up to 100% at 40 km/h.
    const factor=1+Math.min(Math.max(speed,0),40)/40;
    summary.textContent=text("Open-Meteo rüzgârı ", "Open-Meteo wind: ")+num(speed,1)+" km/sa · "+text("rüzgârın geldiği yön ","wind-from direction ")+num(from,0)+"° ("+compass(from)+") · "+text("senaryo ilerleme yönü ","scenario downwind bearing ")+num(bearing,0)+"° ("+compass(bearing)+"). "+text("Bu gösterim rüzgâr hızına göre varsayımsal çarpan ","Illustrative wind multiplier ")+num(factor,2)+"×.";
    cards.replaceChildren();
    [30,60,120].forEach(minutes=>{
      const hours=minutes/60, distance=baseRate*hours*factor, point=destination(lat,lon,bearing,distance);
      const article=document.createElement("article");article.className="atmo-scenario-card";
      const title=document.createElement("span");title.textContent=minutes+" "+text("dakika","minutes");
      const strong=document.createElement("strong");strong.textContent=num(distance,2)+" km";
      const direction=document.createElement("small");direction.textContent=text("Rüzgâr yönünde yaklaşık mesafe","Approximate downwind distance")+" · "+num(bearing,0)+"° "+compass(bearing);
      const coord=document.createElement("small");coord.textContent=text("Varsayımsal uç nokta: ","Illustrative endpoint: ")+num(point.lat,5)+", "+num(point.lon,5);
      article.append(title,strong,direction,coord);cards.appendChild(article);
    });
    caveat.textContent=text("ÖNEMLİ: Bu bir gerçek yangın yayılım tahmini veya güvenlik yönlendirmesi değildir. Rüzgâr yönü meteorolojik “geldiği yön” tanımından 180° çevrilir; mesafe, kullanıcı hızına uygulanan açık ve sınırlı bir sezgisel çarpanla hesaplanır. Eğim, yakıt nemi, arazi, cephe davranışı ve saha doğrulaması yoktur. Acil durumda yetkili kurum talimatlarını izle.","IMPORTANT: This is not an operational fire-spread forecast or safety guidance. Meteorological wind-from direction is reversed by 180°; distance uses a transparent, capped heuristic multiplier on the user-entered rate. Slope, fuel moisture, terrain, fire-front dynamics and field validation are absent. Follow official instructions in an emergency.");
  }
  function bind() {
    $("atmo-run-spread")?.addEventListener("click",()=>setTimeout(update,0));
    $("atmo-refresh")?.addEventListener("click",()=>setTimeout(update,500));
    $("atmo-region")?.addEventListener("change",()=>setTimeout(update,500));
    ["atmo-origin-lat","atmo-origin-lon","atmo-spread-rate"].forEach(id=>$(id)?.addEventListener("change",update));
    window.addEventListener("nexora:languagechange",update);
    const originalText=$("atmo-wind-projection-summary");
    if(originalText) update();
  }
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",bind,{once:true}); else bind();
})();
