# Nexora Experimental Wildfire Risk Index (v1)

## Purpose and status

The index is a transparent, deterministic **rule-based weather indicator** for prototyping and review. It is not a trained AI model, a validated fire-probability estimate, or an official warning. The initial implementation is in `backend/nexora_risk_index.py`.

## Inputs and transformations

Inputs can be obtained from a weather provider such as Open-Meteo, after validating response status, units, timestamp, and location. The calculation function itself accepts:

- Air temperature (T), in °C
- Relative humidity (RH), in percent
- Wind speed (W), in km/h

Normalized components are clamped to [0, 1]:

- Temperature: (t = clamp((T - 5) / 35))
- Dryness: (d = clamp((100 - RH) / 80))
- Wind: (w = clamp(W / 60))

The index is (I = round(100 × (0.35t + 0.40d + 0.25w))), ranging from 0 to 100. The prototype bands are lower (0–24), moderate (25–49), elevated (50–74), and high (75–100).

## Interpretation and limitations

The weights and normalization ranges are provisional engineering assumptions, not coefficients learned from data or established as scientifically optimal. Temperature, humidity, and wind alone omit fuel moisture, vegetation, topography, recent precipitation, ignition likelihood, and local calibration. Therefore the index must not be described as a fire probability or used alone for operational decisions.

Before a scientific performance claim, the project needs a documented, appropriately licensed and geographically relevant labelled dataset; time-aware and spatially independent evaluation; a baseline comparison; metrics such as precision, recall, calibration, and false-alarm rate; and a reproducible experiment. Thresholds and weights should then be justified and calibrated rather than selected to maximize a competition score.

## Missing data and provider failures

A missing value, timeout, invalid response, stale observation, or absent API credential is **unavailable data**, not zero risk. The calling application should preserve the provider timestamp and location, surface a clear unavailable state, and avoid producing a score when any required input is absent.

## Reproducibility checklist

- Record provider, units, coordinates, timestamp, and retrieval status.
- Validate inputs and reject impossible or non-finite values.
- Keep the model version and component contributions with every result.
- Test boundary values, missing data, invalid humidity, negative wind, and non-finite inputs.
- Clearly distinguish this rule-based indicator from YOLO object detection and any trained ML model.
