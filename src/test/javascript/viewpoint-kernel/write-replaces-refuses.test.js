'use strict';
// "Write replaces" refuses an entry the layer of the manifest cannot hold (wave 018, run 0131, issue #130, decision D4). `replaces` is read against the plateau the manifest builds
// on; when a comparison is several layers apart the kernel composes the layers in between (#89), and a pair whose `from` a layer in between removed cannot be written in the plateau
// of the target: the button is off with the reason, a click that gets there anyway (`acceptCandidate`) refuses with the same sentence, and no file changes. A pair the layer can hold
// is written as in wave 017. The command line writes no `replaces`, so the rule has no twin there. Cases: R07 of compose-replaces-cases.json (the name of `n` set to `A`) and the
// layered Brightcart; everything else is invented.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'compose-replaces-cases.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

async function open(files, plateau, against) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null, String(state.fatalError));
  sandbox.drawPlateau(plateau);
  sandbox.compareWithPlateau(against);
  return { sandbox, state, mem };
}

// R07 with the name of n set to A: a is removed by p1 (which also has b, replacing a), p2 adds n named like a
const R07 = DOCUMENT.cases.find((c) => c.id === 'R07').files;
const NAMED_A = Object.assign({}, R07, { 'manifests/p2/n.yaml': R07['manifests/p2/n.yaml'].replace('name: "N"', 'name: "A"') });
const SENTENCE = '“a” is not an element of “p1”, the plateau “p2” builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. ' +
  'Compare “p2” with “p1”, or write the entry in the layer that still has “a” (a plateau that overrides one that holds it); nothing was written.';

test('R07 with n named A: the pair (a, n) is listed, its button is off with the reason, and the writer refuses with the same sentence and writes nothing', async () => {
  const { sandbox, state, mem } = await open(NAMED_A, 'p2', 'baseline');
  const view = sandbox.comparisonState();
  assert.deepEqual(plain(view.candidates).map((c) => [c.from, c.to]), [['a', 'n']], 'the kernel proposes it');
  const panel = sandbox.renderChangesPanelHtml(view);
  assert.match(panel, /<button type="button" data-action="accept-candidate"[^>]* disabled title="[^"]*builds on[^"]*"[^>]*>Write replaces<\/button>/);
  assert.match(text(panel), /“a” is not an element of “p1”, the plateau “p2” builds on/);
  const before = Object.fromEntries(Array.from(mem.files, ([p, f]) => [p, f.text]));
  const result = plain(sandbox.acceptCandidate({ layer: 'application', from: 'a', to: 'n' }));
  assert.deepEqual(result, { ok: false, message: SENTENCE });
  assert.match(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /<p class="changes-message" role="alert">“a” is not an element of “p1”/);
  assert.equal(state.dirtyReferences.size, 0);
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.dirty)), [], 'no file is marked modified');
  assert.deepEqual(plain(mem.writes), []);
  assert.deepEqual(Object.fromEntries(Array.from(mem.files, ([p, f]) => [p, f.text])), before, 'no file changes');
});

test('R07 compared with p1 (one layer): the pair the layer can hold has its button on, and the plateau below is where the entry is written', async () => {
  // p1 has b, p2 has n named B: compared with p1, b is removed and n new; b is an element of p1, the plateau p2 builds on
  const files = Object.assign({}, R07, { 'manifests/p2/n.yaml': R07['manifests/p2/n.yaml'].replace('name: "N"', 'name: "B"') });
  const { sandbox, state } = await open(files, 'p2', 'p1');
  const view = sandbox.comparisonState();
  assert.deepEqual(plain(view.candidates).map((c) => [c.from, c.to]), [['b', 'n']]);
  const panel = sandbox.renderChangesPanelHtml(view);
  assert.doesNotMatch(panel, / disabled/);
  assert.deepEqual(plain(sandbox.acceptCandidate({ layer: 'application', from: 'b', to: 'n' })), { ok: true });
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)), ['manifests/p2/n.yaml']);
  assert.deepEqual(plain(state.index.application.get('n').replaces), ['b']);
});

test('several layers apart, a from the plateau below still has is written (the composed comparison then says it moved), as in wave 017', async () => {
  const c = DOCUMENT.cases.find((k) => k.id === 'R06');
  const files = Object.assign({}, c.files);
  files['manifests/p2/z.yaml'] = files['manifests/p2/z.yaml'].replace('  replaces: ["y"]\n', '');
  const { sandbox } = await open(files, 'p2', 'p1');
  assert.equal(sandbox.replacesLayerProblem('application', 'y', sandbox.comparisonState()), null);
});

test('a split and a merge are written one pair at a time and each from is checked: the one the layer lacks is refused, one it has is not', async () => {
  // p2 splits what p1 had (s) into s1 and s2... built from R07: a removed by p1; p2 has n1 (named A) and n2 (named A too), both replacing a would be a split of a
  const files = Object.assign({}, NAMED_A, {
    'manifests/p2/m.yaml': R07['manifests/p2/n.yaml'].replace('id: "n"', 'id: "m"').replace('name: "N"', 'name: "B"')
  });
  const { sandbox, state } = await open(files, 'p2', 'baseline');
  const view = sandbox.comparisonState();
  assert.equal(sandbox.replacesLayerProblem('application', 'a', view) !== null, true, 'a: a layer in between removed it');
  assert.equal(sandbox.replacesLayerProblem('application', 'k', view), null, 'k: still in p1');
  assert.equal(plain(sandbox.acceptCandidate({ layer: 'application', from: 'a', to: 'n' })).ok, false);
  assert.equal(state.dirtyReferences.size, 0);
});

test('a workspace without plateaus is not affected: the check finds nothing to build on', async () => {
  const files = {
    'workspace.yaml': 'settings:\n  manifests:\n    paths: ["manifests/**"]\n',
    'manifests/a.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "a"\n  name: "A"\n'
  };
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(sandbox.replacesLayerProblem('application', 'a', { target: { id: 'baseline', name: '' }, base: { id: 'baseline' } }), null);
  assert.equal(sandbox.replacesLayerProblem('application', 'a', null), null);
});

// ---- the layered Brightcart: the pairs its layers can hold are written, one line added to the manifest of the new element ----

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

test('Brightcart, saas compared with baseline: both pairs are on, and writing one changes the one manifest of the new element and nothing else', async () => {
  const files = walk(LAYERED, LAYERED, {});
  const { sandbox, state, mem } = await open(files, 'saas', 'baseline');
  const view = sandbox.comparisonState();
  const pairs = plain(view.candidates).map((c) => [c.from, c.to]);
  assert.deepEqual(pairs, [['partners.tax-live', 'partners.commerce-live'], ['sandbox.tax-sandbox', 'sandbox.commerce-sandbox']]);
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(view), / disabled/);
  assert.deepEqual(plain(sandbox.acceptCandidate({ layer: 'technology', from: 'partners.tax-live', to: 'partners.commerce-live' })), { ok: true });
  const dirty = plain(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath));
  assert.equal(dirty.length, 1);
  assert.ok(dirty[0].startsWith('saas/'), dirty[0]);
  assert.deepEqual(plain(state.index.technology.get('partners.commerce-live').replaces), ['partners.tax-live']);
  assert.deepEqual(plain(mem.writes), [], 'saved with the rest, not before');
});

test('Brightcart, marketplace compared with baseline (two layers apart): no pair is listed, so none is off', async () => {
  const { sandbox } = await open(walk(LAYERED, LAYERED, {}), 'marketplace', 'baseline');
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /disabled title/);
});
