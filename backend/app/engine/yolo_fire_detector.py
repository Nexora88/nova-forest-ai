"""Real fire/smoke inference with an explicitly sourced YOLOv8 checkpoint.

The default checkpoint is a third-party research model. Its reported metrics
are not independently reproduced here and it is not a certified alarm system.
"""
from __future__ import annotations

import os
import threading
import time
from pathlib import Path
from typing import Any

_MODEL: Any = None
_MODEL_SOURCE: str | None = None
_MODEL_LOCK = threading.Lock()
DEFAULT_HF_REPO = "rabahdev/fire-smoke-yolov8n"
DEFAULT_HF_FILENAME = "best.pt"


def model_status() -> dict[str, Any]:
    """Report runtime and model configuration without downloading weights."""
    try:
        import ultralytics  # noqa: F401
    except ImportError:
        return {
            "status": "runtime_missing",
            "runtime_available": False,
            "weights_loaded": _MODEL is not None,
            "message": "YOLOv8 çalışma ortamı kurulu değil. ML container içinde backend/requirements-ml.txt dosyasını yükleyin.",
        }

    configured_path = os.getenv("NEXORA_YOLO_MODEL_PATH", "").strip()
    if configured_path:
        path = Path(configured_path).expanduser()
        if not path.is_file():
            return {
                "status": "weights_missing",
                "runtime_available": True,
                "weights_loaded": _MODEL is not None,
                "model_path": str(path),
                "message": "NEXORA_YOLO_MODEL_PATH ayarlı ancak dosya bulunamadı.",
            }
        source = str(path)
    else:
        source = os.getenv("NEXORA_YOLO_HF_REPO_ID", DEFAULT_HF_REPO).strip()
        filename = os.getenv("NEXORA_YOLO_HF_FILENAME", DEFAULT_HF_FILENAME).strip()
        if not source or not filename:
            return {
                "status": "model_source_missing",
                "runtime_available": True,
                "weights_loaded": _MODEL is not None,
                "message": "Yerel ağırlık yolu veya Hugging Face model kaynağı tanımlanmalı.",
            }
        source = source + "/" + filename

    return {
        "status": "loaded" if _MODEL is not None else "configured_not_loaded",
        "runtime_available": True,
        "weights_loaded": _MODEL is not None,
        "source": _MODEL_SOURCE or source,
        "classes": ["fire", "smoke"],
        "message": (
            "Gerçek YOLOv8 çıkarımı etkin." if _MODEL is not None
            else "Model kaynağı ayarlı; ağırlıklar ilk gerçek çıkarım isteğinde yüklenecek."
        ),
        "warning": "Araştırma modeli Türkiye'deki saha koşulları için bağımsız olarak doğrulanmamıştır; resmi yangın alarmı değildir.",
    }


def _load_model():
    global _MODEL, _MODEL_SOURCE
    if _MODEL is not None:
        return _MODEL
    with _MODEL_LOCK:
        if _MODEL is not None:
            return _MODEL
        try:
            from ultralytics import YOLO
        except ImportError as exc:
            raise RuntimeError("YOLOv8 çalışma ortamı kurulu değil; requirements-ml.txt yüklenmeli.") from exc

        configured_path = os.getenv("NEXORA_YOLO_MODEL_PATH", "").strip()
        if configured_path:
            path = Path(configured_path).expanduser()
            if not path.is_file():
                raise RuntimeError("NEXORA_YOLO_MODEL_PATH dosyası bulunamadı.")
            source = str(path)
        else:
            repo_id = os.getenv("NEXORA_YOLO_HF_REPO_ID", DEFAULT_HF_REPO).strip()
            filename = os.getenv("NEXORA_YOLO_HF_FILENAME", DEFAULT_HF_FILENAME).strip()
            if not repo_id or not filename:
                raise RuntimeError("YOLO ağırlık kaynağı yapılandırılmamış.")
            try:
                from huggingface_hub import hf_hub_download
                path = Path(hf_hub_download(repo_id=repo_id, filename=filename))
            except Exception as exc:
                raise RuntimeError("YOLO ağırlıkları indirilemedi; model deposu, ağ bağlantısı ve lisans koşullarını kontrol edin.") from exc
            source = repo_id + "/" + filename

        model = YOLO(str(path))
        names = getattr(model, "names", {})
        if isinstance(names, list):
            labels = [str(value).strip().lower() for value in names]
        elif isinstance(names, dict):
            labels = [str(value).strip().lower() for value in names.values()]
        else:
            labels = []
        if not any("fire" in label for label in labels) or not any("smoke" in label for label in labels):
            raise RuntimeError("Yüklenen ağırlıklar hem fire hem smoke sınıfını içermiyor; yanlış model reddedildi.")
        _MODEL = model
        _MODEL_SOURCE = source
        return _MODEL


def format_detections(result: Any, image_width: int, image_height: int) -> list[dict[str, Any]]:
    """Convert Ultralytics result boxes to stable JSON with image-space pixels."""
    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return []
    xyxy = boxes.xyxy.cpu().tolist()
    confidences = boxes.conf.cpu().tolist()
    class_ids = boxes.cls.cpu().tolist()
    names = getattr(result, "names", {})
    detections = []
    for coordinates, confidence, class_id in zip(xyxy, confidences, class_ids):
        if isinstance(names, dict):
            label = str(names.get(int(class_id), int(class_id))).lower()
        elif isinstance(names, list) and 0 <= int(class_id) < len(names):
            label = str(names[int(class_id)]).lower()
        else:
            label = str(int(class_id))
        if "fire" not in label and "smoke" not in label:
            continue
        x1, y1, x2, y2 = [round(float(value), 2) for value in coordinates]
        detections.append({
            "class_name": label,
            "confidence": round(float(confidence), 4),
            "box_xyxy": [x1, y1, x2, y2],
            "box_normalized": [
                round(max(0.0, min(1.0, x1 / image_width)), 6),
                round(max(0.0, min(1.0, y1 / image_height)), 6),
                round(max(0.0, min(1.0, x2 / image_width)), 6),
                round(max(0.0, min(1.0, y2 / image_height)), 6),
            ],
        })
    return detections


def detect_image(image: Any, confidence: float = 0.25) -> dict[str, Any]:
    """Run a real YOLOv8 model on a decoded RGB PIL image."""
    if not 0.05 <= confidence <= 0.95:
        raise ValueError("confidence 0.05 ile 0.95 arasında olmalıdır.")
    model = _load_model()
    width, height = image.size
    started = time.perf_counter()
    results = model.predict(source=image, conf=confidence, imgsz=640, verbose=False)
    elapsed_ms = round((time.perf_counter() - started) * 1000, 2)
    result = results[0]
    detections = format_detections(result, width, height)
    return {
        "status": "inference_complete",
        "model_source": _MODEL_SOURCE,
        "image": {"width": width, "height": height},
        "inference_ms": elapsed_ms,
        "detection_count": len(detections),
        "detections": detections,
        "coordinates_type": "image_pixels_and_normalized",
        "warning": "Gerçek model çıkarımıdır; GPS konumu üretmez ve Türkiye saha koşullarında bağımsız doğrulanmamıştır. Resmi uyarı sistemi değildir.",
    }
