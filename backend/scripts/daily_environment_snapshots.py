"""Daily historical weather snapshots for cloud-synced NexoraWildfire areas.

Uses only real Open-Meteo responses. The displayed indicator is a transparent
rule-based environmental indicator, NOT a calibrated probability of wildfire.
Run with SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY set in the server environment.
"""
from __future__ import annotations

import datetime as dt
import os
import sys
import time
from typing import Any

import requests

SUPABASE_URL = os.environ["SUPABASE_URL"].rstrip("/")
SERVICE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_ADMIN_KEY")
if not SERVICE_KEY:
    raise SystemExit("Set SUPABASE_SERVICE_ROLE_KEY (server-side only).")
HEADERS = {
    "apikey": SERVICE_KEY,
    "Authorization": f"Bearer {SERVICE_KEY}",
    "Content-Type": "application/json",
}
HTTP = requests.Session()
HTTP.headers.update({"User-Agent": "NexoraWildfire-AI/1.0 (daily environmental history job)"})

def get_rows(path: str, params: dict[str, str] | None = None) -> list[dict[str, Any]]:
    response = HTTP.get(f"{SUPABASE_URL}/rest/v1/{path}", headers=HEADERS, params=params, timeout=30)
    response.raise_for_status()
    return response.json()

def weather(lat: float, lon: float) -> dict[str, Any]:
    response = HTTP.get(
        "https://api.open-meteo.com/v1/forecast",
        params={
            "latitude": lat, "longitude": lon,
            "current": "temperature_2m,relative_humidity_2m,wind_speed_10m,precipitation,soil_moisture_0_to_7cm,vapour_pressure_deficit",
            "daily": "et0_fao_evapotranspiration",
            "forecast_days": 1, "timezone": "UTC",
        },
        timeout=25,
    )
    response.raise_for_status()
    payload = response.json()
    current, daily = payload.get("current", {}), payload.get("daily", {})
    required = ("temperature_2m", "relative_humidity_2m", "wind_speed_10m")
    if any(current.get(key) is None for key in required):
        raise ValueError("Open-Meteo response is missing required current weather values.")
    t = float(current["temperature_2m"])
    humidity = float(current["relative_humidity_2m"])
    wind = float(current["wind_speed_10m"])
    soil = current.get("soil_moisture_0_to_7cm")
    # Explicitly rule-based environmental indicator; it is not an ML probability.
    indicator = 0
    indicator += 30 if t >= 40 else 15 if t >= 30 else 7 if t >= 25 else 0
    indicator += 25 if humidity <= 20 else 10 if humidity <= 40 else 4 if humidity <= 55 else 0
    indicator += 25 if wind >= 40 else 10 if wind >= 20 else 4 if wind >= 12 else 0
    if soil is not None and float(soil) < 0.18:
        indicator += 10
    return {
        "temperature_c": t,
        "relative_humidity_pct": humidity,
        "wind_speed_kmh": wind,
        "precipitation_mm": current.get("precipitation"),
        "soil_moisture": soil,
        "vpd_kpa": current.get("vapour_pressure_deficit"),
        "et0_mm": (daily.get("et0_fao_evapotranspiration") or [None])[0],
        "rule_based_indicator": min(100, indicator),
    }

def main() -> int:
    today = dt.datetime.now(dt.timezone.utc).date().isoformat()
    areas: list[dict[str, Any]] = []
    offset = 0
    while True:
        batch = get_rows("nexorawildfire_areas", {
            "select": "id,user_id,name,center_lat,center_lon",
            "order": "created_at.asc",
            "limit": "500",
            "offset": str(offset),
        })
        areas.extend(batch)
        if len(batch) < 500:
            break
        offset += len(batch)
    if not areas:
        print("No cloud-synced saved areas; no snapshots written.")
        return 0
    saved = failed = 0
    for area in areas:
        try:
            lat, lon = float(area["center_lat"]), float(area["center_lon"])
            values = weather(lat, lon)
            row = {
                "area_id": str(area["id"]),
                "user_id": area["user_id"],
                "area_name": str(area.get("name") or "Saved area")[:120],
                "snapshot_date": today,
                "latitude": lat,
                "longitude": lon,
                **values,
                "data_source": "Open-Meteo",
            }
            response = HTTP.post(
                f"{SUPABASE_URL}/rest/v1/nexorawildfire_daily_snapshots",
                headers={**HEADERS, "Prefer": "resolution=merge-duplicates,return=minimal"},
                params={"on_conflict": "area_id,snapshot_date"},
                json=row,
                timeout=30,
            )
            response.raise_for_status()
            saved += 1
        except (KeyError, TypeError, ValueError, requests.RequestException) as exc:
            failed += 1
            print(f"Skipped area {area.get('id', 'unknown')}: {type(exc).__name__}: {exc}", file=sys.stderr)
        time.sleep(0.15)
    print(f"Daily snapshots complete: date={today}, saved={saved}, failed={failed}, total={len(areas)}")
    return 1 if failed and not saved else 0

if __name__ == "__main__":
    raise SystemExit(main())
