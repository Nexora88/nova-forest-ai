from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import Any, Dict
from app.services.ndvi_service import get_region_satellite_status, get_area_ndvi_timeseries
from app.services.copernicus_service import analyze_area

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
    geometry = request.geometry
    if geometry.get("type") != "Polygon" or not geometry.get("coordinates"):
        raise HTTPException(status_code=400, detail="Geçerli bir Polygon geometrisi gerekli.")
    return get_area_ndvi_timeseries(geometry, request.days, request.interval)


@router.get("/risk-raster")
def risk_raster(west: float, south: float, east: float, north: float, width: int = 640, height: int = 480):
    # Heavy raster processing must not run in a Vercel request. The browser uses
    # POST /jobs/risk-raster and polls the persistent Redis/RQ worker instead.
    if not (west < east and south < north):
        raise HTTPException(status_code=400, detail="Geçerli bbox gerekli.")
    raise HTTPException(
        status_code=410,
        detail={
            "status": "async_worker_required",
            "message": "Raster üretimi kuyruklu worker'a taşındı. POST /jobs/risk-raster uç noktasını kullanın.",
        },
    )



@router.post("/area-analysis")
def area_analysis(request: AreaNDVIRequest):
    """Discover the newest Sentinel-2 scene and return real NDVI/NDMI statistics when configured."""
    try:
        return analyze_area(request.geometry, request.days, request.interval)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc)) from exc
