from typing import Literal

import requests
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

router = APIRouter(prefix="/feedback", tags=["feedback"])

SUPABASE_URL = __import__("os").getenv("SUPABASE_URL", "").rstrip("/")
SUPABASE_ADMIN_KEY = __import__("os").getenv("SUPABASE_ADMIN_KEY", "")


class FieldFeedback(BaseModel):
    audience: Literal["farmer", "beekeeper", "forestry", "researcher", "resident", "other"]
    region: str = Field(min_length=2, max_length=80)
    category: Literal["data_quality", "alert_quality", "usability", "missing_feature", "other"]
    usefulness: int = Field(ge=1, le=5)
    scenario: str = Field(min_length=10, max_length=1000)
    observed: str = Field(default="", max_length=1500)
    expected: str = Field(default="", max_length=1500)
    privacy_acknowledged: bool
    website: str = Field(default="", max_length=200)


@router.get("/status")
def feedback_status():
    configured = bool(SUPABASE_URL and SUPABASE_ADMIN_KEY)
    return {
        "status": "available" if configured else "not_configured",
        "submission_enabled": configured,
        "message": "Feedback is stored privately for product improvement; do not submit personal details or exact sensitive coordinates."
    }


@router.post("/submit", status_code=201)
def submit_field_feedback(payload: FieldFeedback):
    # Honeypot: accept bot-shaped submissions without writing them to the database.
    if payload.website.strip():
        return {"status": "accepted"}
    if not payload.privacy_acknowledged:
        raise HTTPException(status_code=422, detail="Geri bildirimin ürün geliştirme amacıyla kullanılmasını onaylamalısın.")
    if not SUPABASE_URL or not SUPABASE_ADMIN_KEY:
        raise HTTPException(status_code=503, detail="Geri bildirim sunucusu henüz yapılandırılmadı.")
    record = payload.model_dump(exclude={"website", "privacy_acknowledged"})
    try:
        response = requests.post(
            f"{SUPABASE_URL}/rest/v1/nexorawildfire_field_feedback",
            headers={
                "apikey": SUPABASE_ADMIN_KEY,
                "Authorization": f"Bearer {SUPABASE_ADMIN_KEY}",
                "Content-Type": "application/json",
                "Prefer": "return=minimal",
            },
            json=record,
            timeout=8,
        )
        response.raise_for_status()
    except requests.RequestException as exc:
        raise HTTPException(status_code=502, detail="Geri bildirim güvenli biçimde kaydedilemedi; lütfen daha sonra tekrar dene.") from exc
    return {"status": "received", "message": "Geri bildirimin alındı. Bu, bir saha görüşmesi yapıldığı anlamına gelmez."}
