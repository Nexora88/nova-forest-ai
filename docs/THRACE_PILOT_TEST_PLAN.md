# NexoraWildfire AI — Thrace Pilot Validation Plan

## Goal

Produce repeatable evidence that the core product works for a small set of real locations in Thrace before adding features or making claims about prediction accuracy.

## Scope for this first validation cycle

1. Interactive map opens on desktop and mobile.
2. Core map and local geographic files load; the user can select a supported location.
3. A user can draw/save an area, reload the page, view the saved area, and delete it.
4. The app clearly distinguishes live provider data, locally calculated indicators, unavailable data, and demonstration/research outputs.
5. Network failure does not erase saved areas or make the core map shell unusable.
6. The production deployment and API health are checked separately from source-code tests.

## Pilot locations

Use a fixed, documented set of test points in Edirne, Kırklareli, and Tekirdağ. Record the exact coordinates or named location, test time in Europe/Istanbul, device/browser, and network conditions for every run. Do not change the locations mid-comparison.

## Repeatable test protocol

For each location:

- Open the map in a fresh browser session and record load success/failure.
- Record the provider, returned timestamp, units, and HTTP/result status for each displayed live field.
- Compare temperature, humidity, wind, precipitation, and soil moisture with the provider response for the same coordinates and time. Note that forecast/model values are not ground-truth sensor measurements.
- Save an area with a known name and polygon; reload; confirm it remains; open it on the map; delete it; confirm it is removed.
- Repeat once on mobile using touch controls and once with network disconnected after the app shell and local data have loaded.
- Record screenshots or logs for failures. Never record passwords, tokens, or private personal information.

## Evidence table

| Run ID | Date/time (Europe/Istanbul) | Location / coordinates | Device + browser | Network | Map | Save/reload/delete | Provider + timestamp | Mismatches / notes |
|---|---|---|---|---|---|---|---|---|
| TRK-001 | Pending real run | Edirne test point | Pending | Online | Not tested | Not tested | Not captured | No results claimed yet |
| TRK-002 | Pending real run | Kırklareli test point | Pending | Online | Not tested | Not tested | Not captured | No results claimed yet |
| TRK-003 | Pending real run | Tekirdağ test point | Pending | Online | Not tested | Not tested | Not captured | No results claimed yet |

## Acceptance criteria

- Core static smoke checks pass in CI.
- No missing required local assets on the core pages.
- No JavaScript syntax errors in the main map and saved-area scripts.
- On each pilot location, the saved-area workflow succeeds on desktop and mobile.
- Live data is labelled with source and timestamp where available; missing data is shown as unavailable, not silently replaced with a plausible number.
- At least three repeat runs per location are documented before making reliability claims.
- Offline behaviour is reported only for the functions actually tested offline.

## Research integrity

This plan is a test protocol, not a result. Do not claim improved fire prediction, field productivity, or accuracy until the project has a defined baseline, documented sample, repeatable method, and measured results. Current code/integration presence alone is not evidence that a provider is operational. Any model trained on non-Turkish data must not be presented as validated for Thrace without local evaluation.

## TÜBİTAK preparation

Before submission, compare the final research question, project category, method, ethics/safety, sources, and report format with the official current 2204-A call guide. The software product is not automatically a research project: the submission needs a narrow question, measurable variables, a reproducible method, analysis, and limitations.
