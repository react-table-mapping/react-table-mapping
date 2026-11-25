import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

import { FakeResizeObserver, resetResizeObservers } from './helpers/observers';
import { resetRects } from './helpers/rects';

/**
 * Environment shims only.
 *
 * This file used to monkey-patch `HTMLElement.prototype.querySelector` (returning a fake
 * for `connector-*` selectors and null for everything else) and
 * `HTMLElement/SVGElement.prototype.getBoundingClientRect` (one fixed rect for every
 * element). Both are gone: with a single fixed rect for all elements, no test could
 * distinguish a correct line path from a wrong one, so geometry regressions were
 * undetectable by construction.
 *
 * Tests that need layout now install per-element stubs via `helpers/rects.ts`.
 */

// matchMedia — required by Radix primitives, absent in jsdom.
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// ResizeObserver — absent in jsdom, and useGeometry depends on it. The fake only delivers
// when a test calls triggerResizeObservers(), so a test that relies on a resize has to say so.
globalThis.ResizeObserver = FakeResizeObserver;

// MutationObserver is implemented natively by jsdom and is left alone. `TableMapping` used to
// track container height with it and no longer does, so nothing here depends on it — but
// replacing a working native implementation with a fake only removes signal.

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  resetRects();
  resetResizeObservers();
});
