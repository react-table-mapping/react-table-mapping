import { useCallback, useRef } from 'react';

import { mergeRefs } from '@/headless/internal/mergeRefs';

export interface GetRootPropsParams {
  /**
   * A ref of your own. It is merged with the one the measuring needs, rather than replacing
   * it — writing `ref` on the tag instead would leave every line unmeasured.
   */
  ref?: React.Ref<HTMLElement>;
}

export interface RootProps {
  ref: React.RefCallback<HTMLElement>;
  role: 'group';
  style: React.CSSProperties;
}

export interface CanvasProps {
  'aria-hidden': true;
  style: React.CSSProperties;
}

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
    ({ ref: external }: GetRootPropsParams = {}): RootProps => {
      const props = { role: 'group', style: { position: 'relative' } } satisfies Omit<RootProps, 'ref'>;

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

  const getCanvasProps = useCallback(
    (): CanvasProps => ({
      'aria-hidden': true,
      style: { position: 'absolute', inset: 0, pointerEvents: 'none' },
    }),
    [],
  );

  return { getRootProps, getCanvasProps };
}
