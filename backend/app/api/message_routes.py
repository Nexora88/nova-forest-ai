"""Explicit, authenticated SMS/WhatsApp delivery via Twilio."""
from __future__ import annotations
import os
import re
import requests
from fastapi import APIRouter, Header, HTTPException
from pydantic import BaseModel, Field
from app.api.jobs_routes import _authenticated_user

router=APIRouter(prefix="/messages",tags=["SMS and WhatsApp"])
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

@router.post("/send")
def send_message(payload:MessageRequest,authorization:str|None=Header(default=None)):
    _authenticated_user(authorization)
    if payload.channel not in {"sms","whatsapp"}: raise HTTPException(status_code=422,detail="Kanal sms veya whatsapp olmalı.")
    return _send(payload.channel,payload.to,payload.message)
