/* Illustrative flow simulation only. Never presents a real route or safety recommendation. */
(() => {
  const host = document.querySelector(".evacuation-panel");
  if (!host || document.getElementById("evac-sim")) return;
  const isTr = () => !/^en(?:-|$)/i.test(
    document.documentElement.dataset.language || document.documentElement.lang || "tr"
  );
  const panel = document.createElement("section");
  panel.id = "evac-sim";
  panel.className = "evac-sim";
  panel.innerHTML = `
    <div class="evac-sim-heading">
      <div><span class="evac-sim-kicker" data-tr="ETKİLEŞİMLİ SENARYO" data-en="INTERACTIVE SCENARIO">ETKİLEŞİMLİ SENARYO</span>
      <h3 data-tr="Kaçış koridoru · akış simülasyonu" data-en="Escape corridor · flow simulation">Kaçış koridoru · akış simülasyonu</h3></div>
      <span class="evac-sim-chip" data-tr="TEMSİLİ MODEL" data-en="ILLUSTRATIVE MODEL">TEMSİLİ MODEL</span>
    </div>
    <p data-tr="Kişi sayısı, temsili geçiş genişliği ve engel düzeyinin basit akış yükü göstergesine etkisini deneyebilirsin. Bu modelde gerçek yol ağı, yangın cephesi, duman, rüzgârla yayılım veya doğrulanmış toplanma alanı verisi yoktur." data-en="Explore how the number of people, illustrative passage width, and obstruction level affect a simple flow-load indicator. This model does not include real road networks, fire fronts, smoke, wind-driven spread, or verified assembly-point data.">Kişi sayısı, temsili geçiş genişliği ve engel düzeyinin basit akış yükü göstergesine etkisini deneyebilirsin. Bu modelde gerçek yol ağı, yangın cephesi, duman, rüzgârla yayılım veya doğrulanmış toplanma alanı verisi yoktur.</p>
    <div class="evac-sim-grid">
      <label><span data-tr="Senaryodaki kişi sayısı" data-en="People in scenario">Senaryodaki kişi sayısı</span><input type="number" min="10" max="1000" step="10" value="120" data-people inputmode="numeric"></label>
      <label><span data-tr="Geçiş genişliği (temsili)" data-en="Passage width (illustrative)">Geçiş genişliği (temsili)</span><select data-width><option value="1" data-tr="Dar" data-en="Narrow">Dar</option><option value="2" selected data-tr="Orta" data-en="Medium">Orta</option><option value="4" data-tr="Geniş" data-en="Wide">Geniş</option></select></label>
      <label><span data-tr="Engel senaryosu" data-en="Obstruction scenario">Engel senaryosu</span><select data-block><option value="0" data-tr="Engel yok" data-en="No obstruction">Engel yok</option><option value="0.25" data-tr="Kısmi engel" data-en="Partial obstruction">Kısmi engel</option><option value="0.6" data-tr="Belirgin engel" data-en="Major obstruction">Belirgin engel</option></select></label>
    </div>
    <div class="evac-sim-track" role="img" aria-label="Temsili koridor akışı">
      <div class="evac-sim-node" data-tr="BAŞLANGIÇ" data-en="START">BAŞLANGIÇ</div>
      <div class="evac-sim-lane"><span class="evac-sim-particles" aria-hidden="true"></span></div>
      <div class="evac-sim-node" data-tr="HEDEF (TEMSİLİ)" data-en="DESTINATION (ILLUSTRATIVE)">HEDEF (TEMSİLİ)</div>
    </div>
    <div class="evac-sim-meter-wrap">
      <div class="evac-sim-meter-label"><span data-tr="Göreli akış indeksi · temsili" data-en="Relative flow index · illustrative">Göreli akış indeksi · temsili</span><strong data-sim-index>—</strong></div>
      <div class="evac-sim-meter" role="progressbar" aria-label="Temsili akış indeksi" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0"><span data-meter></span></div>
      <small data-tr="0–100 görsel ölçeğidir; tahliye süresi, kapasite veya güvenlik olasılığı değildir." data-en="A visual scale from 0–100; it is not an evacuation time, capacity, or probability of safety.">0–100 görsel ölçeğidir; tahliye süresi, kapasite veya güvenlik olasılığı değildir.</small>
    </div>
    <div class="evac-sim-result" role="status" aria-live="polite"><strong data-sim-status data-tr="Örnek senaryo hazır." data-en="Example scenario ready.">Örnek senaryo hazır.</strong><p data-sim-detail data-tr="Girdileri değiştirip senaryoyu hesapla." data-en="Change the inputs and calculate the scenario.">Girdileri değiştirip senaryoyu hesapla.</p></div>
    <p class="evac-sim-note" data-tr="GÜVENLİK: Bu çıktı gerçek tahliye rotası, tahliye süresi veya güvenli alan doğrulaması değildir. Gerçek acil durumda 112'yi ara ve yetkili kurumların talimatlarına uy." data-en="SAFETY: This output does not validate a real evacuation route, evacuation time, or safe area. In a real emergency, call 112 and follow official instructions.">GÜVENLİK: Bu çıktı gerçek tahliye rotası, tahliye süresi veya güvenli alan doğrulaması değildir. Gerçek acil durumda 112'yi ara ve yetkili kurumların talimatlarına uy.</p>
    <button type="button" data-run data-tr="Senaryoyu hesapla" data-en="Calculate scenario">Senaryoyu hesapla</button>`;
  host.appendChild(panel);

  const people = panel.querySelector("[data-people]");
  const width = panel.querySelector("[data-width]");
  const block = panel.querySelector("[data-block]");
  const status = panel.querySelector("[data-sim-status]");
  const detail = panel.querySelector("[data-sim-detail]");
  const indexLabel = panel.querySelector("[data-sim-index]");
  const meter = panel.querySelector("[data-meter]");
  const meterTrack = panel.querySelector(".evac-sim-meter");
  let lastLevel = null;
  let lastInputs = null;
  const messages = {
    low: { tr: "Bu girdilerde göreli akış göstergesi düşük.", en: "The relative flow indicator is low for these inputs." },
    medium: { tr: "Bu girdilerde göreli akış göstergesi orta.", en: "The relative flow indicator is moderate for these inputs." },
    high: { tr: "Bu girdilerde göreli akış göstergesi yüksek.", en: "The relative flow indicator is high for these inputs." }
  };
  function applyLanguage() {
    const tr = isTr();
    const track = panel.querySelector(".evac-sim-track");
    if (track) track.setAttribute("aria-label", tr ? "Temsili koridor akışı" : "Illustrative corridor flow");
    panel.querySelectorAll("[data-tr][data-en]").forEach(el => {
      if (el.children.length === 0 && el !== status && el !== detail) {
        el.textContent = tr ? el.dataset.tr : el.dataset.en;
      }
    });
    if (lastInputs && lastLevel) {
      status.textContent = messages[lastLevel][tr ? "tr" : "en"];
      detail.textContent = tr
        ? `Girdiler: ${lastInputs.people} kişi · geçiş ${width.options[width.selectedIndex].textContent} · engel ${block.options[block.selectedIndex].textContent}. Sonuç yalnızca girdi karşılaştırmasıdır; gerçek saha veya yol verisi kullanılmadı.`
        : `Inputs: ${lastInputs.people} people · passage ${width.options[width.selectedIndex].textContent} · obstruction ${block.options[block.selectedIndex].textContent}. This only compares inputs; no real field or road data was used.`;
      indexLabel.textContent = String(lastInputs.index) + " / 100";
      meter.style.width = lastInputs.index + "%";
      meterTrack.setAttribute("aria-valuenow", String(lastInputs.index));
      meterTrack.setAttribute("aria-label", tr ? "Temsili akış indeksi" : "Illustrative flow index");
    }
  }
  function run() {
    const n = Math.round(Math.max(10, Math.min(1000, Number(people.value) || 120)) / 10) * 10;
    const w = Number(width.value) || 2;
    const b = Number(block.value) || 0;
    people.value = n;
    const load = n / (w * (1 - b));
    const index = Math.max(0, Math.min(100, Math.round(load / 3)));
    lastLevel = load > 220 ? "high" : load > 100 ? "medium" : "low";
    lastInputs = { people: n, index };
    applyLanguage();
    panel.classList.remove("is-running");
    void panel.offsetWidth;
    panel.classList.add("is-running");
    window.setTimeout(() => panel.classList.remove("is-running"), 5000);
  }
  panel.querySelector("[data-run]").addEventListener("click", run);
  window.addEventListener("nexora:languagechange", applyLanguage);
  applyLanguage();
  run();
})();
