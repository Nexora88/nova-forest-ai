import requests

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"

REGIONS = {
    "Edirne": (41.6771, 26.5557),
    "Kırklareli": (41.7355, 27.2252),
    "Tekirdağ": (40.9781, 27.5110),
    "Çanakkale": (40.1553, 26.4142),
    "İstanbul Avrupa": (41.1500, 28.6500),
}

def get_current_weather(latitude, longitude):
    params = {
        "latitude": latitude,
        "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m",
        "timezone": "Europe/Istanbul",
    }
    response = requests.get(OPEN_METEO_URL, params=params, timeout=12)
    response.raise_for_status()
    current = response.json().get("current", {})
    return {
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "wind": current.get("wind_speed_10m"),
        "observed_at": current.get("time"),
    }

def get_region_weather():
    results = []
    for name, (lat, lon) in REGIONS.items():
        try:
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "weather": get_current_weather(lat, lon),
                "status": "ok",
            })
        except requests.RequestException as exc:
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "status": "error",
                "error": str(exc),
            })
    return results
