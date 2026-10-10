"""Evidence-first PDF reporting jobs. Missing sources are explicitly marked unavailable."""
from __future__ import annotations
import csv, io, os, uuid
from datetime import datetime, timezone
import requests
from pyproj import Transformer
from reportlab.graphics.charts.lineplots import LinePlot
from reportlab.graphics.shapes import Drawing
from reportlab.lib import colors
from reportlab.lib.enums import TA_LEFT
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import mm
from reportlab.pdfbase import pdfmetrics
from reportlab.pdfbase.ttfonts import TTFont
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle
from shapely.geometry import shape, mapping
from shapely.ops import transform, unary_union
from app.services.ndvi_service import get_area_ndvi_timeseries

OPEN_METEO = "https://api.open-meteo.com/v1/forecast"
OVERPASS = "https://overpass-api.de/api/interpreter"
OSRM = "https://router.project-osrm.org/route/v1/driving"

def _asset_geometry(asset_geojson: dict, buffer_m: int):
    kind = asset_geojson.get("type")
    if kind == "FeatureCollection":
        geoms = [shape(f["geometry"]) for f in asset_geojson.get("features", []) if f.get("geometry")]
    elif kind == "Feature":
        geoms = [shape(asset_geojson["geometry"])] if asset_geojson.get("geometry") else []
    else:
        geoms = [shape(asset_geojson)]
    if not geoms:
        raise ValueError("GeoJSON içinde geçerli geometri bulunamadı.")
    combined = unary_union(geoms)
    if combined.is_empty or not combined.is_valid:
        raise ValueError("Varlık geometrisi boş veya geçersiz.")
    if combined.geom_type not in {"Point","MultiPoint","LineString","MultiLineString","Polygon","MultiPolygon"}:
        raise ValueError("Desteklenmeyen varlık geometrisi.")
    lon, lat = combined.representative_point().x, combined.representative_point().y
    if not (-180 <= lon <= 180 and -90 <= lat <= 90):
        raise ValueError("Koordinatlar WGS84 (boylam, enlem) olmalı.")
    zone = max(1, min(60, int((lon + 180) / 6) + 1))
    epsg = (32600 if lat >= 0 else 32700) + zone
    forward = Transformer.from_crs("EPSG:4326", f"EPSG:{epsg}", always_xy=True).transform
    backward = Transformer.from_crs(f"EPSG:{epsg}", "EPSG:4326", always_xy=True).transform
    buffered = transform(backward, transform(forward, combined).buffer(buffer_m))
    minx, miny, maxx, maxy = buffered.bounds
    # Use the actual buffered asset geometry for Sentinel-2 statistics.
    buffered_geojson = mapping(buffered)
    return buffered_geojson, [minx,miny,maxx,maxy], [lon,lat]

def _weather(lat: float, lon: float) -> dict:
    try:
        r = requests.get(OPEN_METEO, params={"latitude":lat,"longitude":lon,"daily":"temperature_2m_max,relative_humidity_2m_min,wind_speed_10m_max,precipitation_sum","forecast_days":16,"timezone":"Europe/Istanbul"}, timeout=20)
        r.raise_for_status()
        daily = r.json().get("daily", {})
        rows = []
        for i, date in enumerate(daily.get("time", [])):
            def val(key):
                arr = daily.get(key, [])
                return arr[i] if i < len(arr) else None
            t,h,w,rain = val("temperature_2m_max"),val("relative_humidity_2m_min"),val("wind_speed_10m_max"),val("precipitation_sum")
            if any(v is None for v in (t,h,w,rain)): continue
            score = max(0,min(100,max(0,t-18)*1.5 + max(0,65-h)*0.55 + w*0.45 - min(20,rain*0.8)))
            rows.append({"date":date,"temperature_max":t,"humidity_min":h,"wind_max":w,"precipitation":rain,"screening_index":round(score,1)})
        return {"status":"available" if rows else "no_data","source":"Open-Meteo Forecast API","forecast_days":len(rows),"days":rows,"three_month_outlook":"unavailable","note":"Bu kaynak en fazla 16 günlük günlük tahmin sağladı; 3 aylık mevsimsel tahmin değildir."}
    except (requests.RequestException, ValueError, TypeError) as exc:
        return {"status":"unavailable","source":"Open-Meteo Forecast API","error":type(exc).__name__,"days":[],"forecast_days":0,"three_month_outlook":"unavailable"}

def _firms_recent(bbox: list[float]) -> dict:
    key = os.getenv("FIRMS_MAP_KEY", "").strip()
    if not key:
        return {"status":"not_configured","source":"NASA FIRMS / VIIRS","count_10d":None,"historical_5y":"unavailable","note":"FIRMS_MAP_KEY yapılandırılmadı; sıcak nokta sayısı üretilmedi."}
    west,south,east,north = bbox
    area = f"{south},{west},{north},{east}"
    try:
        url = f"https://firms.modaps.eosdis.nasa.gov/api/area/csv/{key}/VIIRS_SNPP_NRT/{area}/10"
        r = requests.get(url, timeout=25); r.raise_for_status()
        rows = list(csv.DictReader(io.StringIO(r.text)))
        return {"status":"available","source":"NASA FIRMS VIIRS_SNPP_NRT Area API","count_10d":len(rows),"historical_5y":"unavailable","note":"10 günlük güncel akış; beş yıllık arşiv sayımı değildir."}
    except (requests.RequestException, csv.Error) as exc:
        return {"status":"error","source":"NASA FIRMS / VIIRS","count_10d":None,"historical_5y":"unavailable","note":f"FIRMS sorgusu başarısız ({type(exc).__name__}); anomali yok sonucu çıkarılamaz."}

def _access(lat: float, lon: float) -> dict:
    query = f'[out:json][timeout:20];(node["amenity"="fire_station"](around:20000,{lat},{lon});way["amenity"="fire_station"](around:20000,{lat},{lon});node["emergency"="fire_station"](around:20000,{lat},{lon}););out center tags 20;'
    try:
        r = requests.post(OVERPASS, data={"data":query}, timeout=25); r.raise_for_status()
        candidates = []
        for el in r.json().get("elements", []):
            tags = el.get("tags", {})
            y = el.get("lat", (el.get("center") or {}).get("lat")); x = el.get("lon", (el.get("center") or {}).get("lon"))
            if x is not None and y is not None: candidates.append({"name":tags.get("name","Adı belirtilmemiş itfaiye istasyonu"),"lat":float(y),"lon":float(x)})
        candidates.sort(key=lambda p:(p["lat"]-lat)**2+(p["lon"]-lon)**2)
        if not candidates:
            return {"status":"no_data","source":"OpenStreetMap / Overpass","note":"20 km içinde etiketli itfaiye istasyonu bulunamadı; bu, istasyon bulunmadığı anlamına gelmez."}
        nearest = candidates[0]
        rr = requests.get(f"{OSRM}/{nearest['lon']},{nearest['lat']};{lon},{lat}", params={"overview":"false","alternatives":"false"}, timeout=20)
        rr.raise_for_status(); routes = rr.json().get("routes", [])
        if not routes: return {"status":"station_found_route_unavailable","source":"OSRM","station":nearest["name"],"note":"Yol rotası hesaplanamadı."}
        route = routes[0]
        return {"status":"available","source":"OpenStreetMap / Overpass + OSRM","station":nearest["name"],"road_distance_km":round(route["distance"]/1000,2),"drive_minutes_estimate":round(route["duration"]/60),"note":"Yaklaşık yol rotasıdır; trafik, arazi geçişi ve gerçek müdahale süresi garantisi değildir."}
    except (requests.RequestException, ValueError, KeyError, TypeError) as exc:
        return {"status":"unavailable","source":"OpenStreetMap / OSRM","note":f"Erişim sorgusu başarısız ({type(exc).__name__})."}

def _fonts():
    for regular,bold in [("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf","/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf"),("/usr/share/fonts/truetype/liberation2/LiberationSans-Regular.ttf","/usr/share/fonts/truetype/liberation2/LiberationSans-Bold.ttf")]:
        if os.path.exists(regular) and os.path.exists(bold):
            pdfmetrics.registerFont(TTFont("NexoraSans",regular)); pdfmetrics.registerFont(TTFont("NexoraSansBold",bold)); return "NexoraSans","NexoraSansBold"
    return "Helvetica","Helvetica-Bold"

def _pdf(payload: dict, bbox: list[float], ndvi: dict, firms: dict, weather: dict, access: dict) -> bytes:
    regular,bold = _fonts(); out = io.BytesIO()
    doc = SimpleDocTemplate(out,pagesize=A4,rightMargin=17*mm,leftMargin=17*mm,topMargin=16*mm,bottomMargin=16*mm,title=f"NexoraWildfire AI - {payload['asset_name']}",author="NexoraWildfire AI")
    s = getSampleStyleSheet()
    s.add(ParagraphStyle(name="NXTitle",parent=s["Title"],fontName=bold,fontSize=19,leading=24,textColor=colors.HexColor("#087d42"),alignment=TA_LEFT,spaceAfter=8))
    s.add(ParagraphStyle(name="NXHead",parent=s["Heading2"],fontName=bold,fontSize=11,leading=15,textColor=colors.HexColor("#087d42"),spaceBefore=9,spaceAfter=4))
    s.add(ParagraphStyle(name="NXBody",parent=s["BodyText"],fontName=regular,fontSize=8.3,leading=11,spaceAfter=4))
    s.add(ParagraphStyle(name="NXSmall",parent=s["BodyText"],fontName=regular,fontSize=7,leading=9,textColor=colors.HexColor("#53635a"),spaceAfter=3))
    story = [Paragraph("NEXORAWILDFIRE AI",s["NXTitle"]),Paragraph("Kurumsal Varlık Bazlı Yangın ve Çevresel Durum Raporu",s["Heading2"]),
      Paragraph(f"Şirket: {payload['company_name']} | Varlık: {payload['asset_name']}",s["NXBody"]),
      Paragraph(f"Tür: {payload['asset_type']} | Tampon: {payload['buffer_m']} m | UTC: {datetime.now(timezone.utc).strftime('%Y-%m-%d %H:%M')}",s["NXSmall"]),
      Paragraph("Yönetici özeti",s["NXHead"]),
      Paragraph("Bu rapor, sağlanan varlık geometrisi çevresindeki erişilebilen uydu bitki göstergelerini, sıcak nokta akışını ve meteorolojik karar destek sinyallerini birleştirir. Eksik veri sıfır risk olarak yorumlanmaz.",s["NXBody"]),
      Paragraph("Varlık geometrisi ve etki alanı",s["NXHead"]),
      Paragraph(f"Varlık tamponu UTM metre koordinatlarında hesaplandı ve Sentinel-2 istatistiğinde tamponlanmış gerçek geometri kullanıldı. FIRMS alan sorgusu için sınırlayıcı dikdörtgen kullanılır; bu, parsel sınırı veya kesin mühendislik etki alanı değildir. Sınırlar [batı, güney, doğu, kuzey]: {[round(v,6) for v in bbox]}.",s["NXBody"]),
      Paragraph("Sentinel-2 NDVI / NDMI",s["NXHead"])]
    if ndvi.get("status") == "available":
        series = ndvi.get("series",[])
        story.append(Paragraph(f"Kaynak: {ndvi.get('source','Copernicus Sentinel-2')}. Geçerli dönem sayısı: {len(series)}. Son gözlem: {series[-1] if series else '—'}.",s["NXBody"]))
        pts = [(i,float(row["ndvi"])) for i,row in enumerate(series) if row.get("ndvi") is not None]
        if len(pts) >= 2:
            drawing=Drawing(450,130); plot=LinePlot(); plot.x=35; plot.y=15; plot.width=390; plot.height=95; plot.data=[pts]; plot.lines[0].strokeColor=colors.HexColor("#087d42"); plot.xValueAxis.valueMin=0; plot.xValueAxis.valueMax=max(1,len(pts)-1); plot.yValueAxis.valueMin=-1; plot.yValueAxis.valueMax=1; plot.yValueAxis.valueSteps=[-1,-0.5,0,0.5,1]; drawing.add(plot); story.append(drawing)
        rows=[["Dönem","NDVI","NDMI","Örnek"]]+[[str(x.get("to") or x.get("from") or "—")[:10],str(x.get("ndvi","—")),str(x.get("ndmi","—")),str(x.get("sample_count","—"))] for x in series[-12:]]
        table=Table(rows,repeatRows=1,colWidths=[65*mm,28*mm,28*mm,35*mm]); table.setStyle(TableStyle([("FONTNAME",(0,0),(-1,-1),regular),("FONTNAME",(0,0),(-1,0),bold),("FONTSIZE",(0,0),(-1,-1),7),("BACKGROUND",(0,0),(-1,0),colors.HexColor("#dff5e7")),("GRID",(0,0),(-1,-1),0.35,colors.HexColor("#cad8ce"))])); story.append(table)
    else:
        story.append(Paragraph(f"Durum: {ndvi.get('status','unavailable')}. {ndvi.get('message') or ndvi.get('error') or 'Gerçek Sentinel-2 alan istatistiği alınamadı.'}",s["NXBody"]))
    story += [Paragraph("NASA FIRMS / VIIRS sıcak nokta gözlemleri",s["NXHead"]),
      Paragraph(f"Son 10 günlük akış: {firms.get('count_10d') if firms.get('count_10d') is not None else 'VERİ YOK'}. Beş yıllık doğrulanmış arşiv: {firms.get('historical_5y','unavailable')}. {firms.get('note','')}",s["NXBody"]),
      Paragraph("Erişilebilirlik ve müdahale",s["NXHead"]),
      Paragraph(f"Durum: {access.get('status','unavailable')}. İstasyon: {access.get('station','—')}. Yaklaşık yol mesafesi: {access.get('road_distance_km','—')} km. Tahmini sürüş: {access.get('drive_minutes_estimate','—')} dk. {access.get('note','')}",s["NXBody"]),
      Paragraph("Meteoroloji ve görünüm",s["NXHead"]),
      Paragraph(f"Kaynak: {weather.get('source','Open-Meteo')}. Kullanılabilir tahmin: {weather.get('forecast_days',0)} gün. Üç aylık mevsimsel görünüm: {weather.get('three_month_outlook','unavailable')}. {weather.get('note','')}",s["NXBody"]),
      Paragraph("Önleyici aksiyon önerileri",s["NXHead"])]
    latest=ndvi.get("latest") or {}; ndmi=latest.get("ndmi")
    if ndmi is not None and ndmi < 0.1:
        story.append(Paragraph("• Son NDMI düşük; tampon alanındaki kuru ot ve bitki örtüsünü saha ekibi yerinde doğrulamalı. Bakım kararı saha incelemesi ve izinlerle verilmelidir.",s["NXBody"]))
    else:
        story.append(Paragraph("• Uydu göstergelerini saha incelemesiyle doğrulayın; NDVI/NDMI tek başına bakım emri veya yangın olasılığı değildir.",s["NXBody"]))
    if access.get("status") != "available":
        story.append(Paragraph("• İtfaiye/orman işletme birimi ve erişim güzergâhını saha sorumlusu ile doğrulayın; harita verisindeki eksiklik erişim yokluğu anlamına gelmez.",s["NXBody"]))
    story += [Spacer(1,4*mm),Paragraph("Sınırlamalar ve kaynaklar",s["NXHead"]),
      Paragraph("Bu belge mühendislik uygunluk raporu, yangın olasılığı garantisi veya acil müdahale taahhüdü değildir. Sıcak nokta tespiti doğrulanmış yangın kaydı değildir. 5 yıllık FIRMS geçmişi ve 3 aylık hava tahmini bu sürümde üretilmez. Eğitilmiş ve bağımsız test edilmiş ML modeli bu raporda kullanılmaz. Kaynaklar: Copernicus Data Space / Sentinel-2 L2A; NASA FIRMS / VIIRS; Open-Meteo; OpenStreetMap; OSRM.",s["NXSmall"])]
    doc.build(story); return out.getvalue()

def run_enterprise_report(payload: dict) -> dict:
    polygon,bbox,center = _asset_geometry(payload["asset_geojson"],int(payload["buffer_m"]))
    ndvi=get_area_ndvi_timeseries(polygon,days=365,interval="P30D")
    firms=_firms_recent(bbox); weather=_weather(center[1],center[0]); access=_access(center[1],center[0])
    pdf=_pdf(payload,bbox,ndvi,firms,weather,access)
    base=os.getenv("SUPABASE_URL","").rstrip("/"); key=os.getenv("SUPABASE_ADMIN_KEY",""); bucket=os.getenv("NEXORA_ARTIFACT_BUCKET","nexora-job-artifacts")
    if not base or not key: raise RuntimeError("Kurumsal PDF için özel Supabase Storage yapılandırması gerekli.")
    path=f"enterprise-reports/{uuid.uuid4().hex}.pdf"; headers={"Authorization":f"Bearer {key}","apikey":key,"Content-Type":"application/pdf","x-upsert":"false"}
    upload=requests.post(f"{base}/storage/v1/object/{bucket}/{path}",headers=headers,data=pdf,timeout=60); upload.raise_for_status()
    signed=requests.post(f"{base}/storage/v1/object/sign/{bucket}/{path}",headers={"Authorization":f"Bearer {key}","apikey":key},json={"expiresIn":900},timeout=20); signed.raise_for_status()
    signed_path=signed.json().get("signedURL") or signed.json().get("signedUrl")
    if not signed_path: raise RuntimeError("Supabase Storage imzalı PDF bağlantısı döndürmedi.")
    if signed_path.startswith("/"): signed_path=f"{base}/storage/v1{signed_path}" if not signed_path.startswith("/storage/v1") else f"{base}{signed_path}"
    return {"status":"available","kind":"enterprise-report","artifact_url":signed_path,"artifact_expires_in":900,"artifact_type":"application/pdf","asset_name":payload["asset_name"],
      "data_status":{"sentinel2":ndvi.get("status"),"firms_10d":firms.get("status"),"firms_5y":firms.get("historical_5y"),"weather_16d":weather.get("status"),"weather_3m":weather.get("three_month_outlook"),"access":access.get("status")},
      "warning":"Rapor yalnızca kaynakların gerçekten döndürdüğü verileri içerir; eksik veri sıfır risk anlamına gelmez."}
