"""Explicit, authenticated SMS/WhatsApp delivery via Twilio."""
from __future__ import annotations
import os
import re
import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.api.jobs_routes import _authenticated_user
from app.services.push_service import SUPABASE_URL, SUPABASE_ADMIN_KEY

router=APIRouter(prefix="/messages",tags=["SMS and WhatsApp"])
class VerifyStartRequest(BaseModel):
    phone:str=Field(min_length=8,max_length=32)
    channel:str
class VerifyCheckRequest(BaseModel):
    phone:str=Field(min_length=8,max_length=32)
    code:str=Field(min_length=4,max_length=10)
class SubscribeRequest(BaseModel):
    phone:str=Field(min_length=8,max_length=32)
    channel:str
    area_name:str=Field(min_length=1,max_length=120)
    lat:float=Field(ge=-90,le=90)
    lon:float=Field(ge=-180,le=180)
    threshold:int=Field(default=70,ge=25,le=100)
class MessageRequest(BaseModel):
    channel:str
    to:str=Field(min_length=8,max_length=32)
    area_name:str=Field(min_length=1,max_length=120)
    message:str=Field(min_length=1,max_length=1200)

def _send(channel:str,to:str,message:str)->dict:
    sid=os.getenv("TWILIO_ACCOUNT_SID","").strip(); token=os.getenv("TWILIO_AUTH_TOKEN","").strip()
    sender=os.getenv("TWILIO_WHATSAPP_FROM" if channel=="whatsapp" else "TWILIO_SMS_FROM","").strip()
    if not sid or not token or not sender:
        raise HTTPException(status_code=503,detail=f"{channel.upper()} sağlayıcısı yapılandırılmamış.")
    if not re.fullmatch(r"\+[1-9]\d{7,14}",to):
        raise HTTPException(status_code=422,detail="Alıcı numarası E.164 biçiminde olmalı (ör. +905xxxxxxxxx).")
    source=f"whatsapp:{sender.removeprefix('whatsapp:')}" if channel=="whatsapp" else sender
    target=f"whatsapp:{to}" if channel=="whatsapp" else to
    try:
        response=requests.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",auth=(sid,token),data={"From":source,"To":target,"Body":message},timeout=15)
        if response.status_code>=400: raise HTTPException(status_code=502,detail=f"{channel.upper()} sağlayıcısı mesajı kabul etmedi.")
        data=response.json()
        return {"status":"accepted","channel":channel,"provider_message_id":data.get("sid"),"provider_status":data.get("status")}
    except requests.RequestException:
        raise HTTPException(status_code=502,detail="Mesaj sağlayıcısına ulaşılamadı.")

@router.get("/status")
def message_status():
    return {"sms_configured":bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN") and os.getenv("TWILIO_SMS_FROM")),"whatsapp_configured":bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN") and os.getenv("TWILIO_WHATSAPP_FROM")),"note":"Provider acceptance is not a guarantee of delivery. WhatsApp requires an approved sender/template where applicable."}

@router.post("/verify/start")
def start_phone_verification(payload:VerifyStartRequest,authorization:str|None=Header(default=None)):
    _authenticated_user(authorization)
    sid=os.getenv("TWILIO_ACCOUNT_SID","").strip()
    token=os.getenv("TWILIO_AUTH_TOKEN","").strip()
    service=os.getenv("TWILIO_VERIFY_SERVICE_SID","").strip()
    if not sid or not token or not service: raise HTTPException(status_code=503,detail="Twilio Verify servisi yapılandırılmamış.")
    if payload.channel not in {"sms","whatsapp"} or not re.fullmatch(r"\+[1-9]\d{7,14}",payload.phone): raise HTTPException(status_code=422,detail="Geçerli kanal ve E.164 telefon numarası gerekli.")
    try:
        response=requests.post(f"https://verify.twilio.com/v2/Services/{service}/Verifications",auth=(sid,token),data={"To":payload.phone,"Channel":payload.channel},timeout=12)
        if response.status_code>=400: raise HTTPException(status_code=502,detail="Telefon doğrulama kodu gönderilemedi.")
        return {"status":"verification_sent","channel":payload.channel}
    except requests.RequestException: raise HTTPException(status_code=502,detail="Twilio Verify servisine ulaşılamadı.")

@router.post("/verify/check")
def check_phone_verification(payload:VerifyCheckRequest,authorization:str|None=Header(default=None)):
    user_id=_authenticated_user(authorization)
    sid=os.getenv("TWILIO_ACCOUNT_SID","").strip()
    token=os.getenv("TWILIO_AUTH_TOKEN","").strip()
    service=os.getenv("TWILIO_VERIFY_SERVICE_SID","").strip()
    if not sid or not token or not service: raise HTTPException(status_code=503,detail="Twilio Verify servisi yapılandırılmamış.")
    if not re.fullmatch(r"\+[1-9]\d{7,14}",payload.phone): raise HTTPException(status_code=422,detail="E.164 telefon numarası gerekli.")
    try:
        response=requests.post(f"https://verify.twilio.com/v2/Services/{service}/VerificationCheck",auth=(sid,token),data={"To":payload.phone,"Code":payload.code},timeout=12)
        if response.status_code>=400 or response.json().get("status")!="approved": raise HTTPException(status_code=400,detail="Telefon doğrulaması başarısız.")
    except requests.RequestException: raise HTTPException(status_code=502,detail="Twilio Verify servisine ulaşılamadı.")
    if not SUPABASE_URL or not SUPABASE_ADMIN_KEY: raise HTTPException(status_code=503,detail="Abonelik veritabanı yapılandırılmamış.")
    headers={"apikey":SUPABASE_ADMIN_KEY,"Authorization":f"Bearer {SUPABASE_ADMIN_KEY}","Content-Type":"application/json","Prefer":"resolution=merge-duplicates,return=minimal"}
    try:
        saved=requests.post(f"{SUPABASE_URL}/rest/v1/nexorawildfire_verified_phones",params={"on_conflict":"user_id,phone"},headers=headers,json={"user_id":user_id,"phone":payload.phone,"verified":True},timeout=10)
        saved.raise_for_status()
    except requests.RequestException: raise HTTPException(status_code=503,detail="Doğrulandı ancak güvenli biçimde kaydedilemedi.")
    return {"status":"verified","phone_masked":payload.phone[:4]+"••••"+payload.phone[-2:]}

@router.post("/subscribe")
def subscribe_message_alert(payload:SubscribeRequest,authorization:str|None=Header(default=None)):
    user_id=_authenticated_user(authorization)
    if payload.channel not in {"sms","whatsapp"}: raise HTTPException(status_code=422,detail="Kanal sms veya whatsapp olmalı.")
    if not re.fullmatch(r"\+[1-9]\d{7,14}",payload.phone): raise HTTPException(status_code=422,detail="E.164 telefon numarası gerekli.")
    if not SUPABASE_URL or not SUPABASE_ADMIN_KEY: raise HTTPException(status_code=503,detail="Abonelik veritabanı yapılandırılmamış.")
    headers={"apikey":SUPABASE_ADMIN_KEY,"Authorization":f"Bearer {SUPABASE_ADMIN_KEY}","Content-Type":"application/json"}
    try:
        verified=requests.get(f"{SUPABASE_URL}/rest/v1/nexorawildfire_verified_phones",params={"user_id":f"eq.{user_id}","phone":f"eq.{payload.phone}","verified":"eq.true","select":"phone","limit":"1"},headers=headers,timeout=8)
        verified.raise_for_status()
        if not verified.json(): raise HTTPException(status_code=403,detail="Önce bu telefon numarasını doğrula.")
        response=requests.post(f"{SUPABASE_URL}/rest/v1/nexorawildfire_message_subscriptions",params={"on_conflict":"user_id,channel,area_name"},headers={**headers,"Prefer":"resolution=merge-duplicates,return=minimal"},json={"user_id":user_id,"phone":payload.phone,"channel":payload.channel,"area_name":payload.area_name,"lat":payload.lat,"lon":payload.lon,"threshold":payload.threshold,"enabled":True},timeout=10)
        response.raise_for_status()
    except requests.RequestException: raise HTTPException(status_code=503,detail="Mesaj aboneliği kaydedilemedi.")
    return {"status":"subscribed","channel":payload.channel,"area_name":payload.area_name}

@router.post("/send")
def send_message(payload:MessageRequest,authorization:str|None=Header(default=None)):
    _authenticated_user(authorization)
    if payload.channel not in {"sms","whatsapp"}: raise HTTPException(status_code=422,detail="Kanal sms veya whatsapp olmalı.")
    return _send(payload.channel,payload.to,payload.message)


def messaging_configured()->bool:
    return bool(SUPABASE_URL and SUPABASE_ADMIN_KEY and os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN") and (os.getenv("TWILIO_SMS_FROM") or os.getenv("TWILIO_WHATSAPP_FROM")))

def list_message_subscriptions()->list[dict]:
    if not messaging_configured(): return []
    response=requests.get(f"{SUPABASE_URL}/rest/v1/nexorawildfire_message_subscriptions",params={"select":"*","enabled":"eq.true","limit":"500"},headers={"apikey":SUPABASE_ADMIN_KEY,"Authorization":f"Bearer {SUPABASE_ADMIN_KEY}"},timeout=10)
    response.raise_for_status()
    return response.json()

def deliver_scheduled_alert(row:dict,risk:int,weather:dict)->bool:
    if risk<int(row.get("threshold") or 70): return False
    message=f"{row.get('area_name','Alan')}: çevresel tarama göstergesi {risk}/100. Sıcaklık {weather.get('temperature')}°C, bağıl nem %{weather.get('humidity')}, rüzgâr {weather.get('wind')} km/sa. Bu otomatik karar destek mesajıdır; resmî yangın teyidi değildir."
    try:
        result=_send(str(row.get("channel")),str(row.get("phone")),message)
        if result.get("status")!="accepted": return False
        headers={"apikey":SUPABASE_ADMIN_KEY,"Authorization":f"Bearer {SUPABASE_ADMIN_KEY}","Content-Type":"application/json","Prefer":"return=minimal"}
        requests.patch(f"{SUPABASE_URL}/rest/v1/nexorawildfire_message_subscriptions",params={"id":f"eq.{row['id']}"},headers=headers,json={"last_risk":risk,"last_alert_at":__import__("datetime").datetime.now(__import__("datetime").timezone.utc).isoformat()},timeout=8).raise_for_status()
        return True
    except Exception:
        return False
