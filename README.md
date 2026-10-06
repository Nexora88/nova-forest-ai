# ğŸŒ² Nova-Forest AI

Satellite-Based Forest Fire Risk Analysis System

## Overview

Nova-Forest AI analyzes environmental conditions using open satellite and weather data to estimate forest fire risk levels.

## Coverage Area

- Edirne
- KÄ±rklareli
- TekirdaÄŸ
- Ã‡anakkale
- Istanbul European Side

## Risk Levels

ğŸŸ¢ Low\r\nğŸŸ¡ Medium\r\nğŸŸ  High\r\nğŸ”´ Critical# nova-forest-ai
Satellite-based early warning and forest fire risk analysis system using open data sources.

## Current data architecture
- **Open-Meteo:** live temperature, relative humidity and 10 m wind.
- **Sentinel-2:** multispectral observation architecture; B04/B08 are reserved for NDVI.
- **NASA FIRMS / VIIRS:** hotspot observations when `FIRMS_MAP_KEY` is configured.
- **Risk Engine:** explainable 0â€“100 score. Missing satellite data is never replaced with fabricated values.
- **Frontend fallback:** the live map can query Open-Meteo directly when the FastAPI backend is unavailable, so GitHub Pages still shows live weather-based risk colors.

## Backend
Run from `backend/`:
`python -m uvicorn app.main:app --host 0.0.0.0 --port 8000`

Health: `/health`\r\nRisk: `/risk-analysis`\r\nSatellite: `/satellite/status`\r\nWeather: `/weather`

