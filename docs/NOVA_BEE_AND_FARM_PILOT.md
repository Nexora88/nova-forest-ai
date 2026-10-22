# Nova Bee & Tarım — pilot kapsamı

Durum: **pilot arayüzü + isteğe bağlı bağımsız model ajanı API'si**. Agro-Agent, Eco-Agent ve Writer Agent ayrı model çağrıları yapacak şekilde kodlandı; gerçek çıkarım için Ollama uyumlu model sunucusu ve üç model adı sunucu ortam değişkenlerinde yapılandırılmalıdır. Bu yapılandırma yapılmadan model raporu tamamlanmış gibi gösterilmez. Ödeme ve otomatik Premium yükseltme etkin değildir; zamanlanmış arka plan Web Push için sunucu anahtarlarına ek olarak harici zamanlayıcı gerekir.

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
