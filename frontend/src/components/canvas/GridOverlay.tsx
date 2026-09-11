import React from 'react';
import type { GridConfig, PaperMappingConfig } from '../../types/studio';
import { imagePxPerMm, mmToImagePx } from '../../utils/paperMapping';

interface GridOverlayProps {
  width: number;
  height: number;
  grid: GridConfig;
  paperMapping: PaperMappingConfig;
}

export const GridOverlay: React.FC<GridOverlayProps> = ({
  width,
  height,
  grid,
  paperMapping,
}) => {
  if (!grid.enabled || width <= 0 || height <= 0 || !paperMapping.isDeclared) return null;

  // Cell size lives in image-pixel space, derived from the declared Paper Mapping —
  // this is what keeps it visually correct at every zoom level (ADR-0008), since the
  // whole canvas+overlay box is CSS-scaled uniformly by StudioCanvas afterward.
  const pxPerMm = imagePxPerMm(paperMapping, width, height);
  const cellPixelSize = Math.max(10, mmToImagePx(grid.cellSizeMm, pxPerMm));

  const cols = Math.ceil(width / cellPixelSize);
  const rows = Math.ceil(height / cellPixelSize);

  const getColLetter = (index: number): string => {
    let letter = '';
    let temp = index;
    while (temp >= 0) {
      letter = String.fromCharCode((temp % 26) + 65) + letter;
      temp = Math.floor(temp / 26) - 1;
    }
    return letter;
  };

  return (
    <svg
      className="absolute inset-0 pointer-events-none select-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ opacity: grid.opacity }}
    >
      <defs>
        <pattern
          id="grid-squares"
          width={cellPixelSize}
          height={cellPixelSize}
          patternUnits="userSpaceOnUse"
        >
          {grid.showSubdivisions && grid.subdivisions > 1 && (
            <>
              {Array.from({ length: grid.subdivisions - 1 }).map((_, i) => {
                const subPos = (cellPixelSize / grid.subdivisions) * (i + 1);
                return (
                  <g key={`sub-${i}`}>
                    <line
                      x1={subPos}
                      y1="0"
                      x2={subPos}
                      y2={cellPixelSize}
                      stroke={grid.lineColor}
                      strokeWidth={Math.max(0.5, grid.lineWidth / 2)}
                      strokeDasharray="2,2"
                      opacity="0.4"
                    />
                    <line
                      x1="0"
                      y1={subPos}
                      x2={cellPixelSize}
                      y2={subPos}
                      stroke={grid.lineColor}
                      strokeWidth={Math.max(0.5, grid.lineWidth / 2)}
                      strokeDasharray="2,2"
                      opacity="0.4"
                    />
                  </g>
                );
              })}
            </>
          )}

          {grid.showDiagonalsInCells && (
            <>
              <line
                x1="0"
                y1="0"
                x2={cellPixelSize}
                y2={cellPixelSize}
                stroke={grid.lineColor}
                strokeWidth={Math.max(0.5, grid.lineWidth / 2)}
                opacity="0.4"
              />
              <line
                x1={cellPixelSize}
                y1="0"
                x2="0"
                y2={cellPixelSize}
                stroke={grid.lineColor}
                strokeWidth={Math.max(0.5, grid.lineWidth / 2)}
                opacity="0.4"
              />
            </>
          )}

          <path
            d={`M ${cellPixelSize} 0 L 0 0 0 ${cellPixelSize}`}
            fill="none"
            stroke={grid.lineColor}
            strokeWidth={grid.lineWidth}
          />
        </pattern>

        <pattern
          id="grid-dots"
          width={cellPixelSize}
          height={cellPixelSize}
          patternUnits="userSpaceOnUse"
        >
          <circle
            cx={cellPixelSize / 2}
            cy={cellPixelSize / 2}
            r={grid.dotRadius || 2}
            fill={grid.lineColor}
          />
          <circle cx="0" cy="0" r={grid.dotRadius || 2} fill={grid.lineColor} />
          <circle cx={cellPixelSize} cy="0" r={grid.dotRadius || 2} fill={grid.lineColor} />
          <circle cx="0" cy={cellPixelSize} r={grid.dotRadius || 2} fill={grid.lineColor} />
          <circle cx={cellPixelSize} cy={cellPixelSize} r={grid.dotRadius || 2} fill={grid.lineColor} />
        </pattern>
      </defs>

      {grid.type === 'squares' && (
        <rect width="100%" height="100%" fill="url(#grid-squares)" />
      )}

      {grid.type === 'dots' && (
        <rect width="100%" height="100%" fill="url(#grid-dots)" />
      )}

      {grid.type === 'diagonals' && (
        <g stroke={grid.lineColor} strokeWidth={grid.lineWidth}>
          <line x1="0" y1="0" x2={width} y2={height} />
          <line x1={width} y1="0" x2="0" y2={height} />
          {Array.from({ length: cols + rows }).map((_, i) => {
            const offset = (i - rows) * cellPixelSize;
            return (
              <line
                key={`diag-1-${i}`}
                x1={Math.max(0, offset)}
                y1={Math.max(0, -offset)}
                x2={Math.min(width, width + offset)}
                y2={Math.min(height, height - offset)}
                opacity="0.6"
              />
            );
          })}
        </g>
      )}

      {grid.type === 'triangles' && (
        <g stroke={grid.lineColor} strokeWidth={grid.lineWidth}>
          <rect width="100%" height="100%" fill="url(#grid-squares)" />
          {Array.from({ length: cols + rows }).map((_, i) => (
            <g key={`tri-${i}`}>
              <line
                x1={i * cellPixelSize}
                y1="0"
                x2={i * cellPixelSize - height * 0.577}
                y2={height}
                opacity="0.5"
              />
              <line
                x1={i * cellPixelSize}
                y1="0"
                x2={i * cellPixelSize + height * 0.577}
                y2={height}
                opacity="0.5"
              />
            </g>
          ))}
        </g>
      )}

      {grid.type === 'harmonic' && (
        <g stroke={grid.lineColor} strokeWidth={grid.lineWidth}>
          <line x1="0" y1="0" x2={width} y2={height} />
          <line x1={width} y1="0" x2="0" y2={height} />
          <line x1={width / 2} y1="0" x2={width / 2} y2={height} strokeDasharray="4,4" />
          <line x1="0" y1={height / 2} x2={width} y2={height / 2} strokeDasharray="4,4" />
          <line x1="0" y1={height} x2={width / 2} y2="0" opacity="0.7" />
          <line x1={width} y1={height} x2={width / 2} y2="0" opacity="0.7" />
          <line x1="0" y1="0" x2={width / 2} y2={height} opacity="0.7" />
          <line x1={width} y1="0" x2={width / 2} y2={height} opacity="0.7" />
          <line x1={width / 4} y1="0" x2={width / 4} y2={height} opacity="0.4" />
          <line x1={(3 * width) / 4} y1="0" x2={(3 * width) / 4} y2={height} opacity="0.4" />
          <line x1="0" y1={height / 4} x2={width} y2={height / 4} opacity="0.4" />
          <line x1="0" y1={(3 * height) / 4} x2={width} y2={(3 * height) / 4} opacity="0.4" />
        </g>
      )}

      {grid.type === 'goldenRatio' && (
        <g stroke={grid.lineColor} strokeWidth={grid.lineWidth}>
          <line x1={width * 0.382} y1="0" x2={width * 0.382} y2={height} />
          <line x1={width * 0.618} y1="0" x2={width * 0.618} y2={height} />
          <line x1="0" y1={height * 0.382} x2={width} y2={height * 0.382} />
          <line x1="0" y1={height * 0.618} x2={width} y2={height * 0.618} />
          {[
            { x: width * 0.382, y: height * 0.382 },
            { x: width * 0.618, y: height * 0.382 },
            { x: width * 0.382, y: height * 0.618 },
            { x: width * 0.618, y: height * 0.618 },
          ].map((pt, idx) => (
            <circle
              key={`golden-eye-${idx}`}
              cx={pt.x}
              cy={pt.y}
              r={6}
              fill="none"
              stroke={grid.lineColor}
              strokeWidth={Math.max(1, grid.lineWidth * 1.5)}
            />
          ))}
        </g>
      )}

      {grid.showLabels && grid.type === 'squares' && (
        <g className="font-mono font-bold text-[11px] fill-current" style={{ color: grid.lineColor }}>
          {Array.from({ length: cols }).map((_, c) => (
            <text
              key={`col-${c}`}
              x={c * cellPixelSize + 4}
              y={14}
              opacity="0.85"
            >
              {getColLetter(c)}
            </text>
          ))}
          {Array.from({ length: rows }).map((_, r) => (
            <text
              key={`row-${r}`}
              x={4}
              y={r * cellPixelSize + 16}
              opacity="0.85"
            >
              {r + 1}
            </text>
          ))}
        </g>
      )}

      <g stroke={grid.lineColor} strokeWidth="1" opacity="0.6">
        {Array.from({ length: Math.floor(width / (cellPixelSize / 10)) }).map((_, idx) => {
          const x = idx * (cellPixelSize / 10);
          const isMajor = idx % 10 === 0;
          const isMid = idx % 5 === 0;
          const tickLen = isMajor ? 8 : isMid ? 5 : 3;
          return <line key={`top-tick-${idx}`} x1={x} y1="0" x2={x} y2={tickLen} />;
        })}
        {Array.from({ length: Math.floor(height / (cellPixelSize / 10)) }).map((_, idx) => {
          const y = idx * (cellPixelSize / 10);
          const isMajor = idx % 10 === 0;
          const isMid = idx % 5 === 0;
          const tickLen = isMajor ? 8 : isMid ? 5 : 3;
          return <line key={`left-tick-${idx}`} x1="0" y1={y} x2={tickLen} y2={y} />;
        })}
      </g>
    </svg>
  );
};
