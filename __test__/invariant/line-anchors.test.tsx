import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import type { LineType } from '@/types/table-mapping';

import { mappingOf, renderConsumer } from '../helpers/consumer';
import { setRect } from '../helpers/rects';

/**
 * Invariant: a mapping line starts at its source connector and ends at its target connector.
 *
 * Tier 2 — permanent, implementation-independent.
 *
 * This is the assertion that survives the migration. The `d`-string snapshots in
 * geometry-baseline.test.tsx pin exact coordinates, which is the right tool for proving a
 * refactor changed nothing, but they cannot say WHY a value is correct and they go stale
 * the moment anything legitimately moves. These assertions state the relationship instead:
 * whatever resolveAnchor() ends up computing, the line still has to touch its connectors.
 *
 * Phase 3 completion converts geometry-baseline into a deleted file and leaves this one.
 */

/** Largest gap tolerated between the line end and the target connector (arrow marker inset). */
const MAX_MARKER_INSET = 8;

const LINE_TYPES: LineType[] = ['bezier', 'straight', 'step'];

interface Layout {
  name: string;
  container: { x: number; y: number; width: number; height: number };
  sourceX: number;
  targetX: number;
  firstRowY: number;
  rowPitch: number;
  connectorSize: number;
}

const LAYOUTS: Layout[] = [
  {
    name: 'container at the origin',
    container: { x: 0, y: 0, width: 600, height: 300 },
    sourceX: 190,
    targetX: 400,
    firstRowY: 20,
    rowPitch: 60,
    connectorSize: 10,
  },
  {
    // A non-zero container origin is where coordinate-space mistakes surface: every anchor
    // has to be expressed relative to the container, not the viewport.
    name: 'container offset from the viewport',
    container: { x: 50, y: 30, width: 500, height: 260 },
    sourceX: 210,
    targetX: 430,
    firstRowY: 55,
    rowPitch: 40,
    connectorSize: 14,
  },
];

function applyLayout(root: HTMLElement, layout: Layout) {
  setRect(root.querySelector('.mapping-container'), layout.container);
  setRect(root.querySelector('.mapping-svg'), layout.container);

  const place = (selector: string, x: number) => {
    root.querySelectorAll(selector).forEach((el, index) =>
      setRect(el, {
        x,
        y: layout.firstRowY + index * layout.rowPitch,
        width: layout.connectorSize,
        height: layout.connectorSize,
      }),
    );
  };

  place('[id^="connector-source-"]', layout.sourceX);
  place('[id^="connector-target-"]', layout.targetX);
}

/** Anchor a connector is expected to expose, in container-relative coordinates. */
function anchorOf(el: Element, container: DOMRect, edge: 'right' | 'left') {
  const rect = el.getBoundingClientRect();

  return {
    x: (edge === 'right' ? rect.right : rect.left) - container.left,
    y: rect.top + rect.height / 2 - container.top,
  };
}

/** First and last coordinate pair of an SVG path, regardless of command mix. */
function endpointsOf(d: string) {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  expect(numbers.length, `unparseable path: ${d}`).toBeGreaterThanOrEqual(4);

  return {
    start: { x: numbers[0], y: numbers[1] },
    end: { x: numbers.at(-2)!, y: numbers.at(-1)! },
  };
}

describe.each(LAYOUTS)('invariant: line anchors — $name', (layout) => {
  it.each(LINE_TYPES)('lineType=%s starts on the source and ends on the target', (lineType) => {
    const mappings = [
      mappingOf('source-1', 'target-3'),
      mappingOf('source-2', 'target-1'),
      mappingOf('source-3', 'target-2'),
    ];

    const harness = renderConsumer({ mappings, lineType });

    applyLayout(harness.container, layout);
    act(() => harness.ref.current!.redraw());

    const containerRect = harness.container.querySelector('.mapping-container')!.getBoundingClientRect();

    for (const mapping of mappings) {
      const path = harness.container.querySelector(`[data-testid="mapping-line-${mapping.id}"] .line-base`);

      expect(path, `no line rendered for ${mapping.id}`).not.toBeNull();

      const { start, end } = endpointsOf(path!.getAttribute('d')!);

      const sourceAnchor = anchorOf(
        harness.container.querySelector(`#connector-source-${mapping.source}`)!,
        containerRect,
        'right',
      );
      const targetAnchor = anchorOf(
        harness.container.querySelector(`#connector-target-${mapping.target}`)!,
        containerRect,
        'left',
      );

      // The line begins exactly on the source connector's right edge, vertically centred.
      expect(start, `${mapping.id} start`).toEqual(sourceAnchor);

      // It reaches the target connector's left edge, stopping at most a marker's width
      // short — and never overshooting past it.
      expect(end.y, `${mapping.id} end.y`).toBe(targetAnchor.y);
      expect(targetAnchor.x - end.x, `${mapping.id} end.x gap`).toBeGreaterThanOrEqual(0);
      expect(targetAnchor.x - end.x, `${mapping.id} end.x gap`).toBeLessThanOrEqual(MAX_MARKER_INSET);
    }
  });
});

describe('invariant: anchors follow their connectors', () => {
  it('moving a connector moves that line and no other', () => {
    const moved = mappingOf('source-1', 'target-1');
    const untouched = mappingOf('source-2', 'target-2');
    const layout = LAYOUTS[0];

    const harness = renderConsumer({ mappings: [moved, untouched] });

    applyLayout(harness.container, layout);
    act(() => harness.ref.current!.redraw());

    const read = (id: string) =>
      endpointsOf(harness.container.querySelector(`[data-testid="mapping-line-${id}"] .line-base`)!.getAttribute('d')!);

    const before = { moved: read(moved.id), untouched: read(untouched.id) };

    setRect(harness.container.querySelector('#connector-source-source-1'), {
      x: layout.sourceX,
      y: layout.firstRowY + 7 * layout.rowPitch,
      width: layout.connectorSize,
      height: layout.connectorSize,
    });

    act(() => harness.ref.current!.redraw());

    const after = { moved: read(moved.id), untouched: read(untouched.id) };

    const containerRect = harness.container.querySelector('.mapping-container')!.getBoundingClientRect();
    const expected = anchorOf(harness.container.querySelector('#connector-source-source-1')!, containerRect, 'right');

    expect(after.moved.start).toEqual(expected);
    expect(after.moved.start).not.toEqual(before.moved.start);
    expect(after.untouched).toEqual(before.untouched);
  });
});
