import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mappingOf, renderConsumer, sourceFixture, targetFixture } from '../helpers/consumer';

/**
 * Contract: the controlled-props round trip.
 *
 * This is the architectural promise the whole library rests on — props in, actions out,
 * parent feeds the result back. It is also the promise most at risk in phase 4, where the
 * styled layer is rebuilt on top of the headless hook and the reconciliation path moves.
 *
 * This file uses `renderConsumer()` exclusively — the controlled lens, where the parent
 * always feeds `onMappingChange`'s report back into props, and `state()` reads the parent's
 * own state so an assertion only passes once that round trip has actually completed.
 *
 * The component's optimistic behaviour — mutations landing in the store immediately and
 * surviving a parent that never pushes anything back — is a property of the uncontrolled
 * lens instead, and is pinned in `uncontrolled-usage.test.tsx`
 * (`contract: mutating through ref with no onMappingChange at all`).
 */

describe('contract: props flow in', () => {
  it('renders exactly the rows and mappings it was given', () => {
    const harness = renderConsumer({
      sources: sourceFixture(2),
      targets: targetFixture(4),
      mappings: [mappingOf('source-1', 'target-3')],
    });

    expect(harness.container.querySelectorAll('[id^="connector-source-"]')).toHaveLength(2);
    expect(harness.container.querySelectorAll('[id^="connector-target-"]')).toHaveLength(4);
    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(1);
  });

  it('adopts new props pushed by the parent', () => {
    const harness = renderConsumer();

    act(() => harness.push({ mappings: [mappingOf('source-2', 'target-2')] }));

    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(1);
    expect(harness.ref.current!.getMappings()).toEqual([mappingOf('source-2', 'target-2')]);
  });

  it('lets the parent overrule a mutation it just reported', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));
    expect(harness.ref.current!.getMappings()).toHaveLength(1);

    // Parent rejects the change and pushes its own truth back.
    act(() => harness.push({ mappings: [] }));

    expect(harness.ref.current!.getMappings()).toEqual([]);
    expect(harness.container.querySelectorAll('[data-testid^="mapping-line-"]')).toHaveLength(0);
  });

  it('adopts replaced rows', () => {
    const harness = renderConsumer();

    act(() => harness.push({ sources: sourceFixture(1) }));

    expect(harness.container.querySelectorAll('[id^="connector-source-"]')).toHaveLength(1);
  });
});

describe('contract: actions flow out', () => {
  it('delivers the full state alongside the action', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));

    const [payload] = harness.onMappingChange.mock.calls.at(-1)!;

    expect(Object.keys(payload).sort()).toEqual(['action', 'mappings', 'sources', 'targets']);
    expect(payload.sources).toHaveLength(3);
    expect(payload.targets).toHaveLength(3);
    expect(payload.mappings).toEqual([mappingOf('source-1', 'target-1')]);
    expect(payload.action.type).toBe('ADD_MAPPING');
  });

  it('does not fire on mount', () => {
    const harness = renderConsumer({ mappings: [mappingOf('source-1', 'target-1')] });

    expect(harness.onMappingChange).not.toHaveBeenCalled();
  });

  it('reports every mutation exactly once, in order', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));
    act(() => harness.ref.current!.removeMapping(mappingOf('source-1', 'target-1').id));
    act(() => harness.ref.current!.sameLineMapping());

    expect(harness.actionTypes()).toEqual(['ADD_MAPPING', 'REMOVE_MAPPING', 'SAME_LINE_MAPPING']);
    expect(harness.onMappingChange).toHaveBeenCalledTimes(3);
  });
});

describe('contract: onAfterMappingChange', () => {
  it('fires on mount with the initial state', () => {
    const onAfter = vi.fn();

    renderConsumer({ mappings: [mappingOf('source-1', 'target-1')], onAfterMappingChange: onAfter });

    expect(onAfter).toHaveBeenCalledTimes(1);
    expect(onAfter.mock.calls[0][0].mappings).toEqual([mappingOf('source-1', 'target-1')]);
  });

  it('carries state but no action', () => {
    const onAfter = vi.fn();
    const harness = renderConsumer({ onAfterMappingChange: onAfter });

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));

    const payload = onAfter.mock.calls.at(-1)![0];

    expect(Object.keys(payload).sort()).toEqual(['mappings', 'sources', 'targets']);
    expect(payload).not.toHaveProperty('action');
  });

  it('fires when mappings change', () => {
    const onAfter = vi.fn();
    const harness = renderConsumer({ onAfterMappingChange: onAfter });

    const onMount = onAfter.mock.calls.length;

    act(() => harness.ref.current!.addMapping('source-1', 'target-1'));

    expect(onAfter.mock.calls.length).toBeGreaterThan(onMount);
    expect(onAfter.mock.calls.at(-1)![0].mappings).toEqual([mappingOf('source-1', 'target-1')]);
  });

  it('does not fire when only a field value changes', () => {
    const onAfter = vi.fn();
    const harness = renderConsumer({ onAfterMappingChange: onAfter });

    const onMount = onAfter.mock.calls.length;

    act(() => harness.ref.current!.updateTargetFieldValue('target-1', 'name', 'RENAMED'));

    expect(onAfter.mock.calls.length).toBe(onMount);
  });
});
