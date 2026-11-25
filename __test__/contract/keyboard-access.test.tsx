import { act } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mappingOf, renderConsumer } from '../helpers/consumer';

/**
 * Contract: the board is reachable and legible without a pointer.
 *
 * Properties that hold across the whole board rather than in one gesture: how many tab stops it
 * costs, that focus is never left on an element Tab would walk past the group from, that every
 * control has a name, and that the live region is there before it has anything to say.
 *
 * What needs a real Tab order stays in e2e (`e2e/keyboard-model.spec.ts`,
 * `e2e/keyboard-connect.spec.ts`). The gestures themselves are in `creating-mappings` and
 * `removing-mappings`.
 */

const connectorStops = (container: HTMLElement, side?: 'source' | 'target') =>
  Array.from(container.querySelectorAll<HTMLElement>(`[id^="connector-${side ?? ''}"]`)).filter(
    (element) => element.getAttribute('tabindex') === '0',
  );
const connector = (container: HTMLElement, side: 'source' | 'target', n: number) =>
  container.querySelector<HTMLElement>(`#connector-${side}-${side}-${n}`)!;

describe('contract: tab stops', () => {
  it('each column is one tab stop, not one per row', () => {
    const { container } = renderConsumer();

    const stops = connectorStops(container);

    expect(stops).toHaveLength(2);
    expect(stops.map((stop) => stop.getAttribute('data-side')).sort()).toEqual(['source', 'target']);
  });

  it('the focused connector keeps its tab stop through a whole connection', async () => {
    const user = userEvent.setup();
    const { container } = renderConsumer();

    act(() => connector(container, 'source', 1).focus());
    await user.keyboard('{Enter}');
    expect(document.activeElement).toHaveAttribute('tabindex', '0');

    await user.keyboard('{Enter}');
    // Confirming returns to the source; taking the stop off a focused element would make Tab walk
    // forward past the group instead of out of it.
    expect(document.activeElement).toBe(connector(container, 'source', 1));
    expect(document.activeElement).toHaveAttribute('tabindex', '0');

    await user.keyboard('{ArrowDown}');
    expect(document.activeElement).toBe(connector(container, 'source', 2));
  });

  it('the stop follows a connector focused from outside', () => {
    const { container } = renderConsumer();

    act(() => connector(container, 'source', 3).focus());

    expect(connector(container, 'source', 3)).toHaveAttribute('tabindex', '0');
    expect(connector(container, 'source', 1)).toHaveAttribute('tabindex', '-1');
  });

  it('every column keeps a way back into it once the other has been touched', () => {
    const { container } = renderConsumer();

    act(() => connector(container, 'target', 1).focus());

    expect(connectorStops(container, 'source')).toHaveLength(1);
    expect(connectorStops(container, 'target')).toHaveLength(1);
  });
});

describe('contract: names and announcements', () => {
  it('a connector says what it is already connected to', () => {
    const { container } = renderConsumer({ mappings: [mappingOf('source-1', 'target-2')] });

    expect(connector(container, 'source', 1)).toHaveAttribute('aria-label', expect.stringContaining(', connected to '));
    expect(connector(container, 'target', 2)).toHaveAttribute(
      'aria-label',
      expect.stringContaining(', connected from '),
    );
    expect(connector(container, 'source', 2).getAttribute('aria-label')).not.toContain('connected');
  });

  it('the live region is in the DOM before it has anything to say', () => {
    const { container } = renderConsumer();
    const region = container.querySelector('[role="status"][aria-live="polite"]');

    // A live region added at the moment it has something to announce is often not announced.
    expect(region).not.toBeNull();
    expect(region).toHaveAttribute('aria-atomic', 'true');
    expect(region).toBeEmptyDOMElement();
  });
});

describe('contract: the accessibility tree has no holes', () => {
  it('nothing focusable hides inside aria-hidden, and every control has a name', () => {
    const { container } = renderConsumer({
      mappings: [mappingOf('source-1', 'target-2'), mappingOf('source-2', 'target-1')],
    });
    const board = container.querySelector('.react-table-mapping')!;

    // A focused line draws its remove button, which is the part that has to stay out of the tree.
    act(() => board.querySelector<HTMLElement>('[data-testid^="mapping-line-"]')!.focus());

    const hidden = Array.from(board.querySelectorAll<HTMLElement>('button, input, [tabindex]'))
      .filter((element) => element.tabIndex >= 0 && element.closest('[aria-hidden="true"]'))
      .map((element) => element.outerHTML.slice(0, 100));

    // The line's remove X is deliberately aria-hidden: the line itself is the named control.
    const controls = Array.from(board.querySelectorAll('button, [role="button"]')).filter(
      (element) => !element.closest('[aria-hidden="true"]'),
    );
    const unnamed = controls
      .filter((element) => !(element.getAttribute('aria-label') || element.textContent?.trim()))
      .map((element) => element.outerHTML.slice(0, 100));

    expect(controls.length).toBeGreaterThan(0);
    expect({ hidden, unnamed }).toEqual({ hidden: [], unnamed: [] });
  });
});
