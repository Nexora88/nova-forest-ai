# NexoraWildfire AI — API keys and security operations

## Key handling rules

- Never paste a real API key, Supabase secret/service-role key, worker token, or private VAPID key into GitHub issues, source files, browser JavaScript, screenshots, or this chat.
- Store provider credentials as server-side environment variables in the hosting dashboard. Frontend files may contain only public/publishable configuration.
- If a secret was ever committed or exposed, revoke/rotate it at the provider first, then update the hosting environment and redeploy. Deleting it from the latest commit is not enough.
- Keep local `.env` files untracked. `backend/.env.example` contains placeholders only.

## Provider credentials

### NASA FIRMS

1. Request your own MAP_KEY through the official NASA FIRMS account/API-key flow: https://firms.modaps.eosdis.nasa.gov/api/area/
2. Add the resulting value to the server environment variable `FIRMS_MAP_KEY`.
3. Validate it using the protected provider-status probe: `GET /api/satellite/providers/status?probe=true`. The response must never include the key itself.
4. A configured key is not proof that observations exist. Check the provider status, timestamp, area and response status separately.

### Copernicus Data Space / Sentinel-2

1. Create an account and application credentials through the official Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu/
2. Set `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET` as server-side environment variables.
3. Validate with `GET /api/satellite/providers/status?probe=true`.
4. A catalog scene is not the same as processed NDVI. Confirm that the queued worker is configured and that a completed job contains a non-empty, source-attributed time series.

### Supabase

- `SUPABASE_URL` and `SUPABASE_ANON_KEY` (or publishable key) are used for public client/auth integration where appropriate.
- `SUPABASE_ADMIN_KEY` is server-only. It must never be prefixed with a public-client environment name, embedded in HTML/JS, or returned from an endpoint.
- Keep Row Level Security enabled on exposed user-data tables. Review ownership policies for every read/write path and run Supabase Security Advisors after schema changes.
- Enable leaked-password protection in Supabase Auth settings. Review the two flagged SECURITY DEFINER messaging RPCs before changing their grants; they may intentionally need privileged access, but must be audited for authorization checks.

## Security controls currently in source

- Browser response headers: content-type sniffing protection, clickjacking protection, referrer policy, restricted camera/microphone permissions, HSTS.
- API request-size checks and per-process rate limits, with tighter thresholds for expensive endpoints.
- Supabase token verification before queued jobs; server-side usage quota reservation; enterprise reports require an explicit server-side user allowlist.
- Provider diagnostics return credential status and error type, not secret values.
- Heavy satellite/GIS jobs are intended to run on a separately authenticated worker, not in a public synchronous request.

## Known limitations — do not mistake these controls for a guarantee

- The Python in-process rate limiter is a burst guard only. Serverless instances do not share counters, and it is not a DDoS/WAF replacement. Enable hosting-edge attack protection/WAF and shared rate limiting for production.
- Browser headers are defense-in-depth, not a substitute for safe DOM rendering, dependency updates, server authorization, database RLS, backups, monitoring, or incident response.
- A Content Security Policy is not enabled here because the current site uses inline scripts and external map/auth assets; introduce a tested CSP in report-only mode before enforcing it.
- Production is not considered verified until the latest commit is deployed and smoke tests pass on the actual live domain.

## Pre-release checklist

- [ ] Rotate any previously exposed credentials.
- [ ] Add provider keys only through hosting environment settings; use Production/Preview scopes deliberately.
- [ ] Confirm allowed origins and worker token authentication.
- [ ] Verify RLS and RPC grants, including the Supabase advisor findings.
- [ ] Run provider live checks and one authenticated NDVI/raster job end-to-end.
- [ ] Test invalid sessions, unauthorized ownership access, oversized requests and rate-limit responses.
- [ ] Verify browser security headers on the live deployment.
- [ ] Confirm costs, quotas, provider terms, privacy notice, and incident contact before paid launch.
