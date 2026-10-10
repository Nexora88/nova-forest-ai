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
    ["Ürün sayfası","Product page"],["Geri","Back"],["İleri","Next"],["Güncelle","Refresh"],["Yenile","Reload"],["Orman, tarım ve ekosistem","Forests, agriculture, and ecosystems"],["Uydu • Tarla • Ekosistem İstihbaratı","Satellite • Field • Ecosystem Intelligence"],
    ["Trakya + İstanbul Çevresel İstihbarat","Thrace + Istanbul Environmental Intelligence"],["Türkiye • 81 İL • 973 İLÇE • OFFLINE VECTOR","TÜRKIYE • 81 PROVINCES • 973 DISTRICTS • OFFLINE VECTOR"],
    ["İl geometrileri ve 973 ilçe sınırı yerel GeoJSON olarak uygulamaya gömülüdür.","Province geometries and 973 district boundaries are bundled as local GeoJSON."],
    ["Harita bağlantı kesildiğinde bile idari vektör sınırlar çalışır; canlı hava ve yerleşim verisi ağ varsa güncellenir.","Administrative vector boundaries remain available offline; live weather and settlement data update when a network is available."],
    ["İdari sınırlar resmi mülkiyet/parsel sınırı değildir.","Administrative boundaries are not official property or parcel boundaries."],
    ["Harita üzerindeki filtrelerden hangi çevresel göstergenin renkleri belirlediğini seç.","Use the map filters to choose which environmental indicator controls the colors."],
    ["Toprak nemi, ET₀ ve sıcaklık; sulama ve tarla çalışması için erken sinyal üretir.","Soil moisture, ET₀, and temperature provide early signals for irrigation and field work."],
    ["Polen verisi atmosferik bir sinyaldir.","Pollen data is an atmospheric signal."],
    ["Bitki çeşitliliğinin kesin tespiti için Sentinel-2 spektral sınıflandırma katmanı ayrıca kurulacaktır.","A Sentinel-2 spectral classification layer is needed to assess plant diversity."],
    ["NEXORAWILDFIRE / GEOSPATIAL COMMAND","NEXORAWILDFIRE / GEOSPATIAL COMMAND"],["VERİ KATMANI","DATA LAYER"],
    ["ALAN ÇİZİMİ","DRAW AREA"],["ALAN KAYDEDİLDİ","AREA SAVED"],["ALAN CİHAZA KAYDEDİLDİ","AREA SAVED ON DEVICE"],
    ["SEÇİLİ ALAN HARİTADA GÖSTERİLİYOR","SELECTED AREA SHOWN ON MAP"],["YEREL VERİ","LOCAL DATA"],["SON YEREL VERİ","LAST CACHED DATA"],
    ["KÜRESEL ÖLÇEK TESTİ","GLOBAL SCALE TEST"],["Küresel Ölçek Testi · Napa Vadisi","Demo: Global Scale Test · Napa Valley"],
    ["Kaliforniya Napa Vadisi yakınında örnek GeoJSON poligonu yükle ve temsilî koordinat için güncel hava durumunu iste. Uydu ve eğitilmiş ML kullanılabilirliği ayrı raporlanır.","Load a sample GeoJSON polygon near Napa Valley, California, and request current weather for its representative coordinate. Satellite and trained-ML availability are reported separately."],
    ["GeoJSON haritada gösterildi. Open-Meteo isteği şu anda kullanılamıyor; hiçbir hava değeri uydurulmadı. Uydu ve eğitilmiş ML durumu doğrulanmadı.","GeoJSON: PASS · Open-Meteo request unavailable. No weather values were fabricated. Satellite and trained-ML status remain unverified."],
    ["GeoJSON: BAŞARILI","GeoJSON: PASS"],["Güncel hava durumu isteniyor…","Requesting current weather…"],
    ["NASA FIRMS, Copernicus işleme ve eğitilmiş ML bu demodan çıkarılamaz; yapılandırılmış durumları ayrı kontrol edilmelidir.","NASA FIRMS, Copernicus processing, and trained ML are not implied by this demo; their configured status must be checked separately."],
    ["Kaliforniya Napa Vadisi","Napa Valley, California"],["Henüz küresel demo çalıştırılmadı.","No global demo has been run yet."],
    ["Napa Vadisi, Kaliforniya GeoJSON haritada gösterildi. Güncel hava durumu isteniyor…","GeoJSON rendered at Napa Valley, California. Requesting current weather…"],
    ["Rapor oluşturmak için giriş ve kurumsal yetki gerekir.","Sign-in and enterprise authorization are required to generate a report."],
    ["Model eğitimi için doğrulanmış, etiketli geçmiş veri ve model artefaktı gerekli.","A verified labelled historical dataset and model artifact are required for training."],
    ["Eksik özellikler:","Missing features:"],["Tüm model girdileri sonlu sayısal değer olmalıdır.","All model inputs must be finite numeric values."],
    ["Trakya'nın doğasını, tarlasını ve ekosistemini tek karar ekranında izle.","Monitor Thrace's forests, fields, and ecosystems in one decision workspace."],
    ["Alan Ekle ile kendi tarla, arılık veya orman poligonunu kaydet ve Alanlarım ekranında canlı durumunu izle.","Use Add Area to save your own field, apiary, or forest polygon and monitor it in My Areas."],
    ["Bu konumu seçili saha seviyesinde açarak çevresel sinyalleri incele.","Open this location as a selected field to inspect environmental signals."],
    ["Bu seviye seçili bir coğrafi gözlem noktasıdır; resmî parsel veya mülkiyet sınırı değildir.","This is a geographic observation point, not an official parcel or property boundary."],
    ["Sistem şu anda bir pilot bölgede","The system is currently being tested in a pilot region"],["Geliştirilmekte olan bir araştırma ve karar destek projesidir.","A developing research and decision-support project."],
    ["Bu deneysel olasılık, yalnızca eğitim verisinin temsil ettiği koşullarda karar desteğidir; resmi yangın alarmı veya kesin tahmin değildir.","This experimental probability is decision support only for conditions represented by the training data; it is not an official fire alert or a guaranteed forecast."],
    ["Bir sonraki işleme katmanında","In the next processing layer"],["Gerçek piksel hesabı backend işleme katmanına bağlanacak.","Real pixel calculations will be connected to the backend processing layer."],
    ["Polen ≠ biyoçeşitlilik.","Pollen ≠ biodiversity."],["Bitki çeşitliliği için Sentinel-2'nin çok bantlı yansımaları, red-edge bantları, zaman serisi ve arazi örtüsü sınıfları birlikte değerlendirilmelidir.","Plant diversity assessment should combine Sentinel-2 multispectral reflectance, red-edge bands, time series, and land-cover classes."]
    ["NexoraWildfire AI yalnızca yangın alarmı veren bir harita değil; orman sağlığı, tarımsal koşullar, toprak nemi, sulama ihtiyacı, polen, hava kalitesi, arıcılık uçuş koşulları ve çevresel riskleri aynı veri katmanında birleştiren bölgesel karar destek sistemidir.","NexoraWildfire AI is more than a wildfire alert map: it brings forest health, agricultural conditions, soil moisture, irrigation needs, pollen, air quality, beekeeping flight conditions, and environmental risk into one regional decision-support system."],
    ["Trakya'nın doğasını, tarlasını ve ekosistemini tek karar ekranında izle.","Monitor Thrace's forests, fields, and ecosystems in one decision workspace."],
    ["Bitki stresi, kuraklık sinyali, sıcaklık ve yangın koşullarını tek göstergede birleştirir.","Combines plant stress, drought signals, temperature, and fire conditions in one indicator."],
    ["Toprak nemi, ET₀, yağış ve sıcaklık üzerinden sulama ve tarla çalışması için erken sinyaller üretir.","Provides early signals for irrigation and field work using soil moisture, ET₀, rainfall, and temperature."],
    ["Arıcılık için sıcaklık, rüzgar, yağış ve polen koşullarını yorumlayan bölgesel uçuş koşulu göstergesi.","A regional flight-conditions indicator for beekeeping, using temperature, wind, rainfall, and pollen."],
    ["Avrupa CAMS hava kalitesi modeli üzerinden polen ve hava kalitesi sinyallerini izler.","Tracks pollen and air-quality signals using the European CAMS air-quality model."],
    ["İl sınırları gerçek geometrileriyle; hava, tarım ve ekosistem göstergeleriyle birlikte.","Province boundaries are shown with their geometries alongside weather, agriculture, and ecosystem indicators."],
    ["NexoraWildfire AI; uydu verileri, meteorolojik bilgiler ve yapay zeka destekli analiz yöntemlerini kullanarak çevresel risklerin izlenmesi amacıyla geliştirilen bir karar destek platformudur.","NexoraWildfire AI is a decision-support platform being developed to monitor environmental risks using satellite data, meteorological information, and AI-assisted analysis methods."],
    ["Doğayı korumak, üreticinin emeğini korumaktır.","Protecting nature also protects the work of producers."],
    ["Orman yangınları yalnızca ağaçları değil; köyleri, tarım alanlarını ve kırsal yaşamı da etkiler.","Wildfires affect not only trees, but also villages, agricultural land, and rural livelihoods."],
    ["NexoraWildfire AI, çevresel verileri anlaşılır karar destek sinyallerine dönüştürerek üreticinin yaşam alanlarını ve doğal kaynakları daha erken fark etmeye yardımcı olmayı amaçlar.","NexoraWildfire AI aims to turn environmental data into understandable decision-support signals that help people recognize risks to rural communities and natural resources earlier."],
    ["Bu bölüm, Atatürk'ün üretim, tarım ve çevreye ilişkin Cumhuriyet vizyonunu günümüz çevresel karar destek yaklaşımıyla ilişkilendiren proje anlatısıdır.","This section connects Atatürk's Republic-era vision for production, agriculture, and the environment with today's approach to environmental decision support."],
    ["Gerçek meteoroloji akışı + mevcut çevresel risk mantığı + açıklanabilir karar desteği.","Real meteorological feeds + current environmental risk logic + explainable decision support."],
    ["Isı yüzeyi: mevcut meteorolojik risk sinyalinin görsel temsili. Uydu katmanı için Risk Haritası'nı aç.","Heat surface: a visual representation of the current meteorological risk signal. Open Risk Map for satellite layers."],
    ["Alanlarını tek ekrandan izle.","Monitor your areas in one place."],
    ["Tarla, arılık, orman veya seçtiğin alanı haritada kaydet.","Save a field, apiary, forest, or other selected area on the map."],
    ["NexoraWildfire hava, toprak nemi, ET₀, VPD ve polen sinyallerini otomatik olaylara dönüştürür.","NexoraWildfire turns weather, soil moisture, ET₀, VPD, and pollen signals into automated events."],
    ["Backend bağlandığında alan poligonunun gerçek Sentinel-2 NDVI zaman serisi de burada görünür.","When the backend is connected, the area's real Sentinel-2 NDVI time series will also appear here."],
    ["Risk yükseldiğinde NexoraWildfire haber versin.","Let NexoraWildfire notify you when risk increases."],
    ["Harici SMS, e-posta veya bot kullanmadan çalışır.","Works without external SMS, email, or bot services."],
    ["Sistem riski kendi backend'inde değerlendirir, uyarıyı Alanlarım'a kaydeder ve izin verilirse tarayıcı bildirimi gösterir.","The backend evaluates risk, saves the alert to My Areas, and displays a browser notification when permission is granted."],
    ["İlk alanını oluştur.","Create your first area."],["Harita → Alan Ekle. En az üç köşe seç, alan adını ve kullanım türünü yaz.","Go to Map → Add Area. Select at least three corners, then enter the area's name and type."],
    ["Bu ekran alanın canlı durumunu ve otomatik olaylarını gösterecek.","This screen will show your area's live status and automated events."],
    ["Tarla, orman ve bitki örtüsünü uydu verisiyle okumaya hazırlan.","Prepare to interpret fields, forests, and vegetation with satellite data."],
    ["Sentinel-2 sahne keşfi mevcut. Bir sonraki işleme katmanında B02/B03/B04/B08 ve red-edge bantlarıyla bitki örtüsü, stres ve habitat sınıfları üretilecek. Sistem veri yokken değer uydurmaz.","Sentinel-2 scene discovery is available. A future processing layer will use B02/B03/B04/B08 and red-edge bands to derive vegetation, stress, and habitat classes. The system does not invent values when data is missing."],
    ["Uygun Level-2A sahne keşfi.","Discovery of suitable Level-2A scenes."],
    ["Polen sayısını bitki çeşitliliği sanmak yerine uydu spektral imzalarıyla tür/habitat grupları sınıflandırılacak.","Rather than treating pollen counts as plant diversity, species or habitat groups will be classified from satellite spectral signatures."],
    ["Tarla sınırı + zaman serisi + bitki stresi + sulama sinyali.","Field boundary + time series + plant stress + irrigation signal."],
    ["Bölge sahneleri taranıyor...","Scanning scenes for the region..."],
    ["Polen modeli atmosferdeki polen yükünü gösterir. Bitki çeşitliliği için Sentinel-2'nin çok bantlı yansımaları, red-edge bantları, zaman serisi ve arazi örtüsü sınıfları birlikte değerlendirilmelidir. NexoraWildfire bu ayrımı sistem mimarisinde korur.","The pollen model indicates atmospheric pollen load. Plant diversity assessment should combine Sentinel-2 multispectral reflectance, red-edge bands, time series, and land-cover classes. NexoraWildfire preserves this distinction in its system design."],
    ["Open-Meteo meteorolojik verileri kullanılarak bölgesel sıcaklık, nem ve rüzgar koşulları analiz edilir.","Regional temperature, humidity, and wind conditions are analysed using Open-Meteo weather data."],
    ["Bitki kuruluğu için analiz edilir","Analysed as an indicator of plant dryness"],["Yangın yayılım risk faktörü","A factor in wildfire spread risk"],
    ["Meteorolojik risk işleme aktif","Meteorological risk processing is active"],["Veri Akışı","Data Stream"],["Bölgesel koordinat analizi","Regional coordinate analysis"],
    ["Sahadaki insanlarla doğrudan iletişim.","Communicate directly with people in the field."],
    ["Özel mesajlar yalnızca konuşmaya katılan hesaplar tarafından okunabilir. E-posta ve telefon numarası herkese açık gösterilmez.","Private messages are readable only by conversation participants. Email addresses and phone numbers are not publicly displayed."],
    ["Mesajlaşmak için hesabına giriş yap","Sign in to send messages"],["Risk haritası ve acil durum bilgileri herkese açık kalır. Özel mesajlar için güvenli hesap gerekir.","The risk map and emergency information remain public. Private messages require an account."],
    ["Herkese açık kullanıcı adı","Public username"],["Kullanıcı adı","Username"],["Görünen ad","Display name"],["Kimliğimi kaydet","Save my identity"],
    ["Kişi bul","Find a person"],["Kullanıcı adına göre","By username"],["Ara","Search"],["GELEN KUTUSU","INBOX"],["Konuşmalar yükleniyor…","Loading conversations…"],
    ["Bir konuşma seç","Select a conversation"],["Bir saha kullanıcısı ara veya sol taraftaki konuşmalarından birini aç.","Search for a field user or open one of your conversations on the left."],
    ["Saygılı ve saha odaklı iletişim kur. Kişisel bilgileri paylaşırken dikkatli ol.","Communicate respectfully and stay focused on field work. Be careful when sharing personal information."],
    ["Bu mesajlar uçtan uca şifrelenmiş değildir. Hassas konum, kişisel veri veya acil durum bilgilerini özel mesajlarda paylaşma.","These messages are not end-to-end encrypted. Do not share sensitive locations, personal data, or emergency information in private messages."],
    ["Acil durumlarda 112 ve yetkili kurumların talimatları önceliklidir.","In emergencies, call 112 and follow instructions from the relevant authorities."],
    ["Kurumsal varlık güzergâhı ve risk raporu","Enterprise asset mapping and risk reporting"],
    ["Bu ayrı çalışma alanı; enerji hatları, trafo merkezleri ve rüzgâr türbinleri için coğrafi varlık geometrisi hazırlamak ve çevresel risk raporu istemek üzere tasarlanmıştır. Ana paneldeki harita deneyimini bölmez.","This dedicated workspace lets users prepare geographic asset geometries and request environmental risk reports for power lines, substations, and wind turbines without cluttering the main map."],
    ["Yüksek gerilim hatları, trafo merkezleri ve rüzgâr türbinleri için GeoJSON varlığını seçin; tampon alanı, uydu NDVI/NDMI, erişilebilir sıcak nokta akışı ve yol erişimi tek bir PDF raporunda toplansın.","Select a GeoJSON asset for power lines, substations, or wind turbines to compile the buffer area, satellite NDVI/NDMI, available hotspot feed, and road access into one PDF report."],
    ["Kurumsal yetki gerekir. Bu ilk sürümde ödeme/abonelik sağlayıcısı bağlı değildir; erişim sunucu tarafında yetkili hesap listesiyle yönetilir. 5 yıllık FIRMS arşivi ve 3 aylık hava tahmini hazır değilse rapor bunları açıkça “veri yok” olarak işaretler; uydurma değer üretmez.","Enterprise authorization is required. No payment or subscription provider is connected in this first version; access is controlled by a server-side allowlist. If five-year FIRMS history or a three-month forecast is unavailable, the report marks it as unavailable instead of inventing values."],
    ["Çizgi: elektrik hattı · Çokgen: RES/trafo etki alanı · Nokta: tek türbin","Line: power line · Polygon: wind-farm/substation impact area · Point: individual turbine"],
    ["NexoraWildfire AI · Uydu Tabanlı Çevresel Risk Analiz Platformu","NexoraWildfire AI · Satellite-Based Environmental Risk Analysis Platform"],
    ["Sistem şu anda bir pilot bölgede","The system is currently being tested in a pilot region"],
    ["Napa Vadisi, Kaliforniya GeoJSON haritada gösterildi. Hava durumu ve NASA FIRMS durumu isteniyor…","GeoJSON rendered at Napa Valley, California. Requesting weather and NASA FIRMS status…"],
    ["Open-Meteo: kullanılamıyor","Open-Meteo: unavailable"],["Hava değerleri uydurulmadı.","No weather values were fabricated."],
    ["NASA FIRMS: KULLANILABİLİR","NASA FIRMS: AVAILABLE"],["NASA FIRMS: YAPILANDIRILMAMIŞ","NASA FIRMS: NOT CONFIGURED"],
    ["NASA FIRMS: backend uç noktası kullanılamıyor","NASA FIRMS: backend endpoint unavailable"],
    ["FIRMS_MAP_KEY anahtarını backend ortam değişkenlerinde tanımlayarak gerçek sıcak nokta sorgularını etkinleştir.","set FIRMS_MAP_KEY in the backend environment to enable real hotspot queries."],
    ["Son bir gün için","for the last day"],["Sıfır gözlem, yangın riskinin sıfır olduğunu kanıtlamaz.","Zero observations do not prove zero fire risk."],
    ["Bu demo yalnızca harita geometrisini, güncel hava durumunu ve sağlayıcı yanıtını kontrol eder; eğitilmiş bir Kaliforniya yangın-risk modeli veya resmî uyarı değildir.","This demo checks map geometry, current weather, and the provider response only; it is not a trained California fire-risk model or an official alert."],
    ["NASA FIRMS:","NASA FIRMS:"],["sıcak nokta gözlemi","hotspot observations"],["nem","humidity"],["rüzgâr","wind"],
    ["Uydu ve eğitilmiş ML durumu doğrulanmadı.","Satellite and trained-ML status remain unverified."],
    ["YANGIN RİSKİ","WILDFIRE RISK"],["RİSK HARİTASI","RISK MAP"],["VERİ AKIŞI BEKLENİYOR","WAITING FOR DATA STREAM"],
    ["KÖY / MAHALLE","VILLAGE / NEIGHBOURHOOD"],["SEÇİLİ SAHA","SELECTED AREA"],["ALANIM","MY AREA"],["ALANLARIM","MY AREAS"],
    ["VERİLER YÜKLENİYOR…","LOADING DATA…"],["RİSK HESAPLANIYOR","CALCULATING RISK"],["ÇEVRİMDIŞI","OFFLINE"],
    ["KATMANLAR","LAYERS"],["VERİ KATMANI","DATA LAYER"],["UYDU","SATELLITE"],["ORMAN","FOREST"],["TARIM","AGRICULTURE"],
    ["POLEN","POLLEN"],["SU / TOPRAK","WATER / SOIL"],["KARANLIK","DARK"],["AÇIK","LIGHT"],["TOPOĞRAFYA","TOPOGRAPHY"],
    ["İNSANİ HARİTA","HUMANITARIAN MAP"],["STANDART","STANDARD"],["CANLI","LIVE"],["SİSTEM ÇALIŞIYOR","SYSTEM OPERATIONAL"],
    ["Kişisel Alan İstihbaratı","Personal Area Intelligence"],["Saha ağı · güvenli özel mesajlar","Field network · private messaging"],
    ["SİSTEM KAPSAMI","SYSTEM COVERAGE"],["OPERASYON MERKEZİ","OPERATIONS CENTER"],["TARIM / SULAMA","AGRICULTURE / IRRIGATION"],
    ["Sıcaklık Analizi","Temperature Analysis"],["Nem Seviyesi","Humidity Level"],["Rüzgar Hızı","Wind Speed"],["AI Değerlendirme","AI Assessment"],
    ["Uydu katmanı","Satellite layer"],["Orman katmanı","Forest layer"],["Tarım katmanı","Agriculture layer"],["Arıcılık katmanı","Beekeeping layer"],["Atmosfer katmanı","Atmosphere layer"],
    ["Haritada alan ekle","Add an area on the map"],["Alan ekle","Add area"],["Alanı kaydet","Save area"],["Bildirim ayarları","Notification settings"],
    ["Risk eşiği","Risk threshold"],["Nova-Alert'i etkinleştir","Enable Nova-Alert"],["Kaydet ve tarayıcı izni ver","Save and grant browser permission"],
    ["İlk alanını oluştur.","Create your first area."],["Henüz geçmiş yok.","No history yet."],["Veri yok","No data"],["Veri bekleniyor…","Waiting for data…"],
    ["KURUMSAL YETKİLİ ÇALIŞMA ALANI","AUTHORIZED ENTERPRISE WORKSPACE"],["Canlı hava verisi","Live weather data"],
    ["Menü","Menu"],["Kapat","Close"],["Diğer","More"],["Uygulamayı yükle","Install app"],["Yüklemek için tarayıcı menüsünü kullan","Use your browser menu to install"],["Paylaş → Ana Ekrana Ekle","Share → Add to Home Screen"],
    ["Belgelenmiş yangın-hava durumu modeli","Documented fire-weather model"],["Backend model dosyası ve değerlendirme kaydı kontrol ediliyor…","Checking the backend model artifact and evaluation record…"],
    ["Araştırma modeli durumu:","Research model status:"],["Geçerli model dosyası hazır olana kadar tahmin gösterilmez.","No prediction is presented until a valid model artifact is available."],
    ["Canlı model durumu bu sayfadan doğrulanamadı. Arayüz eğitim metrikleri uydurmaz.","Live model status could not be verified from this page. The UI will not invent training metrics."],
    ["ARAŞTIRMA PROTOTİPİ","RESEARCH PROTOTYPE"],["etiketli günlük gözlem","labelled daily observations"],["dönem belirtilmemiş","period not reported"],
    ["Doğruluk","Accuracy"],["Dengeli doğruluk","Balanced accuracy"],["Kesinlik","Precision"],["Duyarlılık","Recall"],["F1","F1"],["ROC AUC","ROC AUC"],
    ["Bu model 2012 tarihli Cezayir meteoroloji gözlemlerini kullanır. Trakya/Türkiye için doğrulanmamıştır, yedi günlük tahmin değildir ve resmî uyarı olarak kullanılmamalıdır.","This model uses historical Algerian weather observations from 2012. It is not validated for Thrace/Türkiye, is not a seven-day forecast, and must not be used as an official warning."],
    ["Canlı model durumu bu sayfadan doğrulanamadı.","Live model status could not be verified from this page."],
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