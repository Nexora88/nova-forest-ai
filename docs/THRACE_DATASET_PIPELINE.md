# Trakya veri seti ve model doğrulama akışı

## Amaç ve kapsam

Bu deney, Edirne, Kırklareli ve Tekirdağ'ı kapsayan sabit bir Trakya pilotu için geçmiş uydu sıcak nokta göstergelerini ve aynı tarih/konumdaki geçmiş hava verisini bir araya getirir. İlk sürüm yalnızca hava özelliklerini kullanır. NDVI/NDMI henüz hesaplanmadığından bu değerler boş tutulur ve model girdisi yapılmaz.

**Etiketlerin sınırı:** NASA FIRMS thermal anomaly kaydı, doğrulanmış orman yangını olayı demek değildir. Negatif sınıf da “yangın olmadığı kanıtlandı” anlamına gelmez; yalnızca örnek konum/tarih için 1 km içinde FIRMS tespiti bulunmadığını ifade eder. Model bu nedenle “yangın olasılığı” değil, “FIRMS sıcak nokta göstergesi” için deneysel sınıflandırıcı olarak tanımlanır. Gerçek yangın doğrulaması için resmî olay kayıtları ve uzman incelemesiyle ayrı bir etiket katmanı gerekir.

## Veri kaynakları

- NASA FIRMS Area API: https://firms.modaps.eosdis.nasa.gov/api/area/
- Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api
- Hava modeli: ERA5-Land reanalysis. Bu, yerel meteoroloji istasyonu ölçümü değil, yeniden analiz verisidir.
- Saat dilimi: Europe/Istanbul.
- Kaydedilen birimler: sıcaklık °C, bağıl nem %, rüzgâr km/h, yağış mm, ET₀ mm, VPD kPa.

NASA FIRMS için ücretsiz MAP_KEY gerekir. Anahtar yalnızca ortam değişkeninde tutulmalı; GitHub'a, CSV'ye veya loglara eklenmemelidir.

## Veri üretimi

Komutları backend/ dizininden çalıştır:

1. Python bağımlılıklarını kur: pip install -r requirements.txt
2. NASA anahtarını geçerli terminal oturumuna tanımla. Örnek POSIX kabuğu: export FIRMS_MAP_KEY="...". Anahtarı dosyaya veya repoya yazma.
3. En az 5 yıllık uygun tarih aralığı seç; örnek komut:

   python scripts/build_thrace_dataset.py --start-date 2018-01-01 --end-date 2025-12-31 --output data/thrace_fire_dataset.csv --max-positive 500 --negatives-per-positive 1

4. İlk üretimde kaydedilen satır sayısını, atlanan eksik verileri ve veri kaynaklarını kontrol et. Betik gerçek API yanıtı alamazsa sentetik veriyle devam etmez.
5. CSV ve model artefaktlarını repoya otomatik ekleme. Gerekirse boyut, lisans ve gizlilik kontrolünden sonra ayrı bir veri sürümleme kararı al.

NASA API'nin tarihsel arşiv kapsamı ve kullanılabilir sensör tarihleri değişebileceğinden, istenen tüm tarih aralığının veri döndürdüğü varsayılmamalıdır. Betik NOAA-20/NOAA-21 VIIRS standard ürünlerini ister; kapsanmayan dönemler ayrıca belgelenmelidir.

## Özellikler

- temperature_max: olay günü maksimum sıcaklık, °C
- humidity_min: olay günü minimum bağıl nem, %
- wind_max: olay günü maksimum 10 m rüzgârı, km/h
- precipitation_sum: olay günü toplam yağış, mm
- et0: referans evapotranspirasyon, mm
- vpd_max: maksimum buhar basıncı açığı, kPa
- precipitation_previous_6d: olay gününden önceki altı günün toplam yağışı, mm
- ndvi_mean, ndmi_mean: henüz entegre edilmedi; boş kalır ve eğitimde kullanılmaz.

Geleceğe ait bilgi sızıntısını azaltmak için geçmiş yağış özelliği olay gününü içermez. Modelin hedefi, olay günündeki FIRMS tespitiyle ilişkilidir; bu, gelecekteki yangını önceden tahmin ettiğini kanıtlamaz.

## Model eğitimi ve değerlendirme

backend/ dizininden:

python scripts/train_fire_model.py --input data/thrace_fire_dataset.csv --model-output models/fire_risk.joblib --metadata-output models/fire_risk_metadata.json

Eğitim şu koşulları uygular:
- En az 100 tamamlanmış satır ve iki sınıf gerekir.
- Eğitim/test ayrımı satırları rastgele karıştırmak yerine tarihe göre yapılır.
- Test döneminde iki sınıf yoksa eğitim durur; sonuç uydurulmaz.
- Random Forest, yalnızca sınıf önceliğini kullanan temel sınıflandırıcıyla karşılaştırılır.
- Precision, recall, F1, karışıklık matrisi, ROC-AUC, Average Precision ve Brier skoru raporlanır.
- Ölçümler yalnızca FIRMS gösterge etiketine ilişkindir; doğrulanmış yangın tahmin başarısı olarak sunulamaz.

İlk pilot için örnek sayısı, pozitif/negatif sayıları, kapsanan yıllar, veri eksikleri, test dönemi ve her iki modelin metrikleri araştırma raporuna aynen aktarılmalıdır. Metrikler iyi görünse bile bağımsız yangın kayıtlarıyla doğrulama yapılmadan operasyonel uyarı iddiasında bulunulmaz.

## Bitki örtüsü verisi: sonraki aşama

Sentinel-2 NDVI/NDMI yalnızca tarihsel sahne, bulut/kalite maskesi ve gerekli bantlar doğrulanıp indeks gerçekten hesaplandıktan sonra eklenmelidir. Sahne bulunması, indeks hesaplanması ve geçerli piksel sayısı üç ayrı durum olarak kaydedilmelidir. İlk sürüm bu girdileri sıfırla doldurmaz.

## Sabit test noktaları

- Edirne: 41.6771, 26.5557
- Kırklareli: 41.7355, 27.2252
- Tekirdağ: 40.9780, 27.5110

Bunlar tekrar edilebilir test koordinatlarıdır; istasyon doğrulaması değildir. Veri hattı doğrulamasında her nokta için aynı tarih aralığı, kaynak zaman damgası, birimler, HTTP durumu ve eksik alanlar kaydedilmelidir.

## Kaynaklar

- NASA FIRMS Area API: https://firms.modaps.eosdis.nasa.gov/api/area/
- NASA FIRMS API kullanımı: https://firms2.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html
- Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api
