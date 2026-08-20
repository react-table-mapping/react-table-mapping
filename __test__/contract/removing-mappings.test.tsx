import { act, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { mappingOf, renderConsumer } from '../helpers/consumer';

/**
 * Contract: removing mappings.
 *
 * Two entry points for the same behaviour — the imperative `ref.removeMapping` and clicking
 * the line itself — plus the bulk replacements. The veto protocol on the click path is the
 * part consumers build "are you sure?" flows on, so a regression there silently deletes
 * their data.
 */

const MAPPING = mappingOf('source-1', 'target-2');

function clickLine(container: HTMLElement, mappingId: string) {
  const hitArea = container.querySelector(`[data-testid="mapping-line-${mappingId}"] .hover-area`);

  expect(hitArea, `no hit area rendered for ${mappingId}`).not.toBeNull();

  act(() => {
    fireEvent.click(hitArea!);
  });
}

describe('contract: removing one mapping through the ref', () => {
  it('removes by mapping id and reports what was removed', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });

    act(() => harness.ref.current!.removeMapping(MAPPING.id));

    expect(harness.lastAction()).toEqual({
      type: 'REMOVE_MAPPING',
      payload: { mappingId: MAPPING.id, removedMapping: MAPPING },
    });

    expect(harness.state().mappings).toEqual([]);
  });

  it('reports an undefined removal for an unknown id', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });

    act(() => harness.ref.current!.removeMapping('mapping-does-not-exist'));

    expect(harness.lastAction()).toMatchObject({
      type: 'REMOVE_MAPPING',
      payload: { mappingId: 'mapping-does-not-exist', removedMapping: undefined },
    });

    expect(harness.state().mappings).toHaveLength(1);
  });
});

describe('contract: removing a mapping by clicking its line', () => {
  it('calls before, removes, then calls after — in that order', () => {
    const order: string[] = [];
    const onBefore = vi.fn(() => {
      order.push('before');
    });
    const onAfter = vi.fn(() => {
      order.push('after');
    });

    const harness = renderConsumer({
      mappings: [MAPPING],
      onBeforeMappingLineRemove: onBefore,
      onAfterMappingLineRemove: onAfter,
    });

    clickLine(harness.container, MAPPING.id);

    expect(onBefore).toHaveBeenCalledWith(MAPPING.id);
    expect(onAfter).toHaveBeenCalledWith(MAPPING.id);
    expect(order).toEqual(['before', 'after']);
    expect(harness.state().mappings).toEqual([]);
  });

  it('cancels the removal when onBefore returns false', () => {
    const onAfter = vi.fn();
    const harness = renderConsumer({
      mappings: [MAPPING],
      onBeforeMappingLineRemove: () => false,
      onAfterMappingLineRemove: onAfter,
    });

    clickLine(harness.container, MAPPING.id);

    expect(onAfter).not.toHaveBeenCalled();
    expect(harness.onMappingChange).not.toHaveBeenCalled();
    expect(harness.state().mappings).toEqual([MAPPING]);
  });

  it('removes only the clicked line', () => {
    const other = mappingOf('source-2', 'target-1');
    const harness = renderConsumer({ mappings: [MAPPING, other] });

    clickLine(harness.container, MAPPING.id);

    expect(harness.state().mappings).toEqual([other]);
  });

  it('fires neither callback while disabled', () => {
    const onBefore = vi.fn();
    const onAfter = vi.fn();

    const harness = renderConsumer({
      mappings: [MAPPING],
      disabled: true,
      onBeforeMappingLineRemove: onBefore,
      onAfterMappingLineRemove: onAfter,
    });

    clickLine(harness.container, MAPPING.id);

    expect(onBefore).not.toHaveBeenCalled();
    expect(onAfter).not.toHaveBeenCalled();
    expect(harness.state().mappings).toEqual([MAPPING]);
  });

  it('works without either callback supplied', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });

    clickLine(harness.container, MAPPING.id);

    expect(harness.state().mappings).toEqual([]);
  });
});

describe('contract: clearing and replacing the whole list', () => {
  it('clearMappings empties the list and hands back everything it cleared', () => {
    const mappings = [mappingOf('source-1', 'target-1'), mappingOf('source-2', 'target-2')];
    const harness = renderConsumer({ mappings });

    act(() => harness.ref.current!.clearMappings());

    expect(harness.lastAction()).toEqual({ type: 'CLEAR_MAPPINGS', payload: { clearedMappings: mappings } });
    expect(harness.state().mappings).toEqual([]);
  });

  it('updateMappings replaces the list and reports both sides of the swap', () => {
    const previous = [mappingOf('source-1', 'target-1')];
    const next = [mappingOf('source-2', 'target-2'), mappingOf('source-3', 'target-3')];
    const harness = renderConsumer({ mappings: previous });

    act(() => harness.ref.current!.updateMappings(next));

    expect(harness.lastAction()).toEqual({
      type: 'UPDATE_MAPPINGS',
      payload: { previousMappings: previous, newMappings: next },
    });

    expect(harness.state().mappings).toEqual(next);
  });
});
