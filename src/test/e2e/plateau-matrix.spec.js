// The Reading view of a path of plateaus in a browser (wave 034, run 0230, IMP-8; TDD DEC-6, RISK-7): the Brightcart sample
// opens on the page Plateaus, Read the path on marketplace draws the table (the head, the lineages, the Span words), a click on
// a cell opens the Changes panel, and the path is in the address and survives a reload, at 1280 and at 360 px wide.
// Chromium and Firefox are run; WebKit is not claimed.

const { test, expect, openPage } = require('./fixtures');
const { SAMPLE_ADDRESS, waitForEditor } = require('./hosted');

const SIZES = [
  { name: '1280 x 800', width: 1280, height: 800 },
  { name: '360 x 640', width: 360, height: 640 }
];

for (const size of SIZES) {
  test(`Read the path on marketplace draws the table, a cell opens the Changes panel and a reload keeps the path (${size.name})`, async ({
    page,
    hosted
  }) => {
    await page.setViewportSize({ width: size.width, height: size.height });
    await page.goto(hosted.url + SAMPLE_ADDRESS);
    await waitForEditor(page);
    await openPage(page, 'Plateaus');
    await expect(page).toHaveURL(/#\/timeline\/plateaus/);
    await expect(page).not.toHaveURL(/matrix=/);

    await page.locator('[data-action="matrix-open"][data-plateau="marketplace"]').click();
    await expect(page).toHaveURL(/plateau=marketplace/);
    await expect(page).toHaveURL(/matrix=marketplace/);
    await expect(page).not.toHaveURL(/rows=all/);

    // the head, the rows and the Span words
    const block = page.locator('.matrix-block');
    const table = block.locator('table.matrix');
    await expect(table).toBeVisible();
    const heads = table.locator('thead th');
    await expect(heads).toHaveCount(5);
    await expect(heads.nth(1)).toContainText('baseline');
    await expect(heads.nth(2)).toContainText('inhouse');
    await expect(heads.nth(3)).toContainText('marketplace');
    await expect(heads.nth(4)).toHaveText('Span');
    const rows = table.locator('tbody tr.matrix-row');
    expect(await rows.count()).toBeGreaterThan(0);
    const summary = await block.locator('.matrix-tools .muted').innerText();
    const [, lineages] = /in (\d+) lineage/.exec(summary);
    const unchanged = Number(/(\d+) unchanged/.exec(summary)[1]);
    // folded: the rows are the lineages that changed
    expect(await rows.count()).toBe(Number(lineages) - unchanged);
    const spanWords = await table.locator('tbody td.matrix-span .matrix-word').allInnerTexts();
    expect(spanWords.length).toBeGreaterThan(0);
    for (const word of spanWords) {
      expect(['new', 'changed', 'removed', 'moved', 'split', 'merged', 'present', 'absent']).toContain(word);
    }

    // the unfolding adds the unchanged lineages and is in the address
    await block.locator('[data-action="matrix-rows"]').click();
    await expect(page).toHaveURL(/rows=all/);
    expect(await rows.count()).toBe(Number(lineages));
    await block.locator('[data-action="matrix-rows"]').click();
    await expect(page).not.toHaveURL(/rows=all/);
    expect(await rows.count()).toBe(Number(lineages) - unchanged);

    // a click on a cell that says a change opens the Changes panel
    const cell = table.locator('[data-action="matrix-cell"]').first();
    await cell.scrollIntoViewIfNeeded();
    await cell.click();
    await expect(page.locator('[data-changes-panel]')).toBeVisible();
    await expect(page.locator('#panel-right')).toContainText('Changes');

    // a reload keeps the path and draws the table again
    await page.reload();
    await waitForEditor(page);
    await expect(page).toHaveURL(/matrix=marketplace/);
    await expect(page.locator('.matrix-block table.matrix')).toBeVisible();
    await expect(page.locator('.matrix-block thead th').nth(3)).toContainText('marketplace');
    expect(await page.locator('.matrix-block tbody tr.matrix-row').count()).toBeGreaterThan(0);

    // closing the reading drops the key
    await page.locator('[data-action="matrix-close"]').click();
    await expect(page).not.toHaveURL(/matrix=/);
    await expect(page.locator('.matrix-block')).toHaveCount(0);
  });
}
