'use client';

import React, { useState, useRef } from 'react';
import type { CaliperMeasurement, CalibrationProfile } from '../../types/studio';
import { pxToMm } from '../../utils/physicalScale';

interface CaliperOverlayProps {
  width: number;
  height: number;
  measurements: CaliperMeasurement[];
  baseUnitDistance?: number;
  calibration: CalibrationProfile;
  onChange: (measurements: CaliperMeasurement[], baseUnit?: number) => void;
  active: boolean;
}

export const CaliperOverlay: React.FC<CaliperOverlayProps> = ({
  width,
  height,
  measurements,
  baseUnitDistance,
  calibration,
  onChange,
  active,
}) => {
  const [activeHandle, setActiveHandle] = useState<{ id: string; type: 'start' | 'end' } | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const dpi = calibration.isCalibrated ? calibration.screenDpi : 96;

  if (!active || width <= 0 || height <= 0) return null;

  const handlePointerDown = (id: string, type: 'start' | 'end', e: React.PointerEvent) => {
    e.stopPropagation();
    setActiveHandle({ id, type });
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!activeHandle || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(width, ((e.clientX - rect.left) / rect.width) * width));
    const y = Math.max(0, Math.min(height, ((e.clientY - rect.top) / rect.height) * height));

    const updated = measurements.map((m) => {
      if (m.id === activeHandle.id) {
        const nextStart = activeHandle.type === 'start' ? { x, y } : m.start;
        const nextEnd = activeHandle.type === 'end' ? { x, y } : m.end;
        const dist = Math.hypot(nextEnd.x - nextStart.x, nextEnd.y - nextStart.y);
        const ratio = baseUnitDistance ? Math.round((dist / baseUnitDistance) * 100) / 100 : 1.0;
        return {
          ...m,
          start: nextStart,
          end: nextEnd,
          ratioToBaseUnit: ratio,
        };
      }
      return m;
    });

    onChange(updated, baseUnitDistance);
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (activeHandle) {
      setActiveHandle(null);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 select-none cursor-crosshair pointer-events-auto"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {measurements.map((m, idx) => {
        const distPx = Math.hypot(m.end.x - m.start.x, m.end.y - m.start.y);
        const distMm = Math.round(pxToMm(distPx, dpi) * 10) / 10;
        const midX = (m.start.x + m.end.x) / 2;
        const midY = (m.start.y + m.end.y) / 2;
        const isBase = idx === 0;

        return (
          <g key={m.id}>
            <line
              x1={m.start.x}
              y1={m.start.y}
              x2={m.end.x}
              y2={m.end.y}
              stroke={m.color || '#38bdf8'}
              strokeWidth="2.5"
              strokeDasharray={isBase ? undefined : '4,2'}
            />
            <circle cx={m.start.x} cy={m.start.y} r={6} fill={m.color} stroke="#000" strokeWidth="1.5"
              className="cursor-move hover:scale-125"
              onPointerDown={(e) => handlePointerDown(m.id, 'start', e)}
            />
            <circle cx={m.end.x} cy={m.end.y} r={6} fill={m.color} stroke="#000" strokeWidth="1.5"
              className="cursor-move hover:scale-125"
              onPointerDown={(e) => handlePointerDown(m.id, 'end', e)}
            />
            <g transform={`translate(${midX}, ${midY - 12})`}>
              <rect
                x="-40"
                y="-14"
                width="80"
                height="20"
                rx="4"
                fill="#0b0f17"
                fillOpacity="0.85"
                stroke={m.color}
                strokeWidth="1"
              />
              <text
                x="0"
                y="0"
                textAnchor="middle"
                dominantBaseline="middle"
                className="font-mono text-xs font-bold fill-white"
              >
                {isBase ? `1.0 Unit (${distMm}mm)` : `${m.ratioToBaseUnit || 1}x (${distMm}mm)`}
              </text>
            </g>
          </g>
        );
      })}
    </svg>
  );
};
