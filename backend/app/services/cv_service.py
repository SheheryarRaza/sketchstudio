import cv2
import numpy as np
from PIL import Image
import io

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
    def estimate_facial_landmarks(image_bytes: bytes) -> dict:
        """Estimate face bounding box and key landmark positions (Haar / geometry fallback)."""
        np_arr = np.frombuffer(image_bytes, np.uint8)
        img = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)
        if img is None:
            raise ValueError("Could not decode image")

        h, w = img.shape[:2]
        gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

        # Default centered head construction
        center_x = w // 2
        center_y = int(h * 0.45)
        radius = int(min(w, h) * 0.28)

        # Try to detect face using OpenCV Haar Cascade if available
        face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.py') if hasattr(cv2, 'data') else None
        
        if face_cascade is not None and not face_cascade.empty():
            faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(60, 60))
            if len(faces) > 0:
                fx, fy, fw, fh = faces[0]
                center_x = fx + fw // 2
                center_y = fy + int(fh * 0.45)
                radius = int(fw * 0.5)

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
                "leftJaw": {"x": center_x - int(radius * 0.7), "y": center_y + int(radius * 0.7)},
                "rightJaw": {"x": center_x + int(radius * 0.7), "y": center_y + int(radius * 0.7)},
                "leftTemple": {"x": center_x - int(radius * 0.75), "y": center_y - int(radius * 0.4)},
                "rightTemple": {"x": center_x + int(radius * 0.75), "y": center_y - int(radius * 0.4)},
            }
        }
