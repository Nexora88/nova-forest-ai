"""Stripe subscription checkout and signature-verified entitlement updates."""
from __future__ import annotations
import hashlib
import hmac
import os
import time
from urllib.parse import urlencode
import requests
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from app.api.jobs_routes import _authenticated_user

router=APIRouter(prefix="/billing",tags=["Billing"])

class CheckoutRequest(BaseModel):
    plan: str = "pro"

def _stripe_ready():
    return all(os.getenv(k,"").strip() for k in ("STRIPE_SECRET_KEY","STRIPE_WEBHOOK_SECRET","STRIPE_PRICE_PRO"))

@router.get("/status")
def billing_status():
    return {"checkout_configured":bool(os.getenv("STRIPE_SECRET_KEY","").strip() and os.getenv("STRIPE_PRICE_PRO","").strip()),"webhook_configured":bool(os.getenv("STRIPE_WEBHOOK_SECRET","").strip()),"secret_exposed":False,"plans":["free","pro"]}

@router.post("/checkout")
def create_checkout(payload:CheckoutRequest,authorization:str|None=Header(default=None)):
    user_id=_authenticated_user(authorization)
    if payload.plan!="pro": raise HTTPException(status_code=400,detail="Desteklenmeyen plan.")
    secret=os.getenv("STRIPE_SECRET_KEY","").strip()
    price=os.getenv("STRIPE_PRICE_PRO","").strip()
    base=os.getenv("NOVA_PUBLIC_APP_URL","https://nova-forest-ai.vercel.app").rstrip("/")
    if not secret or not price: raise HTTPException(status_code=503,detail="Stripe checkout henüz yapılandırılmadı.")
    form={
        "mode":"subscription",
        "success_url":base+"/pages/bee.html?billing=success",
        "cancel_url":base+"/pages/bee.html?billing=cancelled",
        "line_items[0][price]":price,
        "line_items[0][quantity]":"1",
        "client_reference_id":user_id,
        "metadata[user_id]":user_id,
        "subscription_data[metadata][user_id]":user_id,
        "allow_promotion_codes":"true",
    }
    try:
        response=requests.post("https://api.stripe.com/v1/checkout/sessions",auth=(secret,""),data=form,timeout=15)
        response.raise_for_status()
        data=response.json()
        if not data.get("url"): raise ValueError("Checkout URL missing")
        return {"status":"checkout_created","url":data["url"]}
    except (requests.RequestException,ValueError) as exc:
        raise HTTPException(status_code=502,detail="Stripe ödeme oturumu oluşturulamadı.") from exc

def _verified_event(raw:bytes,signature:str,secret:str):
    parts={}
    for item in signature.split(","):
        if "=" in item:
            key,value=item.split("=",1);parts.setdefault(key,[]).append(value)
    try: timestamp=int(parts["t"][0])
    except (KeyError,ValueError,IndexError): raise HTTPException(status_code=400,detail="Stripe imzası geçersiz.")
    if abs(time.time()-timestamp)>300: raise HTTPException(status_code=400,detail="Stripe webhook zaman damgası süresi dolmuş.")
    signed=str(timestamp).encode()+b"."+raw
    expected=hmac.new(secret.encode(),signed,hashlib.sha256).hexdigest()
    if not any(hmac.compare_digest(expected,value) for value in parts.get("v1",[])):
        raise HTTPException(status_code=400,detail="Stripe webhook imzası doğrulanamadı.")
    import json
    try: return json.loads(raw)
    except ValueError as exc: raise HTTPException(status_code=400,detail="Stripe webhook gövdesi geçersiz.") from exc

@router.post("/webhook")
async def stripe_webhook(request:Request, stripe_signature:str|None=Header(default=None,alias="Stripe-Signature")):
    secret=os.getenv("STRIPE_WEBHOOK_SECRET","").strip()
    admin=os.getenv("SUPABASE_ADMIN_KEY","").strip()
    supabase=os.getenv("SUPABASE_URL","").rstrip("/")
    if not secret or not admin or not supabase: raise HTTPException(status_code=503,detail="Ödeme webhook'u yapılandırılmadı.")
    if not stripe_signature: raise HTTPException(status_code=400,detail="Stripe-Signature başlığı gerekli.")
    event=_verified_event(await request.body(),stripe_signature,secret)
    kind=event.get("type","")
    obj=(event.get("data") or {}).get("object") or {}
    if kind not in ("checkout.session.completed","customer.subscription.updated","customer.subscription.deleted"):
        return {"received":True,"ignored":True}
    metadata=obj.get("metadata") or {}
    user_id=metadata.get("user_id") or obj.get("client_reference_id")
    if not user_id: return {"received":True,"ignored":True,"reason":"user_id_missing"}
    if kind=="checkout.session.completed":
        if obj.get("mode")!="subscription" or obj.get("payment_status") not in ("paid","no_payment_required"):
            return {"received":True,"ignored":True,"reason":"checkout_not_paid"}
        plan="pro"
    elif kind=="customer.subscription.deleted" or obj.get("status") in ("canceled","unpaid","incomplete_expired"):
        plan="free"
    elif obj.get("status") in ("active","trialing","past_due"):
        plan="pro"
    else:
        return {"received":True,"ignored":True,"reason":"subscription_not_active"}
    headers={"apikey":admin,"Authorization":f"Bearer {admin}","Content-Type":"application/json","Prefer":"return=minimal"}
    try:
        response=requests.patch(f"{supabase}/rest/v1/profiles",headers=headers,params={"id":f"eq.{user_id}"},json={"plan":plan},timeout=10)
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=503,detail="Ödeme doğrulandı ancak hesap planı güncellenemedi; webhook tekrar denenmeli.") from exc
    return {"received":True,"plan_updated":plan}
