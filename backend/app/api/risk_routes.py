from fastapi import APIRouter
from app.services.risk_service import calculate_risk
from app.services.weather_service import REGIONS, get_current_weather
from app.services.firms_service import get_firms_alerts

router = APIRouter()

def _nearby_hotspot(region_lat, region_lon, alerts, radius_km=35):
    import math
    for alert in alerts:
        try:
            lat, lon = float(alert["latitude"]), float(alert["longitude"])
            dlat = math.radians(lat - region_lat)
            dlon = math.radians(lon - region_lon)
            a = math.sin(dlat/2)**2 + math.cos(math.radians(region_lat))*math.cos(math.radians(lat))*math.sin(dlon/2)**2
            distance = 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1-a))
            if distance <= radius_km:
                return True
        except (KeyError, TypeError, ValueError):
            continue
    return False

@router.get("/risk-analysis")
def risk_analysis():
    firms = get_firms_alerts(days=1)
    alerts = firms.get("alerts", [])
    results = []

    for name, (lat, lon) in REGIONS.items():
        try:
            weather = get_current_weather(lat, lon)
            fire_alert = _nearby_hotspot(lat, lon, alerts)
            analysis = calculate_risk(
                temperature=weather["temperature"],
                humidity=weather["humidity"],
                wind=weather["wind"],
                ndvi=None,
                fire_alert=fire_alert,
            )
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "weather": weather,
                "analysis": analysis,
                "satellite": {
                    "sentinel_2": {
                        "status": "configured_as_observation_source",
                        "ndvi": None,
                        "ndvi_status": "no_live_ndvi",
                        "bands": {"red": "B04", "nir": "B08"},
                        "resolution_m": 10,
                    },
                    "nasa_firms": {
                        "status": firms.get("status"),
                        "nearby_hotspot": fire_alert,
                        "alert_count_trakya": firms.get("alert_count", 0),
                    },
                },
                "data_source": ["Open-Meteo", "Nova-Forest Risk Engine", "Sentinel-2 architecture", "NASA FIRMS"],
            })
        except Exception as error:
            results.append({"region": name, "coordinates": {"latitude": lat, "longitude": lon}, "status": "data_error", "error": str(error)})

    valid = [r for r in results if r.get("analysis")]
    average = round(sum(r["analysis"]["risk_score"] for r in valid) / len(valid)) if valid else None
    return {
        "system": "Nova-Forest AI",
        "status": "online",
        "analysis_type": "Regional Environmental Risk",
        "region_count": len(REGIONS),
        "average_risk": average,
        "satellite_status": firms.get("status"),
        "regions": results,
    }
