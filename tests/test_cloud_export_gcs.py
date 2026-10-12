"""Tests for the opt-in, metadata-only GCS export demonstration."""
from __future__ import annotations

import json
import subprocess
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / "scripts" / "cloud_export_gcs.py"


class CloudExportDryRunTests(unittest.TestCase):
    def run_export(self, report: dict, *flags: str):
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "report.json"
            source.write_text(json.dumps(report), encoding="utf-8")
            return subprocess.run(
                [sys.executable, str(SCRIPT), str(source), *flags],
                check=False,
                capture_output=True,
                text=True,
                encoding="utf-8",
            )

    def test_dry_run_strips_location_and_image_fields(self):
        result = self.run_export({
            "summary": "sample",
            "latitude": 41.2,
            "longitude": 26.4,
            "coordinates": [41.2, 26.4],
            "exif": {"GPSLatitude": 41.2},
            "image_base64": "should-not-leak",
            "metrics": {"red_share": 0.04},
        })
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("DRY RUN: nothing uploaded.", result.stdout)
        self.assertIn('"red_share": 0.04', result.stdout)
        self.assertNotIn("should-not-leak", result.stdout)
        self.assertNotIn("41.2", result.stdout)
        self.assertIn('"image_bytes_uploaded": false', result.stdout)

    def test_location_is_retained_only_when_explicitly_requested(self):
        result = self.run_export({"latitude": 41.2, "longitude": 26.4}, "--include-location")
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn('"latitude": 41.2', result.stdout)
        self.assertIn("GPS retained: yes (explicitly requested)", result.stdout)

    def test_upload_requires_explicit_confirmation(self):
        result = self.run_export({"summary": "sample"})
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertIn("DRY RUN", result.stdout)
        self.assertNotIn("Uploaded sanitized JSON report", result.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
