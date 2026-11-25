import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import TableMapping from '@/components/TableMapping';
import { useMappingBoard } from '@/headless';
import type { FieldItemInput } from '@/types/table-mapping';

/**
 * A board with an optional list left out has to settle.
 *
 * `sources`, `targets` and `mappings` are all optional, and a caller who omits one gets the
 * default. If that default is written `= []` it is a fresh array on every render — and a fresh
 * array is exactly how the store is told the caller changed something. The board reconciles,
 * re-renders, builds another array, and never stops.
 *
 * Filed under `invariant/` because what matters is the relationship, not how the default is
 * produced: however these are written, calling with less than everything must reach a resting
 * state. Measured before the fix: 42 renders and `Maximum update depth exceeded`.
 */

const SOURCES: FieldItemInput[] = [{ id: 's1', key: '1', name: 'A' }];
const TARGETS: FieldItemInput[] = [{ id: 't1', key: '1', name: 'X' }];
const COLUMNS = [{ title: 'Name', key: 'name' }];

/** Renders `subject` and reports how many passes it took, giving up well before React does. */
const rendersUntilSettled = (subject: (count: () => void) => React.ReactElement) => {
  let renders = 0;
  const count = () => {
    renders += 1;

    if (renders > 30) throw new Error(`did not settle: ${renders} renders`);
  };

  render(subject(count));

  return renders;
};

describe('a board called with less than everything', () => {
  it('settles when `mappings` is left out, and when every list is', () => {
    const WithoutMappings = ({ count }: { count: () => void }) => {
      const board = useMappingBoard({ sources: SOURCES, targets: TARGETS });

      count();

      return <div {...board.getRootProps()} />;
    };

    expect(rendersUntilSettled((count) => <WithoutMappings count={count} />)).toBeLessThan(5);

    const WithoutAnything = ({ count }: { count: () => void }) => {
      const board = useMappingBoard();

      count();

      return <div {...board.getRootProps()} />;
    };

    expect(rendersUntilSettled((count) => <WithoutAnything count={count} />)).toBeLessThan(5);
  });

  it('settles for the styled component too, which has the same defaults', () => {
    let renders = 0;

    const Probe = () => {
      renders += 1;

      if (renders > 30) throw new Error(`did not settle: ${renders} renders`);

      return <TableMapping sourceColumns={COLUMNS} targetColumns={COLUMNS} />;
    };

    render(<Probe />);

    expect(renders).toBeLessThan(5);
  });
});
