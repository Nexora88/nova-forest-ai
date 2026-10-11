# Enterprise report worker

Deploy as a separate private service from the public frontend/API. Build with the backend directory as the Docker context and use worker/Dockerfile.

The HTTP service accepts authenticated internal job requests; a separate Celery process consumes the Redis queue. Do not expose this service publicly without its worker-token gate.

## Required runtime configuration

- REDIS_URL (persistent Redis, used by Celery and ownership records)
- NEXORA_WORKER_TOKEN (same value as the FastAPI proxy; server-side secret)
- SUPABASE_URL
- SUPABASE_SERVICE_ROLE_KEY (or existing SUPABASE_ADMIN_KEY; server-side only)
- SUPABASE_REPORTS_BUCKET (private Storage bucket, default enterprise-reports)
- RESEND_API_KEY
- REPORT_EMAIL_FROM (verified sender)

The report status endpoint returns a signed URL valid for 7 days. The worker queries Open-Meteo, attempts NASA FIRMS and Copernicus where configured, and marks provider failures rather than fabricating measurements. GIS buffer processing, provider coverage, email delivery, queue durability, security policy and production performance still require deployment-specific acceptance tests.

## Run locally

From the backend directory, run the HTTP API with:
    uvicorn worker.app:app --port 8080

Run a separate queue consumer:
    celery -A worker.tasks.celery_app worker --loglevel=INFO --concurrency=2

Both processes need the same environment variables and Redis service. Keep the worker URL private; configure NEXORA_WORKER_URL and NEXORA_WORKER_TOKEN on the API backend.
