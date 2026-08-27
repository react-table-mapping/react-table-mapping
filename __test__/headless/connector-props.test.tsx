import { fireEvent, render, screen } from '@testing-library/react';
import { useEffect, useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useConnectorProps } from '@/headless/internal/useConnectorProps';
import { type ConnectorRegistry, useConnectorRegistry } from '@/headless/internal/useConnectorRegistry';
import type { PointerDragHandlers } from '@/headless/internal/usePointerDrag';

/**
 * What a connector element gets handed, and what a caller may hand back.
 *
 * The registration is the part that cannot be seen from outside: nothing throws when it is
 * lost, the lines to that row simply stop being drawn. So these reach into the registry to ask
 * which element it is holding, rather than inferring it from a rendered line.
 */

/** Stable across renders, as the real one from `usePointerDrag` is. */
const handlers: PointerDragHandlers = {
  onPointerDown: () => {},
  onPointerMove: () => {},
  onPointerUp: () => {},
  onPointerCancel: () => {},
};
const sourceHandlers = () => handlers;

interface HarnessProps {
  /** A ref of the caller's own, as a consumer would pass one through the getter. */
  connectorRef?: React.Ref<HTMLElement>;
  /** Assigned after every commit so a test can ask the registry what it holds. */
  registryOut?: { current: ConnectorRegistry | null };
  /** Changing this re-renders without changing anything the getter reads. */
  unrelated?: string;
}

const Harness = ({ connectorRef, registryOut, unrelated }: HarnessProps) => {
  const registry = useConnectorRegistry();
  const getConnectorProps = useConnectorProps({ registry, sourceHandlers });

  useEffect(() => {
    if (registryOut) registryOut.current = registry;
  });

  return (
    <div title={unrelated}>
      <button {...getConnectorProps({ side: 'source', id: 'source-1', ref: connectorRef })} data-testid="connector" />
    </div>
  );
};

describe('getConnectorProps', () => {
  it('registers the element and hands the same one to a ref of the caller', () => {
    const connectorRef = { current: null as HTMLElement | null };
    const registryOut = { current: null as ConnectorRegistry | null };

    render(<Harness connectorRef={connectorRef} registryOut={registryOut} />);

    const element = screen.getByTestId('connector');

    expect(connectorRef.current).toBe(element);
    expect(registryOut.current?.getConnector('source', 'source-1')).toBe(element);
  });

  it('holds the merged ref steady, so an unrelated render does not detach the element', () => {
    const connectorRef = vi.fn();

    const { rerender } = render(<Harness connectorRef={connectorRef} unrelated="before" />);

    expect(connectorRef).toHaveBeenCalledTimes(1);

    rerender(<Harness connectorRef={connectorRef} unrelated="after" />);

    // A fresh ref identity would have React detach and re-attach here, which for a connector is
    // unregister → register → a version bump → the render that does it again.
    expect(connectorRef).toHaveBeenCalledTimes(1);
  });

  it('moves the element over when the caller swaps in a different ref', () => {
    const first = { current: null as HTMLElement | null };
    const second = { current: null as HTMLElement | null };
    const registryOut = { current: null as ConnectorRegistry | null };

    const { rerender } = render(<Harness connectorRef={first} registryOut={registryOut} />);

    rerender(<Harness connectorRef={second} registryOut={registryOut} />);

    const element = screen.getByTestId('connector');

    expect(first.current).toBeNull();
    expect(second.current).toBe(element);
    // The swap detaches and re-attaches, so the registration has to survive being torn down.
    expect(registryOut.current?.getConnector('source', 'source-1')).toBe(element);
  });

  it('leaves a surrounding form alone when a connector is pressed', () => {
    const onSubmit = vi.fn((event: React.FormEvent) => event.preventDefault());

    const FormHarness = () => {
      const registry = useConnectorRegistry();
      const getConnectorProps = useConnectorProps({ registry, sourceHandlers });
      const formRef = useRef<HTMLFormElement>(null);

      return (
        <form ref={formRef} onSubmit={onSubmit}>
          <button {...getConnectorProps({ side: 'source', id: 'source-1' })} data-testid="connector" />
        </form>
      );
    };

    render(<FormHarness />);
    fireEvent.click(screen.getByTestId('connector'));

    expect(onSubmit).not.toHaveBeenCalled();
  });
});
