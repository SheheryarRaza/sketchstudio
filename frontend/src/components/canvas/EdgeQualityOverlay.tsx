'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { EdgeQualityState, EdgePoint, EdgeQualitySegment } from '../../types/edgeQuality';
import {
  filterSegments,
  addSegment,
  updatePointPosition,
  EDGE_QUALITY_CONFIG,
} from '../../utils/edgeQuality';
import { mapPointerToNativeX } from '../../utils/flipHorizontal';

interface EdgeQualityOverlayProps {
  width: number;
  height: number;
  state: EdgeQualityState;
  onChange: (newState: EdgeQualityState) => void;
  isDimmed?: boolean;
  isFlippedHorizontal?: boolean;
}

export const EdgeQualityOverlay: React.FC<EdgeQualityOverlayProps> = ({
  width,
  height,
  state,
  onChange,
  isDimmed = false,
  isFlippedHorizontal = false,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const [drawingPoints, setDrawingPoints] = useState<EdgePoint[]>([]);
  const [draggingPoint, setDraggingPoint] = useState<{ segId: string; ptId: string } | null>(null);
  const isDraggingDrawingRef = useRef(false);

  const commitDrawingPoints = useCallback((points: EdgePoint[]) => {
    if (points.length >= 2) {
      const next = addSegment(state, {
        quality: state.activeQuality,
        points,
        label: `${EDGE_QUALITY_CONFIG[state.activeQuality].label} edge`,
      });
      onChange(next);
    }
    setDrawingPoints([]);
  }, [state, onChange]);

  if (!state.enabled || width <= 0 || height <= 0) return null;

  const visibleSegments = filterSegments(state.segments, state.filter);

  const getNativeCoords = (clientX: number, clientY: number) => {
    if (!svgRef.current) return { x: 0, y: 0 };
    const rect = svgRef.current.getBoundingClientRect();
    const x = Math.round(mapPointerToNativeX(clientX, rect, width, Boolean(isFlippedHorizontal)));
    const y = Math.round(Math.max(0, Math.min(height, ((clientY - rect.top) / rect.height) * height)));
    return { x, y };
  };

  const handlePointerDown = (e: React.PointerEvent<SVGSVGElement>) => {
    if (state.mode === 'draw') {
      const coords = getNativeCoords(e.clientX, e.clientY);
      const newPt: EdgePoint = {
        id: `edge-pt-${Date.now()}-${drawingPoints.length}`,
        x: coords.x,
        y: coords.y,
      };

      isDraggingDrawingRef.current = true;
      setDrawingPoints((prev) => [...prev, newPt]);
      try {
        (e.target as Element).setPointerCapture?.(e.pointerId);
      } catch {}
    }
  };

  const handlePointerMove = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingPoint) {
      const coords = getNativeCoords(e.clientX, e.clientY);
      const next = updatePointPosition(
        state,
        draggingPoint.segId,
        draggingPoint.ptId,
        coords.x,
        coords.y
      );
      onChange(next);
      return;
    }

    if (state.mode === 'draw' && isDraggingDrawingRef.current) {
      const coords = getNativeCoords(e.clientX, e.clientY);
      const lastPt = drawingPoints[drawingPoints.length - 1];
      if (lastPt) {
        const dist = Math.hypot(coords.x - lastPt.x, coords.y - lastPt.y);
        // Sample points at regular intervals while dragging
        if (dist > 12) {
          const newPt: EdgePoint = {
            id: `edge-pt-${Date.now()}-${drawingPoints.length}`,
            x: coords.x,
            y: coords.y,
          };
          setDrawingPoints((prev) => [...prev, newPt]);
        }
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent<SVGSVGElement>) => {
    if (draggingPoint) {
      setDraggingPoint(null);
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {}
      return;
    }

    if (state.mode === 'draw' && isDraggingDrawingRef.current) {
      isDraggingDrawingRef.current = false;
      try {
        (e.target as Element).releasePointerCapture?.(e.pointerId);
      } catch {}

      if (drawingPoints.length >= 2) {
        commitDrawingPoints(drawingPoints);
      }
    }
  };

  const handleDoubleClick = (e: React.MouseEvent<SVGSVGElement>) => {
    e.stopPropagation();
    if (state.mode === 'draw' && drawingPoints.length >= 2) {
      commitDrawingPoints(drawingPoints);
    }
  };

  const handlePointPointerDown = (
    segId: string,
    ptId: string,
    e: React.PointerEvent<SVGCircleElement>
  ) => {
    e.stopPropagation();
    setDraggingPoint({ segId, ptId });
    onChange({
      ...state,
      selectedSegmentId: segId,
      selectedPointId: ptId,
    });
    try {
      (e.target as Element).setPointerCapture?.(e.pointerId);
    } catch {}
  };

  const handleSegmentClick = (segId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    onChange({
      ...state,
      selectedSegmentId: segId,
    });
  };

  const formatPathD = (points: EdgePoint[]) => {
    if (points.length === 0) return '';
    return points.reduce((acc, pt, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${pt.x} ${pt.y}`, '');
  };

  return (
    <svg
      ref={svgRef}
      className={`absolute inset-0 select-none ${
        state.mode === 'draw' ? 'cursor-crosshair pointer-events-auto' : 'pointer-events-auto'
      }`}
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ opacity: isDimmed ? 0.15 : state.opacity }}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onDoubleClick={handleDoubleClick}
    >
      {/* Existing marked segments */}
      {visibleSegments.map((seg) => {
        const isSelected = state.selectedSegmentId === seg.id;
        const config = EDGE_QUALITY_CONFIG[seg.quality];
        const pathD = formatPathD(seg.points);
        const midPoint = seg.points[Math.floor(seg.points.length / 2)];

        return (
          <g key={seg.id} className="group/seg">
            {/* Selection highlight halo */}
            {isSelected && (
              <path
                d={pathD}
                fill="none"
                stroke="#ffffff"
                strokeWidth={state.lineWidth + 4}
                strokeOpacity={0.45}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Soft edge outer glow/halo to visually convey turning form */}
            {seg.quality === 'soft' && (
              <path
                d={pathD}
                fill="none"
                stroke={config.color}
                strokeWidth={state.lineWidth * 2.6}
                strokeOpacity={0.24}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Lost edge subtle secondary ghost trail */}
            {seg.quality === 'lost' && (
              <path
                d={pathD}
                fill="none"
                stroke={config.color}
                strokeWidth={state.lineWidth * 1.5}
                strokeDasharray="1,12"
                strokeOpacity={0.35}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Main edge stroke with distinct quality dash array */}
            <path
              d={pathD}
              fill="none"
              stroke={config.color}
              strokeWidth={state.lineWidth}
              strokeDasharray={config.strokeDasharray}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="cursor-pointer transition-all hover:stroke-width-[5px]"
              onClick={(e) => handleSegmentClick(seg.id, e)}
            />

            {/* Wider transparent hit-testing path for easy clicking */}
            <path
              d={pathD}
              fill="none"
              stroke="transparent"
              strokeWidth={Math.max(14, state.lineWidth * 3)}
              className="cursor-pointer"
              onClick={(e) => handleSegmentClick(seg.id, e)}
            />

            {/* Control points along the edge when selected or hovered */}
            {(isSelected || state.mode === 'select') &&
              seg.points.map((pt, idx) => {
                const isPtSelected = state.selectedPointId === pt.id;
                const ptQuality = pt.quality || seg.quality;
                const ptConfig = EDGE_QUALITY_CONFIG[ptQuality];
                const isSoft = ptQuality === 'soft';
                const isLost = ptQuality === 'lost';

                return (
                  <circle
                    key={pt.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={isPtSelected ? 5.5 : 4}
                    fill={isLost ? '#1e1b4b' : isSoft ? '#78350f' : ptConfig.color}
                    stroke={isPtSelected ? '#ffffff' : ptConfig.color}
                    strokeWidth={isPtSelected ? 2 : isLost ? 2 : 1.5}
                    className="cursor-grab active:cursor-grabbing hover:scale-125 transition-transform"
                    onPointerDown={(e) => handlePointPointerDown(seg.id, pt.id, e)}
                  >
                    <title>{`Point ${idx + 1} (${ptConfig.label} edge)`}</title>
                  </circle>
                );
              })}

            {/* Label badge indicating quality, upright regardless of flip */}
            {midPoint && (
              <g
                transform={`translate(${midPoint.x}, ${midPoint.y - 12})`}
                className="pointer-events-none"
              >
                <text
                  x={0}
                  y={0}
                  textAnchor="middle"
                  fill={config.color}
                  fontSize={10}
                  fontWeight="bold"
                  style={isFlippedHorizontal ? { transform: 'scaleX(-1)' } : undefined}
                  className="select-none filter drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)]"
                >
                  [{config.label[0]}]
                </text>
              </g>
            )}
          </g>
        );
      })}

      {/* Currently in-progress drawing path preview */}
      {drawingPoints.length > 0 && (
        <g>
          {state.activeQuality === 'soft' && (
            <path
              d={formatPathD(drawingPoints)}
              fill="none"
              stroke={EDGE_QUALITY_CONFIG.soft.color}
              strokeWidth={state.lineWidth * 2.5}
              strokeOpacity={0.25}
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          <path
            d={formatPathD(drawingPoints)}
            fill="none"
            stroke={EDGE_QUALITY_CONFIG[state.activeQuality].color}
            strokeWidth={state.lineWidth}
            strokeDasharray={EDGE_QUALITY_CONFIG[state.activeQuality].strokeDasharray}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {drawingPoints.map((pt, idx) => (
            <circle
              key={pt.id}
              cx={pt.x}
              cy={pt.y}
              r={idx === drawingPoints.length - 1 ? 5 : 3.5}
              fill={EDGE_QUALITY_CONFIG[state.activeQuality].color}
              stroke="#ffffff"
              strokeWidth={1}
            />
          ))}
        </g>
      )}
    </svg>
  );
};
