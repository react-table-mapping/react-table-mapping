import type { LineMarkers } from '@/headless/internal/useLineMarkers';

export interface MappingCanvasProps extends React.SVGProps<SVGSVGElement> {
  /** From `useLineMarkers`. The same object the lines take their `marker-end` from. */
  markers?: LineMarkers;
  /** The colours the arrowheads are drawn in, matching the lines they end. */
  lineColor?: string;
  hoverLineColor?: string;
  children?: React.ReactNode;
}

/**
 * The `<svg>` the lines are drawn on, with the arrowheads defined inside it.
 *
 * Thin on purpose — everything about how it is laid out arrives through `getCanvasProps` and
 * whatever the caller spreads after it. What it does own is the `<defs>`, because an arrowhead
 * has to be defined in the same document as the line that references it, and because the ids
 * have to belong to one instance rather than to the page.
 *
 * Pass no `markers` and no `<defs>` is rendered, which is what a caller drawing plain lines
 * wants.
 */
export default function MappingCanvas({
  markers,
  lineColor = '#3b82f6',
  hoverLineColor = '#60a5fa',
  children,
  ...svgProps
}: MappingCanvasProps) {
  return (
    <svg {...svgProps}>
      {children}

      {markers ? (
        <defs aria-hidden>
          <marker
            id={markers.normalId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={lineColor} strokeWidth="1.5" />
          </marker>

          <marker
            id={markers.hoveredId}
            viewBox="0 0 10 10"
            refX="8"
            refY="5"
            markerWidth="4"
            markerHeight="4"
            orient="auto"
          >
            <path d="M 0 0 L 10 5 L 0 10" fill="none" stroke={hoverLineColor} strokeWidth="1.5" />
          </marker>
        </defs>
      ) : null}
    </svg>
  );
}
