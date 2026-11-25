import { expect, test } from '@playwright/test';

import { mappingLine, mappingLines } from './helpers/dnd';

/**
 * What removing a mapping without a mouse needs a real browser for.
 *
 * The line's name, its Enter/Space removal, its active mark and where focus goes afterwards are
 * pinned in jsdom by `contract/removing-mappings.test.tsx`. What stays here is the part that
 * differs between engines: a focusable SVG `<g>` actually taking focus and answering Enter, and
 * the UA focus ring not being drawn as a box around the canvas. Run in all three engines on
 * purpose, since the design rests on them not differing.
 */

const PRESET_MAPPING = 'mapping-4-2';

test.describe('removing a mapping with the keyboard', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('http://localhost:5173/');

    await expect(mappingLine(page, PRESET_MAPPING), 'the page should start with its preset mapping').toBeAttached();
  });

  test('Enter on a focused line removes it', async ({ page }) => {
    const line = mappingLine(page, PRESET_MAPPING);

    await line.focus();
    await expect(line).toBeFocused();

    await page.keyboard.press('Enter');

    await expect(line).not.toBeAttached();
    await expect(mappingLines(page)).toHaveCount(0);
  });

  test('no box is drawn around the canvas when a line takes focus', async ({ page }) => {
    const line = mappingLine(page, PRESET_MAPPING);

    await line.focus();

    // The UA ring is a rectangle around the group's bounding box, which for a curve spanning
    // the canvas is a box around the whole canvas. Replaced by a glow along the line itself.
    await expect(line).toHaveCSS('outline-style', 'none');
  });
});
