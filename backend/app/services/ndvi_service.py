from typing import Optional
import os
import requests
from datetime import datetime, timedelta, timezone

CDSE_STAC = "https://stac.dataspace.copernicus.eu/v1/search"
COLLECTION = "sentinel-2-l2a"

REGIONS = {
    "Edirne": (41.6771, 26.5557),
    "Kırklareli": (41.7355, 27.2252),
    "Tekirdağ": (40.9781, 27.5110),
    "Çanakkale": (40.1553, 26.4142),
    "İstanbul Avrupa": (41.1500, 28.6500),
}

def calculate_ndvi(nir: Optional[float], red: Optional[float]) -> Optional[float]:
    if nir is None or red is None or nir + red == 0:
        return None
    return round((nir - red) / (nir + red), 4)

def classify_ndvi(ndvi: Optional[float]) -> str:
    if ndvi is None: return "VERİ YOK"
    if ndvi < 0.20: return "ÇOK DÜŞÜK"
    if ndvi < 0.40: return "DÜŞÜK"
    if ndvi < 0.60: return "ORTA"
    if ndvi < 0.80: return "SAĞLIKLI"
    return "ÇOK SAĞLIKLI"

def _bbox(lat, lon, size=0.10):
    return [lon-size, lat-size, lon+size, lat+size]

def search_latest_scene(lat, lon, days=45, max_cloud=35):
    now = datetime.now(timezone.utc)
    start = now - timedelta(days=days)
    payload = {
        "collections": [COLLECTION],
        "bbox": _bbox(lat, lon),
        "datetime": f"{start.isoformat().replace('+00:00','Z')}/{now.isoformat().replace('+00:00','Z')}",
        "query": {"eo:cloud_cover": {"lte": max_cloud}},
        "sortby": [{"field": "datetime", "direction": "desc"}],
        "limit": 1,
    }
    response = requests.post(CDSE_STAC, json=payload, timeout=20)
    response.raise_for_status()
    features = response.json().get("features", [])
    if not features:
        return None
    item = features[0]
    props = item.get("properties", {})
    return {
        "id": item.get("id"),
        "datetime": props.get("datetime"),
        "cloud_cover": props.get("eo:cloud_cover"),
        "collection": COLLECTION,
        "assets": list(item.get("assets", {}).keys()),
        "catalog_url": f"https://browser.stac.dataspace.copernicus.eu/collections/{COLLECTION}/items/{item.get('id')}",
    }

def get_ndvi_status(ndvi: Optional[float], region: Optional[str] = None):
    scene = None
    error = None
    if region in REGIONS:
        try:
            lat, lon = REGIONS[region]
            scene = search_latest_scene(lat, lon)
        except requests.RequestException as exc:
            error = str(exc)

    return {
        "ndvi": ndvi,
        "classification": classify_ndvi(ndvi),
        "source": "Copernicus Sentinel-2 Level-2A",
        "status": "available" if ndvi is not None else ("scene_found" if scene else "no_ndvi_value"),
        "latest_scene": scene,
        "error": error,
        "method": "NDVI = (B08 NIR - B04 RED) / (B08 NIR + B04 RED)",
    }

def get_region_satellite_status(region: str):
    lat, lon = REGIONS[region]
    try:
        scene = search_latest_scene(lat, lon)
        return {
            "region": region,
            "status": "available" if scene else "no_scene",
            "source": "Copernicus Sentinel-2 Level-2A",
            "scene": scene,
            "ndvi": None,
            "ndvi_status": "scene_discovered_but_pixel_processing_not_enabled",
            "message": "Görüntü bulundu. NDVI piksel hesabı için işleme servisi/kimlik doğrulama gereklidir.",
        }
    except requests.RequestException as exc:
        return {
            "region": region,
            "status": "error",
            "source": "Copernicus Sentinel-2 Level-2A",
            "error": str(exc),
            "ndvi": None,
        }
