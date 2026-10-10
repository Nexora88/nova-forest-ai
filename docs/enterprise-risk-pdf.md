# NexoraWildfire AI — Kurumsal varlık risk PDF raporu

## Kapsam
Kurumsal rapor akışı GeoJSON varlıklarını (iletim hattı, trafo merkezi, RES türbini) alır; seçilen tamponu metre cinsinden UTM koordinatlarında üretir ve uzun işlemleri Vercel dışındaki Docker/RQ worker kuyruğuna gönderir. PDF özel Supabase Storage alanına yüklenir ve 15 dakikalık imzalı URL ile indirilir.

## PDF bölümleri
- Varlık özeti, varlık geometrisi ve tampon alanı açıklaması
- Copernicus Sentinel-2 L2A NDVI/NDMI zaman serisi (CDSE erişimi varsa)
- NASA FIRMS/VIIRS son 10 günlük sıcak nokta akışı (MAP_KEY ve kaynak erişimi varsa)
- OpenStreetMap etiketli itfaiye istasyonu ve OSRM yaklaşık yol mesafesi (servisler erişilebilirse)
- Open-Meteo günlük hava tahmini (en çok 16 gün)
- Kaynak durumu, veri boşlukları ve saha doğrulaması gereken aksiyon önerileri

## Bilinçli sınırlamalar
- Beş yıllık FIRMS arşiv sayısı bu ilk sürümde üretilmez; PDF'de unavailable olarak gösterilir. Son 10 günlük akış geçmiş beş yılın yerine geçmez.
- Open-Meteo günlük tahmini 16 günle sınırlıdır. Üç aylık meteoroloji tahmini varmış gibi gösterilmez; mevsimsel model entegrasyonu eklenene kadar unavailable yazılır.
- Uydu istatistiği için tampon geometrisinin sınırlayıcı dikdörtgeni kullanılır. Bu, hassas mühendislik/GIS tampon kesişimi veya mülkiyet/parsel sınırı değildir.
- OSM istasyon/yol verisi eksik olabilir; tahmini sürüş süresi müdahale garantisi değildir.
- Eğitilmiş ve bağımsız test edilmiş model bulunmadıkça ML yangın olasılığı rapora eklenmez. Kural tabanlı meteorolojik indeks olasılık gibi adlandırılmaz.
- Rapor bir mühendislik uygunluk raporu veya acil durum planının yerine geçmez.

## Yapılandırma

### Vercel backend ortamı
- NEXORA_ENTERPRISE_USER_IDS: virgülle ayrılmış, kurumsal rapor yetkisi verilmiş Supabase kullanıcı UUID'leri. Bu ilk sürümde ödeme entegrasyonu olmadığı için yetki yalnızca sunucu tarafı allowlist ile verilir.
- NEXORA_WORKER_URL
- NEXORA_WORKER_TOKEN
- SUPABASE_URL
- SUPABASE_ANON_KEY veya SUPABASE_PUBLISHABLE_KEY

### Ayrı Docker worker ortamı
Mevcut backend/.env.worker.example değerlerine ek olarak:
- FIRMS_MAP_KEY
- CDSE_CLIENT_ID ve CDSE_CLIENT_SECRET
- SUPABASE_URL
- SUPABASE_ADMIN_KEY
- NEXORA_ARTIFACT_BUCKET (özel bucket; varsayılan nexora-job-artifacts)

Supabase Storage bucket özel tutulmalı; raporlar herkese açık URL ile sunulmamalıdır. Worker'a yalnızca NEXORA_WORKER_TOKEN üzerinden erişim verin.

## API
- POST /api/enterprise/reports — giriş + kurumsal allowlist gerektirir, 202 ile görev kimliği döndürür.
- GET /api/enterprise/reports/{job_id} — aynı kullanıcıya ait görevin durumunu ve tamamlanınca kısa süreli PDF bağlantısını döndürür.

## Ön yüz
Ana paneldeki Kurumsal Analiz bölümü, GeoJSON dosyası ve varlık bilgilerini gönderir. Ödeme sağlayıcısı veya otomatik abonelik doğrulaması bu sürümde yoktur; ücretli erişim için önce kullanıcı allowlist'i manuel yönetilir.
