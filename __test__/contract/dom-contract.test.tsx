import { act, render } from '@testing-library/react';
import { createRef } from 'react';
import { describe, expect, it } from 'vitest';

import TableMapping from '@/components/TableMapping';
import type { FieldItemInput, Mapping, TableMappingRef } from '@/types/table-mapping';

import { serializeStructure } from '../helpers/dom-structure';
import { setRect } from '../helpers/rects';

/**
 * Styled DOM contract baseline.
 *
 * ┌──────────────────────────────────────────────────────────────────────────────┐
 * │ TIER 1 · CONTRACT                                                            │
 * │                                                                              │
 * │ Permanent. Deleting this file IS the act of announcing that styled markup is  │
 * │ no longer frozen, which is a major-release decision — it cannot happen        │
 * │ quietly. A diff here is a semver decision point like any other contract test. │
 * │                                                                              │
 * │ Approved diffs, and nothing else:                                            │
 * │   phase 4 — connector <div> becomes <button>                                 │
 * │   phase 4 — marker ids gain a useId() prefix (add the pattern to              │
 * │             isVolatileId() in helpers/dom-structure.ts when it lands)         │
 * └──────────────────────────────────────────────────────────────────────────────┘
 *
 * Decision D3: the styled layer's class names and element hierarchy are a frozen public
 * contract. Consumers have no `className`/`style` prop (see TableMappingProps), so
 * overriding these class names is their only styling route beyond CSS variables.
 *
 * The serializer records tag + class + hierarchy only, so the aria and role attributes
 * added in phase 5 will NOT show up here. A diff means one of the three things D3 calls a
 * violation: a class renamed/removed, nesting depth changed, or sibling order changed —
 * with the single approved exception of the connector <div> to <button> change in phase 4.
 */

const SOURCE_COLUMNS = [
  { key: 'name', title: 'Name' },
  { key: 'type', title: 'Type' },
];

const TARGET_COLUMNS = [
  { key: 'name', title: 'Name' },
  { key: 'type', title: 'Type' },
];

/** Covers all three cell renderers: string, input, select. */
function makeFields(prefix: 'source' | 'target', count: number): FieldItemInput[] {
  return Array.from({ length: count }, (_, i) => ({
    id: `${prefix}-${i + 1}`,
    key: `${prefix}-${i + 1}`,
    name:
      i === 0
        ? { type: 'string' as const, columnKey: 'name', value: `${prefix} ${i + 1}` }
        : { type: 'input' as const, columnKey: 'name', value: `${prefix} ${i + 1}` },
    type: {
      type: 'select' as const,
      columnKey: 'type',
      value: 'string',
      options: [
        { label: 'String', value: 'string' },
        { label: 'Number', value: 'number' },
      ],
    },
  }));
}

const SOURCES = makeFields('source', 2);
const TARGETS = makeFields('target', 2);
const MAPPINGS: Mapping[] = [{ id: 'mapping-source-1-target-2', source: 'source-1', target: 'target-2' }];

function layout(root: HTMLElement) {
  setRect(root.querySelector('.mapping-container'), { width: 600, height: 200 });
  setRect(root.querySelector('.mapping-svg'), { width: 600, height: 200 });

  root
    .querySelectorAll('[id^="connector-source-"]')
    .forEach((el, i) => setRect(el, { x: 190, y: 20 + i * 60, width: 10, height: 10 }));
  root
    .querySelectorAll('[id^="connector-target-"]')
    .forEach((el, i) => setRect(el, { x: 400, y: 20 + i * 60, width: 10, height: 10 }));
}

function structureOf(root: HTMLElement): string {
  const rendered = root.querySelector('.react-table-mapping');

  if (!rendered) throw new Error('.react-table-mapping did not render');

  return serializeStructure(rendered);
}

describe('styled DOM contract baseline', () => {
  it('renders the frozen structure with mappings drawn', () => {
    const ref = createRef<TableMappingRef>();

    const { container } = render(
      <TableMapping
        ref={ref}
        sources={SOURCES}
        targets={TARGETS}
        mappings={MAPPINGS}
        sourceColumns={SOURCE_COLUMNS}
        targetColumns={TARGET_COLUMNS}
      />,
    );

    layout(container);
    act(() => ref.current?.redraw());

    expect(structureOf(container)).toMatchSnapshot();
  });

  it('renders the frozen structure when disabled', () => {
    const { container } = render(
      <TableMapping
        sources={SOURCES}
        targets={TARGETS}
        mappings={[]}
        sourceColumns={SOURCE_COLUMNS}
        targetColumns={TARGET_COLUMNS}
        disabled
      />,
    );

    expect(structureOf(container)).toMatchSnapshot();
  });

  it('renders the frozen structure with no data', () => {
    const { container } = render(
      <TableMapping
        sources={[]}
        targets={[]}
        mappings={[]}
        sourceColumns={SOURCE_COLUMNS}
        targetColumns={TARGET_COLUMNS}
      />,
    );

    expect(structureOf(container)).toMatchSnapshot();
  });

  it('preserves the connector DOM ids promised', () => {
    const { container } = render(
      <TableMapping
        sources={SOURCES}
        targets={TARGETS}
        mappings={[]}
        sourceColumns={SOURCE_COLUMNS}
        targetColumns={TARGET_COLUMNS}
      />,
    );

    for (const source of SOURCES) {
      expect(container.querySelector(`#connector-source-${source.id}`)).not.toBeNull();
    }

    for (const target of TARGETS) {
      expect(container.querySelector(`#connector-target-${target.id}`)).not.toBeNull();
    }
  });
});
