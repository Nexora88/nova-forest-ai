#!/usr/bin/env python3
"""Train a real, auditable wildfire classifier from a curated CSV.

Required columns: observed_at (UTC-compatible timestamp), location_id (stable
site/grid identifier), the nine model features, and label (0/1). No synthetic
rows are generated. Artifacts are written only after chronological and
location-held-out validation pass minimum safety thresholds.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score, average_precision_score, brier_score_loss,
    confusion_matrix, f1_score, precision_score, recall_score, roc_auc_score,
)
from sklearn.model_selection import GroupShuffleSplit

FEATURES = [
    "temperature_max", "humidity_min", "wind_max", "precipitation_sum",
    "ndvi_mean", "ndmi_mean", "et0", "vpd", "previous_fire_1km_30d",
]
REQUIRED = ["observed_at", "location_id", "label", *FEATURES]


def evaluate(model, frame: pd.DataFrame) -> dict:
    x = frame[FEATURES].to_numpy(dtype=float)
    y = frame["label"].to_numpy(dtype=int)
    probabilities = model.predict_proba(x)[:, list(model.classes_).index(1)]
    predicted = (probabilities >= 0.5).astype(int)
    tn, fp, fn, tp = confusion_matrix(y, predicted, labels=[0, 1]).ravel()
    return {
        "rows": int(len(frame)),
        "positive_rows": int(y.sum()),
        "roc_auc": round(float(roc_auc_score(y, probabilities)), 4),
        "average_precision": round(float(average_precision_score(y, probabilities)), 4),
        "brier_score": round(float(brier_score_loss(y, probabilities)), 4),
        "accuracy": round(float(accuracy_score(y, predicted)), 4),
        "precision_at_0_5": round(float(precision_score(y, predicted, zero_division=0)), 4),
        "recall_at_0_5": round(float(recall_score(y, predicted, zero_division=0)), 4),
        "f1_at_0_5": round(float(f1_score(y, predicted, zero_division=0)), 4),
        "confusion_matrix_tn_fp_fn_tp": [int(tn), int(fp), int(fn), int(tp)],
    }


def main() -> int:
    source = os.getenv("NEXORA_LABEL_SOURCE", "").strip()
    csv_path = Path(sys.argv[1] if len(sys.argv) > 1 else "data/labeled_fire_history.csv")
    if not source:
        raise SystemExit("Refusing to train: set NEXORA_LABEL_SOURCE to a traceable dataset/provider and version.")
    if not csv_path.is_file():
        raise SystemExit(f"Dataset not found: {csv_path}; no model artifact written.")
    frame = pd.read_csv(csv_path)
    missing = sorted(set(REQUIRED) - set(frame.columns))
    if missing:
        raise SystemExit("Missing required columns: " + ", ".join(missing))
    frame = frame[REQUIRED].copy()
    frame["observed_at"] = pd.to_datetime(frame["observed_at"], utc=True, errors="coerce")
    for col in FEATURES + ["label"]:
        frame[col] = pd.to_numeric(frame[col], errors="coerce")
    frame = frame.dropna(subset=REQUIRED).sort_values("observed_at").reset_index(drop=True)
    frame = frame[np.isfinite(frame[FEATURES].to_numpy(dtype=float)).all(axis=1)]
    if not set(frame["label"].unique()).issubset({0, 1}):
        raise SystemExit("label must contain only 0 or 1.")
    frame["label"] = frame["label"].astype(int)
    positives = int(frame["label"].sum())
    negatives = int(len(frame) - positives)
    if len(frame) < 500 or positives < 50 or negatives < 50:
        raise SystemExit(f"Insufficient labelled data: rows={len(frame)}, positives={positives}, negatives={negatives}; require >=500 rows and >=50 of each class.")
    if frame["location_id"].nunique() < 5:
        raise SystemExit("At least five distinct location_id groups are required for a geographic holdout.")

    # Chronological holdout: no future observations enter model fitting.
    split_at = int(len(frame) * 0.8)
    train, temporal_test = frame.iloc[:split_at], frame.iloc[split_at:]
    if train["label"].nunique() < 2 or temporal_test["label"].nunique() < 2:
        raise SystemExit("Chronological split lacks both classes; gather a more representative time series.")
    model = RandomForestClassifier(
        n_estimators=500, min_samples_leaf=3, class_weight="balanced_subsample",
        random_state=42, n_jobs=-1,
    )
    model.fit(train[FEATURES].to_numpy(dtype=float), train["label"].to_numpy(dtype=int))
    temporal_metrics = evaluate(model, temporal_test)

    # Geographic holdout is evaluated separately. The final model is then fit
    # on all curated data only after the evaluation gate passes.
    group_split = GroupShuffleSplit(n_splits=1, test_size=0.25, random_state=42)
    train_idx, geo_idx = next(group_split.split(frame, frame["label"], groups=frame["location_id"]))
    geo_train, geo_test = frame.iloc[train_idx], frame.iloc[geo_idx]
    if geo_train["label"].nunique() < 2 or geo_test["label"].nunique() < 2:
        raise SystemExit("Geographic holdout lacks both classes; improve site coverage before training.")
    geo_model = RandomForestClassifier(
        n_estimators=500, min_samples_leaf=3, class_weight="balanced_subsample",
        random_state=42, n_jobs=-1,
    )
    geo_model.fit(geo_train[FEATURES].to_numpy(dtype=float), geo_train["label"].to_numpy(dtype=int))
    geographic_metrics = evaluate(geo_model, geo_test)

    gates = {
        "temporal_roc_auc_at_least_0_65": temporal_metrics["roc_auc"] >= 0.65,
        "geographic_roc_auc_at_least_0_60": geographic_metrics["roc_auc"] >= 0.60,
        "temporal_brier_below_0_25": temporal_metrics["brier_score"] < 0.25,
    }
    if not all(gates.values()):
        print(json.dumps({"status": "validation_failed", "gates": gates, "temporal": temporal_metrics, "geographic": geographic_metrics}, indent=2))
        raise SystemExit("Validation gate failed; no production model artifact written.")

    final_model = RandomForestClassifier(
        n_estimators=500, min_samples_leaf=3, class_weight="balanced_subsample",
        random_state=42, n_jobs=-1,
    )
    final_model.fit(frame[FEATURES].to_numpy(dtype=float), frame["label"].to_numpy(dtype=int))
    model_dir = Path(os.getenv("NEXORA_MODEL_DIR", "models"))
    model_dir.mkdir(parents=True, exist_ok=True)
    model_path = model_dir / "fire_risk.joblib"
    metadata_path = model_dir / "fire_risk_metadata.json"
    metadata = {
        "status": "validated_experimental",
        "model_type": "RandomForestClassifier",
        "model_version": "rf-fire-risk-v1",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "dataset_source": source,
        "dataset_file": csv_path.name,
        "dataset_rows": int(len(frame)),
        "positive_rows": positives,
        "negative_rows": negatives,
        "location_groups": int(frame["location_id"].nunique()),
        "features": FEATURES,
        "label_definition": "label=1 means a documented fire event within the defined prediction horizon; label=0 means verified no-event observation.",
        "evaluation": {"temporal_holdout": temporal_metrics, "geographic_holdout": geographic_metrics, "gates": gates},
        "limitations": "Experimental decision support only; not an official alert. Dataset provenance, label quality, class balance and domain shift affect validity.",
    }
    joblib.dump(final_model, model_path)
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"status": "trained_and_validated", "model_path": str(model_path), "metadata_path": str(metadata_path), "metadata": metadata}, ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
