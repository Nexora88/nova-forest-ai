from app.services.copernicus_service import _centroid
from app.utils.pdf_generator import generate_environment_report


def test_point_centroid_uses_wgs84_lon_lat_order():
    assert _centroid({"type": "Point", "coordinates": [26.55, 41.68]}) == (41.68, 26.55)


def test_invalid_geometry_is_rejected():
    try:
        _centroid({"type": "Point", "coordinates": [999, 999]})
    except ValueError:
        return
    raise AssertionError("Invalid WGS84 coordinates should be rejected")


def test_pdf_generator_returns_pdf_bytes_and_marks_missing_data():
    pdf = generate_environment_report(
        title="Environmental status report",
        area_name="Test area",
        provider_status={"Copernicus": "not_configured"},
        indicators=[{"name": "NDVI", "value": None, "source": "Copernicus", "observed_at": None}],
        notes=["Research decision-support only."],
    )
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000


def test_ndvi_token_provider_failure_returns_explicit_error(monkeypatch):
    import requests
    from app.services import ndvi_service

    def fail_token_request(*args, **kwargs):
        raise requests.Timeout("provider timed out")

    monkeypatch.setattr(ndvi_service, "_token", fail_token_request)
    result = ndvi_service.get_area_ndvi_timeseries(
        {"type": "Point", "coordinates": [26.55, 41.68]}
    )
    assert result["status"] == "error"
    assert result["error_type"] == "Timeout"
    assert result["series"] == []


def test_weather_missing_fields_are_not_replaced_with_zero(monkeypatch):
    from app.services import ndvi_service

    class Response:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "current": {
                    "temperature_2m": 25,
                    "relative_humidity_2m": 30,
                    "wind_speed_10m": None,
                    "precipitation": 0,
                    "vapour_pressure_deficit": 2,
                    "time": "2026-10-11T12:00",
                },
                "daily": {"et0_fao_evapotranspiration": [4]},
            }

    monkeypatch.setattr(ndvi_service.requests, "get", lambda *args, **kwargs: Response())
    try:
        ndvi_service._raster_weather([26.4, 41.5, 26.6, 41.7])
    except ValueError as exc:
        assert "wind" in str(exc)
    else:
        raise AssertionError("Missing provider measurements must not become zero-valued observations")


def test_pdf_generator_escapes_user_supplied_markup():
    pdf = generate_environment_report(
        title="Area <script>bad</script> report",
        area_name="Field <north>",
        provider_status={"Provider <x>": "available"},
        notes=["User note with <b>untrusted</b> markup."],
    )
    assert pdf.startswith(b"%PDF")
    assert len(pdf) > 1000
