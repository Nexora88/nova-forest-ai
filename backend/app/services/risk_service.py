# =====================================
# NOVA-FOREST AI
# Risk Analysis Service v0.2
# =====================================



def get_risk_level(score):


    if score < 25:

        return "LOW"


    elif score < 50:

        return "MEDIUM"


    elif score < 75:

        return "HIGH"


    else:

        return "CRITICAL"







def calculate_risk(
    temperature,
    humidity,
    wind,
    ndvi,
    fire_alert=False
):


    score = 0



    # Sıcaklık etkisi

    if temperature >= 40:

        score += 30

    elif temperature >= 30:

        score += 15



    # Nem etkisi

    if humidity <= 20:

        score += 25

    elif humidity <= 40:

        score += 10



    # Rüzgar etkisi

    if wind >= 40:

        score += 25

    elif wind >= 20:

        score += 10



    # Bitki kuruluğu

    if ndvi < 0.2:

        score += 20

    elif ndvi < 0.4:

        score += 10



    # NASA FIRMS alarmı

    if fire_alert:

        score += 20



    if score > 100:

        score = 100



    return {


        "risk_score": score,


        "risk_level": get_risk_level(score)

    }








def analyze_regions():


    regions = [


        {


            "name": "Edirne",

            "temperature": 36,

            "humidity": 25,

            "wind": 30,

            "ndvi": 0.31,

            "fire_alert": False

        },


        {


            "name": "Kırklareli",

            "temperature": 31,

            "humidity": 40,

            "wind": 22,

            "ndvi": 0.52,

            "fire_alert": False

        },


        {


            "name": "Tekirdağ",

            "temperature": 28,

            "humidity": 55,

            "wind": 15,

            "ndvi": 0.70,

            "fire_alert": False

        },


        {


            "name": "Çanakkale",

            "temperature": 39,

            "humidity": 18,

            "wind": 45,

            "ndvi": 0.16,

            "fire_alert": True

        }


    ]



    results = []



    for region in regions:



        analysis = calculate_risk(


            region["temperature"],

            region["humidity"],

            region["wind"],

            region["ndvi"],

            region["fire_alert"]

        )



        results.append({


            "name": region["name"],


            "temperature": region["temperature"],


            "humidity": region["humidity"],


            "wind": region["wind"],


            "ndvi": region["ndvi"],


            **analysis


        })



    return results
