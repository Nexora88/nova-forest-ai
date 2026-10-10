# =====================================
# NEXORAWILDFIRE AI
# NASA FIRMS Service
# =====================================

import os
import csv
import io
import requests

FIRMS_URL = "https://firms.modaps.eosdis.nasa.gov/api/area/csv"

TRAKYA_BBOX = {
    "west": 25.5,
    "south": 39.5,
    "east": 29.5,
    "north": 42.2
}



def validate_bbox(west: float, south: float, east: float, north: float) -> dict:
    """Validate a bounded WGS84 box before spending a provider API request."""
    values = (west, south, east, north)
    if not all(__import__("math").isfinite(float(value)) for value in values):
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
    """Fetch NASA FIRMS VIIRS observations for a validated geographic bounding box.

    When no box is supplied, preserve the original Thrace pilot behavior.
    """
    selected_bbox = bbox or TRAKYA_BBOX
    api_key = os.getenv("FIRMS_MAP_KEY")

    if not api_key:
        return {
            "status": "not_configured",
            "alert_count": 0,
            "alerts": [],
            "source": "NASA FIRMS",
            "bbox": selected_bbox
        }

    area = (
        f"{selected_bbox['west']},{selected_bbox['south']},"
        f"{selected_bbox['east']},{selected_bbox['north']}"
    )
    url = f"{FIRMS_URL}/{api_key}/VIIRS_SNPP_NRT/{area}/{days}"

    try:
        response = requests.get(url, timeout=20)
        response.raise_for_status()
        reader = csv.DictReader(io.StringIO(response.text))
        alerts = []

        for row in reader:
            try:
                alerts.append({
                    "latitude": float(row.get("latitude", 0)),
                    "longitude": float(row.get("longitude", 0)),
                    "confidence": row.get("confidence"),
                    "frp": row.get("frp"),
                    "acq_date": row.get("acq_date"),
                    "acq_time": row.get("acq_time"),
                    "source": "NASA FIRMS"
                })
            except (TypeError, ValueError):
                continue

        return {
            "status": "available",
            "alert_count": len(alerts),
            "alerts": alerts,
            "days": days,
            "source": "NASA FIRMS",
            "bbox": selected_bbox
        }

    except requests.RequestException as error:
        return {
            "status": "error",
            "alert_count": 0,
            "alerts": [],
            "days": days,
            "source": "NASA FIRMS",
            "bbox": selected_bbox,
            "error": str(error)
        }
