"""Private authenticated API for the asynchronous enterprise-report worker."""
from __future__ import annotations
import hmac, os, re
from uuid import uuid4
import redis
from celery.result import AsyncResult
from fastapi import FastAPI, Header, HTTPException, Query
from pydantic import BaseModel, Field
from worker.tasks import celery_app, build_enterprise_report, build_ndvi_timeseries

app = FastAPI(title="NexoraWildfire Enterprise Report Worker", docs_url=None, redoc_url=None)
JOB_TTL_SECONDS = 7 * 24 * 60 * 60

class EnterpriseJob(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    company_name: str = Field(min_length=2, max_length=120)
    asset_name: str = Field(min_length=2, max_length=120)
    asset_type: str
    asset_geojson: dict
    buffer_m: int = Field(default=500, ge=100, le=5000)

class NDVIJob(BaseModel):
    user_id: str = Field(min_length=1, max_length=128)
    geometry: dict
    days: int = Field(default=180, ge=30, le=730)
    interval: str = Field(default="P30D", pattern="^P(1|5|10|15|30)D$")

def _redis():
    url = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"
    return redis.Redis.from_url(url, decode_responses=True, socket_connect_timeout=3)

def _authorize(worker_token: str | None, user_header: str | None, expected_user: str | None = None):
    configured = os.getenv("NEXORA_WORKER_TOKEN", "")
    if not configured or not worker_token or not hmac.compare_digest(worker_token, configured):
        raise HTTPException(status_code=401, detail="Worker authentication failed.")
    if not user_header or (expected_user is not None and not hmac.compare_digest(user_header, expected_user)):
        raise HTTPException(status_code=403, detail="User scope mismatch.")

def _owner_key(job_id: str) -> str:
    return "nexora:enterprise-report:owner:" + job_id

def _kind_key(job_id: str) -> str:
    return "nexora:job:kind:" + job_id

@app.get("/health")
def health():
    return {"status": "healthy", "service": "enterprise-report-worker"}

@app.post("/internal/jobs/enterprise-report", status_code=202)
def enqueue_enterprise_report(job: EnterpriseJob, x_nexora_worker_token: str | None = Header(default=None), x_nexora_user_id: str | None = Header(default=None)):
    _authorize(x_nexora_worker_token, x_nexora_user_id, job.user_id)
    if job.asset_type not in {"transmission_line", "substation", "wind_turbine", "other"}:
        raise HTTPException(status_code=422, detail="Unsupported asset type.")
    if len(str(job.asset_geojson)) > 1_000_000:
        raise HTTPException(status_code=413, detail="GeoJSON payload is too large.")
    job_id = str(uuid4())
    store = None
    try:
        store = _redis()
        store.setex(_owner_key(job_id), JOB_TTL_SECONDS, job.user_id)
        store.setex(_kind_key(job_id), JOB_TTL_SECONDS, "enterprise-report")
        build_enterprise_report.apply_async(args=[job_id, job.model_dump()], task_id=job_id)
    except Exception:
        try:
            if store:
                store.delete(_owner_key(job_id))
                store.delete(_kind_key(job_id))
        except Exception:
            pass
        raise HTTPException(status_code=503, detail="Report queue is unavailable.")
    return {"job_id": job_id, "kind": "enterprise-report", "status": "queued",
            "message": "Raporunuz hazırlanıyor. Tamamlandığında e-posta ile indirme bağlantısı gönderilecek."}

@app.post("/internal/jobs/ndvi-timeseries", status_code=202)
def enqueue_ndvi_timeseries(job: NDVIJob, x_nexora_worker_token: str | None = Header(default=None), x_nexora_user_id: str | None = Header(default=None)):
    _authorize(x_nexora_worker_token, x_nexora_user_id, job.user_id)
    if job.geometry.get("type") != "Polygon" or not job.geometry.get("coordinates"):
        raise HTTPException(status_code=422, detail="A GeoJSON Polygon is required.")
    if len(str(job.geometry.get("coordinates"))) > 100_000:
        raise HTTPException(status_code=413, detail="Polygon is too large; simplify the boundary.")
    job_id = str(uuid4())
    store = None
    try:
        store = _redis()
        store.setex(_owner_key(job_id), JOB_TTL_SECONDS, job.user_id)
        store.setex(_kind_key(job_id), JOB_TTL_SECONDS, "ndvi-timeseries")
        build_ndvi_timeseries.apply_async(args=[job_id, job.model_dump()], task_id=job_id)
    except Exception:
        try:
            if store:
                store.delete(_owner_key(job_id))
                store.delete(_kind_key(job_id))
        except Exception:
            pass
        raise HTTPException(status_code=503, detail="NDVI processing queue is unavailable.")
    return {"job_id": job_id, "kind": "ndvi-timeseries", "status": "queued",
            "message": "Sentinel-2 analysis has been queued."}

@app.get("/internal/jobs/{job_id}")
def report_status(job_id: str, user_id: str = Query(min_length=1, max_length=128),
                  x_nexora_worker_token: str | None = Header(default=None),
                  x_nexora_user_id: str | None = Header(default=None)):
    _authorize(x_nexora_worker_token, x_nexora_user_id, user_id)
    if not re.fullmatch(r"[A-Za-z0-9_-]{1,100}", job_id):
        raise HTTPException(status_code=422, detail="Invalid job ID.")
    try:
        store = _redis()
        owner = store.get(_owner_key(job_id))
        kind = store.get(_kind_key(job_id)) or "enterprise-report"
    except Exception:
        raise HTTPException(status_code=503, detail="Report status store is unavailable.")
    if not owner or not hmac.compare_digest(owner, user_id):
        raise HTTPException(status_code=404, detail="Report job not found.")
    result = AsyncResult(job_id, app=celery_app)
    states = {"PENDING": "queued", "RECEIVED": "queued", "STARTED": "running", "PROGRESS": "running",
              "RETRY": "retrying", "SUCCESS": "completed", "FAILURE": "failed"}
    payload = {"job_id": job_id, "kind": kind, "status": states.get(result.state, "running")}
    if result.state == "SUCCESS" and isinstance(result.result, dict):
        if kind == "enterprise-report":
            payload.update({k: v for k, v in result.result.items() if k in {"download_url", "email_sent", "completed_at"}})
        else:
            payload.update({k: v for k, v in result.result.items() if k in {"analysis", "completed_at"}})
    elif result.state == "FAILURE":
        payload["message"] = "The background job failed. Check worker logs and provider configuration."
    return payload
