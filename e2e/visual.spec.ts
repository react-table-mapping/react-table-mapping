import { expect, test } from '@playwright/test';

import { mappingLine } from './helpers/dnd';

/**
 * Pixel baseline for the styled layer, captured before it is rebuilt on the headless API.
 *
 * `contract/dom-contract.test.tsx` freezes the class names and the element hierarchy; this
 * freezes what they render to. The two catch different mistakes — swapping the connector for a
 * `<button>` without the reset CSS that goes with it leaves the structure snapshot untouched
 * and only shows up here.
 *
 * Chromium only. The other two engines rasterise text and antialias differently, so keeping
 * baselines for all three would mean three sets that disagree for reasons no change caused.
 * A pixel difference that is real will show up in one engine as readily as in three.
 *
 * Baselines carry the platform that took them in their filename, and only one platform's are
 * committed. This runs locally and is skipped on CI, which is a different OS and would find no
 * baseline of its own to compare against — so this is a tool for whoever is mid-rebuild, not a
 * gate on every push. Regenerate with `--update-snapshots` and read the diff before keeping it.
 */

const PRESET_MAPPING = 'mapping-4-2';

test.describe('styled appearance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are kept for one engine');
  test.skip(!!process.env.CI, 'baselines belong to the machine that took them');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    // Lines are measured after the first commit, so the mapping is on screen before its path
    // has a value. Waiting for the path keeps the capture off that intermediate frame.
    await expect
      .poll(async () => (await mappingLine(page, PRESET_MAPPING).locator('path.line-base').getAttribute('d')) ?? '')
      .not.toBe('');
  });

  test('with a mapping drawn', async ({ page }) => {
    await expect(page).toHaveScreenshot('default.png', { fullPage: true });
  });

  test('while disabled', async ({ page }) => {
    const toggle = page.getByRole('checkbox');

    await toggle.check();
    // Checking leaves the focus ring on the control that did it, which lands in the capture
    // and differs run to run. Move focus off it, then wait for the state the shot is about.
    await toggle.blur();

    await expect(page.locator('#connector-source-0')).toHaveCSS('pointer-events', 'none');

    await expect(page).toHaveScreenshot('disabled.png', { fullPage: true });
  });

  test('with no rows on either side', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear Mappings' }).click();

    await expect(mappingLine(page, PRESET_MAPPING)).not.toBeAttached();

    await expect(page).toHaveScreenshot('no-mappings.png', { fullPage: true });
  });
});
