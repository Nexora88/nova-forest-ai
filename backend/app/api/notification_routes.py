import asyncio
import hashlib
import hmac
import os
import re
import secrets
import requests
from datetime import datetime, timezone, timedelta
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


class ChannelOptInRequest(BaseModel):
    channel: str = Field(pattern="^(sms|whatsapp)$")
    phone_e164: str = Field(pattern=r"^\+[1-9][0-9]{7,14}$")
    area_name: str = Field(min_length=1, max_length=120)
    lat: float = Field(ge=-90, le=90)
    lon: float = Field(ge=-180, le=180)
    threshold: int = Field(default=70, ge=25, le=100)
    consent: bool


class ChannelVerifyRequest(BaseModel):
    channel: str = Field(pattern="^(sms|whatsapp)$")
    phone_e164: str = Field(pattern=r"^\+[1-9][0-9]{7,14}$")
    code: str = Field(pattern=r"^[0-9]{6}$")


def _admin_config():
    base = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    key = os.getenv("SUPABASE_ADMIN_KEY", "").strip()
    if not base or not key:
        raise HTTPException(status_code=503, detail="Bildirim veritabanı yapılandırılmadı.")
    return base, key


def _admin_headers(key, prefer=None):
    h = {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}
    if prefer:
        h["Prefer"] = prefer
    return h


def _twilio_send(channel, phone, message):
    sid = os.getenv("TWILIO_ACCOUNT_SID", "").strip()
    token = os.getenv("TWILIO_AUTH_TOKEN", "").strip()
    sender = (os.getenv("TWILIO_WHATSAPP_FROM", "") if channel == "whatsapp" else os.getenv("TWILIO_SMS_FROM", "")).strip()
    if not sid or not token or not sender:
        raise RuntimeError("twilio_channel_not_configured")
    destination = f"whatsapp:{phone}" if channel == "whatsapp" else phone
    source = sender if channel != "whatsapp" or sender.startswith("whatsapp:") else f"whatsapp:{sender}"
    response = requests.post(
        f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",
        auth=(sid, token),
        data={"To": destination, "From": source, "Body": message[:1500]},
        timeout=15,
    )
    response.raise_for_status()
    payload = response.json()
    if not payload.get("sid"):
        raise RuntimeError("twilio_message_id_missing")
    return payload["sid"]


def _channel_url(base):
    return f"{base}/rest/v1/nexora_notification_channels"


@router.post("/channels/request-verification")
def request_channel_verification(payload: ChannelOptInRequest, authorization: str | None = Header(default=None)):
    user_id = require_user_id(authorization)
    if payload.consent is not True:
        raise HTTPException(status_code=400, detail="SMS/WhatsApp gönderimi için açık rıza gereklidir.")
    secret = os.getenv("NEXORA_OTP_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="Telefon doğrulama OTP anahtarı yapılandırılmadı.")
    if not re.fullmatch(r"\\+[1-9][0-9]{7,14}", payload.phone_e164):
        raise HTTPException(status_code=422, detail="Telefon numarası E.164 biçiminde olmalı.")
    base, key = _admin_config()
    code = f"{secrets.randbelow(1_000_000):06d}"
    code_hash = hmac.new(secret.encode(), f"{user_id}:{payload.channel}:{payload.phone_e164}:{code}".encode(), hashlib.sha256).hexdigest()
    try:
        _twilio_send(payload.channel, payload.phone_e164, f"NexoraWildfire AI doğrulama kodun: {code}. Kod 10 dakika geçerlidir. Bu isteği sen yapmadıysan mesajı yok say.")
        response = requests.post(
            _channel_url(base),
            headers=_admin_headers(key, "resolution=merge-duplicates,return=minimal"),
            params={"on_conflict": "user_id,channel,phone_e164"},
            json={"user_id": user_id, "channel": payload.channel, "phone_e164": payload.phone_e164,
                  "area_name": payload.area_name, "lat": payload.lat, "lon": payload.lon,
                  "threshold": payload.threshold, "consent_at": datetime.now(timezone.utc).isoformat(),
                  "verification_code_hash": code_hash,
                  "verification_expires_at": (datetime.now(timezone.utc) + timedelta(minutes=10)).isoformat(),
                  "verified_at": None, "enabled": False},
            timeout=12,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Doğrulama isteği kaydedilemedi; kanal etkinleştirilmedi.") from exc
    except RuntimeError as exc:
        raise HTTPException(status_code=503, detail="Twilio SMS/WhatsApp sağlayıcısı yapılandırılmadı.") from exc
    return {"status": "verification_sent", "channel": payload.channel,
            "message": "Kanal doğrulanana kadar otomatik bildirim gönderilmez."}


@router.post("/channels/verify")
def verify_notification_channel(payload: ChannelVerifyRequest, authorization: str | None = Header(default=None)):
    user_id = require_user_id(authorization)
    secret = os.getenv("NEXORA_OTP_SECRET", "").strip()
    if not secret:
        raise HTTPException(status_code=503, detail="Telefon doğrulama OTP anahtarı yapılandırılmadı.")
    base, key = _admin_config()
    headers = _admin_headers(key)
    params = {"user_id": f"eq.{user_id}", "channel": f"eq.{payload.channel}",
              "phone_e164": f"eq.{payload.phone_e164}", "select": "*"}
    response = requests.get(_channel_url(base), headers=headers, params=params, timeout=12)
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Bildirim kanalı okunamadı.")
    rows = response.json()
    if not rows:
        raise HTTPException(status_code=404, detail="Doğrulama isteği bulunamadı.")
    row = rows[0]
    expiry = row.get("verification_expires_at")
    try:
        valid_time = expiry and datetime.fromisoformat(expiry.replace("Z", "+00:00")) > datetime.now(timezone.utc)
    except ValueError:
        valid_time = False
    expected = hmac.new(secret.encode(), f"{user_id}:{payload.channel}:{payload.phone_e164}:{payload.code}".encode(), hashlib.sha256).hexdigest()
    if not valid_time or not row.get("verification_code_hash") or not hmac.compare_digest(expected, row["verification_code_hash"]):
        raise HTTPException(status_code=400, detail="Kod geçersiz veya süresi dolmuş.")
    patch = requests.patch(_channel_url(base), headers=_admin_headers(key, "return=minimal"),
                           params={"id": f"eq.{row['id']}", "user_id": f"eq.{user_id}"},
                           json={"verified_at": datetime.now(timezone.utc).isoformat(), "enabled": True,
                                 "verification_code_hash": None, "verification_expires_at": None,
                                 "updated_at": datetime.now(timezone.utc).isoformat()}, timeout=12)
    if patch.status_code >= 400:
        raise HTTPException(status_code=503, detail="Kanal doğrulandı ancak etkinleştirme kaydedilemedi.")
    return {"status": "verified", "enabled": True, "channel": payload.channel}


def background_channel_cycle():
    if not all(os.getenv(k, "").strip() for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "SUPABASE_URL", "SUPABASE_ADMIN_KEY")):
        return {"status": "not_configured", "sent": 0}
    base, key = _admin_config()
    response = requests.get(_channel_url(base), headers=_admin_headers(key),
                            params={"select": "*", "enabled": "eq.true", "verified_at": "not.is.null", "limit": "500"}, timeout=12)
    response.raise_for_status()
    rows = response.json()
    now = datetime.now(timezone.utc)
    sent = 0
    for row in rows:
        try:
            weather = get_current_weather(float(row["lat"]), float(row["lon"]))
            risk = calculate_risk(weather)
            threshold = max(25, min(100, int(row.get("threshold") or 70)))
            last = row.get("last_alert_at")
            recent = False
            if last:
                try:
                    recent = (now - datetime.fromisoformat(str(last).replace("Z", "+00:00"))).total_seconds() < 21600
                except ValueError:
                    pass
            if risk < threshold or recent:
                continue
            message = (f"{row['area_name']}: çevresel risk sinyali {risk}/100. "
                       f"Sıcaklık {weather.get('temperature')}°C, nem %{weather.get('humidity')}, "
                       f"rüzgâr {weather.get('wind')} km/sa. Bu bir karar desteği sinyalidir; resmî yangın teyidi değildir.")
            _twilio_send(row["channel"], row["phone_e164"], message)
            requests.patch(_channel_url(base), headers=_admin_headers(key, "return=minimal"),
                           params={"id": f"eq.{row['id']}"}, json={"last_alert_at": now.isoformat(), "last_risk": risk}, timeout=10).raise_for_status()
            sent += 1
        except Exception:
            continue
    return {"status": "completed", "checked": len(rows), "sent": sent}

@router.get("/status")
def notification_status():
    twilio = all(os.getenv(k, "").strip() for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_SMS_FROM"))
    whatsapp = all(os.getenv(k, "").strip() for k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM"))
    channels = ["in_app", "browser"]
    if configured():
        channels.append("web_push")
    if twilio:
        channels.append("sms")
    if whatsapp:
        channels.append("whatsapp")
    return {"status":"available","system":"Nova-Alert","push":configured(),"channels":channels,
            "sms_configured":twilio,"whatsapp_configured":whatsapp,
            "background_delivery":"scheduled_cycle_required",
            "note":"Background delivery depends on scheduled workflow, provider configuration, consent and carrier/browser acceptance; no delivery is guaranteed."}

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


@router.post("/internal/run-cycle")
def run_scheduled_notification_cycle(x_nexora_cron_token: str | None = Header(default=None, alias="X-Nexora-Cron-Token")):
    expected = os.getenv("NEXORA_NOTIFICATION_CRON_TOKEN", "").strip()
    if not expected or not x_nexora_cron_token or not hmac.compare_digest(expected, x_nexora_cron_token):
        raise HTTPException(status_code=401, detail="Scheduled notification authorization failed.")
    import asyncio as _asyncio
    try:
        push_result = "not_configured"
        if configured():
            _asyncio.run(background_push_cycle())
            push_result = "cycle_ran"
        channels = background_channel_cycle()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Scheduled notification cycle failed.") from exc
    return {"status": "completed", "web_push": push_result, "channels": channels}
