import math
from concurrent.futures import ThreadPoolExecutor, as_completed
from copy import deepcopy
from threading import Lock
from time import monotonic

import requests

OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"
CACHE_TTL_SECONDS = 60
_CACHE = None
_CACHE_AT = 0.0
_CACHE_LOCK = Lock()

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
    # Five regions are fetched concurrently; keep each request below common
    # serverless execution budgets instead of serially waiting up to a minute.
    response = requests.get(OPEN_METEO_URL, params=params, timeout=8)
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


def _fetch_region(name, coordinates):
    lat, lon = coordinates
    try:
        weather = get_current_weather(lat, lon)
        return name, {
            "region": name,
            "coordinates": {"latitude": lat, "longitude": lon},
            "weather": weather,
            "status": weather["status"],
        }
    except requests.RequestException as exc:
        return name, {
            "region": name,
            "coordinates": {"latitude": lat, "longitude": lon},
            "status": "error",
            "error_type": type(exc).__name__,
            "error": "Weather provider request failed; no current values are available.",
        }


def get_region_weather():
    global _CACHE, _CACHE_AT
    now = monotonic()
    with _CACHE_LOCK:
        if _CACHE is not None and now - _CACHE_AT < CACHE_TTL_SECONDS:
            return deepcopy(_CACHE)

    results_by_name = {}
    with ThreadPoolExecutor(max_workers=len(REGIONS)) as pool:
        futures = {
            pool.submit(_fetch_region, name, coordinates): name
            for name, coordinates in REGIONS.items()
        }
        for future in as_completed(futures):
            name, result = future.result()
            results_by_name[name] = result

    # Preserve the stable region order expected by the UI.
    results = [results_by_name[name] for name in REGIONS]
    # Cache only when at least one genuine provider response arrived. Never
    # cache a full error response as if it were current weather.
    if any(item.get("status") in {"available", "partial"} for item in results):
        with _CACHE_LOCK:
            _CACHE = deepcopy(results)
            _CACHE_AT = monotonic()
    return results
