"""Role-separated Eco-Agent, Agro-Agent and Writer Agent model calls."""
from __future__ import annotations

import json
import os
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime, timezone
from typing import Any

import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

from app.api.jobs_routes import _authenticated_user, _worker_request
from app.services.weather_service import get_current_weather

router = APIRouter(prefix="/copilot", tags=["Field Copilot"])


class CopilotRequest(BaseModel):
    area_name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    crop_coefficient: float = Field(default=0.8, ge=0.1, le=1.5)
    frost_threshold_c: float = Field(default=2, ge=-10, le=8)
    satellite_job_id: str | None = Field(default=None, min_length=1, max_length=100)


def _model_config() -> tuple[str, str, str]:
    base = os.getenv("NEXORA_LLM_BASE_URL", "").strip().rstrip("/")
    key = os.getenv("NEXORA_LLM_API_KEY", "").strip()
    model = os.getenv("NEXORA_LLM_MODEL", "").strip()
    if not (base and key and model):
        raise HTTPException(status_code=503, detail={
            "code": "agent_provider_not_configured",
            "message": "Agro-Agent, Eco-Agent ve Writer Agent için NEXORA_LLM_BASE_URL, NEXORA_LLM_API_KEY ve NEXORA_LLM_MODEL sunucu değişkenleri gerekli.",
        })
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
            timeout=18,
        )
        response.raise_for_status()
        result = response.json()["choices"][0]["message"]["content"]
        if not isinstance(result, str) or not result.strip():
            raise ValueError("empty_model_output")
        return {"agent": role, "status": "completed", "model": model, "content": result.strip()}
    except (requests.RequestException, KeyError, IndexError, TypeError, ValueError) as exc:
        raise HTTPException(status_code=502, detail={
            "code": "agent_provider_error", "agent": role, "error_type": type(exc).__name__,
            "message": "Ajan modeli yanıt vermedi; eksik model çıktısı rapor olarak sunulmadı.",
        }) from exc


@router.post("/analyze")
def analyze_field(payload: CopilotRequest, authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
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
        "note": "Tamamlanmış uydu raporu için Nova Bee sayfasında Sentinel-2 raporunu önce çalıştır. Uydu katalog keşfi işlenmiş NDVI sonucu değildir.",
    }
    if payload.satellite_job_id:
        if not all(ch.isalnum() or ch in "_-" for ch in payload.satellite_job_id):
            raise HTTPException(status_code=422, detail="Geçersiz uydu görev kimliği.")
        job = _worker_request("GET", f"/internal/jobs/{payload.satellite_job_id}", user_id)
        if job.get("status") != "finished":
            raise HTTPException(status_code=409, detail={
                "code": "satellite_job_not_finished",
                "message": "Sentinel-2 görevi henüz tamamlanmadı. Rapor tamamlandığında ajanları yeniden çalıştır.",
                "job_status": job.get("status", "unknown"),
            })
        satellite = job.get("result") or {}
        if satellite.get("status") != "available" or not satellite.get("series"):
            raise HTTPException(status_code=409, detail={
                "code": "satellite_series_unavailable",
                "message": "Uydu görevi tamamlandı ancak gerçek NDVI/NDMI zaman serisi üretmedi. Ajanlar eksik uydu verisini varsayamaz.",
                "satellite_status": satellite.get("status", "unknown"),
            })

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
    with ThreadPoolExecutor(max_workers=2) as pool:
        eco_future = pool.submit(
            _agent_call,
            "Eco-Agent",
            "You are Eco-Agent for a Turkish environmental decision-support product. Analyze only supplied weather/source evidence, seasonality and uncertainty. State source limitations. Never claim official warnings or observations absent from input. Respond in concise Turkish with: durum, bulgular, belirsizlik, önerilen kontrol.",
            evidence,
        )
        agro_future = pool.submit(
            _agent_call,
            "Agro-Agent",
            "You are Agro-Agent for farm and apiary context. Interpret supplied weather, ET0/rain and any actual Sentinel-2 NDVI/NDMI series. Do not fabricate soil-moisture sensors, crop stage, pollen or yields. If satellite status is not available or series empty, explicitly say there is no completed satellite result. Provide cautious field checks, not an irrigation prescription. Respond in Turkish with: tarımsal sinyal, uydu kanıtı, saha kontrolü, belirsizlik.",
            evidence,
        )
        eco = eco_future.result()
        agro = agro_future.result()
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
