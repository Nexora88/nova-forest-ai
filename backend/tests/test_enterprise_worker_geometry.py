from worker.tasks import extract_geometry, geometry_summary


def test_worker_extracts_feature_collection_and_computes_bbox():
    geometry = extract_geometry({
        "type": "FeatureCollection",
        "features": [
            {"type": "Feature", "geometry": {"type": "Polygon", "coordinates": [[
                [26.5, 41.5], [26.7, 41.5], [26.7, 41.7], [26.5, 41.5]
            ]]}, "properties": {}}
        ],
    })
    summary = geometry_summary(geometry)
    assert geometry["type"] == "Polygon"
    assert summary["bbox"] == [26.5, 41.5, 26.7, 41.7]
    assert 26.5 <= summary["longitude"] <= 26.7
    assert 41.5 <= summary["latitude"] <= 41.7


def test_worker_supports_line_and_point_geometry():
    line = extract_geometry({"type": "LineString", "coordinates": [[26.5, 41.5], [26.8, 41.8]]})
    summary = geometry_summary(line)
    assert summary["bbox"] == [26.5, 41.5, 26.8, 41.8]
    point = extract_geometry({"type": "Point", "coordinates": [26.55, 41.68]})
    assert geometry_summary(point)["latitude"] == 41.68


class FakeRedisStore:
    def __init__(self, values=None):
        self.values = dict(values or {})

    def setex(self, key, ttl, value):
        self.values[key] = value

    def get(self, key):
        return self.values.get(key)

    def delete(self, key):
        self.values.pop(key, None)


def test_ndvi_worker_job_is_queued_and_owner_scoped(monkeypatch):
    from worker import app as worker_app

    monkeypatch.setattr(worker_app, "_authorize", lambda *args: None)
    store = FakeRedisStore()
    monkeypatch.setattr(worker_app, "_redis", lambda: store)
    calls = {}
    monkeypatch.setattr(worker_app.build_ndvi_timeseries, "apply_async", lambda **kwargs: calls.update(kwargs))
    polygon = {"type": "Polygon", "coordinates": [[[26.5, 41.5], [26.7, 41.5], [26.7, 41.7], [26.5, 41.5]]]}
    job = worker_app.NDVIJob(user_id="user-1", geometry=polygon, days=180, interval="P30D")

    result = worker_app.enqueue_ndvi_timeseries(job, x_nexora_worker_token="secret", x_nexora_user_id="user-1")

    assert result["status"] == "queued"
    assert result["kind"] == "ndvi-timeseries"
    job_id = result["job_id"]
    assert store.get(worker_app._owner_key(job_id)) == "user-1"
    assert store.get(worker_app._kind_key(job_id)) == "ndvi-timeseries"
    assert calls["task_id"] == job_id
    assert calls["args"][1]["geometry"] == polygon


def test_ndvi_worker_status_returns_real_analysis_for_job_owner(monkeypatch):
    from worker import app as worker_app

    monkeypatch.setattr(worker_app, "_authorize", lambda *args: None)
    store = FakeRedisStore({
        worker_app._owner_key("job-1"): "user-1",
        worker_app._kind_key("job-1"): "ndvi-timeseries",
    })
    monkeypatch.setattr(worker_app, "_redis", lambda: store)

    class CompletedResult:
        state = "SUCCESS"
        result = {"kind": "ndvi-timeseries", "analysis": {"status": "not_configured", "ndvi_ndmi": {"series": []}}, "completed_at": "2026-10-11T00:00:00Z"}

    monkeypatch.setattr(worker_app, "AsyncResult", lambda job_id, app: CompletedResult())
    result = worker_app.report_status("job-1", user_id="user-1", x_nexora_worker_token="secret", x_nexora_user_id="user-1")

    assert result["status"] == "completed"
    assert result["kind"] == "ndvi-timeseries"
    assert result["analysis"]["status"] == "not_configured"


def test_ndvi_worker_rejects_non_polygon_geometry(monkeypatch):
    import pytest
    from fastapi import HTTPException
    from worker import app as worker_app

    monkeypatch.setattr(worker_app, "_authorize", lambda *args: None)
    job = worker_app.NDVIJob(user_id="user-1", geometry={"type": "Point", "coordinates": [26.5, 41.5]})
    with pytest.raises(HTTPException) as error:
        worker_app.enqueue_ndvi_timeseries(job, x_nexora_worker_token="secret", x_nexora_user_id="user-1")
    assert error.value.status_code == 422
