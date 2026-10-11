# NexoraWildfire AI — Legal launch checklist

Status: draft implementation only. This file is not legal advice and does not certify KVKK/GDPR compliance.

## Implemented in the repository

- Bilingual (Turkish/English) privacy/KVKK notice, terms of use, and experimental decision-support disclaimer at `pages/legal.html`.
- Legal page is linked from main navigation and the common project footer.
- New-account email registration requires separate acknowledgements: one for the privacy notice/terms and one for the experimental-system safety notice.
- Google and SMS sign-in flows require both acknowledgements before starting the provider flow.
- Email sign-up stores draft document versions, acceptance timestamp, language, and safety-acknowledgement timestamp in Supabase Auth user metadata; provider sign-in attempts to persist the same metadata after authentication. This is not an immutable audit log.
- The disclaimer explicitly says the product is not an official fire alert or emergency service, tells users to call 112 in Türkiye, and does not purport to waive mandatory legal rights.

## Required before public launch

1. **Identify the data controller.** Add the operator's verified legal name, address, and monitored contact email. Do not publish the draft as complete while these fields are unresolved.
2. **Verify the real data inventory.** List each profile field, saved-area coordinate, application log, notification subscription, analytics/cookie, and any support/feedback data that is actually collected.
3. **Document purposes and legal bases.** For every processing purpose, determine the applicable basis under Turkish law. Do not use a single broad checkbox as a substitute for a separate consent where explicit consent is legally required.
4. **Review international transfers.** Confirm hosting/database regions, subprocessors, map/satellite/weather providers, email and push providers, and implement required notices and transfer safeguards under current law.
5. **Set retention and deletion rules.** Define retention periods, backup expiry, account deletion, export/correction process, and a monitored process for data-subject requests.
6. **Review security and access.** Verify Supabase Row Level Security for profiles and area records, least-privilege policies, secret handling, backups, incident response, and audit logs. Public client keys are not substitutes for database access policies.
7. **Review consent evidence.** User metadata is a useful record but is not an immutable audit log. Decide whether server-side versioned acceptance records, policy-change re-acceptance, and account deletion retention are needed.
8. **Review minors and audience.** Confirm the intended age group and obtain specialist advice on age-related requirements and guardian involvement if the service is available to children.
9. **Review claims and product safety.** Test whether displayed risk scores and alerts could be mistaken for official warnings. Keep source timestamps, uncertainty, stale-data indicators, and official emergency directions visible.
10. **Get legal review.** Have a Turkish data-protection lawyer review the actual implementation and final text before collecting real users' precise field/apiary coordinates.

## Important limitation

A checked box and published notice do not by themselves make a service KVKK-compliant or eliminate liability. The final obligations depend on the real operator, purposes, providers, transfer paths, and deployed system configuration.
