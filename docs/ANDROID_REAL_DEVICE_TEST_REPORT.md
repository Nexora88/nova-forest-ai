# Physical Android Release Test Record

**Status: NOT RUN — requires a physical Android device and a human tester.** Emulator/desktop Chromium results do not satisfy this record.

## Device and build
- Device model:
- Android version/build:
- Chrome version:
- Installed PWA or browser tab:
- Candidate Git commit SHA:
- Test date/time (Europe/Istanbul):
- Network: Wi-Fi / mobile / restricted bandwidth:
- Tester initials (no personal account details):

## Test cases

| ID | Procedure | Expected result | Result / evidence |
|---|---|---|---|
| A1 | Open the app online and wait for the map | UI opens; each provider reports its own status rather than a single “live” claim | NOT RUN |
| A2 | Turn off Wi-Fi/mobile data while map is open | Offline status appears; provider failures are not shown as zero events/risk | NOT RUN |
| A3 | Navigate to a previously cached public page while offline | Cached shell works; authenticated/account data is not exposed from shared cache | NOT RUN |
| A4 | Turn connectivity back on | App recovers without reload loops; each provider retries/reports its own result | NOT RUN |
| A5 | Lock screen/background the PWA for 2 minutes, then resume | Resume is stable; UI does not claim continuous background monitoring | NOT RUN |
| A6 | Close the app/browser and reopen online | Current shell can activate; old cache is not stuck; data freshness is visible | NOT RUN |
| A7 | Repeat with weak/intermittent network | Map remains usable; provider failures stay isolated and recoverable | NOT RUN |
| A8 | Open map on a narrow viewport and pan/zoom repeatedly | No horizontal page overflow; controls remain usable; map interactions recover | NOT RUN |
| A9 | Trigger a new PWA update in Preview | Waiting worker follows the explicit update flow; offline shell remains navigable | NOT RUN |

## Evidence and sign-off
- Attach screenshots or screen recording with tokens, coordinates, email addresses, and other personal data redacted.
- Record console errors, request status classes, last successful refresh, and elapsed time; never attach authorization headers or secret values.
- Mark a case PASS only after the procedure is performed on the named physical device.
- Any failure must include steps to reproduce and the candidate commit SHA.
- Release decision: BLOCKED until all required cases are run and reviewed.
