# API keys and environment setup

NexoraWildfire AI can run its basic map and weather experience without paid API keys. Add optional provider credentials only for the integrations you want to enable.

## Required for the first real-data setup

1. **NASA FIRMS — `FIRMS_MAP_KEY`**: request a free MAP_KEY from the official NASA FIRMS website. Used by the backend hotspot endpoint. Without it, the app should report that FIRMS is not configured.
2. **Copernicus Data Space — `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET`**: create OAuth client credentials in your Copernicus Data Space account if you want Sentinel-2 statistics / NDVI/NDMI API requests. Keep both values on the backend only.
3. **Supabase — `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_ADMIN_KEY`**: the URL and publishable/anon key support the app's auth client; the admin/service-role secret is backend-only and must never be placed in HTML, JavaScript, or a `NEXT_PUBLIC_*` variable. The configured project must be the same project used by the deployed app.
4. **GIS worker — `NEXORA_WORKER_URL`, `NEXORA_WORKER_TOKEN`**: only if queued raster / NDVI jobs are deployed to the separate worker service.
5. **Web Push — `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_B64`, `VAPID_SUBJECT`**: only for push notifications. The private key stays server-side.

## No key needed for the current basic map

- Open-Meteo weather / air quality: no key for normal non-commercial use, subject to provider limits and terms.
- OpenStreetMap map tiles and basic Nominatim lookup: no API key for basic use; follow usage policy and avoid high-volume requests.
- RainViewer radar metadata: current integration does not require a project key, subject to provider terms and availability.
- Leaflet: loaded from a CDN in the hosted version.

## Where to add variables

- **Vercel backend/API**: Project → Settings → Environment Variables. Add only variables consumed by the API routes, choose the correct environment (Production/Preview/Development), then redeploy.
- **Railway backend or worker**: open the corresponding service → Variables, add its variables, then redeploy/restart that service.
- **Local development**: copy `backend/.env.example` to `backend/.env` for the API, and use `backend/.env.worker.example` for the worker. Do not commit the real `.env` files.

## Security rules

- Never paste secret values into a chat, issue, commit, or screenshot. Add them directly in the hosting provider's secret/environment-variable UI.
- Never put `SUPABASE_ADMIN_KEY`, `CDSE_CLIENT_SECRET`, `NEXORA_WORKER_TOKEN`, or `VAPID_PRIVATE_KEY_B64` in browser code or public variables.
- The Supabase anon/publishable key is designed to be visible to the browser, but it is safe only with correctly configured Row Level Security (RLS).
- Do not create an AI provider key until an AI feature actually needs it. The core weather/map routes do not require one.
- After adding keys, test provider health and inspect logs for status codes only; do not print credentials.
