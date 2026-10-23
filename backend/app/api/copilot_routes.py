"""Authenticated AI copilot endpoint."""
from __future__ import annotations

import asyncio
from typing import Any, Dict, Optional

from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field, ConfigDict

from app.api.jobs_routes import _authenticated_user
from app.services.agent_service import AgentConfigurationError, generate_copilot_report

router = APIRouter(prefix="/copilot", tags=["AI Copilot"])


class CopilotReportRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")
    area_name: str = Field(min_length=1, max_length=100)
    area_type: str = Field(default="general", max_length=40)
    location: Dict[str, float]
    weather: Dict[str, Any]
    satellite: Optional[Dict[str, Any]] = None
    ecosystem: Optional[Dict[str, Any]] = None
    observation_window: str = Field(default="today", max_length=40)


@router.post("/report")
async def create_copilot_report(
    payload: CopilotReportRequest,
    authorization: str | None = Header(default=None),
):
    _authenticated_user(authorization)
    lat = payload.location.get("lat")
    lon = payload.location.get("lon")
    if lat is None or lon is None or not (-90 <= lat <= 90) or not (-180 <= lon <= 180):
        raise HTTPException(status_code=422, detail="Geçerli enlem ve boylam gerekli.")
    if len(str(payload.model_dump())) > 30000:
        raise HTTPException(status_code=413, detail="Copilot bağlamı 30 KB sınırını aşıyor.")
    context = payload.model_dump()
    try:
        # The model client is synchronous; keep network waits off the API event loop.
        return await asyncio.to_thread(generate_copilot_report, context)
    except AgentConfigurationError as exc:
        raise HTTPException(status_code=503, detail={"status": "models_not_configured", "message": str(exc)})
    except Exception as exc:
        # Do not expose provider response bodies, tokens, or internal request data.
        raise HTTPException(status_code=502, detail={
            "status": "model_provider_error",
            "message": "Bir veya daha fazla bağımsız model çağrısı başarısız oldu; rapor üretilmedi.",
            "error_type": type(exc).__name__,
        })
