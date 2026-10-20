# Nova-Alert: arka plan Web Push kurulumu

Bu akış, kullanıcı açık sekmede değilken de tarayıcının desteklediği Web Push bildirimlerini göndermek için tasarlanmıştır. Teslimat; canlı Open-Meteo yanıtı, geçerli Web Push aboneliği, Supabase tablo/izinleri, VAPID anahtarları, tarayıcı izni ve zamanlayıcının tamamına bağlıdır. Kodun eklenmesi tek başına gerçek cihazlarda teslimat kanıtı değildir.

## Gerekli yapılandırma

1. Backend/Vercel ortamına SUPABASE_URL, SUPABASE_ADMIN_KEY, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY_B64, VAPID_SUBJECT ve güçlü bir CRON_SECRET ekle. Gizli değerleri Git'e yazma. VAPID public/private anahtarları aynı çifte ait olmalı.
2. GitHub deposu → **Settings → Secrets and variables → Actions → New repository secret** yoluyla CRON_SECRET adlı secret oluştur ve Vercel'deki değerle aynı tut.
3. İsteğe bağlı olarak aynı bölümde **Variables** altında NEXORA_API_URL=https://nova-forest-ai.vercel.app/api tanımla. Varsayılan adres bu değerdir.
4. Supabase'de nexorawildfire_push_subscriptions tablosunun id, user_id, endpoint, p256dh, auth, lat, lon, area_name, threshold, last_risk, last_alert_at alanlarını ve endpoint benzersiz kısıtını doğrula. Sunucu anahtarı yalnızca backend'de kalmalı.
5. Değişiklikleri varsayılan dala birleştir. GitHub Actions zamanlanmış iş akışları yalnızca varsayılan daldaki dosyadan çalışır. **Actions → Nova-Alert background Web Push → Run workflow** ile ilk çağrıyı elle dene.
6. Web uygulamasında giriş yap, haritada bir alan çizip kaydet ve Nova-Alert formundan bildirim iznini ver. Uygulamanın /api/notifications/status ve /api/notifications/push/config uç noktalarını kontrol et. Web Push teslimatını gerçek bir cihazda, uygulama arka plandayken test et.

## Davranış ve güvenlik

- GitHub Actions beş dakikada bir korumalı /notifications/cron uç noktasını çağırır. Vercel Hobby planının beş dakikalık cron sınırı olmadığı için aynı görev vercel.json cron girdisiyle yinelenmez.
- Eksik veya geçersiz canlı hava verisinden risk skoru üretilmez; kayıt skipped sayılır.
- Eşik aşımında aynı aboneliğe tekrar tekrar bildirim göndermemek için altı saatlik tekrar sınırı uygulanır.
- Bu skor kural tabanlı çevresel karar desteğidir; resmî yangın uyarısı veya doğrulanmış yangın tespiti değildir.
- Zamanlanmış iş akışı, Vercel secret'ı, Supabase şeması ve gerçek cihaz teslimatı bu ortamdan otomatik olarak doğrulanamaz. Kurulum tamamlandıktan sonra Actions çalışma sonucu ve /notifications/status ile kontrol edilmelidir.
