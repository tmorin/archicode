// Opening a served folder and the pages of the editor (Q8): what a browser shows when `editor serve` hands it a folder.
// The unit and integration suite loads the page in Node, with no DOM; the error card, the buttons and the console are
// only seen here. The automatic fixture `pageErrors` fails each test that makes the page say an error on the console.

const { test, expect, openPerspective, openPage } = require('./fixtures');

test('a folder without .archicode.yaml opens on the error card, and Try again reads it once it is there', async ({
  page,
  serve
}) => {
  const server = await serve(null);
  await page.goto(server.url);

  await expect(page.getByRole('heading', { name: 'Can’t open this workspace' })).toBeVisible();
  await expect(page.locator('body')).toContainText('.archicode.yaml could not be read in');
  await expect(page.locator('[data-action="open-folder"]')).toHaveText('Choose another folder');
  await expect(page.locator('[data-action="retry-folder"]')).toHaveText('Try again');

  // the author writes the file in another window, then asks the editor to look again
  server.write('.archicode.yaml', 'settings:\n  name: "Late shop"\n');
  await page.locator('[data-action="retry-folder"]').click();
  await expect(page.locator('[data-action="set-page"]', { hasText: 'Applications' })).toBeVisible();
  await expect(page.locator('body')).toContainText('Late shop');
  await expect(page.locator('[data-action="retry-folder"]')).toHaveCount(0);
});

test('the pages of a shipped example load, one after the other, each at its address', async ({ page, serve }) => {
  const server = await serve('domain_plateaus');
  await page.goto(server.url);

  // The editor opens on Applications: the map of the application layer, drawn
  await expect(page).toHaveURL(/#\/timeline\/applications/);
  await expect(page.locator('g.dg-node[data-ref="shop"]')).toBeVisible();
  await expect(page.locator('body')).toContainText('Map of the workspace — 3 items');

  await openPage(page, 'Environments');
  await expect(page).toHaveURL(/#\/timeline\/environments/);
  await expect(page.locator('body')).toContainText('Map of the technology layer');

  await openPage(page, 'Elements');
  await expect(page).toHaveURL(/#\/timeline\/elements/);
  await expect(page.locator('[data-action="select-element"]', { hasText: 'Shop' })).toBeVisible();

  await openPage(page, 'Plateaus');
  await expect(page).toHaveURL(/#\/timeline\/plateaus/);
  await expect(page.locator('body')).toContainText('As is is drawn.');
  await expect(page.getByRole('button', { name: 'New plateau', exact: true })).toBeVisible();

  await openPerspective(page, 'Stories');
  await expect(page).toHaveURL(/#\/stories/);
  await expect(page.locator('[data-action="story-player-open"]')).toBeVisible();

  await openPerspective(page, 'Files');
  await expect(page).toHaveURL(/#\/files/);
  await expect(page.locator('[data-action="select-file"]', { hasText: 'plateaus/baseline/shop.yaml' })).toBeVisible();

  await openPerspective(page, 'Settings');
  await expect(page).toHaveURL(/#\/settings/);
  await expect(page.locator('body')).toContainText('Default synthetic label');
});

test('the Environments page draws the nodes of the technology example', async ({ page, serve }) => {
  const server = await serve('domain_technology_map');
  await page.goto(`${server.url}#/timeline/environments`);

  await expect(page.locator('body')).toContainText('Map of the technology layer');
  await expect(page.locator('g.dg-node').first()).toBeVisible();
  expect(await page.locator('g.dg-node').count()).toBeGreaterThan(1);
});
