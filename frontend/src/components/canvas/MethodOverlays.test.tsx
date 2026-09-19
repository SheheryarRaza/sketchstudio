import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MethodOverlays, moveMethodAnchor } from './MethodOverlays';
import { INITIAL_PROJECT_STATE } from '../../utils/initialProjectState';
import type { DrawingMethodState } from '../../types/studio';

const noop = () => {};

test('MethodOverlays renders Asaro planar head and terminator line when showTerminator is true', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 135,
      showTerminator: true,
      terminatorSource: 'estimated',
      terminatorLine: {
        p1: { x: 250, y: 650 },
        p2: { x: 450, y: 350 },
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Contains Asaro planar facets
  assert.ok(html.includes('polygon'));
  // Contains Terminator line
  assert.ok(html.includes('terminator-line'));
  assert.ok(html.includes('x1="250"'));
  assert.ok(html.includes('y1="650"'));
  assert.ok(html.includes('x2="450"'));
  assert.ok(html.includes('y2="350"'));
  // Contains label
  assert.ok(html.includes('Terminator'));
  // Contains light direction ray / indicator
  assert.ok(html.includes('light-direction-ray'));
});

test('MethodOverlays suppresses terminator line when showTerminator is false', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 45,
      showTerminator: false,
      terminatorSource: 'default',
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Facets rendered
  assert.ok(html.includes('polygon'));
  // Terminator NOT rendered
  assert.ok(!html.includes('terminator-line'));
  assert.ok(!html.includes('light-direction-ray'));
});

test('MethodOverlays counter-mirrors terminator label when isFlippedHorizontal is true', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'asaro',
    asaro: {
      planesOpacity: 0.7,
      lightAngleDeg: 135,
      showTerminator: true,
      terminatorSource: 'estimated',
      terminatorLine: {
        p1: { x: 250, y: 650 },
        p2: { x: 450, y: 350 },
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
      isFlippedHorizontal={true}
    />
  );

  assert.ok(html.includes('terminator-line'));
  // Counter-mirroring scale(-1, 1) applied to text
  assert.ok(html.includes('scale(-1, 1)'));
});

test('MethodOverlays visibly distinguishes detected, estimated, and fallback anchors in Loomis', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
    showAnchorPoints: true,
    loomis: {
      center: { x: 300, y: 340, source: 'detected' },
      radius: 170,
      browLineY: 340,
      noseLineY: 440,
      chinY: 550,
      jawWidth: 150,
      tiltAngle: 0,
      sources: {
        center: 'detected',
        radius: 'estimated',
        browLineY: 'detected',
        noseLineY: 'detected',
        chinY: 'detected',
        jawWidth: 'detected',
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Center is detected (emerald #10b981)
  assert.ok(html.includes('data-source="detected"'));
  assert.ok(html.includes('fill="#10b981"'));
  assert.ok(html.includes('anchor-detected'));
  assert.ok(html.includes('Loomis Center: detected'));

  // Ball size (radius) is estimated (amber #f59e0b)
  assert.ok(html.includes('data-source="estimated"'));
  assert.ok(html.includes('fill="#f59e0b"'));
  assert.ok(html.includes('anchor-estimated'));
  assert.ok(html.includes('Loomis Ball Size: estimated'));
});

test('MethodOverlays visibly marks fallback anchors in Loomis and Reilly', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'reilly',
    showAnchorPoints: true,
    reilly: {
      browCenter: { x: 300, y: 330, source: 'fallback' },
      noseTip: { x: 300, y: 440, source: 'fallback' },
      mouthCenter: { x: 300, y: 500, source: 'fallback' },
      chinBottom: { x: 300, y: 550, source: 'fallback' },
      leftEye: { x: 235, y: 345, source: 'fallback' },
      rightEye: { x: 365, y: 345, source: 'fallback' },
      leftJaw: { x: 190, y: 460, source: 'fallback' },
      rightJaw: { x: 410, y: 460, source: 'fallback' },
      leftTemple: { x: 180, y: 280, source: 'fallback' },
      rightTemple: { x: 420, y: 280, source: 'fallback' },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  // Fallback anchors render in rose #f43f5e with dashed stroke and anchor-fallback class
  assert.ok(html.includes('data-source="fallback"'));
  assert.ok(html.includes('fill="#f43f5e"'));
  assert.ok(html.includes('anchor-fallback'));
  assert.ok(html.includes('stroke-dasharray="2,2"'));
  assert.ok(html.includes('leftEye: fallback'));
});

test('MethodOverlays renders tilted Loomis construction when tiltAngle is non-zero', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
    showAnchorPoints: true,
    loomis: {
      center: { x: 300, y: 340, source: 'detected' },
      radius: 170,
      browLineY: 340,
      noseLineY: 440,
      chinY: 550,
      jawWidth: 150,
      tiltAngle: 14.5,
      sources: {
        center: 'detected',
        radius: 'estimated',
        browLineY: 'detected',
        noseLineY: 'detected',
        chinY: 'detected',
        jawWidth: 'detected',
      },
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  assert.ok(html.includes('rotate(14.5, 300, 340)'), 'Expected rotate transform for tilted Loomis construction');
});

test('MethodOverlays renders upright Loomis construction without tilt transform when tiltAngle is zero', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
    showAnchorPoints: true,
    loomis: {
      center: { x: 300, y: 340, source: 'detected' },
      radius: 170,
      browLineY: 340,
      noseLineY: 440,
      chinY: 550,
      jawWidth: 150,
      tiltAngle: 0,
    },
  };

  const html = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={methodState}
      onChange={noop}
    />
  );

  assert.ok(!html.includes('rotate('), 'Expected no rotate transform when tiltAngle is zero');
});

test('moveMethodAnchor marks dragged Loomis anchor as hand-placed while preserving other anchors', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
    loomis: {
      center: { x: 300, y: 340, source: 'detected' },
      radius: 170,
      browLineY: 340,
      noseLineY: 440,
      chinY: 550,
      jawWidth: 150,
      tiltAngle: 0,
      sources: {
        center: 'detected',
        radius: 'estimated',
        browLineY: 'detected',
        noseLineY: 'detected',
        chinY: 'detected',
        jawWidth: 'detected',
      },
    },
  };

  // 1. Move Loomis center
  const movedCenter = moveMethodAnchor(methodState, 'loomis-center', { x: 310, y: 350 });
  assert.equal(movedCenter.loomis.center.x, 310);
  assert.equal(movedCenter.loomis.center.y, 350);
  assert.equal(movedCenter.loomis.center.source, 'hand-placed');
  assert.equal(movedCenter.loomis.sources?.center, 'hand-placed');
  // Other anchors keep their original sources
  assert.equal(movedCenter.loomis.sources?.radius, 'estimated');
  assert.equal(movedCenter.loomis.sources?.browLineY, 'detected');
  assert.equal(movedCenter.loomis.sources?.noseLineY, 'detected');
  assert.equal(movedCenter.loomis.sources?.chinY, 'detected');

  // 2. Move Loomis radius
  const movedRadius = moveMethodAnchor(methodState, 'loomis-radius', { x: 490, y: 340 });
  assert.equal(movedRadius.loomis.sources?.radius, 'hand-placed');
  assert.equal(movedRadius.loomis.center.source, 'detected');
  assert.equal(movedRadius.loomis.sources?.center, 'detected');
  assert.equal(movedRadius.loomis.sources?.browLineY, 'detected');

  // 3. Move Loomis brow line
  const movedBrow = moveMethodAnchor(methodState, 'loomis-brow', { x: 300, y: 330 });
  assert.equal(movedBrow.loomis.browLineY, 330);
  assert.equal(movedBrow.loomis.sources?.browLineY, 'hand-placed');
  assert.equal(movedBrow.loomis.sources?.noseLineY, 'detected');
  assert.equal(movedBrow.loomis.sources?.chinY, 'detected');

  // 4. Move Loomis nose line
  const movedNose = moveMethodAnchor(methodState, 'loomis-nose', { x: 300, y: 435 });
  assert.equal(movedNose.loomis.noseLineY, 435);
  assert.equal(movedNose.loomis.sources?.noseLineY, 'hand-placed');
  assert.equal(movedNose.loomis.sources?.browLineY, 'detected');
  assert.equal(movedNose.loomis.sources?.chinY, 'detected');

  // 5. Move Loomis chin
  const movedChin = moveMethodAnchor(methodState, 'loomis-chin', { x: 300, y: 560 });
  assert.equal(movedChin.loomis.chinY, 560);
  assert.equal(movedChin.loomis.sources?.chinY, 'hand-placed');
  assert.equal(movedChin.loomis.sources?.browLineY, 'detected');
  assert.equal(movedChin.loomis.sources?.noseLineY, 'detected');
});

test('moveMethodAnchor marks dragged Reilly anchor as hand-placed while preserving other anchors', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'reilly',
    reilly: {
      browCenter: { x: 300, y: 330, source: 'detected' },
      noseTip: { x: 300, y: 440, source: 'detected' },
      mouthCenter: { x: 300, y: 500, source: 'detected' },
      chinBottom: { x: 300, y: 550, source: 'detected' },
      leftEye: { x: 235, y: 345, source: 'detected' },
      rightEye: { x: 365, y: 345, source: 'detected' },
      leftJaw: { x: 190, y: 460, source: 'detected' },
      rightJaw: { x: 410, y: 460, source: 'detected' },
      leftTemple: { x: 180, y: 280, source: 'detected' },
      rightTemple: { x: 420, y: 280, source: 'detected' },
    },
  };

  const moved = moveMethodAnchor(methodState, 'noseTip', { x: 305, y: 445 });

  // Dragged anchor changes away from detected to hand-placed
  assert.equal(moved.reilly.noseTip.x, 305);
  assert.equal(moved.reilly.noseTip.y, 445);
  assert.equal(moved.reilly.noseTip.source, 'hand-placed');

  // Non-dragged anchors keep their original source (detected)
  assert.equal(moved.reilly.browCenter.source, 'detected');
  assert.equal(moved.reilly.leftEye.source, 'detected');
  assert.equal(moved.reilly.rightEye.source, 'detected');
  assert.equal(moved.reilly.mouthCenter.source, 'detected');
  assert.equal(moved.reilly.chinBottom.source, 'detected');
  assert.equal(moved.reilly.leftJaw.source, 'detected');
  assert.equal(moved.reilly.rightJaw.source, 'detected');
  assert.equal(moved.reilly.leftTemple.source, 'detected');
  assert.equal(moved.reilly.rightTemple.source, 'detected');
});

test('moveMethodAnchor marks dragged Bargue anchor as hand-placed while preserving other anchors', () => {
  const methodState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'bargue',
    bargue: {
      points: [
        { id: 'p1', x: 300, y: 140, source: 'detected' },
        { id: 'p2', x: 450, y: 280, source: 'detected' },
        { id: 'p3', x: 430, y: 500, source: 'detected' },
      ],
      plumbLines: [{ x: 300 }],
      levelBars: [{ y: 345 }],
    },
  };

  const moved = moveMethodAnchor(methodState, 'p2', { x: 460, y: 290 });

  // Dragged anchor changes away from detected to hand-placed
  assert.equal(moved.bargue.points[1].x, 460);
  assert.equal(moved.bargue.points[1].y, 290);
  assert.equal(moved.bargue.points[1].source, 'hand-placed');

  // Non-dragged anchors keep their original source (detected)
  assert.equal(moved.bargue.points[0].source, 'detected');
  assert.equal(moved.bargue.points[2].source, 'detected');
});

test('MethodOverlays renders hand-placed visual styles for Loomis, Reilly, and Bargue anchors', () => {
  const loomisState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'loomis',
    showAnchorPoints: true,
    loomis: {
      center: { x: 300, y: 340, source: 'hand-placed' },
      radius: 170,
      browLineY: 340,
      noseLineY: 440,
      chinY: 550,
      jawWidth: 150,
      tiltAngle: 0,
      sources: {
        center: 'hand-placed',
        radius: 'estimated',
        browLineY: 'detected',
      },
    },
  };

  const loomisHtml = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={loomisState}
      onChange={noop}
    />
  );

  assert.ok(loomisHtml.includes('data-source="hand-placed"'));
  assert.ok(loomisHtml.includes('anchor-hand-placed'));
  assert.ok(loomisHtml.includes('Loomis Center: hand-placed'));
  // Non-dragged brow anchor still renders detected
  assert.ok(loomisHtml.includes('data-source="detected"'));

  const reillyState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'reilly',
    showAnchorPoints: true,
    reilly: {
      browCenter: { x: 300, y: 330, source: 'detected' },
      noseTip: { x: 300, y: 440, source: 'hand-placed' },
      mouthCenter: { x: 300, y: 500, source: 'detected' },
      chinBottom: { x: 300, y: 550, source: 'detected' },
      leftEye: { x: 235, y: 345, source: 'detected' },
      rightEye: { x: 365, y: 345, source: 'detected' },
      leftJaw: { x: 190, y: 460, source: 'detected' },
      rightJaw: { x: 410, y: 460, source: 'detected' },
      leftTemple: { x: 180, y: 280, source: 'detected' },
      rightTemple: { x: 420, y: 280, source: 'detected' },
    },
  };

  const reillyHtml = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={reillyState}
      onChange={noop}
    />
  );

  assert.ok(reillyHtml.includes('data-source="hand-placed"'));
  assert.ok(reillyHtml.includes('noseTip: hand-placed'));
  assert.ok(reillyHtml.includes('data-source="detected"'));

  const bargueState: DrawingMethodState = {
    ...INITIAL_PROJECT_STATE.methods,
    activeMethod: 'bargue',
    showAnchorPoints: true,
    bargue: {
      points: [
        { id: 'p1', x: 300, y: 140, source: 'hand-placed' },
        { id: 'p2', x: 450, y: 280, source: 'detected' },
      ],
      plumbLines: [],
      levelBars: [],
    },
  };

  const bargueHtml = renderToStaticMarkup(
    <MethodOverlays
      width={800}
      height={1000}
      methodState={bargueState}
      onChange={noop}
    />
  );

  assert.ok(bargueHtml.includes('data-source="hand-placed"'));
  assert.ok(bargueHtml.includes('Bargue Anchor (p1): hand-placed'));
  assert.ok(bargueHtml.includes('data-source="detected"'));
});


