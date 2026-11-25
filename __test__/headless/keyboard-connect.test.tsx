import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { useMappingBoard } from '@/headless/useMappingBoard';
import type { FieldItemInput } from '@/types/table-mapping';

/**
 * A connection whose source disappears while it is being drawn.
 *
 * Here rather than e2e: removing a row with the mouse moves focus first, and the blur cancels
 * the connection before the row is gone. Only a programmatic removal — a parent dropping the
 * row from its props — reaches this path.
 */

const A: FieldItemInput = { id: 'a' };
const B: FieldItemInput = { id: 'b' };
const T: FieldItemInput = { id: 't' };
const BOTH = [A, B];
const ONLY_B = [B];
const TARGETS = [T];

const Board = ({ sources }: { sources: FieldItemInput[] }) => {
  const board = useMappingBoard({ sources, targets: TARGETS });

  return (
    <div {...board.getRootProps()}>
      {board.sources.map((field) => (
        <button
          key={field.id}
          {...board.getConnectorProps({ side: 'source', id: field.id })}
          data-testid={`s-${field.id}`}
        />
      ))}
      {board.targets.map((field) => (
        <button
          key={field.id}
          {...board.getConnectorProps({ side: 'target', id: field.id })}
          data-testid={`t-${field.id}`}
        />
      ))}
      <div {...board.getLiveRegionProps()}>{board.announcement}</div>
      <output data-testid="side">{board.activeSide}</output>
      <output data-testid="dragging">{board.dragLine ? 'yes' : 'no'}</output>
    </div>
  );
};

// jsdom has no PointerEvent, and the plain Event it falls back to drops clientX/clientY — a
// drag that "moved" would arrive having gone nowhere. Installed per test and released after,
// only when missing.
let polyfillInstalled = false;

beforeEach(() => {
  if ('PointerEvent' in window) return;

  class PointerEventPolyfill extends MouseEvent {
    pointerId: number;
    pointerType: string;
    isPrimary: boolean;
    pressure: number;

    constructor(type: string, init: PointerEventInit = {}) {
      super(type, init);
      this.pointerId = init.pointerId ?? 0;
      this.pointerType = init.pointerType ?? '';
      this.isPrimary = init.isPrimary ?? false;
      this.pressure = init.pressure ?? 0;
    }
  }

  Object.defineProperty(window, 'PointerEvent', { value: PointerEventPolyfill, configurable: true, writable: true });
  polyfillInstalled = true;
});

afterEach(() => {
  if (polyfillInstalled) Reflect.deleteProperty(window, 'PointerEvent');
  polyfillInstalled = false;
});

describe('a source removed mid-connection', () => {
  it('cancels the connection and puts focus on the sources that remain', () => {
    const { rerender } = render(<Board sources={BOTH} />);

    screen.getByTestId('s-a').focus();
    fireEvent.keyDown(screen.getByTestId('s-a'), { key: 'Enter' });
    expect(screen.getByTestId('side')).toHaveTextContent('target');

    rerender(<Board sources={ONLY_B} />);

    expect(screen.getByTestId('side')).toHaveTextContent('source');
    expect(screen.getByTestId('s-b')).toHaveFocus();
  });
});

describe('leaving the connectors mid-connection', () => {
  const start = () => {
    render(<Board sources={BOTH} />);
    screen.getByTestId('s-a').focus();
    fireEvent.keyDown(screen.getByTestId('s-a'), { key: 'Enter' });
    expect(screen.getByTestId('side')).toHaveTextContent('target');
  };

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('keeps the connection when the whole window loses focus', () => {
    start();
    // Alt-Tab, or a screen reader's own dialog: nothing on the page was chosen over the board.
    vi.spyOn(document, 'hasFocus').mockReturnValue(false);

    fireEvent.blur(screen.getByTestId('t-t'), { relatedTarget: null });

    expect(screen.getByTestId('side')).toHaveTextContent('target');
  });
});

describe('a click on a connector', () => {
  it('starts one after a press and release that never moved (what a screen reader sends)', () => {
    render(<Board sources={BOTH} />);
    const source = screen.getByTestId('s-a');

    fireEvent.pointerDown(source, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(source, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    fireEvent.click(source, { detail: 1 });

    expect(screen.getByTestId('side')).toHaveTextContent('target');
  });

  it('counts a release far from the press as a drag even when no pointermove arrived', () => {
    render(<Board sources={BOTH} />);
    const source = screen.getByTestId('s-a');

    // Some input drivers deliver no move events at all between the press and the release.
    fireEvent.pointerDown(source, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(source, { pointerId: 1, pointerType: 'mouse', button: 0, clientX: 40, clientY: 10 });
    fireEvent.click(source, { detail: 1 });

    expect(screen.getByTestId('side')).toHaveTextContent('source');
  });
});

describe('a press on a connector', () => {
  it.each([
    [
      'a keyboard',
      (id: string) => {
        screen.getByTestId(id).focus();
        fireEvent.keyDown(screen.getByTestId(id), { key: 'Enter' });
      },
    ],
    [
      'a click',
      (id: string) => {
        fireEvent.click(screen.getByTestId(id), { detail: 1 });
      },
    ],
  ])('does not move focus while a connection started by %s is in progress', (_how, begin) => {
    render(<Board sources={BOTH} />);
    begin('s-a');
    expect(screen.getByTestId('side')).toHaveTextContent('target');

    // macOS Safari/Firefox focus the nearest focusable ancestor instead of the button; the blur
    // that follows would cancel the connection before the click can confirm it.
    const notPrevented = fireEvent.mouseDown(screen.getByTestId('t-t'));

    expect(notPrevented).toBe(false);
  });

  it('keeps normal focus behaviour when nothing is in progress', () => {
    render(<Board sources={BOTH} />);

    const notPrevented = fireEvent.mouseDown(screen.getByTestId('s-a'));

    expect(notPrevented).toBe(true);
  });
});

describe('keys carrying a modifier', () => {
  it.each([
    ['Alt+Arrow', 's-a', { key: 'ArrowDown', altKey: true }],
    ['Ctrl+Home', 's-b', { key: 'Home', ctrlKey: true }],
  ])('leaves %s to the browser: no focus move, not prevented', (_name, id, init) => {
    render(<Board sources={BOTH} />);
    screen.getByTestId(id).focus();

    const notPrevented = fireEvent.keyDown(screen.getByTestId(id), init);

    expect(notPrevented).toBe(true);
    expect(screen.getByTestId(id)).toHaveFocus();
  });
});
