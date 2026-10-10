"""Inference helpers for the optional, genuinely trained wildfire model.

The API deliberately fails closed when no trained artifact exists. It never
silently substitutes rule-based scores and calls them machine learning.
"""
from __future__ import annotations

import json
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
    "ndvi_mean",
    "ndmi_mean",
    "et0",
    "vpd",
    "previous_fire_1km_30d",
]


def model_status() -> dict[str, Any]:
    if not MODEL_PATH.is_file() or not METADATA_PATH.is_file():
        return {
            "status": "not_trained",
            "model_type": "RandomForestClassifier",
            "features": FEATURES,
            "artifact_present": False,
            "message": "Model eğitimi için doğrulanmış, etiketli geçmiş veri ve model artefaktı gerekli. Kural tabanlı skor ML sonucu olarak sunulmaz.",
        }
    try:
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"status": "artifact_invalid", "artifact_present": True, "features": FEATURES}
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
    missing = [name for name in FEATURES if name not in features]
    if missing:
        raise ValueError("Eksik özellikler: " + ", ".join(missing))
    values = [[float(features[name]) for name in FEATURES]]
    if not all(__import__("math").isfinite(value) for value in values[0]):
        raise ValueError("Tüm model girdileri sonlu sayısal değer olmalıdır.")
    import joblib
    model = joblib.load(MODEL_PATH)
    probabilities = model.predict_proba(values)[0]
    classes = list(model.classes_)
    positive_index = classes.index(1) if 1 in classes else classes.index(True)
    probability = float(probabilities[positive_index])
    metadata = status.get("metadata", {})
    return {
        "status": "available",
        "model_type": status["model_type"],
        "fire_within_7d_probability": round(probability, 4),
        "model_version": metadata.get("model_version"),
        "trained_at": metadata.get("trained_at"),
        "evaluation": metadata.get("evaluation"),
        "warning": "Bu deneysel olasılık, yalnızca eğitim verisinin temsil ettiği koşullarda karar desteğidir; resmi yangın alarmı veya kesin tahmin değildir.",
    }
