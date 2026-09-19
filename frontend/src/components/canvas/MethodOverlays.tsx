'use client';

import React, { useState, useRef } from 'react';
import type { DeclaredSource, DrawingMethodState } from '../../types/studio';

import { mapPointerToNativeX } from '../../utils/flipHorizontal';
import { calculateTerminatorLine, normalizeAngle } from '../../utils/lightDirection';

export function getAnchorVisualProps(source: DeclaredSource | undefined) {
  switch (source) {
    case 'detected':
      return {
        fill: '#10b981',
        stroke: '#064e3b',
        strokeWidth: 2,
        strokeDasharray: undefined,
        className: 'anchor-detected',
        label: 'detected',
      };
    case 'estimated':
      return {
        fill: '#f59e0b',
        stroke: '#78350f',
        strokeWidth: 2,
        strokeDasharray: undefined,
        className: 'anchor-estimated',
        label: 'estimated',
      };
    case 'hand-placed':
      return {
        fill: '#38bdf8',
        stroke: '#0369a1',
        strokeWidth: 2,
        strokeDasharray: undefined,
        className: 'anchor-hand-placed',
        label: 'hand-placed',
      };
    case 'fallback':
    default:
      return {
        fill: '#f43f5e',
        stroke: '#881337',
        strokeWidth: 1.5,
        strokeDasharray: '2,2',
        className: 'anchor-fallback',
        label: 'fallback',
      };
  }
}

/**
 * Updates an anchor's position and transitions its Declared Source to 'hand-placed',
 * ensuring the overlay stays truthful after manual correction (issue #85).
 * Non-dragged anchors retain their original Declared Source.
 */
export function moveMethodAnchor(
  methodState: DrawingMethodState,
  draggingPoint: string,
  coords: { x: number; y: number }
): DrawingMethodState {
  const { activeMethod } = methodState;
  const { x, y } = coords;

  if (activeMethod === 'loomis') {
    const loomis = { ...methodState.loomis };
    const tilt = loomis.tiltAngle || 0;
    let localY = y;
    if (tilt !== 0) {
      const rad = (-tilt * Math.PI) / 180;
      const dx = x - loomis.center.x;
      const dy = y - loomis.center.y;
      localY = loomis.center.y + dx * Math.sin(rad) + dy * Math.cos(rad);
    }

    const sources = { ...(loomis.sources || {}) };

    if (draggingPoint === 'loomis-center') {
      loomis.center = { ...loomis.center, x, y, source: 'hand-placed' };
      sources.center = 'hand-placed';
    } else if (draggingPoint === 'loomis-radius') {
      loomis.radius = Math.max(20, Math.hypot(x - loomis.center.x, y - loomis.center.y));
      sources.radius = 'hand-placed';
    } else if (draggingPoint === 'loomis-brow') {
      loomis.browLineY = localY;
      sources.browLineY = 'hand-placed';
    } else if (draggingPoint === 'loomis-nose') {
      loomis.noseLineY = localY;
      sources.noseLineY = 'hand-placed';
    } else if (draggingPoint === 'loomis-chin') {
      loomis.chinY = localY;
      sources.chinY = 'hand-placed';
    }
    loomis.sources = sources;
    return { ...methodState, loomis };
  }

  if (activeMethod === 'reilly') {
    const reilly = { ...methodState.reilly };
    if (draggingPoint in reilly) {
      (reilly as any)[draggingPoint] = {
        ...(reilly as any)[draggingPoint],
        x,
        y,
        source: 'hand-placed',
      };
      return { ...methodState, reilly };
    }
  }

  if (activeMethod === 'bargue') {
    const bargue = { ...methodState.bargue };
    const pointIndex = bargue.points.findIndex((p) => p.id === draggingPoint);
    if (pointIndex !== -1) {
      const points = [...bargue.points];
      points[pointIndex] = {
        ...points[pointIndex],
        x,
        y,
        source: 'hand-placed',
      };
      bargue.points = points;
      return { ...methodState, bargue };
    }
  }

  return methodState;
}

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

    const updated = moveMethodAnchor(methodState, draggingPoint, { x, y });
    onChange(updated);
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
      onPointerCancel={handlePointerUp}
    >
      {activeMethod === 'loomis' && (
        <g
          stroke={color}
          fill="none"
          strokeWidth="2"
          transform={methodState.loomis.tiltAngle ? `rotate(${methodState.loomis.tiltAngle}, ${methodState.loomis.center.x}, ${methodState.loomis.center.y})` : undefined}
        >
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
            <g className="pointer-events-auto">
              {[
                {
                  id: 'loomis-center',
                  cx: methodState.loomis.center.x,
                  cy: methodState.loomis.center.y,
                  r: 6,
                  cursor: 'cursor-move',
                  title: 'Loomis Center',
                  source: methodState.loomis.center.source || methodState.loomis.sources?.center || 'fallback',
                },
                {
                  id: 'loomis-radius',
                  cx: methodState.loomis.center.x + methodState.loomis.radius,
                  cy: methodState.loomis.center.y,
                  r: 6,
                  cursor: 'cursor-ew-resize',
                  title: 'Loomis Ball Size',
                  source: methodState.loomis.sources?.radius || 'estimated',
                },
                {
                  id: 'loomis-brow',
                  cx: methodState.loomis.center.x,
                  cy: methodState.loomis.browLineY,
                  r: 5,
                  cursor: 'cursor-ns-resize',
                  title: 'Loomis Brow Line',
                  source: methodState.loomis.sources?.browLineY || 'fallback',
                },
                {
                  id: 'loomis-nose',
                  cx: methodState.loomis.center.x,
                  cy: methodState.loomis.noseLineY,
                  r: 5,
                  cursor: 'cursor-ns-resize',
                  title: 'Loomis Nose Line',
                  source: methodState.loomis.sources?.noseLineY || 'fallback',
                },
                {
                  id: 'loomis-chin',
                  cx: methodState.loomis.center.x,
                  cy: methodState.loomis.chinY,
                  r: 5,
                  cursor: 'cursor-ns-resize',
                  title: 'Loomis Chin',
                  source: methodState.loomis.sources?.chinY || 'fallback',
                },
              ].map((anchor) => {
                const style = getAnchorVisualProps(anchor.source);
                return (
                  <circle
                    key={anchor.id}
                    cx={anchor.cx}
                    cy={anchor.cy}
                    r={anchor.r}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.strokeDasharray}
                    data-source={style.label}
                    className={`${anchor.cursor} hover:scale-125 transition-transform ${style.className}`}
                    onPointerDown={(e) => handlePointerDown(anchor.id, e)}
                  >
                    <title>{`${anchor.title}: ${style.label}`}</title>
                  </circle>
                );
              })}
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
            <g className="pointer-events-auto">
              {Object.entries(methodState.reilly).map(([key, pt]) => {
                const style = getAnchorVisualProps(pt.source);
                return (
                  <circle
                    key={key}
                    cx={pt.x}
                    cy={pt.y}
                    r={5}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.strokeDasharray}
                    data-source={style.label}
                    className={`cursor-pointer hover:scale-125 transition-transform ${style.className}`}
                    onPointerDown={(e) => handlePointerDown(key, e)}
                  >
                    <title>{`${key}: ${style.label}`}</title>
                  </circle>
                );
              })}
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
            <g className="pointer-events-auto">
              {methodState.bargue.points.map((pt) => {
                const style = getAnchorVisualProps(pt.source);
                return (
                  <circle
                    key={pt.id}
                    cx={pt.x}
                    cy={pt.y}
                    r={6}
                    fill={style.fill}
                    stroke={style.stroke}
                    strokeWidth={style.strokeWidth}
                    strokeDasharray={style.strokeDasharray}
                    data-source={style.label}
                    className={`cursor-move hover:scale-125 transition-transform ${style.className}`}
                    onPointerDown={(e) => handlePointerDown(pt.id, e)}
                  >
                    <title>{`Bargue Anchor (${pt.id}): ${style.label}`}</title>
                  </circle>
                );
              })}
            </g>
          )}
        </g>
      )}

      {activeMethod === 'asaro' && (
        <AsaroOverlay
          width={width}
          height={height}
          asaro={methodState.asaro}
          color={color}
          isFlippedHorizontal={isFlippedHorizontal}
        />
      )}
    </svg>
  );
};

interface AsaroOverlayProps {
  width: number;
  height: number;
  asaro: DrawingMethodState['asaro'];
  color: string;
  isFlippedHorizontal: boolean;
}

const AsaroOverlay: React.FC<AsaroOverlayProps> = ({
  width,
  height,
  asaro,
  color,
  isFlippedHorizontal,
}) => {
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
};
