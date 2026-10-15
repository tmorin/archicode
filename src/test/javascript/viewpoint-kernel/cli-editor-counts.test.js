'use strict';
// The CLI and the editor give the same counts for the same pair (gate of phase P3 of wave 008). One file is the contract both sides read:
// src/test/resources/plateau-comparison/expected-counts.json, next to the invented bookshop it describes. This test loads the plateaus of that fixture through the
// editor's own loader (`loadWorkspace`, `setCompareTo`) and the embedded kernel (`compare`, as `comparisonState()` calls it) and asserts the file; the Java test
// `PlateauComparisonTest` asserts the output of `archicode diff --format json` against the same file, so either side drifting fails a test.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const FIXTURE = path.resolve(__dirname, '../../resources/plateau-comparison');
const EXPECTED = JSON.parse(fs.readFileSync(path.join(FIXTURE, 'expected-counts.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));

/** The row of the table as the contract writes it: what a reviewer needs to recognise it, whatever the side that printed it. */
function contractRow(row) {
  const out = { thing: row.thing, layer: row.layer, reference: row.reference };
  if (row.thing === 'relationship') { out.destination = row.destination; out.label = row.label === undefined || row.label === null ? '' : row.label; }
  out.change = row.change;
  out.natures = row.natures || [];
  return out;
}

async function editorOnTheFixture() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(FIXTURE);
  state.folder = { handle, name: 'plateau-comparison' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  await sandbox.switchPlateau(EXPECTED.plateau);
  await sandbox.setCompareTo(EXPECTED.baseline);
  assert.equal(state.plateau.id, EXPECTED.plateau);
  assert.equal(state.baseline.plateau.id, EXPECTED.baseline);
  return { sandbox, state };
}

test('the editor counts what the contract of the CLI and the editor says, on the fixture of the CLI', async () => {
  const { sandbox } = await editorOnTheFixture();
  const comparison = sandbox.comparisonState();
  assert.deepEqual(plain(comparison.counts), EXPECTED.counts);
});

test('the editor lists the same rows as the contract, in the same order', async () => {
  const { sandbox } = await editorOnTheFixture();
  const comparison = sandbox.comparisonState();
  assert.deepEqual(plain(comparison.changes.map(contractRow)), EXPECTED.changes);
});

test('hiding the wording-only changes in the editor hides the number the CLI says it hides (--no-wording), and nothing else', async () => {
  const { sandbox, state } = await editorOnTheFixture();
  state.hideWording = true;
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.wordingHidden, EXPECTED.hidden_wording_only);
  assert.equal(comparison.counts.elements.changed, EXPECTED.counts.elements.changed - EXPECTED.hidden_wording_only, 'the editor\'s changed count drops by the wording-only ones');
  assert.equal(comparison.changes.length, EXPECTED.changes.length - EXPECTED.hidden_wording_only);
  assert.deepEqual(plain(comparison.counts.relationships), EXPECTED.counts.relationships);
  const kept = EXPECTED.changes.filter((row) => !(row.thing === 'element' && row.change === 'changed' && row.natures.length === 1 && row.natures[0] === 'description'));
  assert.deepEqual(plain(comparison.changes.map(contractRow)), kept);
});

test('the contract is the one file: both sides read it and neither copies its numbers', () => {
  const java = fs.readFileSync(path.resolve(__dirname, '../../java/io/morin/archicode/cli/PlateauComparisonTest.java'), 'utf8');
  assert.match(java, /expected-counts\.json/);
  assert.equal(EXPECTED.changes.length, 15);
});
