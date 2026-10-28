'use strict';
// The flows of Export, Import, Open sample and Reset (wave 025, run 0193, task-006; TDD DEC-4 to DEC-6, DEC-9, DEC-11, DEC-13, FLOW-1 to FLOW-4, RISK-4, CON-2, CON-8,
// CON-9; gap-001 decisions 1 to 3 and 5): application/bundle-flows.js over the browser store, with three of the four edge functions of persistence/bundle-io.js replaced
// on the sandbox (`fetchSampleBundle`, `bundleFilePicker`, `startBundleDownload`; `readBundleFile` is pure enough to run for real, so the size and UTF-8 refusals go
// through it). The flows are called directly: no card is drawn and no key is fired, so every case here names no presentation or composition function (CON-2). The
// cases that need one (the address, the menu and its question, Escape, the refusal of Export from the bar while changes or a draft are pending) are in
// sample-landing.test.js; the served-page request log is sample-served-mode.test.js.
//
// Written before the code (red): each test fails because the page has no `exportBrowserWorkspace`, `importBundleFile`, `openSample`, ... (a "not a function" error
// that names it). The names and shapes this file fixes where the TDD leaves them open (task-009 writes to them):
//   - `startBundleDownload(fileName, text)` returns true when the download was started and false when it could not be (the TDD sentence is the flow's).
//   - `fetchSampleBundle(id)` resolves `{ files: [{ path, bytes }], problem }` (bundle-io.test.js), `bundleFilePicker(onFile)` calls `onFile(file)` later, or never.
//   - the result of an action is a sentence in `landingNotice` while no workspace is open (the card) and in `bundleNotice` while a browser workspace is open (the bar);
//     the sentences are the TDD's: `Exported N files as <name>.` with the skipped sentence after a space, `Nothing to export: this workspace has no YAML file.`,
//     `The download could not be started.`, `The export time could not be saved.`, `The file is not UTF-8 text.`, `The file holds no .archicode.yaml, so it is not a workspace.`,
//     `The file cannot be imported: ` and the first three sentences of the codec, `(and N more)`, `“name” is no longer in this browser.`
//   - `exportBrowserWorkspace(id)`, `exportOpenBrowserWorkspace()`, `importBundleFile(file)`, `chooseBundleFile()`, `openSample(id)`, `askToResetSample()`,
//     `cancelWorkspaceMenuQuestion()` and `confirmResetSample()` are async where they touch the store and resolve when the flow has ended (a flow that loads a workspace
//     resolves when it is loaded). `chooseBundleFile()` calls `bundleFilePicker` synchronously (ASM-4).
//   - state (model/app-state.js): `workspaceMenuOpen`, `workspaceMenuQuestion` (null or 'reset-sample'), `bundleNotice`.
//   - records: `origin` is 'import' for an import and 'sample' with `sample: 'brightcart'` for the sample; the sample workspace is named `Brightcart`.
// Bytes are the page's: no assertion here prints a byte array, and none compares page bytes with a deep-equality assertion or a class test (CON-8); they are compared by
// hash. Run with: node --test src/test/javascript/viewpoint-kernel/bundle-flows.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, fakeIndexedDB } = require('./harness');

const BDB = 'archicode-browser-workspaces';
const SYSTEM = (id, name) =>
  'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: ' + id + '\n  name: ' + name + '\n';
const SAMPLE_FILES = {
  '.archicode.yaml': 'settings:\n  name: Brightcart\n',
  'manifests/app.s1.yaml': SYSTEM('s1', 'S1'),
  'manifests/app.s2.yaml': SYSTEM('s2', 'S2')
};
const SHOP_FILES = {
  '.archicode.yaml': '# A workspace.\nsettings:\n  name: Shop\n',
  'manifests/app.s1.yaml': SYSTEM('s1', 'S1')
};

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value)); // for sentences and lists of text, never for bytes
const encode = (text) => new TextEncoder().encode(text);
const sha = (bytes) => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const shaOfText = (text) => sha(Buffer.from(text, 'utf8'));
const pause = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function recordsOf(workspaces) {
  const out = {};
  for (const w of workspaces) {
    out['workspace:' + w.id] = Object.assign(
      {
        kind: 'workspace',
        id: w.id,
        name: w.name,
        createdAt: 1000,
        openedAt: w.openedAt || 1000,
        lastExportAt: null,
        origin: 'blank'
      },
      w.record || {}
    );
    for (const [file, text] of Object.entries(w.files || SHOP_FILES))
      out['file:' + w.id + '/' + file] = {
        kind: 'file',
        workspace: w.id,
        path: file,
        bytes: encode(text),
        modified: w.modified || 2000
      };
  }
  return out;
}
const seedBrowser = (idb, workspaces) => idb.seed(BDB, 1, { records: recordsOf(workspaces) });
const browserRecords = (idb) => (idb.dump(BDB) || { stores: { records: {} } }).stores.records;
const workspaceRecords = (idb) => Object.values(browserRecords(idb)).filter((r) => r.kind === 'workspace');
const workspaceNames = (idb) =>
  workspaceRecords(idb)
    .map((r) => r.name)
    .sort();
const recordOf = (idb, name) => workspaceRecords(idb).find((r) => r.name === name) || null;
const fileKeys = (idb, id) =>
  Object.keys(browserRecords(idb))
    .filter((key) => key.startsWith('file:' + id + '/'))
    .sort();
const storedBytes = (idb, id, file) => {
  const record = browserRecords(idb)['file:' + id + '/' + file];
  return record ? Buffer.from(record.bytes.buffer, record.bytes.byteOffset, record.bytes.byteLength) : null;
};
const storedText = (idb, id, file) => {
  const bytes = storedBytes(idb, id, file);
  return bytes === null ? null : bytes.toString('utf8');
};
const storedHashes = (idb, id) =>
  Object.fromEntries(
    fileKeys(idb, id).map((key) => [
      key.slice(('file:' + id + '/').length),
      sha(storedBytes(idb, id, key.slice(('file:' + id + '/').length)))
    ])
  );

/** A hash of the whole database, bytes included: two equal hashes are two equal databases, and nothing is printed. */
function fingerprint(idb) {
  const db = idb.dump(BDB);
  if (!db || Object.values(db.stores).every((records) => Object.keys(records).length === 0)) return 'none';
  const text = JSON.stringify(db, (key, value) =>
    ArrayBuffer.isView(value) ? 'bytes:' + sha(Buffer.from(value.buffer, value.byteOffset, value.byteLength)) : value
  );
  return shaOfText(text);
}

const codec = createApp(); // a page of its own, for the bundles the tests expect and the files they unbundle

function bundleTextOf(files) {
  const list = Object.entries(files).map(([file, text]) => ({
    path: file,
    bytes: Uint8Array.from(Buffer.from(text, 'utf8'))
  }));
  const result = codec.bundleWorkspaceFiles(list);
  assert.equal(result.skipped.length, 0, 'the files of the test are all carried');
  return result.text;
}

/** Bytes made in the page's realm, as the page's own code would make them. */
function bytesIn(sandbox, text) {
  const source = Buffer.from(text, 'utf8');
  const bytes = run(sandbox, 'new Uint8Array(' + source.length + ')');
  bytes.set(source);
  return bytes;
}
const listOf = (sandbox, files) =>
  Object.entries(files).map(([file, text]) => ({ path: file, bytes: bytesIn(sandbox, text) }));

/** A page of the editor on `idb`, with the host's File and a navigator.storage stub. */
function page(idb) {
  const sandbox = createApp({ indexedDB: idb, withFile: true });
  sandbox.console.error = () => {};
  return sandbox;
}

/**
 * Replaces the edges. `config.sample`: `{ files }` or `{ problem }`, or a function that gives one; `config.delay`: ms the fetch takes; `config.download`: false for a download
 * that cannot start. The log: `fetches` (ids), `downloads` (`{ fileName, text }`), `pickers` (the `onFile` callbacks), `order` (what happened, in order).
 */
function edges(sandbox, config = {}) {
  const log = { fetches: [], downloads: [], pickers: [], order: [] };
  sandbox.fetchSampleBundle = async (id) => {
    log.fetches.push(id);
    log.order.push('fetch');
    if (config.delay) await pause(config.delay);
    const answer = typeof config.sample === 'function' ? config.sample() : config.sample || { files: SAMPLE_FILES };
    if (answer.problem) return { files: [], problem: answer.problem };
    return { files: listOf(sandbox, answer.files), problem: null };
  };
  sandbox.startBundleDownload = (fileName, text) => {
    log.order.push('download');
    log.downloads.push({ fileName, text });
    return config.download !== false;
  };
  sandbox.bundleFilePicker = (onFile) => {
    log.pickers.push(onFile);
  };
  return log;
}

/** The page after the store was probed and the list read, with its edges replaced. */
async function ready(idb, config) {
  const sandbox = page(idb);
  const log = edges(sandbox, config);
  await sandbox.probeBrowserStore();
  await sandbox.refreshBrowserWorkspaces();
  return { sandbox, log };
}

/** What a file the visitor chose looks like to the page: a name, a size and the bytes. */
function stubFile(content, options = {}) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const file = {
    name: options.name || 'picked.yaml',
    size: options.size === undefined ? bytes.length : options.size,
    reads: 0,
    arrayBuffer: async () => {
      file.reads += 1;
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      return copy.buffer;
    }
  };
  return file;
}

const rename = (sandbox, id, name) =>
  sandbox.commitElementEdit(id, (node) => {
    node.name = name;
    return {};
  });
const manifestText = (sandbox, file) => sandbox.__state().manifestFiles.find((f) => f.relPath === file).rawText;
const openId = (sandbox) => sandbox.__state().folder.browserWorkspace;

test('the flows part exists and names no presentation or composition function and not draftTyped', () => {
  const sandbox = createApp();
  for (const name of [
    'exportBrowserWorkspace',
    'exportOpenBrowserWorkspace',
    'importBundleFile',
    'chooseBundleFile',
    'openSample',
    'askToResetSample',
    'cancelWorkspaceMenuQuestion',
    'confirmResetSample'
  ])
    assert.equal(typeof sandbox[name], 'function', 'the page has no ' + name);
  const root = path.resolve(__dirname, '../../../main/editor');
  const source = fs
    .readFileSync(path.join(root, 'application/bundle-flows.js'), 'utf8')
    .replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, '');
  // every top-level name of the layers above the application (RISK-7): none of them is used by the flows
  const layers = JSON.parse(fs.readFileSync(path.join(root, 'layers.json'), 'utf8'));
  const parts = (layers.parts || layers.files || []).map((part) => (typeof part === 'string' ? { file: part } : part));
  const upper = new Set();
  for (const part of parts) {
    const file = part.file || part.path || part.name;
    if (!/^(presentation|composition)\//.test(file)) continue;
    const text = fs.readFileSync(path.join(root, file), 'utf8');
    for (const match of text.matchAll(/^(?:async\s+)?function\s+(\w+)|^(?:let|var)\s+(\w+)/gm))
      upper.add(match[1] || match[2]);
  }
  assert.ok(upper.size > 100, 'the names of the upper layers were read');
  assert.ok(!upper.has('openSample') && !upper.has('exportBrowserWorkspace'), 'the flows are not in an upper layer');
  const used = Array.from(upper).filter((name) => new RegExp('(?<![\\w.])' + name + '(?!\\w)').test(source));
  assert.deepEqual(used, [], 'bundle-flows.js uses names of presentation or composition');
  assert.doesNotMatch(source, /\bdraftTyped\b/);
});

// ---- Export (FLOW-1, DEC-4) ----

test('export: the bytes are the bundle of the stored files, the file is named after the workspace, the time is recorded and the sentence says what was exported', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Corner Shop' }]);
  const { sandbox, log } = await ready(idb);
  const filesBefore = storedHashes(idb, 'bw-a');
  const before = Date.now();
  await sandbox.exportBrowserWorkspace('bw-a');

  assert.equal(log.downloads.length, 1);
  assert.equal(log.downloads[0].fileName, 'corner-shop-bundle.yaml');
  assert.equal(shaOfText(log.downloads[0].text), shaOfText(bundleTextOf(SHOP_FILES)), 'the bundle of the stored files');
  assert.equal(recordOf(idb, 'Corner Shop').lastExportAt >= before, true, 'the time of the export is recorded');
  assert.equal(run(sandbox, 'landingNotice'), 'Exported 2 files as corner-shop-bundle.yaml.');
  assert.equal(JSON.stringify(storedHashes(idb, 'bw-a')), JSON.stringify(filesBefore), 'no stored file changed');
  assert.equal(run(sandbox, 'bundleNotice'), null, 'the card has the sentence, not the bar');
  assert.equal(
    run(sandbox, 'browserWorkspaces').find((w) => w.id === 'bw-a').lastExportAt > 0,
    true,
    'the list was read again'
  );
});

test('export: the download is recorded after it started, and from the open workspace the sentence is the bar’s', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox, log } = await ready(idb);
  await sandbox.openBrowserWorkspace('bw-a');
  await sandbox.exportOpenBrowserWorkspace();
  assert.equal(log.downloads.length, 1);
  assert.equal(log.downloads[0].fileName, 'shop-bundle.yaml');
  assert.equal(run(sandbox, 'bundleNotice'), 'Exported 2 files as shop-bundle.yaml.');
  assert.equal(run(sandbox, 'landingNotice'), null);
  assert.equal(typeof recordOf(idb, 'Shop').lastExportAt, 'number');
});

test('export: a file the bundle cannot carry is left out and the sentence says which and why', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop', files: Object.assign({ 'docs/notes.md': 'not yaml\n' }, SHOP_FILES) }]);
  const { sandbox, log } = await ready(idb);
  await sandbox.exportBrowserWorkspace('bw-a');
  assert.equal(shaOfText(log.downloads[0].text), shaOfText(bundleTextOf(SHOP_FILES)), 'the markdown file is not in it');
  assert.equal(
    run(sandbox, 'landingNotice'),
    'Exported 2 files as shop-bundle.yaml. 1 file was not exported: `docs/notes.md` (not YAML)'
  );
  assert.equal(storedText(idb, 'bw-a', 'docs/notes.md'), 'not yaml\n', 'it is still in the workspace');
});

test('export: a workspace with no YAML file downloads nothing, says so and records no time', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Empty', files: {} }]);
  const { sandbox, log } = await ready(idb);
  await sandbox.exportBrowserWorkspace('bw-a');
  assert.equal(log.downloads.length, 0);
  assert.equal(run(sandbox, 'landingNotice'), 'Nothing to export: this workspace has no YAML file.');
  assert.equal(recordOf(idb, 'Empty').lastExportAt, null);
});

test('export: a workspace deleted in another tab is the sentence of W-4, with no download and nothing written', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox, log } = await ready(idb);
  const { sandbox: other } = await ready(idb);
  await other.deleteBrowserWorkspace('bw-a');
  const before = fingerprint(idb);
  await sandbox.exportBrowserWorkspace('bw-a');
  assert.equal(log.downloads.length, 0);
  assert.equal(run(sandbox, 'landingNotice'), '“Shop” is no longer in this browser.');
  assert.equal(fingerprint(idb), before, 'no record was written');
});

test('export: a store that fails to read says its sentence, downloads nothing and records no time', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox, log } = await ready(idb);
  sandbox.readBrowserWorkspaceFiles = async () => {
    throw new Error('the disk is on fire');
  };
  const before = fingerprint(idb);
  await sandbox.exportBrowserWorkspace('bw-a');
  assert.equal(log.downloads.length, 0);
  assert.match(String(run(sandbox, 'landingNotice')), /the disk is on fire/);
  assert.equal(fingerprint(idb), before);
});

test('export: a download that cannot start says so and records no export time', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox } = await ready(idb, { download: false });
  await sandbox.exportBrowserWorkspace('bw-a');
  assert.equal(run(sandbox, 'landingNotice'), 'The download could not be started.');
  assert.equal(recordOf(idb, 'Shop').lastExportAt, null);
});

test('export: when the time cannot be saved after the download started, the download stands and the sentence adds it', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox, log } = await ready(idb);
  sandbox.markBrowserExport = async () => {
    throw new Error('no room left');
  };
  await sandbox.exportBrowserWorkspace('bw-a');
  assert.equal(log.downloads.length, 1);
  assert.match(
    String(run(sandbox, 'landingNotice')),
    /^Exported 2 files as shop-bundle\.yaml\..*The export time could not be saved\./
  );
});

// ---- Import (FLOW-2, DEC-5) ----

const ORCHARD = { '.archicode.yaml': 'settings:\n  name: Orchard\n', 'manifests/app.s1.yaml': SYSTEM('s1', 'S1') };

test('import: a bundle becomes a new workspace named by its settings, opened, with every file as it was written', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb);
  await sandbox.importBundleFile(stubFile(bundleTextOf(ORCHARD)));
  assert.deepEqual(workspaceNames(idb), ['Orchard']);
  const record = recordOf(idb, 'Orchard');
  assert.equal(record.origin, 'import');
  assert.equal(record.lastExportAt, null);
  assert.equal(openId(sandbox), record.id, 'it is open');
  assert.ok(sandbox.__state().workspace, 'and loaded');
  for (const [file, text] of Object.entries(ORCHARD))
    assert.equal(shaOfText(storedText(idb, record.id, file)), shaOfText(text), file);
  assert.equal(fileKeys(idb, record.id).length, 2);
  assert.equal(run(sandbox, 'landingNotice'), null);
});

test('import: a name that is taken gets a number, and the workspace with that name is never written to', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'Orchard', files: SHOP_FILES },
    { id: 'bw-b', name: 'Orchard 2', files: SHOP_FILES }
  ]);
  const { sandbox } = await ready(idb);
  const mine = JSON.stringify([storedHashes(idb, 'bw-a'), storedHashes(idb, 'bw-b')]);
  await sandbox.importBundleFile(stubFile(bundleTextOf(ORCHARD)));
  assert.deepEqual(workspaceNames(idb), ['Orchard', 'Orchard 2', 'Orchard 3']);
  assert.equal(
    JSON.stringify([storedHashes(idb, 'bw-a'), storedHashes(idb, 'bw-b')]),
    mine,
    'the others are as they were'
  );
  assert.equal(recordOf(idb, 'Orchard 3').origin, 'import');
});

test('import: a name taken by another tab between the list and the create gets the next free number', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb);
  const { sandbox: other } = await ready(idb);
  const real = sandbox.createBrowserWorkspace;
  let calls = 0;
  sandbox.createBrowserWorkspace = async (options) => {
    if (calls++ === 0)
      await other.createBrowserWorkspace({ name: 'Orchard', files: listOf(other, SHOP_FILES), origin: 'blank' });
    return real(options);
  };
  await sandbox.importBundleFile(stubFile(bundleTextOf(ORCHARD)));
  assert.deepEqual(workspaceNames(idb), ['Orchard', 'Orchard 2']);
  assert.equal(storedText(idb, recordOf(idb, 'Orchard').id, 'manifests/app.s1.yaml'), SYSTEM('s1', 'S1'));
  assert.equal(openId(sandbox), recordOf(idb, 'Orchard 2').id);
});

test('import: with no settings.name, or one that is no valid name, or a root file that does not parse, the name is the file name without its extension', async () => {
  const cases = [
    [{ '.archicode.yaml': 'settings: {}\n' }, 'orchard-copy.yaml', 'orchard-copy'],
    [{ '.archicode.yaml': 'settings:\n  name: ' + JSON.stringify('x'.repeat(81)) + '\n' }, 'long.yml', 'long'],
    [{ '.archicode.yaml': 'settings:\n  name: "two\\nlines"\n' }, 'lines.yaml', 'lines'],
    [{ '.archicode.yaml': 'settings: [unclosed\n' }, 'broken.yaml', 'broken'],
    [{ '.archicode.yaml': 'settings: {}\n' }, '.yaml', 'Imported workspace']
  ];
  for (const [files, fileName, expected] of cases) {
    const idb = fakeIndexedDB();
    const { sandbox } = await ready(idb);
    await sandbox.importBundleFile(stubFile(bundleTextOf(files), { name: fileName }));
    assert.deepEqual(workspaceNames(idb), [expected], fileName);
  }
});

test('import: every refusal says its sentence and creates and changes nothing', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox } = await ready(idb);
  const before = fingerprint(idb);
  const refuse = async (file) => {
    await sandbox.importBundleFile(file);
    assert.equal(fingerprint(idb), before, 'nothing was stored');
    assert.equal(sandbox.__state().folder, null, 'nothing was opened');
    return String(run(sandbox, 'landingNotice'));
  };
  const big = stubFile('x', { size: run(sandbox, 'BUNDLE_MAX_BYTES') + 1 });
  const bigSentence = await refuse(big);
  assert.equal(big.reads, 0, 'a file over the limit is not read');
  assert.equal(
    bigSentence,
    (await sandbox.readBundleFile(stubFile('x', { size: run(sandbox, 'BUNDLE_MAX_BYTES') + 1 }))).problem
  );

  assert.equal(await refuse(stubFile(Buffer.from([0x2d, 0x2d, 0x2d, 0xff, 0xfe]))), 'The file is not UTF-8 text.');
  assert.match(await refuse(stubFile('just some text\n')), /^The file cannot be imported: .*the bundle holds no file$/);
  assert.equal(
    await refuse(stubFile(bundleTextOf({ 'manifests/app.s1.yaml': SYSTEM('s1', 'S1') }))),
    'The file holds no .archicode.yaml, so it is not a workspace.'
  );
});

test('import: the sentence of the codec lists the first three problems and how many more', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb);
  const bad = ['../a.yaml', '/b.yaml', 'c\\d.yaml', 'e.txt', '.hidden/f.yaml']
    .map((file) => '--- # file: ' + file + '\na: 1\n')
    .join('');
  await sandbox.importBundleFile(stubFile(bad));
  const sentence = String(run(sandbox, 'landingNotice'));
  assert.match(sentence, /^The file cannot be imported: /);
  assert.match(sentence, / \(and 2 more\)$/);
  assert.equal(sentence.split('; ').length, 3, 'three sentences');
  assert.deepEqual(workspaceNames(idb), []);
});

test('import: a store that fails leaves no workspace and says so', async () => {
  const idb = fakeIndexedDB({ failPut: (key) => String(key).startsWith('file:') });
  const { sandbox } = await ready(idb);
  await sandbox.importBundleFile(stubFile(bundleTextOf(ORCHARD)));
  assert.deepEqual(workspaceNames(idb), []);
  assert.deepEqual(Object.keys(browserRecords(idb)), []);
  assert.match(String(run(sandbox, 'landingNotice')), /\S/);
  assert.equal(sandbox.__state().folder, null);
});

test('chooseBundleFile asks the picker at once, in the turn of the click, and does nothing until a file is chosen', async () => {
  const idb = fakeIndexedDB();
  const { sandbox, log } = await ready(idb);
  const before = fingerprint(idb);
  sandbox.chooseBundleFile(); // not awaited: the picker is called before any await
  assert.equal(log.pickers.length, 1, 'bundleFilePicker was called synchronously');
  assert.equal(typeof log.pickers[0], 'function');
  await pause(20);
  assert.equal(fingerprint(idb), before, 'a picker that is cancelled changes nothing');
  await log.pickers[0](stubFile(bundleTextOf(ORCHARD)));
  assert.deepEqual(workspaceNames(idb), ['Orchard']);
});

// ---- export, delete, import ----

async function roundTrip(files, name) {
  const idb = fakeIndexedDB();
  const { sandbox, log } = await ready(idb);
  const created = plain(await sandbox.createBrowserWorkspace({ name, files: listOf(sandbox, files), origin: 'blank' }));
  await sandbox.refreshBrowserWorkspaces();
  const sent = storedHashes(idb, created.id);
  await sandbox.exportBrowserWorkspace(created.id);
  assert.equal(log.downloads.length, 1);
  await sandbox.deleteBrowserWorkspace(created.id);
  assert.deepEqual(fileKeys(idb, created.id), [], 'the workspace is gone');
  await sandbox.refreshBrowserWorkspaces();
  await sandbox.importBundleFile(stubFile(log.downloads[0].text));
  const back = recordOf(idb, name);
  assert.ok(back, 'the workspace is back under its name');
  assert.notEqual(back.id, created.id, 'as a new workspace');
  assert.equal(JSON.stringify(storedHashes(idb, back.id)), JSON.stringify(sent), 'every file has the bytes it had');
}

test('export, delete, import gives every file back byte for byte, with a byte-order mark, CRLF and a --- inside a file', async () => {
  await roundTrip(
    {
      '.archicode.yaml': 'settings:\n  name: Round\n',
      'manifests/app.a.yaml': '﻿id: a\r\nnote: x\r\n',
      'manifests/app.b.yaml': 'one: 1\n---\ntwo: 2\n',
      'manifests/deep/er/app.c.yaml': 'no final newline'
    },
    'Round'
  );
});

test('export, delete, import gives the sample back byte for byte', async () => {
  const text = fs.readFileSync(
    path.resolve(__dirname, '../../../main/resources/editor-webapp/samples/brightcart.yaml'),
    'utf8'
  );
  const unbundled = codec.unbundleWorkspaceFiles(text);
  assert.equal(unbundled.problems.length, 0);
  const files = {};
  for (const file of unbundled.files) files[file.path] = Buffer.from(file.bytes).toString('utf8');
  await roundTrip(files, 'Brightcart');
});

// ---- Open the sample (FLOW-3, DEC-6) ----

test('open sample: the first time it fetches, creates Brightcart with its origin and sample, and opens it', async () => {
  const idb = fakeIndexedDB();
  const { sandbox, log } = await ready(idb);
  await sandbox.openSample('brightcart');
  assert.deepEqual(log.fetches, ['brightcart']);
  assert.deepEqual(workspaceNames(idb), ['Brightcart']);
  const record = recordOf(idb, 'Brightcart');
  assert.equal(record.origin, 'sample');
  assert.equal(record.sample, 'brightcart');
  assert.equal(openId(sandbox), record.id);
  assert.ok(sandbox.__state().workspace, 'loaded');
  for (const [file, text] of Object.entries(SAMPLE_FILES))
    assert.equal(shaOfText(storedText(idb, record.id, file)), shaOfText(text), file);
  assert.equal(
    run(sandbox, 'browserWorkspaces').find((w) => w.id === record.id).sample,
    'brightcart',
    'the list carries it'
  );
});

test('open sample: the second time it opens the same workspace with the changes, and fetches nothing', async () => {
  const idb = fakeIndexedDB();
  const { sandbox, log } = await ready(idb);
  await sandbox.openSample('brightcart');
  rename(sandbox, 's1', 'Edited');
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus.state'), 'success');
  const first = openId(sandbox);

  const { sandbox: later, log: laterLog } = await ready(idb); // another visit
  await later.openSample('brightcart');
  assert.equal(laterLog.fetches.length, 0, 'nothing is fetched for a workspace that exists');
  assert.equal(log.fetches.length, 1);
  assert.deepEqual(workspaceNames(idb), ['Brightcart'], 'one workspace');
  assert.equal(openId(later), first);
  assert.ok(manifestText(later, 'manifests/app.s1.yaml').includes('Edited'), 'with the change');
});

test('open sample: it is found by its sample property and not by its name, even renamed', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    { id: 'bw-a', name: 'My copy', files: SAMPLE_FILES, record: { origin: 'sample', sample: 'brightcart' } },
    { id: 'bw-b', name: 'Brightcart', files: SHOP_FILES }
  ]);
  const { sandbox, log } = await ready(idb);
  await sandbox.openSample('brightcart');
  assert.equal(log.fetches.length, 0);
  assert.equal(openId(sandbox), 'bw-a', 'not the workspace that is merely named Brightcart');
  assert.deepEqual(workspaceNames(idb), ['Brightcart', 'My copy']);
});

test('open sample: when several workspaces are the sample, the one changed last is opened', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [
    {
      id: 'bw-a',
      name: 'Brightcart',
      files: SAMPLE_FILES,
      modified: 2000,
      record: { origin: 'sample', sample: 'brightcart' }
    },
    {
      id: 'bw-b',
      name: 'Brightcart 2',
      files: SAMPLE_FILES,
      modified: 9000,
      record: { origin: 'sample', sample: 'brightcart' }
    }
  ]);
  const { sandbox } = await ready(idb);
  await sandbox.openSample('brightcart');
  assert.equal(openId(sandbox), 'bw-b');
});

test('open sample: two calls at once, in one page or in two tabs, end with one workspace', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb, { delay: 20 });
  await Promise.all([sandbox.openSample('brightcart'), sandbox.openSample('brightcart')]);
  assert.deepEqual(workspaceNames(idb), ['Brightcart']);
  assert.equal(openId(sandbox), recordOf(idb, 'Brightcart').id);

  const second = fakeIndexedDB();
  const { sandbox: a } = await ready(second, { delay: 20 });
  const { sandbox: b } = await ready(second, { delay: 20 });
  await Promise.all([a.openSample('brightcart'), b.openSample('brightcart')]);
  assert.deepEqual(workspaceNames(second), ['Brightcart'], 'two tabs, one workspace');
  assert.equal(openId(a), openId(b));
});

test('open sample: a sample that appears between the list and the create is the one that is opened', async () => {
  const idb = fakeIndexedDB();
  const { sandbox } = await ready(idb);
  const { sandbox: other } = await ready(idb);
  const real = sandbox.createBrowserWorkspace;
  let calls = 0;
  sandbox.createBrowserWorkspace = async (options) => {
    if (calls++ === 0)
      await other.createBrowserWorkspace({
        name: 'Brightcart',
        files: listOf(other, SAMPLE_FILES),
        origin: 'sample',
        sample: 'brightcart'
      });
    return real(options);
  };
  await sandbox.openSample('brightcart');
  assert.deepEqual(workspaceNames(idb), ['Brightcart'], 'not duplicated');
  assert.equal(openId(sandbox), recordOf(idb, 'Brightcart').id);
});

test('open sample: a workspace of the visitor named Brightcart is left alone and the sample is created as Brightcart 2', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Brightcart', files: SHOP_FILES }]);
  const { sandbox } = await ready(idb);
  const mine = JSON.stringify(storedHashes(idb, 'bw-a'));
  await sandbox.openSample('brightcart');
  assert.deepEqual(workspaceNames(idb), ['Brightcart', 'Brightcart 2']);
  assert.equal(recordOf(idb, 'Brightcart 2').sample, 'brightcart');
  assert.equal(recordOf(idb, 'Brightcart').sample, undefined);
  assert.equal(JSON.stringify(storedHashes(idb, 'bw-a')), mine, 'the visitor’s workspace is as it was');
  assert.equal(openId(sandbox), recordOf(idb, 'Brightcart 2').id);
});

test('open sample: a fetch that fails leaves the list as it was and says the sentence of the edge', async () => {
  const idb = fakeIndexedDB();
  seedBrowser(idb, [{ id: 'bw-a', name: 'Shop' }]);
  const sentence =
    'The Brightcart sample could not be loaded: the server answered 404. Check your connection and try again.';
  const { sandbox } = await ready(idb, { sample: { problem: sentence } });
  const before = fingerprint(idb);
  await sandbox.openSample('brightcart');
  assert.equal(fingerprint(idb), before);
  assert.equal(run(sandbox, 'landingNotice'), sentence);
  assert.equal(run(sandbox, 'landingBusy'), null, 'the card is not left busy');
  assert.equal(sandbox.__state().folder, null);
});

// ---- Reset (FLOW-4, DEC-6) ----

/** A page with the sample open, one more file in the store, an export time and one edit not saved. */
async function sampleWithWork(config) {
  const idb = fakeIndexedDB(config && config.idb);
  const { sandbox, log } = await ready(idb, config);
  await sandbox.openSample('brightcart');
  const id = openId(sandbox);
  const writable = await (
    await (
      await sandbox.browserDirectoryHandle(id, '', 'Brightcart').getDirectoryHandle('manifests')
    ).getFileHandle('extra.yaml', { create: true })
  ).createWritable();
  await writable.write('extra: 1\n');
  await writable.close();
  await sandbox.markBrowserExport(id, 5000);
  rename(sandbox, 's1', 'Edited');
  assert.ok(sandbox.hasUnsavedChanges());
  return { idb, sandbox, log, id };
}

test('reset: asking opens the question and Cancel closes it with nothing written; a workspace that is not the sample has no question', async () => {
  const { idb, sandbox, id } = await sampleWithWork();
  const before = fingerprint(idb);
  sandbox.askToResetSample();
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), 'reset-sample');
  assert.equal(fingerprint(idb), before, 'asking writes nothing');
  sandbox.cancelWorkspaceMenuQuestion();
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), null);
  assert.equal(fingerprint(idb), before);
  assert.equal(openId(sandbox), id);
  assert.ok(sandbox.hasUnsavedChanges(), 'the edit is still there');

  const plainIdb = fakeIndexedDB();
  seedBrowser(plainIdb, [{ id: 'bw-a', name: 'Shop' }]);
  const { sandbox: shop } = await ready(plainIdb);
  await shop.openBrowserWorkspace('bw-a');
  shop.askToResetSample();
  assert.equal(run(shop, 'workspaceMenuQuestion'), null, 'there is no sample to reset to');
});

test('reset: the sample is fetched first, then the files are replaced in one go, and the record is the same one', async () => {
  const { idb, sandbox, log, id } = await sampleWithWork();
  const before = recordOf(idb, 'Brightcart');
  await pause(5);
  const realReplace = sandbox.replaceBrowserWorkspaceFiles;
  sandbox.replaceBrowserWorkspaceFiles = (...args) => {
    log.order.push('replace');
    return realReplace(...args);
  };
  log.order.length = 0;
  sandbox.askToResetSample();
  await sandbox.confirmResetSample();

  assert.deepEqual(log.order, ['fetch', 'replace'], 'the sample is fetched before anything is replaced');
  assert.equal(
    JSON.stringify(Object.keys(storedHashes(idb, id))),
    JSON.stringify(Object.keys(SAMPLE_FILES).sort()),
    'the extra file is gone'
  );
  for (const [file, text] of Object.entries(SAMPLE_FILES))
    assert.equal(shaOfText(storedText(idb, id, file)), shaOfText(text), file);
  const after = recordOf(idb, 'Brightcart');
  for (const key of ['id', 'name', 'createdAt', 'lastExportAt', 'origin', 'sample'])
    assert.equal(after[key], before[key], key + ' is kept');
  assert.equal(after.lastExportAt, 5000);
  assert.equal(after.openedAt >= before.openedAt, true);
  assert.equal(workspaceNames(idb).length, 1);
  // the page starts again on the same workspace, without the edit that was lost
  assert.equal(openId(sandbox), id);
  assert.ok(sandbox.__state().workspace, 'loaded again');
  assert.equal(sandbox.hasUnsavedChanges(), false);
  assert.ok(!manifestText(sandbox, 'manifests/app.s1.yaml').includes('Edited'));
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), null);
  assert.equal(run(sandbox, 'workspaceMenuOpen'), false);
});

test('reset: a fetch that fails writes nothing, keeps the question and says the sentence', async () => {
  let answer = { files: SAMPLE_FILES };
  const { idb, sandbox, log, id } = await sampleWithWork({ sample: () => answer });
  const sentence = 'The Brightcart sample could not be loaded: offline. Check your connection and try again.';
  answer = { problem: sentence };
  const before = fingerprint(idb);
  const replace = sandbox.replaceBrowserWorkspaceFiles;
  let replaced = 0;
  sandbox.replaceBrowserWorkspaceFiles = (...args) => {
    replaced += 1;
    return replace(...args);
  };
  sandbox.askToResetSample();
  await sandbox.confirmResetSample();
  assert.equal(replaced, 0, 'nothing was replaced');
  assert.equal(fingerprint(idb), before);
  assert.equal(run(sandbox, 'workspaceMenuQuestion'), 'reset-sample', 'the question stays');
  assert.equal(run(sandbox, 'bundleNotice'), sentence);
  assert.equal(openId(sandbox), id);
  assert.ok(sandbox.hasUnsavedChanges(), 'and so does the edit');
  assert.equal(log.fetches.length, 2);
});

test('reset: a transaction that fails keeps the old files', async () => {
  let failing = false;
  const { idb, sandbox, id } = await sampleWithWork({
    idb: { failPut: (key) => failing && String(key).startsWith('file:') }
  });
  const before = fingerprint(idb);
  const files = JSON.stringify(storedHashes(idb, id));
  failing = true;
  sandbox.askToResetSample();
  await sandbox.confirmResetSample();
  failing = false;
  assert.equal(fingerprint(idb), before, 'not a byte changed');
  assert.equal(JSON.stringify(storedHashes(idb, id)), files);
  assert.equal(typeof run(sandbox, 'bundleNotice'), 'string');
  assert.ok(String(run(sandbox, 'bundleNotice')).length > 0);
  assert.ok(sandbox.hasUnsavedChanges(), 'the edit is still there');
});

test('reset: a workspace deleted in another tab is not written to and not created again', async () => {
  const { idb, sandbox, id } = await sampleWithWork();
  const { sandbox: other } = await ready(idb);
  await other.deleteBrowserWorkspace(id);
  const before = fingerprint(idb);
  sandbox.askToResetSample();
  await sandbox.confirmResetSample();
  assert.equal(fingerprint(idb), before, 'no record, no file');
  assert.match(String(run(sandbox, 'bundleNotice')), /no longer in this browser/);
});

test('reset: the save of another tab that had the workspace open with edits meets the stale check and shows the conflict (RISK-4)', async () => {
  const idb = fakeIndexedDB();
  const { sandbox: a } = await ready(idb);
  await a.openSample('brightcart');
  const { sandbox: b } = await ready(idb);
  await b.openSample('brightcart');
  rename(b, 's1', 'Edited in the other tab');
  await pause(5); // the stale check reads the time of the file
  a.askToResetSample();
  await a.confirmResetSample();

  await b.saveAllChanges();
  const status = plain(run(b, 'saveStatus'));
  assert.equal(status.state, 'conflict');
  assert.deepEqual(Array.from(status.conflicts), ['manifests/app.s1.yaml']);
  assert.equal(
    storedText(idb, openId(a), 'manifests/app.s1.yaml'),
    SAMPLE_FILES['manifests/app.s1.yaml'],
    'what the reset wrote is still there'
  );
});
