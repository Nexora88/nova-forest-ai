# AI-Assisted Development Disclosure / Yapay Zekâ Destekli Geliştirme Beyanı

**English · Türkçe**

## English

### Original project concept and human responsibility

NexoraWildfire AI is an independent project initiated and directed by its developer, Ahmet Eymen Bakraç. The core project idea, intended public benefit, product direction, initial Thrace focus, feature priorities, and decisions about what the software must not claim are the developer's own project decisions. AI assistants are not the originators or owners of the project concept.

This statement describes authorship and intent; it is not a claim that every line of code was typed without assistance, nor does it replace technical evidence or independent review.

### How AI tools are used

LLM-based assistants and AI coding agents are technical support tools used to investigate errors and suggest debugging steps, explain unfamiliar code and APIs, compare implementation/refactoring options, help draft tests, documentation, translations and checklists, and identify edge cases, accessibility concerns and security risks. Their suggestions may be wrong, incomplete, outdated or insecure.

They do not independently decide the project's mission, validate environmental science, certify model accuracy, or establish that a feature works in production.

### Review and verification

Changes are reviewed and, where practical, checked with automated tests, source inspection, provider diagnostics, browser testing, and deployment health checks. Passing a unit test or loading a model is not proof of field accuracy. Generated code is not considered verified merely because an AI tool suggested it. Not every prompt or intermediate suggestion is archived; the repository records material implementation, validation, and known limitations instead.

### Scientific integrity and limits

- Measured observations, provider forecasts, rule-based indicators, simulations, and ML outputs are different evidence types and must be labelled separately.
- The experimental weather-risk index is a rule-based heuristic with provisional weights, not a calibrated fire probability.
- The UCI Algerian Forest Fires model is based on 244 daily observations from two Algerian regions in 2012. Its geographic holdout results do not establish performance in Türkiye or Thrace.
- NASA FIRMS thermal anomalies are proxy labels, not confirmed fire incidents; satellite non-detection does not prove no fire occurred.
- The YOLOv8 fire/smoke model is a third-party research model. A synthetic blank-frame check verifies the API path only; a labelled positive/negative image set is still needed for meaningful accuracy evaluation.
- Missing data, API errors, or unavailable models must not be silently converted into zero risk.
- NexoraWildfire AI is experimental decision support, not an official warning system or an emergency-response replacement.

### Licensing and attribution

The root MIT `LICENSE` applies to Nexora-authored code as stated in the repository. It does not override separate licenses and terms for third-party libraries, model weights, datasets, imagery, map tiles, or external data services. See [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md). The YOLO/Ultralytics AGPL-3.0 implications must be reviewed before redistribution or service deployment; this disclosure is not legal advice.

## Türkçe

### Özgün proje fikri ve insan sorumluluğu

NexoraWildfire AI, geliştiricisi Ahmet Eymen Bakraç tarafından başlatılan ve yönlendirilen bağımsız bir projedir. Projenin temel fikri, toplumsal fayda amacı, ürün yönü, ilk pilot bölge olarak Trakya'ya odaklanma kararı, özellik öncelikleri ve yazılımın hangi iddialarda bulunmaması gerektiğine ilişkin tercihler geliştiricinin proje kararlarıdır. Yapay zekâ asistanları proje fikrinin sahibi veya kaynağı değildir.

Bu açıklama fikrin sahipliği ve geliştirme niyetiyle ilgilidir. Her kod satırının hiçbir yardım alınmadan yazıldığı iddiası değildir; teknik kanıtın veya bağımsız incelemenin yerini tutmaz.

### Yapay zekâ araçları nasıl kullanılıyor?

Büyük dil modeli tabanlı asistanlar ve yapay zekâ kodlama ajanları; hataları araştırmak ve hata ayıklama adımları önermek, bilinmeyen kodu ve API'leri açıklamak, uygulama ve yeniden düzenleme seçeneklerini karşılaştırmak, test/belge/çeviri/kontrol listesi hazırlamaya yardım etmek ve uç durumları, erişilebilirlik sorunlarını ve güvenlik risklerini bulmaya destek olmak için teknik yardımcı araçlar olarak kullanılır. Önerileri yanlış, eksik, eski veya güvensiz olabilir.

Projenin misyonuna bağımsız biçimde karar vermezler; bilimsel geçerliliği, model doğruluğunu veya üretim ortamında çalışmayı kendiliklerinden kanıtlayamazlar.

### İnceleme ve doğrulama

Değişiklikler incelenir; uygulanabildiği ölçüde otomatik testler, kaynak kod incelemesi, veri sağlayıcı kontrolleri, tarayıcı testleri ve dağıtım sağlık kontrolleri kullanılır. Birim testinin geçmesi veya modelin yüklenmesi saha doğruluğunu kanıtlamaz. Yapay zekâ aracının önermiş olması, kodu doğrulanmış hâle getirmez. Her istem ve ara öneri arşivlenmez; depo önemli uygulama kararlarını, doğrulama sonuçlarını ve bilinen sınırlamaları kaydeder.

### Bilimsel dürüstlük ve sınırlar

- Ölçülmüş gözlemler, sağlayıcı tahminleri, kural tabanlı göstergeler, simülasyonlar ve makine öğrenmesi çıktıları farklı kanıt türleridir; ayrı etiketlenmelidir.
- Deneysel hava-risk indeksi, geçici ağırlıklara sahip kural tabanlı bir sezgiseldir; kalibre edilmiş yangın olasılığı değildir.
- UCI Cezayir Orman Yangınları modeli, 2012'de Cezayir'in iki bölgesinden alınmış 244 günlük gözleme dayanır. Coğrafi ayırmalı test sonuçları Türkiye veya Trakya performansını kanıtlamaz.
- NASA FIRMS termal anomalileri doğrulanmış yangın kaydı değil, vekil etikettir; uydu gözleminin olmaması yangın olmadığını kanıtlamaz.
- YOLOv8 yangın/duman modeli üçüncü taraf araştırma modelidir. Sentetik boş kare testi yalnızca API akışını doğrular; anlamlı doğruluk değerlendirmesi için pozitif ve negatif etiketli görüntüler gerekir.
- Eksik veri, API hatası veya erişilemeyen model sessizce sıfır riske dönüştürülmemelidir.
- NexoraWildfire AI deneysel karar desteğidir; resmî uyarı sistemi veya acil müdahale hizmetinin yerine geçmez.

### Lisans ve atıf

Kök dizindeki MIT `LICENSE`, depoda belirtildiği üzere Nexora tarafından yazılan kod için geçerlidir. Üçüncü taraf kütüphanelerin, model ağırlıklarının, veri kümelerinin, görüntülerin, harita döşemelerinin veya haricî veri hizmetlerinin ayrı lisans ve koşullarını geçersiz kılmaz. [Üçüncü taraf lisans bildirimlerine](THIRD_PARTY_NOTICES.md) bakın. YOLO/Ultralytics AGPL-3.0 koşulları yeniden dağıtım veya servis yayını öncesinde ayrıca incelenmelidir; bu beyan hukuki danışmanlık değildir.
