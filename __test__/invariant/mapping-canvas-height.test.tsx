import { act } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderConsumer, sourceFixture, targetFixture } from '../helpers/consumer';
import { triggerResizeObservers } from '../helpers/observers';

/**
 * Invariant: the mapping canvas height tracks whichever table is taller, and never collapses
 * below its floor.
 *
 * Tier 2 — permanent, implementation-independent. The promise is pinned here, not the wiring
 * that delivers it: this survived the move from `MutationObserver(childList)` to
 * `ResizeObserver` with both assertions untouched, only the trigger changing.
 *
 * jsdom computes no layout, so each case stubs `clientHeight` per element — never globally —
 * and then delivers a resize. The fake observer in `__test__/setup.ts` fires only when asked,
 * which is why the trigger is explicit: a test that depends on a resize should say so rather
 * than have one arrive by accident.
 */

const FLOOR = 180;

/** Stub a fixed `clientHeight` on one element. Restore explicitly once the case is done. */
function stubClientHeight(el: Element, height: number): () => void {
  Object.defineProperty(el, 'clientHeight', { configurable: true, value: height });

  return () => {
    delete (el as unknown as Record<string, unknown>).clientHeight;
  };
}

describe('invariant: mapping canvas height', () => {
  it('never collapses below its floor when both tables are shorter than it', () => {
    const harness = renderConsumer({ sources: sourceFixture(1), targets: targetFixture(1) });

    const restoreSource = stubClientHeight(harness.container.querySelector('.source-table')!, 50);
    const restoreTarget = stubClientHeight(harness.container.querySelector('.target-table')!, 80);

    act(() => triggerResizeObservers());

    const container = harness.container.querySelector('.mapping-container') as HTMLElement;

    expect(container.style.minHeight).toBe(`${FLOOR}px`);

    restoreSource();
    restoreTarget();
  });

  it('grows to cover whichever table is taller once that exceeds the floor', () => {
    const harness = renderConsumer({ sources: sourceFixture(1), targets: targetFixture(1) });

    const tallerHeight = FLOOR + 120;

    const restoreSource = stubClientHeight(harness.container.querySelector('.source-table')!, 100);
    const restoreTarget = stubClientHeight(harness.container.querySelector('.target-table')!, tallerHeight);

    act(() => triggerResizeObservers());

    const container = harness.container.querySelector('.mapping-container') as HTMLElement;

    // Derived from the taller table's stubbed height, not a literal — survives a different
    // floor as long as the "grows to match the taller table" promise holds.
    expect(container.style.minHeight).toBe(`${tallerHeight}px`);

    restoreSource();
    restoreTarget();
  });
});
