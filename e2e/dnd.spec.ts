import { expect, test } from '@playwright/test';

import { dragConnector, mappingLine, mappingLineHitArea, mappingLines } from './helpers/dnd';

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

  /**
   * A drop reaches a connector from up to 15px away, measured from its left edge — the point a
   * line arrives at. Releasing on the centre, which every other drag here does, leaves the
   * connector itself under the cursor and never puts that reach in play.
   */
  test('connects when released short of the connector but inside its reach', async ({ page }) => {
    await dragConnector({ page, from: SOURCE_CONNECTOR, to: TARGET_CONNECTOR, releaseShortBy: 12 });

    await expect(mappingLine(page, DRAWN_MAPPING)).toBeAttached();
  });

  test('connects nothing when released beyond that reach', async ({ page }) => {
    await dragConnector({ page, from: SOURCE_CONNECTOR, to: TARGET_CONNECTOR, releaseShortBy: 30 });

    await expect(mappingLine(page, DRAWN_MAPPING)).not.toBeAttached();
    await expect(mappingLines(page), 'only the preset mapping should be left').toHaveCount(1);
  });

  test('removes only the line that was clicked', async ({ page }) => {
    await dragConnector({ page, from: SOURCE_CONNECTOR, to: TARGET_CONNECTOR });

    await expect(mappingLine(page, DRAWN_MAPPING)).toBeAttached();

    await mappingLineHitArea(page, DRAWN_MAPPING).click({ force: true });

    await expect(mappingLine(page, DRAWN_MAPPING)).not.toBeAttached();
    await expect(mappingLine(page, PRESET_MAPPING), 'the untouched mapping should survive').toBeAttached();
  });
});
