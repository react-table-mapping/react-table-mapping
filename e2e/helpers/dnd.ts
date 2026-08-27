import type { Page } from '@playwright/test';

/** Every mapping line currently drawn. */
export const mappingLines = (page: Page) => page.locator('[data-testid^="mapping-line-"]');

/** One mapping's line, by the mapping's id. */
export const mappingLine = (page: Page, mappingId: string) => page.locator(`[data-testid="mapping-line-${mappingId}"]`);

/** The wide invisible stroke along a line that takes the click to remove it. */
export const mappingLineHitArea = (page: Page, mappingId: string) =>
  page.locator(`[data-testid="mapping-line-${mappingId}"] path.hover-area`);

export interface DragConnectorParams {
  page: Page;
  /** `data-testid` of the source connector to press on. */
  from: string;
  /** `data-testid` of the target connector to drag towards. */
  to: string;
  /**
   * Release this many pixels to the left of the target connector's left edge, instead of on
   * its centre. That edge is where a line arrives and where the reach is measured from, so
   * this is the distance the drop has to cover.
   */
  releaseShortBy?: number;
}

/** Presses a source connector and releases over (or near) a target one. */
export const dragConnector = async ({ page, from, to, releaseShortBy }: DragConnectorParams) => {
  const sourceBox = await page.locator(`[data-testid="${from}"]`).boundingBox();
  const targetBox = await page.locator(`[data-testid="${to}"]`).boundingBox();

  if (!sourceBox || !targetBox) {
    throw new Error(`drag fixture unavailable: ${from}=${!!sourceBox} ${to}=${!!targetBox}`);
  }

  const startX = sourceBox.x + sourceBox.width / 2;
  const startY = sourceBox.y + sourceBox.height / 2;
  const endX = releaseShortBy === undefined ? targetBox.x + targetBox.width / 2 : targetBox.x - releaseShortBy;
  const endY = targetBox.y + targetBox.height / 2;

  await page.mouse.move(startX, startY);
  await page.mouse.down();

  const steps = 3;

  for (let step = 1; step <= steps; step++) {
    await page.mouse.move(startX + (endX - startX) * (step / steps), startY + (endY - startY) * (step / steps));
    await page.waitForTimeout(20);
  }

  await page.mouse.up();
};
