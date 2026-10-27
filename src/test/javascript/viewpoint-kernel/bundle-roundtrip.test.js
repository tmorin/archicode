'use strict';
// The workspace bundle (run 0191, wave 025): every folder under `src` that holds a `.archicode.yaml` (the rule of scripts/byte-identity.sh) is read
// whole, bundled, and unbundled; the files the bundle carries come back with the same paths and the same bytes. What it skips is exactly the files
// that are not YAML and the hidden ones (the workspace file of a nested workspace included), and no two paths of one folder differ only by case.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');

const ROOT = path.resolve(__dirname, '..', '..', '..', '..');
const SRC = path.join(ROOT, 'src');
const MINIMUM_FOLDERS = 20;
const YAML_NAME = /\.(ya?ml)$/;

/** Every folder under `src` that holds a `.archicode.yaml`, sorted by path. */
function workspaceFolders(dir, found) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  if (entries.some((e) => e.name === '.archicode.yaml' && e.isFile())) found.push(dir);
  for (const e of entries) {
    if (e.isDirectory() && e.name !== 'node_modules') workspaceFolders(path.join(dir, e.name), found);
  }
  return found;
}

/** The files of a folder, recursively, files only, with relative paths that use `/`, in the order of the walk. */
function filesOf(folder, relative, found) {
  const entries = fs.readdirSync(path.join(folder, relative), { withFileTypes: true });
  entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0));
  for (const e of entries) {
    const rel = relative === '' ? e.name : relative + '/' + e.name;
    if (e.isDirectory()) filesOf(folder, rel, found);
    else if (e.isFile()) found.push({ path: rel, bytes: new Uint8Array(fs.readFileSync(path.join(folder, rel))) });
  }
  return found;
}

/** What the bundle must carry: a YAML name and no hidden segment, but for the workspace file at the root. */
function isCarried(p) {
  if (p === '.archicode.yaml') return true;
  return YAML_NAME.test(p) && !p.split('/').some((segment) => segment.startsWith('.'));
}

const sandbox = createApp();
const FOLDERS = workspaceFolders(SRC, []);

test('at least ' + MINIMUM_FOLDERS + ' shipped workspace folders are found', () => {
  console.log('bundle round trip: ' + FOLDERS.length + ' folders found under src');
  assert.ok(FOLDERS.length >= MINIMUM_FOLDERS, 'found ' + FOLDERS.length + ' folders');
});

for (const folder of FOLDERS) {
  const name = path.relative(ROOT, folder);

  test('the bundle of ' + name + ' gives back the files it carries, byte for byte', () => {
    const files = filesOf(folder, '', []);
    const bundle = sandbox.bundleWorkspaceFiles(files);
    const expectedCarried = files.filter((f) => isCarried(f.path)).map((f) => f.path);
    const expectedSkipped = files.filter((f) => !isCarried(f.path)).map((f) => f.path);
    // paths only: `carried` holds { path, bytes }, and a failed assertion on the bytes (another realm's Uint8Array) would be printed key by key
    assert.deepEqual(Array.from(bundle.carried, (c) => c.path).sort(), expectedCarried.slice().sort());
    assert.deepEqual(
      Array.from(bundle.skipped, (s) => s.path).sort(),
      expectedSkipped.slice().sort(),
      'skipped is only the non-YAML and the hidden files'
    );
    assert.ok(bundle.carried.length > 0, 'the workspace file is carried');

    const read = sandbox.unbundleWorkspaceFiles(bundle.text);
    assert.deepEqual(Array.from(read.problems), []);
    const byPath = new Map(files.map((f) => [f.path, f]));
    assert.deepEqual(Array.from(read.files, (f) => f.path).sort(), expectedCarried.slice().sort());
    for (const f of read.files) {
      assert.equal(
        Buffer.compare(Buffer.from(f.bytes), Buffer.from(byPath.get(f.path).bytes)),
        0,
        'the bytes of ' + f.path
      );
    }
  });

  test('the bundle of ' + name + ' is the same text whatever the order of the files', () => {
    const files = filesOf(folder, '', []);
    const forward = sandbox.bundleWorkspaceFiles(files).text;
    const backward = sandbox.bundleWorkspaceFiles(files.slice().reverse()).text;
    assert.equal(backward, forward);
  });

  test('no two paths of ' + name + ' differ only by case', () => {
    const seen = new Map();
    for (const f of filesOf(folder, '', [])) {
      const lower = f.path.toLowerCase();
      assert.ok(!seen.has(lower), f.path + ' and ' + seen.get(lower) + ' differ only by case');
      seen.set(lower, f.path);
    }
  });
}
