import { useId, useMemo } from 'react';

export interface LineMarkers {
  /** Put these on the `<marker>` elements. */
  normalId: string;
  hoveredId: string;
  /** Put these on a line's `marker-end`. */
  normal: string;
  hovered: string;
}

/**
 * Ids for the arrowheads, unique to this instance.
 *
 * An SVG `marker-end` of `url(#name)` is resolved against the whole document, not against the
 * `<svg>` the line lives in. Two instances on one page with a fixed id therefore share one
 * arrowhead — whichever the document holds first — so a green line ends in a red arrow if a red
 * instance was rendered above it. Measured, not assumed: both lines resolved to the same marker
 * and the second instance's own `<marker>`, correctly coloured, went unused.
 *
 * `useId` is stable across a server render and the hydration that follows it, which a counter
 * or a random suffix would not be — those produce different ids on the two passes and React
 * throws away the markup.
 */
export function useLineMarkers(): LineMarkers {
  const instanceId = useId();

  return useMemo(() => {
    const normalId = `arrowhead-normal-${instanceId}`;
    const hoveredId = `arrowhead-hover-${instanceId}`;

    return { normalId, hoveredId, normal: `url(#${normalId})`, hovered: `url(#${hoveredId})` };
  }, [instanceId]);
}
