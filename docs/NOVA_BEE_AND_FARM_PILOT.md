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


## Real three-agent report endpoint

The dashboard's local daily summary remains a transparent weather-rule fallback. The **Üç ajanla rapor oluştur** action calls the authenticated `POST /copilot/report` endpoint. Agro-Agent, Eco-Agent and Writer Agent each make a separate server-side OpenAI-compatible chat-completions request; per-agent provider URLs, model names and API keys can be configured independently in the backend environment. No key belongs in browser code. Missing provider configuration returns an explicit service error instead of pretending a model ran.

The satellite job request and the completed satellite report are separate states: NDVI/NDMI results are only reportable when the asynchronous worker returns actual statistics. SMS/WhatsApp alerts require the opt-in migration, Twilio credentials and a configured scheduled runner. Scheduled execution can be delayed by the hosting scheduler and is not a life-safety guarantee. Premium checkout is not enabled by this change.
