# Nova Copilot: model agents, notifications and activation gates

## Three independent model agents

The API exposes:

- `GET /api/copilot/agents/status` — reports whether model configuration is present. This is configuration status, not a successful inference test.
- `POST /api/copilot/analyze` — collects Open-Meteo weather and air-quality/pollen data, then makes separate model requests for Agro-Agent, Eco-Agent, and Writer Agent. If any required agent fails, the endpoint returns an error rather than presenting a fabricated completed report.

Configure the backend runtime with:

- `OLLAMA_BASE_URL`: private, reachable Ollama-compatible HTTPS endpoint (local development can use `http://127.0.0.1:11434`).
- `OLLAMA_API_KEY`: optional bearer token for a protected gateway/reverse proxy. Do not expose an unauthenticated Ollama port to the public internet.
- `AGRO_AGENT_MODEL`: model name assigned to agricultural and soil/water interpretation.
- `ECO_AGENT_MODEL`: model name assigned to weather/ecosystem interpretation.
- `WRITER_AGENT_MODEL`: a separate model name assigned to Turkish report composition.

Each model must already be installed and available on the configured Ollama-compatible host. Use models that fit the host's memory/compute budget. A serverless deployment cannot reach a developer's `localhost`; configure a private, secured, reachable model gateway for production. Keep the model host and credentials in deployment environment variables, never in the repository.

## Background Web Push

The existing authenticated Web Push endpoints use VAPID and Supabase storage. Required server variables are `SUPABASE_URL`, `SUPABASE_ADMIN_KEY`, `VAPID_PRIVATE_KEY_B64`, and (for the scheduled runner) a strong random `NOVA_CRON_SECRET`.

- `GET /api/notifications/push/config` reports whether push is configured.
- `POST /api/notifications/push/subscribe` stores an authenticated user's subscription and area.
- `POST /api/notifications/push/test` sends a test push.
- `GET /api/notifications/cron/run` executes one risk-evaluation cycle only when called with `Authorization: Bearer <NOVA_CRON_SECRET>`.

**A scheduler must call the cron endpoint** at the desired interval. Adding a secret alone does not schedule jobs. The status endpoint intentionally does not claim background delivery is active just because VAPID keys exist. Test subscription, test delivery, a scheduled run, deduplication, expired-subscription cleanup, and failure monitoring before advertising reliable alerts.

## SMS / WhatsApp and Premium payments

These are not enabled by this change. They require an opted-in contact channel, verified provider accounts, secret credentials, delivery/error handling and user-level preferences. SMS/WhatsApp require an approved provider integration (for example Twilio or Meta WhatsApp Cloud API); Premium checkout requires a payment provider, signed webhook verification, durable subscription entitlements, cancellation/refund handling, and server-side authorization checks. Do not infer Premium access from a client-side label or successful browser redirect.

No payment keys, phone numbers, provider accounts, or production credentials are stored in source control. Until those external dependencies are configured and tested end-to-end, the product must continue to label these functions as inactive.

## Data integrity

- The agent report is environmental decision support, not an official warning or a substitute for a field inspection.
- Weather is provider-supplied/modelled data; it is not a direct soil-moisture sensor.
- Pollen remains `unavailable` when its provider call fails; it is never silently changed to zero.
- This endpoint does not create an NDVI/NDMI report. Satellite jobs and their completed worker output remain a separate pipeline.
