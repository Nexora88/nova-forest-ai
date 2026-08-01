from fastapi import APIRouter

from app.engine.advanced_risk_engine import calculate_advanced_risk


router = APIRouter()



@router.get("/advanced-risk-test")
def advanced_risk_test():


    result = calculate_advanced_risk(

        temperature=37,

        humidity=18,

        wind_speed=45,

        ndvi=0.15,

        fire_alert=False

    )


    return {

        "region": "Edirne",

        "analysis": result

    }
  
