from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api.cv_analysis import router as cv_router
from app.api.exports import router as exports_router

app = FastAPI(
    title=settings.APP_NAME,
    version=settings.VERSION,
)

# Enable CORS for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include Routers
app.include_router(cv_router, prefix="/api")
app.include_router(exports_router, prefix="/api")

@app.get("/api/health")
async def health_check():
    return {
        "status": "healthy",
        "app": settings.APP_NAME,
        "version": settings.VERSION,
    }
