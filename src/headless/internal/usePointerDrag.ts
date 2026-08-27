import { useCallback, useEffect, useLayoutEffect, useReducer, useRef } from 'react';

import { type DragState, dragReducer, idleDragState } from '@/core/drag/dragReducer';
import { mappingHit } from '@/core/geometry/mappingHit';
import { resolveAnchor } from '@/core/geometry/resolveAnchor';
import type { Point } from '@/core/types';
import type { ConnectorRegistry } from '@/headless/internal/useConnectorRegistry';

/** How close to a target connector a drop still counts as landing on it. */
export const DEFAULT_CONNECT_RADIUS = 15;

export interface PointerDragHandlers {
  onPointerDown: (event: React.PointerEvent) => void;
  onPointerMove: (event: React.PointerEvent) => void;
  onPointerUp: (event: React.PointerEvent) => void;
  onPointerCancel: (event: React.PointerEvent) => void;
}

export interface UsePointerDragParams {
  /** The element every coordinate is measured against. */
  rootRef: React.RefObject<HTMLElement | null>;
  registry: ConnectorRegistry;
  /** Which targets a drag may land on, in the order ties should be broken. */
  targetIds: string[];
  /** Called when a drag ends on a target. Deciding whether to keep it is the caller's job. */
  onConnect: (sourceId: string, targetId: string) => void;
  /** Defaults to {@link DEFAULT_CONNECT_RADIUS}. */
  connectRadius?: number;
  disabled?: boolean;
}

export interface PointerDrag {
  /** Idle, or the drag in progress with its origin, current point and hovered target. */
  drag: DragState;
  /** The pointer handlers for one source connector. Stable per id. */
  sourceHandlers: (sourceId: string) => PointerDragHandlers;
}

/**
 * Drives drawing a connection with a pointer.
 *
 * Every handler lives on the source connector rather than on the canvas, because the connector
 * captures the pointer on the way down. Capture keeps the rest of the gesture aimed at that one
 * element, so a drag survives leaving the canvas, passing over another element, or ending
 * outside the window — none of which the mouse events this replaces could follow.
 *
 * That also removes the need to treat leaving the canvas as a drop. A pointer that goes away
 * for real arrives as `pointercancel`, and Escape cancels from the keyboard; both back out
 * without connecting anything.
 *
 * Coordinates are measured against `rootRef` throughout, matching where the lines themselves
 * are measured, so a drag preview and a finished line share one origin.
 */
export function usePointerDrag({
  rootRef,
  registry,
  targetIds,
  onConnect,
  connectRadius = DEFAULT_CONNECT_RADIUS,
  disabled = false,
}: UsePointerDragParams): PointerDrag {
  const [drag, dispatch] = useReducer(dragReducer, idleDragState);

  // Usually only a callback needs this treatment — a plain value can go in a dependency array,
  // where a function that is rebuilt every render cannot. Here the values need it too, because
  // the handlers below are built once per source and never rebuilt: whatever one captures is
  // the first render's forever, function or not.
  //
  // Refreshed in a layout effect rather than during render, which keeps the render itself free
  // of side effects and is early enough — the handlers only run from DOM events, which come
  // after the commit. `rootRef` is not in here: a ref object's identity never changes, so
  // capturing it directly is already correct.
  const inputs = useRef({ registry, targetIds, onConnect, connectRadius, disabled });
  const latestDrag = useRef(drag);

  useLayoutEffect(() => {
    inputs.current = { registry, targetIds, onConnect, connectRadius, disabled };
    latestDrag.current = drag;
  });

  /** Whether this source is the one currently being dragged from. */
  const isDragging = useCallback(
    (sourceId: string) => latestDrag.current.status === 'pointer' && latestDrag.current.sourceId === sourceId,
    [],
  );

  const pointAt = useCallback(
    (clientX: number, clientY: number): Point | null => {
      const root = rootRef.current;

      if (!root) return null;

      const rootRect = root.getBoundingClientRect();

      return { x: clientX - rootRect.left, y: clientY - rootRect.top };
    },
    [rootRef],
  );

  /** Which target connector, if any, sits under a point. */
  const targetAt = useCallback(
    (point: Point): string | null => {
      const { registry: current, targetIds: ids, connectRadius: radius } = inputs.current;
      const rootElement = rootRef.current;

      if (!rootElement) return null;

      const containerRect = rootElement.getBoundingClientRect();

      const candidates = ids.flatMap((id) => {
        const element = current.getConnector('target', id);

        if (!element) return [];

        return [
          {
            id,
            point: resolveAnchor({ rect: element.getBoundingClientRect(), containerRect, spec: 'left-center' }),
          },
        ];
      });

      return mappingHit({ point, candidates, radius });
    },
    [rootRef],
  );

  const handlers = useRef(new Map<string, PointerDragHandlers>());

  const sourceHandlers = useCallback(
    (sourceId: string) => {
      const existing = handlers.current.get(sourceId);

      if (existing) return existing;

      const built: PointerDragHandlers = {
        onPointerDown: (event) => {
          if (inputs.current.disabled) return;

          const element = inputs.current.registry.getConnector('source', sourceId);
          const root = rootRef.current;

          if (!element || !root) return;

          const rect = element.getBoundingClientRect();
          const origin = resolveAnchor({
            rect,
            containerRect: root.getBoundingClientRect(),
            spec: 'right-center',
          });

          // Aim the rest of the gesture at this element. Without it the drag ends the moment
          // the pointer crosses onto anything else.
          event.currentTarget.setPointerCapture?.(event.pointerId);
          dispatch({ type: 'POINTER_DOWN', sourceId, origin });

          event.preventDefault();
          event.stopPropagation();
        },

        onPointerMove: (event) => {
          if (!isDragging(sourceId)) return;

          const point = pointAt(event.clientX, event.clientY);

          if (!point) return;

          dispatch({ type: 'POINTER_MOVE', point, hoveredTargetId: targetAt(point) });

          event.preventDefault();
          event.stopPropagation();
        },

        onPointerUp: (event) => {
          // A release only connects something when this source is the one being dragged from.
          // Without the check a stray pointerup — one whose press was refused because the
          // component is disabled, say — would still land a mapping.
          if (!isDragging(sourceId)) return;

          const point = pointAt(event.clientX, event.clientY);
          // The move that precedes an up is not guaranteed, so the landing target is resolved
          // here rather than read off the state a move left behind.
          const targetId = point ? targetAt(point) : null;

          if (targetId) inputs.current.onConnect(sourceId, targetId);

          dispatch({ type: 'POINTER_UP' });

          event.preventDefault();
          event.stopPropagation();
        },

        onPointerCancel: () => {
          if (isDragging(sourceId)) dispatch({ type: 'CANCEL' });
        },
      };

      handlers.current.set(sourceId, built);

      return built;
    },
    [isDragging, pointAt, targetAt, rootRef],
  );

  useEffect(() => {
    if (drag.status !== 'pointer') return;

    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'CANCEL' });
    };

    document.addEventListener('keydown', cancelOnEscape);

    return () => document.removeEventListener('keydown', cancelOnEscape);
  }, [drag.status]);

  return { drag, sourceHandlers };
}
