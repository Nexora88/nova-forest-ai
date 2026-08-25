# =====================================
# NOVA-FOREST AI
# Risk Analysis API
# Version 0.3
# =====================================

from fastapi import APIRouter
import requests

from app.services.risk_service import calculate_risk


router = APIRouter()


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


REGIONS = {

    "Edirne": {
        "latitude": 41.6771,
        "longitude": 26.5557
    },

    "Kırklareli": {
        "latitude": 41.7355,
        "longitude": 27.2252
    },

    "Tekirdağ": {
        "latitude": 40.9781,
        "longitude": 27.5110
    },

    "Çanakkale": {
        "latitude": 40.1553,
        "longitude": 26.4142
    },

    "İstanbul Avrupa": {
        "latitude": 41.1500,
        "longitude": 28.6500
    }

}


def get_weather(latitude, longitude):

    params = {

        "latitude": latitude,
        "longitude": longitude,

        "current": (
            "temperature_2m,"
            "relative_humidity_2m,"
            "wind_speed_10m"
        ),

        "timezone": "Europe/Istanbul"

    }

    response = requests.get(
        OPEN_METEO_URL,
        params=params,
        timeout=10
    )

    response.raise_for_status()

    return response.json()


@router.get("/risk-analysis")
def risk_analysis():

    results = []

    for name, location in REGIONS.items():

        try:

            weather = get_weather(
                location["latitude"],
                location["longitude"]
            )

            current = weather.get(
                "current",
                {}
            )

            temperature = current.get(
                "temperature_2m"
            )

            humidity = current.get(
                "relative_humidity_2m"
            )

            wind = current.get(
                "wind_speed_10m"
            )

            # Şimdilik NDVI gerçek uydu
            # verisi bağlanana kadar
            # nötr bir değer kullanıyoruz.
            ndvi = 0.50

            fire_alert = False

            analysis = calculate_risk(

                temperature=temperature,

                humidity=humidity,

                wind=wind,

                ndvi=ndvi,

                fire_alert=fire_alert

            )

            results.append({

                "region": name,

                "coordinates": {

                    "latitude":
                    location["latitude"],

                    "longitude":
                    location["longitude"]

                },

                "weather": {

                    "temperature":
                    temperature,

                    "humidity":
                    humidity,

                    "wind":
                    wind

                },

                "analysis": analysis,

                "data_source":
                "Open-Meteo"

            })

        except Exception as error:

            results.append({

                "region": name,

                "error":
                str(error),

                "data_source":
                "Open-Meteo"

            })


    return {

        "system":
        "Nova-Forest AI",

        "status":
        "online",

        "analysis_type":
        "Regional Environmental Risk",

        "regions":
        results

    }
