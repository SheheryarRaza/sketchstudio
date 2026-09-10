import cv2
import numpy as np
from pathlib import Path
from typing import NamedTuple
from PIL import Image
import io

FACE_DETECTOR_MODEL_PATH = Path(__file__).resolve().parent.parent / "assets" / "face_detection_yunet_2026may.onnx"

_face_detector = None


def _get_face_detector() -> cv2.FaceDetectorYN:
    """Lazily loads and caches the YuNet face detector (OpenCV 5.0 replacement for CascadeClassifier)."""
    global _face_detector
    if _face_detector is None:
        # input_size is required at construction but is always replaced per-request via
        # setInputSize() below, since it depends on the uploaded image's dimensions.
        _face_detector = cv2.FaceDetectorYN.create(
            model=str(FACE_DETECTOR_MODEL_PATH),
            config="",
            input_size=(320, 320),
            score_threshold=0.9,
            nms_threshold=0.3,
            top_k=5000,
        )
    return _face_detector


class DetectedFace(NamedTuple):
    """One YuNet detection row: bbox + 5 keypoints + confidence. Eye/mouth labels are
    subject-relative — "right eye" sits at the smaller x on a forward-facing portrait,
    matching this codebase's "leftEye" = image-left convention."""

    x: float
    y: float
    w: float
    h: float
    right_eye: tuple
    left_eye: tuple
    nose_tip: tuple
    right_mouth: tuple
    left_mouth: tuple
    score: float

    @classmethod
    def from_row(cls, row: np.ndarray) -> "DetectedFace":
        return cls(
            x=row[0], y=row[1], w=row[2], h=row[3],
            right_eye=(row[4], row[5]),
            left_eye=(row[6], row[7]),
            nose_tip=(row[8], row[9]),
            right_mouth=(row[10], row[11]),
            left_mouth=(row[12], row[13]),
            score=row[14],
        )


class CVService:
    @staticmethod
    def analyze_image_luminance_and_histogram(image_bytes: bytes) -> dict:
        """Calculate 256-bin histogram and mean luminance from image bytes."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        
        # Calculate histogram
        hist = cv2.calcHist([gray], [0], None, [256], [0, 256])
        hist_norm = (hist / hist.max() * 100).flatten().tolist()
        
        # Compute key statistical values
        mean_lum = float(np.mean(gray))
        median_lum = float(np.median(gray))
        p10 = float(np.percentile(gray, 10))
        p90 = float(np.percentile(gray, 90))

        return {
            "width": w,
            "height": h,
            "meanLuminance": round(mean_lum, 1),
            "medianLuminance": round(median_lum, 1),
            "deepDarkThreshold": round(p10),
            "highlightThreshold": round(p90),
            "histogram": [round(x, 1) for x in hist_norm],
        }

    @staticmethod
    def extract_contour_edges(image_bytes: bytes, low_threshold: int = 50, high_threshold: int = 150) -> bytes:
        """Extract clean Canny/Bargue contour lines from image bytes."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, low_threshold, high_threshold)
        
        # Invert so lines are dark graphite on white paper
        inverted = cv2.bitwise_not(edges)
        
        _, buffer = cv2.imencode(".png", inverted)
        return buffer.tobytes()

    @staticmethod
    def _symmetric_jaw_temple(center_x: int, center_y: int, radius: int) -> dict:
        """Jaw and temple anchors: proportional to face radius, never literal keypoints
        in any face detector (classical or DNN), so shared by both construction paths."""
        return {
            "leftJaw": {"x": center_x - int(radius * 0.7), "y": center_y + int(radius * 0.7)},
            "rightJaw": {"x": center_x + int(radius * 0.7), "y": center_y + int(radius * 0.7)},
            "leftTemple": {"x": center_x - int(radius * 0.75), "y": center_y - int(radius * 0.4)},
            "rightTemple": {"x": center_x + int(radius * 0.75), "y": center_y - int(radius * 0.4)},
        }

    @staticmethod
    def _proportional_construction(w: int, h: int) -> dict:
        """Declared proportional fallback: a fixed centered-head guess, not a measurement."""
        center_x = w // 2
        center_y = int(h * 0.45)
        radius = int(min(w, h) * 0.28)

        return {
            "loomis": {
                "center": {"x": center_x, "y": center_y},
                "radius": radius,
                "browLineY": center_y,
                "noseLineY": center_y + int(radius * 0.6),
                "chinY": center_y + int(radius * 1.25),
                "jawWidth": int(radius * 0.9),
                "tiltAngle": 0,
            },
            "reilly": {
                "browCenter": {"x": center_x, "y": center_y - 10},
                "noseTip": {"x": center_x, "y": center_y + int(radius * 0.6)},
                "mouthCenter": {"x": center_x, "y": center_y + int(radius * 0.95)},
                "chinBottom": {"x": center_x, "y": center_y + int(radius * 1.25)},
                "leftEye": {"x": center_x - int(radius * 0.4), "y": center_y},
                "rightEye": {"x": center_x + int(radius * 0.4), "y": center_y},
                **CVService._symmetric_jaw_temple(center_x, center_y, radius),
            },
        }

    @staticmethod
    def _construction_from_detection(face: DetectedFace) -> dict:
        """Anchors built from real detected eye/nose/mouth keypoints, with bbox-derived
        geometry for temple/jaw."""
        center_x = int(face.x + face.w / 2)
        center_y = int((face.right_eye[1] + face.left_eye[1]) / 2)
        radius = int(face.w * 0.5)
        chin_y = int(face.y + face.h)
        nose_x, nose_y = face.nose_tip
        mouth_x = int((face.right_mouth[0] + face.left_mouth[0]) / 2)
        mouth_y = int((face.right_mouth[1] + face.left_mouth[1]) / 2)

        return {
            "loomis": {
                "center": {"x": center_x, "y": center_y},
                "radius": radius,
                "browLineY": center_y,
                "noseLineY": int(nose_y),
                "chinY": chin_y,
                "jawWidth": int(radius * 0.9),
                "tiltAngle": 0,
            },
            "reilly": {
                "browCenter": {"x": center_x, "y": center_y - 10},
                "noseTip": {"x": int(nose_x), "y": int(nose_y)},
                "mouthCenter": {"x": mouth_x, "y": mouth_y},
                "chinBottom": {"x": center_x, "y": chin_y},
                "leftEye": {"x": int(face.right_eye[0]), "y": int(face.right_eye[1])},
                "rightEye": {"x": int(face.left_eye[0]), "y": int(face.left_eye[1])},
                **CVService._symmetric_jaw_temple(center_x, center_y, radius),
            },
        }

    @staticmethod
    def estimate_facial_landmarks(image_bytes: bytes) -> dict:
        """Detect Loomis/Reilly anchor positions from the actual face when one is found,
        declaring whether the result came from detection or the proportional fallback."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        h, w = img.shape[:2]

        detector = _get_face_detector()
        detector.setInputSize((w, h))
        _, faces = detector.detect(img)

        if faces is not None and len(faces) > 0:
            best_row = faces[np.argmax(faces[:, 14])]
            construction = CVService._construction_from_detection(DetectedFace.from_row(best_row))
            return {"source": "detected", **construction}

        construction = CVService._proportional_construction(w, h)
        return {"source": "fallback", **construction}
