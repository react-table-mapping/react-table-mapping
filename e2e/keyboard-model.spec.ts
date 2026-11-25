import { expect, test } from '@playwright/test';

import { mappingLine } from './helpers/dnd';

/**
 * The one property of the keyboard model that needs a real Tab: the lines cost a single stop.
 *
 * Stops per column, the connector names, the live region and the aria-hidden audit are pinned in
 * jsdom by `contract/keyboard-access.test.tsx`. Scoped to `.react-table-mapping` because the dev
 * page also renders a headless board.
 */

const PRESET_MAPPING = 'mapping-4-2';
const STYLED_LINES = '.react-table-mapping [data-testid^="mapping-line-"]';

test.beforeEach(async ({ page }) => {
  await page.goto('/');
  await expect(mappingLine(page, PRESET_MAPPING)).toBeAttached();
});

test('the lines are one tab stop however many there are', async ({ page }) => {
  await page.getByRole('button', { name: 'Same Line Mapping' }).click();
  expect(await page.locator(STYLED_LINES).count()).toBeGreaterThan(1);

  await page.locator('.react-table-mapping .mapping-line-group[tabindex="0"]').focus();
  await page.keyboard.press('Tab');

  const stillOnALine = await page.evaluate(() => !!document.activeElement?.closest('.mapping-line-group'));

  expect(stillOnALine).toBe(false);
});
