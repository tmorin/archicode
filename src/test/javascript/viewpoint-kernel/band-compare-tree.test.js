'use strict';
// Wave 016, run 0109 (W-3, #72): the list "Compare with" of the band shows the tree of the plateaus like the list "Plateau" does, and the plateau drawn is greyed (disabled) in it, so
// that the reader sees the hierarchy in both lists. The list is: Nothing; Past (it follows the plateau drawn); then every plateau, in the order of the tree, indented by its depth, with
// the same labels as the other list. A plateau of the tree is a comparison as `archicode diff --plateau <drawn> --against <id>` makes it. The entries "Future: <plateau>" are gone (the
// tree lists the children). What a window shows (one row at 1280 px, two at 360 px) is a measure in a browser (the run document gives it); here is what the markup and the state say.
// The numbers of the Brightcart are those of expected/comparisons.json (P1, P3, P5) and, for the pairs that file has not, those `archicode diff` printed on the same folder
// (`diff --plateau marketplace --against baseline`, `--against saas`) when this test was written.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles, chooseOnBand, bandOf } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const COMPARISONS = new Map(JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', 'comparisons.json'), 'utf8')).map((c) => [c.id, c]));
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const ORDER = ['baseline', 'inhouse', 'marketplace', 'saas'];

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}
const LAYERED_FILES = walk(LAYERED, LAYERED, {});

async function openIn(files) {
  const mem = memFolder(Object.assign({}, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  // the harness has no layout engine: `render()` is the address and nothing else
  sandbox.render = () => { sandbox.syncHashFromState(); };
  sandbox.render();
  return { sandbox, state };
}
const openBrightcart = () => openIn(LAYERED_FILES);

/** A chain of `n` plateaus over baseline, each overriding the one before (invented names). */
function chainFiles(n) {
  const plateaus = [];
  const files = {};
  for (let i = 1; i <= n; i++) {
    const id = 'step' + i;
    plateaus.push({ id, name: 'Step ' + i, horizon: (2026 + Math.floor((i - 1) / 4)) + '-Q' + (((i - 1) % 4) + 1), override: i === 1 ? undefined : 'step' + (i - 1), path: 'plateaus/' + id });
    files['plateaus/' + id + '/s' + i + '.yaml'] = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "s' + i + '"\n  name: "Service ' + i + '"\n';
  }
  return layeredFiles(plateaus, files);
}

/** What a browser does when the address is typed: the new address is an entry, and hashchange fires. */
function typeAddress(sandbox, hash) {
  sandbox.location.hash = hash;
  for (const fn of sandbox.__windowListeners.hashchange) fn();
}

function countsOf(comparison) {
  const e = comparison.counts.elements;
  return {
    elements: { new: e.new, changed: e.changed, removed: e.removed },
    replacing: { moved: e.moved || 0, split: e.split || 0, merged: e.merged || 0 },
    relationships: { new: comparison.counts.relationships.new, changed: comparison.counts.relationships.changed, removed: comparison.counts.relationships.removed }
  };
}
const wanted = (id) => { const c = COMPARISONS.get(id); return { elements: c.elements, replacing: c.replacing, relationships: c.relationships }; };
const treeValues = (ids) => ids.map((id) => 'plateau:' + id);
const greyed = (band) => plain(band.compare.filter((o) => o.disabled).map((o) => o.value));

// ---- the options ----

test('the options of Compare with are Nothing, Past and the whole tree, in the order and with the labels of the list Plateau', async () => {
  const { sandbox } = await openBrightcart();
  const band = bandOf(sandbox);
  // baseline is drawn: it overrides nothing, so there is no past to follow
  assert.deepEqual(plain(band.compare.map((o) => o.value)), [''].concat(treeValues(ORDER)));
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  const drawn = bandOf(sandbox);
  assert.deepEqual(plain(drawn.compare.map((o) => o.value)), ['', 'past'].concat(treeValues(ORDER)));
  assert.equal(drawn.compare[0].label, 'Nothing');
  assert.equal(drawn.compare[1].label, 'Past (follows the plateau drawn)');
  assert.deepEqual(plain(drawn.compare.slice(2).map((o) => o.label)), plain(drawn.plateaus.map((o) => o.label)), 'the same labels: name, horizon, the mark of a plateau the command line refuses');
  // the same indentation, in both lists: an em space (U+2003) for each step of depth, which an <option> keeps (an ordinary space at the start would be collapsed by a browser)
  const indentOf = (html, id, value) => (html.match(new RegExp('<option value="' + value(id) + '"[^>]*>(\\u2003*)')) || [])[1].length;
  const left = bandOf(sandbox).html.slice(0, bandOf(sandbox).html.indexOf('<select id="band-compare"'));
  const right = bandOf(sandbox).html.slice(bandOf(sandbox).html.indexOf('<select id="band-compare"'));
  for (const [id, depth] of [['baseline', 0], ['inhouse', 1], ['marketplace', 2], ['saas', 1]]) {
    assert.equal(indentOf(left, id, (x) => x), depth, id + ' in Plateau');
    assert.equal(indentOf(right, id, (x) => 'plateau:' + x), depth, id + ' in Compare with');
  }
  assert.ok(!/ {2}/.test(left.replace(/<[^>]*>/g, '')) , 'no run of ordinary spaces is relied on for the indentation');
  assert.ok(!right.includes('optgroup'), 'no group: the tree is the list');
});

test('nothing in the page says "Future: " any more: the tree lists the children', () => {
  assert.equal(HTML.split('\n').filter((line) => line.includes('Future: ')).length, 0);
  assert.ok(!HTML.includes('Other plateaus"'));
});

test('the plateau drawn is greyed in the tree wherever it stands, and the greyed entry moves with it', async () => {
  const { sandbox } = await openBrightcart();
  for (const id of ORDER) {
    chooseOnBand(sandbox, 'plateau', id);
    const band = bandOf(sandbox);
    assert.deepEqual(greyed(band), ['plateau:' + id], id + ' is drawn and greyed');
    assert.equal(band.drawn, id);
    assert.ok(band.compare.every((o) => o.disabled === (o.value === 'plateau:' + id)), 'and nothing else is: the past and the others can be chosen');
  }
});

test('the plateau drawn is greyed at the root, in the middle and at the leaf of a chain of eight, and on a workspace of one layer and of none', async () => {
  const { sandbox } = await openIn(chainFiles(8));
  const ids = ['baseline'].concat(Array.from({ length: 8 }, (_, i) => 'step' + (i + 1)));
  for (const id of ['baseline', 'step4', 'step8']) {
    chooseOnBand(sandbox, 'plateau', id);
    const band = bandOf(sandbox);
    assert.deepEqual(plain(band.compare.map((o) => o.value)), [''].concat(id === 'baseline' ? [] : ['past']).concat(treeValues(ids)), id);
    assert.deepEqual(greyed(band), ['plateau:' + id], id);
  }
  // one layer over the root
  const one = await openIn(layeredFiles([{ id: 'to-be', name: 'To be', horizon: '2027', path: 'plateaus/to-be' }], { 'plateaus/to-be/s.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "s"\n  name: "S"\n' }));
  assert.deepEqual(plain(bandOf(one.sandbox).compare.map((o) => [o.value, o.disabled])), [['', false], ['plateau:baseline', true], ['plateau:to-be', false]]);
  chooseOnBand(one.sandbox, 'plateau', 'to-be');
  assert.deepEqual(plain(bandOf(one.sandbox).compare.map((o) => [o.value, o.disabled])), [['', false], ['past', false], ['plateau:baseline', false], ['plateau:to-be', true]]);
  // no layer: the root is the only plateau, the one drawn, so there is nothing to choose but nothing
  const none = await openIn({ 'manifests/app.shop.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n', 'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' });
  assert.deepEqual(plain(bandOf(none.sandbox).compare.map((o) => [o.value, o.selected, o.disabled])), [['', true, false], ['plateau:baseline', false, true]]);
});

// ---- the comparison a choice makes: the one `archicode diff --plateau <drawn> --against <id>` makes ----

const GRANDPARENT = { elements: { new: 38, changed: 3, removed: 6 }, replacing: { moved: 11, split: 2, merged: 1 }, relationships: { new: 35, changed: 1, removed: 9 } }; // diff --plateau marketplace --against baseline
const COUSIN = { elements: { new: 48, changed: 3, removed: 8 }, replacing: { moved: 4, split: 2, merged: 1 }, relationships: { new: 43, changed: 0, removed: 10 } }; // diff --plateau marketplace --against saas
const GRANDCHILD = { elements: { new: 38, changed: 3, removed: 6 }, replacing: { moved: 11, split: 2, merged: 1 }, relationships: { new: 35, changed: 1, removed: 9 } }; // the same pair read from the other end: baseline drawn, marketplace chosen

const CHOICES = [
  // [what it is, drawn, chosen, the comparison the state holds, the numbers]
  ['the parent', 'marketplace', 'inhouse', { mode: 'past', other: 'inhouse', chosen: false }, wanted('P3'), 'past'],
  ['the root, which is the parent', 'saas', 'baseline', { mode: 'past', other: 'baseline', chosen: false }, wanted('P1'), 'past'],
  ['an ancestor that is not the parent', 'marketplace', 'baseline', { mode: 'other', other: 'baseline', chosen: true }, GRANDPARENT, 'plateau:baseline'],
  ['the only child', 'inhouse', 'marketplace', { mode: 'future', other: 'marketplace', chosen: true }, wanted('P3'), 'plateau:marketplace'],
  ['one of two children', 'baseline', 'saas', { mode: 'future', other: 'saas', chosen: true }, wanted('P1'), 'plateau:saas'],
  ['a descendant that is not a child', 'baseline', 'marketplace', { mode: 'future', other: 'marketplace', chosen: true }, GRANDCHILD, 'plateau:marketplace'],
  ['a sibling', 'inhouse', 'saas', { mode: 'other', other: 'saas', chosen: true }, wanted('P5'), 'plateau:saas'],
  ['a cousin', 'marketplace', 'saas', { mode: 'other', other: 'saas', chosen: true }, COUSIN, 'plateau:saas']
];

for (const [what, drawn, chosen, compare, numbers, shown] of CHOICES) {
  test('choosing ' + what + ' (' + chosen + ' while ' + drawn + ' is drawn) gives the comparison and the counts of `archicode diff`', async () => {
    const { sandbox, state } = await openBrightcart();
    chooseOnBand(sandbox, 'plateau', drawn);
    chooseOnBand(sandbox, 'compare', 'plateau:' + chosen);
    assert.deepEqual(plain(state.layers.compare), compare);
    assert.equal(state.baseline.plateau.id, chosen, 'the plateau compared with is read');
    const comparison = sandbox.comparisonState();
    assert.ok(comparison && !comparison.problems, JSON.stringify(comparison && comparison.problems));
    // the plateau of the command line's --plateau is the later one: the drawn one, but for a future, where the drawn one is the base
    assert.equal(comparison.target.id, compare.mode === 'future' ? chosen : drawn);
    assert.equal(comparison.base.id, compare.mode === 'future' ? drawn : chosen);
    assert.deepEqual(countsOf(comparison), numbers);
    const html = sandbox.renderChangesPanelHtml(comparison);
    for (const [n, label] of [[numbers.elements.new, 'new'], [numbers.elements.removed, 'removed']]) assert.ok(html.includes('<span class="change-count">' + n + '</span> ' + label), 'the panel says ' + n + ' ' + label);
    // the list says what is compared: the entry of the plateau, or Past when the comparison follows the plateau drawn
    const band = bandOf(sandbox);
    assert.equal(band.compared, shown);
    assert.deepEqual(greyed(band), ['plateau:' + drawn], 'the plateau drawn stays greyed, and the one compared with is not');
  });
}

test('choosing the plateau that is already compared with does not stop the comparison: a list chooses, it does not toggle', async () => {
  const { sandbox, state } = await openBrightcart();
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  chooseOnBand(sandbox, 'compare', 'past');
  assert.equal(bandOf(sandbox).compared, 'past');
  chooseOnBand(sandbox, 'compare', 'plateau:inhouse'); // the same plateau, by the tree
  assert.deepEqual(plain(state.layers.compare), { mode: 'past', other: 'inhouse', chosen: false });
  assert.equal(bandOf(sandbox).compared, 'past', 'the list is put back on what it says');
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'saas', chosen: true });
  chooseOnBand(sandbox, 'compare', '');
  assert.equal(state.layers.compare, null);
  assert.equal(bandOf(sandbox).compared, '');
  // the plateau drawn cannot be chosen (the entry is greyed; a script that sends it does nothing)
  chooseOnBand(sandbox, 'compare', 'plateau:marketplace');
  assert.equal(state.layers.compare, null);
});

test('the entry Past follows the plateau drawn, and a plateau of the tree stays where it was chosen', async () => {
  const { sandbox, state } = await openBrightcart();
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  chooseOnBand(sandbox, 'compare', 'past');
  assert.equal(state.baseline.plateau.id, 'inhouse');
  chooseOnBand(sandbox, 'plateau', 'inhouse');
  assert.equal(bandOf(sandbox).compared, 'past', 'still Past');
  assert.equal(state.baseline.plateau.id, 'baseline', 'and the plateau it overrides now');
  assert.deepEqual(greyed(bandOf(sandbox)), ['plateau:inhouse']);
  chooseOnBand(sandbox, 'plateau', 'saas');
  assert.equal(state.baseline.plateau.id, 'baseline');
  chooseOnBand(sandbox, 'plateau', 'baseline');
  assert.equal(state.layers.compare, null, 'the root overrides nothing: there is no past, and the entry is gone');
  assert.ok(!bandOf(sandbox).compare.some((o) => o.value === 'past'));
  // a sibling chosen in the tree is not moved by drawing another plateau
  chooseOnBand(sandbox, 'plateau', 'inhouse');
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'saas', chosen: true });
  assert.equal(bandOf(sandbox).compared, 'plateau:saas');
  assert.deepEqual(greyed(bandOf(sandbox)), ['plateau:marketplace'], 'the grey moved with the plateau drawn');
  // and one that is below the plateau drawn is read as the future, the one that is the parent as the past, whichever way it was reached
  chooseOnBand(sandbox, 'plateau', 'baseline');
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: 'saas', chosen: true });
  assert.equal(bandOf(sandbox).compared, 'plateau:saas');
});

// ---- the addresses and the history ----

test('the old addresses open, and the list says what they mean in the new words', async () => {
  const { sandbox, state } = await openBrightcart();
  const at = (hash) => { typeAddress(sandbox, hash); return bandOf(sandbox); };
  // compare=past follows the plateau drawn
  let band = at('#/timeline/applications?plateau=marketplace&compare=past');
  assert.deepEqual([band.drawn, band.compared, state.baseline.plateau.id], ['marketplace', 'past', 'inhouse']);
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'past');
  // compare=future with one plateau on top of the drawn one: it follows, and the list selects that plateau in the tree
  band = at('#/timeline/applications?plateau=inhouse&compare=future');
  assert.deepEqual([band.drawn, band.compared, state.baseline.plateau.id], ['inhouse', 'plateau:marketplace', 'marketplace']);
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'future', 'and the page writes what it was given');
  assert.ok(!band.compare.some((o) => o.value === 'future'), 'there is no entry for the future');
  // compare=future:<id> and compare=other:<id>
  band = at('#/timeline/applications?plateau=baseline&compare=future%3Asaas');
  assert.deepEqual([band.compared, state.baseline.plateau.id], ['plateau:saas', 'saas']);
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'future:saas');
  band = at('#/timeline/applications?plateau=marketplace&compare=other%3Asaas');
  assert.deepEqual([band.compared, state.baseline.plateau.id], ['plateau:saas', 'saas']);
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'other:saas');
  // other:<id> of the plateau it overrides is the past that follows
  band = at('#/timeline/applications?plateau=marketplace&compare=other%3Ainhouse');
  assert.deepEqual([band.compared, run(sandbox, 'layerCompareChoice()')], ['past', 'past']);
  // an empty compare= is nothing, an unknown plateau is nothing
  band = at('#/timeline/applications?plateau=marketplace&compare=');
  assert.deepEqual([band.compared, state.layers.compare], ['', null]);
  band = at('#/timeline/applications?plateau=marketplace&compare=other%3Anowhere');
  assert.deepEqual([band.compared, state.layers.compare], ['', null]);
});

test('a future with several plateaus on top of the drawn one, from an address, is a choice still to make: one entry says so, and the tree has nothing selected', async () => {
  const { sandbox, state } = await openBrightcart();
  typeAddress(sandbox, '#/timeline/applications?compare=future');
  const asking = bandOf(sandbox);
  assert.deepEqual(plain(asking.compare.map((o) => [o.value, o.selected, o.disabled])), [['', false, false], ['future', true, true], ['plateau:baseline', false, true], ['plateau:inhouse', false, false], ['plateau:marketplace', false, false], ['plateau:saas', false, false]]);
  assert.equal(asking.compare[1].label, 'Choose a future plateau');
  assert.equal(sandbox.comparisonState(), null, 'nothing is compared until one is chosen');
  chooseOnBand(sandbox, 'compare', 'plateau:inhouse');
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: 'inhouse', chosen: true });
  assert.ok(!bandOf(sandbox).compare.some((o) => o.value === 'future'), 'the entry that asked is gone once the choice is made');
  assert.equal(bandOf(sandbox).compared, 'plateau:inhouse');
  assert.equal(sandbox.comparisonState().target.id, 'inhouse');
  // the same, then Nothing
  typeAddress(sandbox, '#/timeline/applications?plateau=baseline&compare=future');
  chooseOnBand(sandbox, 'compare', '');
  assert.equal(state.layers.compare, null);
  assert.equal(bandOf(sandbox).compared, '');
});

test('choosing a plateau to compare with is not an entry of the history, and choosing the plateau drawn still is', async () => {
  const { sandbox, state } = await openBrightcart();
  const history = sandbox.__history;
  const start = history.entries.length;
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  assert.equal(history.entries.length, start + 1);
  assert.equal(sandbox.location.hash, '#/timeline/applications?plateau=marketplace');
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  chooseOnBand(sandbox, 'compare', 'past');
  chooseOnBand(sandbox, 'compare', 'plateau:inhouse');
  assert.equal(history.entries.length, start + 1, 'the address does not say the comparison, so it is not an entry');
  assert.equal(sandbox.location.hash, '#/timeline/applications?plateau=marketplace');
  // with a removed element picked, the address says the comparison, in the words it always had
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  const removed = sandbox.comparisonState().layers.application.find((e) => e.change === 'removed' && !e.replaced_by);
  assert.ok(removed, 'the pair has an application only saas has');
  sandbox.selectChange({ thing: 'element', change: 'removed', layer: 'application', ref: removed.reference });
  assert.match(run(sandbox, 'currentRouteHash()'), /compare=other%3Asaas/);
  assert.equal(state.layers.compare.other, 'saas');
});

test('a tree that is blocked, or a plateau compared with that is gone from the tree, leaves Nothing: no entry is selected that is not there', async () => {
  const { sandbox, state } = await openBrightcart();
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  state.layers.blocked = 'blocked for the test';
  assert.deepEqual(plain(bandOf(sandbox).compare.map((o) => o.value)), [''], 'nothing to choose from while the plateaus are blocked');
  state.layers.blocked = null;
  state.layers.compare = { mode: 'other', other: 'gone', chosen: true };
  const band = bandOf(sandbox);
  assert.equal(band.compared, '', 'a plateau that is not in the tree is nothing');
  assert.deepEqual(greyed(band), ['plateau:marketplace']);
});
