'use client';

import React, { useState, useRef } from 'react';
import type { DrawingMethodState } from '../../types/studio';

import { mapPointerToNativeX } from '../../utils/flipHorizontal';
import { calculateTerminatorLine, normalizeAngle } from '../../utils/lightDirection';

interface MethodOverlaysProps {
  width: number;
  height: number;
  methodState: DrawingMethodState;
  onChange: (newState: DrawingMethodState) => void;
  // Dims the Drawing Method overlay to near-invisible while a Tonal Layer/Value
  // Family is isolated, so it stops competing with the isolated flat mask (issue #39).
  isDimmed?: boolean;
  isFlippedHorizontal?: boolean;
}

export const MethodOverlays: React.FC<MethodOverlaysProps> = ({
  width,
  height,
  methodState,
  onChange,
  isDimmed = false,
  isFlippedHorizontal = false,
}) => {
  const { activeMethod, opacity, color, showAnchorPoints } = methodState;
  const [draggingPoint, setDraggingPoint] = useState<string | null>(null);
  const svgRef = useRef<SVGSVGElement>(null);

  if (activeMethod === 'none' || width <= 0 || height <= 0) return null;

  const handlePointerDown = (pointId: string, e: React.PointerEvent) => {
    e.stopPropagation();
    setDraggingPoint(pointId);
    (e.target as Element).setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!draggingPoint || !svgRef.current) return;
    const rect = svgRef.current.getBoundingClientRect();
    const x = mapPointerToNativeX(e.clientX, rect, width, isFlippedHorizontal);
    const y = Math.max(0, Math.min(height, ((e.clientY - rect.top) / rect.height) * height));

    if (activeMethod === 'loomis') {
      const loomis = { ...methodState.loomis };
      if (draggingPoint === 'loomis-center') {
        loomis.center = { x, y };
      } else if (draggingPoint === 'loomis-radius') {
        loomis.radius = Math.max(20, Math.hypot(x - loomis.center.x, y - loomis.center.y));
      } else if (draggingPoint === 'loomis-brow') {
        loomis.browLineY = y;
      } else if (draggingPoint === 'loomis-nose') {
        loomis.noseLineY = y;
      } else if (draggingPoint === 'loomis-chin') {
        loomis.chinY = y;
      }
      onChange({ ...methodState, loomis });
    } else if (activeMethod === 'reilly') {
      const reilly = { ...methodState.reilly };
      if (draggingPoint in reilly) {
        (reilly as any)[draggingPoint] = { x, y };
        onChange({ ...methodState, reilly });
      }
    } else if (activeMethod === 'bargue') {
      const bargue = { ...methodState.bargue };
      const pointIndex = bargue.points.findIndex(p => p.id === draggingPoint);
      if (pointIndex !== -1) {
        const points = [...bargue.points];
        points[pointIndex] = { ...points[pointIndex], x, y };
        bargue.points = points;
        onChange({ ...methodState, bargue });
      }
    }
  };

  const handlePointerUp = (e: React.PointerEvent) => {
    if (draggingPoint) {
      setDraggingPoint(null);
      try {
        (e.target as Element).releasePointerCapture(e.pointerId);
      } catch {}
    }
  };

  return (
    <svg
      ref={svgRef}
      className="absolute inset-0 select-none pointer-events-none"
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ opacity: isDimmed ? 0.12 : opacity }}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
    >
      {activeMethod === 'loomis' && (
        <g stroke={color} fill="none" strokeWidth="2">
          <circle
            cx={methodState.loomis.center.x}
            cy={methodState.loomis.center.y}
            r={methodState.loomis.radius}
            strokeDasharray="4,2"
          />
          <ellipse
            cx={methodState.loomis.center.x + methodState.loomis.radius * 0.45}
            cy={methodState.loomis.center.y}
            rx={methodState.loomis.radius * 0.35}
            ry={methodState.loomis.radius * 0.7}
            strokeDasharray="3,3"
          />
          <line
            x1={methodState.loomis.center.x - methodState.loomis.radius * 1.1}
            y1={methodState.loomis.browLineY}
            x2={methodState.loomis.center.x + methodState.loomis.radius * 1.1}
            y2={methodState.loomis.browLineY}
            strokeWidth="2.5"
          />
          <line
            x1={methodState.loomis.center.x}
            y1={methodState.loomis.center.y - methodState.loomis.radius}
            x2={methodState.loomis.center.x}
            y2={methodState.loomis.chinY}
            strokeWidth="2"
          />
          <line
            x1={methodState.loomis.center.x - methodState.loomis.radius * 0.6}
            y1={methodState.loomis.noseLineY}
            x2={methodState.loomis.center.x + methodState.loomis.radius * 0.6}
            y2={methodState.loomis.noseLineY}
            strokeDasharray="2,2"
          />
          <line
            x1={methodState.loomis.center.x - methodState.loomis.jawWidth / 2}
            y1={methodState.loomis.chinY}
            x2={methodState.loomis.center.x + methodState.loomis.jawWidth / 2}
            y2={methodState.loomis.chinY}
            strokeWidth="2.5"
          />
          <path
            d={`M ${methodState.loomis.center.x - methodState.loomis.radius * 0.8} ${methodState.loomis.browLineY} 
               L ${methodState.loomis.center.x - methodState.loomis.radius * 0.7} ${methodState.loomis.noseLineY} 
               L ${methodState.loomis.center.x - methodState.loomis.jawWidth / 2} ${methodState.loomis.chinY} 
               L ${methodState.loomis.center.x + methodState.loomis.jawWidth / 2} ${methodState.loomis.chinY} 
               L ${methodState.loomis.center.x + methodState.loomis.radius * 0.7} ${methodState.loomis.noseLineY} 
               L ${methodState.loomis.center.x + methodState.loomis.radius * 0.8} ${methodState.loomis.browLineY}`}
          />
          {showAnchorPoints && (
            <g fill={color} stroke="#000" strokeWidth="1.5" className="pointer-events-auto">
              <circle
                cx={methodState.loomis.center.x}
                cy={methodState.loomis.center.y}
                r={6}
                className="cursor-move hover:scale-125 transition-transform"
                onPointerDown={(e) => handlePointerDown('loomis-center', e)}
              />
              <circle
                cx={methodState.loomis.center.x + methodState.loomis.radius}
                cy={methodState.loomis.center.y}
                r={6}
                className="cursor-ew-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => handlePointerDown('loomis-radius', e)}
              />
              <circle
                cx={methodState.loomis.center.x}
                cy={methodState.loomis.browLineY}
                r={5}
                className="cursor-ns-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => handlePointerDown('loomis-brow', e)}
              />
              <circle
                cx={methodState.loomis.center.x}
                cy={methodState.loomis.chinY}
                r={5}
                className="cursor-ns-resize hover:scale-125 transition-transform"
                onPointerDown={(e) => handlePointerDown('loomis-chin', e)}
              />
            </g>
          )}
        </g>
      )}

      {activeMethod === 'reilly' && (
        <g stroke={color} fill="none" strokeWidth="2">
          <path
            d={`M ${methodState.reilly.leftTemple.x} ${methodState.reilly.leftTemple.y} 
               Q ${methodState.reilly.leftJaw.x} ${methodState.reilly.browCenter.y + 40} ${methodState.reilly.chinBottom.x} ${methodState.reilly.chinBottom.y}`}
          />
          <path
            d={`M ${methodState.reilly.rightTemple.x} ${methodState.reilly.rightTemple.y} 
               Q ${methodState.reilly.rightJaw.x} ${methodState.reilly.browCenter.y + 40} ${methodState.reilly.chinBottom.x} ${methodState.reilly.chinBottom.y}`}
          />
          <path
            d={`M ${methodState.reilly.leftEye.x} ${methodState.reilly.browCenter.y} 
               Q ${methodState.reilly.browCenter.x} ${methodState.reilly.browCenter.y + 10} ${methodState.reilly.rightEye.x} ${methodState.reilly.browCenter.y}`}
          />
          <line
            x1={methodState.reilly.browCenter.x}
            y1={methodState.reilly.browCenter.y}
            x2={methodState.reilly.noseTip.x}
            y2={methodState.reilly.noseTip.y}
          />
          <ellipse
            cx={methodState.reilly.mouthCenter.x}
            cy={methodState.reilly.mouthCenter.y}
            rx={Math.abs(methodState.reilly.rightEye.x - methodState.reilly.leftEye.x) * 0.4}
            ry={Math.abs(methodState.reilly.chinBottom.y - methodState.reilly.noseTip.y) * 0.45}
            strokeDasharray="3,2"
          />
          <path
            d={`M ${methodState.reilly.leftJaw.x} ${methodState.reilly.leftJaw.y + 20} 
               Q ${methodState.reilly.chinBottom.x - 30} ${methodState.reilly.chinBottom.y + 60} ${methodState.reilly.chinBottom.x - 10} ${methodState.reilly.chinBottom.y + 100}`}
          />
          <path
            d={`M ${methodState.reilly.rightJaw.x} ${methodState.reilly.rightJaw.y + 20} 
               Q ${methodState.reilly.chinBottom.x + 30} ${methodState.reilly.chinBottom.y + 60} ${methodState.reilly.chinBottom.x + 10} ${methodState.reilly.chinBottom.y + 100}`}
          />
          {showAnchorPoints && (
            <g fill={color} stroke="#000" strokeWidth="1.5" className="pointer-events-auto">
              {Object.entries(methodState.reilly).map(([key, pt]) => (
                <circle
                  key={key}
                  cx={pt.x}
                  cy={pt.y}
                  r={5}
                  className="cursor-pointer hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(key, e)}
                />
              ))}
            </g>
          )}
        </g>
      )}

      {activeMethod === 'bargue' && (
        <g stroke={color} fill="none" strokeWidth="2">
          {methodState.bargue.points.length > 2 && (
            <polygon
              points={methodState.bargue.points.map(p => `${p.x},${p.y}`).join(' ')}
              strokeWidth="2.5"
              fill={color}
              fillOpacity="0.05"
            />
          )}
          {methodState.bargue.plumbLines.map((plumb, idx) => (
            <line
              key={`plumb-${idx}`}
              x1={plumb.x}
              y1="0"
              x2={plumb.x}
              y2={height}
              strokeDasharray="4,4"
              strokeWidth="1.5"
              opacity="0.7"
            />
          ))}
          {methodState.bargue.levelBars.map((level, idx) => (
            <line
              key={`level-${idx}`}
              x1="0"
              y1={level.y}
              x2={width}
              y2={level.y}
              strokeDasharray="4,4"
              strokeWidth="1.5"
              opacity="0.7"
            />
          ))}
          {showAnchorPoints && (
            <g fill={color} stroke="#000" strokeWidth="1.5" className="pointer-events-auto">
              {methodState.bargue.points.map((pt) => (
                <circle
                  key={pt.id}
                  cx={pt.x}
                  cy={pt.y}
                  r={6}
                  className="cursor-move hover:scale-125 transition-transform"
                  onPointerDown={(e) => handlePointerDown(pt.id, e)}
                />
              ))}
            </g>
          )}
        </g>
      )}

      {activeMethod === 'asaro' && (() => {
        const asaro = methodState.asaro;
        const line = asaro.terminatorLine ?? calculateTerminatorLine(width, height, asaro.lightAngleDeg);
        const normAngle = normalizeAngle(asaro.lightAngleDeg);
        const rad = (normAngle * Math.PI) / 180;
        const lx = Math.cos(rad);
        const ly = -Math.sin(rad);

        const midX = (line.p1.x + line.p2.x) / 2;
        const midY = (line.p1.y + line.p2.y) / 2;

        const rayDistance = Math.min(width, height) * 0.35;
        const rayStartX = midX + lx * rayDistance;
        const rayStartY = midY + ly * rayDistance;
        const rayEndX = midX + lx * (rayDistance * 0.35);
        const rayEndY = midY + ly * (rayDistance * 0.35);

        return (
          <g>
            <g stroke={color} fill="none" strokeWidth="1.5" opacity={asaro.planesOpacity}>
              <path
                d={`M ${width * 0.3} ${height * 0.2} L ${width * 0.32} ${height * 0.4} L ${width * 0.35} ${height * 0.65} L ${width * 0.42} ${height * 0.85} 
                    L ${width * 0.58} ${height * 0.85} L ${width * 0.65} ${height * 0.65} L ${width * 0.68} ${height * 0.4} L ${width * 0.7} ${height * 0.2}`}
              />
              <polygon
                points={`${width * 0.35},${height * 0.38} ${width * 0.45},${height * 0.36} ${width * 0.47},${height * 0.45} ${width * 0.44},${height * 0.5} ${width * 0.36},${height * 0.48}`}
              />
              <polygon
                points={`${width * 0.55},${height * 0.36} ${width * 0.65},${height * 0.38} ${width * 0.64},${height * 0.48} ${width * 0.56},${height * 0.5} ${width * 0.53},${height * 0.45}`}
              />
              <polygon
                points={`${width * 0.47},${height * 0.38} ${width * 0.53},${height * 0.38} ${width * 0.54},${height * 0.6} ${width * 0.46},${height * 0.6}`}
              />
              <polygon
                points={`${width * 0.46},${height * 0.34} ${width * 0.54},${height * 0.34} ${width * 0.52},${height * 0.38} ${width * 0.48},${height * 0.38}`}
              />
              <path
                d={`M ${width * 0.42} ${height * 0.68} L ${width * 0.5} ${height * 0.67} L ${width * 0.58} ${height * 0.68} 
                    L ${width * 0.5} ${height * 0.72} Z`}
              />
              <polygon
                points={`${width * 0.44},${height * 0.8} ${width * 0.56},${height * 0.8} ${width * 0.54},${height * 0.86} ${width * 0.46},${height * 0.86}`}
              />
            </g>

            {asaro.showTerminator && (
              <g className="terminator-overlay" opacity={Math.max(0.65, asaro.planesOpacity)}>
                <line
                  x1={line.p1.x}
                  y1={line.p1.y}
                  x2={line.p2.x}
                  y2={line.p2.y}
                  stroke="#0284c7"
                  strokeWidth="5"
                  strokeOpacity="0.4"
                  strokeLinecap="round"
                />
                <line
                  className="terminator-line"
                  x1={line.p1.x}
                  y1={line.p1.y}
                  x2={line.p2.x}
                  y2={line.p2.y}
                  stroke="#38bdf8"
                  strokeWidth="2.5"
                  strokeDasharray="8,5"
                  strokeLinecap="round"
                />
                <circle cx={line.p1.x} cy={line.p1.y} r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />
                <circle cx={line.p2.x} cy={line.p2.y} r="4.5" fill="#38bdf8" stroke="#0f172a" strokeWidth="1.5" />

                <g transform={`translate(${midX}, ${midY})`}>
                  <text
                    x="8"
                    y="-8"
                    fill="#38bdf8"
                    fontSize="11"
                    fontWeight="700"
                    fontFamily="monospace"
                    textAnchor={isFlippedHorizontal ? 'end' : 'start'}
                    transform={isFlippedHorizontal ? 'scale(-1, 1)' : undefined}
                    style={{ textShadow: '0 1px 3px rgba(0,0,0,0.9), 0 0 6px rgba(0,0,0,0.8)' }}
                  >
                    Terminator (Core Shadow Boundary)
                  </text>
                </g>

                <g className="light-direction-ray">
                  <line
                    x1={rayStartX}
                    y1={rayStartY}
                    x2={rayEndX}
                    y2={rayEndY}
                    stroke="#facc15"
                    strokeWidth="2"
                    strokeDasharray="4,3"
                  />
                  <circle cx={rayStartX} cy={rayStartY} r="5" fill="#facc15" stroke="#713f12" strokeWidth="1.5" />
                  <g transform={`translate(${rayStartX}, ${rayStartY})`}>
                    <text
                      x={lx > 0 ? -8 : 8}
                      y="-8"
                      fill="#fef08a"
                      fontSize="10"
                      fontWeight="600"
                      fontFamily="sans-serif"
                      textAnchor={lx > 0 ? (isFlippedHorizontal ? 'start' : 'end') : (isFlippedHorizontal ? 'end' : 'start')}
                      transform={isFlippedHorizontal ? 'scale(-1, 1)' : undefined}
                      style={{ textShadow: '0 1px 2px rgba(0,0,0,0.9)' }}
                    >
                      Light {Math.round(normAngle)}°
                    </text>
                  </g>
                </g>
              </g>
            )}
          </g>
        );
      })()}
    </svg>
  );
};
