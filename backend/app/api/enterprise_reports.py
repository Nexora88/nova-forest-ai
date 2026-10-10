"""Paid enterprise risk reports: authenticated, entitlement-gated proxy to the private worker."""
from __future__ import annotations
import os
from typing import Any, Dict, Literal
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.api.jobs_routes import _authenticated_user, _worker_request

router = APIRouter(prefix="/enterprise/reports", tags=["Enterprise reports"])

class EnterpriseReportRequest(BaseModel):
    company_name: str = Field(min_length=2, max_length=120)
    asset_name: str = Field(min_length=2, max_length=120)
    asset_type: Literal["transmission_line", "substation", "wind_turbine", "other"]
    asset_geojson: Dict[str, Any]
    buffer_m: int = Field(default=500, ge=100, le=5000)

def _require_enterprise(user_id: str) -> None:
    # Until billing/subscription webhooks exist, require an explicit server-side allowlist.
    allowed = {x.strip() for x in os.getenv("NEXORA_ENTERPRISE_USER_IDS", "").split(",") if x.strip()}
    if not allowed or user_id not in allowed:
        raise HTTPException(status_code=403, detail={"code":"enterprise_access_required","message":"Kurumsal rapor erişimi etkin değil. Erişim, sunucu tarafında onaylanmış kurumsal hesaplara açılır."})

@router.post("", status_code=202)
def create_enterprise_report(request: EnterpriseReportRequest, authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
    _require_enterprise(user_id)
    collection = request.asset_geojson
    if collection.get("type") not in {"FeatureCollection","Feature","Polygon","MultiPolygon","LineString","MultiLineString","Point","MultiPoint"}:
        raise HTTPException(status_code=422, detail="GeoJSON FeatureCollection, Feature, LineString, Point veya Polygon gerekli.")
    if len(str(collection)) > 1_000_000:
        raise HTTPException(status_code=413, detail="GeoJSON en fazla 1 MB olabilir.")
    payload = {"user_id":user_id,"company_name":request.company_name,"asset_name":request.asset_name,"asset_type":request.asset_type,"asset_geojson":collection,"buffer_m":request.buffer_m}
    return _worker_request("POST", "/internal/jobs/enterprise-report", user_id, payload)

@router.get("/{job_id}")
def enterprise_report_status(job_id: str, authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
    _require_enterprise(user_id)
    if not job_id or len(job_id) > 100 or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in job_id):
        raise HTTPException(status_code=422, detail="Geçersiz görev kimliği.")
    result = _worker_request("GET", f"/internal/jobs/{job_id}", user_id)
    if result.get("kind") != "enterprise-report":
        raise HTTPException(status_code=404, detail="Kurumsal rapor görevi bulunamadı.")
    return result
