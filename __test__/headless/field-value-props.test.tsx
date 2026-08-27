import { act, fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { createTableMappingStore } from '@/core/store/createTableMappingStore';
import { useFieldValueProps } from '@/headless/internal/useFieldValueProps';
import type { FieldItem } from '@/types/table-mapping';

/**
 * Why an editable cell gets a hook of its own rather than a plain getter.
 *
 * What the value *is* while typing, and when the consumer hears about it, belong to
 * `contract/editing-values.test.tsx` — fourteen tests already hold that down. This holds down
 * the thing that has no visible symptom until a table is large: a keystroke in one cell must
 * not render the others. Swap the narrow subscription for a broad one and every one of those
 * fourteen still passes, while typing at a few hundred rows starts to stutter.
 */

const field = (id: string, name: string): FieldItem => ({
  id,
  key: id,
  name: { type: 'input', columnKey: 'name', value: name },
});

const makeStore = () =>
  createTableMappingStore({
    initial: { sources: [field('source-1', 'first'), field('source-2', 'second')], targets: [], mappings: [] },
    emit: () => {},
  });

interface CellProps {
  store: ReturnType<typeof makeStore>;
  id: string;
  onRender: () => void;
}

const Cell = ({ store, id, onRender }: CellProps) => {
  const { value, onChange } = useFieldValueProps({ store, side: 'source', id, columnKey: 'name' });

  onRender();

  return <input value={value} onChange={onChange} data-testid={id} />;
};

describe('useFieldValueProps', () => {
  it('renders only the cell that was typed in', () => {
    const store = makeStore();
    const first = vi.fn();
    const second = vi.fn();

    render(
      <>
        <Cell store={store} id="source-1" onRender={first} />
        <Cell store={store} id="source-2" onRender={second} />
      </>,
    );

    const rendersBefore = second.mock.calls.length;

    fireEvent.change(screen.getByTestId('source-1'), { target: { value: 'edited' } });

    expect(screen.getByTestId('source-1')).toHaveValue('edited');
    expect(second).toHaveBeenCalledTimes(rendersBefore);
    expect(first.mock.calls.length).toBeGreaterThan(rendersBefore);
  });

  it('shows a value written to the store from somewhere else', () => {
    const store = makeStore();

    render(<Cell store={store} id="source-1" onRender={() => {}} />);

    act(() => store.setFieldValue('source', 'source-1', 'name', 'from elsewhere', { immediate: true }));

    expect(screen.getByTestId('source-1')).toHaveValue('from elsewhere');
  });

  it('passes the typed value on to a caller listening for it', () => {
    const store = makeStore();
    const onChange = vi.fn();

    const Probe = () => {
      const props = useFieldValueProps({ store, side: 'source', id: 'source-1', columnKey: 'name', onChange });

      return <input {...props} data-testid="cell" />;
    };

    render(<Probe />);
    fireEvent.change(screen.getByTestId('cell'), { target: { value: 'typed' } });

    expect(onChange).toHaveBeenCalledWith('typed');
  });
});
