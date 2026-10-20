from fastapi.testclient import TestClient

from app.main import app
from app.api import feedback_routes


class FakeResponse:
    def __init__(self, status_code=201):
        self.status_code = status_code

    def raise_for_status(self):
        if self.status_code >= 400:
            raise RuntimeError("unexpected_status")


def test_feedback_status_is_explicit_when_storage_is_missing(monkeypatch):
    monkeypatch.setattr(feedback_routes, "SUPABASE_URL", "")
    monkeypatch.setattr(feedback_routes, "SUPABASE_ADMIN_KEY", "")
    with TestClient(app) as client:
        response = client.get("/feedback/status")
    assert response.status_code == 200
    assert response.json()["submission_enabled"] is False


def test_feedback_submission_is_stored_privately(monkeypatch):
    monkeypatch.setattr(feedback_routes, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(feedback_routes, "SUPABASE_ADMIN_KEY", "server-only-test-key")
    captured = {}

    def fake_post(url, **kwargs):
        captured["url"] = url
        captured["kwargs"] = kwargs
        return FakeResponse()

    monkeypatch.setattr(feedback_routes.requests, "post", fake_post)
    payload = {
        "audience": "beekeeper",
        "region": "Trakya",
        "category": "alert_quality",
        "usefulness": 4,
        "scenario": "Alarmın hangi sahaya ait olduğunu anlamak istiyorum.",
        "observed": "Uyarı metni genel kaldı.",
        "expected": "Alan adı ve veri zamanı görünmeli.",
        "privacy_acknowledged": True,
        "website": "",
    }
    with TestClient(app) as client:
        response = client.post("/feedback/submit", json=payload)

    assert response.status_code == 201
    assert response.json()["status"] == "received"
    assert captured["url"] == "https://example.supabase.co/rest/v1/nexorawildfire_field_feedback"
    assert captured["kwargs"]["json"]["region"] == "Trakya"
    assert "website" not in captured["kwargs"]["json"]
    assert "privacy_acknowledged" not in captured["kwargs"]["json"]
    assert captured["kwargs"]["headers"]["Authorization"] == "Bearer server-only-test-key"


def test_feedback_requires_privacy_acknowledgement(monkeypatch):
    monkeypatch.setattr(feedback_routes, "SUPABASE_URL", "https://example.supabase.co")
    monkeypatch.setattr(feedback_routes, "SUPABASE_ADMIN_KEY", "server-only-test-key")
    with TestClient(app) as client:
        response = client.post("/feedback/submit", json={
            "audience": "resident",
            "region": "Edirne",
            "category": "usability",
            "usefulness": 3,
            "scenario": "Haritadaki alanı telefondan takip etmek istiyorum.",
            "privacy_acknowledged": False,
        })
    assert response.status_code == 422
