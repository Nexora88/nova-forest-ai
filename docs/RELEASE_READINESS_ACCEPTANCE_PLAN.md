# NexoraWildfire AI — Release Readiness & Acceptance Plan

**Status:** audit checklist; not a declaration that the release gates have passed.  
**Scope:** `Nexora88/nova-forest-ai`, deployed frontend at `https://nova-forest-ai.vercel.app/`.  
**Pilot geography:** Edirne, Kırklareli and Tekirdağ.  
**Policy:** Never represent unavailable, stale, simulated, or unverified data as live or validated.

## Release-blocking workstreams

### 1. Secrets, subscriptions and authorization
- [ ] Keep provider keys and service-role credentials server-side; verify no secret is embedded in HTML, JavaScript, source maps, logs, or public artifacts.
- [ ] Review Vercel environment scopes and rotation procedures for NASA FIRMS, Copernicus/CDSE, Supabase and worker credentials.
- [ ] Verify subscription entitlements and privileged actions on the server, not from client-controlled flags.
- [ ] Test authenticated, unauthenticated, cross-user and expired-session access paths; verify least privilege and RLS.

### 2. Truthful source and freshness states
- [ ] Distinguish loading, success, confirmed-empty, offline, timeout, provider error, invalid payload, stale cache and not-configured states.
- [ ] Show source name, observation/acquisition time, retrieval time, last successful refresh and a clear error/retry action where applicable.
- [ ] Keep satellite hotspot observations separate from weather observations and calculated risk indicators. Do not equate FIRMS detections with confirmed incidents.
- [ ] Never convert missing values or failed requests into zero risk, zero detections, or fabricated measurements.
- [ ] Identify demo/simulated data visibly; identify UAV telemetry as unavailable unless a real, authorized telemetry source is connected.

### 3. Data integrity and consistency
- [ ] Validate coordinate ranges, required fields, timestamps, numeric ranges and provider response schemas at ingestion.
- [ ] Deduplicate by a documented stable source key and time/window policy; preserve provenance.
- [ ] Reject or quarantine malformed and impossible records without hiding provider failures.
- [ ] Verify selected area, district/province identity, geometry, user ownership and saved records use consistent stable IDs.
- [ ] Test empty datasets, partial provider responses, duplicate records, invalid coordinates, out-of-order updates and timezone boundaries.

### 4. Server-authoritative tree/seed progression
- [ ] Calculate and persist points/progression on the trusted server; never trust client-supplied score, reward, ownership or completion state.
- [ ] Add idempotency/replay protection, rate limits and authorization checks to reward endpoints.
- [ ] Test forged requests, repeated submissions, concurrent submissions, cross-account IDs and privilege escalation.
- [ ] Keep an auditable event record for accepted/rejected progression changes without logging secrets or unnecessary personal data.

### 5. Privacy, account recovery and deletion
- [ ] Document data categories, purposes, retention, deletion and contact channel before treating legal copy as final.
- [ ] Test account recovery, expired links, enumeration resistance and session invalidation.
- [ ] Verify deletion covers user-owned database rows, stored files, queued offline sync actions and applicable backups/retention windows.
- [ ] Minimize logs; redact credentials, tokens, email addresses and other personal data where not operationally required.
- [ ] Keep legal documents marked as drafts until the project owner supplies and verifies required contact details and completes legal review.

### 6. Resilience, PWA and accessibility
- [ ] Test offline launch, reconnect, failed sync, stale cache, cache-version transition and recovery from interrupted updates.
- [ ] Ensure queued offline edits/deletions reconcile safely and do not overwrite newer server state silently.
- [ ] Provide explicit loading, empty, offline, stale, permission-denied and recoverable-error UI on every data-driven screen.
- [ ] Test keyboard navigation, visible focus, semantic labels, contrast, zoom and readable mobile typography.
- [ ] Profile map rendering and interactions on low-memory Android devices and throttled/unstable networks; bound marker/layer work and avoid unnecessary refetches.
- [ ] Test PWA install/update and service-worker activation on actual Android Chrome; ensure a stale shell cannot trap users on an old release.

### 7. Android real-device and background validation
- [ ] Record device model, Android version, browser version, network profile, app/PWA mode, test time and build SHA.
- [ ] Test foreground navigation, screen lock/backgrounding, resume, offline/online transitions, interrupted requests and low-memory reload.
- [ ] Verify background behavior only where browser/platform lifecycle permits; do not claim continuous background tracking without a tested supported mechanism.
- [ ] Attach reproducible results and sanitized evidence; emulator/browser automation alone does not satisfy real-device acceptance.

### 8. UAV planning and operational safety
- [ ] Label every UAV mission as demo or real-data mode and show whether live telemetry/sensors are connected.
- [ ] Separate observed fire hotspots, mapped boundaries, proposed approach corridors and officially confirmed safe zones.
- [ ] Treat mapped stations/assembly points as informational unless their current official status is verified.
- [ ] Require authorized human review before operational mission execution; document airspace/flight-rule checks and permissions.
- [ ] Never imply that a map route is a verified safe approach or that a demo feed is live telemetry.

### 9. Republic vision, sources and special days
- [ ] Use only short, verified Atatürk quotations with attributable primary/reliable sources; omit uncertain attributions.
- [ ] Separate the Agricultural and Rural Development Institution (AOÇ) historical mission from this project's independent goals; do not imply endorsement or institutional support.
- [ ] Validate official holidays and remembrance dates against reliable sources and render them in the Europe/Istanbul timezone.
- [ ] Test date boundaries, leap years, locale changes and daylight/timezone conversion behavior.
- [ ] Keep messaging respectful, Turkish-first where appropriate, and avoid suggesting official affiliation or sponsorship.

### 10. Observability, recovery and controlled release
- [ ] Add automated unit/contract/regression tests for provider errors, malformed/empty payloads, auth boundaries, deduplication, freshness and offline reconciliation.
- [ ] Track API error rate, latency, provider freshness, last-success time and health checks without exposing sensitive payloads.
- [ ] Define alert thresholds and a safe degraded mode for each external dependency.
- [ ] Document backup frequency, restore drills, migration rollback and application rollback to a known-good commit.
- [ ] Require CI and review of the exact PR head; re-run checks after the final commit.
- [ ] Deploy to Preview, run smoke tests and inspect provider configuration before production promotion.
- [ ] Merge only after all required checks and human review pass; do not merge or deploy solely because a PR exists.

## Implementation artifacts in this candidate

- [Provider status panel](../js/provider-status.js) exposes separate states, last check, and source observation time for NASA FIRMS, weather/air quality, NASA GIBS satellite imagery, marine, elevation, and USGS layers. Missing/invalid provider fields are not treated as a confirmed zero-event result.
- [Backup/restore/rollback runbook](OPERATIONS_BACKUP_RESTORE_ROLLBACK.md) documents a staging-only restore drill and safe rollback steps; these are procedures, not evidence that a real restore has passed.
- [Physical Android test record](ANDROID_REAL_DEVICE_TEST_REPORT.md) lists device-specific background, reconnect, reopen, offline, and mobile map cases. It remains NOT RUN until a real device tester records results.
- The UAV image page explicitly states that it is a local image-analysis demo, not live flight telemetry. Republic Vision has attribution links and a project-independence statement. Special-day notices link to official/reliable date sources where available.

## Acceptance evidence required before release
- [ ] Latest CI run linked to the exact candidate commit.
- [ ] Sanitized provider diagnostics showing success/failure and timestamps for each configured source.
- [ ] Android physical-device test report and reproducible defects.
- [ ] Security/RLS/authorization test results and privacy/deletion verification.
- [ ] Backup/restore and rollback evidence.
- [ ] Preview smoke-test report and deployment commit identity.

## Current known caveats
- A listed page or integration does not prove the backing provider is configured or returning valid data.
- FIRMS credentials, Copernicus credentials, worker infrastructure and Supabase settings must be verified in their respective deployment/control panels; secret values must never be committed.
- Satellite scene discovery does not prove that NDVI/NDMI pixels were processed successfully.
- Rule-based risk scores are decision-support indicators, not calibrated wildfire probabilities or official alerts.
- Browser automation cannot substitute for physical Android background/lifecycle tests.
