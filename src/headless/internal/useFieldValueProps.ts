import { useCallback, useSyncExternalStore } from 'react';

import type { StoreTopic, TableMappingStore } from '@/core/store/createTableMappingStore';
import type { ConnectorSide } from '@/headless/internal/useConnectorRegistry';

export interface UseFieldValuePropsParams {
  store: TableMappingStore;
  side: ConnectorSide;
  id: string;
  columnKey: string;
  /** Called after the store is told, with the value that was typed. */
  onChange?: (value: string) => void;
}

export interface FieldValueProps {
  value: string;
  onChange: (event: { target: { value: string } }) => void;
}

/**
 * The value of one editable cell, and the way to change it.
 *
 * A hook rather than a getter, because it subscribes: a cell reads one field of one row, and
 * this listens to exactly that. Editing a name in the first row leaves every other cell — and
 * the lines, and both tables — unrendered, which is the difference between typing that keeps up
 * and typing that stutters at a few hundred rows.
 *
 * Writes are debounced inside the store, so the value shown here changes on the keystroke while
 * the report to the consumer waits for the typing to pause. Passing `immediate` is what the ref
 * methods do instead; a person typing is the case this one is for.
 *
 * `onChange` takes the event rather than the string so that the result drops straight onto an
 * `<input>`. A caller who is not rendering one can hand it `{ target: { value } }`.
 *
 * The store comes from the caller rather than from a board. `createTableMappingStore` is what
 * `/core` publishes, so a consumer already holding one can bind a cell to it; reaching into a
 * board for `_store` is not the supported way to get one.
 */
export function useFieldValueProps({
  store,
  side,
  id,
  columnKey,
  onChange,
}: UseFieldValuePropsParams): FieldValueProps {
  const topic = `field:${side}:${id}:${columnKey}` as StoreTopic;

  const subscribe = useCallback((listener: () => void) => store.subscribe(topic, listener), [store, topic]);
  const getSnapshot = useCallback(() => store.getFieldValue(side, id, columnKey), [store, side, id, columnKey]);

  const value = useSyncExternalStore(subscribe, getSnapshot, getSnapshot);

  const handleChange = useCallback(
    (event: { target: { value: string } }) => {
      store.setFieldValue(side, id, columnKey, event.target.value);
      onChange?.(event.target.value);
    },
    [store, side, id, columnKey, onChange],
  );

  return { value, onChange: handleChange };
}
