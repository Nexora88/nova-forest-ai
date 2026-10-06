from fastapi import APIRouter
from app.services.ndvi_service import get_region_satellite_status

router = APIRouter(prefix="/ndvi", tags=["NDVI"])

@router.get("/status/{region}")
def ndvi_status(region: str):
    supported = {"Edirne", "Kırklareli", "Tekirdağ", "Çanakkale", "İstanbul Avrupa"}
    if region not in supported:
        return {"status": "invalid_region", "message": "Desteklenmeyen bölge."}
    return get_region_satellite_status(region)
