"""Celery tasks for private enterprise environmental PDF reports."""
from __future__ import annotations
import csv, io, os
from datetime import datetime, timezone
from pathlib import PurePosixPath
from typing import Any
import requests
from celery import Celery
from app.services.copernicus_service import analyze_area
from app.utils.pdf_generator import generate_environment_report

REDIS_URL = os.getenv("REDIS_URL") or os.getenv("CELERY_BROKER_URL") or "redis://localhost:6379/0"
celery_app = Celery("nexora_enterprise_reports", broker=REDIS_URL, backend=os.getenv("CELERY_RESULT_BACKEND") or REDIS_URL)
celery_app.conf.update(task_track_started=True, task_serializer="json", result_serializer="json",
    accept_content=["json"], result_expires=7 * 24 * 60 * 60, task_acks_late=True,
    worker_prefetch_multiplier=1, task_soft_time_limit=150, task_time_limit=180)

def extract_geometry(value: dict[str, Any]) -> dict[str, Any]:
    kind = value.get("type")
    if kind == "FeatureCollection":
        features = value.get("features") or []
        geometries = [extract_geometry(feature) for feature in features if isinstance(feature, dict)]
        if not geometries:
            raise ValueError("FeatureCollection has no supported geometry.")
        if len(geometries) == 1:
            return geometries[0]
        polygons = []
        for geometry in geometries:
            if geometry["type"] == "Polygon": polygons.append(geometry["coordinates"])
            elif geometry["type"] == "MultiPolygon": polygons.extend(geometry["coordinates"])
        if polygons: return {"type": "MultiPolygon", "coordinates": polygons}
        return geometries[0]
    if kind == "Feature":
        geometry = value.get("geometry")
        if not isinstance(geometry, dict): raise ValueError("Feature has no geometry.")
        return extract_geometry(geometry)
    if kind in {"Point", "Polygon", "MultiPolygon"} and value.get("coordinates"):
        return {"type": kind, "coordinates": value["coordinates"]}
    raise ValueError("Supported geometry is Point, Polygon, MultiPolygon, Feature or FeatureCollection.")

def geometry_summary(geometry: dict[str, Any]) -> dict[str, Any]:
    points: list[tuple[float, float]] = []
    def visit(value):
        if isinstance(value, (list, tuple)) and len(value) >= 2 and isinstance(value[0], (int, float)) and isinstance(value[1], (int, float)):
            lon, lat = float(value[0]), float(value[1])
            if -180 <= lon <= 180 and -90 <= lat <= 90: points.append((lon, lat))
        elif isinstance(value, (list, tuple)):
            for item in value: visit(item)
    visit(geometry["coordinates"])
    if not points: raise ValueError("Geometry contains no valid WGS84 coordinate pairs.")
    west, east = min(p[0] for p in points), max(p[0] for p in points)
    south, north = min(p[1] for p in points), max(p[1] for p in points)
    return {"bbox": [west, south, east, north], "latitude": sum(p[1] for p in points) / len(points),
            "longitude": sum(p[0] for p in points) / len(points)}

def _fetch_weather(latitude: float, longitude: float):
    response = requests.get("https://api.open-meteo.com/v1/forecast", params={
        "latitude": latitude, "longitude": longitude,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,vapour_pressure_deficit",
        "timezone": "Europe/Istanbul"}, timeout=15)
    response.raise_for_status()
    current = response.json().get("current") or {}
    mapping = [("Temperature", "temperature_2m", "°C"), ("Relative humidity", "relative_humidity_2m", "%"),
               ("Wind speed", "wind_speed_10m", "km/h"), ("Precipitation", "precipitation", "mm"),
               ("Vapour pressure deficit", "vapour_pressure_deficit", "kPa")]
    indicators = [{"name": name, "value": f"{current[key]} {unit}", "source": "Open-Meteo forecast",
                   "observed_at": current.get("time")} for name, key, unit in mapping if current.get(key) is not None]
    return indicators, bool(indicators), current.get("time")

def _fetch_firms(bbox):
    key = os.getenv("FIRMS_MAP_KEY")
    if not key: return "not_configured", None, None
    west, south, east, north = bbox
    area = f"{west},{south},{east},{north}"
    response = requests.get(f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_NOAA20_NRT/{area}/1", timeout=25)
    response.raise_for_status()
    reader = csv.DictReader(io.StringIO(response.text))
    count = sum(1 for row in reader if row.get("latitude") and row.get("longitude"))
    return "available", count, datetime.now(timezone.utc).isoformat()

def _upload_pdf(job_id: str, user_id: str, pdf: bytes) -> str:
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ADMIN_KEY", "")
    bucket = os.getenv("SUPABASE_REPORTS_BUCKET", "enterprise-reports")
    if not base or not key: raise RuntimeError("Report storage is not configured.")
    object_path = str(PurePosixPath("enterprise") / user_id / f"{job_id}.pdf")
    headers = {"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/pdf", "x-upsert": "true"}
    uploaded = requests.post(f"{base}/storage/v1/object/{bucket}/{object_path}", headers=headers, data=pdf, timeout=45)
    uploaded.raise_for_status()
    signed = requests.post(f"{base}/storage/v1/object/sign/{bucket}/{object_path}",
        headers={"Authorization": f"Bearer {key}", "apikey": key, "Content-Type": "application/json"},
        json={"expiresIn": 604800}, timeout=20)
    signed.raise_for_status()
    path = signed.json().get("signedURL") or signed.json().get("signedUrl")
    if not path: raise RuntimeError("Storage did not return a signed download URL.")
    if path.startswith("http://") or path.startswith("https://"): return path
    return base + "/storage/v1/" + path.lstrip("/")

def _send_email(user_id: str, company_name: str, asset_name: str, download_url: str):
    api_key, sender = os.getenv("RESEND_API_KEY"), os.getenv("REPORT_EMAIL_FROM")
    base = os.getenv("SUPABASE_URL", "").rstrip("/")
    service_key = os.getenv("SUPABASE_SERVICE_ROLE_KEY") or os.getenv("SUPABASE_ADMIN_KEY", "")
    if not api_key or not sender or not base or not service_key: raise RuntimeError("Email delivery is not configured.")
    user = requests.get(f"{base}/auth/v1/admin/users/{user_id}",
        headers={"Authorization": f"Bearer {service_key}", "apikey": service_key}, timeout=15)
    user.raise_for_status()
    recipient = (user.json().get("user") or user.json()).get("email")
    if not recipient: raise RuntimeError("The report owner has no email address.")
    message = {"from": sender, "to": [recipient], "subject": f"NexoraWildfire AI — {asset_name} raporu hazır",
        "text": f"Merhaba, {company_name} için {asset_name} çevresel risk raporu hazır. Güvenli indirme bağlantısı (7 gün geçerli): {download_url}"}
    sent = requests.post("https://api.resend.com/emails",
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"}, json=message, timeout=20)
    sent.raise_for_status()

@celery_app.task(bind=True, name="worker.build_enterprise_report")
def build_enterprise_report(self, job_id: str, payload: dict):
    user_id = str(payload["user_id"])
    self.update_state(state="PROGRESS", meta={"stage": "validating_geometry"})
    geometry = extract_geometry(payload["asset_geojson"])
    summary, bbox = geometry_summary(geometry), geometry_summary(geometry)["bbox"]
    indicators = []
    provider_status = {"Open-Meteo": "error", "NASA FIRMS": "not_configured", "Copernicus Sentinel-2": "not_configured"}
    notes = ["Decision support only; this is not an official fire warning or a guarantee of safety.",
        "NASA FIRMS detections are hotspot observations, not verified fire incidents.",
        f"Asset type: {payload.get('asset_type', 'other')}; requested buffer: {payload.get('buffer_m', 500)} m."]
    self.update_state(state="PROGRESS", meta={"stage": "collecting_provider_data"})
    try:
        rows, available, observed_at = _fetch_weather(summary["latitude"], summary["longitude"])
        indicators.extend(rows); provider_status["Open-Meteo"] = "available" if available else "no_data"
        if observed_at: notes.append(f"Open-Meteo current-data timestamp: {observed_at}.")
    except Exception as exc: provider_status["Open-Meteo"] = "error:" + type(exc).__name__
    try:
        status, count, observed_at = _fetch_firms(bbox)
        provider_status["NASA FIRMS"] = status
        if count is not None: indicators.append({"name": "NASA FIRMS hotspot detections in requested bbox", "value": count,
            "source": "NASA FIRMS VIIRS NOAA-20 NRT", "observed_at": observed_at})
    except Exception as exc: provider_status["NASA FIRMS"] = "error:" + type(exc).__name__
    try:
        satellite = analyze_area(geometry, days=180, interval="P30D")
        provider_status["Copernicus Sentinel-2"] = satellite.get("statistics_status", satellite.get("status", "unknown"))
        latest = (satellite.get("ndvi_ndmi") or {}).get("latest") or {}
        for name, key in (("NDVI", "ndvi"), ("NDMI", "ndmi")):
            if latest.get(key) is not None: indicators.append({"name": name, "value": latest[key],
                "source": "Copernicus Sentinel-2 L2A", "observed_at": latest.get("to") or latest.get("from")})
        if satellite.get("warning"): notes.append(satellite["warning"])
    except Exception as exc: provider_status["Copernicus Sentinel-2"] = "error:" + type(exc).__name__
    self.update_state(state="PROGRESS", meta={"stage": "generating_pdf"})
    pdf = generate_environment_report(title=f"Enterprise Environmental Risk Report — {payload['asset_name']}",
        area_name=f"{payload['company_name']} / {payload['asset_name']}",
        generated_at=datetime.now(timezone.utc).isoformat(), provider_status=provider_status,
        indicators=indicators, notes=notes)
    self.update_state(state="PROGRESS", meta={"stage": "uploading_pdf"})
    download_url = _upload_pdf(job_id, user_id, pdf)
    self.update_state(state="PROGRESS", meta={"stage": "sending_email"})
    _send_email(user_id, payload["company_name"], payload["asset_name"], download_url)
    return {"kind": "enterprise-report", "user_id": user_id, "status": "completed", "download_url": download_url,
            "email_sent": True, "completed_at": datetime.now(timezone.utc).isoformat()}
