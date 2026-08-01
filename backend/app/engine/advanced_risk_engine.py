# Nova-Forest AI
# Advanced Risk Engine


def calculate_advanced_risk(
    temperature,
    humidity,
    wind_speed,
    ndvi,
    fire_alert=False
):

    score = 0


    # Sıcaklık etkisi

    if temperature >= 35:
        score += 25

    elif temperature >= 25:
        score += 10



    # Nem etkisi

    if humidity <= 20:
        score += 25

    elif humidity <= 40:
        score += 10



    # Rüzgar etkisi

    if wind_speed >= 40:
        score += 25

    elif wind_speed >= 20:
        score += 10



    # NDVI kuruluk etkisi

    if ndvi < 0.2:
        score += 20

    elif ndvi < 0.4:
        score += 10



    # Uydu sıcak nokta etkisi

    if fire_alert:
        score += 20



    score = min(score, 100)


    return {
        "risk_score": score,
        "risk_level": get_level(score)
    }



def get_level(score):

    if score <= 25:
        return "LOW"

    elif score <= 50:
        return "MEDIUM"

    elif score <= 75:
        return "HIGH"

    else:
        return "CRITICAL"
      
