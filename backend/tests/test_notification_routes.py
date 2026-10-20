import asyncio

from fastapi.testclient import TestClient

from app.main import app
from app.api import notification_routes


def test_cron_rejects_missing_or_invalid_secret(monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "")
    with TestClient(app) as client:
        missing = client.get("/notifications/cron")
    assert missing.status_code == 503

    monkeypatch.setenv("CRON_SECRET", "expected-secret")
    with TestClient(app) as client:
        invalid = client.get("/notifications/cron", headers={"Authorization": "Bearer wrong"})
    assert invalid.status_code == 401


def test_cron_runs_cycle_only_with_matching_secret(monkeypatch):
    monkeypatch.setenv("CRON_SECRET", "expected-secret")
    monkeypatch.setattr(notification_routes, "configured", lambda: True)

    async def fake_cycle():
        return {"status": "completed", "checked": 1, "delivered": 1, "failed": 0, "skipped": 0}

    monkeypatch.setattr(notification_routes, "background_push_cycle", fake_cycle)
    with TestClient(app) as client:
        response = client.get("/api/notifications/cron", headers={"Authorization": "Bearer expected-secret"})

    assert response.status_code == 200
    assert response.json()["delivered"] == 1


def test_live_evaluation_uses_reachable_critical_band(monkeypatch):
    monkeypatch.setattr(notification_routes, "get_current_weather", lambda lat, lon: {
        "status": "available",
        "temperature": 40,
        "humidity": 20,
        "wind": 40,
        "precipitation": 0,
        "observed_at": "2026-10-20T12:00",
        "missing_fields": [],
    })
    with TestClient(app) as client:
        response = client.post("/notifications/evaluate", json={
            "lat": 41.0, "lon": 28.9, "area_name": "Test alanı", "threshold": 70
        })

    assert response.status_code == 200
    payload = response.json()
    assert payload["risk"] == 80
    assert payload["level"] == "critical"
    assert payload["alert"] is True
