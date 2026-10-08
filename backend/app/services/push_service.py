import base64
import json
import os
from typing import Any
import requests
from pywebpush import webpush, WebPushException

SUPABASE_URL=os.getenv("SUPABASE_URL","").rstrip("/")
SUPABASE_ADMIN_KEY=os.getenv("SUPABASE_ADMIN_KEY","")
VAPID_PRIVATE_KEY_B64=os.getenv("VAPID_PRIVATE_KEY_B64","")
VAPID_SUBJECT=os.getenv("VAPID_SUBJECT","mailto:hello@nexora88.com")
VAPID_PUBLIC_KEY="BA9PgktSWf1VAcGa7bvOB_HkqfGcztBQ7azhGaAXofjHkJgQI0Zjs9tbsCa8-hm8FkFWZH9N8jOVlMGtEcpu-L4"

def configured(): return bool(SUPABASE_URL and SUPABASE_ADMIN_KEY and VAPID_PRIVATE_KEY_B64)
def _headers(): return {"apikey":SUPABASE_ADMIN_KEY,"Authorization":f"Bearer {SUPABASE_ADMIN_KEY}","Content-Type":"application/json"}
def _url(): return f"{SUPABASE_URL}/rest/v1/nexorawildfire_push_subscriptions"

def upsert_subscription(sub:dict,lat:float,lon:float,area_name:str,threshold:int):
    if not configured(): return
    payload={"endpoint":sub["endpoint"],"p256dh":sub["keys"]["p256dh"],"auth":sub["keys"]["auth"],"lat":lat,"lon":lon,"area_name":area_name,"threshold":threshold}
    r=requests.post(_url(),headers={**_headers(),"Prefer":"resolution=merge-duplicates,return=minimal"},params={"on_conflict":"endpoint,area_name"},json=payload,timeout=12)
    r.raise_for_status()

def delete_subscription(endpoint:str,area_name=None):
    if not configured(): return
    params={"endpoint":f"eq.{endpoint}"}
    if area_name: params["area_name"]=f"eq.{area_name}"
    r=requests.delete(_url(),headers=_headers(),params=params,timeout=12)
    r.raise_for_status()
def list_subscriptions():
    if not configured(): return []
    r=requests.get(_url(),headers=_headers(),params={"select":"*","limit":"500"},timeout=12)
    r.raise_for_status()
    return r.json()
def update_alert_state(row_id,risk,alerted):
    if not configured(): return
    payload={"last_risk":risk}
    if alerted: payload["last_alert_at"]="now()"
    r=requests.patch(_url(),headers={**_headers(),"Prefer":"return=minimal"},params={"id":f"eq.{row_id}"},json=payload,timeout=12)
    r.raise_for_status()

def send_push(sub,title,message,url="./"):
    if not VAPID_PRIVATE_KEY_B64: return False
    pem=base64.urlsafe_b64decode(VAPID_PRIVATE_KEY_B64).decode()
    info={"endpoint":sub["endpoint"],"keys":{"p256dh":sub["p256dh"],"auth":sub["auth"]}}
    data=json.dumps({"title":title,"message":message,"url":url,"icon":"/favicon.png","tag":"nexorawildfire-alert"})
    try:
        webpush(subscription_info=info,data=data,vapid_private_key=pem,vapid_claims={"sub":VAPID_SUBJECT},ttl=300)
        return True
    except WebPushException as exc:
        if getattr(getattr(exc,"response",None),"status_code",None) in (404,410):
            try: delete_subscription(sub["endpoint"],sub.get("area_name"))
            except Exception: pass
        return False
    except Exception:
        return False
