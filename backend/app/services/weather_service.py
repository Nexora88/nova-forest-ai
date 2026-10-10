import math

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
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
        "timezone": "Europe/Istanbul",
    }
    response = requests.get(OPEN_METEO_URL, params=params, timeout=12)
    response.raise_for_status()
    current = response.json().get("current", {})
    result = {
        "temperature": current.get("temperature_2m"),
        "humidity": current.get("relative_humidity_2m"),
        "wind": current.get("wind_speed_10m"),
        "precipitation": current.get("precipitation"),
        "observed_at": current.get("time"),
        "source": "Open-Meteo",
    }
    required = ("temperature", "humidity", "wind", "precipitation", "observed_at")
    missing = [key for key in required if result.get(key) is None]
    for key in ("temperature", "humidity", "wind", "precipitation"):
        value = result.get(key)
        if value is not None:
            try:
                if not math.isfinite(float(value)):
                    missing.append(key)
            except (TypeError, ValueError):
                missing.append(key)
    result["status"] = "available" if not missing else "partial"
    result["missing_fields"] = sorted(set(missing))
    return result


def get_region_weather():
    results = []
    for name, (lat, lon) in REGIONS.items():
        try:
            weather = get_current_weather(lat, lon)
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "weather": weather,
                "status": weather["status"],
            })
        except requests.RequestException as exc:
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "status": "error",
                "error_type": type(exc).__name__,
                "error": "Weather provider request failed; no current values are available.",
            })
    return results
