import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { renderConsumer, sourceFixture, targetFixture } from '../helpers/consumer';

/**
 * Invariant: the mapping canvas height tracks whichever table is taller, and never
 * collapses below its floor.
 *
 * Tier 2 — permanent, implementation-independent. `TableMapping.tsx` currently derives
 * `containerHeight` from a `MutationObserver(childList, subtree)` watching both table refs
 * (`TableMapping.tsx:242-275`); phase 2 of the headless architecture plan
 * (docs/specs/2026-08-05-headless-architecture-plan.md) replaces that with a
 * `ResizeObserver`. These two cases pin the consumer-visible promise, not the mechanism, so
 * the migration can be checked against them instead of a snapshot of the old wiring.
 *
 * jsdom does not compute `clientHeight` from layout, so each case stubs it per element
 * (never globally) and triggers a real DOM mutation via the ref API — the same trigger the
 * MutationObserver reacts to in the browser. `MutationObserver` itself is left jsdom-native
 * (`__test__/setup.ts`) precisely so this path can be exercised for real.
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
  it('never collapses below its floor when both tables are shorter than it', async () => {
    const harness = renderConsumer({ sources: sourceFixture(1), targets: targetFixture(1) });

    const sourceTable = harness.container.querySelector('.source-table')!;
    const targetTable = harness.container.querySelector('.target-table')!;

    const restoreSource = stubClientHeight(sourceTable, 50);
    const restoreTarget = stubClientHeight(targetTable, 80);

    // A childList mutation on either observed table is what drives the recompute.
    act(() => {
      harness.ref.current!.appendSource({
        id: 'source-new',
        key: 'source-new',
        name: { type: 'string', columnKey: 'name', value: 'NEW' },
      });
    });

    await waitFor(() => {
      const container = harness.container.querySelector('.mapping-container') as HTMLElement;

      expect(container.style.minHeight).toBe(`${FLOOR}px`);
    });

    restoreSource();
    restoreTarget();
  });

  it('grows to cover whichever table is taller once that exceeds the floor', async () => {
    const harness = renderConsumer({ sources: sourceFixture(1), targets: targetFixture(1) });

    const sourceTable = harness.container.querySelector('.source-table')!;
    const targetTable = harness.container.querySelector('.target-table')!;

    const tallerHeight = FLOOR + 120;

    const restoreSource = stubClientHeight(sourceTable, 100);
    const restoreTarget = stubClientHeight(targetTable, tallerHeight);

    act(() => {
      harness.ref.current!.appendTarget({
        id: 'target-new',
        key: 'target-new',
        name: { type: 'input', columnKey: 'name', value: 'NEW' },
      });
    });

    await waitFor(() => {
      const container = harness.container.querySelector('.mapping-container') as HTMLElement;

      // Derived from the taller table's stubbed height, not a literal — survives a
      // different floor as long as the "grows to match the taller table" promise holds.
      expect(container.style.minHeight).toBe(`${tallerHeight}px`);
    });

    restoreSource();
    restoreTarget();
  });
});
