"""General API routes.

The /regions endpoint intentionally contains no demo weather, risk, or NDVI values.
Current weather is fetched from Open-Meteo; the heuristic score is explicitly a
meteorological signal, not a validated fire probability or official warning.
"""
from fastapi import APIRouter
import requests
from app.engine.risk_engine import calculate_risk
from app.services.weather_service import REGIONS, get_current_weather

router = APIRouter()


@router.get("/")
def home():
    return {
        "project": "NexoraWildfire AI",
        "message": "Environmental decision-support API is running",
    }


@router.get("/risk-test")
def risk_test():
    # Explicit synthetic test fixture; never used as a live regional observation.
    result = calculate_risk(temperature=36, humidity=18, wind_speed=42)
    return {
        "status": "test_fixture",
        "region": "Edirne",
        "district": "Keşan",
        "analysis": result,
        "warning": "Synthetic test inputs only; not a live observation or official warning.",
    }


@router.get("/regions")
def get_regions():
    """Return live weather for pilot regions without fabricated NDVI or observations."""
    results = []
    for name, (latitude, longitude) in REGIONS.items():
        item = {
            "name": name,
            "lat": latitude,
            "lng": longitude,
            "source": "Open-Meteo",
            "status": "error",
            "temperature": None,
            "humidity": None,
            "wind": None,
            "precipitation": None,
            "observed_at": None,
            "risk": None,
            "risk_score": None,
            "ndvi": None,
            "vegetation": None,
        }
        try:
            weather = get_current_weather(latitude, longitude)
            item.update({
                "status": weather.get("status", "partial"),
                "temperature": weather.get("temperature"),
                "humidity": weather.get("humidity"),
                "wind": weather.get("wind"),
                "precipitation": weather.get("precipitation"),
                "observed_at": weather.get("observed_at"),
            })
            required = (item["temperature"], item["humidity"], item["wind"])
            if all(value is not None for value in required):
                risk = calculate_risk(
                    temperature=item["temperature"],
                    humidity=item["humidity"],
                    wind_speed=item["wind"],
                )
                item.update({
                    "risk": risk["risk_level"],
                    "risk_score": risk["risk_score"],
                    "risk_method": "transparent weather-threshold heuristic",
                })
        except (requests.RequestException, ValueError, TypeError) as exc:
            item["error_type"] = type(exc).__name__
            item["message"] = "Live weather is unavailable; no current values are claimed."
        item["ndvi_status"] = "not_requested"
        item["vegetation_note"] = "NDVI is not included in this endpoint; request a polygon-based Copernicus analysis for real satellite statistics."
        results.append(item)
    return {"status": "partial" if any(x["status"] != "available" for x in results) else "available",
            "source": "Open-Meteo",
            "warning": "Risk scores are simple weather-threshold indicators, not validated fire probabilities or official alerts.",
            "regions": results}
