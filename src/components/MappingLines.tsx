import { X } from 'lucide-react';
import { memo } from 'react';

import type {
  GetMappingLinePropsParams,
  GetRemoveMappingPropsParams,
  LineMarkers,
  MappingLineProps,
  RemoveMappingProps,
} from '@/headless';
import type { Mapping } from '@/types/table-mapping';

export interface MappingLinesProps {
  lineColor: string;
  lineWidth: number;
  hoverLineColor: string;
  activeMappingId: string | null;
  markers: LineMarkers;
  describeMapping: (mapping: Mapping) => string;
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
/** How much wider than the line its hit area, and the remove band drawn over it, are while active. */
const ACTIVE_HIT_PADDING = 10;

const paintOrder = (mappings: Mapping[], activeMappingId: string | null) => {
  if (!activeMappingId) return mappings;

  const active = mappings.filter((mapping) => mapping.id === activeMappingId);

  return active.length ? [...mappings.filter((mapping) => mapping.id !== activeMappingId), ...active] : mappings;
};

const MappingLines = memo(
  ({
    lineColor,
    lineWidth,
    hoverLineColor,
    activeMappingId,
    markers,
    describeMapping,
    isDragging,
    disabled,
    createPath,
    getMappingLineProps,
    getRemoveMappingProps,
    mappings,
  }: MappingLinesProps) => (
    <>
      {paintOrder(mappings, activeMappingId).map((mapping) => {
        const pathData = createPath(mapping.source, mapping.target);

        if (!pathData) return null;

        const { style: hitStyle, ...lineProps } = getMappingLineProps({
          id: mapping.id,
          label: describeMapping(mapping),
        });
        const active = mapping.id === activeMappingId;

        return (
          // The click sits on the group, not on the hit area: hovering puts the remove control
          // over the line's midpoint, so a press can start on the stroke and end on the button.
          // The click that follows lands on their common ancestor, which is this.
          <g
            key={mapping.id}
            {...lineProps}
            style={{ pointerEvents: disabled ? 'none' : 'auto' }}
            className={`mapping-line-group${active ? ' hovered' : ''}`}
            data-testid={`mapping-line-${mapping.id}`}
          >
            {/* What a click would remove, shown under the line while it is the one addressed. Drawn
                as wide as the hit area below, so the band is exactly where a click lands. */}
            {active ? (
              <path
                aria-hidden
                d={pathData.path}
                strokeWidth={lineWidth + ACTIVE_HIT_PADDING}
                fill="none"
                className="line-remove-band"
              />
            ) : null}

            {/* actual view line */}
            <path
              aria-hidden
              d={pathData.path}
              stroke={active ? hoverLineColor : lineColor}
              strokeWidth={active ? lineWidth + 0.5 : lineWidth}
              fill="none"
              markerEnd={active ? markers.hovered : markers.normal}
              className="line-base"
            />

            {/* hover area */}
            <path
              aria-hidden
              d={pathData.path}
              style={{ ...hitStyle, cursor: disabled ? 'not-allowed' : 'pointer' }}
              fill="transparent"
              strokeWidth={active ? lineWidth + ACTIVE_HIT_PADDING : lineWidth + 4}
              className={`hover-area ${isDragging && !disabled ? 'dragging' : ''}`}
            />

            {active ? (
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
