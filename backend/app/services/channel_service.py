"""Opt-in SMS/WhatsApp delivery and contact persistence via Supabase + Twilio."""
from __future__ import annotations
import os
import requests
from datetime import datetime, timezone

def _config():
    url=os.getenv("SUPABASE_URL","").rstrip("/")
    key=os.getenv("SUPABASE_ADMIN_KEY","")
    if not url or not key:
        raise RuntimeError("Supabase admin configuration missing")
    return url,key

def _headers(key):
    return {"apikey":key,"Authorization":f"Bearer {key}","Content-Type":"application/json"}

def list_contacts():
    url,key=_config()
    r=requests.get(f"{url}/rest/v1/nexorawildfire_alert_contacts",headers=_headers(key),params={"select":"*","enabled":"eq.true","limit":"500"},timeout=12)
    r.raise_for_status()
    return r.json()

def save_contact(user_id,channel,phone,lat,lon,area_name,threshold):
    url,key=_config()
    payload={"user_id":user_id,"channel":channel,"phone_e164":phone,"lat":lat,"lon":lon,"area_name":area_name,"threshold":threshold,"enabled":True,"consent_at":datetime.now(timezone.utc).isoformat()}
    r=requests.post(f"{url}/rest/v1/nexorawildfire_alert_contacts",headers={**_headers(key),"Prefer":"resolution=merge-duplicates,return=representation"},params={"on_conflict":"user_id,channel,phone_e164,area_name"},json=payload,timeout=12)
    r.raise_for_status()
    data=r.json()
    return data[0] if isinstance(data,list) and data else {"saved":True}

def delete_contact(user_id,contact_id):
    url,key=_config()
    r=requests.delete(f"{url}/rest/v1/nexorawildfire_alert_contacts",headers={**_headers(key),"Prefer":"return=minimal"},params={"id":f"eq.{contact_id}","user_id":f"eq.{user_id}"},timeout=12)
    r.raise_for_status()

def update_contact_alert(contact_id,risk,alerted):
    url,key=_config()
    payload={"last_risk":risk}
    if alerted: payload["last_alert_at"]=datetime.now(timezone.utc).isoformat()
    r=requests.patch(f"{url}/rest/v1/nexorawildfire_alert_contacts",headers={**_headers(key),"Prefer":"return=minimal"},params={"id":f"eq.{contact_id}"},json=payload,timeout=12)
    r.raise_for_status()

def send_channel(channel,phone,body):
    sid=os.getenv("TWILIO_ACCOUNT_SID","").strip()
    token=os.getenv("TWILIO_AUTH_TOKEN","").strip()
    sender=os.getenv("TWILIO_FROM_WHATSAPP" if channel=="whatsapp" else "TWILIO_FROM_SMS","").strip()
    if not sid or not token or not sender:
        raise RuntimeError(f"Twilio {channel} channel is not configured")
    target=f"whatsapp:{phone}" if channel=="whatsapp" else phone
    source=sender if channel=="sms" or sender.startswith("whatsapp:") else f"whatsapp:{sender}"
    r=requests.post(f"https://api.twilio.com/2010-04-01/Accounts/{sid}/Messages.json",auth=(sid,token),data={"To":target,"From":source,"Body":body},timeout=15)
    r.raise_for_status()
    return {"status":"accepted_by_provider","provider":"twilio","message_sid":r.json().get("sid")}
