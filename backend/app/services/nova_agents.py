"""Three separately configured model-backed agents for personal field intelligence.

Each specialist calls an OpenAI-compatible chat-completions endpoint. Missing model
configuration fails closed instead of silently presenting rules as AI output.
"""
from __future__ import annotations
import json
import os
from typing import Any
import requests

def configuration_status() -> dict:
    base = os.getenv("NOVA_AGENT_API_BASE", "").strip().rstrip("/")
    key = os.getenv("NOVA_AGENT_API_KEY", "").strip()
    return {
        "configured": bool(base and key and os.getenv("NOVA_AGRO_MODEL") and os.getenv("NOVA_ECO_MODEL") and os.getenv("NOVA_WRITER_MODEL")),
        "provider_configured": bool(base and key),
        "models": {
            "agro": bool(os.getenv("NOVA_AGRO_MODEL", "").strip()),
            "eco": bool(os.getenv("NOVA_ECO_MODEL", "").strip()),
            "writer": bool(os.getenv("NOVA_WRITER_MODEL", "").strip()),
        },
        "mode": "three_model_calls",
        "secret_exposed": False,
    }

def _model_call(role: str, model: str, instructions: str, context: dict[str, Any]) -> dict:
    base = os.getenv("NOVA_AGENT_API_BASE", "").strip().rstrip("/")
    key = os.getenv("NOVA_AGENT_API_KEY", "").strip()
    if not base or not key or not model:
        raise RuntimeError("nova_agent_provider_not_configured")
    response = requests.post(
        f"{base}/chat/completions",
        headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "temperature": 0.2,
            "response_format": {"type": "json_object"},
            "messages": [
                {"role": "system", "content": instructions + " Return only a JSON object in Turkish. Never invent measurements, diagnoses, or source results. Clearly mark missing evidence."},
                {"role": "user", "content": json.dumps(context, ensure_ascii=False, separators=(",", ":"))},
            ],
        },
        timeout=(8, 45),
    )
    if response.status_code >= 400:
        raise RuntimeError(f"nova_agent_provider_http_{response.status_code}")
    payload = response.json()
    content = payload.get("choices", [{}])[0].get("message", {}).get("content", "")
    try:
        result = json.loads(content)
    except (TypeError, json.JSONDecodeError) as exc:
        raise RuntimeError(f"nova_agent_invalid_json:{role}") from exc
    if not isinstance(result, dict):
        raise RuntimeError(f"nova_agent_invalid_result:{role}")
    return {"agent": role, "model": model, "status": "completed", "result": result}

def run_field_agents(weather: dict, satellite: dict, area: dict) -> dict:
    """Run Agro and Eco specialists, then ask the Writer model to synthesize them."""
    status = configuration_status()
    if not status["configured"]:
        raise RuntimeError("nova_agent_provider_not_configured")
    agro = _model_call(
        "Agro-Agent", os.environ["NOVA_AGRO_MODEL"].strip(),
        "You are Agro-Agent, a crop and water decision-support specialist. Interpret only provided ET0, precipitation, crop type, and Sentinel-2 NDVI/NDMI. Do not prescribe irrigation without soil/crop evidence. Return keys: summary, signals (array), cautions (array), confidence (low|medium|high).",
        {"area": area, "weather": weather, "satellite": satellite},
    )
    eco = _model_call(
        "Eco-Agent", os.environ["NOVA_ECO_MODEL"].strip(),
        "You are Eco-Agent, an environmental conditions specialist. Interpret weather, wind, precipitation, and satellite evidence. Do not claim confirmed fires, pollen levels, biodiversity, or ecological damage unless those data are explicitly present. Return keys: summary, signals (array), cautions (array), confidence (low|medium|high).",
        {"area": area, "weather": weather, "satellite": satellite},
    )
    writer = _model_call(
        "Writer-Agent", os.environ["NOVA_WRITER_MODEL"].strip(),
        "You are Writer-Agent. Combine the specialist results into a concise daily Turkish field report. Preserve disagreements and uncertainty. Explicitly distinguish observed provider data from model interpretation. Return keys: headline, report, priorities (array), data_gaps (array), source_timestamp.",
        {"area": area, "weather": weather, "satellite": satellite, "agro_agent": agro["result"], "eco_agent": eco["result"]},
    )
    return {
        "status": "completed",
        "pipeline": "Agro-Agent -> Eco-Agent -> Writer-Agent",
        "agents": {"agro": agro, "eco": eco, "writer": writer},
        "evidence": {"weather_source": "Open-Meteo", "weather_observed_at": weather.get("observed_at"), "satellite_status": satellite.get("status", "not_requested")},
        "disclaimer": "Model-generated decision support is not an official warning or professional agronomic prescription.",
    }
