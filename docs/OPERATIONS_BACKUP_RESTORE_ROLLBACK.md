# Backup, Restore, Health Checks, and Rollback Runbook

**Status:** operational template; a restore is not certified until a staging drill is recorded. Never paste secrets into GitHub, issue comments, chat, or logs.

## 1. What must be backed up

- Supabase/PostgreSQL schema and application data (including migration version).
- Supabase Storage objects and their metadata; a database dump alone does not contain uploaded object bytes.
- Vercel project configuration and environment-variable *names/scopes* (never export secret values into this repository).
- Railway worker configuration, image/deployment identity, and non-secret runtime settings.
- Source commit SHA, dependency lockfiles, migration files, and deployment IDs.
- Any configured offline job queue or user-generated exports, subject to the project's retention policy.

Use provider-native automated backups where available. Keep an encrypted copy outside the production account, restrict access, and document retention. Choose RPO/RTO targets with the project owner before calling this production-ready.

## 2. Create a database backup

Run from an authorized workstation with the database URL provided through a secret manager or shell environment. Do not place a real URL in shell history or commit it.

```bash
: "${SUPABASE_DB_URL:?Set SUPABASE_DB_URL via your secret manager}"
umask 077
mkdir -p backups
supabase db dump --db-url "$SUPABASE_DB_URL" -f "backups/nova-forest-$(date -u +%Y%m%dT%H%M%SZ).sql"
```

- Verify the command exit status and that the file is non-empty.
- Encrypt the artifact before copying it to approved backup storage.
- Record SHA-256, UTC timestamp, source project, schema/migration revision, and operator in the backup inventory. Do not record credentials.
- Back up Storage object contents separately using the supported provider workflow; verify object counts and checksums where possible.

## 3. Restore drill — staging only

Never test restore by overwriting production. Create a separate staging database/project and restore there first.

```bash
: "${STAGING_DATABASE_URL:?Set a disposable staging database URL}"
: "${BACKUP_FILE:?Set the verified backup file path}"
psql "$STAGING_DATABASE_URL" -v ON_ERROR_STOP=1 -f "$BACKUP_FILE"
```

After restore, verify:
1. Expected tables, indexes, RLS policies, and migration revision exist.
2. Row counts and representative non-sensitive records match the backup inventory.
3. Authentication and owner-scoped access tests pass with two separate test accounts.
4. Storage object inventory matches and test downloads work.
5. `GET /api/health` and configured provider diagnostics return explicit health states.
6. The application works against staging configuration and contains no production secrets.

Record start/end time, commit SHA, backup checksum, errors, and a sanitized report. A successful SQL import alone is not a successful restore drill.

## 4. Health and provider checks

- Use `GET /api/health` for backend availability; this is not proof that every provider is healthy.
- Use `GET /api/satellite/live-check` to inspect NASA FIRMS and Copernicus catalog/processing status when the endpoint is configured.
- Keep weather, FIRMS, satellite catalog, and satellite processing outcomes independent. Record HTTP outcome, last successful check, source observation/acquisition timestamp, and error class. Never log API keys, authorization headers, raw tokens, or unnecessary personal data.
- Treat missing configuration, timeout, malformed payload, stale data, and confirmed empty observations as different states.
- Review GitHub Actions' provider-diagnostics job and its timestamped outcome for the exact candidate commit. CI checks do not replace field/device tests.

## 5. Application rollback

Preferred order:
1. Pause production promotion and identify the last known-good deployment/commit SHA.
2. Use Vercel's deployment controls to promote the last known-good deployment after confirming its environment configuration and data compatibility.
3. If a code fix is needed, create a reviewed revert commit on a new branch; do not rewrite shared `main` history.
4. If a database migration is involved, use a reviewed backward-compatible migration or a tested recovery plan. Do not blindly restore an old database over newer user data.
5. Re-run health checks, provider diagnostics, sign-in/owner-isolation checks, map smoke tests, and PWA cache/update tests.
6. Record incident time, triggering SHA, rollback target, result, and any user-data impact without secrets or personal data.

## 6. PWA cache recovery

- Cache generation is versioned in `sw.js`; test new shell install, old-cache cleanup, offline navigation, interrupted update, and reopen after reconnect.
- Never cache authenticated/account-scoped responses. The service worker should return an explicit offline/unavailable response rather than stale private data.
- Verify the app can recover from a failed shell asset fetch and that a waiting worker only activates through the intended update-approval flow.

## 7. Release evidence checklist

- [ ] Backup artifact encrypted and checksum recorded.
- [ ] Staging restore completed and application-level checks passed.
- [ ] Storage objects separately backed up and sampled.
- [ ] Health checks and provider diagnostics saved for the candidate SHA.
- [ ] Vercel previous known-good deployment identified.
- [ ] Rollback rehearsal or documented tabletop exercise completed.
- [ ] Physical Android reconnect/background/reopen report attached.
- [ ] No secret values or unnecessary personal data in artifacts/logs.

**Release gate:** Until an actual staging restore and rollback drill are recorded, describe these as documented procedures—not verified recovery capability.
