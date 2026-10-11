import math
import unittest

try:
    from .nexora_risk_index import WeatherInputs, calculate_nexora_risk_index
except ImportError:
    from nexora_risk_index import WeatherInputs, calculate_nexora_risk_index


class NexoraRiskIndexTests(unittest.TestCase):
    def test_returns_documented_shape_and_range(self):
        result = calculate_nexora_risk_index(WeatherInputs(30, 35, 22))
        self.assertGreaterEqual(result["index"], 0)
        self.assertLessEqual(result["index"], 100)
        self.assertEqual(result["status"], "experimental_unvalidated")
        self.assertAlmostEqual(sum(result["weights"].values()), 1.0)

    def test_drier_and_windier_conditions_do_not_lower_score(self):
        baseline = calculate_nexora_risk_index(WeatherInputs(30, 50, 10))["index"]
        drier = calculate_nexora_risk_index(WeatherInputs(30, 20, 10))["index"]
        windier = calculate_nexora_risk_index(WeatherInputs(30, 50, 40))["index"]
        self.assertGreaterEqual(drier, baseline)
        self.assertGreaterEqual(windier, baseline)

    def test_rejects_invalid_inputs(self):
        for weather in (
            WeatherInputs(20, 101, 10),
            WeatherInputs(20, 40, -1),
            WeatherInputs(math.nan, 40, 10),
            WeatherInputs(80, 40, 10),
        ):
            with self.subTest(weather=weather), self.assertRaises(ValueError):
                calculate_nexora_risk_index(weather)


if __name__ == "__main__":
    unittest.main()
