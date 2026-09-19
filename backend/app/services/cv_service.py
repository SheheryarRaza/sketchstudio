import cv2
import numpy as np
import mediapipe as mp
from mediapipe.tasks.python import vision, BaseOptions
from mediapipe.tasks.python.vision import FaceLandmarkerOptions, RunningMode
from pathlib import Path
from typing import NamedTuple, Optional
from PIL import Image
import io
import math
import threading

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
_face_analysis_lock = threading.RLock()


def _left_right(a: tuple, b: tuple) -> tuple:
    """Orders two points by x so the smaller-x one is always "left" (image-left),
    regardless of which anatomical side a mesh landmark index nominally represents."""
    return (a, b) if a[0] <= b[0] else (b, a)


def _calculate_tilt_angle(eye_a: tuple, eye_b: tuple) -> float:
    """Calculates head roll tilt angle in degrees from eye landmarks.
    Image-left eye is ordered first so positive angle indicates clockwise roll."""
    eye_left, eye_right = _left_right(eye_a, eye_b)
    dx = eye_right[0] - eye_left[0]
    dy = eye_right[1] - eye_left[1]
    return round(math.degrees(math.atan2(dy, dx)), 1) if dx != 0 or dy != 0 else 0.0


def _direction_label_from_angle(angle_deg: float) -> str:
    """Returns human-readable lighting direction quadrant label from Cartesian angle in degrees."""
    angle = angle_deg % 360.0
    if 22.5 <= angle < 67.5:
        return f"Top-Right ({round(angle_deg)}°)"
    elif 67.5 <= angle < 112.5:
        return f"Top ({round(angle_deg)}°)"
    elif 112.5 <= angle < 157.5:
        return f"Top-Left ({round(angle_deg)}°)"
    elif 157.5 <= angle < 202.5:
        return f"Left ({round(angle_deg)}°)"
    elif 202.5 <= angle < 247.5:
        return f"Bottom-Left ({round(angle_deg)}°)"
    elif 247.5 <= angle < 292.5:
        return f"Bottom ({round(angle_deg)}°)"
    elif 292.5 <= angle < 337.5:
        return f"Bottom-Right ({round(angle_deg)}°)"
    else:
        return f"Right ({round(angle_deg)}°)"



def _get_face_detector() -> cv2.FaceDetectorYN:
    """Lazily loads and caches the YuNet face detector (OpenCV 5.0 replacement for CascadeClassifier)."""
    global _face_detector
    with _face_analysis_lock:
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
    with _face_analysis_lock:
        if _face_landmarker is None:
            _face_landmarker = vision.FaceLandmarker.create_from_options(
                FaceLandmarkerOptions(
                    base_options=BaseOptions(model_asset_path=str(FACE_LANDMARKER_MODEL_PATH)),
                    running_mode=RunningMode.IMAGE,
                    num_faces=1,
                )
            )
        return _face_landmarker


def _detect_faces_locked(img: np.ndarray, w: int, h: int):
    """Runs YuNet face detection under _face_analysis_lock so concurrent requests
    never mutate setInputSize or execute inference simultaneously on shared state."""
    with _face_analysis_lock:
        detector = _get_face_detector()
        detector.setInputSize((w, h))
        return detector.detect(img)


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
    """Jaw/temple/brow/chin/eyes/nose/mouth anchors read from MediaPipe's real face-mesh contour, in
    pixel space, mirroring DetectedFace's role for the YuNet keypoints."""

    left_jaw: tuple
    right_jaw: tuple
    left_temple: tuple
    right_temple: tuple
    chin: tuple
    brow_line_y: float
    left_eye: tuple = (0.0, 0.0)
    right_eye: tuple = (0.0, 0.0)
    nose_tip: tuple = (0.0, 0.0)
    mouth_center: tuple = (0.0, 0.0)
    min_x: float = 0.0
    max_x: float = 0.0
    min_y: float = 0.0
    max_y: float = 0.0
    brow_center: tuple = (0.0, 0.0)

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
    def _symmetric_jaw_temple(center_x: int, center_y: int, radius: int, source: str = "fallback") -> dict:
        """Jaw and temple anchors: proportional to face radius, never literal keypoints
        in any face detector (classical or DNN), so shared by both construction paths."""
        return {
            "leftJaw": {"x": center_x - int(radius * 0.7), "y": center_y + int(radius * 0.7), "source": source},
            "rightJaw": {"x": center_x + int(radius * 0.7), "y": center_y + int(radius * 0.7), "source": source},
            "leftTemple": {"x": center_x - int(radius * 0.75), "y": center_y - int(radius * 0.4), "source": source},
            "rightTemple": {"x": center_x + int(radius * 0.75), "y": center_y - int(radius * 0.4), "source": source},
        }

    @staticmethod
    def _proportional_construction(w: int, h: int) -> dict:
        """Declared proportional fallback: a fixed centered-head guess, not a measurement."""
        center_x = w // 2
        center_y = int(h * 0.45)
        radius = int(min(w, h) * 0.28)

        return {
            "loomis": {
                "center": {"x": center_x, "y": center_y, "source": "fallback"},
                "radius": {"value": radius, "radius": radius, "source": "fallback"},
                "browLineY": {"value": center_y, "y": center_y, "source": "fallback"},
                "noseLineY": {"value": center_y + int(radius * 0.6), "y": center_y + int(radius * 0.6), "source": "fallback"},
                "chinY": {"value": center_y + int(radius * 1.25), "y": center_y + int(radius * 1.25), "source": "fallback"},
                "jawWidth": {"value": int(radius * 0.9), "source": "fallback"},
                "tiltAngle": {"value": 0, "source": "fallback"},
            },
            "reilly": {
                "browCenter": {"x": center_x, "y": center_y - 10, "source": "fallback"},
                "noseTip": {"x": center_x, "y": center_y + int(radius * 0.6), "source": "fallback"},
                "mouthCenter": {"x": center_x, "y": center_y + int(radius * 0.95), "source": "fallback"},
                "chinBottom": {"x": center_x, "y": center_y + int(radius * 1.25), "source": "fallback"},
                "leftEye": {"x": center_x - int(radius * 0.4), "y": center_y, "source": "fallback"},
                "rightEye": {"x": center_x + int(radius * 0.4), "y": center_y, "source": "fallback"},
                **CVService._symmetric_jaw_temple(center_x, center_y, radius, source="fallback"),
            },
        }

    @staticmethod
    def _mesh_contour_anchors(image_rgb: np.ndarray) -> Optional[MeshAnchors]:
        """Runs MediaPipe Face Landmarker over the image and returns
        pixel-space jaw/temple/chin/brow/eyes/nose/mouth anchors from the real contour mesh, or None if
        the landmarker couldn't find a face."""
        h, w = image_rgb.shape[:2]
        mp_image = mp.Image(image_format=mp.ImageFormat.SRGB, data=image_rgb)
        with _face_analysis_lock:
            result = _get_face_landmarker().detect(mp_image)
        if not result.face_landmarks:
            return None

        mesh = result.face_landmarks[0]

        def point(index: int) -> tuple:
            landmark = mesh[index]
            return (landmark.x * w, landmark.y * h)

        left_jaw, right_jaw = _left_right(point(_JAW_LANDMARKS[0]), point(_JAW_LANDMARKS[1]))
        left_temple, right_temple = _left_right(point(_TEMPLE_LANDMARKS[0]), point(_TEMPLE_LANDMARKS[1]))
        brow_pts = [point(i) for i in _BROW_LANDMARKS]
        brow_center = (sum(p[0] for p in brow_pts) / len(brow_pts), sum(p[1] for p in brow_pts) / len(brow_pts))
        brow_line_y = brow_center[1]
        left_eye, right_eye = _left_right(point(468), point(473))
        nose_tip = point(4)
        mouth_center = ((point(13)[0] + point(14)[0]) / 2, (point(13)[1] + point(14)[1]) / 2)

        xs = [pt.x * w for pt in mesh]
        ys = [pt.y * h for pt in mesh]

        return MeshAnchors(
            left_jaw=left_jaw,
            right_jaw=right_jaw,
            left_temple=left_temple,
            right_temple=right_temple,
            chin=point(_CHIN_LANDMARK),
            brow_line_y=brow_line_y,
            left_eye=left_eye,
            right_eye=right_eye,
            nose_tip=nose_tip,
            mouth_center=mouth_center,
            min_x=min(xs),
            max_x=max(xs),
            min_y=min(ys),
            max_y=max(ys),
            brow_center=brow_center,
        )

    @staticmethod
    def _construction_from_mesh(mesh_anchors: MeshAnchors) -> dict:
        """Constructs Loomis and Reilly anchors directly from MediaPipe mesh landmarks,
        marking detected points as 'detected' and Loomis ball size as 'estimated'."""
        center_x = int((mesh_anchors.min_x + mesh_anchors.max_x) / 2)
        center_y = int((mesh_anchors.left_eye[1] + mesh_anchors.right_eye[1]) / 2)
        fw = mesh_anchors.max_x - mesh_anchors.min_x
        brow_to_chin = abs(mesh_anchors.chin[1] - mesh_anchors.brow_line_y)
        # Standard Loomis cranium proportions: the cranial ball covers the whole skull dome.
        # Temporal width (face width fw) is ~2/3 of cranial ball diameter, so radius is 3/4 * fw.
        # Brow-to-chin span is 2 face thirds, while cranial sphere diameter is 3 thirds (radius = 3/4 * span).
        span = max(fw, brow_to_chin)
        radius = int(span * 0.75)

        eye_left, eye_right = _left_right(mesh_anchors.left_eye, mesh_anchors.right_eye)
        tilt_angle = _calculate_tilt_angle(eye_left, eye_right)

        rad = math.radians(tilt_angle)
        uy_x, uy_y = -math.sin(rad), math.cos(rad)

        def project_y(pt: tuple) -> int:
            """Projects a landmark point onto the head's tilted vertical midline."""
            offset_x = pt[0] - center_x
            offset_y = pt[1] - center_y
            return int(center_y + offset_x * uy_x + offset_y * uy_y)

        brow_line_y = project_y(mesh_anchors.brow_center) if mesh_anchors.brow_center != (0.0, 0.0) else int(mesh_anchors.brow_line_y)
        nose_y = project_y(mesh_anchors.nose_tip)
        chin_y = project_y(mesh_anchors.chin)
        jaw_width = int(mesh_anchors.jaw_width)
        chin_x = int(mesh_anchors.chin[0])
        nose_x = int(mesh_anchors.nose_tip[0])
        mouth_x, mouth_y = int(mesh_anchors.mouth_center[0]), int(mesh_anchors.mouth_center[1])

        return {
            "loomis": {
                "center": {"x": center_x, "y": center_y, "source": "detected"},
                "radius": {"value": radius, "radius": radius, "source": "estimated"},
                "browLineY": {"value": brow_line_y, "y": brow_line_y, "source": "detected"},
                "noseLineY": {"value": nose_y, "y": nose_y, "source": "detected"},
                "chinY": {"value": chin_y, "y": chin_y, "source": "detected"},
                "jawWidth": {"value": jaw_width, "source": "detected"},
                "tiltAngle": {"value": tilt_angle, "source": "detected"},
            },
            "reilly": {
                "browCenter": {"x": center_x, "y": brow_line_y - 10, "source": "detected"},
                "noseTip": {"x": nose_x, "y": nose_y, "source": "detected"},
                "mouthCenter": {"x": mouth_x, "y": mouth_y, "source": "detected"},
                "chinBottom": {"x": chin_x, "y": chin_y, "source": "detected"},
                "leftEye": {"x": int(mesh_anchors.left_eye[0]), "y": int(mesh_anchors.left_eye[1]), "source": "detected"},
                "rightEye": {"x": int(mesh_anchors.right_eye[0]), "y": int(mesh_anchors.right_eye[1]), "source": "detected"},
                "leftJaw": {"x": int(mesh_anchors.left_jaw[0]), "y": int(mesh_anchors.left_jaw[1]), "source": "detected"},
                "rightJaw": {"x": int(mesh_anchors.right_jaw[0]), "y": int(mesh_anchors.right_jaw[1]), "source": "detected"},
                "leftTemple": {"x": int(mesh_anchors.left_temple[0]), "y": int(mesh_anchors.left_temple[1]), "source": "detected"},
                "rightTemple": {"x": int(mesh_anchors.right_temple[0]), "y": int(mesh_anchors.right_temple[1]), "source": "detected"},
            },
        }

    @staticmethod
    def _construction_from_detection(face: DetectedFace, mesh_anchors: Optional[MeshAnchors]) -> dict:
        """Anchors built from real detected eye/nose/mouth keypoints (YuNet detection path).
        Jaw/temple/chin/brow come from the MediaPipe contour mesh when available, falling
        back to bbox-proportional geometry when the mesh landmarker couldn't find a face."""
        center_x = int(face.x + face.w / 2)
        center_y = int((face.right_eye[1] + face.left_eye[1]) / 2)
        nose_x, nose_y = face.nose_tip
        mouth_x = int((face.right_mouth[0] + face.left_mouth[0]) / 2)
        mouth_y = int((face.right_mouth[1] + face.left_mouth[1]) / 2)

        tilt_angle = _calculate_tilt_angle(face.right_eye, face.left_eye)

        if mesh_anchors is not None:
            left_jaw = {"x": int(mesh_anchors.left_jaw[0]), "y": int(mesh_anchors.left_jaw[1]), "source": "detected"}
            right_jaw = {"x": int(mesh_anchors.right_jaw[0]), "y": int(mesh_anchors.right_jaw[1]), "source": "detected"}
            left_temple = {"x": int(mesh_anchors.left_temple[0]), "y": int(mesh_anchors.left_temple[1]), "source": "detected"}
            right_temple = {"x": int(mesh_anchors.right_temple[0]), "y": int(mesh_anchors.right_temple[1]), "source": "detected"}
            jaw_width = int(mesh_anchors.jaw_width)
            jaw_width_source = "detected"
            chin_x, chin_y = int(mesh_anchors.chin[0]), int(mesh_anchors.chin[1])
            chin_source = "detected"
            brow_line_y = int(mesh_anchors.brow_line_y)
            brow_source = "detected"
        else:
            chin_x, chin_y = center_x, int(face.y + face.h)
            chin_source = "estimated"
            brow_line_y = center_y
            brow_source = "estimated"

        brow_to_chin = abs(chin_y - brow_line_y)
        span = max(face.w, brow_to_chin)
        radius = int(span * 0.75)

        if mesh_anchors is None:
            sym = CVService._symmetric_jaw_temple(center_x, center_y, radius, source="estimated")
            left_jaw = sym["leftJaw"]
            right_jaw = sym["rightJaw"]
            left_temple = sym["leftTemple"]
            right_temple = sym["rightTemple"]
            jaw_width = int(radius * 0.9)
            jaw_width_source = "estimated"

        return {
            "loomis": {
                "center": {"x": center_x, "y": center_y, "source": "detected"},
                "radius": {"value": radius, "radius": radius, "source": "estimated"},
                "browLineY": {"value": brow_line_y, "y": brow_line_y, "source": brow_source},
                "noseLineY": {"value": int(nose_y), "y": int(nose_y), "source": "detected"},
                "chinY": {"value": chin_y, "y": chin_y, "source": chin_source},
                "jawWidth": {"value": jaw_width, "source": jaw_width_source},
                "tiltAngle": {"value": tilt_angle, "source": "detected"},
            },
            "reilly": {
                "browCenter": {"x": center_x, "y": brow_line_y - 10, "source": brow_source},
                "noseTip": {"x": int(nose_x), "y": int(nose_y), "source": "detected"},
                "mouthCenter": {"x": mouth_x, "y": mouth_y, "source": "detected"},
                "chinBottom": {"x": chin_x, "y": chin_y, "source": chin_source},
                "leftEye": {"x": int(face.right_eye[0]), "y": int(face.right_eye[1]), "source": "detected"},
                "rightEye": {"x": int(face.left_eye[0]), "y": int(face.left_eye[1]), "source": "detected"},
                "leftJaw": left_jaw,
                "rightJaw": right_jaw,
                "leftTemple": left_temple,
                "rightTemple": right_temple,
            },
        }


    @staticmethod
    def estimate_facial_landmarks(image_bytes: bytes) -> dict:
        """Detect Loomis/Reilly anchor positions from the actual face when one is found,
        declaring whether each anchor was detected, estimated, or a proportional fallback."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        h, w = img.shape[:2]

        # 1. Primary detector: MediaPipe Face Landmarker handles Head Studies where
        # the face fills the frame, as well as images upscaled past 4000 px on the long edge.
        mesh_anchors = CVService._mesh_contour_anchors(cv2.cvtColor(img, cv2.COLOR_BGR2RGB))
        if mesh_anchors is not None:
            return CVService._construction_from_mesh(mesh_anchors)

        # 2. Secondary detector: YuNet fallback
        _, faces = _detect_faces_locked(img, w, h)
        if faces is not None and len(faces) > 0:
            best_row = faces[np.argmax(faces[:, 14])]
            return CVService._construction_from_detection(DetectedFace.from_row(best_row), None)

        # 3. Fallback path: declared proportional construction
        return CVService._proportional_construction(w, h)

    @staticmethod
    def estimate_light_direction(
        image_bytes: bytes,
        shadow_threshold: Optional[int] = None
    ) -> dict:
        """Estimate the incident light direction angle and terminator line from the
        image luminance histogram and the spatial distribution of the shadow Value Family."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        analysis_gray = gray
        roi_offset_x = 0
        roi_offset_y = 0
        has_face = False
        fw = w
        fh = h

        _, faces = _detect_faces_locked(img, w, h)

        if faces is not None and len(faces) > 0:
            best_face = faces[np.argmax(faces[:, 14])]
            fx, fy, fw, fh = int(best_face[0]), int(best_face[1]), int(best_face[2]), int(best_face[3])
            pad = int(min(fw, fh) * 0.25)
            x1 = max(0, fx - pad)
            y1 = max(0, fy - pad)
            x2 = min(w, fx + fw + pad)
            y2 = min(h, fy + fh + pad)
            if (x2 - x1) > 20 and (y2 - y1) > 20:
                analysis_gray = gray[y1:y2, x1:x2]
                roi_offset_x = x1
                roi_offset_y = y1
                has_face = True

        if shadow_threshold is not None:
            thresh = int(shadow_threshold)
        else:
            p10 = float(np.percentile(analysis_gray, 10))
            p90 = float(np.percentile(analysis_gray, 90))
            otsu_val, _ = cv2.threshold(analysis_gray, 0, 255, cv2.THRESH_BINARY + cv2.THRESH_OTSU)
            thresh = int(np.clip(otsu_val, max(p10 + 5, 20), min(p90 - 5, 235)))

        shadow_mask = analysis_gray < thresh
        lit_mask = analysis_gray >= thresh

        if not np.any(shadow_mask) or not np.any(lit_mask):
            sh_x, sh_y = w * 0.6, h * 0.6
            lit_x, lit_y = w * 0.4, h * 0.4
        else:
            sh_indices = np.where(shadow_mask)
            sh_y = float(np.mean(sh_indices[0])) + roi_offset_y
            sh_x = float(np.mean(sh_indices[1])) + roi_offset_x

            lit_indices = np.where(lit_mask)
            weights = analysis_gray[lit_mask].astype(np.float64)
            if np.sum(weights) > 0:
                lit_y = float(np.sum(lit_indices[0] * weights) / np.sum(weights)) + roi_offset_y
                lit_x = float(np.sum(lit_indices[1] * weights) / np.sum(weights)) + roi_offset_x
            else:
                lit_y = float(np.mean(lit_indices[0])) + roi_offset_y
                lit_x = float(np.mean(lit_indices[1])) + roi_offset_x

        dx = lit_x - sh_x
        dy = sh_y - lit_y

        dist = math.hypot(dx, dy)
        if dist < 1e-4:
            dx, dy = 1.0, 1.0
            angle_deg = 45.0
        else:
            angle_rad = math.atan2(dy, dx)
            angle_deg = (math.degrees(angle_rad) + 360.0) % 360.0

        angle_deg = round(angle_deg, 1)
        direction_label = _direction_label_from_angle(angle_deg)

        center_x = (lit_x + sh_x) / 2.0
        center_y = (lit_y + sh_y) / 2.0

        ang_rad = math.radians(angle_deg)
        perp_x = math.sin(ang_rad)
        perp_y = math.cos(ang_rad)

        line_length = float(min(w, h) * 0.7)
        if has_face:
            line_length = float(max(fw, fh) * 1.2)

        half_len = line_length / 2.0
        p1_x = max(0.0, min(float(w), center_x - half_len * perp_x))
        p1_y = max(0.0, min(float(h), center_y - half_len * perp_y))
        p2_x = max(0.0, min(float(w), center_x + half_len * perp_x))
        p2_y = max(0.0, min(float(h), center_y + half_len * perp_y))

        return {
            "angleDeg": angle_deg,
            "directionLabel": direction_label,
            "source": "estimated",
            "threshold": thresh,
            "terminatorLine": {
                "p1": {"x": round(p1_x, 1), "y": round(p1_y, 1)},
                "p2": {"x": round(p2_x, 1), "y": round(p2_y, 1)},
            },
            "shadowCentroid": {"x": round(sh_x, 1), "y": round(sh_y, 1)},
            "litCentroid": {"x": round(lit_x, 1), "y": round(lit_y, 1)},
        }

