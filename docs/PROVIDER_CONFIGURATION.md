# Provider Configuration Checklist

**Do not commit credential values.** Add them in the deployment provider's environment-variable settings, scoped to the server/backend only where noted. Never paste secrets into a PR, issue, source file, browser JavaScript, or chat.

## Required to enable the current live satellite workflows

| Environment variable | Where | Purpose | Needed now? |
|---|---|---|---|
| `FIRMS_MAP_KEY` | Vercel backend/API | NASA FIRMS active-fire/thermal-anomaly API access | **Yes** for real FIRMS observations |
| `CDSE_CLIENT_ID` | Vercel backend/API | Copernicus Data Space Sentinel Hub OAuth client | **Yes** for Sentinel-2 processing |
| `CDSE_CLIENT_SECRET` | Vercel backend/API | Secret paired with the CDSE client ID | **Yes** for Sentinel-2 processing |
| `SUPABASE_URL` | Vercel backend/API and browser configuration | Supabase project endpoint | Needed for auth/account and authenticated jobs |
| `SUPABASE_ANON_KEY` or `SUPABASE_PUBLISHABLE_KEY` | Browser configuration; backend where its auth check expects it | Publishable/anon client key; use RLS and owner-scoped policies | Needed for Supabase login/job auth |
| `SUPABASE_ADMIN_KEY` | **Vercel backend only** | Privileged server-side account operations | Needed only for backend account-admin routes; never expose in browser |
| `NEXORA_WORKER_URL` | Vercel backend/API | URL of the separately deployed raster-processing worker | Needed for asynchronous Sentinel-2 raster jobs |
| `NEXORA_WORKER_TOKEN` | Vercel backend/API **and** worker service | Shared server-to-server authentication secret | Needed with the worker; generate a strong random value and set it in both places |

The exact names above match the repository's current backend implementation. Do not substitute names without changing the code and its tests.

## No API key required for these public sources

- **Open-Meteo weather and air quality:** no key is required for the public endpoints used by this project.
- **NASA GIBS imagery:** the public WMS layer used by the map does not require a project API key.
- **USGS earthquake feed:** public GeoJSON feed; no key is required.

These services can still fail, return incomplete results, or have unavailable tiles. A no-key source is not guaranteed to be always online.

## Official setup pages

1. **NASA FIRMS MAP_KEY** — request the free key using an email address:  
   https://firms.modaps.eosdis.nasa.gov/api/map_key  
   Official API usage guide: https://firms2.modaps.eosdis.nasa.gov/content/academy/data_api/firms_api_use.html

2. **Copernicus Data Space / Sentinel Hub OAuth client** — sign in to the CDSE account, open Sentinel Hub Dashboard → User Settings → OAuth clients, and create a client using the Client Credentials flow. Copy the secret securely when shown; it may not be shown again:  
   https://documentation.dataspace.copernicus.eu/APIs/SentinelHub/Overview/Authentication.html  
   Main CDSE portal: https://dataspace.copernicus.eu/

3. **Supabase project URL and client key** — in the Supabase project dashboard, open Project Settings / API Keys. Use a publishable/anon key in browser code only with correctly configured RLS. Keep privileged/admin/secret keys on the server:  
   https://supabase.com/dashboard  
   Key and secret guidance: https://supabase.com/docs/guides/functions/secrets

4. **Raster worker** — no third-party API key is issued for this variable pair. Deploy the project's worker to a supported host, then set `NEXORA_WORKER_URL` to that service URL and generate `NEXORA_WORKER_TOKEN` yourself. Configure the same token in the worker's server-side environment. Do not use a public or predictable token.

## Where to configure

- **Vercel:** Project → Settings → Environment Variables. Add server credentials to Production and Preview only as appropriate; deploy a new build after changing values. Do not add `SUPABASE_ADMIN_KEY`, `CDSE_CLIENT_SECRET`, `FIRMS_MAP_KEY`, or `NEXORA_WORKER_TOKEN` to public `NEXT_PUBLIC_*`/frontend variables.
- **Worker host:** set `NEXORA_WORKER_TOKEN` as a secret environment variable; keep the worker private or enforce token validation.
- **Supabase:** review RLS policies and owner-scoped access before enabling account or saved-area features.

## How to verify without revealing secrets

After configuration, run the GitHub Actions `provider-diagnostics` job or call the authenticated deployment diagnostics in a secure operator session:

- `GET /api/health` — backend process health only.
- `GET /api/satellite/providers/status?probe=true` — credential presence/validation states; never return or log the secret itself.
- `GET /api/satellite/live-check` — provider data state and whether a catalog scene was found.
- `POST /api/ndvi/area-timeseries` — Sentinel-2 processing path; a catalog scene alone does not prove NDVI is computed.
- Map provider status panel — separate runtime state for FIRMS, weather, GIBS and other visible layers.

Expected success states should be authorized/available and contain meaningful observation/acquisition timestamps or result samples. Configured, scene_found, HTTP 200, and a healthy backend alone do **not** prove live data processing is complete. A confirmed empty result must remain distinguishable from a provider failure.

## Known production snapshot

The existing production diagnostic recorded on **2026-10-20 19:21 UTC** reported:

- Backend health: HTTP 200.
- NASA FIRMS: `not_configured`.
- Copernicus STAC catalog: `scene_found`, but CDSE processing credentials: `not_configured`.
- NDVI processing: `not_configured`, zero time-series samples.

This is why the P0 provider workflows cannot yet be marked complete. After adding the credentials, run diagnostics again and review the latest timestamped result. Never send the secret values back through chat.
