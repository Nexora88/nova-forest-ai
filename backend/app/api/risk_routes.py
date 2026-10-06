from fastapi import APIRouter
from app.services.risk_service import calculate_risk
from app.services.weather_service import REGIONS, get_current_weather
from app.services.firms_service import get_firms_alerts

router = APIRouter()


def _distance_km(lat1, lon1, lat2, lon2):
    import math
    dlat = math.radians(lat2 - lat1)
    dlon = math.radians(lon2 - lon1)
    a = math.sin(dlat / 2) ** 2 + math.cos(math.radians(lat1)) * math.cos(math.radians(lat2)) * math.sin(dlon / 2) ** 2
    return 6371 * 2 * math.atan2(math.sqrt(a), math.sqrt(1 - a))


def _nearby_hotspots(region_lat, region_lon, alerts, radius_km=35):
    nearby = []
    for alert in alerts:
        try:
            distance = _distance_km(
                region_lat, region_lon,
                float(alert["latitude"]), float(alert["longitude"])
            )
            if distance <= radius_km:
                item = dict(alert)
                item["distance_km"] = round(distance, 1)
                nearby.append(item)
        except (KeyError, TypeError, ValueError):
            continue
    return nearby


@router.get("/risk-analysis")
def risk_analysis():
    current_firms = get_firms_alerts(days=1)
    history_firms = get_firms_alerts(days=7)
    current_alerts = current_firms.get("alerts", [])
    history_alerts = history_firms.get("alerts", [])
    results = []

    for name, (lat, lon) in REGIONS.items():
        try:
            weather = get_current_weather(lat, lon)
            nearby_current = _nearby_hotspots(lat, lon, current_alerts)
            nearby_history = _nearby_hotspots(lat, lon, history_alerts)
            fire_alert = bool(nearby_current)

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
                        "status": current_firms.get("status"),
                        "nearby_hotspot": fire_alert,
                        "nearby_hotspots_24h": len(nearby_current),
                        "nearby_hotspots_7d": len(nearby_history),
                        "alert_count_24h_trakya": current_firms.get("alert_count", 0),
                        "alert_count_7d_trakya": history_firms.get("alert_count", 0),
                        "history": nearby_history[:12],
                    },
                },
                "data_source": ["Open-Meteo", "Nova-Forest Risk Engine", "Sentinel-2 architecture", "NASA FIRMS"],
            })
        except Exception as error:
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "status": "data_error",
                "error": str(error)
            })

    valid = [r for r in results if r.get("analysis")]
    average = round(sum(r["analysis"]["risk_score"] for r in valid) / len(valid)) if valid else None

    return {
        "system": "Nova-Forest AI",
        "status": "online",
        "analysis_type": "Regional Environmental Risk",
        "region_count": len(REGIONS),
        "average_risk": average,
        "satellite_status": current_firms.get("status"),
        "history_days": 7,
        "regions": results,
    }
