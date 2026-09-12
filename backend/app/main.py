from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import Settings, settings as default_settings
from app.api.cv_analysis import router as cv_router
from app.api.exports import router as exports_router


def create_app(app_settings: Settings = default_settings) -> FastAPI:
    application = FastAPI(
        title=app_settings.APP_NAME,
        version=app_settings.VERSION,
        debug=app_settings.DEBUG,
    )

    # Enable CORS for frontend
    application.add_middleware(
        CORSMiddleware,
        allow_origins=app_settings.CORS_ORIGINS,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # Include Routers
    application.include_router(cv_router, prefix="/api")
    application.include_router(exports_router, prefix="/api")

    @application.get("/api/health")
    async def health_check():
        return {
            "status": "healthy",
            "app": app_settings.APP_NAME,
            "version": app_settings.VERSION,
        }

    return application


app = create_app()

