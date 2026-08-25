# =====================================
# NOVA-FOREST AI
# NDVI Service
# Version 0.1
# =====================================

from typing import Optional

import requests


# Copernicus / Sentinel-2 entegrasyonu
# için sonraki aşamada kullanılacak yapı.
# Şimdilik servis katmanı hazır tutuluyor.


def calculate_ndvi(
    nir: Optional[float],
    red: Optional[float]
) -> Optional[float]:
    """
    NDVI hesaplar.

    NDVI = (NIR - RED) / (NIR + RED)

    nir:
        Yakın kızılötesi yansıma

    red:
        Kırmızı bant yansıması
    """

    if nir is None or red is None:
        return None

    denominator = nir + red

    if denominator == 0:
        return None

    ndvi = (nir - red) / denominator

    return round(ndvi, 4)


def classify_ndvi(ndvi: Optional[float]) -> str:
    """
    NDVI değerini basit çevresel sınıflara ayırır.
    """

    if ndvi is None:
        return "NO_DATA"

    if ndvi < 0.20:
        return "VERY_LOW"

    if ndvi < 0.40:
        return "LOW"

    if ndvi < 0.60:
        return "MODERATE"

    if ndvi < 0.80:
        return "HEALTHY"

    return "VERY_HEALTHY"


def get_ndvi_status(
    ndvi: Optional[float]
) -> dict:
    """
    Frontend ve risk motoru için
    standart NDVI çıktısı üretir.
    """

    classification = classify_ndvi(ndvi)

    return {
        "ndvi": ndvi,
        "classification": classification,
        "source": "Sentinel-2",
        "status": (
            "available"
            if ndvi is not None
            else "no_data"
        )
    }
