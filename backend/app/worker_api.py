"""Private HTTP front door for the Redis/RQ satellite worker."""
from __future__ import annotations

import hmac
import os
from typing import Any, Dict

from fastapi import FastAPI, Header, HTTPException
from pydantic import BaseModel, Field
from redis import Redis
from rq import Queue, Retry
from rq.job import Job
from rq.exceptions import NoSuchJobError

app = FastAPI(title="NexoraWildfire Satellite Worker", version="1.0.0")
QUEUE_NAME = "satellite"


def _authorize(token: str | None, user_id: str | None) -> str:
    expected = os.getenv("NEXORA_WORKER_TOKEN", "")
    if not expected or not token or not hmac.compare_digest(token, expected):
        raise HTTPException(status_code=401, detail="Worker authentication failed.")
    if not user_id or len(user_id) > 128:
        raise HTTPException(status_code=400, detail="User identity missing.")
    return user_id


def _queue() -> Queue:
    redis_url = os.getenv("REDIS_URL", "")
    if not redis_url:
        raise HTTPException(status_code=503, detail="REDIS_URL is not configured.")
    try:
        return Queue(QUEUE_NAME, connection=Redis.from_url(redis_url), default_timeout=900)
    except Exception:
        raise HTTPException(status_code=503, detail="Queue connection unavailable.")


class NDVIJob(BaseModel):
    geometry: Dict[str, Any]
    days: int = Field(default=180, ge=30, le=730)
    interval: str = Field(default="P30D", pattern="^P(1|5|10|15|30)D$")
    user_id: str


class RasterJob(BaseModel):
    west: float = Field(ge=-180, le=180)
    south: float = Field(ge=-90, le=90)
    east: float = Field(ge=-180, le=180)
    north: float = Field(ge=-90, le=90)
    width: int = Field(default=640, ge=128, le=1024)
    height: int = Field(default=480, ge=128, le=1024)
    user_id: str


@app.get("/health")
def health():
    return {"status": "healthy", "service": "nexora-satellite-worker-api"}


@app.post("/internal/jobs/ndvi-timeseries", status_code=202)
def submit_ndvi_job(
    request: NDVIJob,
    worker_token: str | None = Header(default=None, alias="X-Nexora-Worker-Token"),
    header_user_id: str | None = Header(default=None, alias="X-Nexora-User-Id"),
):
    user_id = _authorize(worker_token, header_user_id)
    if user_id != request.user_id:
        raise HTTPException(status_code=403, detail="User identity mismatch.")
    if request.geometry.get("type") != "Polygon" or not request.geometry.get("coordinates"):
        raise HTTPException(status_code=422, detail="A valid GeoJSON Polygon is required.")
    from app.worker_tasks import run_ndvi_timeseries
    job = _queue().enqueue(
        run_ndvi_timeseries, request.geometry, request.days, request.interval,
        job_timeout=600, result_ttl=3600, failure_ttl=86400,
        retry=Retry(max=2, interval=[15, 60]),
    )
    job.meta["user_id"] = user_id
    job.meta["kind"] = "ndvi-timeseries"
    job.save_meta()
    return {"job_id": job.id, "status": "queued", "kind": "ndvi-timeseries"}


@app.post("/internal/jobs/risk-raster", status_code=202)
def submit_raster_job(
    request: RasterJob,
    worker_token: str | None = Header(default=None, alias="X-Nexora-Worker-Token"),
    header_user_id: str | None = Header(default=None, alias="X-Nexora-User-Id"),
):
    user_id = _authorize(worker_token, header_user_id)
    if user_id != request.user_id:
        raise HTTPException(status_code=403, detail="User identity mismatch.")
    if not (request.west < request.east and request.south < request.north):
        raise HTTPException(status_code=422, detail="Invalid bbox.")
    if request.east - request.west > 2 or request.north - request.south > 2:
        raise HTTPException(status_code=422, detail="BBox exceeds the 2-degree job limit.")
    from app.worker_tasks import run_risk_raster
    job = _queue().enqueue(
        run_risk_raster, [request.west, request.south, request.east, request.north],
        request.width, request.height,
        job_timeout=900, result_ttl=3600, failure_ttl=86400,
        retry=Retry(max=2, interval=[30, 120]),
    )
    job.meta["user_id"] = user_id
    job.meta["kind"] = "risk-raster"
    job.save_meta()
    return {"job_id": job.id, "status": "queued", "kind": "risk-raster"}


@app.get("/internal/jobs/{job_id}")
def get_job(
    job_id: str,
    user_id: str,
    worker_token: str | None = Header(default=None, alias="X-Nexora-Worker-Token"),
    header_user_id: str | None = Header(default=None, alias="X-Nexora-User-Id"),
):
    owner = _authorize(worker_token, header_user_id)
    if owner != user_id:
        raise HTTPException(status_code=403, detail="User identity mismatch.")
    try:
        job = Job.fetch(job_id, connection=Redis.from_url(os.environ["REDIS_URL"]))
    except (NoSuchJobError, KeyError, ValueError):
        raise HTTPException(status_code=404, detail="Job not found.")
    if job.meta.get("user_id") != owner:
        raise HTTPException(status_code=404, detail="Job not found.")
    status = job.get_status(refresh=True)
    result: dict[str, Any] = {"job_id": job.id, "status": status, "kind": job.meta.get("kind")}
    if status == "finished":
        result["result"] = job.result
    elif status == "failed":
        result["error"] = "Job failed. Inspect worker logs for the sanitized error."
    return result
