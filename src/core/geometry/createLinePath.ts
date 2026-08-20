import type { Point } from '@/core/types';
import { type LineType } from '@/types/table-mapping';

/**
 * How far the line stops short of its target anchor, so an arrowhead marker sits beside the
 * connector instead of on top of it. Pass 0 when drawing lines without markers.
 */
export const DEFAULT_MARKER_INSET = 7;

export interface CreateLinePathParams {
  type: LineType;
  /** Where the line starts — usually the source connector's anchor. */
  from: Point;
  /** Where the line ends — usually the target connector's anchor. */
  to: Point;
  /** Defaults to {@link DEFAULT_MARKER_INSET}. */
  markerInset?: number;
}

/**
 * Builds the SVG `d` string for a mapping line running from one anchor to another.
 *
 * - `bezier` — a cubic curve leaving and arriving horizontally, so the line reads as flowing
 *   sideways between two columns rather than cutting across at an angle
 * - `straight` — a single segment
 * - `step` — an orthogonal path: out horizontally, across vertically, then in horizontally
 *
 * Only `straight` applies `markerInset`. `bezier` and `step` reach their endpoint exactly, so
 * a marker drawn on those types can overlap the target connector.
 */
export function createLinePath({ type, from, to, markerInset = DEFAULT_MARKER_INSET }: CreateLinePathParams): string {
  switch (type) {
    case 'bezier': {
      const controlPointOffset = (to.x - from.x) / 2;

      return `M ${from.x} ${from.y} C ${from.x + controlPointOffset} ${from.y}, ${
        to.x - controlPointOffset
      } ${to.y}, ${to.x} ${to.y}`;
    }

    case 'straight':
      return `M ${from.x} ${from.y} L ${to.x - markerInset} ${to.y}`;

    case 'step': {
      const midX = from.x + (to.x - from.x) / 2;

      return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
    }

    default:
      return `M ${from.x} ${from.y} L ${to.x - markerInset} ${to.y}`;
  }
}
