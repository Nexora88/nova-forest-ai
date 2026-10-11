import unittest
from types import SimpleNamespace

from app.engine.yolo_fire_detector import format_detections


class FakeTensor:
    def __init__(self, values):
        self.values = values

    def cpu(self):
        return self

    def tolist(self):
        return self.values


class YoloFormattingTests(unittest.TestCase):
    def test_returns_fire_and_smoke_boxes_with_normalized_coordinates(self):
        result = SimpleNamespace(
            boxes=SimpleNamespace(
                xyxy=FakeTensor([[10, 20, 110, 220], [30, 40, 80, 90], [0, 0, 5, 5]]),
                conf=FakeTensor([0.91, 0.72, 0.99]),
                cls=FakeTensor([1, 0, 2]),
            ),
            names={0: "smoke", 1: "fire", 2: "person"},
        )
        detections = format_detections(result, 200, 400)
        self.assertEqual([item["class_name"] for item in detections], ["fire", "smoke"])
        self.assertEqual(detections[0]["box_xyxy"], [10.0, 20.0, 110.0, 220.0])
        self.assertEqual(detections[0]["box_normalized"], [0.05, 0.05, 0.55, 0.55])
        self.assertAlmostEqual(detections[0]["confidence"], 0.91)

    def test_empty_result_returns_no_detections(self):
        result = SimpleNamespace(boxes=None, names={})
        self.assertEqual(format_detections(result, 100, 100), [])


if __name__ == "__main__":
    unittest.main()
