import os
from pathlib import Path
from pydantic import BaseModel

BASE_DIR = Path(__file__).resolve().parent.parent.parent
UPLOAD_DIR = BASE_DIR / "uploads"
UPLOAD_DIR.mkdir(parents=True, exist_ok=True)

class Settings(BaseModel):
    APP_NAME: str = "Sketch Studio API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    DATABASE_URL: str = os.getenv("DATABASE_URL", f"sqlite+aiosqlite:///{BASE_DIR}/sketch_studio.db")
    UPLOAD_DIR: Path = UPLOAD_DIR
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
