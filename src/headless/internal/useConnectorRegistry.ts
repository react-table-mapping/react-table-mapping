import { useCallback, useMemo, useRef, useState } from 'react';

export type ConnectorSide = 'source' | 'target';

/** What React calls with the connector node on mount and with null on unmount. */
export type ConnectorRefCallback = (element: Element | null) => void;

export interface ConnectorRegistry {
  /**
   * The ref callback belonging to one connector — spread it onto the element as
   * `ref={registry.connectorRef('source', field.id)}`. It does not register anything itself;
   * React does, by calling it.
   *
   * The same function comes back for the same side and id. A ref callback with a fresh
   * identity on every render is detached and re-attached each time, so an unstable one here
   * would unregister and re-register on every pass — and since that changes `version`, it
   * would schedule the render that does it again.
   */
  connectorRef: (side: ConnectorSide, id: string) => ConnectorRefCallback;
  /** The element currently mounted for one connector, or undefined if there is none. */
  getConnector: (side: ConnectorSide, id: string) => Element | undefined;
  /** Bumps whenever an element enters or leaves, so measurement can re-run. */
  version: number;
}

const generateConnectorKey = (side: ConnectorSide, id: string) => `${side}:${id}`;

/**
 * Tracks the connector element belonging to each row.
 *
 * Measurement used to find these with `querySelector('#connector-source-…')`, which tied the
 * geometry to a DOM id convention and to the elements living inside one known container. A
 * registry fed by ref callbacks holds the elements directly, so a consumer can render its
 * connectors anywhere, under any id, or none at all.
 *
 * `version` changes only on registration and unregistration — not on every render — so a
 * measurement pass can depend on it without re-running for unrelated reasons.
 */
export function useConnectorRegistry(): ConnectorRegistry {
  const connectors = useRef(new Map<string, Element>());
  const refCallbacks = useRef(new Map<string, ConnectorRefCallback>());
  const [version, setVersion] = useState(0);

  const connectorRef = useCallback((side: ConnectorSide, id: string) => {
    const key = generateConnectorKey(side, id);
    const existing = refCallbacks.current.get(key);

    if (existing) return existing;

    const refCallback: ConnectorRefCallback = (element) => {
      if (element === null) {
        if (connectors.current.delete(key)) {
          setVersion((previous) => previous + 1);
        }

        return;
      }

      if (connectors.current.get(key) === element) return;

      connectors.current.set(key, element);
      setVersion((previous) => previous + 1);
    };

    refCallbacks.current.set(key, refCallback);

    return refCallback;
  }, []);

  const getConnector = useCallback(
    (side: ConnectorSide, id: string) => connectors.current.get(generateConnectorKey(side, id)),
    [],
  );

  return useMemo(() => ({ connectorRef, getConnector, version }), [connectorRef, getConnector, version]);
}
