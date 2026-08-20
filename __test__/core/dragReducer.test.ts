import { describe, expect, it } from 'vitest';

import { type DragEvent, type DragState, dragReducer, idleDragState } from '@/core/drag/dragReducer';

/**
 * Contract: `dragReducer` is part of the `/core` published subpath (spec section 4) — the
 * pointer and keyboard connection paths share this pure state machine (spec section 5.2).
 *
 * Covers every transition the reducer defines, plus the events each state must ignore
 * (returning the very same state object, not an equal copy). `POINTER_UP` only ends the
 * gesture — whether a mapping gets created is the caller's decision from `hoveredTargetId`,
 * so that decision is deliberately not exercised here.
 */

const ORIGIN = { x: 10, y: 20 };

describe('dragReducer — idle', () => {
  it('POINTER_DOWN starts a pointer gesture', () => {
    const event: DragEvent = { type: 'POINTER_DOWN', sourceId: 'source-1', origin: ORIGIN };

    expect(dragReducer(idleDragState, event)).toEqual({
      status: 'pointer',
      sourceId: 'source-1',
      origin: ORIGIN,
      current: ORIGIN,
      hoveredTargetId: null,
    });
  });

  it('KEYBOARD_START starts a keyboard gesture', () => {
    const event: DragEvent = { type: 'KEYBOARD_START', sourceId: 'source-1', firstTargetId: 'target-1' };

    expect(dragReducer(idleDragState, event)).toEqual({
      status: 'keyboard',
      sourceId: 'source-1',
      focusedTargetId: 'target-1',
    });
  });

  it.each<DragEvent>([
    { type: 'POINTER_MOVE', point: ORIGIN, hoveredTargetId: null },
    { type: 'POINTER_UP' },
    { type: 'KEYBOARD_MOVE', targetId: 'target-1' },
    { type: 'KEYBOARD_CONFIRM' },
  ])('ignores $type, returning the same state', (event) => {
    expect(dragReducer(idleDragState, event)).toBe(idleDragState);
  });

  it('CANCEL is a no-op that returns idle', () => {
    expect(dragReducer(idleDragState, { type: 'CANCEL' })).toBe(idleDragState);
  });
});

describe('dragReducer — pointer', () => {
  const pointerState: DragState = {
    status: 'pointer',
    sourceId: 'source-1',
    origin: ORIGIN,
    current: ORIGIN,
    hoveredTargetId: null,
  };

  it('POINTER_MOVE updates current and hoveredTargetId', () => {
    const moved = { x: 50, y: 60 };
    const event: DragEvent = { type: 'POINTER_MOVE', point: moved, hoveredTargetId: 'target-2' };

    expect(dragReducer(pointerState, event)).toEqual({
      ...pointerState,
      current: moved,
      hoveredTargetId: 'target-2',
    });
  });

  it('POINTER_UP ends the gesture, returning to idle — without deciding a mapping', () => {
    const withHover: DragState = { ...pointerState, hoveredTargetId: 'target-2' };

    expect(dragReducer(withHover, { type: 'POINTER_UP' })).toBe(idleDragState);
  });

  it.each<DragEvent>([
    { type: 'POINTER_DOWN', sourceId: 'source-2', origin: ORIGIN },
    { type: 'KEYBOARD_START', sourceId: 'source-2', firstTargetId: null },
    { type: 'KEYBOARD_MOVE', targetId: 'target-1' },
    { type: 'KEYBOARD_CONFIRM' },
  ])('ignores $type, returning the same state', (event) => {
    expect(dragReducer(pointerState, event)).toBe(pointerState);
  });

  it('CANCEL returns to idle from mid-drag', () => {
    expect(dragReducer(pointerState, { type: 'CANCEL' })).toBe(idleDragState);
  });
});

describe('dragReducer — keyboard', () => {
  const keyboardState: DragState = { status: 'keyboard', sourceId: 'source-1', focusedTargetId: 'target-1' };

  it('KEYBOARD_MOVE updates focusedTargetId', () => {
    const event: DragEvent = { type: 'KEYBOARD_MOVE', targetId: 'target-2' };

    expect(dragReducer(keyboardState, event)).toEqual({ ...keyboardState, focusedTargetId: 'target-2' });
  });

  it('KEYBOARD_CONFIRM ends the gesture, returning to idle', () => {
    expect(dragReducer(keyboardState, { type: 'KEYBOARD_CONFIRM' })).toBe(idleDragState);
  });

  it.each<DragEvent>([
    { type: 'POINTER_DOWN', sourceId: 'source-2', origin: ORIGIN },
    { type: 'POINTER_MOVE', point: ORIGIN, hoveredTargetId: null },
    { type: 'POINTER_UP' },
    { type: 'KEYBOARD_START', sourceId: 'source-2', firstTargetId: null },
  ])('ignores $type, returning the same state', (event) => {
    expect(dragReducer(keyboardState, event)).toBe(keyboardState);
  });

  it('CANCEL returns to idle from a keyboard gesture', () => {
    expect(dragReducer(keyboardState, { type: 'CANCEL' })).toBe(idleDragState);
  });
});
