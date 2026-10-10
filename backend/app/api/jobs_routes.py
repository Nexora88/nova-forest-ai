"""Authenticated proxy for long-running satellite/GIS jobs on the external worker."""
from __future__ import annotations

import os
from typing import Any, Dict

import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/jobs", tags=["Satellite jobs"])


class NDVITimeseriesJob(BaseModel):
    geometry: Dict[str, Any]
    days: int = Field(default=180, ge=30, le=730)
    interval: str = Field(default="P30D", pattern="^P(1|5|10|15|30)D$")


class RiskRasterJob(BaseModel):
    west: float = Field(ge=-180, le=180)
    south: float = Field(ge=-90, le=90)
    east: float = Field(ge=-180, le=180)
    north: float = Field(ge=-90, le=90)
    width: int = Field(default=640, ge=128, le=1024)
    height: int = Field(default=480, ge=128, le=1024)


def _authenticated_user(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Supabase oturum belirteci gerekli.")
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    anon_key = os.getenv("SUPABASE_ANON_KEY") or os.getenv("SUPABASE_PUBLISHABLE_KEY")
    if not supabase_url or not anon_key:
        raise HTTPException(status_code=503, detail="Supabase Auth doğrulaması yapılandırılmamış.")
    try:
        response = requests.get(
            f"{supabase_url}/auth/v1/user",
            headers={"Authorization": authorization, "apikey": anon_key},
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Kimlik doğrulama servisine ulaşılamıyor.")
    if response.status_code != 200:
        raise HTTPException(status_code=401, detail="Oturum geçersiz veya süresi dolmuş.")
    user_id = response.json().get("id")
    if not user_id:
        raise HTTPException(status_code=401, detail="Oturum kullanıcısı doğrulanamadı.")
    return str(user_id)


def _worker_request(method: str, path: str, user_id: str, payload: dict | None = None) -> dict:
    worker_url = os.getenv("NEXORA_WORKER_URL", "").rstrip("/")
    worker_token = os.getenv("NEXORA_WORKER_TOKEN", "")
    if not worker_url or not worker_token:
        raise HTTPException(
            status_code=503,
            detail={
                "status": "worker_not_configured",
                "message": "Uzun uydu/GIS işleri için ayrı worker henüz bağlanmadı.",
            },
        )
    try:
        response = requests.request(
            method,
            f"{worker_url}{path}",
            json=payload,
            params={"user_id": user_id} if method == "GET" else None,
            headers={"X-Nexora-Worker-Token": worker_token, "X-Nexora-User-Id": user_id},
            timeout=12,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Uydu işleme worker servisine ulaşılamıyor.")
    if response.status_code >= 400:
        try:
            detail = response.json()
        except ValueError:
            detail = {"message": "Worker isteği başarısız.", "status_code": response.status_code}
        raise HTTPException(status_code=response.status_code if response.status_code < 500 else 502, detail=detail)
    try:
        return response.json()
    except ValueError:
        raise HTTPException(status_code=502, detail="Worker geçerli JSON döndürmedi.")


@router.post("/ndvi-timeseries", status_code=202)
def enqueue_ndvi_timeseries(
    request: NDVITimeseriesJob,
    authorization: str | None = Header(default=None),
):
    user_id = _authenticated_user(authorization)
    geometry = request.geometry
    if geometry.get("type") != "Polygon" or not geometry.get("coordinates"):
        raise HTTPException(status_code=422, detail="Geçerli bir GeoJSON Polygon gerekli.")
    coordinates = geometry.get("coordinates", [])
    if len(str(coordinates)) > 100_000:
        raise HTTPException(status_code=413, detail="Polygon çok büyük; alanı küçültün.")
    return _worker_request(
        "POST", "/internal/jobs/ndvi-timeseries", user_id,
        {"geometry": geometry, "days": request.days, "interval": request.interval, "user_id": user_id},
    )


@router.post("/risk-raster", status_code=202)
def enqueue_risk_raster(
    request: RiskRasterJob,
    authorization: str | None = Header(default=None),
):
    user_id = _authenticated_user(authorization)
    if not (request.west < request.east and request.south < request.north):
        raise HTTPException(status_code=422, detail="Geçerli bbox gerekli.")
    if request.east - request.west > 2 or request.north - request.south > 2:
        raise HTTPException(status_code=422, detail="Tek görev için bbox genişliği en fazla 2 derece olabilir.")
    payload = request.dict()
    payload["user_id"] = user_id
    return _worker_request("POST", "/internal/jobs/risk-raster", user_id, payload)


@router.get("/{job_id}")
def satellite_job_status(job_id: str, authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
    if not job_id or len(job_id) > 100 or any(c not in "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789-_" for c in job_id):
        raise HTTPException(status_code=422, detail="Geçersiz görev kimliği.")
    return _worker_request("GET", f"/internal/jobs/{job_id}", user_id)
