/* Extra bilingual coverage for map planning and previously untranslated controls. */
(() => {
 const pairs=[
 ["SAHA PLANLAMA ARAÇLARI","FIELD PLANNING TOOLS"],["Alan ve hat taslakları · cihazında saklanır","Zone and route drafts · saved on this device"],
 ["Önemli: Buradaki şekiller kullanıcı tarafından çizilen planlama taslaklarıdır; resmî güvenli bölge, tahliye rotası veya acil durum talimatı değildir. Acil durumda 112 ve yetkili kurumların yönlendirmelerini takip et.","Important: These are user-drawn planning drafts, not official safe zones, evacuation routes, or emergency instructions. In an emergency, call 112 and follow official guidance."],
 ["＋ Güvenli alan taslağı","＋ Draft safe area"],["／ Hat / rota taslağı","／ Draft line / route"],["✓ Çizimi bitir","✓ Finish drawing"],["İptal","Cancel"],["Taslakları temizle","Clear drafts"],["Alan taslağı","Area draft"],["Hat / rota taslağı","Line / route draft"],
 ["Haritadan alan veya hat çizimi başlat. Kayıt yalnızca bu cihazda tutulur.","Start drawing an area or route on the map. Drafts are stored only on this device."],
 ["Alan çizimi başlatıldı. Köşeleri seç, sonra ‘Çizimi bitir’e bas.","Area drawing started. Select corners, then press ‘Finish drawing’."],
 ["Hat çizimi başlatıldı. En az iki nokta seç, sonra ‘Çizimi bitir’e bas.","Route drawing started. Select at least two points, then press ‘Finish drawing’."],
 ["nokta seçildi. Çizimi bitirdiğinde taslak cihazına kaydedilir.","point(s) selected. Finish drawing to save the draft on this device."],
 ["Alan için en az 3 köşe gerekir.","An area needs at least 3 corners."],["Hat için en az 2 nokta gerekir.","A route needs at least 2 points."],
 ["Taslak bu cihaza kaydedildi. Resmî güvenlik alanı veya doğrulanmış rota değildir.","Draft saved on this device. It is not an official safety zone or verified route."],
 ["Cihaz depolamasına kaydedilemedi. Tarayıcı depolama iznini kontrol et.","Could not save to device storage. Check browser storage permissions."],
 ["Çizim kaydedildi. Lütfen bunu gerçek güvenlik/tahliye yönlendirmesi olarak kullanma.","Drawing saved. Do not use it as real safety or evacuation guidance."],
 ["Çizim iptal edildi.","Drawing cancelled."],["Bu cihazdaki taslaklar silindi.","Drafts on this device were deleted."],
 ["Bu cihazdaki tüm alan ve hat taslakları silinsin mi?","Delete all area and route drafts on this device?"],
 ["Geri","Back"],["Alan Ekle","Add Area"],["VERİ KATMANI","DATA LAYER"],["İL SEVİYESİ","PROVINCE LEVEL"],
 ["Düşük / iyi","Low / good"],["Orta","Moderate"],["Yüksek","High"],["Kritik","Critical"],
 ["Acil durumda 112’yi ara ve resmî tahliye talimatlarına uy.","In an emergency, call 112 and follow official evacuation instructions."],
 ["Veri dürüstlüğü","Data integrity"],["Gerçek kaynaklar, zaman damgaları ve belirsizlik.","Real sources, timestamps, and uncertainty."],
 ["Canlı çevre haritasını aç →","Open live environmental map →"],["Uydu merkezine git","Open satellite hub"],["Orman Durumu","Forest Status"],["Tarım İstihbaratı","Agriculture Intelligence"],
 ["Çevresel Harita","Environmental Map"],["Uydu Merkezi","Satellite Hub"],["Geri Bildirim","Feedback"],["Cumhuriyet Vizyonu","Republic Vision"],
 ["Açık veri","Open data"],["Veri kaynağı","Data source"],["Son güncelleme","Last updated"],["Hata oluştu","An error occurred"],["Yeniden dene","Try again"],
 ["Gözlem bulunamadı","No observations found"],["Veri sağlayıcısı kullanılamıyor","Data provider unavailable"],["Tahmini değer","Estimated value"],["Gerçek ölçüm","Observed measurement"],
 ["🔥 Risk","🔥 Risk"],["🌲 Orman","🌲 Forest"],["💧 Su / Nem","💧 Water / Moisture"],["🌾 Tarım","🌾 Agriculture"],["🌼 Polen","🌼 Pollen"],
 ["Alanlarım →","My Areas →"],["Alan Ekle","Add Area"],["İLÇELER","DISTRICTS"],["KÖY / MAHALLELER YÜKLENİYOR…","LOADING VILLAGES / NEIGHBOURHOODS…"],
 ["CANLI","LIVE"],["YAKINDA","COMING SOON"],["İL SEVİYESİ","PROVINCE LEVEL"],["İLÇE SEÇ","SELECT DISTRICT"],["İlçeyi aç →","Open district →"],
 ["Bu ilçeyi açmak ve köy/mahalle seviyesine inmek için seç.","Select to open this district and explore villages/neighbourhoods."],
 ["İlçeler yükleniyor…","Loading districts…"],["Konum aranıyor…","Searching for location…"],["Veri alınamadı","Could not load data"],
 ["Sıcaklık","Temperature"],["Nem","Humidity"],["Rüzgar","Wind"],["Toprak nemi","Soil moisture"],["Geçmiş","History"],["Kaynak","Source"],
 ["Düşük / iyi","Low / good"],["Orta","Moderate"],["Yüksek","High"],["Kritik","Critical"],
 ["Kendi alanını çiz","Draw your own area"],["Çizimi başlat","Start drawing"],["Çizimi kaydet","Save drawing"],["Çizimi iptal et","Cancel drawing"],
 ["Seçili alan haritada gösteriliyor","Selected area is shown on the map"],["Harita katmanları","Map layers"],["Standart","Standard"],["Uydu","Satellite"],
 ["Karanlık","Dark"],["Açık","Light"],["Topoğrafya","Topography"],["İnsani harita","Humanitarian map"],
 ["Ağ bağlantısı yok","No network connection"],["Son kayıtlı veri","Last saved data"],["Veri sağlayıcısına bağlanılamadı","Could not connect to the data provider"],
 ["Resmî acil durum yönlendirmesi değildir.","This is not official emergency guidance."],["Planlama alanı","Planning area"],["Hat çiz","Draw a line"],["Alan çiz","Draw an area"],
 ["Koordinatlar","Coordinates"],["Yer adı","Place name"],["Enlem","Latitude"],["Boylam","Longitude"],["Konuma git ve analiz et","Go to location and analyze"],
 ["Yer adı veya koordinat gir","Enter a place name or coordinates"],["Yer bulunamadı","Place not found"],["Hava durumu","Weather"],["NASA FIRMS durumu","NASA FIRMS status"],
 ["Güvenli bölge","Safe zone"],["Tahliye rotası","Evacuation route"],["Planlama taslağı","Planning draft"],["Resmî veri değildir","Not official data"]
 ["SUPABASE · ZAMAN SERİSİ","SUPABASE · TIME SERIES"],
 ["Günlük çevre geçmişi","Daily environmental history"],
 ["Alanların kaydedilmiş çevresel göstergeleri. Grafik yalnızca veritabanındaki gerçek kayıtları gösterir.","Saved environmental indicators for your areas. The chart only shows real records from the database."],
 ["CANLI SENKRON","LIVE SYNC"],
 ["Supabase bağlantısı hazırlanıyor…","Preparing Supabase connection…"],
 ["Kayıtlı geçmiş aranıyor…","Looking for saved history…"],
 ["Henüz veri yok","No data yet"],
 ["Geçmişi görmek için hesabına giriş yap.","Sign in to view your history."],
 ["Önce Harita bölümünden bir alan kaydet.","Save an area from the Map section first."],
 ["Supabase geçmiş kayıtları yükleniyor…","Loading saved history from Supabase…"],
 ["Supabase'den gerçek kayıtlar yüklendi.","Real records loaded from Supabase."],
 ["Henüz geçmiş kaydı yok; grafik veri geldiğinde otomatik oluşacak.","No history records yet; the chart will appear automatically when data arrives."],
 ["Geçmiş yüklenemedi: ","History could not be loaded: "],
 [" kayıt · son: "," records · latest: "],
 [" · gösterge "," · indicator "],
 ["Gerçek kayıtlar","Real records"],
 ["Günlük çevre geçmişi","Daily environmental history"],
 ];
 const toEn=new Map(pairs), toTr=new Map(pairs.map(([a,b])=>[b,a]));
 const originals=new WeakMap();
 function lang(){return document.documentElement.dataset.language || (localStorage.getItem("nexorawildfire-language-v1")||"en")}
 function translate(root=document.body){
   const en=lang()==="en", dict=en?toEn:toTr;
   const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
   const nodes=[];while(walker.nextNode())nodes.push(walker.currentNode);
   for(const n of nodes){if(!originals.has(n)) originals.set(n,n.nodeValue);const raw=originals.get(n).trim();if(!raw)continue;const replacement=dict.get(raw);if(replacement){const lead=originals.get(n).match(/^\s*/)?.[0]||"",tail=originals.get(n).match(/\s*$/)?.[0]||"";n.nodeValue=lead+replacement+tail}}
   root.querySelectorAll?.("[placeholder],[title],[aria-label]").forEach(el=>["placeholder","title","aria-label"].forEach(attr=>{if(el.hasAttribute(attr)){const k=attr+":"+el.tagName+":"+el.getAttribute("data-i18n-extra-key");if(!el.dataset.i18nExtraKey)el.dataset.i18nExtraKey=String(Math.random()).slice(2);const key=attr+":"+el.dataset.i18nExtraKey;if(!el.dataset["orig"+attr])el.dataset["orig"+attr]=el.getAttribute(attr);const orig=el.dataset["orig"+attr];if(dict.has(orig))el.setAttribute(attr,dict.get(orig));}}));
 }
 document.addEventListener("click",e=>{if(e.target.closest("#nexora-language-toggle"))requestAnimationFrame(()=>translate());},true);
 const observer=new MutationObserver(records=>{if(lang()!=="en")return;records.forEach(r=>r.addedNodes.forEach(n=>{if(n.nodeType===Node.ELEMENT_NODE)translate(n);else if(n.nodeType===Node.TEXT_NODE)translate(n.parentElement||document.body)}))});
 observer.observe(document.body,{childList:true,subtree:true});
 if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",()=>translate(),{once:true});else translate();
})();