# NexoraWildfire AI

**An experimental, offline-first environmental intelligence and decision-support platform.**

NexoraWildfire AI brings together environmental observations for wildfire awareness, agriculture, soil and water, beekeeping, pollen, and ecosystem monitoring. The project starts in **Thrace (Trakya), Türkiye** and is being developed with a global-coordinate architecture in mind.

[Turkish documentation](README.tr.md) · [AI-assisted development disclosure](AI_ASSISTED_DEVELOPMENT.md) · [Global scalability notes](docs/GLOBAL_SCALABILITY.md) · [Rise readiness checklist](docs/RISE_READINESS.md) · [Contributing](.github/CONTRIBUTING.md)

## Why this project exists

Environmental data is often scattered across separate maps and services. NexoraWildfire aims to make available observations easier to inspect and understand, while being explicit about missing data, uncertainty, and the difference between a heuristic and a trained model.

## Current capabilities

- Responsive web app with Progressive Web App (PWA) support and an offline-first shell.
- Interactive Leaflet map, local administrative geometry, saved field areas, and environmental map layers.
- Weather and environmental indicators powered by public data providers when available.
- Field-oriented views for wildfire awareness, agriculture, beekeeping, pollen, and satellite data discovery.
- Optional FastAPI backend for risk, weather, satellite, notifications, and ML endpoints.
- A bilingual Turkish/English interface toggle.
- A global-coordinate smoke demo near Napa Valley, California, which renders a sample GeoJSON polygon and requests current weather from Open-Meteo.

## Global scalability

> The system is currently being tested live in a pilot region (Thrace/Trakya, Türkiye). Because data sources such as NASA FIRMS, Copernicus, and Open-Meteo have global or multi-region coverage, the architecture is designed to accept valid GeoJSON and coordinates for other regions—such as California or Greece—without requiring the map geometry to be rewritten.

This is an architecture goal, not a claim that every provider or analysis endpoint has already been verified worldwide. Provider coverage, API credentials, licensing, latency, rate limits, and local model calibration must be checked separately. The global demo proves map rendering and a weather request only; it does not prove NASA hotspot retrieval or a trained ML model for the demo area.

## Machine learning: be precise about the status

The repository includes an optional Random Forest training and inference pipeline.

- GET /ml/status reports whether a model artifact and metadata are available.
- POST /ml/predict is reserved for the separate nine-feature model and returns a not-ready response until that model is trained with matching documented labels.
- GET /ml/research-status and POST /ml/research-predict expose the separate four-feature research prototype trained from the UCI Algerian Forest Fires dataset.
- `backend/scripts/train_uci_research_model.py` downloads the documented UCI archive, records its SHA-256 hash, and evaluates a geographic holdout (train on Béjaïa, test on Sidi-Bel Abbès). This is not a chronological holdout.
- Synthetic labels must not be used to create the appearance of model readiness.
- No model accuracy or operational performance is claimed unless a real training run produced those metrics.

A rule-based environmental indicator is not a machine-learning prediction. The system is experimental decision support, not an official wildfire alert service or a replacement for emergency authorities.

## Data sources

Depending on service availability and configuration, the project can use:

- **Open-Meteo** for weather and selected environmental variables.
- **OpenStreetMap / Nominatim** for map and settlement context.
- **Copernicus Sentinel-2 / CDSE** for satellite scene discovery and, when credentials and processing services are configured, derived vegetation indices.
- **NASA FIRMS / VIIRS** for hotspot observations when a valid backend FIRMS_MAP_KEY is configured.

A missing API key, failed request, unavailable scene, or missing observation must never be interpreted as zero risk. NASA GIBS basemap imagery is not the same thing as a processed Sentinel-2 NDVI product.

## Run the backend locally

Requirements: Python 3.11+ recommended.

~~~
cd backend
python -m venv .venv
# Linux/macOS
source .venv/bin/activate
# Windows PowerShell
.venv/Scripts/Activate.ps1
pip install -r requirements.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000
~~~

Health check: http://127.0.0.1:8000/health  
Interactive API docs: http://127.0.0.1:8000/docs

The static frontend can be served from the repository root using any local static web server. Browser API requests require a correctly configured API base URL and allowed CORS origin.

## Optional ML environment

Install `backend/requirements.txt` for the reproducible UCI research model. Run `python backend/scripts/train_uci_research_model.py` from the repository root to download the public dataset, evaluate the geographic holdout, and generate the versioned research artifact and metadata. The separate nine-feature model uses a different pipeline and remains unavailable until an appropriate documented dataset is collected. Never commit secrets or private datasets.

See Global scalability and demo protocol in docs/GLOBAL_SCALABILITY.md for the acceptance checklist.

## Privacy, security, and alerts

- Keep Supabase admin keys, VAPID private keys, provider keys, and tokens in server-side environment variables only.
- Browser push requires the configured backend, user authorization, browser permission, and valid VAPID configuration.
- Private messages are not end-to-end encrypted; do not use them for sensitive personal or emergency information.
- Public environmental data may be delayed, incomplete, or rate-limited.

## Development and contributions

AI coding assistants and LLM tools are used as productivity aids for coding, debugging, documentation, and test design. The developer remains responsible for architecture, product decisions, source review, and validation. See AI_ASSISTED_DEVELOPMENT.md.

Contributions are welcome. Please read .github/CONTRIBUTING.md, avoid fabricated data and metrics, and include reproducible tests or a manual test plan.

## Maintainer

**Ahmet Eymen Bakraç** · Nexora / Nexora88 · 2026

## Important limitation

NexoraWildfire AI is a developing research and decision-support project. It is not an official warning system, does not guarantee wildfire prediction, and must not replace local authorities, professional judgement, or emergency procedures.


## Research ML prototype

A reproducible Random Forest research artifact is trained from the UCI Algerian Forest Fires dataset. The geographic holdout metrics and limitations are documented in [the model card](docs/ML_MODEL_CARD.md). This small 2012 Algerian dataset is **not validated for Thrace/Türkiye** and is not an operational fire forecast. The separate nine-feature, seven-day model remains fail-closed until matching labelled historical data is collected.
