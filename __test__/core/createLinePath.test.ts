import { describe, expect, it } from 'vitest';

import { createLinePath } from '@/core/geometry/createLinePath';

/**
 * Contract: `createLinePath` is part of the `/core` published subpath, so these assert the
 * *shape* each line type promises a consumer, plus the one exact number in that promise —
 * the marker inset a straight line stops short by. The relationship those coordinates have
 * to the connectors is `invariant/line-anchors.test.tsx`'s job, not this file's.
 */

function parseNumbers(d: string): number[] {
  return d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
}

describe('createLinePath — bezier', () => {
  it('draws a cubic through two control points with horizontal tangents at each end', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 40 };

    const d = createLinePath({ type: 'bezier', from, to });

    expect(d.startsWith(`M ${from.x} ${from.y} C `)).toBe(true);

    const [startX, startY, c1x, c1y, c2x, c2y, endX, endY] = parseNumbers(d);

    expect({ x: startX, y: startY }).toEqual(from);
    expect({ x: endX, y: endY }).toEqual(to);

    // Horizontal tangent at each end: the first control point shares the start's y, the
    // second shares the end's y.
    expect(c1y).toBe(from.y);
    expect(c2y).toBe(to.y);

    // The control points sit symmetrically about the horizontal midpoint.
    expect(c1x - from.x).toBe(to.x - c2x);
  });
});

describe('createLinePath — step', () => {
  it('routes orthogonally: same y, then same x, then same y', () => {
    const from = { x: 10, y: 20 };
    const to = { x: 210, y: 180 };

    const d = createLinePath({ type: 'step', from, to });
    const numbers = parseNumbers(d);

    expect(numbers).toHaveLength(8);

    const [p0x, p0y, p1x, p1y, p2x, p2y, p3x, p3y] = numbers;

    expect({ x: p0x, y: p0y }).toEqual(from);
    expect({ x: p3x, y: p3y }).toEqual(to);

    // Leg 1: horizontal — same y as the start.
    expect(p1y).toBe(from.y);
    // Leg 2: vertical — same x on both ends.
    expect(p2x).toBe(p1x);
    // Leg 3: horizontal — same y as the end.
    expect(p2y).toBe(to.y);
  });
});

describe('createLinePath — straight', () => {
  it('draws a single segment from the start point to the end point, and 0 disables the inset', () => {
    const from = { x: 5, y: 15 };
    const to = { x: 205, y: 15 };

    const d = createLinePath({ type: 'straight', from, to, markerInset: 0 });
    const numbers = parseNumbers(d);

    expect(numbers).toHaveLength(4);

    const [x0, y0, x1, y1] = numbers;

    expect({ x: x0, y: y0 }).toEqual(from);
    // markerInset 0 means the endpoint lands exactly on `to`, undisturbed.
    expect({ x: x1, y: y1 }).toEqual(to);
  });

  it('pulls the endpoint back by the default marker inset (7) when none is given', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const defaultInset = 7;

    const d = createLinePath({ type: 'straight', from, to });
    const numbers = parseNumbers(d);
    const endX = numbers.at(-2);

    expect(endX).toBe(to.x - defaultInset);
  });

  it('pulls the endpoint back by exactly the markerInset supplied', () => {
    const from = { x: 0, y: 0 };
    const to = { x: 100, y: 0 };
    const inset = 25;

    const d = createLinePath({ type: 'straight', from, to, markerInset: inset });
    const numbers = parseNumbers(d);
    const endX = numbers.at(-2);

    expect(endX).toBe(to.x - inset);
  });
});
