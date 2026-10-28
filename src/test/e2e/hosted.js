// Helpers shared by the specs that run on the hosted-style page (wave 025, run 0194, IMP-1): moved from sample.spec.js.

/* global listBrowserWorkspaces, readBrowserWorkspaceFiles, bundleWorkspaceFiles -- top-level names of the editor page, read inside page.evaluate */

const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { expect, openPage } = require('./fixtures');
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
  const toggle = page.locator('[data-action="toggle-workspace-menu"]');
  if ((await toggle.getAttribute('aria-expanded')) !== 'true') {
    await toggle.click();
  }
}

// Edits the description of Back office (a system both the baseline and the marketplace plateau have) on the Elements page and saves it.
async function editShopDescription(page, description) {
  await openPage(page, 'Elements');
  await page
    .locator('.tree-node-row[role="treeitem"]')
    .filter({ hasText: /Back office/ })
    .first()
    .click();
  await page.locator('[data-action="toggle-element-edit"]').first().click();
  await page.locator('#edit-description-input').fill(description);
  await page.locator('[data-action="save-all-changes"]').click();
  // the baseline is inherited by other plateaus: the page asks first, and the yes writes it
  const confirm = page.getByRole('button', { name: /^Write in / });
  const saved = page.getByText('Saved.');
  await expect(confirm.or(saved).first()).toBeVisible();
  if (await confirm.isVisible()) {
    await confirm.click();
    // the draft is in the page's model; one more click of the same button writes it
    await page.locator('[data-action="save-all-changes"]').click();
  }
  await expect(page.locator('body')).toContainText('Saved.');
}

async function waitForEditor(page) {
  await expect(page.locator('[data-action="save-all-changes"]')).toBeVisible();
}

module.exports = {
  SAMPLE_FILE,
  SAMPLE_ADDRESS,
  NEW_DESCRIPTION,
  treeHash,
  storedSample,
  openWorkspaceMenu,
  editShopDescription,
  waitForEditor
};
