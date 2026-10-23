# Production integration checklist — 2026-10-23

## Copilot agents
- Configure `AI_API_BASE_URL`, `AI_API_KEY`, `NEXORA_AGRO_MODEL`, `NEXORA_ECO_MODEL`, and `NEXORA_WRITER_MODEL` in backend hosting.
- `POST /copilot/daily-report` requires a valid Supabase bearer token and a lat/lon. An optional GeoJSON Polygon requests a processed Sentinel-2 time series.
- Each role has an independent prompt and model setting. If any role is unconfigured, the API reports `agents_not_ready` rather than pretending a model ran.

## Alerts
- Apply `supabase/migrations/20261023090000_provider_integrations.sql`.
- Set Twilio Account SID/Auth Token/Verify Service SID and SMS/WhatsApp sender IDs in backend and persistent worker environment.
- Users must verify a phone with `/messages/verify/start` and `/messages/verify/check`, then opt into an area with `/messages/subscribe`.
- Run `notification-scheduler` as a persistent service. A serverless API process alone cannot guarantee background delivery. The scheduler has a six-hour alert cooldown.

## Premium
- Set Stripe secret, webhook signing secret, Pro Price ID, and the canonical app URL.
- Register `POST /billing/webhook` in Stripe and apply the SQL migration before enabling Checkout.
- Only a signature-verified checkout/subscription event changes the profile plan. Never grant a paid plan based on the browser redirect alone.

## Verification
- Run backend tests and the GitHub Actions checks.
- Confirm AI provider health, CDSE credentials and worker job completion, Twilio Verify and delivery, Stripe test-mode checkout/webhook, and scheduled push on the deployed services before calling any feature live.
