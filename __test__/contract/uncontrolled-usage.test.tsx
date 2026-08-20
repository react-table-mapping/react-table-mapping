import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mappingOf, renderUncontrolled } from '../helpers/consumer';

/**
 * Contract: uncontrolled usage.
 *
 * `.claude/CLAUDE.md` used to describe this library as "fully controlled — owns no
 * persistent state". That was never true: the store's closure `state`
 * (`createTableMappingStore.ts:47-51`) is the real owner, and props only reconcile into it
 * when their reference changes (`useTableMapping.ts:45-51`). A consumer that supplies
 * initial values, never wires `onMappingChange` back into props, and drives the component
 * through `ref` instead is a legitimate, working mode — not an accident.
 *
 * This file uses `renderUncontrolled()` exclusively — the uncontrolled lens. The parent
 * hands down initial values only; an `onMappingChange` spy may be attached purely to
 * observe emissions, but nothing feeds its report back into props. There is no third mode:
 * a "controlled but the parent ignores it" harness is just this lens with a spy attached,
 * which is exactly what the two lenses below are — see `controlled-state.test.tsx` for the
 * companion controlled lens, where `renderConsumer()` always feeds the report back and
 * `state()` reads the parent's own state.
 *
 * The sharp edge (see `docs/HANDOFF.md` item C0): the reconciliation effect keys off
 * reference identity, not value identity. Stable references survive an unrelated parent
 * re-render; inline literal props (`sources={[...items]}`) do not — every render manufactures
 * a new reference, so the effect fires and overwrites whatever the user just did through ref.
 * This is pinned here as CURRENT behaviour, not desirable behaviour. Flipping it is a
 * deliberate phase-1 decision, not a bug fix to slip in alongside something else.
 */

describe('contract: mutating through ref with no onMappingChange at all', () => {
  it('applies a mapping and renders its line', () => {
    const harness = renderUncontrolled();

    act(() => harness.ref.current!.addMapping('source-1', 'target-2'));

    expect(harness.ref.current!.getMappings()).toEqual([mappingOf('source-1', 'target-2')]);
    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(1);
  });

  it('applies a row mutation (appendSource) and renders the new row', () => {
    const harness = renderUncontrolled();

    act(() =>
      harness.ref.current!.appendSource({
        id: 'source-new',
        key: 'source-new',
        name: { type: 'string', columnKey: 'name', value: 'New' },
      }),
    );

    expect(harness.ref.current!.getSourceFields().map((s) => s.id)).toContain('source-new');
    expect(harness.container.querySelectorAll('[id^="connector-source-"]')).toHaveLength(4);
  });

  it('applies a row mutation (removeSource) and drops the row and its mappings', () => {
    const harness = renderUncontrolled({ mappings: [mappingOf('source-1', 'target-1')] });

    act(() => harness.ref.current!.removeSource('source-1'));

    expect(harness.ref.current!.getSourceFields().map((s) => s.id)).not.toContain('source-1');
    expect(harness.ref.current!.getMappings()).toEqual([]);
    expect(harness.container.querySelectorAll('[id^="connector-source-"]')).toHaveLength(2);
  });
});

describe('contract: optimistic application with an onMappingChange spy attached', () => {
  it('applies a mutation and reports it, with no props round trip required', () => {
    const spy = vi.fn();
    const harness = renderUncontrolled({ onMappingChange: spy });

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));

    expect(spy).toHaveBeenCalledTimes(1);

    // Nothing feeds the report back into props here — that's the uncontrolled lens — so
    // there is no parent state to check. The component shows the mapping regardless.
    expect(harness.ref.current!.getMappings()).toEqual([mappingOf('source-1', 'target-1')]);
    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(1);
  });

  it('still yields to props once the parent does push', () => {
    const spy = vi.fn();
    const harness = renderUncontrolled({ onMappingChange: spy });

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));
    act(() => harness.pushProps({ mappings: [mappingOf('source-3', 'target-3')] }));

    expect(harness.ref.current!.getMappings()).toEqual([mappingOf('source-3', 'target-3')]);
  });
});

describe('contract: stable prop references survive an unrelated re-render', () => {
  it('keeps a ref-applied mapping after the parent re-renders for an unrelated reason', () => {
    const harness = renderUncontrolled({ propMode: 'stable' });

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));
    expect(harness.ref.current!.getMappings()).toHaveLength(1);

    act(() => harness.rerenderParent());

    expect(harness.ref.current!.getMappings()).toEqual([mappingOf('source-1', 'target-1')]);
    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(1);
  });
});

describe('contract: inline literal props reset on an unrelated re-render (documented sharp edge, C0)', () => {
  it('wipes a ref-applied mapping the parent never knew about', () => {
    const harness = renderUncontrolled({ propMode: 'inline' });

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));
    expect(harness.ref.current!.getMappings()).toHaveLength(1);

    // Nothing about this re-render mentions mappings — but 'inline' mode means the parent
    // hands down a brand-new array literal every render, so the reconciliation effect fires
    // and the mutation the ref just made is discarded.
    act(() => harness.rerenderParent());

    expect(harness.ref.current!.getMappings()).toEqual([]);
    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(0);
  });
});

describe('contract: a reference-changing props push cancels an in-flight field-edit debounce', () => {
  it('drops the pending edit instead of emitting it after the push', () => {
    vi.useFakeTimers();

    const onMappingChange = vi.fn();
    const harness = renderUncontrolled({ onMappingChange });

    // target-1's editable field is the first (and only) <input> — sources are non-editable
    // ('string' type) in the shared fixture.
    const input = harness.container.querySelectorAll('input')[0];

    act(() => {
      fireEvent.change(input, { target: { value: 'TYPED' } });
    });

    // A deliberate reference-changing push arrives before the 300ms debounce fires.
    act(() => {
      harness.pushProps({
        targets: [{ id: 'target-1', key: 'target-1', name: { type: 'input', columnKey: 'name', value: 'PUSHED' } }],
      });
    });

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // The pushed value wins — the typed edit was cancelled, not merely overtaken.
    expect(harness.container.querySelectorAll('input')[0].value).toBe('PUSHED');
    expect(onMappingChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.objectContaining({ type: 'UPDATE_TARGET_FIELD_VALUE' }) }),
    );

    vi.useRealTimers();
  });
});
