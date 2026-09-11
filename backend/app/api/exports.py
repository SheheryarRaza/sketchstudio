import io
from fastapi import APIRouter, Response, Query
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/exports", tags=["Exports"])

@router.get("/pdf-grid")
async def generate_pdf_grid(
    width_mm: float = Query(210.0, ge=50.0, le=1200.0),
    height_mm: float = Query(297.0, ge=50.0, le=1200.0),
    cell_size_mm: float = Query(15.0, ge=5.0, le=50.0),
    show_labels: bool = Query(True),
    paper_label: str = Query("A4", pattern=r"^[A-Za-z0-9 _\-×]{1,32}$"),
):
    """Generate a vector printable PDF blank grid template sized from the artist's
    declared Paper Mapping (width/height in mm) — the same source of truth the
    on-screen Transfer Grid uses, per ADR-0008."""
    page_dimensions = (width_mm * mm, height_mm * mm)
    buffer = io.BytesIO()

    p = canvas.Canvas(buffer, pagesize=page_dimensions)
    width_pt, height_pt = page_dimensions

    margin_mm = 10.0
    margin_pt = margin_mm * mm
    cell_pt = cell_size_mm * mm

    grid_w = width_pt - 2 * margin_pt
    grid_h = height_pt - 2 * margin_pt

    cols = int(grid_w / cell_pt)
    rows = int(grid_h / cell_pt)

    # Set light gray stroke for grid lines
    p.setStrokeColorRGB(0.75, 0.75, 0.75)
    p.setLineWidth(0.5)

    # Draw vertical lines
    for c in range(cols + 1):
        x = margin_pt + c * cell_pt
        p.line(x, margin_pt, x, margin_pt + rows * cell_pt)
        if c < cols and show_labels:
            letter_label = chr(65 + (c % 26))
            p.setFont("Helvetica-Bold", 8)
            p.setFillColorRGB(0.4, 0.4, 0.4)
            p.drawString(x + 4, margin_pt + rows * cell_pt + 4, letter_label)

    # Draw horizontal lines
    for r in range(rows + 1):
        y = margin_pt + r * cell_pt
        p.line(margin_pt, y, margin_pt + cols * cell_pt, y)
        if r < rows and show_labels:
            p.setFont("Helvetica-Bold", 8)
            p.setFillColorRGB(0.4, 0.4, 0.4)
            p.drawString(margin_pt - 14, y + 4, str(rows - r))

    # Watermark Footer
    p.setFont("Helvetica", 7)
    p.setFillColorRGB(0.5, 0.5, 0.5)
    p.drawString(margin_pt, 4 * mm, f"Sketch Studio Pro • Physical Grid ({cell_size_mm}mm cells) on {paper_label}")

    p.showPage()
    p.save()

    buffer.seek(0)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=SketchGrid_{paper_label}_{int(cell_size_mm)}mm.pdf"}
    )
