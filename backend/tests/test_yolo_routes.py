import io
import unittest

from fastapi.testclient import TestClient
from PIL import Image

from app.main import app

client = TestClient(app)


class YoloRouteTests(unittest.TestCase):
    def test_status_endpoint_reports_inference_disabled_for_license_safety(self):
        response = client.get("/ml/yolo/status")
        self.assertEqual(response.status_code, 200)
        data = response.json()
        self.assertEqual(data["status"], "disabled_license_safe")
        self.assertFalse(data.get("runtime_available", True))
        self.assertIn("message", data)

    def test_detect_rejects_unsupported_content_type(self):
        response = client.post(
            "/ml/yolo/detect",
            files={"file": ("frame.txt", b"not an image", "text/plain")},
        )
        self.assertEqual(response.status_code, 415)

    def test_detect_returns_503_when_no_compliant_model_is_available(self):
        image_bytes = io.BytesIO()
        Image.new("RGB", (32, 24), (10, 20, 30)).save(image_bytes, format="JPEG")
        response = client.post(
            "/ml/yolo/detect",
            files={"file": ("frame.jpg", image_bytes.getvalue(), "image/jpeg")},
        )
        self.assertEqual(response.status_code, 503)
        detail = response.json()["detail"]
        self.assertEqual(detail["status"], "model_unavailable")
        self.assertIn("çıkarım kapalıdır", detail["message"])


if __name__ == "__main__":
    unittest.main()
