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


---

# English: Real YOLOv8 inference

## Endpoints and behaviour

- `GET /ml/yolo/status` reports whether the inference runtime is installed and whether the checkpoint has loaded.
- `POST /ml/yolo/detect` accepts one JPEG, PNG, or WebP frame and returns model detections and inference timing.
- The UAV/AI page samples frames from a user-selected local video and sends those frames to the configured API. It does not upload the whole video file and does not draw fabricated boxes when the API fails.
- The endpoint returns image-space boxes only. It does not infer GPS coordinates, a mapped fire location, or a confirmed incident.

## Deployment

The ML runtime is isolated from the regular Vercel API because PyTorch and Ultralytics add substantial size and startup cost. The Railway service is configured to build from `backend/Dockerfile.ml`; it must pass its health check and return a valid `/ml/yolo/status` response before the UI can be described as live. A configured URL alone is not proof that the service is healthy.

## License and model source

The default checkpoint source is `rabahdev/fire-smoke-yolov8n` on Hugging Face, file `best.pt`. The upstream repository and Ultralytics ecosystem identify AGPL-3.0 licensing; re-check the exact upstream license and model card at the time of use. The project does not bundle the checkpoint in its own source tree. See `THIRD_PARTY_NOTICES.md`.

## Accuracy limits

The upstream model metrics have not been independently reproduced by this project. A blank synthetic frame returning zero boxes only verifies that a model request completed; it does not measure sensitivity or specificity. Before any real-world claim, build a lawfully sourced, geographically and temporally documented, labelled positive/negative evaluation set, and report precision, recall, F1, mAP, false alarms, missed detections, latency, and uncertainty. Do not use this system as an official alarm or for emergency decisions.
