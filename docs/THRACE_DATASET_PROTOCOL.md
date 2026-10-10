# Thrace fixed-site wildfire dataset protocol

## Purpose and scope

This is a reproducible **pilot dataset** for Edirne, Kırklareli, and Tekirdağ. It is not yet a validated wildfire-prediction model, and it must not be described as a confirmed-fire dataset. The first stage deliberately uses weather + NASA FIRMS thermal-anomaly observations. NDVI/NDMI stay blank until they are actually computed from a documented satellite product.

## Fixed pilot points

The defaults in \`scripts/build_thrace_fire_dataset.py\` are fixed, version-controlled anchor coordinates near the provincial centres. They are useful for testing reproducibility and the data pipeline, but they are **not selected or verified forest plots** and are not a representative sample of the three provinces. For a science-fair study, replace or supplement them only after a teacher/adviser helps define defensible forest/land-cover sites; store the site rationale and exact coordinates in a reviewed JSON file.

## Inputs and repeatable run

1. Download historical NASA FIRMS CSV exports for the defined Thrace bounding box and chosen date window from the official FIRMS archive. Record the product/sensor (e.g. VIIRS), date range, download date, original filenames, and the export's documentation/licence. Do not put an API key in the repository.
2. Install the backend Python requirements in an isolated environment.
3. Run, for example:

   \`\`\`bash
   python scripts/build_thrace_fire_dataset.py \\
     --firms data/research/raw/firms_export.csv \\
     --start 2016-01-01 --end 2025-12-31 \\
     --output data/research/thrace_fire_weather_dataset.csv \\
     --metadata data/research/thrace_fire_weather_metadata.json
   \`\`\`

4. Inspect metadata before interpreting results. A site whose weather request fails is listed as failed and contributes no rows. Incomplete weather days are excluded, never silently filled with zero.
5. Keep raw source exports unchanged and do not commit large or licensed raw data without checking source terms. Share hashes, metadata, and a small permitted sample when appropriate.

Official provider documentation:
- NASA FIRMS: https://firms.modaps.eosdis.nasa.gov/
- Open-Meteo Historical Weather API: https://open-meteo.com/en/docs/historical-weather-api
- Copernicus Data Space Ecosystem: https://dataspace.copernicus.eu/

## Dataset columns

- Fixed-site identity, province, coordinates, ISO date.
- Daily maximum/minimum temperature (°C), minimum/maximum relative humidity (%), maximum wind speed (km/h), daily precipitation (mm), as returned by Open-Meteo.
- \`firms_detection_within_radius\`: 1 if an input FIRMS detection falls within the configured radius on that day; 0 if no matching detection was present in the supplied exports.
- Nearest detection distance and selected FIRMS fields for traceability.
- NDVI and NDMI intentionally blank; \`satellite_feature_status=not_computed\`.
- Provider/source, timezone, and units metadata.

## Critical label caveat

The label is **satellite thermal anomaly within a radius**, not a confirmed forest-fire incident. A zero means “no matching FIRMS detection in the supplied export, within the radius, on this date.” It does not prove no fire occurred: satellite passes, clouds, canopy, fire size/duration, sensor thresholds, and incomplete exports can all create false negatives. Non-fire industrial or other hot surfaces can create false positives. For stronger ground truth, cross-check candidate events against official forest-fire incident records (if legally/publicly available), document matching rules, and mark uncertain cases rather than silently changing labels.

## Temporal validation and reporting

Do not randomly split adjacent days from the same sites into train and test sets; that can leak seasonal patterns. Freeze a date cutoff before looking at test metrics, train only on earlier dates, and test only on later dates. Compare at least:
1. A transparent baseline (e.g. a prespecified weather threshold or majority-class predictor).
2. Any learned model, only if sample size and class balance support it.

Report:
- Total rows, date coverage, counts per province/site/year, positive and proxy-negative counts.
- Missing/incomplete weather days and failed provider calls.
- Confusion matrix, precision, recall/sensitivity, specificity, balanced accuracy, and a confidence interval where appropriate.
- Baseline and model results on the same held-out dates.
- False positives/false negatives and limitations; do not hide failed runs.
- Whether any satellite features were truly computed and the product/date/resolution/method used.

Three fixed points are a pipeline smoke test, not enough evidence to claim the model generalizes to all of Thrace. Avoid claims like “accuracy is high” without a held-out, reproducible evaluation and uncertainty reporting. A meteorological risk score is not a probability of fire unless calibrated and validated as such.

## Desktop/mobile saved-area test evidence

For each device/browser, record date, browser/OS, screen size, online/offline state, and result for:
1. Draw/select an area and save it.
2. Reload the page and verify the area remains.
3. Navigate away and reopen the saved area.
4. Rename/edit if supported.
5. Delete and reload to verify it stays deleted.
6. Repeat while offline, then reconnect and check sync/conflict behavior.
7. Repeat after app/PWA restart.

Record pass/fail, observed behaviour, and screenshot or console/network evidence. Static smoke tests do not count as browser end-to-end evidence. Do not mark these checks complete until they have actually been performed.
