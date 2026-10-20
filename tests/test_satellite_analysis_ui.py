from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def test_satellite_area_ui_calls_real_copernicus_timeseries_endpoint():
    page = (ROOT / "pages/satellite.html").read_text(encoding="utf-8")
    script = (ROOT / "js/satellite-analysis.js").read_text(encoding="utf-8")
    assert 'data-area-map' in page
    assert 'data-run-analysis' in page
    assert '"/ndvi/area-timeseries"' in script
    assert 'type: "Polygon", coordinates: [ring]' in script
    assert 'ring.push([...ring[0]])' in script


def test_satellite_ui_does_not_claim_unavailable_models_are_real_ai():
    script = (ROOT / "js/satellite-analysis.js").read_text(encoding="utf-8")
    assert '"/ml/status"' in script
    assert '"/ml/yolo/status"' in script
    assert 'model' in script.lower()
    assert 'bilimsel doğrulama' in script.lower()


def test_satellite_analysis_module_is_in_offline_shell():
    worker = (ROOT / "sw.js").read_text(encoding="utf-8")
    assert '"./js/satellite-analysis.js?v=20261020a"' in worker
