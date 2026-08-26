import { type Page, expect, test } from '@playwright/test';

import { performDragAndDrop, verifyMappingCount } from './helpers/dnd';

/**
 * Phase 0 safety net — behavioural e2e baseline.
 *
 * Before this file the entire regression net for the headless migration was two tests
 * (`dnd.spec.ts`), which is not enough to gate a six-phase refactor. These cover the
 * paths phases 2-4 actually rewrite: geometry re-measurement after a layout change,
 * line-type rendering, the disabled guard, and the ref-driven mutation API.
 *
 * Fixture is `src/App.tsx`: 5 sources, 3 targets, one preset mapping `mapping-4-2`.
 */

const PRESET_MAPPING = '[data-testid="mapping-line-mapping-4-2"] path.line-base';

/**
 * Read a path's `d`, waiting for it to be populated.
 *
 * The current implementation attaches the `<path>` with `d=""` and fills it in on a
 * follow-up render, so a bare getAttribute() races the second render under load.
 * Polling keeps this honest: if the path never fills in, this still fails.
 */
async function pathOf(page: Page, selector: string): Promise<string> {
  const locator = page.locator(selector).first();

  await expect
    .poll(async () => (await locator.getAttribute('d')) ?? '', { message: `expected a path for ${selector}` })
    .not.toBe('');

  return (await locator.getAttribute('d'))!;
}

test.describe('mapping geometry', () => {
  test('re-measures every line when a row above the mapping is removed', async ({ page }) => {
    await page.goto('/');

    const before = await pathOf(page, PRESET_MAPPING);

    // Remove the first source row. Sources below it shift up, so the preset mapping's
    // start anchor must move — this is the measurement path phase 2 replaces.
    await page.locator('.source-table-body .mapping-button').first().click();

    await expect(page.locator('[data-testid^="connector-source-"]')).toHaveCount(4);

    await expect
      .poll(async () => pathOf(page, PRESET_MAPPING), { message: 'line path should be recomputed' })
      .not.toBe(before);

    await verifyMappingCount(page, 1);
  });

  test('re-measures when a source is appended', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Add Source' }).click();

    await expect(page.locator('[data-testid^="connector-source-"]')).toHaveCount(6);
    await verifyMappingCount(page, 1);

    // The preset line must still resolve to a real path after the table grows.
    expect(await pathOf(page, PRESET_MAPPING)).toMatch(/^M [\d.-]+ [\d.-]+/);
  });

  test('re-measures every line when the viewport narrows', async ({ page }) => {
    // A viewport change must leave every line attached to its connectors. One path delivers
    // that — the container's ResizeObserver — since the window listener that used to route a
    // resize through redraw() is gone, so this case now fails if that observer stops working.
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');

    const line = page.locator(PRESET_MAPPING).first();
    const before = await line.getAttribute('d');

    await page.setViewportSize({ width: 700, height: 800 });

    await expect.poll(async () => line.getAttribute('d')).not.toBe(before);
  });
});

test.describe('line types', () => {
  test('renders a cubic curve for bezier', async ({ page }) => {
    await page.goto('/');
    await page.locator('select').selectOption('bezier');

    expect(await pathOf(page, PRESET_MAPPING)).toContain(' C ');
  });

  test('renders a single segment for straight', async ({ page }) => {
    await page.goto('/');
    await page.locator('select').selectOption('straight');

    expect(await pathOf(page, PRESET_MAPPING)).toMatch(/^M [\d.-]+ [\d.-]+ L [\d.-]+ [\d.-]+$/);
  });

  test('renders three segments for step', async ({ page }) => {
    await page.goto('/');
    await page.locator('select').selectOption('step');

    const d = await pathOf(page, PRESET_MAPPING);

    expect(d.match(/ L /g) ?? []).toHaveLength(3);
  });
});

test.describe('disabled', () => {
  test('blocks mapping creation and deletion', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('checkbox').check();

    await performDragAndDrop({ page, sourceTestId: 'connector-source-0', targetTestId: 'connector-target-0' });

    await verifyMappingCount(page, 1);

    await page.locator('[data-testid="mapping-line-mapping-4-2"] path.hover-area').click({ force: true });
    await verifyMappingCount(page, 1);
  });
});

test.describe('ref-driven mutations', () => {
  test('clearMappings removes every line', async ({ page }) => {
    await page.goto('/');
    await verifyMappingCount(page, 1);

    await page.getByRole('button', { name: 'Clear Mappings' }).click();
    await verifyMappingCount(page, 0);
  });

  test('sameLineMapping pairs rows up to the shorter table', async ({ page }) => {
    await page.goto('/');

    await page.getByRole('button', { name: 'Same Line Mapping' }).click();

    // 5 sources, 3 targets — the shorter side wins.
    await verifyMappingCount(page, 3);
  });
});
