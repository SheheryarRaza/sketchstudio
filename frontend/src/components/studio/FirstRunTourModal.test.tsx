import test from 'node:test';
import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FirstRunTourModal } from './FirstRunTourModal';

const noop = () => {};

test('FirstRunTourModal returns null when isOpen is false', () => {
  const html = renderToStaticMarkup(
    <FirstRunTourModal
      isOpen={false}
      onClose={noop}
    />
  );
  assert.equal(html, '');
});

test('FirstRunTourModal renders step 1 content, step indicators, and controls when isOpen is true', () => {
  const html = renderToStaticMarkup(
    <FirstRunTourModal
      isOpen={true}
      onClose={noop}
      initialStep={1}
    />
  );

  assert.match(html, /Upload/i, 'Must describe upload in step 1');
  assert.match(html, /Step 1 of 3/i, 'Must render step indicator');
  assert.match(html, /Skip/i, 'Must have a skip affordance');
  assert.match(html, /Next/i, 'Must have a next affordance');
});

test('FirstRunTourModal renders step 2 content for choose starting point', () => {
  const html = renderToStaticMarkup(
    <FirstRunTourModal
      isOpen={true}
      onClose={noop}
      initialStep={2}
    />
  );

  assert.match(html, /Starting Point|Workflow Preset/i, 'Must describe starting point in step 2');
  assert.match(html, /Step 2 of 3/i);
  assert.match(html, /Back/i);
  assert.match(html, /Next/i);
});

test('FirstRunTourModal renders step 3 content for canvas and isolate hint', () => {
  const html = renderToStaticMarkup(
    <FirstRunTourModal
      isOpen={true}
      onClose={noop}
      initialStep={3}
    />
  );

  assert.match(html, /Canvas|Isolate/i, 'Must describe canvas and isolate hint in step 3');
  assert.match(html, /Step 3 of 3/i);
  assert.match(html, /Back/i);
  assert.match(html, /Start|Done|Finish/i, 'Must have completion button on final step');
});
