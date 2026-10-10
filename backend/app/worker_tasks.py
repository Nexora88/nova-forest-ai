"""RQ jobs for satellite processing. Secrets are read only from worker environment."""
from __future__ import annotations

import os
import uuid
from typing import Any

import requests

from app.services.ndvi_service import get_area_ndvi_timeseries, get_satellite_risk_raster


def run_ndvi_timeseries(geometry: dict, days: int, interval: str) -> dict[str, Any]:
    """Execute a bounded CDSE Statistical API request in the persistent worker."""
    result = get_area_ndvi_timeseries(geometry, days=days, interval=interval)
    result["job_processor"] = "persistent-worker"
    return result


def run_risk_raster(bbox: list[float], width: int, height: int) -> dict[str, Any]:
    """Render a raster and place it in private Supabase Storage; never store image bytes in Redis."""
    supabase_url = os.getenv("SUPABASE_URL", "").rstrip("/")
    admin_key = os.getenv("SUPABASE_ADMIN_KEY", "")
    bucket = os.getenv("NEXORA_ARTIFACT_BUCKET", "nexora-job-artifacts")
    if not supabase_url or not admin_key:
        raise RuntimeError("Worker artifact storage is not configured.")
    image_bytes, weather, weather_risk = get_satellite_risk_raster(bbox, width, height)
    object_path = f"satellite/{uuid.uuid4().hex}.png"
    headers = {
        "Authorization": f"Bearer {admin_key}",
        "apikey": admin_key,
        "Content-Type": "image/png",
        "x-upsert": "false",
    }
    upload_url = f"{supabase_url}/storage/v1/object/{bucket}/{object_path}"
    upload = requests.post(upload_url, headers=headers, data=image_bytes, timeout=45)
    upload.raise_for_status()
    signed = requests.post(
        f"{supabase_url}/storage/v1/object/sign/{bucket}/{object_path}",
        headers={"Authorization": f"Bearer {admin_key}", "apikey": admin_key},
        json={"expiresIn": 900},
        timeout=15,
    )
    signed.raise_for_status()
    signed_path = signed.json().get("signedURL") or signed.json().get("signedUrl")
    if not signed_path:
        raise RuntimeError("Storage did not return a signed URL.")
    if signed_path.startswith("/"):
        signed_path = f"{supabase_url}/storage/v1{signed_path}" if not signed_path.startswith("/storage/v1") else f"{supabase_url}{signed_path}"
    return {
        "status": "available",
        "artifact_url": signed_path,
        "artifact_expires_in": 900,
        "bbox": bbox,
        "width": width,
        "height": height,
        "weather_observed_at": weather.get("observed_at"),
        "weather_risk_signal": round(float(weather_risk), 4),
        "source": "Copernicus Sentinel-2 L2A + Open-Meteo",
        "warning": "Rule-based composite decision support; not a trained ML fire probability.",
    }
