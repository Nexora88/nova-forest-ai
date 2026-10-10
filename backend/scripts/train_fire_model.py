"""Train and evaluate a model for NASA FIRMS hotspot-detection proxies.

FIRMS detections are not verified wildfire labels. Negative samples represent
no observed FIRMS detection within a radius, not verified absence of fire.
Use chronological holdout and compare against a prior-only baseline.
"""
import argparse
import datetime as dt
import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    average_precision_score, brier_score_loss, confusion_matrix,
    f1_score, precision_score, recall_score, roc_auc_score,
)

FEATURES = [
    "temperature_max", "humidity_min", "wind_max", "precipitation_sum",
    "et0", "vpd_max", "precipitation_previous_6d",
]


def split_by_time(frame, fraction=0.8):
    dates = sorted(frame["date"].astype(str).unique())
    if len(dates) < 10:
        raise ValueError("At least 10 distinct dates are required for a temporal holdout.")
    cutoff = dates[min(len(dates) - 1, max(1, int(len(dates) * fraction)))]
    train = frame[frame["date"].astype(str) < cutoff].copy()
    test = frame[frame["date"].astype(str) >= cutoff].copy()
    if train.empty or test.empty:
        raise ValueError("Temporal split created an empty partition.")
    return train, test, cutoff


def score(y, probability, threshold=0.5):
    prediction = (probability >= threshold).astype(int)
    metrics = {
        "sample_count": int(len(y)),
        "positive_count": int(np.sum(y == 1)),
        "negative_count": int(np.sum(y == 0)),
        "positive_prevalence": float(np.mean(y)),
        "threshold": threshold,
        "precision": float(precision_score(y, prediction, zero_division=0)),
        "recall": float(recall_score(y, prediction, zero_division=0)),
        "f1": float(f1_score(y, prediction, zero_division=0)),
        "confusion_matrix_labels_0_1": confusion_matrix(y, prediction, labels=[0, 1]).tolist(),
        "brier_score": float(brier_score_loss(y, probability)),
        "roc_auc": float(roc_auc_score(y, probability)) if len(np.unique(y)) == 2 else None,
        "average_precision": float(average_precision_score(y, probability)) if len(np.unique(y)) == 2 else None,
    }
    return metrics


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", default="data/thrace_fire_dataset.csv")
    parser.add_argument("--model-output", default="models/fire_risk.joblib")
    parser.add_argument("--metadata-output", default="models/fire_risk_metadata.json")
    parser.add_argument("--min-rows", type=int, default=100)
    parser.add_argument("--seed", type=int, default=20261010)
    args = parser.parse_args()

    source = Path(args.input)
    if not source.is_file():
        raise SystemExit(f"Dataset not found: {source}. Build it from documented real providers first.")
    frame = pd.read_csv(source)
    required = ["date", "label", "label_type", *FEATURES]
    missing = [column for column in required if column not in frame.columns]
    if missing:
        raise SystemExit("Missing dataset columns: " + ", ".join(missing))
    if len(frame) < args.min_rows:
        raise SystemExit(f"Only {len(frame)} rows; at least {args.min_rows} are required.")
    if not frame["label_type"].astype(str).str.contains(
        "firms_hotspot_proxy|no_firms_detection", regex=True
    ).all():
        raise SystemExit("Unexpected label provenance; refusing to train.")
    frame["date"] = pd.to_datetime(frame["date"], errors="coerce").dt.strftime("%Y-%m-%d")
    frame["label"] = pd.to_numeric(frame["label"], errors="coerce")
    for feature in FEATURES:
        frame[feature] = pd.to_numeric(frame[feature], errors="coerce")
    frame = frame.dropna(subset=["date", "label", *FEATURES])
    frame = frame[frame["label"].isin([0, 1])]
    if len(frame) < args.min_rows or set(frame["label"].astype(int).unique()) != {0, 1}:
        raise SystemExit("Too few complete rows or only one label remains after cleaning.")
    if not np.isfinite(frame[FEATURES].to_numpy(dtype=float)).all():
        raise SystemExit("Non-finite feature values remain after cleaning.")

    train, test, cutoff = split_by_time(frame)
    y_train, y_test = train["label"].astype(int), test["label"].astype(int)
    if set(y_train.unique()) != {0, 1} or set(y_test.unique()) != {0, 1}:
        raise SystemExit("Both labels must occur in both chronological partitions; collect more data.")

    model = RandomForestClassifier(
        n_estimators=400, min_samples_leaf=3,
        class_weight="balanced_subsample", random_state=args.seed, n_jobs=-1,
    )
    model.fit(train[FEATURES], y_train)
    positive_index = list(model.classes_).index(1)
    probability = model.predict_proba(test[FEATURES])[:, positive_index]
    evaluation = score(y_test.to_numpy(), probability)

    baseline = DummyClassifier(strategy="prior")
    baseline.fit(train[FEATURES], y_train)
    baseline_probability = baseline.predict_proba(test[FEATURES])[:, list(baseline.classes_).index(1)]
    baseline_metrics = score(y_test.to_numpy(), baseline_probability)

    model_path, metadata_path = Path(args.model_output), Path(args.metadata_output)
    model_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, model_path)
    metadata = {
        "model_version": "thrace-hotspot-proxy-weather-v1",
        "model_type": "RandomForestClassifier",
        "trained_at": dt.datetime.now(dt.timezone.utc).isoformat(),
        "target": "firms_hotspot_proxy",
        "target_definition": "NASA FIRMS satellite hotspot detection; not independently verified wildfire.",
        "negative_definition": "No FIRMS detection within 1 km at sampled location/date; not proof of fire absence.",
        "features": FEATURES,
        "dataset_path": str(source),
        "dataset_rows_used": int(len(frame)),
        "distinct_dates": int(frame["date"].nunique()),
        "train_rows": int(len(train)),
        "test_rows": int(len(test)),
        "temporal_test_start": cutoff,
        "split_method": "chronological holdout by date; no random row split",
        "evaluation": evaluation,
        "baseline_prior_classifier": baseline_metrics,
        "vegetation_indices": {"ndvi": "not integrated", "ndmi": "not integrated"},
        "limitations": [
            "Metrics describe FIRMS hotspot proxy discrimination, not verified fire prediction accuracy.",
            "No detection is not proof that no fire occurred.",
            "ERA5-Land is reanalysis, not a local weather-station observation.",
            "Not validated for operational alerts or emergency response.",
        ],
        "feature_importance": {
            name: float(value)
            for name, value in zip(FEATURES, model.feature_importances_)
        },
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({
        "model_output": str(model_path),
        "metadata_output": str(metadata_path),
        "evaluation": evaluation,
        "baseline_prior_classifier": baseline_metrics,
        "warning": "Metrics apply only to FIRMS hotspot proxies, not verified wildfire prediction.",
    }, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
