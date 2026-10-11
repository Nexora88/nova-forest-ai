# Araştırma Model Kartı — UCI Cezayir Orman Yangınları Random Forest

[English model card](ML_MODEL_CARD.md) · [Bilimsel durum ve doğrulama planı](SCIENTIFIC_STATUS.md)

## Durum ve kapsam

Bu araştırma modeli UCI Machine Learning Repository'deki Cezayir Orman Yangınları veri kümesine dayanır. Model, 2012 yazındaki iki Cezayir bölgesinden alınmış **244 günlük gözlemi** kullanır. Bu, Türkiye veya Trakya için doğrulama değildir.

## Veri kümesi

- Kaynak: [UCI Machine Learning Repository](https://archive.ics.uci.edu/dataset/547/algerian+forest+fires+dataset)
- DOI: [10.24432/C5KW4N](https://doi.org/10.24432/C5KW4N)
- Lisans: veri metaverisinde CC BY 4.0 olarak kayıtlıdır.
- Dönem: Haziran–Eylül 2012
- Gözlem: 244 günlük kayıt; Béjaïa 122, Sidi-Bel Abbès 122
- Etiketler: 138 fire, 106 not fire
- Girdiler: günlük en yüksek sıcaklık (°C), en düşük bağıl nem (%), rüzgâr hızı (km/sa), günlük yağış (mm)
- Hedef: veri kümesindeki aynı gün için fire / not-fire sınıfı

Bu hedef, bağımsız doğrulanmış orman yangını olayı veya gelecekteki yangın değildir.

## Coğrafi ayırmalı değerlendirme

Model kartındaki deney, Béjaïa bölgesinin 122 satırında eğitim yapıp Sidi-Bel Abbès bölgesinin 122 satırında değerlendirme yapar.

| Metrik | Kayıtlı sonuç |
|---|---:|
| Doğruluk (accuracy) | %78,69 |
| Dengeli doğruluk | %79,84 |
| Precision | %89,55 |
| Recall | %75,95 |
| F1 | %82,19 |
| ROC AUC | %92,08 |

Bu metrikler yalnızca tanımlanan veri ve ayırma yöntemi için geçerlidir. Bağımsız biçimde Türkiye'de tekrar edilmemiştir; üretim performansı olarak yorumlanmamalıdır. Nihai artefaktın tüm 244 satırla eğitilmesi, aynı veri üzerinde bağımsız test edildiği anlamına gelmez.

## Sınırlamalar

- Veri azdır ve yalnızca iki Cezayir bölgesini, 2012 yılını kapsar.
- Bitki örtüsü, yakıt nemi, arazi, topoğrafya, insan faaliyeti ve tutuşturma kaynakları modele dahil değildir.
- Çıktı aynı gün sınıflandırma olasılığıdır; yedi günlük tahmin, kalibre edilmiş operasyonel olasılık veya resmî yangın uyarısı değildir.
- Türkiye/Trakya için coğrafi ve zamansal açıdan bağımsız, etiketli veriyle değerlendirme yapılmadan yerel doğruluk iddiası kurulamaz.
- Acil müdahale veya operasyonel kararlar için kullanılmamalıdır.

## Yeniden üretim

Depo kökünden:

```bash
python -m pip install -r backend/requirements.txt
python backend/scripts/train_uci_research_model.py
```

Betik UCI arşivini indirir, SHA-256 özetini kaydeder, sabit tohumlu Random Forest eğitir, coğrafi ayırmalı değerlendirme yapar ve model/metaveri çıktısı üretir. Beklenen 244 etiketli satır veya iki bölge grubu bulunmazsa hata verir.
