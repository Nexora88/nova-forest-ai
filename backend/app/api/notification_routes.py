import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from app.services.weather_service import get_current_weather
from app.services.push_service import configured, delete_subscription, list_subscriptions, send_push, update_alert_state, upsert_subscription, VAPID_PUBLIC_KEY

router=APIRouter(prefix="/notifications")

class EvaluateRequest(BaseModel):
    lat: float
    lon: float
    area_name: str
    threshold: int=70

class PushSubscriptionKeys(BaseModel):
    p256dh: str
    auth: str

class PushSubscription(BaseModel):
    endpoint: str
    keys: PushSubscriptionKeys
class PushSubscribeRequest(BaseModel):
    subscription: PushSubscription
    lat: float
    lon: float
    area_name: str=Field(min_length=1,max_length=120)
    threshold: int=70

class PushUnsubscribeRequest(BaseModel):
    endpoint: str
    area_name: str|None=None

def calculate_risk(weather):
    t=float(weather.get("temperature") or 0); h=float(weather.get("humidity") or 0); wind=float(weather.get("wind") or 0)
    score=0
    if t>=40: score+=30
    elif t>=30: score+=15
    elif t>=25: score+=7
    if h<=20: score+=25
    elif h<=40: score+=10
    elif h<=55: score+=4
    if wind>=40: score+=25
    elif wind>=20: score+=10
    elif wind>=12: score+=4
    return min(100,score)

@router.get("/status")
def notification_status():
    return {"status":"available","system":"Nova-Alert","push":configured(),"channels":["in_app","browser","web_push"] if configured() else ["in_app","browser"],"background_delivery":configured()}

@router.get("/push/config")
def push_config():
    return {"enabled":configured(),"publicKey":VAPID_PUBLIC_KEY}
@router.post("/push/subscribe")
def push_subscribe(payload:PushSubscribeRequest):
    if not configured(): raise HTTPException(status_code=503,detail="Web Push sunucu yapılandırması tamamlanmadı.")
    upsert_subscription(payload.subscription.model_dump(),payload.lat,payload.lon,payload.area_name,max(25,min(100,int(payload.threshold))))
    return {"status":"subscribed","background_delivery":True}

@router.post("/push/unsubscribe")
def push_unsubscribe(payload:PushUnsubscribeRequest):
    delete_subscription(payload.endpoint,payload.area_name)
    return {"status":"unsubscribed"}

@router.post("/push/test")
def push_test(payload:PushSubscribeRequest):
    if not configured(): raise HTTPException(status_code=503,detail="Web Push sunucu yapılandırması tamamlanmadı.")
    sub=payload.subscription.model_dump()
    ok=send_push({"endpoint":sub["endpoint"],"p256dh":sub["keys"]["p256dh"],"auth":sub["keys"]["auth"],"area_name":payload.area_name},"NexoraWildfire AI",f"{payload.area_name}: arka plan Web Push bağlantısı çalışıyor.","./")
    if not ok: raise HTTPException(status_code=502,detail="Push servisine teslim edilemedi.")
    return {"status":"sent"}

@router.post("/evaluate")
def evaluate_notification(payload:EvaluateRequest):
    weather=get_current_weather(payload.lat,payload.lon); risk=calculate_risk(weather); threshold=max(25,min(100,int(payload.threshold)))
    level="critical" if risk>=80 else "high" if risk>=60 else "medium" if risk>=40 else "low"
    alert=risk>=threshold
    return {"status":"alert" if alert else "normal","system":"Nova-Alert","area":payload.area_name,"risk":risk,"threshold":threshold,"level":level,"weather":{"temperature":weather.get("temperature"),"humidity":weather.get("humidity"),"wind":weather.get("wind")},"alert":alert,"title":f"{payload.area_name} • Çevresel risk yükseldi" if alert else f"{payload.area_name} • Risk normal","message":f"Çevresel risk {risk}/100. Sıcaklık {weather.get('temperature')}°C, nem %{weather.get('humidity')}, rüzgar {weather.get('wind')} km/s."}
async def background_push_cycle():
    if not configured(): return
    rows=list_subscriptions(); now=datetime.now(timezone.utc)
    for row in rows:
        if row.get("lat") is None or row.get("lon") is None or not row.get("area_name"): continue
        try:
            weather=get_current_weather(float(row["lat"]),float(row["lon"])); risk=calculate_risk(weather); threshold=max(25,min(100,int(row.get("threshold") or 70)))
            last=row.get("last_alert_at"); recent=False
            if last:
                try: recent=(now-datetime.fromisoformat(str(last).replace("Z","+00:00"))).total_seconds()<21600
                except ValueError: pass
            if risk>=threshold and not recent:
                msg=f"{row['area_name']}: çevresel risk {risk}/100. Sıcaklık {weather.get('temperature')}°C, nem %{weather.get('humidity')}, rüzgar {weather.get('wind')} km/s."
                ok=send_push(row,"NexoraWildfire AI • Nova-Alert",msg,"./")
                update_alert_state(row["id"],risk,ok)
            else:
                update_alert_state(row["id"],risk,False)
        except Exception:
            continue
async def background_push_loop():
    while True:
        try: await background_push_cycle()
        except Exception: pass
        await asyncio.sleep(300)

@router.post("/send")
def send_notification():
    return {"status":"ready" if configured() else "disabled","system":"Nova-Alert","message":"Web Push yapılandırması varsa arka planda çalışan servis üzerinden cihazlara gönderim yapılır."}
