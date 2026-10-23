"""Configurable, evidence-first Agro/Eco/Writer agent orchestration.

Each role uses its own model setting. No provider key or model is hard-coded.
When the provider is unavailable the API returns an explicit error; it never
labels a deterministic fallback as an LLM-generated result.
"""
from __future__ import annotations
import os
import requests
from typing import Any

def agent_configured() -> bool:
    return bool(os.getenv("AI_API_KEY", "").strip() and os.getenv("AI_API_BASE_URL", "").strip())

def run_agent(role: str, system_prompt: str, payload: dict[str, Any]) -> dict[str, Any]:
    key = os.getenv("AI_API_KEY", "").strip()
    base = os.getenv("AI_API_BASE_URL", "").strip().rstrip("/")
    model = os.getenv({"agro":"NEXORA_AGRO_MODEL","eco":"NEXORA_ECO_MODEL","writer":"NEXORA_WRITER_MODEL"}.get(role,""), "").strip()
    if not key or not base or not model:
        return {"status":"not_configured","role":role,"model":model or None,"output":None}
    try:
        response = requests.post(
            f"{base}/chat/completions",
            headers={"Authorization":f"Bearer {key}","Content-Type":"application/json"},
            json={"model":model,"temperature":0.2 if role != "writer" else 0.35,
                  "messages":[{"role":"system","content":system_prompt},
                              {"role":"user","content":__import__("json").dumps(payload,ensure_ascii=False)}]},
            timeout=45,
        )
        response.raise_for_status()
        data=response.json()
        output=data["choices"][0]["message"]["content"]
        if not isinstance(output,str) or not output.strip():
            raise ValueError("empty_model_output")
        return {"status":"available","role":role,"model":model,"output":output.strip()}
    except (requests.RequestException, ValueError, KeyError, IndexError, TypeError) as exc:
        return {"status":"error","role":role,"model":model,"error_type":type(exc).__name__,"output":None}
