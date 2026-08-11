# =====================================
# NOVA-FOREST AI
# Risk Analysis API Routes
# =====================================


from fastapi import APIRouter

from app.services.risk_service import calculate_risk



router = APIRouter()





@router.get("/risk-analysis")
def risk_analysis():


    # Şimdilik test verisi
    # Sonraki aşamada Open-Meteo,
    # Sentinel-2 ve NASA FIRMS bağlanacak.


    result = calculate_risk(

        temperature=36,

        humidity=25,

        wind=30,

        ndvi=0.32,

        fire_alert=False

    )



    return {


        "system":

        "Nova-Forest AI",


        "region":

        "Trakya",


        "analysis":

        result


    }
