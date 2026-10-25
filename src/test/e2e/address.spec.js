// The address is the editor's state (Q8): a link opens the page and the element it names, a reload keeps them, and Back
// and Forward walk the pages. The unit suite parses the hash in Node; the history is the browser's.

const { test, expect, openPage, openPerspective } = require('./fixtures');
const { CORNER_SHOP } = require('./workspace');

test('a link to an element opens its page, and a reload comes back to the same place', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(`${server.url}#/timeline/elements?ref=shop.web`);

  await expect(page.locator('#panel-center')).toContainText('The front of the shop.');
  await expect(page.locator('[data-action="select-element"].active, .tree-node-row.active')).toContainText('Web site');

  await page.reload();
  await expect(page).toHaveURL(/#\/timeline\/elements\?ref=shop\.web/);
  await expect(page.locator('#panel-center')).toContainText('The front of the shop.');
});

test('an address that is no page opens the default page and is written back as it is', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(`${server.url}#/map`);

  await expect(page).toHaveURL(/#\/timeline\/applications/);
  await expect(page.locator('g.dg-node[data-ref="shop"]')).toBeVisible();
});

test('Back and Forward walk the pages the buttons opened', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);
  await expect(page).toHaveURL(/#\/timeline\/applications/);

  await openPage(page, 'Elements');
  await expect(page).toHaveURL(/#\/timeline\/elements/);
  await openPerspective(page, 'Files');
  await expect(page).toHaveURL(/#\/files/);
  await expect(page.locator('[data-action="select-file"]', { hasText: 'manifests/shop.yaml' })).toBeVisible();

  await page.goBack();
  await expect(page).toHaveURL(/#\/timeline\/elements/);
  await expect(page.locator('[data-action="select-element"]', { hasText: 'Shop' })).toBeVisible();
  await page.goBack();
  await expect(page).toHaveURL(/#\/timeline\/applications/);
  await expect(page.locator('g.dg-node[data-ref="shop"]')).toBeVisible();
  await page.goForward();
  await expect(page).toHaveURL(/#\/timeline\/elements/);
});
