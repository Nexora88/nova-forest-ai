from app.api import forecast_routes


class FakeResponse:
    def __init__(self, payload):
        self.payload = payload

    def raise_for_status(self):
        return None

    def json(self):
        return self.payload


def test_forecast_skips_incomplete_days_instead_of_filling_zero(monkeypatch):
    payload = {
        "daily": {
            "time": ["2026-10-10", "2026-10-11"],
            "temperature_2m_max": [None, 31],
            "temperature_2m_min": [12, 13],
            "relative_humidity_2m_min": [25, 35],
            "relative_humidity_2m_max": [80, 82],
            "wind_speed_10m_max": [18, 20],
            "precipitation_sum": [0, 1],
            "et0_fao_evapotranspiration": [2, 3],
        }
    }
    monkeypatch.setattr(
        forecast_routes.requests,
        "get",
        lambda *args, **kwargs: FakeResponse(payload),
    )

    result = forecast_routes.forecast_risk(lat=41.6771, lon=26.5557)

    assert result["status"] == "partial"
    assert result["skipped_incomplete_days"] == 1
    assert len(result["days"]) == 1
    assert result["days"][0]["date"] == "2026-10-11"
    assert result["days"][0]["temperature_max"] == 31


def test_forecast_returns_error_when_provider_has_no_complete_days(monkeypatch):
    from fastapi import HTTPException

    payload = {
        "daily": {
            "time": ["2026-10-10"],
            "temperature_2m_max": [None],
        }
    }
    monkeypatch.setattr(
        forecast_routes.requests,
        "get",
        lambda *args, **kwargs: FakeResponse(payload),
    )

    try:
        forecast_routes.forecast_risk(lat=41.6771, lon=26.5557)
    except HTTPException as exc:
        assert exc.status_code == 502
    else:
        raise AssertionError("Incomplete provider data must not produce a risk score.")
