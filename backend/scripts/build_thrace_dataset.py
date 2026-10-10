"""Build a reproducible Thrace wildfire-risk research dataset.

FIRMS thermal detections are proxies, not verified wildfire labels. Negative
rows mean no detection within the configured radius, not proof that no fire
occurred. Weather values are ERA5-Land reanalysis, not station observations.
"""
import argparse
import csv
import datetime as dt
import io
import math
import os
import random
import time
from pathlib import Path

import requests

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"
WEATHER_URL = "https://archive-api.open-meteo.com/v1/archive"
# Broad pilot bounding box covering Edirne, Kırklareli and Tekirdağ.
BBOX = (26.0, 40.5, 28.5, 42.2)
SOURCES = ("VIIRS_NOAA20_SP", "VIIRS_NOAA21_SP")
FEATURES = (
    "temperature_max", "humidity_min", "wind_max", "precipitation_sum",
    "et0", "vpd_max", "previous_fire_1km_30d",
)


def parse_date(value):
    return dt.date.fromisoformat(value)


def date_chunks(start, end, size=5):
    cursor = start
    while cursor <= end:
        chunk_end = min(end, cursor + dt.timedelta(days=size - 1))
        yield cursor, chunk_end
        cursor = chunk_end + dt.timedelta(days=1)


def inside_bbox(lat, lon):
    west, south, east, north = BBOX
    return south <= lat <= north and west <= lon <= east


def distance_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 6371.0088 * 2 * math.atan2(math.sqrt(a), math.sqrt(max(0.0, 1 - a)))


def fetch_firms(start, end, map_key, session):
    records = {}
    west, south, east, north = BBOX
    bbox = f"{west},{south},{east},{north}"
    for source in SOURCES:
        for first, last in date_chunks(start, end):
            days = (last - first).days + 1
            url = f"{FIRMS_URL}/{map_key}/{source}/{bbox}/{days}/{first.isoformat()}"
            response = session.get(url, timeout=45)
            response.raise_for_status()
            text = response.text.strip()
            if not text or text.lower().startswith("invalid"):
                raise RuntimeError(f"NASA FIRMS returned an unusable response for {source}, {first}.")
            for row in csv.DictReader(io.StringIO(text)):
                try:
                    lat, lon = float(row["latitude"]), float(row["longitude"])
                    day = parse_date(row["acq_date"])
                except (KeyError, TypeError, ValueError):
                    continue
                if not inside_bbox(lat, lon) or not start <= day <= end:
                    continue
                row["_lat"], row["_lon"], row["_date"] = lat, lon, day
                # Keep one record per date, rounded location and sensor family.
                key = (day.isoformat(), round(lat, 3), round(lon, 3), row.get("satellite", source))
                records[key] = row
            time.sleep(0.15)
    return list(records.values())


def weather_for(lat, lon, day, session):
    # Use the full seven-day lead-in so the record includes antecedent dryness.
    first = day - dt.timedelta(days=6)
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": first.isoformat(), "end_date": day.isoformat(),
        "daily": ",".join((
            "temperature_2m_max", "relative_humidity_2m_min",
            "wind_speed_10m_max", "precipitation_sum",
            "et0_fao_evapotranspiration", "vapour_pressure_deficit_max",
        )),
        "timezone": "Europe/Istanbul",
        "wind_speed_unit": "kmh",
        "precipitation_unit": "mm",
        "temperature_unit": "celsius",
        "models": "era5_land",
    }
    response = session.get(WEATHER_URL, params=params, timeout=45)
    response.raise_for_status()
    payload = response.json()
    daily = payload.get("daily") or {}
    dates = daily.get("time") or []
    try:
        index = dates.index(day.isoformat())
    except ValueError:
        return None
    fields = {
        "temperature_max": "temperature_2m_max",
        "humidity_min": "relative_humidity_2m_min",
        "wind_max": "wind_speed_10m_max",
        "precipitation_sum": "precipitation_sum",
        "et0": "et0_fao_evapotranspiration",
        "vpd_max": "vapour_pressure_deficit_max",
    }
    result = {}
    for output, source in fields.items():
        values = daily.get(source) or []
        result[output] = values[index] if index < len(values) else None
    # Antecedent 6-day precipitation total; exclude the event day.
    rain = daily.get("precipitation_sum") or []
    result["precipitation_previous_6d"] = (
        round(sum(float(x) for x in rain[:index] if x is not None), 3)
        if index > 0 else None
    )
    result["weather_source"] = "Open-Meteo ERA5-Land reanalysis"
    result["weather_time"] = day.isoformat()
    result["weather_timezone"] = "Europe/Istanbul"
    result["temperature_unit"] = "degC"
    result["humidity_unit"] = "percent"
    result["wind_unit"] = "km/h"
    result["precipitation_unit"] = "mm"
    result["et0_unit"] = "mm"
    result["vpd_unit"] = "kPa"
    return result


def make_dataset(rows, start, end, negatives_per_positive, seed, session):
    rng = random.Random(seed)
    positives = []
    for row in rows:
        day = row["_date"]
        lat, lon = row["_lat"], row["_lon"]
        weather = weather_for(round(lat, 2), round(lon, 2), day, session)
        if not weather or any(weather.get(k) is None for k in FEATURES[:6]):
            continue
        positives.append({
            "date": day.isoformat(), "latitude": lat, "longitude": lon,
            **{k: weather[k] for k in FEATURES[:6]},
            "previous_fire_1km_30d": None,
            "label": 1,
            "label_type": "firms_hotspot_proxy_not_verified_fire",
            "label_source": row.get("satellite", "NASA FIRMS"),
            "source_time": row.get("acq_time", ""),
            "brightness": row.get("bright_ti4", row.get("brightness", "")),
            "frp": row.get("frp", ""),
            "weather_source": weather["weather_source"],
            "weather_timezone": weather["weather_timezone"],
            "temperature_unit": weather["temperature_unit"],
            "humidity_unit": weather["humidity_unit"],
            "wind_unit": weather["wind_unit"],
            "precipitation_unit": weather["precipitation_unit"],
            "et0_unit": weather["et0_unit"],
            "vpd_unit": weather["vpd_unit"],
            "precipitation_previous_6d": weather["precipitation_previous_6d"],
            "ndvi_mean": None, "ndmi_mean": None,
            "satellite_vegetation_status": "not_integrated",
        })

    if not positives:
        raise RuntimeError("No complete positive samples. Check dates, FIRMS key and provider availability.")

    # A negative means no FIRMS detection within 1 km for that sampled date.
    # It is explicitly not a verified fire-free label.
    negative_rows = []
    seen = set()
    attempts = 0
    target = len(positives) * negatives_per_positive
    while len(negative_rows) < target and attempts < target * 80:
        attempts += 1
        day = start + dt.timedelta(days=rng.randrange((end - start).days + 1))
        lat = round(rng.uniform(BBOX[1] + 0.03, BBOX[3] - 0.03), 2)
        lon = round(rng.uniform(BBOX[0] + 0.03, BBOX[2] - 0.03), 2)
        if any(distance_km(lat, lon, r["_lat"], r["_lon"]) <= 1 for r in rows if r["_date"] == day):
            continue
        key = (day.isoformat(), lat, lon)
        if key in seen:
            continue
        seen.add(key)
        weather = weather_for(lat, lon, day, session)
        if not weather or any(weather.get(k) is None for k in FEATURES[:6]):
            continue
        negative_rows.append({
            "date": day.isoformat(), "latitude": lat, "longitude": lon,
            **{k: weather[k] for k in FEATURES[:6]},
            "previous_fire_1km_30d": None,
            "label": 0,
            "label_type": "no_firms_detection_within_1km_not_verified_absence",
            "label_source": "NASA FIRMS sampled-region check",
            "source_time": "", "brightness": "", "frp": "",
            "weather_source": weather["weather_source"],
            "weather_timezone": weather["weather_timezone"],
            "temperature_unit": weather["temperature_unit"],
            "humidity_unit": weather["humidity_unit"],
            "wind_unit": weather["wind_unit"],
            "precipitation_unit": weather["precipitation_unit"],
            "et0_unit": weather["et0_unit"],
            "vpd_unit": weather["vpd_unit"],
            "precipitation_previous_6d": weather["precipitation_previous_6d"],
            "ndvi_mean": None, "ndmi_mean": None,
            "satellite_vegetation_status": "not_integrated",
        })
    if len(negative_rows) < target:
        print(f"WARNING: only built {len(negative_rows)} of {target} requested negative samples.")
    return positives + negative_rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--output", default="data/thrace_fire_dataset.csv")
    parser.add_argument("--negatives-per-positive", type=int, default=1)
    parser.add_argument("--seed", type=int, default=20261010)
    args = parser.parse_args()
    start, end = parse_date(args.start_date), parse_date(args.end_date)
    if end < start or args.negatives_per_positive < 1:
        parser.error("Date range must be ordered and negatives-per-positive must be >= 1.")
    key = os.getenv("FIRMS_MAP_KEY")
    if not key:
        raise SystemExit("Set FIRMS_MAP_KEY in the environment. Never commit the key to Git.")
    session = requests.Session()
    session.headers["User-Agent"] = "NexoraWildfireAI-research/1.0"
    print(f"Fetching NASA FIRMS standard products for {start} to {end}...")
    firms = fetch_firms(start, end, key, session)
    print(f"Fetched {len(firms)} candidate hotspot records; enriching with historical weather...")
    dataset = make_dataset(firms, start, end, args.negatives_per_positive, args.seed, session)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(dataset[0].keys()))
        writer.writeheader()
        writer.writerows(dataset)
    print(f"Wrote {len(dataset)} rows to {output}")
    print(f"Positive hotspot proxies: {sum(r['label'] == 1 for r in dataset)}")
    print(f"Negative no-detection samples: {sum(r['label'] == 0 for r in dataset)}")
    print("NDVI/NDMI are intentionally missing; this dataset does not train on vegetation indices.")


if __name__ == "__main__":
    main()
