import type { Point } from '@/core/types';

/**
 * Which edge of a connector a mapping line attaches to.
 *
 * `'right-center'` leaves from the middle of the right edge, `'left-center'` arrives at the
 * middle of the left edge. In a left-to-right layout the source uses the former and the
 * target the latter; swap them for a right-to-left one.
 */
export type AnchorSpec = 'left-center' | 'right-center';

export interface ResolveAnchorParams {
  /** The connector element's own position, as measured against the viewport. */
  rect: DOMRectReadOnly;
  /** The mapping container's position, as measured against the viewport. */
  containerRect: DOMRectReadOnly;
  spec: AnchorSpec;
  /** Gap between the connector and the end of the line. Defaults to 0. */
  offset?: number;
}

/**
 * Turns a connector's on-screen position into a point the mapping canvas can draw to.
 *
 * `getBoundingClientRect()` measures against the viewport, but the canvas is laid over the
 * container and its coordinates start at the container's top-left corner. Subtracting the
 * container's own position is what bridges the two — without it every line is off by however
 * far the container sits from the top-left of the page.
 *
 * `offset` pushes the point away from the connector: further right for `'right-center'`,
 * further left for `'left-center'`.
 */
export function resolveAnchor({ rect, containerRect, spec, offset = 0 }: ResolveAnchorParams): Point {
  const centerY = rect.top + rect.height / 2 - containerRect.top;

  return spec === 'right-center'
    ? { x: rect.right - containerRect.left + offset, y: centerY }
    : { x: rect.left - containerRect.left - offset, y: centerY };
}
