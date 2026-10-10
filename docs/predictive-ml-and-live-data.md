# Predictive ML and live satellite verification

## What is real today

- `GET /satellite/live-check` performs a live Copernicus Data Space STAC catalog query for the Edirne area and checks the configured NASA FIRMS feed. It reports catalog discovery separately from image processing.
- A catalog result means a Sentinel-2 scene was found; it does **not** mean NDVI/NDMI was successfully processed.
- Actual NDVI/NDMI processing is performed by the persistent worker through `POST /jobs/ndvi-timeseries`. Verify a completed job and a non-empty `series` response before describing it as a successful live processing run.
- `GET /ml/status` stays `not_trained` unless a trained model artifact and metadata file exist. This repository does not contain a labeled historical fire dataset or a production-trained model.

## Training a real Random Forest model

Run training inside the isolated ML worker environment, not a Vercel request function:

1. Prepare a provenance-documented CSV outside Git. Set `NEXORA_LABEL_SOURCE` to a traceable provider/dataset name and version.
2. Required columns:
   - `observed_at`: UTC timestamp for each observation
   - `location_id`: stable geographic grid/site identifier
   - `label`: 1 if a documented fire occurs within the project-defined seven-day horizon; 0 only for a verified no-event observation
   - `temperature_max`, `humidity_min`, `wind_max`, `precipitation_sum`, `ndvi_mean`, `ndmi_mean`, `et0`, `vpd`, `previous_fire_1km_30d`
3. Minimum input gate: 500 valid rows, at least 50 positive and 50 negative rows, and five or more distinct location groups. These are minimum gates, not a claim that the dataset is representative.
4. On the worker, install `backend/requirements-ml.txt` and run:
   ```sh
   export NEXORA_LABEL_SOURCE="provider/dataset + version + retrieval date"
   python backend/scripts/train_model.py /secure/path/labeled_fire_history.csv
   ```
5. The script evaluates a chronological holdout and a separate location-group holdout. It writes `models/fire_risk.joblib` and `models/fire_risk_metadata.json` only if the configured minimum validation gates pass. A failed gate writes no model artifact.
6. Keep dataset provenance, licensing, label definition, missingness, geographic coverage, temporal coverage, false-negative cost, calibration and drift review with the model release. Do not treat the experiment as an official fire alarm.

The current API feature contract describes a seven-day outcome. Training labels must use that same horizon. If a dataset cannot establish verified negatives, do not label missing observations as no-fire.

## Verify after deployment

- `GET /health`: API health only; not proof that external data sources work.
- `GET /satellite/live-check`: inspect `sentinel2_catalog.status`, `sentinel2_processing.status`, and `nasa_firms.status`. `not_configured`, `error`, and `no_matching_scene` are meaningful outcomes and must not be replaced with synthetic values.
- `POST /jobs/ndvi-timeseries`: submit a valid Polygon for an authenticated user, poll `GET /jobs/{job_id}`, and confirm the result is finished with a non-empty time series and source metadata.
- `GET /ml/status`: only `ready` indicates an artifact and metadata file are present. Review the metadata's temporal and geographic holdout metrics before enabling user-facing predictions.
- `POST /ml/predict`: returns 503 while the model is not trained/valid. Never fall back to a rule-based score while labeling it ML.

## Infrastructure and deployment boundary

Vercel serves the frontend and short API requests. Redis/RQ plus the Docker worker handle long satellite/GIS tasks. The worker needs a real Linux host/VPS, private Redis, HTTPS reverse proxy, CDSE credentials, Supabase private artifact bucket credentials and a shared worker token. The repository's Compose file is deployment configuration; it does not mean a VPS or secrets have already been provisioned.

The recent Vercel build-rate-limit blocks have to clear before a production deployment can be verified. Do not claim the production site contains these changes until both deployment status and live endpoints are checked. Never put credentials in Git, frontend JavaScript, issue comments, or chat.
