# 🌲 NexoraWildfire AI

**Nexora çatısı altında geliştirilen çevresel istihbarat ve karar destek sistemi.**

NexoraWildfire AI; orman, tarım, su-toprak, arıcılık, polen ve çevresel risk göstergelerini aynı operasyon ekranında birleştiren **PWA + offline-first** bir saha ürünüdür. Amaç yalnızca bir risk haritası göstermek değil, gerçek veri kaynaklarını anlaşılır sinyallere dönüştürmektir.

## Sistem ne yapıyor?

NexoraWildfire AI mevcut verileri kullanıcı kararlarına yaklaşan bir hiyerarşide işler:

**İl → İlçe → Köy/Mahalle → Alan → çevresel gözlem → risk/sinyal → karar desteği**

Ana panelde Trakya odaklı çevresel durum görünür. Harita katmanları ve mevcut analiz panelleri üzerinden kullanıcı; yangın/çevre riski, orman sağlığı, tarım koşulları, toprak nemi, sulama ihtiyacı, polen ve arıcılık uçuş koşullarını inceleyebilir.

İlk ürünleşme sahası **Edirne**'dir. İlçe ve köy/mahalle seviyesine inilerek gerçek yerleşim verileriyle saha görünümü oluşturulur. Kullanıcı kendi tarla, arılık veya orman alanını **Alanlarım** bölümünde kaydedebilir.

## Karar destek mantığı

Mevcut hava/çevre motoru şeffaf, kural tabanlı karar desteğidir; tek başına makine öğrenmesi modeli değildir. Ayrı bir Random Forest eğitim ve çıkarım hattı eklendi. Model, yalnızca doğrulanmış ve etiketli gerçek veriyle eğitilip artefaktı bulunduğunda tahmin üretir; eğitim yapılmadıysa `/ml/status` `not_trained` döndürür ve `/ml/predict` 503 verir. Bu ayrım, kural skorlarının yapay zekâ diye sunulmasını engeller.

Önemli girdiler:

- Sıcaklık, bağıl nem ve rüzgar
- Yağış ve toprak nemi
- ET₀ ve VPD gibi su/atmosfer göstergeleri
- Bitki stresi için NDVI/NDMI altyapısı
- Uydu gözlemleri
- Polen ve hava kalitesi sinyalleri
- Yapılandırıldığında NASA FIRMS / VIIRS sıcak nokta gözlemleri

Üretilmemiş uydu, yangın veya model başarım verisi sahte değerlerle doldurulmaz. Sistem mevcut veri durumunu açıkça belirtir.

## Mevcut ana modüller

### 🌲 Orman / yangın
Sıcaklık, nem, rüzgar, bitki stresi ve çevresel koşullar üzerinden risk değerlendirmesi yapılır. CDSE STAC kataloğunda gerçek Sentinel-2 sahne keşfi kimlik bilgisi olmadan yapılabilir. Alan bazlı işlenmiş NDVI/NDMI istatistikleri ve risk rasterı için CDSE istemci kimlik bilgileri gerekir. NASA FIRMS sıcak nokta sorguları için geçerli MAP_KEY gerekir; anahtar veya gözlem yokluğu “yangın yok” anlamına gelmez.

### 🌾 Tarım istihbaratı
Toprak nemi, yağış, ET₀, sıcaklık ve VPD göstergeleri sulama ve tarla çalışması için erken karar destek sinyallerine dönüştürülür.

### 🐝 Nova-Bee
Sıcaklık, rüzgar, yağış ve polen koşullarını birlikte değerlendirerek arıcılık için bölgesel uçuş koşulu göstergesi sağlar.

### 🌼 Polen & hava
CAMS tabanlı atmosfer/polen sinyalleri çevresel farkındalık için izlenir. Polen göstergesi bitki sağlığının kesin ölçümü olarak yorumlanmaz.

## Harita

Leaflet tabanlı operasyon haritası Türkiye ve Trakya odaklı katmanları gösterir. İl ve ilçe geometrileri yerel GeoJSON ile çalışabildiği için temel harita yapısı bağlantı kesildiğinde de açılabilir.

Harita katmanları:

- 🔥 Çevre / yangın riski
- 🌲 Orman sağlığı
- 💧 Su / toprak nemi
- 🌾 Tarım koşulu
- 🌼 Polen

Köy/mahalle noktaları parsel veya mülkiyet sınırı değildir; yalnızca çevresel analiz için referans yerleşim noktalarıdır.

## NexoraWildfire EDGE

- PWA olarak kurulabilir.
- IndexedDB yerel veri deposu kullanır.
- Servis çalışanı uygulama kabuğunu çevrimdışı açabilir.
- Son geçerli gözlemlerle yerel karar destek motoru çalışabilir.
- Nova-Alert yerel bildirim merkezi olarak görev yapar.
- Güncelleme hazır olduğunda uygulama içinden yeni sürüm alınabilir.
- Mobil ekranlara uyumludur.

> Çevrimdışı mod yeni internet verisi ürettiğini iddia etmez. Son geçerli veriyi kullanır ve açıkça karar destek olarak etiketler.

## Veri kaynakları

- **Open-Meteo:** sıcaklık, nem, rüzgar, yağış, toprak nemi, ET₀ ve VPD.
- **OpenStreetMap / Nominatim:** ilçe altındaki köy/mahalle yerleşim noktaları.
- **Copernicus Sentinel-2:** gerçek NDVI/NDMI zaman serisi altyapısı; CDSE erişimi yapılandırıldığında kullanılır.
- **NASA FIRMS / VIIRS:** API erişimi yapılandırıldığında sıcak nokta gözlemleri.

## Sistem hakkında

NexoraWildfire AI'nin sistem sayfasında ürünün teknik yaklaşımının yanında çevre, üretim ve kırsal yaşam odağı da açıkça anlatılır. Atatürk'ün “Köylü milletin efendisidir.” sözü, projenin orman yangınlarının tarım alanları ve üreticinin emeği üzerindeki etkisini de dikkate alan toplumsal misyonunu anlatmak için kullanılır.

Bu ifade tarihsel bir alıntıdır; sistem herhangi bir siyasi amaç taşımaz. Projenin amacı çevresel verileri anlaşılır karar desteğine dönüştürmektir.

## Backend

`backend/` altında FastAPI servisi bulunur.

```bash
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

Önemli uçlar:

- `/health`
- `/risk-analysis`
- `/satellite/status`
- `/weather`
- `/forecast-risk`
- `/ndvi/status/{region}`
- `/ndvi/area-timeseries`
- `/notifications/status`

## Ürün hedefi

NexoraWildfire AI'yi özellik listesi şişen bir demo yerine, mevcut modülleri daha doğru veri, daha iyi açıklama ve daha güvenilir karar desteğiyle geliştirmek temel yaklaşımdır. Yeni bir özellik ancak mevcut sistemi anlamlı biçimde güçlendiriyorsa eklenir.

Sonraki geliştirmelerde öncelik; gerçek veri erişimlerinin sağlamlaştırılması, mevcut tahmin/risk mantığının açıklanabilirliğinin artırılması, harita katmanlarının doğruluğunun yükseltilmesi ve saha kullanımının iyileştirilmesidir.

## Geliştirici

**Ahmet Eymen Bakraç**  
**Nexora / Nexora88**  
2026


## Vercel üretim mimarisi

Bu depo statik arayüz + FastAPI backend'i aynı Vercel projesinde tutacak şekilde yapılandırılmıştır. Vercel ayarlarında Root Directory repository root (./) kullanılmalıdır. Services erişimi açıksa Framework Preset: Services seçilir; Build Command ve Output Directory elle değiştirilmez. Depodaki vercel.json web servisini kökte, FastAPI servisini backend/ altında tanımlar ve /api/* isteklerini backend'e yönlendirir.

### Nova-Alert bildirim mimarisi

Bildirimler GitHub Pages'a bağlı değildir. Vercel sürümünde tarayıcı bildirimi ve Web Push aboneliği aynı NexoraWildfire alan adı üzerindeki /api/notifications/* backend uçlarına gider. VAPID özel anahtarı, Supabase admin anahtarı ve diğer gizli değerler yalnızca Vercel backend ortam değişkenlerinde tutulmalıdır; frontend'e yazılmamalıdır.

Vercel Functions kalıcı bir süreç değildir. Bu nedenle backend içindeki sonsuz asyncio worker döngüsü kaldırıldı. Abonelik ve test bildirimi istek-temelli çalışır; periyodik risk taraması için kalıcı bir scheduler gerektiğinde Vercel Cron (plan sınırları dahilinde) veya Supabase pg_cron + pg_net kullanılmalıdır. Böylece bildirim motoru GitHub Actions gibi frontend barındırma katmanına bağımlı kalmaz.

### Üretim doğrulama ilkeleri

- Gerçek model değerlendirmesi olmadan doğruluk/F1 gibi metrikler uydurulmaz.
- Canlı veri ile simülasyon açıkça ayrılır.
- PWA servis worker önbelleği sürümlenir; kritik yeni görseller shell'e dahil edilir.
- Tek resmi NexoraWildfire logosu kullanılır; dinamik marka enjeksiyonu mevcut brand-lockup varsa ikinci logo üretmez.


## Ürünleşme notları · 10 Ekim 2026

### Hesap ve kimlik
- Supabase Auth üzerinden e-posta/parola ile giriş, hesap oluşturma ve parola sıfırlama akışı arayüzü.
- Google OAuth ve telefon OTP ekranları mevcut; Google OAuth istemci bilgileri / yönlendirme URL'leri ile SMS sağlayıcısı Supabase Auth panelinde yapılandırılmalıdır.
- Acil durum haritası ve çevresel veri görüntüleme giriş yapmayı zorunlu tutmaz. Buluta alan kaydetme ve özel mesajlar hesap gerektirir.

### Özel mesajlar
- `pages/messages.html` saha kullanıcı adıyla kişi bulma, konuşma açma, mesaj gönderme ve gelen kutusu ekranını içerir.
- `supabase/migrations/20261010000000_private_messages.sql` konuşma, katılımcı, dizin ve mesaj tablolarını RLS ile kurar.
- Mesajlar yalnızca katılımcılara açılır; e-posta/telefon dizinde gösterilmez. Realtime kullanılamazsa arayüz periyodik yenilemeyle çalışır.
- Mesajlar uçtan uca şifrelenmiş değildir; hassas kişisel veri veya acil durum bilgileri paylaşılmamalıdır.

### Ücretsiz / anahtarsız harita katmanları
- **Altlık haritalar:** OpenStreetMap, CARTO Dark, CARTO Light, OpenTopoMap, HOT Humanitarian ve Esri World Imagery.
- **NASA GIBS:** MODIS gerçek renkli uydu görüntüsü (güncel olmayabilir; sahne tarihi harita katmanında seçilir).
- **Open-Meteo:** Trakya ve yakın çevre için sıcaklık, nem, rüzgar ve yağış göstergeleri.
- **Open-Meteo Air Quality / CAMS:** PM2.5, PM10, ozon, UV ve mevcut saatlik polen tahmini.
- **Open-Meteo Marine:** seçili kıyı noktalarında dalga yüksekliği/periyodu.
- **Open-Meteo Elevation:** örnek noktaların arazi yükseltisi.
- **USGS Earthquake Hazards Program:** küresel son 7 günlük deprem gözlemleri.
- Bu servislerin ücretsiz kullanımı hizmet şartları, atıf ve hız sınırlarına tabidir. Katmanlar kaynak erişilemediğinde boş kalabilir; resmi afet alarmı yerine geçmez. NASA GIBS katmanı Sentinel-2/NDVI ürünü değildir.

### Tohum puanı güvenliği
- `supabase/migrations/20261010010000_secure_seed_awards.sql` günlük ve özel gün ödüllerini Türkiye tarihine göre doğrular, alan puanını yalnızca kullanıcının kendi bulut alanına bağlar ve doğrulanmış rapor akışı kurulana kadar rapor ödülünü kapalı tutar.
- Supabase Auth sağlayıcıları, e-posta teslimatı, OAuth ve SMS gerçek kullanıcılarla test edilmeden “uçtan uca üretim doğrulaması tamamlandı” kabul edilmemelidir.


### Nova-Alert / Web Push security
- `/notifications/push/subscribe`, `unsubscribe` and `test` require a valid Supabase access token; each subscription is linked to its authenticated `user_id`.
- The push subscription table has owner-scoped RLS policies. The backend uses a server-only `SUPABASE_ADMIN_KEY`; never place that key in browser JavaScript or commit it.
- To enable actual background push delivery, configure `SUPABASE_ADMIN_KEY`, `VAPID_PRIVATE_KEY_B64`, and a matching `VAPID_PUBLIC_KEY` in the backend's Vercel Production environment, then redeploy. The current Vercel backend environment list has not exposed configured variables to this integration, so push delivery is not claimed as active.
- The generic `/notifications/send` route intentionally returns HTTP 501 rather than pretending to send a message. Risk evaluation remains a separate endpoint.


## Tahminleyici ML, uydu işleme ve ölçekleme

- `GET /ml/status`: gerçek model artefaktı ve eğitim metaverisini bildirir.
- `POST /ml/predict`: dokuz meteorolojik/uydu/geçmiş yangın girdisiyle eğitilmiş Random Forest modelinden 7 günlük deneysel olasılık ister; model yoksa 503 döner.
- `backend/scripts/train_fire_model.py`: yalnızca belgelenmiş gerçek etiketli CSV ile eğitim yapar; en az 500 satır ve her sınıfta 50 örnek ister, zamana göre ayrılmış test kümesinde metrik üretir. Sentetik eğitim verisi oluşturulmaz.
- CDSE STAC sahne keşfi ile CDSE Statistical/Process API üzerinden piksel işleme farklı durumlardır. Gerçek NDVI/NDMI için `CDSE_CLIENT_ID` ve `CDSE_CLIENT_SECRET` yalnızca sunucu ortamında tanımlanmalıdır.
- Vercel kısa API ve PWA katmanı olarak kalmalı. Büyük raster, çok bölgeli tarihsel analiz ve model eğitimi kuyruklu bir Docker worker/VPS veya yönetilen container hizmetine taşınmalıdır. Uygulama planı ve kabul testleri: [docs/AI-SATELLITE-AND-SCALING.md](docs/AI-SATELLITE-AND-SCALING.md).

Eğitim ortamı için `backend/requirements-ml.txt` kullanılır; bu ağır bilimsel bağımlılıklar varsayılan Vercel API bağımlılıklarına eklenmez. Model eğitilmeden, canlı CDSE işlem çıktısı doğrulanmadan veya FIRMS anahtarı yapılandırılmadan bunların üretimde aktif olduğu iddia edilmez.
