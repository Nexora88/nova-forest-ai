# NexoraWildfire AI — gerçek YOLOv8 çıkarımı

## Neler çalışır?

- `GET /ml/yolo/status`: YOLOv8 çalışma ortamını ve model kaynağı yapılandırmasını raporlar.
- `POST /ml/yolo/detect`: tek bir JPEG, PNG veya WebP kareyi gerçek modelden geçirir ve fire/smoke kutularını döndürür.
- Ana sayfadaki **İHA / Yapay Zekâ** bağlantısı, yerel videodan kareler alır ve yapılandırılmış API'ye gönderir. Kutular yalnızca gerçek API yanıtıyla çizilir; API erişilemiyorsa simüle kutu gösterilmez.
- Görüntüler kalıcı olarak saklanmaz. Video dosyasının tamamı değil, seçilen kareler API'ye gönderilir.

## ML çalışma ortamı

Python 3.11/3.12 önerilir. ML servisini, Vercel'in küçük sunucusuz API ortamından ayrı bir container olarak çalıştırın:

1. `backend/` dizininde `pip install -r requirements-ml.txt` çalıştırın.
2. `backend/` dizininden `uvicorn app.main:app --host 0.0.0.0 --port 8000` başlatın veya `Dockerfile.ml` kullanın.
3. Varsayılan model kaynağı `rabahdev/fire-smoke-yolov8n` Hugging Face deposundaki `best.pt` dosyasıdır. İlk algılama isteği ağırlıkları indirir; model deposuna erişim gerekir.
4. Başka bir uyumlu ağırlık dosyası kullanmak için `NEXORA_YOLO_MODEL_PATH` tanımlayın. Model hem `fire` hem `smoke` sınıfını içermiyorsa servis dosyayı reddeder.
5. Ön yüz demo sayfasındaki API taban adresine, servis kök URL'sini girin. Vercel API prefix'i etkinse adresin sonuna `/api` ekleyin.

Örnek environment değerleri:

- `NEXORA_YOLO_HF_REPO_ID=rabahdev/fire-smoke-yolov8n`
- `NEXORA_YOLO_HF_FILENAME=best.pt`
- `NEXORA_YOLO_MODEL_PATH=` (boş bırakılırsa Hugging Face kaynağı kullanılır)
- `NEXORA_YOLO_CONFIDENCE=0.25` (ön yüzdeki istek değeri ayrıca seçilebilir)

## Lisans ve model kartı

Varsayılan üçüncü taraf ağırlık deposu, D-Fire veri setiyle ince ayarlandığını ve AGPL-3.0 lisansını belirtiyor. Dağıtımdan önce model kartını, ağırlık lisansını ve Ultralytics lisans koşullarını tekrar inceleyin. Nexora kod deposunda üçüncü taraf ağırlık dosyası kopyalanmaz; ilk kullanımda kaynak depodan indirilir.

Model kartında bildirilen metrikler kaynak sahibinin beyanıdır; bu projede henüz bağımsız biçimde tekrarlanmış değildir. Bu yüzden bu metrikler Nexora'nın test sonucu olarak sunulmaz.

## Doğruluk ve saha sınırları

- Algılama kutuları görüntü piksel koordinatlarıdır. Kamera/İHA GPS'i veya harita koordinatı üretmez.
- Tek karedeki algılama doğrulanmış yangın kaydı değildir. Bulut, sis, toz, güneş parlaması ve uzaktaki duman yanlış sonuç oluşturabilir.
- Türkiye/Trakya sahasında operasyonel iddia için bağımsız, zaman ve konum bazlı ayrılmış etiketli test verisi gerekir. Precision, recall, F1, mAP, yanlış alarm oranı, kaçırılan olaylar ve gecikme raporlanmalıdır.
- Bu sistem sertifikalı yangın alarmı veya acil müdahale kanalının yerine geçmez.

## Tekrarlanabilir kontroller

- Risk indeksi: `python -m unittest backend.test_nexora_risk_index -v`
- YOLO sonuç biçimlendirme testleri: `python -m unittest discover -s backend/tests -v`
- Gerçek çıkarım testi: ML container içinde, lisansı uygun ve etiketli örnek görüntülerle çalıştırın; modelin indirildiğini, `/ml/yolo/status` durumunu ve dönen kutuları kaydedin.
