# PR #14 / PR #15 — NexoraWildfire AI product completion plan

This plan is the release contract for finishing the product in two small, reviewable pull requests. It deliberately prioritizes a trustworthy, usable pilot over adding more screens or making unsupported "AI/live" claims.

## Release objective

By the end of PR #15, a first-time user should be able to open NexoraWildfire AI on a phone or desktop, understand the current data status, inspect a supported area, save/manage an area, switch Turkish/English, and understand what is measured versus unavailable or experimental. An authenticated user should be able to use only the cloud features that are actually configured. The public release must not imply that the product is an official emergency warning system or that unvalidated research predictions are operational forecasts.

**Release rule:** no production promotion while a release gate below is failing. Provider secrets, contact details, and legal review must be supplied/configured by the project owner; code cannot safely invent them.

## PR #14 — Product completion (implementation PR)

### P0 — Core user journey
- Audit the actual entry route and all primary navigation links; remove broken, duplicate, dead-end, or misleading controls.
- Make the main journey coherent: open map → understand data/source status → select or draw an area → inspect supported layers → save/remove the area → recover from offline/network failure.
- Every interactive control must either work, be clearly disabled with an explanation, or be removed. No decorative buttons that look functional.
- Keep mobile first: no horizontal overflow at 320/360/390 px; map gestures, drawers, forms, dialogs, and keyboard focus remain usable. Respect `prefers-reduced-motion`.

### P0 — Truthful data and provider states
- Standardize provider states across the UI/API: `available`, `not_configured`, `unavailable`, `stale`, `empty`, and `error` (or a documented equivalent). An empty observation set is not evidence of zero risk.
- Show provider/source, retrieval time, geographic/temporal coverage, and relevant limitations wherever live data or derived metrics are presented.
- NASA FIRMS must distinguish missing key, request/provider failure, and a successful response with zero detections.
- Copernicus/Sentinel-2 discovery must distinguish catalog scene discovery from authenticated processing and from a calculated NDVI time series. A discovered scene alone does not prove that NDVI processing works.
- Do not fabricate sample counts, risk scores, live badges, satellite images, historical records, or prediction confidence. Any demo data must be visibly labeled as a demo.
- Make unavailable layers recover gracefully and retain a useful map rather than crashing the page.

### P0 — Saved areas and account boundaries
- Test local saved-area create/read/update/delete, reload persistence, and offline behavior.
- When Supabase is configured, verify per-user ownership, cross-device synchronization, retry after reconnection, and queued deletions with two separate test users. Never expose another user's areas.
- If Supabase is unavailable or the user is signed out, explain what is local-only and what is not synchronized.
- Check session expiry and network errors; do not leave a spinner or silently discard a local change.

### P1 — Product usability
- Consistent Turkish/English labels, date/time/number formatting, accessible labels, status announcements, visible focus, and sensible empty/loading/error states.
- Map layer controls must immediately update the displayed layer and must not imply a live feed unless a current successful response is present.
- Clarify the boundary between observations, rule-based indicators, and research-model outputs.
- Keep enterprise PDF requests, account entitlements, and worker statuses honest; never show "completed" until a valid server response and download URL exist.
- Keep install/PWA prompts accurate. Offline mode must not imply that live provider requests or cloud sync work offline.
- Update screenshots/help copy/README to match the behavior that actually exists.

### PR #14 acceptance tests
- Python backend unit/integration tests and JavaScript syntax checks pass.
- Chromium desktop and mobile flows pass for every primary page, including language toggle, navigation, saved-area lifecycle, legal signup controls, and enterprise demo draft.
- Add tests for provider status mapping and ensure missing credentials never appear as a zero-risk/zero-detection result.
- Add an authenticated Supabase test only when a safe test environment and credentials are configured; otherwise report it explicitly as blocked, not passed.
- No secrets or real user data in fixtures, logs, screenshots, or commits.

## PR #15 — Release hardening and production sign-off

### P0 — Live provider verification (owner configuration required)
Configure secrets directly in the hosting provider's environment-variable settings; never commit keys or paste them into chat:
- `FIRMS_MAP_KEY` (NASA FIRMS)
- The exact Copernicus Data Space Ecosystem credentials/environment variables used by the backend's processing client (confirm names from the current code/config before setting them).
- Any required production-only backend settings, service tokens, and allowed origins, stored as server-side secrets.

Then rerun diagnostics and prove all of the following with response metadata, not just HTTP 200:
- NASA FIRMS returns a valid live response for a known recent time window; successful zero-detection results are distinguished from missing credentials/provider errors.
- Copernicus STAC catalog discovery is confirmed separately from authenticated processing.
- Sentinel-2 NDVI returns at least one valid, timestamped numeric sample for Thrace, Türkiye. The additional California and Queensland probes must either return verified samples or be documented as unsupported/unavailable; do not claim global coverage just because the API accepts coordinates.
- The UI shows the same provider state as the API. Record request date/time, source, region, sample count, and any caveat without logging credentials.

### P0 — Legal, consent, and account security
- Configure a verified project contact/privacy email only after the owner chooses the address. Until then, keep privacy/terms documents visibly marked as drafts and keep the enterprise demo form in non-sending draft mode.
- Review the Turkish and English privacy notice, terms, data retention/deletion, cookies/local storage, analytics, third-party providers, and account deletion flow. Obtain appropriate legal review before treating the documents as final.
- Verify the versioned consent capture for email signup in a real test signup and confirm the stored row has no password/token or unnecessary personal data.
- Enable Supabase leaked-password protection in the Auth dashboard.
- Review `SECURITY DEFINER` function ownership, search path, execute grants, and the RLS policies that depend on them. Do not blindly revoke grants that the direct-message model needs; document the safe final grants and test cross-user access denial.
- Verify service-role credentials never reach browser JavaScript, public static files, client logs, or API responses.

### P0 — Deployment and operational readiness
- Confirm the PR preview deployment and test its real origin, API routes, CORS, auth callback URLs, static assets, and mobile layout.
- Resolve the Vercel deployment-rate-limit condition or wait until the quota resets; do not interpret a blocked deployment as a successful preview.
- Verify production environment variables and backend health after deployment, then run read-only smoke checks against the deployed URLs.
- Check rate limits, request timeouts, upstream-provider failures, cache freshness, and error logging. Logs must redact secrets and personal data.
- Document the deploy/rollback procedure and a clear incident contact before enabling any operational notification.
- Keep billing disabled until a real payment provider, pricing limits, cancellation/refund handling, and secure entitlement checks are implemented and tested.

### PR #15 release gate (all required)
- [ ] Static/backend checks pass.
- [ ] Chromium desktop + mobile tests pass.
- [ ] Preview deployment is accessible and passes smoke tests.
- [ ] NASA FIRMS live-provider diagnostic passes with a valid result.
- [ ] Copernicus authenticated processing passes and real NDVI samples are verified.
- [ ] Turkish/English UI and legal pages are reviewed; contact channel is configured.
- [ ] Supabase Auth leaked-password protection is enabled.
- [ ] RLS / SECURITY DEFINER / service-role exposure review passes.
- [ ] No high-severity unresolved security or data-integrity issue.
- [ ] Production smoke checks and rollback notes are recorded.

If any owner-only configuration or legal review is unavailable, keep the release in preview/beta and list the blocker clearly. Do not waive a gate by changing a failing test into a skip.

## Explicit non-goals for these two PRs
- No new feature just to increase feature count.
- No claims of accurate fire prediction, worldwide validation, official emergency alerts, or guaranteed safety.
- No fake live data, synthetic history presented as observations, or arbitrary confidence percentages.
- No production billing, paid-plan activation, or unreviewed collection of contact details.
- No deployment to production before the release gate passes.

## Current known blockers at the time this plan was written
- NASA FIRMS is reported as `not_configured`.
- Copernicus STAC scene discovery works, but processing credentials are `not_configured`.
- NDVI diagnostics returned HTTP 200 but status `not_configured` and zero samples in Thrace, California, and Queensland.
- Chromium found an E2E selector mismatch in the enterprise demo form; the selector has been corrected in the test and must be rerun.
- The verified project contact/privacy email has not been provided; legal documents remain drafts.
- Supabase leaked-password protection and the focused SECURITY DEFINER/RLS review remain release blockers.
- Vercel reported its deployment rate limit; a ready preview must be verified after the limit resets.

This document is a working engineering acceptance plan, not a statement that the product is already complete or legally approved.
