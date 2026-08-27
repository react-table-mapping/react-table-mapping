import { type Page, expect, test } from '@playwright/test';

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

/**
 * Waits until the mapping line stops moving.
 *
 * Lines are measured after the commit that changes them, so there is a frame in which one is
 * on screen along a path belonging to the layout before. Disabling makes that frame easy to
 * land on: it takes the remove button and its spacer out of every target row, which moves the
 * target connectors and so both ends of the line.
 */
const linePath = async (page: Page) =>
  (await mappingLine(page, PRESET_MAPPING).locator('path.line-base').getAttribute('d')) ?? '';

const lineSettled = async (page: Page) => {
  const read = () => linePath(page);

  let previous = await read();

  await expect
    .poll(async () => {
      const current = await read();
      const settled = current !== '' && current === previous;

      previous = current;

      return settled;
    })
    .toBe(true);
};

test.describe('styled appearance', () => {
  test.skip(({ browserName }) => browserName !== 'chromium', 'baselines are kept for one engine');
  test.skip(!!process.env.CI, 'baselines belong to the machine that took them');

  test.beforeEach(async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    await lineSettled(page);
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
    await lineSettled(page);

    // The line is masked here and only here. Its own rasterisation drifts by a few hundred
    // pixels about one run in twelve while the DOM behind it is identical — path data, stroke,
    // marker and class all measured the same across twenty replays. Raising the tolerance
    // instead would have swallowed real changes: the connectors going from div to button showed
    // up as 263. What this shot is for — the tables and connectors while disabled — is
    // untouched by the mask, and the line is frozen in `default.png`.
    await expect(page).toHaveScreenshot('disabled.png', {
      fullPage: true,
      mask: [page.locator('.mapping-svg')],
    });
  });

  test('with no rows on either side', async ({ page }) => {
    await page.getByRole('button', { name: 'Clear Mappings' }).click();

    await expect(mappingLine(page, PRESET_MAPPING)).not.toBeAttached();

    await expect(page).toHaveScreenshot('no-mappings.png', { fullPage: true });
  });
});
