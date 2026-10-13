'use strict';
// The remembered folders (run 0020): every folder opened is remembered in IndexedDB with the name of its workspace, the
// last one opens on load when its permission holds, the landing card lists them all when none is open, each can be
// opened (a click) or removed from the list (nothing on disk). The single record an earlier version stored is migrated,
// and never lost. The browser's IndexedDB is played by the fake of the harness; how the card looks is checked in a browser.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { FIXTURE, createApp, fakeIndexedDB, makeDirHandle } = require('./harness');

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
  entry.handle.requestPermission = async (options) => { asked++; assert.deepEqual(plain(options), { mode: 'read' }); return 'granted'; };
  const before = entry.openedAt;
  await new Promise((r) => setTimeout(r, 2));
  p.sandbox.handleAppClick({ target: { closest: () => ({ getAttribute: (n) => (n === 'data-action' ? 'open-remembered-folder' : entry.id) }) } });
  await new Promise((r) => setTimeout(r, 50));
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
  assert.match(html(p.sandbox), /<p class="landing-folder-problem">The browser did not give access to this folder\.<\/p>/);

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
