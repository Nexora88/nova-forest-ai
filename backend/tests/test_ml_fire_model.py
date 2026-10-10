from app.engine import ml_fire_model


def test_missing_artifact_is_reported_as_not_trained(tmp_path, monkeypatch):
    monkeypatch.setattr(ml_fire_model, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(ml_fire_model, "METADATA_PATH", tmp_path / "missing.json")

    result = ml_fire_model.model_status()

    assert result["status"] == "not_trained"
    assert result["artifact_present"] is False
    assert result["model_type"] == "RandomForestClassifier"


def test_prediction_fails_closed_when_model_is_not_trained(tmp_path, monkeypatch):
    monkeypatch.setattr(ml_fire_model, "MODEL_PATH", tmp_path / "missing.joblib")
    monkeypatch.setattr(ml_fire_model, "METADATA_PATH", tmp_path / "missing.json")

    try:
        ml_fire_model.predict({feature: 0.0 for feature in ml_fire_model.FEATURES})
    except RuntimeError as exc:
        assert "eğitilmemiş" in str(exc)
    else:
        raise AssertionError("Prediction must not silently fall back to a heuristic score.")


def test_invalid_metadata_is_not_reported_as_ready(tmp_path, monkeypatch):
    artifact = tmp_path / "fire_risk.joblib"
    metadata = tmp_path / "fire_risk_metadata.json"
    artifact.write_bytes(b"placeholder")
    metadata.write_text("{not-json", encoding="utf-8")
    monkeypatch.setattr(ml_fire_model, "MODEL_PATH", artifact)
    monkeypatch.setattr(ml_fire_model, "METADATA_PATH", metadata)

    result = ml_fire_model.model_status()

    assert result["status"] == "artifact_invalid"
    assert result["artifact_present"] is True
