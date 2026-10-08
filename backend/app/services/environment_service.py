# Keyless environmental data adapters for NexoraWildfire AI.
import requests

BASE="https://api.open-meteo.com/v1/forecast"
AIR="https://air-quality-api.open-meteo.com/v1/air-quality"
MARINE="https://marine-api.open-meteo.com/v1/marine"
GEO="https://geocoding-api.open-meteo.com/v1/search"
ELEV="https://api.open-meteo.com/v1/elevation"

REGIONS={
    "Edirne":(41.6771,26.5557),
    "Kırklareli":(41.7351,27.2252),
    "Tekirdağ":(40.9781,27.5110),
    "Çanakkale":(40.1553,26.4142),
    "İstanbul Avrupa":(41.0082,28.9784),
}

def _get(url, params):
    r=requests.get(url,params=params,timeout=20)
    r.raise_for_status()
    return r.json()

def get_environment(lat,lon,include_marine=False):
    weather=_get(BASE,{
        "latitude":lat,"longitude":lon,"timezone":"Europe/Istanbul",
        "current":("temperature_2m,relative_humidity_2m,precipitation,weather_code,"
                   "wind_speed_10m,wind_direction_10m,wind_gusts_10m,"
                   "surface_pressure,cloud_cover,vapour_pressure_deficit"),
        "hourly":("soil_moisture_0_to_10cm,soil_temperature_0_to_10cm,"
                  "et0_fao_evapotranspiration,precipitation_probability,"
                  "uv_index"),
        "forecast_days":2,"past_hours":6,
    })
    air=_get(AIR,{
        "latitude":lat,"longitude":lon,"timezone":"Europe/Istanbul",
        "current":"pm10,pm2_5,carbon_monoxide,nitrogen_dioxide,sulphur_dioxide,ozone,dust,uv_index",
        "hourly":"alder_pollen,birch_pollen,grass_pollen,mugwort_pollen,olive_pollen,ragweed_pollen",
        "forecast_days":2,
    })
    result={"coordinates":{"lat":lat,"lon":lon},"weather":weather,"air_quality":air,
            "sources":["Open-Meteo Forecast","Open-Meteo Air Quality / CAMS"]}
    if include_marine:
        result["marine"]=_get(MARINE,{
            "latitude":lat,"longitude":lon,"timezone":"Europe/Istanbul",
            "hourly":"wave_height,wave_direction,wave_period,wind_wave_height",
            "forecast_days":2,
        })
        result["sources"].append("Open-Meteo Marine")
    return result

def get_region_environment(name):
    key=name.strip()
    if key not in REGIONS:
        raise KeyError(key)
    lat,lon=REGIONS[key]
    return get_environment(lat,lon,include_marine=key in {"Tekirdağ","Çanakkale","İstanbul Avrupa"})

def geocode(name,country_code="TR"):
    return _get(GEO,{"name":name,"count":10,"language":"tr","format":"json","countryCode":country_code})

def elevation(lat,lon):
    return _get(ELEV,{"latitude":lat,"longitude":lon})
