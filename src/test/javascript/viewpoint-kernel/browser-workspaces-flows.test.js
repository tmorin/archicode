'use strict';
// Wave 025, run 0192 (W-4), issue #162 proposal 2, TDD-0192: the flows of a browser workspace, which the page keeps in a second IndexedDB database
// (`archicode-browser-workspaces`, store `records`: `workspace:<id>`, `file:<id>/<path>`, `last`; CTR-2) and opens through a third directory handle.
// These tests call the flow functions directly: no card is drawn, no key handler is fired (the cases that read the card are `browser-landing.test.js`).
// They are written before the code (red): each fails because a function or a variable of the TDD is missing from the page, and passes when task-007 has written them.
// The IndexedDB is the fake of the harness, so a test can seed the records of CTR-2 and read them back. Bytes are compared as text, lengths and hashes, never printed
// (CON-8: the page builds its bytes in the realm of its sandbox, so no deepStrictEqual and no instanceof on them).
//
// The names the page is written against (TDD IMP-1, IMP-2, CTR-4, DEC-12; the ones marked + are fixed here and not in the TDD):
//   store (persistence/browser-store.js): probeBrowserStore(), listBrowserWorkspaces(), createBrowserWorkspace({ name, files: [{ path, bytes }], origin }),
//     deleteBrowserWorkspace(id), askForPersistentStorage();
//   state (model/app-state.js): browserWorkspaces, browserStoreState, browserStoragePersisted, browserStorageAsked, landingPendingDelete, landingNameDraft;
//   flows (application/browser-workspaces.js): newBrowserWorkspace() opens the name field of IF-2 with the default name in landingNameDraft ({ for: 'new', text, problem }),
//     setBrowserNameDraft(text)+ is the typing, submitBrowserNameDraft()+ creates or renames according to landingNameDraft.for and cancelBrowserNameDraft()+ drops it,
//     renameBrowserWorkspaceRow(id) opens the field for a row, openBrowserWorkspace(id), askToDeleteBrowserWorkspace(id), confirmDeleteBrowserWorkspace(id),
//     cancelBrowserWorkspaceQuestion(), refreshBrowserWorkspaces(); every flow that loads a workspace resolves when the workspace is loaded.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, fakeIndexedDB, makeDirHandle, waitFor } = require('./harness');
const { memFolder } = require('./mem-folder');

const BDB = 'archicode-browser-workspaces';
const FDB = 'archicode-standalone-editor';
const SYSTEM = 'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: s1\n  name: S1\n';
const WORKSPACE_YAML = '# A workspace.\nsettings:\n  name: Shop\n';
const SHOP_FILES = { '.archicode.yaml': WORKSPACE_YAML, 'manifests/app.s1.yaml': SYSTEM };

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value)); // the page's arrays and objects are of another realm
const encode = (text) => new TextEncoder().encode(text);

/** The records of CTR-2 for some workspaces: `[{ id, name, files: { path: text }, openedAt }]`, and the pointer `last`. */
function recordsOf(workspaces, last) {
  const out = {};
  for (const w of workspaces) {
    out['workspace:' + w.id] = {
      kind: 'workspace',
      id: w.id,
      name: w.name,
      createdAt: 1000,
      openedAt: w.openedAt || 1000,
      lastExportAt: null,
      origin: 'blank'
    };
    for (const [file, text] of Object.entries(w.files || SHOP_FILES))
      out['file:' + w.id + '/' + file] = {
        kind: 'file',
        workspace: w.id,
        path: file,
        bytes: encode(text),
        modified: 2000
      };
  }
  if (last) out.last = last;
  return out;
}

const seedBrowser = (idb, workspaces, last) => idb.seed(BDB, 1, { records: recordsOf(workspaces, last) });
const browserRecords = (idb) => (idb.dump(BDB) || { stores: { records: {} } }).stores.records;
const workspaceNames = (idb) =>
  Object.entries(browserRecords(idb))
    .filter(([key]) => key.startsWith('workspace:'))
    .map(([, record]) => record.name)
    .sort();
const fileKeys = (idb, id) => Object.keys(browserRecords(idb)).filter((key) => key.startsWith('file:' + id + '/'));
const storedText = (idb, id, file) => {
  const record = browserRecords(idb)['file:' + id + '/' + file];
  return record
    ? Buffer.from(record.bytes.buffer, record.bytes.byteOffset, record.bytes.byteLength).toString('utf8')
    : null;
};

/** A hash of a whole database, bytes included: two equal hashes are two equal databases, and nothing is printed. */
function fingerprint(idb, name) {
  const db = idb.dump(name);
  // a database that only exists, with no record in it, is what a read of it leaves (opening creates it): it holds nothing the page wrote
  if (!db || Object.values(db.stores).every((records) => Object.keys(records).length === 0)) return 'none';
  const text = JSON.stringify(db, (key, value) =>
    ArrayBuffer.isView(value)
      ? 'bytes:' +
        crypto
          .createHash('sha1')
          .update(Buffer.from(value.buffer, value.byteOffset, value.byteLength))
          .digest('hex')
      : value
  );
  return crypto.createHash('sha1').update(text).digest('hex');
}

/** A page of the editor on `idb`; `picker`: the browser can pick folders. */
function page(idb, options = {}) {
  const sandbox = createApp(Object.assign({ indexedDB: idb, withFile: true }, options));
  sandbox.console.error = () => {}; // the failures these tests provoke are logged by the page
  if (options.picker) sandbox.window.showDirectoryPicker = async () => undefined;
  return sandbox;
}

/** The page after the store was probed and the list read, with the card not yet drawn. */
async function ready(idb, options) {
  const sandbox = page(idb, options);
  await sandbox.probeBrowserStore();
  await sandbox.refreshBrowserWorkspaces();
  return sandbox;
}

const settled = (sandbox) => {
  const state = sandbox.__state();
  if (run(sandbox, 'landingBusy') !== null || run(sandbox, 'browserStoreState') === 'unknown') return false;
  const card = sandbox.landingScreenConfig();
  return !!(state.workspace || state.fatalError || (card && card.kind !== 'busy'));
};

/** A load of the page, as the browser does it: DOMContentLoaded, then whatever reopens by itself. */
async function load(idb, options) {
  const sandbox = page(idb, options);
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(() => settled(sandbox), 'the page to settle');
  return sandbox;
}

const idOf = (idb, name) => {
  const found = Object.values(browserRecords(idb)).find((r) => r.kind === 'workspace' && r.name === name);
  return found ? found.id : null;
};
const manifestText = (sandbox) =>
  sandbox.__state().manifestFiles.find((f) => f.relPath === 'manifests/app.s1.yaml').rawText;
const rename = (sandbox, name) =>
  sandbox.commitElementEdit('s1', (node) => {
    node.name = name;
    return {};
  });

/** A page with the workspace `Shop` open (the flows opened it). */
async function openShop(idb, options) {
  const sandbox = await ready(idb, options);
  await sandbox.openBrowserWorkspace('bw-a');
  assert.ok(sandbox.__state().workspace, 'the workspace is open');
  return sandbox;
}

// ---- create ----

test('create: the default name is Untitled workspace, then Untitled workspace 2; the workspace opens with a minimal .archicode.yaml', async () => {
  const idb = fakeIndexedDB();
  const sandbox = await ready(idb);
  await sandbox.newBrowserWorkspace();
  assert.deepEqual(plain(run(sandbox, 'landingNameDraft')), { for: 'new', text: 'Untitled workspace', problem: null });
  await sandbox.submitBrowserNameDraft();

  const state = sandbox.__state();
  assert.equal(run(sandbox, 'landingNameDraft'), null, 'the field is gone');
  assert.deepEqual(workspaceNames(idb), ['Untitled workspace']);
  const id = idOf(idb, 'Untitled workspace');
  assert.equal(state.folder.browserWorkspace, id);
  assert.equal(state.folder.name, 'Untitled workspace');
  assert.equal(state.folder.id, null, 'no remembered folder');
  assert.equal(state.permissionState, 'granted');
  assert.ok(state.workspace, 'the editor opened on the new workspace');
  assert.deepEqual(fileKeys(idb, id), ['file:' + id + '/.archicode.yaml']);
  assert.equal(
    storedText(idb, id, '.archicode.yaml'),
    '# A workspace kept in this browser.\nsettings:\n  name: "Untitled workspace"\n'
  );
  assert.equal(browserRecords(idb).last.id, id, 'it is the workspace that reopens on load');

  await sandbox.closeFolder();
  await sandbox.newBrowserWorkspace();
  assert.equal(plain(run(sandbox, 'landingNameDraft')).text, 'Untitled workspace 2');
  await sandbox.submitBrowserNameDraft();
  assert.deepEqual(workspaceNames(idb), ['Untitled workspace', 'Untitled workspace 2']);
});

test('create: a name is trimmed, and the one the visitor typed is the one stored', async () => {
  const idb = fakeIndexedDB();
  const sandbox = await ready(idb);
  await sandbox.newBrowserWorkspace();
  sandbox.setBrowserNameDraft('   Corner shop  ');
  await sandbox.submitBrowserNameDraft();
  assert.deepEqual(workspaceNames(idb), ['Corner shop']);
  assert.equal(sandbox.__state().folder.name, 'Corner shop');
  assert.equal(
    storedText(idb, idOf(idb, 'Corner shop'), '.archicode.yaml'),
    '# A workspace kept in this browser.\nsettings:\n  name: "Corner shop"\n'
  );
});

test('create: a name that is taken (trimmed, without case), empty, of 81 characters or with a control character is refused with a sentence under the field, and keeps the text', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await ready(idb);
  const before = fingerprint(idb, BDB);
  const refused = ['  shop ', '   ', '', 'a'.repeat(81), 'two\nlines', 'bell\u0007'];
  for (const text of refused) {
    await sandbox.newBrowserWorkspace();
    sandbox.setBrowserNameDraft(text);
    await sandbox.submitBrowserNameDraft();
    const draft = plain(run(sandbox, 'landingNameDraft'));
    assert.ok(draft, 'the field stays open for ' + JSON.stringify(text));
    assert.equal(draft.for, 'new');
    assert.equal(draft.text, text, 'the typed text is kept');
    assert.equal(typeof draft.problem, 'string', 'with its sentence: ' + JSON.stringify(text));
    assert.ok(draft.problem.length > 0);
    assert.equal(fingerprint(idb, BDB), before, 'nothing is stored for ' + JSON.stringify(text));
    assert.equal(sandbox.__state().folder, null, 'and nothing is opened');
    sandbox.cancelBrowserNameDraft();
  }
  // 80 characters is the longest name
  await sandbox.newBrowserWorkspace();
  sandbox.setBrowserNameDraft('a'.repeat(80));
  await sandbox.submitBrowserNameDraft();
  assert.deepEqual(workspaceNames(idb), ['Shop', 'a'.repeat(80)]); // sorted by code point
});

test('create: a name that is markup is stored as text', async () => {
  const idb = fakeIndexedDB();
  const sandbox = await ready(idb);
  const name = '<img src=x onerror=alert(1)>';
  await sandbox.newBrowserWorkspace();
  sandbox.setBrowserNameDraft(name);
  await sandbox.submitBrowserNameDraft();
  assert.deepEqual(workspaceNames(idb), [name]);
  assert.equal(
    storedText(idb, idOf(idb, name), '.archicode.yaml').split('\n')[2],
    '  name: "<img src=x onerror=alert(1)>"'
  );
});

test('create: the refusal sentence and the typed text are kept across a redraw request, and resetUiState clears the field', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await ready(idb);
  await sandbox.newBrowserWorkspace();
  sandbox.setBrowserNameDraft('shop');
  await sandbox.submitBrowserNameDraft();
  const refused = plain(run(sandbox, 'landingNameDraft'));
  assert.equal(typeof refused.problem, 'string');
  sandbox.requestRedraw();
  assert.deepEqual(
    plain(run(sandbox, 'landingNameDraft')),
    refused,
    'a redraw does not change what the visitor typed or what was said'
  );
  sandbox.resetUiState();
  assert.equal(run(sandbox, 'landingNameDraft'), null);
});

test('create: a store that refuses the transaction says so, creates nothing and opens nothing', async () => {
  let failing = false;
  const idb = fakeIndexedDB({ failPut: (key) => failing && key.startsWith('file:') });
  const sandbox = await ready(idb);
  failing = true;
  await sandbox.newBrowserWorkspace();
  await sandbox.submitBrowserNameDraft();
  assert.deepEqual(workspaceNames(idb), [], 'the record is not kept without its file');
  assert.equal(sandbox.__state().folder, null);
  assert.match(String(run(sandbox, 'landingNotice')), /could not be created: /);
});

// ---- open ----

test('open: sets the folder with browserWorkspace, grants the permission, loads the files and writes the pointer', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other', files: { '.archicode.yaml': 'settings: {}\n' } }
  ]);
  const sandbox = await ready(idb);
  await sandbox.openBrowserWorkspace('bw-a');
  const state = sandbox.__state();
  assert.equal(state.fatalError, null);
  assert.equal(state.folder.browserWorkspace, 'bw-a');
  assert.equal(state.folder.name, 'Shop');
  assert.equal(state.folder.id, null);
  assert.equal(state.permissionState, 'granted');
  assert.ok(state.index.application.has('s1'), 'the manifests of the workspace are read');
  assert.equal(manifestText(sandbox), SYSTEM);
  assert.equal(browserRecords(idb).last.id, 'bw-a');
  assert.equal(typeof browserRecords(idb).last.openedAt, 'number');
});

test('open: a workspace without .archicode.yaml shows the existing error and keeps its data', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', files: { 'manifests/app.s1.yaml': SYSTEM } }]);
  const sandbox = await ready(idb);
  const before = fingerprint(idb, BDB);
  await sandbox.openBrowserWorkspace('bw-a');
  const state = sandbox.__state();
  assert.ok(state.fatalError, 'the existing sentence for a missing workspace file');
  assert.equal(state.workspace, null);
  assert.equal(state.folder.browserWorkspace, 'bw-a');
  assert.equal(sandbox.landingScreenConfig().kind, 'error');
  assert.deepEqual(fileKeys(idb, 'bw-a'), ['file:bw-a/manifests/app.s1.yaml'], 'nothing is created or removed');
  assert.equal(storedText(idb, 'bw-a', 'manifests/app.s1.yaml'), SYSTEM);
  assert.notEqual(fingerprint(idb, BDB), before, 'only the pointer moved');
});

test('open: a workspace that is gone says so, opens nothing and reads the list again', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb);
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 2);
  const other = await ready(idb);
  await other.deleteBrowserWorkspace('bw-a'); // another tab
  await sandbox.openBrowserWorkspace('bw-a');
  assert.equal(sandbox.__state().folder, null);
  assert.equal(sandbox.__state().workspace, null);
  assert.equal(run(sandbox, 'landingNotice'), '“Shop” is no longer in this browser.');
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 1, 'the list is read again');
  assert.equal(browserRecords(idb).last, undefined, 'no pointer to it');
});

// ---- rename ----

test('rename: one record changes and no file does; a taken name is a sentence and changes nothing', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb);
  const filesBefore = ['bw-a', 'bw-b'].map((id) =>
    fileKeys(idb, id).map((k) => k + ':' + storedText(idb, id, k.slice(('file:' + id + '/').length)))
  );

  sandbox.renameBrowserWorkspaceRow('bw-a');
  assert.deepEqual(plain(run(sandbox, 'landingNameDraft')), { for: 'bw-a', text: 'Shop', problem: null });
  sandbox.setBrowserNameDraft('OTHER');
  await sandbox.submitBrowserNameDraft();
  assert.equal(typeof plain(run(sandbox, 'landingNameDraft')).problem, 'string');
  assert.deepEqual(workspaceNames(idb), ['Other', 'Shop'], 'nothing changed');

  sandbox.setBrowserNameDraft('  Renamed ');
  await sandbox.submitBrowserNameDraft();
  assert.equal(run(sandbox, 'landingNameDraft'), null);
  assert.deepEqual(workspaceNames(idb), ['Other', 'Renamed']);
  assert.equal(browserRecords(idb)['workspace:bw-a'].id, 'bw-a', 'the id is the workspace');
  const filesAfter = ['bw-a', 'bw-b'].map((id) =>
    fileKeys(idb, id).map((k) => k + ':' + storedText(idb, id, k.slice(('file:' + id + '/').length)))
  );
  assert.deepEqual(filesAfter, filesBefore, 'no file is rewritten');
  assert.equal(
    storedText(idb, 'bw-a', '.archicode.yaml'),
    WORKSPACE_YAML,
    'settings.name is not the name of the workspace on the card'
  );
  assert.equal(sandbox.__state().folder, null, 'a rename opens nothing');
});

test('rename: keeping the same name, or only its case, is allowed for the workspace itself', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await ready(idb);
  sandbox.renameBrowserWorkspaceRow('bw-a');
  sandbox.setBrowserNameDraft('SHOP');
  await sandbox.submitBrowserNameDraft();
  assert.equal(run(sandbox, 'landingNameDraft'), null);
  assert.deepEqual(workspaceNames(idb), ['SHOP']);
});

// ---- delete ----

test('delete: asking sets the question and the focus on Cancel; Cancel changes nothing', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: 5000 });
  const sandbox = await ready(idb);
  const before = fingerprint(idb, BDB);
  // the redraw consumes the selector (render() focuses the control and clears it), so it is read when the redraw is requested
  const focusAtRedraw = [];
  sandbox.onRedraw(() => focusAtRedraw.push(run(sandbox, 'landingFocusSelector')));
  sandbox.askToDeleteBrowserWorkspace('bw-a');
  assert.equal(run(sandbox, 'landingPendingDelete'), 'bw-a');
  assert.match(
    String(focusAtRedraw[focusAtRedraw.length - 1]),
    /data-action="cancel-browser-workspace-question"/,
    'the focus goes to Cancel'
  );
  assert.equal(fingerprint(idb, BDB), before, 'asking deletes nothing');
  sandbox.cancelBrowserWorkspaceQuestion();
  assert.equal(run(sandbox, 'landingPendingDelete'), null);
  assert.equal(fingerprint(idb, BDB), before, 'Cancel changes nothing');
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 1);
});

test('delete: confirming removes the record, its files and the pointer in one go, and no other workspace', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(
    idb,
    [
      { id: 'bw-a', name: 'Shop' },
      { id: 'bw-b', name: 'Other' }
    ],
    { id: 'bw-a', openedAt: 5000 }
  );
  const sandbox = await ready(idb);
  const otherFiles = fileKeys(idb, 'bw-b');
  sandbox.askToDeleteBrowserWorkspace('bw-a');
  await sandbox.confirmDeleteBrowserWorkspace('bw-a');
  assert.equal(run(sandbox, 'landingPendingDelete'), null);
  assert.deepEqual(workspaceNames(idb), ['Other']);
  assert.deepEqual(fileKeys(idb, 'bw-a'), []);
  assert.deepEqual(fileKeys(idb, 'bw-b'), otherFiles);
  assert.equal(browserRecords(idb).last, undefined, 'the pointer to it is gone');
  assert.deepEqual(
    Object.keys(browserRecords(idb)).sort(),
    ['workspace:bw-b'].concat(otherFiles).sort(),
    'nothing else is left'
  );
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 1, 'the list is read again');
  assert.equal(fingerprint(idb, FDB), 'none', 'the first database is not touched');
});

test('delete: the pointer to another workspace stays', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(
    idb,
    [
      { id: 'bw-a', name: 'Shop' },
      { id: 'bw-b', name: 'Other' }
    ],
    { id: 'bw-b', openedAt: 5000 }
  );
  const sandbox = await ready(idb);
  sandbox.askToDeleteBrowserWorkspace('bw-a');
  await sandbox.confirmDeleteBrowserWorkspace('bw-a');
  assert.equal(browserRecords(idb).last.id, 'bw-b');
});

test('delete: a workspace already deleted in another tab is said, not an error, and the list is read again', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await ready(idb);
  const other = await ready(idb);
  sandbox.askToDeleteBrowserWorkspace('bw-a');
  await other.deleteBrowserWorkspace('bw-a');
  await sandbox.confirmDeleteBrowserWorkspace('bw-a');
  assert.equal(run(sandbox, 'landingNotice'), '“Shop” was already deleted.');
  assert.equal(run(sandbox, 'landingPendingDelete'), null);
  assert.deepEqual(workspaceNames(idb), ['Other']);
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 1);
});

test('delete: a transaction that fails changes nothing and says so', async () => {
  let failing = false;
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await ready(idb);
  const before = fingerprint(idb, BDB);
  // a store that refuses the transaction: the connection is closed under the page
  const open = sandbox.indexedDB.open.bind(sandbox.indexedDB);
  sandbox.indexedDB.open = (name, version) => {
    if (failing) {
      const req = { result: null, error: Object.assign(new Error('blocked'), { name: 'AbortError' }), onerror: null };
      setTimeout(() => req.onerror && req.onerror({ target: req }), 0);
      return req;
    }
    return open(name, version);
  };
  sandbox.askToDeleteBrowserWorkspace('bw-a');
  failing = true;
  await sandbox.confirmDeleteBrowserWorkspace('bw-a');
  failing = false;
  assert.equal(fingerprint(idb, BDB), before, 'nothing changed');
  assert.match(String(run(sandbox, 'landingNotice')), /“Shop” could not be deleted: /);
});

// ---- reload ----

test('a reload finds the saved change and not the unsaved one', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const first = await openShop(idb);
  rename(first, 'Saved name');
  await first.saveAllChanges();
  assert.equal(run(first, 'saveStatus.state'), 'success');
  rename(first, 'Unsaved name');
  assert.ok(first.hasUnsavedChanges());

  const second = await load(idb);
  const state = second.__state();
  assert.equal(state.fatalError, null);
  assert.equal(state.folder.browserWorkspace, 'bw-a', 'it reopens by itself');
  assert.ok(manifestText(second).includes('Saved name'));
  assert.ok(!manifestText(second).includes('Unsaved name'));
  assert.ok(storedText(idb, 'bw-a', 'manifests/app.s1.yaml').includes('Saved name'));
  assert.equal(
    storedText(idb, 'bw-a', 'manifests/app.s1.yaml'),
    SYSTEM.replace('name: S1', 'name: Saved name'),
    'two lines of text, the rest as written'
  );
});

// ---- what reopens (DEC-5) ----

/** A folder on disk the browser remembers (the records of remembered-folders.js), `permission` being what the browser says of it. */
function rememberDiskFolder(idb, openedAt, permission = 'granted', legacy = false) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-flows-')), 'disk');
  fs.mkdirSync(path.join(dir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifests', 'app.s1.yaml'), SYSTEM);
  fs.writeFileSync(path.join(dir, '.archicode.yaml'), 'settings:\n  name: Disk\n');
  const handle = Object.assign(makeDirHandle(dir), {
    queryPermission: async () => permission,
    requestPermission: async () => permission
  });
  const handles = { workspace: legacy ? { handle } : { handle, id: 'f1' } };
  if (!legacy) handles['folder:f1'] = { kind: 'folder', id: 'f1', handle, name: 'Disk', openedAt };
  idb.seed(FDB, 1, { handles });
  return dir;
}

const NOW = Date.now();
const opened = (sandbox) => {
  const folder = sandbox.__state().folder;
  return folder ? (folder.browserWorkspace ? 'browser' : 'folder') : 'none';
};

test('reload, the browser pointer only: the browser workspace opens, without touching the first database', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: NOW });
  const sandbox = await load(idb, { picker: true });
  assert.equal(opened(sandbox), 'browser');
  assert.ok(sandbox.__state().workspace);
  assert.equal(fingerprint(idb, FDB), 'none');
});

test('reload, the folder pointer only: the folder opens, without touching the browser database', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const before = fingerprint(idb, BDB);
  rememberDiskFolder(idb, NOW);
  const sandbox = await load(idb, { picker: true });
  assert.equal(opened(sandbox), 'folder');
  assert.ok(sandbox.__state().workspace);
  assert.equal(fingerprint(idb, BDB), before);
});

test('reload, both pointers: the most recent wins, and the other database is left as it was', async () => {
  const newerBrowser = fakeIndexedDB();
  seedBrowser(newerBrowser, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: NOW + 5000 });
  rememberDiskFolder(newerBrowser, NOW);
  const foldersBefore = fingerprint(newerBrowser, FDB);
  const a = await load(newerBrowser, { picker: true });
  assert.equal(opened(a), 'browser');
  assert.equal(
    fingerprint(newerBrowser, FDB),
    foldersBefore,
    'the opened browser workspace wrote nothing to the first database'
  );

  const newerFolder = fakeIndexedDB();
  seedBrowser(newerFolder, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: NOW });
  rememberDiskFolder(newerFolder, NOW + 5000);
  const browserBefore = fingerprint(newerFolder, BDB);
  const b = await load(newerFolder, { picker: true });
  assert.equal(opened(b), 'folder');
  assert.equal(fingerprint(newerFolder, BDB), browserBefore, 'the opened folder wrote nothing to the browser database');
});

test('reload, a pointer to a deleted workspace falls through to the folder, or to the card', async () => {
  const withFolder = fakeIndexedDB();
  seedBrowser(withFolder, [{ id: 'bw-b', name: 'Other' }], { id: 'bw-gone', openedAt: NOW + 5000 });
  rememberDiskFolder(withFolder, NOW);
  const a = await load(withFolder, { picker: true });
  assert.equal(opened(a), 'folder', 'the dangling pointer is not opened');

  const alone = fakeIndexedDB();
  seedBrowser(alone, [{ id: 'bw-b', name: 'Other' }], { id: 'bw-gone', openedAt: NOW + 5000 });
  const b = await load(alone);
  assert.equal(opened(b), 'none');
  assert.equal(b.landingScreenConfig().kind, 'first-launch');
  assert.equal(run(b, 'browserWorkspaces.length'), 1, 'and the card lists the workspace that is there');
});

test('reload, a legacy folder record (no folder:<id>) counts as just opened: it wins over an older browser pointer', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }], { id: 'bw-a', openedAt: NOW - 60000 });
  rememberDiskFolder(idb, 0, 'granted', true);
  const sandbox = await load(idb, { picker: true });
  assert.equal(opened(sandbox), 'folder');
});

test('reload, the winner that cannot be opened is the only one tried', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', files: { 'manifests/app.s1.yaml': SYSTEM } }], {
    id: 'bw-a',
    openedAt: NOW + 5000
  });
  rememberDiskFolder(idb, NOW);
  const sandbox = await load(idb, { picker: true });
  assert.equal(opened(sandbox), 'browser', 'the folder is not tried');
  assert.ok(sandbox.__state().fatalError);
  assert.equal(sandbox.__state().workspace, null);
});

test('reload without a picker: the card is first-launch, with the list, and no workspace is opened by itself when nothing was open', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await load(idb);
  assert.equal(opened(sandbox), 'none');
  assert.equal(run(sandbox, 'browserStoreState'), 'ready');
  assert.equal(sandbox.landingScreenConfig().kind, 'first-launch');
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 1);
});

test('a store that cannot be opened ends in a card, not a blank page, and a picker-capable page still has its folders', async () => {
  const idb = fakeIndexedDB({ failOpen: 'SecurityError' });
  const sandbox = await load(idb);
  const state = plain(run(sandbox, 'browserStoreState'));
  assert.equal(typeof state.failed, 'string');
  assert.equal(sandbox.landingScreenConfig().kind, 'unsupported');
  assert.match(sandbox.landingScreenConfig().text, /SecurityError/, 'with the reason');

  const withPicker = await load(fakeIndexedDB({ failOpen: 'SecurityError' }), { picker: true });
  assert.equal(withPicker.landingScreenConfig().kind, 'first-launch');
  assert.deepEqual(
    plain(withPicker.landingScreenConfig().actions.map((a) => a.action)),
    ['open-folder'],
    'only the folder is offered'
  );
});

test('a served page opens the folder of the server and has no browser store: it never opens the second database', async () => {
  const idb = fakeIndexedDB();
  const fetch = async () => ({ ok: false, status: 503, headers: { get: () => null }, text: async () => 'down' });
  const sandbox = page(idb, { serverToken: 't', fetch });
  for (const listener of sandbox.__documentListeners.DOMContentLoaded) listener();
  await waitFor(() => run(sandbox, 'landingBusy') === null, 'the served page to give up');
  assert.equal(idb.calls.filter((c) => c.op === 'open' && c.name === BDB).length, 0);
  assert.equal(sandbox.landingScreenConfig().browserRows, undefined);
});

// ---- close ----

test('closeFolder of a browser workspace keeps its data, clears only the pointer, leaves the first database alone and reads the browser list again', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(
    idb,
    [
      { id: 'bw-a', name: 'Shop' },
      { id: 'bw-b', name: 'Other' }
    ],
    { id: 'bw-a', openedAt: NOW }
  );
  const sandbox = await load(idb, { picker: true });
  assert.equal(opened(sandbox), 'browser');
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 2);
  const keys = Object.keys(browserRecords(idb))
    .filter((key) => key !== 'last')
    .sort();
  const added = await ready(idb);
  await added.createBrowserWorkspace({
    name: 'Third',
    files: [{ path: '.archicode.yaml', bytes: encode('settings: {}\n') }],
    origin: 'blank'
  });

  await sandbox.closeFolder();
  assert.equal(sandbox.__state().folder, null);
  assert.equal(browserRecords(idb).last, undefined, 'only the pointer is cleared');
  const left = Object.keys(browserRecords(idb)).sort();
  assert.deepEqual(
    keys.filter((key) => !left.includes(key)),
    [],
    'no workspace and no file is removed'
  );
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 3, 'the list is read again');
  assert.equal(fingerprint(idb, FDB), 'none', 'the folders are not asked to remember it');
  assert.equal(sandbox.landingScreenConfig().kind, 'first-launch');
});

// ---- the save ----

test('persist is asked once, after the first successful save of a browser workspace', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await openShop(idb);
  assert.equal(sandbox.__storage.persistCalls, 0);
  assert.equal(run(sandbox, 'browserStorageAsked'), false);
  rename(sandbox, 'First');
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  assert.equal(sandbox.__storage.persistCalls, 1);
  assert.equal(run(sandbox, 'browserStorageAsked'), true);
  await waitFor(() => run(sandbox, 'browserStoragePersisted') === true, 'the answer');
  rename(sandbox, 'Second');
  await sandbox.saveAllChanges();
  assert.equal(sandbox.__storage.persistCalls, 1, 'once per page session');
  assert.ok(storedText(idb, 'bw-a', 'manifests/app.s1.yaml').includes('Second'));
});

test('persist is not asked for a failed save, and is asked at the next one that succeeds', async () => {
  let failing = false;
  const idb = fakeIndexedDB({ failPut: (key) => failing && key.startsWith('file:') });
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await openShop(idb);
  rename(sandbox, 'Lost');
  failing = true;
  const before = fingerprint(idb, BDB);
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'error');
  assert.equal(fingerprint(idb, BDB), before, 'the old bytes stay');
  assert.equal(sandbox.__storage.persistCalls, 0);
  assert.equal(run(sandbox, 'browserStorageAsked'), false);
  assert.ok(sandbox.hasUnsavedChanges(), 'the file stays dirty');
  failing = false;
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  assert.equal(sandbox.__storage.persistCalls, 1);
});

test('persist is never asked for a folder workspace', async () => {
  const mem = memFolder({ '.archicode.yaml': WORKSPACE_YAML, 'manifests/app.s1.yaml': SYSTEM });
  const sandbox = page(fakeIndexedDB(), { picker: true });
  sandbox.__state().folder = { handle: mem.handle, name: 'ws' };
  sandbox.__state().permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  rename(sandbox, 'On disk');
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  assert.deepEqual(mem.writes, ['manifests/app.s1.yaml']);
  assert.equal(sandbox.__storage.persistCalls, 0);
  assert.equal(run(sandbox, 'browserStorageAsked'), false);
});

test('a persist that never settles does not block the save, and its answer is kept when it comes', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const hanging = await openShop(idb, { persist: () => new Promise(() => {}) });
  rename(hanging, 'Blocked?');
  const outcome = await Promise.race([
    hanging.saveAllChanges().then(() => 'saved'),
    new Promise((resolve) => setTimeout(() => resolve('waited'), 2000))
  ]);
  assert.equal(outcome, 'saved');
  assert.equal(run(hanging, 'browserStoragePersisted'), null, 'no answer yet');
  assert.equal(run(hanging, 'saveStatus.state'), 'success');

  const refusing = await openShop(idb, { persist: () => Promise.resolve(false) });
  rename(refusing, 'Refused');
  await refusing.saveAllChanges();
  await waitFor(() => run(refusing, 'browserStoragePersisted') === false, 'the refusal to be kept');
});

test('askForPersistentStorage does nothing wrong where the page has no navigator', async () => {
  const sandbox = page(fakeIndexedDB(), { withFile: false }); // no navigator in the sandbox
  assert.equal(sandbox.navigator, undefined);
  await sandbox.askForPersistentStorage();
  assert.equal(run(sandbox, 'browserStoragePersisted'), null);
});

test('a workspace deleted in another tab is never written to: the save says so, the file stays dirty and no record is created', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Shop' },
    { id: 'bw-b', name: 'Other' }
  ]);
  const sandbox = await openShop(idb);
  rename(sandbox, 'Edited');
  const other = await ready(idb);
  await other.deleteBrowserWorkspace('bw-a');
  const before = fingerprint(idb, BDB);
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'error');
  assert.match(run(sandbox, 'saveStatus.message'), /no longer in this browser/);
  assert.match(run(sandbox, 'saveStatus.message'), /Nothing was written/);
  assert.equal(fingerprint(idb, BDB), before, 'not one record was written');
  assert.deepEqual(fileKeys(idb, 'bw-a'), []);
  assert.ok(sandbox.hasUnsavedChanges(), 'the edit is still there');
  assert.equal(sandbox.__storage.persistCalls, 0);
});

// ---- a null id ----

test('retryFolder reads a browser workspace again after the missing file was added', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', files: { 'manifests/app.s1.yaml': SYSTEM } }]);
  const sandbox = await ready(idb);
  await sandbox.openBrowserWorkspace('bw-a');
  assert.ok(sandbox.__state().fatalError);
  const root = sandbox.browserDirectoryHandle('bw-a', '', 'Shop');
  const writable = await (await root.getFileHandle('.archicode.yaml', { create: true })).createWritable();
  await writable.write(WORKSPACE_YAML);
  await writable.close();
  await sandbox.retryFolder();
  assert.equal(sandbox.__state().fatalError, null);
  assert.ok(sandbox.__state().workspace);
  assert.equal(sandbox.__state().folder.browserWorkspace, 'bw-a');
});

test('noteWorkspaceName leaves the folders alone for a browser workspace: a name changed in Settings is not the name of the card', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sandbox = await openShop(idb);
  const foldersBefore = fingerprint(idb, FDB);
  sandbox.commitSettingsEdit((settings) => {
    settings.name = 'Named in Settings';
  });
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  assert.ok(storedText(idb, 'bw-a', '.archicode.yaml').includes('Named in Settings'));
  assert.equal(browserRecords(idb)['workspace:bw-a'].name, 'Shop', 'the record keeps its name');
  assert.equal(fingerprint(idb, FDB), foldersBefore, 'and the first database did not hear of it');
  await sandbox.noteWorkspaceName();
  assert.equal(fingerprint(idb, FDB), foldersBefore);
});

test('showRememberedFolders from a browser workspace (a null folder id) does not blame a remembered folder', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', files: { 'manifests/app.s1.yaml': SYSTEM } }]);
  rememberDiskFolder(idb, 0);
  const sandbox = await ready(idb, { picker: true });
  await sandbox.refreshRememberedFolders();
  assert.equal(run(sandbox, 'rememberedFolders.length'), 1);
  await sandbox.openBrowserWorkspace('bw-a');
  assert.ok(sandbox.__state().fatalError);
  await sandbox.showRememberedFolders();
  assert.equal(sandbox.__state().folder, null);
  assert.equal(run(sandbox, 'rememberedFolders[0].problem || null'), null, 'the folder did not fail to open');
  assert.equal(run(sandbox, 'browserWorkspaces.length'), 1, 'the list of the browser is still there');
});

// ---- the remembered choices (IMP-12) ----

test('the remembered plateau, comparison and flags are keyed on the workspace, not on its name', () => {
  const sandbox = page(fakeIndexedDB());
  const handle = {};
  const keys = (folder) => {
    sandbox.__state().folder = folder;
    return [
      run(sandbox, 'plateauStorageKey()'),
      run(sandbox, 'compareStorageKey()'),
      run(sandbox, "flagStorageKey('changes-only')")
    ];
  };
  const a = keys({ handle, name: 'Shop', id: null, browserWorkspace: 'bw-1' });
  const renamed = keys({ handle, name: 'Renamed', id: null, browserWorkspace: 'bw-1' });
  const b = keys({ handle, name: 'Shop', id: null, browserWorkspace: 'bw-2' });
  const served = keys({ handle, name: 'Shop', id: null });
  const picked = keys({ handle, name: 'Shop', id: 'f1' });
  assert.deepEqual(renamed, a, 'a rename keeps the choices');
  for (const key of a) assert.match(key, /bw:bw-1/);
  for (const key of a) assert.doesNotMatch(key, /name:/);
  for (let i = 0; i < 3; i++) {
    assert.equal(
      new Set([a[i], b[i], served[i], picked[i]]).size,
      4,
      'two workspaces and a folder with one name share nothing'
    );
  }
  assert.equal(served[0], 'archicode-standalone-editor:plateau:name:Shop', 'the key of a folder is what it was');
  assert.equal(picked[0], 'archicode-standalone-editor:plateau:f1');
  assert.equal(served[1], 'archicode-standalone-editor:compare:name:Shop');
  assert.equal(picked[2], 'archicode-standalone-editor:flag:changes-only:f1');
});

test('a plateau chosen in a browser workspace is recalled after a rename of the workspace', () => {
  const sandbox = page(fakeIndexedDB());
  sandbox.__state().folder = { handle: {}, name: 'Shop', id: null, browserWorkspace: 'bw-1' };
  sandbox.rememberPlateauId('later');
  sandbox.__state().folder = { handle: {}, name: 'Shop 2', id: null, browserWorkspace: 'bw-1' };
  assert.equal(sandbox.recalledPlateauId(), 'later');
  sandbox.__state().folder = { handle: {}, name: 'Shop', id: null, browserWorkspace: 'bw-2' };
  assert.notEqual(sandbox.recalledPlateauId(), 'later', 'another workspace of the same name does not inherit it');
});
