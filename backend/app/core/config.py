from pydantic import BaseModel

class Settings(BaseModel):
    APP_NAME: str = "Sketch Studio API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: list[str] = ["*"]

settings = Settings()
