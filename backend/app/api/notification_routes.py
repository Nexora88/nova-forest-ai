from fastapi import APIRouter, HTTPException
import os
import smtplib
import requests
from email.message import EmailMessage
from pydantic import BaseModel

router = APIRouter(prefix="/notifications")

class NotificationRequest(BaseModel):
    channel: str
    destination: str
    subject: str = "Nova-Forest AI Uyarısı"
    message: str

class EvaluateRequest(BaseModel):
    lat: float
    lon: float
    area_name: str
    channel: str
    destination: str
    threshold: int = 70


def send_email(destination, subject, message):
    host=os.getenv("SMTP_HOST"); port=int(os.getenv("SMTP_PORT","587")); user=os.getenv("SMTP_USER"); password=os.getenv("SMTP_PASSWORD")
    if not all([host,user,password]): return {"status":"not_configured","channel":"email"}
    msg=EmailMessage(); msg["From"]=user; msg["To"]=destination; msg["Subject"]=subject; msg.set_content(message)
    with smtplib.SMTP(host,port,timeout=15) as server:
        server.starttls(); server.login(user,password); server.send_message(msg)
    return {"status":"sent","channel":"email"}


def send_telegram(destination, message):
    token=os.getenv("TELEGRAM_BOT_TOKEN")
    if not token: return {"status":"not_configured","channel":"telegram"}
    r=requests.post(f"https://api.telegram.org/bot{token}/sendMessage",json={"chat_id":destination,"text":message},timeout=15)
    r.raise_for_status(); return {"status":"sent","channel":"telegram"}


def send_sms(destination, message):
    sid=os.getenv("TWILIO_ACCOUNT_SID"); token=os.getenv("TWILIO_AUTH_TOKEN"); sender=os.getenv("TWILIO_FROM")
    if not all([sid,token,sender]): return {"status":"not_configured","channel":"sms"}
    r=requests.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",auth=(sid,token),data={"From":sender,"To":destination,"Body":message},timeout=15)
    r.raise_for_status(); return {"status":"sent","channel":"sms"}

@router.get("/status")
def notification_status():
    return {"email":bool(os.getenv("SMTP_HOST") and os.getenv("SMTP_USER") and os.getenv("SMTP_PASSWORD")),"telegram":bool(os.getenv("TELEGRAM_BOT_TOKEN")),"sms":bool(os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN") and os.getenv("TWILIO_FROM"))}

@router.post("/send")
def send_notification(payload: NotificationRequest):
    try:
        channel=payload.channel.lower().strip()
        if channel=="email": return send_email(payload.destination,payload.subject,payload.message)
        if channel=="telegram": return send_telegram(payload.destination,payload.message)
        if channel=="sms": return send_sms(payload.destination,payload.message)
        raise HTTPException(status_code=400,detail="Desteklenmeyen bildirim kanalı")
    except requests.RequestException as exc:
        raise HTTPException(status_code=502,detail=f"Bildirim sağlayıcısı hatası: {exc}")


@router.post("/evaluate")
def evaluate_notification(payload: EvaluateRequest):
    from app.services.weather_service import get_current_weather
    w=get_current_weather(payload.lat,payload.lon)
    t=float(w.get("temperature") or 0); h=float(w.get("humidity") or 0); wind=float(w.get("wind") or 0)
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
    score=min(100,score)
    if score < payload.threshold:
        return {"status":"below_threshold","risk":score,"threshold":payload.threshold,"area":payload.area_name}
    message=f"Nova-Forest AI uyarısı: {payload.area_name} için çevresel risk {score}/100. Sıcaklık {t}°C, nem {h}%, rüzgar {wind} km/s. Bu mesaj karar destek sinyalidir; saha kontrolü önerilir."
    result=send_notification(NotificationRequest(channel=payload.channel,destination=payload.destination,subject=f"Nova-Forest AI • {payload.area_name}",message=message))
    result.update({"risk":score,"threshold":payload.threshold,"area":payload.area_name})
    return result
