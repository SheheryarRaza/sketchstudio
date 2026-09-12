import json
from typing import Any, Union
from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    APP_NAME: str = "Sketch Studio API"
    VERSION: str = "1.0.0"
    DEBUG: bool = True
    CORS_ORIGINS: Union[list[str], str] = ["*"]

    @field_validator("CORS_ORIGINS", mode="after")
    @classmethod
    def assemble_cors_origins(cls, v: Any) -> list[str]:
        if isinstance(v, str):
            v = v.strip()
            if v.startswith("[") and v.endswith("]"):
                try:
                    loaded = json.loads(v)
                    if isinstance(loaded, list):
                        return [str(i) for i in loaded]
                except Exception:
                    pass
            return [i.strip() for i in v.split(",") if i.strip()]
        return [str(i) for i in v]


settings = Settings()

