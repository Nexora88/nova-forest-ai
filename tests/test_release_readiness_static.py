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
        self.assertIn('const CACHE_NAME = "nexorawildfire-shell-v44";', source)
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

    def test_nova_farm_is_separate_and_precached(self):
        source = (ROOT / "pages" / "farm.html").read_text(encoding="utf-8")
        self.assertIn("Nova Farm", source)
        self.assertIn("nova-farm.js", source)
        self.assertIn("nova-farm.css", source)
        worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('"./pages/farm.html"', worker)
        self.assertIn('"./js/nova-farm.js?v=20261115b"', worker)

    def test_atmosphere_uses_keyless_open_meteo_and_truthful_pollen_fallback(self):
        source = (ROOT / "js" / "weather.js").read_text(encoding="utf-8")
        self.assertIn("air-quality-api.open-meteo.com", source)
        self.assertIn("Mevsim dışı veya kapsam dışı; sıfır değildir", source)
        self.assertNotIn("api_key", source.lower())

    def test_map_pollen_missing_data_is_not_zero(self):
        source = (ROOT / "js" / "map.js").read_text(encoding="utf-8")
        self.assertIn("values.length?Math.max(...values):null", source)
        self.assertIn('mode==="pollen"&&r.pollen==null', source)

    def test_map_controls_do_not_overlay_the_map(self):
        source = (ROOT / "css" / "risk-map-premium.css").read_text(encoding="utf-8")
        self.assertIn(".map-section .map-filters{position:relative!important", source)
        self.assertIn("grid-template-columns:repeat(2,minmax(0,1fr))", source)

    def test_primary_area_is_shared_by_farm_bee_and_personal_brief(self):
        farm = (ROOT / "js" / "nova-farm.js").read_text(encoding="utf-8")
        bee = (ROOT / "js" / "nova-bee.js").read_text(encoding="utf-8")
        brief = (ROOT / "js" / "personal-field-brief.js").read_text(encoding="utf-8")
        shared_key = "nexorawildfire-primary-area-v1"
        for source in (farm, bee, brief):
            self.assertIn(shared_key, source)
        self.assertIn("nexorawildfire-home-v1", farm)
        self.assertIn("nexorawildfire-home-v1", bee)

    def test_sentinel_empty_timeseries_is_not_reported_as_available(self):
        source = (ROOT / "backend" / "app" / "services" / "ndvi_service.py").read_text(encoding="utf-8")
        self.assertIn('"status": "no_observations"', source)
        self.assertIn("Bu durum sıfır NDVI anlamına gelmez", source)
        self.assertIn('"status":"available"', source)

    def test_map_provider_panel_probes_credentials_without_exposing_them(self):
        source = (ROOT / "js" / "provider-status.js").read_text(encoding="utf-8")
        route = (ROOT / "backend" / "app" / "api" / "satellite_routes.py").read_text(encoding="utf-8")
        self.assertIn("/satellite/providers/status?probe=true", source)
        self.assertIn("nova-forest-ai.vercel.app/api", source)
        self.assertIn("FIRMS_MAP_KEY", route)
        self.assertIn("CDSE_CLIENT_SECRET", route)
        self.assertIn('"secret_exposed": False', route)
        self.assertIn("NASA FIRMS anahtarı kabul edildi", source)
        self.assertIn("Copernicus erişim belirteci alındı", source)

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
        self.assertIn('["pages/bee.html", "Nova Bee", "Nova Bee"]', source)

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
