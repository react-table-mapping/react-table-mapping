import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TableMapping from '@/components/TableMapping';
import type { FieldItemInput, Mapping } from '@/types/table-mapping';

/**
 * Two instances on one page must not share their arrowheads.
 *
 * `marker-end="url(#name)"` is resolved against the whole document rather than against the
 * `<svg>` the line is in, so a fixed id makes the first instance's arrowhead the one every
 * line gets. A red instance above a green one gave the green line a red arrow — visible on
 * screen, reported nowhere.
 *
 * Filed under `invariant/` because the relationship is what matters, not the ids themselves:
 * whatever a line points at has to resolve inside its own instance. A different scheme for
 * generating the ids should leave every assertion here standing.
 */

const sources: FieldItemInput[] = [{ id: 'source-1', key: '1', name: 'a' }];
const targets: FieldItemInput[] = [{ id: 'target-1', key: '1', name: 'b' }];
const mappings: Mapping[] = [{ id: 'mapping-1', source: 'source-1', target: 'target-1' }];
const columns = [{ title: 'Name', key: 'name' }];

const renderPair = () =>
  render(
    <>
      <TableMapping
        sources={sources}
        targets={targets}
        mappings={mappings}
        sourceColumns={columns}
        targetColumns={columns}
        lineColor="#ff0000"
        hoverLineColor="#ff8888"
      />
      <TableMapping
        sources={sources}
        targets={targets}
        mappings={mappings}
        sourceColumns={columns}
        targetColumns={columns}
        lineColor="#00ff00"
        hoverLineColor="#88ff88"
      />
    </>,
  );

/** What each drawn line points its arrowhead at. */
const markerRefs = (container: HTMLElement) =>
  [...container.querySelectorAll('path.line-base')].map((line) => line.getAttribute('marker-end'));

/** The id in a `url(#…)` reference. */
const idOf = (reference: string | null) => reference?.match(/^url\(#(.+)\)$/)?.[1] ?? null;

describe('two instances on one page', () => {
  it('resolves each reference to exactly one marker', () => {
    const { container } = renderPair();

    for (const reference of markerRefs(container)) {
      const id = idOf(reference);

      expect(id).not.toBeNull();
      // More than one and the browser silently takes the first, which is the whole bug.
      expect(container.querySelectorAll(`#${CSS.escape(id!)}`)).toHaveLength(1);
    }
  });

  it('draws each arrowhead in the colour of the line it ends', () => {
    const { container } = renderPair();
    const [first, second] = markerRefs(container).map((reference) => {
      const marker = container.querySelector(`#${CSS.escape(idOf(reference)!)}`);

      return marker?.querySelector('path')?.getAttribute('stroke');
    });

    expect(first).toBe('#ff0000');
    expect(second).toBe('#00ff00');
  });
});
