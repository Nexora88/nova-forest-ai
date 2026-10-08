from fastapi import APIRouter, HTTPException
from fastapi.responses import Response
from app.services.ndvi_service import get_region_satellite_status, get_area_ndvi_timeseries, get_satellite_risk_raster
from pydantic import BaseModel, Field
from typing import Any, Dict

router = APIRouter(prefix="/ndvi", tags=["NDVI"])

class AreaNDVIRequest(BaseModel):
    geometry: Dict[str, Any]
    days: int = Field(default=180, ge=30, le=730)
    interval: str = Field(default="P30D", pattern="^P(1|5|10|15|30)D$")

@router.get("/status/{region}")
def ndvi_status(region: str):
    supported = {"Edirne", "Kırklareli", "Tekirdağ", "Çanakkale", "İstanbul Avrupa"}
    if region not in supported:
        return {"status": "invalid_region", "message": "Desteklenmeyen bölge."}
    return get_region_satellite_status(region)

@router.post("/area-timeseries")
def area_timeseries(request: AreaNDVIRequest):
    geometry=request.geometry
    if geometry.get("type") != "Polygon" or not geometry.get("coordinates"):
        raise HTTPException(status_code=400, detail="Geçerli bir Polygon geometrisi gerekli.")
    return get_area_ndvi_timeseries(geometry, request.days, request.interval)

@router.get("/risk-raster")
def risk_raster(west: float, south: float, east: float, north: float, width: int = 640, height: int = 480):
    if not (west < east and south < north):
        raise HTTPException(status_code=400, detail="Geçerli bbox gerekli.")
    width=max(128,min(1024,width)); height=max(128,min(1024,height))
    try:
        image, weather, weather_risk = get_satellite_risk_raster([west,south,east,north],width,height)
        headers={
            "Cache-Control":"public, max-age=900",
            "X-Nexora-Risk-Type":"Sentinel-2 NDVI/NDMI + Open-Meteo meteorological composite",
            "X-Nexora-Weather-Risk":f"{weather_risk:.3f}",
            "X-Nexora-Weather-Time":str(weather.get("observed_at") or ""),
        }
        return Response(content=image,media_type="image/png",headers=headers)
    except RuntimeError as exc:
        raise HTTPException(status_code=503,detail=str(exc))
    except Exception as exc:
        raise HTTPException(status_code=502,detail=f"Sentinel-2 raster alınamadı: {exc}")
