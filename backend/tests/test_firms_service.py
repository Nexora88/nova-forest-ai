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


def test_missing_firms_key_returns_explicit_not_configured(monkeypatch):
    monkeypatch.delenv("FIRMS_MAP_KEY", raising=False)
    bbox = validate_bbox(-122.55, 38.20, -122.20, 38.55)

    result = get_firms_alerts(days=1, bbox=bbox)

    assert result["status"] == "not_configured"
    assert result["bbox"] == bbox
    assert result["alert_count"] == 0
