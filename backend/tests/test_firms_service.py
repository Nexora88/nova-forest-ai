import requests
import pytest

from app.services.firms_service import get_firms_alerts, validate_bbox


def test_valid_napa_valley_bbox_is_preserved():
    bbox = validate_bbox(-122.55, 38.20, -122.20, 38.55)
    assert bbox == {"west": -122.55, "south": 38.20, "east": -122.20, "north": 38.55}


@pytest.mark.parametrize(
    "coords",
    [
        (10, 0, 5, 1),
        (0, 5, 1, 0),
        (-181, 0, -170, 1),
        (-10, -91, 0, -80),
        (-20, 0, -5, 1),
        (0, 0, 1, 11),
        (float("inf"), 0, 1, 1),
    ],
)
def test_invalid_or_oversized_bbox_is_rejected(coords):
    with pytest.raises(ValueError):
        validate_bbox(*coords)


def test_missing_firms_key_is_not_misreported_as_zero_detections(monkeypatch):
    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    bbox = validate_bbox(-122.55, 38.20, -122.20, 38.55)

    result = get_firms_alerts(days=1, bbox=bbox)

    assert result["status"] == "not_configured"
    assert result["bbox"] == bbox
    assert result["alert_count"] is None
    assert result["checked_at_utc"]


def test_provider_error_does_not_expose_key_or_request_url(monkeypatch):
    key = "do-not-leak-this-secret"
    monkeypatch.setenv("FIRMS_MAP_KEY", key)

    def fail_request(*args, **kwargs):
        raise requests.Timeout(f"timeout for https://example.test/{key}")

    monkeypatch.setattr("app.services.firms_service.requests.get", fail_request)
    result = get_firms_alerts(days=1)

    assert result["status"] == "error"
    assert result["alert_count"] is None
    assert result["error_type"] == "Timeout"
    assert key not in str(result)
    assert "error" not in result


def test_invalid_coordinate_rows_are_skipped_not_mapped_to_zero(monkeypatch):
    monkeypatch.setenv("FIRMS_MAP_KEY", "test-key")

    class FakeResponse:
        text = (
            "latitude,longitude,confidence,frp,acq_date,acq_time\n"
            ",,nominal,1.2,2026-10-10,1200\n"
            "41.5,27.1,high,2.4,2026-10-10,1210\n"
        )

        def raise_for_status(self):
            return None

    monkeypatch.setattr("app.services.firms_service.requests.get", lambda *args, **kwargs: FakeResponse())
    result = get_firms_alerts(days=1)

    assert result["status"] == "available"
    assert result["alert_count"] == 1
    assert result["invalid_rows_skipped"] == 1
    assert result["alerts"][0]["latitude"] == 41.5
    assert result["alerts"][0]["longitude"] == 27.1
