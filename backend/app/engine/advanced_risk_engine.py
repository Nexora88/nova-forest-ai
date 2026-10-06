# Nova-Forest AI — Explainable Environmental Risk Engine

def get_level(score):
    if score < 25:
        return "LOW"
    if score < 50:
        return "MEDIUM"
    if score < 75:
        return "HIGH"
    return "CRITICAL"

def calculate_advanced_risk(temperature, humidity, wind_speed, ndvi=None, fire_alert=False):
    score = 0
    factors = []

    if temperature >= 40:
        score += 30; factors.append("extreme_temperature")
    elif temperature >= 30:
        score += 15; factors.append("high_temperature")
    elif temperature >= 25:
        score += 7; factors.append("elevated_temperature")

    if humidity <= 20:
        score += 25; factors.append("very_low_humidity")
    elif humidity <= 40:
        score += 10; factors.append("low_humidity")
    elif humidity <= 55:
        score += 4; factors.append("moderate_dryness")

    if wind_speed >= 40:
        score += 25; factors.append("strong_wind")
    elif wind_speed >= 20:
        score += 10; factors.append("elevated_wind")
    elif wind_speed >= 12:
        score += 4; factors.append("moderate_wind")

    if ndvi is not None:
        if ndvi < 0.20:
            score += 20; factors.append("very_low_vegetation")
        elif ndvi < 0.40:
            score += 10; factors.append("low_vegetation")

    if fire_alert:
        score += 20; factors.append("satellite_hotspot")

    score = min(round(score), 100)
    return {
        "risk_score": score,
        "risk_level": get_level(score),
        "factors": factors,
        "ndvi_used": ndvi is not None,
        "fire_alert_used": bool(fire_alert),
        "engine": "Nova-Forest Explainable Risk Engine v1"
    }
