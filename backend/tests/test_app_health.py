from fastapi.testclient import TestClient
from app.main import app


def test_health_endpoint_and_api_prefix_are_healthy():
    with TestClient(app) as client:
        direct = client.get("/health")
        prefixed = client.get("/api/health")

    assert direct.status_code == 200
    assert direct.json()["status"] == "healthy"
    assert prefixed.status_code == 200
    assert prefixed.json()["status"] == "healthy"


def test_security_headers_and_cors_are_applied():
    with TestClient(app) as client:
        response = client.get("/health", headers={"Origin": "https://nexora88.github.io"})
        preflight = client.options(
            "/api/health",
            headers={
                "Origin": "https://nexora88.github.io",
                "Access-Control-Request-Method": "GET",
            },
        )

    assert response.status_code == 200
    assert response.headers.get("x-content-type-options") == "nosniff"
    assert response.headers.get("access-control-allow-origin") == "https://nexora88.github.io"
    assert preflight.status_code == 200
    assert preflight.headers.get("access-control-allow-origin") == "https://nexora88.github.io"
