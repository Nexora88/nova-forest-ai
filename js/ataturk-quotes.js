/* Bilingual Atatürk quote panel. Keep quotations distinct from original project copy. */
(function () {
  const quotes = [
    {
      quote: "“Hayatta en hakiki mürşit ilimdir.”",
      quoteEn: "“The truest guide in life is science.”",
      context: "Bilimi, kanıtı ve sürekli öğrenmeyi rehber edin.",
      contextEn: "Let science, evidence, and continuous learning guide the way."
    },
    {
      quote: "“Yurtta sulh, cihanda sulh.”",
      quoteEn: "“Peace at home, peace in the world.”",
      context: "Barış, iş birliği ve ortak sorumluluk güvenli bir gelecek için önemlidir.",
      contextEn: "Peace, cooperation, and shared responsibility matter for a safer future."
    },
    {
      quote: "“Köylü milletin efendisidir.”",
      quoteEn: "“The peasant is the master of the nation.”",
      context: "Üreticiyi, kırsal emeği ve doğal kaynakları korumak toplumsal refahın parçasıdır.",
      contextEn: "Protecting producers, rural work, and natural resources is part of public well-being."
    },
    {
      quote: "“Milletin efendisi hakiki müstahsil olan köylüdür.”",
      quoteEn: "“The true master of the nation is the peasant who produces.”",
      context: "Üretim ve tarım, ekonomik bağımsızlığın temel unsurları arasında görülür.",
      contextEn: "Production and agriculture are among the foundations of economic independence."
    }
  ];
  const photos = [
    {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Orman%20%C3%87iftli%C4%9Fi%2C%20Ankara%2C%2014%20Temmuz%201929%20%287%29.png",
      alt: "Atatürk Orman Çiftliği, 1929 tarihli fotoğraf",
      altEn: "Historical photograph at Atatürk Forest Farm, 1929",
      caption: "Orman Çiftliği · 1929",
      captionEn: "Forest Farm · 1929",
      source: "https://commons.wikimedia.org/wiki/File:Orman_%C3%87iftli%C4%9Fi,_Ankara,_14_Temmuz_1929_(7).png"
    },
    {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Atat%C3%BCrk%20ve%20%C3%A7ift%C3%A7i.jpg",
      alt: "Atatürk bir çiftçiyle birlikte",
      altEn: "Atatürk with a farmer",
      caption: "Atatürk ve çiftçi",
      captionEn: "Atatürk and a farmer",
      source: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_ve_%C3%A7ift%C3%A7i.jpg"
    },
    {
      src: "https://commons.wikimedia.org/wiki/Special:FilePath/Atat%C3%BCrk%20in%20a%20rowboat%2C%201934.jpg",
      alt: "Atatürk Florya'da sandalda, 1934",
      altEn: "Atatürk in a rowboat at Florya, 1934",
      caption: "Florya · 1934",
      captionEn: "Florya · 1934",
      source: "https://commons.wikimedia.org/wiki/File:Atat%C3%BCrk_in_a_rowboat,_1934.jpg"
    }
  ];

  const isTurkish = () => /^tr(?:-|$)/i.test(document.documentElement.dataset.language || document.documentElement.lang || "tr");
  const text = (tr, en) => isTurkish() ? tr : en;

  function makePanel() {
    const section = document.createElement("section");
    section.className = "ataturk-quote-panel ataturk-shared-panel";
    section.setAttribute("aria-labelledby", "ataturk-shared-heading");
    section.innerHTML = '<div class="ataturk-quote-mark" aria-hidden="true">“</div><div class="ataturk-quote-content"><div class="eyebrow" data-ataturk-eyebrow></div><h2 id="ataturk-shared-heading" data-ataturk-heading></h2><blockquote data-ataturk-quote aria-live="polite"></blockquote><p data-ataturk-context></p><cite>— Mustafa Kemal Atatürk</cite><p class="ataturk-quote-note" data-ataturk-note></p><div class="ataturk-quote-controls"><button type="button" data-quote-prev></button><span data-quote-count></span><button type="button" data-quote-next></button></div></div>';
    return section;
  }

  function makeGallery() {
    const section = document.createElement("section");
    section.className = "ataturk-photo-gallery";
    section.setAttribute("aria-labelledby", "ataturk-gallery-heading");
    const heading = document.createElement("div");
    heading.className = "section-heading";
    heading.innerHTML = '<div><div class="eyebrow" data-gallery-eyebrow></div><h2 id="ataturk-gallery-heading" data-gallery-heading></h2><p data-gallery-intro></p></div>';
    const grid = document.createElement("div");
    grid.className = "ataturk-photo-grid";
    photos.forEach(photo => {
      const card = document.createElement("article");
      card.className = "ataturk-photo-card";
      const link = document.createElement("a");
      link.href = photo.source;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      const img = document.createElement("img");
      img.src = photo.src;
      img.alt = photo.alt;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.onerror = () => { img.style.display = "none"; card.classList.add("photo-unavailable"); };
      link.appendChild(img);
      const caption = document.createElement("div");
      caption.className = "ataturk-photo-caption";
      const title = document.createElement("strong");
      title.textContent = photo.caption;
      const source = document.createElement("span");
      source.setAttribute("data-photo-source", "true");
      caption.append(title, source);
      card.append(link, caption);
      grid.appendChild(card);
      photo.card = card;
    });
    section.append(heading, grid);
    const note = document.createElement("p");
    note.className = "ataturk-photo-credit";
    note.setAttribute("data-gallery-note", "true");
    const archive = document.createElement("a");
    archive.href = "https://arsiv.ttk.gov.tr/details?id=11023&materialType=F&query=Ankara.";
    archive.target = "_blank";
    archive.rel = "noopener noreferrer";
    archive.setAttribute("data-gallery-archive", "true");
    note.append(" ", archive);
    const tractorSource = document.createElement("a");
    tractorSource.href = "https://bilimcocuk.tubitak.gov.tr/wp-content/uploads/sites/157/2025/09/4b1bf8c7-1eb7-4c09-a022-613d6ab43ad2.pdf";
    tractorSource.target = "_blank";
    tractorSource.rel = "noopener noreferrer";
    tractorSource.setAttribute("data-gallery-tubitak", "true");
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
      if (before) before.before(panel);
      else main.appendChild(panel);
    }
    if (!panel) return;

    if (!panel.querySelector("[data-quote-count]")) {
      const controls = document.createElement("div");
      controls.className = "ataturk-quote-controls";
      controls.innerHTML = '<button type="button" data-quote-prev></button><span data-quote-count></span><button type="button" data-quote-next></button>';
      panel.querySelector(".ataturk-quote-content")?.appendChild(controls);
    }
    const quote = panel.querySelector("[data-ataturk-quote]");
    const context = panel.querySelector("[data-ataturk-context]");
    const count = panel.querySelector("[data-quote-count]");
    let index = 0;

    function render() {
      const tr = isTurkish();
      const eyebrow = panel.querySelector("[data-ataturk-eyebrow]");
      const heading = panel.querySelector("[data-ataturk-heading]");
      const note = panel.querySelector("[data-ataturk-note]");
      if (eyebrow) eyebrow.textContent = text("CUMHURİYET VİZYONU / BİLİM • BARIŞ • ÜRETİM", "REPUBLIC VISION / SCIENCE • PEACE • PRODUCTION");
      if (heading) heading.textContent = text("Geleceğe yön veren düşünceler", "Ideas that shape the future");
      if (note) note.textContent = text("Not: Sözler burada yaygın kullanılan kısa biçimleriyle verilmiştir; tarihî bağlam için kaynak kayıtlarını inceleyin.", "Note: Quotations are shown in commonly used shortened forms; consult archival records for historical context.");
      const prev = panel.querySelector("[data-quote-prev]");
      const next = panel.querySelector("[data-quote-next]");
      if (prev) { prev.textContent = text("← Önceki", "← Previous"); prev.setAttribute("aria-label", text("Önceki söz", "Previous quote")); }
      if (next) { next.textContent = text("Sonraki söz →", "Next quote"); next.setAttribute("aria-label", text("Sonraki söz", "Next quote")); }
      if (quote) quote.textContent = tr ? quotes[index].quote : quotes[index].quoteEn;
      if (context) context.textContent = tr ? quotes[index].context : quotes[index].contextEn;
      if (count) count.textContent = (index + 1) + " / " + quotes.length;

      const gallery = document.querySelector(".ataturk-photo-gallery");
      if (gallery) {
        gallery.querySelector("[data-gallery-eyebrow]").textContent = text("TARİHÎ ARŞİV / ÜRETİM • TOPLUM • YAŞAM", "HISTORICAL ARCHIVE / PRODUCTION • SOCIETY • LIFE");
        gallery.querySelector("[data-gallery-heading]").textContent = text("Atatürk’ten tarihî kareler", "Historical photographs of Atatürk");
        gallery.querySelector("[data-gallery-intro]").textContent = text("Fotoğraf kaynağını açarak tarihî bağlamını ve arşiv bilgisini inceleyebilirsin.", "Open each photo's source to review its historical and archival context.");
        photos.forEach(photo => {
          const img = photo.card?.querySelector("img");
          const title = photo.card?.querySelector("strong");
          const source = photo.card?.querySelector("[data-photo-source]");
          if (img) img.alt = tr ? photo.alt : photo.altEn;
          if (title) title.textContent = tr ? photo.caption : photo.captionEn;
          if (source) source.textContent = text("Arşiv kaynağını aç ↗", "Open archive source ↗");
          photo.card?.querySelector("a")?.setAttribute("aria-label", (tr ? photo.caption : photo.captionEn) + text(" — kaynak fotoğrafı aç", " — open source photograph"));
        });
        const galleryNote = gallery.querySelector("[data-gallery-note]");
        if (galleryNote) galleryNote.firstChild.textContent = text("Görseller Wikimedia Commons arşiv bağlantılarından yüklenir. 14 Temmuz 1929 tarihli fotoğraf Türk Tarih Kurumu arşiv kataloğunda ayrıca kayıtlıdır.", "Images load from Wikimedia Commons archive pages. A photograph dated 14 July 1929 is also listed in the Turkish Historical Society archive catalogue.");
        gallery.querySelector("[data-gallery-archive]").textContent = text("Türk Tarih Kurumu arşiv kaydını görüntüle", "View the Turkish Historical Society archive record");
        gallery.querySelector("[data-gallery-tubitak]").textContent = text("Atatürk’ün traktör sürerken fotoğrafını içeren TÜBİTAK tarihî fotoğraf derlemesi", "TÜBİTAK historical photo collection featuring Atatürk driving a tractor");
      }
    }
    function show(next) {
      index = (next + quotes.length) % quotes.length;
      render();
    }
    panel.querySelector("[data-quote-prev]")?.addEventListener("click", () => show(index - 1));
    panel.querySelector("[data-quote-next]")?.addEventListener("click", () => show(index + 1));
    show(0);

    if (isVisionPage && !document.querySelector(".ataturk-photo-gallery")) {
      const gallery = makeGallery();
      panel.after(gallery);
      render();
    }
    window.addEventListener("nexora:languagechange", render);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
