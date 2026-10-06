from app.engine.advanced_risk_engine import calculate_advanced_risk

def calculate_risk(temperature, humidity, wind, ndvi=None, fire_alert=False):
    result = calculate_advanced_risk(
        temperature=temperature,
        humidity=humidity,
        wind_speed=wind,
        ndvi=ndvi,
        fire_alert=fire_alert,
    )
    return result
