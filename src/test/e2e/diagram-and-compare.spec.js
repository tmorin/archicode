// What the page draws (Q8): the boxes of a view, the selection by a click, and the comparison of two plateaus with its
// Changes panel. The kernel and the layout are proved in Node by the unit suite; here the SVG is in a real page, so a
// click, the focus and the address are the browser's.

const { test, expect, openPage } = require('./fixtures');
const { CORNER_SHOP } = require('./workspace');

test('a view of an element is drawn with its boxes and its link, and a click on a box selects the element', async ({
  page,
  serve
}) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);

  await openPage(page, 'Elements');
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  await page.locator('[data-action="set-element-tab"]', { hasText: 'Detailed' }).click();

  await expect(page).toHaveURL(/tab=detailed/);
  await expect(page.locator('g.dg-node[data-ref="shop"]')).toBeVisible();
  await expect(page.locator('g.dg-node[data-ref="shop.web"]')).toBeVisible();
  await expect(page.locator('g.dg-node[data-ref="shop.catalog"]')).toBeVisible();
  await expect(page.locator('g.dg-node[data-ref="customer"]')).toBeVisible();
  await expect(page.locator('g.dg-link[data-from="shop.web"][data-to="shop.catalog"]')).toHaveCount(1);
  await expect(page.locator('body')).toContainText('Detailed of shop — 4 items, 2 links.');

  await expect(page.locator('#panel-right')).not.toContainText('shop.catalog');
  await page.locator('g.dg-node[data-ref="shop.catalog"]').click();
  await expect(page.locator('#panel-right')).toContainText(/selected element/i);
  await expect(page.locator('#panel-right')).toContainText('shop.catalog');
  await expect(page.locator('#panel-right')).toContainText('The books on sale.');
});

test('comparing two plateaus draws the changes on the map and lists them, one change at a time', async ({
  page,
  serve
}) => {
  const server = await serve('domain_plateaus');
  await page.goto(server.url);

  await page.locator('#band-plateau').selectOption('to-be');
  await expect(page).toHaveURL(/plateau=to-be/);
  await page.locator('#band-compare').selectOption({ label: 'As is · 2026-Q3' });

  // the map: the boxes that contain changes are marked, and the key says what each mark is
  await expect(page.locator('g.dg-node[data-ref="shop"]')).toContainText('contains-changes');
  await expect(page.locator('body')).toContainText('To be compared with As is.');
  await expect(page.locator('body')).toContainText('14 changes');
  await expect(page.locator('body')).toContainText(/cascade of the removals/i);

  // the Plateaus page counts the same change, by kind
  await openPage(page, 'Plateaus');
  await expect(page.locator('body')).toContainText('To be is compared with As is');

  // the Changes list is walked with the keys j and k, which only a page with a keyboard has
  await openPage(page, 'Elements');
  await expect(page.locator('body')).toContainText('14 changes');
  const current = page.locator('[data-action="select-change"][aria-current="true"]');
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await page.keyboard.press('j');
  await expect(current).toHaveAttribute('data-ref', 'shop.payments');
  await page.keyboard.press('j');
  await expect(current).toHaveAttribute('data-ref', 'shop.ratings');
  await expect(page).toHaveURL(/ref=shop\.ratings/);
  await page.keyboard.press('k');
  await expect(current).toHaveAttribute('data-ref', 'shop.payments');
});
