"""Personalized, source-labelled environmental Copilot."""
from __future__ import annotations
from datetime import datetime, timezone
from typing import Any
import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.api.jobs_routes import _authenticated_user
from app.services.agent_service import run_agent, agent_configured

router=APIRouter(prefix="/copilot",tags=["Environmental Copilot"])
OPEN_METEO="https://api.open-meteo.com/v1/forecast"
AIR="https://air-quality-api.open-meteo.com/v1/air-quality"

class DailyReportRequest(BaseModel):
    area_name: str=Field(min_length=1,max_length=120)
    lat: float=Field(ge=-90,le=90)
    lon: float=Field(ge=-180,le=180)
    crop: str=Field(default="general",max_length=80)
    geometry: dict[str,Any]|None=None
    days: int=Field(default=180,ge=30,le=730)

def _get(url:str,params:dict)->dict:
    response=requests.get(url,params=params,timeout=18)
    response.raise_for_status()
    data=response.json()
    if not isinstance(data,dict): raise ValueError("invalid_provider_payload")
    return data

@router.get("/status")
def copilot_status():
    import os
    roles={"agro":os.getenv("NEXORA_AGRO_MODEL",""),"eco":os.getenv("NEXORA_ECO_MODEL",""),"writer":os.getenv("NEXORA_WRITER_MODEL","")}
    return {"provider_configured":agent_configured(),"agents":{k:{"configured":bool(v.strip()),"model":v.strip() or None} for k,v in roles.items()},"note":"Each role uses its configured model; absent keys/models are reported, not simulated."}

@router.post("/daily-report")
def daily_report(payload:DailyReportRequest,authorization:str|None=Header(default=None)):
    _authenticated_user(authorization)
    try:
        weather=_get(OPEN_METEO,{"latitude":payload.lat,"longitude":payload.lon,"current":"temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit","daily":"temperature_2m_min,temperature_2m_max,precipitation_sum,wind_speed_10m_max,et0_fao_evapotranspiration","forecast_days":3,"timezone":"Europe/Istanbul"})
        air=_get(AIR,{"latitude":payload.lat,"longitude":payload.lon,"current":"alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen","timezone":"Europe/Istanbul"})
    except (requests.RequestException,ValueError,TypeError):
        raise HTTPException(status_code=502,detail="Güncel çevre verisi sağlayıcıdan alınamadı; rapor üretilmedi.")
    current=weather.get("current") or {}
    daily=weather.get("daily") or {}
    pollen=air.get("current") or {}
    satellite={"status":"not_requested","series":[]}
    if payload.geometry:
        if payload.geometry.get("type")!="Polygon" or not payload.geometry.get("coordinates"):
            raise HTTPException(status_code=422,detail="Uydu analizi için geçerli GeoJSON Polygon gerekli.")
        from app.services.ndvi_service import get_area_ndvi_timeseries
        try: satellite=get_area_ndvi_timeseries(payload.geometry,days=payload.days,interval="P30D")
        except Exception as exc: satellite={"status":"error","error_type":type(exc).__name__,"series":[]}
    evidence={"area":payload.area_name,"crop":payload.crop,"observed_at":current.get("time"),"timezone":weather.get("timezone"),
      "weather":{"current":current,"forecast":daily,"source":"Open-Meteo Forecast API"},
      "pollen":{"current":pollen,"source":"Open-Meteo Air Quality API","status":"available" if pollen else "no_data"},
      "satellite":{"status":satellite.get("status","unknown"),"series":satellite.get("series",[]),"source":"Copernicus Sentinel-2 L2A","latest_scene":satellite.get("latest_scene")},
      "data_quality_note":"Weather and pollen are provider observations/forecasts. Satellite metrics are omitted unless the provider returns a processed time series."}
    agro=run_agent("agro","You are Agro-Agent for a Turkish farm. Analyze only supplied weather/forecast and satellite observations. Distinguish measured values from inference. Never invent soil moisture, NDVI or irrigation prescriptions. Reply in concise Turkish with findings, uncertainty and safe next checks.",evidence)
    eco=run_agent("eco","You are Eco-Agent for a Turkish environmental monitoring service. Interpret weather, wind, precipitation and pollen only from supplied data. Do not claim a fire is confirmed from weather. Clearly state uncertainty and data gaps. Reply in concise Turkish.",evidence)
    if agro["status"]!="available" or eco["status"]!="available":
        return {"status":"agents_not_ready","generated_at":datetime.now(timezone.utc).isoformat(),"area":payload.area_name,"evidence":evidence,"agents":{"agro":agro,"eco":eco,"writer":{"status":"blocked","output":None}},"message":"Agro-Agent ve Eco-Agent için AI_API_KEY, AI_API_BASE_URL ve rol model adları yapılandırılmalı."}
    writer=run_agent("writer","You are Writer Agent. Write a clear Turkish daily briefing for a farm manager using only the supplied evidence and agent outputs. Include: short summary, Agro findings, Eco findings, 1-3 practical checks, and a data limitations note. Do not add facts, guarantees, or unsupported recommendations.",{"evidence":evidence,"agro_agent":agro["output"],"eco_agent":eco["output"]})
    return {"status":"available" if writer["status"]=="available" else "partial","generated_at":datetime.now(timezone.utc).isoformat(),"area":payload.area_name,"evidence":evidence,"agents":{"agro":agro,"eco":eco,"writer":writer}}
