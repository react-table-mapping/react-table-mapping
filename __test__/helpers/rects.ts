/**
 * Per-test element rect stubs.
 *
 * Replaces the previous global monkey-patch of `HTMLElement.prototype.getBoundingClientRect`,
 * which returned one fixed value for every element and therefore could not — in principle —
 * detect a geometry regression. Stubs installed here are scoped to individual elements and
 * are torn down automatically after each test (see `__test__/setup.ts`).
 */

export interface RectInit {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const patched = new Set<Element>();

function toRect({ x = 0, y = 0, width = 0, height = 0 }: RectInit): DOMRect {
  const rect = {
    x,
    y,
    width,
    height,
    top: y,
    left: x,
    right: x + width,
    bottom: y + height,
    toJSON() {
      return { ...rect };
    },
  };

  return rect as DOMRect;
}

/**
 * Stub a single element's bounding rect.
 */
export function setRect(el: Element | null, init: RectInit): void {
  if (!el) throw new Error('setRect() called with no element — check the selector.');

  const rect = toRect(init);

  Object.defineProperty(el, 'getBoundingClientRect', {
    configurable: true,
    writable: true,
    value: () => rect,
  });

  patched.add(el);
}

/**
 * Stub every element matching `selector` within `root`, deriving each rect from its index.
 * Useful for laying out N table rows at a fixed pitch.
 */
export function setRectsBySelector(
  root: ParentNode,
  selector: string,
  init: (index: number, el: Element) => RectInit,
): void {
  root.querySelectorAll(selector).forEach((el, index) => setRect(el, init(index, el)));
}

/**
 * Remove every stub installed since the last reset.
 */
export function resetRects(): void {
  patched.forEach((el) => {
    delete (el as unknown as Record<string, unknown>).getBoundingClientRect;
  });
  patched.clear();
}
