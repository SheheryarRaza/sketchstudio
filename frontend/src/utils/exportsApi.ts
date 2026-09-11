import type { PaperMappingConfig } from '../types/studio';

/**
 * Fetches a vector PDF blank grid template from the backend, sized from the
 * declared Paper Mapping — the same source of truth as the on-screen Transfer
 * Grid, per ADR-0008.
 */
export async function fetchPdfGrid(
  paperMapping: PaperMappingConfig,
  cellSizeMm: number,
  showLabels: boolean,
): Promise<Blob> {
  const params = new URLSearchParams({
    width_mm: String(paperMapping.paperWidthMm),
    height_mm: String(paperMapping.paperHeightMm),
    cell_size_mm: String(cellSizeMm),
    show_labels: String(showLabels),
    paper_label: paperMapping.paperPreset,
  });

  let res: Response;
  try {
    res = await fetch(`/api/exports/pdf-grid?${params.toString()}`);
  } catch {
    throw new Error('Could not reach the export backend');
  }

  if (!res.ok) {
    throw new Error(`PDF grid export failed (${res.status})`);
  }

  return res.blob();
}
