from typing import Optional, Dict, Any
import os
import requests
from datetime import datetime, timedelta, timezone

CDSE_STAC = "https://stac.dataspace.copernicus.eu/v1/search"
SH_PROCESS = "https://sh.dataspace.copernicus.eu/statistics/v1"
TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
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

def _token():
    client_id=os.getenv("CDSE_CLIENT_ID")
    client_secret=os.getenv("CDSE_CLIENT_SECRET")
    if not client_id or not client_secret:
        return None
    r=requests.post(TOKEN_URL,data={"grant_type":"client_credentials","client_id":client_id,"client_secret":client_secret},timeout=20)
    r.raise_for_status()
    return r.json()["access_token"]

def _stats_request(geometry, days=180, interval="P30D"):
    now=datetime.now(timezone.utc)
    start=now-timedelta(days=days)
    evalscript="""//VERSION=3
function setup() {
  return {
    input: [{ bands: ["B04","B08","B11","SCL","dataMask"] }],
    output: [
      { id: "ndvi", bands: 1, sampleType: "FLOAT32" },
      { id: "ndmi", bands: 1, sampleType: "FLOAT32" },
      { id: "dataMask", bands: 1 }
    ]
  };
}
function evaluatePixel(s) {
  var valid = s.dataMask && s.SCL !== 3 && s.SCL !== 8 && s.SCL !== 9 && s.SCL !== 10 && s.SCL !== 11;
  var ndvi = valid && (s.B08 + s.B04) !== 0 ? (s.B08 - s.B04) / (s.B08 + s.B04) : 0;
  var ndmi = valid && (s.B08 + s.B11) !== 0 ? (s.B08 - s.B11) / (s.B08 + s.B11) : 0;
  return { ndvi:[ndvi], ndmi:[ndmi], dataMask:[valid ? 1 : 0] };
}"""
    return {
      "input":{"bounds":{"geometry":geometry,"properties":{"crs":"http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},"data":[{"type":COLLECTION,"dataFilter":{"mosaickingOrder":"leastCC"}}]},
      "aggregation":{"timeRange":{"from":start.isoformat().replace("+00:00","Z"),"to":now.isoformat().replace("+00:00","Z")},"aggregationInterval":{"of":interval},"evalscript":evalscript,"resx":10,"resy":10}
    }

def get_area_ndvi_timeseries(geometry: Dict[str, Any], days=180, interval="P30D"):
    token=_token()
    if not token:
        return {"status":"not_configured","message":"Gerçek Sentinel-2 NDVI için CDSE_CLIENT_ID ve CDSE_CLIENT_SECRET backend ortam değişkenleri gerekli.","source":"Copernicus Sentinel-2 L2A","series":[]}
    try:
        r=requests.post(SH_PROCESS,headers={"Authorization":f"Bearer {token}","Content-Type":"application/json","Accept":"application/json"},json=_stats_request(geometry,days,interval),timeout=90)
        r.raise_for_status()
        raw=r.json()
        series=[]
        for item in raw.get("data",[]):
            ndvi_stats=item.get("outputs",{}).get("ndvi",{}).get("bands",{}).get("B0",{}).get("stats",{})
            ndmi_stats=item.get("outputs",{}).get("ndmi",{}).get("bands",{}).get("B0",{}).get("stats",{})
            ndvi=ndvi_stats.get("mean")
            ndmi=ndmi_stats.get("mean")
            if ndvi is not None:
                series.append({"from":item.get("interval",{}).get("from"),"to":item.get("interval",{}).get("to"),"ndvi":round(float(ndvi),4),"ndmi":round(float(ndmi),4) if ndmi is not None else None,"classification":classify_ndvi(float(ndvi)),"sample_count":ndvi_stats.get("sampleCount",0)})
        latest=series[-1] if series else None
        previous=series[-2] if len(series)>1 else None
        return {"status":"available","source":"Copernicus Sentinel-2 L2A / Statistical API","method":"NDVI B08-B04 + NDMI B08-B11; SCL cloud/shadow exclusion","series":series,"latest":latest,"delta":{"ndvi":round(latest["ndvi"]-previous["ndvi"],4) if latest and previous else None,"ndmi":round(latest["ndmi"]-previous["ndmi"],4) if latest and previous and latest.get("ndmi") is not None and previous.get("ndmi") is not None else None}}
    except requests.RequestException as exc:
        return {"status":"error","source":"Copernicus Sentinel-2 L2A / Statistical API","error":str(exc),"series":[]}

def get_ndvi_status(ndvi: Optional[float], region: Optional[str] = None):
    scene = None
    error = None
    if region in REGIONS:
        try:
            lat, lon = REGIONS[region]
            scene = search_latest_scene(lat, lon)
        except requests.RequestException as exc:
            error = str(exc)
    return {"ndvi":ndvi,"classification":classify_ndvi(ndvi),"source":"Copernicus Sentinel-2 Level-2A","status":"available" if ndvi is not None else ("scene_found" if scene else "no_ndvi_value"),"latest_scene":scene,"error":error,"method":"NDVI = (B08 NIR - B04 RED) / (B08 NIR + B04 RED)"}

def get_region_satellite_status(region: str):
    lat, lon = REGIONS[region]
    try:
        scene = search_latest_scene(lat, lon)
        return {"region":region,"status":"available" if scene else "no_scene","source":"Copernicus Sentinel-2 Level-2A","scene":scene,"ndvi":None,"ndvi_status":"scene_found_pixel_stats_require_cdse_credentials","message":"Sahne keşfi çalışır. Alan bazlı gerçek NDVI zaman serisi CDSE kimlik bilgileri tanımlandığında Statistical API üzerinden hesaplanır."}
    except requests.RequestException as exc:
        return {"region":region,"status":"error","source":"Copernicus Sentinel-2 Level-2A","error":str(exc),"ndvi":None}
