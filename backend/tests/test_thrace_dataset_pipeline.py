from datetime import date

import numpy as np
import pandas as pd
import pytest

from scripts.build_thrace_dataset import date_chunks, distance_km, inside_bbox
from scripts.train_fire_model import score, split_by_time


def test_date_chunks_never_exceed_firms_five_day_limit():
    chunks = list(date_chunks(date(2020, 1, 1), date(2020, 1, 12)))
    assert chunks == [
        (date(2020, 1, 1), date(2020, 1, 5)),
        (date(2020, 1, 6), date(2020, 1, 10)),
        (date(2020, 1, 11), date(2020, 1, 12)),
    ]


def test_thrace_bbox_includes_pilot_points_and_excludes_outside():
    assert inside_bbox(41.6771, 26.5557)
    assert inside_bbox(41.7355, 27.2252)
    assert inside_bbox(40.9780, 27.5110)
    assert not inside_bbox(39.0, 26.5)


def test_haversine_distance_is_zero_for_same_point_and_positive_for_nearby_point():
    assert distance_km(41.0, 27.0, 41.0, 27.0) == 0
    assert 0 < distance_km(41.0, 27.0, 41.01, 27.0) < 2


def test_temporal_split_keeps_later_dates_out_of_training():
    frame = pd.DataFrame([
        {"date": f"2020-01-{day:02d}", "label": label}
        for day in range(1, 13)
        for label in (0, 1)
    ])
    train, test, cutoff = split_by_time(frame)
    assert train["date"].max() < cutoff
    assert test["date"].min() == cutoff
    assert set(train["label"]) == {0, 1}
    assert set(test["label"]) == {0, 1}


def test_temporal_split_rejects_too_few_distinct_dates():
    frame = pd.DataFrame({"date": ["2020-01-01"] * 6, "label": [0, 1, 0, 1, 0, 1]})
    with pytest.raises(ValueError):
        split_by_time(frame)


def test_metrics_report_confusion_matrix_and_calibration_error():
    y = np.array([0, 0, 1, 1])
    probabilities = np.array([0.1, 0.4, 0.6, 0.9])
    result = score(y, probabilities)
    assert result["sample_count"] == 4
    assert result["confusion_matrix_labels_0_1"] == [[2, 0], [0, 2]]
    assert result["roc_auc"] == 1.0
    assert result["brier_score"] >= 0
