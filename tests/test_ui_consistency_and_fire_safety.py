from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class UiConsistencyAndFireSafetyTests(unittest.TestCase):
    def test_firms_alert_is_dismissible_and_has_a_map_drilldown(self):
        source = (ROOT / "js" / "live-risk-raster.js").read_text(encoding="utf-8")
        self.assertIn('data-incident-close', source)
        self.assertIn('data-incident-details', source)
        self.assertIn('observed_at_utc', source)
        self.assertIn('Haritada konumu aç', source)
        self.assertIn('kesin yangın doğrulaması', source.lower())

    def test_firms_alert_scope_is_limited_to_five_pilot_provinces(self):
        source = (ROOT / "js" / "live-risk-raster.js").read_text(encoding="utf-8")
        for province in ("Edirne", "Tekirdağ", "Kırklareli", "Çanakkale", "İstanbul"):
            self.assertIn(province, source)
        self.assertIn('normalized.startsWith("istanbul")', source)

    def test_backend_exposes_safe_hotspot_location_and_source_time(self):
        source = (ROOT / "backend" / "app" / "api" / "risk_routes.py").read_text(encoding="utf-8")
        self.assertIn('"nearby_hotspots_24h"', source)
        self.assertIn('"latitude": alert["latitude"]', source)
        self.assertIn('"longitude": alert["longitude"]', source)
        self.assertIn('"observed_at_utc"', source)

    def test_shared_footer_uses_one_project_credit_in_both_languages(self):
        source = (ROOT / "js" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("Independent project · Developed by Ahmet Eymen Bakraç · Nexora88", source)
        self.assertIn("Bağımsız proje · Geliştirici: Ahmet Eymen Bakraç · Nexora88", source)

    def test_wind_scenario_is_not_misrepresented_as_official_fire_or_evacuation_model(self):
        page = (ROOT / "pages" / "map.html").read_text(encoding="utf-8")
        source = (ROOT / "js" / "fire-safety-sim.js").read_text(encoding="utf-8")
        self.assertIn("data-fire-safety-sim", page)
        self.assertIn("does not calculate fire spread", source)
        self.assertIn("official", source.lower())
        self.assertIn("Resmî uyarı ve acil durum ekiplerinin talimatları önceliklidir", page)

    def test_pwa_cache_shell_was_bumped_for_ui_assets(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('nexorawildfire-shell-v26', source)
        self.assertIn('nexorawildfire-data-v26', source)
        self.assertIn('fire-safety-sim.js?v=20261022a', source)


if __name__ == "__main__":
    unittest.main()
