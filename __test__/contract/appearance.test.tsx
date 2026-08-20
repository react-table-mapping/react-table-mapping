import { fireEvent } from '@testing-library/react';
import { userEvent } from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';

import { mappingOf, renderConsumer } from '../helpers/consumer';

/**
 * Contract: presentational props.
 *
 *   lineColor · lineWidth · hoverLineColor · noDataComponent · disabled
 *
 * These reach the DOM as attributes rather than callbacks, so the assertions read the
 * rendered output. Phase 4 rebuilds this layer on the headless API — the values have to
 * arrive at the same places.
 */

const MAPPING = mappingOf('source-1', 'target-2');

function line(container: HTMLElement, mappingId: string) {
  return container.querySelector(`[data-testid="mapping-line-${mappingId}"] .line-base`)!;
}

function lineGroup(container: HTMLElement, mappingId: string) {
  return container.querySelector<SVGGElement>(`[data-testid="mapping-line-${mappingId}"]`)!;
}

describe('contract: lineColor / lineWidth', () => {
  it('applies both to the rendered line', () => {
    const harness = renderConsumer({ mappings: [MAPPING], lineColor: '#ff0000', lineWidth: 4 });

    expect(line(harness.container, MAPPING.id).getAttribute('stroke')).toBe('#ff0000');
    expect(line(harness.container, MAPPING.id).getAttribute('stroke-width')).toBe('4');
  });

  it('falls back to documented defaults', () => {
    const harness = renderConsumer({ mappings: [MAPPING] });

    expect(line(harness.container, MAPPING.id).getAttribute('stroke')).toBe('#009bff');
    expect(line(harness.container, MAPPING.id).getAttribute('stroke-width')).toBe('1.5');
  });
});

describe('contract: hoverLineColor', () => {
  it('switches the stroke while the line is hovered', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer({ mappings: [MAPPING], hoverLineColor: '#00ff00' });

    expect(line(harness.container, MAPPING.id).getAttribute('stroke')).toBe('#009bff');

    await user.hover(lineGroup(harness.container, MAPPING.id));

    expect(line(harness.container, MAPPING.id).getAttribute('stroke')).toBe('#00ff00');
  });

  it('reveals the delete affordance while hovered', async () => {
    const user = userEvent.setup();
    const harness = renderConsumer({ mappings: [MAPPING] });

    expect(harness.container.querySelector('.mapping-delete-button')).toBeNull();

    await user.hover(lineGroup(harness.container, MAPPING.id));

    expect(harness.container.querySelector('.mapping-delete-button')).not.toBeNull();
  });
});

describe('contract: noDataComponent', () => {
  it('renders the default placeholder when a side is empty', () => {
    const harness = renderConsumer({ sources: [], targets: [] });

    expect(harness.container.querySelector('.source-table-body')!.textContent).not.toBe('');
  });

  it('renders the supplied node instead, on both sides', () => {
    const harness = renderConsumer({
      sources: [],
      targets: [],
      noDataComponent: <span data-testid="empty">nothing here</span>,
    });

    expect(harness.container.querySelectorAll('[data-testid="empty"]')).toHaveLength(2);
  });

  it('is not rendered when rows exist', () => {
    const harness = renderConsumer({ noDataComponent: <span data-testid="empty" /> });

    expect(harness.container.querySelector('[data-testid="empty"]')).toBeNull();
  });
});

describe('contract: disabled', () => {
  it('makes connectors inert', () => {
    const harness = renderConsumer({ disabled: true });

    const connector = harness.container.querySelector<HTMLElement>('#connector-source-source-1')!;

    expect(connector.style.pointerEvents).toBe('none');
    expect(connector.style.cursor).toBe('not-allowed');
  });

  it('leaves connectors interactive when enabled', () => {
    const harness = renderConsumer();

    const connector = harness.container.querySelector<HTMLElement>('#connector-source-source-1')!;

    expect(connector.style.pointerEvents).toBe('auto');
    expect(connector.style.cursor).toBe('pointer');
  });

  it('blocks line hover at the browser level', () => {
    const harness = renderConsumer({ mappings: [MAPPING], disabled: true, hoverLineColor: '#00ff00' });

    // userEvent.hover() cannot be used here — it refuses to interact with a
    // pointer-events: none element, which is exactly the guarantee under test.
    expect(lineGroup(harness.container, MAPPING.id).style.pointerEvents).toBe('none');
  });

  it('ignores a hover event even if one reaches the handler', () => {
    const harness = renderConsumer({ mappings: [MAPPING], disabled: true, hoverLineColor: '#00ff00' });

    // fireEvent bypasses pointer-events, so this exercises the second line of defence:
    // the !disabled guard inside the mouseEnter handler.
    fireEvent.mouseEnter(lineGroup(harness.container, MAPPING.id));

    expect(line(harness.container, MAPPING.id).getAttribute('stroke')).toBe('#009bff');
    expect(harness.container.querySelector('.mapping-delete-button')).toBeNull();
  });
});
