import { useCallback, useRef } from 'react';

import { mergeRefs } from '@/headless/internal/mergeRefs';
import type { ConnectorRegistry, ConnectorSide } from '@/headless/internal/useConnectorRegistry';
import type { PointerDragHandlers } from '@/headless/internal/usePointerDrag';

export interface GetConnectorPropsParams {
  side: ConnectorSide;
  id: string;
  /**
   * A ref of your own. It is merged with the one this getter already needs on the element,
   * rather than replacing it — writing `ref` on the tag instead would drop the registration and
   * the lines to that row would quietly stop being drawn.
   */
  ref?: React.Ref<HTMLElement>;
}

/**
 * What a connector element needs to be one. Everything else about it — where it sits, how big
 * it is, what it looks like — belongs to whoever renders it.
 */
export interface ConnectorProps extends Partial<PointerDragHandlers> {
  ref: React.RefCallback<HTMLElement>;
  /** A `<button>` inside a `<form>` submits it unless told otherwise. */
  type: 'button';
  'data-side': ConnectorSide;
}

export interface UseConnectorPropsParams {
  registry: ConnectorRegistry;
  sourceHandlers: (sourceId: string) => PointerDragHandlers;
}

/**
 * Builds the props for one connector.
 *
 * Only source connectors carry pointer handlers: a drag is captured by the element it starts
 * on, so the target end of the gesture is found by measuring rather than by listening.
 *
 * The merged ref is cached per connector because a ref callback with a fresh identity is
 * detached and re-attached by React on every render — here that means unregister → register →
 * a version bump → the render that does it again. Nothing is cached when no ref was supplied:
 * the registry's own callback is already stable, and it comes back untouched.
 */
export function useConnectorProps({ registry, sourceHandlers }: UseConnectorPropsParams) {
  const mergedRefs = useRef(
    new Map<string, { external: React.Ref<HTMLElement>; ref: React.RefCallback<HTMLElement> }>(),
  );

  return useCallback(
    ({ side, id, ref: external }: GetConnectorPropsParams): ConnectorProps => {
      const internal = registry.connectorRef(side, id);

      const props: ConnectorProps = {
        ref: internal,
        type: 'button',
        'data-side': side,
        ...(side === 'source' ? sourceHandlers(id) : {}),
      };

      if (!external) return props;

      const key = `${side}:${id}`;
      const cached = mergedRefs.current.get(key);

      if (cached?.external === external) return { ...props, ref: cached.ref };

      const ref = mergeRefs<HTMLElement>(internal, external);

      mergedRefs.current.set(key, { external, ref });

      return { ...props, ref };
    },
    [registry, sourceHandlers],
  );
}
