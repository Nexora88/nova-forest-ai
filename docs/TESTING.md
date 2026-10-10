# Validation checklist

## Automated checks

The GitHub Actions workflow at .github/workflows/validate.yml runs:

1. Python bytecode compilation for backend application and training scripts.
2. Tests proving the separate nine-feature Random Forest API fails closed when its model artifact is missing or invalid, and that the UCI research model fails closed when its artifact is missing.
3. Node.js syntax checks for JavaScript files in the js directory.
4. Chromium smoke tests for all ten pages, English navigation labels, language switching, mobile/desktop navigation, the install lifecycle, and the Napa GeoJSON demo.

These checks validate syntax and selected safety properties; they do not prove live provider availability, map rendering on every device, or model accuracy.

## Manual browser checks before a competition submission

- Open the homepage in a Turkish-language browser and switch the language toggle to English and back.
- Repeat the language toggle on the map, saved areas, weather, satellite, enterprise, messages, and about pages.
- On the map page, run “Demo: Global Scale Test · Napa Valley”; confirm the map moves to California and the page reports either live Open-Meteo weather or a clear network-unavailable state.
- Confirm the global demo does not claim that NASA FIRMS or Copernicus data was fetched.
- Draw and save an area while online, then verify it remains visible in the saved areas list.
- Test the saved-area “View on map” action and each area's alert preference.
- Test offline behavior after loading the app once, and confirm unavailable data is not replaced with invented values.
- Verify push notifications with real credentials and a test account; do not infer delivery from permission alone.
- Check `/ml/research-status` and confirm the versioned UCI research artifact reports `ready`; treat `/ml/status` separately because the nine-feature operational model intentionally remains fail-closed until a matching labelled dataset exists.
- Run the application on a narrow mobile viewport and with keyboard-only navigation.

## Production release gate

Do not call the release complete until the GitHub Actions checks pass, the Vercel build succeeds, the production API health endpoint responds, provider-dependent flows are tested with configured credentials, and the map/language toggle have been checked in a real browser. The Vercel build-rate-limit failure is a hosting quota issue and must be resolved independently.


## Automated browser and provider checks

- The `browser-smoke` GitHub Actions job launches Chromium and checks the language/install controls on every HTML page, mobile menu collapse/expand, desktop More menu, language switching, and the install control disappearing after the `appinstalled` event.
- After backend deployment, request `GET /satellite/providers/status?probe=true`. `nasa_firms.status=authorized` verifies the configured NASA key; `copernicus_sentinel_hub.status=authorized` verifies the configured OAuth credentials. `not_configured` means the corresponding environment variables are missing; `validation_failed` means the provider probe did not succeed.
- A provider credential probe is not an end-to-end imagery test. Verify the global Napa demo, real FIRMS observations (if any), and a completed Copernicus NDVI time-series job separately.
