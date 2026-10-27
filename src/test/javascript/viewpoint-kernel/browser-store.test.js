'use strict';
// The browser workspace store (wave 025, run 0192, task-003; TDD CTR-1, CTR-2, DEC-1 to DEC-3, DEC-6, DEC-7): a third implementation of the
// directory-handle interface the editor uses, backed by a second IndexedDB database, `archicode-browser-workspaces`, version 1, one object
// store `records` (keys `workspace:<id>`, `file:<id>/<path>`, `last`). The browser's IndexedDB is played by the fake of the harness.
//
// Written before the store exists: they fail now because the page has no `createBrowserWorkspace` (and the others named below), and pass when
// persistence/browser-store.js is in the page. Names this file fixes where the TDD leaves them open (task-006 writes to them):
//   - `browserDirectoryHandle(workspaceId, path, name)`: the root is `path` '' and `name` the workspace's name, which the sentence of DEC-6 uses;
//     a handle below it keeps that name.
//   - `createBrowserWorkspace({ name, files: [{ path, bytes }], origin })` resolves the workspace record (`id`, `name`, ...).
//   - `listBrowserWorkspaces()` resolves one summary per workspace: the record's fields plus `fileCount` and `changedAt` (the latest `modified` of
//     its files).
//   - `renameBrowserWorkspace(id, name)`, `deleteBrowserWorkspace(id)`, `readBrowserLast()` (null or `{ id, openedAt }`), `writeBrowserLast(id)`,
//     `clearBrowserLast()`, `markBrowserExport(id, at)` (`at` defaults to the time now), `probeBrowserStore()` (sets `browserStoreState`).
//   - `browserWorkspaceNameProblem(name, otherNames)`: null, or the one sentence; the flows call it, and the create and rename run it again inside
//     their readwrite transaction.
// Every operation opens the database itself. Bytes are the page's: nothing here lets an assertion print a byte array, and none compares page bytes
// with deepStrictEqual or instanceof (the page runs in another realm); bytes are compared by hash (CON-8).
// Run with: node --test src/test/javascript/viewpoint-kernel/browser-store.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createApp, fakeIndexedDB, waitFor } = require('./harness');

const DB = 'archicode-browser-workspaces';
const FIRST_DB = 'archicode-standalone-editor';

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const sha = (bytes) => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const shaOfText = (text) => sha(Buffer.from(text, 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value)); // for summaries and records without bytes; never for a file record
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

/** A page of the editor with the host's File and a navigator.storage stub, on the given IndexedDB (its own when none). */
function page(idb = fakeIndexedDB()) {
  const sandbox = createApp({ indexedDB: idb, withFile: true });
  sandbox.console.error = () => {};
  return sandbox;
}

/** Bytes made in the page's realm, as the page's own code would make them. */
function bytesIn(sandbox, text) {
  const source = Buffer.from(text, 'utf8');
  const bytes = run(sandbox, 'new Uint8Array(' + source.length + ')');
  bytes.set(source);
  return bytes;
}

const FILES = { '.archicode.yaml': 'settings:\n  name: Shop\n', 'manifests/shop.yaml': 'id: shop\n' };

async function create(sandbox, name, files = FILES, origin = 'blank') {
  return plain(
    await sandbox.createBrowserWorkspace({
      name,
      files: Object.entries(files).map(([filePath, text]) => ({ path: filePath, bytes: bytesIn(sandbox, text) })),
      origin
    })
  );
}

const rootOf = (sandbox, record) => sandbox.browserDirectoryHandle(record.id, '', record.name);

async function listed(handle) {
  const out = [];
  for await (const [name, entry] of handle.entries()) out.push(name + ':' + entry.kind);
  return out;
}

async function walk(handle, prefix = '') {
  const out = {};
  for await (const [name, entry] of handle.entries()) {
    if (entry.kind === 'directory') Object.assign(out, await walk(entry, prefix + name + '/'));
    else out[prefix + name] = sha(await (await entry.getFile()).arrayBuffer());
  }
  return out;
}

async function refusal(promise) {
  try {
    await promise;
  } catch (e) {
    return e;
  }
  return assert.fail('it was expected to be refused');
}

/** The stored records, bytes replaced by their hash: strings only, so a failure prints no byte. */
function digest(idb) {
  const db = idb.dump(DB);
  if (!db) return null;
  return Object.entries(db.stores.records)
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([key, value]) =>
      value && typeof value === 'object'
        ? key + ' ' + JSON.stringify(Object.assign({}, value, { bytes: value.bytes ? sha(value.bytes) : undefined }))
        : key + ' ' + JSON.stringify(value)
    );
}
const keysOf = (idb) => (idb.dump(DB) ? Object.keys(idb.dump(DB).stores.records).sort() : []);
const fileKeysOf = (idb, id) => keysOf(idb).filter((k) => k.startsWith('file:' + id + '/'));
const recordOf = (idb, key) => idb.dump(DB).stores.records[key];

const gone = (name) =>
  'The workspace “' +
  name +
  '” is no longer in this browser: it was deleted, possibly in another tab. Nothing was written.';

// ---- the database and the records ----

test('the store is its own database, one object store, and a workspace is a record and its files', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const created = await create(sb, 'Shop', FILES, 'import');

  const db = idb.dump(DB);
  assert.equal(db.version, 1);
  assert.deepEqual(Object.keys(db.stores), ['records']);
  assert.deepEqual(keysOf(idb), [
    'file:' + created.id + '/.archicode.yaml',
    'file:' + created.id + '/manifests/shop.yaml',
    'workspace:' + created.id
  ]);
  assert.match(created.id, /^bw-[a-z0-9]+$/, 'an id never holds a slash');

  const workspace = plain(recordOf(idb, 'workspace:' + created.id));
  assert.equal(workspace.kind, 'workspace');
  assert.equal(workspace.id, created.id);
  assert.equal(workspace.name, 'Shop');
  assert.equal(workspace.origin, 'import', 'the origin is taken as it comes');
  assert.equal(workspace.lastExportAt, null);
  assert.equal(typeof workspace.createdAt, 'number');
  assert.equal(typeof workspace.openedAt, 'number');

  const file = recordOf(idb, 'file:' + created.id + '/manifests/shop.yaml');
  assert.equal(file.kind, 'file');
  assert.equal(file.workspace, created.id);
  assert.equal(file.path, 'manifests/shop.yaml');
  assert.equal(typeof file.modified, 'number');
  assert.equal(Object.prototype.toString.call(file.bytes), '[object Uint8Array]');
  assert.equal(sha(file.bytes), shaOfText('id: shop\n'));

  const other = await create(sb, 'Other');
  assert.notEqual(other.id, created.id);
});

test('the first database is never touched: not opened, not changed', async () => {
  const idb = fakeIndexedDB();
  idb.seed(FIRST_DB, 1, { handles: { workspace: { name: 'kept' }, 'folder:x': { name: 'kept too' } } });
  const before = idb.dump(FIRST_DB);
  const sb = page(idb);
  const a = await create(sb, 'A');
  const b = await create(sb, 'B');
  await sb.renameBrowserWorkspace(a.id, 'A2');
  await sb.writeBrowserLast(b.id);
  await sb.markBrowserExport(b.id, 77);
  const root = rootOf(sb, b);
  const writable = await (await root.getFileHandle('x.yaml', { create: true })).createWritable();
  await writable.write('x');
  await writable.close();
  await sb.deleteBrowserWorkspace(a.id);
  assert.deepEqual(idb.dump(FIRST_DB), before);
  assert.ok(
    idb.calls.filter((c) => c.op === 'open' && c.name === FIRST_DB).length === 0,
    'the store never opens the remembered folders database'
  );
});

test('probeBrowserStore says ready, or the reason the browser refused', async () => {
  const sb = page();
  await sb.probeBrowserStore();
  assert.equal(run(sb, 'browserStoreState'), 'ready');

  const refused = page(fakeIndexedDB({ failOpen: 'SecurityError' }));
  await refused.probeBrowserStore();
  const state = run(refused, 'browserStoreState');
  assert.equal(typeof state.failed, 'string');
  assert.ok(state.failed.length > 0);

  const error = await refusal(refused.createBrowserWorkspace({ name: 'X', files: [], origin: 'blank' }));
  assert.ok(error.message.length > 0, 'a store that cannot open does not pretend to create');
});

// ---- the handle: listing, missing entries, creating ----

test('a nested tree is listed level by level, in key order, a directory once however many files it holds', async () => {
  const sb = page();
  const ws = await create(sb, 'Tree', {
    'z.yaml': 'z',
    '.archicode.yaml': 'root',
    'manifests/b.yaml': 'b',
    'manifests/a.yaml': 'a',
    'manifests/deep/c.yaml': 'c',
    'manifests2/y.yaml': 'y',
    'manifests.yaml': 'file named like a folder'
  });
  const root = rootOf(sb, ws);
  assert.equal(root.kind, 'directory');
  assert.equal(root.name, 'Tree');
  // key order: 'manifests.yaml' sorts before 'manifests/', which sorts before 'manifests2'
  assert.deepEqual(await listed(root), [
    '.archicode.yaml:file',
    'manifests.yaml:file',
    'manifests:directory',
    'manifests2:directory',
    'z.yaml:file'
  ]);
  const manifests = await root.getDirectoryHandle('manifests');
  assert.equal(manifests.kind, 'directory');
  assert.equal(manifests.name, 'manifests');
  assert.deepEqual(await listed(manifests), ['a.yaml:file', 'b.yaml:file', 'deep:directory']);
  const deep = await manifests.getDirectoryHandle('deep');
  assert.deepEqual(await listed(deep), ['c.yaml:file']);
  assert.deepEqual(await listed(await root.getDirectoryHandle('manifests2')), ['y.yaml:file']);
  const file = await manifests.getFileHandle('a.yaml');
  assert.equal(file.kind, 'file');
  assert.equal(file.name, 'a.yaml');
  assert.equal(await (await file.getFile()).text(), 'a');
});

test('a missing file or directory is a NotFoundError, and asking for a directory with create stores nothing', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Missing');
  const root = rootOf(sb, ws);
  const before = digest(idb);

  assert.equal((await refusal(root.getFileHandle('nope.yaml'))).name, 'NotFoundError');
  assert.equal((await refusal(root.getDirectoryHandle('nope'))).name, 'NotFoundError');
  const manifests = await root.getDirectoryHandle('manifests');
  assert.equal((await refusal(manifests.getFileHandle('nope.yaml'))).name, 'NotFoundError');
  assert.equal((await refusal(manifests.getDirectoryHandle('nope'))).name, 'NotFoundError');
  assert.deepEqual(digest(idb), before, 'nothing was stored by looking');

  const fresh = await root.getDirectoryHandle('views', { create: true });
  assert.equal(fresh.kind, 'directory');
  assert.equal(fresh.name, 'views');
  assert.deepEqual(digest(idb), before, 'a directory with no file under it is not stored');
  assert.deepEqual(await listed(fresh), []);
  assert.equal(
    (await refusal(root.getDirectoryHandle('views'))).name,
    'NotFoundError',
    'it does not exist until a file is under it'
  );
});

test('a file is created empty at once, as on a disk, and creating one that exists leaves its bytes and its time alone', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Create');
  const root = rootOf(sb, ws);

  const created = await root.getFileHandle('new.yaml', { create: true });
  const empty = await created.getFile();
  assert.equal(empty.size, 0);
  assert.equal(await empty.text(), '');
  const key = 'file:' + ws.id + '/new.yaml';
  assert.ok(keysOf(idb).includes(key), 'the empty file is stored when it is created');
  assert.equal(recordOf(idb, key).bytes.length, 0);

  const before = digest(idb);
  const existing = await root.getFileHandle('.archicode.yaml', { create: true });
  const file = await existing.getFile();
  assert.equal(await file.text(), FILES['.archicode.yaml'], 'create on an existing file does not truncate it');
  assert.deepEqual(digest(idb), before, 'bytes and modified are untouched');
});

// ---- the handle: writing ----

test('a string, a Blob, an ArrayBuffer, a typed array and write objects are written in several parts and stored whole at close', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Parts');
  const root = rootOf(sb, ws);
  const handle = await root.getFileHandle('parts.txt', { create: true });
  const writable = await handle.createWritable();
  await writable.write('ab');
  await writable.write(new sb.Blob(['cd']));
  await writable.write(bytesIn(sb, 'ef').buffer);
  await writable.write(bytesIn(sb, 'gh'));
  await writable.write({ type: 'write', data: 'ij' });
  await writable.write({ type: 'write', data: new sb.Blob(['kl']) });
  await writable.write('é€');
  const key = 'file:' + ws.id + '/parts.txt';
  assert.equal(recordOf(idb, key).bytes.length, 0, 'nothing is stored before close');
  await writable.close();
  const expected = 'abcdefghijklé€';
  assert.equal(sha(recordOf(idb, key).bytes), shaOfText(expected));
  const file = await (await root.getFileHandle('parts.txt')).getFile();
  assert.equal(await file.text(), expected);
  assert.equal(file.size, Buffer.byteLength(expected, 'utf8'));
});

test('a rewrite replaces the file: nothing of the longer text is left', async () => {
  const sb = page();
  const ws = await create(sb, 'Rewrite');
  const root = rootOf(sb, ws);
  const handle = await root.getFileHandle('.archicode.yaml');
  for (const text of ['a much longer first text\nwith two lines\n', 'short\n']) {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
  }
  assert.equal(await (await handle.getFile()).text(), 'short\n');
  assert.equal(await (await (await rootOf(sb, ws).getFileHandle('.archicode.yaml')).getFile()).text(), 'short\n');
});

test('a byte-order mark and CRLF come back byte for byte, and the stored bytes are not the array the caller wrote', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const text = '\ufeffsettings:\r\n  name: Shop\r\n';
  const passed = bytesIn(sb, text);
  const ws = await create(sb, 'Bytes', { 'a.yaml': 'x' });
  const root = rootOf(sb, ws);
  const handle = await root.getFileHandle('bom.yaml', { create: true });
  const writable = await handle.createWritable();
  await writable.write(passed);
  await writable.close();
  passed.fill(0x41); // the caller reuses its array
  const file = await (await root.getFileHandle('bom.yaml')).getFile();
  assert.equal(sha(await file.arrayBuffer()), shaOfText(text));
  assert.equal(
    sha(await file.slice(0, 3).arrayBuffer()),
    sha([0xef, 0xbb, 0xbf]),
    'the mark is in the first three bytes'
  );
  assert.equal(sha(recordOf(idb, 'file:' + ws.id + '/bom.yaml').bytes), shaOfText(text));
});

test('createBrowserWorkspace stores a copy of the bytes it is given', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const kept = bytesIn(sb, 'kept');
  const ws = await sb.createBrowserWorkspace({
    name: 'Aliased',
    files: [{ path: 'c.yaml', bytes: kept }],
    origin: 'blank'
  });
  kept.fill(0x42);
  assert.equal(sha(recordOf(idb, 'file:' + ws.id + '/c.yaml').bytes), shaOfText('kept'));
});

test('bytes made in another realm are accepted as well (the page has TextEncoder of its host here)', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const hostBytes = new TextEncoder().encode('from the host\n');
  const ws = await sb.createBrowserWorkspace({
    name: 'Host',
    files: [{ path: 'h.yaml', bytes: hostBytes }],
    origin: 'blank'
  });
  assert.equal(sha(recordOf(idb, 'file:' + ws.id + '/h.yaml').bytes), shaOfText('from the host\n'));
});

test('a stored file that starts with a byte-order mark gives a File whose first three bytes are the mark', async () => {
  const idb = fakeIndexedDB();
  const stored = new Uint8Array([0xef, 0xbb, 0xbf, 0x61, 0x3a, 0x20, 0x31, 0x0a]);
  idb.seed(DB, 1, {
    records: {
      'workspace:bw-seed': {
        kind: 'workspace',
        id: 'bw-seed',
        name: 'Seeded',
        createdAt: 1,
        openedAt: 1,
        lastExportAt: null,
        origin: 'blank'
      },
      'file:bw-seed/.archicode.yaml': {
        kind: 'file',
        workspace: 'bw-seed',
        path: '.archicode.yaml',
        bytes: stored,
        modified: 1234
      }
    }
  });
  const sb = page(idb);
  const root = sb.browserDirectoryHandle('bw-seed', '', 'Seeded');
  const file = await (await root.getFileHandle('.archicode.yaml')).getFile();
  assert.equal(file.lastModified, 1234, 'lastModified is the stored time');
  assert.equal(sha(await file.slice(0, 3).arrayBuffer()), sha([0xef, 0xbb, 0xbf]));
  assert.equal(sha(await file.arrayBuffer()), sha(stored));
  assert.equal(
    await file.text(),
    'a: 1\n',
    'a browser drops the mark in text(); the page reads the first bytes for it'
  );
});

test('modified strictly increases across writes, inside one millisecond and when the clock goes back', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  run(sb, 'Date.now = () => 5000');
  const ws = await create(sb, 'Clock');
  const root = rootOf(sb, ws);
  const handle = await root.getFileHandle('m.yaml', { create: true });
  const stamps = [(await handle.getFile()).lastModified];
  const key = 'file:' + ws.id + '/m.yaml';
  for (const text of ['one', 'two', 'three']) {
    const writable = await handle.createWritable();
    await writable.write(text);
    await writable.close();
    const file = await handle.getFile();
    assert.equal(file.lastModified, recordOf(idb, key).modified, 'the File tells the stored time');
    stamps.push(file.lastModified);
  }
  run(sb, 'Date.now = () => 10'); // the clock went back
  const writable = await handle.createWritable();
  await writable.write('four');
  await writable.close();
  stamps.push((await handle.getFile()).lastModified);
  for (let i = 1; i < stamps.length; i++) assert.ok(stamps[i] > stamps[i - 1], 'write ' + i + ': ' + stamps.join(', '));
});

// ---- the handle: removing ----

test('removeEntry removes a file, refuses a missing name and a directory, and the last file of a directory takes the directory with it', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Remove', {
    '.archicode.yaml': 'root',
    'manifests/a.yaml': 'a',
    'manifests/b.yaml': 'b',
    'views/only.puml': 'only'
  });
  const root = rootOf(sb, ws);
  const manifests = await root.getDirectoryHandle('manifests');

  assert.equal((await refusal(manifests.removeEntry('missing.yaml'))).name, 'NotFoundError');
  assert.equal(
    (await refusal(root.removeEntry('manifests'))).name,
    'TypeMismatchError',
    'the editor never removes a directory'
  );
  assert.equal(fileKeysOf(idb, ws.id).length, 4, 'nothing was removed by the refusals');

  await manifests.removeEntry('a.yaml');
  assert.deepEqual(await listed(manifests), ['b.yaml:file']);
  assert.equal((await refusal(manifests.getFileHandle('a.yaml'))).name, 'NotFoundError');

  const views = await root.getDirectoryHandle('views');
  await views.removeEntry('only.puml');
  assert.deepEqual(
    await listed(root),
    ['.archicode.yaml:file', 'manifests:directory'],
    'views is gone with its last file'
  );
  assert.equal((await refusal(root.getDirectoryHandle('views'))).name, 'NotFoundError');
  assert.equal(fileKeysOf(idb, ws.id).length, 2);
});

// ---- two workspaces ----

test('two workspaces do not see each other, and an id that begins like another is not the other', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha', { 'same.yaml': 'alpha', 'only-a.yaml': 'a' });
  const b = await create(sb, 'Beta', { 'same.yaml': 'beta' });
  const rootA = rootOf(sb, a);
  const rootB = rootOf(sb, b);
  assert.deepEqual(Object.keys(await walk(rootA)).sort(), ['only-a.yaml', 'same.yaml']);
  assert.deepEqual(Object.keys(await walk(rootB)), ['same.yaml']);
  const writable = await (await rootA.getFileHandle('same.yaml')).createWritable();
  await writable.write('alpha edited');
  await writable.close();
  assert.equal(await (await (await rootB.getFileHandle('same.yaml')).getFile()).text(), 'beta');
  assert.equal((await refusal(rootB.getFileHandle('only-a.yaml'))).name, 'NotFoundError');

  const record = (id, name) => ({
    kind: 'workspace',
    id,
    name,
    createdAt: 1,
    openedAt: 1,
    lastExportAt: null,
    origin: 'blank'
  });
  const file = (id, p) => ({ kind: 'file', workspace: id, path: p, bytes: new Uint8Array([0x78]), modified: 5 });
  const seeded = fakeIndexedDB();
  seeded.seed(DB, 1, {
    records: {
      'workspace:bw-a': record('bw-a', 'Short'),
      'workspace:bw-ab': record('bw-ab', 'Long'),
      'file:bw-a/x.yaml': file('bw-a', 'x.yaml'),
      'file:bw-ab/x.yaml': file('bw-ab', 'x.yaml'),
      'file:bw-ab/y.yaml': file('bw-ab', 'y.yaml')
    }
  });
  const sc = page(seeded);
  assert.deepEqual(await listed(sc.browserDirectoryHandle('bw-a', '', 'Short')), ['x.yaml:file']);
  const rows = plain(await sc.listBrowserWorkspaces());
  assert.equal(rows.find((r) => r.id === 'bw-a').fileCount, 1);
  assert.equal(rows.find((r) => r.id === 'bw-ab').fileCount, 2);
  await sc.deleteBrowserWorkspace('bw-a');
  assert.deepEqual(
    keysOf(seeded),
    ['file:bw-ab/x.yaml', 'file:bw-ab/y.yaml', 'workspace:bw-ab'],
    'deleting bw-a leaves bw-ab whole'
  );
});

// ---- a refused write leaves the old bytes (DEC-3) ----

test('a quota failure rejects close() with the browser name and a message that says nothing was changed, and the old bytes stay', async () => {
  let failing = false;
  const idb = fakeIndexedDB({ failPut: (key) => failing && key.startsWith('file:') });
  const sb = page(idb);
  const ws = await create(sb, 'Quota');
  const root = rootOf(sb, ws);
  const handle = await root.getFileHandle('.archicode.yaml');
  const before = digest(idb);

  failing = true;
  const writable = await handle.createWritable();
  await writable.write('new text that does not fit');
  const error = await refusal(writable.close());
  assert.equal(error.name, 'QuotaExceededError', 'the browser keeps its own name');
  assert.match(error.message, /could not store/i);
  assert.match(error.message, /nothing was changed/i);
  assert.deepEqual(digest(idb), before, 'the previous bytes and time are exactly as they were');
  assert.equal(await (await handle.getFile()).text(), FILES['.archicode.yaml']);

  failing = false;
  const again = await handle.createWritable();
  await again.write('fits now');
  await again.close();
  assert.equal(await (await handle.getFile()).text(), 'fits now', 'the store is usable after a refusal');
});

// ---- a workspace that is gone is never written to (DEC-6) ----

test('a write whose workspace was deleted in another tab is refused with the sentence, name NotFoundError, and stores nothing', async () => {
  const idb = fakeIndexedDB();
  const tabA = page(idb);
  const tabB = page(idb);
  const ws = await create(tabA, 'Shop');
  const root = rootOf(tabA, ws);
  const handle = await root.getFileHandle('.archicode.yaml');
  const writable = await handle.createWritable();
  await writable.write('edited in a tab that still shows the workspace');

  await tabB.deleteBrowserWorkspace(ws.id);
  const before = digest(idb);
  assert.deepEqual(before, [], 'the delete took everything');

  const error = await refusal(writable.close());
  assert.equal(error.name, 'NotFoundError');
  assert.equal(error.message, gone('Shop'), 'the error raised inside the transaction comes out whole');
  assert.deepEqual(digest(idb), before, 'no orphan file record');
  assert.deepEqual(plain(await tabA.listBrowserWorkspaces()), [], 'the workspace was not brought back');
});

test('a create, a removal and a new directory with a file after the workspace was deleted are refused and store nothing', async () => {
  const idb = fakeIndexedDB();
  const tabA = page(idb);
  const tabB = page(idb);
  const ws = await create(tabA, 'Shop');
  const root = rootOf(tabA, ws);
  const manifests = await root.getDirectoryHandle('manifests');
  await tabB.deleteBrowserWorkspace(ws.id);
  const before = digest(idb);

  const created = await refusal(root.getFileHandle('late.yaml', { create: true }));
  assert.equal(created.name, 'NotFoundError');
  assert.equal(created.message, gone('Shop'));
  const removed = await refusal(manifests.removeEntry('shop.yaml'));
  assert.equal(removed.name, 'NotFoundError');
  assert.equal(removed.message, gone('Shop'));
  const nested = await refusal(manifests.getFileHandle('later.yaml', { create: true }));
  assert.equal(nested.message, gone('Shop'));
  assert.deepEqual(digest(idb), before);
});

test('reads of a deleted workspace are a NotFoundError too', async () => {
  const idb = fakeIndexedDB();
  const tabA = page(idb);
  const tabB = page(idb);
  const ws = await create(tabA, 'Shop');
  const root = rootOf(tabA, ws);
  const handle = await root.getFileHandle('.archicode.yaml');
  await tabB.deleteBrowserWorkspace(ws.id);

  assert.equal((await refusal(handle.getFile())).name, 'NotFoundError');
  assert.equal((await refusal(root.getFileHandle('.archicode.yaml'))).name, 'NotFoundError');
  assert.equal((await refusal(root.getDirectoryHandle('manifests'))).name, 'NotFoundError');
  assert.equal((await refusal(listed(root))).name, 'NotFoundError');
});

test('a write in flight when another tab deletes the workspace leaves no orphan file behind', async () => {
  let release = null;
  let gate = null;
  const idb = fakeIndexedDB({
    holdCommit: ({ mode, keys }) => {
      if (!gate || mode !== 'readwrite' || !keys.some((k) => k.startsWith('file:'))) return null;
      const held = gate;
      gate = null;
      return held;
    }
  });
  const tabA = page(idb);
  const tabB = page(idb);
  const ws = await create(tabA, 'Shop');
  const handle = await rootOf(tabA, ws).getFileHandle('.archicode.yaml');
  const writable = await handle.createWritable();
  await writable.write('being written');

  gate = new Promise((resolve) => {
    release = resolve;
  });
  const closing = refusal(writable.close()).then(
    (e) => e,
    () => null
  );
  await waitFor(() => gate === null, 'the write to reach its commit');
  const deleting = tabB.deleteBrowserWorkspace(ws.id);
  await pause(30); // the delete waits behind the write: two readwrite transactions never overlap
  release();
  await Promise.allSettled([closing, deleting]);

  assert.deepEqual(keysOf(idb), [], 'whichever came first, nothing of the workspace is left');
});

// ---- create ----

test('createBrowserWorkspace writes the record and all its files in one readwrite transaction', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  await sb.listBrowserWorkspaces(); // the database exists before the call under test
  const before = idb.calls.length;
  await create(sb, 'One', { 'a.yaml': 'a', 'b/c.yaml': 'c', 'd.yaml': 'd' });
  const transactions = idb.calls.slice(before).filter((c) => c.op === 'transaction' && c.mode === 'readwrite');
  assert.equal(transactions.length, 1);
});

test('createBrowserWorkspace is atomic: the third put fails and no record, no file and no pointer is left', async () => {
  let puts = 0;
  let armed = false;
  const idb = fakeIndexedDB({ failPut: () => armed && ++puts === 3 });
  const sb = page(idb);
  await create(sb, 'Existing', { 'x.yaml': 'x' });
  const before = digest(idb);
  armed = true;
  const error = await refusal(
    sb.createBrowserWorkspace({
      name: 'Half',
      files: ['a', 'b', 'c'].map((n) => ({ path: n + '.yaml', bytes: bytesIn(sb, n) })),
      origin: 'blank'
    })
  );
  assert.equal(error.name, 'QuotaExceededError');
  armed = false;
  assert.deepEqual(digest(idb), before);
  assert.deepEqual(
    plain(await sb.listBrowserWorkspaces()).map((r) => r.name),
    ['Existing']
  );
});

const LONG = 'a'.repeat(81);
const BAD_NAMES = [
  ['empty', ''],
  ['only spaces', '   '],
  ['81 characters', LONG],
  ['a control character', 'Sh\u0000op'],
  ['a line break', 'Sh\nop'],
  ['a tab', 'Sh\top'],
  ['a delete character', 'Sh\u007fop']
];

test('the name rule is one function: trimmed, 1 to 80 characters, no control character, unique without case', () => {
  const sb = page();
  const problem = (name, others) => sb.browserWorkspaceNameProblem(name, others || []);
  for (const ok of ['Shop', '  Shop  ', 'x', 'café € 日本', 'a'.repeat(80), '  ' + 'a'.repeat(80) + '  ']) {
    assert.equal(problem(ok), null, JSON.stringify(ok));
    assert.equal(problem(ok, ['Other']), null);
  }
  const sentences = new Set();
  for (const [what, name] of BAD_NAMES) {
    const sentence = problem(name);
    assert.equal(typeof sentence, 'string', what);
    assert.ok(sentence.length > 0, what);
    sentences.add(sentence);
  }
  assert.equal(typeof problem(undefined), 'string');
  assert.equal(typeof problem(null), 'string');
  assert.equal(typeof problem(7), 'string');
  assert.equal(problem('  ' + 'a'.repeat(81) + '  ') !== null, true, 'trimmed, 81 is still too long');
  const taken = problem('shop', ['Shop']);
  assert.equal(typeof taken, 'string');
  assert.equal(typeof problem('  SHOP ', ['Shop']), 'string', 'compared trimmed and without case');
  assert.equal(problem('Shop', ['Shopping']), null, 'a longer name is another name');
  sentences.add(taken);
  assert.ok(sentences.size >= 4, 'empty, too long, control character and taken are told apart');
});

test('createBrowserWorkspace refuses a bad name with the sentence of the rule and stores nothing; it stores the name trimmed', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const first = await create(sb, '  Shop  ');
  assert.equal(first.name, 'Shop');
  const before = digest(idb);
  for (const [what, name] of BAD_NAMES) {
    const error = await refusal(sb.createBrowserWorkspace({ name, files: [], origin: 'blank' }));
    assert.equal(error.message, sb.browserWorkspaceNameProblem(name, ['Shop']), what);
    assert.deepEqual(digest(idb), before, what);
  }
  for (const name of ['shop', ' SHOP ', 'Shop']) {
    const error = await refusal(sb.createBrowserWorkspace({ name, files: [], origin: 'blank' }));
    assert.equal(error.message, sb.browserWorkspaceNameProblem(name, ['Shop']), JSON.stringify(name));
  }
  assert.deepEqual(digest(idb), before);
  const longest = await create(sb, 'a'.repeat(80));
  assert.equal(longest.name.length, 80);
});

test('two creates of one name in two tabs: one of them fails with the sentence, inside the transaction', async () => {
  const idb = fakeIndexedDB();
  const tabA = page(idb);
  const tabB = page(idb);
  await tabA.listBrowserWorkspaces();
  const make = (sb, name) =>
    sb.createBrowserWorkspace({ name, files: [{ path: 'a.yaml', bytes: bytesIn(sb, 'a') }], origin: 'blank' });
  const results = await Promise.allSettled([make(tabA, 'Shop'), make(tabB, ' shop ')]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  const rejected = results.find((r) => r.status === 'rejected');
  assert.equal(rejected.reason.message, tabA.browserWorkspaceNameProblem('shop', ['Shop']));
  const rows = plain(await tabA.listBrowserWorkspaces());
  assert.equal(rows.length, 1);
  assert.equal(fileKeysOf(idb, rows[0].id).length, 1);
  assert.equal(keysOf(idb).filter((k) => k.startsWith('file:')).length, 1, 'the loser stored no file');
});

// ---- rename ----

test('renameBrowserWorkspace changes the name of the record and nothing else', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha');
  await create(sb, 'Beta');
  const before = digest(idb);
  await sb.renameBrowserWorkspace(a.id, '  Gamma ');
  const after = digest(idb);
  const changed = after.filter((line, i) => line !== before[i]);
  assert.equal(changed.length, 1);
  assert.ok(changed[0].startsWith('workspace:' + a.id + ' '));
  assert.equal(recordOf(idb, 'workspace:' + a.id).name, 'Gamma');
  assert.equal(recordOf(idb, 'workspace:' + a.id).id, a.id, 'the id is the same');
  assert.deepEqual(
    plain(await sb.listBrowserWorkspaces())
      .map((r) => r.name)
      .sort(),
    ['Beta', 'Gamma']
  );
  await sb.renameBrowserWorkspace(a.id, 'GAMMA'); // its own name in another case is no clash
  assert.equal(recordOf(idb, 'workspace:' + a.id).name, 'GAMMA');
});

test('renameBrowserWorkspace refuses a bad or taken name with the sentence, and a workspace that is gone', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha');
  await create(sb, 'Beta');
  const before = digest(idb);
  for (const [what, name] of BAD_NAMES) {
    const error = await refusal(sb.renameBrowserWorkspace(a.id, name));
    assert.equal(error.message, sb.browserWorkspaceNameProblem(name, ['Beta']), what);
  }
  for (const name of ['beta', ' BETA ']) {
    const error = await refusal(sb.renameBrowserWorkspace(a.id, name));
    assert.equal(error.message, sb.browserWorkspaceNameProblem(name, ['Beta']));
  }
  assert.deepEqual(digest(idb), before);
  const missing = await refusal(sb.renameBrowserWorkspace('bw-nothere', 'Whatever'));
  assert.equal(missing.name, 'NotFoundError');
  assert.deepEqual(digest(idb), before, 'a rename does not create a record');
});

test('two renames to one name in two tabs: one of them fails with the sentence', async () => {
  const idb = fakeIndexedDB();
  const tabA = page(idb);
  const tabB = page(idb);
  const a = await create(tabA, 'One');
  const b = await create(tabA, 'Two');
  const results = await Promise.allSettled([
    tabA.renameBrowserWorkspace(a.id, 'Same'),
    tabB.renameBrowserWorkspace(b.id, ' same ')
  ]);
  assert.deepEqual(results.map((r) => r.status).sort(), ['fulfilled', 'rejected']);
  const names = plain(await tabA.listBrowserWorkspaces()).map((r) => r.name);
  assert.equal(names.filter((n) => n.toLowerCase().trim() === 'same').length, 1);
  assert.equal(names.length, 2);
});

// ---- delete ----

test('deleteBrowserWorkspace removes the record, every file and the pointer in one transaction, and no key of another workspace', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha', { 'a.yaml': 'a', 'd/e.yaml': 'e', 'f.yaml': 'f' });
  const b = await create(sb, 'Beta', { 'b.yaml': 'b' });
  await sb.writeBrowserLast(a.id);
  const keepB = digest(idb).filter((line) => line.includes(b.id));
  const before = idb.calls.length;

  await sb.deleteBrowserWorkspace(a.id);

  assert.equal(
    idb.calls.slice(before).filter((c) => c.op === 'transaction' && c.mode === 'readwrite').length,
    1,
    'one readwrite transaction'
  );
  const left = digest(idb);
  assert.ok(
    left.every((line) => !line.includes(a.id)),
    'nothing of Alpha: ' + left.map((l) => l.split(' ')[0]).join(', ')
  );
  assert.ok(!keysOf(idb).includes('last'), 'the pointer to it went with it');
  assert.deepEqual(
    left.filter((line) => line.includes(b.id)),
    keepB
  );
  assert.equal(left.length, keepB.length, 'no other key');
});

test('deleting a workspace leaves the pointer to another one alone', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha');
  const b = await create(sb, 'Beta');
  await sb.writeBrowserLast(b.id);
  await sb.deleteBrowserWorkspace(a.id);
  assert.equal(plain(await sb.readBrowserLast()).id, b.id);
});

// ---- the pointer ----

test('the last-opened pointer is read, written and cleared, and writing it touches no workspace', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  assert.equal(await sb.readBrowserLast(), null);
  const a = await create(sb, 'Alpha');
  const b = await create(sb, 'Beta');
  const before = digest(idb);

  await sb.writeBrowserLast(a.id);
  let last = plain(await sb.readBrowserLast());
  assert.equal(last.id, a.id);
  assert.equal(typeof last.openedAt, 'number');
  assert.deepEqual(
    digest(idb).filter((line) => !line.startsWith('last ')),
    before,
    'only the pointer moved'
  );

  await sb.writeBrowserLast(b.id);
  last = plain(await sb.readBrowserLast());
  assert.equal(last.id, b.id);
  assert.equal(keysOf(idb).filter((k) => k === 'last').length, 1);

  await sb.clearBrowserLast();
  assert.equal(await sb.readBrowserLast(), null);
  assert.ok(!keysOf(idb).includes('last'));
  assert.deepEqual(digest(idb), before, 'closing a workspace keeps its data');
  await sb.clearBrowserLast(); // clearing nothing is no error
});

// ---- the list ----

test('listBrowserWorkspaces gives each workspace with its file count and the time of its last change', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  assert.deepEqual(plain(await sb.listBrowserWorkspaces()), []);
  const a = await create(sb, 'Alpha', { 'a.yaml': 'a', 'd/e.yaml': 'e', 'f.yaml': 'f' });
  const b = await create(sb, 'Beta', { 'b.yaml': 'b' });
  const root = rootOf(sb, a);
  const writable = await (await root.getFileHandle('a.yaml')).createWritable();
  await writable.write('edited');
  await writable.close();

  const rows = plain(await sb.listBrowserWorkspaces());
  assert.equal(rows.length, 2);
  const rowA = rows.find((r) => r.id === a.id);
  const rowB = rows.find((r) => r.id === b.id);
  assert.equal(rowA.name, 'Alpha');
  assert.equal(rowA.fileCount, 3);
  assert.equal(rowB.fileCount, 1);
  const modifieds = (id) => fileKeysOf(idb, id).map((k) => recordOf(idb, k).modified);
  assert.equal(rowA.changedAt, Math.max(...modifieds(a.id)));
  assert.equal(rowB.changedAt, Math.max(...modifieds(b.id)));
  assert.equal(rowA.lastExportAt, null);
  assert.equal(rowA.origin, 'blank');
});

test('a listing ignores a record of an unknown kind or one that does not parse, and deletes nothing', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha');
  const dumped = idb.dump(DB).stores.records;
  idb.seed(DB, 1, {
    records: Object.assign({}, dumped, {
      'workspace:bw-strange': { kind: 'something-newer', id: 'bw-strange', name: 'From a newer page' },
      'workspace:bw-garbage': 'not a record',
      'file:bw-strange/x.yaml': { kind: 'future-file', path: 'x.yaml' }
    })
  });
  const before = digest(idb);
  const rows = plain(await sb.listBrowserWorkspaces());
  assert.deepEqual(
    rows.map((r) => r.id),
    [a.id]
  );
  assert.deepEqual(digest(idb), before, 'never deleted');
});

test('markBrowserExport sets lastExportAt and leaves the files and the other records alone', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const a = await create(sb, 'Alpha');
  const b = await create(sb, 'Beta');
  await sb.writeBrowserLast(a.id);
  const before = digest(idb);

  await sb.markBrowserExport(a.id, 123456);
  assert.equal(recordOf(idb, 'workspace:' + a.id).lastExportAt, 123456);
  const changed = digest(idb).filter((line, i) => line !== before[i]);
  assert.equal(changed.length, 1, 'one record changed');
  assert.ok(changed[0].startsWith('workspace:' + a.id + ' '));

  const low = Date.now();
  await sb.markBrowserExport(b.id);
  const stamp = recordOf(idb, 'workspace:' + b.id).lastExportAt;
  assert.ok(stamp >= low && stamp <= Date.now() + 1000, 'the time now by default');
  assert.equal(plain(await sb.listBrowserWorkspaces()).find((r) => r.id === b.id).lastExportAt, stamp);
});
