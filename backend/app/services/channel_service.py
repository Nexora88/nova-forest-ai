"""Explicit-consent SMS and WhatsApp delivery via Twilio."""
from __future__ import annotations
import os, re
import requests

def configured() -> bool:
    return bool(os.getenv("SUPABASE_URL") and os.getenv("SUPABASE_ADMIN_KEY") and os.getenv("TWILIO_ACCOUNT_SID") and os.getenv("TWILIO_AUTH_TOKEN"))

def _db():
    url=os.getenv("SUPABASE_URL","").rstrip("/")
    key=os.getenv("SUPABASE_ADMIN_KEY","")
    if not url or not key: raise RuntimeError("notification_channels_db_not_configured")
    return url,key

def _headers(key):
    return {"apikey":key,"Authorization":f"Bearer {key}","Content-Type":"application/json"}

def upsert_channel(user_id: str, phone: str, channel: str, lat: float, lon: float, area_name: str, threshold: int):
    if channel not in {"sms","whatsapp"}: raise ValueError("invalid_channel")
    if not re.fullmatch(r"\+[1-9][0-9]{7,14}", phone): raise ValueError("phone_must_be_e164")
    url,key=_db()
    payload={"user_id":user_id,"phone":phone,"channel":channel,"lat":lat,"lon":lon,"area_name":area_name,"threshold":threshold,"consent":True,"enabled":True}
    r=requests.post(f"{url}/rest/v1/nexorawildfire_notification_channels",headers={**_headers(key),"Prefer":"resolution=merge-duplicates,return=minimal"},params={"on_conflict":"user_id,channel,area_name"},json=payload,timeout=10)
    r.raise_for_status()

def list_channels():
    if not configured(): return []
    url,key=_db()
    r=requests.get(f"{url}/rest/v1/nexorawildfire_notification_channels",headers=_headers(key),params={"select":"*","enabled":"eq.true","consent":"eq.true","limit":"1000"},timeout=10)
    r.raise_for_status()
    return r.json()

def send_message(row: dict, title: str, message: str) -> bool:
    sid=os.getenv("TWILIO_ACCOUNT_SID","").strip()
    token=os.getenv("TWILIO_AUTH_TOKEN","").strip()
    channel=row.get("channel")
    sender=os.getenv("TWILIO_FROM_SMS","").strip() if channel=="sms" else os.getenv("TWILIO_FROM_WHATSAPP","").strip()
    to=str(row.get("phone","")).strip()
    if not sid or not token or not sender or channel not in {"sms","whatsapp"}: return False
    if channel=="whatsapp":
        if not sender.startswith("whatsapp:"): sender="whatsapp:"+sender
        if not to.startswith("whatsapp:"): to="whatsapp:"+to
    try:
        r=requests.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",auth=(sid,token),data={"From":sender,"To":to,"Body":(title+"\n"+message)[:1500]},timeout=12)
        return 200 <= r.status_code < 300
    except requests.RequestException:
        return False

def update_channel_alert(row_id, risk, alerted):
    url,key=_db()
    payload={"last_risk":risk}
    if alerted:
        from datetime import datetime, timezone
        payload["last_alert_at"]=datetime.now(timezone.utc).isoformat()
    r=requests.patch(f"{url}/rest/v1/nexorawildfire_notification_channels",headers={**_headers(key),"Prefer":"return=minimal"},params={"id":f"eq.{row_id}"},json=payload,timeout=8)
    r.raise_for_status()
