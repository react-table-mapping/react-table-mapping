import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';

export interface GetMappingLinePropsParams {
  id: string;
  /**
   * What this line is, in words — "COL4 to SUM_COL" rather than a description of the curve.
   * It becomes the control's accessible name, which is the only thing a screen reader has to
   * go on. Leave it out and the mapping's id is used, which is a poor thing to hear read out.
   */
  label?: string;
}

export interface MappingLineProps {
  /** A control, because it can be activated — the shape it is drawn as says nothing. */
  role: 'button';
  /** Registers the line so the arrow keys can move focus to it. Spread it, or merge yours. */
  ref: React.RefCallback<Element>;
  /**
   * One line holds the tab stop and the rest are skipped, so the drawing is a single stop
   * however many lines it has. The arrow keys walk between them.
   */
  tabIndex: 0 | -1;
  'aria-label': string;
  onClick: (event: React.MouseEvent) => void;
  onKeyDown: (event: React.KeyboardEvent) => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
  onFocus: () => void;
  onBlur: () => void;
  style: React.CSSProperties;
  /**
   * Present while the line is under the pointer **or** holds focus. Both mean the same thing —
   * this is the line being addressed — and a keyboard user gets the same affordance a mouse
   * user does. Present only when true: `false` renders as the string "false", which matches.
   */
  'data-active': true | undefined;
}

export interface GetRemoveMappingPropsParams {
  id: string;
  /**
   * Set this when the control is drawn somewhere other than on the line — in a list beside
   * the board, say. It then carries a name and a place in the tab order, because it is the
   * only way to remove that mapping rather than a second one.
   */
  standalone?: boolean;
}

export interface RemoveMappingProps {
  type: 'button';
  onClick: (event: React.MouseEvent) => void;
  /**
   * Drawn on the line, this is kept out of the accessibility tree and out of the tab order: it
   * does what activating the line already does, and the line is the control that carries the
   * name. Announcing both would put two ways to delete one mapping in front of a screen reader
   * for no gain, and nesting a button inside `role="button"` is invalid anyway.
   *
   * Both become `undefined` when `standalone` is set — see
   * {@link GetRemoveMappingPropsParams.standalone}.
   */
  'aria-hidden': true | undefined;
  tabIndex: -1 | 0;
}

export interface UseMappingPropsParams {
  /** The mappings in the order the arrow keys should walk them. */
  mappingIds: string[];
  /**
   * Called when a line is activated, by click, Enter, Space, Delete or Backspace. Whether that
   * ends in the mapping being removed is the caller's to decide. Return `false` to say it was
   * refused, and focus stays on the line.
   */
  onRemove: (mappingId: string) => void | boolean;
  /**
   * Called after the last line has been removed with focus on it, so the caller can put focus
   * somewhere — there is no neighbouring line left to move it to.
   */
  onLastRemoved?: () => void;
  /**
   * Stops lines answering the pointer or the keyboard. Pass it while a drag is in progress
   * too: a line should not light up under the pointer that is busy drawing another one.
   */
  disabled?: boolean;
}

/**
 * The props for a drawn mapping: the line itself, and a control that removes it.
 *
 * A line is a control, not a picture. It is drawn as a curve because that shows which two rows
 * it joins, but what it *is* is "the connection from here to there, press to remove" — so it
 * carries `role="button"`, a name, and a place in the tab order. Focus and hover are reported
 * as one thing, `data-active`, because they mean the same thing to whoever is drawing it.
 * When both apply, the line under the pointer wins — it is the one the hand is on. Moving the
 * pointer also puts focus's mark away, so a line a mouse press focused does not stay lit once
 * the pointer has gone.
 *
 * Focusing an SVG group works in all three engines and reaches the accessibility tree as a
 * named button; measured, not assumed. The earlier reading — that focus inside SVG is
 * unreliable — no longer holds, and the curve being meaningless to a screen reader is answered
 * by the name rather than by hiding the line.
 *
 * The line's own `onClick` belongs on whatever element wraps the whole line — its stroke, its
 * hit area, and any control drawn on it. Put it on one child instead and a press that starts on
 * the stroke but ends on a sibling produces a click on the wrapper, where nothing is listening.
 *
 * `pointer-events: stroke` is what gives the line its hits back: the canvas over the tables
 * takes none, so without this a line would be undrawn as far as the pointer is concerned. It
 * means the stroke, not the area a curve encloses — a bezier's bay is not part of the line.
 *
 * Nothing here is cached. A handler with a new identity is swapped into React's own table and
 * nothing observable happens, unlike a ref, which is detached and re-attached — so caching
 * these would buy nothing and hide the reason the connector's ref is cached.
 */
export function useMappingProps({ mappingIds, onRemove, onLastRemoved, disabled = false }: UseMappingPropsParams) {
  const [hovered, setHovered] = useState<string | null>(null);
  const [focused, setFocused] = useState<string | null>(null);

  // Held in a ref so the getters do not take the caller's callback identity as an input. Most
  // callers write this one inline, which would rebuild the getters on every render and defeat
  // the `memo` on whatever draws the lines — measured: a memoised child re-rendered 6 times
  // across 5 parent renders instead of once.
  //
  // Assigned in a layout effect rather than during render, and that is early enough: the
  // getters only run it from a DOM event, which comes after the commit.
  const latestOnRemove = useRef(onRemove);

  useLayoutEffect(() => {
    latestOnRemove.current = onRemove;
  });

  const latestIds = useRef(mappingIds);
  const latestOnLastRemoved = useRef(onLastRemoved);

  useLayoutEffect(() => {
    latestIds.current = mappingIds;
    latestOnLastRemoved.current = onLastRemoved;
  });

  // Which line holds the tab stop. Follows focus, falls back to the first line.
  const [stop, setStop] = useState<string | null>(null);
  const currentStop = stop && mappingIds.includes(stop) ? stop : (mappingIds[0] ?? null);

  const elements = useRef(new Map<string, Element>());
  const refs = useRef(new Map<string, React.RefCallback<Element>>());

  /** One stable callback per line, for the same reason the connector's is cached. */
  const lineRef = useCallback((id: string) => {
    let ref = refs.current.get(id);

    if (!ref) {
      ref = (element: Element | null) => {
        if (element) elements.current.set(id, element);
        else elements.current.delete(id);
      };
      refs.current.set(id, ref);
    }

    return ref;
  }, []);

  const focusLine = useCallback((id: string) => {
    const element = elements.current.get(id);

    if (element instanceof HTMLElement || element instanceof SVGElement) element.focus();
  }, []);

  // Where focus goes once a removal has been committed. Decided before the line is gone,
  // because afterwards there is no index left to find its neighbours by.
  const pendingFocus = useRef<{ removed: string; next: string | null } | null>(null);

  // `moveFocus` is false for a click with a pointer behind it. Pressing the mouse on a line
  // focuses it, so "had focus" is true there too — but a pointer user is not navigating by
  // focus, and handing it to the neighbour would leave that line lit (focus beats hover) and
  // hide the hover feedback they are looking at.
  const remove = useCallback((id: string, moveFocus = true) => {
    const ids = latestIds.current;
    const index = ids.indexOf(id);
    const hadFocus = moveFocus && elements.current.get(id) === document.activeElement;

    if (latestOnRemove.current(id) === false) return;
    if (hadFocus) pendingFocus.current = { removed: id, next: ids[index + 1] ?? ids[index - 1] ?? null };
  }, []);

  useLayoutEffect(() => {
    const pending = pendingFocus.current;

    // Still drawn: the caller has not applied the removal yet, or applied it somewhere else.
    if (!pending || mappingIds.includes(pending.removed)) return;

    pendingFocus.current = null;

    if (pending.next && mappingIds.includes(pending.next)) {
      setStop(pending.next);
      focusLine(pending.next);
    } else {
      latestOnLastRemoved.current?.();
    }
  }, [focusLine, mappingIds]);

  // Where the pointer last was, so a move that went nowhere can be told apart from one that did.
  const lastPoint = useRef<{ x: number; y: number } | null>(null);

  // Hover is re-read from where the pointer actually is, on every move while anything is lit.
  // Enter and leave alone were not enough: lighting a line moves its node to paint last and
  // mounts a remove button under the pointer, and when nodes move or go under a pointer the
  // browser may send no leave at all — the line then stayed lit with nothing over it.
  //
  // The same move puts away the keyboard's highlight: a person who has picked up the mouse is
  // looking at what the mouse is on. A key pressed on the line brings it back.
  useEffect(() => {
    if (hovered === null && focused === null) return;

    const onMove = (event: PointerEvent) => {
      const last = lastPoint.current;

      lastPoint.current = { x: event.clientX, y: event.clientY };

      // Browsers also send a move after a scroll or a layout change, with the pointer still.
      if (last && last.x === event.clientX && last.y === event.clientY) return;

      const target = event.target instanceof Node ? event.target : null;
      let under: string | null = null;

      for (const [id, element] of elements.current) {
        if (target && element.contains(target)) {
          under = id;
          break;
        }
      }

      setHovered(under);
      setFocused(null);
    };

    document.addEventListener('pointermove', onMove);

    return () => document.removeEventListener('pointermove', onMove);
  }, [hovered, focused]);

  // Reported as nothing while interaction is off, rather than remembered. A drag that starts
  // over a line would otherwise leave it lit for the length of the gesture, since the leave
  // that would have cleared it is suppressed too.
  const activeMappingId = disabled ? null : (hovered ?? focused);

  const getMappingLineProps = useCallback(
    ({ id, label }: GetMappingLinePropsParams): MappingLineProps => ({
      role: 'button',
      ref: lineRef(id),
      // Out of the tab order while disabled: reachable but inert is worse than absent, since
      // it costs a keyboard user a stop that does nothing.
      tabIndex: !disabled && id === currentStop ? 0 : -1,
      'aria-label': label ?? id,
      // `detail` is 0 for a click nothing pointed at — what assistive technology sends — and
      // those move focus like a key press does. A real pointer click does not.
      onClick: (event) => {
        if (!disabled) remove(id, event.detail === 0);
      },
      onKeyDown: (event) => {
        if (disabled) return;
        // Browser and assistive-technology shortcuts are not the line's to take.
        if (event.altKey || event.ctrlKey || event.metaKey) return;
        // Keys pressed inside the line's own content (its remove control) are not the line's.
        if (event.target !== event.currentTarget) return;

        // Back from the mouse: the line being typed at is the one addressed again.
        setFocused(id);

        const ids = latestIds.current;
        const index = ids.indexOf(id);
        let next: string | undefined;

        switch (event.key) {
          case 'ArrowDown':
          case 'ArrowRight':
            next = ids[(index + 1) % ids.length];
            break;
          case 'ArrowUp':
          case 'ArrowLeft':
            next = ids[(index - 1 + ids.length) % ids.length];
            break;
          case 'Home':
            next = ids[0];
            break;
          case 'End':
            next = ids[ids.length - 1];
            break;
          case 'Enter':
          case ' ':
          case 'Delete':
          case 'Backspace':
            // Shift+Delete is the browser's own shortcut, not a removal.
            if (event.shiftKey && (event.key === 'Delete' || event.key === 'Backspace')) return;
            // Space scrolls the page otherwise, which is what a real `<button>` suppresses for
            // itself and an element merely playing one does not.
            event.preventDefault();
            remove(id);

            return;
          default:
            return;
        }

        event.preventDefault();

        if (next) {
          setStop(next);
          focusLine(next);
        }
      },
      onPointerEnter: () => {
        if (!disabled) setHovered(id);
      },
      onPointerLeave: () => {
        // Only its own hover: a leave that arrives late must not clear the line entered since.
        if (!disabled) setHovered((current) => (current === id ? null : current));
      },
      onFocus: () => {
        if (disabled) return;

        setFocused(id);
        setStop(id);
      },
      onBlur: () => setFocused((current) => (current === id ? null : current)),
      style: { pointerEvents: disabled ? 'none' : 'stroke' },
      'data-active': activeMappingId === id || undefined,
    }),
    [activeMappingId, currentStop, disabled, focusLine, lineRef, remove],
  );

  /** For a pointer that leaves the whole canvas without passing back over the line. */
  const clearHoveredMapping = useCallback(() => setHovered(null), []);

  const getRemoveMappingProps = useCallback(
    ({ id, standalone = false }: GetRemoveMappingPropsParams): RemoveMappingProps => ({
      type: 'button',
      'aria-hidden': standalone ? undefined : true,
      tabIndex: standalone ? 0 : -1,
      onClick: (event) => {
        // A remove control is often drawn on the line it removes. Without this the click
        // reaches the line as well and the mapping is removed twice — reported twice to the
        // consumer, the second time for a mapping that is already gone.
        event.stopPropagation();

        // Same rule as the line: a pointer click on the control drawn on a focused line must
        // not move focus either.
        if (!disabled) remove(id, event.detail === 0);
      },
    }),
    [disabled, remove],
  );

  return { activeMappingId, clearHoveredMapping, getMappingLineProps, getRemoveMappingProps };
}
