import { render } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { triggerResizeObservers } from './helpers/observers';
import { setRect } from './helpers/rects';

/**
 * Guards the safety net itself.
 *
 * `setup.ts` once stubbed `getBoundingClientRect` and `querySelector` globally, which made
 * every geometry assertion in the suite pass for the wrong reason — one fixed rect for every
 * element cannot distinguish a correct line path from a wrong one. Nothing goes red when that
 * comes back, which is why it is checked here rather than left to review.
 *
 * Everything asserted here shares that property: taking the guarantee away leaves the rest of
 * the suite green. Guarantees whose loss is already loud are deliberately not asserted —
 * deleting the ResizeObserver shim outright fails 122 cases, so it needs no case of its own.
 */

describe('test environment', () => {
  it('does not stub getBoundingClientRect globally', () => {
    const { container } = render(<div className="probe" />);
    const probe = container.querySelector('.probe')!;

    // jsdom has no layout: an unstubbed element must report a zero rect, not a fixture value.
    expect(probe.getBoundingClientRect().width).toBe(0);

    setRect(probe, { x: 5, y: 10, width: 100, height: 20 });

    const rect = probe.getBoundingClientRect();

    expect(rect).toMatchObject({ x: 5, y: 10, width: 100, height: 20, right: 105, bottom: 30 });
  });

  it('leaves querySelector untouched', () => {
    const { container } = render(
      <div className="outer">
        <span className="inner" />
      </div>,
    );

    expect(container.querySelector('.outer')).not.toBeNull();
    expect(container.querySelector('.inner')).not.toBeNull();
    expect(container.querySelector('.nope')).toBeNull();
  });

  it('rect stubs are scoped per element', () => {
    const { container } = render(
      <div>
        <i className="a" />
        <i className="b" />
      </div>,
    );

    setRect(container.querySelector('.a'), { width: 50 });

    expect(container.querySelector('.a')!.getBoundingClientRect().width).toBe(50);
    expect(container.querySelector('.b')!.getBoundingClientRect().width).toBe(0);
  });

  it('the ResizeObserver shim stays silent until a test asks it to deliver', () => {
    const { container } = render(<div className="probe" />);
    const probe = container.querySelector('.probe')!;
    const onResize = vi.fn();

    setRect(probe, { width: 120, height: 40 });
    new ResizeObserver(onResize).observe(probe);

    // A shim that delivered here would make every measurement look reactive without the
    // subject ever having subscribed on its own. Swapping one in passes the whole suite.
    expect(onResize, 'observing must not deliver an entry by itself').not.toHaveBeenCalled();

    triggerResizeObservers();

    expect(onResize).toHaveBeenCalledTimes(1);
    expect(onResize.mock.calls[0][0][0].contentRect.width).toBe(120);
  });
});
