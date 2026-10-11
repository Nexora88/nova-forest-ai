/* Illustrative flow simulation only. Never presents a real route or safety recommendation. */
(() => {
  const host = document.querySelector(".evacuation-panel");
  if (!host || document.getElementById("evac-sim")) return;
  const isTr = () => !/^en(?:-|$)/i.test(document.documentElement.dataset.language || document.documentElement.lang || "tr");
  const panel = document.createElement("section");
  panel.id = "evac-sim";
  panel.className = "evac-sim";
  panel.innerHTML = `
    <h3 data-tr="Senaryo akış simülasyonu" data-en="Scenario flow simulation">Senaryo akış simülasyonu</h3>
    <p data-tr="Bu etkileşimli görsel senaryo yalnızca girdi değerlerini karşılaştırır. Harita ağı, yangın cephesi, yol kapanması veya gerçek kişi hareketi kullanmaz; gerçek kaçış rotası ya da güvenli toplanma noktası hesaplamaz." data-en="This interactive visual scenario only compares input values. It does not use road networks, fire fronts, road closures, or real human movement; it does not calculate real escape routes or safe assembly points.">Bu etkileşimli görsel senaryo yalnızca girdi değerlerini karşılaştırır. Harita ağı, yangın cephesi, yol kapanması veya gerçek kişi hareketi kullanmaz; gerçek kaçış rotası ya da güvenli toplanma noktası hesaplamaz.</p>
    <div class="evac-sim-grid">
      <label><span data-tr="Senaryodaki kişi sayısı" data-en="People in scenario">Senaryodaki kişi sayısı</span><input type="number" min="10" max="1000" step="10" value="120" data-people></label>
      <label><span data-tr="Geçiş genişliği (temsili)" data-en="Passage width (illustrative)">Geçiş genişliği (temsili)</span><select data-width><option value="1" data-tr="Dar" data-en="Narrow">Dar</option><option value="2" selected data-tr="Orta" data-en="Medium">Orta</option><option value="4" data-tr="Geniş" data-en="Wide">Geniş</option></select></label>
      <label><span data-tr="Engel senaryosu" data-en="Obstruction scenario">Engel senaryosu</span><select data-block><option value="0" data-tr="Engel yok" data-en="No obstruction">Engel yok</option><option value="0.25" data-tr="Kısmi engel" data-en="Partial obstruction">Kısmi engel</option><option value="0.6" data-tr="Belirgin engel" data-en="Major obstruction">Belirgin engel</option></select></label>
    </div>
    <div class="evac-sim-track" role="img" aria-label="Illustrative corridor flow">
      <div class="evac-sim-node" data-tr="BAŞLANGIÇ" data-en="START">BAŞLANGIÇ</div><div class="evac-sim-lane"><span class="evac-sim-particles" aria-hidden="true"></span></div><div class="evac-sim-node" data-tr="HEDEF (TEMSİLİ)" data-en="DESTINATION (ILLUSTRATIVE)">HEDEF (TEMSİLİ)</div>
    </div>
    <div class="evac-sim-result" role="status" aria-live="polite"><strong data-sim-status data-tr="Senaryoyu başlatmak için hesapla düğmesine bas." data-en="Press calculate to run the scenario.">Senaryoyu başlatmak için hesapla düğmesine bas.</strong><p data-sim-detail data-tr="Henüz senaryo çalıştırılmadı." data-en="No scenario has been run yet.">Henüz senaryo çalıştırılmadı.</p></div>
    <p class="evac-sim-note" data-tr="GÜVENLİK: Bu çıktı tahliye süresi, rota uygunluğu veya güvenli alan doğrulaması değildir. Gerçek acil durumda 112'yi ara ve yetkili kurumların talimatlarına uy." data-en="SAFETY: This output does not validate evacuation time, route suitability, or safe areas. In a real emergency, call 112 and follow official instructions.">GÜVENLİK: Bu çıktı tahliye süresi, rota uygunluğu veya güvenli alan doğrulaması değildir. Gerçek acil durumda 112'yi ara ve yetkili kurumların talimatlarına uy.</p>
    <button type="button" data-run data-tr="Senaryoyu hesapla" data-en="Calculate scenario">Senaryoyu hesapla</button>`;
  host.appendChild(panel);
  const people = panel.querySelector("[data-people]");
  const width = panel.querySelector("[data-width]");
  const block = panel.querySelector("[data-block]");
  const status = panel.querySelector("[data-sim-status]");
  const detail = panel.querySelector("[data-sim-detail]");
  let lastLevel = null;
  let lastInputs = null;
  const messages = {
    low: {tr:"Bu girdilerde temsili akış yükü düşük.",en:"Illustrative flow load is low for these inputs."},
    medium: {tr:"Bu girdilerde temsili akış yükü orta.",en:"Illustrative flow load is moderate for these inputs."},
    high: {tr:"Bu girdilerde temsili akış yükü yüksek.",en:"Illustrative flow load is high for these inputs."}
  };
  function applyLanguage() {
    const tr = isTr();
    const track = panel.querySelector(".evac-sim-track");
    if (track) track.setAttribute("aria-label", tr ? "Temsili koridor akışı" : "Illustrative corridor flow");
    panel.querySelectorAll("[data-tr][data-en]").forEach(el => {
      if (el === status && lastLevel) return;
      if (el === detail && lastInputs) return;
      if (el.children.length === 0) el.textContent = tr ? el.dataset.tr : el.dataset.en;
    });
    if (lastLevel && lastInputs) {
      status.textContent = messages[lastLevel][tr ? "tr" : "en"];
      detail.textContent = tr
        ? `Girdi: ${lastInputs.people} kişi · temsili genişlik ${width.options[width.selectedIndex].textContent} · engel ${block.options[block.selectedIndex].textContent}. Sonuç yalnızca basit bir karşılaştırma göstergesidir; gerçek rota verisi veya saha ölçümü kullanılmadı.`
        : `Inputs: ${lastInputs.people} people · illustrative width ${width.options[width.selectedIndex].textContent} · obstruction ${block.options[block.selectedIndex].textContent}. This is only a simple comparison indicator; no real route data or field measurements were used.`;
    }
  }
  function run() {
    const n = Math.max(10, Math.min(1000, Number(people.value) || 120));
    const w = Number(width.value) || 2;
    const b = Number(block.value) || 0;
    people.value = n;
    const load = n / (w * (1 - b));
    lastLevel = load > 220 ? "high" : load > 100 ? "medium" : "low";
    lastInputs = {
      people:n,
      widthValue:width.value,
      blockValue:block.value
    };
    applyLanguage();
    panel.classList.remove("is-running");
    void panel.offsetWidth;
    panel.classList.add("is-running");
    window.setTimeout(() => panel.classList.remove("is-running"), 5000);
  }
  panel.querySelector("[data-run]").addEventListener("click", run);
  window.addEventListener("nexora:languagechange", applyLanguage);
  applyLanguage();
})();