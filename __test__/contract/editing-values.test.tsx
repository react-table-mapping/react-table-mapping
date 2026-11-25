import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import type { FieldItemInput } from '@/types/table-mapping';

import { renderConsumer, targetFixture } from '../helpers/consumer';

/**
 * Contract: editing a field's value.
 *
 * Two paths with deliberately different timing — the programmatic ref methods emit
 * immediately, while typing into a cell is debounced (300ms by default). Both must end up
 * reflected in the parent's state and in the rendered input.
 *
 * The typing-driven cases below were absorbed from `unit/EditableCell.test.tsx` (its own
 * hand-rolled harness is gone in favour of `renderConsumer`) and from the debounce-timing
 * cases in `unit/createTableMappingStore.test.ts:117-157`, re-expressed as behaviour a
 * consumer of `<TableMapping>` can observe rather than store internals. The
 * "BUG FIX" case is the regression test for the shipped v1.0.2 bug (commit 9ae69bc):
 * rapid typing across sibling cells used to lose values on the props round trip.
 *
 * The final section closes the C1 gap from `docs/HANDOFF.md`: `applyExternalProps`
 * cancels in-flight debounce timers for whichever side's prop reference changed
 * (`_cancelTimersForSide`), and echo-detection is what stops a field's own emit from
 * cancelling its siblings' pending edits. The target side was already covered in
 * `uncontrolled-usage.test.tsx`; the source side had no coverage at all.
 *
 * `sourceFixture()` (the default here) renders `type: 'string'` — a static div, not an
 * input — so the source-side cases below build their own `type: 'input'` fixture locally.
 */

function editableSourceFixture(count = 3): FieldItemInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `source-${i + 1}`,
    key: `source-${i + 1}`,
    name: { type: 'input' as const, columnKey: 'name', value: `S${i + 1}` },
  }));
}

describe('contract: setting a value through the ref', () => {
  it('updates a source value and emits immediately, with no debounce', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.updateSourceFieldValue('source-1', 'name', 'CHANGED'));

    expect(harness.lastAction()).toEqual({
      type: 'UPDATE_SOURCE_FIELD_VALUE',
      payload: { sourceId: 'source-1', fieldKey: 'name', newValue: 'CHANGED' },
    });

    expect(harness.state().sources.find((s) => s.id === 'source-1')!.name).toMatchObject({ value: 'CHANGED' });
  });

  it('updates a target value and emits immediately, with no debounce', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.updateTargetFieldValue('target-1', 'name', 'CHANGED'));

    expect(harness.lastAction()).toEqual({
      type: 'UPDATE_TARGET_FIELD_VALUE',
      payload: { targetId: 'target-1', fieldKey: 'name', newValue: 'CHANGED' },
    });

    expect(harness.state().targets.find((t) => t.id === 'target-1')!.name).toMatchObject({ value: 'CHANGED' });
  });

  it('is reflected in the rendered input', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.updateTargetFieldValue('target-1', 'name', 'VISIBLE'));

    const values = Array.from(harness.container.querySelectorAll('input')).map((i) => i.value);

    expect(values).toContain('VISIBLE');
  });
});

describe('contract: value updates that address nothing', () => {
  it('stays silent for an unknown field id', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.updateSourceFieldValue('source-nope', 'name', 'X'));
    act(() => harness.ref.current!.updateTargetFieldValue('target-nope', 'name', 'X'));

    expect(harness.onMappingChange).not.toHaveBeenCalled();
  });

  it('stays silent for an unknown column key', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.updateSourceFieldValue('source-1', 'not-a-column', 'X'));
    act(() => harness.ref.current!.updateTargetFieldValue('target-1', 'not-a-column', 'X'));

    expect(harness.onMappingChange).not.toHaveBeenCalled();
  });
});

// ─── Typing into a cell (absorbed from unit/EditableCell.test.tsx) ───────────────────────

describe('contract: typing into a cell', () => {
  it('renders the initial values from props', () => {
    const harness = renderConsumer();

    const values = Array.from(harness.container.querySelectorAll<HTMLInputElement>('.target-table-body input')).map(
      (input) => input.value,
    );

    expect(values).toEqual(['T1', 'T2', 'T3']);
  });

  it('updates the displayed value immediately, with no debounce on display', () => {
    const harness = renderConsumer();
    const input = harness.container.querySelectorAll<HTMLInputElement>('.target-table-body input')[0];

    act(() => fireEvent.change(input, { target: { value: 'hello' } }));

    expect(input.value).toBe('hello');
    expect(harness.onMappingChange).not.toHaveBeenCalled();
  });
});

describe('contract: BUG FIX — rapid edits across sibling target cells survive the debounce round trip (v1.0.2, commit 9ae69bc)', () => {
  it('preserves every sibling value after the debounce fires and the emit round-trips through props', async () => {
    vi.useFakeTimers();
    const harness = renderConsumer();
    const [i1, i2, i3] = harness.container.querySelectorAll<HTMLInputElement>('.target-table-body input');

    // Rapid sequential edits across all three sibling cells, in one tick.
    act(() => {
      fireEvent.change(i1, { target: { value: 'X' } });
      fireEvent.change(i2, { target: { value: 'Y' } });
      fireEvent.change(i3, { target: { value: 'Z' } });
    });

    expect(i1.value).toBe('X');
    expect(i2.value).toBe('Y');
    expect(i3.value).toBe('Z');

    // Advance past the debounce — emit fires, parent setState, new props, echo-aware reconcile.
    await act(async () => {
      vi.advanceTimersByTime(400);
    });

    // All three values must survive the round trip.
    expect(i1.value).toBe('X');
    expect(i2.value).toBe('Y');
    expect(i3.value).toBe('Z');
    expect(harness.state().targets.map((t) => t.name)).toEqual([
      expect.objectContaining({ value: 'X' }),
      expect.objectContaining({ value: 'Y' }),
      expect.objectContaining({ value: 'Z' }),
    ]);

    vi.useRealTimers();
  });
});

describe('contract: an external props push overrides a displayed target value', () => {
  it('shows the pushed value in the input', () => {
    const harness = renderConsumer();

    act(() =>
      harness.push({
        targets: [
          { id: 'target-1', key: 'target-1', name: { type: 'input' as const, columnKey: 'name', value: 'EXTERNAL' } },
          ...targetFixture(3).slice(1),
        ],
      }),
    );

    const input = harness.container.querySelectorAll<HTMLInputElement>('.target-table-body input')[0];
    expect(input.value).toBe('EXTERNAL');
  });
});

// ─── Debounce timing (promoted from unit/createTableMappingStore.test.ts:117-157) ────────

describe('contract: typing debounce timing', () => {
  it('does not reach onMappingChange before 300ms, and does after', () => {
    vi.useFakeTimers();
    const harness = renderConsumer({ sources: editableSourceFixture() });
    const input = harness.container.querySelectorAll<HTMLInputElement>('.source-table-body input')[0];

    act(() => fireEvent.change(input, { target: { value: 'typed' } }));

    act(() => {
      vi.advanceTimersByTime(200);
    });
    expect(harness.onMappingChange).not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(100);
    });
    expect(harness.onMappingChange).toHaveBeenCalledTimes(1);
    expect(harness.lastAction()).toMatchObject({
      type: 'UPDATE_SOURCE_FIELD_VALUE',
      payload: { sourceId: 'source-1', fieldKey: 'name', newValue: 'typed' },
    });

    vi.useRealTimers();
  });

  it('collapses rapid typing into a single emit carrying the last value (last-wins)', () => {
    vi.useFakeTimers();
    const harness = renderConsumer({ sources: editableSourceFixture() });
    const input = harness.container.querySelectorAll<HTMLInputElement>('.source-table-body input')[0];

    act(() => {
      fireEvent.change(input, { target: { value: 'a' } });
      fireEvent.change(input, { target: { value: 'ab' } });
      fireEvent.change(input, { target: { value: 'abc' } });
    });

    act(() => {
      vi.advanceTimersByTime(300);
    });

    expect(harness.onMappingChange).toHaveBeenCalledTimes(1);
    expect(harness.lastAction()).toMatchObject({
      type: 'UPDATE_SOURCE_FIELD_VALUE',
      payload: { newValue: 'abc' },
    });

    vi.useRealTimers();
  });
});

describe('contract: different fields keep independent debounce timers', () => {
  it('commits each column on its own schedule, without one cancelling the other', () => {
    vi.useFakeTimers();
    const targets: FieldItemInput[] = [
      {
        id: 'target-1',
        key: 'target-1',
        name: { type: 'input' as const, columnKey: 'name', value: 'N1' },
        data: { type: 'input' as const, columnKey: 'data', value: 'D1' },
      },
    ];
    const harness = renderConsumer({
      targets,
      targetColumns: [
        { key: 'name', title: 'Name' },
        { key: 'data', title: 'Data' },
      ],
    });

    const [nameInput, dataInput] = harness.container.querySelectorAll<HTMLInputElement>('.target-table-body input');

    act(() => fireEvent.change(nameInput, { target: { value: 'NAME-EDIT' } }));
    expect(harness.onMappingChange, 'a keystroke must not reach the consumer on its own').not.toHaveBeenCalled();

    act(() => {
      vi.advanceTimersByTime(200);
    });
    act(() => fireEvent.change(dataInput, { target: { value: 'DATA-EDIT' } }));

    // name's timer started at t=0 and elapses at t=300; data's started at t=200.
    act(() => {
      vi.advanceTimersByTime(100); // t=300
    });
    expect(harness.actionTypes()).toEqual(['UPDATE_TARGET_FIELD_VALUE']);
    expect(harness.lastAction()).toMatchObject({
      payload: { targetId: 'target-1', fieldKey: 'name', newValue: 'NAME-EDIT' },
    });

    act(() => {
      vi.advanceTimersByTime(200); // t=500 — data's own 300ms since t=200 has now elapsed
    });
    expect(harness.actionTypes()).toEqual(['UPDATE_TARGET_FIELD_VALUE', 'UPDATE_TARGET_FIELD_VALUE']);
    expect(harness.lastAction()).toMatchObject({
      payload: { targetId: 'target-1', fieldKey: 'data', newValue: 'DATA-EDIT' },
    });

    vi.useRealTimers();
  });
});

// ─── C1 gap: source-side debounce cancellation (docs/HANDOFF.md) ─────────────────────────

describe('contract: a reference-changing props push cancels an in-flight source-side edit (C1 gap)', () => {
  it('drops the pending source edit instead of emitting it after the push', () => {
    vi.useFakeTimers();
    const harness = renderConsumer({ sources: editableSourceFixture(1) });
    const input = harness.container.querySelectorAll<HTMLInputElement>('.source-table-body input')[0];

    act(() => fireEvent.change(input, { target: { value: 'TYPED' } }));

    // A deliberate reference-changing push arrives before the 300ms debounce fires.
    act(() =>
      harness.push({
        sources: [
          { id: 'source-1', key: 'source-1', name: { type: 'input' as const, columnKey: 'name', value: 'PUSHED' } },
        ],
      }),
    );

    act(() => {
      vi.advanceTimersByTime(400);
    });

    // The pushed value wins — the typed edit was cancelled, not merely overtaken.
    expect(harness.container.querySelectorAll<HTMLInputElement>('.source-table-body input')[0].value).toBe('PUSHED');
    expect(harness.onMappingChange).not.toHaveBeenCalledWith(
      expect.objectContaining({ action: expect.objectContaining({ type: 'UPDATE_SOURCE_FIELD_VALUE' }) }),
    );

    vi.useRealTimers();
  });
});

describe('contract: source-side siblings survive their own round-trip echo (C1 gap)', () => {
  it('preserves a still-pending sibling edit when the first field emits and echoes back through props', async () => {
    vi.useFakeTimers();
    const harness = renderConsumer({ sources: editableSourceFixture(2) });
    const [i1, i2] = harness.container.querySelectorAll<HTMLInputElement>('.source-table-body input');

    act(() => fireEvent.change(i1, { target: { value: 'FIRST' } }));

    // i2's edit starts partway through i1's debounce window, so i2's own timer is still
    // pending — not yet fired — at the moment i1's timer fires and its emit echoes back
    // through props. That echo is what a misdetected-as-external reconcile would wrongly
    // cancel, the same class of bug the v1.0.2 fix closed for targets (see the BUG FIX
    // case above). Typing both at once would let both timers expire in the same tick with
    // no round trip in between, which would not exercise the race at all.
    act(() => {
      vi.advanceTimersByTime(100);
    });
    act(() => fireEvent.change(i2, { target: { value: 'SECOND' } }));

    // i1's timer (started at t=0) fires at t=300, well before i2's (started at t=100, due at t=400).
    await act(async () => {
      vi.advanceTimersByTime(200); // t=300 — i1 fires and its round trip completes
    });
    await act(async () => {
      vi.advanceTimersByTime(200); // t=500 — past i2's own expiry
    });

    expect(i1.value).toBe('FIRST');
    expect(i2.value).toBe('SECOND');
    expect(harness.actionTypes().filter((type) => type === 'UPDATE_SOURCE_FIELD_VALUE')).toHaveLength(2);

    vi.useRealTimers();
  });
});
