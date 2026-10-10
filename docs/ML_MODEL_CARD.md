# Research Model Card — UCI Fire-Weather Random Forest

## Status

A reproducible research-only Random Forest artifact is trained from the UCI Machine Learning Repository's Algerian Forest Fires dataset. The trained artifact is versioned at `backend/models/uci_fire_weather_rf.joblib`; its machine-readable provenance and evaluation record are in `backend/models/uci_fire_weather_rf_metadata.json`.

## Dataset

- **Dataset:** Algerian Forest Fires
- **Source:** UCI Machine Learning Repository
- **DOI:** [10.24432/C5KW4N](https://doi.org/10.24432/C5KW4N)
- **License:** CC BY 4.0
- **Observation period:** June–September 2012
- **Rows:** 244 daily observations from Béjaïa and Sidi-Bel Abbès, Algeria
- **Labels:** 138 fire, 106 not-fire
- **Inputs:** daily maximum temperature (°C), relative humidity (%), wind speed (km/h), and daily precipitation (mm)
- **Target:** observed same-day fire / not-fire class

## Evaluation protocol and measured results

The reported geographic holdout trains on the 122 Béjaïa rows and evaluates on the 122 Sidi-Bel Abbès rows. The metrics below are from the completed reproducible training run; they are dataset-specific, not an estimate of performance in Türkiye.

| Metric | Held-out region result |
|---|---:|
| Accuracy | 78.69% |
| Balanced accuracy | 79.84% |
| Precision | 89.55% |
| Recall | 75.95% |
| F1 | 82.19% |
| ROC AUC | 92.08% |

The final inference artifact is then fitted on all 244 rows. The holdout metrics above are from the separate geographic evaluation model, not from evaluating the final all-data model against its own training data.

## Limitations and responsible use

- Only 244 daily observations from two Algerian regions in 2012 are available.
- Geographic holdout on one other Algerian region does **not** establish generalization to Thrace/Türkiye, California, Greece, or any other region.
- The model uses four weather features only. It does not ingest vegetation, fuel moisture, terrain, ignition, or human activity.
- Its output is a same-day class probability, not a seven-day forecast, a calibrated operational probability, or an official fire warning.
- The model is shown as a transparent research prototype. Do not use it for emergency response or operational decisions.
- The separate nine-feature / seven-day model endpoint remains fail-closed until a suitable documented dataset with matching labels and features is collected and evaluated.

## Reproduce

Run from the repository root:

```bash
python -m pip install -r backend/requirements.txt
python backend/scripts/train_uci_research_model.py
```

The script downloads the official UCI archive, records its SHA-256 hash, trains a fixed-seed Random Forest, evaluates a geographic holdout, and writes the model and metadata. It fails if the expected 244 labelled rows or the two region groups are not present.
