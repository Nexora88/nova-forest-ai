from unittest.mock import patch

import pytest

from app.services.agent_service import AgentConfigurationError, generate_copilot_report


CONTEXT = {
    "area_name": "Test Arılığı",
    "area_type": "apiary",
    "location": {"lat": 41.2, "lon": 27.1},
    "weather": {"temperature": 18, "wind": 7, "precipitation": 0},
    "satellite": {"status": "not_available"},
}


def test_missing_provider_configuration_fails_closed(monkeypatch):
    for key in (
        "NEXORA_AI_BASE_URL", "NEXORA_AI_API_KEY", "AI_API_KEY",
        "AGRO_AGENT_MODEL", "ECO_AGENT_MODEL", "WRITER_AGENT_MODEL",
    ):
        monkeypatch.delenv(key, raising=False)
    with pytest.raises(AgentConfigurationError):
        generate_copilot_report(CONTEXT)


def test_three_configured_models_are_called_separately(monkeypatch):
    monkeypatch.setenv("NEXORA_AI_BASE_URL", "https://ai.example.invalid/v1")
    monkeypatch.setenv("NEXORA_AI_API_KEY", "test-secret")
    monkeypatch.setenv("AGRO_AGENT_MODEL", "agro-test-model")
    monkeypatch.setenv("ECO_AGENT_MODEL", "eco-test-model")
    monkeypatch.setenv("WRITER_AGENT_MODEL", "writer-test-model")
    with patch("app.services.agent_service._call_model") as call:
        call.side_effect = lambda base, key, model, timeout, system, payload: {
            "agro-test-model": "Agro analizi",
            "eco-test-model": "Eco analizi",
            "writer-test-model": "Günlük saha raporu",
        }[model]
        result = generate_copilot_report(CONTEXT)
    assert result["status"] == "complete"
    assert result["report"] == "Günlük saha raporu"
    assert result["agents"]["agro"]["analysis"] == "Agro analizi"
    assert result["agents"]["eco"]["analysis"] == "Eco analizi"
    assert {call_args.args[2] for call_args in call.call_args_list} == {
        "agro-test-model", "eco-test-model", "writer-test-model"
    }
