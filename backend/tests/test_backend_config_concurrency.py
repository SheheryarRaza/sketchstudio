import asyncio
import io
import json
import os
import time
import unittest
from unittest.mock import patch
from pydantic_settings import BaseSettings

from app.core.config import Settings
import app.main
from app.main import app
import app.api.cv_analysis as cv_analysis


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


class TestBackendConfig(unittest.TestCase):
    def test_settings_is_base_settings_subclass(self):
        """Settings must inherit from pydantic-settings BaseSettings."""
        self.assertTrue(issubclass(Settings, BaseSettings))

    def test_settings_default_values(self):
        """Default Settings has DEBUG=True, CORS_ORIGINS=['*']."""
        with patch.dict(os.environ, {}, clear=True):
            s = Settings()
            self.assertTrue(s.DEBUG)
            self.assertEqual(s.CORS_ORIGINS, ["*"])

    def test_settings_reads_docker_compose_environment(self):
        """Settings correctly loads DEBUG and CORS_ORIGINS as declared in docker-compose.yml."""
        env = {
            "DEBUG": "false",
            "CORS_ORIGINS": '["http://localhost:3000", "http://127.0.0.1:3000"]',
        }
        with patch.dict(os.environ, env, clear=True):
            s = Settings()
            self.assertFalse(s.DEBUG)
            self.assertEqual(s.CORS_ORIGINS, ["http://localhost:3000", "http://127.0.0.1:3000"])

    def test_settings_reads_comma_separated_cors_origins(self):
        """Settings supports comma-separated string for CORS_ORIGINS as a convenience."""
        env = {
            "CORS_ORIGINS": "http://localhost:3000, http://127.0.0.1:3000",
        }
        with patch.dict(os.environ, env, clear=True):
            s = Settings()
            self.assertEqual(s.CORS_ORIGINS, ["http://localhost:3000", "http://127.0.0.1:3000"])


class TestCORSRestriction(unittest.IsolatedAsyncioTestCase):
    async def test_cors_restriction_takes_effect(self):
        """Verified: CORS origin restriction actually takes effect on app when CORS_ORIGINS is set via environment."""
        from app.main import create_app

        env = {
            "CORS_ORIGINS": '["http://localhost:3000", "http://127.0.0.1:3000"]',
        }
        with patch.dict(os.environ, env, clear=True):
            custom_settings = Settings()
            app_with_env_cors = create_app(custom_settings)

            # Allowed origin from docker-compose.yml
            status, headers, _ = await asgi_request(
                app_with_env_cors,
                "GET",
                "/api/health",
                headers=[(b"origin", b"http://localhost:3000")],
            )
            self.assertEqual(status, 200)
            self.assertEqual(headers.get("access-control-allow-origin"), "http://localhost:3000")

            # Disallowed origin
            status, headers, _ = await asgi_request(
                app_with_env_cors,
                "GET",
                "/api/health",
                headers=[(b"origin", b"http://malicious.example.com")],
            )
            self.assertEqual(status, 200)
            self.assertNotIn("access-control-allow-origin", headers)



class TestCVRouteConcurrency(unittest.IsolatedAsyncioTestCase):
    def test_cv_routes_are_plain_def(self):
        """The CV routes must be plain def (not async def), so FastAPI runs them in threadpool."""
        import inspect

        for fn_name in [
            "get_image_histogram",
            "detect_facial_landmarks",
            "extract_edges",
            "suggest_edges",
            "estimate_light_direction",
        ]:
            fn = getattr(cv_analysis, fn_name, None)
            self.assertIsNotNone(fn, f"{fn_name} should exist in cv_analysis")
            self.assertFalse(
                inspect.iscoroutinefunction(fn),
                f"{fn_name} should be a plain def (not async def) to avoid blocking the event loop",
            )

    async def test_slow_cv_call_does_not_stall_concurrent_request(self):
        """A slow synchronous CV call running in threadpool must not block the event loop for concurrent requests."""
        # Patch analyze_image_luminance_and_histogram to take 0.25 seconds synchronously
        def slow_histogram(image_bytes):
            time.sleep(0.25)
            return {"meanLuminance": 128, "histogram": [0] * 256}

        headers, body = make_multipart_body("test.png", b"fake_data")

        with patch("app.api.cv_analysis.CVService.analyze_image_luminance_and_histogram", side_effect=slow_histogram):
            async def run_slow_cv():
                return await asgi_request(
                    app,
                    "POST",
                    "/api/cv/histogram",
                    headers=headers,
                    body_content=body,
                )

            async def run_fast_health():
                # Small sleep to ensure the slow CV call has started
                await asyncio.sleep(0.05)
                start = time.perf_counter()
                status, _, body_resp = await asgi_request(app, "GET", "/api/health")
                elapsed = time.perf_counter() - start
                return status, elapsed

            # Run both concurrently
            cv_task = asyncio.create_task(run_slow_cv())
            health_task = asyncio.create_task(run_fast_health())

            health_status, health_elapsed = await health_task
            cv_status, _, _ = await cv_task

            self.assertEqual(health_status, 200)
            self.assertEqual(cv_status, 200)
            # If the event loop was blocked, health_elapsed would be >= 0.2s.
            # Because the route runs in a threadpool, health_elapsed should be very fast (< 0.1s).
            self.assertLess(
                health_elapsed,
                0.15,
                f"Health check took {health_elapsed:.3f}s; event loop was stalled by synchronous CV route!",
            )


class TestDecodeFailures(unittest.IsolatedAsyncioTestCase):
    async def test_corrupt_image_returns_422_not_500(self):
        """Image-decode failures return 422 with a client-actionable message, not an unhandled 500."""
        headers, body = make_multipart_body("corrupt.png", b"this-is-not-a-valid-image-file")

        endpoints = [
            "/api/cv/histogram",
            "/api/cv/landmarks",
            "/api/cv/edges",
            "/api/cv/suggest-edges",
            "/api/cv/light-direction",
        ]

        for endpoint in endpoints:
            status, _, resp_body = await asgi_request(
                app,
                "POST",
                endpoint,
                headers=headers,
                body_content=body,
            )
            self.assertEqual(
                status,
                422,
                f"Expected 422 for corrupt image on {endpoint}, got {status}: {resp_body.decode('utf-8', errors='replace')}",
            )
            data = json.loads(resp_body.decode("utf-8"))
            self.assertIn("detail", data)
            self.assertIn("decode", data["detail"].lower())


if __name__ == "__main__":
    unittest.main()
