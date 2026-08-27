import { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import MappingLines from '@/components/MappingLines';
import SourceTable from '@/components/SourceTable';
import TargetTable from '@/components/TargetTable';
import type { Point } from '@/core/types';
import { useConnectorProps } from '@/headless/internal/useConnectorProps';
import { useConnectorRegistry } from '@/headless/internal/useConnectorRegistry';
import { useGeometry } from '@/headless/internal/useGeometry';
import { usePointerDrag } from '@/headless/internal/usePointerDrag';
import useTableMapping from '@/hooks/useTableMapping';
import TableMappingStoreContext from '@/store/TableMappingStoreContext';
import { type LineType, type TableMappingProps } from '@/types/table-mapping';

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

function TableMapping({
  ref,
  sources = [],
  targets = [],
  mappings = [],
  sourceColumns = [],
  targetColumns = [],
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
}: TableMappingProps) {
  const tableMappingHook = useTableMapping({
    sources,
    targets,
    mappings,
    onStateChange: onMappingChange || (() => {}),
  });

  const {
    sourceFields,
    targetFields,
    mappings: currentMappings,
    redrawCount,
    addMapping,
    removeMapping,
    _store,
  } = tableMappingHook;

  useImperativeHandle(ref, () => tableMappingHook);

  const svgRef = useRef<SVGSVGElement>(null);
  const sourceTableRef = useRef<HTMLDivElement>(null);
  const targetTableRef = useRef<HTMLDivElement>(null);
  const mappingContainerRef = useRef<HTMLDivElement>(null);

  const registry = useConnectorRegistry();
  const { lines, remeasure } = useGeometry({
    rootRef: mappingContainerRef,
    registry,
    mappings: currentMappings,
    lineType,
  });

  /**
   * hovering mapping id
   */
  const [hoveredMapping, setHoveredMapping] = useState<string | null>(null);

  /**
   * personal instance of container Height
   */
  const [containerHeight, setContainerHeight] = useState<number>(0);

  const { drag, sourceHandlers } = usePointerDrag({
    rootRef: mappingContainerRef,
    registry,
    targetIds: targetFields.map((field) => field.id),
    onConnect: (sourceId, targetId) => {
      const already = currentMappings.some((m) => m.source === sourceId && m.target === targetId);

      if (!already) addMapping(sourceId, targetId);
    },
    disabled,
  });

  const getConnectorProps = useConnectorProps({ registry, sourceHandlers });

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
          ref={mappingContainerRef}
          className="mapping-container"
          style={{
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
            tableMappingHook={tableMappingHook}
          />

          {/* SVG mapping line */}
          <svg
            ref={svgRef}
            className="mapping-svg"
            style={{
              minHeight: containerHeight !== 0 && containerHeight > 180 ? `${containerHeight}px` : '180px',
            }}
            onMouseLeave={() => setHoveredMapping(null)}
          >
            {/* mapping line */}
            <MappingLines
              createPath={(sourceId, targetId) => createPath(sourceId, targetId) ?? { path: '', midX: 0, midY: 0 }}
              lineColor={lineColor}
              lineWidth={lineWidth}
              hoverLineColor={hoverLineColor}
              hoveredMapping={hoveredMapping}
              isDragging={drag.status === 'pointer'}
              disabled={disabled}
              removeMapping={removeMapping}
              setHoveredMapping={setHoveredMapping}
              onBeforeMappingLineRemove={onBeforeMappingLineRemove}
              onAfterMappingLineRemove={onAfterMappingLineRemove}
              mappings={currentMappings}
            />

            {/* dragging line */}
            {drag.status === 'pointer' && (
              <path
                d={previewPath(lineType, drag.origin, drag.current)}
                stroke={lineColor}
                strokeWidth={lineWidth}
                strokeDasharray="5,5"
                fill="none"
              />
            )}

            {/* define arrow marker */}
            <defs>
              {/* normal arrow */}
              <marker
                id="arrowhead-normal"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={lineColor || '#3b82f6'} strokeWidth="1.5" />
              </marker>

              {/* hover arrow */}
              <marker
                id="arrowhead-hover"
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth="4"
                markerHeight="4"
                orient="auto"
              >
                <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={hoverLineColor || '#60a5fa'} strokeWidth="1.5" />
              </marker>
            </defs>
          </svg>

          {/* target table */}
          <TargetTable
            targetTableRef={targetTableRef}
            getConnectorProps={getConnectorProps}
            targetColumns={targetColumns}
            disabled={disabled}
            noDataComponent={noDataComponent}
            onBeforeTargetFieldRemove={onBeforeTargetFieldRemove}
            onAfterTargetFieldRemove={onAfterTargetFieldRemove}
            tableMappingHook={tableMappingHook}
          />
        </div>
      </div>
    </TableMappingStoreContext.Provider>
  );
}

export default TableMapping;
