from fastapi import APIRouter
from app.engine.risk_engine import calculate_risk

router = APIRouter()


@router.get("/")
def home():
    return {
        "project": "Nova-Forest AI",
        "message": "Forest risk analysis system is running"
    }


@router.get("/risk-test")
def risk_test():

    result = calculate_risk(
        temperature=36,
        humidity=18,
        wind_speed=42
    )

    return {
        "region": "Edirne",
        "district": "Keşan",
        "analysis": result
    }
