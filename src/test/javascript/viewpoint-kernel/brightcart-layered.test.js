'use strict';
// The layered Brightcart (wave 014, run 0079): `src/test/resources/brightcart/layered/`, the four plateaus of docs/fixtures/brightcart-spec.md written as manifests with a
// `plateau:` header and a `Kind: Plateau` with its patches. Two things are asked here, the command line is asked the rest (BrightcartLayeredDiffTest, BrightcartLayeredViewsTest):
//   - the generator is the source of the committed files: run in a copy of its folder, it writes `folders/`, `layered/`, `variants/` and `expected/` byte for byte as they are committed
//     (the node tests are the only ones that run it; the Java tests read what it wrote);
//   - the editor opens `layered/` and reads its plateaus: the tree, every manifest, and the chain of each plateau (wave 014, run 0080: the band draws a plateau as its chain, the
//     elements it draws are the sizes of that plateau in expected/sizes.json; the counts of the Changes panel are checked in editor-reads-layers.test.js).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const childProcess = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const expected = (name) => JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', name + '.json'), 'utf8'));

/** Every file below `root`, as a path relative to it with `/`, with its text; sorted. */
function files(root) {
  const out = new Map();
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true }).sort((a, b) => (a.name < b.name ? -1 : 1))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out.set(path.relative(root, full).split(path.sep).join('/'), fs.readFileSync(full, 'utf8'));
    }
  };
  walk(root);
  return out;
}

test('the generator writes the committed files byte for byte, and the resolver agrees with the complete folders', () => {
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcart-generator-'));
  try {
    for (const name of ['generate.mjs', 'description.mjs']) fs.copyFileSync(path.join(BRIGHTCART, name), path.join(copy, name));
    const run = childProcess.spawnSync(process.execPath, [path.join(copy, 'generate.mjs')], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(run.stdout, /ok: the description matches the document, and the layered rendition resolves to folders\/ for the four plateaus/);
    for (const folder of ['folders', 'layered', 'variants', 'expected']) {
      const written = files(path.join(copy, folder));
      const committed = files(path.join(BRIGHTCART, folder));
      assert.deepEqual(Array.from(written.keys()), Array.from(committed.keys()), folder + ': the same files');
      for (const [file, text] of written) assert.equal(text, committed.get(file), folder + '/' + file);
    }
    // nothing else is written next to the generator
    assert.deepEqual(fs.readdirSync(copy).sort(), ['description.mjs', 'expected', 'folders', 'generate.mjs', 'layered', 'variants']);
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
});

test('the generator takes no argument: the rendition is committed, not written on demand', () => {
  const run = childProcess.spawnSync(process.execPath, [path.join(BRIGHTCART, 'generate.mjs'), '--anything'], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.match(run.stderr, /it takes no argument/);
});

async function openLayered() {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  return { sandbox, state };
}

test('the editor opens layered/: the tree of the four plateaus, every manifest read, and no mistake', async () => {
  const { state } = await openLayered();
  assert.equal(state.fatalError, null);
  assert.deepEqual(Array.from(state.plateauTree.ids), ['baseline', 'inhouse', 'marketplace', 'saas']);
  assert.equal(state.plateauTree.layered, true);
  const parent = (id) => state.plateauTree.nodes.get(id).parent;
  assert.deepEqual(['baseline', 'inhouse', 'marketplace', 'saas'].map(parent), [null, 'baseline', 'inhouse', 'baseline']);
  for (const id of ['baseline', 'inhouse', 'marketplace', 'saas']) {
    assert.equal(state.plateauTree.nodes.get(id).manifest, id + '/plateau.yaml', 'a Plateau manifest names each plateau');
  }
  assert.deepEqual(Array.from(state.plateauTree.problems), []);
  assert.deepEqual(Array.from(state.plateauTree.redeclared), []);
  assert.deepEqual(Array.from(state.plateauTree.warnings), []);
  assert.deepEqual(Array.from(state.duplicateReferences.map((d) => d.message)), []);
  assert.deepEqual(Array.from(state.manifestFiles.filter((f) => f.error).map((f) => f.relPath + ': ' + f.error)), []);
  assert.deepEqual(Array.from(state.unreadManifestFiles), []);
  const written = Array.from(files(LAYERED).keys()).filter((f) => f !== 'workspace.yaml');
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.relPath)).sort(), written, 'the editor reads every file the generator wrote, in every folder');
});

test('the editor draws baseline when it opens, and each plateau at its sizes when its node of the band is chosen', async () => {
  const { sandbox, state } = await openLayered();
  assert.deepEqual(Array.from(state.plateaus.map((p) => p.id)), [], 'no settings.plateaus: the selector has nothing to list, the band is the way');
  const sizes = expected('sizes').plateaus;
  assert.equal(state.layers.current, 'baseline');
  assert.equal(state.index.application.size, sizes.baseline.application);
  assert.equal(state.index.technology.size, sizes.baseline.technology);
  for (const id of ['saas', 'inhouse', 'marketplace']) {
    sandbox.drawPlateau(id);
    assert.equal(state.layers.current, id);
    assert.equal(state.layerProblems, null, id + ' resolves');
    assert.equal(state.index.application.size, sizes[id].application, id);
    assert.equal(state.index.technology.size, sizes[id].technology, id);
  }
});
