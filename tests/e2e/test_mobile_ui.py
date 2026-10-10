"""Real Chromium smoke checks for the responsive bilingual UI and install lifecycle."""
from __future__ import annotations

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
    "/pages/messages.html",
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
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
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
                    if page.locator("nav").count():
                        page.wait_for_selector("nav .nx-nav-toggle", timeout=5000)
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


    def test_global_napa_demo_renders_geojson_and_reports_missing_live_sources_honestly(self):
        context = self.browser.new_context(viewport={"width": 390, "height": 844}, locale="en-US")
        page = context.new_page()
        page.route("**/*", lambda route: route.continue_() if route.request.url.startswith(BASE) else route.abort())
        page.route("https://unpkg.com/**", lambda route: route.continue_())
        page.route("https://api.open-meteo.com/**", lambda route: route.abort())
        page.on("pageerror", lambda error: print("PAGEERROR", page.url, str(error)))
        try:
            page.goto(BASE + "/pages/map.html", wait_until="domcontentloaded", timeout=30000)
            page.wait_for_selector("[data-global-demo]", timeout=20000)
            page.locator("[data-global-demo]").click()
            page.wait_for_function("Boolean(window.nexoraGlobalLayer && window.nexoraGlobalLayer.getBounds)", timeout=10000)
            self.assertIn("Napa", page.locator("[data-global-demo-status]").inner_text())
            self.assertIn("GeoJSON: PASS", page.locator("[data-global-demo-status]").inner_text())
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


if __name__ == "__main__":
    unittest.main(verbosity=2)
