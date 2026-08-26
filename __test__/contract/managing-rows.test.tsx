import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mappingOf, removeButtons, renderConsumer, sourceFixture, targetFixture } from '../helpers/consumer';

/**
 * Contract: adding and removing rows.
 *
 * Source and target are deliberately asserted separately rather than parameterised — they
 * are two independent promises, and phase 4 could plausibly break one and not the other.
 *
 * The cross-cutting rule worth protecting is the cascade: removing a row must take the
 * mappings that referenced it, while replacing the whole list must not.
 */

const NEW_SOURCE = {
  id: 'source-new',
  key: 'source-new',
  name: { type: 'string' as const, columnKey: 'name', value: 'NEW' },
};

const NEW_TARGET = {
  id: 'target-new',
  key: 'target-new',
  name: { type: 'input' as const, columnKey: 'name', value: 'NEW' },
};

function clickRemove(container: HTMLElement, side: 'source' | 'target', index: number) {
  act(() => {
    fireEvent.click(removeButtons(container, side)[index]);
  });
}

describe('contract: appending a source row', () => {
  it('appends to the end and reports the added field', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.appendSource(NEW_SOURCE));

    expect(harness.lastAction()).toMatchObject({ type: 'APPEND_SOURCE', payload: { source: NEW_SOURCE } });

    const { sources } = harness.state();

    expect(sources).toHaveLength(4);
    expect(sources.at(-1)).toMatchObject({ id: 'source-new' });
  });

  it('generates a prefixed id when none is supplied', () => {
    const harness = renderConsumer();

    act(() =>
      harness.ref.current!.appendSource({ key: 'a', name: { type: 'string', columnKey: 'name', value: 'A' } } as never),
    );
    act(() =>
      harness.ref.current!.appendSource({ key: 'b', name: { type: 'string', columnKey: 'name', value: 'B' } } as never),
    );

    const generated = harness
      .state()
      .sources.slice(-2)
      .map((s) => s.id!);

    // The id scheme itself is free to change (phase 1 swaps uuid for crypto.randomUUID);
    // what is promised is a non-empty unique id under the `source-` namespace.
    for (const id of generated) {
      expect(id.startsWith('source-')).toBe(true);
      expect(id.length).toBeGreaterThan('source-'.length);
    }

    expect(new Set(generated).size).toBe(2);
  });

  it('renders a connector for the appended row', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.appendSource(NEW_SOURCE));

    expect(harness.container.querySelector('#connector-source-source-new')).not.toBeNull();
  });
});

describe('contract: appending a target row', () => {
  it('appends to the end and reports the added field', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.appendTarget(NEW_TARGET));

    expect(harness.lastAction()).toMatchObject({ type: 'APPEND_TARGET', payload: { target: NEW_TARGET } });

    const { targets } = harness.state();

    expect(targets).toHaveLength(4);
    expect(targets.at(-1)).toMatchObject({ id: 'target-new' });
  });

  it('generates a prefixed id when none is supplied', () => {
    const harness = renderConsumer();

    act(() =>
      harness.ref.current!.appendTarget({ key: 'a', name: { type: 'input', columnKey: 'name', value: 'A' } } as never),
    );
    act(() =>
      harness.ref.current!.appendTarget({ key: 'b', name: { type: 'input', columnKey: 'name', value: 'B' } } as never),
    );

    const generated = harness
      .state()
      .targets.slice(-2)
      .map((t) => t.id!);

    for (const id of generated) {
      expect(id.startsWith('target-')).toBe(true);
      expect(id.length).toBeGreaterThan('target-'.length);
    }

    expect(new Set(generated).size).toBe(2);
  });

  it('renders a connector for the appended row', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.appendTarget(NEW_TARGET));

    expect(harness.container.querySelector('#connector-target-target-new')).not.toBeNull();
  });
});

describe('contract: removing a row through the ref', () => {
  it('removeSource takes the mappings that referenced it', () => {
    const kept = mappingOf('source-3', 'target-3');
    const harness = renderConsumer({
      mappings: [mappingOf('source-1', 'target-1'), mappingOf('source-1', 'target-2'), kept],
    });

    act(() => harness.ref.current!.removeSource('source-1'));

    expect(harness.lastAction()).toEqual({
      type: 'REMOVE_SOURCE',
      payload: {
        sourceId: 'source-1',
        removedMappings: [mappingOf('source-1', 'target-1'), mappingOf('source-1', 'target-2')],
      },
    });

    expect(harness.state().sources.map((s) => s.id)).toEqual(['source-2', 'source-3']);
    expect(harness.state().mappings).toEqual([kept]);
  });

  it('removeTarget takes the mappings that referenced it', () => {
    const kept = mappingOf('source-3', 'target-3');
    const harness = renderConsumer({
      mappings: [mappingOf('source-1', 'target-1'), mappingOf('source-2', 'target-1'), kept],
    });

    act(() => harness.ref.current!.removeTarget('target-1'));

    expect(harness.lastAction()).toEqual({
      type: 'REMOVE_TARGET',
      payload: {
        targetId: 'target-1',
        removedMappings: [mappingOf('source-1', 'target-1'), mappingOf('source-2', 'target-1')],
      },
    });

    expect(harness.state().targets.map((t) => t.id)).toEqual(['target-2', 'target-3']);
    expect(harness.state().mappings).toEqual([kept]);
  });

  it('emits even when the id is unknown, leaving state intact', () => {
    const harness = renderConsumer();

    act(() => harness.ref.current!.removeSource('source-nope'));

    expect(harness.lastAction()).toMatchObject({ type: 'REMOVE_SOURCE', payload: { removedMappings: [] } });
    expect(harness.state().sources).toHaveLength(3);

    act(() => harness.ref.current!.removeTarget('target-nope'));

    expect(harness.lastAction()).toMatchObject({ type: 'REMOVE_TARGET', payload: { removedMappings: [] } });
    expect(harness.state().targets).toHaveLength(3);
  });
});

describe('contract: replacing the whole row list', () => {
  it('updateSourceFields swaps the list and reports both sides', () => {
    const previous = sourceFixture(3);
    const next = sourceFixture(1);
    const harness = renderConsumer({ sources: previous });

    act(() => harness.ref.current!.updateSourceFields(next as never));

    expect(harness.lastAction()).toEqual({
      type: 'UPDATE_SOURCE_FIELDS',
      payload: { previousSources: previous, newSources: next },
    });
    expect(harness.state().sources).toEqual(next);
  });

  it('updateTargetFields swaps the list and reports both sides', () => {
    const previous = targetFixture(3);
    const next = targetFixture(1);
    const harness = renderConsumer({ targets: previous });

    act(() => harness.ref.current!.updateTargetFields(next as never));

    expect(harness.lastAction()).toEqual({
      type: 'UPDATE_TARGET_FIELDS',
      payload: { previousTargets: previous, newTargets: next },
    });
    expect(harness.state().targets).toEqual(next);
  });

  it('does not prune mappings that point at rows the swap dropped', () => {
    // Documented asymmetry against removeSource/removeTarget, which do clean up.
    const harness = renderConsumer({ mappings: [mappingOf('source-3', 'target-1')] });

    act(() => harness.ref.current!.updateSourceFields(sourceFixture(1) as never));

    expect(harness.state().mappings).toEqual([mappingOf('source-3', 'target-1')]);
  });
});

describe('contract: removing a row through its button', () => {
  it('calls before, removes, then calls after — source side', () => {
    const order: string[] = [];
    const onBefore = vi.fn(() => {
      order.push('before');
    });
    const onAfter = vi.fn(() => {
      order.push('after');
    });

    const harness = renderConsumer({
      onBeforeSourceFieldRemove: onBefore,
      onAfterSourceFieldRemove: onAfter,
    });

    clickRemove(harness.container, 'source', 0);

    expect(onBefore).toHaveBeenCalledWith('source-1');
    expect(onAfter).toHaveBeenCalledWith('source-1');
    expect(order).toEqual(['before', 'after']);
    expect(harness.state().sources.map((s) => s.id)).toEqual(['source-2', 'source-3']);
  });

  it('calls before, removes, then calls after — target side', () => {
    const order: string[] = [];
    const onBefore = vi.fn(() => {
      order.push('before');
    });
    const onAfter = vi.fn(() => {
      order.push('after');
    });

    const harness = renderConsumer({
      onBeforeTargetFieldRemove: onBefore,
      onAfterTargetFieldRemove: onAfter,
    });

    clickRemove(harness.container, 'target', 0);

    expect(onBefore).toHaveBeenCalledWith('target-1');
    expect(onAfter).toHaveBeenCalledWith('target-1');
    expect(order).toEqual(['before', 'after']);
    expect(harness.state().targets.map((t) => t.id)).toEqual(['target-2', 'target-3']);
  });

  it('cancels the removal when onBefore returns false — source side', () => {
    const onAfter = vi.fn();
    const harness = renderConsumer({
      onBeforeSourceFieldRemove: () => false,
      onAfterSourceFieldRemove: onAfter,
    });

    clickRemove(harness.container, 'source', 0);

    expect(onAfter).not.toHaveBeenCalled();
    expect(harness.onMappingChange).not.toHaveBeenCalled();
    expect(harness.state().sources).toHaveLength(3);
  });

  it('cancels the removal when onBefore returns false — target side', () => {
    const onAfter = vi.fn();
    const harness = renderConsumer({
      onBeforeTargetFieldRemove: () => false,
      onAfterTargetFieldRemove: onAfter,
    });

    clickRemove(harness.container, 'target', 0);

    expect(onAfter).not.toHaveBeenCalled();
    expect(harness.state().targets).toHaveLength(3);
  });

  it('proceeds for any non-false return, including undefined and true', () => {
    for (const value of [undefined, true] as const) {
      const harness = renderConsumer({ onBeforeSourceFieldRemove: () => value });

      clickRemove(harness.container, 'source', 0);

      expect(harness.state().sources, `return value ${String(value)} should not cancel`).toHaveLength(2);

      harness.unmount();
    }
  });

  it('a cancelled removal also spares the related mappings', () => {
    const mapping = mappingOf('source-1', 'target-1');
    const harness = renderConsumer({ mappings: [mapping], onBeforeSourceFieldRemove: () => false });

    clickRemove(harness.container, 'source', 0);

    expect(harness.state().mappings).toEqual([mapping]);
  });

  it('works without either callback supplied', () => {
    const harness = renderConsumer();

    clickRemove(harness.container, 'source', 0);

    expect(harness.state().sources).toHaveLength(2);
  });

  it('renders no remove buttons at all while disabled', () => {
    const harness = renderConsumer({ disabled: true });

    expect(removeButtons(harness.container, 'source')).toHaveLength(0);
    expect(removeButtons(harness.container, 'target')).toHaveLength(0);
  });
});
