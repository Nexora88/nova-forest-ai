"""Reproducibly train and evaluate a research-only model on the official UCI dataset."""
from __future__ import annotations

import csv
import hashlib
import io
import json
from collections import Counter
from datetime import datetime, timezone
from pathlib import Path
from zipfile import ZipFile

import joblib
import requests
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, balanced_accuracy_score, f1_score, precision_score, recall_score, roc_auc_score

DATASET_URL = "https://archive.ics.uci.edu/static/public/547/algerian%2Bforest%2Bfires%2Bdataset.zip"
DATASET_PAGE = "https://archive.ics.uci.edu/dataset/547/algerian+forest+fires+dataset"
DATASET_DOI = "10.24432/C5KW4N"
FEATURES = ["temperature_max", "humidity_min", "wind_max", "precipitation_sum"]
BACKEND_ROOT = Path(__file__).resolve().parents[1]
MODEL_PATH = BACKEND_ROOT / "models" / "uci_fire_weather_rf.joblib"
METADATA_PATH = BACKEND_ROOT / "models" / "uci_fire_weather_rf_metadata.json"


def parse_dataset(csv_text: str) -> list[dict]:
    rows: list[dict] = []
    region = "unknown"
    for raw in csv.reader(io.StringIO(csv_text)):
        if not raw:
            continue
        line = " ".join(str(cell).strip() for cell in raw if str(cell).strip()).lower()
        if "bejaia region dataset" in line:
            region = "Bejaia"
            continue
        if "sidi-bel abbes region dataset" in line or "sidi bel abbes region dataset" in line:
            region = "Sidi-Bel Abbes"
            continue
        cells = [str(cell).strip() for cell in raw]
        if any(cell.lower().replace(" ", "") == "temperature" for cell in cells):
            continue
        if len(cells) < 7 or not cells[0].isdigit():
            continue
        label = cells[-1].strip().lower()
        if label not in {"fire", "not fire"}:
            continue
        try:
            values = [float(cells[index]) for index in (3, 4, 5, 6)]
        except (ValueError, IndexError):
            continue
        if not all(value == value and abs(value) != float("inf") for value in values):
            continue
        rows.append({
            "temperature_max": values[0],
            "humidity_min": values[1],
            "wind_max": values[2],
            "precipitation_sum": values[3],
            "label": 1 if label == "fire" else 0,
            "region": region,
        })
    if len(rows) != 244:
        raise ValueError(f"Expected 244 labelled UCI rows, parsed {len(rows)}.")
    if {row["label"] for row in rows} != {0, 1}:
        raise ValueError("The dataset must contain both fire and not-fire classes.")
    if Counter(row["region"] for row in rows) != {"Bejaia": 122, "Sidi-Bel Abbes": 122}:
        raise ValueError("Expected 122 labelled observations for each documented Algerian region.")
    return rows


def download_dataset() -> tuple[list[dict], str]:
    response = requests.get(DATASET_URL, timeout=45)
    response.raise_for_status()
    payload = response.content
    digest = hashlib.sha256(payload).hexdigest()
    with ZipFile(io.BytesIO(payload)) as archive:
        csv_names = [name for name in archive.namelist() if name.lower().endswith(".csv")]
        if not csv_names:
            raise ValueError("The official UCI archive contains no CSV file.")
        csv_text = archive.read(csv_names[0]).decode("utf-8-sig", errors="replace")
    return parse_dataset(csv_text), digest


def build_model() -> RandomForestClassifier:
    return RandomForestClassifier(n_estimators=300, max_depth=5, min_samples_leaf=3, class_weight="balanced", random_state=42, n_jobs=1)


def evaluate_geographic_holdout(rows: list[dict]) -> dict:
    train_rows = [row for row in rows if row["region"] == "Bejaia"]
    test_rows = [row for row in rows if row["region"] == "Sidi-Bel Abbes"]
    x_train = [[row[key] for key in FEATURES] for row in train_rows]
    y_train = [row["label"] for row in train_rows]
    x_test = [[row[key] for key in FEATURES] for row in test_rows]
    y_test = [row["label"] for row in test_rows]
    model = build_model()
    model.fit(x_train, y_train)
    probabilities = model.predict_proba(x_test)[:, list(model.classes_).index(1)]
    predictions = (probabilities >= 0.5).astype(int)
    return {
        "method": "Train on Bejaia; evaluate on geographically held-out Sidi-Bel Abbes",
        "train_region": "Bejaia",
        "train_rows": len(train_rows),
        "test_region": "Sidi-Bel Abbes",
        "test_rows": len(test_rows),
        "metrics": {
            "accuracy": round(float(accuracy_score(y_test, predictions)), 4),
            "balanced_accuracy": round(float(balanced_accuracy_score(y_test, predictions)), 4),
            "precision": round(float(precision_score(y_test, predictions, zero_division=0)), 4),
            "recall": round(float(recall_score(y_test, predictions, zero_division=0)), 4),
            "f1": round(float(f1_score(y_test, predictions, zero_division=0)), 4),
            "roc_auc": round(float(roc_auc_score(y_test, probabilities)), 4),
        },
    }


def main() -> None:
    rows, archive_sha256 = download_dataset()
    evaluation = evaluate_geographic_holdout(rows)
    model = build_model()
    model.fit([[row[key] for key in FEATURES] for row in rows], [row["label"] for row in rows])
    MODEL_PATH.parent.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, MODEL_PATH, compress=3)
    metadata = {
        "model_type": "RandomForestClassifier",
        "model_version": "uci-algerian-fire-weather-rf-1.0.0",
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "features": FEATURES,
        "target": "same-day observed fire / not-fire class",
        "dataset": {
            "name": "Algerian Forest Fires",
            "source": "UCI Machine Learning Repository",
            "url": DATASET_PAGE,
            "doi": DATASET_DOI,
            "license": "CC BY 4.0",
            "period": "June-September 2012",
            "rows": len(rows),
            "label_counts": dict(Counter("fire" if row["label"] else "not fire" for row in rows)),
            "archive_sha256": archive_sha256,
        },
        "evaluation": evaluation,
        "scope": "research_prototype",
        "limitations": [
            "Only 244 daily observations from two Algerian regions in 2012.",
            "The geographic holdout does not establish performance in Thrace/Türkiye, California, or other regions.",
            "Only four weather features are used; vegetation, fuel moisture, terrain, ignition, and human activity are omitted.",
            "The output is a same-day class probability, not a seven-day forecast, calibrated probability, official warning, or operational fire prediction.",
        ],
    }
    METADATA_PATH.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"model_path": str(MODEL_PATH), "metadata_path": str(METADATA_PATH), "dataset": metadata["dataset"], "evaluation": evaluation}, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
