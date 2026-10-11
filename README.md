# NexoraWildfire AI

**Environmental intelligence for forests, farms, and the people who care for them.**

NexoraWildfire AI is an independent environmental decision-support project by Nexora. It brings available weather, satellite-discovery, wildfire-awareness, agriculture, soil-and-water, beekeeping, pollen, and ecosystem observations into a map-first workspace. The first pilot area is Thrace (Trakya), Türkiye.

## Vision

A world where environmental evidence is easier to access and understand, so communities and producers can make better-informed decisions about forests, farms, water, and ecosystems.

## Mission

Build a practical, transparent, and accessible environmental workspace that:
- connects relevant observations and clearly identifies their source, timestamp, coverage, and limitations;
- helps farmers, beekeepers, local communities, and environmental teams explore the conditions affecting their areas;
- distinguishes measured observations, rule-based indicators, research models, and unavailable data instead of presenting them as equivalent;
- improves through field feedback, reproducible tests, and responsible use of technology.

The project is inspired by Mustafa Kemal Atatürk's emphasis on science, production, and public benefit. This is a project-level inspiration statement; NexoraWildfire AI is not a government service and is not affiliated with a government agency.

## Explore the product

- **Interactive map** with available geographic layers and saved areas.
- **Field workspace** for farms, apiaries, forests, and other user-selected areas.
- **Weather and environmental indicators** when supported data providers are reachable.
- **Satellite-scene discovery** intended to support vegetation and land-observation workflows.
- **Responsive, installable web app** with an offline-first shell and local saved-area experience.
- **Turkish and English interface**, with English as the default for this public-facing version.

## Current scope and evidence

The first practical focus is Thrace, Türkiye. Global coordinates and reusable geographic inputs do not prove that every provider, model, or workflow has been validated worldwide.

The app may display provider observations, rule-based indicators, satellite discovery results, and machine-learning research outputs. These are different forms of evidence. The research model trained on a small historical Algerian dataset is **not validated for Türkiye** and must not be represented as an operational wildfire forecast. NexoraWildfire AI is experimental decision support, not an official warning service. In an emergency, follow the relevant authorities.

Provider access and production behavior must be verified independently; code for an integration is not proof that its live connection is working. Missing credentials, provider errors, and zero observations must not be presented as zero risk.

## Pricing and sustainability

The project is currently in a pilot and verification stage. **Payments and automatic paid-plan upgrades are not enabled.** Proposed plans and usage limits are planning values, not an offer to purchase. Prices will be decided only after measuring hosting, database, worker/compute, and external-provider costs; testing failure and retry behavior; and defining security, privacy, support, and subscription operations. Any commercial launch will be planned with appropriate family/guardian support.

See [SaaS limits and pricing plan](docs/SAAS_LIMITS_AND_PRICING.md) for the cost-measurement and launch checklist.

## Enterprise enquiries

The Enterprise workspace includes a demo/quote request form. It does not accept payment or activate a subscription. For safety, the static form does not send form data to a server: until a verified business contact email is configured in the `nexora-enterprise-contact-email` meta tag in `pages/enterprise.html`, it only creates a local copyable request draft. Once a real contact channel is verified, configure it and test the mail-client handoff before advertising the form as a working submission channel.

## Technology

- Front end: HTML, CSS, JavaScript, Leaflet, and Progressive Web App features.
- Optional backend: FastAPI.
- Cloud features: Supabase where configured.
- External integrations: Open-Meteo, Copernicus/Sentinel-2 discovery, and NASA FIRMS where credentials, access, and endpoints are configured.

## Try it and contribute

- **Live app:** https://nexora88.github.io/nova-forest-ai/
- **Source code:** https://github.com/Nexora88/nova-forest-ai
- **Bug reports and product suggestions:** https://github.com/Nexora88/nova-forest-ai/issues
- **Türkçe README:** [README.tr.md](README.tr.md)
- **Contributing:** [.github/CONTRIBUTING.md](.github/CONTRIBUTING.md)
- **Global architecture notes:** [docs/GLOBAL_SCALABILITY.md](docs/GLOBAL_SCALABILITY.md)
- **AI-assisted development disclosure:** [AI_ASSISTED_DEVELOPMENT.md](AI_ASSISTED_DEVELOPMENT.md)

The priority is a dependable core product: clear map layers, understandable indicators, reliable saved areas, transparent data status, accessible mobile use, and feedback from real users. New features should solve a real user problem rather than add complexity for its own sake.

---

**Independent project by Ahmet Eymen Bakraç · Nexora · 2026**
