import unittest
from unittest.mock import patch

import requests

from app.services import weather_service


class WeatherServiceTests(unittest.TestCase):
    def setUp(self):
        with weather_service._CACHE_LOCK:
            weather_service._CACHE = None
            weather_service._CACHE_AT = 0.0

    def test_fetches_all_regions_and_preserves_order(self):
        sample = {
            "temperature": 21.5,
            "humidity": 48,
            "wind": 12.0,
            "precipitation": 0.0,
            "observed_at": "2026-10-11T12:00",
            "source": "Open-Meteo",
            "status": "available",
            "missing_fields": [],
        }
        with patch.object(weather_service, "get_current_weather", return_value=sample) as fetch:
            results = weather_service.get_region_weather()
            self.assertEqual([item["region"] for item in results], list(weather_service.REGIONS))
            self.assertTrue(all(item["status"] == "available" for item in results))
            self.assertEqual(fetch.call_count, 5)

    def test_successful_results_are_cached_for_the_ttl(self):
        sample = {
            "temperature": 21.5,
            "humidity": 48,
            "wind": 12.0,
            "precipitation": 0.0,
            "observed_at": "2026-10-11T12:00",
            "source": "Open-Meteo",
            "status": "available",
            "missing_fields": [],
        }
        with patch.object(weather_service, "get_current_weather", return_value=sample) as fetch:
            first = weather_service.get_region_weather()
            second = weather_service.get_region_weather()
        self.assertEqual(fetch.call_count, 5)
        self.assertEqual(first, second)
        self.assertIsNot(first, second)

    def test_provider_errors_are_reported_and_not_cached_as_current(self):
        with patch.object(weather_service, "get_current_weather", side_effect=requests.Timeout):
            first = weather_service.get_region_weather()
            second = weather_service.get_region_weather()
        self.assertEqual(len(first), 5)
        self.assertTrue(all(item["status"] == "error" for item in first))
        self.assertTrue(all("weather" not in item for item in first))
        self.assertTrue(all(item["status"] == "error" for item in second))


if __name__ == "__main__":
    unittest.main()
