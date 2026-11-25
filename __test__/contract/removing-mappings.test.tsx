import { act, fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
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

/**
 * Removing a line without a mouse. The line is a named control, focus makes it the line being
 * addressed (what hovering does), and Enter or Space removes it. What stays in e2e: that a real
 * browser focuses an SVG `<g>` the same way in every engine, and that no outline box is drawn
 * around the canvas (`e2e/keyboard.spec.ts`).
 */
describe('contract: removing a mapping with the keyboard', () => {
  const line = (container: HTMLElement, id: string) =>
    container.querySelector<SVGGElement>(`[data-testid="mapping-line-${id}"]`)!;
  const liveRegion = (container: HTMLElement) => container.querySelector('[role="status"][aria-live="polite"]')!;

  it('the line is a button that says which two rows it joins', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });

    expect(line(harness.container, MAPPING.id)).toHaveAttribute('role', 'button');
    expect(line(harness.container, MAPPING.id)).toHaveAttribute('aria-label', expect.stringContaining('S1 to T2'));
  });

  it('Enter on a focused line removes it', async () => {
    const user = userEvent.setup();
    const other = mappingOf('source-2', 'target-1');
    const harness = renderConsumer({ mappings: [MAPPING, other] });

    act(() => line(harness.container, MAPPING.id).focus());
    await user.keyboard('{Enter}');

    expect(harness.state().mappings).toEqual([other]);
  });

  it('Space on a focused line removes it', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });
    const target = line(harness.container, MAPPING.id);

    act(() => target.focus());
    fireEvent.keyDown(target, { key: ' ' });

    expect(harness.state().mappings).toEqual([]);
  });

  it('a focused line is marked as active and carries the remove button', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });
    const target = line(harness.container, MAPPING.id);

    expect(target).not.toHaveAttribute('data-active');
    expect(target.querySelector('.mapping-delete-button')).toBeNull();

    act(() => target.focus());

    expect(target).toHaveAttribute('data-active', 'true');
    expect(target.querySelector('.mapping-delete-button')).not.toBeNull();
  });

  it('removing the last line puts focus on the source connectors, not the page', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer({ mappings: [MAPPING] });

    act(() => line(harness.container, MAPPING.id).focus());
    await user.keyboard('{Enter}');

    const stop = harness.container.querySelector('.source-connector[tabindex="0"]');

    expect(stop).not.toBeNull();
    expect(stop).toHaveFocus();
  });

  it('says what was removed, and how many are left', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer({ mappings: [MAPPING] });

    act(() => line(harness.container, MAPPING.id).focus());
    await user.keyboard('{Enter}');

    expect(liveRegion(harness.container)).toHaveTextContent(/Removed S1 to T2.*0 connections remaining\./);
  });
});
