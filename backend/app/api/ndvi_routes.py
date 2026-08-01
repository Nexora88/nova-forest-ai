from fastapi import APIRouter
from app.services.ndvi_service import calculate_ndvi, get_vegetation_status


router = APIRouter()


@router.get("/ndvi-test")
def ndvi_test():

    # Test Sentinel-2 değerleri

    red_band = 0.20
    nir_band = 0.65


    ndvi = calculate_ndvi(
        red_band,
        nir_band
    )


    status = get_vegetation_status(
        ndvi
    )


    return {

        "source": "Sentinel-2",

        "ndvi_value": ndvi,

        "vegetation_status": status

    }
