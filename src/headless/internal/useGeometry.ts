import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import { createLinePath } from '@/core/geometry/createLinePath';
import { type AnchorSpec, resolveAnchor } from '@/core/geometry/resolveAnchor';
import type { Point } from '@/core/types';
import type { ConnectorRegistry } from '@/headless/internal/useConnectorRegistry';
import type { LineType, Mapping } from '@/types/table-mapping';

export interface GeometryLine {
  id: string;
  source: string;
  target: string;
  path: string;
  from: Point;
  to: Point;
  mid: Point;
}

export interface UseGeometryParams {
  rootRef: React.RefObject<HTMLElement | null>;
  registry: ConnectorRegistry;
  mappings: Mapping[];
  lineType: LineType;
  sourceAnchor?: AnchorSpec;
  targetAnchor?: AnchorSpec;
  anchorOffset?: number;
}

export interface Geometry {
  /** Empty until the first measurement lands, which keeps the first render server-safe. */
  lines: GeometryLine[];
  /** Forces a fresh measurement — for changes no observer can see. */
  remeasure: () => void;
}

/**
 * Measures where every mapping line should be drawn.
 *
 * Measurement runs in a layout effect rather than during render. Reading
 * `getBoundingClientRect()` while rendering reports the layout as it was *before* the current
 * change was committed, which is why removing a row could leave the remaining lines attached
 * to where its neighbours used to be.
 *
 * Re-measures when the root or a connector changes size, or when a connector enters or
 * leaves. Event-driven passes are coalesced into one animation frame; the first pass and
 * registry changes are measured synchronously, so a caller that renders and immediately reads
 * has lines to read.
 *
 * Neither scroll nor window resize is observed here.
 *
 * Anchors are the difference between two viewport rects — the connector's and the root's — so
 * a scroll that moves both leaves that difference untouched. Only a scroll container sitting
 * *between* the root and a connector would change anything, and no such element exists here.
 *
 * A window resize that moves a connector relative to the root does so by changing the root's
 * size, which the observer above already reports; one that leaves the root's size alone left
 * the connectors where they were. Measured, not assumed: with the styled layer's own resize
 * handler disabled, `e2e/baseline.spec.ts` still re-measures on a viewport change.
 */
export function useGeometry({
  rootRef,
  registry,
  mappings,
  lineType,
  sourceAnchor = 'right-center',
  targetAnchor = 'left-center',
  anchorOffset = 0,
}: UseGeometryParams): Geometry {
  const [lines, setLines] = useState<GeometryLine[]>([]);
  const [version, setVersion] = useState(0);
  const frame = useRef<number | null>(null);

  const remeasure = useCallback(() => setVersion((current) => current + 1), []);

  const measure = useCallback(() => {
    const root = rootRef.current;

    if (!root) return;

    const containerRect = root.getBoundingClientRect();

    const next = mappings.reduce<GeometryLine[]>((accumulated, mapping) => {
      const sourceElement = registry.getConnector('source', mapping.source);
      const targetElement = registry.getConnector('target', mapping.target);

      if (!sourceElement || !targetElement) return accumulated;

      const from = resolveAnchor({
        rect: sourceElement.getBoundingClientRect(),
        containerRect,
        spec: sourceAnchor,
        offset: anchorOffset,
      });

      const to = resolveAnchor({
        rect: targetElement.getBoundingClientRect(),
        containerRect,
        spec: targetAnchor,
        offset: anchorOffset,
      });

      accumulated.push({
        id: mapping.id,
        source: mapping.source,
        target: mapping.target,
        path: createLinePath({ type: lineType, from, to }),
        from,
        to,
        mid: { x: from.x + (to.x - from.x) / 2, y: from.y + (to.y - from.y) / 2 },
      });

      return accumulated;
    }, []);

    setLines(next);
  }, [registry, rootRef, mappings, lineType, sourceAnchor, targetAnchor, anchorOffset]);

  const scheduleMeasure = useCallback(() => {
    if (frame.current !== null) return;

    frame.current = requestAnimationFrame(() => {
      frame.current = null;
      measure();
    });
  }, [measure]);

  useLayoutEffect(() => {
    measure();
  }, [measure, version]);

  useLayoutEffect(() => {
    const root = rootRef.current;

    if (!root) return;

    const observer = new ResizeObserver(scheduleMeasure);

    observer.observe(root);
    mappings.forEach((mapping) => {
      const sourceElement = registry.getConnector('source', mapping.source);
      const targetElement = registry.getConnector('target', mapping.target);

      if (sourceElement) observer.observe(sourceElement);
      if (targetElement) observer.observe(targetElement);
    });

    return () => {
      observer.disconnect();

      if (frame.current !== null) {
        cancelAnimationFrame(frame.current);
        frame.current = null;
      }
    };
  }, [scheduleMeasure, rootRef, registry, mappings]);

  return { lines, remeasure };
}
