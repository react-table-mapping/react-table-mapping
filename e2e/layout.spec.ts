import { expect, test } from '@playwright/test';

/**
 * The component must not be wider than what contains it.
 *
 * This lives in e2e because it is a question about layout, and jsdom does none: every element
 * reports a zero-sized rect there, so the same assertion would pass whatever the CSS said.
 *
 * The failure it guards against is quiet. `width: 100%` with padding and no `box-sizing` makes
 * the component 40px wider than its container — enough for a horizontal scrollbar on a page
 * with no reset of its own, and a scrollbar gets blamed on the layout around the component
 * rather than on the component.
 */

/** A width the demo has little room at; the narrowest the layout promises to fit. */
const OVERFLOW_WIDTH = 768;

test.describe('the component fits its container', () => {
  test(`no horizontal overflow at ${OVERFLOW_WIDTH}px`, async ({ page }) => {
    await page.setViewportSize({ width: OVERFLOW_WIDTH, height: 1000 });
    await page.goto('/');
    await page.locator('.react-table-mapping').first().waitFor();

    const { client, scroll } = await page.evaluate(() => ({
      client: document.documentElement.clientWidth,
      scroll: document.documentElement.scrollWidth,
    }));

    expect(scroll, `the page scrolls sideways by ${scroll - client}px`).toBeLessThanOrEqual(client);
  });

  test('the root box includes its own padding', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 1000 });
    await page.goto('/');

    const root = page.locator('.react-table-mapping').first();

    await root.waitFor();

    // Stated on the element rather than inherited, so it holds on a page that resets nothing
    // and on one that sets `box-sizing: content-box` globally.
    await expect(root).toHaveCSS('box-sizing', 'border-box');
  });
});
