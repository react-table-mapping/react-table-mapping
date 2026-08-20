import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { setRect } from './helpers/rects';

/**
 * Guards the safety net itself.
 *
 * `setup.ts` once stubbed `getBoundingClientRect` and `querySelector` globally, which made
 * every geometry assertion in the suite pass for the wrong reason — one fixed rect for every
 * element cannot distinguish a correct line path from a wrong one. Nothing goes red when that
 * comes back, which is why it is checked here rather than left to review.
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
});
