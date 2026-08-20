import type { Point } from '@/core/types';

/**
 * Whether a connection is currently being drawn, and by which input.
 *
 * `pointer` tracks a drag in progress: where it started, where the pointer is now, and which
 * target it is hovering. `keyboard` tracks the equivalent done from the keyboard, where there
 * is no cursor position — only the target currently focused.
 */
export type DragState =
  | { status: 'idle' }
  | { status: 'pointer'; sourceId: string; origin: Point; current: Point; hoveredTargetId: string | null }
  | { status: 'keyboard'; sourceId: string; focusedTargetId: string | null };

export type DragEvent =
  | { type: 'POINTER_DOWN'; sourceId: string; origin: Point }
  | { type: 'POINTER_MOVE'; point: Point; hoveredTargetId: string | null }
  | { type: 'POINTER_UP' }
  | { type: 'KEYBOARD_START'; sourceId: string; firstTargetId: string | null }
  | { type: 'KEYBOARD_MOVE'; targetId: string }
  | { type: 'KEYBOARD_CONFIRM' }
  | { type: 'CANCEL' };

export const idleDragState: DragState = { status: 'idle' };

/**
 * Advances the connection state machine.
 *
 * Pointer and keyboard share one machine so that "a connection is being drawn" has a single
 * answer no matter how it was started. Events that do not apply to the current state are
 * ignored and return it unchanged.
 *
 * Ending a gesture and creating a mapping are separate concerns: `POINTER_UP` and
 * `KEYBOARD_CONFIRM` only return to idle. Read `hoveredTargetId` or `focusedTargetId` before
 * dispatching to decide whether a mapping should be made.
 */
export function dragReducer(state: DragState, event: DragEvent): DragState {
  // Cancelling works from any state — a dropped pointer or an Escape key must always be able
  // to back out, including out of a state this reducer does not expect the event in.
  if (event.type === 'CANCEL') return idleDragState;

  switch (state.status) {
    case 'idle':
      switch (event.type) {
        case 'POINTER_DOWN':
          return {
            status: 'pointer',
            sourceId: event.sourceId,
            origin: event.origin,
            current: event.origin,
            hoveredTargetId: null,
          };

        case 'KEYBOARD_START':
          return { status: 'keyboard', sourceId: event.sourceId, focusedTargetId: event.firstTargetId };

        default:
          return state;
      }

    case 'pointer':
      switch (event.type) {
        case 'POINTER_MOVE':
          return { ...state, current: event.point, hoveredTargetId: event.hoveredTargetId };

        case 'POINTER_UP':
          return idleDragState;

        default:
          return state;
      }

    case 'keyboard':
      switch (event.type) {
        case 'KEYBOARD_MOVE':
          return { ...state, focusedTargetId: event.targetId };

        case 'KEYBOARD_CONFIRM':
          return idleDragState;

        default:
          return state;
      }

    default:
      return state;
  }
}
