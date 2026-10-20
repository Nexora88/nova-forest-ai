from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class NexoraInsightContractTests(unittest.TestCase):
    def test_bilingual_workspace_and_transparency(self):
        page = (ROOT / "pages/insight-ai.html").read_text(encoding="utf-8")
        self.assertIn("data-i18n", page)
        self.assertIn("Nexora Insight AI", page)
        self.assertIn("not a trained foundation model", page)
        self.assertIn('id="insightMap"', page)

    def test_engine_uses_existing_api_and_does_not_fake_missing_weather(self):
        js = (ROOT / "js/nexora-insight-engine.js").read_text(encoding="utf-8")
        self.assertIn('getJson("/risk-analysis")', js)
        self.assertIn("missingWeather", js)
        self.assertIn("No usable measurements", js)
        self.assertIn("scoreValid", js)

    def test_engine_documented_in_both_languages(self):
        doc = (ROOT / "docs/NEXORA_INSIGHT_ENGINE.md").read_text(encoding="utf-8")
        self.assertIn("not a trained", doc)
        self.assertIn("eğitilmiş bir makine öğrenmesi modeli değildir", doc)

    def test_app_shell_caches_workspace_and_engine(self):
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('"./pages/insight-ai.html"', sw)
        self.assertIn('"./js/nexora-insight-engine.js"', sw)

    def test_homepage_links_to_insight_ai(self):
        home = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('href="pages/insight-ai.html"', home)

    def test_map_and_satellite_show_live_model_readiness(self):
        engine = (ROOT / "js/nexora-insight-engine.js").read_text(encoding="utf-8")
        satellite = (ROOT / "pages/satellite.html").read_text(encoding="utf-8")
        map_page = (ROOT / "pages/map.html").read_text(encoding="utf-8")
        self.assertIn('"/ml/status"', engine)
        self.assertIn('"/ml/research-status"', engine)
        self.assertIn('id="satelliteMlStatus"', satellite)
        self.assertIn('href="insight-ai.html"', satellite)
        self.assertIn('href="insight-ai.html"', map_page)


if __name__ == "__main__":
    unittest.main()


def test_trakya_weather_panel_uses_live_provider_and_never_fakes_values():
    source = (ROOT / "js/weather.js").read_text(encoding="utf-8")
    page = (ROOT / "pages/weather.html").read_text(encoding="utf-8")
    for region in ("Edirne", "Kırklareli", "Tekirdağ"):
        assert region in source
    assert "api.open-meteo.com/v1/forecast" in source
    assert "Veri alınamadı" in source
    assert "weather.js" in page


def test_map_has_live_nasa_firms_overlay_and_source_disclaimer():
    source = (ROOT / "js/thrace-hotspots.js").read_text(encoding="utf-8")
    page = (ROOT / "pages/map.html").read_text(encoding="utf-8")
    assert "/satellite/firms?" in source
    assert 'days:"1"' in source
    assert 'fillColor:"#ef4444"' in source
    assert "doğrulanmış yangın kaydı değildir" in source
    assert "thrace-hotspots.js" in page


def test_field_pilot_material_does_not_claim_official_validation():
    doc = (ROOT / "docs/THRACE_FIELD_PILOT.md").read_text(encoding="utf-8")
    assert "resmî yangın uyarısı" in doc
    assert "İzin verilmeden" in doc
