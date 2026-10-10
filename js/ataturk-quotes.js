/* Accessible, user-controlled Atatürk quote rotation. */
(function () {
  const quotes = [
    { quote: "“Hayatta en hakiki mürşit ilimdir.”", context: "Bilimi, kanıtı ve sürekli öğrenmeyi rehber edin." },
    { quote: "“Yurtta sulh, cihanda sulh.”", context: "Güvenli gelecek; barış, iş birliği ve ortak sorumlulukla kurulur." },
    { quote: "“Köylü milletin efendisidir.”", context: "Üreticiyi, kırsal emeği ve doğal kaynakları korumak toplumsal refahın parçasıdır." }
  ];
  function init() {
    const quote = document.querySelector("[data-ataturk-quote]");
    const context = document.querySelector("[data-ataturk-context]");
    const count = document.querySelector("[data-quote-count]");
    if (!quote || !context || !count) return;
    let index = 0;
    function show(next) {
      index = (next + quotes.length) % quotes.length;
      quote.textContent = quotes[index].quote;
      context.textContent = quotes[index].context;
      count.textContent = (index + 1) + " / " + quotes.length;
    }
    document.querySelector("[data-quote-prev]")?.addEventListener("click", () => show(index - 1));
    document.querySelector("[data-quote-next]")?.addEventListener("click", () => show(index + 1));
  }
  document.addEventListener("DOMContentLoaded", init);
})();