import { describe, expect, it, vi } from 'vitest';

import { mergeRefs } from '@/headless/internal/mergeRefs';

/**
 * The one prop a caller cannot merge for themselves.
 *
 * Handlers, classes and styles can all be composed at the call site — chain the functions, join
 * the strings, spread the objects. A ref cannot: JSX takes one, and the last one written wins.
 * That is why this exists and why nothing else does.
 *
 * Filed under `headless/` because the prop getters are what `/headless` publishes, and every
 * getter that needs the node goes through here.
 */

describe('mergeRefs', () => {
  it('gives the node to the component and to a caller holding a ref object', () => {
    const internal = vi.fn();
    const external = { current: null as string | null };

    mergeRefs<string>(internal, external)('node');

    expect(internal).toHaveBeenCalledWith('node');
    expect(external.current).toBe('node');
  });

  it('gives the node to a caller holding a callback ref', () => {
    const internal = vi.fn();
    const external = vi.fn();

    mergeRefs<string>(internal, external)('node');

    expect(internal).toHaveBeenCalledWith('node');
    expect(external).toHaveBeenCalledWith('node');
  });

  it('passes the unmount along to both, so neither holds a detached node', () => {
    const internal = vi.fn();
    const external = { current: 'node' as string | null };

    mergeRefs<string>(internal, external)(null);

    expect(internal).toHaveBeenCalledWith(null);
    expect(external.current).toBeNull();
  });

  it('hands back the very same callback when the caller supplied none', () => {
    const internal = vi.fn();

    // Identity, not just behaviour: a new function here would be detached and re-attached every
    // render, and for a connector that is unregister → register → the render that repeats it.
    expect(mergeRefs<string>(internal, undefined)).toBe(internal);
  });
});
