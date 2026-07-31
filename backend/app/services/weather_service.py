import requests


def get_weather(latitude, longitude):
    """
    Open-Meteo üzerinden hava durumu verisi çeker.
    """

    url = (
        "https://api.open-meteo.com/v1/forecast"
        f"?latitude={latitude}"
        f"&longitude={longitude}"
        "&current=temperature_2m,relative_humidity_2m,wind_speed_10m"
    )

    try:
        response = requests.get(url, timeout=10)
        data = response.json()

        current = data.get("current", {})

        return {
            "temperature": current.get("temperature_2m"),
            "humidity": current.get("relative_humidity_2m"),
            "wind_speed": current.get("wind_speed_10m")
        }

    except Exception as error:
        return {
            "error": str(error)
        }
