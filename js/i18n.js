/* Lightweight bilingual UI layer. Keep original content in the HTML; translations are reversible. */
(() => {
  const pairs = [
    ["Ana panele dön","Back to dashboard"],["Ana Panel","Dashboard"],["Risk Haritası","Risk Map"],["Alanlarım","My Areas"],["Atmosfer","Atmosphere"],["Uydu Merkezi","Satellite Hub"],["Özel Mesajlar","Private Messages"],["Sistem","About the System"],
    ["Çevresel Harita","Environmental Map"],["Çevresel İstihbarat","Environmental Intelligence"],["Çevresel istihbarat ve karar destek sistemi","Environmental intelligence and decision-support system"],
    ["CANLI KARAR MERKEZİ","LIVE DECISION CENTER"],["SİSTEM ÇEVRİMİÇİ","SYSTEM ONLINE"],["YETKİLİ ÇALIŞMA ALANI","AUTHORIZED WORKSPACE"],
    ["Trakya'nın doğasını, tarlasını ve ekosistemini tek karar ekranında izle","Monitor Thrace's forests, fields, and ecosystems in one decision workspace"],
    ["Türkiye'yi il → ilçe → alan seviyesinde katman katman izle.","Explore Türkiye from province to district to field."],
    ["Haritadaki renk tek bir “güzel/çirkin” göstergesi değildir.","Map colors do not represent a single good-or-bad score."],
    ["Seçtiğin veri katmanına göre değişir: yangın/çevre riski, orman sağlığı, su-toprak durumu, tarım koşulu veya polen.","Colors depend on the selected layer: wildfire/environmental risk, forest health, water and soil, agriculture, or pollen."],
    ["VERİLER YÜKLENİYOR…","LOADING DATA…"],["VERİ AKIŞI BEKLENİYOR","WAITING FOR DATA"],["Katmanlar","Layers"],["Katmanlar","Layers"],["Katmanlar","Layers"],
    ["Tarla İzleme","Field Monitoring"],["Biyoçeşitlilik","Biodiversity"],["İl → İlçe → Alan","Province → District → Field"],
    ["Bir ile tıkla, ilçelere in.","Select a province to explore its districts."],
    ["Alan Ekle","Add Area"],["Alanlarım","My Areas"],["Haritada görüntüle","View on map"],["Alan adı","Area name"],["Alan türü","Area type"],
    ["Tarım Karar Motoru","Agriculture Decision Engine"],["Enerji altyapısı için varlık bazlı risk raporu","Asset-based risk report for energy infrastructure"],
    ["Kurumsal varlık güzergâhı ve risk raporu","Enterprise asset mapping and risk reporting"],
    ["Kurumsal altyapı analizi","Enterprise infrastructure analysis"],["Kurumsal analiz alanı","Enterprise analysis workspace"],
    ["Kurumsal varlık çizim haritası","Enterprise asset drawing map"],["Varlık güzergâhını haritada çiz","Draw an asset route on the map"],
    ["Harita yüklenince çizim araçlarını kullanabilir veya GeoJSON yükleyebilirsin.","When the map loads, use the drawing tools or upload a GeoJSON file."],
    ["Şirket adı","Company name"],["Varlık adı","Asset name"],["Varlık türü","Asset type"],["Tampon mesafesi","Buffer distance"],
    ["Varlık GeoJSON dosyası (isteğe bağlı)","Asset GeoJSON file (optional)"],["Kurumsal PDF raporu oluştur","Generate enterprise PDF report"],
    ["Rapor oluşturmak için giriş ve kurumsal yetki gerekir.","Sign-in and enterprise authorization are required to generate a report."],
    ["Erişim notu:","Access note:"],["Giriş","Sign in"],["Hesap oluştur","Create account"],["Çıkış yap","Sign out"],["Kaydet","Save"],["İptal","Cancel"],["Kapat","Close"],
    ["Geleceğe yön veren düşünceler","Ideas that shape the future"],["Hayatta en hakiki mürşit ilimdir.","The truest guide in life is science."],
    ["Bilimi, kanıtı ve sürekli öğrenmeyi rehber edin.","Let science, evidence, and continuous learning guide the way."],
    ["Sonraki söz","Next quote"],["Önceki söz","Previous quote"],["SİSTEM MANTIĞI","HOW THE SYSTEM WORKS"],
    ["Tek uygulama, farklı kullanıcılar.","One platform, different users."],
    ["Çiftçi sulamaya, arıcı uçuş gününe, orman yöneticisi riskli alana, doğa gözlemcisi polene bakabilir.","Farmers can assess irrigation, beekeepers can check flight conditions, forest managers can review risk areas, and nature observers can monitor pollen."],
    ["Sistemin amacı kullanıcıyı veriyle boğmak değil, veriyi anlaşılır kararlara çevirmektir.","The goal is not to overwhelm users with data, but to turn it into understandable decisions."],
    ["Sıcaklık","Temperature"],["Nem","Humidity"],["Rüzgar","Wind"],["Toprak nemi","Soil moisture"],["Kaynak","Source"],["Geçmiş","History"],
    ["Düşük","Low"],["Orta","Moderate"],["Yüksek","High"],["Kritik","Critical"],["VERİ YOK","NO DATA"],["HAZIRLANIYOR","IN PREPARATION"],
    ["Sahne bulundu","Scene found"],["Sahne bekleniyor","Waiting for scene"],["BAĞLANIYOR","CONNECTING"],["Harita katmanları","Map layers"],
    ["Sistemin amacı","The system's purpose"],["Ürün hedefi","Product vision"],["Geliştirici","Developer"],["Saha","Field"],["Orman sağlığı","Forest health"],
    ["Tarım koşulları","Agricultural conditions"],["Sulama ihtiyacı","Irrigation needs"],["Yangın riski","Wildfire risk"],["Yangın / çevre riski","Wildfire / environmental risk"],
    ["Ana sayfa","Home"],["Canlı veri","Live data"],["Çevrimdışı","Offline"],["ÇEVRİMDIŞI","OFFLINE"],["Son yerel veri","Last cached data"],
    ["Varlık bazlı analiz","Asset-based analysis"],["Uydu ve meteoroloji","Satellite and weather"],["Yüksek gerilim hattı","Transmission line"],
    ["Trafo merkezi","Substation"],["Rüzgâr türbini (RES)","Wind turbine"],["Diğer","Other"],["100 metre","100 metres"],["1 kilometre","1 kilometre"],
    ["Giriş ve kurumsal yetki","Sign-in and enterprise authorization"],["Nexora çatısı altında geliştirilen","Developed under the Nexora umbrella"],
    ["Ürün sayfası","Product page"],["Geri","Back"],["İleri","Next"],["Güncelle","Refresh"],["Yenile","Reload"]
  ];
  const trToEn = new Map(pairs);
  const enToTr = new Map(pairs.map(([tr,en]) => [en,tr]));
  const stateKey = "nexorawildfire-language-v1";
  const stored = (() => { try { return localStorage.getItem(stateKey); } catch { return null; } })();
  let lang = stored === "en" || stored === "tr" ? stored : (/^tr/i.test(navigator.language || "") ? "tr" : "en");
  const ordered = (map) => [...map.entries()].sort((a,b) => b[0].length-a[0].length);
  function replace(text, target) {
    const entries = ordered(target === "en" ? trToEn : enToTr);
    let out = text;
    for (const [from,to] of entries) if (out.includes(from)) out = out.split(from).join(to);
    return out;
  }
  const originals = new WeakMap();
  function translateNode(node) {
    if (node.nodeType !== Node.TEXT_NODE || !node.nodeValue || !node.nodeValue.trim()) return;
    if (!originals.has(node)) originals.set(node, node.nodeValue);
    const current = node.nodeValue;
    const translated = replace(current, lang);
    if (translated !== current) node.nodeValue = translated;
  }
  function translateAttributes(root=document) {
    const selector = "[placeholder],[title],[aria-label],[content]";
    if (root.nodeType === Node.ELEMENT_NODE && root.matches?.(selector)) translateElement(root);
    root.querySelectorAll?.(selector).forEach(translateElement);
  }
  const attributeOriginals = new WeakMap();
  function translateElement(el) {
    for (const attr of ["placeholder","title","aria-label","content"]) {
      if (!el.hasAttribute(attr)) continue;
      let saved = attributeOriginals.get(el);
      if (!saved) { saved = {}; attributeOriginals.set(el,saved); }
      if (!(attr in saved)) saved[attr] = el.getAttribute(attr);
      el.setAttribute(attr, replace(saved[attr], lang));
    }
  }
  function applyLanguage() {
    document.documentElement.lang = lang;
    document.title = replace(document.title, lang);
    document.querySelectorAll("body *").forEach(el => {
      if (["SCRIPT","STYLE","NOSCRIPT","TEXTAREA"].includes(el.tagName)) return;
      el.childNodes.forEach(translateNode);
    });
    translateAttributes();
    const btn = document.getElementById("nexora-language-toggle");
    if (btn) { btn.textContent = lang === "en" ? "EN · TR" : "TR · EN"; btn.setAttribute("aria-label",lang === "en" ? "Switch to Turkish" : "Switch to English"); }
    document.documentElement.dataset.language = lang;
    try { localStorage.setItem(stateKey,lang); } catch {}
  }
  function init() {
    const button = document.createElement("button");
    button.id = "nexora-language-toggle";
    button.type = "button";
    button.className = "nexora-language-toggle";
    button.textContent = lang === "en" ? "EN · TR" : "TR · EN";
    button.setAttribute("aria-label",lang === "en" ? "Switch to Turkish" : "Switch to English");
    button.addEventListener("click",() => { lang = lang === "en" ? "tr" : "en"; applyLanguage(); });
    document.body.appendChild(button);
    const style = document.createElement("style");
    style.textContent = ".nexora-language-toggle{position:fixed;right:14px;bottom:14px;z-index:99999;min-height:44px;padding:10px 14px;border:1px solid #00ff66;border-radius:999px;background:#06110a;color:#eaffef;font:700 12px system-ui;box-shadow:0 6px 24px #0009;cursor:pointer}.nexora-language-toggle:focus-visible{outline:3px solid #fff;outline-offset:3px}";
    document.head.appendChild(style);
    applyLanguage();
    const observer = new MutationObserver(records => {
      for (const record of records) {
        record.addedNodes.forEach(node => {
          if (node.nodeType === Node.TEXT_NODE) translateNode(node);
          else if (node.nodeType === Node.ELEMENT_NODE) {
            node.querySelectorAll?.("*").forEach(el => el.childNodes.forEach(translateNode));
            node.childNodes?.forEach(translateNode);
            translateAttributes(node);
          }
        });
      }
    });
    observer.observe(document.body,{childList:true,subtree:true});
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded",init,{once:true}); else init();
})();