# NexoraWildfire AI

**Deneysel, çevrimdışı öncelikli çevresel istihbarat ve karar destek platformu.**

NexoraWildfire AI; orman yangını farkındalığı, tarım, su ve toprak, arıcılık, polen ve ekosistem izleme için mevcut çevresel gözlemleri anlaşılır hale getirmeyi amaçlar. İlk pilot bölge **Trakya, Türkiye**'dir; mimari, küresel koordinatlarla çalışabilecek şekilde geliştirilmektedir.

[English README](README.md) · [AI destekli geliştirme beyanı](AI_ASSISTED_DEVELOPMENT.md) · [Küresel ölçeklenebilirlik](docs/GLOBAL_SCALABILITY.md) · [Katkı rehberi](.github/CONTRIBUTING.md)

## Mevcut yetenekler

- PWA desteği ve çevrimdışı öncelikli uygulama kabuğu.
- Leaflet tabanlı harita, idari geometriler, kaydedilen saha alanları ve çevresel katmanlar.
- Servis erişilebilir olduğunda hava durumu ve çevresel göstergeler.
- Orman yangını farkındalığı, tarım, arıcılık, polen ve uydu verisi keşfi için saha ekranları.
- Risk, hava, uydu, bildirim ve ML uçları sunan isteğe bağlı FastAPI backend.
- Türkçe/İngilizce arayüz değiştirme düğmesi.
- Kaliforniya Napa Vadisi yakınında örnek GeoJSON poligonu çizen ve Open-Meteo üzerinden güncel hava durumu isteyen küresel koordinat demosu.

## Küresel ölçeklenebilirlik

> Sistem şu anda bir pilot bölgede (Trakya/Türkiye) canlı olarak test edilmektedir. NASA FIRMS, Copernicus ve Open-Meteo gibi bazı veri kaynakları küresel veya çok bölgeli kapsama sahip olduğundan, mimari Kaliforniya veya Yunanistan gibi başka bölgelerin geçerli GeoJSON ve koordinatlarını harita geometrisini yeniden yazmadan kabul edecek şekilde tasarlanmaktadır.

Bu ifade mimari hedefi anlatır; her sağlayıcının veya analiz uç noktasının dünyadaki her bölgede doğrulandığı anlamına gelmez. Sağlayıcı kapsamı, API anahtarları, lisanslar, hız sınırları ve yerel model kalibrasyonu ayrıca doğrulanmalıdır.

## Makine öğrenmesi durumu

Depoda isteğe bağlı bir Random Forest eğitim ve çıkarım hattı bulunur. Ancak yalnızca kodun mevcut olması, eğitilmiş modelin üretimde olduğu anlamına gelmez.

- GET /ml/status model artefaktı ve metaverisinin bulunup bulunmadığını bildirir.
- POST /ml/predict geçerli bir eğitilmiş model gerektirir; model hazır değilse tahmin yerine açık bir hazır değil yanıtı döndürür.
- backend/scripts/train_fire_model.py belgelenmiş gerçek etiketli veri ister ve kronolojik test kümesinde değerlendirme yapar.
- Sentetik etiketlerle model hazırmış gibi gösterilmez.
- Gerçek eğitim çalışması üretmedikçe doğruluk veya operasyonel başarı iddia edilmez.

Kural tabanlı çevresel gösterge, makine öğrenmesi tahmini değildir. Sistem deneysel karar desteğidir; resmî yangın alarmı veya acil durum kurumlarının yerine geçmez.

## Veri kaynakları

Yapılandırmaya ve servis erişimine bağlı olarak Open-Meteo, OpenStreetMap/Nominatim, Copernicus Sentinel-2/CDSE ve geçerli backend FIRMS_MAP_KEY ayarlandığında NASA FIRMS/VIIRS kullanılabilir. Eksik anahtar veya başarısız istek sıfır risk anlamına gelmez. NASA GIBS altlık görüntüsü, işlenmiş Sentinel-2 NDVI ürünüyle aynı şey değildir.

## Backend'i yerel çalıştırma

Python 3.11 veya üzeri önerilir.

~~~
cd backend
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
~~~

Sağlık kontrolü: http://127.0.0.1:8000/health  
API belgeleri: http://127.0.0.1:8000/docs

## AI destekli geliştirme ve katkı

LLM ve AI kodlama araçları uygulama, hata ayıklama, dokümantasyon ve test tasarımı süreçlerinde üretkenlik yardımcısı olarak kullanılır. Mimari, ürün kararları, kaynak incelemesi ve doğrulama sorumluluğu geliştiricide kalır. Ayrıntılar için AI_ASSISTED_DEVELOPMENT.md dosyasına bakın.

Katkılar memnuniyetle karşılanır. Gerçek dışı veri ve metrik eklemeyin; değişikliklerle birlikte tekrarlanabilir test veya manuel test adımları sağlayın.

## Geliştirici

**Ahmet Eymen Bakraç** · Nexora / Nexora88 · 2026

## Önemli sınırlama

NexoraWildfire AI geliştirilmekte olan bir araştırma ve karar destek projesidir. Resmî uyarı sistemi değildir, yangını kesin olarak tahmin etmeyi garanti etmez ve yerel kurumların, uzman değerlendirmesinin veya acil durum prosedürlerinin yerini almamalıdır.


## Araştırma amaçlı makine öğrenmesi prototipi

UCI Algerian Forest Fires veri setiyle yeniden üretilebilir bir Random Forest araştırma modeli eğitilmiştir. Coğrafi ayırımlı test metrikleri ve sınırlamalar [model kartında](docs/ML_MODEL_CARD.md) belgelenmiştir. 2012 tarihli küçük Cezayir veri seti **Trakya/Türkiye için doğrulanmamıştır** ve operasyonel yangın tahmini değildir. Dokuz özellikli, yedi günlük ayrı model; uygun etiketli geçmiş veri toplanana kadar tahmin üretmez.
