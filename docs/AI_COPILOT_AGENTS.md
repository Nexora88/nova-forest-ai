# NexoraWildfire AI Copilot — independent model agents

## Architecture

The authenticated `POST /copilot/report` endpoint performs three distinct model calls:

1. **Agro-Agent** — its own configured model ID interprets supplied weather, rainfall, ET₀, crop coefficient and any explicitly supplied satellite observations.
2. **Eco-Agent** — its own configured model ID interprets weather and supplied environmental/ecosystem signals.
3. **Writer Agent** — its own configured model ID combines the two outputs into a Turkish daily report.

Agro and Eco run concurrently; Writer runs after both succeed. A failed provider call fails the report rather than returning a rule-based or fabricated AI result. The existing rule-based field summary remains separately labelled as such.

The service uses an OpenAI-compatible `/chat/completions` endpoint and does not bundle a particular provider SDK. The configured provider receives the report context and model prompts. Exact latitude/longitude is used for server-side validation but is removed from the model payload after weather data has already been obtained. Do not put API keys in frontend code or commit them to Git.

## Required server environment

Set these in the backend hosting environment (not in the static frontend):

- `NEXORA_AI_BASE_URL` — provider API base ending in `/v1` where appropriate.
- `NEXORA_AI_API_KEY` — server-side secret.
- `AGRO_AGENT_MODEL` — configured model identifier for Agro-Agent.
- `ECO_AGENT_MODEL` — configured model identifier for Eco-Agent.
- `WRITER_AGENT_MODEL` — configured model identifier for Writer Agent.
- `NEXORA_AI_TIMEOUT_SECONDS` — optional, 5–90 seconds; default 45.

All three model IDs must be configured. They should identify the intended separate models; setting them to the same ID is technically accepted by the endpoint but does not provide model diversity. `AI_API_KEY` is supported only as a legacy alias.

## Client behavior

Nova Bee sends the selected area's current forecast to the authenticated endpoint. The result is shown with each model ID and the final report. A missing configuration returns HTTP 503; upstream failure returns HTTP 502. The UI must not call either response a successful AI report.

The satellite report button submits a real NDVI/NDMI job and now polls the authenticated job endpoint for completion while the page stays open. A queued job is not a completed report. A completed series still requires valid Copernicus Data Space credentials and a running worker/Redis deployment.

## Still requires provider provisioning

This code does not by itself provision a model account, create secrets in the production environment, start the satellite worker, or activate SMS/WhatsApp or paid subscriptions. Those external accounts, permissions, environment variables and end-to-end delivery/payment checks must be completed before calling those capabilities production-ready. Background Web Push is best-effort and depends on configured VAPID keys, stored subscriptions, a running scheduler/worker and reachable push services; no external alert channel guarantees delivery.
