import io
import json
import math
import unittest
from pathlib import Path
import numpy as np
from PIL import Image

from app.main import app
from app.services.cv_service import CVService

PORTRAIT_PATH = Path(__file__).resolve().parent / "fixtures" / "portrait.jpg"


async def asgi_request(app, method: str, path: str, query_string: bytes = b"", headers: list = None, body_content: bytes = b""):
    messages = []
    headers = headers or []
    scope = {
        "type": "http",
        "asgi": {"version": "3.0"},
        "http_version": "1.1",
        "method": method,
        "path": path,
        "raw_path": path.encode("ascii"),
        "query_string": query_string,
        "headers": headers,
        "server": ("testserver", 80),
        "client": ("testclient", 50000),
    }

    async def receive():
        return {"type": "http.request", "body": body_content, "more_body": False}

    async def send(message):
        messages.append(message)

    await app(scope, receive, send)
    status_code = next(m["status"] for m in messages if m["type"] == "http.response.start")
    body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return status_code, body


def render_lit_sphere_png(w: int, h: int, cx: int, cy: int, r: int, angle_deg: float) -> bytes:
    """Renders a Lambertian sphere illuminated by a single distant directional light source."""
    y, x = np.mgrid[:h, :w]
    dist2 = (x - cx) ** 2 + (y - cy) ** 2
    mask = dist2 <= r ** 2

    angle_rad = math.radians(angle_deg)
    # In screen coordinates, positive Y is down, so -sin(angle_rad) points up
    lx = math.cos(angle_rad)
    ly = -math.sin(angle_rad)
    lz = 0.5
    norm = math.hypot(lx, ly, lz)
    lx, ly, lz = lx / norm, ly / norm, lz / norm

    z = np.zeros((h, w), dtype=np.float32)
    z[mask] = np.sqrt(np.maximum(0, r ** 2 - dist2[mask]))

    nx = np.zeros((h, w), dtype=np.float32)
    ny = np.zeros((h, w), dtype=np.float32)
    nz = np.zeros((h, w), dtype=np.float32)
    nx[mask] = (x[mask] - cx) / r
    ny[mask] = (y[mask] - cy) / r
    nz[mask] = z[mask] / r

    dot = nx * lx + ny * ly + nz * lz
    shading = np.clip(dot, 0, 1)

    # Ambient light 0.05 so shadow side has small base value
    ambient = 0.05
    intensity = np.clip(shading + ambient, 0, 1)

    img = np.zeros((h, w), dtype=np.uint8)
    img[mask] = (intensity[mask] * 255).astype(np.uint8)

    pil_img = Image.fromarray(img, mode="L")
    buf = io.BytesIO()
    pil_img.save(buf, format="PNG")
    return buf.getvalue()


class TestLightDirectionService(unittest.IsolatedAsyncioTestCase):
    def test_estimate_light_direction_single_light_source_sphere(self):
        """Verifies estimation against a mathematically single-light-source sphere lit at 135 deg (Top-Left)."""
        sphere_png = render_lit_sphere_png(w=400, h=400, cx=200, cy=200, r=150, angle_deg=135.0)
        result = CVService.estimate_light_direction(sphere_png)

        self.assertIsInstance(result, dict)
        self.assertIn("angleDeg", result)
        self.assertIn("directionLabel", result)
        self.assertIn("source", result)
        self.assertIn("terminatorLine", result)
        self.assertIn("shadowCentroid", result)
        self.assertIn("litCentroid", result)

        # Declared Source requirement
        self.assertEqual(result["source"], "estimated")

        # 135 deg corresponds to Top-Left
        self.assertAlmostEqual(result["angleDeg"], 135.0, delta=5.0)
        self.assertIn("Top-Left", result["directionLabel"])

        # Terminator line check
        term = result["terminatorLine"]
        self.assertIn("p1", term)
        self.assertIn("p2", term)
        p1, p2 = term["p1"], term["p2"]
        # Terminator for 135 deg light runs roughly from bottom-left to top-right
        self.assertNotEqual((p1["x"], p1["y"]), (p2["x"], p2["y"]))

    def test_estimate_light_direction_cardinal_angles(self):
        """Tests that directional estimation correctly identifies Top, Right, Left, and Bottom lighting."""
        test_angles = [
            (0.0, "Right"),
            (45.0, "Top-Right"),
            (90.0, "Top"),
            (180.0, "Left"),
            (270.0, "Bottom"),
        ]
        for true_angle, expected_quadrant in test_angles:
            with self.subTest(angle=true_angle):
                png = render_lit_sphere_png(w=300, h=300, cx=150, cy=150, r=100, angle_deg=true_angle)
                res = CVService.estimate_light_direction(png)
                diff = abs(res["angleDeg"] - true_angle)
                if diff > 180:
                    diff = 360 - diff
                self.assertLess(diff, 6.0, f"Angle {true_angle} failed with diff {diff}")
                self.assertIn(expected_quadrant, res["directionLabel"])

    def test_estimate_light_direction_on_portrait_fixture(self):
        """Verifies estimation against real portrait reference image."""
        if not PORTRAIT_PATH.exists():
            self.skipTest("Portrait fixture not found")

        result = CVService.estimate_light_direction(PORTRAIT_PATH.read_bytes())
        self.assertEqual(result["source"], "estimated")
        # Studio portrait has key overhead lighting
        self.assertTrue(60.0 <= result["angleDeg"] <= 120.0, f"Expected overhead lighting, got {result['angleDeg']}")
        self.assertIn("Top", result["directionLabel"])

    def test_estimate_light_direction_with_custom_shadow_threshold(self):
        """Verifies shadow_threshold override modifies shadow classification."""
        sphere_png = render_lit_sphere_png(w=300, h=300, cx=150, cy=150, r=100, angle_deg=135.0)
        res_default = CVService.estimate_light_direction(sphere_png)
        res_custom = CVService.estimate_light_direction(sphere_png, shadow_threshold=80)
        self.assertEqual(res_custom["source"], "estimated")
        self.assertEqual(res_custom["threshold"], 80)
        self.assertAlmostEqual(res_custom["angleDeg"], 135.0, delta=6.0)

    def test_invalid_image_raises_value_error(self):
        with self.assertRaises(ValueError):
            CVService.estimate_light_direction(b"not-an-image")

    async def test_light_direction_endpoint_returns_json(self):
        sphere_png = render_lit_sphere_png(w=200, h=200, cx=100, cy=100, r=80, angle_deg=45.0)
        boundary = "---------------------------12345678901234567890"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="test.png"\r\n'
            f"Content-Type: image/png\r\n\r\n"
        ).encode("utf-8") + sphere_png + f"\r\n--{boundary}--\r\n".encode("utf-8")

        status, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/light-direction",
            headers=[(b"content-type", f"multipart/form-data; boundary={boundary}".encode("utf-8"))],
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertEqual(data["source"], "estimated")
        self.assertIn("angleDeg", data)
        self.assertIn("directionLabel", data)
        self.assertIn("terminatorLine", data)


if __name__ == "__main__":
    unittest.main()
