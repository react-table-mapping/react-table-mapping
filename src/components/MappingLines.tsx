import { X } from 'lucide-react';
import { memo } from 'react';

import type {
  GetMappingLinePropsParams,
  GetRemoveMappingPropsParams,
  MappingLineProps,
  RemoveMappingProps,
} from '@/headless/internal/useMappingProps';
import type { Mapping } from '@/types/table-mapping';

export interface MappingLinesProps {
  lineColor: string;
  lineWidth: number;
  hoverLineColor: string;
  hoveredMappingId: string | null;
  isDragging: boolean;
  disabled: boolean;
  createPath: (sourceId: string, targetId: string) => { path: string; midX: number; midY: number };
  getMappingLineProps: (params: GetMappingLinePropsParams) => MappingLineProps;
  getRemoveMappingProps: (params: GetRemoveMappingPropsParams) => RemoveMappingProps;
  mappings: Mapping[];
}

/**
 * Puts the hovered line last so it paints over the others.
 *
 * The order changes, the elements do not: each line keeps its own key, so React moves the node
 * rather than building a new one. Rendering the hovered line as a separate element instead
 * unmounted and remounted it mid-hover, which took the click that was on its way to it.
 */
const paintOrder = (mappings: Mapping[], hoveredMappingId: string | null) => {
  if (!hoveredMappingId) return mappings;

  const hovered = mappings.filter((mapping) => mapping.id === hoveredMappingId);

  return hovered.length ? [...mappings.filter((mapping) => mapping.id !== hoveredMappingId), ...hovered] : mappings;
};

const MappingLines = memo(
  ({
    lineColor,
    lineWidth,
    hoverLineColor,
    hoveredMappingId,
    isDragging,
    disabled,
    createPath,
    getMappingLineProps,
    getRemoveMappingProps,
    mappings,
  }: MappingLinesProps) => (
    <>
      {paintOrder(mappings, hoveredMappingId).map((mapping) => {
        const pathData = createPath(mapping.source, mapping.target);

        if (!pathData) return null;

        const { style: hitStyle, ...lineProps } = getMappingLineProps({ id: mapping.id });
        const hovered = mapping.id === hoveredMappingId;

        return (
          // The click sits on the group, not on the hit area: hovering puts the remove control
          // over the line's midpoint, so a press can start on the stroke and end on the button.
          // The click that follows lands on their common ancestor, which is this.
          <g
            key={mapping.id}
            {...lineProps}
            style={{ pointerEvents: disabled ? 'none' : 'auto' }}
            className={`mapping-line-group${hovered ? ' hovered' : ''}`}
            data-testid={`mapping-line-${mapping.id}`}
          >
            {/* actual view line */}
            <path
              d={pathData.path}
              stroke={hovered ? hoverLineColor : lineColor}
              strokeWidth={hovered ? lineWidth + 0.5 : lineWidth}
              fill="none"
              markerEnd={`url(#arrowhead-${hovered ? 'hover' : 'normal'})`}
              className="line-base"
            />

            {/* hover area */}
            <path
              d={pathData.path}
              style={{ ...hitStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}
              fill="transparent"
              strokeWidth={hovered ? lineWidth + 4.5 : lineWidth + 4}
              className={`hover-area ${isDragging && !disabled ? 'dragging' : ''}`}
            />

            {hovered ? (
              <foreignObject
                width="18"
                height="18"
                x={pathData.midX - 9}
                y={pathData.midY - 9}
                style={{ overflow: 'visible' }}
              >
                <button
                  {...getRemoveMappingProps({ id: mapping.id })}
                  className={`mapping-delete-button ${isDragging ? 'dragging' : ''}`}
                >
                  <X className="mapping-delete-icon" />
                </button>
              </foreignObject>
            ) : null}
          </g>
        );
      })}
    </>
  ),
);

export default MappingLines;
