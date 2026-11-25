import { useCallback, useLayoutEffect, useRef, useState } from 'react';

import type { DragEvent, DragState } from '@/core/drag/dragReducer';
import type { ConnectorRegistry, ConnectorSide } from '@/headless/internal/useConnectorRegistry';

export interface KeyboardConnectHandlers {
  onKeyDown: (event: React.KeyboardEvent) => void;
  /**
   * Which side is being stood on. The tab stop follows focus rather than the gesture: leaving
   * it behind on the other side means a Tab from the focused connector goes forward into
   * whatever follows it, instead of out of the group.
   */
  onFocus: () => void;
  /**
   * Starts or confirms a connection from a click, the same as Enter. A screen reader in browse
   * mode sends a click for Enter — the arrow keys never arrive there, but this does — and it
   * cannot be told apart from a mouse click: measured in Chrome, it comes with a press and a
   * release and `detail: 1`. So every click counts, which also lets a mouse connect by clicking
   * a source and then a target. The one exception is the click a drag ends with.
   */
  onClick: (event: React.MouseEvent) => void;
  /**
   * Keeps a press from moving focus while a connection is in progress. Safari and Firefox on
   * macOS do not focus a clicked button; they focus the nearest focusable ancestor — the board
   * root — and that blur would cancel the connection before the click could confirm it.
   */
  onMouseDown: (event: React.MouseEvent) => void;
  /** Abandons a connection when focus leaves for something that is not a connector. */
  onBlur: (event: React.FocusEvent) => void;
  /**
   * Roving: one connector per side holds the tab stop and the rest are skipped, so the whole
   * group is a single stop. Without it a board of 200 rows costs 200 presses to walk past.
   */
  tabIndex: 0 | -1;
}

export interface UseKeyboardConnectParams {
  /** The shared connection state machine, so a keyboard drag and a pointer drag cannot overlap. */
  drag: DragState;
  dispatch: (event: DragEvent) => void;
  registry: ConnectorRegistry;
  /** The sources, in the order the arrow keys should walk them. */
  sourceIds: string[];
  /** The targets, in the order the arrow keys should walk them. */
  targetIds: string[];
  /** Called when a connection is confirmed. Deciding whether to keep it is the caller's job. */
  onConnect: (sourceId: string, targetId: string) => void;
  /** Told when a keyboard connection starts or is abandoned, so it can be said out loud. */
  onStart?: (sourceId: string) => void;
  onCancel?: (sourceId: string) => void;
  /** Whether the click arriving now belongs to a pointer gesture, which already said what it meant. */
  claimsClick?: () => boolean;
  disabled?: boolean;
}

export interface KeyboardConnect {
  /** Key handlers and tab stop for one connector. Stable per side and id. */
  connectorHandlers: (side: ConnectorSide, id: string) => KeyboardConnectHandlers;
  /** The side that holds the tab stop: the sources, or the targets mid-connection. */
  activeSide: ConnectorSide;
  /**
   * Puts focus on the connector that holds one side's tab stop — the one last stood on, or
   * the first. For whoever removed the thing that had focus and needs somewhere to put it.
   */
  focusStop: (side: ConnectorSide) => void;
}

/** Where a step key goes from here, wrapping at both ends. */
const step = (ids: string[], from: string | null, delta: 1 | -1): string | null => {
  if (!ids.length) return null;

  const index = from === null ? -1 : ids.indexOf(from);

  if (index === -1) return delta === 1 ? ids[0] : ids[ids.length - 1];

  return ids[(index + delta + ids.length) % ids.length];
};

/**
 * Making a connection without a pointer, and moving between connectors while doing it.
 *
 * A drag says "from here to there" by moving between two points, which a keyboard cannot do. So
 * the same intent is split into three steps — start on a source, walk the targets, confirm —
 * and the focus moves with it, because focus is the only cursor a keyboard user has.
 *
 * The connectors behave as one composite control rather than as a hundred separate ones — the
 * arrangement a radio group or a toolbar uses. **Tab is left alone**: one press moves onto the
 * group, one more moves past it, and every other thing Tab does on the page is untouched. The
 * arrow keys walk within — the sources while nothing is being drawn, the targets once something
 * is.
 *
 * One connector per side holds the tab stop and the rest are skipped, which is what makes the
 * group a single stop rather than one per row. Which one is remembered, so leaving the group
 * and coming back lands where it was left.
 *
 * It shares one state machine with the pointer, so "a connection is being drawn" has a single
 * answer no matter which input started it, and neither can begin while the other is running.
 *
 * Confirming sends focus back to the source too, so the next key pressed lands somewhere
 * predictable rather than on the connected row's remove button.
 *
 * Escape abandons a connection being drawn and returns focus to the source it started from.
 * Somewhere to land is the part that is easy to leave out: a cancel that drops focus to the top
 * of the document undoes the reason for having a keyboard path at all.
 */
export function useKeyboardConnect({
  drag,
  dispatch,
  registry,
  sourceIds,
  targetIds,
  onConnect,
  onStart,
  onCancel,
  claimsClick,
  disabled = false,
}: UseKeyboardConnectParams): KeyboardConnect {
  /** Which side a fresh gesture would start from, for a caller that wants to show it. */
  const activeSide: ConnectorSide = drag.status === 'keyboard' ? 'target' : 'source';

  // Which connector on each side holds the tab stop. Remembered per side, so leaving the board
  // and coming back lands where it was left rather than at the top.
  const [tabStop, setTabStop] = useState<Record<ConnectorSide, string | null>>({ source: null, target: null });

  // The handlers below are built once per connector and never rebuilt, so whatever one captures
  // is the first render's forever. Refreshed in a layout effect: the handlers only run from DOM
  // events, which come after the commit.
  const latest = useRef({
    drag,
    sourceIds,
    targetIds,
    onConnect,
    onStart,
    onCancel,
    claimsClick,
    disabled,
    registry,
    activeSide,
    tabStop,
  });

  useLayoutEffect(() => {
    latest.current = {
      drag,
      sourceIds,
      targetIds,
      onConnect,
      onStart,
      onCancel,
      claimsClick,
      disabled,
      registry,
      activeSide,
      tabStop,
    };
  });

  /** Moves focus to a connector, which is how the caret is carried through the gesture. */
  const focusConnector = useCallback((side: ConnectorSide, id: string) => {
    const element = latest.current.registry.getConnector(side, id);

    if (!(element instanceof HTMLElement)) return;

    element.focus();
    // focus() scrolls only as far as the browser decides; a row half under the fold stays half
    // hidden. Optional because jsdom has no layout and leaves this undefined.
    element.scrollIntoView?.({ block: 'nearest' });
  }, []);

  const focusStop = useCallback(
    (side: ConnectorSide) => {
      const { tabStop: held, sourceIds: sources, targetIds: targets } = latest.current;
      const ids = side === 'source' ? sources : targets;
      const remembered = held[side];
      const id = remembered && ids.includes(remembered) ? remembered : ids[0];

      if (id) focusConnector(side, id);
    },
    [focusConnector],
  );

  // A source that leaves mid-connection takes the gesture with it. Removing it with the mouse
  // never gets here — the click moves focus and the blur cancels first — so this is for a
  // parent that dropped the row from its props.
  useLayoutEffect(() => {
    if (drag.status !== 'keyboard' || sourceIds.includes(drag.sourceId)) return;

    dispatch({ type: 'CANCEL' });
    latest.current.onCancel?.(drag.sourceId);
    focusStop('source');
  }, [dispatch, drag, focusStop, sourceIds]);

  const handlers = useRef(new Map<string, Omit<KeyboardConnectHandlers, 'tabIndex'>>());

  /**
   * Starts a connection on a source, or confirms one on a target. Whether it did anything is
   * returned, so a key press that changed nothing is not swallowed.
   */
  const activate = useCallback(
    (side: ConnectorSide, id: string): boolean => {
      const { drag: current, targetIds: targets, disabled: off } = latest.current;

      if (off) return false;

      if (side === 'source') {
        // Not while one is already being drawn, by either input.
        if (current.status !== 'idle') return false;

        // Back at the target last stood on, so connecting down a list does not start over from
        // the top each time.
        const remembered = latest.current.tabStop.target;
        const first = remembered && targets.includes(remembered) ? remembered : (targets[0] ?? null);

        dispatch({ type: 'KEYBOARD_START', sourceId: id, firstTargetId: first });
        latest.current.onStart?.(id);
        setTabStop((held) => ({ ...held, source: id, target: first }));

        if (first) focusConnector('target', first);

        return true;
      }

      if (current.status !== 'keyboard') return false;

      latest.current.onConnect(current.sourceId, id);
      dispatch({ type: 'KEYBOARD_CONFIRM' });
      setTabStop((held) => ({ ...held, source: current.sourceId, target: id }));
      // Back to the source. Staying on the target put the next Tab on that row's remove
      // button, one Enter away from deleting the row just connected. Connecting the same
      // source again is one more Enter, and starts from this target.
      focusConnector('source', current.sourceId);

      return true;
    },
    [dispatch, focusConnector],
  );

  const buildHandler = useCallback(
    (side: ConnectorSide, id: string) => (event: React.KeyboardEvent) => {
      const { drag: current, targetIds: targets, disabled: off } = latest.current;

      if (off) return;

      if (event.key === 'Escape') {
        if (current.status !== 'keyboard') return;

        dispatch({ type: 'CANCEL' });
        latest.current.onCancel?.(current.sourceId);
        focusConnector('source', current.sourceId);
        event.preventDefault();

        return;
      }

      // Browser and assistive-technology shortcuts (Alt+Arrow is history) are not ours to take.
      if (event.altKey || event.ctrlKey || event.metaKey) return;

      const activating = event.key === 'Enter' || event.key === ' ';
      const forwards = event.key === 'ArrowDown' || event.key === 'ArrowRight';
      const backwards = event.key === 'ArrowUp' || event.key === 'ArrowLeft';
      const edge = event.key === 'Home' ? 'first' : event.key === 'End' ? 'last' : null;

      // Arrows walk whichever column is being stood on, in every state, so a column reached by
      // Tab or by a consumer's focus() can be walked without first starting a gesture.
      if (forwards || backwards || edge) {
        const ids = side === 'source' ? latest.current.sourceIds : targets;
        const from = side === 'target' && current.status === 'keyboard' ? current.focusedTargetId : id;
        const next = edge
          ? ((edge === 'first' ? ids[0] : ids[ids.length - 1]) ?? null)
          : step(ids, from, forwards ? 1 : -1);

        if (!next) return;

        // Mid-connection the reducer holds which target is being considered; outside one there
        // is nothing to tell, so only the tab stop moves.
        if (side === 'target' && current.status === 'keyboard') dispatch({ type: 'KEYBOARD_MOVE', targetId: next });

        setTabStop((held) => ({ ...held, [side]: next }));
        focusConnector(side, next);
        // Arrow keys scroll the page, and Home and End jump it to either end; either would take the
        // connector being walked to out from under the caret that is walking to it.
        event.preventDefault();

        return;
      }

      // Space scrolls the page otherwise, and Enter would submit a surrounding form — and
      // either would go on to fire a click that activates a second time.
      if (activating && activate(side, id)) event.preventDefault();
    },
    [activate, dispatch, focusConnector],
  );

  const connectorHandlers = useCallback(
    (side: ConnectorSide, id: string): KeyboardConnectHandlers => {
      const key = `${side}:${id}`;
      let built = handlers.current.get(key);

      if (!built) {
        built = {
          onKeyDown: buildHandler(side, id),
          onClick: () => {
            if (latest.current.claimsClick?.()) return;

            activate(side, id);
          },
          onMouseDown: (event: React.MouseEvent) => {
            if (latest.current.drag.status === 'keyboard') event.preventDefault();
          },
          onBlur: (event: React.FocusEvent) => {
            const { drag: current, registry: connectors } = latest.current;

            if (current.status !== 'keyboard') return;
            // Walking between connectors moves focus too; only leaving them ends the gesture.
            if (connectors.owns(event.relatedTarget as Element | null)) return;
            // The window itself lost focus (Alt-Tab, a screen reader dialog): focus comes back here.
            if (!document.hasFocus()) return;

            dispatch({ type: 'CANCEL' });
            latest.current.onCancel?.(current.sourceId);
          },
          // The stop follows focus, so it is never taken off the element that has it.
          onFocus: () => setTabStop((held) => ({ ...held, [side]: id })),
        };
        handlers.current.set(key, built);
      }

      const ids = side === 'source' ? sourceIds : targetIds;
      const held = tabStop[side];
      // Falls back to the first on the side, so there is always exactly one stop even before
      // anything has been focused, and after the row that held it has been removed.
      const stop = held && ids.includes(held) ? held : (ids[0] ?? null);

      // One stop per column, not one for the pair. Two toolbars are two tab stops, and gating
      // the second on a gesture made the first unreachable once a target had been touched:
      // Shift+Tab from a target walked backwards past the whole board instead of into the
      // sources. It also cost the focused element its stop, which is the one thing roving must
      // never do — Tab from a `tabIndex={-1}` element goes forward, not out.
      return { ...built, tabIndex: id === stop ? 0 : -1 };
    },
    [activate, buildHandler, dispatch, sourceIds, tabStop, targetIds],
  );

  return { connectorHandlers, activeSide, focusStop };
}
