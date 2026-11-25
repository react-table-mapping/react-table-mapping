import { describe, expect, it } from 'vitest';

import { resolveAnchor } from '@/core/geometry/resolveAnchor';

/**
 * Contract: `resolveAnchor` is part of the `/core` published subpath (spec section 4).
 *
 * Rects are plain objects in node — no DOM here at all — so this builds a minimal
 * `DOMRectReadOnly`-shaped object rather than reaching for a real one.
 */
function rect(props: { x: number; y: number; width: number; height: number }): DOMRectReadOnly {
  const { x, y, width, height } = props;

  return {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return this;
    },
  };
}

// Connector: left 190, right 200, top 20, bottom 30 -> centerY 25.
const CONNECTOR = rect({ x: 190, y: 20, width: 10, height: 10 });
const ZERO_CONTAINER = rect({ x: 0, y: 0, width: 600, height: 300 });
const OFFSET_CONTAINER = rect({ x: 50, y: 30, width: 500, height: 260 });

describe('resolveAnchor — right-center', () => {
  it('subtracts the container origin, so a non-zero origin changes the result', () => {
    const atZeroOrigin = resolveAnchor({ rect: CONNECTOR, containerRect: ZERO_CONTAINER, spec: 'right-center' });
    const atOffsetOrigin = resolveAnchor({ rect: CONNECTOR, containerRect: OFFSET_CONTAINER, spec: 'right-center' });

    expect(atZeroOrigin).toEqual({ x: 200, y: 25 });
    expect(atOffsetOrigin).toEqual({ x: 150, y: -5 });
    expect(atOffsetOrigin).not.toEqual(atZeroOrigin);
  });

  it('offset pushes the point outward past the right edge', () => {
    const withoutOffset = resolveAnchor({ rect: CONNECTOR, containerRect: ZERO_CONTAINER, spec: 'right-center' });
    const withOffset = resolveAnchor({
      rect: CONNECTOR,
      containerRect: ZERO_CONTAINER,
      spec: 'right-center',
      offset: 8,
    });

    expect(withOffset).toEqual({ x: withoutOffset.x + 8, y: withoutOffset.y });
  });
});

describe('resolveAnchor — left-center', () => {
  it('subtracts the container origin, so a non-zero origin changes the result', () => {
    const atZeroOrigin = resolveAnchor({ rect: CONNECTOR, containerRect: ZERO_CONTAINER, spec: 'left-center' });
    const atOffsetOrigin = resolveAnchor({ rect: CONNECTOR, containerRect: OFFSET_CONTAINER, spec: 'left-center' });

    expect(atZeroOrigin).toEqual({ x: 190, y: 25 });
    expect(atOffsetOrigin).toEqual({ x: 140, y: -5 });
    expect(atOffsetOrigin).not.toEqual(atZeroOrigin);
  });

  it('offset pushes the point outward past the left edge', () => {
    const withoutOffset = resolveAnchor({ rect: CONNECTOR, containerRect: ZERO_CONTAINER, spec: 'left-center' });
    const withOffset = resolveAnchor({
      rect: CONNECTOR,
      containerRect: ZERO_CONTAINER,
      spec: 'left-center',
      offset: 8,
    });

    expect(withOffset).toEqual({ x: withoutOffset.x - 8, y: withoutOffset.y });
  });
});
