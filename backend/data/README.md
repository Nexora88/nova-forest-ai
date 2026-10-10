# Wildfire ML training data

No synthetic or generated labels are committed. Supply a curated CSV outside version control.

Required columns:
- `observed_at`: UTC timestamp for the location/observation.
- `fire_within_7d`: 1 only when an independently verified fire event occurred within the following seven days for the defined target area; otherwise 0 only when absence is verified.
- `temperature_max`, `humidity_min`, `wind_max`, `precipitation_sum`
- `ndvi_mean`, `ndmi_mean`
- `et0`, `vpd`
- `previous_fire_1km_30d`

Document spatial unit, event matching radius, label provenance, missingness, observation times and source licenses before training. Avoid data leakage: predictors must have been available at prediction time. The trainer uses a chronological 80/20 split and refuses small or single-class datasets. Reported metrics are not valid until the dataset and labels are independently reviewed.

Set `NEXORA_FIRE_TRAINING_CSV` and `NEXORA_LABEL_SOURCE`; then run `python scripts/train_fire_model.py` from the backend directory. Keep generated model files out of Git unless their provenance and size have been reviewed.
