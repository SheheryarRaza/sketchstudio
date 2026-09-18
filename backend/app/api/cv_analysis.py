from typing import Optional
from fastapi import APIRouter, UploadFile, File, Response, Query, HTTPException
from app.core.config import settings
from app.services.cv_service import CVService

router = APIRouter(prefix="/cv", tags=["Computer Vision"])


def _read_and_run(file: UploadFile, cv_func, *args, **kwargs):
    max_bytes = settings.MAX_UPLOAD_SIZE_BYTES

    def raise_payload_too_large():
        raise HTTPException(
            status_code=413,
            detail=f"Uploaded image exceeds maximum allowed size of {max_bytes} bytes",
        )

    if file.size is not None and file.size > max_bytes:
        raise_payload_too_large()

    chunk_size = 64 * 1024
    total_read = 0
    chunks = []
    while True:
        chunk = file.file.read(chunk_size)
        if not chunk:
            break
        total_read += len(chunk)
        if total_read > max_bytes:
            raise_payload_too_large()
        chunks.append(chunk)

    contents = b"".join(chunks)
    try:
        return cv_func(contents, *args, **kwargs)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=str(exc))


@router.post("/histogram")
def get_image_histogram(file: UploadFile = File(...)):
    """Analyze image luminance distribution and calculate optimal value thresholds."""
    return _read_and_run(file, CVService.analyze_image_luminance_and_histogram)


@router.post("/landmarks")
def detect_facial_landmarks(file: UploadFile = File(...)):
    """Auto-detect facial reference coordinates for Loomis sphere & Reilly rhythms."""
    return _read_and_run(file, CVService.estimate_facial_landmarks)


@router.post("/edges")
def extract_edges(
    file: UploadFile = File(...),
    low_thresh: int = Query(50, ge=1, le=254),
    high_thresh: int = Query(150, ge=1, le=255)
):
    """Extract clean contour block-in drawing lines from photo."""
    edge_png = _read_and_run(file, CVService.extract_contour_edges, low_thresh, high_thresh)
    return Response(content=edge_png, media_type="image/png")


@router.post("/suggest-edges")
def suggest_edges(
    file: UploadFile = File(...),
    low_thresh: int = Query(50, ge=1, le=254),
    high_thresh: int = Query(150, ge=1, le=255),
    max_segments: int = Query(20, ge=1, le=50)
):
    """Detect candidate edge segments from Reference Image contours for edge quality classification."""
    return _read_and_run(file, CVService.suggest_edge_segments, low_thresh, high_thresh, max_segments=max_segments)


@router.post("/light-direction")
def estimate_light_direction(
    file: UploadFile = File(...),
    shadow_threshold: Optional[int] = Query(None, ge=1, le=254)
):
    """Estimate light direction angle and terminator line from luminance histogram and shadow shape."""
    return _read_and_run(file, CVService.estimate_light_direction, shadow_threshold=shadow_threshold)



