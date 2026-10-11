# NexoraWildfire AI — Pilot quotas and future plans

Status: **pilot metering is implemented for queued satellite/GIS jobs; payments are not enabled.** No customer is charged. Plan names and limits are initial product hypotheses and should be adjusted after pilot feedback and real provider/worker costs are measured.

## Initial monthly allowance proposal

| Plan | Heavy queued analyses / month | Intended use | Price |
| --- | ---: | --- | --- |
| Pilot | 5 | Individual testing and TÜBİTAK demonstrations | Free |
| Pro | 100 | Small farms, apiaries, field teams and consultants | To be decided |
| Enterprise | 1,000 | Approved energy, infrastructure and environmental teams | Quote after discovery |

The server currently maps the stored plan value in profiles.plan to these monthly job limits: free = 5, pro = 100, enterprise = 1,000. The profiles.plan and profiles.tokens fields are protected against client-side insert/update attempts by a database trigger. Plan changes must be made by trusted server-side administration until billing webhooks and a subscription ledger are built.

## What consumes an analysis credit

One credit is reserved for each accepted request to:
- POST /jobs/ndvi-timeseries
- POST /jobs/risk-raster
- POST /enterprise/reports (only after the existing server-side enterprise allowlist approves the user)

If the worker rejects or cannot accept a job, the API attempts to release that reservation. A reservation is kept when the worker accepts the task. Job-status polling, profile visits, local map browsing and ordinary weather lookups do not consume these credits.

## API and billing boundaries

- GET /account/usage returns the authenticated account's current plan, monthly usage, remaining credits, saved-area count and the proposed plan catalogue.
- The account page displays the current usage only when this endpoint responds successfully; it does not invent usage figures when the API is unavailable.
- The API-key controls remain disabled. Per-customer API keys, rotation, scopes, audit logs and rate limiting need a separate secure key-management design before they can be sold.
- Payment collection and automatic plan upgrades are disabled. The prices shown in the product are intentionally marked as undecided; do not advertise Pro or Enterprise as purchasable yet.
- This metering is not a universal request quota. It limits the expensive queued analysis endpoints above, not every public data endpoint.

## Cost-based price calculation

Do not set public prices from competitor guesses or round numbers alone. Collect measurements from a controlled pilot first. Keep this worksheet updated with dated invoices, usage exports, and successful/failed job counts.

| Cost input | How to measure it | Pricing treatment |
| --- | --- | --- |
| Hosting and backend baseline | Monthly invoice divided by active paying accounts, with a conservative low-user scenario | Shared fixed cost |
| Database, storage, and egress | Actual provider usage and billing export | Allocate by measured usage |
| NDVI / raster / enterprise report jobs | Worker runtime, memory, storage, retries, and successful jobs per feature | Feature-level variable cost |
| External data providers | Contract, API plan, quota, and any per-request or processing fee | Direct cost of the feature that uses it |
| Email, SMS, and push delivery | Real provider price and measured send volume | Separate notification cost where applicable |
| Payment processing, taxes, refunds, and chargebacks | Confirm with the payment provider and qualified adult support before launch | Include before finalizing the net price |
| Support, monitoring, backups, and security | Monthly invoices plus a reasonable maintenance reserve | Shared operating cost and contingency |

For each plan, estimate **monthly cost per account** as allocated shared costs + measured feature usage + provider fees + notification/payment costs + a documented contingency. Set a price only after deciding a target gross margin and checking a realistic low-volume scenario. A simple starting formula is:

`minimum net revenue per account = expected monthly cost per account / (1 - target gross margin)`

This is a planning formula, not a price recommendation. Taxes, payment fees, refunds, currency conversion, and local commercial obligations can change the required public price. Do not advertise a plan as purchasable until measured costs, limits, terms, cancellation, and adult-supported commercial requirements have been reviewed.

## Before public paid launch

1. Measure compute/worker cost and external data-provider cost per successful job.
2. Test monthly rollover, concurrent requests, worker failures and refunds/release behavior.
3. Add subscription records, verified payment webhooks, cancellation/refund handling and server-authoritative entitlements.
4. Add enterprise API credentials stored only as hashes, one-time display, rotation/revocation, per-key scopes, usage audit logs and abuse controls.
5. Publish terms, privacy/data-retention details, support process and clear limits before taking payments.
6. Validate environmental indicators against local observations and authoritative sources; never market experimental outputs as official fire warnings.

Independent pilot project. This document is product planning, not a statement that payment processing or every external integration is live.
