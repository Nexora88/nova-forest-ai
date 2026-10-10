# Kurumsal Varlık Raporu — Nova-Enterprise Report

## Akış ve sınırlar
- Kullanıcı, ana sayfadaki çizim haritasında bir elektrik hattını (LineString), türbin noktasını veya saha çokgenini çizer; alternatif olarak GeoJSON yükler.
- FastAPI oturum belirtecini Supabase Auth üzerinden doğrular ve yalnızca sunucu tarafında `NEXORA_ENTERPRISE_USER_IDS` ile yetkilendirilmiş hesapların işini kuyruğa alır.
- Redis/RQ işi ayrı Docker worker üzerinde yürütür. ReportLab PDF üretimi Vercel istek sürecinde çalışmaz.
- PDF, özel Supabase Storage bucket'ına yüklenir. Kullanıcıya 15 dakika geçerli imzalı indirme URL'i döner. Redis'e PDF baytları yazılmaz.
- DM geçmişi son 20 mesajla açılır; yukarı kaydırınca eski sayfalar çekilir. Gelen kutusu en fazla 50 konuşma ile sınırlıdır.
- Profil özeti tarayıcıda kullanıcı ID'siyle eşleşen, 10 dakika TTL'li cache'ten gösterilir; arka planda Supabase'den yenilenir. Oturum kapanınca cache temizlenir.

## PDF veri katmanları
- Copernicus Sentinel-2 L2A Statistical API: NDVI/NDMI zaman serisi. Tamponlanmış varlık geometrisi kullanılır; FIRMS alan sorgusu sınırlayıcı kutuyla yapılır.
- NASA FIRMS/VIIRS: yapılandırılmış MAP key varsa son 10 günlük akış. Beş yıllık arşiv bu sürümde üretilmiyor.
- Open-Meteo: kullanılabilir günlük tahmin penceresi (en çok 16 gün); üç aylık mevsimsel tahmin mevcut değil.
- OpenStreetMap/Overpass + OSRM: etiketlenmiş istasyon ve yaklaşık yol rotası; gerçek müdahale süresi garantisi değil.
- Eksik veya yapılandırılmamış kaynak “veri yok” olarak işaretlenir. Bu durum sıfır risk anlamına gelmez.

## Kurulum / erişim
Worker sunucusunda `backend/.env.worker.example` değerlerini gerçek ortam değişkenleriyle yapılandırın: `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`, `FIRMS_MAP_KEY`, `SUPABASE_URL`, `SUPABASE_ADMIN_KEY`, `NEXORA_ARTIFACT_BUCKET`, `NEXORA_WORKER_TOKEN`. Backend Vercel Production ortamına `NEXORA_WORKER_URL`, aynı `NEXORA_WORKER_TOKEN`, `SUPABASE_URL`, `SUPABASE_ANON_KEY` ve onaylı kurumsal kullanıcıların virgülle ayrılmış Supabase UUID'lerini içeren `NEXORA_ENTERPRISE_USER_IDS` eklenmelidir. Secret'ları Git'e veya istemci JavaScript'ine koymayın.

Bu sürümde ödeme sağlayıcısı, abonelik webhook'u ve e-posta servisi bağlı değildir; erişim manuel sunucu allowlist'iyle sınırlıdır. Ticari kullanımdan önce faturalandırma/abonelik doğrulaması, kullanım kotası, denetim kayıtları ve kurumsal sözleşme eklenmelidir.

## Model güvenliği
Random Forest yalnızca belgelenmiş gerçek etiketli eğitim CSV'si ve bağımsız zaman bazlı test mevcut olduğunda eğitilir. Eğitim artefaktı yoksa `/ml/status` `not_trained` döndürür ve API yüzde uydurmaz. Şu anki model betiği kronolojik holdout raporlar; coğrafi bağımsız test için konum bazlı holdout veri hazırlığı ayrıca gereklidir.
