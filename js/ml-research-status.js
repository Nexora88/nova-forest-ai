/* Show verified model provenance and measured holdout metrics on the About page. */
(() => {
  async function init() {
    const main = document.querySelector("main");
    if (!main || document.querySelector("[data-ml-research-status]")) return;
    const panel = document.createElement("section");
    panel.className = "hero ml-research-panel";
    panel.dataset.mlResearchStatus = "";
    panel.innerHTML = '<div class="eyebrow">MACHINE LEARNING / RESEARCH</div><h2>Documented fire-weather model</h2><p data-ml-state role="status">Checking the backend model artifact and evaluation record…</p><div data-ml-details></div>';
    const hero = main.querySelector(".hero");
    if (hero) hero.insertAdjacentElement("afterend", panel);
    else main.prepend(panel);
    const state = panel.querySelector("[data-ml-state]");
    const details = panel.querySelector("[data-ml-details]");
    const apiBase = (window.NOVA_API_BASE || (location.hostname.endsWith("github.io") ? "https://nova-forest-ai.vercel.app/api" : "/api")).replace(/\/$/,"");
    try {
      const response = await fetch(apiBase + "/ml/research-status", {headers:{Accept:"application/json"}});
      if (!response.ok) throw new Error("HTTP " + response.status);
      const data = await response.json();
      if (data.status !== "ready") {
        state.textContent = "Research model status: " + (data.status || "unavailable") + ". No prediction is presented until a valid model artifact is available.";
        return;
      }
      const metadata = data.metadata || {};
      const dataset = metadata.dataset || {};
      const metrics = metadata.evaluation?.metrics || {};
      state.textContent = "RESEARCH PROTOTYPE · " + (dataset.rows || "—") + " labelled daily observations · " + (dataset.period || "period not reported");
      const metricNames = [["Accuracy","accuracy"],["Balanced accuracy","balanced_accuracy"],["Precision","precision"],["Recall","recall"],["F1","f1"],["ROC AUC","roc_auc"]];
      const metricCards = metricNames.filter(([,key]) => Number.isFinite(metrics[key])).map(([label,key]) => '<div class="ml-metric"><span>' + label + '</span><strong>' + (metrics[key]*100).toFixed(1) + '%</strong></div>').join("");
      details.innerHTML = '<div class="ml-metric-grid">' + metricCards + '</div><p class="ml-research-note">Source: <a href="' + (dataset.url || "https://archive.ics.uci.edu/dataset/547/algerian+forest+fires+dataset") + '" target="_blank" rel="noopener noreferrer">UCI Algerian Forest Fires</a> · DOI ' + (dataset.doi || "10.24432/C5KW4N") + ' · ' + (metadata.evaluation?.method || "Holdout evaluation") + '.</p><p class="ml-research-note">This model uses historical Algerian weather observations from 2012. It is not validated for Thrace/Türkiye, is not a seven-day forecast, and must not be used as an official warning.</p>';
    } catch (error) {
      state.textContent = "Live model status could not be verified from this page. The UI will not invent training metrics.";
      details.textContent = "Backend request failed: " + (error.message || "network error");
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();