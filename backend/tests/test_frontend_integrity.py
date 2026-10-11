from pathlib import Path

ROOT = Path(__file__).resolve().parents[2]
MAIN_PAGES = [
    "index.html",
    "pages/account.html",
    "pages/auth.html",
    "pages/legal.html",
    "pages/map.html",
    "pages/areas.html",
    "pages/weather.html",
    "pages/satellite.html",
    "pages/about.html",
    "pages/vision.html",
    "pages/feedback.html",
    "pages/events.html",
    "pages/enterprise.html",
]


def test_main_pages_share_navigation_translation_and_asset_fallback():
    required = [
        "global-nav.js?v=20261011b",
        "mobile-nav.js?v=20261011b",
        "i18n.js?v=20261011h",
        "i18n-extra.js?v=20261011c",
        "asset-guard.js?v=20261011a",
        "pwa.js?v=20261011b",
    ]
    for relative_path in MAIN_PAGES:
        page = ROOT / relative_path
        assert page.is_file(), f"Missing page: {relative_path}"
        html = page.read_text(encoding="utf-8")
        assert "<nav" in html, f"{relative_path} has no navigation mount"
        for script in required:
            assert script in html, f"{relative_path} is missing {script}"


def test_evacuation_simulation_is_reachable_from_map_and_system_page():
    for relative_path in ("pages/map.html", "pages/about.html"):
        html = (ROOT / relative_path).read_text(encoding="utf-8")
        assert "evacuation-panel" in html, f"{relative_path} has no simulation host"
        assert "evacuation-sim.js?v=20261011c" in html, f"{relative_path} does not load the simulation"
        assert "evacuation-sim.css?v=20261011b" in html, f"{relative_path} does not load simulation styling"


def test_translation_engine_handles_dynamic_text_updates():
    script = (ROOT / "js/i18n.js").read_text(encoding="utf-8")
    assert "record.source = current" in script
    assert "record.translated = translated" in script
    assert "if (!enToTr.has(en)) enToTr.set(en, tr)" in script


def test_profile_and_global_map_keep_supabase_auth_integration():
    for relative_path in ("index.html", "pages/account.html", "pages/auth.html", "pages/map.html", "pages/areas.html", "pages/satellite.html"):
        html = (ROOT / relative_path).read_text(encoding="utf-8")
        assert "supabase-js" in html, f"{relative_path} is missing the Supabase client"
        assert "auth.js" in html, f"{relative_path} is missing the shared Supabase auth integration"
