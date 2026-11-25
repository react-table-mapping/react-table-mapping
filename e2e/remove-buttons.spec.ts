import { expect, test } from '@playwright/test';

import { mappingLine } from './helpers/dnd';

/**
 * What the row remove buttons need a real browser for.
 *
 * The roving itself — one tab stop per column, arrows, Home/End wrapping, modifier keys,
 * removal handing focus to the next row — is pinned in jsdom by
 * `contract/managing-rows.test.tsx`. What stays here cannot be observed there: scrolling the
 * button the arrows land on into view, a real Shift+Tab walking back to the stop, and Space
 * activating a native button (a keyup default jsdom does not run). Scoped to
 * `.react-table-mapping` since the dev page also renders a headless board.
 */

const PRESET_MAPPING = 'mapping-4-2';
const SOURCE_REMOVES = '.react-table-mapping .source-table-row-container [data-remove-row]';
const TARGET_REMOVES = '.react-table-mapping .target-table-row-container [data-remove-row]';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(mappingLine(page, PRESET_MAPPING)).toBeAttached();
});

for (const [column, selector] of [
  ['source', SOURCE_REMOVES],
  ['target', TARGET_REMOVES],
] as const) {
  test.describe(`${column} remove buttons`, () => {
    test('End and Home leave the button they land on in view', async ({ page }) => {
      await page.setViewportSize({ width: 900, height: 300 });
      const removes = page.locator(selector);

      await removes.first().focus();

      await page.keyboard.press('End');
      await expect(removes.last()).toBeFocused();
      await expect(removes.last()).toBeInViewport();

      await page.keyboard.press('Home');
      await expect(removes.first()).toBeFocused();
      await expect(removes.first()).toBeInViewport();
    });

    test('the stop follows focus, so Shift+Tab returns to where it was left', async ({ page }) => {
      const removes = page.locator(selector);

      await removes.first().focus();
      await page.keyboard.press('ArrowDown');
      await page.keyboard.press('ArrowDown');
      await expect(removes.nth(2)).toBeFocused();
      await expect(removes.nth(2)).toHaveAttribute('tabindex', '0');
      await expect(removes.first()).toHaveAttribute('tabindex', '-1');

      await page.keyboard.press('Tab');
      await expect(removes.nth(2)).not.toBeFocused();

      await page.keyboard.press('Shift+Tab');
      await expect(removes.nth(2)).toBeFocused();
    });
  });
}

test('Space on a remove button removes the row', async ({ page }) => {
  const removes = page.locator(SOURCE_REMOVES);
  const count = await removes.count();

  await removes.first().focus();
  await page.keyboard.press('Space');

  await expect(removes).toHaveCount(count - 1);
});
