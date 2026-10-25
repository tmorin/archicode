// The story player (Q8, wave 021 run 0153): a modal that plays a story like slides. Its keys, its focus, its address
// and the Escape that closes it are what a browser has and Node has not; what each step draws is compared box by box with
// the editor in the unit suite (story-player-modal.test.js).

const { test, expect, openPerspective } = require('./fixtures');

test('Play opens the player on the first step, the keys walk the steps, Escape closes it and gives the focus back', async ({
  page,
  serve
}) => {
  const server = await serve('domain_plateaus');
  await page.goto(server.url);
  await openPerspective(page, 'Stories');
  const play = page.locator('[data-action="story-player-open"]');
  await play.click();

  const player = page.getByRole('dialog', { name: 'From the shop to the new shop' });
  await expect(player).toBeVisible();
  await expect(player).toContainText('Step 1 of 4');
  await expect(player).toContainText('Today the shop is one system');
  await expect(page).toHaveURL(/play=migration&step=0/);
  // the editor behind it cannot be reached
  await expect(page.locator('#app')).toHaveAttribute('inert', '');
  await expect(player.locator('g.dg-node[data-ref="shop"]')).toBeVisible();

  await page.keyboard.press('ArrowRight');
  await expect(player).toContainText('Step 2 of 4');
  await expect(player).toContainText('To be · compared with As is');
  await expect(page).toHaveURL(/step=1/);
  // a comparison is drawn with its key, and the changed box is marked
  await expect(player.locator('g.dg-node[data-ref="shop"]')).toContainText('contains-changes');

  await page.keyboard.press('End');
  await expect(player).toContainText('Step 4 of 4');
  await expect(player.locator('[data-player-action="next"]')).toBeDisabled();
  await page.keyboard.press('Home');
  await expect(player).toContainText('Step 1 of 4');
  await expect(player.locator('[data-player-action="previous"]')).toBeDisabled();

  await page.keyboard.press('Escape');
  await expect(player).toHaveCount(0);
  await expect(page).not.toHaveURL(/play=/);
  await expect(page.locator('#app')).not.toHaveAttribute('inert', '');
  await expect(play).toBeFocused();
});

test('the menu of the steps, Tab and the browser Back button', async ({ page, serve }) => {
  const server = await serve('domain_plateaus');
  await page.goto(server.url);
  await openPerspective(page, 'Stories');
  await page.locator('[data-action="story-player-open"]').click();
  const player = page.getByRole('dialog', { name: 'From the shop to the new shop' });
  await expect(player).toContainText('Step 1 of 4');

  await player.locator('[data-player-step-menu]').selectOption('2');
  await expect(player).toContainText('Step 3 of 4');
  await expect(player).toContainText('The inventory moved to the warehouse.');

  // Tab goes round the controls of the player and never reaches the editor behind it
  for (let i = 0; i < 12; i++) {
    await page.keyboard.press('Tab');
    expect(await player.locator(':focus').count()).toBe(1);
  }

  // opening was an entry of the history: Back closes the player, Forward opens it again at its step
  await page.goBack();
  await expect(player).toHaveCount(0);
  await expect(page).toHaveURL(/#\/stories\?story=migration$/);
  await page.goForward();
  await expect(player).toBeVisible();
  await expect(player).toContainText('Step 3 of 4');
});

test('a link to a step opens the player on it', async ({ page, serve }) => {
  const server = await serve('domain_plateaus');
  await page.goto(`${server.url}#/stories?story=migration&play=migration&step=2`);

  const player = page.getByRole('dialog', { name: 'From the shop to the new shop' });
  await expect(player).toContainText('Step 3 of 4');
  // the step is told at the plateau `to-be`, whatever the editor behind it draws
  await expect(player).toContainText('Plateau To be');
  await expect(player).toContainText('Overview of warehouse');
  await player.getByRole('button', { name: 'Close' }).click();
  await expect(player).toHaveCount(0);
});
