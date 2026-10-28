// A story of a flow (wave 026, run 0200, issue #143; TDD FLOW-1, FLOW-2, F3, CON-6): the player plays the shipped story
// `order_flow` of the Brightcart sample, one relationship more at each step with the newest one drawn heavy, and an
// author writes a flow in the editor (ticks, highlights, "Add to story", a second step), saves, reloads and plays it.
// The player runs on the hosted-style page (no JVM, the sample is the data); the authoring runs on a workspace the spec
// writes, served from a folder, because the save is the point. The kernel and the model are proved in Node.

const { test, expect, openPage, openPerspective } = require('./fixtures');
const { SAMPLE_ADDRESS, waitForEditor } = require('./hosted');
const { CORNER_SHOP } = require('./workspace');

test('the player plays the shipped flow: each step draws one more relationship and the newest one heavy, and says it', async ({
  page,
  hosted
}) => {
  await page.goto(hosted.url + SAMPLE_ADDRESS);
  await waitForEditor(page);
  await page.evaluate(() => {
    location.hash = '#/stories?story=order_flow&play=order_flow&step=0';
  });
  await waitForEditor(page);

  const player = page.getByRole('dialog', { name: 'An order, link by link' });
  await expect(player).toBeVisible();
  await expect(player).toContainText('Step 1 of 3');
  await expect(player.locator('g.dg-link')).toHaveCount(1);
  await expect(player.locator('g.dg-link .dg-hl')).toHaveCount(1);
  await expect(page.locator('#story-announcer')).toContainText('Highlighted: ');
  await expect(page.locator('#story-announcer')).toContainText('browses and buys with');

  await page.keyboard.press('ArrowRight');
  await expect(player).toContainText('Step 2 of 3');
  await expect(player.locator('g.dg-link')).toHaveCount(2);
  // the newest link only is heavy
  await expect(player.locator('g.dg-link:has(.dg-hl)')).toHaveCount(1);
  await expect(page.locator('#story-announcer')).toContainText('calls');

  await page.keyboard.press('ArrowRight');
  await expect(player).toContainText('Step 3 of 3');
  await expect(player.locator('g.dg-link')).toHaveCount(3);
  await expect(player.locator('g.dg-link:has(.dg-hl)')).toHaveCount(1);
  await expect(page.locator('#story-announcer')).toContainText('authorises payments with');
  await expect(page).toHaveURL(/play=order_flow&step=2/);

  await page.keyboard.press('Escape');
  await expect(player).toHaveCount(0);
});

test('an author writes a flow step by step, saves it, reloads and plays it', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);
  await openPage(page, 'Applications');
  await page.locator('[data-action="toggle-fold"][data-id="shop"][data-mode="expand"]').click();

  const tick = (name) => page.getByRole('checkbox', { name });
  await page.locator('summary', { hasText: 'Relationships' }).click();
  await tick('customer to shop.web, browses').check();

  // highlight it from the panel of the link, and keep the first step in a new story
  await page.locator('g.dg-link[data-from="customer"][data-to="shop.web"]').first().dispatchEvent('click');
  await page.getByRole('checkbox', { name: 'Highlight customer to shop.web' }).check();
  await expect(page.locator('.map-chip-highlight')).toContainText('Highlight: 1');
  await expect(page.locator('g.dg-link .dg-hl')).toHaveCount(1);
  await addToStory(page);
  let dialog = page.getByRole('dialog');
  await dialog.getByRole('radio', { name: 'New story' }).check();
  await dialog.getByRole('textbox', { name: 'Name of the new story' }).fill('Browsing');
  await dialog.getByRole('button', { name: 'Add to story' }).click();

  // the second step: one relationship more, the highlight moved to it
  await openPerspective(page, 'Timeline');
  await openPage(page, 'Applications');
  await tick('shop.web to shop.catalog, reads').check();
  await page.locator('g.dg-link[data-from="shop.web"][data-to="shop.catalog"]').first().dispatchEvent('click');
  await page.getByRole('checkbox', { name: 'Highlight shop.web to shop.catalog' }).check();
  await page.locator('[data-action="map-highlight-clear"]').click();
  await page.getByRole('checkbox', { name: 'Highlight shop.web to shop.catalog' }).check();
  await addToStory(page);
  dialog = page.getByRole('dialog');
  await dialog.getByRole('button', { name: 'Add to story' }).click();
  await page.locator('[data-action="save-all-changes"]').click();

  // the file holds both steps, each with its relationships and the newest in `highlight`
  await expect.poll(() => storyFile(server)).not.toBeNull();
  const file = storyFile(server);
  const saved = server.read(file);
  expect((saved.match(/highlight:/g) || []).length).toBe(2);
  expect(saved).toMatch(/source: "?shop\.web"?[\s\S]*destination: "?shop\.catalog"?/);

  // reload, play: step 1 draws one link, step 2 two, one heavy each
  await page.reload();
  await openPerspective(page, 'Stories');
  await page.locator('[data-action="story-player-open"]').click();
  const player = page.getByRole('dialog', { name: 'Browsing' });
  await expect(player).toContainText('Step 1 of 2');
  await expect(player.locator('g.dg-link')).toHaveCount(1);
  await expect(player.locator('g.dg-link:has(.dg-hl)')).toHaveCount(1);
  await page.keyboard.press('ArrowRight');
  await expect(player).toContainText('Step 2 of 2');
  await expect(player.locator('g.dg-link')).toHaveCount(2);
  await expect(player.locator('g.dg-link:has(.dg-hl)')).toHaveCount(1);
  await expect(page.locator('#story-announcer')).toContainText('Highlighted: Web site to Catalog, reads');
});

function storyFile(server) {
  for (const file of ['manifests/story.browsing.yaml', 'manifests/browsing.yaml', 'manifests/stories/browsing.yaml']) {
    try {
      if (server.read(file).includes('highlight')) return file;
    } catch {
      // not this one
    }
  }
  return null;
}

// "Add to story…" sits in the "More actions" menu of the diagram header when the row is narrow.
async function addToStory(page) {
  const button = page.locator('[data-action="add-to-story"]');
  if (!(await button.isVisible())) {
    await page.getByRole('button', { name: 'More actions' }).click();
  }
  await button.click();
}
