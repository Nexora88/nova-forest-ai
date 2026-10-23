from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]

def read(path):
    return (ROOT / path).read_text(encoding="utf-8")

def test_map_has_dark_brand_and_dismissible_detail_controls():
    page = read("pages/map.html")
    script = read("js/map.js")
    css = read("css/risk-map-premium.css")
    assert "nexora-wildfire-logo-fallback.svg" in page
    assert "provider-status.js" not in page
    assert 'data-action="close"' in script
    assert "data-close-map-popup" in script
    assert "max-height:min(56dvh" in css or "max-height:56dvh" in css

def test_bee_dashboard_can_request_real_role_agents():
    page = read("pages/bee.html")
    script = read("js/nova-bee.js")
    api = read("backend/app/api/copilot_routes.py")
    assert 'id="run-ai-agents"' in page
    assert '"/copilot/daily-report"' in script
    assert 'NEXORA_AGRO_MODEL' in read("backend/app/services/agent_service.py")
    assert '@router.post("/daily-report")' in api

def test_provider_integrations_are_explicitly_gated():
    main = read("backend/app/main.py")
    env = read("backend/.env.example")
    migration = read("supabase/migrations/20261023090000_provider_integrations.sql")
    compose = read("backend/compose.worker.yml")
    assert "copilot_router" in main and "billing_router" in main and "message_router" in main
    assert "STRIPE_WEBHOOK_SECRET" in env and "TWILIO_VERIFY_SERVICE_SID" in env
    assert "nexorawildfire_message_subscriptions" in migration
    assert "notification-scheduler" in compose
