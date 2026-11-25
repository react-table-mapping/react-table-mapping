import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import MappingLines from '@/components/MappingLines';
import SourceTable from '@/components/SourceTable';
import TargetTable from '@/components/TargetTable';
import type { Point } from '@/core/types';
import { MappingCanvas } from '@/headless';
import { useMappingBoard } from '@/headless/useMappingBoard';
import TableMappingStoreContext from '@/store/TableMappingStoreContext';
import { type FieldItem, type LineType, type Mapping, type TableMappingProps } from '@/types/table-mapping';

/**
 * The dashed line shown while a connection is being dragged.
 *
 * Deliberately not createLinePath: a preview ends at the pointer rather than at a connector,
 * so it takes no marker inset, and its curve is shaped to follow the cursor rather than to
 * settle between two fixed anchors.
 */
function previewPath(lineType: LineType, from: Point, to: Point): string {
  if (lineType === 'straight') return `M ${from.x} ${from.y} L ${to.x} ${to.y}`;

  if (lineType === 'step') {
    const midX = from.x + (to.x - from.x) / 2;

    return `M ${from.x} ${from.y} L ${midX} ${from.y} L ${midX} ${to.y} L ${to.x} ${to.y}`;
  }

  return `M ${from.x} ${from.y} C ${from.x} ${from.y}, ${to.x - 100} ${to.y}, ${to.x} ${to.y}`;
}

/** What {@link useMappingBoard} hands a `describeMapping` alongside the mapping itself. */
type DescribeContext = { sources: FieldItem[]; targets: FieldItem[] };

/**
 * One frozen empty array for every omitted list — see the note in `useMappingBoard`. `= []`
 * here would hand the board a new array on every render, which is how it is told the caller
 * changed something.
 */
const EMPTY: never[] = [];

function TableMapping({
  ref,
  sources = EMPTY,
  targets = EMPTY,
  mappings = EMPTY,
  sourceColumns = EMPTY,
  targetColumns = EMPTY,
  lineType = 'straight',
  lineColor = '#009bff',
  lineWidth = 1.7,
  hoverLineColor = '#e3f3ff',
  disabled = false,
  noDataComponent,
  onBeforeSourceFieldRemove,
  onBeforeTargetFieldRemove,
  onAfterSourceFieldRemove,
  onAfterTargetFieldRemove,
  onAfterMappingLineRemove,
  onBeforeMappingLineRemove,
  onAfterMappingChange,
  onMappingChange,
  id,
  'aria-label': ariaLabel,
}: TableMappingProps) {
  // What a row is called when it is read out. The first column is the one a row is named by
  // everywhere else in this component, so it is the one used here.
  const describeField = useCallback(
    (field: FieldItem) => {
      const first = sourceColumns[0] ? field[sourceColumns[0].key] : undefined;

      if (typeof first === 'string') return first;
      if (first && 'value' in first && typeof first.value === 'string') return first.value;

      return field.id;
    },
    [sourceColumns],
  );

  const describeMapping = useCallback(
    (mapping: Mapping, { sources: currentSources, targets: currentTargets }: DescribeContext) => {
      const nameOf = (fields: FieldItem[], id: string) => {
        const field = fields.find((candidate) => candidate.id === id);

        return field ? describeField(field) : id;
      };

      return `${nameOf(currentSources, mapping.source)} to ${nameOf(currentTargets, mapping.target)}, press to remove`;
    },
    [describeField],
  );

  // Built on the same public API a consumer would use. Nothing below reaches past it, which is
  // what keeps `/headless` honest: a gap in it would have to be worked around right here.
  const board = useMappingBoard({
    sources,
    targets,
    mappings,
    lineType,
    disabled,
    describeMapping,
    describeField,
    onMappingChange,
    onBeforeDisconnect: onBeforeMappingLineRemove,
    onAfterDisconnect: onAfterMappingLineRemove,
  });

  const {
    sources: sourceFields,
    targets: targetFields,
    mappings: currentMappings,
    lines,
    markers,
    remeasure,
    dragLine,
    activeMappingId,
    clearHoveredMapping,
    getRootProps,
    getCanvasProps,
    getConnectorProps,
    getMappingLineProps,
    getRemoveMappingProps,
    announcement,
    getLiveRegionProps,
  } = board;

  const { redrawCount, _store } = board.actions;

  useImperativeHandle(ref, () => board.actions);

  const sourceTableRef = useRef<HTMLDivElement>(null);
  const targetTableRef = useRef<HTMLDivElement>(null);
  // Kept because the height sync below observes it. The board fills it through getRootProps.
  const mappingContainerRef = useRef<HTMLElement>(null);

  /**
   * personal instance of container Height
   */
  const [containerHeight, setContainerHeight] = useState<number>(0);

  // Named so the board is a landmark: without a name a region is not one, and a screen
  // reader has to walk everything before the component to reach it.
  const rootProps = getRootProps({ ref: mappingContainerRef, label: ariaLabel ?? 'Field mapping' });

  // MappingLines asks per line; the board has already resolved the label against the rows.
  const describeLine = useCallback(
    (mapping: Mapping) => board.mappingDescriptions.find((entry) => entry.id === mapping.id)?.label ?? mapping.id,
    [board.mappingDescriptions],
  );
  const canvasProps = getCanvasProps({
    label: `${currentMappings.length} mapping${currentMappings.length === 1 ? '' : 's'}`,
  });

  /**
   * Looks up the measured line for a mapping.
   *
   * The measuring itself moved into useGeometry, which runs in a layout effect. Doing it here,
   * during render, read the layout as it stood before the current change was committed — which
   * is why removing a row could leave the remaining lines pointing at where its neighbours used
   * to be.
   */
  const createPath = useCallback(
    (sourceId: string, targetId: string) => {
      const line = lines.find((candidate) => candidate.source === sourceId && candidate.target === targetId);

      if (!line) return null;

      return {
        path: line.path,
        startX: line.from.x,
        startY: line.from.y,
        endX: line.to.x,
        endY: line.to.y,
        midX: line.mid.x,
        midY: line.mid.y,
      };
    },
    [lines],
  );

  useEffect(() => {
    if (onAfterMappingChange) {
      onAfterMappingChange({ sources: sourceFields, targets: targetFields, mappings: currentMappings });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentMappings]);

  // The SVG canvas has to cover whichever table is taller. This used to watch for childList
  // mutations, which only fires when rows are added or removed — a row that merely grew, or a
  // font that finished loading, left the canvas short. Observing size reports every cause.
  useEffect(() => {
    const sourceTable = sourceTableRef.current;
    const targetTable = targetTableRef.current;

    if (!sourceTable || !targetTable) return;

    const syncHeight = () => setContainerHeight(Math.max(sourceTable.clientHeight, targetTable.clientHeight));

    const observer = new ResizeObserver(syncHeight);

    observer.observe(sourceTable);
    observer.observe(targetTable);
    syncHeight();

    return () => observer.disconnect();
  }, []);

  // The only route from redraw() into a fresh measurement. Nothing inside the component calls
  // redraw() any more: a viewport change reaches the lines through the container's own resize
  // observer, so the counter now advances for exactly one reason — the consumer asked it to.
  useEffect(() => {
    if (redrawCount > 0) remeasure();
  }, [redrawCount, remeasure]);

  return (
    <TableMappingStoreContext.Provider value={_store}>
      <div className="react-table-mapping">
        <div
          {...rootProps}
          id={id}
          className="mapping-container"
          style={{
            ...rootProps.style,
            minHeight: containerHeight !== 0 && containerHeight > 180 ? `${containerHeight}px` : '180px',
          }}
        >
          {/* source table */}
          <SourceTable
            sourceTableRef={sourceTableRef}
            getConnectorProps={getConnectorProps}
            sourceColumns={sourceColumns}
            disabled={disabled}
            noDataComponent={noDataComponent}
            onBeforeSourceFieldRemove={onBeforeSourceFieldRemove}
            onAfterSourceFieldRemove={onAfterSourceFieldRemove}
            describeRow={describeField}
            tableMappingHook={board.actions}
          />

          {/* SVG mapping line */}
          <MappingCanvas
            {...canvasProps}
            markers={markers}
            lineColor={lineColor}
            hoverLineColor={hoverLineColor}
            className="mapping-svg"
            style={{
              ...canvasProps.style,
              minHeight: containerHeight !== 0 && containerHeight > 180 ? `${containerHeight}px` : '180px',
            }}
            onMouseLeave={clearHoveredMapping}
          >
            {/* mapping line */}
            <MappingLines
              createPath={(sourceId, targetId) => createPath(sourceId, targetId) ?? { path: '', midX: 0, midY: 0 }}
              lineColor={lineColor}
              lineWidth={lineWidth}
              hoverLineColor={hoverLineColor}
              activeMappingId={activeMappingId}
              describeMapping={describeLine}
              isDragging={dragLine !== null}
              disabled={disabled}
              markers={markers}
              getMappingLineProps={getMappingLineProps}
              getRemoveMappingProps={getRemoveMappingProps}
              mappings={currentMappings}
            />

            {/* dragging line */}
            {dragLine && (
              <path
                aria-hidden
                d={previewPath(lineType, dragLine.from, dragLine.to)}
                stroke={lineColor}
                strokeWidth={lineWidth}
                strokeDasharray="5,5"
                fill="none"
              />
            )}
          </MappingCanvas>

          {/* target table */}
          <TargetTable
            targetTableRef={targetTableRef}
            getConnectorProps={getConnectorProps}
            targetColumns={targetColumns}
            disabled={disabled}
            noDataComponent={noDataComponent}
            onBeforeTargetFieldRemove={onBeforeTargetFieldRemove}
            onAfterTargetFieldRemove={onAfterTargetFieldRemove}
            describeRow={describeField}
            tableMappingHook={board.actions}
          />
        </div>

        {/* Said out loud as connections are made and removed. A new sibling at the very end of
            the root, which is the one structural addition the DOM contract allows — the
            existing children keep their order and their positions. */}
        <div {...getLiveRegionProps()}>{announcement}</div>
      </div>
    </TableMappingStoreContext.Provider>
  );
}

export default TableMapping;
