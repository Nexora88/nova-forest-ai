"""Smoke tests for mounted API routes; these checks do not call live providers."""
from app.main import app


def test_live_regions_endpoint_is_registered():
    paths = set(app.openapi()['paths'])
    assert "/regions" in paths


def test_health_and_satellite_diagnostics_remain_registered():
    paths = set(app.openapi()['paths'])
    assert "/health" in paths
    assert any(path.endswith("/live-check") for path in paths)
