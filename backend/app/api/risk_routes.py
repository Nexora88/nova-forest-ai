# =====================================
# NOVA-FOREST AI
# Risk Analysis API
# Version 0.4
# =====================================

from fastapi import APIRouter

from app.services.risk_service import calculate_risk
from app.services.weather_service import get_current_weather


router = APIRouter()


REGIONS = {

    "Edirne": {
        "latitude": 41.6771,
        "longitude": 26.5557
    },

    "Kırklareli": {
        "latitude": 41.7355,
        "longitude": 27.2252
    },

    "Tekirdağ": {
        "latitude": 40.9781,
        "longitude": 27.5110
    },

    "Çanakkale": {
        "latitude": 40.1553,
        "longitude": 26.4142
    },

    "İstanbul Avrupa": {
        "latitude": 41.1500,
        "longitude": 28.6500
    }

}


@router.get("/risk-analysis")
def risk_analysis():

    results = []

    for name, location in REGIONS.items():

        try:

            weather = get_current_weather(
                location["latitude"],
                location["longitude"]
            )

            temperature = weather["temperature"]
            humidity = weather["humidity"]
            wind = weather["wind"]

            # Gerçek uydu NDVI verisi
            # bağlanana kadar geçici nötr değer.
            ndvi = 0.50

            # NASA FIRMS entegrasyonu
            # tamamlanana kadar alarm kapalı.
            fire_alert = False


            analysis = calculate_risk(

                temperature=temperature,

                humidity=humidity,

                wind=wind,

                ndvi=ndvi,

                fire_alert=fire_alert

            )


            results.append({

                "region": name,

                "coordinates": {

                    "latitude":
                    location["latitude"],

                    "longitude":
                    location["longitude"]

                },

                "weather": weather,

                "analysis": analysis,

                "data_source": [
                    "Open-Meteo",
                    "Nova-Forest Risk Engine"
                ]

            })


        except Exception as error:

            results.append({

                "region": name,

                "status": "data_error",

                "error": str(error)

            })


    return {

        "system": "Nova-Forest AI",

        "status": "online",

        "analysis_type":
        "Regional Environmental Risk",

        "region_count":
        len(REGIONS),

        "regions":
        results

    }
