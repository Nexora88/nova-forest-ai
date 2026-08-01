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

@router.get("/regions")
def get_regions():

    return [
        {
            "name": "Edirne",
            "lat": 41.6771,
            "lng": 26.5557,
            "risk": "HIGH"
        },
        {
            "name": "Kırklareli",
            "lat": 41.7355,
            "lng": 27.2252,
            "risk": "MEDIUM"
        },
        {
            "name": "Tekirdağ",
            "lat": 40.9781,
            "lng": 27.5110,
            "risk": "LOW"
        },
        {
            "name": "Çanakkale",
            "lat": 40.1553,
            "lng": 26.4142,
            "risk": "CRITICAL"
        }
    ]
