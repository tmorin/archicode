// Editing in the page and saving to the folder (Q8): the editor's output is the file it writes, so each test reads the
// file back from the disk of the temporary copy. The line-preserving save (comments, quotes, the other lines) is the
// contract; the unit suite proves the text of it in Node, these tests prove that the buttons, the dialogs and the
// focus of a real page lead to it.

const fs = require('node:fs');
const path = require('node:path');
const { test, expect, openPage } = require('./fixtures');
const { CORNER_SHOP, changedLines } = require('./workspace');

async function openElementForm(page, name) {
  await openPage(page, 'Elements');
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  const row = page.locator('[data-action="select-element"]', { hasText: name });
  if ((await row.count()) === 0) {
    await page.locator('[data-action="toggle-element"]').first().click();
  }
  await row.click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
}

test('editing a name and a description rewrites those two lines and keeps the rest of the file', async ({
  page,
  serve
}) => {
  const server = await serve(null, CORNER_SHOP);
  const before = server.read('manifests/shop.yaml');
  await page.goto(server.url);

  await openElementForm(page, 'Web site');
  await page.locator('#edit-name-input').fill('Web shop');
  await page.locator('#edit-description-input').fill('The front of the shop, edited by the e2e suite.');
  await page.locator('[data-action="save-all-changes"]').click();

  await expect(page.locator('body')).toContainText('Saved.');
  await expect(page.locator('[data-action="save-all-changes"]')).toHaveText('Save all changes');
  await expect.poll(() => server.read('manifests/shop.yaml')).not.toBe(before);
  expect(changedLines(before, server.read('manifests/shop.yaml'))).toEqual({
    lines: [
      '      name: "Web shop"   # what the visitor sees',
      '      description: "The front of the shop, edited by the e2e suite."'
    ]
  });
  // the other manifests are not written
  expect(server.read('manifests/customer.yaml')).toBe(CORNER_SHOP['manifests/customer.yaml']);
  expect(server.read('.archicode.yaml')).toBe(CORNER_SHOP['.archicode.yaml']);
});

test('Cancel asks before it drops what was typed, and the folder is read again from the disk', async ({
  page,
  serve
}) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);

  await openElementForm(page, 'Web site');
  await page.locator('#edit-name-input').fill('Never written');
  const questions = [];
  let answer = false;
  page.on('dialog', (dialog) => {
    questions.push(dialog.message());
    return answer ? dialog.accept() : dialog.dismiss();
  });

  // "No": the browser's own confirm box is answered by the test, and the form keeps what was typed
  await page.locator('[data-action="cancel-changes"]').click();
  await expect.poll(() => questions.length).toBe(1);
  expect(questions[0]).toContain('Cancel and discard what you typed in this form?');
  await expect(page.locator('#edit-name-input')).toHaveValue('Never written');

  // "Yes": the folder is read again, the page is back on the element as the file says it
  answer = true;
  await page.locator('[data-action="cancel-changes"]').click();
  await expect(page.locator('#edit-name-input')).toHaveCount(0);
  await expect(page.locator('body')).toContainText('The front of the shop.');
  await expect(page.locator('body')).not.toContainText('Never written');
  await expect(page).toHaveURL(/ref=shop\.web/);
  expect(questions).toHaveLength(2);
  expect(server.read('manifests/shop.yaml')).toBe(CORNER_SHOP['manifests/shop.yaml']);
});

test('leaving a form with typed text asks first, and the answer decides whether the text is kept', async ({
  page,
  serve
}) => {
  const server = await serve(null, CORNER_SHOP);
  await page.goto(server.url);

  await openElementForm(page, 'Web site');
  await page.locator('#edit-name-input').fill('Not yet saved');
  const questions = [];
  page.on('dialog', (dialog) => {
    questions.push(dialog.message());
    return dialog.dismiss();
  });

  await page.locator('[data-action="select-element"]', { hasText: 'Catalog' }).click();
  await expect.poll(() => questions.length).toBe(1);
  expect(questions[0]).toContain('what you typed in this form has not been saved');
  await expect(page.locator('#edit-name-input')).toHaveValue('Not yet saved');
  await expect(page).toHaveURL(/ref=shop\.web/);
});

test('on a layered example the first save asks, Cancel writes nothing and gives the form back, the second writes', async ({
  page,
  serve
}) => {
  const server = await serve('domain_plateaus');
  const file = 'plateaus/baseline/shop.yaml';
  const before = server.read(file);
  await page.goto(server.url);

  await openElementForm(page, 'Web site');
  const description = page.locator('#edit-description-input');
  await description.fill('The front of the shop, edited by the e2e suite.');
  await page.locator('[data-action="save-all-changes"]').click();

  // the plateau `to-be` inherits the element: the page asks before it writes
  const dialog = page.getByRole('dialog');
  await expect(dialog).toContainText('Writing in baseline changes other plateaus');
  await expect(dialog).toContainText('to-be');
  await dialog.getByRole('button', { name: 'Cancel' }).click();
  await expect(dialog).toHaveCount(0);
  await expect(description).toHaveValue('The front of the shop, edited by the e2e suite.');
  expect(server.read(file)).toBe(before);

  await page.locator('[data-action="save-all-changes"]').click();
  await dialog.getByRole('button', { name: 'Write in baseline' }).click();
  // the draft is in the page's model; one more click of the same button writes the file
  await expect(page.locator('[data-action="save-all-changes"]')).toHaveText('Save all changes (1)');
  expect(server.read(file)).toBe(before);
  await page.locator('[data-action="save-all-changes"]').click();

  await expect.poll(() => server.read(file)).not.toBe(before);
  expect(changedLines(before, server.read(file))).toEqual({
    lines: ['      description: "The front of the shop, edited by the e2e suite."']
  });
});

test('creating a child element appends it to its parent and writes nothing else', async ({ page, serve }) => {
  const server = await serve(null, CORNER_SHOP);
  const before = server.read('manifests/shop.yaml');
  await page.goto(server.url);

  await openPage(page, 'Elements');
  await page.locator('[data-action="select-element"]', { hasText: 'Shop' }).first().click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
  await page.locator('[data-action="open-create-child-form"]').click();
  await page.locator('#create-id-input').fill('orders');
  await page.locator('#create-name-input').fill('Orders');
  await page.locator('#create-description-input').fill('Takes the basket of a customer.');
  await page.locator('[data-action="submit-create-child"]').click();
  await page.locator('[data-action="save-all-changes"]').click();

  await expect.poll(() => server.read('manifests/shop.yaml')).not.toBe(before);
  const after = server.read('manifests/shop.yaml');
  // everything that was there is there, in order, and the new element is in the file
  expect(after.startsWith(before.trimEnd())).toBe(true);
  expect(after.slice(before.trimEnd().length)).toMatch(
    /kind: "?container"?[\s\S]*id: "?orders"?[\s\S]*Takes the basket/
  );
  await expect(page).toHaveURL(/ref=shop\.orders/);
});

test('renaming an element asks first and the files that name it follow', async ({ page, serve }) => {
  const server = await serve('domain_plateaus');
  await page.goto(server.url);

  await openElementForm(page, 'Web site');
  await page.locator('#edit-id-input').fill('site');
  await page.locator('[data-action="save-all-changes"]').click();
  await page.getByRole('dialog').getByRole('button', { name: 'Write in baseline' }).click();
  await page.locator('[data-action="save-all-changes"]').click();

  await expect(page).toHaveURL(/ref=shop\.site/);
  await expect(page.locator('[data-action="select-element"]', { hasText: 'Web site' })).toBeVisible();
  await expect.poll(() => server.read('plateaus/baseline/shop.yaml')).toContain('id: "site"');
  // the files are written one after the other: wait for the last, then look at them all
  const filesNaming = (pattern) =>
    fs
      .readdirSync(path.join(server.dir, 'plateaus'), { recursive: true })
      .filter((file) => file.endsWith('.yaml'))
      .filter((file) => pattern.test(server.read(path.join('plateaus', file))))
      .sort();
  await expect.poll(() => filesNaming(/shop\.web\b/)).toEqual([]);
  // the story that drew `shop.web` draws `shop.site`, in its own file, and so does the plateau that patches it
  expect(server.read('plateaus/story.migration.yaml')).toContain('element: "shop.site"');
  expect(filesNaming(/shop\.site\b/)).toContain('to-be/plateau.to-be.yaml');
});
