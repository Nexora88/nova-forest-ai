from fastapi import APIRouter
from app.services.weather_service import get_weather
from app.engine.risk_engine import calculate_risk


router = APIRouter()


@router.get("/weather-risk")
def weather_risk():

    # Edirne örnek koordinatı

    latitude = 41.6771
    longitude = 26.5557


    weather = get_weather(
        latitude,
        longitude
    )


    if "error" in weather:
        return weather


    risk = calculate_risk(
        temperature=weather["temperature"],
        humidity=weather["humidity"],
        wind_speed=weather["wind_speed"]
    )


    return {

        "region": "Edirne",

        "weather": weather,

        "risk_analysis": risk

    }
