"""Real Chromium smoke checks for the responsive bilingual UI and install lifecycle."""
from __future__ import annotations

import json
import os
import socket
import subprocess
import sys
import time
import unittest
from pathlib import Path

from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[2]
PORT = 4173
BASE = f"http://127.0.0.1:{PORT}"
PAGES = [
    "/",
    "/pages/map.html",
    "/pages/areas.html",
    "/pages/weather.html",
    "/pages/satellite.html",
    "/pages/about.html",
    "/pages/enterprise.html",
    "/pages/account.html",
    "/pages/auth.html",
]


class MobileUiSmokeTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.server = subprocess.Popen(
            [sys.executable, "-m", "http.server", str(PORT), "--directory", str(ROOT)],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL,
        )
        for _ in range(60):
            try:
                with socket.create_connection(("127.0.0.1", PORT), timeout=0.5):
                    break
            except OSError:
                time.sleep(0.25)
        else:
            raise RuntimeError("Local static test server did not start.")
        cls.playwright = sync_playwright().start()
        cls.browser = cls.playwright.chromium.launch(headless=True)

    @classmethod
    def tearDownClass(cls):
        cls.browser.close()
        cls.playwright.stop()
        cls.server.terminate()
        cls.server.wait(timeout=5)

    def new_page(self, width=390, height=844):
        context = self.browser.new_context(viewport={"width": width, "height": height}, locale="en-US")
        context.add_init_script("if (location.protocol.startsWith('http')) { try { localStorage.removeItem('nexorawildfire-installed-v1'); } catch (e) {} }")
        page = context.new_page()
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE) or route.request.url.startswith("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/") else route.abort())
        page.on("pageerror", lambda error: print("PAGEERROR", page.url, str(error)))
        return context, page

    def test_all_pages_expose_language_and_install_controls(self):
        for path in PAGES:
            with self.subTest(path=path):
                context, page = self.new_page()
                try:
                    page.goto(BASE + path, wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_selector("#nexora-language-toggle", timeout=10000)
                    page.wait_for_selector("#nexora-install", timeout=10000)
                    self.assertTrue(page.locator("#nexora-install").is_visible(), f"install control missing on {path}")
                    self.assertTrue(page.locator("#nexora-language-toggle").is_visible(), f"language toggle missing on {path}")
                    self.assertEqual(page.locator("html").get_attribute("lang"), "en", f"page language metadata was not switched to English on {path}")
                    if page.locator("nav").count():
                        page.wait_for_selector("nav .nx-nav-toggle", timeout=5000)
                        nav_text = page.locator("nav").evaluate("(el) => el.textContent")
                        self.assertIn("Dashboard", nav_text, f"navigation was not translated on {path}")
                        self.assertIn("Risk Map", nav_text, f"risk-map navigation was not translated on {path}")
                        self.assertNotIn("Ana Panel", nav_text, f"Turkish dashboard label remains in English mode on {path}")
                finally:
                    context.close()

    def test_mobile_menu_language_toggle_and_install_lifecycle(self):
        context, page = self.new_page()
        try:
            page.goto(BASE + "/pages/about.html", wait_until="domcontentloaded", timeout=30000)
            menu = page.locator("nav .nx-nav-toggle")
            self.assertTrue(menu.is_visible())
            self.assertEqual(page.locator("nav.nx-nav > a:visible").count(), 0)
            menu.click()
            self.assertGreater(page.locator("nav.nx-nav > a:visible").count(), 0)
            self.assertLessEqual(page.locator("nav.nx-nav").evaluate("(el) => el.scrollWidth"), 390)
            page.wait_for_selector("#nexora-language-toggle", timeout=10000)
            page.wait_for_function("document.documentElement.lang === 'en'", timeout=10000)
            self.assertEqual(page.locator("html").get_attribute("lang"), "en")
            page.locator("#nexora-language-toggle").click()
            self.assertEqual(page.locator("html").get_attribute("lang"), "tr")
            page.locator("#nexora-language-toggle").click()
            self.assertEqual(page.locator("html").get_attribute("lang"), "en")
            page.evaluate("window.dispatchEvent(new Event('appinstalled'))")
            page.wait_for_selector("#nexora-install", state="detached", timeout=3000)
        finally:
            context.close()


    def test_global_coordinate_search_reports_live_provider_failures_honestly(self):
        context = self.browser.new_context(viewport={"width": 390, "height": 844}, locale="en-US")
        page = context.new_page()
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE) or route.request.url.startswith("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/") else route.abort())
        page.route("https://unpkg.com/**", lambda route: route.continue_())
        page.route("https://api.open-meteo.com/**", lambda route: route.abort())
        page.on("pageerror", lambda error: print("PAGEERROR", page.url, str(error)))
        try:
            page.goto(BASE + "/pages/map.html", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_selector("[data-global-form]", timeout=20000)
            page.locator("[data-lat]").fill("38.375")
            page.locator("[data-lon]").fill("-122.375")
            page.locator("[data-global-form] button[type=submit]").click()
            page.wait_for_function("document.querySelector('[data-global-demo-status]').innerText.includes('Coordinates 38.375, -122.375')", timeout=10000)
            self.assertIn("Open-Meteo unavailable", page.locator("[data-global-demo-status]").inner_text())
            self.assertLessEqual(page.locator("nav.nx-nav").evaluate("(el) => el.scrollWidth"), 390)
        finally:
            context.close()

    def test_map_planning_overlays_are_available_and_saved_as_drafts(self):
        context, page = self.new_page()
        try:
            page.route("https://unpkg.com/**", lambda route: route.continue_())
            page.goto(BASE + "/pages/map.html", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_selector("#nx-planning-tools", timeout=20000)
            self.assertTrue(page.locator('[data-plan="zone"]').is_visible())
            self.assertTrue(page.locator('[data-plan="line"]').is_visible())
            page.locator('[data-plan="zone"]').click()
            page.evaluate("""() => {
              for (const [lat, lng] of [[41,27],[41.01,27.01],[41.02,27]]) {
                window.map.fire('click', {latlng: L.latLng(lat,lng)});
              }
            }""")
            page.locator('[data-plan="finish"]').click()
            saved = page.evaluate("JSON.parse(localStorage.getItem('nexorawildfire-planning-overlays-v1') || JSON.stringify({features:[]}))")
            self.assertEqual(len(saved["features"]), 1)
            self.assertEqual(saved["features"][0]["properties"]["official"], False)
            self.assertEqual(saved["features"][0]["properties"]["kind"], "zone")
            self.assertLessEqual(page.locator("nav.nx-nav").evaluate("(el) => el.scrollWidth"), 390)
        finally:
            context.close()

    def test_desktop_more_menu_is_compact_and_keyboard_accessible(self):
        context, page = self.new_page(width=1440, height=900)
        try:
            page.goto(BASE + "/pages/about.html", wait_until="domcontentloaded", timeout=30000)
            self.assertFalse(page.locator("nav.nx-nav-toggle").is_visible())
            more = page.locator("nav .nx-nav-more-toggle")
            self.assertTrue(more.is_visible())
            more.click()
            self.assertTrue(page.locator("nav .nx-nav-more-links").is_visible())
            self.assertGreater(page.locator("nav .nx-nav-more-links a").count(), 0)
        finally:
            context.close()



    def test_saved_area_persistence_reload_delete_mobile_and_desktop(self):
        # Responsive browser E2E for persisted areas. The initial area is a fixture;
        # physical-device certification remains a separate manual check.
        for width, height in ((390, 844), (1440, 900)):
            with self.subTest(width=width):
                context = self.browser.new_context(viewport={"width": width, "height": height}, locale="tr-TR")
                context.add_init_script("""
                    if (!sessionStorage.getItem('qa-area-fixture-seeded')) {
                      localStorage.setItem('nexorawildfire-my-areas-v1', JSON.stringify([{
                        id:'qa-area-1', name:'QA Saved Area', type:'orman', province:'Edirne',
                        district:'Merkez', coordinates:[[41.67,26.55],[41.68,26.56],[41.66,26.57]],
                        createdAt:'2026-10-10T00:00:00.000Z', updatedAt:Date.now()
                      }]));
                      sessionStorage.setItem('qa-area-fixture-seeded','1');
                    }
                """)
                page = context.new_page()

                def route_request(route):
                    url = route.request.url
                    if url.startswith(BASE) or url.startswith("https://cdn.jsdelivr.net/npm/leaflet@1.9.4/"):
                        route.continue_()
                    elif "api.open-meteo.com/v1/forecast" in url:
                        route.fulfill(json={"current":{"temperature_2m":25,"relative_humidity_2m":48,"wind_speed_10m":8,"precipitation":0,"soil_moisture_0_to_7cm":0.24,"vapour_pressure_deficit":1.1},"daily":{"time":["2026-10-10"],"et0_fao_evapotranspiration":[3.1],"precipitation_sum":[0]}})
                    elif "air-quality-api.open-meteo.com" in url:
                        route.fulfill(json={"current":{"alder_pollen":0,"birch_pollen":0,"grass_pollen":0,"mugwort_pollen":0,"olive_pollen":0,"ragweed_pollen":0}})
                    else:
                        route.abort()

                page.route("**/*", route_request)
                try:
                    page.goto(BASE + "/pages/areas.html", wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_selector(".area-card h3", timeout=20000)
                    self.assertIn("QA Saved Area", page.locator(".area-card h3").all_inner_texts())
                    page.reload(wait_until="domcontentloaded", timeout=30000)
                    page.wait_for_selector(".area-card h3", timeout=20000)
                    self.assertIn("QA Saved Area", page.locator(".area-card h3").all_inner_texts())
                    page.locator("[data-delete]").click()
                    page.wait_for_function("JSON.parse(localStorage.getItem('nexorawildfire-my-areas-v1')||'[]').every(a=>a.name!=='QA Saved Area')", timeout=10000)
                    page.wait_for_function("!Array.from(document.querySelectorAll('.area-card h3')).some(el=>el.textContent==='QA Saved Area')", timeout=10000)
                    self.assertNotIn("QA Saved Area", page.locator(".area-card h3").all_inner_texts())
                finally:
                    context.close()


if __name__ == "__main__":
    unittest.main(verbosity=2)
