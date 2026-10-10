import asyncio
from datetime import datetime, timezone
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.services.weather_service import get_current_weather
from app.services.push_service import (
    configured, delete_subscription, list_subscriptions, send_push,
    update_alert_state, upsert_subscription, verify_supabase_user, VAPID_PUBLIC_KEY,
)

router=APIRouter(prefix="/notifications")

class EvaluateRequest(BaseModel):
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    area_name: str = Field(min_length=1, max_length=120)
    threshold: int = Field(default=70, ge=25, le=100)

class PushSubscriptionKeys(BaseModel):
    p256dh: str = Field(min_length=20, max_length=256)
    auth: str = Field(min_length=8, max_length=256)

class PushSubscription(BaseModel):
    endpoint: str = Field(min_length=20, max_length=2048)
    keys: PushSubscriptionKeys

class PushSubscribeRequest(BaseModel):
    subscription: PushSubscription
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    area_name: str = Field(min_length=1, max_length=120)
    threshold: int = Field(default=70, ge=25, le=100)

class PushUnsubscribeRequest(BaseModel):
    endpoint: str = Field(min_length=20, max_length=2048)
    area_name: str | None = Field(default=None, max_length=120)

def require_user_id(authorization: str | None) -> str:
    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(status_code=401, detail="Giriş yapman gerekiyor.")
    token=authorization.split(" ",1)[1].strip()
    if not token:
        raise HTTPException(status_code=401, detail="Oturum belirteci eksik.")
    try:
        return verify_supabase_user(token)
    except RuntimeError:
        raise HTTPException(status_code=503, detail="Supabase sunucu kimlik doğrulaması yapılandırılmadı.")
    except Exception:
        raise HTTPException(status_code=401, detail="Oturum geçersiz veya süresi dolmuş.")

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
def push_subscribe(payload:PushSubscribeRequest, authorization: str | None = Header(default=None)):
    user_id=require_user_id(authorization)
    if not configured(): raise HTTPException(status_code=503,detail="Web Push sunucu yapılandırması tamamlanmadı.")
    upsert_subscription(payload.subscription.model_dump(),payload.lat,payload.lon,payload.area_name,payload.threshold,user_id)
    return {"status":"subscribed","background_delivery":True}

@router.post("/push/unsubscribe")
def push_unsubscribe(payload:PushUnsubscribeRequest, authorization: str | None = Header(default=None)):
    user_id=require_user_id(authorization)
    if not configured(): raise HTTPException(status_code=503,detail="Web Push sunucu yapılandırması tamamlanmadı.")
    delete_subscription(payload.endpoint,payload.area_name,user_id)
    return {"status":"unsubscribed"}

@router.post("/push/test")
def push_test(payload:PushSubscribeRequest, authorization: str | None = Header(default=None)):
    user_id=require_user_id(authorization)
    if not configured(): raise HTTPException(status_code=503,detail="Web Push sunucu yapılandırması tamamlanmadı.")
    sub=payload.subscription.model_dump()
    upsert_subscription(sub,payload.lat,payload.lon,payload.area_name,payload.threshold,user_id)
    ok=send_push({"endpoint":sub["endpoint"],"p256dh":sub["keys"]["p256dh"],"auth":sub["keys"]["auth"],"area_name":payload.area_name,"user_id":user_id},"NexoraWildfire AI",f"{payload.area_name}: arka plan Web Push bağlantısı çalışıyor.","./")
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
    raise HTTPException(status_code=501,detail="Genel gönderim henüz sunucu tarafından uygulanmıyor. Kullanıcı aboneliğiyle Web Push akışını kullan.")
