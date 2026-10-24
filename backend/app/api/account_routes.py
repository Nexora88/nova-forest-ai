"""Authenticated account usage, plan limits, and server-side quota reservations."""
from __future__ import annotations

import os
import uuid
from datetime import datetime, timezone
import requests
from fastapi import APIRouter, Header, HTTPException
from app.api.jobs_routes import _authenticated_user

router = APIRouter(prefix="/account", tags=["Account & plans"])


def _config():
    url = os.getenv("SUPABASE_URL", "").rstrip("/")
    key = os.getenv("SUPABASE_ADMIN_KEY", "")
    if not url or not key:
        raise HTTPException(status_code=503, detail="Hesap kullanım servisi henüz yapılandırılmadı.")
    return url, key


def _headers(key: str):
    return {"apikey": key, "Authorization": f"Bearer {key}", "Content-Type": "application/json"}


def reserve_usage(user_id: str, feature: str, request_id: str) -> dict:
    url, key = _config()
    try:
        response = requests.post(
            f"{url}/rest/v1/rpc/consume_nexorawildfire_usage",
            headers=_headers(key),
            json={"p_user_id": user_id, "p_feature": feature, "p_request_id": request_id},
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Kota servisine ulaşılamıyor; analiz güvenli biçimde başlatılmadı.")
    if response.status_code >= 400:
        raise HTTPException(status_code=503, detail="Kota kontrolü başarısız oldu; analiz başlatılmadı.")
    data = response.json()
    if not data.get("allowed"):
        raise HTTPException(status_code=429, detail={
            "code": "monthly_analysis_limit_reached",
            "message": "Bu ayki analiz limitine ulaştın. Sonraki dönemde limit sıfırlanır; ücretli planlar henüz satın alınabilir durumda değildir.",
            "plan": data.get("plan", "free"),
            "used": data.get("used", 0),
            "limit": data.get("limit", 5),
            "resets_at": data.get("resets_at"),
        })
    return data


def release_usage(user_id: str, request_id: str) -> None:
    try:
        url, key = _config()
        requests.post(
            f"{url}/rest/v1/rpc/release_nexorawildfire_usage",
            headers=_headers(key),
            json={"p_user_id": user_id, "p_request_id": request_id},
            timeout=5,
        )
    except Exception:
        # Best-effort release; the usage ledger remains auditable if the DB is unavailable.
        pass


@router.get("/usage")
def account_usage(authorization: str | None = Header(default=None)):
    user_id = _authenticated_user(authorization)
    url, key = _config()
    headers = {**_headers(key), "Prefer": "count=exact"}
    start = datetime.now(timezone.utc).replace(day=1, hour=0, minute=0, second=0, microsecond=0).isoformat()
    try:
        profile_r = requests.get(
            f"{url}/rest/v1/profiles",
            headers=headers,
            params={"id": f"eq.{user_id}", "select": "plan,full_name,role"},
            timeout=8,
        )
        usage_r = requests.get(
            f"{url}/rest/v1/nexorawildfire_usage_events",
            headers=headers,
            params={"user_id": f"eq.{user_id}", "created_at": f"gte.{start}", "select": "credits,feature,created_at"},
            timeout=8,
        )
        areas_r = requests.get(
            f"{url}/rest/v1/nexorawildfire_areas",
            headers={**_headers(key), "Prefer": "count=exact", "Range": "0-0"},
            params={"user_id": f"eq.{user_id}", "select": "id"},
            timeout=8,
        )
    except requests.RequestException:
        raise HTTPException(status_code=503, detail="Hesap kullanım verisi alınamadı.")
    if any(r.status_code >= 400 for r in (profile_r, usage_r, areas_r)):
        raise HTTPException(status_code=503, detail="Hesap kullanım sorgusu başarısız oldu.")
    profile_rows = profile_r.json()
    plan = (profile_rows[0].get("plan") if profile_rows else "free") or "free"
    limits = {"free": 5, "pro": 100, "enterprise": 1000}
    limit = limits.get(plan, limits["free"])
    events = usage_r.json()
    used = sum(int(e.get("credits") or 0) for e in events)
    content_range = areas_r.headers.get("content-range", "")
    try:
        area_count = int(content_range.rsplit("/", 1)[1])
    except (ValueError, IndexError):
        area_count = len(areas_r.json())
    return {
        "plan": plan,
        "usage": {"used": used, "limit": limit, "remaining": max(0, limit - used), "period_start": start},
        "assets": {"saved_areas": area_count},
        "tiers": [
            {"id": "free", "name": "Pilot", "price": None, "price_label": "Ücretsiz pilot", "monthly_analyses": 5, "api_access": False},
            {"id": "pro", "name": "Pro", "price": None, "price_label": "Fiyatlandırma sonra açıklanacak", "monthly_analyses": 100, "api_access": "planned"},
            {"id": "enterprise", "name": "Enterprise", "price": None, "price_label": "Kurumsal teklif", "monthly_analyses": 1000, "api_access": "approval_required"},
        ],
        "billing": {
            "enabled": all(os.getenv(k, "").strip() for k in (
                "STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID", "STRIPE_WEBHOOK_SECRET",
                "SUPABASE_URL", "SUPABASE_ADMIN_KEY", "NEXORA_BILLING_SUCCESS_URL", "NEXORA_BILLING_CANCEL_URL",
            )),
            "provider": "Stripe Checkout",
            "message": "Stripe aboneliği yapılandırıldı." if all(os.getenv(k, "").strip() for k in (
                "STRIPE_SECRET_KEY", "STRIPE_PRO_PRICE_ID", "STRIPE_WEBHOOK_SECRET",
                "SUPABASE_URL", "SUPABASE_ADMIN_KEY", "NEXORA_BILLING_SUCCESS_URL", "NEXORA_BILLING_CANCEL_URL",
            )) else "Ödeme sağlayıcısı ve fiyat kimliği yapılandırılmadı; hiçbir ücret tahsil edilmiyor.",
        },
        "source": "supabase",
    }
