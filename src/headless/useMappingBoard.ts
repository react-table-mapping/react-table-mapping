import { useCallback, useLayoutEffect, useMemo, useReducer, useRef } from 'react';

import { dragReducer, idleDragState } from '@/core/drag/dragReducer';
import { type AnnouncementStrings, useAnnouncement } from '@/headless/internal/useAnnouncement';
import { useConnectorProps } from '@/headless/internal/useConnectorProps';
import type { GetConnectorPropsParams } from '@/headless/internal/useConnectorProps';
import { type ConnectorSide, useConnectorRegistry } from '@/headless/internal/useConnectorRegistry';
import { type GeometryLine, useGeometry } from '@/headless/internal/useGeometry';
import { useKeyboardConnect } from '@/headless/internal/useKeyboardConnect';
import { useLayoutProps } from '@/headless/internal/useLayoutProps';
import { type LineMarkers, useLineMarkers } from '@/headless/internal/useLineMarkers';
import {
  type GetMappingLinePropsParams,
  type GetRemoveMappingPropsParams,
  useMappingProps,
} from '@/headless/internal/useMappingProps';
import { DEFAULT_CONNECT_RADIUS, usePointerDrag } from '@/headless/internal/usePointerDrag';
import useTableMapping from '@/hooks/useTableMapping';
import type { FieldItem, FieldItemInput, LineType, Mapping, TableMappingStateWithAction } from '@/types/table-mapping';

export interface UseMappingBoardParams {
  sources?: FieldItemInput[];
  targets?: FieldItemInput[];
  mappings?: Mapping[];
  /** Called after every change, with the state as it now stands and what caused it. */
  onMappingChange?: (state: TableMappingStateWithAction) => void;
  /** Defaults to `straight`. */
  lineType?: LineType;
  /**
   * Asked before a drag creates a mapping. Return `false` to refuse it. A duplicate is
   * refused before this is consulted.
   */
  onBeforeConnect?: (sourceId: string, targetId: string) => void | boolean;
  /**
   * Asked before a line is removed, by pointer or key. Return `false` to keep it — for a
   * confirmation step, or to remove it yourself and report it differently.
   */
  onBeforeDisconnect?: (mappingId: string) => void | boolean;
  /**
   * Called after a line has been removed, and not called at all when
   * {@link UseMappingBoardParams.onBeforeDisconnect} refused it. `onMappingChange` reports the
   * same thing along with every other change; this is for the case where only this one matters.
   */
  onAfterDisconnect?: (mappingId: string) => void;
  /** Turns off connecting and removing. Rows and lines still render. */
  disabled?: boolean;
  /** How close to a target connector a drop still counts. Defaults to 15px. */
  connectRadius?: number;
  /**
   * What a mapping is called when it is read out — "COL4 to SUM_COL". Without one a mapping
   * is announced by its id, which is a poor thing to hear.
   */
  describeMapping?: (mapping: Mapping, context: { sources: FieldItem[]; targets: FieldItem[] }) => string;
  /**
   * What one row is called — "customer_id". Used for the connector's accessible name, so it
   * says which field it belongs to rather than reading out an id.
   */
  describeField?: (field: FieldItem, side: ConnectorSide) => string;
  /**
   * What a screen reader is told as connections are made and removed. Partly replaceable, so
   * translating is yours to do; anything left out falls back to the English default.
   */
  announcements?: Partial<AnnouncementStrings>;
}

/**
 * One frozen empty array for every omitted list.
 *
 * `= []` in the parameter list builds a new array on every render, and a new array is how the
 * store is told the caller changed something — so omitting an optional list put the board in a
 * loop that only stopped when React gave up. Measured: 42 renders and `Maximum update depth`.
 */
const EMPTY: never[] = [];

export interface DragLine {
  /** Where the drag started, in the root's coordinates. */
  from: { x: number; y: number };
  /** Where the pointer is now. */
  to: { x: number; y: number };
  /** The target the drop would land on, if any. */
  hoveredTargetId: string | null;
}

/**
 * Everything needed to draw and drive a field-mapping board, and nothing that decides how it
 * looks.
 *
 * This is the whole of `react-table-mapping/headless`: state, measuring and gestures, handed
 * back as data and prop getters. Every element on the screen is the caller's — their table,
 * their virtualiser, their design system. What the library contributes is which rows exist,
 * where the lines run, and what a press or a keystroke means.
 *
 * The three questions a board has to answer are separated on purpose:
 *
 * - **what is connected** — `sources`, `targets`, `mappings`, and the actions that change them
 * - **where the lines run** — `lines`, recomputed as things move; `dragLine` while one is drawn
 * - **what an element needs to take part** — the `get*Props` getters
 *
 * A caller who wants only the first can ignore the rest; the measuring costs nothing until a
 * connector is registered through `getConnectorProps`.
 */
export function useMappingBoard({
  sources = EMPTY,
  targets = EMPTY,
  mappings = EMPTY,
  onMappingChange,
  lineType = 'straight',
  onBeforeConnect,
  onBeforeDisconnect,
  onAfterDisconnect,
  disabled = false,
  connectRadius = DEFAULT_CONNECT_RADIUS,
  describeMapping,
  describeField,
  announcements,
}: UseMappingBoardParams = {}) {
  const rootRef = useRef<HTMLElement | null>(null);

  const board = useTableMapping({
    sources,
    targets,
    mappings,
    onStateChange: onMappingChange ?? (() => {}),
  });

  const { sourceFields, targetFields, mappings: currentMappings, addMapping, removeMapping } = board;

  const registry = useConnectorRegistry();
  const markers = useLineMarkers();

  const { lines, remeasure } = useGeometry({ rootRef, registry, mappings: currentMappings, lineType });

  const sourceIds = useMemo(() => sourceFields.map((field) => field.id), [sourceFields]);
  const targetIds = useMemo(() => targetFields.map((field) => field.id), [targetFields]);
  const mappingIds = useMemo(() => currentMappings.map((mapping) => mapping.id), [currentMappings]);

  // Held in a ref so the getters below do not take these identities as inputs. Callers write
  // the callbacks inline, which would rebuild every getter on each render and defeat the
  // `memo` on whatever draws the rows.
  //
  // Refreshed in a layout effect rather than during render, and that is early enough: what
  // reads this runs from a DOM event, which comes after the commit.
  /** One row's name, for the things that are said out loud about it. */
  const nameOf = useCallback(
    (fields: FieldItem[], id: string, side: ConnectorSide) => {
      const field = fields.find((candidate) => candidate.id === id);

      return field && describeField ? describeField(field, side) : id;
    },
    [describeField],
  );

  const latest = useRef({
    onBeforeConnect,
    onBeforeDisconnect,
    onAfterDisconnect,
    currentMappings,
    sourceFields,
    targetFields,
    nameOf,
  });

  useLayoutEffect(() => {
    latest.current = {
      onBeforeConnect,
      onBeforeDisconnect,
      onAfterDisconnect,
      currentMappings,
      sourceFields,
      targetFields,
      nameOf,
    };
  });

  // One state machine for both inputs, so a connection being drawn has a single answer and
  // neither input can start while the other is running.
  const [drag, dispatch] = useReducer(dragReducer, idleDragState);

  const { announcement, announce, getLiveRegionProps } = useAnnouncement(announcements);

  const connect = useCallback(
    (sourceId: string, targetId: string) => {
      const { onBeforeConnect: before, currentMappings: existing } = latest.current;

      // A second line between the same two rows would draw over the first and give the reader
      // two identical entries, so it is refused before the caller is asked.
      if (existing.some((mapping) => mapping.source === sourceId && mapping.target === targetId)) return;
      if (before?.(sourceId, targetId) === false) return;

      addMapping(sourceId, targetId);

      const { sourceFields: rows, targetFields: columns, nameOf } = latest.current;

      announce('connect', {
        source: nameOf(rows, sourceId, 'source'),
        target: nameOf(columns, targetId, 'target'),
        total: existing.length + 1,
      });
    },
    [addMapping, announce],
  );

  const announceCancel = (sourceId: string) => {
    const { sourceFields: rows, nameOf: name } = latest.current;

    announce('cancel', { source: name(rows, sourceId, 'source') });
  };

  const { sourceHandlers, claimsClick } = usePointerDrag({
    drag,
    dispatch,
    rootRef,
    registry,
    targetIds,
    connectRadius,
    disabled,
    onConnect: connect,
    onInterrupt: announceCancel,
  });

  const { connectorHandlers, activeSide, focusStop } = useKeyboardConnect({
    drag,
    dispatch,
    registry,
    sourceIds,
    targetIds,
    disabled,
    claimsClick,
    onConnect: connect,
    onStart: (sourceId) => {
      const { sourceFields: rows, nameOf: name } = latest.current;

      announce('connectStart', { source: name(rows, sourceId, 'source') });
    },
    onCancel: announceCancel,
  });

  const getRawConnectorProps = useConnectorProps({ registry, sourceHandlers, connectorHandlers, drag });

  /**
   * Fills the connector's name in from `describeField`, and says what pressing it will do.
   *
   * The instruction is part of the name rather than a separate description because a screen
   * reader reads the name on focus and nothing else — a connector announced as "customer_id"
   * alone gives no hint that it starts anything.
   */
  const getConnectorProps = useCallback(
    ({ side, id, label, ...rest }: GetConnectorPropsParams) => {
      if (label !== undefined) return getRawConnectorProps({ side, id, label, ...rest });

      const name = nameOf(side === 'source' ? sourceFields : targetFields, id, side);

      // What it already joins, so walking the column answers "what is left to connect"
      // without having to find each line.
      const linked = currentMappings
        .filter((mapping) => (side === 'source' ? mapping.source === id : mapping.target === id))
        .map((mapping) =>
          side === 'source'
            ? nameOf(targetFields, mapping.target, 'target')
            : nameOf(sourceFields, mapping.source, 'source'),
        );
      const state = linked.length
        ? `, ${side === 'source' ? 'connected to' : 'connected from'} ${linked.join(', ')}`
        : '';

      const instruction =
        drag.status === 'keyboard'
          ? side === 'target'
            ? 'Press Enter to connect, Escape to cancel'
            : 'Connecting from here'
          : side === 'source'
            ? 'Press Enter to start a connection'
            : undefined;

      return getRawConnectorProps({
        side,
        id,
        label: `${name}${state}${instruction ? `. ${instruction}` : ''}`,
        ...rest,
      });
    },
    [currentMappings, drag.status, getRawConnectorProps, nameOf, sourceFields, targetFields],
  );
  const { getRootProps, getCanvasProps, getConnectorGroupProps } = useLayoutProps({ rootRef });

  const {
    activeMappingId,
    clearHoveredMapping,
    getMappingLineProps: getLineProps,
    getRemoveMappingProps: getRemoveProps,
  } = useMappingProps({
    mappingIds,
    // A line should not answer the pointer that is busy drawing another one.
    disabled: disabled || drag.status === 'pointer',
    // The last line is gone and there is no neighbour to land on: the sources are where the
    // next connection would start, so that is where focus goes.
    onLastRemoved: () => focusStop('source'),
    onRemove: (mappingId) => {
      if (latest.current.onBeforeDisconnect?.(mappingId) === false) return false;

      const { currentMappings: existing } = latest.current;
      const removed = existing.find((candidate) => candidate.id === mappingId);

      removeMapping(mappingId);
      latest.current.onAfterDisconnect?.(mappingId);

      announce('disconnect', {
        mapping: removed ? describe(removed) : mappingId,
        total: Math.max(existing.length - 1, 0),
      });

      return true;
    },
  });

  // Not read from the ref: this runs during render, before the layout effect has refreshed
  // it, so a describeMapping that changed this render would be a render behind.
  const describe = useCallback(
    (mapping: Mapping) =>
      describeMapping?.(mapping, { sources: sourceFields, targets: targetFields }) ??
      `${mapping.source} to ${mapping.target}`,
    [describeMapping, sourceFields, targetFields],
  );

  /** One entry per mapping, in the order they were made — for a list beside the drawing. */
  const mappingDescriptions = useMemo(
    () => currentMappings.map((mapping) => ({ id: mapping.id, label: describe(mapping), mapping })),
    [currentMappings, describe],
  );

  /**
   * Fills the name in from `describeMapping`, so a caller does not have to work out what a line
   * is called at every place they draw one. Passing `label` still wins.
   */
  const getMappingLineProps = useCallback(
    ({ id, label }: GetMappingLinePropsParams) => {
      const mapping = currentMappings.find((candidate) => candidate.id === id);

      return getLineProps({ id, label: label ?? (mapping ? describe(mapping) : undefined) });
    },
    [currentMappings, describe, getLineProps],
  );

  /**
   * A remove control drawn on a line is hidden from screen readers, because the line already
   * is a named control and announcing both is two ways to do one thing. Drawn anywhere else —
   * in a list beside the board — it is the only control there is, so it takes a name and a
   * place in the tab order.
   */
  const getRemoveMappingProps = useCallback(
    ({ id, standalone = false }: GetRemoveMappingPropsParams) => {
      const props = getRemoveProps({ id, standalone });

      if (!standalone) return props;

      const mapping = currentMappings.find((candidate) => candidate.id === id);

      return { ...props, 'aria-label': `Remove ${mapping ? describe(mapping) : id}` };
    },
    [currentMappings, describe, getRemoveProps],
  );

  const dragLine: DragLine | null =
    drag.status === 'pointer' ? { from: drag.origin, to: drag.current, hoveredTargetId: drag.hoveredTargetId } : null;

  return {
    // ── what a screen reader is told ─────────────────────────────────────────
    /** The current message. Render it inside an element spread with the getter below. */
    announcement,
    getLiveRegionProps,

    // ── what is connected ────────────────────────────────────────────────────
    sources: sourceFields,
    targets: targetFields,
    mappings: currentMappings,
    mappingDescriptions,
    actions: board,

    // ── where the lines run ──────────────────────────────────────────────────
    lines,
    dragLine,
    markers,
    /** Re-measures every line. For a move no observer can see — a late font, a transform. */
    remeasure,

    // ── what an element needs to take part ───────────────────────────────────
    getRootProps,
    getCanvasProps,
    getConnectorGroupProps,
    getConnectorProps,
    getMappingLineProps,
    getRemoveMappingProps,

    /** Which mapping is under the pointer or holds focus, if any. */
    activeMappingId,
    /** For a pointer that leaves the canvas without passing back over a line. */
    clearHoveredMapping,
    /** Which side Tab is walking: the sources, or the targets while a connection is drawn. */
    activeSide,
  };
}

export type MappingBoard = ReturnType<typeof useMappingBoard>;
export type { GeometryLine, LineMarkers };
