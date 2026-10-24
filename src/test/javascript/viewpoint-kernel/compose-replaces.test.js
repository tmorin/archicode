'use strict';
// The `replaces` of the layers between two plateaus are composed (wave 017, run 0125, issue #89), in the editor. The cases are in compose-replaces-cases.json, which the command line runs too
// (ComposeReplacesCasesTest.java): a move made in two steps is a move, a move then a split is a split, an element created in a layer in between and moved by the next is new, one that a
// layer in between removed ends its chain, and a comparison with the plateau a plateau overrides is as it was. The page hands the plateaus in between to the kernel (`replacesChainBetween`).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'compose-replaces-cases.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null, 'the folder opens: ' + state.fatalError);
  return { sandbox, state };
}

/** The rows of the table that are elements, as the cases say them. */
function rowsOf(changes) {
  return changes
    .filter((row) => row.thing === 'element')
    .map((row) => [row.layer, row.reference, row.change, (row.replaces || []).join(',')].join('|'))
    .sort();
}

for (const c of DOCUMENT.cases) {
  for (const comparison of c.comparisons) {
    test(c.id + ': ' + comparison.plateau + ' compared with ' + comparison.against + ' (' + c.what + ')', async () => {
      const { sandbox, state } = await open(c.files);
      sandbox.drawPlateau(comparison.plateau);
      sandbox.compareWithPlateau(comparison.against);
      assert.equal(state.layers.current, comparison.plateau);
      assert.equal(state.baseline.plateau.id, comparison.against);
      const view = sandbox.comparisonState();
      assert.equal(view.problems, undefined, JSON.stringify(view.problems));
      assert.deepEqual(rowsOf(plain(view.changes)), comparison.rows.slice().sort(), 'the table');
      assert.deepEqual(plain(view.warnings), comparison.warnings, 'what the kernel ignored');
    });
  }
}

test('the page gives the kernel the plateaus the target stands on, and only when it is two layers or more above what it is compared with', async () => {
  const c = DOCUMENT.cases.find((k) => k.id === 'R02');
  const { sandbox } = await open(c.files);
  const chain = (target, base) => plain(sandbox.replacesChainBetween(base, target));
  const references = (plateau) => plateau.application.map((e) => e.reference).sort();
  assert.deepEqual(
    chain('p3', 'baseline').map(references),
    [['a'], ['b'], ['c']],
    'the base, then the plateaus in between (the target itself is the `target` of the input)'
  );
  assert.deepEqual(chain('p3', 'p1').map(references), [['b'], ['c']]);
  assert.equal(chain('p3', 'p2'), null, 'one layer above: nothing to compose');
  assert.equal(chain('p1', 'baseline'), null);
  assert.equal(chain('baseline', 'p3'), null, 'the target is the past of the base: nothing to compose');
  assert.deepEqual(
    chain('p3', 'baseline')[1].application,
    [{ reference: 'b', replaces: ['a'] }],
    'a plateau in between says its `replaces` as its layer wrote them'
  );
  // the sibling case: the plateau they have in common is the first of the chain
  const fork = DOCUMENT.cases.find((k) => k.id === 'R10');
  const { sandbox: forked } = await open(fork.files);
  assert.equal(forked.replacesChainBetween('p2', 'q'), null, 'q is one layer above the plateau it shares with p2');
  assert.deepEqual(
    plain(forked.replacesChainBetween('q', 'p2')).map((p) => p.application.map((e) => e.reference).sort()),
    [['a'], ['b']],
    'p2 stands on baseline and p1 since the plateau it shares with q'
  );
});

test('"Write replaces" writes one step: the word goes on the element, relative to the plateau it overrides, and it is read against a plateau further up all the same', async () => {
  const c = DOCUMENT.cases.find((k) => k.id === 'R06');
  // z does not say what it replaces: between p1 and p2 the pair (y removed, z new) is the one the author writes
  const files = Object.assign({}, c.files);
  files['manifests/p2/z.yaml'] = files['manifests/p2/z.yaml'].replace('  replaces: ["y"]\n', '');
  const { sandbox, state } = await open(files);
  sandbox.drawPlateau('p2');
  sandbox.compareWithPlateau('p1');
  assert.deepEqual(plain(sandbox.acceptCandidate({ layer: 'application', from: 'y', to: 'z', reasons: ['name'] })), {
    ok: true
  });
  assert.deepEqual(
    plain(state.index.application.get('z').replaces),
    ['y'],
    'one entry, the element of the plateau it overrides'
  );
  assert.deepEqual(
    plain(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)),
    ['manifests/p2/z.yaml'],
    'in the manifest that declares z and nowhere else'
  );
  assert.deepEqual(rowsOf(plain(sandbox.comparisonState().changes)), ['application|z|moved|y']);
  // against the first plateau the entry names nothing it has, and the chain explains it: z is new there and nothing is told
  sandbox.compareWithPlateau('baseline');
  const view = sandbox.comparisonState();
  assert.deepEqual(rowsOf(plain(view.changes)), ['application|z|new|']);
  assert.deepEqual(plain(view.warnings), []);
});
