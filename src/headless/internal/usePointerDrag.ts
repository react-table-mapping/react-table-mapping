import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import type { DragEvent, DragState } from '@/core/drag/dragReducer';
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
  /**
   * The shared connection state machine. Owned by the caller rather than here, because the
   * keyboard path drives the same one — that is what makes "a connection is being drawn" have
   * a single answer, and stops one input starting while the other is running.
   */
  drag: DragState;
  dispatch: (event: DragEvent) => void;
  /** The element every coordinate is measured against. */
  rootRef: React.RefObject<HTMLElement | null>;
  registry: ConnectorRegistry;
  /** Which targets a drag may land on, in the order ties should be broken. */
  targetIds: string[];
  /** Called when a drag ends on a target. Deciding whether to keep it is the caller's job. */
  onConnect: (sourceId: string, targetId: string) => void;
  /**
   * Called when a press on a source cancels a keyboard connection that was in progress — the
   * same cancel as Escape, so it is reported the same way.
   */
  onInterrupt?: (sourceId: string) => void;
  /** Defaults to {@link DEFAULT_CONNECT_RADIUS}. */
  connectRadius?: number;
  disabled?: boolean;
}

export interface PointerDrag {
  /** The pointer handlers for one source connector. Stable per id. */
  sourceHandlers: (sourceId: string) => PointerDragHandlers;
  /**
   * Whether the click arriving now belongs to a pointer gesture and should do nothing more.
   * The browser follows every press-and-release on one element with a click, a drag included;
   * only the press that did not travel is a click in the sense a person means. The other is a
   * press on the very source a keyboard connection was being drawn from: that press already
   * cancelled it, and its click must not start it again. Stable.
   */
  claimsClick: () => boolean;
}

/** How far a press may travel before it is a drag rather than a click. */
const DRAG_THRESHOLD = 4;

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
  drag,
  dispatch,
  rootRef,
  registry,
  targetIds,
  onConnect,
  onInterrupt,
  connectRadius = DEFAULT_CONNECT_RADIUS,
  disabled = false,
}: UsePointerDragParams): PointerDrag {
  // Usually only a callback needs this treatment — a plain value can go in a dependency array,
  // where a function that is rebuilt every render cannot. Here the values need it too, because
  // the handlers below are built once per source and never rebuilt: whatever one captures is
  // the first render's forever, function or not.
  //
  // Refreshed in a layout effect rather than during render, which keeps the render itself free
  // of side effects and is early enough — the handlers only run from DOM events, which come
  // after the commit. `rootRef` is not in here: a ref object's identity never changes, so
  // capturing it directly is already correct.
  const inputs = useRef({ registry, targetIds, onConnect, onInterrupt, connectRadius, disabled });
  const latestDrag = useRef(drag);

  useLayoutEffect(() => {
    inputs.current = { registry, targetIds, onConnect, onInterrupt, connectRadius, disabled };
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

  // Where the current press went down, whether it has travelled since, and whether it toggled
  // off the keyboard connection drawn from this same source; then, for the click that follows
  // the release, whether that click is the gesture's own.
  const press = useRef<{ x: number; y: number; travelled: boolean; toggledOff: boolean } | null>(null);
  const claimed = useRef(false);

  const claimsClick = useCallback(() => claimed.current, []);

  const handlers = useRef(new Map<string, PointerDragHandlers>());

  const sourceHandlers = useCallback(
    (sourceId: string) => {
      const existing = handlers.current.get(sourceId);

      if (existing) return existing;

      const built: PointerDragHandlers = {
        onPointerDown: (event) => {
          if (inputs.current.disabled) return;

          const current = latestDrag.current;
          // A press is the pointer taking over. Ignoring it while a click-started connection
          // waits for its target left a mouse user with a source that would not drag, and
          // nothing on screen saying why.
          const interrupted = current.status === 'keyboard' ? current.sourceId : null;

          press.current = {
            x: event.clientX,
            y: event.clientY,
            travelled: false,
            toggledOff: interrupted === sourceId,
          };

          const element = inputs.current.registry.getConnector('source', sourceId);
          const root = rootRef.current;

          if (!element || !root) return;

          if (interrupted !== null) {
            dispatch({ type: 'CANCEL' });
            inputs.current.onInterrupt?.(interrupted);
          }

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

          const down = press.current;

          if (down && Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_THRESHOLD) {
            down.travelled = true;
          }

          const point = pointAt(event.clientX, event.clientY);

          if (!point) return;

          dispatch({ type: 'POINTER_MOVE', point, hoveredTargetId: targetAt(point) });

          event.preventDefault();
          event.stopPropagation();
        },

        onPointerUp: (event) => {
          // The click follows in the same task as the release, so clearing on the next one
          // leaves it for that click and for nothing after — a click from a screen reader, say,
          // which arrives later and was never part of this press.
          const down = press.current;

          // Measured again here: a move before the release is not guaranteed (see below).
          const travelled =
            down && (down.travelled || Math.hypot(event.clientX - down.x, event.clientY - down.y) > DRAG_THRESHOLD);

          if (down && (travelled || down.toggledOff)) {
            claimed.current = true;
            setTimeout(() => {
              claimed.current = false;
            });
          }

          press.current = null;

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
    [dispatch, isDragging, pointAt, targetAt, rootRef],
  );

  useEffect(() => {
    if (drag.status !== 'pointer') return;

    const cancelOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') dispatch({ type: 'CANCEL' });
    };

    document.addEventListener('keydown', cancelOnEscape);

    return () => document.removeEventListener('keydown', cancelOnEscape);
  }, [dispatch, drag.status]);

  return { sourceHandlers, claimsClick };
}
