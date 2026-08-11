# =====================================
# NOVA-FOREST AI
# Weather API Routes
# =====================================


from fastapi import APIRouter

from app.services.weather_service import get_region_weather



router = APIRouter()



@router.get("/weather")
def weather_data():


    return {


        "source":
        "Open-Meteo",


        "regions":
        get_region_weather()


    }
