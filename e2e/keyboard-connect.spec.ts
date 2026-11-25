import { type Page, expect, test } from '@playwright/test';

import { mappingLine, mappingLines } from './helpers/dnd';

/**
 * What making a connection without a pointer needs a real browser for.
 *
 * The keyboard model itself — Enter and Space, arrows and Home/End, Escape, focus returning to
 * the source, the announcements — is pinned in jsdom by `contract/creating-mappings.test.tsx`.
 * What stays here cannot be observed there: the arrow keys not scrolling the page, a real mouse
 * click from source to target, a drag taking over a connection a click started (real pointer
 * geometry), the Space keyup not restarting a connection (a browser default jsdom does not run),
 * and a real Tab leaving the group, which is what cancels a connection.
 *
 * Driven against the styled component, since that is what a consumer gets by default.
 */

const PRESET_MAPPING = 'mapping-4-2';
const SOURCE = '#connector-source-0';

/**
 * The styled board's running commentary, as a screen reader would receive it.
 *
 * Scoped to that board: the dev page renders a second one built on `/headless`, and each has
 * a live region of its own — which is right, since one board should not narrate another's
 * connections.
 */
const liveRegion = (page: Page) => page.locator('.react-table-mapping [role="status"][aria-live="polite"]');

test.describe('connecting with the keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(mappingLine(page, PRESET_MAPPING)).toBeAttached();
  });

  test('the arrow keys do not scroll the page', async ({ page }) => {
    await page.setViewportSize({ width: 900, height: 400 });
    await page.locator(SOURCE).focus();
    await page.keyboard.press('Enter');

    const before = await page.evaluate(() => window.scrollY);

    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('ArrowDown');

    // Scrolling here would take the connector being walked to out from under the caret.
    expect(await page.evaluate(() => window.scrollY)).toBe(before);
  });

  test('a mouse click on a source starts a connection, and a click on a target connects it', async ({ page }) => {
    const before = await mappingLines(page).count();

    await page.locator(SOURCE).click();

    await expect(page.locator(SOURCE)).toHaveAttribute('data-connecting', 'true');
    await expect(page.locator('#connector-target-0')).toBeFocused();

    await page.locator('#connector-target-1').click();

    await expect(mappingLines(page)).toHaveCount(before + 1);
    await expect(page.locator(SOURCE)).toBeFocused();
    await expect(page.locator(SOURCE)).not.toHaveAttribute('data-connecting', 'true');
  });

  test('a drag from another source takes over a connection started by a click', async ({ page }) => {
    const before = await mappingLines(page).count();

    await page.locator(SOURCE).click();
    await expect(page.locator(SOURCE)).toHaveAttribute('data-connecting', 'true');

    const from = await page.locator('#connector-source-1').boundingBox();
    const to = await page.locator('#connector-target-1').boundingBox();

    if (!from || !to) throw new Error('connector has no box');

    const startX = from.x + from.width / 2;
    const startY = from.y + from.height / 2;
    const endX = to.x + to.width / 2;
    const endY = to.y + to.height / 2;

    await page.mouse.move(startX, startY);
    await page.mouse.down();
    // Asserted here: once the drag completes, its own "Connected ..." replaces this message.
    await expect(liveRegion(page)).toContainText(/Cancelled connecting from KEY\./);
    for (let step = 1; step <= 3; step++) {
      await page.mouse.move(startX + ((endX - startX) * step) / 3, startY + ((endY - startY) * step) / 3);
      await page.waitForTimeout(20);
    }
    await page.mouse.up();

    await expect(mappingLines(page)).toHaveCount(before + 1);
    await expect(page.locator('.react-table-mapping [data-connecting]')).toHaveCount(0);
  });

  test('Space to confirm does not start a second connection on the source it returns to', async ({ page }) => {
    // Space activates a button on keyup. Focus has moved to the source by then; if the keyup
    // reached it, a new connection would start on its own.
    await page.locator(SOURCE).focus();
    await page.keyboard.press('Space');
    await page.keyboard.press('ArrowDown');
    await page.keyboard.press('Space');

    await expect(page.locator(SOURCE)).toBeFocused();
    await expect(page.locator(SOURCE)).not.toHaveAttribute('data-connecting', 'true');
  });

  test('leaving the connectors mid-connection cancels it', async ({ page }) => {
    await page.locator(SOURCE).focus();
    await page.keyboard.press('Enter');
    await page.keyboard.press('Tab');

    await expect(page.locator(SOURCE)).not.toHaveAttribute('data-connecting', 'true');
    await expect(liveRegion(page)).toContainText('Cancelled connecting');
  });
});

/** Who holds focus, named the way the ids are. */
const focused = (page: Page) => page.evaluate(() => document.activeElement?.id ?? '');

test.describe('moving between connectors', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    await expect(mappingLine(page, PRESET_MAPPING)).toBeAttached();
  });

  test('Tab leaves the connectors rather than cycling through them', async ({ page }) => {
    await page.locator(SOURCE).focus();
    await page.keyboard.press('Tab');

    // Tab belongs to the browser and to whoever is reading the page. Taking it over to walk
    // within the group would make one press mean something different here than everywhere
    // else, and there is no way for a reader to know that in advance.
    expect(await focused(page)).not.toBe('connector-source-1');
  });
});
