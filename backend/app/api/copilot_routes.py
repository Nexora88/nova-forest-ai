"""Three role-separated model calls for environmental/agricultural field reports.

The app intentionally fails closed when an LLM provider is not configured; it never
labels a rule-only template as an AI-agent result.
"""
from __future__ import annotations

import json
import os
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.jobs_routes import _authenticated_user
from app.services.ndvi_service import get_area_ndvi_timeseries
from app.services.weather_service import get_current_weather

router = APIRouter(prefix="/copilot", tags=["Field Copilot"])


class CopilotRequest(BaseModel):
    area_name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    crop_coefficient: float = Field(default=0.8, ge=0.1, le=1.5)
    frost_threshold_c: float = Field(default=2, ge=-10, le=8)
    geometry: dict[str, Any] | None = None
    satellite_days: int = Field(default=180, ge=30, le=730)


def _model_config() -> tuple[str, str, str]:
    base = os.getenv("NEXORA_LLM_BASE_URL", "").strip().rstrip("/")
    key = os.getenv("NEXORA_LLM_API_KEY", "").strip()
    model = os.getenv("NEXORA_LLM_MODEL", "").strip()
    if not (base and key and model):
        raise HTTPException(
            status_code=503,
            detail={
                "code": "agent_provider_not_configured",
                "message": "Agro-Agent, Eco-Agent ve Writer Agent için NEXORA_LLM_BASE_URL, NEXORA_LLM_API_KEY ve NEXORA_LLM_MODEL sunucu değişkenleri gerekli.",
            },
        )
    return base, key, model


def _agent_call(role: str, system_prompt: str, payload: dict[str, Any]) -> dict[str, Any]:
    base, key, model = _model_config()
    try:
        response = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "temperature": 0.2,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
                ],
            },
            timeout=50,
        )
        response.raise_for_status()
        result = response.json()["choices"][0]["message"]["content"]
        if not isinstance(result, str) or not result.strip():
            raise ValueError("empty_model_output")
        return {"agent": role, "status": "completed", "model": model, "content": result.strip()}
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "agent_provider_error", "agent": role, "error_type": type(exc).__name__,
                    "message": "Ajan modeli yanıt vermedi; eksik model çıktısı rapor olarak sunulmadı."},
        ) from exc


@router.post("/analyze")
def analyze_field(payload: CopilotRequest, authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
    # Ensure the provider is configured before spending calls on source data.
    _model_config()
    try:
        weather = get_current_weather(payload.lat, payload.lon)
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Open-Meteo hava verisi alınamadı; rapor tamamlanmadı.") from exc
    if not isinstance(weather, dict) or not weather:
        raise HTTPException(status_code=502, detail="Hava kaynağı geçerli veri döndürmedi.")

    satellite: dict[str, Any] = {
        "status": "not_requested",
        "source": "Copernicus Sentinel-2 L2A",
        "series": [],
        "note": "Uydu verisi isteğe bağlıdır; katalog keşfi işlenmiş NDVI sonucu sayılmaz.",
    }
    if payload.geometry:
        if payload.geometry.get("type") != "Polygon" or not payload.geometry.get("coordinates"):
            raise HTTPException(status_code=422, detail="Uydu raporu için geçerli GeoJSON Polygon gerekli.")
        satellite = get_area_ndvi_timeseries(payload.geometry, days=payload.satellite_days, interval="P30D")

    evidence = {
        "area_name": payload.area_name,
        "checked_at_utc": datetime.now(timezone.utc).isoformat(),
        "weather": weather,
        "crop_coefficient": payload.crop_coefficient,
        "frost_threshold_c": payload.frost_threshold_c,
        "satellite": satellite,
        "data_rules": [
            "Weather values are provider observations/forecasts, not ground sensors.",
            "No NDVI/NDMI value may be inferred when the satellite series is empty.",
            "Separate measured/provider data from model interpretation and uncertainty.",
            "Do not issue definitive diagnoses or official fire warnings.",
        ],
    }
    eco = _agent_call(
        "Eco-Agent",
        "You are Eco-Agent for a Turkish environmental decision-support product. Analyze only supplied weather/source evidence, seasonality and uncertainty. State source limitations. Never claim official warnings or observations absent from input. Respond in concise Turkish with: durum, bulgular, belirsizlik, önerilen kontrol.",
        evidence,
    )
    agro = _agent_call(
        "Agro-Agent",
        "You are Agro-Agent for farm and apiary context. Interpret supplied weather, ET0/rain and any actual Sentinel-2 NDVI/NDMI series. Do not fabricate soil-moisture sensors, crop stage, pollen or yields. If satellite status is not available or series empty, explicitly say there is no completed satellite result. Provide cautious field checks, not an irrigation prescription. Respond in Turkish with: tarımsal sinyal, uydu kanıtı, saha kontrolü, belirsizlik.",
        evidence,
    )
    writer = _agent_call(
        "Writer Agent",
        "You are Writer Agent. Synthesize the actual outputs of Eco-Agent and Agro-Agent into a short, useful daily Turkish field report. Do not add facts or numbers absent from the source evidence or agent outputs. Clearly separate source facts from interpretations and list the source timestamp and missing data. Include 2-4 actionable checks, not guaranteed outcomes.",
        {"evidence": evidence, "eco_agent": eco["content"], "agro_agent": agro["content"]},
    )
    return {
        "status": "completed",
        "user_id": user_id,
        "area": payload.area_name,
        "checked_at_utc": evidence["checked_at_utc"],
        "sources": {"weather": "Open-Meteo", "satellite": satellite.get("source")},
        "satellite": satellite,
        "agents": {"eco": eco, "agro": agro, "writer": writer},
        "report": writer["content"],
        "model_provider": "OpenAI-compatible configured endpoint",
        "warning": "Model output is decision support, not an official alert, agronomic diagnosis or guaranteed forecast.",
    }
