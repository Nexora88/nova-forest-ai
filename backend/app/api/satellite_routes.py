from fastapi import APIRouter, HTTPException, Query
from app.services.ndvi_service import get_ndvi_status
from app.services.firms_service import get_firms_alerts

router = APIRouter(prefix="/satellite", tags=["Satellite"])


@router.get("/firms")
def nasa_firms_area(
    west: float = Query(..., ge=-180, le=180),
    south: float = Query(..., ge=-90, le=90),
    east: float = Query(..., ge=-180, le=180),
    north: float = Query(..., ge=-90, le=90),
    days: int = Query(1, ge=1, le=10),
):
    """Query NASA FIRMS for a small WGS84 bounding box anywhere on Earth."""
    if west >= east or south >= north:
        raise HTTPException(status_code=422, detail="Invalid bounding box: west must be less than east and south less than north.")
    if east - west > 10 or north - south > 10:
        raise HTTPException(status_code=422, detail="Bounding box is too large; maximum width and height are 10 degrees.")
    return get_firms_alerts(days=days, bbox={"west": west, "south": south, "east": east, "north": north})

@router.get("/status")
def satellite_status():
    ndvi = get_ndvi_status(None)
    firms = get_firms_alerts(days=1)
    return {
        "system": "NexoraWildfire AI",
        "status": "online",
        "sources": {
            "sentinel_2": {
                "status": "observation_ready",
                "ndvi": ndvi["ndvi"],
                "ndvi_status": ndvi["status"],
                "classification": ndvi["classification"],
                "resolution_m": 10,
                "bands": {
                    "red": "B04",
                    "nir": "B08",
                    "red_edge": ["B05", "B06", "B07", "B8A"],
                    "swir": ["B11", "B12"],
                },
                "purpose": "Vegetation condition and land-cover indicators",
            },
            "nasa_firms": {
                "status": firms["status"],
                "sensor": "VIIRS SNPP NRT",
                "alert_count": firms["alert_count"],
                "alerts": firms["alerts"],
                "purpose": "Satellite thermal anomaly / hotspot observation",
            },
        },
    }

@router.get("/live-check")
def satellite_live_check():
    """Live source diagnostics; catalog discovery is not presented as processed imagery."""
    import os
    from app.services.ndvi_service import search_latest_scene
    from app.services.firms_service import get_firms_alerts

    # A small Trakya search verifies the public CDSE STAC catalog is reachable.
    # Full raster/statistical processing remains a queued worker task.
    try:
        scene = search_latest_scene(41.6771, 26.5557, days=45, max_cloud=60)
        catalog = {
            "status": "scene_found" if scene else "no_matching_scene",
            "source": "Copernicus Data Space Ecosystem STAC",
            "latest_scene": scene,
            "is_processed_imagery": False,
        }
    except Exception as exc:
        catalog = {
            "status": "error",
            "source": "Copernicus Data Space Ecosystem STAC",
            "error_type": type(exc).__name__,
            "is_processed_imagery": False,
        }

    firms = get_firms_alerts(days=1)
    return {
        "checked_at_utc": __import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat(),
        "sentinel2_catalog": catalog,
        "sentinel2_processing": {
            "status": "credentials_configured" if os.getenv("CDSE_CLIENT_ID") and os.getenv("CDSE_CLIENT_SECRET") else "not_configured",
            "execution": "queued_worker_required",
            "note": "Catalog scene discovery alone does not prove NDVI/NDMI processing. Submit POST /jobs/ndvi-timeseries and verify a completed job with non-empty series.",
        },
        "nasa_firms": {
            "status": firms.get("status", "unknown"),
            "alert_count": firms.get("alert_count"),
            "days": firms.get("days", 1),
            "source": firms.get("source", "NASA FIRMS"),
            "note": "Zero alerts is not proof of zero fire risk; check status and coverage.",
        },
    }

