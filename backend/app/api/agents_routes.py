"""Authenticated model-backed personal field copilot endpoint."""
from __future__ import annotations
from typing import Any
import os
import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.api.jobs_routes import _authenticated_user
from app.services.nova_agents import configuration_status, run_field_agents

router = APIRouter(prefix="/agents", tags=["Field agents"])

class FieldAnalysisRequest(BaseModel):
    area_name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    area_type: str = Field(default="field", max_length=40)
    crop_type: str | None = Field(default=None, max_length=80)
    geometry: dict[str, Any] | None = None
    days: int = Field(default=180, ge=30, le=730)

@router.get("/status")
def agent_status():
    status = configuration_status()
    return {
        **status,
        "ndvi_credentials_configured": bool(os.getenv("CDSE_CLIENT_ID") and os.getenv("CDSE_CLIENT_SECRET")),
        "weather_source": "Open-Meteo",
        "note": "Provider configuration is not proof that a live model call will succeed.",
    }

@router.post("/analyze")
def analyze_field(request: FieldAnalysisRequest, authorization: str | None = Header(default=None)):
    _authenticated_user(authorization)
    try:
        response = requests.get(
            "https://api.open-meteo.com/v1/forecast",
            params={
                "latitude": request.lat, "longitude": request.lon,
                "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation",
                "daily": "temperature_2m_min,temperature_2m_max,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,et0_fao_evapotranspiration",
                "forecast_days": 3, "timezone": "Europe/Istanbul",
            },
            timeout=15,
        )
        response.raise_for_status()
        raw = response.json()
        if raw.get("error") or not raw.get("current"):
            raise HTTPException(status_code=502, detail="Open-Meteo geçerli hava verisi döndürmedi.")
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Open-Meteo hava verisine ulaşılamadı.") from exc
    weather = {"source": "Open-Meteo", "current": raw.get("current"), "daily": raw.get("daily"), "observed_at": raw.get("current", {}).get("time")}
    satellite: dict[str, Any] = {"status": "not_requested", "source": "Copernicus Sentinel-2", "series": []}
    if request.geometry is not None:
        geometry = request.geometry
        if geometry.get("type") != "Polygon" or not geometry.get("coordinates") or len(str(geometry)) > 100_000:
            raise HTTPException(status_code=422, detail="Uydu raporu için geçerli, 100 KB altında bir GeoJSON Polygon gerekli.")
        if not (os.getenv("CDSE_CLIENT_ID") and os.getenv("CDSE_CLIENT_SECRET")):
            satellite = {"status": "not_configured", "source": "Copernicus Sentinel-2 L2A", "series": [], "message": "CDSE kimlik bilgileri sunucuya eklenmemiş; NDVI/NDMI uydurulmadı."}
        else:
            try:
                from app.services.ndvi_service import get_area_ndvi_timeseries
                satellite = get_area_ndvi_timeseries(geometry, days=request.days)
            except Exception as exc:
                satellite = {"status": "error", "source": "Copernicus Sentinel-2 L2A", "series": [], "error_type": type(exc).__name__}
    area = {"name": request.area_name, "type": request.area_type, "crop_type": request.crop_type, "coordinates": {"lat": request.lat, "lon": request.lon}}
    try:
        result = run_field_agents(weather, satellite, area)
    except RuntimeError as exc:
        if str(exc) == "nova_agent_provider_not_configured":
            raise HTTPException(status_code=503, detail={"code": "agents_not_configured", "message": "Agro-Agent, Eco-Agent ve Writer-Agent için sunucuya NOVA_AGENT_API_BASE, NOVA_AGENT_API_KEY ve üç model adı eklenmeli."}) from exc
        raise HTTPException(status_code=502, detail="Bir uzman model çağrısı başarısız oldu; kısmi rapor tamamlanmış gibi gösterilmedi.") from exc
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Uzman model sağlayıcısına ulaşılamadı.") from exc
    result["evidence"]["satellite"] = {"status": satellite.get("status"), "latest": satellite.get("latest"), "series_count": len(satellite.get("series", []))}
    return result
