# NexoraWildfire AI

**Environmental intelligence for forests, farms, and the people who care for them.**

NexoraWildfire AI is an independent project built to make environmental observations easier to explore in one place. Starting in Thrace (Trakya), Türkiye, it brings together a map-first experience for wildfire awareness, forest health, agriculture, soil and water, beekeeping, pollen, and satellite-data discovery.

The product is inspired by a simple idea associated with Mustafa Kemal Atatürk's vision for a science-led, productive Republic: **protecting nature also means protecting the people and work that depend on it.** The platform is a modern, practical expression of that purpose—not an official government service and not affiliated with Atatürk-related institutions.

## Explore the product

- **Interactive environmental map** with available geographic layers and saved areas.
- **Field workspace** for users to save a farm, apiary, forest, or other area and revisit its available environmental signals.
- **Weather and environmental indicators** when supported data providers are reachable.
- **Satellite-data discovery** designed to support vegetation and land-observation workflows.
- **Installable, responsive web app** with an offline-first shell and local saved-area experience.
- **Turkish and English interface**, with English as the default for this public-facing version.

## Vision and mission

**Vision:** Make trustworthy environmental intelligence easier to access for communities, farmers, beekeepers, researchers, and environmental teams—starting in Thrace and expanding only as data coverage and validation justify it.

**Mission:** Connect real observations and clearly labelled indicators in a useful, accessible workspace; protect saved-area data; disclose uncertainty and provider failures; and avoid presenting experimental outputs as official warnings.

**Product principles:** Evidence before appearance, privacy by default, transparent limitations, mobile accessibility, and features that solve real field problems.

## Why it matters

Environmental information is often scattered across separate tools. NexoraWildfire AI aims to make relevant observations more accessible to local communities, farmers, beekeepers, nature observers, and environmental teams—without pretending that every data source is always available or that an indicator is a guaranteed prediction.

## Current scope

The first practical focus is Thrace, Türkiye. The interface and data pipeline are being developed with reusable geographic inputs in mind, but global map rendering alone does not prove that every provider, model, or workflow is validated worldwide.

The app may display rule-based indicators, provider observations, satellite discovery results, and machine-learning research outputs. These are different types of evidence and must not be presented as interchangeable. The current research model was trained on a small historical Algerian dataset; its metrics do **not** validate predictions for Türkiye. NexoraWildfire AI is experimental decision support, not an official warning service. In an emergency, follow the instructions of the relevant authorities.

## Technology

- Front end: HTML, CSS, JavaScript, Leaflet, and Progressive Web App features.
- Optional backend: FastAPI.
- Cloud features: Supabase where configured.
- External data integrations: Open-Meteo, Copernicus/Sentinel-2 discovery, and NASA FIRMS where credentials and endpoints are configured.

Provider access and production behavior must be verified independently; code for an integration is not proof that its live connection is working.

## Try it

- **Live app:** https://nexora88.github.io/nova-forest-ai/
- **Source code:** https://github.com/Nexora88/nova-forest-ai
- **Bug reports and product suggestions:** https://github.com/Nexora88/nova-forest-ai/issues
- **Turkish documentation:** [README.tr.md](README.tr.md)
- **Contributing:** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
- **Global architecture notes:** [docs/GLOBAL_SCALABILITY.md](docs/GLOBAL_SCALABILITY.md)
- **Thrace dataset research workflow:** [docs/THRACE_DATASET.md](docs/THRACE_DATASET.md)
- **Offline sync acceptance test:** [docs/OFFLINE_SYNC_ACCEPTANCE.md](docs/OFFLINE_SYNC_ACCEPTANCE.md)
- **Enterprise report worker flow:** [docs/ENTERPRISE_REPORT_WORKFLOW.md](docs/ENTERPRISE_REPORT_WORKFLOW.md)
- **AI-assisted development disclosure:** [AI_ASSISTED_DEVELOPMENT.md](AI_ASSISTED_DEVELOPMENT.md)

## Project direction

The priority is to make the core product genuinely useful and dependable: clear map layers, understandable indicators, reliable saved areas, transparent data status, accessible mobile use, and feedback from real users. New features should earn their place by solving a user problem—not by making the interface look more complicated.

---

**Independent project by Ahmet Eymen Bakraç · Nexora**
