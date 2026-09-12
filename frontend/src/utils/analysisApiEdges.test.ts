import test from 'node:test';
import assert from 'node:assert/strict';
import {
  scaleEdgeSegmentsToImageSpace,
  generateFallbackEdgeSegments,
} from './analysisApi';
import type { EdgeQualitySegment } from '../types/edgeQuality';

test('scaleEdgeSegmentsToImageSpace rescales coordinates from display-capped space to native image space', () => {
  const cappedSegments: EdgeQualitySegment[] = [
    {
      id: 'seg-1',
      quality: 'hard',
      points: [
        { id: 'p1', x: 100, y: 150 },
        { id: 'p2', x: 200, y: 250 },
      ],
      label: 'Contour 1',
    },
  ];

  const size = {
    width: 600,
    height: 800,
    scale: 0.5, // native is 1200x1600
  };

  const scaled = scaleEdgeSegmentsToImageSpace(cappedSegments, size);
  assert.equal(scaled.length, 1);
  assert.equal(scaled[0].points[0].x, 200);
  assert.equal(scaled[0].points[0].y, 300);
  assert.equal(scaled[0].points[1].x, 400);
  assert.equal(scaled[0].points[1].y, 500);
});

test('generateFallbackEdgeSegments produces clean anatomical edge candidate segments', () => {
  const segments = generateFallbackEdgeSegments(800, 1000);
  assert.ok(segments.length >= 3);

  // Checks qualities exist
  const qualities = segments.map((s) => s.quality);
  assert.ok(qualities.includes('hard'));
  assert.ok(qualities.includes('soft'));

  for (const seg of segments) {
    assert.ok(seg.id);
    assert.ok(seg.points.length >= 2);
    for (const pt of seg.points) {
      assert.ok(pt.x >= 0 && pt.x <= 800);
      assert.ok(pt.y >= 0 && pt.y <= 1000);
    }
  }
});

test('generateFallbackEdgeSegments anchors along real detected face when landmarks are available', () => {
  const fakeLandmarks = {
    source: 'detected' as const,
    loomis: {
      center: { x: 400, y: 450 },
      radius: 200,
      browLineY: 450,
      noseLineY: 580,
      chinY: 720,
      jawWidth: 190,
      tiltAngle: 0,
    },
    reilly: {
      browCenter: { x: 400, y: 430 },
      noseTip: { x: 400, y: 580 },
      mouthCenter: { x: 400, y: 650 },
      chinBottom: { x: 400, y: 720 },
      leftEye: { x: 320, y: 460 },
      rightEye: { x: 480, y: 460 },
      leftJaw: { x: 260, y: 600 },
      rightJaw: { x: 540, y: 600 },
      leftTemple: { x: 240, y: 380 },
      rightTemple: { x: 560, y: 380 },
    },
  };

  const segments = generateFallbackEdgeSegments(800, 1000, fakeLandmarks);
  assert.ok(segments.length >= 3);

  // Find jawline segment
  const jawSeg = segments.find((s) => s.label?.toLowerCase().includes('jaw'));
  assert.ok(jawSeg);
  // Chin y should match chinBottom y
  const chinPt = jawSeg.points.find((p) => p.y === 720);
  assert.ok(chinPt);
});
