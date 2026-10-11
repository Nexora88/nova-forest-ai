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
