from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict, Optional
from app.services.ndvi_service import get_region_satellite_status, get_area_ndvi_timeseries

router = APIRouter(prefix="/ndvi", tags=["NDVI"])

class AreaGeometry(BaseModel):
    type: str = Field(pattern="^Polygon$")
    coordinates: list

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
