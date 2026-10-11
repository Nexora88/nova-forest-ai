# Scientific status and validation plan / Bilimsel Durum ve Doğrulama Planı

This document distinguishes current implementation evidence from scientific validation. / Bu belge, mevcut yazılım kanıtını bilimsel doğrulamadan ayırır.

## English

| Component | What is evidenced now | What is not established | Next defensible validation |
|---|---|---|---|
| Open-Meteo weather | Provider requests and status handling exist; the API has returned live responses during testing. | Continuous availability, station-level truth, or local fire-prediction skill. | Log timestamp, coordinates, units, provider errors, cache age and repeated availability over time. |
| Experimental Nexora Risk Index | Deterministic rule-based formula and input tests are documented. | Calibrated fire probability, scientifically optimal weights, or operational thresholds. | Freeze weights before evaluation; compare to a transparent baseline using local labelled data, spatial/temporal holdouts, calibration and false-alarm metrics. |
| UCI Random Forest | 244 daily observations from Béjaïa and Sidi-Bel Abbès, Algeria (2012); a geographic holdout is recorded in the model card. | Generalization to Türkiye/Thrace, seven-day forecasting, or confirmed incident probability. | Reproduce the experiment from the archived metadata, audit data parsing and target semantics, then evaluate only on a separately collected and legally usable local dataset. |
| Thrace FIRMS pipeline | Reproducible data-pipeline code exists for weather plus satellite thermal-anomaly proxies. | Confirmed fire labels, representative forest sampling, or a locally validated predictive model. | Use justified forest sites, preserve original exports and metadata, cross-check candidate events with official records, and freeze chronological test periods. |
| YOLOv8 fire/smoke | The API and UI can process frames when the model runtime and checkpoint are available. A blank synthetic frame tested the request path. | Detection sensitivity, specificity, mAP, false-alarm rate, or accuracy in Turkish conditions. | Build a permissioned, labelled positive/negative image set from relevant camera/drone/landscape conditions; separate by site and time; report precision, recall, F1, mAP, missed detections, false alarms, latency and uncertainty. |
| Saved areas | Local storage/IndexedDB and browser tests cover persistence and deletion scenarios; regression coverage targets stale-record resurrection and HTML injection. | Reliability on every real device, browser, offline transition, or cloud account state. | Run desktop/mobile browser tests and a manual real-device checklist; capture console/network logs and verify offline/reconnect/cloud-sync flows. |

### Interpretation rules

- Missing, stale, failed, or incomplete data means **unavailable**, not zero risk.
- A FIRMS hotspot is a satellite thermal anomaly, not proof of a forest fire. No hotspot is not proof of no fire.
- A same-day class probability is not a seven-day forecast.
- A model that loads or returns a JSON response is not thereby accurate.
- The risk index is an experimental decision-support indicator, not an official warning. Do not use it alone for emergency decisions.

### Minimum reporting checklist

1. State the research question and hypotheses before examining test results.
2. Record data provider, license, source version, retrieval timestamp, coordinates, units, inclusion/exclusion rules, and missing-data treatment.
3. Prevent spatial and temporal leakage; keep the final evaluation set untouched until model and thresholds are frozen.
4. Report class balance, sample size, confusion matrix, precision, recall, specificity, balanced accuracy, F1, calibration where relevant, false-alarm and missed-event rates, latency, and uncertainty.
5. Compare with a prespecified baseline and include failed runs and negative results.
6. Obtain teacher/adviser and qualified domain review before any student research submission or real-world operational claim.

## Türkçe

| Bileşen | Şu anda kanıtlanan | Henüz kanıtlanmayan | Savunulabilir sonraki doğrulama |
|---|---|---|---|
| Open-Meteo hava verisi | Sağlayıcı istekleri ve durum yönetimi mevcut; testlerde canlı yanıtlar alınmıştır. | Kesintisiz erişilebilirlik, istasyon ölçümü doğruluğu veya yerel yangın tahmin başarısı. | Zaman damgası, koordinat, birim, sağlayıcı hatası, önbellek yaşı ve zaman içindeki tekrar edilebilir erişimi kaydedin. |
| Deneysel Nexora Risk İndeksi | Deterministik kural tabanlı formül ve girdi testleri belgelenmiştir. | Kalibre edilmiş yangın olasılığı, bilimsel olarak en iyi ağırlıklar veya operasyonel eşikler. | Ağırlıkları testten önce sabitleyin; yerel etiketli veriyle şeffaf bir temel yöntem karşılaştırması, coğrafi/zamansal ayırma, kalibrasyon ve yanlış alarm metrikleri kullanın. |
| UCI Random Forest | Cezayir'in Béjaïa ve Sidi-Bel Abbès bölgelerinden 2012 yılına ait 244 günlük gözlem; model kartında coğrafi ayırmalı test kaydı. | Türkiye/Trakya genellemesi, yedi günlük tahmin veya doğrulanmış olay olasılığı. | Deneyi metaveriden yeniden üretin, veri ayrıştırma ve hedef anlamını denetleyin; sonra yalnızca ayrı toplanmış ve hukuken kullanılabilir yerel veriyle değerlendirin. |
| Trakya FIRMS hattı | Hava verisi ile uydu termal anomali vekillerini birleştiren tekrarlanabilir veri hattı kodu mevcut. | Doğrulanmış yangın etiketleri, temsili orman örneklemesi veya yerelde doğrulanmış tahmin modeli. | Gerekçeli orman sahaları belirleyin, özgün dışa aktarımları ve metaveriyi koruyun, aday olayları resmî kayıtlarla karşılaştırın ve kronolojik test dönemlerini sabitleyin. |
| YOLOv8 yangın/duman | Model çalışma ortamı ve ağırlıklar mevcut olduğunda API ve arayüz kare işleyebilir. Sentetik boş kare istek akışını test etmiştir. | Türkiye koşullarında algılama duyarlılığı, özgüllük, mAP, yanlış alarm oranı veya doğruluk. | İzinli ve etiketli pozitif/negatif görüntü kümesi oluşturun; saha ve zamana göre ayırın; precision, recall, F1, mAP, kaçırılan olay, yanlış alarm, gecikme ve belirsizliği raporlayın. |
| Kaydedilmiş alanlar | Yerel depolama/IndexedDB ve tarayıcı testleri kayıt/silme senaryolarını kapsar; regresyon testleri eski kaydın geri gelmesini ve HTML enjeksiyonunu hedefler. | Her gerçek cihaz, tarayıcı, çevrimdışı geçiş veya bulut hesabında güvenilirlik. | Masaüstü/mobil testleri ve gerçek cihaz kontrol listesi uygulayın; konsol/ağ kayıtlarını alın ve çevrimdışı/yeniden bağlanma/bulut eşitleme akışlarını doğrulayın. |

### Yorumlama kuralları

- Eksik, eski, başarısız veya tamamlanmamış veri **erişilemiyor** demektir; sıfır risk değildir.
- FIRMS sıcak noktası uydu termal anomalisidir, orman yangınının kanıtı değildir. Sıcak nokta görülmemesi yangın olmadığı anlamına gelmez.
- Aynı güne ait sınıf olasılığı yedi günlük tahmin değildir.
- Modelin yüklenmesi veya JSON yanıtı vermesi, modelin doğru olduğunu kanıtlamaz.
- Risk indeksi deneysel karar destek göstergesidir; resmî uyarı değildir. Acil durum kararlarında tek başına kullanılmamalıdır.

### Asgari raporlama kontrol listesi

1. Test sonuçlarını incelemeden önce araştırma sorusunu ve hipotezleri belirtin.
2. Sağlayıcı, lisans, kaynak sürümü, indirme zamanı, koordinatlar, birimler, dahil etme/dışlama kuralları ve eksik veri yöntemini kaydedin.
3. Coğrafi ve zamansal veri sızıntısını önleyin; model ve eşikler sabitlenene kadar son değerlendirme kümesini kullanmayın.
4. Sınıf dağılımını, örnek sayısını, karışıklık matrisini, precision, recall, specificity, balanced accuracy, F1, gerekiyorsa kalibrasyonu, yanlış alarm/kaçırılan olay oranlarını, gecikmeyi ve belirsizliği raporlayın.
5. Önceden belirlenmiş temel yöntemle karşılaştırın; başarısız çalıştırmaları ve olumsuz sonuçları da dahil edin.
6. Öğrenci araştırması veya gerçek dünya iddiası öncesinde öğretmen/danışman ve ilgili alan uzmanından inceleme alın.
