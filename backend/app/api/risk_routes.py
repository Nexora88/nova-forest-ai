from fastapi import APIRouter, HTTPException, Query
from app.services.risk_service import calculate_risk
from app.services.weather_service import REGIONS, get_current_weather
from app.services.firms_service import get_firms_alerts
from app.engine.specialized_risk_engine import apiary_risk, forest_risk

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


def _require_weather_values(weather):
    required = ("temperature", "humidity", "wind", "precipitation", "observed_at")
    missing = [key for key in required if weather.get(key) is None]
    if missing:
        raise HTTPException(
            status_code=502,
            detail={"message": "Hava sağlayıcısından gerekli tüm alanlar alınamadı; skor hesaplanmadı.", "missing_fields": missing},
        )


@router.get("/specialized")
def specialized(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    pollen: float | None = None,
    ndvi: float | None = Query(None, ge=-1, le=1),
    ndmi: float | None = Query(None, ge=-1, le=1),
    fire_hotspots: int | None = Query(None, ge=0),
):
    try:
        weather = get_current_weather(lat, lon)
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Hava verisi alınamadı ({type(exc).__name__}).") from exc
    _require_weather_values(weather)
    common = {
        "temperature": weather["temperature"],
        "humidity": weather["humidity"],
        "wind": weather["wind"],
        "precipitation": weather["precipitation"],
    }
    hotspot_input_available = fire_hotspots is not None
    return {
        "status": "available",
        "coordinates": {"latitude": lat, "longitude": lon},
        "weather": weather,
        "apiary": apiary_risk(**common, pollen=pollen),
        "forest": forest_risk(**common, ndvi=ndvi, ndmi=ndmi, fire_hotspots=fire_hotspots),
        "input_quality": {
            "weather": weather["status"],
            "pollen_provided": pollen is not None,
            "ndvi_provided": ndvi is not None,
            "ndmi_provided": ndmi is not None,
            "fire_hotspot_count_provided": hotspot_input_available,
        },
        "sources": ["Open-Meteo", "NexoraWildfire specialist risk engine"],
        "note": "Skorlar karar destek sinyalidir; ölçüm veya saha gözleminin yerine geçmez. Sağlanmayan girdiler sıfır ölçüm olarak kabul edilmemelidir.",
    }


@router.get("/risk-analysis")
def risk_analysis():
    current_firms = get_firms_alerts(days=1)
    history_firms = get_firms_alerts(days=7)
    current_firms_available = current_firms.get("status") == "available"
    history_firms_available = history_firms.get("status") == "available"
    current_alerts = current_firms.get("alerts", []) if current_firms_available else []
    history_alerts = history_firms.get("alerts", []) if history_firms_available else []
    results = []

    for name, (lat, lon) in REGIONS.items():
        try:
            weather = get_current_weather(lat, lon)
            _require_weather_values(weather)
            nearby_current = _nearby_hotspots(lat, lon, current_alerts)
            nearby_history = _nearby_hotspots(lat, lon, history_alerts)
            fire_alert = bool(nearby_current) if current_firms_available else False

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
                "analysis_scope": "weather_only_hotspot_provider_unavailable" if not current_firms_available else "weather_plus_nasa_firms_hotspots; sentinel_ndvi_not_integrated",
                "data_quality": {
                    "weather": weather["status"],
                    "nasa_firms_24h": current_firms.get("status"),
                    "nasa_firms_7d": history_firms.get("status"),
                    "sentinel2_ndvi": "not_computed",
                },
                "satellite": {
                    "sentinel_2": {
                        "status": "ndvi_not_computed",
                        "ndvi": None,
                        "ndvi_status": "no_processed_value",
                        "processed_imagery": False,
                        "bands_used_by_ndvi": {"red": "B04", "nir": "B08"},
                    },
                    "nasa_firms": {
                        "status": current_firms.get("status"),
                        "nearby_hotspot": bool(nearby_current) if current_firms_available else None,
                        "nearby_hotspots_24h": len(nearby_current) if current_firms_available else None,
                        "nearby_hotspots_7d": len(nearby_history) if history_firms_available else None,
                        "alert_count_24h_trakya": current_firms.get("alert_count") if current_firms_available else None,
                        "alert_count_7d_trakya": history_firms.get("alert_count") if history_firms_available else None,
                        "history": nearby_history[:12] if history_firms_available else [],
                    },
                },
                "data_source": ["Open-Meteo", "NexoraWildfire rule-based risk engine"] + (["NASA FIRMS"] if current_firms_available else []),
            })
        except HTTPException as error:
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "status": "data_error",
                "error": error.detail,
            })
        except Exception as error:
            results.append({
                "region": name,
                "coordinates": {"latitude": lat, "longitude": lon},
                "status": "data_error",
                "error_type": type(error).__name__,
                "error": "Regional analysis failed; no risk score is available for this region.",
            })

    valid = [result for result in results if result.get("analysis")]
    average = round(sum(result["analysis"]["risk_score"] for result in valid) / len(valid)) if valid else None
    all_weather_valid = len(valid) == len(REGIONS)
    overall_status = "available" if all_weather_valid and current_firms_available and history_firms_available else "partial"

    return {
        "system": "NexoraWildfire AI",
        "status": overall_status,
        "analysis_type": "Regional Environmental Risk",
        "region_count": len(REGIONS),
        "regions_with_scores": len(valid),
        "average_risk": average,
        "average_risk_scope": "weather_only_hotspot_provider_unavailable" if not current_firms_available else "weather_plus_nasa_firms_if_available; sentinel_ndvi_not_integrated",
        "satellite_status": current_firms.get("status"),
        "history_days": 7,
        "note": "Rule-based decision-support score, not a trained fire probability, official warning, or historical fire record. Missing providers and NDVI are shown as unavailable rather than as zero observations.",
        "regions": results,
    }
