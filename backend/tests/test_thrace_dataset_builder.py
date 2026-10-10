import sys
from datetime import date
from pathlib import Path

# The pipeline script lives at repository root while the backend tests may run from backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[2]))

from scripts.build_thrace_fire_dataset import haversine_km, number, parse_date, read_firms_csv


def test_haversine_zero_and_distance():
    assert haversine_km(41.0, 27.0, 41.0, 27.0) == 0
    assert 80 < haversine_km(41.0, 27.0, 42.0, 27.0) < 120


def test_read_firms_csv_filters_date_and_bbox(tmp_path):
    path = tmp_path / "firms.csv"
    path.write_text(
        "latitude,longitude,acq_date,acq_time,confidence,frp\\n"
        "41.7,26.5,2020-07-01,1030,nominal,4.2\\n"
        "41.7,26.5,2020-07-02,1030,high,5.1\\n"
        "41.7,30.5,2020-07-01,1030,high,5.1\\n"
        "bad,26.5,2020-07-01,1030,low,1\\n",
        encoding="utf-8",
    )
    detections, summary = read_firms_csv(
        [path], date(2020, 7, 1), date(2020, 7, 1),
        (25.5, 39.5, 29.5, 42.2),
    )
    assert list(detections) == [date(2020, 7, 1)]
    assert len(detections[date(2020, 7, 1)]) == 1
    assert summary["input_rows"] == 4
    assert summary["invalid_rows"] == 1
    assert summary["in_bbox_date_range_detections"] == 1


def test_numeric_and_date_helpers_reject_invalid_values():
    assert number("nan") is None
    assert number("oops") is None
    assert parse_date("2024-08-12T00:00:00Z") == date(2024, 8, 12)
