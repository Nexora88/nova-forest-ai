"""Transparent, rule-based Nexora wildfire weather index.

This is an experimental indicator, not a trained ML model or official warning.
Inputs are normalized to documented ranges so the score is deterministic and testable.
"""
from dataclasses import dataclass
from math import isfinite


@dataclass(frozen=True)
class WeatherInputs:
    temperature_c: float
    relative_humidity_pct: float
    wind_speed_kmh: float


def _clamp(value: float, low: float = 0.0, high: float = 1.0) -> float:
    return max(low, min(high, value))


def calculate_nexora_risk_index(weather: WeatherInputs) -> dict:
    """Return a 0–100 experimental weather-risk index and explainable components.

    Component weights: temperature 0.35, dryness 0.40, wind 0.25.
    Humidity is converted to dryness (100 - RH). These weights are provisional
    design choices, not fitted coefficients; they require calibration against
    independently labelled regional fire observations before operational use.
    """
    values = (
        weather.temperature_c,
        weather.relative_humidity_pct,
        weather.wind_speed_kmh,
    )
    if not all(isfinite(v) for v in values):
        raise ValueError("Weather inputs must be finite numbers.")
    if not 0 <= weather.relative_humidity_pct <= 100:
        raise ValueError("Relative humidity must be between 0 and 100%.")
    if weather.wind_speed_kmh < 0:
        raise ValueError("Wind speed cannot be negative.")
    if not -60 <= weather.temperature_c <= 60:
        raise ValueError("Temperature is outside the supported sanity-check range.")

    temperature = _clamp((weather.temperature_c - 5.0) / 35.0)
    dryness = _clamp((100.0 - weather.relative_humidity_pct) / 80.0)
    wind = _clamp(weather.wind_speed_kmh / 60.0)

    score = round(100 * (
        0.35 * temperature +
        0.40 * dryness +
        0.25 * wind
    ))
    if score < 25:
        band = "lower"
    elif score < 50:
        band = "moderate"
    elif score < 75:
        band = "elevated"
    else:
        band = "high"

    return {
        "index": score,
        "band": band,
        "components": {
            "temperature": round(temperature * 100, 1),
            "dryness": round(dryness * 100, 1),
            "wind": round(wind * 100, 1),
        },
        "weights": {"temperature": 0.35, "dryness": 0.40, "wind": 0.25},
        "method": "Nexora experimental rule-based weather index v1",
        "status": "experimental_unvalidated",
        "warning": (
            "Not a trained ML prediction, not calibrated for a region, and not "
            "an official warning. Missing inputs must not be replaced with zero."
        ),
    }
