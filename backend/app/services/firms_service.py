# =====================================
# NOVA-FOREST AI
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


def get_firms_alerts(days: int = 1) -> dict:
    """NASA FIRMS VIIRS alan gözlemlerini getirir."""
    api_key = os.getenv("FIRMS_MAP_KEY")

    if not api_key:
        return {
            "status": "not_configured",
            "alert_count": 0,
            "alerts": [],
            "source": "NASA FIRMS"
        }

    area = (
        f"{TRAKYA_BBOX['west']},{TRAKYA_BBOX['south']},"
        f"{TRAKYA_BBOX['east']},{TRAKYA_BBOX['north']}"
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
            "source": "NASA FIRMS"
        }

    except requests.RequestException as error:
        return {
            "status": "error",
            "alert_count": 0,
            "alerts": [],
            "days": days,
            "source": "NASA FIRMS",
            "error": str(error)
        }
