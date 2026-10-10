#!/usr/bin/env python3
"""Build a traceable fixed-site pilot dataset from FIRMS CSV exports and Open-Meteo Archive.

Important: a FIRMS detection is a satellite thermal-anomaly label, not ground-truth
confirmation of a forest fire. No detection is labelled 0 only as "no FIRMS detection
within the configured radius", never as proof that no fire occurred.
"""
from __future__ import annotations

import argparse
import csv
import json
import math
import os
import sys
import time
from datetime import date, datetime, timezone
from pathlib import Path
from typing import Any

import requests

ARCHIVE_URL = "https://archive-api.open-meteo.com/v1/archive"
DEFAULT_SITES = [
    {"site_id": "edirne_pilot_01", "province": "Edirne", "latitude": 41.6771, "longitude": 26.5557},
    {"site_id": "kirklareli_pilot_01", "province": "Kırklareli", "latitude": 41.7351, "longitude": 27.2252},
    {"site_id": "tekirdag_pilot_01", "province": "Tekirdağ", "latitude": 40.9780, "longitude": 27.5110},
]
DAILY_FIELDS = [
    "temperature_2m_max", "temperature_2m_min",
    "relative_humidity_2m_min", "relative_humidity_2m_max",
    "wind_speed_10m_max", "precipitation_sum",
]
UNITS = {
    "temperature_2m_max": "°C",
    "temperature_2m_min": "°C",
    "relative_humidity_2m_min": "%",
    "relative_humidity_2m_max": "%",
    "wind_speed_10m_max": "km/h",
    "precipitation_sum": "mm",
}


def parse_date(value: str) -> date:
    return date.fromisoformat(value.strip()[:10])


def number(value: Any) -> float | None:
    try:
        result = float(value)
    except (TypeError, ValueError):
        return None
    return result if math.isfinite(result) else None


def haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    radius = 6371.0088
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * radius * math.asin(min(1.0, math.sqrt(a)))


def read_firms_csv(paths: list[Path], start: date, end: date, bbox: tuple[float, float, float, float]):
    west, south, east, north = bbox
    detections: dict[date, list[dict[str, Any]]] = {}
    input_rows = 0
    invalid_rows = 0
    for path in paths:
        with path.open("r", encoding="utf-8-sig", newline="") as stream:
            reader = csv.DictReader(stream)
            if not reader.fieldnames or not {"latitude", "longitude", "acq_date"}.issubset(set(reader.fieldnames)):
                raise ValueError(f"{path} must contain latitude, longitude, and acq_date columns")
            for row in reader:
                input_rows += 1
                lat, lon = number(row.get("latitude")), number(row.get("longitude"))
                try:
                    observed_date = parse_date(row.get("acq_date", ""))
                except (ValueError, TypeError):
                    invalid_rows += 1
                    continue
                if lat is None or lon is None or not (-90 <= lat <= 90 and -180 <= lon <= 180):
                    invalid_rows += 1
                    continue
                if not (start <= observed_date <= end and west <= lon <= east and south <= lat <= north):
                    continue
                detections.setdefault(observed_date, []).append({
                    "latitude": lat,
                    "longitude": lon,
                    "acq_time": (row.get("acq_time") or "").strip(),
                    "confidence": (row.get("confidence") or "").strip(),
                    "frp_mw": number(row.get("frp")),
                    "instrument": (row.get("instrument") or "").strip(),
                    "satellite": (row.get("satellite") or "").strip(),
                    "source_file": path.name,
                })
    return detections, {"input_rows": input_rows, "invalid_rows": invalid_rows,
                        "in_bbox_date_range_detections": sum(map(len, detections.values()))}


def fetch_daily_weather(site: dict[str, Any], start: date, end: date, session=requests):
    params = {
        "latitude": site["latitude"],
        "longitude": site["longitude"],
        "start_date": start.isoformat(),
        "end_date": end.isoformat(),
        "daily": ",".join(DAILY_FIELDS),
        "timezone": "Europe/Istanbul",
        "wind_speed_unit": "kmh",
    }
    response = session.get(ARCHIVE_URL, params=params, timeout=45)
    response.raise_for_status()
    payload = response.json()
    daily = payload.get("daily") or {}
    times = daily.get("time") or []
    result = {}
    for index, day_text in enumerate(times):
        values = {}
        for field in DAILY_FIELDS:
            items = daily.get(field)
            value = number(items[index]) if isinstance(items, list) and index < len(items) else None
            values[field] = value
        # Missing provider values remain missing; incomplete rows are excluded from model data.
        result[date.fromisoformat(day_text)] = values
    return result, {
        "source": "Open-Meteo Historical Weather API",
        "endpoint": ARCHIVE_URL,
        "timezone": payload.get("timezone", "Europe/Istanbul"),
        "latitude_returned": payload.get("latitude"),
        "longitude_returned": payload.get("longitude"),
        "daily_units": daily.get("units") or {},
        "requested_daily_fields": DAILY_FIELDS,
    }


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--firms", nargs="+", required=True, help="Previously downloaded NASA FIRMS CSV export(s); no fake records are generated.")
    parser.add_argument("--output", default="data/research/thrace_fire_weather_dataset.csv")
    parser.add_argument("--metadata", default="data/research/thrace_fire_weather_metadata.json")
    parser.add_argument("--start", required=True, help="Start date YYYY-MM-DD")
    parser.add_argument("--end", required=True, help="End date YYYY-MM-DD")
    parser.add_argument("--radius-km", type=float, default=10.0, help="FIRMS detection radius around each fixed pilot point")
    parser.add_argument("--delay-seconds", type=float, default=1.0, help="Pause between weather-provider requests")
    parser.add_argument("--sites-json", help="Optional JSON array of fixed site objects")
    args = parser.parse_args(argv)

    start, end = date.fromisoformat(args.start), date.fromisoformat(args.end)
    if end < start:
        parser.error("--end must be on or after --start")
    if not (0.1 <= args.radius_km <= 50):
        parser.error("--radius-km must be between 0.1 and 50")
    if args.delay_seconds < 0:
        parser.error("--delay-seconds cannot be negative")

    sites = DEFAULT_SITES
    if args.sites_json:
        sites = json.loads(Path(args.sites_json).read_text(encoding="utf-8"))
    if not isinstance(sites, list) or not sites:
        parser.error("sites JSON must be a non-empty array")
    for site in sites:
        if not {"site_id", "province", "latitude", "longitude"}.issubset(site):
            parser.error("each site needs site_id, province, latitude, longitude")

    # Broad Thrace bounding box; per-site radius is applied below.
    bbox = (25.5, 39.5, 29.5, 42.2)
    firms_paths = [Path(p) for p in args.firms]
    for path in firms_paths:
        if not path.is_file():
            parser.error(f"FIRMS CSV does not exist: {path}")
    detections, firms_summary = read_firms_csv(firms_paths, start, end, bbox)

    rows = []
    provider_meta = []
    weather_errors = []
    for site_index, site in enumerate(sites):
        try:
            weather_by_date, metadata = fetch_daily_weather(site, start, end)
            provider_meta.append({"site_id": site["site_id"], **metadata})
        except (requests.RequestException, ValueError, KeyError) as exc:
            weather_errors.append({"site_id": site["site_id"], "error_type": type(exc).__name__})
            continue

        for day in sorted(weather_by_date):
            values = weather_by_date[day]
            day_detections = detections.get(day, [])
            nearby = []
            for detection in day_detections:
                distance = haversine_km(site["latitude"], site["longitude"],
                                        detection["latitude"], detection["longitude"])
                if distance <= args.radius_km:
                    nearby.append((distance, detection))
            complete_weather = all(values.get(field) is not None for field in DAILY_FIELDS)
            if not complete_weather:
                # Keep incomplete days out of the CSV model table; count them in metadata.
                continue
            nearest = min(nearby, key=lambda pair: pair[0]) if nearby else None
            rows.append({
                "site_id": site["site_id"],
                "province": site["province"],
                "latitude": site["latitude"],
                "longitude": site["longitude"],
                "date": day.isoformat(),
                **values,
                "firms_detection_within_radius": 1 if nearest else 0,
                "label_definition": "FIRMS thermal anomaly within radius; 0 means no detection, not confirmed absence of fire",
                "firms_radius_km": args.radius_km,
                "nearest_detection_distance_km": round(nearest[0], 3) if nearest else "",
                "firms_confidence": nearest[1]["confidence"] if nearest else "",
                "firms_frp_mw": nearest[1]["frp_mw"] if nearest else "",
                "firms_acq_time_utc": nearest[1]["acq_time"] if nearest else "",
                "firms_source_file": nearest[1]["source_file"] if nearest else "",
                "ndvi": "",
                "ndmi": "",
                "satellite_feature_status": "not_computed",
                "weather_source": "Open-Meteo Historical Weather API",
                "weather_timezone": "Europe/Istanbul",
                "weather_units": json.dumps(UNITS, ensure_ascii=False, sort_keys=True),
            })
        if site_index < len(sites) - 1 and args.delay_seconds:
            time.sleep(args.delay_seconds)

    out_path = Path(args.output)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    fields = list(rows[0].keys()) if rows else [
        "site_id", "province", "latitude", "longitude", "date", *DAILY_FIELDS,
        "firms_detection_within_radius", "label_definition", "firms_radius_km",
        "nearest_detection_distance_km", "firms_confidence", "firms_frp_mw",
        "firms_acq_time_utc", "firms_source_file", "ndvi", "ndmi",
        "satellite_feature_status", "weather_source", "weather_timezone", "weather_units",
    ]
    with out_path.open("w", encoding="utf-8", newline="") as stream:
        writer = csv.DictWriter(stream, fieldnames=fields)
        writer.writeheader()
        writer.writerows(rows)

    metadata_path = Path(args.metadata)
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    positive = sum(int(row["firms_detection_within_radius"]) for row in rows)
    metadata = {
        "created_at_utc": datetime.now(timezone.utc).isoformat(),
        "dataset_status": "pilot_generated" if rows else "empty_no_valid_rows",
        "date_range_requested": {"start": start.isoformat(), "end": end.isoformat()},
        "fixed_sites": sites,
        "fixed_site_count": len(sites),
        "firms": {
            "source": "NASA FIRMS",
            "input_files": [str(path) for path in firms_paths],
            "input_file_note": "Input CSV files are user-downloaded exports; verify their platform, product, acquisition period, and licence before research use.",
            **firms_summary,
        },
        "weather": {"source": "Open-Meteo Historical Weather API", "endpoint": ARCHIVE_URL,
                    "daily_fields": DAILY_FIELDS, "units": UNITS,
                    "provider_responses": provider_meta, "failed_sites": weather_errors},
        "label_counts": {"rows": len(rows), "firms_detection_positive": positive,
                         "no_firms_detection_proxy_negative": len(rows) - positive},
        "label_caveat": "Thermal anomalies are not identical to confirmed forest-fire incidents. A zero means no matching FIRMS detection within the radius on that date, not verified no-fire ground truth.",
        "satellite_features": {"ndvi": "not computed", "ndmi": "not computed",
                               "note": "A discovered satellite scene is not an NDVI/NDMI measurement. Blank fields are intentionally not imputed."},
        "limitations": [
            "The default coordinates are reproducible pilot anchors near provincial centres, not a representative forest sample.",
            "Daily weather at a fixed point is not the weather at every satellite detection coordinate or exact acquisition hour.",
            "FIRMS can miss small, short-lived, obscured, or low-temperature fires and can include non-fire thermal anomalies.",
            "The proxy-negative label is not independently verified no-fire ground truth.",
            "This dataset builder does not train or validate a predictive model.",
        ],
    }
    metadata_path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({"dataset": str(out_path), "metadata": str(metadata_path),
                      "rows": len(rows), "positive_proxy_labels": positive,
                      "negative_proxy_labels": len(rows)-positive,
                      "weather_failed_sites": len(weather_errors)}, ensure_ascii=False, indent=2))
    return 0 if rows else 2


if __name__ == "__main__":
    sys.exit(main())
