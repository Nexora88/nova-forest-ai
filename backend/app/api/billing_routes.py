"""Stripe Checkout and signature-verified subscription webhooks."""
from __future__ import annotations
import hashlib, hmac, json, os, time
import requests
from fastapi import APIRouter, Header, HTTPException, Request
from app.api.jobs_routes import _authenticated_user

router=APIRouter(prefix="/billing",tags=["Billing"])

def _price(plan):
    return os.getenv("STRIPE_PRICE_PRO_ID","").strip() if plan=="pro" else os.getenv("STRIPE_PRICE_ENTERPRISE_ID","").strip()

def _ready():
    return bool(os.getenv("STRIPE_SECRET_KEY","").strip() and _price("pro") and _price("enterprise"))

def _set_plan(user_id, plan):
    url=os.getenv("SUPABASE_URL","").rstrip("/")
    key=os.getenv("SUPABASE_ADMIN_KEY","")
    if not url or not key: raise RuntimeError("billing_database_not_configured")
    r=requests.patch(f"{url}/rest/v1/profiles",headers={"apikey":key,"Authorization":f"Bearer {key}","Content-Type":"application/json","Prefer":"return=minimal"},params={"id":f"eq.{user_id}"},json={"plan":plan},timeout=10)
    r.raise_for_status()

def _stripe_get(path):
    key=os.getenv("STRIPE_SECRET_KEY","").strip()
    r=requests.get("https://api.stripe.com/v1/"+path,auth=(key,""),timeout=10)
    r.raise_for_status()
    return r.json()

@router.get("/status")
def billing_status():
    return {"enabled":_ready() and bool(os.getenv("STRIPE_WEBHOOK_SECRET")),"checkout_configured":_ready(),"webhook_configured":bool(os.getenv("STRIPE_WEBHOOK_SECRET")),"secret_exposed":False,"message":"Ödeme yalnızca Stripe anahtarı, iki fiyat kimliği ve webhook imza anahtarı sunucuda yapılandırıldığında etkinleşir."}

@router.post("/checkout")
def create_checkout(payload: dict, authorization: str | None=Header(default=None)):
    user_id=_authenticated_user(authorization)
    plan=payload.get("plan")
    if plan not in {"pro","enterprise"}: raise HTTPException(status_code=422,detail="Plan pro veya enterprise olmalı.")
    price=_price(plan)
    if not os.getenv("STRIPE_SECRET_KEY") or not price: raise HTTPException(status_code=503,detail={"code":"billing_not_configured","message":"Stripe secret key ve seçilen planın price ID'si sunucuda tanımlanmamış; ödeme başlatılmadı."})
    base=os.getenv("NOVA_PUBLIC_APP_URL","https://nova-forest-ai.vercel.app").rstrip("/")
    data={"mode":"subscription","success_url":base+"/pages/account.html?billing=success","cancel_url":base+"/pages/account.html?billing=cancelled","client_reference_id":user_id,"line_items[0][price]":price,"line_items[0][quantity]":"1","metadata[user_id]":user_id,"metadata[plan]":plan,"subscription_data[metadata][user_id]":user_id,"subscription_data[metadata][plan]":plan}
    try:
        r=requests.post("https://api.stripe.com/v1/checkout/sessions",auth=(os.environ["STRIPE_SECRET_KEY"],""),data=data,timeout=15)
        if r.status_code>=400: raise HTTPException(status_code=502,detail="Stripe Checkout oturumu oluşturamadı.")
        session=r.json()
    except requests.RequestException as exc: raise HTTPException(status_code=502,detail="Stripe ödeme servisine ulaşılamadı.") from exc
    if not session.get("url"): raise HTTPException(status_code=502,detail="Stripe güvenli ödeme bağlantısı döndürmedi.")
    return {"status":"checkout_created","url":session["url"],"session_id":session.get("id"),"provider":"stripe"}

def _valid_signature(body: bytes, header: str, secret: str) -> bool:
    parts={}
    for item in header.split(","):
        if "=" in item:
            k,v=item.split("=",1);parts.setdefault(k,[]).append(v)
    try: timestamp=int(parts["t"][0])
    except (KeyError,ValueError,IndexError): return False
    if abs(time.time()-timestamp)>300:return False
    expected=hmac.new(secret.encode(),str(timestamp).encode()+b"."+body,hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected,value) for value in parts.get("v1",[]))

@router.post("/webhook")
async def stripe_webhook(request: Request, stripe_signature: str | None=Header(default=None,alias="Stripe-Signature")):
    secret=os.getenv("STRIPE_WEBHOOK_SECRET","").strip()
    if not secret: raise HTTPException(status_code=503,detail="Stripe webhook imza anahtarı yapılandırılmadı.")
    body=await request.body()
    if not stripe_signature or not _valid_signature(body,stripe_signature,secret): raise HTTPException(status_code=400,detail="Stripe webhook imzası geçersiz.")
    try:event=json.loads(body)
    except json.JSONDecodeError: raise HTTPException(status_code=400,detail="Geçersiz webhook JSON'u.")
    kind=event.get("type","");obj=event.get("data",{}).get("object",{})
    try:
        if kind=="checkout.session.completed" and obj.get("mode")=="subscription":
            plan=obj.get("metadata",{}).get("plan");user_id=obj.get("metadata",{}).get("user_id") or obj.get("client_reference_id")
            if plan in {"pro","enterprise"} and user_id and obj.get("payment_status") in {"paid","no_payment_required"}: _set_plan(user_id,plan)
        elif kind in {"customer.subscription.updated","customer.subscription.deleted"}:
            metadata=obj.get("metadata",{});user_id=metadata.get("user_id");plan=metadata.get("plan","free")
            active=kind!="customer.subscription.deleted" and obj.get("status") in {"active","trialing"}
            if user_id: _set_plan(user_id,plan if active and plan in {"pro","enterprise"} else "free")
    except (requests.RequestException,RuntimeError) as exc:
        raise HTTPException(status_code=500,detail="Abonelik veritabanına yazılamadı; Stripe yeniden deneyebilir.") from exc
    return {"received":True}
