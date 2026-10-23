"""Three genuinely separate model calls for the Nexora field copilot.

Each specialist uses its own configured model ID. No rule-based or fabricated fallback
is returned when credentials/models are missing or an upstream model fails.
"""
from __future__ import annotations

import os
from typing import Any

import requests


class AgentConfigurationError(RuntimeError):
    pass


def _configuration() -> tuple[str, str, dict[str, str], int]:
    base_url = os.getenv("NEXORA_AI_BASE_URL", "").strip().rstrip("/")
    api_key = os.getenv("NEXORA_AI_API_KEY") or os.getenv("AI_API_KEY", "")
    models = {
        "agro": os.getenv("AGRO_AGENT_MODEL", "").strip(),
        "eco": os.getenv("ECO_AGENT_MODEL", "").strip(),
        "writer": os.getenv("WRITER_AGENT_MODEL", "").strip(),
    }
    missing = [name for name, value in {"NEXORA_AI_BASE_URL": base_url, "NEXORA_AI_API_KEY": api_key, **{
        "AGRO_AGENT_MODEL": models["agro"], "ECO_AGENT_MODEL": models["eco"], "WRITER_AGENT_MODEL": models["writer"]
    }}.items() if not value]
    if missing:
        raise AgentConfigurationError("Copilot model configuration missing: " + ", ".join(missing))
    try:
        timeout = max(5, min(90, int(os.getenv("NEXORA_AI_TIMEOUT_SECONDS", "45"))))
    except ValueError:
        timeout = 45
    return base_url, api_key, models, timeout


def _call_model(base_url: str, api_key: str, model: str, timeout: int, system: str, payload: dict[str, Any]) -> str:
    response = requests.post(
        f"{base_url}/chat/completions",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
        json={
            "model": model,
            "temperature": 0.2,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": __import__("json").dumps(payload, ensure_ascii=False, allow_nan=False)},
            ],
        },
        timeout=timeout,
    )
    response.raise_for_status()
    body = response.json()
    content = body.get("choices", [{}])[0].get("message", {}).get("content")
    if not isinstance(content, str) or not content.strip():
        raise RuntimeError(f"Model {model!r} returned no text.")
    return content.strip()[:12000]


def generate_copilot_report(context: dict[str, Any]) -> dict[str, Any]:
    """Call Agro-Agent and Eco-Agent independently, then pass their outputs to Writer."""
    import concurrent.futures

    base_url, api_key, models, timeout = _configuration()
    agro_system = (
        "Sen Agro-Agent'sin. Türkçe yanıt ver. Yalnızca sağlanan hava, ET0, yağış, toprak ve uydu "
        "ölçümlerini yorumla. Olmayan toprak sensörü veya NDVI verisi uydurma. Ölçüm, çıkarım ve "
        "belirsizliği açıkça ayır. Kesin sulama reçetesi veya resmî uyarı verme. En fazla 5 kısa madde."
    )
    eco_system = (
        "Sen Eco-Agent'sin. Türkçe yanıt ver. Sağlanan meteoroloji, yangın koşulları, polen/hava kalitesi "
        "ve ekosistem gözlemlerini yorumla. Eksik kaynağı açıkça belirt; yangın tespiti veya polen ölçümü "
        "varmış gibi davranma. Ölçüm ile çıkarımı ayır. En fazla 5 kısa madde."
    )
    writer_system = (
        "Sen Writer Agent'sin. Türkçe, anlaşılır ve kısa bir günlük saha raporu yaz. Sadece verilen "
        "Agro-Agent ve Eco-Agent çıktıları ile bağlamı kullan. Yeni sayı, ölçüm, kaynak, kesin teşhis veya "
        "güvenlik garantisi ekleme. Raporu 'Özet', 'Bugün dikkat', 'Veri sınırları' başlıklarıyla düzenle."
    )
    with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
        agro_future = pool.submit(_call_model, base_url, api_key, models["agro"], timeout, agro_system, context)
        eco_future = pool.submit(_call_model, base_url, api_key, models["eco"], timeout, eco_system, context)
        agro = agro_future.result()
        eco = eco_future.result()
    writer = _call_model(
        base_url, api_key, models["writer"], timeout, writer_system,
        {"context": context, "agro_agent": agro, "eco_agent": eco},
    )
    return {
        "status": "complete",
        "report": writer,
        "agents": {
            "agro": {"model": models["agro"], "status": "complete", "analysis": agro},
            "eco": {"model": models["eco"], "status": "complete", "analysis": eco},
            "writer": {"model": models["writer"], "status": "complete"},
        },
        "generated_by": "three configured independent model calls",
        "limitations": [
            "Model outputs are decision support, not official emergency alerts.",
            "Missing observations remain unknown; the agents must not infer them as zero.",
        ],
    }
