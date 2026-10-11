# NexoraWildfire AI — Backend

## Real Copernicus Sentinel-2 analysis

The API exposes `POST /ndvi/area-analysis` for WGS84 Point, Polygon, or MultiPolygon geometry. It discovers the newest Sentinel-2 L2A scene through the Copernicus Data Space STAC API. Actual NDVI/NDMI pixel statistics require server-side `CDSE_CLIENT_ID` and `CDSE_CLIENT_SECRET`; without them the response explicitly reports `not_configured`. It does not fabricate vegetation values.

Example request:

```json
{
  "geometry": {
    "type": "Point",
    "coordinates": [26.5557, 41.6771]
  },
  "days": 180,
  "interval": "P30D"
}
```

NDVI is calculated from Sentinel-2 B08 and B04; NDMI uses B08 and B11. Scene discovery is not the same as obtaining valid pixel statistics. Cloud/shadow filtering and provider errors are represented in the response.

## Optional research ML model

Install the backend requirements, then provide a real, documented CSV dataset:

```bash
python -m pip install -r requirements.txt
python ml/train.py --csv /path/to/documented_observations.csv
```

Required columns: `date`, `temperature_max`, `humidity_min`, `wind_max`, `precipitation_sum`, `et0`, `vpd_max`, `precipitation_previous_6d`, and `firms_hotspot_proxy` (0/1). The script sorts observations chronologically and evaluates on a later holdout period without random shuffling. It refuses to create a model if the data is too small or either period lacks both classes.

The target is a NASA FIRMS hotspot-detection proxy, not a verified fire incident. A model trained on non-local data is research-only and must not be presented as a validated Türkiye/Trakya forecast or official warning. No sample or synthetic training data is included.

## Corporate PDF reports

`app.utils.pdf_generator.generate_environment_report(...)` creates a printable corporate PDF from supplied observations and provider statuses. Missing values are labelled, source and observation time can be included, and limitations are printed. The helper deliberately does not fetch data or invent observations. A production enterprise workflow must call it only after server-side authorization and use provider-verified data from the private worker.

## Validation

From the `backend` directory, run:

```bash
python -m pytest tests/test_copernicus_and_pdf.py
```

External provider integration still requires configured credentials and network-accessible services; local unit tests do not claim that the external providers are online.
