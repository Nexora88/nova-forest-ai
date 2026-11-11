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

    def test_firms_alert_is_in_map_flow_and_dismissal_is_scoped_to_signal(self):
        source = (ROOT / "js" / "live-risk-raster.js").read_text(encoding="utf-8")
        self.assertIn('const toolbar=document.querySelector(".map-toolbar")', source)
        self.assertIn('toolbar.after(b)', source)
        self.assertIn('sessionStorage.setItem("nova-dismissed-firms:"+signature,"1")', source)
        self.assertIn('b?.classList.toggle(\'show\',!dismissed)', source)
        self.assertIn("Source observation", (ROOT / "js" / "i18n.js").read_text(encoding="utf-8"))

    def test_feedback_translation_and_footer_cannot_be_retranslated_by_observer(self):
        source = (ROOT / "js" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn('["Çevresel verileri daha kullanışlı hâle getirmemize yardım et.","Help make environmental data more useful."]', source)
        self.assertIn('footer,[data-nexora-credit]', source)
        self.assertIn('if(!footer){footer=document.createElement("footer")', source)
        page = (ROOT / "pages" / "feedback.html").read_text(encoding="utf-8")
        self.assertIn('<html lang="tr">', page)
        self.assertIn('i18n.js?v=20261024a', page)

    def test_firms_alert_scope_is_limited_to_five_pilot_provinces(self):
        source = (ROOT / "js" / "live-risk-raster.js").read_text(encoding="utf-8")
        for province in ("Edirne", "Tekirdağ", "Kırklareli", "Çanakkale", "İstanbul"):
            self.assertIn(province, source)
        self.assertIn('normalized.startsWith("istanbul")', source)

    def test_backend_exposes_safe_hotspot_location_and_source_time(self):
        source = (ROOT / "backend" / "app" / "api" / "risk_routes.py").read_text(encoding="utf-8")
        self.assertIn('"hotspot_details_24h"', source)
        self.assertIn('"latitude": alert["latitude"]', source)
        self.assertIn('"longitude": alert["longitude"]', source)
        self.assertIn('"observed_at_utc"', source)

    def test_shared_footer_uses_one_project_credit_in_both_languages(self):
        source = (ROOT / "js" / "i18n.js").read_text(encoding="utf-8")
        self.assertIn("Independent project · Developed by Ahmet Eymen Bakraç · Nexora88", source)
        self.assertIn("Bağımsız proje · Geliştirici: Ahmet Eymen Bakraç · Nexora88", source)

    def test_new_wind_overlay_and_scenario_are_explicitly_educational(self):
        source = (ROOT / "js" / "wind-fire-simulation.js").read_text(encoding="utf-8")
        self.assertIn("EDUCATIONAL VISUAL SCENARIO", (ROOT / "js" / "i18n.js").read_text(encoding="utf-8"))
        self.assertIn("wind_direction_10m", source)
        self.assertIn("data-wind-toggle", (ROOT / "pages" / "map.html").read_text(encoding="utf-8"))
        self.assertIn("data-sim-timeline", (ROOT / "pages" / "map.html").read_text(encoding="utf-8"))

    def test_wind_scenario_is_not_misrepresented_as_official_fire_or_evacuation_model(self):
        page = (ROOT / "pages" / "map.html").read_text(encoding="utf-8")
        source = (ROOT / "js" / "fire-safety-sim.js").read_text(encoding="utf-8")
        self.assertIn("data-fire-safety-sim", page)
        self.assertIn("does not calculate fire spread", source)
        self.assertIn("official", source.lower())
        self.assertIn("Resmî uyarı ve acil durum ekiplerinin talimatları önceliklidir", page)

    def test_evacuation_readiness_checklist_is_interactive_and_honest(self):
        page = (ROOT / "pages" / "map.html").read_text(encoding="utf-8")
        source = (ROOT / "js" / "fire-safety-sim.js").read_text(encoding="utf-8")
        self.assertIn('data-evac-check', page)
        self.assertIn('data-evac-progress-bar', page)
        self.assertIn('updateEvacuationReadiness', source)
        self.assertIn('does not replace official evacuation instructions', source)

    def test_pwa_cache_shell_was_bumped_for_ui_assets(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('nexorawildfire-shell-v37', source)
        self.assertIn('nexorawildfire-data-v37', source)
        self.assertIn('fire-safety-sim.js?v=20261022a', source)


    def test_risk_map_controls_are_dismissible_and_provider_panel_is_not_injected(self):
        page = (ROOT / "pages" / "map.html").read_text(encoding="utf-8")
        source = (ROOT / "js" / "map.js").read_text(encoding="utf-8")
        self.assertNotIn('provider-status.js', page)
        self.assertIn('data-panel-close', source)
        self.assertIn('map-panel-reopen', source)
        self.assertIn('İLÇE SEÇİMİ / KATMANLAR', source)
        self.assertIn('unified-shell.js?v=20261111a', page)

    def test_real_agent_satellite_billing_and_verified_alert_integrations_exist(self):
        root = ROOT / "backend" / "app" / "api"
        agents = (root / "copilot_routes.py").read_text(encoding="utf-8")
        billing = (root / "billing_routes.py").read_text(encoding="utf-8")
        alerts = (root / "notification_routes.py").read_text(encoding="utf-8")
        self.assertIn('ThreadPoolExecutor', agents)
        self.assertIn('satellite_job_id', agents)
        self.assertIn('Writer Agent', agents)
        self.assertIn('_verify_signature', billing)
        self.assertIn('/checkout', billing)
        self.assertIn('request-verification', alerts)
        self.assertIn('internal/run-cycle', alerts)
        self.assertIn('NEXORA_NOTIFICATION_CRON_TOKEN', alerts)

    def test_official_brand_assets_and_responsive_layout_are_stable(self):
        page = (ROOT / "index.html").read_text(encoding="utf-8")
        manifest = (ROOT / "manifest.webmanifest").read_text(encoding="utf-8")
        styles = (ROOT / "css" / "unified-shell.css").read_text(encoding="utf-8")
        shell = (ROOT / "js" / "unified-shell.js").read_text(encoding="utf-8")
        worker = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('nexora-wildfire-official.webp', shell)
        self.assertIn('nx-brand-nexora', shell)
        self.assertIn('nx-brand-wildfire', shell)
        self.assertIn('nx-brand-ai', shell)
        self.assertIn('nexora-wildfire-mark.png', manifest)
        self.assertIn('"sizes": "512x512"', manifest)
        self.assertIn('width:44px!important', styles)
        self.assertIn('width:32px!important', styles)
        self.assertIn('unified-shell.js?v=20261111a', page)
        self.assertIn('nexora-wildfire-mark.png', worker)

    def test_shared_shell_is_loaded_on_every_html_page(self):
        pages = [ROOT / "index.html", *sorted((ROOT / "pages").glob("*.html"))]
        self.assertGreaterEqual(len(pages), 13)
        for page in pages:
            self.assertIn("unified-shell.css?v=20261111a", page.read_text(encoding="utf-8"), str(page))
            self.assertIn("unified-shell.js?v=20261111a", page.read_text(encoding="utf-8"), str(page))

    def test_map_timeline_handles_leaflet_center_without_saved_area(self):
        source = (ROOT / "js" / "map-intelligence.js").read_text(encoding="utf-8")
        self.assertIn('const center=map.getCenter();setForecastTarget("Harita merkezi",center.lat,center.lng)', source)
        self.assertNotIn('const [lat,lon]=map.getCenter()', source)

    def test_personal_shell_keeps_floating_controls_clear_of_page_content(self):
        styles = (ROOT / "css" / "unified-shell.css").read_text(encoding="utf-8")
        shell = (ROOT / "js" / "unified-shell.js").read_text(encoding="utf-8")
        self.assertIn('main,main.ops-main,main.lab-shell{min-width:0;max-width:100%;padding-bottom:', styles)
        self.assertIn('main,main.ops-main,main.lab-shell{padding:12px!important;padding-bottom:', styles)
        self.assertIn('function utilityRow()', shell)
        self.assertIn('main.insertAdjacentElement(\'afterend\',row)', shell)
        self.assertIn("'.nexora-support-panel'", shell)
        self.assertIn("'.nova-account-dock'", shell)
        self.assertIn('.nx-utility-row .edge-dock{position:static!important', styles)
        self.assertIn('.nx-utility-row #nexora-install{position:static!important', styles)
        self.assertIn('.nx-utility-row .nexora-support-panel{position:relative!important', styles)
        self.assertIn('body>header .nova-account-dock{position:static!important', styles)

    def test_pwa_shell_version_and_current_copilot_assets_are_bumped(self):
        source = (ROOT / "sw.js").read_text(encoding="utf-8")
        self.assertIn('nexorawildfire-shell-v37', source)
        self.assertIn('pages/bee.html', source)
        self.assertIn('js/nova-bee.js?v=20261024a', source)
        self.assertIn('js/i18n.js?v=20261024a', source)

if __name__ == "__main__":
    unittest.main()
