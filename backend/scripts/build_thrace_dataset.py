"""Build a reproducible Thrace FIRMS-hotspot + historical-weather dataset.

Labels are proxies: a FIRMS thermal detection is not a verified wildfire, and
no detection is not proof that a fire did not occur. Weather is ERA5-Land
reanalysis, not a local weather-station observation.
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
BBOX = (26.0, 40.5, 28.5, 42.2)  # west, south, east, north; Thrace pilot
SOURCES = ("VIIRS_NOAA20_SP", "VIIRS_NOAA21_SP")
FEATURES = (
    "temperature_max", "humidity_min", "wind_max", "precipitation_sum",
    "et0", "vpd_max", "precipitation_previous_6d",
)


def parse_date(value):
    return dt.date.fromisoformat(value)


def date_chunks(start, end, size=5):
    cursor = start
    while cursor <= end:
        last = min(end, cursor + dt.timedelta(days=size - 1))
        yield cursor, last
        cursor = last + dt.timedelta(days=1)


def inside_bbox(lat, lon):
    west, south, east, north = BBOX
    return south <= lat <= north and west <= lon <= east


def distance_km(lat1, lon1, lat2, lon2):
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dp, dl = math.radians(lat2 - lat1), math.radians(lon2 - lon1)
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
            body = response.text.strip()
            if not body or body.lower().startswith("invalid"):
                raise RuntimeError(f"NASA FIRMS returned an unusable response for {source}, {first}.")
            for row in csv.DictReader(io.StringIO(body)):
                try:
                    lat, lon = float(row["latitude"]), float(row["longitude"])
                    day = parse_date(row["acq_date"])
                except (KeyError, TypeError, ValueError):
                    continue
                if not inside_bbox(lat, lon) or not start <= day <= end:
                    continue
                row["_lat"], row["_lon"], row["_date"] = lat, lon, day
                # Collapse sensor duplicates into one approximate 1-km cell/day.
                records[(day.isoformat(), round(lat, 2), round(lon, 2))] = row
            time.sleep(0.15)
    return list(records.values())


def weather_for(lat, lon, day, session):
    first = day - dt.timedelta(days=6)
    params = {
        "latitude": lat, "longitude": lon,
        "start_date": first.isoformat(), "end_date": day.isoformat(),
        "daily": ",".join((
            "temperature_2m_max", "relative_humidity_2m_min",
            "wind_speed_10m_max", "precipitation_sum",
            "et0_fao_evapotranspiration", "vapour_pressure_deficit_max",
        )),
        "timezone": "Europe/Istanbul", "wind_speed_unit": "kmh",
        "precipitation_unit": "mm", "temperature_unit": "celsius",
        "models": "era5_land",
    }
    response = session.get(WEATHER_URL, params=params, timeout=45)
    response.raise_for_status()
    daily = response.json().get("daily") or {}
    dates = daily.get("time") or []
    try:
        index = dates.index(day.isoformat())
    except ValueError:
        return None
    source_fields = {
        "temperature_max": "temperature_2m_max",
        "humidity_min": "relative_humidity_2m_min",
        "wind_max": "wind_speed_10m_max",
        "precipitation_sum": "precipitation_sum",
        "et0": "et0_fao_evapotranspiration",
        "vpd_max": "vapour_pressure_deficit_max",
    }
    result = {}
    for output, source in source_fields.items():
        values = daily.get(source) or []
        result[output] = values[index] if index < len(values) else None
    rain = daily.get("precipitation_sum") or []
    result["precipitation_previous_6d"] = (
        round(sum(float(value) for value in rain[:index] if value is not None), 3)
        if index > 0 else None
    )
    result.update({
        "weather_source": "Open-Meteo ERA5-Land reanalysis",
        "weather_time": day.isoformat(),
        "weather_timezone": "Europe/Istanbul",
        "temperature_unit": "degC",
        "humidity_unit": "percent",
        "wind_unit": "km/h",
        "precipitation_unit": "mm",
        "et0_unit": "mm",
        "vpd_unit": "kPa",
    })
    return result


def row_from_sample(day, lat, lon, weather, label, label_type, label_source, source_row=None):
    source_row = source_row or {}
    return {
        "date": day.isoformat(), "latitude": lat, "longitude": lon,
        **{feature: weather[feature] for feature in FEATURES},
        "label": label, "label_type": label_type, "label_source": label_source,
        "source_time": source_row.get("acq_time", ""),
        "brightness": source_row.get("bright_ti4", source_row.get("brightness", "")),
        "frp": source_row.get("frp", ""),
        "weather_source": weather["weather_source"],
        "weather_time": weather["weather_time"],
        "weather_timezone": weather["weather_timezone"],
        "temperature_unit": weather["temperature_unit"],
        "humidity_unit": weather["humidity_unit"],
        "wind_unit": weather["wind_unit"],
        "precipitation_unit": weather["precipitation_unit"],
        "et0_unit": weather["et0_unit"],
        "vpd_unit": weather["vpd_unit"],
        "ndvi_mean": None, "ndmi_mean": None,
        "satellite_vegetation_status": "not_integrated",
    }


def make_dataset(rows, start, end, negatives_per_positive, seed, session):
    rng = random.Random(seed)
    cache = {}
    def get_weather(lat, lon, day):
        key = (round(lat, 2), round(lon, 2), day)
        if key not in cache:
            cache[key] = weather_for(key[0], key[1], day, session)
        return cache[key]

    positives = []
    for row in rows:
        day, lat, lon = row["_date"], row["_lat"], row["_lon"]
        weather = get_weather(lat, lon, day)
        if not weather or any(weather.get(feature) is None for feature in FEATURES):
            continue
        positives.append(row_from_sample(
            day, lat, lon, weather, 1,
            "firms_hotspot_proxy_not_verified_fire",
            row.get("satellite", "NASA FIRMS"), row,
        ))
    if not positives:
        raise RuntimeError("No complete positive samples. Check date range, FIRMS key and provider availability.")

    # A negative means no FIRMS detection within 1 km on that date, not proven absence of fire.
    negatives = []
    seen = set()
    attempts = 0
    target = len(positives) * negatives_per_positive
    while len(negatives) < target and attempts < target * 80:
        attempts += 1
        day = start + dt.timedelta(days=rng.randrange((end - start).days + 1))
        lat = round(rng.uniform(BBOX[1] + 0.03, BBOX[3] - 0.03), 2)
        lon = round(rng.uniform(BBOX[0] + 0.03, BBOX[2] - 0.03), 2)
        if any(distance_km(lat, lon, item["_lat"], item["_lon"]) <= 1 for item in rows if item["_date"] == day):
            continue
        key = (day.isoformat(), lat, lon)
        if key in seen:
            continue
        seen.add(key)
        weather = get_weather(lat, lon, day)
        if not weather or any(weather.get(feature) is None for feature in FEATURES):
            continue
        negatives.append(row_from_sample(
            day, lat, lon, weather, 0,
            "no_firms_detection_within_1km_not_verified_absence",
            "NASA FIRMS sampled-region check",
        ))
    if len(negatives) < target:
        print(f"WARNING: only built {len(negatives)} of {target} requested negative samples.")
    return positives + negatives


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--start-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--end-date", required=True, help="YYYY-MM-DD")
    parser.add_argument("--output", default="data/thrace_fire_dataset.csv")
    parser.add_argument("--negatives-per-positive", type=int, default=1)
    parser.add_argument("--max-positive", type=int, default=500,
                        help="Limit weather API requests; samples are selected reproducibly across returned detections.")
    parser.add_argument("--seed", type=int, default=20261010)
    args = parser.parse_args()
    start, end = parse_date(args.start_date), parse_date(args.end_date)
    if end < start or args.negatives_per_positive < 1 or args.max_positive < 1:
        parser.error("Date range must be ordered; sample limits must be positive.")
    key = os.getenv("FIRMS_MAP_KEY")
    if not key:
        raise SystemExit("Set FIRMS_MAP_KEY in the environment. Never commit the key to Git.")
    session = requests.Session()
    session.headers["User-Agent"] = "NexoraWildfireAI-research/1.0"
    print(f"Fetching NASA FIRMS standard products for {start} to {end}...")
    firms = fetch_firms(start, end, key, session)
    if len(firms) > args.max_positive:
        firms = sorted(random.Random(args.seed).sample(firms, args.max_positive), key=lambda row: row["_date"])
    print(f"Using {len(firms)} candidate hotspot cells; enriching with historical weather...")
    dataset = make_dataset(firms, start, end, args.negatives_per_positive, args.seed, session)
    output = Path(args.output)
    output.parent.mkdir(parents=True, exist_ok=True)
    with output.open("w", newline="", encoding="utf-8") as stream:
        writer = csv.DictWriter(stream, fieldnames=list(dataset[0].keys()))
        writer.writeheader()
        writer.writerows(dataset)
    print(f"Wrote {len(dataset)} rows to {output}")
    print(f"Positive hotspot proxies: {sum(row['label'] == 1 for row in dataset)}")
    print(f"Negative no-detection samples: {sum(row['label'] == 0 for row in dataset)}")
    print("NDVI/NDMI are not integrated. No synthetic samples were created.")


if __name__ == "__main__":
    main()
