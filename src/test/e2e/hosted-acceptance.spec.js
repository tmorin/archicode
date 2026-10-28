// The acceptance of #162 as three tests that read top to bottom as its sentences do (wave 025, run 0194, task-003;
// TDD DEC-1 (a) and (b), DEC-3, FLOW-1, FLOW-2). The page is served as the website serves it, from Node with no JVM
// (harness.js, startHostedPage), and runs in every project of the config.
//   1. a visitor whose browser has no folder picker (Firefox, Safari): the sample, a change, a reload, an export,
//      the delete of the workspace, the import of the exported file, and the same bytes back;
//   2. a visitor whose browser has a picker, replaced by a stub that counts: it is called 0 times, and the page sends
//      no write request and nothing but GETs to other hosts;
//   3. the click on the presentation page of the site, then a second click: one workspace, the change still there.
// NOT tested: the real folder picker (`showDirectoryPicker` opens a native dialog that no test can drive), what the
// page reads from the user's disk through another API, and the real Safari (Playwright's WebKit is not Safari).
// Bytes are compared as strings or with Buffer.compare, never as arrays, so no failure can print a byte array.

/* global listBrowserWorkspaces, readBrowserWorkspaceFiles, bundleWorkspaceFiles -- top-level names of the editor page, read inside page.evaluate */

const fs = require('node:fs');
const { test, expect } = require('./fixtures');
const {
  NEW_DESCRIPTION,
  SAMPLE_ADDRESS,
  storedSample,
  openWorkspaceMenu,
  editShopDescription,
  waitForEditor
} = require('./hosted');

async function exportBundle(page) {
  await openWorkspaceMenu(page);
  const downloading = page.waitForEvent('download');
  await page.getByRole('button', { name: /Export as a file/ }).click();
  const download = await downloading;
  expect(download.suggestedFilename()).toBe('brightcart-bundle.yaml');
  return fs.readFileSync(await download.path());
}

test('a visitor with no folder picker opens the sample, changes it, exports, deletes and imports it back, byte for byte', async ({
  page,
  hosted
}) => {
  await page.addInitScript(() => {
    delete window.showDirectoryPicker;
  });
  await page.goto(hosted.url);

  // the card is not the unsupported-browser card, and offers the sample
  await expect(page.getByRole('button', { name: 'Open the Brightcart sample' })).toBeVisible();
  await expect(page.locator('body')).not.toContainText('This browser isn’t supported');
  await page.getByRole('button', { name: 'Open the Brightcart sample' }).click();
  await waitForEditor(page);
  await expect(page.locator('body')).toContainText('Brightcart');

  // a change, kept across a reload
  await editShopDescription(page, NEW_DESCRIPTION);
  await page.reload();
  await waitForEditor(page);
  const changed = await storedSample(page);
  expect(changed.rows).toBe(1);
  expect(changed.texts.some((text) => text.includes(NEW_DESCRIPTION))).toBe(true);

  // export: the file is the bundle of the stored files
  const downloaded = await exportBundle(page);
  expect(Buffer.compare(downloaded, Buffer.from(changed.bundle)), 'download against the stored bundle').toBe(0);

  // delete the workspace from the card, with its question
  await page.getByRole('button', { name: 'Close workspace' }).click();
  await page.getByRole('button', { name: /Delete .Brightcart./ }).click();
  await page.locator('[data-action="delete-browser-workspace"]').click();
  await expect(page.locator('[data-action="delete-browser-workspace"]')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Open .Brightcart./ })).toHaveCount(0);
  expect((await storedSample(page)).rows).toBe(0);

  // import the exported file: the stored files give the same bundle
  const choosing = page.waitForEvent('filechooser');
  await page.getByRole('button', { name: /Import a workspace file/ }).click();
  const chooser = await choosing;
  await chooser.setFiles({ name: 'brightcart-bundle.yaml', mimeType: 'text/yaml', buffer: downloaded });
  await waitForEditor(page);
  const imported = await page.evaluate(async () => {
    const rows = await listBrowserWorkspaces();
    const files = await readBrowserWorkspaceFiles(rows[0].id);
    return { names: rows.map((row) => row.name), bundle: bundleWorkspaceFiles(files).text };
  });
  expect(imported.names, 'the old workspace is gone, so the name has no number').toEqual(['Brightcart']);
  expect(imported.bundle === downloaded.toString('utf8'), 'imported bundle equals the downloaded text').toBe(true);
  expect(imported.bundle.includes(NEW_DESCRIPTION)).toBe(true);
});

test('a visitor whose browser has a folder picker never calls it, and the page writes nothing to any server', async ({
  page,
  hosted
}) => {
  await page.addInitScript(() => {
    window.showDirectoryPicker = async () => {
      try {
        sessionStorage.setItem('pickerCalls', String(Number(sessionStorage.getItem('pickerCalls') || '0') + 1));
      } catch {
        window.pickerCallsInMemory = (window.pickerCallsInMemory || 0) + 1;
      }
      throw new DOMException('the test stub does not pick', 'AbortError');
    };
  });
  const sent = [];
  page.on('request', (request) => sent.push({ method: request.method(), url: request.url() }));

  await page.goto(hosted.url);
  await page.getByRole('button', { name: 'Open the Brightcart sample' }).click();
  await waitForEditor(page);
  await editShopDescription(page, NEW_DESCRIPTION);
  await page.reload();
  await waitForEditor(page);
  expect((await storedSample(page)).texts.some((text) => text.includes(NEW_DESCRIPTION))).toBe(true);

  const calls = await page.evaluate(
    () => Number(sessionStorage.getItem('pickerCalls') || '0') + (window.pickerCallsInMemory || 0)
  );
  expect(calls, 'calls of showDirectoryPicker').toBe(0);

  // nothing is written: every request is a GET, and the hosted server was asked for the page and the sample only
  expect(sent.filter((r) => r.method !== 'GET').map((r) => `${r.method} ${r.url}`)).toEqual([]);
  const mine = new URL(hosted.url).origin;
  const others = sent.filter((r) => /^https?:/.test(r.url) && !r.url.startsWith(mine));
  expect(others.every((r) => r.method === 'GET')).toBe(true);
  expect(new Set(hosted.requests)).toEqual(new Set(['/editor/', '/editor/samples/brightcart.yaml']));
});

test('the button of the site opens Brightcart in one click, and a second click reopens the same workspace', async ({
  page,
  hosted
}) => {
  const button = () => page.getByRole('link', { name: 'Try the editor on a realistic project' }).first();

  await page.goto(hosted.siteUrl);
  await button().click();
  await waitForEditor(page);
  await expect(page).toHaveURL(/#\/timeline\/applications/);
  await expect(page).toHaveURL(/plateau=marketplace/);
  await expect(page.getByRole('combobox', { name: 'Compare with' })).toHaveValue('past');
  expect((await storedSample(page)).rows).toBe(1);

  await editShopDescription(page, NEW_DESCRIPTION);

  // back on the site, a second click
  await page.goto(hosted.siteUrl);
  await expect(button()).toHaveAttribute('href', /editor\/#\/timeline\/applications/);
  expect(SAMPLE_ADDRESS).toContain('sample=brightcart');
  await button().click();
  await waitForEditor(page);
  const again = await storedSample(page);
  expect(again.rows, 'rows after the second click').toBe(1);
  expect(again.texts.some((text) => text.includes(NEW_DESCRIPTION))).toBe(true);
});
