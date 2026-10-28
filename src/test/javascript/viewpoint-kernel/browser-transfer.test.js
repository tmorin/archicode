'use strict';
// The two store functions of import and export, and the optional `sample` property of a workspace record (wave 025, run 0193, task-005;
// TDD DEC-6, DEC-12, CTR-1, CON-4, CON-8, CON-9): `readBrowserWorkspaceFiles(id, ownerName)` is a snapshot of a workspace's stored files in one
// readonly transaction, and `replaceBrowserWorkspaceFiles(id, files, ownerName)` swaps all of them in one readwrite transaction. Both live in
// persistence/browser-transfer.js; `createBrowserWorkspace` and `listBrowserWorkspaces` of persistence/browser-store.js gain the property.
// The browser's IndexedDB is played by the fake of the harness.
//
// Written before the parts exist: the tests of the two functions fail now because the page has no `readBrowserWorkspaceFiles` and no
// `replaceBrowserWorkspaceFiles` (a "not a function" error that names them); the tests of the `sample` option fail on an assertion until
// browser-store.js stores and lists it. Names and shapes this file fixes where the TDD leaves them open (task-008 writes to them):
//   - `readBrowserWorkspaceFiles(id, ownerName)` resolves `[{ path, bytes, modified }]`, sorted by code point (the fake's keys come sorted by
//     UTF-16 unit, so the function sorts itself), bytes copied into the page's own realm; a workspace that is gone rejects with the sentence of
//     W-4 DEC-6 (`NotFoundError`, `workspaceGone`), `ownerName` being the name in that sentence ('' when unknown).
//   - `replaceBrowserWorkspaceFiles(id, files, ownerName)` resolves when the one transaction has committed; `files` is `[{ path, bytes }]`.
//   - `createBrowserWorkspace({ name, files, origin, sample })`: `sample` is stored on the record only for `origin === 'sample'` and a text.
// Bytes are the page's: nothing here lets an assertion print a byte array, and none compares page bytes with a deep-equality assertion or a class test (the
// page runs in another realm); bytes are compared by hash (CON-8). The fake has no range, no index, no cursor (CON-9).
// Run with: node --test src/test/javascript/viewpoint-kernel/browser-transfer.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const { createApp, fakeIndexedDB } = require('./harness');

const DB = 'archicode-browser-workspaces';

const sha = (bytes) => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const shaOfText = (text) => sha(Buffer.from(text, 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value)); // for records and summaries without bytes; never for a file record
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
  const bytes = require('node:vm').runInContext('new Uint8Array(' + source.length + ')', sandbox);
  bytes.set(source);
  return bytes;
}

const listOf = (sandbox, map) =>
  Object.entries(map).map(([filePath, text]) => ({ path: filePath, bytes: bytesIn(sandbox, text) }));

const FILES = {
  '.archicode.yaml': 'settings:\n  name: Shop\n',
  'manifests/shop.yaml': 'id: shop\n',
  'manifests/deep/more.yaml': 'id: more\n'
};

async function create(sandbox, name, files = FILES, origin = 'blank', sample) {
  const options = { name, files: listOf(sandbox, files), origin };
  if (sample !== undefined) options.sample = sample;
  return plain(await sandbox.createBrowserWorkspace(options));
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
const fileKeysOf = (idb, id) => keysOf(idb).filter((key) => key.startsWith('file:' + id + '/'));
const recordOf = (idb, key) => idb.dump(DB).stores.records[key];
const transactionsOf = (idb) => idb.calls.filter((call) => call.op === 'transaction');

/** What a read returned, as strings: the path, the hash of the bytes, the kind of the time. */
const hashesOf = (files) => plain(Array.from(files, (file) => file.path + ' ' + sha(file.bytes)));

const gone = (name) =>
  'The workspace “' +
  name +
  '” is no longer in this browser: it was deleted, possibly in another tab. Nothing was written.';
const goneNoName =
  'The workspace is no longer in this browser: it was deleted, possibly in another tab. Nothing was written.';

// ---- readBrowserWorkspaceFiles ----

test('reading a workspace gives every stored file, sorted by code point, with its bytes and its time', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  // by UTF-16 unit, U+1F600 (a surrogate pair, D83D...) comes before U+FB00; by code point U+FB00 comes first; 'Z' comes before 'a' either way
  const emoji = 'manifests/\u{1F600}.yaml';
  const ligature = 'manifests/ﬀ.yaml';
  const ws = await create(sb, 'Tree', {
    'a.yaml': 'a: 1\n',
    '.archicode.yaml': 'root\n',
    'Z.yaml': 'z: 1\n',
    'manifests/b.yaml': 'b: 1\n',
    'manifests/deep/c.yaml': 'c: 1\n',
    [emoji]: 'e: 1\n',
    [ligature]: 'l: 1\n'
  });

  const files = await sb.readBrowserWorkspaceFiles(ws.id, 'Tree');

  assert.deepEqual(plain(Array.from(files, (file) => file.path)), [
    '.archicode.yaml',
    'Z.yaml',
    'a.yaml',
    'manifests/b.yaml',
    'manifests/deep/c.yaml',
    ligature,
    emoji
  ]);
  const wanted = {
    '.archicode.yaml': 'root\n',
    'Z.yaml': 'z: 1\n',
    'a.yaml': 'a: 1\n',
    'manifests/b.yaml': 'b: 1\n',
    'manifests/deep/c.yaml': 'c: 1\n',
    [emoji]: 'e: 1\n',
    [ligature]: 'l: 1\n'
  };
  for (const file of files) {
    assert.equal(file.bytes.length, Buffer.byteLength(wanted[file.path]), 'the length of ' + file.path);
    assert.equal(sha(file.bytes), shaOfText(wanted[file.path]), 'the bytes of ' + file.path);
    assert.equal(Object.prototype.toString.call(file.bytes), '[object Uint8Array]');
    assert.equal(file.modified, recordOf(idb, 'file:' + ws.id + '/' + file.path).modified, 'the time of ' + file.path);
  }
});

test('an empty workspace reads as an empty list, and a workspace is read alone', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const empty = await create(sb, 'Empty', {});
  const other = await create(sb, 'Other', { 'x.yaml': 'x\n' });
  const mine = await create(sb, 'Mine', { 'y.yaml': 'y\n' });

  assert.equal((await sb.readBrowserWorkspaceFiles(empty.id, 'Empty')).length, 0);
  assert.deepEqual(plain(Array.from(await sb.readBrowserWorkspaceFiles(mine.id, 'Mine'), (f) => f.path)), ['y.yaml']);
  assert.deepEqual(plain(Array.from(await sb.readBrowserWorkspaceFiles(other.id, 'Other'), (f) => f.path)), ['x.yaml']);
});

test('a byte-order mark, CRLF and a line of three dashes come back byte for byte', async () => {
  const sb = page();
  const texts = {
    'a.yaml': '﻿id: a\r\nnote: x\r\n',
    'b.yaml': 'one: 1\r\n---\r\ntwo: 2\n',
    'c.yaml': 'no final newline'
  };
  const ws = await create(sb, 'Bytes', texts);

  const files = await sb.readBrowserWorkspaceFiles(ws.id, 'Bytes');

  assert.equal(files.length, 3);
  for (const file of files) {
    assert.equal(file.bytes.length, Buffer.byteLength(texts[file.path], 'utf8'), 'the length of ' + file.path);
    assert.equal(sha(file.bytes), shaOfText(texts[file.path]), 'the hash of ' + file.path);
  }
  assert.equal(
    files.find((file) => file.path === 'a.yaml').bytes[0],
    0xef,
    'the mark is a byte of the file, not dropped'
  );
});

test('the files read are a copy: changing them changes nothing in the store, and two reads share no array', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Copy');
  const before = digest(idb);

  const first = await sb.readBrowserWorkspaceFiles(ws.id, 'Copy');
  const firstBytes = first[0].bytes;
  first[0].bytes[0] = first[0].bytes[0] ^ 0xff;
  first[0].bytes.fill(0);
  first.length = 0;
  assert.deepEqual(digest(idb), before, 'the stored records are as they were');

  const second = await sb.readBrowserWorkspaceFiles(ws.id, 'Copy');
  assert.equal(second.length, 3);
  assert.equal(sha(second.find((file) => file.path === '.archicode.yaml').bytes), shaOfText(FILES['.archicode.yaml']));
  assert.notEqual(second[0].bytes, firstBytes, 'a read hands out arrays of its own');
});

test('a read is one readonly transaction and writes nothing, not even the time of the export or of the opening', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Snapshot');
  await sb.markBrowserExport(ws.id, 4242);
  const before = digest(idb);
  const calls = idb.calls.length;

  await sb.readBrowserWorkspaceFiles(ws.id, 'Snapshot');

  const made = plain(idb.calls.slice(calls));
  assert.deepEqual(
    made.filter((call) => call.op === 'transaction').map((call) => call.mode),
    ['readonly'],
    'one transaction, read-only: a save in another tab cannot slip between two reads'
  );
  assert.equal(made.filter((call) => call.op === 'put' || call.op === 'delete').length, 0);
  assert.deepEqual(digest(idb), before);
});

test('a workspace that is gone is told with the sentence of W-4 DEC-6, with or without its name', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Shop');
  await sb.deleteBrowserWorkspace(ws.id);

  const named = await refusal(sb.readBrowserWorkspaceFiles(ws.id, 'Shop'));
  assert.equal(named.name, 'NotFoundError');
  assert.equal(named.message, gone('Shop'));
  assert.equal(named.workspaceGone, true, 'the flows tell it from a missing file');

  const unnamed = await refusal(sb.readBrowserWorkspaceFiles(ws.id, ''));
  assert.equal(unnamed.message, goneNoName);

  const never = await refusal(sb.readBrowserWorkspaceFiles('bw-never-existed', 'Ghost'));
  assert.equal(never.message, gone('Ghost'));
  assert.deepEqual(keysOf(idb), [], 'a read recreates nothing');
});

// ---- replaceBrowserWorkspaceFiles ----

test('a replacement keeps the record whole, removes the files that are not in the new set, and writes the new ones', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Brightcart', FILES, 'sample', 'brightcart');
  const other = await create(sb, 'Other', { 'o.yaml': 'o\n' });
  await sb.markBrowserExport(ws.id, 1234);
  await sb.writeBrowserLast(ws.id);
  const before = plain(recordOf(idb, 'workspace:' + ws.id));
  await pause(5); // so that openedAt can only be later

  await sb.replaceBrowserWorkspaceFiles(
    ws.id,
    listOf(sb, { 'manifests/shop.yaml': 'id: replaced\n', 'views/new.yaml': 'id: new\n' }),
    'Brightcart'
  );

  assert.deepEqual(fileKeysOf(idb, ws.id), [
    'file:' + ws.id + '/manifests/shop.yaml',
    'file:' + ws.id + '/views/new.yaml'
  ]);
  const shop = recordOf(idb, 'file:' + ws.id + '/manifests/shop.yaml');
  const added = recordOf(idb, 'file:' + ws.id + '/views/new.yaml');
  assert.equal(sha(shop.bytes), shaOfText('id: replaced\n'), 'a path in both sets has the new bytes');
  assert.equal(sha(added.bytes), shaOfText('id: new\n'));
  assert.equal(shop.kind, 'file');
  assert.equal(shop.workspace, ws.id);
  assert.equal(shop.path, 'manifests/shop.yaml');
  assert.equal(typeof shop.modified, 'number');
  assert.equal(added.modified, shop.modified, 'one time for the whole set');
  assert.ok(shop.modified >= before.openedAt);

  const after = plain(recordOf(idb, 'workspace:' + ws.id));
  assert.ok(after.openedAt > before.openedAt, 'the replacement is an opening');
  assert.deepEqual(
    Object.assign({}, after, { openedAt: 0 }),
    Object.assign({}, before, { openedAt: 0 }),
    'id, name, createdAt, lastExportAt, origin and sample are the record’s own'
  );
  assert.equal(after.lastExportAt, 1234);
  assert.equal(after.origin, 'sample');
  assert.deepEqual(
    plain(await sb.readBrowserLast()).id,
    ws.id,
    'the pointer to the workspace the browser reopens is not moved'
  );
  assert.deepEqual(fileKeysOf(idb, other.id), ['file:' + other.id + '/o.yaml'], 'another workspace is not touched');
});

test('a replacement does not touch another workspace, its record, its files, or the pointer', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const mine = await create(sb, 'Mine');
  const other = await create(sb, 'Other', { 'o.yaml': 'o\n', 'p/q.yaml': 'q\n' });
  await sb.writeBrowserLast(other.id);
  const mineKeys = (key) => key.includes(mine.id);
  const othersBefore = digest(idb).filter((line) => !mineKeys(line));

  await sb.replaceBrowserWorkspaceFiles(mine.id, listOf(sb, { 'only.yaml': 'only\n' }), 'Mine');

  assert.deepEqual(
    digest(idb).filter((line) => !mineKeys(line)),
    othersBefore
  );
  assert.deepEqual(fileKeysOf(idb, mine.id), ['file:' + mine.id + '/only.yaml']);
});

test('a replacement is all or nothing: a put that fails leaves the old files, the record and every other key as they were', async () => {
  let failing = false;
  const idb = fakeIndexedDB({ failPut: (key) => failing && key.endsWith('/second.yaml') });
  const sb = page(idb);
  const ws = await create(sb, 'Safe', FILES, 'sample', 'brightcart');
  await sb.markBrowserExport(ws.id, 99);
  const before = digest(idb);
  failing = true;

  const error = await refusal(
    sb.replaceBrowserWorkspaceFiles(
      ws.id,
      listOf(sb, { 'first.yaml': 'first\n', 'second.yaml': 'second\n', 'third.yaml': 'third\n' }),
      'Safe'
    )
  );

  assert.equal(error.name, 'QuotaExceededError', 'the browser keeps its own name');
  assert.deepEqual(digest(idb), before, 'the old files read back, none of the new ones is there');
  failing = false;
  const files = await sb.readBrowserWorkspaceFiles(ws.id, 'Safe');
  assert.deepEqual(hashesOf(files), [
    '.archicode.yaml ' + shaOfText(FILES['.archicode.yaml']),
    'manifests/deep/more.yaml ' + shaOfText(FILES['manifests/deep/more.yaml']),
    'manifests/shop.yaml ' + shaOfText(FILES['manifests/shop.yaml'])
  ]);
});

test('a bad path is refused with the sentence of the creation, before any transaction, and nothing is written', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Paths');
  const before = digest(idb);
  const transactions = transactionsOf(idb).length;

  for (const bad of ['../x.yaml', '/abs.yaml', 'a//b.yaml', '', 'a\\b.yaml', './x.yaml', 'a/./b.yaml', 'a/']) {
    const expected = await refusal(sb.createBrowserWorkspace({ name: 'Fresh', files: listOf(sb, { [bad]: 'x' }) }));
    const error = await refusal(
      sb.replaceBrowserWorkspaceFiles(
        ws.id,
        [...listOf(sb, { 'good.yaml': 'good\n' }), ...listOf(sb, { [bad]: 'x' })],
        'Paths'
      )
    );
    assert.equal(error.name, 'InvalidPathError', JSON.stringify(bad));
    assert.equal(error.message, expected.message, 'the same words as the creation: ' + JSON.stringify(bad));
  }

  assert.equal(transactionsOf(idb).length, transactions, 'no transaction was opened');
  assert.deepEqual(digest(idb), before, 'the good file that came first was not written either');
});

test('a workspace that is gone is not written: the sentence of W-4 DEC-6, no record and no file left behind', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Gone');
  const keep = await create(sb, 'Keep');
  await sb.deleteBrowserWorkspace(ws.id);
  const before = digest(idb);

  const error = await refusal(sb.replaceBrowserWorkspaceFiles(ws.id, listOf(sb, { 'a.yaml': 'a\n' }), 'Gone'));

  assert.equal(error.name, 'NotFoundError');
  assert.equal(error.message, gone('Gone'));
  assert.equal(error.workspaceGone, true);
  assert.deepEqual(digest(idb), before, 'nothing was written');
  assert.equal(fileKeysOf(idb, ws.id).length, 0);
  assert.equal(recordOf(idb, 'workspace:' + keep.id).name, 'Keep');
});

test('the bytes given are copied: changing them afterwards changes nothing in the store', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Alias');
  const given = bytesIn(sb, 'id: stable\n');

  await sb.replaceBrowserWorkspaceFiles(ws.id, [{ path: 'a.yaml', bytes: given }], 'Alias');
  given.fill(0x7a);

  assert.equal(sha(recordOf(idb, 'file:' + ws.id + '/a.yaml').bytes), shaOfText('id: stable\n'));
});

test('a replacement by an empty list empties the workspace and keeps it', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Hollow');

  await sb.replaceBrowserWorkspaceFiles(ws.id, [], 'Hollow');

  assert.equal(fileKeysOf(idb, ws.id).length, 0);
  assert.equal(recordOf(idb, 'workspace:' + ws.id).name, 'Hollow');
  assert.equal((await sb.readBrowserWorkspaceFiles(ws.id, 'Hollow')).length, 0);
});

test('what a replacement writes is what a read gives back, a mark, CRLF and a line of three dashes included', async () => {
  const sb = page();
  const ws = await create(sb, 'Round');
  const texts = {
    '.archicode.yaml': '﻿settings:\r\n  name: Round\r\n',
    'm/a.yaml': 'one: 1\r\n---\r\ntwo: 2\n',
    'm/b.yaml': 'last line without a newline'
  };

  await sb.replaceBrowserWorkspaceFiles(ws.id, listOf(sb, texts), 'Round');
  const files = await sb.readBrowserWorkspaceFiles(ws.id, 'Round');

  assert.deepEqual(
    hashesOf(files),
    Object.keys(texts)
      .sort()
      .map((filePath) => filePath + ' ' + shaOfText(texts[filePath]))
  );
});

// ---- the optional property `sample` (CTR-1) ----

test('a workspace made from a sample records which sample, on the record and on its row; the other origins record none', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);

  const sample = await create(sb, 'Brightcart', FILES, 'sample', 'brightcart');
  const blank = await create(sb, 'Blank', FILES, 'blank');
  const imported = await create(sb, 'Imported', FILES, 'import');

  assert.equal(sample.origin, 'sample');
  assert.equal(sample.sample, 'brightcart', 'the record handed back has it');
  assert.equal(recordOf(idb, 'workspace:' + sample.id).sample, 'brightcart', 'the stored record has it');
  for (const record of [blank, imported]) {
    assert.equal('sample' in record, false, record.name + ': no property on the record handed back');
    assert.equal('sample' in recordOf(idb, 'workspace:' + record.id), false, record.name + ': no property stored');
  }

  const rows = plain(await sb.listBrowserWorkspaces());
  const byName = Object.fromEntries(rows.map((row) => [row.name, row]));
  assert.equal(byName.Brightcart.sample, 'brightcart');
  assert.equal(byName.Brightcart.origin, 'sample');
  assert.equal(byName.Blank.sample, null);
  assert.equal(byName.Imported.sample, null);
  assert.equal(byName.Imported.origin, 'import');
});

test('the property is stored only for the origin sample and only as a text', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const stray = await sb.createBrowserWorkspace({ name: 'Stray', files: [], origin: 'import', sample: 'brightcart' });
  const none = await sb.createBrowserWorkspace({ name: 'None', files: [], origin: 'sample' });
  const number = await sb.createBrowserWorkspace({ name: 'Number', files: [], origin: 'sample', sample: 5 });

  for (const record of [stray, none, number]) {
    assert.equal('sample' in plain(record), false, record.name);
    assert.equal('sample' in recordOf(idb, 'workspace:' + record.id), false, record.name);
  }
  const rows = plain(await sb.listBrowserWorkspaces());
  assert.deepEqual(
    rows.map((row) => row.sample),
    [null, null, null]
  );
});

test('a record without the property, or with one that is not a text, reads as null, and the database stays at version 1', async () => {
  const idb = fakeIndexedDB();
  idb.seed(DB, 1, {
    records: {
      'workspace:old': {
        kind: 'workspace',
        id: 'old',
        name: 'Old',
        createdAt: 1,
        openedAt: 2,
        lastExportAt: null,
        origin: 'blank'
      },
      'workspace:odd': {
        kind: 'workspace',
        id: 'odd',
        name: 'Odd',
        createdAt: 1,
        openedAt: 2,
        lastExportAt: null,
        origin: 'sample',
        sample: 5
      }
    }
  });
  const sb = page(idb);

  const rows = plain(await sb.listBrowserWorkspaces());
  assert.deepEqual(rows.map((row) => [row.name, row.sample]).sort(), [
    ['Odd', null],
    ['Old', null]
  ]);

  await create(sb, 'Brightcart', FILES, 'sample', 'brightcart');
  const db = idb.dump(DB);
  assert.equal(db.version, 1, 'CON-4: no version bump');
  assert.deepEqual(Object.keys(db.stores), ['records']);
});

test('renaming, marking an export and replacing the files keep the sample property of the record', async () => {
  const idb = fakeIndexedDB();
  const sb = page(idb);
  const ws = await create(sb, 'Brightcart', FILES, 'sample', 'brightcart');

  await sb.renameBrowserWorkspace(ws.id, 'My Brightcart');
  await sb.markBrowserExport(ws.id, 55);
  await sb.replaceBrowserWorkspaceFiles(ws.id, listOf(sb, { 'a.yaml': 'a\n' }), 'My Brightcart');

  const record = plain(recordOf(idb, 'workspace:' + ws.id));
  assert.equal(record.sample, 'brightcart');
  assert.equal(record.name, 'My Brightcart');
  assert.equal(record.lastExportAt, 55);
  const row = plain(await sb.listBrowserWorkspaces()).find((candidate) => candidate.id === ws.id);
  assert.equal(row.sample, 'brightcart', 'a renamed sample is still found by what it is, not by its name');
});
