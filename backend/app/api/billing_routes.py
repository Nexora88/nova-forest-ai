"""Stripe Checkout and signed webhook integration. Requires server-side secrets and a configured Price ID."""
from __future__ import annotations

import hashlib
import hmac
import os
import time
from urllib.parse import urlencode

import requests
from fastapi import APIRouter, Header, HTTPException, Request
from app.api.jobs_routes import _authenticated_user

router = APIRouter(prefix="/billing", tags=["Billing"])


def _config():
    key = os.getenv("STRIPE_SECRET_KEY", "").strip()
    price = os.getenv("STRIPE_PRO_PRICE_ID", "").strip()
    base = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    admin = os.getenv("SUPABASE_ADMIN_KEY", "").strip()
    success = os.getenv("NEXORA_BILLING_SUCCESS_URL", "").strip()
    cancel = os.getenv("NEXORA_BILLING_CANCEL_URL", "").strip()
    if not all((key, price, base, admin, success, cancel)):
        raise HTTPException(status_code=503, detail={
            "code": "billing_not_configured",
            "message": "Ödeme için Stripe anahtarı/Price ID, Supabase sunucu anahtarı ve başarı/iptal URL'leri sunucu ortamına eklenmeli. Henüz ücret tahsil edilmiyor.",
        })
    return key, price, base, admin, success, cancel


@router.get("/status")
def billing_status():
    enabled = all(os.getenv(k, "").strip() for k in (
        "STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID", "STRIPE_WEBHOOK_SECRET",
        "SUPABASE_URL", "SUPABASE_ADMIN_KEY", "NEXORA_BILLING_SUCCESS_URL", "NEXORA_BILLING_CANCEL_URL",
    ))
    return {"enabled": enabled, "provider": "Stripe Checkout", "mode": "subscription",
            "message": "Checkout yalnızca tüm sunucu ayarları tamamlandığında açılır." if enabled else "Ödeme yapılandırması eksik; ödeme başlatılmaz."}


@router.post("/checkout")
def create_checkout(authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
    key, price, _, _, success, cancel = _config()
    form = {
        "mode": "subscription",
        "line_items[0][price]": price,
        "line_items[0][quantity]": "1",
        "success_url": success,
        "cancel_url": cancel,
        "client_reference_id": user_id,
        "metadata[user_id]": user_id,
        "subscription_data[metadata][user_id]": user_id,
        "allow_promotion_codes": "true",
    }
    try:
        response = requests.post("https://api.stripe.com/v1/checkout/sessions",
                                 auth=(key, ""), data=form, timeout=15)
        response.raise_for_status()
        session = response.json()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Stripe Checkout oturumu oluşturulamadı.") from exc
    if not session.get("url"):
        raise HTTPException(status_code=502, detail="Stripe Checkout URL döndürmedi.")
    return {"status": "checkout_created", "checkout_url": session["url"], "session_id": session.get("id")}


def _verify_signature(body: bytes, header: str, secret: str) -> bool:
    fields = {}
    for part in header.split(","):
        if "=" in part:
            key, value = part.split("=", 1)
            fields.setdefault(key, []).append(value)
    try:
        timestamp = int(fields["t"][0])
        signatures = fields["v1"]
    except (KeyError, ValueError, IndexError):
        return False
    if abs(time.time() - timestamp) > 300:
        return False
    expected = hmac.new(secret.encode(), str(timestamp).encode() + b"." + body, hashlib.sha256).hexdigest()
    return any(hmac.compare_digest(expected, candidate) for candidate in signatures)


def _persist_subscription(base: str, admin: str, user_id: str, customer_id: str | None,
                          subscription_id: str | None, status: str, price_id: str | None,
                          period_end: int | None):
    headers = {"apikey": admin, "Authorization": f"Bearer {admin}", "Content-Type": "application/json",
               "Prefer": "resolution=merge-duplicates,return=minimal"}
    plan = "pro" if status in {"active", "trialing"} else "free"
    payload = {"user_id": user_id, "stripe_customer_id": customer_id, "stripe_subscription_id": subscription_id,
               "status": status, "price_id": price_id, "current_period_end": period_end, "plan": plan}
    r = requests.post(f"{base}/rest/v1/nexora_billing_subscriptions?on_conflict=user_id",
                      headers=headers, json=payload, timeout=12)
    r.raise_for_status()
    profile = requests.patch(f"{base}/rest/v1/profiles?id=eq.{user_id}",
                             headers={**headers, "Prefer": "return=minimal"}, json={"plan": plan}, timeout=12)
    profile.raise_for_status()


@router.post("/webhook")
async def stripe_webhook(request: Request):
    secret = os.getenv("STRIPE_WEBHOOK_SECRET", "").strip()
    base = os.getenv("SUPABASE_URL", "").strip().rstrip("/")
    admin = os.getenv("SUPABASE_ADMIN_KEY", "").strip()
    if not secret or not base or not admin:
        raise HTTPException(status_code=503, detail="Stripe webhook veya Supabase sunucu yapılandırması eksik.")
    body = await request.body()
    signature = request.headers.get("stripe-signature", "")
    if not _verify_signature(body, signature, secret):
        raise HTTPException(status_code=400, detail="Geçersiz veya süresi dolmuş Stripe imzası.")
    import json
    try:
        event = json.loads(body)
        event_type = event["type"]
        obj = event["data"]["object"]
    except (ValueError, KeyError, TypeError) as exc:
        raise HTTPException(status_code=400, detail="Geçersiz Stripe event gövdesi.") from exc

    user_id = None
    customer = obj.get("customer")
    subscription_id = obj.get("subscription") if event_type.startswith("checkout.session") else obj.get("id")
    status = obj.get("status", "inactive")
    price_id = None
    period_end = obj.get("current_period_end")
    if event_type == "checkout.session.completed":
        user_id = (obj.get("metadata") or {}).get("user_id") or obj.get("client_reference_id")
        subscription_id = obj.get("subscription")
        # Checkout may complete before the subscription update event; retrieve canonical state.
        if subscription_id:
            key = os.getenv("STRIPE_SECRET_KEY", "").strip()
            if key:
                try:
                    sub_response = requests.get(f"https://api.stripe.com/v1/subscriptions/{subscription_id}",
                                                auth=(key, ""), timeout=12)
                    sub_response.raise_for_status()
                    sub = sub_response.json()
                    status = sub.get("status", status)
                    period_end = sub.get("current_period_end", period_end)
                    items = (sub.get("items") or {}).get("data") or []
                    price_id = ((items[0].get("price") or {}).get("id") if items else None)
                    user_id = user_id or (sub.get("metadata") or {}).get("user_id")
                except requests.RequestException as exc:
                    raise HTTPException(status_code=502, detail="Stripe abonelik doğrulaması yapılamadı.") from exc
    elif event_type.startswith("customer.subscription."):
        user_id = (obj.get("metadata") or {}).get("user_id")
        items = (obj.get("items") or {}).get("data") or []
        price_id = ((items[0].get("price") or {}).get("id") if items else None)
    elif event_type == "customer.subscription.deleted":
        user_id = (obj.get("metadata") or {}).get("user_id")
        status = "canceled"

    if user_id and subscription_id and event_type in {
        "checkout.session.completed", "customer.subscription.created",
        "customer.subscription.updated", "customer.subscription.deleted",
    }:
        try:
            _persist_subscription(base, admin, str(user_id), customer, str(subscription_id),
                                  str(status), price_id, int(period_end) if period_end else None)
        except requests.RequestException as exc:
            raise HTTPException(status_code=503, detail="Abonelik durumu veritabanına yazılamadı; Stripe yeniden deneyebilir.") from exc
    return {"received": True, "event_type": event_type}
