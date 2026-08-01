# Nova-Forest AI
# Sentinel-2 NDVI Analysis Service


def calculate_ndvi(red_band, nir_band):

    """
    NDVI hesaplama:

    (NIR - RED) / (NIR + RED)

    Sentinel-2:
    RED = B4
    NIR = B8
    """


    if (nir_band + red_band) == 0:
        return 0


    ndvi = (
        nir_band - red_band
    ) / (
        nir_band + red_band
    )


    return round(ndvi, 3)



def get_vegetation_status(ndvi):


    if ndvi > 0.6:
        return "HEALTHY"


    elif ndvi > 0.3:
        return "MODERATE"


    elif ndvi > 0:
        return "DRY_RISK"


    else:
        return "CRITICAL"
      
