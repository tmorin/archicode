'use strict';
// The remembered folders (run 0020): every folder opened is remembered in IndexedDB with the name of its workspace, the
// last one opens on load when its permission holds, the landing card lists them all when none is open, each can be
// opened (a click) or removed from the list (nothing on disk). The single record an earlier version stored is migrated,
// and never lost. Run 0023: each folder of the list says what a click will meet (its permission, asked without a prompt),
// and the records two tabs wrote for one folder are merged into one. The browser's IndexedDB is played by the fake of
// the harness; how the card looks is checked in a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { FIXTURE, createApp, fakeIndexedDB, makeDirHandle, waitFor } = require('./harness');

const DB = 'archicode-standalone-editor';
const MANIFEST = 'header:\n  kind: archicode.morin.io/system\ncontent:\n  id: s1\n  name: S1\n';
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value)); // the page's arrays and objects are of another realm
const html = (sandbox) => run(sandbox, "document.getElementById('app').innerHTML");
const records = (idb) => (idb.dump(DB) || { stores: { handles: {} } }).stores.handles;
const folderRecords = (idb) => Object.entries(records(idb)).filter(([k]) => k.startsWith('folder:')).map(([, v]) => v);
const pathOf = (record) => record && record.handle && record.handle.__path;

/** A workspace folder on disk, named `name`, whose workspace calls itself `workspaceName` (none when absent). */
function workspaceFolder(name, workspaceName) {
  const dir = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-folders-')), name);
  fs.mkdirSync(path.join(dir, 'manifests'), { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifests', 'app.s1.yaml'), MANIFEST);
  setWorkspaceName(dir, workspaceName);
  return dir;
}

function setWorkspaceName(dir, workspaceName) {
  fs.writeFileSync(path.join(dir, 'workspace.yaml'), 'application:\n  elements: []\n' + (workspaceName ? 'settings:\n  name: ' + workspaceName + '\n' : ''));
}

/** A directory handle on `dir`, as the picker or IndexedDB gives one; `permission` is what the browser answers. */
function handleOn(dir, permission = 'granted', extra = {}) {
  const handle = makeDirHandle(dir);
  handle.queryPermission = async () => permission;
  handle.requestPermission = async () => permission;
  return Object.assign(handle, extra);
}

/** A page of the editor in a browser that can pick folders, on the given IndexedDB; `picks` are what the picker returns. */
function page(idb, picks = []) {
  const sandbox = createApp({ indexedDB: idb });
  sandbox.console.error = () => {}; // the failures these tests provoke are logged by the page: expected here
  sandbox.window.showDirectoryPicker = async () => picks.shift();
  const busy = [];
  const render = sandbox.render;
  sandbox.render = () => { busy.push(run(sandbox, 'landingBusy')); render(); }; // what the "Opening…" said, render by render
  return { sandbox, state: () => sandbox.__state(), busy: () => busy.filter(Boolean), folders: () => run(sandbox, 'rememberedFolders') };
}

/** The page after its load: the last folder opened if allowed, else the landing card. */
async function load(idb, picks) {
  const p = page(idb, picks);
  await p.sandbox.tryAutoReopen();
  return p;
}

const entryOf = (p, dir) => p.folders().find((f) => f.handle.__path === dir);

test('a folder stored by the earlier version is migrated in place: it gets a record of its own and stays the last folder', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi', 'Shop');
  idb.seed(DB, 1, { handles: { workspace: { handle: handleOn(shop) } } }); // exactly what the earlier version wrote

  const p = await load(idb);
  assert.equal(p.state().fatalError, null);
  assert.ok(p.state().workspace, 'the last folder opened directly, as before');
  assert.equal(p.state().folder.name, 'archi');

  const stored = idb.dump(DB);
  assert.equal(stored.version, 1, 'no version upgrade');
  const [folder] = folderRecords(idb);
  assert.equal(folderRecords(idb).length, 1);
  assert.equal(pathOf(folder), shop);
  assert.equal(folder.kind, 'folder');
  assert.equal(folder.name, 'Shop', 'the name of its workspace, read when it opened');
  assert.equal(stored.stores.handles.workspace.id, folder.id, 'the old record is kept, rewritten with the id of its folder');
  assert.equal(pathOf(stored.stores.handles.workspace), shop, 'and the same handle: an older copy of the page still opens it');
  assert.equal(p.state().folder.id, folder.id);

  // a second load finds nothing more to migrate
  const again = await load(idb);
  assert.ok(again.state().workspace);
  assert.equal(folderRecords(idb).length, 1);
  assert.equal(again.busy()[again.busy().length - 1], 'Opening “Shop”…', 'the stored name, before workspace.yaml is read');
});

test('a transaction writes all or nothing, and is reported done only once committed', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = page(idb);
  // a write queued, then a throw (as `put` throws a DataCloneError): the transaction is aborted, the write is not kept
  await assert.rejects(sandbox.withArchicodeStore('readwrite', (store) => {
    store.put({ a: 1 }, 'first');
    throw new Error('cannot clone');
  }), /cannot clone/);
  await new Promise((r) => setTimeout(r, 20)); // long after the transaction would have committed
  assert.deepEqual(records(idb), {});
  // a request that fails asynchronously aborts the writes queued before it
  const failing = fakeIndexedDB({ failPut: (key) => key === 'second' });
  const other = page(failing);
  await assert.rejects(other.sandbox.withArchicodeStore('readwrite', (store) => {
    store.put({ a: 1 }, 'first');
    store.put({ b: 2 }, 'second');
  }), /no room left/);
  assert.deepEqual(records(failing), {});
  // done: resolved with what the work returned, filled by its requests, once the transaction has committed
  const out = await sandbox.withArchicodeStore('readwrite', (store) => {
    const result = {};
    store.put({ a: 1 }, 'first').onsuccess = (e) => { result.key = e.target.result; };
    return result;
  });
  assert.equal(out.key, 'first');
  assert.deepEqual(records(idb), { first: { a: 1 } });
});

test('a stored folder that is already remembered is migrated onto its record, not added twice', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi');
  idb.seed(DB, 1, { handles: {
    'folder:x1': { kind: 'folder', id: 'x1', handle: handleOn(shop), name: 'Shop', openedAt: 5 },
    workspace: { handle: handleOn(shop) } // an older tab picked the same folder again
  } });
  await load(idb);
  assert.deepEqual(folderRecords(idb).map((r) => r.id), ['x1']);
  assert.equal(records(idb).workspace.id, 'x1');
});

test('a migration that cannot clone the handle writes nothing, and the old record is still used as it was', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi', 'Shop');
  const old = { handle: handleOn(shop, 'granted', { unclonable: true }) };
  idb.seed(DB, 1, { handles: { workspace: old } });

  const p = await load(idb);
  assert.deepEqual(records(idb), { workspace: old }, 'the transaction was aborted: not one record more, the old one intact');
  assert.ok(p.state().workspace, 'the folder still opens on load');
  assert.equal(p.folders().length, 1);
  assert.equal(p.folders()[0].legacy, true);
  assert.equal(p.folders()[0].id, null);

  // closing it cannot remember it either: its old record, the only trace of it, is left alone
  await p.sandbox.closeFolder();
  assert.deepEqual(records(idb), { workspace: old });
  assert.match(html(p.sandbox), /data-action="open-remembered-folder" data-folder-id=""[^>]*aria-label="Open “archi”"/, 'it is listed');

  // it opens from the list, and Remove deletes its record and nothing else
  await p.sandbox.openRememberedFolder(p.folders()[0]);
  assert.ok(p.state().workspace);
  await p.sandbox.closeFolder();
  await p.sandbox.forgetFolder(p.folders()[0]);
  assert.deepEqual(records(idb), {});
  assert.ok(fs.existsSync(path.join(shop, 'workspace.yaml')), 'nothing on disk is touched');
});

test('a migration whose write fails later (no room left) leaves the old record as it was', async () => {
  const idb = fakeIndexedDB({ failPut: () => true });
  const shop = workspaceFolder('archi');
  const old = { handle: handleOn(shop) };
  idb.seed(DB, 1, { handles: { workspace: old } });
  const p = await load(idb);
  assert.deepEqual(records(idb), { workspace: old });
  assert.ok(p.state().workspace, 'and the folder opens');
});

test('a stored value that cannot be read back: the last folder still opens, and nothing is written from that view', async () => {
  const idb = fakeIndexedDB({ failGetAll: true });
  const shop = workspaceFolder('archi');
  const before = { 'folder:x1': { kind: 'folder', id: 'x1', handle: handleOn(shop), name: '', openedAt: 5 }, workspace: { handle: handleOn(shop) } };
  idb.seed(DB, 1, { handles: Object.assign({}, before) });
  const p = await load(idb);
  assert.ok(p.state().workspace);
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:x1', 'workspace']);
  assert.equal(records(idb).workspace.id, undefined, 'no migration from a partial read');
  assert.ok(!idb.calls.some((c) => c.op === 'put' || c.op === 'delete'));
});

test('the old record of a database that does not exist yet, or a storage that fails: the first-launch card, no list', async () => {
  const fresh = await load(fakeIndexedDB());
  assert.equal(fresh.sandbox.landingScreenConfig().kind, 'first-launch');
  assert.deepEqual(Array.from(fresh.sandbox.landingScreenConfig().folders), []);
  assert.doesNotMatch(html(fresh.sandbox), /landing-folders/, 'no empty list');

  const broken = await load(fakeIndexedDB({ failOpen: 'UnknownError' }));
  assert.equal(broken.sandbox.landingScreenConfig().kind, 'first-launch');
});

test('two folders opened one after the other are both listed when none is open, most recent first, with their names', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi', 'Shop');
  const b = workspaceFolder('infra');
  const p = await load(idb, [handleOn(a), handleOn(b)]);
  await p.sandbox.openFolder();
  assert.ok(p.state().workspace);
  await p.sandbox.closeFolder();
  await new Promise((r) => setTimeout(r, 2)); // two different openedAt
  await p.sandbox.openFolder();
  assert.equal(p.state().folder.name, 'infra');
  await p.sandbox.closeFolder();

  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'first-launch');
  assert.deepEqual(plain(cfg.folders.map((f) => [f.title, f.folder])), [['infra', null], ['Shop', 'archi']]);
  const card = html(p.sandbox);
  assert.match(card, /<section class="landing-folders" aria-labelledby="landing-folders-title"><h2 id="landing-folders-title">Remembered folders<\/h2><ul class="landing-folder-list">/);
  assert.equal((card.match(/<li class="landing-folder">/g) || []).length, 2);
  assert.ok(card.indexOf('aria-label="Open “infra”"') < card.indexOf('aria-label="Open “Shop” (folder archi)"'), 'most recent first');
  assert.match(card, /<span class="landing-folder-name">Shop<\/span><span class="landing-folder-dir"><svg[^]*?<\/svg><span>archi<\/span><\/span>/, 'the name, then the folder');
  assert.match(card, /<button type="button" class="btn-ghost landing-folder-remove" data-action="forget-folder" data-folder-id="[^"]+" aria-label="Remove “Shop” \(folder archi\) from the list" title="This browser forgets the folder. Nothing is deleted on disk.">Remove from the list<\/button>/);
  assert.match(card, /aria-label="Remove “infra” from the list"/, 'every Remove names its folder');
  assert.match(card, /nothing is deleted on disk/);
  assert.match(card, /data-action="open-folder"/, 'the picker is still there');
  assert.equal(folderRecords(idb).length, 2);
  assert.equal(records(idb).workspace, undefined, 'closed: the next load opens none of them');

  const next = await load(idb);
  assert.equal(next.state().workspace, null, 'a reload after Close folder shows the list');
  assert.equal(next.sandbox.landingScreenConfig().folders.length, 2);
});

test('the same folder picked twice is one entry', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi', 'Shop');
  const p = await load(idb, [handleOn(a), handleOn(a)]); // two handles of one folder, as two picks give
  await p.sandbox.openFolder();
  const first = folderRecords(idb)[0];
  await p.sandbox.closeFolder();
  await p.sandbox.openFolder();
  assert.equal(folderRecords(idb).length, 1);
  assert.equal(folderRecords(idb)[0].id, first.id);
  assert.equal(p.busy()[p.busy().length - 1], 'Opening “Shop”…', 'and its name is known before workspace.yaml is read');
  assert.equal(p.folders().length, 1);
});

test('Remove deletes only the record of that folder, and the last-folder record when it pointed at it', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi', 'Shop');
  const b = workspaceFolder('infra');
  const opener = await load(idb, [handleOn(a), handleOn(b)]);
  await opener.sandbox.openFolder();
  await opener.sandbox.closeFolder();
  await opener.sandbox.openFolder(); // b is the last folder

  // the next visit: the browser wants a click for b, so the reopen card shows, with the list
  const ids = Object.fromEntries(folderRecords(idb).map((r) => [pathOf(r), r.id]));
  const p = page(idb);
  idb.seed(DB, 1, { handles: Object.fromEntries(Object.entries(records(idb)).map(([k, v]) => [k, Object.assign({}, v, { handle: handleOn(pathOf(v), 'prompt') })])) });
  await p.sandbox.tryAutoReopen();
  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'reopen');
  assert.equal(cfg.title, 'Welcome back');
  assert.equal(cfg.text, 'Your browser needs your permission to read “infra” again.', 'the wording of the permission is unchanged');
  assert.deepEqual(plain(cfg.actions.map((x) => x.label)), ['Reopen “infra”', 'Choose another folder']);
  assert.equal(cfg.folders.length, 2, 'every remembered folder, the last one included');

  await p.sandbox.forgetFolder(entryOf(p, a));
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:' + ids[b], 'workspace'], 'only the record of archi went');
  assert.equal(records(idb).workspace.id, ids[b]);
  assert.equal(p.sandbox.landingScreenConfig().kind, 'reopen', 'still offering infra');
  assert.equal(p.sandbox.landingScreenConfig().notice, '“Shop” is no longer in the list. Nothing was deleted on disk.');
  assert.match(html(p.sandbox), /<p class="landing-notice" role="status">“Shop” is no longer in the list/);
  assert.ok(fs.existsSync(path.join(a, 'workspace.yaml')) && fs.existsSync(path.join(a, 'manifests', 'app.s1.yaml')), 'nothing on disk is touched');

  await p.sandbox.forgetFolder(entryOf(p, b));
  assert.deepEqual(records(idb), {}, 'the last folder goes with its pointer');
  assert.equal(p.state().folder, null, 'the folder the reopen card offered is gone');
  assert.equal(p.sandbox.landingScreenConfig().kind, 'first-launch');
});

test('after a Remove the focus goes to the next folder of the list, else the primary button', async () => {
  const idb = fakeIndexedDB();
  const dirs = ['one', 'two', 'three'].map((n) => workspaceFolder(n));
  const p = await load(idb, dirs.map((d) => handleOn(d)));
  for (let i = 0; i < 3; i++) {
    await p.sandbox.openFolder();
    await p.sandbox.closeFolder();
    await new Promise((r) => setTimeout(r, 2));
  }
  const focused = [];
  const app = run(p.sandbox, "document.getElementById('app')");
  app.querySelector = (selector) => ({ focus() { focused.push(selector); } });
  await p.sandbox.forgetFolder(p.folders()[1]); // two, between three and one
  assert.equal(focused.pop(), '[data-action="open-remembered-folder"][data-folder-id="' + entryOf(p, dirs[0]).id + '"]', 'the one after it');
  await p.sandbox.forgetFolder(p.folders()[1]); // one, the last of the list
  assert.equal(focused.pop(), '[data-action="open-remembered-folder"][data-folder-id="' + entryOf(p, dirs[2]).id + '"]', 'the one before it');
  focused.length = 0;
  await p.sandbox.forgetFolder(p.folders()[0]);
  assert.deepEqual(focused, [], 'none left: the primary button');
});

test('Open on a folder of the list asks the permission, then opens it, as the last folder, with its stored name', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi', 'Shop');
  const b = workspaceFolder('infra');
  const opener = await load(idb, [handleOn(a), handleOn(b)]);
  await opener.sandbox.openFolder();
  await opener.sandbox.closeFolder();
  await opener.sandbox.openFolder();
  await opener.sandbox.closeFolder();

  const p = await load(idb);
  let asked = 0;
  const entry = entryOf(p, a);
  // the person answers the browser's prompt in their own time (#66): the test waits for the opening, not for a delay that a busy machine overruns
  entry.handle.requestPermission = async (options) => { asked++; assert.deepEqual(plain(options), { mode: 'read' }); await new Promise((r) => setTimeout(r, 150)); return 'granted'; };
  const before = entry.openedAt;
  await new Promise((r) => setTimeout(r, 2)); // two different openedAt
  p.sandbox.handleAppClick({ target: { closest: () => ({ getAttribute: (n) => (n === 'data-action' ? 'open-remembered-folder' : entry.id) }) } });
  await waitFor(() => p.state().workspace && records(idb).workspace && records(idb).workspace.id === entry.id && records(idb)['folder:' + entry.id].openedAt > before, 'the folder to be opened and remembered as the last one');
  assert.equal(asked, 1, 'the click asks the permission');
  assert.ok(p.state().workspace);
  assert.equal(p.state().folder.id, entry.id);
  assert.ok(p.busy().includes('Opening “Shop”…'));
  assert.equal(records(idb).workspace.id, entry.id, 'it is the last folder now');
  assert.ok(records(idb)['folder:' + entry.id].openedAt > before);
});

test('a refused permission keeps the folder in the list and says so; a vanished folder says it could not be reached', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi', 'Shop');
  const opener = await load(idb, [handleOn(a)]);
  await opener.sandbox.openFolder();
  await opener.sandbox.closeFolder();
  const stored = JSON.stringify(Object.keys(records(idb)));

  const p = await load(idb);
  const entry = entryOf(p, a);
  entry.handle.requestPermission = async () => 'denied';
  await p.sandbox.openRememberedFolder(entry);
  assert.equal(JSON.stringify(Object.keys(records(idb))), stored, 'nothing deleted');
  assert.equal(p.state().workspace, null);
  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'first-launch');
  assert.equal(cfg.folders[0].problem, 'The browser did not give access to this folder.');
  assert.match(cfg.notice, /“Shop” did not open\. The browser did not give access/);
  // the problem line is the Open button's description, in place of its permission (TDD-0023 DEC-2)
  assert.match(html(p.sandbox), /aria-describedby="landing-folder-problem-0"[^]*<p class="landing-folder-problem" id="landing-folder-problem-0">The browser did not give access to this folder\.<\/p>/);
  assert.doesNotMatch(html(p.sandbox), /landing-folder-state/);

  entry.handle.requestPermission = async () => { const e = new Error('gone'); e.name = 'NotFoundError'; throw e; };
  await p.sandbox.openRememberedFolder(entry);
  assert.equal(p.sandbox.landingScreenConfig().folders[0].problem, 'This folder could not be reached: it may have been moved or deleted.');
  assert.equal(JSON.stringify(Object.keys(records(idb))), stored);

  // it can still be removed
  await p.sandbox.forgetFolder(entry);
  assert.deepEqual(records(idb), {});
});

test('Reopen refused on the reopen card keeps the folder and its last-folder record (the earlier version deleted them)', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi');
  idb.seed(DB, 1, { handles: { workspace: { handle: handleOn(a, 'prompt') } } });
  const p = await load(idb);
  assert.equal(p.sandbox.landingScreenConfig().kind, 'reopen');
  const stored = records(idb);
  assert.ok(stored.workspace.id, 'migrated on load');
  p.state().folder.handle.requestPermission = async () => 'denied';
  await p.sandbox.reopenFolder();
  assert.deepEqual(Object.keys(records(idb)).sort(), Object.keys(stored).sort());
  assert.equal(records(idb).workspace.id, stored.workspace.id);
  assert.equal(p.sandbox.landingScreenConfig().kind, 'first-launch');
  assert.equal(p.sandbox.landingScreenConfig().folders.length, 1);
});

test('Close folder keeps the folder remembered, and leaves the last-folder record another tab wrote', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi');
  const b = workspaceFolder('infra');
  const p = await load(idb, [handleOn(a)]);
  await p.sandbox.openFolder();
  const id = p.state().folder.id;
  const other = await load(idb, [handleOn(b)]); // another tab opens another folder meanwhile
  await other.sandbox.openFolder();
  await p.sandbox.closeFolder();
  assert.notEqual(records(idb).workspace.id, id, 'the last folder of the other tab stays');
  assert.ok(records(idb)['folder:' + id], 'archi is still remembered');
  assert.equal(p.sandbox.landingScreenConfig().folders.length, 2, 'the list is read again from storage');
});

test('the name of the workspace is stored with its folder when it opens, and again after a save that changed it', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi', 'Shop');
  const p = await load(idb, [handleOn(a)]);
  await p.sandbox.openFolder();
  const id = p.state().folder.id;
  assert.equal(records(idb)['folder:' + id].name, 'Shop');

  setWorkspaceName(a, 'Shop 2'); // changed on disk, by another tool
  await p.sandbox.closeFolder();
  await p.sandbox.openRememberedFolder(p.folders()[0]);
  assert.ok(p.busy().includes('Opening “Shop”…'), 'what was known when it was clicked');
  assert.equal(records(idb)['folder:' + id].name, 'Shop 2', 'refreshed on each open');

  // a name changed in Settings, then saved
  const handle = p.state().folder.handle;
  const getFileHandle = handle.getFileHandle;
  handle.getFileHandle = async (name, options) => {
    const file = await getFileHandle(name, options);
    file.createWritable = async () => { const parts = []; return { write: async (d) => { parts.push(d); }, close: async () => fs.writeFileSync(path.join(a, name), parts.join('')) }; };
    return file;
  };
  p.state().workspace.settings.name = 'Shop 3';
  p.state().workspace.settingsDirty = true;
  await p.sandbox.performSave();
  assert.equal(run(p.sandbox, 'saveStatus.state'), 'success');
  assert.equal(records(idb)['folder:' + id].name, 'Shop 3');
  assert.equal(p.folders()[0].name, 'Shop 3');

  // emptied: the folder's name again
  p.state().workspace.settings.name = '';
  p.state().workspace.settingsDirty = true;
  await p.sandbox.performSave();
  assert.equal(records(idb)['folder:' + id].name, '');
});

test('a folder whose workspace.yaml cannot be read: the error card leads back to the list, which says what happened', async () => {
  const idb = fakeIndexedDB();
  const a = workspaceFolder('archi');
  const b = workspaceFolder('infra');
  const p = await load(idb, [handleOn(a), handleOn(b)]);
  await p.sandbox.openFolder();
  await p.sandbox.closeFolder();
  fs.rmSync(path.join(b, 'workspace.yaml')); // as when the folder was moved: its handle no longer reaches its files
  await p.sandbox.openFolder();
  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'error');
  assert.deepEqual(plain(cfg.actions.map((x) => [x.label, x.action])), [['Choose another folder', 'open-folder'], ['Try again', 'retry-folder'], ['Remembered folders', 'show-folders']]);
  const before = Object.keys(records(idb)).sort();

  await p.sandbox.showRememberedFolders();
  assert.deepEqual(Object.keys(records(idb)).sort(), before, 'storage untouched');
  const list = p.sandbox.landingScreenConfig();
  assert.equal(list.kind, 'first-launch');
  assert.equal(list.folders.find((f) => f.title === 'infra').problem, 'Its workspace.yaml could not be read the last time it was opened.');
  assert.equal(list.folders.find((f) => f.title === 'archi').problem, null);
});

test('with no remembered folder the error card has no way to a list', async () => {
  const p = await load(fakeIndexedDB({ failOpen: 'UnknownError' }), [handleOn(workspaceFolder('x').replace(/x$/, 'nowhere'))]);
  await p.sandbox.openFolder();
  assert.equal(p.sandbox.landingScreenConfig().kind, 'error');
  assert.ok(!p.sandbox.landingScreenConfig().actions.some((x) => x.action === 'show-folders'));
});

test('a failed storage does not stop a picked folder from opening', async () => {
  const idb = fakeIndexedDB({ failPut: () => true });
  const p = await load(idb, [handleOn(workspaceFolder('archi'))]);
  await p.sandbox.openFolder();
  assert.equal(p.state().fatalError, null);
  assert.ok(p.state().workspace);
  assert.equal(p.state().folder.id, null, 'just not remembered');
});

// ---- run 0023: the permission of each folder, said before any click ----

/** A folder record as the page stores it. */
const folderRecord = (id, dir, name, openedAt, permission = 'granted', extra = {}) =>
  ({ kind: 'folder', id, handle: handleOn(dir, permission, extra), name, openedAt });

/** A promise and the function that settles it. */
function deferred() {
  let resolve;
  const promise = new Promise((r) => { resolve = r; });
  return { promise, resolve };
}

test('each remembered folder says what a click will meet, asked without any prompt', async () => {
  const idb = fakeIndexedDB();
  const thrown = (name) => async () => { const e = new Error(name); e.name = name; throw e; };
  idb.seed(DB, 1, { handles: {
    'folder:g': folderRecord('g', workspaceFolder('granted', 'Shop'), 'Shop', 50),
    'folder:p': folderRecord('p', workspaceFolder('prompt'), '', 40, 'prompt'),
    'folder:d': folderRecord('d', workspaceFolder('denied'), '', 30, 'denied'),
    'folder:u': folderRecord('u', workspaceFolder('broken'), '', 20, 'granted', { queryPermission: thrown('SecurityError') }),
    'folder:n': folderRecord('n', workspaceFolder('gone'), '', 10, 'granted', { queryPermission: thrown('NotFoundError') })
  } });
  const asked = [];
  for (const record of Object.values(records(idb))) {
    const query = record.handle.queryPermission;
    record.handle.queryPermission = async (options) => { asked.push(plain(options)); return query(); };
    record.handle.requestPermission = async () => { throw new Error('no prompt may be shown on load'); };
  }
  const p = await load(idb);
  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'first-launch');
  assert.deepEqual(plain(cfg.folders.map((f) => [f.title, f.permission])),
    [['Shop', 'granted'], ['prompt', 'prompt'], ['denied', 'denied'], ['broken', 'unknown'], ['gone', 'unreachable']]);
  assert.equal(asked.length, 5, 'one query per folder');
  assert.ok(asked.every((o) => o.mode === 'read'));

  const card = html(p.sandbox);
  // in words, as the Open button's description; the icon is hidden from assistive technology
  assert.match(card, /aria-label="Open “Shop” \(folder granted\)" aria-describedby="landing-folder-state-0">[^]*?<span class="landing-folder-state" id="landing-folder-state-0" data-permission="granted"><svg[^>]*aria-hidden="true">[^]*?<\/svg><span>Opens without asking<\/span><\/span><\/button>/);
  assert.match(card, /aria-describedby="landing-folder-state-1">[^]*?<span>Will ask for permission<\/span>/);
  assert.match(card, /aria-describedby="landing-folder-state-2">[^]*?<span>Blocked by the browser<\/span>/);
  assert.match(card, /aria-describedby="landing-folder-state-3">[^]*?<span>Could not be checked<\/span>/);
  assert.match(card, /aria-describedby="landing-folder-state-4">[^]*?<span>Could not be reached<\/span>/);
});

test('the reopen card lists the states too, the last folder with the answer that decided not to open it', async () => {
  const idb = fakeIndexedDB();
  const last = folderRecord('x1', workspaceFolder('archi'), '', 50, 'prompt');
  let queried = 0;
  last.handle.queryPermission = async () => { queried++; return 'prompt'; };
  idb.seed(DB, 1, { handles: {
    'folder:x1': last,
    'folder:x2': folderRecord('x2', workspaceFolder('infra'), '', 10),
    workspace: { handle: last.handle, id: 'x1' }
  } });
  const p = await load(idb);
  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'reopen');
  assert.equal(cfg.text, 'Your browser needs your permission to read “archi” again.', 'the wording is unchanged');
  assert.deepEqual(plain(cfg.folders.map((f) => [f.title, f.permission])), [['archi', 'prompt'], ['infra', 'granted']]);
  assert.equal(queried, 1, 'not asked twice');
  assert.match(html(p.sandbox), /data-permission="prompt"/);
});

test('the card is drawn before the permissions are known, all asked at once, then drawn once more with the focus kept', async () => {
  const idb = fakeIndexedDB();
  const answers = [];
  const stored = {};
  let asked = 0;
  for (let i = 0; i < 12; i++) {
    const record = folderRecord('f' + i, workspaceFolder('folder' + i), '', 100 - i);
    const answer = deferred();
    answers.push(answer);
    record.handle.queryPermission = () => { asked++; return answer.promise; };
    stored['folder:f' + i] = record;
  }
  idb.seed(DB, 1, { handles: stored });
  const p = page(idb);
  const focused = [];
  const lists = []; // the list of the card, as each draw finds it
  const app = run(p.sandbox, "document.getElementById('app')");
  app.querySelector = (selector) => {
    if (selector !== '.landing-folder-list') return { focus() { focused.push(selector); } };
    lists.push({ scrollTop: 0 });
    return lists[lists.length - 1];
  };
  const loading = p.sandbox.tryAutoReopen();
  for (let i = 0; i < 200 && (html(p.sandbox).match(/<li class="landing-folder">/g) || []).length < 12; i++) await new Promise((r) => setTimeout(r, 10)); // the card is drawn: as soon as it is, not after a fixed wait that a busy machine overruns
  assert.equal(p.sandbox.landingScreenConfig().kind, 'first-launch');
  assert.equal((html(p.sandbox).match(/<li class="landing-folder">/g) || []).length, 12, 'the list is on screen');
  assert.doesNotMatch(html(p.sandbox), /landing-folder-state/, 'no state yet, and none waited for');
  assert.equal(asked, 12, 'every folder asked at once, none waiting for another');

  // the user went to the Remove of the third folder meanwhile
  const control = { id: '', tagName: 'BUTTON', getAttribute: (n) => ({ 'data-action': 'forget-folder', 'data-folder-id': 'f2' })[n] || null };
  run(p.sandbox, 'document').activeElement = { closest: () => control };
  // and scrolled the list
  lists.length = 0;
  const scrolled = { scrollTop: 120 };
  app.querySelector = (selector) => {
    if (selector !== '.landing-folder-list') return { focus() { focused.push(selector); } };
    lists.push(lists.length === 0 ? scrolled : { scrollTop: 0 });
    return lists[lists.length - 1];
  };
  answers.forEach((a, i) => a.resolve(i % 2 ? 'prompt' : 'granted'));
  await loading;
  assert.equal((html(p.sandbox).match(/class="landing-folder-state"/g) || []).length, 12);
  assert.equal(focused.pop(), '[data-action="forget-folder"][data-folder-id="f2"]', 'the focus stays on the control that had it');
  assert.equal(lists.length, 2, 'drawn once more, once');
  assert.equal(lists[1].scrollTop, 120, 'the list stays where it was scrolled to');

  // drawn again while the focus is not on the card: the focus is left alone, not given to the primary button
  const doc = run(p.sandbox, 'document');
  const byId = doc.getElementById;
  doc.getElementById = (id) => (id === 'landing-primary' ? { focus() { focused.push('#landing-primary'); } } : byId(id));
  doc.activeElement = null;
  run(p.sandbox, 'rememberedFolders.forEach((f) => { f.permission = undefined; })');
  focused.length = 0;
  for (const record of Object.values(stored)) record.handle.queryPermission = async () => 'granted';
  await p.sandbox.checkFolderPermissions();
  assert.deepEqual(focused, []);
});

// ---- run 0023: one record per folder, whatever two tabs did ----

test('two tabs picking the same folder at the same moment end with one record, the last-folder pointer naming it', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi', 'Shop');
  const one = await load(idb, [handleOn(shop)]);
  const two = await load(idb, [handleOn(shop)]);
  await Promise.all([one.sandbox.openFolder(), two.sandbox.openFolder()]);
  const written = new Set(idb.calls.filter((c) => c.op === 'put' && c.key.startsWith('folder:')).map((c) => c.key));
  assert.ok(written.size >= 2, 'the race happened: each tab added a record of its own');

  assert.equal(folderRecords(idb).length, 1, 'one record is left');
  const [kept] = folderRecords(idb);
  assert.equal(pathOf(kept), shop);
  assert.equal(records(idb).workspace.id, kept.id, 'the last-folder pointer names it');
  assert.equal(kept.name, 'Shop', 'with the name of its workspace');
  assert.ok(one.state().workspace && two.state().workspace, 'both tabs opened it');

  // whichever tab holds the id merged away, it closes the folder as it is stored now: the pointer goes, the record stays
  await one.sandbox.closeFolder();
  await two.sandbox.closeFolder();
  assert.equal(records(idb).workspace, undefined);
  assert.deepEqual(folderRecords(idb).map((r) => r.id), [kept.id]);
  assert.equal(one.sandbox.landingScreenConfig().folders.length, 1);
});

test('records of one folder stored twice are merged on load: the pointer, the stored name and the latest openedAt are kept', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi');
  const twin = workspaceFolder('archi'); // another folder of the same name: never merged
  const pointer = { handle: handleOn(shop, 'prompt'), id: 'a' };
  idb.seed(DB, 1, { handles: {
    'folder:a': folderRecord('a', shop, 'Shop', 5, 'prompt'),
    'folder:b': folderRecord('b', shop, '', 9, 'prompt'),
    'folder:c': folderRecord('c', twin, 'Twin', 7, 'prompt'),
    workspace: pointer
  } });
  const p = await load(idb);
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:a', 'folder:c', 'workspace']);
  assert.equal(records(idb)['folder:a'].name, 'Shop', 'the stored name, not the empty one of the newer record');
  assert.equal(records(idb)['folder:a'].openedAt, 9, 'the latest openedAt: the folder keeps its place in the list');
  assert.equal(records(idb)['folder:c'].name, 'Twin');
  assert.deepEqual(records(idb).workspace, pointer, 'the pointer is as it was');
  assert.ok(!idb.calls.some((c) => c.key === 'workspace'), 'a merge never writes the last-folder record');
  const cfg = p.sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'reopen');
  assert.deepEqual(plain(cfg.folders.map((f) => [f.id, f.title])), [['a', 'Shop'], ['c', 'Twin']]);
  assert.equal(p.state().folder.id, 'a');
});

test('without a pointer, the most recently opened record is kept, with the name a record had', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi');
  idb.seed(DB, 1, { handles: {
    'folder:a': folderRecord('a', shop, 'Shop', 5),
    'folder:b': folderRecord('b', shop, '', 9)
  } });
  await load(idb);
  assert.deepEqual(Object.keys(records(idb)), ['folder:b']);
  assert.equal(records(idb)['folder:b'].name, 'Shop');
  assert.equal(records(idb)['folder:b'].openedAt, 9);
});

test('a merge that fails writes nothing, and the folder is still one row, whose Remove forgets both records', async () => {
  for (const [label, options, extra] of [
    ['a write that fails later', { failPut: () => true }, {}],
    ['a handle that cannot be cloned', {}, { unclonable: true }]
  ]) {
    const idb = fakeIndexedDB(options);
    const shop = workspaceFolder('archi');
    idb.seed(DB, 1, { handles: {
      'folder:a': folderRecord('a', shop, 'Shop', 5),
      'folder:b': folderRecord('b', shop, '', 9, 'granted', extra)
    } });
    const before = idb.dump(DB);
    const p = await load(idb);
    await new Promise((r) => setTimeout(r, 20)); // long after the transaction would have committed
    assert.deepEqual(idb.dump(DB), before, label + ': the records are exactly as they were');
    const cfg = p.sandbox.landingScreenConfig();
    assert.equal(cfg.folders.length, 1, label + ': listed once');
    assert.equal(cfg.folders[0].title, 'Shop', label + ': with the stored name');
    assert.deepEqual(plain(p.folders()[0].others), ['a']);

    await p.sandbox.forgetFolder(p.folders()[0]);
    assert.deepEqual(records(idb), {}, label + ': Remove forgets both');
  }
});

test('a merge that finds the records changed since it read them writes nothing; the next read merges them', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi');
  const a = folderRecord('a', shop, 'Shop', 5);
  const b = folderRecord('b', shop, '', 9);
  const changed = { 'folder:a': Object.assign({}, a, { name: 'Shop 2' }), 'folder:b': b };
  let once = true;
  const isSameEntry = b.handle.isSameEntry;
  b.handle.isSameEntry = async (other) => {
    // another tab notes a new name between the read and the merge
    if (once) { once = false; idb.seed(DB, 1, { handles: Object.assign({}, changed) }); }
    return isSameEntry(other);
  };
  a.handle.isSameEntry = b.handle.isSameEntry;
  idb.seed(DB, 1, { handles: { 'folder:a': a, 'folder:b': b } });
  const p = await load(idb);
  assert.deepEqual(records(idb), changed, 'nothing written over what the other tab wrote');
  assert.equal(p.sandbox.landingScreenConfig().folders.length, 1);

  await load(idb);
  assert.deepEqual(Object.keys(records(idb)), ['folder:b']);
  assert.equal(records(idb)['folder:b'].name, 'Shop 2', 'the name the other tab wrote');
});

test('a merge skipped because the pointer moved to another record of the folder: Remove forgets all of them and the pointer', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi');
  const a = folderRecord('a', shop, 'Shop', 5);
  const b = folderRecord('b', shop, '', 9);
  let once = true;
  const isSameEntry = b.handle.isSameEntry;
  a.handle.isSameEntry = b.handle.isSameEntry = async (other) => {
    // another tab makes `a` the last folder between the read and the merge, which would have deleted it
    if (once) { once = false; idb.seed(DB, 1, { handles: { 'folder:a': a, 'folder:b': b, workspace: { handle: a.handle, id: 'a' } } }); }
    return isSameEntry(other);
  };
  idb.seed(DB, 1, { handles: { 'folder:a': a, 'folder:b': b } });
  const p = await load(idb);
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:a', 'folder:b', 'workspace'], 'nothing merged, the pointer intact');
  assert.equal(p.folders().length, 1, 'listed once');
  assert.deepEqual(plain([p.folders()[0].id, p.folders()[0].others]), ['b', ['a']]);
  await p.sandbox.forgetFolder(p.folders()[0]);
  assert.deepEqual(records(idb), {}, 'no pointer left naming a record that is gone');

  // and Close clears a pointer that names one of those records
  idb.seed(DB, 1, { handles: { 'folder:a': a, 'folder:b': b, workspace: { handle: a.handle, id: 'a' } } });
  await p.sandbox.clearLastFolder('b');
  assert.ok(records(idb).workspace, 'not the folder\'s own id: left alone');
  await p.sandbox.clearLastFolder('b', ['a']);
  assert.equal(records(idb).workspace, undefined);
});

test('a pointer an older tab left on a record merged away is moved to the record of its folder, which opens', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi', 'Shop');
  // 0.10.0 migrated its pointer onto `a`, which a newer tab had merged into `b`
  idb.seed(DB, 1, { handles: { 'folder:b': folderRecord('b', shop, 'Shop', 9), workspace: { handle: handleOn(shop), id: 'a' } } });
  const p = await load(idb);
  assert.ok(p.state().workspace, 'the last folder opens on load');
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:b', 'workspace'], 'no record added');
  assert.equal(records(idb).workspace.id, 'b');
  assert.equal(p.state().folder.id, 'b');
});

test('a tab holding the id of a record another tab merged away acts on the folder as it is stored now', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi', 'Shop');
  idb.seed(DB, 1, { handles: { 'folder:a': folderRecord('a', shop, 'Shop', 5), workspace: { handle: handleOn(shop), id: 'a' } } });
  const p = await load(idb);
  assert.equal(p.state().folder.id, 'a');
  const merged = () => idb.seed(DB, 1, { handles: { 'folder:b': folderRecord('b', shop, 'Shop', 9), workspace: { handle: handleOn(shop), id: 'b' } } });

  // the name, noted after a change in Settings, goes to the record the folder has now
  merged();
  p.state().workspace.settings.name = 'Shop 9';
  await p.sandbox.noteWorkspaceName();
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:b', 'workspace']);
  assert.equal(records(idb)['folder:b'].name, 'Shop 9');
  assert.equal(p.state().folder.id, 'b');

  // opened again from an entry read before the merge: the merged-away record does not come back
  merged();
  run(p.sandbox, "rememberedFolders = rememberedFolders.map((f) => Object.assign(f, { id: 'a' }))");
  await p.sandbox.openRememberedFolder(p.folders()[0]);
  assert.deepEqual(Object.keys(records(idb)).sort(), ['folder:b', 'workspace']);
  assert.equal(records(idb).workspace.id, 'b');

  // closed under the old id: the pointer of the folder goes all the same
  merged();
  p.state().folder.id = 'a';
  await p.sandbox.closeFolder();
  assert.deepEqual(Object.keys(records(idb)), ['folder:b']);

  // removed from an entry read before the merge: the folder is forgotten
  merged();
  run(p.sandbox, "rememberedFolders = rememberedFolders.map((f) => Object.assign(f, { id: 'a' }))");
  await p.sandbox.forgetFolder(p.folders()[0]);
  assert.deepEqual(records(idb), {});
});

test('a folder removed from the list in another tab is not remembered again when this tab closes it', async () => {
  const idb = fakeIndexedDB();
  const shop = workspaceFolder('archi');
  const p = await load(idb, [handleOn(shop)]);
  await p.sandbox.openFolder();
  idb.seed(DB, 1, { handles: {} }); // the other tab removed it
  await p.sandbox.closeFolder();
  assert.deepEqual(records(idb), {});
});

test('the fake runs two readwrite transactions one after the other, as a browser does', async () => {
  const gate = deferred();
  const idb = fakeIndexedDB({ holdCommit: ({ keys }) => (keys.includes('k') ? gate.promise : null) });
  const { sandbox } = page(idb);
  const order = [];
  const first = sandbox.withArchicodeStore('readwrite', (store) => { store.put(1, 'k'); }).then(() => order.push('first'));
  await new Promise((r) => setTimeout(r, 5));
  const second = sandbox.withArchicodeStore('readwrite', (store) => {
    const seen = {};
    store.get('k').onsuccess = (e) => { seen.k = e.target.result; };
    return seen;
  }).then((seen) => order.push('second saw ' + seen.k));
  const reader = sandbox.withArchicodeStore('readonly', (store) => {
    const seen = {};
    store.get('k').onsuccess = (e) => { seen.k = e.target.result; };
    return seen;
  }).then((seen) => order.push('reader saw ' + seen.k));
  await new Promise((r) => setTimeout(r, 20));
  assert.deepEqual(order, [], 'both wait for the first, held before its commit');
  gate.resolve();
  await Promise.all([first, second, reader]);
  assert.deepEqual(order, ['first', 'second saw 1', 'reader saw 1']);
});

test('the CSS of the list uses the variables of the theme, and keeps a long list inside the card', () => {
  const css = fs.readFileSync(path.join(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8').match(/<style>([\s\S]*?)<\/style>/)[1];
  const rules = css.split('\n').filter((l) => /\.landing-folder|\.landing-notice/.test(l));
  assert.ok(rules.length >= 8);
  for (const rule of rules) assert.doesNotMatch(rule, /#[0-9a-f]{3,6}\b|rgb\(/i, 'no fixed colour: ' + rule.trim());
  assert.match(css, /\.landing-folder-list \{[^}]*max-height: [^;]+;[^}]*overflow-y: auto;/);
});

// ---- served by `archicode editor serve`: one folder, no list, no IndexedDB ----

const TOKEN = 'a-token';
function readOnlyServer() {
  const answer = (status, body, extra) => ({
    ok: status >= 200 && status < 300, status,
    headers: { get: (name) => (extra && extra[name]) || null },
    async text() { return typeof body === 'string' ? body : JSON.stringify(body); },
    async json() { return body; }
  });
  return async (url) => {
    const [route, query] = url.replace('/api/fs/', '').split('?');
    const target = path.join(FIXTURE, new URLSearchParams(query || '').get('path') || '');
    if (route === 'info') return answer(200, { folder: 'architecture' });
    if (route === 'list') return answer(200, fs.readdirSync(target).sort().map((name) => ({ name, kind: fs.statSync(path.join(target, name)).isDirectory() ? 'directory' : 'file' })));
    return fs.existsSync(target) ? answer(200, fs.readFileSync(target, 'utf8'), { 'X-ArchiCode-Modified': '1' }) : answer(404, 'not found');
  };
}

test('served by archicode editor serve: the folder of the server opens with no IndexedDB call and no list anywhere', async () => {
  const idb = fakeIndexedDB();
  idb.seed(DB, 1, { handles: { 'folder:x1': { kind: 'folder', id: 'x1', handle: handleOn(workspaceFolder('archi')), name: 'Shop', openedAt: 5 } } });
  const sandbox = createApp({ serverToken: TOKEN, fetch: readOnlyServer(), indexedDB: idb });
  await sandbox.openServedFolder();
  assert.ok(sandbox.__state().workspace);
  assert.equal(sandbox.__state().folder.id, undefined, 'the served folder is not a remembered one');
  assert.deepEqual(JSON.parse(JSON.stringify(await sandbox.readRememberedFolders())), { folders: [], last: null });
  assert.equal(await sandbox.rememberFolder(sandbox.__state().folder.handle), null);
  assert.deepEqual(idb.calls, [], 'not one IndexedDB call');
  assert.doesNotMatch(sandbox.renderTopPanelHtml(), /close-folder/);

  // even with remembered folders in memory, and a failure on the landing card
  run(sandbox, "rememberedFolders = [{ id: 'x1', handle: { name: 'archi' }, name: 'Shop', openedAt: 5 }]");
  sandbox.__state().workspace = null;
  sandbox.__state().fatalError = 'Could not read/parse workspace.yaml: gone';
  const cfg = sandbox.landingScreenConfig();
  assert.equal(cfg.kind, 'error');
  assert.ok(!cfg.actions.some((x) => x.action === 'show-folders'));
  assert.deepEqual(Array.from(sandbox.landingFolderRows()), []);
});
