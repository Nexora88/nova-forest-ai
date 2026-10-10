# Global Scalability and Demo Protocol

## Pilot-region statement

> The system is currently being tested live in a pilot region (Thrace/Trakya, Türkiye). However, because some of the data sources used by the system (including NASA FIRMS, Copernicus, and Open-Meteo) have global or multi-region coverage, the architecture is designed to accept valid GeoJSON and coordinates for other regions—such as California or Greece—without requiring the map geometry to be rewritten.

This statement describes the intended architecture, not a claim that every provider or every analysis endpoint has already been validated in every country.

## What the global demo proves

The map demo uses a sample GeoJSON polygon near Napa Valley, California. It demonstrates that the map can render and zoom to coordinates outside Türkiye and can request current weather for those coordinates from Open-Meteo when the service is reachable.

## What it does not prove

- It does not prove that a trained wildfire ML model is available or calibrated for California.
- It does not claim NASA FIRMS hotspots were fetched unless the backend confirms a configured, successful query.
- It does not guarantee that Copernicus imagery, processed NDVI/NDMI, or historical fire labels are available for the selected polygon.
- It is not an operational fire warning and must not be used for emergency decisions.

## Provider validation checklist

1. Validate the GeoJSON against RFC 7946 and enforce coordinate bounds and size limits.
2. Request weather data for the polygon's representative coordinate and display source/time or an explicit unavailable state.
3. Check the NASA FIRMS backend status and configured key without exposing credentials to the browser.
4. Check Copernicus/CDSE catalog availability separately from authenticated pixel-processing availability.
5. Run the ML endpoint only when a verified model artifact and metadata are present.
6. Save request timestamps, provider status, errors, and model version for reproducibility.

## Suggested acceptance tests

- A valid California polygon renders and fits the map.
- A valid Greece polygon can be substituted without changing map code.
- Invalid coordinates and malformed GeoJSON are rejected.
- Weather failures are reported without invented values.
- Missing NASA/CDSE credentials produce an honest unavailable state.
- An untrained model returns the documented not-ready response rather than a rule-based fallback.
