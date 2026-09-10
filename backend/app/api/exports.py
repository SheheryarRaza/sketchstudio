import io
from fastapi import APIRouter, Response, Query
from reportlab.lib.pagesizes import A4, A3, letter
from reportlab.lib.units import mm
from reportlab.pdfgen import canvas

router = APIRouter(prefix="/exports", tags=["Exports"])

PAGE_SIZES = {
    "A4": A4,
    "A3": A3,
    "Letter": letter,
}

@router.get("/pdf-grid")
async def generate_pdf_grid(
    paper_size: str = Query("A4", pattern="^(A4|A3|Letter)$"),
    cell_size_mm: float = Query(15.0, ge=5.0, le=50.0),
    show_labels: bool = Query(True),
):
    """Generate a vector printable PDF blank grid template matched to physical paper size."""
    page_dimensions = PAGE_SIZES.get(paper_size, A4)
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
    p.drawString(margin_pt, 4 * mm, f"Sketch Studio Pro • Physical Grid ({cell_size_mm}mm cells) on {paper_size}")

    p.showPage()
    p.save()

    buffer.seek(0)
    return Response(
        content=buffer.getvalue(),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=SketchGrid_{paper_size}_{int(cell_size_mm)}mm.pdf"}
    )
