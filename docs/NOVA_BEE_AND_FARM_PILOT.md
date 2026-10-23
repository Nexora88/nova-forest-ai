# Nova Bee & Tarım — pilot kapsamı

Durum: **pilot arayüzü ve tarayıcı tabanlı göstergeler**. Ödeme, otomatik premium yükseltme ve garantili arka plan bildirimleri etkin değildir.

## Ücretsiz pilot
- Alanlarım bölümünde kaydedilen arılık/tarla alanını seçme.
- Open-Meteo üzerinden seçilen alan merkezine göre 7 günlük hava tahmini.
- Kullanıcının belirlediği minimum sıcaklık eşiğine göre don riski görünümü.
- Sıcaklık, rüzgâr ve yağıştan türetilen açıklanabilir Nova Bee uçuş-koşulu göstergesi.
- ET₀ × kullanıcı tarafından ayarlanan Kc eksi tahmini yağış ile kaba atmosferik su talebi sinyali.
- Tarayıcıda kaydedilen eşikler ve açık izinle, sayfa tahmin kontrolü yaptığında gösterilen don bildirimi.

## Premium için önerilen kapsam
- Alan poligonuna özel Sentinel-2 NDVI/NDMI zaman serisi raporu.
- Raporlarda sahne tarihi, kaynak, bulut/gölge maskesi, geçerli örnek sayısı, değişim ve belirsizlik.
- Çoklu arılık/tarla karşılaştırması, rapor dışa aktarma ve gelişmiş alarm kuralları.
- Arka plan push/e-posta bildirimleri ancak teslimat servisi, rıza, hata yönetimi ve abonelik yetkilendirmesi uçtan uca doğrulandıktan sonra.

## Güvenlik ve veri dürüstlüğü
- Arayüzdeki Premium etiketi erişim kontrolü değildir. Ödeme açılmadan satın alma veya Premium hakkı vaat edilmez.
- NDVI işi giriş yapılmış kullanıcının Bearer oturumu ve mevcut sunucu kota sistemi üzerinden /jobs/ndvi-timeseries uç noktasına gönderilir. Worker veya Supabase Auth yapılandırılmamışsa açık hata gösterilir.
- Alan koordinatları tarayıcıdaki nexorawildfire-my-areas-v1 kaydından okunur; merkez koordinatı alan köşelerinin ortalamasıdır, kesin kovan konumu değildir.
- Don tahmini arılığın iç sıcaklığını ölçmez. ET₀ ve Kc göstergesi toprak nemi, etkili yağış, ürün evresi ve sulama verimini kapsamaz; sulama emri değildir.
- Arı uçuş skoru kural tabanlı hava konforu göstergesidir; koloni sağlığı, bal verimi veya uçuş garantisi vermez.
- Bildirim yalnızca sayfa açıkken tahmin sorgusu sırasında değerlendirilir. Güvenilir arka plan uyarısı için Web Push/VAPID, kullanıcı aboneliği, worker/cron, tekrar önleme ve teslimat izleme ayrıca doğrulanmalıdır.

## Lansman öncesi kabul kontrolü
1. Gerçek telefon ve masaüstünde alan seçimi, 7 günlük tahmin, eşik değişimi ve bildirim iznini dene.
2. Geçersiz/eksik alan ve ağ hatasında uydurma puan oluşmadığını doğrula.
3. Supabase giriş ve worker hazır değilken NDVI isteğinin kullanıcıya açık hata verdiğini doğrula.
4. Ücretli planı açmadan önce sunucu tarafı plan yetkisi, abonelik kaydı, webhook, iptal/iade, gizlilik metni ve kullanım limitlerini tamamla.
5. Trakya'daki arıcı ve üreticilerden saha geri bildirimi topla; eşikleri doğrulanmış agronomik tavsiye olarak pazarlama.


## Configurable AI Copilot (2026-10-23)

The backend now exposes `POST /copilot/daily-report`. Agro-Agent and Eco-Agent run as separate model calls before Writer Agent creates a Turkish briefing. Configure `AI_API_BASE_URL`, `AI_API_KEY`, `NEXORA_AGRO_MODEL`, `NEXORA_ECO_MODEL`, and `NEXORA_WRITER_MODEL` in the server environment. Missing model configuration returns `agents_not_ready`; it is not disguised as AI output. Optional GeoJSON Polygon input requests a real Sentinel-2 NDVI/NDMI series when CDSE credentials are available.

## Delivery and billing deployment gates

- Apply `supabase/migrations/20261023090000_provider_integrations.sql`.
- The persistent `notification-scheduler` service supports background Web Push and opt-in SMS/WhatsApp checks. It requires the Supabase tables, VAPID keys, Twilio credentials and a verified phone number. A serverless request alone cannot guarantee background delivery.
- SMS/WhatsApp uses Twilio Verify for phone ownership and sends only for a verified, explicitly opted-in area subscription.
- Stripe Checkout is server-side; a plan changes only after a signature-verified webhook. Configure Stripe secrets and register `/billing/webhook` before enabling paid checkout.
- Missing credentials are reported as unconfigured. Provider setup and live delivery/payment must be tested in the deployed environment before claiming activation.
