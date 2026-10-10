"""Inference helpers for the optional, genuinely trained wildfire-risk model.

The first research model uses historical weather features only. Its target is
a NASA FIRMS hotspot-detection proxy, not independently verified wildfire.
"""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

MODEL_PATH = Path(os.getenv("NEXORA_FIRE_MODEL_PATH", "models/fire_risk.joblib"))
METADATA_PATH = Path(os.getenv("NEXORA_FIRE_MODEL_METADATA_PATH", "models/fire_risk_metadata.json"))
FEATURES = [
    "temperature_max",
    "humidity_min",
    "wind_max",
    "precipitation_sum",
    "et0",
    "vpd_max",
    "precipitation_previous_6d",
]


def model_status() -> dict[str, Any]:
    if not MODEL_PATH.is_file() or not METADATA_PATH.is_file():
        return {
            "status": "not_trained",
            "model_type": "RandomForestClassifier",
            "features": FEATURES,
            "artifact_present": False,
            "message": "Model eğitimi için yerel geçmiş veri seti, zamana dayalı değerlendirme ve model artefaktı gerekli. Kural tabanlı skor ML sonucu olarak sunulmaz.",
        }
    try:
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"status": "artifact_invalid", "artifact_present": True, "features": FEATURES}
    if metadata.get("features") != FEATURES or metadata.get("target") != "firms_hotspot_proxy":
        return {
            "status": "artifact_invalid",
            "artifact_present": True,
            "features": FEATURES,
            "message": "Model metadata özellik listesi veya hedef tanımıyla uyuşmuyor.",
        }
    return {
        "status": "ready",
        "model_type": metadata.get("model_type", "RandomForestClassifier"),
        "features": FEATURES,
        "artifact_present": True,
        "metadata": metadata,
    }


def predict(features: dict[str, float]) -> dict[str, Any]:
    status = model_status()
    if status["status"] != "ready":
        raise RuntimeError("ML model eğitilmemiş veya artefaktı geçersiz; tahmin üretilemedi.")
    missing = [name for name in FEATURES if name not in features or features[name] is None]
    if missing:
        raise ValueError("Eksik özellikler: " + ", ".join(missing))
    values = [[float(features[name]) for name in FEATURES]]
    if not all(math.isfinite(value) for value in values[0]):
        raise ValueError("Tüm model girdileri sonlu sayısal değer olmalıdır.")
    import joblib
    model = joblib.load(MODEL_PATH)
    probabilities = model.predict_proba(values)[0]
    classes = list(model.classes_)
    if 1 not in classes:
        raise RuntimeError("Eğitilmiş modelde pozitif sınıf bulunamadı.")
    probability = float(probabilities[classes.index(1)])
    metadata = status.get("metadata", {})
    return {
        "status": "available",
        "model_type": status["model_type"],
        "hotspot_proxy_probability_7d": round(probability, 4),
        "target": "firms_hotspot_proxy",
        "model_version": metadata.get("model_version"),
        "trained_at": metadata.get("trained_at"),
        "evaluation": metadata.get("evaluation"),
        "warning": "Bu olasılık doğrulanmış yangın olasılığı değildir. NASA FIRMS sıcak nokta göstergesi için deneysel araştırma çıktısıdır; resmi uyarı veya kesin tahmin değildir.",
    }
