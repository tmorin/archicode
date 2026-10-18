'use strict';
// The example of the manual (src/doc/examples/domain_plateaus, an invented bookshop) in the editor (wave 009, run 0048): the plateaus load, and the editor tells
// the same story as `archicode diff` does. The command line's side is pinned by PlateauComparisonTest, which checks that the table the manual quotes is what the
// command prints; this test reads the rows of that same quoted table and compares them with the comparison the editor makes, so a drift on either side fails a test.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const EXAMPLE = path.resolve(__dirname, '../../../doc/examples/domain_plateaus');
const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../../doc/README.adoc'), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

/** The element rows of the table the manual quotes under `diff`: [change, reference], in the order of the table, and the candidates after it. */
function quotedTable() {
  const start = MANUAL.indexOf('[source,text]\n----\ncomparing to-be (To be) with baseline (As is)');
  assert.ok(start > 0, 'the manual quotes the table of the example under `diff`');
  const block = MANUAL.slice(start, MANUAL.indexOf('\n----\n', start + 30)).split('\n');
  const rows = block.filter((line) => /^(new|changed|removed|moved|split|merged) {2,}element /.test(line)).map((line) => {
    const cells = line.split(/ {2,}/);
    return [cells[0], cells[3]];
  });
  const candidates = block.filter((line) => /^application {2}shop\./.test(line)).map((line) => line.split(/ {2,}/).slice(1, 3));
  const counts = block.find((line) => line.startsWith('replacing'));
  return { rows, candidates, counts };
}

async function editorOnTheExample() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(EXAMPLE);
  state.folder = { handle, name: 'domain_plateaus' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('to-be');
  return { sandbox, state };
}

test('the example loads in the editor as layers: the root, the two plateaus, and to-be drawn when it is asked for', async () => {
  const { sandbox, state } = await editorOnTheExample();
  assert.deepEqual(plain([...state.plateauTree.nodes.keys()].sort()), ['baseline', 'to-be']);
  sandbox.drawPlateau('to-be');
  assert.equal(state.layers.current, 'to-be');
});

test('the editor reads the same moved, split and merged elements and the same candidate as the table of the manual', async () => {
  const { sandbox, state } = await editorOnTheExample();
  await sandbox.compareWithPlateau('baseline');
  assert.equal(state.baseline.plateau.id, 'baseline');
  const comparison = sandbox.comparisonState();
  const quoted = quotedTable();
  const rows = comparison.changes.filter((row) => row.thing === 'element').map((row) => [row.change, row.reference]);
  assert.deepEqual(plain(rows), quoted.rows);
  assert.equal(quoted.counts, 'replacing     2 moved, 2 split, 1 merged');
  assert.deepEqual(plain(comparison.counts.elements), { new: 2, changed: 2, removed: 2, moved: 2, split: 2, merged: 1, wording_only: 1 });
  assert.deepEqual(plain(comparison.candidates.map((c) => [c.from, c.to])), quoted.candidates);
});

test('what moved with its child, and what points at it, is one change and no other', async () => {
  const { sandbox } = await editorOnTheExample();
  await sandbox.compareWithPlateau('baseline');
  const comparison = sandbox.comparisonState();
  const byReference = (reference) => comparison.changes.find((row) => row.thing === 'element' && row.reference === reference);
  assert.deepEqual(plain(byReference('warehouse.inventory').replaces), ['shop.inventory']);
  assert.deepEqual(plain(byReference('warehouse.inventory.levels').replaces), ['shop.inventory.levels']);
  assert.deepEqual(plain(byReference('shop.billing').replaces), ['shop.invoices', 'shop.receipts']);
  assert.equal(byReference('shop.inventory'), undefined, 'a replaced element is not a removed one');
  assert.equal(byReference('warehouse.picking'), undefined, 'a relationship that follows the moved element is no change of the element that declares it');
});
