from fastapi import APIRouter
from app.services.ndvi_service import get_ndvi_status
from app.services.firms_service import get_firms_alerts

router = APIRouter(prefix="/satellite", tags=["Satellite"])

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
