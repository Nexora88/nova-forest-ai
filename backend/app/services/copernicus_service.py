"""Coordinate-area Sentinel-2 analysis using the Copernicus Data Space APIs.

This module delegates pixel statistics to the existing Statistical API service.
Scene discovery can work without credentials; pixel-level NDVI/NDMI requires
CDSE_CLIENT_ID and CDSE_CLIENT_SECRET. Missing credentials are never replaced
with fabricated values.
"""
from __future__ import annotations

from typing import Any
import requests

from app.services.ndvi_service import get_area_ndvi_timeseries, search_latest_scene


def _centroid(geometry: dict[str, Any]) -> tuple[float, float]:
    kind = geometry.get("type")
    coordinates = geometry.get("coordinates")
    points: list[tuple[float, float]] = []

    def collect(value: Any) -> None:
        if isinstance(value, (list, tuple)) and len(value) >= 2 and all(
            isinstance(v, (int, float)) for v in value[:2]
        ):
            lon, lat = float(value[0]), float(value[1])
            if -180 <= lon <= 180 and -90 <= lat <= 90:
                points.append((lon, lat))
        elif isinstance(value, (list, tuple)):
            for child in value:
                collect(child)

    if kind == "Point" and isinstance(coordinates, (list, tuple)) and len(coordinates) >= 2:
        lon, lat = float(coordinates[0]), float(coordinates[1])
        if not (-180 <= lon <= 180 and -90 <= lat <= 90):
            raise ValueError("Point coordinates must be WGS84 longitude, latitude.")
        return lat, lon
    if kind not in {"Polygon", "MultiPolygon"}:
        raise ValueError("Geometry must be a WGS84 Point, Polygon, or MultiPolygon.")
    collect(coordinates)
    if not points:
        raise ValueError("Geometry has no valid WGS84 coordinate pairs.")
    return sum(p[1] for p in points) / len(points), sum(p[0] for p in points) / len(points)


def analyze_area(geometry: dict[str, Any], days: int = 180, interval: str = "P30D") -> dict[str, Any]:
    """Return a real scene reference and Statistical API series with explicit states."""
    latitude, longitude = _centroid(geometry)
    scene = None
    scene_status = "error"
    try:
        scene = search_latest_scene(latitude, longitude)
        scene_status = "available" if scene else "no_scene"
    except requests.RequestException as exc:
        scene_status = "error"
        scene_error = type(exc).__name__
    else:
        scene_error = None

    statistics = get_area_ndvi_timeseries(geometry, days=days, interval=interval)
    stats_status = statistics.get("status", "unknown")
    if stats_status == "available" and not statistics.get("series"):
        stats_status = "no_pixel_statistics"
    return {
        "status": "available" if scene and statistics.get("status") == "available" else (
            "not_configured" if statistics.get("status") == "not_configured" else (
                "partial" if scene or statistics.get("status") == "available" else (
                    "no_scene" if scene_status == "no_scene" else "error"
                )
            )
        ),
        "source": "Copernicus Data Space Ecosystem / Sentinel-2 L2A",
        "coordinates": {"latitude": round(latitude, 6), "longitude": round(longitude, 6)},
        "scene_status": scene_status,
        "latest_scene": scene,
        "scene_error_type": scene_error,
        "statistics_status": stats_status,
        "ndvi_ndmi": statistics,
        "method": "NDVI=(B08-B04)/(B08+B04); NDMI=(B08-B11)/(B08+B11), with SCL cloud/shadow filtering.",
        "warning": "Satellite vegetation indicators are not a direct fire probability or an official warning.",
    }
