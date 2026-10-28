// The relationships of the Map (wave 026, run 0199, issue #143, TDD FLOW-1 to FLOW-4, REQ-7): an author ticks relationships in
// the list of the page Applications, clicks a link of the diagram and keeps its relationships, keeps the choice as a named
// view, saves, reloads and finds the same boxes; the file on disk holds `links`, and a rename of an end follows into it.
// The kernel and the entry model are proved in Node; here the list, the click, the address and the file are the browser's.

const { test, expect, openPage, openPerspective } = require('./fixtures');
const { CORNER_SHOP } = require('./workspace');

// The corner shop with a second system: `shop.web` reads the catalog and calls `billing`, so a choice of two relationships
// leaves `billing` out of the drawing.
const FILES = Object.assign({}, CORNER_SHOP, {
  'manifests/shop.yaml': CORNER_SHOP['manifests/shop.yaml'].replace(
    '          label: "reads"\n',
    '          label: "reads"\n        - destination: "billing"\n          label: "invoices"\n'
  ),
  'manifests/billing.yaml': `header:
  kind: "archicode.morin.io/system"
  version: "1"
content:
  id: "billing"
  name: "Billing"
`
});

const BOXES = ['customer', 'shop', 'shop.web', 'shop.catalog', 'billing'];

async function drawnBoxes(page) {
  const refs = await page.locator('g.dg-node').evaluateAll((nodes) => nodes.map((n) => n.getAttribute('data-ref')));
  return refs.sort();
}

function linkFiles(server) {
  return ['manifests/view.web_links.yaml', 'manifests/web_links.yaml', 'manifests/views/web_links.yaml'].filter((f) => {
    try {
      return server.read(f).includes('links');
    } catch {
      return false;
    }
  });
}

test('relationships ticked in the list or picked on the diagram draw their ends, are kept in a named view, saved, reloaded and followed by a rename', async ({
  page,
  serve
}) => {
  const server = await serve(null, FILES);
  await page.goto(server.url);
  await openPage(page, 'Applications');
  await page.locator('[data-action="toggle-fold"][data-id="shop"][data-mode="expand"]').click();
  await expect.poll(() => drawnBoxes(page)).toEqual(BOXES.slice().sort());

  // FLOW-1: the list under the tree; with nothing ticked the whole map is drawn
  await page.locator('summary', { hasText: 'Relationships' }).click();
  const tick = (name) => page.getByRole('checkbox', { name });
  await expect(tick('customer to shop.web, browses')).not.toBeChecked();
  await tick('customer to shop.web, browses').check();
  await tick('shop.web to shop.catalog, reads').check();
  await expect(page.locator('.map-links-count')).toHaveText('2 ticked');
  await expect(page).toHaveURL(/rel=/);

  // only the ends of the ticked relationships and what encloses them: `billing` is out
  await expect.poll(() => drawnBoxes(page)).toEqual(['customer', 'shop', 'shop.catalog', 'shop.web']);
  await expect(page.locator('g.dg-link')).toHaveCount(2);

  // Clear draws the whole map again and the address loses `rel`
  await page.locator('summary ~ [data-action="map-links-clear"]').click();
  await expect.poll(() => drawnBoxes(page)).toEqual(expect.arrayContaining(['billing']));
  await expect(page).not.toHaveURL(/rel=/);

  // FLOW-2: pick on the diagram: a click on the link, then "Draw only this link"
  await page.locator('g.dg-link[data-from="shop.web"][data-to="billing"]').first().dispatchEvent('click');
  await page.locator('[data-action="map-link-only"]').click();
  await expect.poll(() => drawnBoxes(page)).toEqual(['billing', 'shop', 'shop.web']);
  await expect(page).toHaveURL(/rel=/);

  // back to the two relationships of the list, then FLOW-3: keep the choice as a named view
  await page.locator('summary ~ [data-action="map-links-clear"]').click();
  await tick('customer to shop.web, browses').check();
  await tick('shop.web to shop.catalog, reads').check();
  await expect.poll(() => drawnBoxes(page)).toEqual(['customer', 'shop', 'shop.catalog', 'shop.web']);
  await page.locator('[data-action="name-view"]').click();
  await page.getByRole('dialog').getByRole('textbox').fill('Web links');
  await page.getByRole('dialog').getByRole('button', { name: 'Save view' }).click();
  await page.locator('[data-action="save-all-changes"]').click();

  await expect.poll(() => linkFiles(server).length).toBe(1);
  const file = linkFiles(server)[0];
  const saved = server.read(file);
  expect(saved).toMatch(/viewpoint: "?map"?/);
  expect(saved).toMatch(/links:/);
  expect(saved).toMatch(/source: "?customer"?[\s\S]*destination: "?shop\.web"?/);
  expect(saved).toMatch(/source: "?shop\.web"?[\s\S]*destination: "?shop\.catalog"?/);
  expect(saved).not.toContain('billing');

  // reload and open the view: the same boxes
  await page.reload();
  await openPerspective(page, 'Stories');
  await page.getByRole('group', { name: 'Stories and views' }).getByRole('button', { name: 'Views' }).click();
  await page.locator('[data-action="select-view"]', { hasText: 'Web links' }).first().click();
  await expect.poll(() => drawnBoxes(page)).toEqual(['customer', 'shop', 'shop.catalog', 'shop.web']);

  // FLOW-4: renaming an end follows into the saved view
  await openPerspective(page, 'Timeline');
  await openPage(page, 'Elements');
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  const row = page.locator('[data-action="select-element"]', { hasText: 'Web site' });
  if ((await row.count()) === 0) {
    await page.locator('[data-action="toggle-element"]').first().click();
  }
  await row.click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
  await page.locator('#edit-id-input').fill('site');
  await page.locator('[data-action="save-all-changes"]').click();
  await expect.poll(() => server.read(file)).toContain('shop.site');
  expect(server.read(file)).not.toContain('shop.web');
});
