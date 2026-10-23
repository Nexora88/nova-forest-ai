import os
from unittest.mock import Mock
from app.services import agent_service

def test_agent_reports_missing_configuration(monkeypatch):
    for key in ("AI_API_KEY","AI_API_BASE_URL","NEXORA_AGRO_MODEL"):
        monkeypatch.delenv(key, raising=False)
    result=agent_service.run_agent("agro","system",{"temperature":20})
    assert result["status"]=="not_configured"
    assert result["output"] is None

def test_agent_calls_configured_openai_compatible_endpoint(monkeypatch):
    monkeypatch.setenv("AI_API_KEY","test-secret")
    monkeypatch.setenv("AI_API_BASE_URL","https://ai.example/v1")
    monkeypatch.setenv("NEXORA_AGRO_MODEL","agro-model")
    response=Mock()
    response.raise_for_status.return_value=None
    response.json.return_value={"choices":[{"message":{"content":"Veriye dayalı sonuç"}}]}
    called={}
    def fake_post(url,**kwargs):
        called["url"]=url
        called["payload"]=kwargs["json"]
        return response
    monkeypatch.setattr(agent_service.requests,"post",fake_post)
    result=agent_service.run_agent("agro","Yalnızca kanıtı kullan",{"area":"Edirne"})
    assert result["status"]=="available"
    assert result["output"]=="Veriye dayalı sonuç"
    assert called["url"]=="https://ai.example/v1/chat/completions"
    assert called["payload"]["model"]=="agro-model"

def test_agent_sanitizes_provider_errors(monkeypatch):
    monkeypatch.setenv("AI_API_KEY","test-secret")
    monkeypatch.setenv("AI_API_BASE_URL","https://ai.example/v1")
    monkeypatch.setenv("NEXORA_ECO_MODEL","eco-model")
    def fail(*args,**kwargs):
        raise agent_service.requests.Timeout()
    monkeypatch.setattr(agent_service.requests,"post",fail)
    result=agent_service.run_agent("eco","system",{})
    assert result["status"]=="error"
    assert result["error_type"]=="Timeout"
    assert result["output"] is None
