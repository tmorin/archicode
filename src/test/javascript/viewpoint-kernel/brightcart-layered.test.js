'use strict';
// The layered Brightcart (wave 014, run 0079): `src/test/resources/brightcart/layered/`, the four plateaus of docs/fixtures/brightcart-spec.md written as manifests with a
// `plateau:` header and a `Kind: Plateau` with its patches. Two things are asked here, the command line is asked the rest (BrightcartLayeredDiffTest, BrightcartLayeredViewsTest):
//   - the generator is the source of the committed files: run in a copy of its folder, it writes `layered/`, `variants/` and `expected/` byte for byte as they are committed,
//     and the last column of the table of negative variants of the document (wave 014, run 0085: what a tool runs today)
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
const SPEC = path.resolve(__dirname, '../../../../docs/fixtures/brightcart-spec.md');
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

test('the generator writes the committed files byte for byte, and the resolver agrees with the model', () => {
  // the generator also writes the last column of the table of negative variants of the document, when the document is at its place: the copy has it there
  const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcart-generator-'));
  const folder = path.join(copy, 'src', 'test', 'resources', 'brightcart');
  const spec = path.join(copy, 'docs', 'fixtures', 'brightcart-spec.md');
  try {
    fs.mkdirSync(folder, { recursive: true });
    fs.mkdirSync(path.dirname(spec), { recursive: true });
    for (const name of ['generate.mjs', 'description.mjs'])
      fs.copyFileSync(path.join(BRIGHTCART, name), path.join(folder, name));
    const committedSpec = fs.readFileSync(SPEC, 'utf8');
    // a document whose "Run today" cells are stale: the generator puts back what the description says
    fs.writeFileSync(
      spec,
      committedSpec
        .split('\n')
        .map((line) => (/^\| V\d+ \| /.test(line) ? line.split(' | ').slice(0, 3).join(' | ') + ' | stale |' : line))
        .join('\n')
    );
    const run = childProcess.spawnSync(process.execPath, [path.join(folder, 'generate.mjs')], { encoding: 'utf8' });
    assert.equal(run.status, 0, run.stderr + run.stdout);
    assert.match(
      run.stdout,
      /ok: the description matches the document, and the layered rendition resolves to the model for the four plateaus/
    );
    assert.match(run.stdout, /the document: 14 rows of the table of variants/);
    for (const name of ['layered', 'variants', 'expected']) {
      const written = files(path.join(folder, name));
      const committed = files(path.join(BRIGHTCART, name));
      assert.deepEqual(Array.from(written.keys()), Array.from(committed.keys()), name + ': the same files');
      for (const [file, text] of written) assert.equal(text, committed.get(file), name + '/' + file);
    }
    assert.equal(
      fs.readFileSync(spec, 'utf8'),
      committedSpec,
      'the document: the table of variants says what the description says, byte for byte'
    );
    // nothing else is written next to the generator
    assert.deepEqual(fs.readdirSync(folder).sort(), [
      'description.mjs',
      'expected',
      'generate.mjs',
      'layered',
      'variants'
    ]);
  } finally {
    fs.rmSync(copy, { recursive: true, force: true });
  }
});

test('the generator fails when a variant says nothing about what a tool does with it, or when the document has no row for it', () => {
  const run = (change) => {
    const copy = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcart-generator-'));
    try {
      const folder = path.join(copy, 'src', 'test', 'resources', 'brightcart');
      const spec = path.join(copy, 'docs', 'fixtures', 'brightcart-spec.md');
      fs.mkdirSync(folder, { recursive: true });
      fs.mkdirSync(path.dirname(spec), { recursive: true });
      fs.copyFileSync(path.join(BRIGHTCART, 'generate.mjs'), path.join(folder, 'generate.mjs'));
      fs.writeFileSync(
        path.join(folder, 'description.mjs'),
        fs.readFileSync(path.join(BRIGHTCART, 'description.mjs'), 'utf8')
      );
      fs.writeFileSync(spec, fs.readFileSync(SPEC, 'utf8'));
      change(folder, spec);
      const result = childProcess.spawnSync(process.execPath, [path.join(folder, 'generate.mjs')], {
        encoding: 'utf8'
      });
      return { status: result.status, text: result.stderr + result.stdout, spec: fs.readFileSync(spec, 'utf8') };
    } finally {
      fs.rmSync(copy, { recursive: true, force: true });
    }
  };
  const noRunToday = run((folder) => {
    const file = path.join(folder, 'description.mjs');
    fs.writeFileSync(
      file,
      fs
        .readFileSync(file, 'utf8')
        .replace("    runToday:\n      '**Run** (case N44)", "    notRunToday:\n      '**Run** (case N44)")
    );
  });
  assert.equal(noRunToday.status, 1);
  assert.match(noRunToday.text, /V1: no runToday/);
  assert.equal(noRunToday.spec, fs.readFileSync(SPEC, 'utf8'), 'a failed run leaves the document as it was');
  const noRow = run((folder, spec) =>
    fs.writeFileSync(
      spec,
      fs
        .readFileSync(spec, 'utf8')
        .split('\n')
        .filter((line) => !line.startsWith('| V14 | '))
        .join('\n')
    )
  );
  assert.equal(noRow.status, 1);
  assert.match(noRow.text, /the document has 0 rows for V14/);
});

test('what the document says a tool runs today is what variants/ says, and each variant it says is run is a case of a file the tests read', () => {
  const rows = new Map();
  for (const line of fs.readFileSync(SPEC, 'utf8').split('\n')) {
    const m = /^\| (V\d+) \| /.exec(line);
    if (m) rows.set(m[1], line.slice(2, -2).split(' | ')[3]);
  }
  assert.deepEqual(
    Array.from(rows.keys()),
    Array.from({ length: 14 }, (_, i) => 'V' + (i + 1))
  );
  const cases = JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'negative-cases.json'), 'utf8')).cases;
  for (const [id, cell] of rows) {
    const json = JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'variants', id + '.json'), 'utf8'));
    assert.equal(json.status, cell, id + ': variants/' + id + '.json and the document say the same');
    const run = /^\*\*Run\*\*/.test(cell);
    if (!run) assert.match(cell, /^Waits for `plateau merge` \(#65\)\.$/, id + ' is run or waits for the merge');
    // a variant that is run by a case of negative-cases.json names it
    const named = Array.from(cell.matchAll(/case (N\d+)/g)).map((m) => m[1]);
    for (const n of named)
      assert.ok(
        cases.some((c) => c.id === n),
        id + ' names the case ' + n + ', which negative-cases.json does not have'
      );
  }
  // V1 to V10 are run by a case that is tagged with them, and V11 by the plateau cases; V12 to V14 wait for the merge (#65)
  for (const id of ['V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9', 'V10', 'V11'])
    assert.ok(
      cases.some((c) => c.variant === id),
      id + ' is run by a case'
    );
  for (const id of ['V12', 'V13', 'V14'])
    assert.ok(!cases.some((c) => c.variant === id), id + ' waits for plateau merge');
});

test('the generator takes no argument: the rendition is committed, not written on demand', () => {
  const run = childProcess.spawnSync(process.execPath, [path.join(BRIGHTCART, 'generate.mjs'), '--anything'], {
    encoding: 'utf8'
  });
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
  assert.deepEqual(['baseline', 'inhouse', 'marketplace', 'saas'].map(parent), [
    null,
    'baseline',
    'inhouse',
    'baseline'
  ]);
  for (const id of ['baseline', 'inhouse', 'marketplace', 'saas']) {
    assert.equal(
      state.plateauTree.nodes.get(id).manifest,
      id + '/plateau.yaml',
      'a Plateau manifest names each plateau'
    );
  }
  assert.deepEqual(Array.from(state.plateauTree.problems), []);
  assert.deepEqual(Array.from(state.plateauTree.redeclared), []);
  assert.deepEqual(Array.from(state.plateauTree.warnings), []);
  assert.deepEqual(Array.from(state.duplicateReferences.map((d) => d.message)), []);
  assert.deepEqual(Array.from(state.manifestFiles.filter((f) => f.error).map((f) => f.relPath + ': ' + f.error)), []);
  assert.deepEqual(Array.from(state.unreadManifestFiles), []);
  const written = Array.from(files(LAYERED).keys()).filter((f) => f !== '.archicode.yaml');
  assert.deepEqual(
    Array.from(state.manifestFiles.map((f) => f.relPath)).sort(),
    written,
    'the editor reads every file the generator wrote, in every folder'
  );
});

test('the editor draws baseline when it opens, and each plateau at its sizes when its node of the band is chosen', async () => {
  const { sandbox, state } = await openLayered();
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
