#!/usr/bin/env python3
"""Explicit, metadata-only export of a NexoraWildfire analysis JSON report to GCS.

Nothing is uploaded unless --confirm-upload is supplied. Image bytes are never
read or uploaded by this script. GPS/location fields are removed by default.
Authentication uses Google Application Default Credentials; never commit keys.
"""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from uuid import uuid4

SENSITIVE_KEYS = {
    "lat", "latitude", "lon", "lng", "longitude", "gps", "coordinates",
    "location", "exif", "filename", "filepath", "image", "image_path",
    "image_base64", "base64", "raw_image", "drone_serial", "device_id",
}


def sanitize(value, include_location: bool = False):
    if isinstance(value, dict):
        clean = {}
        for key, item in value.items():
            normalized = re.sub(r"[^a-z0-9]+", "_", str(key).lower()).strip("_")
            if normalized in SENSITIVE_KEYS and not (
                include_location and normalized in {"lat", "latitude", "lon", "lng", "longitude", "coordinates", "location"}
            ):
                continue
            clean[str(key)] = sanitize(item, include_location=include_location)
        return clean
    if isinstance(value, list):
        return [sanitize(item, include_location=include_location) for item in value]
    if isinstance(value, (str, int, float, bool)) or value is None:
        return value
    raise ValueError(f"Unsupported JSON value type: {type(value).__name__}")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("report", type=Path, help="Path to an existing JSON analysis report")
    parser.add_argument("--confirm-upload", action="store_true", help="Required to permit network upload")
    parser.add_argument("--include-location", action="store_true", help="Explicitly retain GPS/location fields")
    parser.add_argument("--bucket", default=os.getenv("NEXORA_GCS_BUCKET"), help="GCS bucket name (or NEXORA_GCS_BUCKET)")
    parser.add_argument("--prefix", default="nexorawildfire/research-reports", help="Object prefix inside the bucket")
    args = parser.parse_args()

    if not args.report.is_file():
        parser.error("Report file does not exist.")
    try:
        report = json.loads(args.report.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError) as exc:
        parser.error(f"Could not read a valid UTF-8 JSON report: {exc}")
    if not isinstance(report, dict):
        parser.error("The top-level report must be a JSON object.")
    safe_report = sanitize(report, include_location=args.include_location)
    safe_report.setdefault("export_metadata", {})
    safe_report["export_metadata"].update({
        "exported_at_utc": datetime.now(timezone.utc).isoformat(),
        "export_type": "metadata-only-json",
        "gps_included": bool(args.include_location),
        "image_bytes_uploaded": False,
    })
    payload = json.dumps(safe_report, ensure_ascii=False, indent=2).encode("utf-8")

    if not args.confirm_upload:
        print("DRY RUN: nothing uploaded.")
        print(f"Sanitized JSON bytes: {len(payload)}")
        print(f"GPS retained: {'yes (explicitly requested)' if args.include_location else 'no'}")
        print("Review the sanitized payload locally, then rerun with --confirm-upload to send it.")
        print(payload.decode("utf-8"))
        return 0
    if not args.bucket:
        parser.error("Set NEXORA_GCS_BUCKET or pass --bucket.")
    if not re.fullmatch(r"[a-z0-9][a-z0-9._-]{1,220}[a-z0-9]", args.bucket):
        parser.error("Bucket name has an invalid format.")
    try:
        from google.cloud import storage
    except ImportError:
        print("Install scripts/requirements-cloud.txt first.", file=sys.stderr)
        return 2

    object_name = f"{args.prefix.strip('/')}/{datetime.now(timezone.utc):%Y/%m/%d}/{uuid4().hex}.json"
    try:
        client = storage.Client()
        blob = client.bucket(args.bucket).blob(object_name)
        blob.upload_from_string(payload, content_type="application/json; charset=utf-8")
    except Exception as exc:  # SDK exceptions vary by credential/network configuration.
        print(f"Upload failed: {type(exc).__name__}: {exc}", file=sys.stderr)
        return 1
    print(f"Uploaded sanitized JSON report to gs://{args.bucket}/{object_name}")
    print("No image file was uploaded. Confirm bucket IAM, retention, and billing in Google Cloud.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
