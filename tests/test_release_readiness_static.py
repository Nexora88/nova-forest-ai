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
        self.assertIn('const CACHE_NAME = "nexorawildfire-shell-v41";', source)
        self.assertIn('const DATA_CACHE = "nexorawildfire-data-v40";', source)

    def test_service_worker_has_offline_landing_and_exact_page_fallback(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('"./offline.html"', source)
        self.assertIn('caches.match("./offline.html")', source)
        self.assertIn('caches.match(request)', source)

    def test_provider_cache_marks_stale_data_and_does_not_fake_success(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('X-Nexora-Stale', source)
        self.assertIn('status:503', source)
        self.assertIn('response.status === 429 || response.status >= 500', source)

    def test_offline_banner_explains_stale_provider_data_age(self):
        source = (ROOT / "js" / "offline.js").read_text(encoding="utf-8")
        self.assertIn('X-Nexora-Stale', source)
        self.assertIn('X-Nexora-Stale-Age-Ms', source)
        self.assertIn('son geçerli sağlayıcı verisi', source.lower())

    def test_offline_landing_supports_both_languages(self):
        source = (ROOT / "offline.html").read_text(encoding="utf-8")
        self.assertIn('const en=', source)
        self.assertIn('const tr=', source)
        self.assertIn('id="language"', source)

    def test_nova_bee_is_reachable_from_shared_mobile_navigation(self):
        source = (ROOT / "js" / "mobile-nav.js").read_text(encoding="utf-8")
        self.assertIn('["pages/bee.html", "Nova Bee & Tarım", "Nova Bee & Agriculture"]', source)

    def test_shared_shell_uses_official_horizontal_wordmark(self):
        source = (ROOT / "js" / "unified-shell.js").read_text(encoding="utf-8")
        styles = (ROOT / "css" / "unified-shell.css").read_text(encoding="utf-8")
        self.assertIn('nexora-wildfire-official.webp', source)
        self.assertIn('brand-wordmark', source)
        self.assertIn('.nova-account-dock{display:none!important}', styles)

    def test_service_worker_does_not_force_activate_updated_worker(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertNotIn(".then(() => self.skipWaiting())", source)
        self.assertIn('if (event.data === "SKIP_WAITING") self.skipWaiting();', source)


if __name__ == "__main__":
    unittest.main()
