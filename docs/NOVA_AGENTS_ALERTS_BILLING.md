# NovaWildfire agents, satellite reports, alerts and billing

This change adds real provider-backed integrations, but external services must be configured before they can send messages, run model calls, process Sentinel-2 imagery or collect payments. The application deliberately returns explicit unavailable/error states rather than faking successful results.

## 1. Role-separated Copilot models

Configure the following backend environment variables on the deployed API:

- `NEXORA_LLM_BASE_URL`: OpenAI-compatible API base URL, without the `/chat/completions` suffix.
- `NEXORA_LLM_API_KEY`: server-only secret.
- `NEXORA_LLM_MODEL`: provider model ID.

`POST /copilot/analyze` performs separate Eco-Agent, Agro-Agent and Writer Agent model calls. Requests require a valid Supabase access token. The output includes weather evidence, provider timestamps, and the actual Sentinel-2 series status. If no CDSE series is returned, the response must not be interpreted as a completed satellite report.

## 2. Completed Sentinel-2 NDVI/NDMI report

Apply the existing worker/Supabase migrations and configure `CDSE_CLIENT_ID`, `CDSE_CLIENT_SECRET`, `NEXORA_WORKER_URL`, `NEXORA_WORKER_TOKEN`, `REDIS_URL`, `SUPABASE_URL`, and `SUPABASE_ADMIN_KEY` on the services that use them. The Nova Bee page now polls the authenticated job endpoint and renders the result only when the worker reports a finished job with a non-empty series. If the worker or CDSE credentials are missing, no completed report is claimed.

## 3. Web Push, SMS and WhatsApp

Apply `supabase/migrations/20261024090000_copilot_channels_and_billing.sql`.

Configure:
- Existing Web Push: `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY_B64`, `VAPID_SUBJECT`, `SUPABASE_URL`, `SUPABASE_ADMIN_KEY`.
- Twilio: `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_SMS_FROM`, `TWILIO_WHATSAPP_FROM`.
- Verification and scheduled cycle: `NEXORA_OTP_SECRET`, `NEXORA_NOTIFICATION_CRON_TOKEN`.

Users opt in explicitly and verify the E.164 phone number with a one-time code. Configure a repository Actions secret named `NEXORA_NOTIFICATION_CRON_TOKEN` with the same value as the backend environment variable. The scheduled workflow calls `POST /api/notifications/internal/run-cycle` every 15 minutes. Provider/operator outages and OS/browser restrictions mean delivery is not guaranteed; delivery is only attempted when the scheduled workflow runs successfully.

WhatsApp sender IDs must be approved/configured in the Twilio account. SMS and WhatsApp charges may apply.

## 4. Stripe Pro subscription

Configure a recurring Pro Price in Stripe and set:
- `STRIPE_SECRET_KEY`
- `STRIPE_PRO_PRICE_ID`
- `STRIPE_WEBHOOK_SECRET`
- `NEXORA_BILLING_SUCCESS_URL`
- `NEXORA_BILLING_CANCEL_URL`
- `SUPABASE_URL`, `SUPABASE_ADMIN_KEY`

Register the Stripe webhook endpoint as `https://nova-forest-ai.vercel.app/api/billing/webhook` and subscribe to `checkout.session.completed`, `customer.subscription.created`, `customer.subscription.updated`, and `customer.subscription.deleted`. The webhook signature is verified before a subscription or profile plan is updated. Apply the migration before testing checkout. Never place server secrets in frontend code.

## 5. Risk map and branding

The injected provider-status card was removed from the risk-map page; the existing compact source/status label remains. The map layer/district panel can be dismissed and reopened without covering the map. Header branding uses the dark Nexora SVG mark and keeps the existing military-style green interface. The map continues to distinguish a weather/risk indicator from confirmed wildfire observations.

## Release checklist

- Run `python -m compileall backend/app` and the repository's static/smoke workflows.
- Apply the new Supabase migration in the intended project.
- Configure each secret in the correct hosting service and GitHub Actions; do not commit real values.
- Verify a real model response, a non-empty Sentinel-2 series, a delivered test push, a verified test SMS/WhatsApp channel, Stripe test-mode checkout and signed webhooks before advertising these integrations as live.
