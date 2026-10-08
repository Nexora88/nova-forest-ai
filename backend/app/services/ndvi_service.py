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



def _raster_weather(bbox):
    """Get live meteorological inputs for the raster center from Open-Meteo."""
    west, south, east, north = bbox
    lat = (south + north) / 2
    lon = (west + east) / 2
    params = {
        "latitude": lat,
        "longitude": lon,
        "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,vapour_pressure_deficit",
        "daily": "et0_fao_evapotranspiration,precipitation_sum",
        "forecast_days": 1,
        "timezone": "Europe/Istanbul",
    }
    r = requests.get("https://api.open-meteo.com/v1/forecast", params=params, timeout=15)
    r.raise_for_status()
    data = r.json()
    current = data.get("current", {})
    daily = data.get("daily", {})
    return {
        "temperature": float(current.get("temperature_2m") or 0),
        "humidity": float(current.get("relative_humidity_2m") or 0),
        "wind": float(current.get("wind_speed_10m") or 0),
        "precipitation": float(current.get("precipitation") or 0),
        "vpd": float(current.get("vapour_pressure_deficit") or 0),
        "et0": float((daily.get("et0_fao_evapotranspiration") or [0])[0] or 0),
        "observed_at": current.get("time"),
    }


def _weather_risk_score(weather):
    """Transparent 0..1 meteorological fire-weather signal."""
    t = weather["temperature"]
    h = weather["humidity"]
    wind = weather["wind"]
    precip = weather["precipitation"]
    vpd = weather["vpd"]
    et0 = weather["et0"]
    temp = max(0.0, min(1.0, (t - 18.0) / 24.0))
    dry = max(0.0, min(1.0, (65.0 - h) / 50.0))
    wind_score = max(0.0, min(1.0, wind / 55.0))
    vpd_score = max(0.0, min(1.0, vpd / 4.0))
    et0_score = max(0.0, min(1.0, et0 / 7.0))
    rain_penalty = max(0.0, min(0.35, precip / 8.0))
    return max(0.0, min(1.0, 0.24 * temp + 0.27 * dry + 0.24 * wind_score + 0.15 * vpd_score + 0.10 * et0_score - rain_penalty))


def get_satellite_risk_raster(bbox, width=640, height=480):
    """Generate a real decision-support fire-risk raster.

    Sentinel-2 supplies spatial NDVI/NDMI vegetation stress/dryness.
    Open-Meteo supplies live weather stress for the requested area's center.
    The result is a transparent composite signal, not a trained fire-probability model.
    """
    token = _token()
    if not token:
        raise RuntimeError("Gerçek Sentinel-2 rasterı için CDSE_CLIENT_ID ve CDSE_CLIENT_SECRET gerekli.")

    weather = _raster_weather(bbox)
    weather_risk = _weather_risk_score(weather)
    process_url = "https://sh.dataspace.copernicus.eu/api/v1/process"

    # Weather is constant over this image tile because Open-Meteo is a point
    # forecast source here; Sentinel-2 supplies the spatial variation.
    evalscript = f"""//VERSION=3
function setup(){{
  return {{input:[{{bands:["B04","B08","B11","SCL","dataMask"]}}],
    output:{{bands:4,sampleType:"AUTO"}}}};
}}
function evaluatePixel(s){{
  var valid=s.dataMask && s.SCL!==3 && s.SCL!==8 && s.SCL!==9 && s.SCL!==10 && s.SCL!==11;
  if(!valid) return [0,0,0,0];
  var ndvi=(s.B08-s.B04)/(s.B08+s.B04);
  var ndmi=(s.B08-s.B11)/(s.B08+s.B11);
  var vegStress=Math.max(0,Math.min(1,(0.72-ndvi)/0.72));
  var dryness=Math.max(0,Math.min(1,(0.35-ndmi)/0.70));
  var satelliteRisk=Math.max(0,Math.min(1,0.45*vegStress+0.55*dryness));
  var weatherRisk=__WEATHER_RISK__;
  var finalRisk=Math.max(0,Math.min(1,0.65*satelliteRisk+0.35*weatherRisk));
  var r=Math.min(1,finalRisk*2.05);
  var g=Math.max(0,1-Math.abs(finalRisk-0.55)*2.5);
  var b=Math.max(0,1-finalRisk*2.15);
  return [r,g,b,Math.min(0.88,0.20+finalRisk*0.68)];
}}"""
    evalscript = evalscript.replace("__WEATHER_RISK__", f"{weather_risk:.6f}")
    payload = {
        "input": {
            "bounds": {"bbox": bbox, "properties": {"crs": "http://www.opengis.net/def/crs/OGC/1.3/CRS84"}},
            "data": [{"type": COLLECTION, "dataFilter": {"mosaickingOrder": "leastCC", "maxCloudCoverage": 40}}],
        },
        "output": {
            "width": width,
            "height": height,
            "responses": [{"identifier": "default", "format": {"type": "image/png"}}],
        },
        "evalscript": evalscript,
    }
    r = requests.post(
        process_url,
        headers={"Authorization": f"Bearer {token}", "Content-Type": "application/json"},
        json=payload,
        timeout=90,
    )
    r.raise_for_status()
    return r.content, weather, weather_risk


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
