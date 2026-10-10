# TÜBİTAK 2204-A 2026–2027 — NexoraWildfire research-readiness checklist

This is a preparation checklist, not an endorsement or guarantee of eligibility. The official 2027 guide and call must be reread before submitting.

## Official source and calendar

- Official competition page: https://tubitak.gov.tr/tr/yarismalar/2204-lise-ogrencileri-arastirma-projeleri-yarismasi
- Official 2027 project guide (PDF): https://tubitak.gov.tr/sites/default/files/2026-09/lise_proje_rehberi_2027_onaya_sunulan.pdf
- The official page lists the 2026–2027 application window as 23 September 2026 through 4 January 2027 at 17:30 Türkiye time. Confirm the current notice before submission.
- The official guide includes the main areas Geography, Software, and Technological Design, and thematic areas including Forests and Forest Protection, Environment and Environmental Protection, Natural Disasters and Disaster Management, Agriculture and Livestock Technologies, Machine Learning, and Artificial Intelligence. Choose one main area and one thematic area only after the actual research question and method are settled.

## The key distinction

A polished app by itself is not sufficient evidence of a research project. The entry must be a completed, student-led investigation with an original question, method, evidence, analysis, conclusions, and limitations. The guide says the work must be completed—not merely an idea or ongoing project—and the originating idea must be the students' own. See the official guide's sections 1.4, 3.1, 3.3, and 3.6.12.

## Proposed evidence-first research shape

Do not use this as a final title until the actual research is complete. A neutral working question to discuss with a teacher is:

> How consistently can a transparent, public-data environmental indicator be reproduced for fixed locations in Edirne, Kırklareli, and Tekirdağ, and what are its limitations?

A more ambitious fire-risk prediction question must not be selected unless there is a defensible, labelled historical dataset, a baseline method, a separate evaluation period, and local validation. The current machine-learning model trained on a small Algerian historical dataset is **not** validated for Thrace.

### Before collecting evidence

- [ ] Write one narrow research question and a falsifiable hypothesis.
- [ ] Define the independent/dependent variables, fixed locations, time window, sample size, inclusion/exclusion rules, and baseline before seeing results.
- [ ] Identify the exact data provider, version/endpoint, units, timestamps, licence, and missing-data handling for every field.
- [ ] Separate weather-model outputs, observed station data, satellite measurements, locally calculated indicators, and model predictions in the report.
- [ ] Keep raw responses and a change log so a teacher/judge can reproduce the analysis.
- [ ] Define the calculations before testing and report all failed runs as well as successful ones.
- [ ] Compare against a meaningful baseline; do not claim accuracy, improved fire prevention, productivity gains, or real-world impact from software screenshots alone.
- [ ] Use charts/tables with sample sizes, uncertainty/error measures, and clearly described limitations.

### Product validation evidence

- [ ] Run the docs/THRACE_PILOT_TEST_PLAN.md protocol for the same fixed locations.
- [ ] Complete at least three repeat runs per location, then repeat the saved-area workflow on desktop and mobile.
- [ ] Record map success, save/reload/reopen/delete success, provider status/timestamp, response latency, value mismatch, and offline retention.
- [ ] Treat the current automated smoke checks as code/static checks only; they are not proof of live API health, browser behaviour, or scientific validity.

### Official-rule and ethics checks

- [ ] Recheck the official call and guide at submission time; do not rely only on this summary.
- [ ] Keep the project title and report focused on the research question; the official call says not to foreground an institution, company, commercial product, or brand in the submitted documents.
- [ ] Ensure the work is the student's own and document any adult/AI/tool assistance honestly according to the current rules and school guidance.
- [ ] Select the main and thematic areas based on the project's real aim—not because a category sounds prestigious.
- [ ] If collecting surveys/interviews or involving people, check the guide's permission, voluntary-consent, and parental-consent requirements before data collection. Avoid collecting unnecessary personal data.
- [ ] Use cited sources and check data/software licences.
- [ ] Submit a finished project report in the official format; a public demo site is supporting material, not a substitute for the research report.
- [ ] Ask a science teacher/adviser to review the question, method, and current guide before any submission.

## Current status

- Core static smoke tests: passed previously; rerun after changes.
- Real browser/mobile test runs: **not yet recorded**.
- Repeatable live provider comparisons: **not yet recorded**.
- Scientific accuracy or real-world benefit: **not established**.
- Competition eligibility/category: **not determined**.
