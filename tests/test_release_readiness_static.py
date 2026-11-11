"""Static regression checks for honest offline status and controlled PWA updates."""
from pathlib import Path
import unittest

ROOT = Path(__file__).resolve().parents[1]


class ReleaseReadinessStaticTests(unittest.TestCase):
    def test_network_banner_does_not_claim_providers_are_live(self):
        source = (ROOT / "js" / "offline.js").read_text(encoding="utf-8")
        self.assertIn("sağlayıcılarının durumu ayrıca doğrulanmalıdır", source)
        self.assertIn("canlı veriler güncel olmayabilir", source)
        self.assertNotIn("Canlı veri ve yerel depo aktif", source)
        self.assertNotIn("Yerel karar motoru ve son veriler aktif", source)

    def test_network_banner_is_accessible(self):
        source = (ROOT / "js" / "offline.js").read_text(encoding="utf-8")
        self.assertIn('setAttribute("role","status")', source)
        self.assertIn('setAttribute("aria-live","polite")', source)

    def test_special_day_uses_turkey_timezone_and_correct_bee_day_date(self):
        source = (ROOT / "js" / "special-days.js").read_text(encoding="utf-8")
        self.assertIn("timeZone:'Europe/Istanbul'", source)
        self.assertIn("{m:5,d:20,k:'bee',title:'Dünya Arıcılık Günü'", source)
        self.assertNotIn("{m:3,d:20,k:'bee',title:'Dünya Arıcılık Günü'", source)

    def test_special_day_sources_are_linked_and_dates_use_turkey_timezone(self):
        source = (ROOT / "js" / "special-days.js").read_text(encoding="utf-8")
        self.assertIn("timeZone:'Europe/Istanbul'", source)
        self.assertIn("const SOURCES=", source)
        self.assertIn("https://www.fao.org/world-bee-day/en", source)
        self.assertIn("https://www.tarimorman.gov.tr/Haber/7071/", source)
        self.assertIn("special-source", source)

    def test_service_worker_cache_version_is_bumped(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('const CACHE_NAME = "nexorawildfire-shell-v40";', source)
        self.assertIn('const DATA_CACHE = "nexorawildfire-data-v40";', source)

    def test_service_worker_does_not_force_activate_updated_worker(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertNotIn(".then(() => self.skipWaiting())", source)
        self.assertIn('if (event.data === "SKIP_WAITING") self.skipWaiting();', source)


if __name__ == "__main__":
    unittest.main()
