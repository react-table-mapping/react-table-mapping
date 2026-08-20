import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { createTableMappingStore } from '@/core/store/createTableMappingStore';
import type { FieldItem, Mapping } from '@/types/table-mapping';

const makeSource = (id: string): FieldItem => ({
  id,
  key: id,
  name: { type: 'input', columnKey: 'name', value: `Source ${id}` },
});

const makeTarget = (id: string): FieldItem => ({
  id,
  key: id,
  name: { type: 'input', columnKey: 'name', value: `Target ${id}` },
});

const makeMapping = (source: string, target: string): Mapping => ({
  id: `mapping-${source}-${target}`,
  source,
  target,
});

describe('createTableMappingStore', () => {
  const emit = vi.fn();

  beforeEach(() => {
    vi.useFakeTimers();
    emit.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  function makeStore(overrides?: Partial<{ sources: FieldItem[]; targets: FieldItem[]; mappings: Mapping[] }>) {
    return createTableMappingStore({
      initial: {
        sources: overrides?.sources ?? [makeSource('s1')],
        targets: overrides?.targets ?? [makeTarget('t1')],
        mappings: overrides?.mappings ?? [],
      },
      emit,
      valueUpdateDebounceMs: 300,
    });
  }

  // ─── getSnapshot / getFieldValue ─────────────────────────────────────────────

  it('getSnapshot returns initial state', () => {
    const store = makeStore();
    const snap = store.getSnapshot();
    expect(snap.sources).toHaveLength(1);
    expect(snap.sources[0].id).toBe('s1');
    expect(snap.targets[0].id).toBe('t1');
    expect(snap.mappings).toHaveLength(0);
  });

  it('getFieldValue returns current value', () => {
    const store = makeStore();
    expect(store.getFieldValue('source', 's1', 'name')).toBe('Source s1');
  });

  it('getFieldValue returns defaultValue when value is absent', () => {
    const store = makeStore({
      sources: [{ id: 's1', key: 's1', name: { type: 'input', columnKey: 'name', defaultValue: 'default' } }],
    });
    expect(store.getFieldValue('source', 's1', 'name')).toBe('default');
  });

  it('getFieldValue returns empty string for unknown id', () => {
    const store = makeStore();
    expect(store.getFieldValue('source', 'unknown', 'name')).toBe('');
  });

  // ─── subscribe / notify ──────────────────────────────────────────────────────

  it('subscribe returns an unsubscribe function', () => {
    const store = makeStore();
    const listener = vi.fn();
    const unsub = store.subscribe('sources:list', listener);
    store.appendSource(makeSource('s2'));
    expect(listener).toHaveBeenCalledTimes(1);
    unsub();
    store.appendSource(makeSource('s3'));
    expect(listener).toHaveBeenCalledTimes(1); // not called after unsubscribe
  });

  it('field topic fires on setFieldValue, list topic does not', () => {
    const store = makeStore();
    const fieldListener = vi.fn();
    const listListener = vi.fn();
    store.subscribe('field:source:s1:name', fieldListener);
    store.subscribe('sources:list', listListener);

    store.setFieldValue('source', 's1', 'name', 'new value');

    expect(fieldListener).toHaveBeenCalledTimes(1);
    expect(listListener).not.toHaveBeenCalled();
  });

  it('list topic fires on appendSource, field topic does not', () => {
    const store = makeStore();
    const fieldListener = vi.fn();
    const listListener = vi.fn();
    store.subscribe('field:source:s1:name', fieldListener);
    store.subscribe('sources:list', listListener);

    store.appendSource(makeSource('s2'));

    expect(listListener).toHaveBeenCalledTimes(1);
    expect(fieldListener).not.toHaveBeenCalled();
  });

  // ─── setFieldValue — debounced emit ──────────────────────────────────────────

  it('setFieldValue debounces emit by 300ms', () => {
    const store = makeStore();
    store.setFieldValue('source', 's1', 'name', 'typed');
    expect(emit).not.toHaveBeenCalled();
    vi.advanceTimersByTime(300);
    expect(emit).toHaveBeenCalledTimes(1);
    const [action, snapshot] = emit.mock.calls[0];
    expect(action).toEqual({
      type: 'UPDATE_SOURCE_FIELD_VALUE',
      payload: { sourceId: 's1', fieldKey: 'name', newValue: 'typed' },
    });
    expect(snapshot).toEqual(store.getSnapshot());
    expect(snapshot.sources).toEqual([
      { id: 's1', key: 's1', name: { type: 'input', columnKey: 'name', value: 'typed' } },
    ]);
  });

  it('rapid setFieldValue calls collapse into one emit (last-wins)', () => {
    const store = makeStore();
    store.setFieldValue('source', 's1', 'name', 'a');
    store.setFieldValue('source', 's1', 'name', 'ab');
    store.setFieldValue('source', 's1', 'name', 'abc');
    vi.advanceTimersByTime(300);
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0].payload.newValue).toBe('abc');
  });

  it('different fields have independent debounce timers', () => {
    const store = makeStore({
      targets: [
        {
          id: 't1',
          key: 't1',
          name: { type: 'input', columnKey: 'name', value: '' },
          data: { type: 'input', columnKey: 'data', value: '' },
        },
      ],
    });
    store.setFieldValue('target', 't1', 'name', 'A');
    store.setFieldValue('target', 't1', 'data', 'B');
    vi.advanceTimersByTime(300);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  it('setFieldValue with immediate:true emits synchronously', () => {
    const store = makeStore();
    store.setFieldValue('source', 's1', 'name', 'immediate', { immediate: true });
    expect(emit).toHaveBeenCalledTimes(1);
    expect(emit.mock.calls[0][0].payload.newValue).toBe('immediate');
  });

  // ─── applyExternalProps — echo-aware reconcile ───────────────────────────────

  it('applyExternalProps: pure echo (same refs) does nothing', () => {
    const store = makeStore();
    const snap = store.getSnapshot();
    const listener = vi.fn();
    store.subscribe('sources:list', listener);
    store.applyExternalProps(snap); // same refs
    expect(listener).not.toHaveBeenCalled();
  });

  it('applyExternalProps: external sources change notifies sources:list', () => {
    const store = makeStore();
    const listener = vi.fn();
    store.subscribe('sources:list', listener);
    // Simulate consumer adding a source externally
    const newSources = [...store.getSnapshot().sources, makeSource('s2')];
    store.applyExternalProps({ ...store.getSnapshot(), sources: newSources });
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().sources).toHaveLength(2);
  });

  it('applyExternalProps: echo after our own mutation is skipped', () => {
    const store = makeStore();
    store.appendSource(makeSource('s2')); // emits, sets lastNotifiedSnapshot
    const echoProps = store.getSnapshot(); // same refs as lastNotifiedSnapshot
    const listener = vi.fn();
    store.subscribe('sources:list', listener);
    store.applyExternalProps(echoProps); // should be no-op
    expect(listener).not.toHaveBeenCalled();
  });

  it('pushing target props cancels only the pending target edit, not the pending source edit', () => {
    const store = makeStore();
    // The parent's own prop references, captured before any pending edit — this is what a
    // real controlled consumer still holds for the side it is NOT pushing, since it has not
    // received the (debounced, not-yet-emitted) source edit back yet.
    const initial = store.getSnapshot();

    store.setFieldValue('source', 's1', 'name', 'source-pending');
    store.setFieldValue('target', 't1', 'name', 'target-pending');

    // External targets change comes in before either debounce fires; sources/mappings are
    // the untouched parent references so the echo check sees them as unchanged.
    const newTargets = [
      { ...makeTarget('t1'), name: { type: 'input' as const, columnKey: 'name', value: 'external' } },
    ];
    store.applyExternalProps({ sources: initial.sources, targets: newTargets, mappings: initial.mappings });

    vi.advanceTimersByTime(300);

    // Only the surviving source timer emits — the target timer was cancelled by the push,
    // and the source timer must NOT have been swept up with it.
    expect(emit).toHaveBeenCalledTimes(1);
    const [action] = emit.mock.calls[0];
    expect(action).toEqual({
      type: 'UPDATE_SOURCE_FIELD_VALUE',
      payload: { sourceId: 's1', fieldKey: 'name', newValue: 'source-pending' },
    });
  });

  it('pushing source props cancels only the pending source edit, not the pending target edit', () => {
    const store = makeStore();
    // Same rationale as the mirror case above: the untouched side keeps the parent's
    // pre-edit reference so the echo check treats it as unchanged.
    const initial = store.getSnapshot();

    store.setFieldValue('source', 's1', 'name', 'source-pending');
    store.setFieldValue('target', 't1', 'name', 'target-pending');

    // External sources change comes in before either debounce fires
    const newSources = [
      { ...makeSource('s1'), name: { type: 'input' as const, columnKey: 'name', value: 'external' } },
    ];
    store.applyExternalProps({ sources: newSources, targets: initial.targets, mappings: initial.mappings });

    vi.advanceTimersByTime(300);

    // Only the surviving target timer emits — mirror of the case above, proving both
    // call sites in applyExternalProps are wired to their own side and not swapped.
    expect(emit).toHaveBeenCalledTimes(1);
    const [action] = emit.mock.calls[0];
    expect(action).toEqual({
      type: 'UPDATE_TARGET_FIELD_VALUE',
      payload: { targetId: 't1', fieldKey: 'name', newValue: 'target-pending' },
    });
  });

  // ─── structural mutations flush pending emits ─────────────────────────────────

  it('appendSource flushes pending value emits first', () => {
    const store = makeStore();
    store.setFieldValue('source', 's1', 'name', 'pending');
    store.appendSource(makeSource('s2'));
    // Flush should have emitted UPDATE_SOURCE_FIELD_VALUE before APPEND_SOURCE
    expect(emit).toHaveBeenCalledTimes(2);
    expect(emit.mock.calls[0][0].type).toBe('UPDATE_SOURCE_FIELD_VALUE');
    expect(emit.mock.calls[1][0].type).toBe('APPEND_SOURCE');
    // Timer no longer fires
    vi.advanceTimersByTime(300);
    expect(emit).toHaveBeenCalledTimes(2);
  });

  // ─── structural mutations emit correct actions ────────────────────────────────

  it('appendSource emits APPEND_SOURCE', () => {
    const store = makeStore();
    const item = makeSource('s2');
    store.appendSource(item);
    expect(emit).toHaveBeenCalledTimes(1);
    const [action, snapshot] = emit.mock.calls[0];
    expect(action).toEqual({ type: 'APPEND_SOURCE', payload: { source: item } });
    expect(snapshot).toEqual(store.getSnapshot());
    expect(snapshot.sources).toEqual([makeSource('s1'), item]);
  });

  it('removeSource removes source and its mappings', () => {
    const store = makeStore({ mappings: [makeMapping('s1', 't1')] });
    store.removeSource('s1');
    expect(emit).toHaveBeenCalledTimes(1);
    const [action, snapshot] = emit.mock.calls[0];
    expect(action).toEqual({
      type: 'REMOVE_SOURCE',
      payload: { sourceId: 's1', removedMappings: [makeMapping('s1', 't1')] },
    });
    expect(snapshot).toEqual(store.getSnapshot());
    expect(snapshot.sources).toEqual([]);
    expect(snapshot.mappings).toEqual([]);
  });

  it('addMapping emits ADD_MAPPING', () => {
    const store = makeStore();
    store.addMapping('s1', 't1');
    expect(emit).toHaveBeenCalledTimes(1);
    const [action, snapshot] = emit.mock.calls[0];
    expect(action).toEqual({
      type: 'ADD_MAPPING',
      payload: { sourceId: 's1', targetId: 't1', mapping: makeMapping('s1', 't1') },
    });
    expect(snapshot).toEqual(store.getSnapshot());
    expect(snapshot.mappings).toEqual([makeMapping('s1', 't1')]);
  });

  it('addMapping is idempotent', () => {
    const store = makeStore({ mappings: [makeMapping('s1', 't1')] });
    store.addMapping('s1', 't1');
    expect(store.getSnapshot().mappings).toHaveLength(1);
    expect(emit).not.toHaveBeenCalled();
  });

  it('clearMappings emits CLEAR_MAPPINGS', () => {
    const store = makeStore({ mappings: [makeMapping('s1', 't1')] });
    store.clearMappings();
    expect(emit).toHaveBeenCalledTimes(1);
    const [action, snapshot] = emit.mock.calls[0];
    expect(action).toEqual({
      type: 'CLEAR_MAPPINGS',
      payload: { clearedMappings: [makeMapping('s1', 't1')] },
    });
    expect(snapshot).toEqual(store.getSnapshot());
    expect(snapshot.mappings).toEqual([]);
  });

  it('sameLineMapping maps index-by-index', () => {
    const store = makeStore({
      sources: [makeSource('s1'), makeSource('s2')],
      targets: [makeTarget('t1'), makeTarget('t2')],
    });
    store.sameLineMapping();
    const mappings = store.getSnapshot().mappings;
    expect(mappings).toHaveLength(2);
    expect(mappings[0]).toMatchObject({ source: 's1', target: 't1' });
    expect(mappings[1]).toMatchObject({ source: 's2', target: 't2' });
  });
});
