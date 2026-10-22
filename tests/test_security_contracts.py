from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def read(path: str) -> str:
    return (ROOT / path).read_text(encoding="utf-8")


def test_browser_supabase_configuration_is_publishable_not_admin():
    source = read("js/auth.js")
    assert "sb_publishable_" in source or "SUPABASE_ANON_KEY" in source
    assert "SUPABASE_ADMIN_KEY" not in source
    assert "service_role" not in source.lower()


def test_owner_scoped_rls_and_role_guard_are_declared():
    migration = read("supabase/migrations/20261017090000_owner_scoped_profiles_and_areas.sql")
    assert "enable row level security" in migration.lower()
    assert "auth.uid()" in migration
    assert "nexora_profiles_select_own" in migration
    assert "nexorawildfire_areas_select_own" in migration
    assert "new.role := old.role" in migration


def test_service_worker_never_caches_authenticated_responses_and_rotates_shell():
    worker = read("sw.js")
    assert 'request.headers.has("authorization")' in worker
    assert "nexorawildfire-shell-v27" in worker
    assert "nexorawildfire-data-v27" in worker
    assert '"Cache-Control":"no-store"' in worker


def test_risk_engines_disclose_unvalidated_heuristic_status():
    offline = read("js/nova-offline-engine.js")
    basic = read("backend/app/engine/risk_engine.py")
    advanced = read("backend/app/engine/advanced_risk_engine.py")
    for source in (offline, basic, advanced):
        assert "heuristic_environmental_indicator" in source
        assert "validated" in source
        assert "resmi" in source.lower() or "official" in source.lower()



def test_map_drilldown_is_explicit_and_controls_do_not_cover_map():
    script = read("js/map.js")
    styles = read("css/style.css")
    assert 'data-open-province' in script
    assert 'data-open-district' in script
    assert 'l.on("click",()=>openProvince(r.name))' not in script
    assert 'if(!selectedProvince&&!selectedDistrict&&!drawMode)loadProvinceData()' in script
    assert ".map-filters{\n  position:relative!important" in styles


def test_map_provider_status_is_separate_and_does_not_fake_observations():
    panel = read("js/provider-status.js")
    layers = read("js/free-data-layers.js")
    firms = read("js/live-risk-raster.js")
    page = read("pages/map.html")
    assert "data-provider-status-list" in panel
    assert "Son kontrol" in panel
    assert 'providerState("weather","loading"' in layers
    assert 'providerState("weather","error"' in layers
    assert 'providerState("air","error"' in layers
    assert 'providerState("satellite","error"' in layers
    assert 'update("firms","error"' in firms
    assert "Bu, sıfır olay anlamına gelmez" in firms
    assert 'src="../js/provider-status.js?v=20261020a"' in page
    assert 'p.name+" · Open-Meteo"' not in layers
