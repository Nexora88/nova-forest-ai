"""Train the wildfire model only from a real, documented labelled CSV.

Required columns: observed_at, fire_within_7d, plus the nine features listed
in app.engine.ml_fire_model.FEATURES. One row represents a location/date.
Never generate synthetic labels or use a rule-based score as the target.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, average_precision_score, brier_score_loss, roc_auc_score
from sklearn.impute import SimpleImputer
from sklearn.pipeline import Pipeline
from sklearn.model_selection import train_test_split

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from app.engine.ml_fire_model import FEATURES  # noqa: E402

DATA = Path(os.getenv("NEXORA_FIRE_TRAINING_CSV", "data/fire_training.csv"))
OUT = Path(os.getenv("NEXORA_FIRE_MODEL_DIR", "models"))
TARGET = "fire_within_7d"


def main() -> None:
    label_source = os.getenv("NEXORA_LABEL_SOURCE", "").strip()
    if not label_source:
        raise SystemExit("Set NEXORA_LABEL_SOURCE to document the real fire-label source before training.")
    if not DATA.is_file():
        raise SystemExit(f"Training data not found: {DATA}. Use documented real labels; synthetic data is forbidden.")
    frame = pd.read_csv(DATA)
    required = ["observed_at", TARGET, *FEATURES]
    missing = sorted(set(required) - set(frame.columns))
    if missing:
        raise SystemExit("Missing required columns: " + ", ".join(missing))
    frame["observed_at"] = pd.to_datetime(frame["observed_at"], utc=True, errors="coerce")
    frame[TARGET] = pd.to_numeric(frame[TARGET], errors="coerce")
    frame = frame.dropna(subset=["observed_at", TARGET]).sort_values("observed_at")
    frame = frame[frame[TARGET].isin([0, 1])]
    if len(frame) < 500:
        raise SystemExit(f"Need at least 500 valid labelled rows; found {len(frame)}.")
    if frame[TARGET].nunique() != 2 or int((frame[TARGET] == 1).sum()) < 50 or int((frame[TARGET] == 0).sum()) < 50:
        raise SystemExit("Need at least 50 positive and 50 negative examples.")
    # Chronological holdout: train on earlier observations and evaluate on later ones.
    cut = int(len(frame) * 0.8)
    train, test = frame.iloc[:cut], frame.iloc[cut:]
    if train[TARGET].nunique() != 2 or test[TARGET].nunique() != 2:
        raise SystemExit("Chronological split lacks both classes; collect broader, seasonally representative data.")
    X_train, y_train = train[FEATURES], train[TARGET].astype(int)
    X_test, y_test = test[FEATURES], test[TARGET].astype(int)
    model = Pipeline([
        ("imputer", SimpleImputer(strategy="median")),
        ("classifier", RandomForestClassifier(
            n_estimators=400, min_samples_leaf=3, class_weight="balanced_subsample",
            random_state=42, n_jobs=-1,
        )),
    ])
    model.fit(X_train, y_train)
    probabilities = model.predict_proba(X_test)[:, list(model.classes_).index(1)]
    predictions = (probabilities >= 0.5).astype(int)
    metrics = {
        "test_rows": int(len(test)),
        "positive_test_rows": int(y_test.sum()),
        "accuracy_at_0_5": round(float(accuracy_score(y_test, predictions)), 4),
        "average_precision": round(float(average_precision_score(y_test, probabilities)), 4),
        "brier_score": round(float(brier_score_loss(y_test, probabilities)), 4),
        "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 4) if y_test.nunique() == 2 else None,
        "test_period_start": test["observed_at"].min().isoformat(),
        "test_period_end": test["observed_at"].max().isoformat(),
    }
    OUT.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, OUT / "fire_risk.joblib")
    metadata = {
        "model_version": "rf-fire-1",
        "model_type": "RandomForestClassifier",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "training_rows": int(len(train)),
        "training_period_start": train["observed_at"].min().isoformat(),
        "training_period_end": train["observed_at"].max().isoformat(),
        "features": FEATURES,
        "target": TARGET,
        "evaluation": metrics,
        "label_source": label_source,
        "notes": "Chronological holdout; metrics are dataset-specific and not a guarantee of operational performance.",
    }
    (OUT / "fire_risk_metadata.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps(metadata, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
