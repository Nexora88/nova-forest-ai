# Nexora Insight Engine / Nexora Insight Motoru

## Purpose / Amaç

Nexora Insight is a first-party, browser-side, deterministic environmental analysis layer. It reads the existing regional risk API, presents only returned measurements and source status, and turns available weather fields into short, inspectable explanations. It is intentionally small and does not require an external LLM API key.

Nexora Insight, mevcut bölgesel risk API'sini okuyan, yalnızca dönen ölçüm ve kaynak durumlarını gösteren, mevcut hava alanlarını incelenebilir açıklamalara dönüştüren birinci taraf tarayıcı tabanlı deterministik analiz katmanıdır. Haricî bir LLM API anahtarı gerektirmez.

## Data flow / Veri akışı

1. The browser calls `GET /api/risk-analysis` (the existing FastAPI route).
2. The response is rendered with source and scope metadata; unavailable inputs remain unavailable.
3. The engine checks temperature, relative humidity, wind, and precipitation fields before giving any interpretation.
4. Existing provider scores are shown as **rule-based indicators**, not calibrated probabilities.
5. No external service is called from the engine other than the configured first-party API; no API secrets are placed in browser code.

1. Tarayıcı mevcut FastAPI uç noktası olan `GET /api/risk-analysis` adresini çağırır.
2. Yanıt, kaynak ve kapsam metaverisiyle sunulur; erişilemeyen girdiler erişilemez olarak kalır.
3. Motor yorum üretmeden önce sıcaklık, bağıl nem, rüzgâr ve yağış alanlarını kontrol eder.
4. Mevcut sağlayıcı skorları kalibre edilmiş olasılık değil, **kural tabanlı göstergeler** olarak sunulur.
5. Motor yapılandırılmış birinci taraf API dışında haricî servise çağrı yapmaz; API sırları tarayıcı koduna eklenmez.

## Current capabilities / Mevcut yetenekler

- Regional scan for Edirne, Kırklareli, Tekirdağ, Çanakkale, and European Istanbul.
- Map-based focus on regional analysis centers.
- Bilingual Turkish/English interface.
- Source/coverage ledger and missing-data handling.
- Explainable reasons based on observed weather fields.
- Responsive interface and API failure feedback.

- Edirne, Kırklareli, Tekirdağ, Çanakkale ve İstanbul Avrupa için bölgesel tarama.
- Haritada analiz merkezine odaklanma.
- Türkçe/İngilizce arayüz.
- Kaynak/kapsam dökümü ve eksik veri yönetimi.
- Gözlenen hava alanlarına dayalı açıklanabilir gerekçeler.
- Mobil uyumlu arayüz ve API hata bildirimi.

## Scientific boundary / Bilimsel sınır

This is **not a trained machine-learning model**. It does not train on user data, call itself autonomous intelligence, or claim to predict a fire. It does not infer that a missing NASA FIRMS response means no hotspot, and does not claim Sentinel-2 NDVI was used unless the API explicitly provides a processed value. Weather-derived risk is not a confirmed incident or official warning. For emergency decisions, follow the competent authorities.

Bu sistem **eğitilmiş bir makine öğrenmesi modeli değildir**. Kullanıcı verisiyle eğitim yapmaz, otonom zekâ iddiasında bulunmaz ve yangın tahmin ettiğini söylemez. Eksik NASA FIRMS yanıtını sıcak nokta yokluğu olarak yorumlamaz; API açıkça işlenmiş değer sunmadıkça Sentinel-2 NDVI kullanıldığını iddia etmez. Hava temelli risk, doğrulanmış olay veya resmî uyarı değildir. Acil durumlarda yetkili kurumları izleyin.

## Next research stages / Sonraki araştırma aşamaları

1. API keys and provider permissions configured by the maintainer.
2. Data provenance, timestamps, quality flags, and reproducible snapshots.
3. A legally reusable, regionally representative labelled dataset.
4. Baseline comparison, spatial/temporal holdout, calibration, confusion matrix, precision/recall/F1, false-alarm and missed-event rates.
5. Independent expert review before any operational claim.

1. Bakım sorumlusu tarafından API anahtarlarının ve sağlayıcı izinlerinin yapılandırılması.
2. Veri kaynağı, zaman damgası, kalite işaretleri ve tekrarlanabilir veri anlık görüntüleri.
3. Hukuken kullanılabilir, bölgeyi temsil eden etiketli veri kümesi.
4. Temel yöntem karşılaştırması, mekânsal/zamansal bağımsız test, kalibrasyon, karmaşıklık matrisi, precision/recall/F1, yanlış alarm ve kaçırılan olay oranları.
5. Operasyonel iddialardan önce bağımsız uzman incelemesi.
