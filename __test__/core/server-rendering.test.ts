import { createElement } from 'react';
import { renderToString } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';

import TableMapping from '@/components/TableMapping';

/**
 * Contract: the component survives being rendered on a server.
 *
 * `useSyncExternalStore` throws during server rendering unless it is given a third argument,
 * so a consumer rendering this component in Next.js used to crash the page rather than see a
 * warning. Nothing else in the suite can catch that — jsdom and Playwright both render in a
 * browser, and this path only exists on the server.
 *
 * Filed under `core/` for its environment rather than its tier. It is a Tier 1 promise about
 * the styled entry point, but proving it needs a run with no DOM at all, and this is the only
 * project configured that way. Running it under jsdom would let module-scope `window` access
 * pass here and still break for a real consumer.
 */

const SOURCES = [{ id: 's1', key: 's1', name: { type: 'string' as const, columnKey: 'name', value: 'S1' } }];
const TARGETS = [{ id: 't1', key: 't1', name: { type: 'input' as const, columnKey: 'name', value: 'T1' } }];
const COLUMNS = [{ key: 'name', title: 'Name' }];

describe('contract: server rendering', () => {
  it('produces markup without throwing or warning', () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {});

    const html = renderToString(
      createElement(TableMapping, {
        sources: SOURCES,
        targets: TARGETS,
        mappings: [],
        sourceColumns: COLUMNS,
        targetColumns: COLUMNS,
      }),
    );

    expect(html).toContain('react-table-mapping');
    expect(html).toContain('connector-source-s1');
    expect(error.mock.calls.map((call) => String(call[0]))).toEqual([]);

    error.mockRestore();
  });
});
