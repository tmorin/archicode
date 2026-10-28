// The Brightcart sample, export, import and reset in a browser (wave 025, run 0193, IMP-12; TDD DEC-3, DEC-6 to DEC-10).
// The page is served as the website serves it: `GET /editor/` and `GET /editor/samples/brightcart.yaml` from Node, no
// JVM (harness.js, startHostedPage), so the relative fetch of the sample proves the base path. The served-folder test
// runs the page on `archicode editor serve` instead. What only a browser shows is here: the address, the download, the
// file input, the menu and the bytes of the served folder. W-6 composes the issue's acceptance; this is not that spec.

/* global listBrowserWorkspaces, readBrowserWorkspaceFiles, bundleWorkspaceFiles -- top-level names of the editor page, read inside page.evaluate */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { test, expect, openPage } = require('./fixtures');
const { ROOT } = require('./harness');

const SAMPLE_FILE = path.join(ROOT, 'src', 'main', 'resources', 'editor-webapp', 'samples', 'brightcart.yaml');
const SAMPLE_ADDRESS = '#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart';
const NEW_DESCRIPTION = 'The web shop of the retailer, edited by the e2e suite.';

// A hash of every file of a folder, by path: the served folder before and after must give the same one.
function treeHash(folder) {
  const hash = crypto.createHash('sha256');
  const walk = (directory) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        walk(full);
      } else {
        hash.update(path.relative(folder, full)).update('\0').update(fs.readFileSync(full)).update('\0');
      }
    }
  };
  walk(folder);
  return hash.digest('hex');
}

// The Brightcart sample's stored files, as the page sees them: the rows of the store, the files of the sample row, and
// the bundle text of those files. `rows` counts the workspaces with `sample === 'brightcart'`.
async function storedSample(page) {
  return page.evaluate(async () => {
    const rows = (await listBrowserWorkspaces()).filter((row) => row.sample === 'brightcart');
    if (rows.length === 0) {
      return { rows: 0, bundle: '', texts: [] };
    }
    const files = await readBrowserWorkspaceFiles(rows[0].id);
    const decoder = new TextDecoder();
    return {
      rows: rows.length,
      bundle: bundleWorkspaceFiles(files).text,
      texts: files.map((file) => decoder.decode(file.bytes))
    };
  });
}

async function openWorkspaceMenu(page) {
  await page.locator('[data-action="toggle-workspace-menu"]').click();
}

// Edits the description of the shop on the Elements page and saves it.
async function editShopDescription(page, description) {
  await openPage(page, 'Elements');
  await page
    .locator('[data-action="select-element"]')
    .filter({ hasText: /\bShop\b/ })
    .first()
    .click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
  await page.locator('#edit-description-input').fill(description);
  await page.locator('[data-action="save-all-changes"]').click();
  await expect(page.locator('body')).toContainText('Saved.');
}

async function waitForEditor(page) {
  await expect(page.locator('[data-action="save-all-changes"]')).toBeVisible();
}

test('the link opens Brightcart, a change is kept, the same link reopens the one workspace, export and reset work', async ({
  page,
  hosted
}) => {
  const sampleText = fs.readFileSync(SAMPLE_FILE, 'utf8');

  // the link, with no folder chosen: Brightcart on Applications, marketplace compared with its past
  await page.goto(hosted.url + SAMPLE_ADDRESS);
  await waitForEditor(page);
  await expect(page.locator('body')).toContainText('Brightcart');
  await expect(page).toHaveURL(/#\/timeline\/applications/);
  await expect(page).toHaveURL(/plateau=marketplace/);
  await expect(page).toHaveURL(/compare=past/);
  await expect(page).not.toHaveURL(/sample=/);
  expect(hosted.requests).toContain('/editor/samples/brightcart.yaml');
  expect((await storedSample(page)).rows).toBe(1);

  // a change, saved, and kept across a reload
  await editShopDescription(page, NEW_DESCRIPTION);
  await page.reload();
  await waitForEditor(page);
  expect((await storedSample(page)).texts.some((text) => text.includes(NEW_DESCRIPTION))).toBe(true);

  // the same link again: still one Brightcart, with the change
  await page.goto('about:blank');
  await page.goto(hosted.url + SAMPLE_ADDRESS);
  await waitForEditor(page);
  const reopened = await storedSample(page);
  expect(reopened.rows).toBe(1);
  expect(reopened.texts.some((text) => text.includes(NEW_DESCRIPTION))).toBe(true);

  // Workspace, Export as a file: a download named for the bundle, whose text is the bundle of the stored files
  await openWorkspaceMenu(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export as a file/ }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('brightcart-bundle.yaml');
  const exported = fs.readFileSync(await download.path(), 'utf8');
  expect(exported.split('\n')[0]).toBe('--- # file: .archicode.yaml');
  expect(exported).toBe(reopened.bundle);
  expect(exported).not.toBe(sampleText);

  // Reset with Cancel changes nothing
  await openWorkspaceMenu(page);
  await page.getByRole('button', { name: /Reset to the sample/ }).click();
  await expect(page.locator('body')).toContainText('Your changes in it are lost.');
  await page.getByRole('button', { name: 'Cancel' }).click();
  expect((await storedSample(page)).bundle).toBe(reopened.bundle);

  // Reset with the yes restores the sample's text
  await openWorkspaceMenu(page);
  await page.getByRole('button', { name: /Reset to the sample/ }).click();
  await page.getByRole('button', { name: /Reset .Brightcart./ }).click();
  await waitForEditor(page);
  await expect
    .poll(async () => (await storedSample(page)).bundle, { message: 'the stored files are the sample again' })
    .toBe(sampleText);
  expect((await storedSample(page)).rows).toBe(1);
});

test('a bundle file chosen in the file input is imported as a new workspace with the same files', async ({
  page,
  hosted
}) => {
  const sampleText = fs.readFileSync(SAMPLE_FILE, 'utf8');
  await page.goto(hosted.url + SAMPLE_ADDRESS);
  await waitForEditor(page);

  // back to the card, where Import a workspace file is offered
  await page.getByRole('button', { name: 'Close workspace' }).click();
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a workspace file/ }).click();
  const chooser = await choosing;
  await chooser.setFiles({ name: 'brightcart-bundle.yaml', mimeType: 'text/yaml', buffer: Buffer.from(sampleText) });

  // a new workspace opens: it never replaces the sample, so the name gets a number
  await waitForEditor(page);
  const names = await page.evaluate(async () => (await listBrowserWorkspaces()).map((row) => row.name).sort());
  expect(names).toEqual(['Brightcart', 'Brightcart 2']);
  await page.getByRole('button', { name: 'Close workspace' }).click();
  await expect(page.getByRole('button', { name: /Open .Brightcart 2./ })).toBeVisible();
  await expect(page.getByRole('button', { name: /Open .Brightcart\./ })).toBeVisible();
  expect((await storedSample(page)).bundle).toBe(sampleText);
});

test('against editor serve the sample is a browser workspace and the served folder stays as it was', async ({
  page,
  serve
}) => {
  const server = await serve('domain_workspace');
  const before = treeHash(server.dir);
  await page.goto(server.url);
  await expect(page.locator('[data-action="set-page"]', { hasText: 'Applications' })).toBeVisible();

  // Workspace, Open the Brightcart sample
  await openWorkspaceMenu(page);
  await page.getByRole('button', { name: /Open the Brightcart sample/ }).click();
  await waitForEditor(page);
  await expect(page.locator('body')).toContainText('Brightcart');

  // a change saved there goes to the browser, not to the folder
  await editShopDescription(page, NEW_DESCRIPTION);
  expect((await storedSample(page)).texts.some((text) => text.includes(NEW_DESCRIPTION))).toBe(true);
  expect(treeHash(server.dir)).toBe(before);

  // Back to the served folder shows it again
  await page.locator('[data-action="back-to-served-folder"]').click();
  await expect(page.locator('[data-action="back-to-served-folder"]')).toHaveCount(0);
  await expect(page.locator('[data-action="set-page"]', { hasText: 'Applications' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText(NEW_DESCRIPTION);
  expect(treeHash(server.dir)).toBe(before);
});
