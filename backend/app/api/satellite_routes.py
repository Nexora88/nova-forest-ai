# =====================================
# NOVA-FOREST AI
# Satellite Intelligence API
# Version 0.1
# =====================================

from fastapi import APIRouter

from app.services.ndvi_service import get_ndvi_status
from app.services.firms_service import get_firms_alerts


router = APIRouter(
    prefix="/satellite",
    tags=["Satellite"]
)


@router.get("/status")
def satellite_status():

    firms = get_firms_alerts(days=1)

    # Gerçek Sentinel-2 bant verisi bağlanana
    # kadar NDVI katmanı NO_DATA döndürür.
    ndvi = get_ndvi_status(None)

    return {

        "system": "Nova-Forest AI",

        "status": "online",

        "sources": {

            "sentinel_2": {
                "status": ndvi["status"],
                "ndvi": ndvi["ndvi"],
                "classification":
                    ndvi["classification"]
            },

            "nasa_firms": {

                "status":
                    firms["status"],

                "alert_count":
                    firms["alert_count"],

                "alerts":
                    firms["alerts"]

            }

        }

    }
