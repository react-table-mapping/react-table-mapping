/**
 * A ResizeObserver that only fires when a test tells it to.
 *
 * jsdom has no ResizeObserver, and `useGeometry` needs one, so the suite has to supply it.
 * The fake is deliberately inert: nothing is delivered until `triggerResizeObservers()` is
 * called. A fake that auto-fired would make measurement look reactive in tests without
 * proving the component ever subscribed, and a test that depends on a resize should have to
 * say so out loud.
 *
 * This file was removed once, when the observer was installed globally ahead of any consumer
 * and the only thing exercising it was the test asserting it existed. It is back because
 * src/ now uses the API.
 *
 * `environment.test.tsx` pins the inertness, because losing it is silent: a shim that
 * delivers on `observe()` passes all 19 test files. Losing the shim altogether is not
 * silent — that fails 122 cases — so nothing asserts its mere existence.
 */

type ObserverCallback = (entries: ResizeObserverEntry[], observer: ResizeObserver) => void;

const live = new Set<FakeResizeObserver>();

export class FakeResizeObserver implements ResizeObserver {
  private readonly callback: ObserverCallback;
  private readonly targets = new Set<Element>();

  constructor(callback: ObserverCallback) {
    this.callback = callback;
    live.add(this);
  }

  observe(target: Element): void {
    this.targets.add(target);
  }

  unobserve(target: Element): void {
    this.targets.delete(target);
  }

  disconnect(): void {
    this.targets.clear();
    live.delete(this);
  }

  /** Delivers one entry per observed target, carrying that element's stubbed rect. */
  flush(): void {
    if (this.targets.size === 0) return;

    const entries = [...this.targets].map((target) => {
      const rect = target.getBoundingClientRect();

      return {
        target,
        contentRect: rect,
        borderBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        contentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
        devicePixelContentBoxSize: [{ inlineSize: rect.width, blockSize: rect.height }],
      } as unknown as ResizeObserverEntry;
    });

    this.callback(entries, this);
  }
}

/** Delivers a resize to every observer currently connected. */
export function triggerResizeObservers(): void {
  [...live].forEach((observer) => observer.flush());
}

export function liveResizeObserverCount(): number {
  return live.size;
}

export function resetResizeObservers(): void {
  live.clear();
}
