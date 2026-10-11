# Trakya tarihsel veri seti: gerçek kaynaklar ve sınırlar

## Tarihsel arşiv yolu (2018–2025 gibi çok yıllı dönemler)

1. NASA FIRMS Archive Download bölümünden VIIRS aktif-ateş CSV dosyalarını indir; Türkiye/Trakya kutusunu seç ve ürün/sensör ile indirme tarihini not et.
2. Dosyaları yerel `data/firms-archive/` klasörüne koy. Gerçek CSV'leri Git'e veya herkese açık artefakta koyma.
3. Kur: `pip install -r backend/requirements.txt`.
4. Her arşiv CSV'sini `--firms-csv` ile ver. Araç başlıkları kontrol eder, Trakya pilot bbox'ı ve tarih aralığını uygular, yakın aynı-gün hücrelerini tekilleştirir.
5. Pozitif hotspot proxy'leri için aynı koordinat/tarihte Open-Meteo Historical / ERA5-Land günlük sıcaklık, minimum nem, maksimum rüzgâr, yağış, ET₀, VPD ve önceki 6 günlük yağış eşlenir.
6. Negatif örnekler rastgele konum/tarihlerden seçilir; 1 km içinde FIRMS algılaması olmayan örneklerdir. Bunlar **yangın olmadığının kanıtı değildir**.
7. Dataset kronolojik holdout ile değerlendirilir. Bağımsız gerçek yangın kayıtlarıyla etiket doğrulaması yapılmadan operasyonel tahmin diye sunulmaz.

Örnek:

```bash
python backend/scripts/build_thrace_dataset.py \
  --start-date 2018-01-01 --end-date 2025-12-31 \
  --firms-csv data/firms-archive/viirs_2018_2021.csv \
  --firms-csv data/firms-archive/viirs_2022_2025.csv \
  --max-positive 500 --negatives-per-positive 1 \
  --output backend/data/thrace_fire_dataset.csv

python backend/scripts/train_fire_model.py \
  --input backend/data/thrace_fire_dataset.csv \
  --model-output backend/models/fire_risk.joblib \
  --metadata-output backend/models/fire_risk_metadata.json
```

## Etiket tanımı ve bilimsel sınırlar

- `label=1`: NASA FIRMS uydu sıcak noktası algılandı; **doğrulanmış yangın olayı değildir**.
- `label=0`: örnek konum/tarihin 1 km çevresinde FIRMS algılaması yok; **yangın yoktu anlamına gelmez**.
- Open-Meteo ERA5-Land yeniden analiz verisidir; yerel meteoroloji istasyonu ölçümü olarak etiketlenmez.
- Hotspot algılama; bulut, geçiş saati, sensör ürünü ve yangın dışı ısı kaynaklarından etkilenebilir.
- Eğitim öncesi ürün/sensör, tarih kapsamı, eksik günler, coğrafi kapsam ve sınıf dengesi raporlanmalıdır.
- Rastgele satır bölme kullanılmaz; zaman bazlı test dönemi ve prior baseline kıyaslanır.
- Bağımsız resmi olay kayıtlarıyla doğrulanana dek model yalnız araştırma deneyi olarak kalır.

## Kaynaklar
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- Open-Meteo Historical API: https://open-meteo.com/en/docs/historical-weather-api
