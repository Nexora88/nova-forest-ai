# =====================================
# NOVA-FOREST AI
# Weather Service
# =====================================

import requests


OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def get_current_weather(latitude, longitude):

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


    data = response.json()


    current = data.get(
        "current",
        {}
    )


    return {

        "temperature":
        current.get("temperature_2m"),

        "humidity":
        current.get("relative_humidity_2m"),

        "wind":
        current.get("wind_speed_10m")

    }
