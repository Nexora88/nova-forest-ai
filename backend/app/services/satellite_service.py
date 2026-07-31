# Nova-Forest AI Satellite Service
# İlk sürüm uydu veri altyapısı


def get_satellite_status(region):

    """
    İlk sürümde uydu modülü için
    temel veri yapısı.
    
    İleride:
    - Sentinel-2 NDVI
    - NASA FIRMS
    verileri buraya bağlanacak.
    """

    return {
        "region": region,
        "satellite_source": "Sentinel-2 / NASA FIRMS",
        "ndvi_status": "not_available",
        "thermal_alert": False
    }
