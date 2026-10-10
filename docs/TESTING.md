# Validation checklist

## Automated checks

The GitHub Actions workflow at .github/workflows/validate.yml runs:

1. Python bytecode compilation for backend application and training scripts.
2. Tests proving the optional Random Forest API fails closed when the model artifact is missing or invalid.
3. Node.js syntax checks for JavaScript files in the js directory.

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
- Check /ml/status. A not_trained status is expected until a documented real labelled dataset has been used to train and evaluate the model.
- Run the application on a narrow mobile viewport and with keyboard-only navigation.

## Production release gate

Do not call the release complete until the GitHub Actions checks pass, the Vercel build succeeds, the production API health endpoint responds, provider-dependent flows are tested with configured credentials, and the map/language toggle have been checked in a real browser. The Vercel build-rate-limit failure is a hosting quota issue and must be resolved independently.
