import test from 'node:test';
import assert from 'node:assert/strict';
import { axisMaximum, visibleMaximum } from '../public/chart-scale.js';

test('visible curves determine a rounded axis with headroom, not historical peaks', () => {
  const curves = [[{ time: 0, value: 90 }, { time: 10, value: 42.8 }, { time: 20, value: 29 }]];
  assert.equal(axisMaximum(curves, [], 10, 20), 45);
  assert.equal(axisMaximum(curves, [], 0, 10), 95);
  assert.equal(axisMaximum([curves[0].slice(2)], [], 10, 20), 35);
});
test('segments at viewport boundaries and across polling pauses cannot be clipped', () => {
  const curves = [[{ time: 0, value: 80 }, { time: 100, value: 20 }]];
  assert.equal(visibleMaximum(curves, [], 50, 60), 50);
  assert.equal(axisMaximum(curves, [], 50, 60), 55);
  assert.equal(visibleMaximum([[{ time: 0, value: 20 }, { time: 100, value: 80 }]], [], 50, 60), 56);
  assert.equal(visibleMaximum(curves, [], 101, 120), 0);
});
test('only visible election markers contribute; zero and empty views remain usable', () => {
  const markers = [{ time: 5, value: 62 }, { time: 30, value: 99 }];
  assert.equal(axisMaximum([], markers, 0, 10), 65);
  assert.equal(axisMaximum([], markers, 10, 20), 10);
  assert.equal(axisMaximum([], markers, 10, 20, 5), 65);
  assert.equal(axisMaximum([[{ time: 5, value: 0 }]], [], 0, 10), 10);
  assert.equal(axisMaximum([], [{ time: 5, value: 100 }], 0, 10), 100);
});
