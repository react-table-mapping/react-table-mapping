import { expect, test } from '@playwright/test';

import { dragConnector, mappingLine, mappingLines } from './helpers/dnd';

/**
 * The demo page starts with one mapping already drawn, so a test that adds one is looking for
 * two. Naming both ids keeps which is which out of the counts.
 */
const PRESET_MAPPING = 'mapping-4-2';
const SOURCE_CONNECTOR = 'connector-source-0';
const TARGET_CONNECTOR = 'connector-target-0';
/** What dragging SOURCE_CONNECTOR onto TARGET_CONNECTOR produces. */
const DRAWN_MAPPING = 'mapping-0-0';

test.describe('drawing a mapping by dragging', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');

    await expect(mappingLine(page, PRESET_MAPPING), 'the page should start with its preset mapping').toBeAttached();
  });

  test('draws a line between the connectors the drag ran between', async ({ page }) => {
    await dragConnector({ page, from: SOURCE_CONNECTOR, to: TARGET_CONNECTOR });

    await expect(mappingLine(page, DRAWN_MAPPING)).toBeAttached();
    await expect(mappingLine(page, PRESET_MAPPING)).toBeAttached();
    await expect(mappingLines(page), 'the drag should add one line and disturb nothing else').toHaveCount(2);
  });

  test('the click that follows a drag does not start a keyboard connection', async ({ page }) => {
    await dragConnector({ page, from: SOURCE_CONNECTOR, to: TARGET_CONNECTOR });

    await expect(mappingLine(page, DRAWN_MAPPING)).toBeAttached();
    await expect(page.locator(`#${SOURCE_CONNECTOR}`)).not.toHaveAttribute('data-connecting', 'true');
    await expect(page.locator(`#${TARGET_CONNECTOR}`)).not.toBeFocused();
  });

  test('the click that follows a drag released beyond reach does not start a keyboard connection', async ({ page }) => {
    await dragConnector({ page, from: SOURCE_CONNECTOR, to: TARGET_CONNECTOR, releaseShortBy: 30 });

    await expect(mappingLine(page, DRAWN_MAPPING)).not.toBeAttached();
    await expect(page.locator(`#${SOURCE_CONNECTOR}`)).not.toHaveAttribute('data-connecting', 'true');
    await expect(page.locator(`#${TARGET_CONNECTOR}`)).not.toBeFocused();
  });
});
