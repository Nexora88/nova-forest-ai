from fastapi import APIRouter, HTTPException, Query
from app.services.ndvi_service import get_ndvi_status
from app.services.firms_service import get_firms_alerts, validate_bbox

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
    try:
        bbox = validate_bbox(west, south, east, north)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
    return get_firms_alerts(days=days, bbox=bbox)


@router.get("/providers/status")
def provider_credentials_status(probe: bool = Query(False)):
    """Report credential presence without exposing secrets; optionally validate them with providers."""
    import os
    from datetime import datetime, timezone
    import requests

    firms_key = os.getenv("FIRMS_MAP_KEY", "").strip()
    firms = {"status": "not_configured" if not firms_key else "configured", "secret_exposed": False}
    if probe and firms_key:
        try:
            response = requests.get(
                "https://firms.modaps.eosdis.nasa.gov/mapserver/mapkey_status/",
                params={"MAP_KEY": firms_key},
                timeout=12,
            )
            response.raise_for_status()
            payload = response.json()
            if isinstance(payload, dict) and payload.get("transaction_limit") is not None:
                firms.update({"status": "authorized", "transaction_limit": payload.get("transaction_limit"), "current_transactions": payload.get("current_transactions")})
            else:
                firms["status"] = "invalid_or_unrecognized_response"
        except Exception as exc:
            firms.update({"status": "validation_failed", "error_type": type(exc).__name__})

    client_id = os.getenv("CDSE_CLIENT_ID", "").strip()
    client_secret = os.getenv("CDSE_CLIENT_SECRET", "").strip()
    copernicus = {"status": "not_configured" if not (client_id and client_secret) else "configured", "secret_exposed": False}
    if probe and client_id and client_secret:
        try:
            from app.services.ndvi_service import _token
            token = _token()
            copernicus["status"] = "authorized" if token else "not_configured"
            copernicus["token_received"] = bool(token)
        except Exception as exc:
            copernicus.update({"status": "validation_failed", "error_type": type(exc).__name__, "token_received": False})

    return {
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "probe_requested": probe,
        "providers": {
            "nasa_firms": firms,
            "copernicus_sentinel_hub": copernicus,
            "open_meteo": {"status": "public_no_api_key_required", "secret_exposed": False},
        },
        "note": "Configuration is not proof of a successful data query. Secret values and access tokens are never returned.",
    }


@router.get("/status")
def satellite_status():
    ndvi = get_ndvi_status(None)
    firms = get_firms_alerts(days=1)
    firms_status = firms.get("status", "unknown")
    ndvi_status = ndvi.get("status", "unknown")
    has_processed_ndvi = ndvi.get("ndvi") is not None
    return {
        "system": "NexoraWildfire AI",
        "status": "available" if firms_status == "available" and has_processed_ndvi else "partial",
        "checked_at_note": "Provider query status is returned separately; this endpoint does not claim all satellite processing is complete.",
        "sources": {
            "sentinel_2": {
                "status": "processed_value_available" if has_processed_ndvi else "ndvi_not_computed",
                "ndvi": ndvi.get("ndvi"),
                "ndvi_status": ndvi_status,
                "classification": ndvi.get("classification"),
                "latest_scene": ndvi.get("latest_scene"),
                "processed_imagery": has_processed_ndvi,
                "nominal_pixel_size_m": 10,
                "bands_used_by_ndvi": {"red": "B04", "nir": "B08"},
                "purpose": "Vegetation condition indicator; catalog discovery alone is not NDVI processing",
            },
            "nasa_firms": {
                "status": firms_status,
                "sensor": "VIIRS SNPP NRT",
                "alert_count": firms.get("alert_count") if firms_status == "available" else None,
                "alerts": firms.get("alerts", []) if firms_status == "available" else [],
                "bbox": firms.get("bbox"),
                "purpose": "Satellite thermal anomaly / hotspot observation",
                "note": "A missing provider or zero detections is not proof of zero fire risk.",
            },
        },
    }


@router.get("/live-check")
def satellite_live_check():
    """Live source diagnostics; catalog discovery is not presented as processed imagery."""
    import os
    from datetime import datetime, timezone
    from app.services.ndvi_service import search_latest_scene
    from app.services.firms_service import get_firms_alerts

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
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "sentinel2_catalog": catalog,
        "sentinel2_processing": {
            "status": "credentials_configured" if os.getenv("CDSE_CLIENT_ID") and os.getenv("CDSE_CLIENT_SECRET") else "not_configured",
            "execution": "queued_worker_required",
            "note": "Catalog scene discovery alone does not prove NDVI/NDMI processing. Submit POST /jobs/ndvi-timeseries and verify a completed job with a non-empty series.",
        },
        "nasa_firms": {
            "status": firms.get("status", "unknown"),
            "alert_count": firms.get("alert_count") if firms.get("status") == "available" else None,
            "days": firms.get("days", 1),
            "source": firms.get("source", "NASA FIRMS"),
            "note": "Zero detections are not proof of zero fire risk; verify provider status and spatial/time coverage.",
        },
    }
