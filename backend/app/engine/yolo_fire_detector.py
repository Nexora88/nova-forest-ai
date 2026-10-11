"""License-safe placeholder for future fire/smoke model integration.

No third-party pretrained detector is loaded here. The AGPL-licensed Ultralytics
runtime and checkpoint were removed to preserve the project's MIT licensing
intent. Do not report detections until a compatible model is selected and
independently evaluated on labelled regional data.
"""
from typing import Any


def model_status() -> dict[str, Any]:
    """Expose an honest status without implying a detector is available."""
    return {
        "status": "disabled_license_safe",
        "runtime_available": False,
        "weights_loaded": False,
        "source": None,
        "classes": [],
        "message": "Yangın/duman modeli lisans uyumluluğu için kaldırıldı. Uyumlu ve doğrulanmış bir model seçilene kadar çıkarım devre dışıdır.",
        "warning": "Trakya için etiketli pozitif/negatif yangın-duman görüntüleriyle bağımsız doğrulama yapılmamıştır. Resmî uyarı veya doğrulanmış yangın tahmini değildir.",
    }


def detect_image(image: Any, confidence: float = 0.25) -> dict[str, Any]:
    """Fail closed: never fabricate a detection when no compliant model exists."""
    if not 0.05 <= confidence <= 0.95:
        raise ValueError("confidence 0.05 ile 0.95 arasında olmalıdır.")
    raise RuntimeError(
        "Yangın/duman çıkarımı devre dışıdır: AGPL bileşeni kaldırıldı. "
        "Lisansı uyumlu ve bağımsız doğrulaması yapılmış model henüz seçilmedi."
    )


def format_detections(result: Any, image_width: int, image_height: int) -> list[dict[str, Any]]:
    """Normalize externally supplied box records; this does not run a model."""
    if image_width <= 0 or image_height <= 0:
        raise ValueError("image dimensions must be positive")
    boxes = getattr(result, "boxes", None)
    if boxes is None:
        return []
    xyxy = boxes.xyxy.cpu().tolist()
    confidences = boxes.conf.cpu().tolist()
    class_ids = boxes.cls.cpu().tolist()
    names = getattr(result, "names", {})
    detections = []
    for coordinates, confidence, class_id in zip(xyxy, confidences, class_ids):
        class_id = int(class_id)
        if isinstance(names, dict):
            label = str(names.get(class_id, class_id)).lower()
        elif isinstance(names, list) and 0 <= class_id < len(names):
            label = str(names[class_id]).lower()
        else:
            label = str(class_id)
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
