"""Three separately configured OpenAI-compatible agents for the field copilot.

No model is simulated: missing credentials or provider failures are surfaced as errors.
Each role can use a different provider, model, base URL, and secret.
"""
from __future__ import annotations

import os
from typing import Any

import requests
from fastapi import HTTPException


ROLES = {
    "agro": {
        "base": "NOVA_AGRO_AGENT_BASE_URL",
        "key": "NOVA_AGRO_AGENT_API_KEY",
        "model": "NOVA_AGRO_AGENT_MODEL",
        "system": (
            "You are Agro-Agent, a cautious agricultural decision-support specialist. "
            "Analyze only supplied measurements. Distinguish observed values from estimates; "
            "never invent soil-moisture or NDVI data. Give practical, non-prescriptive notes "
            "and state uncertainty. Respond in Turkish, concise JSON or plain text."
        ),
    },
    "eco": {
        "base": "NOVA_ECO_AGENT_BASE_URL",
        "key": "NOVA_ECO_AGENT_API_KEY",
        "model": "NOVA_ECO_AGENT_MODEL",
        "system": (
            "You are Eco-Agent, an environmental and weather-risk analyst. "
            "Use only supplied observations; do not claim a confirmed fire from a risk score. "
            "Separate forecast from observation and explain uncertainty. Respond in Turkish."
        ),
    },
    "writer": {
        "base": "NOVA_WRITER_AGENT_BASE_URL",
        "key": "NOVA_WRITER_AGENT_API_KEY",
        "model": "NOVA_WRITER_AGENT_MODEL",
        "system": (
            "You are Writer Agent. Turn the supplied Agro-Agent and Eco-Agent findings into "
            "a clear Turkish field report with: kısa özet, önemli sinyaller, önerilen kontroller, "
            "veri eksikleri. Do not add facts or imply actions were taken. Mark missing data."
        ),
    },
}


def _setting(role: str, name: str) -> str:
    role_value = os.getenv(ROLES[role][name], "").strip()
    shared_name = {"base": "NOVA_LLM_BASE_URL", "key": "NOVA_LLM_API_KEY", "model": "NOVA_LLM_MODEL"}[name]
    return role_value or os.getenv(shared_name, "").strip()


def _complete(role: str, user_content: str) -> dict[str, Any]:
    base = _setting(role, "base").rstrip("/")
    key = _setting(role, "key")
    model = _setting(role, "model")
    if not base or not key or not model:
        raise HTTPException(
            status_code=503,
            detail={
                "code": "agent_not_configured",
                "agent": role,
                "message": f"{role} ajanı için sağlayıcı URL'si, API anahtarı ve model adı sunucuda yapılandırılmalı.",
            },
        )
    url = base if base.endswith("/chat/completions") else base + "/chat/completions"
    try:
        response = requests.post(
            url,
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": model,
                "temperature": 0.2 if role != "writer" else 0.35,
                "messages": [
                    {"role": "system", "content": ROLES[role]["system"]},
                    {"role": "user", "content": user_content},
                ],
            },
            timeout=(5, 45),
        )
        response.raise_for_status()
        payload = response.json()
        content = payload["choices"][0]["message"]["content"]
        if not isinstance(content, str) or not content.strip():
            raise ValueError("Empty model response")
        return {"agent": role, "model": model, "provider_status": "ok", "content": content.strip()}
    except HTTPException:
        raise
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as exc:
        raise HTTPException(
            status_code=502,
            detail={"code": "agent_provider_error", "agent": role, "message": "Ajan sağlayıcısından geçerli yanıt alınamadı."},
        ) from exc


def build_field_report(context: dict[str, Any]) -> dict[str, Any]:
    import json

    # These are three independent requests, not one prompt labelled as three agents.
    agro = _complete("agro", json.dumps(context, ensure_ascii=False, separators=(",", ":")))
    eco = _complete("eco", json.dumps(context, ensure_ascii=False, separators=(",", ":")))
    writer_input = {
        "field_context": context,
        "agro_agent": agro["content"],
        "eco_agent": eco["content"],
    }
    writer = _complete("writer", json.dumps(writer_input, ensure_ascii=False, separators=(",", ":")))
    return {
        "status": "generated",
        "report": writer["content"],
        "agents": [
            {"name": "Agro-Agent", "model": agro["model"], "status": agro["provider_status"], "finding": agro["content"]},
            {"name": "Eco-Agent", "model": eco["model"], "status": eco["provider_status"], "finding": eco["content"]},
            {"name": "Writer Agent", "model": writer["model"], "status": writer["provider_status"]},
        ],
        "source_policy": "Yalnızca istekteki veriler kullanıldı; doğrulanmamış ölçümler uydurulmaz.",
    }
