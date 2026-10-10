"""Transparent specialist decision signals; not guarantees."""


def _level(score):
    return "LOW" if score < 25 else "MEDIUM" if score < 50 else "HIGH" if score < 75 else "CRITICAL"


def _clamp(value):
    return max(0, min(100, round(value)))


def apiary_risk(temperature, wind, precipitation, humidity, pollen=None):
    score = 0
    factors = []
    if temperature < 12 or temperature > 35:
        score += 30
        factors.append("temperature")
    elif temperature < 16 or temperature > 32:
        score += 12
        factors.append("temperature")
    if wind >= 30:
        score += 35
        factors.append("strong_wind")
    elif wind >= 20:
        score += 18
        factors.append("wind")
    if precipitation >= 2:
        score += 30
        factors.append("rain")
    elif precipitation > 0.5:
        score += 12
        factors.append("rain")
    if humidity >= 90:
        score += 10
        factors.append("very_high_humidity")
    if pollen is not None and pollen >= 120:
        score += 5
        factors.append("high_pollen")
    score = _clamp(score)
    return {
        "risk_score": score,
        "level": _level(score),
        "factors": factors,
        "basis": ["temperature", "wind", "precipitation", "humidity", "pollen"],
        "note": "Uçuş koşulu için karar destek sinyalidir; yerel gözlem gerekir.",
    }


def forest_risk(temperature, humidity, wind, precipitation=None, ndvi=None, ndmi=None, fire_hotspots=None):
    score = 0
    factors = []
    if temperature >= 35:
        score += 25
        factors.append("heat")
    elif temperature >= 30:
        score += 12
        factors.append("heat")
    if humidity <= 25:
        score += 22
        factors.append("dry_air")
    elif humidity <= 40:
        score += 10
        factors.append("low_humidity")
    if wind >= 30:
        score += 25
        factors.append("strong_wind")
    elif wind >= 20:
        score += 12
        factors.append("wind")
    if precipitation is not None and precipitation <= 0.1:
        score += 8
        factors.append("low_recent_precipitation")
    if ndvi is not None and ndvi < 0.35:
        score += 10
        factors.append("low_ndvi")
    if ndmi is not None and ndmi < 0.05:
        score += 15
        factors.append("low_ndmi")
    if fire_hotspots is not None and fire_hotspots > 0:
        score += 20
        factors.append("firms_hotspot")
    score = _clamp(score)
    missing = []
    if precipitation is None:
        missing.append("precipitation")
    if ndvi is None:
        missing.append("ndvi")
    if ndmi is None:
        missing.append("ndmi")
    if fire_hotspots is None:
        missing.append("fire_hotspots")
    return {
        "risk_score": score,
        "level": _level(score),
        "factors": factors,
        "basis": ["weather", "Sentinel-2 NDVI/NDMI when available", "NASA FIRMS when configured"],
        "missing_inputs": missing,
        "note": "Eksik bileşenler sıfır gözlem sayılmaz; skor yalnızca mevcut girdilerle sınırlı bir karar destek sinyalidir.",
    }
