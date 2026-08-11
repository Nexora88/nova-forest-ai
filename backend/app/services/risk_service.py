# =====================================
# NOVA-FOREST AI
# Risk Analysis Service
# =====================================



def calculate_risk(
    temperature,
    humidity,
    wind,
    ndvi,
    fire_alert=False
):


    score = 0



    # Sıcaklık analizi

    if temperature >= 40:

        score += 30

    elif temperature >= 30:

        score += 15




    # Nem analizi

    if humidity <= 20:

        score += 25

    elif humidity <= 40:

        score += 10





    # Rüzgar analizi

    if wind >= 40:

        score += 25

    elif wind >= 20:

        score += 10





    # Bitki kuruluk analizi

    if ndvi < 0.2:

        score += 20

    elif ndvi < 0.4:

        score += 10





    # NASA FIRMS alarmı

    if fire_alert:

        score += 20





    # Maksimum 100

    if score > 100:

        score = 100





    return {


        "risk_score":

        score,


        "risk_level":

        get_risk_level(score)

    }






def get_risk_level(score):


    if score < 25:

        return "LOW"



    elif score < 50:

        return "MEDIUM"



    elif score < 75:

        return "HIGH"



    else:

        return "CRITICAL"
