"""Research-only model trained from UCI's documented Algerian Forest Fires dataset."""
from __future__ import annotations

import json
import math
import os
from pathlib import Path
from typing import Any

BACKEND_ROOT = Path(__file__).resolve().parents[2]
MODEL_PATH = Path(os.getenv("NEXORA_UCI_MODEL_PATH", str(BACKEND_ROOT / "models" / "uci_fire_weather_rf.joblib")))
METADATA_PATH = Path(os.getenv("NEXORA_UCI_MODEL_METADATA_PATH", str(BACKEND_ROOT / "models" / "uci_fire_weather_rf_metadata.json")))
FEATURES = ["temperature_max", "humidity_min", "wind_max", "precipitation_sum"]


def model_status() -> dict[str, Any]:
    if not MODEL_PATH.is_file() or not METADATA_PATH.is_file():
        return {"status": "not_trained", "model_type": "RandomForestClassifier", "artifact_present": False, "features": FEATURES}
    try:
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    except (OSError, json.JSONDecodeError):
        return {"status": "artifact_invalid", "model_type": "RandomForestClassifier", "artifact_present": True, "features": FEATURES}
    if metadata.get("model_type") != "RandomForestClassifier" or metadata.get("features") != FEATURES or not metadata.get("evaluation", {}).get("metrics"):
        return {"status": "artifact_invalid", "model_type": "RandomForestClassifier", "artifact_present": True, "features": FEATURES}
    return {"status": "ready", "model_type": metadata["model_type"], "artifact_present": True, "features": FEATURES, "metadata": metadata, "scope": "research_prototype"}


def predict(features: dict[str, float]) -> dict[str, Any]:
    status = model_status()
    if status["status"] != "ready":
        raise RuntimeError("The UCI research model is not trained or its artifact is invalid.")
    missing = [name for name in FEATURES if name not in features]
    if missing:
        raise ValueError("Missing features: " + ", ".join(missing))
    values = [float(features[name]) for name in FEATURES]
    if not all(math.isfinite(value) for value in values):
        raise ValueError("All model inputs must be finite numeric values.")
    import joblib
    model = joblib.load(MODEL_PATH)
    probabilities = model.predict_proba([values])[0]
    classes = list(model.classes_)
    if 1 not in classes:
        raise RuntimeError("The trained artifact does not contain the fire class.")
    probability = float(probabilities[classes.index(1)])
    metadata = status["metadata"]
    return {
        "status": "available",
        "model_type": status["model_type"],
        "research_risk_index": round(probability * 100, 1),
        "same_day_fire_class_probability": round(probability, 4),
        "prediction_target": "same-day fire / not-fire class",
        "model_version": metadata.get("model_version"),
        "evaluation": metadata.get("evaluation"),
        "scope": "research_prototype",
        "warning": "Trained on 244 daily observations from two Algerian regions in 2012. Not validated for Thrace/Türkiye or other regions; not an official warning or operational forecast.",
    }
