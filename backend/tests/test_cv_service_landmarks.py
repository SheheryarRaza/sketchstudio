import io
import unittest
from pathlib import Path

from PIL import Image

from app.services.cv_service import CVService, DetectedFace

# portrait.jpg is MediaPipe's own Face Landmarker test asset
# (storage.googleapis.com/mediapipe-assets/portrait.jpg), Apache-2.0 licensed.
PORTRAIT_PATH = Path(__file__).resolve().parent / "fixtures" / "portrait.jpg"

FAKE_FACE = DetectedFace(
    x=100, y=50, w=200, h=280,
    right_eye=(150, 130), left_eye=(250, 130),
    nose_tip=(200, 180),
    right_mouth=(160, 230), left_mouth=(240, 230),
    score=0.95,
)


class TestFacialLandmarksDetectedPath(unittest.TestCase):
    """Given a photo with a clear frontal face, jaw/temple/brow/chin must come from
    real detected contour points rather than radius-proportional geometry."""

    def test_real_photo_detects_and_uses_mesh_contour(self):
        result = CVService.estimate_facial_landmarks(PORTRAIT_PATH.read_bytes())

        self.assertEqual(result["source"], "detected")

        loomis, reilly = result["loomis"], result["reilly"]
        # Jaw is measured, not the old radius*0.9 proportional guess.
        self.assertNotEqual(loomis["jawWidth"], int(loomis["radius"] * 0.9))
        # Contour anchors keep image-left/image-right ordering.
        self.assertLess(reilly["leftJaw"]["x"], reilly["rightJaw"]["x"])
        self.assertLess(reilly["leftTemple"]["x"], reilly["rightTemple"]["x"])
        # Brow sits above the eyes, and chin sits below the nose.
        self.assertLess(loomis["browLineY"], reilly["leftEye"]["y"])
        self.assertGreater(loomis["chinY"], loomis["noseLineY"])
        # Eye/nose/mouth anchors are unchanged: still straight from YuNet.
        self.assertLess(reilly["leftEye"]["x"], reilly["rightEye"]["x"])

    def test_construction_uses_mesh_anchors_when_available(self):
        mesh_anchors = {
            "leftJaw": {"x": 10, "y": 20},
            "rightJaw": {"x": 30, "y": 20},
            "leftTemple": {"x": 5, "y": 5},
            "rightTemple": {"x": 35, "y": 5},
            "jawWidth": 20,
            "chin": {"x": 20, "y": 40},
            "browLineY": 15,
        }

        result = CVService._construction_from_detection(FAKE_FACE, mesh_anchors)

        self.assertEqual(result["loomis"]["jawWidth"], 20)
        self.assertEqual(result["loomis"]["browLineY"], 15)
        self.assertEqual(result["loomis"]["chinY"], 40)
        self.assertEqual(result["reilly"]["leftJaw"], {"x": 10, "y": 20})
        self.assertEqual(result["reilly"]["chinBottom"], {"x": 20, "y": 40})

    def test_construction_falls_back_to_bbox_geometry_without_mesh(self):
        """If the mesh landmarker can't find a face on an already-YuNet-detected photo,
        jaw/temple/chin/brow degrade to the same bbox math used before this ticket —
        no worse than the pre-upgrade behavior."""
        result = CVService._construction_from_detection(FAKE_FACE, None)

        center_x = int(FAKE_FACE.x + FAKE_FACE.w / 2)
        center_y = int((FAKE_FACE.right_eye[1] + FAKE_FACE.left_eye[1]) / 2)
        radius = int(FAKE_FACE.w * 0.5)

        self.assertEqual(result["loomis"]["jawWidth"], int(radius * 0.9))
        self.assertEqual(result["loomis"]["browLineY"], center_y)
        self.assertEqual(result["loomis"]["chinY"], int(FAKE_FACE.y + FAKE_FACE.h))
        self.assertEqual(result["reilly"]["chinBottom"], {"x": center_x, "y": int(FAKE_FACE.y + FAKE_FACE.h)})


class TestFacialLandmarksFallbackPath(unittest.TestCase):
    def test_no_face_detected_returns_proportional_fallback(self):
        img_buf = io.BytesIO()
        Image.new("RGB", (200, 200), color="gray").save(img_buf, format="PNG")

        result = CVService.estimate_facial_landmarks(img_buf.getvalue())

        self.assertEqual(result["source"], "fallback")
        self.assertIn("loomis", result)
        self.assertIn("reilly", result)


if __name__ == "__main__":
    unittest.main()
