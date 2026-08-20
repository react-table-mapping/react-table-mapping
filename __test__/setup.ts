import '@testing-library/jest-dom';
import { afterEach, beforeEach, vi } from 'vitest';

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

// MutationObserver is implemented natively by jsdom and is intentionally NOT mocked —
// TableMapping uses it to track container height, so mocking it would erase the behaviour
// under test.
//
// There is deliberately no ResizeObserver fake and no PointerEvent polyfill here. Both were
// installed globally in advance of work that had not started, which left every test running
// against fixtures nothing in `src/` used. Install them in the file that needs them, when
// something needs them.

beforeEach(() => {
  vi.clearAllMocks();
});

afterEach(() => {
  resetRects();
});
