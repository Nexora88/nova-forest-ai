"""Stripe Checkout and webhook; paid plans activate only after verified provider events."""
from __future__ import annotations
import os
import requests
import stripe
from fastapi import APIRouter, Header, HTTPException, Request
from pydantic import BaseModel
from app.api.jobs_routes import _authenticated_user

router=APIRouter(prefix="/billing",tags=["Billing"])
stripe.api_key=os.getenv("STRIPE_SECRET_KEY","")

class CheckoutRequest(BaseModel):
    plan: str

def _required(name:str)->str:
    value=os.getenv(name,"").strip()
    if not value: raise HTTPException(status_code=503,detail=f"{name} ödeme sağlayıcısı yapılandırmasında eksik.")
    return value

@router.get("/status")
def billing_status():
    return {"provider":"stripe","configured":bool(os.getenv("STRIPE_SECRET_KEY") and os.getenv("STRIPE_WEBHOOK_SECRET")),"checkout_ready":bool(os.getenv("STRIPE_SECRET_KEY") and os.getenv("STRIPE_PRO_PRICE_ID")),"note":"Plan yalnızca imzası doğrulanmış Stripe webhook sonrasında etkinleştirilir."}

@router.post("/checkout")
def checkout(payload:CheckoutRequest,authorization:str|None=Header(default=None)):
    user_id=_authenticated_user(authorization)
    if payload.plan!="pro": raise HTTPException(status_code=422,detail="Desteklenen satın alma planı: pro.")
    _required("STRIPE_SECRET_KEY"); price=_required("STRIPE_PRO_PRICE_ID")
    base=_required("NEXORA_PUBLIC_APP_URL").rstrip("/")
    try:
        session=stripe.checkout.Session.create(mode="subscription",line_items=[{"price":price,"quantity":1}],
          success_url=base+"/pages/account.html?billing=success",cancel_url=base+"/pages/account.html?billing=cancelled",
          client_reference_id=user_id,metadata={"user_id":user_id,"plan":"pro"},subscription_data={"metadata":{"user_id":user_id,"plan":"pro"}})
    except Exception as exc:
        raise HTTPException(status_code=502,detail=f"Ödeme oturumu oluşturulamadı ({type(exc).__name__}).")
    return {"checkout_url":session.url,"session_id":session.id}

def _set_plan(user_id:str,plan:str,customer_id:str|None=None,subscription_id:str|None=None):
    url=_required("SUPABASE_URL").rstrip("/"); key=_required("SUPABASE_ADMIN_KEY")
    payload={"plan":plan}
    if customer_id: payload["stripe_customer_id"]=customer_id
    if subscription_id: payload["stripe_subscription_id"]=subscription_id
    response=requests.patch(f"{url}/rest/v1/profiles",params={"id":f"eq.{user_id}"},headers={"apikey":key,"Authorization":f"Bearer {key}","Content-Type":"application/json","Prefer":"return=minimal"},json=payload,timeout=10)
    response.raise_for_status()

@router.post("/webhook")
async def stripe_webhook(request:Request,stripe_signature:str|None=Header(default=None,alias="Stripe-Signature")):
    secret=_required("STRIPE_WEBHOOK_SECRET")
    if not stripe_signature: raise HTTPException(status_code=400,detail="Stripe-Signature başlığı eksik.")
    raw=await request.body()
    try: event=stripe.Webhook.construct_event(raw,stripe_signature,secret)
    except Exception: raise HTTPException(status_code=400,detail="Stripe webhook imzası geçersiz.")
    kind=event.get("type"); obj=event.get("data",{}).get("object",{})
    if kind=="checkout.session.completed" and obj.get("mode")=="subscription":
        user_id=(obj.get("metadata") or {}).get("user_id") or obj.get("client_reference_id")
        subscription_id=obj.get("subscription")
        if user_id and subscription_id and obj.get("payment_status") in {"paid","no_payment_required"}:
            try:
                subscription=stripe.Subscription.retrieve(subscription_id)
                if subscription.get("status") in {"active","trialing"}:
                    _set_plan(str(user_id),"pro",obj.get("customer"),subscription_id)
            except Exception:
                raise HTTPException(status_code=503,detail="Abonelik durumu doğrulanamadı; Stripe olayı yeniden denenmeli.")
    elif kind in ("customer.subscription.deleted","customer.subscription.paused"):
        user_id=(obj.get("metadata") or {}).get("user_id")
        if user_id: _set_plan(str(user_id),"free",obj.get("customer"),obj.get("id"))
    return {"received":True}
