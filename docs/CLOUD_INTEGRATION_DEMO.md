# Optional Google Cloud export (research demo)

This is a deliberately small cloud-integration demonstration for the NexoraWildfire AI research workflow. It uploads a **JSON analysis report only** to Google Cloud Storage (GCS); it does not upload a drone photo, run an AI model, or send data automatically from the website.

## Why this boundary matters

- The browser image lab processes the selected image locally.
- A human reviews the result and chooses whether to export a report.
- The exporter removes GPS/location, EXIF, image, filename, and device-identifying fields by default.
- A network upload only happens with the explicit `--confirm-upload` flag.
- GPS may be retained only with the separate explicit `--include-location` flag. Location data can be sensitive; use synthetic or consented research data for demonstrations.
- Google Cloud credentials, bucket IAM, billing, and retention settings must be configured by the project owner. No service-account key belongs in GitHub.
- This script is an optional demonstration, not a live website integration or evidence of production cloud availability.

## Quick start

1. Create a test bucket in Google Cloud and review its access policy, retention, and billing.
2. Configure Application Default Credentials using the official Google Cloud SDK flow for your own account/environment.
3. Install the optional dependency:

   ```bash
   python -m pip install -r scripts/requirements-cloud.txt
   ```

4. Prepare a JSON object with only the fields needed for the research record, then run a local dry run:

   ```bash
   python scripts/cloud_export_gcs.py sample-analysis-report.json
   ```

5. Inspect the sanitized output. Only when you intentionally want to upload it, run:

   ```bash
   export NEXORA_GCS_BUCKET=your-test-bucket-name
   python scripts/cloud_export_gcs.py sample-analysis-report.json --confirm-upload
   ```

Do not use a real incident location, personal data, or operationally sensitive drone metadata in a public demo. Use `--include-location` only when the location is necessary, approved, and appropriate for the audience.

## Cloud execution vs. local processing

GCS stores a report; it does not execute the wildfire model. Cloud inference would need a separate, secured API or container, a compatible model/license, authenticated requests, upload-size limits, data-retention rules, cost limits, and an independently validated dataset from the intended operating region. Until these are configured and tested, do not describe the project as a production cloud-detection service.

## Suggested competition demonstration

1. Load a consented/synthetic sample image in the browser lab.
2. Show the local RGB histogram, contrast/Sobel filters, and whether EXIF GPS actually exists.
3. Explain that the histogram is a measurable signal, not a fire classification.
4. Export a small sanitized JSON report and show the dry-run output.
5. If a real cloud account has been configured, demonstrate the explicit upload to a test bucket and show the object path without exposing credentials.
