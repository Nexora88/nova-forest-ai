"""Model-backed Agro-Agent, Eco-Agent, and Writer Agent endpoints."""
from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from app.services.agent_service import agent_status, run_field_copilot

router = APIRouter(prefix="/copilot", tags=["Field Copilot"])


class WeatherInput(BaseModel):
    temperature_c: float | None = Field(default=None, ge=-80, le=65)
    humidity_pct: float | None = Field(default=None, ge=0, le=100)
    wind_kmh: float | None = Field(default=None, ge=0, le=400)
    precipitation_mm: float | None = Field(default=None, ge=0, le=2000)
    et0_mm: float | None = Field(default=None, ge=0, le=100)
    pollen_index: float | None = Field(default=None, ge=0, le=100000)


class SatelliteInput(BaseModel):
    ndvi_mean: float | None = Field(default=None, ge=-1, le=1)
    scene_date: str | None = Field(default=None, max_length=40)
    cloud_cover_pct: float | None = Field(default=None, ge=0, le=100)


class FieldCopilotRequest(BaseModel):
    area_name: str = Field(min_length=1, max_length=120)
    area_type: str = Field(default="general", max_length=40)
    crop_coefficient: float | None = Field(default=None, ge=0, le=3)
    weather: WeatherInput
    satellite: SatelliteInput | None = None
    weather_source: str = Field(default="not_specified", max_length=120)
    weather_observed_at: str | None = Field(default=None, max_length=60)
    satellite_source: str = Field(default="not_available", max_length=120)
    satellite_observed_at: str | None = Field(default=None, max_length=60)


@router.get("/status")
def copilot_status():
    return agent_status()


@router.post("/analyze")
def analyze_field(request: FieldCopilotRequest):
    status = agent_status()
    if status["status"] != "ready":
        raise HTTPException(
            status_code=503,
            detail={
                "code": "field_agents_not_configured",
                "message": "Model tabanlı Agro-Agent, Eco-Agent ve Writer Agent için sunucu model anahtarı/model adı yapılandırılmalı.",
                "agent_status": status,
            },
        )
    payload: dict[str, Any] = request.model_dump()
    payload["generated_at_utc"] = datetime.now(timezone.utc).isoformat()
    payload["weather"] = {k: v for k, v in payload["weather"].items() if v is not None}
    if payload.get("satellite") is None:
        payload["satellite"] = {"ndvi_mean": None, "scene_date": None, "cloud_cover_pct": None}
    else:
        payload["satellite"] = {k: v for k, v in payload["satellite"].items() if v is not None}
    if not payload["weather"]:
        raise HTTPException(status_code=422, detail="En az bir gerçek hava gözlemi gerekli.")
    try:
        return run_field_copilot(payload)
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail={"code": str(exc), "message": "Ajan yapılandırması eksik."})
    except Exception as exc:
        # Do not return provider errors, request bodies, or secrets to clients.
        raise HTTPException(status_code=502, detail={"code": "agent_provider_failed", "message": "Model sağlayıcısından geçerli yanıt alınamadı. Sunucu günlüklerini kontrol edin."}) from exc
