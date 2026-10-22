"""Independent Ollama-backed specialist agents for the Nova field copilot.

Each role has its own configured model and separate inference call. No fallback
text is fabricated when a model or provider is unavailable.
"""
import json
import os
from typing import Any

import requests

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
AIR_QUALITY = "https://air-quality-api.open-meteo.com/v1/air-quality"
TIMEOUT_SECONDS = 35


def agent_config() -> dict[str, Any]:
    base = os.getenv("OLLAMA_BASE_URL", "").strip().rstrip("/")
    return {
        "agro": {"model": os.getenv("AGRO_AGENT_MODEL", "").strip(), "base_url": base},
        "eco": {"model": os.getenv("ECO_AGENT_MODEL", "").strip(), "base_url": base},
        "writer": {"model": os.getenv("WRITER_AGENT_MODEL", "").strip(), "base_url": base},
    }


def status() -> dict[str, Any]:
    config = agent_config()
    ready = bool(config["agro"]["base_url"] and all(config[k]["model"] for k in config))
    return {
        "status": "configured" if ready else "not_configured",
        "provider": "ollama-compatible",
        "agents": {
            key: {"configured": bool(value["base_url"] and value["model"]), "model": value["model"] or None}
            for key, value in config.items()
        },
        "required_environment": ["OLLAMA_BASE_URL", "AGRO_AGENT_MODEL", "ECO_AGENT_MODEL", "WRITER_AGENT_MODEL"],
        "note": "Each role makes an independent model request. No model inference is claimed until all three models are configured.",
    }


def _number(value: Any) -> float | None:
    try:
        result = float(value)
        return result if result == result and abs(result) != float("inf") else None
    except (TypeError, ValueError):
        return None


def collect_observations(lat: float, lon: float) -> dict[str, Any]:
    weather_response = requests.get(
        OPEN_METEO,
        params={
            "latitude": lat,
            "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit",
            "daily": "temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,et0_fao_evapotranspiration",
            "forecast_days": 3,
            "timezone": "Europe/Istanbul",
        },
        timeout=12,
    )
    weather_response.raise_for_status()
    weather = weather_response.json()
    pollen: dict[str, Any] = {"status": "unavailable", "source": AIR_QUALITY}
    try:
        air_response = requests.get(
            AIR_QUALITY,
            params={
                "latitude": lat,
                "longitude": lon,
                "current": "alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen",
                "timezone": "Europe/Istanbul",
            },
            timeout=8,
        )
        air_response.raise_for_status()
        pollen = {"status": "available", "source": AIR_QUALITY, **air_response.json().get("current", {})}
    except requests.RequestException:
        # Preserve the unavailable state; never turn a failed pollen query into zero pollen.
        pass
    return {
        "weather_source": OPEN_METEO,
        "retrieved_weather": weather,
        "pollen": pollen,
        "data_note": "Open-Meteo weather is a forecast/modelled observation, not an on-site soil sensor. Missing pollen remains unavailable.",
    }


def _run_agent(role: str, system_prompt: str, payload: dict[str, Any]) -> dict[str, Any]:
    config = agent_config()[role]
    if not config["base_url"] or not config["model"]:
        raise RuntimeError(f"{role}_agent_not_configured")
    response = requests.post(
        f"{config['base_url']}/api/chat",
        json={
            "model": config["model"],
            "stream": False,
            "format": "json",
            "messages": [
                {"role": "system", "content": system_prompt},
                {"role": "user", "content": json.dumps(payload, ensure_ascii=False)},
            ],
            "options": {"temperature": 0.2},
        },
        timeout=TIMEOUT_SECONDS,
    )
    response.raise_for_status()
    body = response.json()
    message = body.get("message", {}).get("content")
    if not isinstance(message, str) or not message.strip():
        raise RuntimeError(f"{role}_agent_empty_response")
    try:
        result = json.loads(message)
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"{role}_agent_invalid_json") from exc
    if not isinstance(result, dict):
        raise RuntimeError(f"{role}_agent_invalid_shape")
    return {"agent": role, "model": config["model"], "result": result, "provider": "ollama-compatible"}


def analyze(area_name: str, area_type: str, lat: float, lon: float) -> dict[str, Any]:
    observations = collect_observations(lat, lon)
    context = {
        "area": {"name": area_name, "type": area_type, "latitude": lat, "longitude": lon},
        "observations": observations,
        "rules": [
            "Do not invent measurements, citations, alerts, soil moisture, NDVI, or confidence values.",
            "If a field is absent or marked unavailable, explicitly say it is unavailable.",
            "Return concise Turkish JSON, suitable for a field operator.",
        ],
    }
    agro = _run_agent(
        "agro",
        "Sen tarım ve toprak-su karar desteği uzmanısın. Yalnızca verilen verileri yorumla. ET0, yağış ve varsa toprak nemini açıkla; sulama emri verme. JSON alanları: summary, signals (array), recommendations (array), limitations (array).",
        context,
    )
    eco = _run_agent(
        "eco",
        "Sen ekosistem ve çevresel koşullar uzmanısın. Hava ve varsa polen gözlemlerini yorumla; polen yoksa yok sayma, erişilemediğini belirt. Yangın riskini resmî uyarı gibi sunma. JSON alanları: summary, signals (array), recommendations (array), limitations (array).",
        context,
    )
    writer = _run_agent(
        "writer",
        "Sen Türkçe saha raporu yazarı olan ayrı bir model ajanısın. Agro ve Eco ajanlarının sonuçlarını ve kaynak gözlemlerini sade bir günlük rapora dönüştür. Yeni veri veya yeni öneri uydurma. JSON alanları: title, report, priorities (array), source_notes (array), limitations (array).",
        {"area": context["area"], "observations": observations, "agro_agent": agro["result"], "eco_agent": eco["result"]},
    )
    return {
        "status": "complete",
        "generated_at_source": "request_time",
        "area": context["area"],
        "sources": {"weather": OPEN_METEO, "air_quality": AIR_QUALITY},
        "observations": observations,
        "agents": {"agro": agro, "eco": eco, "writer": writer},
        "note": "LLM-assisted decision support only; not an official warning, measured soil sensor, or completed satellite/NDVI report.",
    }
