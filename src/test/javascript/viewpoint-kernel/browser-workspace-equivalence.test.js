'use strict';
// The browser workspace behind the editor's own loading and saving (wave 025, run 0192, task-003; TDD CTR-1, TG-1, TG-2, REQ-1, REQ-6): the same
// files in a disk-like folder (`memFolder` of mem-folder.js, which has createWritable, takes strings only and does not truncate on
// getFileHandle with create; `makeDirHandle` is read-only and is not used) and in a browser workspace, both fed the same strings (a byte-order mark
// is the first character of the string), must load alike through `loadWorkspace`, and the same edit saved through `saveAllChanges` must write
// the same bytes. The browser handle is the third implementation of the interface; the loading and the saving are not told which one they have.
//
// Written before the store exists: it fails now because the page has no `createBrowserWorkspace`. Bytes are compared by hash (the page's bytes
// are of another realm, and a failing assertion must never print them, CON-8).
// Run with: node --test src/test/javascript/viewpoint-kernel/browser-workspace-equivalence.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, fakeIndexedDB } = require('./harness');
const { memFolder } = require('./mem-folder');

const REPO = path.resolve(__dirname, '../../../..');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const sha = (bytes) => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const shaOfText = (text) => sha(Buffer.from(text, 'utf8'));
const MARK = '﻿';

const SOURCES = [
  ['the layered Brightcart fixture', path.join(REPO, 'src/test/resources/brightcart/layered')],
  ['the shipped example domain_manifest_folders', path.join(REPO, 'src/doc/examples/domain_manifest_folders')],
  ['the shipped example domain_plateaus', path.join(REPO, 'src/doc/examples/domain_plateaus')]
];

/** Every file under `dir` (hidden ones too), as a path -> text object. */
function readTree(dir, prefix = '') {
  const out = {};
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix === '' ? entry.name : prefix + '/' + entry.name;
    if (entry.isDirectory()) Object.assign(out, readTree(dir, rel));
    else out[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  return out;
}

function bytesIn(sandbox, text) {
  const source = Buffer.from(text, 'utf8');
  const bytes = run(sandbox, 'new Uint8Array(' + source.length + ')');
  bytes.set(source);
  return bytes;
}

function prepare(sandbox, handle, name, extra = {}) {
  const state = sandbox.__state();
  state.folder = Object.assign({ handle, name }, extra);
  state.permissionState = 'granted';
  return state;
}

/** The files in a disk-like folder, loaded by the editor. */
async function openDisk(files) {
  const mem = memFolder(files);
  const sandbox = createApp({ withFile: true });
  const state = prepare(sandbox, mem.handle, 'ws');
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  // what is on the "disk" now: path -> hash of the bytes, and a file's text
  const stored = () => Object.fromEntries(Array.from(mem.files, ([p, f]) => [p, shaOfText(f.text)]));
  const read = async (relPath) => mem.files.get(relPath).text;
  return { sandbox, state, stored, read };
}

/** The same files in a browser workspace, loaded by the editor. */
async function openBrowser(files) {
  const idb = fakeIndexedDB();
  const sandbox = createApp({ indexedDB: idb, withFile: true });
  sandbox.console.error = () => {};
  const record = await sandbox.createBrowserWorkspace({
    name: 'Equivalence',
    files: Object.entries(files).map(([p, text]) => ({ path: p, bytes: bytesIn(sandbox, text) })),
    origin: 'blank'
  });
  const handle = sandbox.browserDirectoryHandle(record.id, '', 'Equivalence');
  const state = prepare(sandbox, handle, 'Equivalence', { id: null, browserWorkspace: record.id });
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  const stored = async () => {
    const out = {};
    const walk = async (dir, prefix) => {
      for await (const [name, entry] of dir.entries()) {
        if (entry.kind === 'directory') await walk(entry, prefix + name + '/');
        else out[prefix + name] = sha(await (await entry.getFile()).arrayBuffer());
      }
    };
    await walk(sandbox.browserDirectoryHandle(record.id, '', 'Equivalence'), '');
    return out;
  };
  const read = async (relPath) => {
    const segments = relPath.split('/');
    let dir = state.folder.handle;
    for (const segment of segments.slice(0, -1)) dir = await dir.getDirectoryHandle(segment);
    const file = await (await dir.getFileHandle(segments[segments.length - 1])).getFile();
    return Buffer.from(await file.arrayBuffer()).toString('utf8');
  };
  return { sandbox, state, stored, read };
}

/** What the loading made of the files, as strings and booleans only. */
function loaded(page) {
  const { state } = page;
  assert.equal(state.fatalError, null, 'the workspace loads');
  return {
    workspaceText: shaOfText(state.workspace.rawText),
    workspaceBom: state.workspace.bom,
    files: Array.from(state.manifestFiles, (f) => ({
      relPath: f.relPath,
      text: shaOfText(f.rawText),
      bom: f.bom,
      error: f.error || null
    })).sort((a, b) => (a.relPath < b.relPath ? -1 : 1)),
    unread: Array.from(state.unreadManifestFiles).sort(),
    applications: Array.from(state.index.application.keys()).sort(),
    technology: Array.from(state.index.technology.keys()).sort()
  };
}

/** The lines of `after` that are not the line at the same place in `before` (the whole of `after` when the count differs). */
function changedLines(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  return a.length === b.length ? b.filter((line, i) => line !== a[i]) : b;
}

const rename = (page, reference, name) =>
  page.sandbox.commitElementEdit(reference, (node) => {
    node.name = name;
    return {};
  });

for (const [label, dir] of SOURCES) {
  test(
    label + ' loads alike from a folder and from a browser workspace, and an edit saves the same bytes',
    async () => {
      const files = readTree(dir);
      const disk = await openDisk(files);
      const browser = await openBrowser(files);

      // the loading: same file list, same texts, same flags, same model
      const fromDisk = loaded(disk);
      const fromBrowser = loaded(browser);
      assert.ok(fromDisk.files.length > 0, 'the source has manifests');
      assert.deepEqual(fromBrowser, fromDisk);

      // the same edit, saved through the real save
      const reference = fromDisk.applications[0] || fromDisk.technology[0];
      const layer = fromDisk.applications.length > 0 ? 'application' : 'technology';
      assert.ok(reference, 'the source has an element to edit');
      for (const page of [disk, browser]) {
        await page.sandbox.commitElementEdit(
          reference,
          (node) => {
            node.name = 'Edited by the equivalence test';
            return {};
          },
          layer,
          { confirmed: true } // in a layered workspace the plateaus that inherit the element are asked first: yes
        );
        assert.ok(
          page.state.manifestFiles.some((f) => f.dirty),
          'the edit leaves a file to save'
        );
        await page.sandbox.saveAllChanges();
        assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
        assert.ok(page.state.manifestFiles.every((f) => !f.dirty));
      }

      const writtenToDisk = disk.stored();
      const writtenToBrowser = await browser.stored();
      assert.deepEqual(writtenToBrowser, writtenToDisk, 'the same files, the same bytes');
      const changed = Object.keys(files).filter((p) => writtenToDisk[p] !== shaOfText(files[p]));
      assert.ok(changed.length >= 1, 'the edit changed a file');

      // the changed lines, file by file
      for (const p of changed) {
        const diskText = await disk.read(p);
        const browserText = await browser.read(p);
        assert.equal(browserText, diskText);
        assert.deepEqual(changedLines(files[p], browserText), changedLines(files[p], diskText));
        assert.ok(changedLines(files[p], browserText).length <= 6, p + ': an edit of a name changes a few lines');
      }
    }
  );
}

const ORCHARD = [
  '# the orchard',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "orchard"',
  '  name: "Orchard"',
  '  elements:',
  '    - kind: container',
  '      id: "press"',
  '      name: "Press"   # the press',
  ''
].join('\r\n');
const MARKET = ORCHARD.replace(/orchard/g, 'market').replace(/Orchard/g, 'Market');
const WORKSPACE = '# the workspace\r\nsettings:\r\n  manifests:\r\n    paths:\r\n      - manifests\r\n';

test('a file whose first character is a byte-order mark keeps it through load and save, in both, with CRLF', async () => {
  const files = {
    '.archicode.yaml': MARK + WORKSPACE,
    'manifests/app.orchard.yaml': MARK + ORCHARD,
    'manifests/app.market.yaml': MARKET
  };
  const disk = await openDisk(files);
  const browser = await openBrowser(files);

  for (const page of [disk, browser]) {
    const state = page.state;
    assert.equal(state.workspace.bom, true, 'the workspace file has the mark');
    assert.equal(state.workspace.rawText.startsWith(MARK), false, 'the text the page holds has not');
    const orchard = state.manifestFiles.find((f) => f.relPath === 'manifests/app.orchard.yaml');
    const market = state.manifestFiles.find((f) => f.relPath === 'manifests/app.market.yaml');
    assert.equal(orchard.bom, true);
    assert.equal(market.bom, false);
    assert.equal(orchard.rawText.startsWith(MARK), false);

    await rename(page, 'orchard', 'Orchard of Bees');
    page.state.workspace.settings.name = 'Kept in a browser';
    page.state.workspace.settingsDirty = true;
    await page.sandbox.saveAllChanges();
    assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  }

  const writtenToDisk = disk.stored();
  const writtenToBrowser = await browser.stored();
  assert.deepEqual(writtenToBrowser, writtenToDisk);
  const orchard = await browser.read('manifests/app.orchard.yaml');
  assert.ok(orchard.startsWith(MARK + '# the orchard\r\n'), 'the mark is back first, the line ends are CRLF');
  assert.equal(orchard.indexOf(MARK, 1), -1, 'once');
  assert.equal(orchard, MARK + ORCHARD.replace('name: "Orchard"', 'name: "Orchard of Bees"'));
  assert.equal(await browser.read('manifests/app.market.yaml'), MARKET, 'a file the edit did not touch is as it was');
  const workspace = await browser.read('.archicode.yaml');
  assert.ok(workspace.startsWith(MARK + '# the workspace\r\n'));
  assert.equal(workspace.indexOf(MARK, 1), -1);
  assert.equal(shaOfText(workspace), shaOfText(await disk.read('.archicode.yaml')));
});

test('the staleness check of the save works on a browser workspace: a file changed elsewhere is not overwritten', async () => {
  const files = {
    '.archicode.yaml': WORKSPACE,
    'manifests/app.orchard.yaml': ORCHARD,
    'manifests/app.market.yaml': MARKET
  };
  const browser = await openBrowser(files);
  await rename(browser, 'orchard', 'Orchard of Bees');

  // another tab saves the same file first
  const dir = await browser.state.folder.handle.getDirectoryHandle('manifests');
  const writable = await (await dir.getFileHandle('app.orchard.yaml')).createWritable();
  await writable.write(ORCHARD.replace('"Press"', '"Cider press"'));
  await writable.close();

  await browser.sandbox.saveAllChanges();
  const status = run(browser.sandbox, 'saveStatus');
  assert.equal(status.state, 'conflict');
  assert.equal(JSON.stringify(Array.from(status.conflicts)), JSON.stringify(['manifests/app.orchard.yaml']));
  assert.equal(
    await browser.read('manifests/app.orchard.yaml'),
    ORCHARD.replace('"Press"', '"Cider press"'),
    'what the other tab wrote is still there'
  );
});

test('a new manifest created in a folder that does not exist yet is written through the browser handle', async () => {
  const files = { '.archicode.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n' };
  const disk = await openDisk(files);
  const browser = await openBrowser(files);
  for (const page of [disk, browser]) {
    const created = page.sandbox.commitCreateTopLevelElement({
      category: 'application',
      headerKind: 'system',
      attachUnderReference: null,
      id: 'mailer',
      name: 'Mailer',
      description: null
    });
    assert.equal(created.relPath, 'manifests/app.mailer.yaml');
    await page.sandbox.saveAllChanges();
    assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  }
  const writtenToDisk = disk.stored();
  const writtenToBrowser = await browser.stored();
  assert.deepEqual(writtenToBrowser, writtenToDisk);
  assert.deepEqual(Object.keys(writtenToBrowser).sort(), ['.archicode.yaml', 'manifests/app.mailer.yaml']);
});
