from fastapi import APIRouter, HTTPException, Query
from app.services.environment_service import get_environment,get_region_environment,geocode,elevation,REGIONS

router=APIRouter(prefix="/environment",tags=["environment"])

@router.get("/region/{name}")
def region(name:str):
    try:
        return {"region":name,"data":get_region_environment(name)}
    except KeyError:
        raise HTTPException(status_code=404,detail={"message":"Bölge tanımlı değil","available":list(REGIONS)})

@router.get("/point")
def point(lat:float=Query(...,ge=-90,le=90),lon:float=Query(...,ge=-180,le=180),marine:bool=False):
    return get_environment(lat,lon,include_marine=marine)

@router.get("/geocode")
def geocode_route(name:str=Query(...,min_length=2),country_code:str="TR"):
    return geocode(name,country_code)

@router.get("/elevation")
def elevation_route(lat:float=Query(...,ge=-90,le=90),lon:float=Query(...,ge=-180,le=180)):
    return elevation(lat,lon)

@router.get("/catalog")
def catalog():
    return {
        "keyless":True,
        "regions":list(REGIONS),
        "services":[
            {"id":"weather","name":"Open-Meteo Weather","key_required":False,"use":"hava, rüzgar, yağış, VPD, ET0, toprak nemi"},
            {"id":"air","name":"Open-Meteo Air Quality / CAMS","key_required":False,"use":"PM, O3, NO2, toz, UV, Avrupa polenleri"},
            {"id":"marine","name":"Open-Meteo Marine","key_required":False,"use":"dalga, deniz rüzgarı; kıyı illeri"},
            {"id":"geocoding","name":"Open-Meteo Geocoding","key_required":False,"use":"il/ilçe/yer arama"},
            {"id":"elevation","name":"Open-Meteo Elevation","key_required":False,"use":"arazi yükseltisi"},
            {"id":"osm","name":"OpenStreetMap","key_required":False,"use":"harita ve açık coğrafi veri; kullanım politikası/atıf gerekli"},
            {"id":"sentinel2","name":"Copernicus Sentinel-2","key_required":True,"use":"gerçek NDVI/NDMI raster"},
            {"id":"firms","name":"NASA FIRMS","key_required":True,"use":"termal anomali/aktif yangın gözlemleri"},
        ],
    }
