from fastapi import APIRouter
from app.services.firms_service import get_fire_alerts


router = APIRouter()


@router.get("/satellite-alerts")
def satellite_alerts():

    data = get_fire_alerts(
        "Marmara-Trakya"
    )


    return data
