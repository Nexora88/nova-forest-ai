# 🌲 NexoraWildfire AI

**Nexora çatısı altında geliştirilen çevresel istihbarat ve karar destek sistemi.**

NexoraWildfire AI; orman, tarım, su-toprak, arıcılık, polen ve çevresel risk göstergelerini aynı operasyon ekranında birleştiren **PWA + offline-first** bir saha ürünüdür. Amaç yalnızca bir risk haritası göstermek değil, gerçek veri kaynaklarını anlaşılır sinyallere dönüştürmektir.

## Sistem ne yapıyor?

NexoraWildfire AI mevcut verileri kullanıcı kararlarına yaklaşan bir hiyerarşide işler:

**İl → İlçe → Köy/Mahalle → Alan → çevresel gözlem → risk/sinyal → karar desteği**

Ana panelde Trakya odaklı çevresel durum görünür. Harita katmanları ve mevcut analiz panelleri üzerinden kullanıcı; yangın/çevre riski, orman sağlığı, tarım koşulları, toprak nemi, sulama ihtiyacı, polen ve arıcılık uçuş koşullarını inceleyebilir.

İlk ürünleşme sahası **Edirne**'dir. İlçe ve köy/mahalle seviyesine inilerek gerçek yerleşim verileriyle saha görünümü oluşturulur. Kullanıcı kendi tarla, arılık veya orman alanını **Alanlarım** bölümünde kaydedebilir.

## Karar destek mantığı

Sistem tek bir “AI skoru” üretip sonucu kesin gerçek gibi sunmaz. Farklı çevresel göstergeler birlikte değerlendirilir ve kullanıcıya **risk, durum, uyarı ve koşul** sinyalleri gösterilir.

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
Sıcaklık, nem, rüzgar, bitki stresi ve çevresel koşullar üzerinden risk değerlendirmesi yapılır. Sentinel-2 ve FIRMS entegrasyonları gerçek veri erişimi yapılandırıldığında genişletilebilir.

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
