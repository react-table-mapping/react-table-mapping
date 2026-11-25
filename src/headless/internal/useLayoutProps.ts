import { useCallback, useRef } from 'react';

import { mergeRefs } from '@/headless/internal/mergeRefs';
import type { ConnectorSide } from '@/headless/internal/useConnectorRegistry';

export interface GetRootPropsParams {
  /**
   * A ref of your own. It is merged with the one the measuring needs, rather than replacing
   * it — writing `ref` on the tag instead would leave every line unmeasured.
   */
  ref?: React.Ref<HTMLElement>;
  /**
   * What the board is called. **A region needs a name to be a landmark** — without one a screen
   * reader has no way to jump to the board, and has to walk everything in front of it.
   */
  label?: string;
}

export interface RootProps {
  ref: React.RefCallback<HTMLElement>;
  /**
   * A named region is a landmark, which is the only way a screen reader reaches the board in
   * one move — `D` in NVDA, the rotor in VoiceOver. `group` is not a landmark, so under it the
   * board can only be arrived at by tabbing through everything before it.
   *
   * Unnamed, this stays a `group`: a region with no accessible name is not exposed as a
   * landmark anyway, so taking the role without the name would be noise.
   */
  role: 'region' | 'group';
  'aria-label': string | undefined;
  /**
   * Focusable programmatically, never by Tab. That is what makes a skip link work — following
   * `href="#id"` moves focus onto the board rather than leaving it at the top of the document.
   *
   * The link itself belongs to the caller: it has to sit at the very top of the page, before
   * everything it skips past, which is somewhere a component cannot put it.
   */
  tabIndex: -1;
  style: React.CSSProperties;
}

export interface GetConnectorGroupPropsParams {
  side: ConnectorSide;
  /** What the column is called, for the group's own announcement. */
  label?: string;
}

export interface ConnectorGroupProps {
  /**
   * A toolbar, because that is the pattern the connectors already follow: one tab stop for the
   * group and arrow keys within it.
   *
   * The role is doing more than describing. A screen reader reading a page hands the arrow keys
   * to its own navigation, and an app only sees them once the reader switches to focus mode —
   * which it does for the roles that are *expected* to take arrows, `toolbar` among them.
   * `role="group"` is not one, so under `group` the arrow keys never arrive and the connectors
   * cannot be walked at all.
   */
  role: 'toolbar';
  'aria-orientation': 'vertical';
  'aria-label': string | undefined;
  'data-side': ConnectorSide;
}

export interface GetCanvasPropsParams {
  /** What the drawing is, in words — "3 mappings". It names the group the lines sit in. */
  label?: string;
}

export interface CanvasProps {
  /**
   * A group rather than hidden: the lines inside are buttons, and a button under
   * `aria-hidden` takes focus while a screen reader says nothing about it.
   */
  role: 'group';
  'aria-label': string | undefined;
  style: React.CSSProperties;
}

/**
 * `width`/`height` are stated rather than left to `inset: 0`. An `<svg>` carries an intrinsic
 * 300×150, and a specified size beats a stretch, so without these a line running further than
 * 300px is simply cut off — measured on a board 1216px wide, where the path was right and the
 * canvas was not.
 */
const CANVAS_STYLE: React.CSSProperties = {
  position: 'absolute',
  inset: 0,
  width: '100%',
  height: '100%',
  pointerEvents: 'none',
};

const getCanvasProps = ({ label }: GetCanvasPropsParams = {}): CanvasProps => ({
  role: 'group',
  'aria-label': label,
  style: CANVAS_STYLE,
});

const getConnectorGroupProps = ({ side, label }: GetConnectorGroupPropsParams): ConnectorGroupProps => ({
  role: 'toolbar',
  'aria-orientation': 'vertical',
  'aria-label': label,
  'data-side': side,
});

export interface UseLayoutPropsParams {
  /** Filled in by {@link RootProps.ref}. Every coordinate is measured against this element. */
  rootRef: React.RefObject<HTMLElement | null>;
}

/**
 * The two elements the lines are drawn between: the box everything is measured against, and
 * the canvas they are drawn on.
 *
 * The root is positioned because the canvas is laid over it, and it is what
 * `getBoundingClientRect` differences are taken against — an anchor is a connector's rect
 * minus this one's, which is why a scroll that moves both changes nothing.
 *
 * The canvas ignores the pointer so that it does not sit between the reader and the rows
 * underneath it. Lines take their own hits back with `pointer-events: stroke`.
 *
 * `getCanvasProps` returns no ref, unlike the connector getter: nothing here measures the
 * canvas, so a caller who wants that node can put `ref` on their own tag with nothing to
 * collide with. (The spec lists one; there is no consumer for it, and an unused ref would
 * still have to be merged and cached.)
 */
export function useLayoutProps({ rootRef }: UseLayoutPropsParams) {
  const setRoot = useCallback(
    (node: HTMLElement | null) => {
      rootRef.current = node;
    },
    [rootRef],
  );

  const merged = useRef<{ external: React.Ref<HTMLElement>; ref: React.RefCallback<HTMLElement> } | null>(null);

  const getRootProps = useCallback(
    ({ ref: external, label }: GetRootPropsParams = {}): RootProps => {
      const props = {
        role: label ? ('region' as const) : ('group' as const),
        'aria-label': label,
        tabIndex: -1 as const,
        style: { position: 'relative' },
      } satisfies Omit<RootProps, 'ref'>;

      if (!external) return { ...props, ref: setRoot };

      // Held steady for the same reason the connector's is: a fresh ref identity every render has
      // React detach and re-attach, which here would empty `rootRef` and re-fill it on every
      // pass, with a measurement in between reading a root that is null.
      if (merged.current?.external !== external) {
        merged.current = { external, ref: mergeRefs(setRoot, external) };
      }

      return { ...props, ref: merged.current.ref };
    },
    [setRoot],
  );

  return { getRootProps, getCanvasProps, getConnectorGroupProps };
}
