from app.services.firms_service import validate_bbox
from app.services import copernicus_service


def test_firms_bbox_accepts_global_coordinates():
    california = validate_bbox(-123.0, 37.0, -122.7, 37.4)
    australia = validate_bbox(151.0, -34.2, 151.4, -33.8)
    assert california["west"] == -123.0
    assert australia["south"] == -34.2


def test_copernicus_centroid_accepts_global_polygon():
    geometry = {
        "type": "Polygon",
        "coordinates": [[
            [-123.0, 37.0],
            [-122.8, 37.0],
            [-122.8, 37.2],
            [-123.0, 37.2],
            [-123.0, 37.0],
        ]],
    }
    latitude, longitude = copernicus_service._centroid(geometry)
    assert 37.0 <= latitude <= 37.2
    assert -123.0 <= longitude <= -122.8


def test_copernicus_analysis_uses_live_service_interfaces_for_global_geometry(monkeypatch):
    geometry = {
        "type": "Polygon",
        "coordinates": [[
            [151.0, -34.2],
            [151.2, -34.2],
            [151.2, -34.0],
            [151.0, -34.0],
            [151.0, -34.2],
        ]],
    }
    calls = {}
    monkeypatch.setattr(copernicus_service, "search_latest_scene",
                        lambda lat, lon: calls.update(scene=(lat, lon)) or {"id": "test-scene"})
    monkeypatch.setattr(copernicus_service, "get_area_ndvi_timeseries",
                        lambda geom, days, interval: calls.update(geometry=geom, days=days) or {
                            "status": "available", "series": [{"ndvi": 0.4}], "latest": {"ndvi": 0.4}
                        })
    result = copernicus_service.analyze_area(geometry)
    assert result["coordinates"]["latitude"] < 0
    assert result["coordinates"]["longitude"] > 150
    assert calls["geometry"] == geometry
    assert result["source"].startswith("Copernicus Data Space")
