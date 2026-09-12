import io
import json
import unittest
from pathlib import Path
from PIL import Image

from app.main import app
from app.core.config import settings


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


class TestDeadPlumbingRemoval(unittest.IsolatedAsyncioTestCase):
    def test_routes_and_mounts(self):
        paths = app.openapi()["paths"]

        # Projects API should be removed
        project_paths = [p for p in paths if "/projects" in p]
        self.assertEqual(project_paths, [], f"Found unexpected project paths in openapi: {project_paths}")

        # Required endpoints must remain intact
        self.assertIn("/api/health", paths)
        self.assertIn("/api/exports/pdf-grid", paths)
        self.assertIn("/api/cv/histogram", paths)
        self.assertIn("/api/cv/landmarks", paths)
        self.assertIn("/api/cv/edges", paths)

        # /uploads mount should not exist in app.routes
        mount_paths = [r.path for r in app.routes if getattr(r, "path", None)]
        self.assertNotIn("/uploads", mount_paths, f"Found /uploads mount in app.routes: {mount_paths}")

    async def test_dead_endpoints_return_404(self):
        status, _ = await asgi_request(app, "GET", "/api/projects/")
        self.assertEqual(status, 404)

        status, _ = await asgi_request(app, "GET", "/uploads/")
        self.assertEqual(status, 404)

    async def test_health_endpoint_returns_200_without_db(self):
        status, body = await asgi_request(app, "GET", "/api/health")
        self.assertEqual(status, 200)
        data = json.loads(body.decode("utf-8"))
        self.assertEqual(data["status"], "healthy")

    async def test_exports_endpoint_serves_pdf_without_db(self):
        status, body = await asgi_request(
            app,
            "GET",
            "/api/exports/pdf-grid",
            query_string=b"width_mm=210&height_mm=297&cell_size_mm=15&show_labels=true&paper_label=A4",
        )
        self.assertEqual(status, 200)
        self.assertTrue(body.startswith(b"%PDF-"), "Response must be a valid PDF document")

    async def test_cv_histogram_endpoint_works_without_db(self):
        img_buf = io.BytesIO()
        Image.new("RGB", (16, 16), color="gray").save(img_buf, format="PNG")
        img_bytes = img_buf.getvalue()

        boundary = "---------------------------974767299852498929531610575"
        body = (
            f"--{boundary}\r\n"
            f'Content-Disposition: form-data; name="file"; filename="test.png"\r\n'
            f"Content-Type: image/png\r\n\r\n"
        ).encode("utf-8") + img_bytes + f"\r\n--{boundary}--\r\n".encode("utf-8")

        status, resp_bytes = await asgi_request(
            app,
            "POST",
            "/api/cv/histogram",
            headers=[(b"content-type", f"multipart/form-data; boundary={boundary}".encode("utf-8"))],
            body_content=body,
        )
        self.assertEqual(status, 200)
        data = json.loads(resp_bytes.decode("utf-8"))
        self.assertIn("histogram", data)

    def test_database_and_models_modules_do_not_exist(self):
        backend_dir = Path(__file__).resolve().parent.parent
        self.assertFalse((backend_dir / "app" / "core" / "database.py").exists(), "database.py should be deleted")
        self.assertFalse((backend_dir / "app" / "models" / "project.py").exists(), "project.py model should be deleted")
        self.assertFalse((backend_dir / "app" / "api" / "projects.py").exists(), "projects.py API should be deleted")

    def test_config_has_no_database_or_upload_settings(self):
        self.assertFalse(hasattr(settings, "DATABASE_URL"), "settings should not define DATABASE_URL")
        self.assertFalse(hasattr(settings, "UPLOAD_DIR"), "settings should not define UPLOAD_DIR")

    def test_docker_compose_has_no_postgres_or_upload_plumbing(self):
        root_dir = Path(__file__).resolve().parent.parent.parent
        compose_file = root_dir / "docker-compose.yml"
        if not compose_file.exists():
            self.skipTest("docker-compose.yml not present in current test environment")

        compose_content = compose_file.read_text(encoding="utf-8")
        self.assertNotIn("postgres:", compose_content)
        self.assertNotIn("sketch_postgres", compose_content)
        self.assertNotIn("DATABASE_URL", compose_content)
        self.assertNotIn("postgres_data", compose_content)
        self.assertNotIn("backend_uploads", compose_content)
        self.assertNotIn("/app/uploads", compose_content)


if __name__ == "__main__":
    unittest.main()
