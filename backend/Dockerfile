FROM python:3.13-slim

# Install system dependencies for OpenCV and graphics. libegl1/libgles2 are
# required by mediapipe's native library even for CPU-only inference (it dlopens
# libEGL.so.1 and libGLESv2.so.2 unconditionally on load).
RUN apt-get update && apt-get install -y --no-install-recommends \
    libgl1 \
    libglib2.0-0 \
    libegl1 \
    libgles2 \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install uv package manager
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/

WORKDIR /app

# Enable bytecode compilation
ENV UV_COMPILE_BYTECODE=1
ENV PYTHONUNBUFFERED=1

# Copy dependency definition
COPY pyproject.toml uv.lock ./

# Install dependencies using uv sync
RUN uv sync --frozen --no-install-project

# Copy application source code
COPY . .

# Expose port
EXPOSE 8000

# Start FastAPI server
CMD ["uv", "run", "uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
