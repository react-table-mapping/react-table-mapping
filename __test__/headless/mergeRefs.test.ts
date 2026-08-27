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
    const ours = vi.fn();
    const theirs = { current: null as string | null };

    mergeRefs<string>(ours, theirs)('node');

    expect(ours).toHaveBeenCalledWith('node');
    expect(theirs.current).toBe('node');
  });

  it('gives the node to a caller holding a callback ref', () => {
    const ours = vi.fn();
    const theirs = vi.fn();

    mergeRefs<string>(ours, theirs)('node');

    expect(ours).toHaveBeenCalledWith('node');
    expect(theirs).toHaveBeenCalledWith('node');
  });

  it('passes the unmount along to both, so neither holds a detached node', () => {
    const ours = vi.fn();
    const theirs = { current: 'node' as string | null };

    mergeRefs<string>(ours, theirs)(null);

    expect(ours).toHaveBeenCalledWith(null);
    expect(theirs.current).toBeNull();
  });

  it('hands back the very same callback when the caller supplied none', () => {
    const ours = vi.fn();

    // Identity, not just behaviour: a new function here would be detached and re-attached every
    // render, and for a connector that is unregister → register → the render that repeats it.
    expect(mergeRefs<string>(ours, undefined)).toBe(ours);
  });
});
