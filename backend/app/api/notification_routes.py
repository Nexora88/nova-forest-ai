from fastapi import APIRouter
from pydantic import BaseModel
from app.services.weather_service import get_current_weather

router = APIRouter(prefix="/notifications")

class EvaluateRequest(BaseModel):
    lat: float
    lon: float
    area_name: str
    threshold: int = 70

def calculate_risk(weather: dict) -> int:
    t = float(weather.get("temperature") or 0)
    h = float(weather.get("humidity") or 0)
    wind = float(weather.get("wind") or 0)
    score = 0
    if t >= 40: score += 30
    elif t >= 30: score += 15
    elif t >= 25: score += 7
    if h <= 20: score += 25
    elif h <= 40: score += 10
    elif h <= 55: score += 4
    if wind >= 40: score += 25
    elif wind >= 20: score += 10
    elif wind >= 12: score += 4
    return min(100, score)

@router.get("/status")
def notification_status():
    return {
        "status": "available",
        "system": "Nova-Alert",
        "external_providers": False,
        "channels": ["in_app", "browser"],
        "note": "Uyarılar NexoraWildfire içinde üretilir. Harici SMS, e-posta veya bot sağlayıcısı kullanılmaz."
    }

@router.post("/evaluate")
def evaluate_notification(payload: EvaluateRequest):
    weather = get_current_weather(payload.lat, payload.lon)
    risk = calculate_risk(weather)
    threshold = max(25, min(100, int(payload.threshold)))
    level = "low"
    if risk >= 80: level = "critical"
    elif risk >= 60: level = "high"
    elif risk >= 40: level = "medium"
    alert = risk >= threshold
    return {
        "status": "alert" if alert else "normal",
        "system": "Nova-Alert",
        "area": payload.area_name,
        "risk": risk,
        "threshold": threshold,
        "level": level,
        "weather": {
            "temperature": weather.get("temperature"),
            "humidity": weather.get("humidity"),
            "wind": weather.get("wind"),
        },
        "alert": alert,
        "title": f"{payload.area_name} • Çevresel risk yükseldi" if alert else f"{payload.area_name} • Risk normal",
        "message": (
            f"Çevresel risk {risk}/100. Sıcaklık {weather.get('temperature')}°C, "
            f"nem %{weather.get('humidity')}, rüzgar {weather.get('wind')} km/s."
        ),
        "note": "Bu bir karar destek sinyalidir; saha ölçümü veya resmi uyarı yerine geçmez."
    }

@router.post("/send")
def send_notification():
    return {
        "status": "disabled",
        "system": "Nova-Alert",
        "message": "Harici SMS, e-posta ve bot gönderimleri kaldırıldı. Uyarılar uygulama içinde ve tarayıcı üzerinden gösterilir."
    }
