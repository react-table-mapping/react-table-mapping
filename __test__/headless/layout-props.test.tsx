import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { useLayoutProps } from '@/headless/internal/useLayoutProps';

/**
 * The box everything is measured against, and the canvas laid over it.
 *
 * The root's ref is the one that cannot be lost: `rootRef` empty means every anchor is taken
 * against nothing and no line is ever measured — silently, with the rows still on screen. So
 * these ask what the ref is holding rather than what was rendered.
 *
 * That the canvas ignores the pointer is left to `e2e/dnd.spec.ts`, which clicks a line and a
 * row for real. jsdom does no hit testing, so asserting it here would only be reading back the
 * style this getter just set.
 */

interface HarnessProps {
  rootRef: React.RefObject<HTMLElement | null>;
  /** A ref of the caller's own, passed through the getter. */
  consumerRef?: React.Ref<HTMLElement>;
  /** Changing this re-renders without changing anything the getter reads. */
  unrelated?: string;
}

const Harness = ({ rootRef, consumerRef, unrelated }: HarnessProps) => {
  const { getRootProps, getCanvasProps } = useLayoutProps({ rootRef });

  return (
    <div {...getRootProps({ ref: consumerRef })} data-testid="root" title={unrelated}>
      <svg {...getCanvasProps()} data-testid="canvas" />
    </div>
  );
};

const rootRefHolder = () => ({ current: null }) as React.RefObject<HTMLElement | null>;

describe('getRootProps', () => {
  it('puts the element where the measuring reads it', () => {
    const rootRef = rootRefHolder();

    render(<Harness rootRef={rootRef} />);

    expect(rootRef.current).toBe(screen.getByTestId('root'));
  });

  it('gives the element to a ref of the caller as well as to the measuring', () => {
    const rootRef = rootRefHolder();
    const consumerRef = { current: null as HTMLElement | null };

    render(<Harness rootRef={rootRef} consumerRef={consumerRef} />);

    const root = screen.getByTestId('root');

    expect(rootRef.current).toBe(root);
    expect(consumerRef.current).toBe(root);
  });

  it('holds the merged ref steady, so an unrelated render leaves the root in place', () => {
    const rootRef = rootRefHolder();
    const consumerRef = vi.fn();

    const { rerender } = render(<Harness rootRef={rootRef} consumerRef={consumerRef} unrelated="before" />);

    rerender(<Harness rootRef={rootRef} consumerRef={consumerRef} unrelated="after" />);

    // A fresh identity would detach and re-attach, emptying rootRef in between — and a
    // measurement landing in that gap reads a root that is null and draws nothing.
    expect(consumerRef).toHaveBeenCalledTimes(1);
    expect(rootRef.current).toBe(screen.getByTestId('root'));
  });

  it('lets go of the element when the root unmounts', () => {
    const rootRef = rootRefHolder();

    const { unmount } = render(<Harness rootRef={rootRef} />);

    unmount();

    expect(rootRef.current).toBeNull();
  });
});

describe('getCanvasProps', () => {
  it('keeps the canvas out of the accessibility tree', () => {
    const rootRef = rootRefHolder();

    render(<Harness rootRef={rootRef} />);

    // The lines duplicate what the mapping list already says; announcing them twice is worse
    // than not announcing the drawing at all.
    expect(screen.getByTestId('canvas')).toHaveAttribute('aria-hidden', 'true');
  });

  it('leaves the caller free to keep their own ref on the canvas', () => {
    const canvasRef = { current: null as SVGSVGElement | null };

    const Probe = () => {
      const rootRef = useRef<HTMLElement | null>(null);
      const { getCanvasProps } = useLayoutProps({ rootRef });

      // No ref comes back from this getter, so writing one here collides with nothing.
      return <svg {...getCanvasProps()} ref={canvasRef} data-testid="canvas" />;
    };

    render(<Probe />);

    expect(canvasRef.current).toBe(screen.getByTestId('canvas'));
  });
});
