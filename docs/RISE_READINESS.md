# Rise Application Readiness — NexoraWildfire AI

This document is a preparation checklist, not an application or an endorsement by Rise or Schmidt Futures.

## First: verify eligibility and the current cycle

Rise for the World has historically invited applicants aged 15–17, with age assessed against a cycle-specific date (past cycles have used July 1). The next cycle's rules and dates must be checked on the official website before relying on any prior-year description:

- Official website: https://www.risefortheworld.org/
- Official application information: https://www.risefortheworld.org/apply-to-rise

Confirm the age cut-off for the exact cycle, the open/closed status, required deliverables, consent requirements for minors, and the deadline. Do not submit sensitive personal information through unofficial forms. Ask a parent/guardian or trusted teacher to review eligibility and any required consent.

## Project story

**Working title:** NexoraWildfire AI — a transparent, offline-first environmental decision-support prototype.

**Problem:** People who manage forests, farms, apiaries, and local ecosystems may need to consult multiple disconnected sources. The project explores whether a single accessible interface can make available observations easier to inspect while clearly distinguishing missing data, heuristics, and machine-learning outputs.

**Human-led work:** The developer defines the product direction, data-source choices, offline-first goals, interface priorities, and scientific limits. LLM coding assistants are used transparently for implementation support, debugging, documentation, and test design; their output is reviewed and tested rather than treated as proof.

**Pilot and scalability:** Thrace (Trakya), Türkiye is the initial pilot region. Global GeoJSON support and a Napa Valley demonstration show coordinate-independent map rendering and a weather request. They do not yet prove globally validated fire prediction or successful NASA/Copernicus processing in every region.

**Potential public benefit:** The project aims to help people inspect environmental observations and understand when information is unavailable. Its current prototype must not be described as an official fire warning service or used for emergency decisions.

## Evidence reviewers should be able to reproduce

- [ ] A stable, public demo URL and a dated screen recording showing the core user journey on desktop and mobile.
- [ ] A concise README in English, a Turkish README, contributor guidance, and the AI-assisted development disclosure.
- [ ] A reproducible setup and test command, with the exact Git commit and successful CI run recorded.
- [ ] A live production health check and a separate report for each external provider; do not infer authorization from code existing.
- [ ] A demo run log that records the time, location, data source, response status, and any missing data without exposing credentials.
- [ ] The UCI research-model card, dataset provenance, artifact hash, and geographic holdout metrics with limitations.
- [ ] A short explanation that the UCI model was trained/evaluated on a small 2012 Algerian dataset and has not been validated for Thrace, California, or operational forecasting.
- [ ] A small, privacy-respecting pilot with consenting users or a teacher/community partner; record tasks completed, usability issues, and actionable feedback.
- [ ] Evidence of impact: number of pilot sessions, successful task completion, time to find a source, accessibility issues resolved, and user feedback. Report only measured numbers.
- [ ] A clear list of limitations, next steps, and what the project will not claim yet.

## Suggested two-minute demo

1. Explain the environmental information problem in one sentence.
2. Open the map and show the Thrace pilot area.
3. Switch between Turkish and English, then show the compact mobile menu.
4. Run the Napa Valley GeoJSON demo and point out exactly what it proves: polygon rendering and a weather request, plus explicit failure states.
5. Open the model card and show the dataset source, geographic holdout protocol, and limitations.
6. Show the offline/saved-area behavior if it has been tested on the device being demonstrated.
7. End with the next validation milestone: a local pilot with feedback, real provider checks, and a suitable region-specific labelled dataset before any operational prediction claim.

## Technical readiness: known gates

- **Deployment:** The latest PR has previously been blocked by Vercel's free daily deployment API quota. Do not claim the latest code is live until a new deployment succeeds and its URL/commit are checked.
- **Provider credentials:** NASA FIRMS and Copernicus/CDSE must be verified against the deployed backend. Never place provider secrets in frontend code or CI logs.
- **Machine learning:** The UCI model is a research classifier, not a model validated for Türkiye. Its holdout metrics are dataset-specific and must be shown with the limitations.
- **Mobile/browser:** Automated Chromium smoke tests are useful but do not replace testing on a real Android/iOS device and a real production deployment.
- **Notifications:** Browser permission is not proof that a push message was delivered. Test delivery with a configured backend and a test account.
- **Security:** Keep CI read-only for pull requests unless a narrowly scoped, reviewed automation explicitly needs write access. Do not put privileged credentials in pull-request workflows.
- **Privacy and safeguarding:** Do not collect precise location or personal information from pilot users unless necessary, clearly explained, consented to, and appropriately protected. For participants under 18, involve a parent/guardian or trusted educator when needed.

## A realistic next milestone

Before describing the project as competition-ready, finish these in order:

1. Resolve the deployment quota through the normal account settings or wait for the quota reset; do not bypass platform limits.
2. Get the latest PR's CI checks green and record the exact commit tested.
3. Deploy that exact commit and confirm the production health endpoint.
4. Verify NASA FIRMS authorization, Copernicus catalog access, and authenticated processing as separate checks.
5. Run the mobile demo and install lifecycle on a real device.
6. Conduct a small, consent-based usability pilot and publish only measured results.
7. Ask a teacher, domain expert, or independent developer to review the claims and limitations.
8. Check the official Rise eligibility rules and cycle dates again before applying.

**Integrity rule:** Never fabricate user impact, provider access, field tests, model performance, awards, or endorsements. A clearly explained prototype with reproducible evidence is stronger than a larger list of unverified features.
