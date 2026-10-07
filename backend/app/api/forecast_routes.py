from fastapi import APIRouter, HTTPException
import requests
from app.engine.specialized_risk_engine import apiary_risk, forest_risk

router = APIRouter()
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _risk(temperature, humidity, wind, precipitation):
    score = 0
    if temperature >= 40: score += 30
    elif temperature >= 30: score += 15
    elif temperature >= 25: score += 7
    if humidity <= 20: score += 25
    elif humidity <= 40: score += 10
    elif humidity <= 55: score += 4
    if wind >= 40: score += 25
    elif wind >= 20: score += 10
    elif wind >= 12: score += 4
    if precipitation >= 20: score = max(0, score - 12)
    return min(100, max(0, score))


@router.get("/forecast-risk")
def forecast_risk(lat: float, lon: float):
    try:
        params = {
            "latitude": lat, "longitude": lon,
            "daily": "temperature_2m_max,temperature_2m_min,relative_humidity_2m_min,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum,et0_fao_evapotranspiration",
            "forecast_days": 4, "timezone": "Europe/Istanbul"
        }
        r = requests.get(OPEN_METEO_URL, params=params, timeout=15)
        r.raise_for_status()
        daily = r.json().get("daily", {})
        days = []
        for i, date in enumerate(daily.get("time", [])):
            t = float(daily.get("temperature_2m_max", [0])[i] or 0)
            h = float(daily.get("relative_humidity_2m_min", [0])[i] or 0)
            wind = float(daily.get("wind_speed_10m_max", [0])[i] or 0)
            precip = float(daily.get("precipitation_sum", [0])[i] or 0)
            risk = _risk(t, h, wind, precip)
            bee = apiary_risk(temperature=t, wind=wind, precipitation=precip, humidity=h)
            forest = forest_risk(temperature=t, humidity=h, wind=wind, precipitation=precip)
            days.append({
                "date": date, "temperature_max": t, "temperature_min": float(daily.get("temperature_2m_min", [0])[i] or 0),
                "humidity_min": h, "humidity_max": float(daily.get("relative_humidity_2m_max", [0])[i] or 0),
                "wind_max": wind, "precipitation": precip,
                "et0": float(daily.get("et0_fao_evapotranspiration", [0])[i] or 0),
                "risk": risk, "apiary": bee, "forest": forest,
                "level": "KRİTİK" if risk >= 75 else "YÜKSEK" if risk >= 50 else "ORTA" if risk >= 25 else "DÜŞÜK"
            })
        return {"status": "available", "coordinates": {"latitude": lat, "longitude": lon}, "days": days, "source": "Open-Meteo", "note": "Tahmin riski hava tahminlerinden türetilen karar destek sinyalidir; kesin yangın tahmini değildir."}
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Tahmin verisi alınamadı: {exc}")
