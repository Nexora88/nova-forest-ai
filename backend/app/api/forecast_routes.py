import math

from fastapi import APIRouter, HTTPException, Query
import requests
from app.engine.specialized_risk_engine import apiary_risk, forest_risk

router = APIRouter()
OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast"


def _risk(temperature, humidity, wind, precipitation):
    score = 0
    if temperature >= 40:
        score += 30
    elif temperature >= 30:
        score += 15
    elif temperature >= 25:
        score += 7
    if humidity <= 20:
        score += 25
    elif humidity <= 40:
        score += 10
    elif humidity <= 55:
        score += 4
    if wind >= 40:
        score += 25
    elif wind >= 20:
        score += 10
    elif wind >= 12:
        score += 4
    if precipitation >= 20:
        score = max(0, score - 12)
    return min(100, max(0, score))


def _number_at(daily, key, index):
    values = daily.get(key)
    if not isinstance(values, list) or index >= len(values) or values[index] is None:
        return None
    try:
        value = float(values[index])
    except (TypeError, ValueError):
        return None
    return value if math.isfinite(value) else None


@router.get("/forecast-risk")
def forecast_risk(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
):
    try:
        params = {
            "latitude": lat,
            "longitude": lon,
            "daily": "temperature_2m_max,temperature_2m_min,relative_humidity_2m_min,relative_humidity_2m_max,wind_speed_10m_max,precipitation_sum,et0_fao_evapotranspiration",
            "forecast_days": 7,
            "timezone": "Europe/Istanbul",
        }
        response = requests.get(OPEN_METEO_URL, params=params, timeout=15)
        response.raise_for_status()
        daily = response.json().get("daily", {})
        days = []
        skipped_days = 0
        for i, date in enumerate(daily.get("time", [])):
            values = {
                "temperature_max": _number_at(daily, "temperature_2m_max", i),
                "temperature_min": _number_at(daily, "temperature_2m_min", i),
                "humidity_min": _number_at(daily, "relative_humidity_2m_min", i),
                "humidity_max": _number_at(daily, "relative_humidity_2m_max", i),
                "wind_max": _number_at(daily, "wind_speed_10m_max", i),
                "precipitation": _number_at(daily, "precipitation_sum", i),
                "et0": _number_at(daily, "et0_fao_evapotranspiration", i),
            }
            if any(value is None for value in values.values()):
                skipped_days += 1
                continue
            t = values["temperature_max"]
            h = values["humidity_min"]
            wind = values["wind_max"]
            precip = values["precipitation"]
            risk = _risk(t, h, wind, precip)
            bee = apiary_risk(temperature=t, wind=wind, precipitation=precip, humidity=h)
            forest = forest_risk(temperature=t, humidity=h, wind=wind, precipitation=precip)
            days.append({
                "date": date,
                "temperature_max": t,
                "temperature_min": values["temperature_min"],
                "humidity_min": h,
                "humidity_max": values["humidity_max"],
                "wind_max": wind,
                "precipitation": precip,
                "et0": values["et0"],
                "risk": risk,
                "apiary": bee,
                "forest": forest,
                "level": "KRİTİK" if risk >= 75 else "YÜKSEK" if risk >= 50 else "ORTA" if risk >= 25 else "DÜŞÜK",
            })
        if not days:
            raise HTTPException(status_code=502, detail="Hava sağlayıcısı geçerli günlük değer döndürmedi; risk skoru üretilmedi.")
        return {
            "status": "available" if skipped_days == 0 else "partial",
            "coordinates": {"latitude": lat, "longitude": lon},
            "days": days,
            "skipped_incomplete_days": skipped_days,
            "forecast_horizons": {"three_day": days[:3], "seven_day": days[:7]},
            "source": "Open-Meteo",
            "method": "Rule-based weather indicator; not a trained fire-probability model",
            "note": "Tahmin riski hava tahminlerinden türetilen karar destek sinyalidir; kesin yangın tahmini veya resmî uyarı değildir.",
        }
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Tahmin verisi alınamadı ({type(exc).__name__}).") from exc


@router.get("/historical-risk")
def historical_risk(
    lat: float = Query(..., ge=-90, le=90),
    lon: float = Query(..., ge=-180, le=180),
    years: int = Query(15, ge=1, le=15),
):
    from datetime import date, timedelta

    end = date.today() - timedelta(days=1)
    start = date(end.year - years, end.month, end.day)
    params = {
        "latitude": lat,
        "longitude": lon,
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": "temperature_2m_max,temperature_2m_min,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum",
        "timezone": "Europe/Istanbul",
    }
    try:
        response = requests.get("https://archive-api.open-meteo.com/v1/archive", params=params, timeout=30)
        response.raise_for_status()
        daily = response.json().get("daily", {})
        years_map = {}
        skipped_days = 0
        for i, date_string in enumerate(daily.get("time", [])):
            keys = ("temperature_2m_max", "temperature_2m_min", "relative_humidity_2m_min", "wind_speed_10m_max", "precipitation_sum")
            vals = [_number_at(daily, key, i) for key in keys]
            if any(value is None for value in vals):
                skipped_days += 1
                continue
            year = date_string[:4]
            risk = _risk(vals[0], vals[2], vals[3], vals[4])
            row = years_map.setdefault(year, {"risk": [], "temperature": [], "humidity": [], "wind": [], "precipitation": []})
            row["risk"].append(risk)
            row["temperature"].append(vals[0])
            row["humidity"].append(vals[2])
            row["wind"].append(vals[3])
            row["precipitation"].append(vals[4])
        if not years_map:
            raise HTTPException(status_code=502, detail="Geçmiş hava sağlayıcısı geçerli günlük değer döndürmedi; geçmiş skor üretilmedi.")
        annual = []
        for year in sorted(years_map):
            values = years_map[year]
            annual.append({
                "year": int(year),
                "risk_average": round(sum(values["risk"]) / len(values["risk"]), 1),
                "risk_max": max(values["risk"]),
                "temperature_average": round(sum(values["temperature"]) / len(values["temperature"]), 1),
                "humidity_average": round(sum(values["humidity"]) / len(values["humidity"]), 1),
                "wind_average": round(sum(values["wind"]) / len(values["wind"]), 1),
                "precipitation_total": round(sum(values["precipitation"]), 1),
                "valid_days": len(values["risk"]),
            })
        return {
            "status": "available" if skipped_days == 0 else "partial",
            "years": annual,
            "skipped_incomplete_days": skipped_days,
            "period": {"start": start.isoformat(), "end": end.isoformat()},
            "source": "Open-Meteo Historical Weather API",
            "method": "Historical meteorological inputs scored with NexoraWildfire's rule-based indicator; not a fire incident record",
            "note": "Geçmiş risk skoru, geçmiş meteorolojik verilerden hesaplanmıştır; yangın kaydı veya geçmiş yangın olasılığı değildir.",
        }
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail=f"Geçmiş veri alınamadı ({type(exc).__name__}).") from exc
