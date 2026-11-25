import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';

import { createTableMappingStore } from '@/core/store/createTableMappingStore';
import type { TableMappingStore } from '@/core/store/createTableMappingStore';
import { createId } from '@/core/utils/createId';
import type {
  FieldItem,
  FieldItemDraft,
  FieldItemInput,
  Mapping,
  TableMappingRef,
  TableMappingStateWithAction,
} from '@/types/table-mapping';

interface UseTableMappingProps {
  sources: FieldItemInput[];
  targets: FieldItemInput[];
  mappings: Mapping[];
  onStateChange: (stateWithAction: TableMappingStateWithAction) => void;
}

const useTableMapping = ({
  sources: sourcesFromProps,
  targets: targetsFromProps,
  mappings: mappingsFromProps,
  onStateChange,
}: UseTableMappingProps): TableMappingRef => {
  /**
   * How many times {@link redraw} has been called. Starts at 0 and only ever increases, so it
   * is safe to use as a React key when a subtree has to be rebuilt alongside a redraw.
   *
   * It counts explicit calls and nothing else — the component never redraws itself through
   * this counter, so a viewport change or a row being added leaves it where it was.
   */
  const [redrawCount, setRedrawCount] = useState<number>(0);

  const latestEmitRef = useRef(onStateChange);
  latestEmitRef.current = onStateChange;

  const storeRef = useRef<TableMappingStore | null>(null);

  if (!storeRef.current) {
    storeRef.current = createTableMappingStore({
      initial: {
        sources: sourcesFromProps as FieldItem[],
        targets: targetsFromProps as FieldItem[],
        mappings: mappingsFromProps,
      },
      emit: (action, snapshot) => {
        latestEmitRef.current({ ...snapshot, action });
      },
    });
  }

  const store = storeRef.current;

  // Reconcile incoming props with the store on every change (echo-aware).
  useEffect(() => {
    store.applyExternalProps({
      sources: sourcesFromProps as FieldItem[],
      targets: targetsFromProps as FieldItem[],
      mappings: mappingsFromProps,
    });
  }, [sourcesFromProps, targetsFromProps, mappingsFromProps, store]);

  // Stable subscribe callbacks for useSyncExternalStore.
  const subscribeSourcesList = useCallback((cb: () => void) => store.subscribe('sources:list', cb), [store]);
  const subscribeTargetsList = useCallback((cb: () => void) => store.subscribe('targets:list', cb), [store]);
  const subscribeMappings = useCallback((cb: () => void) => store.subscribe('mappings', cb), [store]);

  const getSourcesSnapshot = useCallback(() => store.getSnapshot().sources, [store]);
  const getTargetsSnapshot = useCallback(() => store.getSnapshot().targets, [store]);
  const getMappingsSnapshot = useCallback(() => store.getSnapshot().mappings, [store]);

  const sourceFields = useSyncExternalStore(subscribeSourcesList, getSourcesSnapshot, getSourcesSnapshot);
  const targetFields = useSyncExternalStore(subscribeTargetsList, getTargetsSnapshot, getTargetsSnapshot);
  const mappings = useSyncExternalStore(subscribeMappings, getMappingsSnapshot, getMappingsSnapshot);

  // ─── Redraw ──────────────────────────────────────────────────────────────────

  /**
   * Re-measures every mapping line against the connectors as they are laid out right now.
   *
   * Lines are normally kept in place on their own: the container and the connectors are
   * observed for size changes, and rows entering or leaving are noticed as they mount. Call
   * this for a move none of that can see — an ancestor transform, a late-loading font, a
   * stylesheet applied after mount — where the elements shift without any of them resizing.
   *
   * Calling it is safe at any time. It reports nothing to `onMappingChange` and leaves
   * sources, targets and mappings untouched.
   */
  const redraw = () => setRedrawCount((prev) => prev + 1);

  // ─── Mutations ───────────────────────────────────────────────────────────────

  const appendSource = (source: FieldItemDraft) => {
    const newSource: FieldItem = { ...source, id: source.id || `source-${createId()}` };
    store.appendSource(newSource);
  };

  const appendTarget = (target: FieldItemDraft) => {
    const newTarget: FieldItem = { ...target, id: target.id || `target-${createId()}` };
    store.appendTarget(newTarget);
  };

  const removeSource = (sourceId: string) => store.removeSource(sourceId);
  const removeTarget = (targetId: string) => store.removeTarget(targetId);

  const addMapping = (sourceId: string, targetId: string) => store.addMapping(sourceId, targetId);
  const removeMapping = (mappingId: string) => store.removeMapping(mappingId);

  const clearMappings = () => store.clearMappings();
  const updateMappings = (next: Mapping[]) => store.updateMappings(next);
  const sameLineMapping = () => store.sameLineMapping();
  const sameNameMapping = (name: string) => store.sameNameMapping(name);

  const updateSourceFields = (next: FieldItem[]) => store.updateSourceFields(next);
  const updateTargetFields = (next: FieldItem[]) => store.updateTargetFields(next);

  // Programmatic value updates go through immediately (no debounce).
  const updateSourceFieldValue = (sourceId: string, fieldKey: string, newValue: string) => {
    store.setFieldValue('source', sourceId, fieldKey, newValue, { immediate: true });
  };

  const updateTargetFieldValue = (targetId: string, fieldKey: string, newValue: string) => {
    store.setFieldValue('target', targetId, fieldKey, newValue, { immediate: true });
  };

  return {
    sourceFields,
    targetFields,
    mappings,
    redrawCount,
    redraw,
    getSourceFields: () => store.getSnapshot().sources,
    getTargetFields: () => store.getSnapshot().targets,
    getMappings: () => store.getSnapshot().mappings,
    appendSource,
    removeSource,
    updateSourceFields,
    updateSourceFieldValue,
    appendTarget,
    removeTarget,
    updateTargetFields,
    updateTargetFieldValue,
    addMapping,
    removeMapping,
    clearMappings,
    updateMappings,
    sameLineMapping,
    sameNameMapping,
    // Internal — used by TableMapping to provide store Context to EditableCell.
    _store: store,
  };
};

export default useTableMapping;
