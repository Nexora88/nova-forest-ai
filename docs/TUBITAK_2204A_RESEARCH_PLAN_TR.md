# Trakya'da Orman Yangınlarıyla İlişkili Meteorolojik Değişkenler ve Uydu Termal Anomali Gözlemlerinin Analizi

> **Belge durumu:** 2026–2027 TÜBİTAK 2204-A için araştırma taslağıdır. Henüz tamamlanmış proje raporu değildir. Veri toplama, kalite kontrolü, analiz ve sonuçlar yapılmadan sonuç veya başarı oranı yazılmamalıdır.

## 1. Yarışma çerçevesi

- **Program:** TÜBİTAK 2204-A Lise Öğrencileri Araştırma Projeleri Yarışması, 2026–2027 dönemi.
- **Önerilen ana alan:** Coğrafya.
- **Önerilen tematik alan:** Doğal Afetler ve Afet Yönetimi.
- **Pilot coğrafya:** Edirne, Tekirdağ ve Kırklareli.
- **Araştırma türü:** Açık kaynaklı meteorolojik ve uydu gözlem verileriyle yürütülen, tekrarlanabilir nicel veri analizi.
- **Resmî başvuru:** https://tubitak.gov.tr/tr/yarismalar/2204-lise-ogrencileri-arastirma-projeleri-yarismasi

Ana alan ve tematik alan son başvuru öncesinde 2026–2027 Proje Rehberi ile karşılaştırılarak danışmanla kesinleştirilmelidir. Bu çalışma herhangi bir kamu kurumu tarafından yürütülen resmî yangın izleme hizmeti değildir.

## 2. Problem durumu

Orman yangınlarıyla ilişkili çevresel koşulların incelenmesinde meteorolojik gözlemler ve uydu kaynaklı termal anomali kayıtları farklı kaynaklardan elde edilir. Bu verilerin tarih, konum, birim, çözünürlük ve eksik gözlem özellikleri farklıdır. Bu nedenle verileri bir araya getirirken aynı gün ve konumla eşleştirme kurallarının açıkça tanımlanması; uydu sinyalinin doğrulanmış yangın olayı gibi yorumlanmaması gerekir.

Trakya için yerel ölçekte, tekrarlanabilir ve sınırlılıkları açıkça belirtilmiş bir veri incelemesi yapılması; meteorolojik değişkenlerle uydu termal anomali kayıtlarının hangi koşullarda birlikte görüldüğünü anlamaya katkı sağlayabilir.

## 3. Araştırma sorusu

**Edirne, Tekirdağ ve Kırklareli'nde seçilen orman/ormanla ilişkili pilot alanlarda günlük sıcaklık, bağıl nem, rüzgâr ve yağış değişkenleri ile NASA FIRMS tarafından kaydedilen uydu termal anomali gözlemleri arasında nasıl bir ilişki vardır?**

Alt sorular:

1. Termal anomali kaydı bulunan günlerde meteorolojik değişkenlerin dağılımı, kayıt bulunmayan günlerden farklı mıdır?
2. Bu ilişkinin yönü ve büyüklüğü pilot alanlar ve mevsimler arasında değişmekte midir?
3. Önceden tanımlanmış basit bir meteorolojik eşik yaklaşımı, yalnızca termal anomali vekil etiketini ayırt etmede nasıl bir sonuç vermektedir?
4. Eksik veri, uydu geçişi, bulutluluk ve konum eşleştirme tercihlerinin sonuçlara etkisi nedir?

## 4. Amaç ve önem

Araştırmanın amacı, Trakya'da seçilecek pilot alanlar için meteorolojik gözlemler ile uydu termal anomali kayıtlarını ortak bir günlük veri tablosunda birleştirmek ve aralarındaki ilişkiyi ölçülebilir yöntemlerle incelemektir.

Çalışmanın beklenen katkısı yeni bir resmî yangın tahmin sistemi geliştirdiğini iddia etmek değil; açık verilerin yerel ölçekte nasıl eşleştirilebileceğini, hangi sınırlılıkları taşıdığını ve sonuçların hangi koşullarda yorumlanabileceğini gösteren yeniden üretilebilir bir araştırma yöntemi ortaya koymaktır.

## 5. Hipotezler

- **H1:** Daha yüksek günlük sıcaklık ve daha düşük bağıl nem değerleri, termal anomali vekil kaydı bulunan günlerle istatistiksel olarak ilişkili olabilir.
- **H2:** Rüzgâr ve yağış değişkenleri ile termal anomali vekil kayıtlarının ilişkisi pilot alan ve mevsime göre farklılaşabilir.
- **H0:** İncelenen veri kümesinde meteorolojik değişkenler ile termal anomali vekil kayıtları arasında ölçülebilir bir ilişki bulunmayabilir.

Hipotezler sonuç değildir. Analiz sonunda desteklenmemeleri de bilimsel bir bulgudur.

## 6. Yöntem

### 6.1. Pilot alanların seçimi

Mevcut veri hattındaki il merkezine yakın sabit test koordinatları, bilimsel örnekleme alanı olarak kabul edilmemelidir. Pilot noktalar; danışman rehberliğinde, erişilebilir ve belgelenebilir arazi/orman örtüsü kaynakları incelenerek seçilmelidir.

Her alan için il, alan kodu, koordinat, seçilme gerekçesi, arazi örtüsü kaynağı, kaynak tarihi ve eşleştirme yarıçapı veri toplamadan önce kaydedilmelidir. Koordinatlar kişisel konutları veya özel mülkleri göstermemelidir. Alan seçimi ve eşleştirme yarıçapı sonuçlara bakılarak sonradan değiştirilmemelidir.

### 6.2. Veri kaynakları

| Veri | Kaynak | Kullanım |
|---|---|---|
| Günlük sıcaklık, bağıl nem, rüzgâr ve yağış | Open-Meteo Historical Weather API | Pilot alanların meteorolojik zaman serisi |
| Uydu termal anomali kayıtları | NASA FIRMS | Tarih ve konum bakımından eşleşen termal anomali vekil gözlemleri |
| Arazi/orman örtüsü | Lisansı ve tarihi belgelenmiş resmî/açık coğrafi veri | Pilot alanların seçim gerekçesi ve sınıflandırması |

Her veri indiriminde kaynak adresi, ürün/sensör adı, indirme zamanı, tarih aralığı, koordinat sistemi, birimler, lisans ve dosya özeti (SHA-256) saklanmalıdır. API anahtarları veya erişim belirteçleri depoya eklenmemelidir.

### 6.3. Veri eşleştirme

1. Pilot alan koordinatları ve tarih aralığı araştırma başlamadan önce sabitlenir.
2. Meteorolojik kayıtlar günlük tarih ve pilot alan koduna göre düzenlenir.
3. FIRMS kayıtları seçilen alan çevresindeki önceden belirlenmiş eşleştirme kuralına göre ilişkilendirilir.
4. Aynı gün ve alan için eşleşen kayıt varsa vekil etiket 1; sağlanan dışa aktarımda eşleşme yoksa vekil etiket 0 olarak yazılır.
5. Eksik hava verisi sıfırla doldurulmaz; eksik veya başarısız kayıtlar ayrıca raporlanır.
6. Ham veri değiştirilmeden korunur; temizlenmiş veri ve işlem metaverisi ayrı dosyalarda tutulur.

**Etiket uyarısı:** FIRMS kaydı bir uydu termal anomalisidir; tek başına orman yangını doğrulaması değildir. FIRMS kaydının bulunmaması da o gün yangın olmadığı anlamına gelmez. Bu nedenle raporda "yangın var/yok" yerine "FIRMS termal anomali vekil kaydı var/yok" ifadeleri kullanılmalıdır. Resmî ve hukuken erişilebilir olay kayıtlarıyla bağımsız doğrulama sağlanamazsa sonuçlar bu sınırlamayla sunulmalıdır.

### 6.4. Analiz planı

- Önce örnek sayısı, tarih kapsamı, il/alan dağılımı, mevsim, eksik kayıt ve vekil etiket sınıf dengesi raporlanır.
- Sürekli değişkenlerin dağılımları grafiklerle incelenir.
- Uygun olduğunda iki grup karşılaştırmaları ve korelasyon analizleri yapılır; test seçimi veri dağılımına ve örneklem büyüklüğüne göre gerekçelendirilir.
- Yeterli örnek ve sınıf dengesi bulunursa, önceden belirlenmiş basit eşik yaklaşımı bir temel karşılaştırma olarak değerlendirilir. Daha karmaşık model ancak örneklem yeterliyse ve danışmanla yöntem kararlaştırılırsa eklenir.
- Zaman serisi rastgele günlere bölünmez. Geliştirme dönemi ile son test dönemi kronolojik olarak ayrılır; son test dönemi eşik/model seçimi sırasında kullanılmaz.
- Sonuçlar yalnızca vekil etiketin ayırt edilmesi olarak raporlanır; doğrulanmış yangın tahmini veya operasyonel uyarı başarısı olarak sunulmaz.

Yeterli olay sayısı veya güvenilir doğrulama yoksa makine öğrenmesi sonucu üretmek yerine betimsel ve istatistiksel ilişki analiziyle yetinilir.

### 6.5. Raporlanacak ölçütler

- Toplam günlük kayıt ve benzersiz pilot alan sayısı
- Tarih aralığı, il/alan/yıl/mevsim başına kayıt sayısı
- Eksik hava verisi ve başarısız veri isteği sayısı
- FIRMS vekil pozitif/negatif sayısı ve sınıf dengesi
- Kullanılan istatistiksel test, etki büyüklüğü ve mümkünse güven aralığı
- Sınıflandırma yapılırsa karışıklık matrisi, precision, recall, specificity, balanced accuracy ve F1
- Yanlış pozitif/yanlış negatif örnekleri ve veri kaynaklı belirsizlikler
- Temel yaklaşım ile varsa ek modelin aynı kronolojik test dönemi üzerindeki karşılaştırması

Ölçütler hesaplanmadan sayısal başarı, doğruluk veya tahmin oranı yazılmayacaktır.

## 7. Mevcut yazılım ile araştırma arasındaki sınır

Depodaki uygulama; veri kaynaklarını görüntüleme, meteorolojik gözlemleri sunma, FIRMS kayıtlarını işleme ve veri hattını çalıştırma amacıyla kullanılan araştırma aracıdır. Arayüzdeki rüzgâr akışı meteorolojik gözlemi gösterir. Basitleştirilmiş yangın senaryosu eğitim amaçlı varsayımsal görselleştirmedir; fiziksel yangın yayılım modeli değildir.

Cezayir'deki 2012 UCI veri kümesinden gelen Random Forest modeli Trakya'da doğrulanmış değildir. YOLO arayüzünün veya API isteğinin çalışması, yangın/duman algılama başarısını kanıtlamaz. Bu bileşenlerin sonuçları Trakya için bağımsız etiketli veriyle doğrulanmadan proje başarısı olarak ileri sürülmemelidir.

## 8. Etik, güvenlik ve veri sorumluluğu

- Araştırma açık ve hukuken kullanılabilir çevresel veriyle yürütülmelidir.
- İnsanlara ait görüntü, plaka, yüz, özel mülk veya hassas konum bilgisi toplanmamalıdır.
- İHA, kamera veya saha gözlemi eklenecekse gerekli izinler, danışman gözetimi ve veri koruma koşulları önceden değerlendirilmelidir; bu taslak için bunlar zorunlu değildir.
- Öğrenciler yangın alanına yaklaşmamalı, yangın deneyi yapmamalı ve acil durum ekiplerinin görevini taklit etmemelidir.
- Uygulama resmî uyarı, tahliye rotası veya acil müdahale kararı vermez.
- İnsan katılımcılarla anket/görüşme yapılması planlanırsa ilgili izin ve gönüllü katılım/onam koşulları baştan incelenmelidir.
- Proje raporu öğrencilerin kendi anlayışı ve çalışmasıyla hazırlanmalı; kullanılan kaynaklar ve varsa yapay zekâ destekli araç kullanımı yarışma rehberindeki beyan koşullarına uygun biçimde açıklanmalıdır.

## 9. Çalışma takvimi

| Tarih | İş paketi | Tamamlanma kanıtı |
|---|---|---|
| 1–7 Kasım 2026 | Araştırma sorusu, danışman görüşü, kaynak ve yöntem kesinleştirme | Onaylanmış yöntem notu |
| 8–20 Kasım | Pilot alanların seçimi ve gerekçelerinin kaydı | Koordinat ve kaynak metaverisi |
| 21 Kasım–5 Aralık | Meteoroloji/FIRMS veri toplama ve kalite kontrol | Ham veri, SHA-256, veri kalite raporu |
| 6–15 Aralık | İstatistiksel analiz ve grafikler | Tekrarlanabilir analiz çıktıları |
| 16–22 Aralık | Sonuçların sınırlılıklarla yorumlanması | Bulgular ve tartışma taslağı |
| 23–29 Aralık | Rapor, kaynakça ve danışman incelemesi | Rehbere göre rapor taslağı |
| 30 Aralık–3 Ocak 2027 | Son kontrol ve başvuru dosyası | Tamamlanmış ve kontrol edilmiş dosya |
| 4 Ocak 2027 | TÜBİTAK başvurusu için son tarih | TYBS başvuru onayı |

Takvim, verinin erişilebilirliği ve danışman geri bildirimine göre gerçekçi biçimde güncellenmelidir. Başvuru son gününe kadar tamamlanmayan çalışma, tamamlanmış proje gibi sunulmamalıdır.

## 10. Beklenen çıktı

1. Kaynakları ve lisans bilgileri kayıtlı, tekrarlanabilir Trakya pilot veri kümesi.
2. Veri kalitesi ve eksik gözlemleri gösteren rapor.
3. Meteorolojik değişkenler ile FIRMS termal anomali vekil kayıtlarının ilişkisini gösteren grafik ve istatistikler.
4. Kullanılan yöntemleri yeniden çalıştırmaya yarayan kod ve açıklamalar.
5. Sınırlılıkları, belirsizlikleri ve sonraki araştırma adımlarını açıklayan öğrenci araştırma raporu.

Bu bölüm beklenen çıktıları tanımlar; henüz elde edilmemiş bulguları veya başarıyı ifade etmez.

## 11. Kaynaklar

- TÜBİTAK, 2204-A Lise Öğrencileri Araştırma Projeleri Yarışması, 2026–2027 çağrısı ve proje rehberi: https://tubitak.gov.tr/tr/yarismalar/2204-lise-ogrencileri-arastirma-projeleri-yarismasi
- NASA Fire Information for Resource Management System (FIRMS): https://firms.modaps.eosdis.nasa.gov/
- Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api
- Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu/
- UCI Algerian Forest Fires Dataset: https://archive.ics.uci.edu/dataset/547/algerian+forest+fires+dataset
- Depo içi bilimsel durum ve doğrulama planı: [SCIENTIFIC_STATUS.md](SCIENTIFIC_STATUS.md)
- Trakya veri kümesi protokolü: [THRACE_DATASET_PROTOCOL.md](THRACE_DATASET_PROTOCOL.md)
- Araştırma model kartı: [ML_MODEL_CARD.tr.md](ML_MODEL_CARD.tr.md)

---

## Başvuru öncesi tamamlanması gerekenler

- [ ] Danışmanla ana alan ve tematik alanın rehbere göre kesinleştirilmesi
- [ ] Pilot alanların bilimsel gerekçeyle seçilmesi; il merkezi test koordinatlarının araştırma örneklemi olarak kullanılmaması
- [ ] Veri indirme ve kalite kontrolünün tamamlanması
- [ ] FIRMS vekil etiketlerinin sınırlılıklarının raporda korunması
- [ ] Kronolojik test döneminin önceden sabitlenmesi
- [ ] Analizlerin yeniden çalıştırılabilir biçimde saklanması
- [ ] Gerçek bulgular, olumsuz sonuçlar ve sınırlılıkların yazılması
- [ ] Öğrencinin raporun her yöntemini ve kodunu açıklayabilecek düzeyde anlaması
- [ ] TÜBİTAK'ın güncel şablonu, izin/onam ve beyan koşullarının kontrol edilmesi
