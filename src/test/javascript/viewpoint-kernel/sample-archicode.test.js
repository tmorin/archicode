'use strict';
// Wave 029 (the model of ArchiCode as a second sample of the hosted editor): the committed sample is the bundle of `docs/architecture` made by the
// page's codec, it carries every file of the folder and skips none, it unbundles to the same bytes, and the editor opens it as a workspace.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const MODEL = path.join(REPO, 'docs/architecture');
const SAMPLE = path.join(REPO, 'src/main/resources/editor-webapp/samples/archicode.yaml');

const sha = (bytes) => crypto.createHash('sha256').update(bytes).digest('hex');

function filesOf(folder, relative, found) {
  const entries = fs.readdirSync(path.join(folder, relative), { withFileTypes: true });
  for (const e of entries) {
    const rel = relative === '' ? e.name : relative + '/' + e.name;
    if (e.isDirectory()) filesOf(folder, rel, found);
    else if (e.isFile()) found.push({ path: rel, bytes: new Uint8Array(fs.readFileSync(path.join(folder, rel))) });
  }
  return found;
}

test('the committed sample is the bundle of docs/architecture, with every file carried and none skipped', () => {
  const sandbox = createApp();
  const files = filesOf(MODEL, '', []);
  assert.ok(
    files.some((f) => f.path === '.archicode.yaml'),
    'the workspace file is part of the model'
  );
  const bundle = sandbox.bundleWorkspaceFiles(files);
  assert.equal(bundle.skipped.length, 0);
  assert.deepEqual(Array.from(bundle.carried, (f) => f.path).sort(), files.map((f) => f.path).sort());
  assert.equal(
    sha(Buffer.from(bundle.text, 'utf8')),
    sha(fs.readFileSync(SAMPLE)),
    'the sample is stale: run `npm run sample:build`'
  );
});

test('the unbundled sample equals the files of docs/architecture, one by one, by hash', () => {
  const sandbox = createApp();
  const unbundled = sandbox.unbundleWorkspaceFiles(fs.readFileSync(SAMPLE, 'utf8'));
  assert.deepEqual(Array.from(unbundled.problems), []);
  const expected = new Map(filesOf(MODEL, '', []).map((f) => [f.path, sha(f.bytes)]));
  const got = new Map(Array.from(unbundled.files, (f) => [f.path, sha(Buffer.from(f.bytes))]));
  assert.deepEqual(Array.from(got.keys()).sort(), Array.from(expected.keys()).sort());
  for (const [file, hash] of expected) assert.equal(got.get(file), hash, file);
});
