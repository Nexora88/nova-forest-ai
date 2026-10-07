# 🌲 Nova-Forest AI

**Nexora çatısı altında çevresel istihbarat ve karar destek ürünü.**

Nova-Forest AI; tarım, orman, arıcılık, su-toprak, polen ve çevresel riskleri tek bir saha ekranında birleştiren **PWA + offline-first** bir çevresel istihbarat platformudur.

## Ürün yaklaşımı

Nova-Forest'ın temel hiyerarşisi:

**İl → İlçe → Köy/Mahalle → Alan → Uydu zaman serisi → Bitki stresi → Su/Sulama → Ürün/bitki sınıfı**

İlk ürünleşme sahası **Edirne**'dir. İlçe seviyesinden köy/mahalle seviyesine inilir. Yerleşim noktaları gerçek OpenStreetMap/Nominatim verilerinden alınır ve seçilen çevresel katmana göre renklendirilir.

Kullanıcı kendi tarla, arılık veya orman alanını **Alanlarım** olarak kaydedebilir. Kişisel alanlar çevresel katmanlardan ayrı, mor neon ile gösterilir.

## Nexora / Nova-Forest EDGE

- PWA olarak cihaza kurulabilir.
- IndexedDB yerel veri deposu kullanır.
- Servis çalışanı ile uygulama kabuğu çevrimdışı açılabilir.
- Son geçerli gözlemlerle yerel karar destek motoru çalışabilir.
- Yerel Nova-Alert merkezi tarayıcı bildirimi ve uygulama içi bildirim üretir.
- Güncelleme hazır olduğunda uygulama içinden yeni sürüm alınabilir.
- Mobil ekranlara uyumludur.

> Çevrimdışı mod yeni internet verisi ürettiğini iddia etmez. Son geçerli veriyi kullanır ve açıkça **karar destek** olarak etiketler.

## Veri kaynakları

- **Open-Meteo:** sıcaklık, nem, rüzgar, yağış, toprak nemi, ET₀ ve VPD.
- **OpenStreetMap / Nominatim:** ilçe altındaki köy/mahalle yerleşim noktaları.
- **Copernicus Sentinel-2:** gerçek NDVI/NDMI zaman serisi altyapısı; CDSE kimlik bilgileri yapılandırıldığında kullanılır.
- **NASA FIRMS / VIIRS:** yapılandırılmış API anahtarı olduğunda sıcak nokta gözlemleri.

Üretilmemiş uydu veya yangın verisi sahte değerlerle doldurulmaz.

## Harita katmanları

- 🔥 Çevre / yangın riski
- 🌲 Orman sağlığı
- 💧 Su / toprak nemi
- 🌾 Tarım koşulu
- 🌼 Polen

Harita renkleri seçilen katmana göre değişir. Polen rengi bitki sağlığı anlamına gelmez. Köy/mahalle noktaları parsel veya mülkiyet sınırı değildir.

## Bildirim sistemi

**Nova-Alert** yerel uyarı merkezidir. Alanlardaki canlı veya çevrimdışı karar destek sinyalleri IndexedDB'ye kaydedilir. Tarayıcı izin verdiğinde sistem bildirim gönderebilir; ayrıca uygulama içi bildirim kartı gösterilir.

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

## Ürün vizyonu

Nova-Forest AI, yalnızca bir web sitesi değil; sahada kullanılabilecek dayanıklı bir çevresel karar destek ürünüdür. Sonraki fazlarda seçili bölgeler için gerçek offline vector map paketleri ve cihazlar arası veri senkronizasyonu planlanmaktadır.

## Geliştirici

**Ahmet Eymen Bakraç**
**Nexora / Nexora88**
2026
