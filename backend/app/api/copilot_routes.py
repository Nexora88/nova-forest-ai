"""Authenticated endpoint for the three-agent field copilot."""
from __future__ import annotations

from typing import Any
from fastapi import APIRouter, Header
from pydantic import BaseModel, Field
from app.api.jobs_routes import _authenticated_user
from app.services.copilot_agents import build_field_report

router = APIRouter(prefix="/copilot", tags=["Field Copilot"])


class FieldReportRequest(BaseModel):
    area_name: str = Field(min_length=1, max_length=120)
    latitude: float | None = Field(default=None, ge=-90, le=90)
    longitude: float | None = Field(default=None, ge=-180, le=180)
    weather: dict[str, Any] = Field(default_factory=dict)
    ndvi_timeseries: list[dict[str, Any]] = Field(default_factory=list, max_length=240)
    soil_observations: dict[str, Any] = Field(default_factory=dict)
    notes: str = Field(default="", max_length=3000)


@router.post("/report")
def create_field_report(payload: FieldReportRequest, authorization: str | None = Header(default=None)):
    _authenticated_user(authorization)
    context = payload.model_dump()
    return build_field_report(context)


@router.get("/agents/status")
def agents_status():
    import os
    from app.services.copilot_agents import ROLES, _setting

    status = {}
    for role in ROLES:
        status[role] = {
            "configured": bool(_setting(role, "base") and _setting(role, "key") and _setting(role, "model")),
            "secret_exposed": False,
        }
    return {"agents": status, "mode": "independent_provider_calls"}
