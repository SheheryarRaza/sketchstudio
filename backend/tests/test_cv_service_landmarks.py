import io
import unittest
from pathlib import Path
from unittest.mock import patch

from PIL import Image

from app.services.cv_service import CVService, DetectedFace, MeshAnchors

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
        # Temple sits above jaw, which sits above the chin — real face topology,
        # not three points collapsed onto the same bbox-proportional guess.
        self.assertLess(reilly["leftTemple"]["y"], reilly["leftJaw"]["y"])
        self.assertLess(reilly["leftJaw"]["y"], loomis["chinY"])
        # Contour anchors land within the detected face's bounding region, not
        # off in the background — a wrong mesh index would likely fail this.
        face_left = loomis["center"]["x"] - loomis["radius"] * 2
        face_right = loomis["center"]["x"] + loomis["radius"] * 2
        for anchor in (reilly["leftJaw"], reilly["rightJaw"], reilly["leftTemple"], reilly["rightTemple"]):
            self.assertTrue(face_left < anchor["x"] < face_right)
        # Eye/nose/mouth anchors are unchanged: still straight from YuNet.
        self.assertLess(reilly["leftEye"]["x"], reilly["rightEye"]["x"])

    def test_yunet_hit_but_mesh_miss_still_reports_detected_with_bbox_geometry(self):
        """If YuNet finds a face but the mesh landmarker doesn't on that same photo,
        jaw/temple/chin/brow degrade to the pre-upgrade bbox math while `source` stays
        "detected" — no worse than this service's behavior before this ticket."""
        with patch.object(CVService, "_mesh_contour_anchors", return_value=None) as mocked:
            result = CVService.estimate_facial_landmarks(PORTRAIT_PATH.read_bytes())

        mocked.assert_called_once()
        self.assertEqual(result["source"], "detected")
        loomis = result["loomis"]
        self.assertEqual(loomis["jawWidth"], int(loomis["radius"] * 0.9))
        self.assertEqual(loomis["browLineY"], loomis["center"]["y"])

    def test_construction_uses_mesh_anchors_when_available(self):
        mesh_anchors = MeshAnchors(
            left_jaw=(10, 20),
            right_jaw=(30, 20),
            left_temple=(5, 5),
            right_temple=(35, 5),
            chin=(20, 40),
            brow_line_y=15,
        )

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
