// The browser workspace (wave 025, run 0192, DEC-11): the hosted editor keeps a workspace in the browser's IndexedDB.
// The page is served by a plain Node server with no JVM and no <meta name="archicode-server"> (harness.js,
// startHostedPage), as the hosted site serves it. The flow: the first-launch card, a workspace created in the browser,
// a second one seeded from the CORNER_SHOP files, an edit saved and reloaded, the stored file read back through the
// handle, then close, rename and delete. The spec does not depend on the answer of navigator.storage.persist()
// (true, false or never, ASM-4) and does not try to grant it (Q-1, RISK-7).

/* global createBrowserWorkspace, AppState -- top-level names of the editor page, read inside page.evaluate */

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

test('a workspace kept in the browser is created, edited, saved, reopened, renamed and deleted', async ({
  page,
  hosted,
  browserName
}) => {
  await page.goto(hosted.url);

  // the first-launch card
  const newWorkspace = page.getByRole('button', { name: /New workspace in this browser/ });
  await expect(newWorkspace).toBeVisible();
  const openFolder = page.getByRole('button', { name: /Open workspace folder/ });
  if (browserName === 'chromium') {
    await expect(openFolder).toBeVisible();
  } else {
    await expect(openFolder).toHaveCount(0);
    await expect(page.locator('body')).not.toContainText('Firefox and Safari');
  }

  // create e2e-browser: the editor opens
  await newWorkspace.click();
  await page.getByRole('textbox').fill('e2e-browser');
  await page.getByRole('button', { name: 'Create' }).click();
  await expect(page.locator('[data-action="save-all-changes"]')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Close workspace' })).toBeVisible();

  // a second workspace, seeded from the CORNER_SHOP files through the page's own function
  await page.evaluate(async (files) => {
    const encoder = new TextEncoder();
    await createBrowserWorkspace({
      name: 'corner',
      files: Object.entries(files).map(([filePath, text]) => ({ path: filePath, bytes: encoder.encode(text) })),
      origin: 'blank'
    });
  }, CORNER_SHOP);

  // back to the card: both are listed; open the seeded one
  await page.getByRole('button', { name: 'Close workspace' }).click();
  await expect(page.getByRole('button', { name: /Open .e2e-browser./ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open .corner./ })).toBeVisible();
  await page.getByRole('button', { name: /Open .corner./ }).click();

  // edit a name and a description, save
  await openElementForm(page, 'Web site');
  await page.locator('#edit-name-input').fill('Web shop');
  await page.locator('#edit-description-input').fill('The front of the shop, edited by the e2e suite.');
  await page.locator('[data-action="save-all-changes"]').click();
  await expect(page.locator('body')).toContainText('Saved.');

  // reload: the workspace reopens by itself with the change
  await page.reload();
  await expect(page.locator('[data-action="save-all-changes"]')).toBeVisible();
  await openPage(page, 'Elements');
  await expect(page.locator('body')).toContainText('Web shop');

  // the stored manifest, read back through the handle: two lines changed, the rest as written
  const stored = await page.evaluate(async () => {
    const directory = await AppState.folder.handle.getDirectoryHandle('manifests');
    const file = await (await directory.getFileHandle('shop.yaml')).getFile();
    return file.text();
  });
  expect(changedLines(CORNER_SHOP['manifests/shop.yaml'], stored)).toEqual({
    lines: [
      '      name: "Web shop"   # what the visitor sees',
      '      description: "The front of the shop, edited by the e2e suite."'
    ]
  });

  // close: the card lists both
  await page.getByRole('button', { name: 'Close workspace' }).click();
  await expect(page.getByRole('button', { name: /Open .e2e-browser./ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open .corner./ })).toBeVisible();

  // rename e2e-browser
  await page.getByRole('button', { name: /Rename .e2e-browser./ }).click();
  await page.getByRole('textbox').fill('renamed');
  await page.keyboard.press('Enter');
  await expect(page.getByRole('button', { name: /Open .renamed./ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open .e2e-browser./ })).toHaveCount(0);

  // delete it: Cancel first, then Delete
  await page.getByRole('button', { name: /Delete .renamed./ }).click();
  await page.locator('[data-action="cancel-browser-workspace-question"]').click();
  await expect(page.getByRole('button', { name: /Open .renamed./ })).toBeVisible();
  await page.getByRole('button', { name: /Delete .renamed./ }).click();
  await page.locator('[data-action="delete-browser-workspace"]').click();
  // the row has no Open button while its question is up, so wait for the question to go: the card is drawn again after the delete is committed
  await expect(page.locator('[data-action="delete-browser-workspace"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Open .renamed./ })).toHaveCount(0);

  // reload: the remaining one only
  await page.reload();
  await expect(page.getByRole('button', { name: /Open .corner./ })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('renamed');
});
