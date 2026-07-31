# Nova-Forest AI Risk Engine
# İlk sürüm risk hesaplama motoru


def calculate_risk(temperature, humidity, wind_speed):
    """
    Basit yangın risk skoru hesaplama
    """

    risk_score = 0

    # Sıcaklık faktörü
    if temperature >= 35:
        risk_score += 30
    elif temperature >= 25:
        risk_score += 15

    # Nem faktörü
    if humidity <= 20:
        risk_score += 30
    elif humidity <= 40:
        risk_score += 15

    # Rüzgar faktörü
    if wind_speed >= 40:
        risk_score += 40
    elif wind_speed >= 20:
        risk_score += 20

    # Maksimum 100
    risk_score = min(risk_score, 100)

    return {
        "risk_score": risk_score,
        "risk_level": get_risk_level(risk_score)
    }


def get_risk_level(score):

    if score <= 30:
        return "LOW"

    elif score <= 55:
        return "MEDIUM"

    elif score <= 75:
        return "HIGH"

    else:
        return "CRITICAL"
