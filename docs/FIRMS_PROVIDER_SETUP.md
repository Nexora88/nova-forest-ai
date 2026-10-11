# NASA FIRMS canlı yangın sıcak noktaları — sağlayıcı kurulumu

NexoraWildfire AI, Trakya pilot kutusu için backend `GET /satellite/firms?days=1` uç noktasını ve haritadaki **NASA FIRMS · Sıcak noktalar** katmanını kullanır. Katman, API anahtarı veya sağlayıcı yanıtı geçersizse bunu açıkça gösterir; bu durumları “0 yangın” olarak göstermemelidir.

## 1. Resmî API anahtarı talebi

- NASA FIRMS ana sayfası: https://firms.modaps.eosdis.nasa.gov/
- FIRMS API / Area API rehberi ve Map Key bilgisi: https://firms.modaps.eosdis.nasa.gov/api/area/
- FIRMS API kullanım belgesi: https://firms.modaps.eosdis.nasa.gov/api/area/

Proje sahibinin kendi e-posta adresiyle resmî sayfadaki anahtar talebi adımını tamamlaması gerekir. Açıklama örneği: “Student-led academic research project for a wildfire-risk decision-support prototype focused on Türkiye's Thrace region. The key will be used server-side to query NASA FIRMS active-fire hotspot observations.” Başvuru için gerekli e-posta/kimlik bilgileri kullanıcıya aittir; bu depo içinde veya sohbette paylaşılmamalıdır.

## 2. Anahtarı sunucuya ekleme

Vercel backend projesinin **Production** ve gerekiyorsa **Preview** ortamlarında Environment Variables bölümüne:

- `FIRMS_MAP_KEY` = NASA FIRMS'in verdiği anahtar

ekle. Yeniden deploy et. Anahtarı HTML/JavaScript dosyasına, Git commit'ine, README'ye, issue'ya veya ekran görüntüsüne koyma. `.env.example` yalnızca boş yer tutucu içermelidir.

## 3. Sağlayıcıyı kontrol et

1. `GET /satellite/providers/status?probe=true` isteğinde `providers.nasa_firms.status` değerinin `authorized` olduğunu doğrula.
2. `GET /satellite/firms?days=1` isteğinde `status=available`, `checked_at_utc`, `bbox` ve `alert_count` alanlarını kontrol et.
3. Haritada NASA FIRMS katmanını aç; sıcak noktaların koordinatlarını ve alım tarih/saatini kontrol et.
4. Anahtar yoksa `not_configured`; geçersiz/boş CSV veya sağlayıcı hatasında `error` beklenir. Bu durumlarda `alert_count=null` kalmalı; `0` gösterilmemeli.
5. `available` ve `alert_count=0` olsa bile bu yalnızca sorgulanan ürünün zaman/coğrafi kapsamasında algılama olmadığını söyler; sıfır yangın riski garantisi değildir.

## 4. Üretim öncesi kontrol listesi

- [ ] Secret yalnızca server-side ortam değişkeninde.
- [ ] Provider status probe `authorized`.
- [ ] Trakya koordinat kutusu ve tarih kapsamı doğrulandı.
- [ ] Sağlayıcı hatası ve geçersiz yanıt için testler geçti.
- [ ] Haritada kaynak, sorgu zamanı ve algılama sınırları kullanıcıya açık.
- [ ] NASA FIRMS hotspot'ları “doğrulanmış yangın” diye etiketlenmiyor.
