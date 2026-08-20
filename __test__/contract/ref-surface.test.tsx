import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mappingOf, renderConsumer } from '../helpers/consumer';
import { setRect } from '../helpers/rects';

/**
 * Contract: the shape of `TableMappingRef` itself.
 *
 * The other contract files test behaviour a consumer can reach. This one tests the API
 * object they reach it through — which members exist, what reading them gives back, and
 * what the deprecated ones still promise.
 *
 * Decision D1 makes 100% ref compatibility an absolute constraint for the styled
 * entrypoint. Phase 4 reimplements styled on top of the headless API and bridges the two
 * with an adapter — this file is the exam that adapter has to pass.
 */

const REF_SURFACE = {
  // Live values
  sourceFields: 'array',
  targetFields: 'array',
  mappings: 'array',
  redrawCount: 'number',

  // Readers
  getSourceFields: 'function',
  getTargetFields: 'function',
  getMappings: 'function',

  // Mapping mutations
  addMapping: 'function',
  removeMapping: 'function',
  clearMappings: 'function',
  updateMappings: 'function',
  sameLineMapping: 'function',
  sameNameMapping: 'function',

  // Source mutations
  appendSource: 'function',
  removeSource: 'function',
  updateSourceFields: 'function',
  updateSourceFieldValue: 'function',

  // Target mutations
  appendTarget: 'function',
  removeTarget: 'function',
  updateTargetFields: 'function',
  updateTargetFieldValue: 'function',

  // Measurement
  redraw: 'function',

  // Internal, but reachable through the public type — D1 keeps it working, which also
  // means removing it is a major-version change.
  _store: 'object',
} as const;

function kindOf(value: unknown): string {
  if (Array.isArray(value)) return 'array';
  if (value === null) return 'null';

  return typeof value;
}

describe('contract: the member set', () => {
  it('exposes every documented member with the expected kind', () => {
    const { ref } = renderConsumer();

    expect(ref.current).not.toBeNull();

    for (const [member, expectedKind] of Object.entries(REF_SURFACE)) {
      const actual = kindOf(ref.current![member as keyof typeof REF_SURFACE]);

      expect(actual, `ref.${member} should be a ${expectedKind}, got ${actual}`).toBe(expectedKind);
    }
  });

  it('exposes nothing beyond the documented member set', () => {
    const { ref } = renderConsumer();

    // A new member here is not automatically wrong — but it is a public API addition and
    // has to be an explicit decision, not a side effect of editing the hook.
    expect(Object.keys(ref.current!).sort()).toEqual(Object.keys(REF_SURFACE).sort());
  });

  it('recreates method identities on every render — they are not safe as effect deps', () => {
    const { ref } = renderConsumer();

    const before = ref.current!.addMapping;

    act(() => ref.current!.redraw());

    expect(ref.current!.redrawCount, 'a real re-render must have happened').toBe(1);

    // CURRENT behaviour, pinned deliberately. `useTableMapping` builds fresh closures each
    // render and `useImperativeHandle` carries no dependency array, so nothing is stable.
    // If phase 4 decides stable identities are part of the public promise, flip this to
    // .toBe(before) — that is a source change and a deliberate one, not a test tweak.
    expect(ref.current!.addMapping).not.toBe(before);

    // Whatever the identity, the method still works.
    act(() => ref.current!.addMapping('source-1', 'target-1'));
    expect(ref.current!.getMappings()).toEqual([mappingOf('source-1', 'target-1')]);
  });
});

describe('contract: reading state through the ref', () => {
  it('returns the current data', () => {
    const mapping = mappingOf('source-1', 'target-1');
    const harness = renderConsumer({ mappings: [mapping] });

    expect(harness.ref.current!.getSourceFields().map((s) => s.id)).toEqual(['source-1', 'source-2', 'source-3']);
    expect(harness.ref.current!.getTargetFields().map((t) => t.id)).toEqual(['target-1', 'target-2', 'target-3']);
    expect(harness.ref.current!.getMappings()).toEqual([mapping]);
  });

  it('reflects a mutation synchronously, before React re-renders', () => {
    const harness = renderConsumer();

    // Deliberately not wrapped in act(): the getter must not depend on a render pass.
    harness.ref.current!.addMapping('source-1', 'target-1');

    expect(harness.ref.current!.getMappings()).toEqual([mappingOf('source-1', 'target-1')]);

    act(() => {});
  });

  it('agrees with the live values once rendering settles', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-2', 'target-2'));

    const api = harness.ref.current!;

    expect(api.getMappings()).toEqual(api.mappings);
    expect(api.getSourceFields()).toEqual(api.sourceFields);
    expect(api.getTargetFields()).toEqual(api.targetFields);
  });

  it('agrees with what the consumer received through onMappingChange', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-1', 'target-3'));

    expect(harness.ref.current!.getMappings()).toEqual(harness.state().mappings);
  });

  it('reading does not emit', () => {
    const harness = renderConsumer();

    harness.ref.current!.getSourceFields();
    harness.ref.current!.getTargetFields();
    harness.ref.current!.getMappings();

    expect(harness.onMappingChange).not.toHaveBeenCalled();
  });
});

/**
 * `redraw` / `redrawCount` are deprecated but behaviour-preserving under D1 — explicitly
 * NOT no-ops. Phase 2 rewires redraw() onto the new geometry version counter; the
 * assertions below are what that rewiring has to keep true.
 */
describe('contract: forcing a re-measure', () => {
  function layout(root: HTMLElement, sourceY: number) {
    setRect(root.querySelector('.mapping-container'), { width: 600, height: 300 });
    setRect(root.querySelector('.mapping-svg'), { width: 600, height: 300 });
    setRect(root.querySelector('#connector-source-source-1'), { x: 190, y: sourceY, width: 10, height: 10 });
    setRect(root.querySelector('#connector-target-target-1'), { x: 400, y: 20, width: 10, height: 10 });
  }

  it('recomputes the line geometry', () => {
    const harness = renderConsumer({ mappings: [{ id: 'm', source: 'source-1', target: 'target-1' }] });

    layout(harness.container, 20);
    act(() => harness.ref.current!.redraw());

    const before = harness.container.querySelector('[data-testid="mapping-line-m"] .line-base')!.getAttribute('d');

    layout(harness.container, 200);
    act(() => harness.ref.current!.redraw());

    const after = harness.container.querySelector('[data-testid="mapping-line-m"] .line-base')!.getAttribute('d');

    expect(before).toBeTruthy();
    expect(after).not.toBe(before);
  });

  it('does not emit — it is a measurement trigger, not a mutation', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.redraw());
    act(() => harness.ref.current!.redraw());

    expect(harness.onMappingChange).not.toHaveBeenCalled();
  });

  it('leaves the data untouched', () => {
    const harness = renderConsumer({ mappings: [{ id: 'm', source: 'source-1', target: 'target-1' }] });

    const before = harness.state();

    act(() => harness.ref.current!.redraw());

    expect(harness.state()).toEqual(before);
  });

  it('redrawCount starts at zero and increments once per redraw', () => {
    const harness = renderConsumer();

    expect(harness.ref.current!.redrawCount).toBe(0);

    for (let i = 1; i <= 3; i++) {
      act(() => harness.ref.current!.redraw());

      expect(harness.ref.current!.redrawCount).toBe(i);
    }
  });

  it('redrawCount never decreases, so it is safe to use as a React key', () => {
    const harness = renderConsumer();

    const seen: number[] = [];

    for (let i = 0; i < 5; i++) {
      act(() => harness.ref.current!.redraw());
      seen.push(harness.ref.current!.redrawCount);
    }

    expect(seen).toEqual([...seen].sort((a, b) => a - b));
    expect(new Set(seen).size).toBe(seen.length);
  });
});
