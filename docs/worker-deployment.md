# NexoraWildfire AI — persistent satellite worker

This worker moves long-running Sentinel-2 Statistical API calls and risk-raster rendering out of Vercel serverless functions. Vercel remains the short-request API and frontend; Redis/RQ and the processing worker run on a separate Linux host.

## What is implemented

- Authenticated Vercel endpoints: `POST /api/jobs/ndvi-timeseries`, `POST /api/jobs/risk-raster`, and `GET /api/jobs/{job_id}`.
- The API validates the Supabase access token through Supabase Auth before proxying a job.
- The worker API accepts requests only with `X-Nexora-Worker-Token`; job status is scoped to the authenticated user ID.
- Redis/RQ provides persistent queueing, bounded execution time, retries and result expiry.
- NDVI/NDMI JSON results stay in the job result. Raster PNG bytes are uploaded to a private Supabase Storage bucket and returned as a 15-minute signed URL, not stored in Redis.
- If the worker is not configured, the Vercel API returns an explicit 503 `worker_not_configured` response instead of pretending a job ran.

## VPS setup

1. Install Docker Engine and the Docker Compose plugin on a Linux VPS.
2. In `backend/`, copy `.env.worker.example` to `.env.worker` and set real values. Keep this file out of Git.
3. In Supabase Storage, create a **private** bucket named `nexora-job-artifacts` (or set `NEXORA_ARTIFACT_BUCKET` to your private bucket name).
4. Start the queue and worker:
   ```sh
   cp .env.worker.example .env.worker
   # Edit .env.worker before starting; do not use the example values.
   docker compose -f compose.worker.yml up -d --build
   docker compose -f compose.worker.yml ps
   docker compose -f compose.worker.yml logs --tail=100 worker-api queue-worker
   ```
5. Keep Redis private. The compose file does not publish Redis. By default the worker API binds to localhost only; put it behind a TLS reverse proxy such as Caddy/Nginx and set `WORKER_BIND_ADDRESS=127.0.0.1`. Do not expose port 8081 directly to the internet.
6. Set these **backend Production** environment variables in both Vercel projects only if that project serves the API:
   - `NEXORA_WORKER_URL`: the HTTPS URL of the worker API behind the reverse proxy, without a trailing slash.
   - `NEXORA_WORKER_TOKEN`: exactly the same long random secret as in `.env.worker`.
   - `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or `SUPABASE_PUBLISHABLE_KEY`) for verifying user sessions.
   - Worker-only `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`, `SUPABASE_ADMIN_KEY`, and `FIRMS_MAP_KEY` belong on the VPS only. Do not put them in browser variables or Git.
7. Redeploy the Vercel backend after setting its environment variables. The queue endpoints intentionally stay unavailable until this is done.

## API flow

1. Browser sends a Supabase access token to the Vercel `/api/jobs/*` endpoint.
2. Vercel verifies the token with Supabase Auth and forwards a narrow job payload to the worker over HTTPS with the server-only worker token.
3. Worker API adds the task to Redis/RQ and returns a job ID.
4. Browser polls `GET /api/jobs/{job_id}`. Only the user who submitted the job can retrieve its status/result.
5. The queue worker processes the CDSE request or raster, with retries and hard time limits.

## Data and model boundaries

- Configure a valid CDSE client ID/secret for processed Sentinel-2 statistics; public STAC scene discovery alone is not proof of processed imagery.
- Configure a valid NASA FIRMS `MAP_KEY` for hotspot observations. No key or zero returned observations must not be interpreted as “there are no fires”.
- No labelled historical dataset is present in the repository. The Random Forest model must remain `not_trained` until independently verified labels are curated and a chronological plus geographic holdout passes.
- The worker deployment is infrastructure-as-code, not proof that a VPS, secrets, storage bucket or DNS/TLS proxy has already been provisioned.
