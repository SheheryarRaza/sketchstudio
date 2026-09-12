import io
import json
import unittest
from pathlib import Path
from PIL import Image, ImageDraw

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


class TestEdgeSuggestionService(unittest.IsolatedAsyncioTestCase):
    def setUp(self):
        # Create a clean high-contrast synthetic image with a clear shape
        img = Image.new("RGB", (200, 200), color="white")
        draw = ImageDraw.Draw(img)
        draw.rectangle([40, 40, 160, 160], fill="black")
        buf = io.BytesIO()
        img.save(buf, format="PNG")
        self.synthetic_png = buf.getvalue()

    def test_suggest_edge_segments_on_synthetic_shape(self):
        segments = CVService.suggest_edge_segments(self.synthetic_png, min_length=20, max_segments=10)

        self.assertIsInstance(segments, list)
        self.assertGreater(len(segments), 0)

        first = segments[0]
        self.assertIn("id", first)
        self.assertIn("quality", first)
        self.assertIn("points", first)
        self.assertIn("label", first)

        self.assertEqual(first["quality"], "hard")
        self.assertGreaterEqual(len(first["points"]), 2)

        for pt in first["points"]:
            self.assertIn("id", pt)
            self.assertIn("x", pt)
            self.assertIn("y", pt)
            self.assertTrue(0 <= pt["x"] <= 200)
            self.assertTrue(0 <= pt["y"] <= 200)

    def test_suggest_edge_segments_on_portrait_photo(self):
        if not PORTRAIT_PATH.exists():
            self.skipTest("Portrait fixture not found")

        segments = CVService.suggest_edge_segments(
            PORTRAIT_PATH.read_bytes(),
            min_length=30,
            max_segments=15
        )

        self.assertIsInstance(segments, list)
        self.assertGreater(len(segments), 0)
        self.assertLessEqual(len(segments), 15)

    async def test_suggest_edges_endpoint_returns_json_segments(self):
        boundary = "---------------------------974767299852498929531610575"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="test.png"\r\n'
            f"Content-Type: image/png\r\n\r\n"
        ).encode("utf-8") + self.synthetic_png + f"\r\n--{boundary}--\r\n".encode("utf-8")

        status, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/suggest-edges",
            headers=[(b"content-type", f"multipart/form-data; boundary={boundary}".encode("utf-8"))],
            body_content=body,
        )

        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertIsInstance(data, list)
        self.assertGreater(len(data), 0)
        self.assertIn("points", data[0])


if __name__ == "__main__":
    unittest.main()
