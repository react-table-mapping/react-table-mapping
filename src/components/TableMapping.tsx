import React, { useCallback, useEffect, useImperativeHandle, useRef, useState } from 'react';

import MappingLines from '@/components/MappingLines';
import SourceTable from '@/components/SourceTable';
import TargetTable from '@/components/TargetTable';
import { useConnectorRegistry } from '@/headless/internal/useConnectorRegistry';
import { useGeometry } from '@/headless/internal/useGeometry';
import useTableMapping from '@/hooks/useTableMapping';
import TableMappingStoreContext from '@/store/TableMappingStoreContext';
import { type TableMappingProps } from '@/types/table-mapping';

function TableMapping({
  ref,
  sources = [],
  targets = [],
  mappings = [],
  sourceColumns = [],
  targetColumns = [],
  lineType = 'straight',
  lineColor = '#009bff',
  lineWidth = 1.5,
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
  const sourceConnectorRef = useCallback((id: string) => registry.connectorRef('source', id), [registry]);
  const targetConnectorRef = useCallback((id: string) => registry.connectorRef('target', id), [registry]);
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

  /**
   * dragging state
   */
  const [dragging, setDragging] = useState<{
    active: boolean;
    sourceId: string;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
  }>({
    active: false,
    sourceId: '',
    startX: 0,
    startY: 0,
    currentX: 0,
    currentY: 0,
  });

  /**
   * start dragging from source connector
   */
  const handleDragStart = (e: React.MouseEvent, sourceId: string) => {
    const containerRect = mappingContainerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    // calculate connector position
    const sourceEl = registry.getConnector('source', sourceId);

    if (!sourceEl) return;

    const rect = sourceEl.getBoundingClientRect();

    // calculate relative position based on container
    const startX = rect.right - containerRect.left;
    const startY = rect.top + rect.height / 2 - containerRect.top;

    setDragging({
      active: true,
      sourceId,
      startX,
      startY,
      currentX: startX,
      currentY: startY,
    });

    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * dragging
   */
  const handleDrag = (e: React.MouseEvent) => {
    if (!dragging.active) return;

    const svgRect = svgRef.current?.getBoundingClientRect();

    if (!svgRect) return;

    const currentX = e.clientX - svgRect.left;
    const currentY = e.clientY - svgRect.top;

    setDragging({
      ...dragging,
      currentX,
      currentY,
    });

    e.preventDefault();
    e.stopPropagation();
  };

  /**
   * end dragging
   */
  const handleDragEnd = (e: React.MouseEvent) => {
    if (!dragging.active) return;

    const containerRect = mappingContainerRef.current?.getBoundingClientRect();

    if (!containerRect) return;

    const svgRect = svgRef.current?.getBoundingClientRect();

    if (!svgRect) {
      setDragging({ ...dragging, active: false });
      return;
    }

    const currentX = e.clientX - svgRect.left;
    const currentY = e.clientY - svgRect.top;

    for (const targetField of targetFields) {
      const targetEl = registry.getConnector('target', targetField.id);

      if (!targetEl) continue;

      const rect = targetEl.getBoundingClientRect();
      const targetX = rect.left - svgRect.left;
      const targetY = rect.top + rect.height / 2 - svgRect.top;

      // check if mouse is on connector (15px radius)
      const distance = Math.sqrt(Math.pow(currentX - targetX, 2) + Math.pow(currentY - targetY, 2));

      if (distance <= 15) {
        const existingMapping = currentMappings.find(
          (m) => m.source === dragging.sourceId && m.target === targetField.id,
        );

        if (!existingMapping) {
          addMapping(dragging.sourceId, targetField.id);
        }

        break;
      }
    }

    setDragging({ ...dragging, active: false });

    e.preventDefault();
    e.stopPropagation();
  };

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
            connectorRef={sourceConnectorRef}
            sourceColumns={sourceColumns}
            disabled={disabled}
            noDataComponent={noDataComponent}
            handleDragStart={handleDragStart}
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
            onMouseMove={handleDrag}
            onMouseUp={handleDragEnd}
            onMouseLeave={(e) => {
              handleDragEnd(e);
              setHoveredMapping(null);
            }}
          >
            {/* mapping line */}
            <MappingLines
              createPath={(sourceId, targetId) => createPath(sourceId, targetId) ?? { path: '', midX: 0, midY: 0 }}
              lineColor={lineColor}
              lineWidth={lineWidth}
              hoverLineColor={hoverLineColor}
              hoveredMapping={hoveredMapping}
              isDragging={dragging?.active}
              disabled={disabled}
              removeMapping={removeMapping}
              setHoveredMapping={setHoveredMapping}
              onBeforeMappingLineRemove={onBeforeMappingLineRemove}
              onAfterMappingLineRemove={onAfterMappingLineRemove}
              mappings={currentMappings}
            />

            {/* dragging line */}
            {dragging.active && (
              <path
                d={
                  lineType === 'straight'
                    ? `M ${dragging.startX} ${dragging.startY} L ${dragging.currentX} ${dragging.currentY}`
                    : lineType === 'step'
                      ? `M ${dragging.startX} ${dragging.startY} L ${dragging.startX + (dragging.currentX - dragging.startX) / 2} ${dragging.startY} L ${dragging.startX + (dragging.currentX - dragging.startX) / 2} ${dragging.currentY} L ${dragging.currentX} ${dragging.currentY}`
                      : `M ${dragging.startX} ${dragging.startY} C ${dragging.startX} ${dragging.startY}, ${dragging.currentX - 100} ${dragging.currentY}, ${dragging.currentX} ${dragging.currentY}`
                }
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
            connectorRef={targetConnectorRef}
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
