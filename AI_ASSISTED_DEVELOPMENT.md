# AI-Assisted Development Disclosure

NexoraWildfire AI is an independently developed environmental decision-support project.

## Human-led engineering

The project's product direction, system architecture, offline-first strategy, data-source choices, feature priorities, and decisions about what the system must not claim are led by the developer, Ahmet Eymen Bakraç. The project focuses on making environmental data more understandable for wildfire awareness, agriculture, beekeeping, and ecosystem monitoring.

The project is led by a 14-year-old independent developer. The age of the developer is context for the learning journey, not a substitute for technical evidence, independent review, or reproducible validation.

## Use of AI tools

Large language model (LLM) tools and AI coding assistants are used as productivity aids for implementation, code explanation, debugging, documentation, and test design. They are treated as assistants—not as autonomous owners of the project or as evidence that a feature works. Generated suggestions are reviewed and adapted by the developer; important behavior still requires tests, source verification, and deployment checks.

## Validation and scientific integrity

- Live observations, simulations, rule-based indicators, and machine-learning predictions must be labelled separately.
- A rule-based score is not presented as a trained machine-learning prediction.
- The Random Forest training pipeline requires documented real labelled data. Synthetic labels must not be invented to make the model appear trained.
- A model artifact and evaluation metrics are only reported as available when they have actually been produced and checked.
- Missing API credentials or unavailable external services must be shown as unavailable, not silently replaced with fabricated values.
- The application is an experimental decision-support tool, not an official warning system or a substitute for local emergency authorities.

## Current machine-learning status

The repository includes an optional Random Forest training and inference pipeline. It is not considered operational merely because the code exists. A trained artifact, documented label source, and evaluation on a chronological holdout are required before reporting model predictions or performance. See the backend ML documentation and the /ml/status endpoint.

## Scope and limitations

Trakya, Türkiye is the initial pilot region. Global-coordinate support and the ability to request public weather data do not, by themselves, prove that every satellite, hotspot, or historical dataset is available worldwide. Each provider's geographic coverage, API key requirements, latency, licensing, and rate limits must be validated separately.

This disclosure is intended to make the development process understandable and reproducible for reviewers, contributors, and competition judges.
