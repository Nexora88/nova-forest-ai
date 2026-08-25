# =====================================
# NOVA-FOREST AI
# Satellite Intelligence API
# Version 0.2
# =====================================

from fastapi import APIRouter

from app.services.ndvi_service import (
    get_ndvi_status
)

from app.services.firms_service import (
    get_firms_alerts
)


router = APIRouter(
    prefix="/satellite",
    tags=["Satellite"]
)


@router.get("/status")
def satellite_status():

    ndvi = get_ndvi_status(None)

    firms = get_firms_alerts(
        days=1
    )


    return {

        "system":
            "Nova-Forest AI",

        "status":
            "online",

        "satellite":

            {

                "sentinel_2":

                    {

                        "status":
                            ndvi["status"],

                        "ndvi":
                            ndvi["ndvi"],

                        "classification":
                            ndvi["classification"],

                        "source":
                            "Sentinel-2"

                    },


                "nasa_firms":

                    {

                        "status":
                            firms["status"],

                        "alert_count":
                            firms["alert_count"],

                        "alerts":
                            firms["alerts"],

                        "source":
                            "NASA FIRMS"

                    }

            }

    }
