# =====================================
# NEXORAWILDFIRE AI
# NASA FIRMS Service
# =====================================

import os
import csv
import io
import math
from datetime import datetime, timezone

import requests

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

TRAKYA_BBOX = {
    "west": 25.5,
    "south": 39.5,
    "east": 29.5,
    "north": 42.2,
}


def validate_bbox(west: float, south: float, east: float, north: float) -> dict:
    """Validate a bounded WGS84 box before spending a provider API request."""
    values = (west, south, east, north)
    if not all(math.isfinite(float(value)) for value in values):
        raise ValueError("Bounding-box coordinates must be finite numbers.")
    if not (-180 <= west <= 180 and -180 <= east <= 180):
        raise ValueError("Longitude coordinates must be between -180 and 180.")
    if not (-90 <= south <= 90 and -90 <= north <= 90):
        raise ValueError("Latitude coordinates must be between -90 and 90.")
    if west >= east or south >= north:
        raise ValueError("west must be less than east and south less than north.")
    if east - west > 10 or north - south > 10:
        raise ValueError("Bounding box is too large; maximum width and height are 10 degrees.")
    return {"west": west, "south": south, "east": east, "north": north}


def get_firms_alerts(days: int = 1, bbox: dict | None = None) -> dict:
    """Fetch NASA FIRMS observations without treating missing data as zero detections."""
    selected_bbox = bbox or TRAKYA_BBOX
    if not isinstance(days, int) or not 1 <= days <= 10:
        raise ValueError("days must be an integer between 1 and 10")
    api_key = os.getenv("FIRMS_MAP_KEY", "").strip()
    checked_at = datetime.now(timezone.utc).isoformat()

    if not api_key:
        return {
            "status": "not_configured",
            "alert_count": None,
            "alerts": [],
            "days": days,
            "source": "NASA FIRMS",
            "bbox": selected_bbox,
            "checked_at_utc": checked_at,
            "note": "No query was made because the provider credential is not configured.",
        }

    area = (
        f"{selected_bbox['west']},{selected_bbox['south']},"
        f"{selected_bbox['east']},{selected_bbox['north']}"
    )
    url = f"{FIRMS_URL}/{api_key}/VIIRS_SNPP_NRT/{area}/{days}"

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        body = (response.text or "").strip()
        if not body:
            return {
                "status": "error", "alert_count": None, "alerts": [], "days": days,
                "source": "NASA FIRMS", "bbox": selected_bbox, "checked_at_utc": checked_at,
                "error_type": "EmptyProviderResponse",
                "note": "NASA FIRMS returned an empty response; zero detections cannot be confirmed.",
            }
        reader = csv.DictReader(io.StringIO(body))
        required = {"latitude", "longitude", "acq_date"}
        if not reader.fieldnames or not required.issubset(set(reader.fieldnames)):
            return {
                "status": "error", "alert_count": None, "alerts": [], "days": days,
                "source": "NASA FIRMS", "bbox": selected_bbox, "checked_at_utc": checked_at,
                "error_type": "InvalidProviderResponse",
                "note": "NASA FIRMS response did not contain the expected CSV columns; zero detections cannot be confirmed.",
            }
        alerts = []
        invalid_rows = 0

        for row in reader:
            try:
                latitude_raw = row.get("latitude")
                longitude_raw = row.get("longitude")
                if latitude_raw in (None, "") or longitude_raw in (None, ""):
                    invalid_rows += 1
                    continue
                latitude = float(latitude_raw)
                longitude = float(longitude_raw)
                if not (math.isfinite(latitude) and math.isfinite(longitude)):
                    invalid_rows += 1
                    continue
                if not (-90 <= latitude <= 90 and -180 <= longitude <= 180):
                    invalid_rows += 1
                    continue
                alerts.append({
                    "latitude": latitude,
                    "longitude": longitude,
                    "confidence": row.get("confidence"),
                    "frp": row.get("frp"),
                    "acq_date": row.get("acq_date"),
                    "acq_time": row.get("acq_time"),
                    "source": "NASA FIRMS",
                })
            except (TypeError, ValueError):
                invalid_rows += 1

        return {
            "status": "available",
            "alert_count": len(alerts),
            "alerts": alerts,
            "invalid_rows_skipped": invalid_rows,
            "days": days,
            "source": "NASA FIRMS",
            "bbox": selected_bbox,
            "checked_at_utc": checked_at,
        }

    except requests.RequestException as exc:
        # Never return str(exc): request URLs may contain the provider API key.
        return {
            "status": "error",
            "alert_count": None,
            "alerts": [],
            "days": days,
            "source": "NASA FIRMS",
            "bbox": selected_bbox,
            "checked_at_utc": checked_at,
            "error_type": type(exc).__name__,
            "note": "Provider request failed; no hotspot count is available.",
        }
