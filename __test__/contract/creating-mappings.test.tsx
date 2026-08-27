import { act } from '@testing-library/react';
import { PointerEventsCheckLevel, type UserEvent, userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import type { FieldItem, FieldItemInput } from '@/types/table-mapping';

import { mappingOf, renderConsumer, sourceFixture, targetFixture } from '../helpers/consumer';
import { setRect } from '../helpers/rects';

/**
 * Contract: creating mappings.
 *
 * Grouped by what the consumer is doing, not by which API they reach for — the same
 * behaviour is reachable through `ref.addMapping`, through the bulk helpers, and through
 * dragging a connector. Keeping them together is what makes a disagreement between those
 * entry points visible.
 */

describe('contract: adding a single mapping', () => {
  it('creates the mapping and reports it to the consumer', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-1', 'target-2'));

    expect(harness.lastAction()).toEqual({
      type: 'ADD_MAPPING',
      payload: {
        sourceId: 'source-1',
        targetId: 'target-2',
        mapping: mappingOf('source-1', 'target-2'),
      },
    });

    expect(harness.state().mappings).toEqual([mappingOf('source-1', 'target-2')]);
  });

  it('ignores a duplicate pair without emitting', () => {
    const harness = renderConsumer({ mappings: [mappingOf('source-1', 'target-2')] });

    act(() => harness.ref.current!.addMapping('source-1', 'target-2'));

    expect(harness.onMappingChange).not.toHaveBeenCalled();
    expect(harness.state().mappings).toHaveLength(1);
  });

  it('allows one source to fan out to several targets', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));
    act(() => harness.ref.current!.addMapping('source-1', 'target-2'));

    expect(harness.state().mappings).toHaveLength(2);
  });
});

describe('contract: pairing rows positionally', () => {
  it('pairs by position, stopping at the shorter table', () => {
    const harness = renderConsumer({ sources: sourceFixture(4), targets: targetFixture(2) });

    act(() => harness.ref.current!.sameLineMapping());

    expect(harness.state().mappings).toEqual([mappingOf('source-1', 'target-1'), mappingOf('source-2', 'target-2')]);

    expect(harness.lastAction()).toMatchObject({ type: 'SAME_LINE_MAPPING' });
  });

  it('produces nothing when either side is empty', () => {
    const harness = renderConsumer({ sources: [], targets: targetFixture(3) });

    act(() => harness.ref.current!.sameLineMapping());

    expect(harness.state().mappings).toEqual([]);
  });
});

describe('contract: pairing rows by matching value', () => {
  const sources = [
    { id: 'source-1', key: 'source-1', name: { type: 'string' as const, columnKey: 'name', value: 'ALPHA' } },
    { id: 'source-2', key: 'source-2', name: { type: 'string' as const, columnKey: 'name', value: 'BETA' } },
  ];

  const targets = [
    { id: 'target-1', key: 'target-1', name: { type: 'input' as const, columnKey: 'name', value: 'GAMMA' } },
    { id: 'target-2', key: 'target-2', name: { type: 'input' as const, columnKey: 'name', value: 'BETA' } },
  ];

  it('pairs fields whose column value matches', () => {
    const harness = renderConsumer({ sources, targets });

    act(() => harness.ref.current!.sameNameMapping('name'));

    expect(harness.state().mappings).toEqual([mappingOf('source-2', 'target-2')]);
    expect(harness.lastAction()).toMatchObject({ type: 'SAME_NAME_MAPPING', payload: { name: 'name' } });
  });

  it('replaces any existing mappings rather than adding to them', () => {
    const harness = renderConsumer({ sources, targets, mappings: [mappingOf('source-1', 'target-1')] });

    act(() => harness.ref.current!.sameNameMapping('name'));

    expect(harness.state().mappings).toEqual([mappingOf('source-2', 'target-2')]);
  });

  /**
   * Current shipped behaviour: an unreadable column aborts the whole pairing with a throw.
   *
   * Recorded here rather than endorsed. The same throw fires when a row simply has no such
   * column — a legitimate shape, since rows may differ from one another — so one ordinary row
   * can take down the render. Replacing it with a skip is a real decision with its own
   * trade-offs, and it is deferred; see `docs/specs/2026-08-05-headless-architecture.md`
   * section 5.3. Until then this pins what a consumer actually gets, so the change cannot
   * happen by accident.
   */
  describe('a field whose column cannot be read', () => {
    // Deliberately malformed at runtime: `name` omits the `columnKey` every OuterFieldItem
    // variant requires. Typed loosely and cast once, per the fixture-escape convention.
    const missingColumnKey: Partial<Record<keyof FieldItem, unknown>> = {
      id: 'source-bad',
      key: 'source-bad',
      name: { type: 'string', value: 'X' },
    };

    it('throws, leaving the previous mappings untouched', () => {
      const existing = mappingOf('source-1', 'target-1');
      const harness = renderConsumer({
        sources: [missingColumnKey as unknown as FieldItemInput, ...sources],
        targets,
        mappings: [existing],
      });

      expect(() => act(() => harness.ref.current!.sameNameMapping('name'))).toThrow('columnKey is required');

      expect(harness.state().mappings).toEqual([existing]);
      expect(harness.onMappingChange).not.toHaveBeenCalled();
    });

    it('throws for a row that simply lacks the column, not only for a malformed one', () => {
      // `sources` carry a `name` column; asking to pair on `data` — which none of them has —
      // is the case a consumer hits with rows of differing shape.
      const harness = renderConsumer({ sources, targets });

      expect(() => act(() => harness.ref.current!.sameNameMapping('data'))).toThrow('columnKey is required');
    });
  });
});

/**
 * Contract: creating a mapping by dragging a source connector onto a target connector.
 *
 * Closes docs/HANDOFF.md H2 — the drag flow had zero coverage before this file, which a
 * probe on TableMapping.tsx's `distance <= 15` check proved: the full suite stayed green
 * even with every drop target made unreachable.
 *
 * jsdom has no hit-testing, so `handleDragEnd`'s target search is driven entirely by the
 * coordinates the pointer sequence reports, not by real cursor position. Every case here
 * lays out `.mapping-container`, `.mapping-svg`, and the connectors explicitly via
 * `helpers/rects.ts`, following the pattern in `invariant/line-anchors.test.tsx`.
 *
 * The happy path and the "far from every target" case additionally run against a container
 * offset from the viewport origin, the same discriminator `invariant/line-anchors.test.tsx`
 * uses for `createPath`'s anchor math (docs/HANDOFF.md H4) — an origin-at-zero layout can't
 * tell `x - 0` from `x`, so a missing or wrong translation is invisible there regardless of
 * which coordinate math is under test. The duplicate-mapping and disabled cases exercise
 * guards that run before any coordinate math, so a second layout adds nothing for them —
 * they stay at the origin layout only.
 *
 * Interaction route: `@testing-library/user-event`'s `pointer()` API, which emits the full
 * pointerdown/mousedown -> pointermove/mousemove -> pointerup/mouseup sequence. Written that
 * way before the component moved off mouse events, and it survived the move untouched apart
 * from where each step is aimed — a file built on bare `fireEvent.mouseDown/mouseMove/mouseUp`
 * would have gone red for a change no consumer could see.
 */

interface DragLayout {
  name: string;
  container: { x: number; y: number; width: number; height: number };
  sourceX: number;
  targetX: number;
  firstRowY: number;
  rowPitch: number;
  connectorSize: number;
}

const DRAG_LAYOUTS: DragLayout[] = [
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
    // Mirrors invariant/line-anchors.test.tsx's second layout — a non-zero container origin
    // is where a coordinate-space mistake in the drag math would surface.
    name: 'container offset from the viewport',
    container: { x: 50, y: 30, width: 500, height: 260 },
    sourceX: 210,
    targetX: 430,
    firstRowY: 55,
    rowPitch: 40,
    connectorSize: 14,
  },
];

/**
 * Lays out `.mapping-container`, `.mapping-svg`, and every connector on a fixed grid per
 * `layout` — far enough that a drop can only ever land unambiguously on one connector's
 * 15px hit radius.
 */
function layoutConnectors(container: HTMLElement, layout: DragLayout): void {
  setRect(container.querySelector('.mapping-container'), layout.container);
  setRect(container.querySelector('.mapping-svg'), layout.container);

  const place = (selector: string, x: number) => {
    container.querySelectorAll(selector).forEach((el, index) =>
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

/**
 * The point `handleDragEnd` compares against a target connector's hit radius, expressed as
 * `clientX`/`clientY` on the pointer sequence — the target connector's own client rect,
 * exactly where a real cursor would be if it were visually over the connector.
 * `getBoundingClientRect()` always reports viewport-absolute coordinates, so this holds
 * regardless of where the container sits.
 */
function targetDropPoint(container: HTMLElement, targetId: string): { clientX: number; clientY: number } {
  const connector = container.querySelector(`#connector-target-${targetId}`);

  if (!connector) throw new Error(`drag fixture missing target connector ${targetId} — check layoutConnectors().`);

  const rect = connector.getBoundingClientRect();

  return { clientX: rect.left, clientY: rect.top + rect.height / 2 };
}

/**
 * Full drag gesture: press on a source connector, move to a point, release there.
 *
 * Every step is aimed at the source connector because that is where the browser sends them
 * once it has captured the pointer — the coordinates say where the pointer really is. jsdom
 * implements neither hit testing nor capture, so nothing here would retarget on its own.
 *
 * That means these cases cannot tell whether `setPointerCapture` was called: aiming the
 * gesture by hand is exactly what capture would have done. `e2e/dnd.spec.ts` is where that
 * is settled — a real browser without capture delivers the release to whatever sits under
 * the cursor, so the drop never reaches the source and no mapping appears at all.
 */
async function dragSourceOnto(
  user: UserEvent,
  container: HTMLElement,
  sourceId: string,
  dropPoint: { clientX: number; clientY: number },
): Promise<void> {
  const sourceConnector = container.querySelector(`#connector-source-${sourceId}`);

  if (!sourceConnector) throw new Error('drag fixture missing source connector — check the selector.');

  await user.pointer([
    { keys: '[MouseLeft>]', target: sourceConnector },
    { target: sourceConnector, coords: dropPoint },
    { keys: '[/MouseLeft]', target: sourceConnector, coords: dropPoint },
  ]);
}

/**
 * Press on a source connector and move into the svg without releasing — leaves the drag
 * in progress so the live preview line can be inspected mid-gesture.
 */
async function startDragTo(
  user: UserEvent,
  container: HTMLElement,
  sourceId: string,
  point: { clientX: number; clientY: number },
): Promise<void> {
  const sourceConnector = container.querySelector(`#connector-source-${sourceId}`);

  if (!sourceConnector) throw new Error('drag fixture missing source connector — check the selector.');

  await user.pointer([
    { keys: '[MouseLeft>]', target: sourceConnector },
    { target: sourceConnector, coords: point },
  ]);
}

/**
 * The drag-preview `<path>` is rendered directly under `.mapping-svg` (TableMapping.tsx),
 * a sibling of the `<g data-testid="mapping-line-…">` groups `MappingLines` emits — those
 * groups nest their `<path>`s one level deeper, so a direct-child selector is what isolates
 * the preview line from the committed mapping lines without needing a dedicated testid.
 */
function dragPreviewPath(container: HTMLElement): SVGPathElement | null {
  return container.querySelector('svg.mapping-svg > path');
}

/** Last coordinate pair of an SVG path, regardless of command mix. */
function pathEndpoint(d: string): { x: number; y: number } {
  const numbers = d.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];

  expect(numbers.length, `unparseable path: ${d}`).toBeGreaterThanOrEqual(2);

  return { x: numbers.at(-2)!, y: numbers.at(-1)! };
}

describe.each(DRAG_LAYOUTS)('contract: dragging a connector onto a target — $name', (layout) => {
  it('connects from near the connector, not only from exactly on it', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer();

    layoutConnectors(harness.container, layout);

    // Short of the connector by less than the 15px reach a drop is allowed. Every other drag
    // case here lands on the anchor itself, so without this one the reach is never exercised.
    const anchor = targetDropPoint(harness.container, 'target-2');

    await dragSourceOnto(user, harness.container, 'source-1', {
      clientX: anchor.clientX - 10,
      clientY: anchor.clientY,
    });

    expect(harness.state().mappings).toEqual([mappingOf('source-1', 'target-2')]);
  });

  it('creates the mapping and reports it to the consumer', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer();

    layoutConnectors(harness.container, layout);

    await dragSourceOnto(user, harness.container, 'source-1', targetDropPoint(harness.container, 'target-2'));

    expect(harness.lastAction()).toEqual({
      type: 'ADD_MAPPING',
      payload: {
        sourceId: 'source-1',
        targetId: 'target-2',
        mapping: mappingOf('source-1', 'target-2'),
      },
    });
    expect(harness.state().mappings).toEqual([mappingOf('source-1', 'target-2')]);
    expect(
      harness.container.querySelector(`[data-testid="mapping-line-${mappingOf('source-1', 'target-2').id}"]`),
    ).not.toBeNull();
  });

  it('creates nothing when the drop lands far from every target connector', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer();

    layoutConnectors(harness.container, layout);

    await dragSourceOnto(user, harness.container, 'source-1', { clientX: 1000, clientY: 1000 });

    expect(harness.onMappingChange).not.toHaveBeenCalled();
    expect(harness.state().mappings).toEqual([]);
  });

  it('renders a live preview line whose endpoint tracks the pointer', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer();

    layoutConnectors(harness.container, layout);

    const svgRect = harness.container.querySelector('.mapping-svg')!.getBoundingClientRect();
    const movePoint = { clientX: svgRect.left + 300, clientY: svgRect.top + 150 };

    await startDragTo(user, harness.container, 'source-1', movePoint);

    const preview = dragPreviewPath(harness.container);

    expect(preview, 'no drag-preview line rendered while dragging').not.toBeNull();

    // The endpoint is expressed relative to the pointer position and the svg's own origin —
    // not a literal coordinate — so this holds regardless of where the container sits.
    expect(pathEndpoint(preview!.getAttribute('d')!)).toEqual({
      x: movePoint.clientX - svgRect.left,
      y: movePoint.clientY - svgRect.top,
    });
  });
});

describe('contract: dragging a connector onto a target — guards preceding the coordinate math', () => {
  it('creates no duplicate when the target is already mapped from that source', async () => {
    const user = userEvent.setup();
    const existing = mappingOf('source-1', 'target-2');
    const harness = renderConsumer({ mappings: [existing] });

    layoutConnectors(harness.container, DRAG_LAYOUTS[0]);

    await dragSourceOnto(user, harness.container, 'source-1', targetDropPoint(harness.container, 'target-2'));

    expect(harness.onMappingChange).not.toHaveBeenCalled();
    expect(harness.state().mappings).toEqual([existing]);
  });

  it('creates nothing while disabled, even when the gesture reaches the handler', async () => {
    // pointerEventsCheck is disabled deliberately. The connector's `pointer-events: none`
    // (see contract/appearance.test.tsx "makes connectors inert") already blocks a real
    // cursor from ever reaching it — that is the browser-level defence. This test bypasses
    // it on purpose to exercise the second one: the `!disabled` guard on the connector's
    // own mousedown handler (src/components/SourceTable.tsx:60), the same way
    // appearance.test.tsx's "ignores a hover event even if one reaches the handler" uses
    // fireEvent to reach past the CSS check for the equivalent hover guard.
    const user = userEvent.setup({ pointerEventsCheck: PointerEventsCheckLevel.Never });
    const harness = renderConsumer({ disabled: true });

    layoutConnectors(harness.container, DRAG_LAYOUTS[0]);

    await dragSourceOnto(user, harness.container, 'source-1', targetDropPoint(harness.container, 'target-2'));

    expect(harness.onMappingChange).not.toHaveBeenCalled();
    expect(harness.state().mappings).toEqual([]);
  });
});
