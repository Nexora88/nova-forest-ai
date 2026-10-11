# Çevrimdışı alan kaydı ve cihazlar arası eşitleme — kabul testi

Bu kontrol gerçek tarayıcıda yapılmalıdır. Kodun bulunması, canlı Supabase senkronizasyonunun başarıyla test edildiği anlamına gelmez.

## Test senaryosu

1. Uygulamayı HTTPS üzerinden Chrome/Edge'de aç ve test hesabıyla giriş yap.
2. DevTools → Application → IndexedDB altında uygulamanın yerel deposunu ve `areas` store'unu incele.
3. DevTools → Network → Offline seçeneğini aç veya cihazı uçak moduna al; sayfayı yenile.
4. Haritada 3 test alanı çiz (tarla, arılık, orman), ad ve ilçe verip kaydet.
5. Her alanın `nexorawildfire-my-areas-v1` localStorage kaydında ve IndexedDB `areas` deposunda yer aldığını kontrol et. Uygulamayı kapatıp aç; alanların durduğunu doğrula.
6. Network → Online yap. `nova:areas-synced` olayını ve Supabase `nexorawildfire_areas` tablosunu kontrol et.
7. Aynı hesaba başka cihaz/tarayıcıdan giriş yap. Üç alanın adı, koordinatı ve türünün geldiğini doğrula.
8. Silme ve yeniden yüklemeyi dene; yinelenen kopya oluşmamalı.
9. Supabase RLS'nin yalnız `auth.uid() = user_id` kayıtlarına erişim verdiğini doğrula.

## Kabul kriterleri

- Offline kaydetme internet isteği gerektirmemeli.
- Ağ yokken canlı veri diye gösterilmemeli; son veri zamanı veya "veri yok" açıkça yazmalı.
- Online olunca bekleyen kayıtlar yeniden denenmeli; başarısızlıkta yerel kopya korunmalı.
- Aynı alan tekrar eşitlenince duplicate üretmemeli.
- Başka hesap alan koordinatlarını okuyamamalı.
- Test cihazı, tarayıcı sürümü, tarih, commit ve beklenen/gerçek sonuç ile kaydedilmeli.
