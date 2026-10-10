from app.engine import uci_research_model


def test_missing_uci_artifact_is_reported_not_trained(tmp_path, monkeypatch):
    monkeypatch.setattr(uci_research_model, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(uci_research_model, "METADATA_PATH", tmp_path / "missing.json")
    result = uci_research_model.model_status()
    assert result["status"] == "not_trained"
    assert result["artifact_present"] is False


def test_uci_research_prediction_fails_closed_without_artifact(tmp_path, monkeypatch):
    monkeypatch.setattr(uci_research_model, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(uci_research_model, "METADATA_PATH", tmp_path / "missing.json")
    try:
        uci_research_model.predict({name: 1.0 for name in uci_research_model.FEATURES})
    except RuntimeError as exc:
        assert "not trained" in str(exc)
    else:
        raise AssertionError("Research predictions must not silently use a heuristic.")
