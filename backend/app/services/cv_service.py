import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from mediapipe.tasks.python.vision import FaceLandmarkerOptions, RunningMode
from pathlib import Path
from typing import NamedTuple, Optional
from PIL import Image
import io

FACE_DETECTOR_MODEL_PATH = Path(__file__).resolve().parent.parent / "assets" / "face_detection_yunet_2026may.onnx"
FACE_LANDMARKER_MODEL_PATH = Path(__file__).resolve().parent.parent / "assets" / "face_landmarker.task"

# Indices into MediaPipe Face Landmarker's 478-point mesh (mediapipe.tasks.python.vision
# .FaceLandmarksConnections). 152 is the chin tip; 172/397 sit at jaw-angle height;
# 127/356 sit at temple height — both pairs picked from FACE_LANDMARKS_FACE_OVAL to land
# at roughly the same height this service used to guess proportionally. Left/right isn't
# assumed from the index itself: each pair is sorted by x so the smaller-x point always
# becomes the "left" (image-left) anchor, matching this codebase's convention.
_JAW_LANDMARKS = (172, 397)
_TEMPLE_LANDMARKS = (127, 356)
_CHIN_LANDMARK = 152
_BROW_LANDMARKS = (46, 52, 53, 55, 63, 65, 66, 70, 105, 107, 276, 282, 283, 285, 293, 295, 296, 300, 334, 336)

_face_detector = None
_face_landmarker = None


def _left_right(a: tuple, b: tuple) -> tuple:
    """Orders two points by x so the smaller-x one is always "left" (image-left),
    regardless of which anatomical side a mesh landmark index nominally represents."""
    return (a, b) if a[0] <= b[0] else (b, a)


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


def _get_face_landmarker() -> vision.FaceLandmarker:
    """Lazily loads and caches the MediaPipe Face Landmarker (CPU, single face, static image)."""
    global _face_landmarker
    if _face_landmarker is None:
        _face_landmarker = vision.FaceLandmarker.create_from_options(
            FaceLandmarkerOptions(
                base_options=BaseOptions(model_asset_path=str(FACE_LANDMARKER_MODEL_PATH)),
                running_mode=RunningMode.IMAGE,
                num_faces=1,
            )
        )
    return _face_landmarker


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


class MeshAnchors(NamedTuple):
    """Jaw/temple/brow/chin anchors read from MediaPipe's real face-mesh contour, in
    pixel space, mirroring DetectedFace's role for the YuNet keypoints."""

    left_jaw: tuple
    right_jaw: tuple
    left_temple: tuple
    right_temple: tuple
    chin: tuple
    brow_line_y: float

    @property
    def jaw_width(self) -> float:
        return self.right_jaw[0] - self.left_jaw[0]


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
    def suggest_edge_segments(
        image_bytes: bytes,
        low_threshold: int = 50,
        high_threshold: int = 150,
        min_length: int = 30,
        max_segments: int = 20,
    ) -> list[dict]:
        """Detect candidate edge polylines from image contours for edge quality classification."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        blurred = cv2.GaussianBlur(gray, (5, 5), 0)
        edges = cv2.Canny(blurred, low_threshold, high_threshold)

        contours, _ = cv2.findContours(edges, cv2.RETR_LIST, cv2.CHAIN_APPROX_TC89_L1)

        valid_contours = [c for c in contours if cv2.arcLength(c, False) >= min_length]
        valid_contours.sort(key=lambda c: cv2.arcLength(c, False), reverse=True)

        segments = []
        for i, contour in enumerate(valid_contours[:max_segments]):
            arc_len = cv2.arcLength(contour, False)
            epsilon = max(0.015 * arc_len, 2.5)
            approx = cv2.approxPolyDP(contour, epsilon, False)
            if len(approx) < 2:
                continue

            pts = []
            for j, p in enumerate(approx):
                pt = p[0]
                pts.append({
                    "id": f"p-{i}-{j}",
                    "x": int(pt[0]),
                    "y": int(pt[1]),
                })

            segments.append({
                "id": f"suggested-edge-{i + 1}",
                "quality": "hard",
                "points": pts,
                "label": f"Contour {i + 1}",
            })

        return segments

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
    def _mesh_contour_anchors(image_rgb: np.ndarray) -> Optional[MeshAnchors]:
        """Runs MediaPipe Face Landmarker over an already-YuNet-detected face and returns
        pixel-space jaw/temple/chin/brow anchors from the real contour mesh, or None if
        the landmarker itself couldn't find a face (caller falls back to bbox geometry)."""
        h, w = image_rgb.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        result = _get_face_landmarker().detect(mp_image)
        if not result.face_landmarks:
            return None

        mesh = result.face_landmarks[0]

        def point(index: int) -> tuple:
            landmark = mesh[index]
            return (landmark.x * w, landmark.y * h)

        left_jaw, right_jaw = _left_right(point(_JAW_LANDMARKS[0]), point(_JAW_LANDMARKS[1]))
        left_temple, right_temple = _left_right(point(_TEMPLE_LANDMARKS[0]), point(_TEMPLE_LANDMARKS[1]))
        brow_line_y = sum(point(i)[1] for i in _BROW_LANDMARKS) / len(_BROW_LANDMARKS)

        return MeshAnchors(
            left_jaw=left_jaw,
            right_jaw=right_jaw,
            left_temple=left_temple,
            right_temple=right_temple,
            chin=point(_CHIN_LANDMARK),
            brow_line_y=brow_line_y,
        )

    @staticmethod
    def _construction_from_detection(face: DetectedFace, mesh_anchors: Optional[MeshAnchors]) -> dict:
        """Anchors built from real detected eye/nose/mouth keypoints. Jaw/temple/chin/brow
        come from the MediaPipe contour mesh when available, falling back to the previous
        bbox-proportional geometry on the rare frame where YuNet finds a face but the mesh
        landmarker doesn't. That fallback keeps `source: "detected"` accurate to its
        pre-existing meaning ("a face was found") rather than adding a third declared-source
        state — it's never less accurate than this service's behavior before this contour
        upgrade, since every anchor here was bbox-proportional unconditionally back then."""
        center_x = int(face.x + face.w / 2)
        center_y = int((face.right_eye[1] + face.left_eye[1]) / 2)
        radius = int(face.w * 0.5)
        nose_x, nose_y = face.nose_tip
        mouth_x = int((face.right_mouth[0] + face.left_mouth[0]) / 2)
        mouth_y = int((face.right_mouth[1] + face.left_mouth[1]) / 2)

        if mesh_anchors is not None:
            jaw_temple = {
                "leftJaw": {"x": int(mesh_anchors.left_jaw[0]), "y": int(mesh_anchors.left_jaw[1])},
                "rightJaw": {"x": int(mesh_anchors.right_jaw[0]), "y": int(mesh_anchors.right_jaw[1])},
                "leftTemple": {"x": int(mesh_anchors.left_temple[0]), "y": int(mesh_anchors.left_temple[1])},
                "rightTemple": {"x": int(mesh_anchors.right_temple[0]), "y": int(mesh_anchors.right_temple[1])},
            }
            jaw_width = int(mesh_anchors.jaw_width)
            chin_x, chin_y = int(mesh_anchors.chin[0]), int(mesh_anchors.chin[1])
            brow_line_y = int(mesh_anchors.brow_line_y)
        else:
            jaw_temple = CVService._symmetric_jaw_temple(center_x, center_y, radius)
            jaw_width = int(radius * 0.9)
            chin_x, chin_y = center_x, int(face.y + face.h)
            brow_line_y = center_y

        return {
            "loomis": {
                "center": {"x": center_x, "y": center_y},
                "radius": radius,
                "browLineY": brow_line_y,
                "noseLineY": int(nose_y),
                "chinY": chin_y,
                "jawWidth": jaw_width,
                "tiltAngle": 0,
            },
            "reilly": {
                "browCenter": {"x": center_x, "y": brow_line_y - 10},
                "noseTip": {"x": int(nose_x), "y": int(nose_y)},
                "mouthCenter": {"x": mouth_x, "y": mouth_y},
                "chinBottom": {"x": chin_x, "y": chin_y},
                "leftEye": {"x": int(face.right_eye[0]), "y": int(face.right_eye[1])},
                "rightEye": {"x": int(face.left_eye[0]), "y": int(face.left_eye[1])},
                **jaw_temple,
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
            mesh_anchors = CVService._mesh_contour_anchors(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
            construction = CVService._construction_from_detection(DetectedFace.from_row(best_row), mesh_anchors)
            return {"source": "detected", **construction}

        construction = CVService._proportional_construction(w, h)
        return {"source": "fallback", **construction}
