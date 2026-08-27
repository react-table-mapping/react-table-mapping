import type React from 'react';

/**
 * Hands one node to the component's own ref and to whatever ref the caller supplied.
 *
 * JSX has no way to do this: `<div {...props} ref={mine} />` replaces whatever `props` carried,
 * and for a connector that is the registration the geometry reads — the line stops being drawn,
 * with nothing reported. So a prop getter that needs the node has to merge rather than hand its
 * own ref over.
 *
 * **When the caller supplies nothing, `internal` comes back untouched.** That matters more than it
 * looks: a ref callback with a new identity is detached and re-attached by React on every
 * render, which for a connector means unregister → register → a version bump that schedules the
 * render that does it again. Returning the caller's usual `undefined` case unchanged keeps the
 * registry's own cached callback in place, so nothing churns.
 *
 * When the caller does supply one, the result is a new function each call, and the getter has to
 * hold it steady — cache it per element and rebuild only when `external` actually changes.
 */
export function mergeRefs<T>(internal: React.RefCallback<T>, external: React.Ref<T> | undefined): React.RefCallback<T> {
  if (!external) return internal;

  return (node: T | null) => {
    internal(node);

    if (typeof external === 'function') {
      external(node);
    } else {
      external.current = node;
    }
  };
}
