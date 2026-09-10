from fastapi import APIRouter, UploadFile, File, Response, Query
from app.services.cv_service import CVService

router = APIRouter(prefix="/cv", tags=["Computer Vision"])

@router.post("/histogram")
async def get_image_histogram(file: UploadFile = File(...)):
    """Analyze image luminance distribution and calculate optimal value thresholds."""
    contents = await file.read()
    stats = CVService.analyze_image_luminance_and_histogram(contents)
    return stats

@router.post("/landmarks")
async def detect_facial_landmarks(file: UploadFile = File(...)):
    """Auto-detect facial reference coordinates for Loomis sphere & Reilly rhythms."""
    contents = await file.read()
    landmarks = CVService.estimate_facial_landmarks(contents)
    return landmarks

@router.post("/edges")
async def extract_edges(
    file: UploadFile = File(...),
    low_thresh: int = Query(50, ge=1, le=254),
    high_thresh: int = Query(150, ge=1, le=255)
):
    """Extract clean contour block-in drawing lines from photo."""
    contents = await file.read()
    edge_png = CVService.extract_contour_edges(contents, low_thresh, high_thresh)
    return Response(content=edge_png, media_type="image/png")
