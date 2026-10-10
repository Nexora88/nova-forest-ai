# NexoraWildfire AI — model, satellite and compute roadmap

## 1. Truthful AI boundary

The existing weather/risk engine is a transparent rule-based decision-support signal. It is not a trained model and must not be labelled as one. The new `/ml/status` and `/ml/predict` endpoints separate genuine ML inference from those rules. Until a model is trained on independently verified, real labels, status is `not_trained` and prediction returns HTTP 503. No accuracy, F1 or probability is fabricated.

A Random Forest training pipeline is included. It requires at least 500 labelled observations and at least 50 examples per class, uses a chronological holdout, records metrics and requires documented label provenance. This is a baseline pipeline, not proof of model quality. Production readiness additionally requires geographic/seasonal validation, calibration, leakage review, independent test data, drift monitoring and human review.

## 2. Copernicus Sentinel-2: what is live and what is gated

- Public CDSE STAC catalog search in `ndvi_service.py` discovers real Sentinel-2 L2A scenes without credentials.
- Pixel/statistical processing uses the Copernicus Statistical API and Process API. Those calls require backend-only `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET`; no credentials are bundled.
- `POST /ndvi/area-timeseries` calculates NDVI (B08/B04) and NDMI (B08/B11) from the returned statistics, including cloud/shadow exclusions in the evalscript.
- `GET /ndvi/risk-raster` requests a processed raster and combines its spatial vegetation signal with current Open-Meteo weather. It is a rule-based composite, not the ML model.
- `GET /satellite/status` reports discovery status; a discovered scene is not the same thing as processed NDVI. Use the area-timeseries endpoint to verify actual processed output.
- NASA FIRMS is a separate hotspot source and requires a valid FIRMS MAP_KEY for live feeds. A missing key or empty result must remain “not configured/no observations”, never be converted into a false “no fire” assertion.

Before claiming the satellite pipeline is production-live, run an integration test with configured credentials against a known polygon, record request time, scene ID, cloud cover, output sample count and error state, and confirm the response is from the live provider. Do not commit credentials or raw sensitive tokens.

## 3. Why Vercel should not process heavy GIS jobs

Keep Vercel for the static/PWA frontend and short, bounded API calls. Long Statistical API jobs, large rasters, multi-region historical extraction and model retraining should move to a persistent worker service (container/VPS/cloud job runner), with:
- a job queue (Redis or managed queue),
- object storage for raster/model artifacts,
- Postgres/Supabase job metadata and status,
- idempotent jobs, retry/backoff, quotas and request limits,
- CPU/RAM/time budgets and logs/metrics,
- authenticated job submission and private artifact URLs.

Recommended first deployment: a modest Linux VPS or a managed container worker, Dockerized and isolated from the frontend. Store CDSE credentials and model files only in worker/backend secret storage. Do not run unbounded image processing in request handlers. The API should submit a job and return a job ID; clients poll a status endpoint or receive a completion notification. Vercel Cron/Supabase pg_cron may schedule jobs but should not execute the heavy image processing itself.

## 4. Acceptance checks

1. Without CDSE credentials, status must say not configured and processed output must not be faked.
2. With credentials, run one small polygon and verify real NDVI/NDMI time-series values and timestamps.
3. With no trained artifact, `/ml/status` must say `not_trained` and `/ml/predict` must return 503.
4. Train only from documented verified labels; publish evaluation metrics with dataset period and class counts.
5. Test on a later time period and a separate geographic region before any public operational claim.
6. Load-test API limits; move raster/history/retraining work to a worker before scaling.
