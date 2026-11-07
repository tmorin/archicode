'use strict';
// The oracle of the plateau matrix: src/test/resources/brightcart/matrix-cases.json (written from a run of `archicode plateau matrix`, never edited to match the code) is read here
// and `plateauMatrixOf` (model/plateau-matrix.js, the port of rendering/matrix/PlateauMatrix.java) is fed what the editor knows of the layered Brightcart: the elements each plateau
// holds (`layerModelOf`) and the element rows of the kernel's comparison of each pair and of the first plateau with the last (`comparisonStateOf` over `drawingOfPlateaus`, the memo of
// the story scene). The cells, the Span, the counts of rows and of unchanged lineages are those of the file.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const CASES = JSON.parse(
  fs.readFileSync(path.resolve(__dirname, '../../resources/brightcart/matrix-cases.json'), 'utf8')
);
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

async function openLayered() {
  const mem = memFolder(walk(LAYERED, LAYERED, {}));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return sandbox;
}

/** What the plateau holds, as the rule reads it: `{ layer, reference, kind, name }`. */
function presenceOf(sandbox, id) {
  return plain(
    run(
      sandbox,
      `(() => { const model = layerModelOf(${JSON.stringify(id)}, AppState.workspace.settings); const out = [];
        for (const layer of ['application', 'technology']) for (const r of model.index[layer].values()) out.push({ layer, reference: r.reference, kind: r.kind, name: r.name });
        return out; })()`
    )
  );
}

/** The element rows of the comparison of `id` with `against`. */
function elementChanges(sandbox, id, against) {
  const rows = run(
    sandbox,
    `(() => { const state = comparisonStateOf(drawingOfPlateaus(${JSON.stringify(id)}, ${JSON.stringify(against)}, {}), sceneComparisonMemo());
      if (!state || !state.full) throw new Error(JSON.stringify(state)); return state.full.changes.filter((c) => c.thing === 'element'); })()`
  );
  return plain(rows);
}

function matrixOf(sandbox, ids) {
  const columns = ids.map((id) => ({ id }));
  const presence = ids.map((id) => presenceOf(sandbox, id));
  const steps = [];
  for (let i = 1; i < ids.length; i++) steps.push(elementChanges(sandbox, ids[i], ids[i - 1]));
  const span = ids.length > 2 ? elementChanges(sandbox, ids[ids.length - 1], ids[0]) : null;
  return plain(sandbox.plateauMatrixOf(columns, presence, steps, span));
}

const countsOf = (rows, word) => rows.filter((e) => e.change === word).length;

for (const c of CASES.cases) {
  test('the matrix of ' + c.id + ' is the one of the oracle', async () => {
    const sandbox = await openLayered();
    const matrix = matrixOf(sandbox, c.args);
    const kept = matrix.rows.filter((row) => row.changes);
    assert.equal(kept.length, c.rows, 'rows');
    assert.equal(matrix.unchanged, c.unchanged, 'unchanged');
    assert.equal(matrix.rows.length, c.rows + c.unchanged, 'every lineage is a row or is counted');
    assert.equal(kept.length, c.expectRows.length);
    c.expectRows.forEach((want, i) => {
      const got = kept[i];
      const at = c.id + ' row ' + i + ' ' + want.reference;
      assert.equal(got.layer, want.layer, at);
      assert.equal(got.reference, want.reference, at);
      assert.deepEqual(
        got.cells.map((cell) => cell.state),
        want.cells,
        at
      );
      if (want.from) {
        assert.deepEqual(
          got.cells.map((cell) => cell.from),
          want.from,
          at + ': from'
        );
      }
      assert.equal(got.span ? got.span.state : null, want.span, at + ': span');
    });
  });

  test('the counts of ' + c.id + ' are those of the comparisons', async () => {
    const sandbox = await openLayered();
    for (const pair of c.pairs) {
      const rows = elementChanges(sandbox, pair.to, pair.from);
      for (const word of Object.keys(pair.counts.elements)) {
        assert.equal(countsOf(rows, word), pair.counts.elements[word], pair.from + ' to ' + pair.to + ': ' + word);
      }
    }
    if (c.span) {
      const rows = elementChanges(sandbox, c.span.to, c.span.from);
      for (const word of Object.keys(c.span.counts.elements)) {
        assert.equal(countsOf(rows, word), c.span.counts.elements[word], 'span: ' + word);
      }
      // a row is one lineage from the first plateau to the last: the states of the Spans are the counts of the comparison
      const matrix = matrixOf(sandbox, c.args);
      for (const word of ['new', 'changed', 'removed', 'moved', 'split', 'merged']) {
        assert.equal(
          matrix.rows.filter((row) => row.span && row.span.state === word).length,
          c.span.counts.elements[word],
          'rows whose span is ' + word
        );
      }
    }
  });
}

test('the oracle holds the three cases of the plan', () => {
  assert.deepEqual(
    CASES.cases.map((c) => c.id),
    ['baseline-inhouse-marketplace', 'baseline-saas', 'baseline-marketplace-skipping-inhouse']
  );
  assert.equal(CASES.cases[0].rows + CASES.cases[0].unchanged, 88);
});
