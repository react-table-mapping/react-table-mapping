import { expect, test } from '@playwright/test';
import type { Page } from '@playwright/test';

import { mappingLine, mappingLineHitArea } from './helpers/dnd';

/**
 * Which line is "active" — the one that shows the remove affordance — is decided by the pointer
 * and by keyboard focus, and the two have to agree on who wins. In e2e because the claims are
 * about real mouse modality: whether a press focuses a line, and whether that focus counts as
 * keyboard focus, is the browser's decision and jsdom makes it differently.
 *
 * The affordance is a red band drawn along the line, as wide as the hit area, so it shows what
 * a click would remove.
 */

const PRESET_MAPPING = 'mapping-4-2';

const ACTIVE = '[data-active]';
const REMOVE_BUTTON = '.mapping-delete-button';
const REMOVE_BAND = '.line-remove-band';

/** A point that is really on the stroke, in viewport coordinates. The bbox centre need not be. */
const pointOnLine = async (page: Page, mappingId: string) => {
  const point = await mappingLineHitArea(page, mappingId).evaluate((path) => {
    const geometry = path as unknown as SVGGeometryElement;
    const matrix = geometry.getScreenCTM();
    const mid = geometry.getPointAtLength(geometry.getTotalLength() / 2);

    if (!matrix) throw new Error('line has no screen transform');

    const mapped = new DOMPoint(mid.x, mid.y).matrixTransform(matrix);

    return { x: mapped.x, y: mapped.y };
  });

  return point;
};

const hover = async (page: Page, mappingId: string) => {
  const { x, y } = await pointOnLine(page, mappingId);

  await page.mouse.move(x, y);
};

/** Somewhere that is neither a line nor the board. */
const moveAway = (page: Page) => page.mouse.move(2, 2);

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(mappingLine(page, PRESET_MAPPING)).toBeAttached();
});

test.describe('a line pressed with the mouse and released elsewhere', () => {
  test('is not left active once the pointer has gone', async ({ page }) => {
    const { x, y } = await pointOnLine(page, PRESET_MAPPING);

    await page.mouse.move(x, y);
    await page.mouse.down();
    // Dragging off the line before releasing means no click, so nothing removes it.
    await page.mouse.move(x + 40, y + 40, { steps: 4 });
    await page.mouse.move(2, 2, { steps: 4 });
    await page.mouse.up();
    await moveAway(page);

    await expect(mappingLine(page, PRESET_MAPPING), 'no click happened, so the line stays').toBeAttached();
    await expect(page.locator(ACTIVE)).toHaveCount(0);
    await expect(page.locator(REMOVE_BUTTON)).toHaveCount(0);
    await expect(page.locator(REMOVE_BAND)).toHaveCount(0);
  });
});

test.describe('hovering a line', () => {
  test('draws one remove band as wide as the area a click would remove, and drops it on leaving', async ({ page }) => {
    await expect(page.locator(REMOVE_BAND)).toHaveCount(0);

    await hover(page, PRESET_MAPPING);

    const line = mappingLine(page, PRESET_MAPPING);
    const band = line.locator(REMOVE_BAND);

    await expect(line, 'the pointer is on the line').toHaveAttribute('data-active', 'true');
    await expect(page.locator(REMOVE_BAND)).toHaveCount(1);
    await expect(band).toHaveCount(1);

    const hitWidth = await mappingLineHitArea(page, PRESET_MAPPING).evaluate(
      (element) => getComputedStyle(element).strokeWidth,
    );

    expect(parseFloat(hitWidth)).toBeGreaterThan(0);
    await expect(band).toHaveCSS('stroke-width', hitWidth);

    await moveAway(page);

    await expect(page.locator(REMOVE_BAND)).toHaveCount(0);
    await expect(page.locator(ACTIVE)).toHaveCount(0);
  });

  test('then clicking still removes that line', async ({ page }) => {
    await hover(page, PRESET_MAPPING);
    await expect(mappingLine(page, PRESET_MAPPING)).toHaveAttribute('data-active', 'true');
    await expect(mappingLine(page, PRESET_MAPPING).locator(REMOVE_BAND)).toHaveCount(1);

    const { x, y } = await pointOnLine(page, PRESET_MAPPING);

    await page.mouse.click(x, y);

    await expect(mappingLine(page, PRESET_MAPPING)).not.toBeAttached();
  });
});
