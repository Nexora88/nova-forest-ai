/* Accessible Atatürk quote carousel and historical photo gallery for every product page. */
(function () {
  const quotes = [
    { quote: "“Hayatta en hakiki mürşit ilimdir.”", context: "Bilimi, kanıtı ve sürekli öğrenmeyi rehber edin." },
    { quote: "“Yurtta sulh, cihanda sulh.”", context: "Güvenli gelecek; barış, iş birliği ve ortak sorumlulukla kurulur." },
    { quote: "“Köylü milletin efendisidir.”", context: "Üreticiyi, kırsal emeği ve doğal kaynakları korumak toplumsal refahın parçasıdır." },
    { quote: "“Bütün ümidim gençliktedir.”", context: "Yeni fikirler, öğrenme ve sorumluluk geleceği şekillendirir." },
    { quote: "“Milletin efendisi hakiki müstahsil olan köylüdür.”", context: "Üretim ve tarım, ülkenin ekonomik bağımsızlığının temel unsurlarındandır." }
  ];
  const photos = [
    { src: "https://commons.wikimedia.org/wiki/Special:FilePath/Orman%20%C3%87iftli%C4%9Fi%2C%20Ankara%2C%2014%20Temmuz%201929%20%287%29.png", alt: "Atatürk Orman Çiftliği, 1929 tarihli fotoğraf", caption: "Orman Çiftliği · 1929", source: "https://commons.wikimedia.org/wiki/File:Orman_%C3%87iftli%C4%9Fi,_Ankara,_14_Temmuz_1929_(7).png" },
    { src: "https://commons.wikimedia.org/wiki/Special:FilePath/Atat%C3%BCrk%20ve%20%C3%A7ift%C3%A7i.jpg", alt: "Atatürk bir çiftçiyle birlikte", caption: "Atatürk ve çiftçi", source: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_ve_%C3%A7ift%C3%A7i.jpg" },
    { src: "https://commons.wikimedia.org/wiki/Special:FilePath/Atat%C3%BCrk%20in%20a%20rowboat%2C%201934.jpg", alt: "Atatürk Florya'da sandalda, 1934", caption: "Florya · 1934", source: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_in_a_rowboat,_1934.jpg" }
  ];
  function makePanel() {
    const section = document.createElement("section");
    section.className = "ataturk-quote-panel ataturk-shared-panel";
    section.setAttribute("aria-labelledby", "ataturk-shared-heading");
    section.innerHTML = '<div class="ataturk-quote-mark" aria-hidden="true">“</div><div class="ataturk-quote-content"><div class="eyebrow">CUMHURİYET VİZYONU / BİLİM • BARIŞ • ÜRETİM</div><h2 id="ataturk-shared-heading">Geleceğe yön veren düşünceler</h2><blockquote data-ataturk-quote aria-live="polite"></blockquote><p data-ataturk-context></p><cite>— Mustafa Kemal Atatürk</cite><div class="ataturk-quote-controls"><button type="button" data-quote-prev aria-label="Önceki söz">← Önceki</button><span data-quote-count></span><button type="button" data-quote-next>Sonraki söz →</button></div></div>';
    return section;
  }
  function makeGallery() {
    const section = document.createElement("section");
    section.className = "ataturk-photo-gallery";
    section.setAttribute("aria-labelledby", "ataturk-gallery-heading");
    const heading = document.createElement("div");
    heading.className = "section-heading";
    heading.innerHTML = '<div><div class="eyebrow">TARİHİ ARŞİV / ÜRETİM • TOPLUM • YAŞAM</div><h2 id="ataturk-gallery-heading">Atatürk’ten tarihî kareler</h2><p>Fotoğraf kaynağını açarak tarihî bağlamını ve arşiv bilgisini inceleyebilirsin.</p></div>';
    const grid = document.createElement("div");
    grid.className = "ataturk-photo-grid";
    photos.forEach(photo => {
      const card = document.createElement("article");
      card.className = "ataturk-photo-card";
      const link = document.createElement("a");
      link.href = photo.source; link.target = "_blank"; link.rel = "noopener noreferrer";
      link.setAttribute("aria-label", photo.caption + " — kaynak fotoğrafı aç");
      const img = document.createElement("img");
      img.src = photo.src; img.alt = photo.alt; img.loading = "lazy"; img.referrerPolicy = "no-referrer";
      img.onerror = () => { img.style.display = "none"; card.classList.add("photo-unavailable"); };
      link.appendChild(img);
      const caption = document.createElement("div");
      caption.className = "ataturk-photo-caption";
      const title = document.createElement("strong"); title.textContent = photo.caption;
      const source = document.createElement("span"); source.textContent = "Arşiv kaynağını aç ↗";
      caption.append(title, source);
      card.append(link, caption);
      grid.appendChild(card);
    });
    section.append(heading, grid);
    const note = document.createElement("p");
    note.className = "ataturk-photo-credit";
    note.textContent = "Görseller Wikimedia Commons arşiv bağlantılarından yüklenir. 14 Temmuz 1929 tarihli traktör kullanma fotoğrafı Türk Tarih Kurumu arşiv kataloğunda ayrıca kayıtlıdır.";
    const archive = document.createElement("a");
    archive.href = "https://arsiv.ttk.gov.tr/details?id=11023&materialType=F&query=Ankara.";
    archive.target = "_blank"; archive.rel = "noopener noreferrer"; archive.textContent = "Türk Tarih Kurumu arşiv kaydını görüntüle";
    note.append(" ", archive);
    const tractorSource = document.createElement("a");
    tractorSource.href = "https://bilimcocuk.tubitak.gov.tr/wp-content/uploads/sites/157/2025/09/4b1bf8c7-1eb7-4c09-a022-613d6ab43ad2.pdf";
    tractorSource.target = "_blank"; tractorSource.rel = "noopener noreferrer"; tractorSource.textContent = "Atatürk’ün traktör sürerken fotoğrafını içeren TÜBİTAK tarihî fotoğraf derlemesi";
    note.append(" · ", tractorSource);
    section.appendChild(note);
    return section;
  }
  function init() {
    const main = document.querySelector("main");
    if (!main) return;
    const isVisionPage = location.pathname.endsWith("/pages/vision.html");
    let panel = document.querySelector("[data-ataturk-quote]")?.closest(".ataturk-quote-panel");
    if (!panel && isVisionPage) {
      panel = makePanel();
      const before = main.querySelector(".notice-panel, footer");
      if (before) before.before(panel); else main.appendChild(panel);
    }
    if (!panel) return;
    if (!panel.querySelector("[data-quote-count]")) {
      const controls = document.createElement("div");
      controls.className = "ataturk-quote-controls";
      controls.innerHTML = '<button type="button" data-quote-prev aria-label="Önceki söz">← Önceki</button><span data-quote-count></span><button type="button" data-quote-next>Sonraki söz →</button>';
      panel.querySelector(".ataturk-quote-content")?.appendChild(controls);
    }
    const quote = panel.querySelector("[data-ataturk-quote]");
    const context = panel.querySelector("[data-ataturk-context]");
    const count = panel.querySelector("[data-quote-count]");
    let index = 0;
    function show(next) {
      index = (next + quotes.length) % quotes.length;
      if (quote) quote.textContent = quotes[index].quote;
      if (context) context.textContent = quotes[index].context;
      if (count) count.textContent = (index + 1) + " / " + quotes.length;
    }
    panel.querySelector("[data-quote-prev]")?.addEventListener("click", () => show(index - 1));
    panel.querySelector("[data-quote-next]")?.addEventListener("click", () => show(index + 1));
    show(0);
    if (isVisionPage && !document.querySelector(".ataturk-photo-gallery")) {
      const gallery = makeGallery();
      panel.after(gallery);
    }
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();