import asyncio
import io
import json
import unittest
from unittest.mock import patch
from pathlib import Path
from PIL import Image, ImageDraw

from app.main import app

PORTRAIT_PATH = Path(__file__).resolve().parent / "fixtures" / "portrait.jpg"
CLOSEUP_PORTRAIT_PATH = Path(__file__).resolve().parent / "fixtures" / "closeup_portrait.jpg"


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
    start_message = next(m for m in messages if m["type"] == "http.response.start")
    resp_headers = {k.decode("latin1").lower(): v.decode("latin1") for k, v in start_message.get("headers", [])}
    body = b"".join(m.get("body", b"") for m in messages if m["type"] == "http.response.body")
    return status_code, resp_headers, body


def make_multipart_body(filename: str, content: bytes, content_type: str = "image/png"):
    boundary = "---------------------------974767299852498929531610575"
    body = (
        f"--{boundary}\r\n"
        f'Content-Disposition: form-data; name="file"; filename="{filename}"\r\n'
        f"Content-Type: {content_type}\r\n\r\n"
    ).encode("utf-8") + content + f"\r\n--{boundary}--\r\n".encode("utf-8")
    headers = [(b"content-type", f"multipart/form-data; boundary={boundary}".encode("utf-8"))]
    return headers, body


class TestCVHttpSeam(unittest.IsolatedAsyncioTestCase):
    """Seam one: the backend HTTP API boundary.
    Treats the vision service as an implementation detail and asserts the HTTP contracts:
    - contour extraction returns an image
    - luminance statistics are computed from the submitted image and include percentile thresholds
    - landmark estimation returns anchors together with an honest declaration of whether a face was detected
    - a submitted image that cannot be decoded produces an error (422) rather than fabricated output
    """

    def setUp(self):
        # Create a clean synthetic PNG for testing
        img = Image.new("RGB", (200, 200), color="white")
        draw = ImageDraw.Draw(img)
        draw.rectangle([40, 40, 160, 160], fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        self.synthetic_png = buf.getvalue()

        # Create a uniform gray image with no face
        no_face_img = Image.new("RGB", (200, 200), color=(128, 128, 128))
        no_face_buf = io.BytesIO()
        no_face_img.save(no_face_buf, format="PNG")
        self.no_face_png = no_face_buf.getvalue()

    async def test_contour_extraction_returns_an_image(self):
        headers, body = make_multipart_body("test.png", self.synthetic_png)
        status, resp_headers, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/edges",
            headers=headers,
            body_content=body,
        )

        self.assertEqual(status, 200)
        self.assertEqual(resp_headers.get("content-type"), "image/png")
        # PNG signature: 89 50 4E 47 0D 0A 1A 0A
        self.assertTrue(resp_bytes.startswith(b"\x89PNG\r\n\x1a\n"))

    async def test_luminance_statistics_computed_with_percentile_thresholds(self):
        headers, body = make_multipart_body("test.png", self.synthetic_png)
        status, resp_headers, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/histogram",
            headers=headers,
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertEqual(data["width"], 200)
        self.assertEqual(data["height"], 200)
        self.assertIn("meanLuminance", data)
        self.assertIn("medianLuminance", data)
        self.assertIn("deepDarkThreshold", data)
        self.assertIn("highlightThreshold", data)
        self.assertIn("histogram", data)
        self.assertEqual(len(data["histogram"]), 256)
        # Deep dark (p10) <= highlight threshold (p90)
        self.assertLessEqual(data["deepDarkThreshold"], data["highlightThreshold"])

    async def test_landmark_estimation_declares_detected_face(self):
        if not PORTRAIT_PATH.exists():
            self.skipTest("Portrait fixture not found")

        headers, body = make_multipart_body("portrait.jpg", PORTRAIT_PATH.read_bytes(), content_type="image/jpeg")
        status, resp_headers, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/landmarks",
            headers=headers,
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertIn("loomis", data)
        self.assertIn("reilly", data)
        self.assertEqual(data["loomis"]["center"]["source"], "detected")
        self.assertEqual(data["loomis"]["radius"]["source"], "estimated")
        self.assertEqual(data["loomis"]["browLineY"]["source"], "detected")
        self.assertEqual(data["loomis"]["chinY"]["source"], "detected")
        self.assertEqual(data["reilly"]["leftEye"]["source"], "detected")
        self.assertEqual(data["reilly"]["rightEye"]["source"], "detected")
        self.assertEqual(data["reilly"]["noseTip"]["source"], "detected")
        self.assertEqual(data["reilly"]["chinBottom"]["source"], "detected")

    async def test_close_up_portrait_detects_loomis_and_reilly_anchors(self):
        """A close-up portrait fixture returns Loomis and Reilly anchors marked detected (and ball size estimated)."""
        if not CLOSEUP_PORTRAIT_PATH.exists():
            self.skipTest("Close-up portrait fixture not found")

        headers, body = make_multipart_body("closeup_portrait.jpg", CLOSEUP_PORTRAIT_PATH.read_bytes(), content_type="image/jpeg")
        status, _, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/landmarks",
            headers=headers,
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertEqual(data["loomis"]["center"]["source"], "detected")
        self.assertEqual(data["loomis"]["radius"]["source"], "estimated")
        self.assertEqual(data["loomis"]["browLineY"]["source"], "detected")
        self.assertEqual(data["loomis"]["chinY"]["source"], "detected")
        for key in ["leftEye", "rightEye", "noseTip", "mouthCenter", "chinBottom", "leftJaw", "rightJaw", "leftTemple", "rightTemple"]:
            self.assertEqual(data["reilly"][key]["source"], "detected", f"Expected {key} to have source 'detected'")

    async def test_upscaled_portrait_past_4000px_detects_landmarks(self):
        """The portrait fixture upscaled past 4000 px on the long edge still detects."""
        if not PORTRAIT_PATH.exists():
            self.skipTest("Portrait fixture not found")

        base_img = Image.open(PORTRAIT_PATH)
        w, h = base_img.size
        scale = 4200 / max(w, h)
        upscaled = base_img.resize((int(w * scale), int(h * scale)))
        buf = io.BytesIO()
        upscaled.save(buf, format="JPEG", quality=90)
        upscaled_bytes = buf.getvalue()

        headers, body = make_multipart_body("large_portrait.jpg", upscaled_bytes, content_type="image/jpeg")
        status, _, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/landmarks",
            headers=headers,
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertEqual(data["loomis"]["center"]["source"], "detected")
        self.assertEqual(data["loomis"]["radius"]["source"], "estimated")
        self.assertEqual(data["reilly"]["leftEye"]["source"], "detected")
        self.assertEqual(data["reilly"]["rightEye"]["source"], "detected")

    async def test_landmark_estimation_declares_fallback_when_no_face_detected(self):
        headers, body = make_multipart_body("no_face.png", self.no_face_png)
        status, resp_headers, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/landmarks",
            headers=headers,
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertIn("loomis", data)
        self.assertIn("reilly", data)
        # Every anchor in Loomis states fallback
        for key in ["center", "radius", "browLineY", "noseLineY", "chinY", "jawWidth"]:
            self.assertEqual(data["loomis"][key]["source"], "fallback", f"Expected loomis.{key} to have source 'fallback'")
        # Every anchor in Reilly states fallback
        for key, pt in data["reilly"].items():
            self.assertEqual(pt["source"], "fallback", f"Expected reilly.{key} to have source 'fallback'")

    async def test_undecodable_image_produces_error_rather_than_fabricated_output(self):
        corrupt_bytes = b"CORRUPT_NOT_AN_IMAGE_DATA_12345"
        headers, body = make_multipart_body("corrupt.png", corrupt_bytes)

        # /edges must return 422
        status_edges, _, resp_edges = await asgi_request(
            app, "POST", "/api/cv/edges", headers=headers, body_content=body
        )
        self.assertEqual(status_edges, 422)
        edges_data = json.loads(resp_edges.decode("utf-8"))
        self.assertIn("detail", edges_data)

        # /histogram must return 422
        status_hist, _, resp_hist = await asgi_request(
            app, "POST", "/api/cv/histogram", headers=headers, body_content=body
        )
        self.assertEqual(status_hist, 422)
        hist_data = json.loads(resp_hist.decode("utf-8"))
        self.assertIn("detail", hist_data)

        # /landmarks must return 422
        status_land, _, resp_land = await asgi_request(
            app, "POST", "/api/cv/landmarks", headers=headers, body_content=body
        )
        self.assertEqual(status_land, 422)
        land_data = json.loads(resp_land.decode("utf-8"))
        self.assertIn("detail", land_data)

    async def test_oversized_upload_returns_413_without_decoding(self):
        """Upload exceeding MAX_UPLOAD_SIZE_BYTES returns 413 Payload Too Large without calling imdecode."""
        oversized_bytes = b"X" * 2048
        headers, body = make_multipart_body("oversized.png", oversized_bytes)

        endpoints = [
            "/api/cv/landmarks",
            "/api/cv/light-direction",
            "/api/cv/histogram",
            "/api/cv/edges",
            "/api/cv/suggest-edges",
        ]

        with patch("app.core.config.settings.MAX_UPLOAD_SIZE_BYTES", 1024), \
             patch("cv2.imdecode") as mock_imdecode:
            for endpoint in endpoints:
                mock_imdecode.reset_mock()
                status, _, resp_body = await asgi_request(
                    app,
                    "POST",
                    endpoint,
                    headers=headers,
                    body_content=body,
                )
                self.assertEqual(
                    status,
                    413,
                    f"Expected 413 on {endpoint} for oversized upload, got {status}: {resp_body.decode('utf-8', errors='replace')}",
                )
                mock_imdecode.assert_not_called()
                data = json.loads(resp_body.decode("utf-8"))
                self.assertIn("detail", data)
                self.assertTrue(
                    any(phrase in data["detail"].lower() for phrase in ["too large", "exceeds", "maximum"]),
                    f"Expected informative detail about size limit, got: {data['detail']}",
                )

    async def test_concurrent_landmark_requests_return_200(self):
        """8 concurrent landmark requests with differing image dimensions all return 200 without race conditions."""
        if not PORTRAIT_PATH.exists():
            self.skipTest("Portrait fixture not found")

        base_img = Image.open(PORTRAIT_PATH)
        variants = []
        for i in range(8):
            w = 280 + i * 20
            h = 300 + (i % 3) * 30
            resized = base_img.resize((w, h))
            buf = io.BytesIO()
            resized.save(buf, format="JPEG")
            variants.append(buf.getvalue())

        async def send_req(img_bytes, idx):
            headers, body = make_multipart_body(f"req_{idx}.jpg", img_bytes, content_type="image/jpeg")
            return await asgi_request(app, "POST", "/api/cv/landmarks", headers=headers, body_content=body)

        responses = await asyncio.gather(*[send_req(v, i) for i, v in enumerate(variants)])

        self.assertEqual(len(responses), 8)
        for i, (status, _, resp_bytes) in enumerate(responses):
            self.assertEqual(status, 200, f"Request {i} failed with status {status}: {resp_bytes.decode('utf-8', errors='replace')}")
            data = json.loads(resp_bytes.decode("utf-8"))
            self.assertIn("loomis", data)
            self.assertIn("reilly", data)
            self.assertEqual(data["loomis"]["center"]["source"], "detected")
            self.assertEqual(data["loomis"]["radius"]["source"], "estimated")

    async def test_concurrent_light_direction_requests_return_200(self):
        """8 concurrent light-direction requests with differing image dimensions all return 200 without race conditions."""
        if not PORTRAIT_PATH.exists():
            self.skipTest("Portrait fixture not found")

        base_img = Image.open(PORTRAIT_PATH)
        variants = []
        for i in range(8):
            w = 280 + i * 20
            h = 300 + (i % 3) * 30
            resized = base_img.resize((w, h))
            buf = io.BytesIO()
            resized.save(buf, format="JPEG")
            variants.append(buf.getvalue())

        async def send_req(img_bytes, idx):
            headers, body = make_multipart_body(f"req_{idx}.jpg", img_bytes, content_type="image/jpeg")
            return await asgi_request(app, "POST", "/api/cv/light-direction", headers=headers, body_content=body)

        responses = await asyncio.gather(*[send_req(v, i) for i, v in enumerate(variants)])

        self.assertEqual(len(responses), 8)
        for i, (status, _, resp_bytes) in enumerate(responses):
            self.assertEqual(status, 200, f"Request {i} failed with status {status}: {resp_bytes.decode('utf-8', errors='replace')}")
            data = json.loads(resp_bytes.decode("utf-8"))
            self.assertIn("angleDeg", data)
            self.assertIn("directionLabel", data)
            self.assertIn("terminatorLine", data)


if __name__ == "__main__":
    unittest.main()
