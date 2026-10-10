# Global data, ML and historical snapshots

## Existing live integrations
- The FastAPI backend already has NASA FIRMS routes and Copernicus Sentinel-2 Statistical API NDVI/NDMI time-series code. These providers report `not_configured` when their server-side credentials are absent.
- The repository includes a scikit-learn model artifact and separate research inference routes. The UCI/Algeria-derived model is research-only; it must not be described as validated for Türkiye.
- The Trakya dataset pipeline downloads NASA FIRMS observations and joins Open-Meteo historical weather. It requires the GitHub Actions secret `FIRMS_MAP_KEY` and must be run from Actions → Build and evaluate Thrace hotspot dataset. No dataset or performance metrics should be claimed until that run succeeds and its chronological evaluation artifact is inspected.

## Global map smoke test
On the Risk Map, use **Global location / coordinates** to search a place or enter latitude and longitude. The map will center on that point and request current Open-Meteo weather plus the configured NASA FIRMS endpoint for a nearby bounding box. This is a live-provider smoke test, not a global fire-prediction model.

## Persistent history
1. Apply `supabase/migrations/20261010120000_daily_environment_snapshots.sql` in the Supabase SQL editor or through the Supabase CLI.
2. In GitHub repository Settings → Secrets and variables → Actions, set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. Do not paste either secret into source code or chat.
3. Run **Daily environmental history snapshots** manually once to verify, then it runs daily at 03:20 UTC.
4. The job snapshots only areas already synced to `nexorawildfire_areas`. Browser-only/local areas are not uploaded automatically by this job.
5. Authenticated users can read only their own rows due to RLS. The job uses the server-only service-role credential for inserts.

The stored indicator is intentionally labelled rule-based. It is not a calibrated wildfire probability, and weather observations are not evidence of a confirmed fire. NDVI requires a valid Copernicus Data Space client credential and clear imagery; no synthetic NDVI values are substituted.
