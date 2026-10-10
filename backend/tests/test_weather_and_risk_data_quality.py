from fastapi import HTTPException

from app.api import risk_routes
from app.services import weather_service


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_weather_marks_missing_fields_as_partial_not_zero(monkeypatch):
    monkeypatch.setattr(
        weather_service.requests,
        "get",
        lambda *args, **kwargs: FakeResponse({
            "current": {
                "temperature_2m": 28.0,
                "relative_humidity_2m": 42,
                "wind_speed_10m": 16,
                "precipitation": None,
                "time": "2026-10-10T12:00",
            }
        }),
    )

    result = weather_service.get_current_weather(41.6771, 26.5557)

    assert result["status"] == "partial"
    assert result["precipitation"] is None
    assert "precipitation" in result["missing_fields"]


def test_specialized_risk_fails_closed_when_required_weather_is_missing(monkeypatch):
    monkeypatch.setattr(
        risk_routes,
        "get_current_weather",
        lambda *args: {
            "temperature": 28,
            "humidity": 42,
            "wind": 16,
            "precipitation": None,
            "observed_at": "2026-10-10T12:00",
            "status": "partial",
        },
    )

    try:
        risk_routes.specialized(lat=41.6771, lon=26.5557)
    except HTTPException as exc:
        assert exc.status_code == 502
        assert "precipitation" in str(exc.detail)
    else:
        raise AssertionError("Risk score must not be calculated from missing weather fields.")


def test_risk_analysis_does_not_claim_missing_firms_means_zero_hotspots(monkeypatch):
    monkeypatch.setattr(
        risk_routes,
        "get_firms_alerts",
        lambda days: {
            "status": "not_configured",
            "alert_count": None,
            "alerts": [],
            "days": days,
            "source": "NASA FIRMS",
        },
    )
    monkeypatch.setattr(
        risk_routes,
        "get_current_weather",
        lambda *args: {
            "temperature": 28,
            "humidity": 42,
            "wind": 16,
            "precipitation": 0,
            "observed_at": "2026-10-10T12:00",
            "source": "Open-Meteo",
            "status": "available",
            "missing_fields": [],
        },
    )

    result = risk_routes.risk_analysis()

    assert result["status"] == "partial"
    assert result["satellite_status"] == "not_configured"
    assert result["regions"][0]["satellite"]["nasa_firms"]["nearby_hotspot"] is None
    assert result["regions"][0]["satellite"]["nasa_firms"]["alert_count_24h_trakya"] is None
    assert result["regions"][0]["analysis_scope"] == "weather_only_hotspot_provider_unavailable"
