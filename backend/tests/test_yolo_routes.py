import io
import unittest
from unittest.mock import patch

from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)


class YoloRouteTests(unittest.TestCase):
    def test_status_endpoint_reports_runtime_truthfully(self):
        response = client.get("/ml/yolo/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertIn(data["status"], {"runtime_missing", "weights_missing", "model_source_missing", "configured_not_loaded", "loaded"})
        self.assertIn("runtime_available", data)

    def test_detect_rejects_unsupported_content_type_before_inference(self):
        with patch("app.api.yolo_routes.detect_image") as detect:
            response = client.post("/ml/yolo/detect", files={"file": ("frame.txt", b"not an image", "text/plain")})
        self.assertEqual(response.status_code, 415)
        detect.assert_not_called()

    def test_detect_endpoint_returns_real_engine_response_contract(self):
        from PIL import Image
        import app.api.yolo_routes as routes

        image_bytes = io.BytesIO()
        Image.new("RGB", (32, 24), (10, 20, 30)).save(image_bytes, format="JPEG")
        expected = {
            "status": "inference_complete",
            "model_source": "test-fixture",
            "image": {"width": 32, "height": 24},
            "inference_ms": 1.0,
            "detection_count": 0,
            "detections": [],
            "coordinates_type": "image_pixels_and_normalized",
            "warning": "test warning",
        }
        with patch.object(routes, "detect_image", return_value=expected):
            response = client.post("/ml/yolo/detect", files={"file": ("frame.jpg", image_bytes.getvalue(), "image/jpeg")})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), expected)


if __name__ == "__main__":
    unittest.main()
