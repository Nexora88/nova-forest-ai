from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]

class NovaCoreContractTests(unittest.TestCase):
    def test_dashboard_mounts_original_bilingual_engine(self):
        html = (ROOT / "index.html").read_text(encoding="utf-8")
        self.assertIn('id="nova-core-ai"', html)
        self.assertIn("nova-intelligence.js", html)
        self.assertIn("nova-intelligence.css", html)

    def test_engine_uses_real_sources_and_explains_limitations(self):
        js = (ROOT / "js/nova-intelligence.js").read_text(encoding="utf-8")
        self.assertIn("api.open-meteo.com", js)
        self.assertIn("/environment/region/Edirne", js)
        self.assertIn("/ndvi/status/Edirne", js)
        self.assertIn("/ml/status", js)
        self.assertIn("/ml/yolo/status", js)
        self.assertIn("not a trained model", js)
        self.assertIn('language = "tr"', js)
        self.assertIn("en: {", js)
        self.assertIn("missing measurements", js)

    def test_service_worker_caches_engine_assets(self):
        sw = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn("./js/nova-intelligence.js?v=20261020a", sw)
        self.assertIn("./css/nova-intelligence.css?v=20261020a", sw)

if __name__ == "__main__":
    unittest.main()
