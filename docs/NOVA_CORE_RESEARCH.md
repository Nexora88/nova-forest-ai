# NOVA Core — Explainable Environmental Intelligence

**NexoraWildfire AI | Research prototype | Thrace, Türkiye**

## Türkçe

NOVA Core, NexoraWildfire AI içindeki mevcut çevresel kaynakları tarayan ve ölçümlerden izlenebilir, açıklanabilir bir ön değerlendirme üreten özgün bir karar destek bileşenidir.

### Neler yapar?
- Backend meteoroloji uç noktasını kontrol eder; erişilemezse Open-Meteo'dan canlı mevcut koşulları almayı dener.
- Uydu işleme, ML servis ve görüntü modeli durum uç noktalarını ayrı ayrı sorgular.
- Yalnızca gerçekten dönen ölçümleri kullanır; eksik veriyi sıfır veya düşük risk saymaz.
- Meteorolojik ön sinyalin hangi ölçümlerden oluştuğunu ve her ölçümün puana katkısını gösterir.
- Türkçe ve İngilizce arayüz sunar.

### Özgünlük ve bilimsel dürüstlük
NOVA Core'un ilk sürümü yerli, özgün ve deterministik bir açıklanabilir analiz motorudur; eğitilmiş makine öğrenmesi modeli olduğu iddia edilmez. Basit ordinal puanlar yangın olasılığı veya doğrulanmış risk yüzdesi değildir. Gerçek yangın tespiti, uydu piksel analizi veya model doğruluğu iddiaları yalnızca lisansı doğrulanmış model, kaynak verisi ve bölgesel bağımsız değerlendirme mevcut olduğunda yapılmalıdır.

### Araştırma planı
1. Trakya için lisanslı, zaman damgalı meteoroloji ve Sentinel-2 örneklerini toplamak.
2. Yangın olayları ve olay olmayan dönemler için etiketleme protokolü oluşturmak.
3. Eğitim/doğrulama/test kümelerini zamansal ve coğrafi sızıntıyı önleyecek biçimde ayırmak.
4. Basit taban çizgilerini, ardından uygun lisanslı yerli geliştirilen modelleri karşılaştırmak.
5. Precision, recall, F1, kalibrasyon ve yanlış alarm/kaçırma analizlerini yayımlamak.
6. Model kartı, veri kartı, sürümleme ve tekrarlanabilir testleri sürdürmek.

### Sınırlar
Prototip resmî uyarı sistemi değildir. Meteoroloji yangını doğrulamaz; API erişilebilirliği doğruluk kanıtı değildir. Acil durumda yetkili kurumların duyuruları izlenmelidir.

## English

NOVA Core is an original decision-support component inside NexoraWildfire AI. It checks available environmental sources and produces a traceable, explainable preliminary assessment from actual measurements.

### Capabilities
- Checks the backend weather endpoint and falls back to current Open-Meteo observations when needed.
- Independently checks satellite-processing, ML-service, and vision-model status endpoints.
- Uses only returned measurements; missing data is never treated as zero or low risk.
- Explains which measurements contribute to the meteorological preliminary signal.
- Provides a Turkish/English interface.

### Originality and scientific integrity
The first release is a locally developed, deterministic explainable analysis engine, not a claim of trained machine learning. Its ordinal points are not wildfire probabilities or validated risk percentages. Fire-detection, satellite pixel-analysis, or model-accuracy claims require a license-compatible model, traceable data, and independent regional evaluation.

### Research roadmap
1. Collect licensed, timestamped meteorological and Sentinel-2 samples for Thrace.
2. Define an annotation protocol for wildfire and non-fire periods.
3. Split train/validation/test sets to prevent temporal and geographic leakage.
4. Benchmark simple baselines before evaluating suitable license-compatible models.
5. Publish precision, recall, F1, calibration, false-alarm and missed-event analyses.
6. Maintain a model card, data card, versioning, and reproducible tests.

### Limitations
This prototype is not an official warning service. Weather does not confirm a fire, and API availability is not evidence of accuracy. Follow authorized public agencies during emergencies.
