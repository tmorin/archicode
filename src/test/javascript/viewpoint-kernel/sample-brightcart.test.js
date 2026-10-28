'use strict';
// Run 0193 (wave 025, W-5, task 002), TG-1, REQ-3, REQ-4 and DEC-10: the committed Brightcart sample is the bundle of the fixture folder made by the page's codec, the
// files it holds are the 61 files of the fixture by hash, and the address the site links to draws the plateau `marketplace` compared with its past.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { run, startPage } = require('./library-page');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const FIXTURE = path.join(REPO, 'src/test/resources/brightcart/layered');
const SAMPLE = path.join(REPO, 'src/main/resources/editor-webapp/samples/brightcart.yaml');
const ADDRESS = '#/timeline/applications?plateau=marketplace&compare=past&sample=brightcart';

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

test('the committed sample is the bundle of the fixture, and the bundle carries all 61 files and skips none', () => {
  const sandbox = createApp();
  const files = filesOf(FIXTURE, '', []);
  assert.equal(files.length, 61);
  const bundle = sandbox.bundleWorkspaceFiles(files);
  assert.equal(bundle.skipped.length, 0);
  assert.equal(bundle.carried.length, 61);
  assert.deepEqual(Array.from(bundle.carried, (f) => f.path).sort(), files.map((f) => f.path).sort());
  assert.equal(
    sha(Buffer.from(bundle.text, 'utf8')),
    sha(fs.readFileSync(SAMPLE)),
    'the sample is stale: run `npm run sample:build`'
  );
});

test('the unbundled sample equals the files of the fixture, one by one, by hash', () => {
  const sandbox = createApp();
  const unbundled = sandbox.unbundleWorkspaceFiles(fs.readFileSync(SAMPLE, 'utf8'));
  assert.deepEqual(Array.from(unbundled.problems), []);
  const expected = new Map(filesOf(FIXTURE, '', []).map((f) => [f.path, sha(f.bytes)]));
  const got = new Map(Array.from(unbundled.files, (f) => [f.path, sha(Buffer.from(f.bytes))]));
  assert.equal(got.size, 61);
  assert.deepEqual(Array.from(got.keys()).sort(), Array.from(expected.keys()).sort());
  for (const [file, hash] of expected) assert.equal(got.get(file), hash, file);
});

test('the address of the site button draws marketplace compared with inhouse, with changes and a diagram', async () => {
  const sandbox = createApp();
  const unbundled = sandbox.unbundleWorkspaceFiles(fs.readFileSync(SAMPLE, 'utf8'));
  const only = {};
  for (const f of unbundled.files) only[f.path] = Buffer.from(f.bytes).toString('utf8');
  const page = await startPage({ only });
  const app = page.sandbox;
  assert.equal(page.state.fatalError, null);
  assert.equal(run(app, 'AppState.plateauTree.ids.length'), 4);
  app.location.hash = ADDRESS;
  for (const fn of app.__windowListeners.hashchange) fn();
  await page.show();
  assert.equal(page.state.layers.current, 'marketplace');
  assert.equal(page.state.layers.compare.mode, 'past');
  assert.equal(page.state.layers.compare.other, 'inhouse');
  assert.ok(app.comparisonState().changes.length > 0, 'the comparison has changes');
  const scene = page.scene();
  assert.ok(scene && scene.html, 'a diagram is drawn');
  const boxes = (scene.html.match(/<g class="dg-node/g) || []).length;
  const links = (scene.html.match(/<g class="dg-link"/g) || []).length;
  assert.ok(boxes > 1 || links > 0, 'the diagram draws more than one box or a link');
});

test('the button of the presentation page links to the address that the drawing case uses', () => {
  const page = fs.readFileSync(path.join(REPO, 'src/site/index.html'), 'utf8');
  const hrefs = [...page.matchAll(/href="editor\/(#[^"]*)"/g)].map((m) => m[1].replace(/&amp;/g, '&'));
  assert.ok(hrefs.length >= 1);
  for (const href of hrefs) assert.equal(href, ADDRESS);
});
