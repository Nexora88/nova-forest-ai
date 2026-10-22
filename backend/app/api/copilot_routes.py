from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
import requests

from app.services.copilot_agents import analyze, status

router = APIRouter(prefix="/copilot", tags=["Nova Copilot"])


class AnalyzeRequest(BaseModel):
    area_name: str = Field(min_length=1, max_length=120)
    area_type: str = Field(default="general", max_length=40)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)


@router.get("/agents/status")
def agents_status():
    return status()


@router.post("/analyze")
def analyze_area(payload: AnalyzeRequest):
    current = status()
    if current["status"] != "configured":
        raise HTTPException(
            status_code=503,
            detail={
                "status": "agents_not_configured",
                "message": "Üç bağımsız model ajanı çalıştırılmadan rapor üretilmedi.",
                "required_environment": current["required_environment"],
                "agents": current["agents"],
            },
        )
    try:
        return analyze(payload.area_name, payload.area_type, payload.lat, payload.lon)
    except requests.RequestException as exc:
        raise HTTPException(
            status_code=502,
            detail={
                "status": "upstream_unavailable",
                "message": "Hava/polen kaynağı veya model sunucusuna ulaşılamadı; rapor tamamlanmadı.",
                "error_type": type(exc).__name__,
            },
        ) from exc
    except RuntimeError as exc:
        message = str(exc)
        status_code = 503 if "not_configured" in message else 502
        raise HTTPException(
            status_code=status_code,
            detail={
                "status": "agent_failed",
                "message": "Bir ajan başarısız olduğu için tamamlanmış rapor sunulmadı.",
                "agent_error": message,
            },
        ) from exc
