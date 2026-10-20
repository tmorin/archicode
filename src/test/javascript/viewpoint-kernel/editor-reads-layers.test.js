'use strict';
// The editor reads layers (wave 014, run 0080, W-6): a plateau is drawn as its chain (the manifests of each layer from `baseline`, then the patches of the layer applied by the
// kernel), the band of plateaus is the way to choose which one is drawn and what it is compared with, and the Changes panel gives, for any two plateaus, the counts and the
// cascade of `archicode diff`. The layered Brightcart (src/test/resources/brightcart/layered/) is the workspace; the counts are read from expected/comparisons.json and the
// table from expected/changes.json, the very files the command line is checked against (BrightcartLayeredDiffTest), and the cascade from layered-cascade-cases.json, which
// that test checks the command line against too. Everything else is invented (a ferry company), small enough to read.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');
const { bandOf, chooseOnBand } = require('./layered-folders');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const expected = (name) => JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', name + '.json'), 'utf8'));
const COMPARISONS = new Map(expected('comparisons').map((c) => [c.id, c]));
const CHANGES = expected('changes');
const CASCADE = JSON.parse(fs.readFileSync(path.join(__dirname, 'layered-cascade-cases.json'), 'utf8'));
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

async function openLayered() {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state };
}

async function openFiles(files, settings) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': settings || 'settings:\n  manifests:\n    paths: ["./**"]\n' }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  return { sandbox, state, mem };
}

/** The counts of a comparison as expected/comparisons.json writes them. */
function countsOf(comparison) {
  const e = comparison.counts.elements;
  return {
    elements: { new: e.new, changed: e.changed, removed: e.removed },
    replacing: { moved: e.moved || 0, split: e.split || 0, merged: e.merged || 0 },
    relationships: { new: comparison.counts.relationships.new, changed: comparison.counts.relationships.changed, removed: comparison.counts.relationships.removed }
  };
}

const wanted = (id) => {
  const c = COMPARISONS.get(id);
  return { elements: c.elements, replacing: c.replacing, relationships: c.relationships };
};

// ---- the order of the band ----

test('a horizon reads as a date when it is a year, a month, a day, a quarter or a half', async () => {
  const { sandbox } = await openFiles({});
  const date = (label) => sandbox.horizonDate(label);
  assert.equal(date('2026'), 20260101);
  assert.equal(date('2026-10'), 20261001);
  assert.equal(date('2026-10-18'), 20261018);
  assert.equal(date('2026-Q4'), 20261001);
  assert.equal(date('2026Q1'), 20260101);
  assert.equal(date('2027-H2'), 20270701);
  for (const none of ['soon', 'Q4 2026', '2026-13', '2026-02-30', '', null, undefined, '2026-Q5']) assert.equal(date(none), null, String(none));
});

test('siblings are placed by horizon when it reads as a date, and by id otherwise: the dated first, a total order', async () => {
  const { sandbox } = await openFiles({});
  const order = (nodes) => nodes.slice().sort(sandbox.compareBandSiblings).map((n) => n.id);
  assert.deepEqual(order([{ id: 'c', horizon: '2027' }, { id: 'a', horizon: '2028-Q1' }, { id: 'b', horizon: '2026-H2' }]), ['b', 'c', 'a'], 'by date, not by id');
  assert.deepEqual(order([{ id: 'b', horizon: '2026-Q4' }, { id: 'a', horizon: '2026-Q4' }]), ['a', 'b'], 'the same date: by id');
  assert.deepEqual(order([{ id: 'a', horizon: 'someday' }, { id: 'z', horizon: '2030' }, { id: 'b', horizon: null }]), ['z', 'a', 'b'], 'what reads as no date comes after, by id');
  assert.deepEqual(order([{ id: 'b' }, { id: 'a' }, { id: 'c', horizon: '' }]), ['a', 'b', 'c']);
});

test('the band of the layered Brightcart is the tree of the four plateaus, the siblings in the order of the rule', async () => {
  const { sandbox, state } = await openLayered();
  assert.deepEqual(Array.from(sandbox.bandOrderOf(state.plateauTree)), ['baseline', 'inhouse', 'marketplace', 'saas'], 'inhouse and saas share a horizon: by id');
  const root = sandbox.bandTreeOf(state.plateauTree);
  assert.equal(root.id, 'baseline');
  assert.deepEqual(plain(root.children.map((c) => c.id)), ['inhouse', 'saas']);
  assert.deepEqual(plain(root.children[0].children.map((c) => c.id)), ['marketplace']);
});

test('a horizon decides the order of the siblings in the page', async () => {
  const plateau = (id, horizon) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  horizon: "' + horizon + '"\n';
  const { sandbox, state } = await openFiles({
    'plateaus/a.yaml': plateau('alpha', '2028'),
    'plateaus/b.yaml': plateau('beta', '2026-Q2'),
    'plateaus/c.yaml': plateau('gamma', '2027-10')
  });
  assert.deepEqual(Array.from(sandbox.bandOrderOf(state.plateauTree)), ['baseline', 'beta', 'gamma', 'alpha']);
  assert.deepEqual(plain(bandOf(sandbox).plateaus.map((o) => o.value)), ['baseline', 'beta', 'gamma', 'alpha'], 'the list of the band is in that order');
});

// ---- the band ----

test('a workspace with no plateau has the band, with baseline alone, drawn, and nothing to compare', async () => {
  const { sandbox, state } = await openFiles({ 'manifests/app.shop.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n' });
  assert.deepEqual(plain(state.layers), { current: 'baseline', compare: null, blocked: null });
  const html = sandbox.renderPlateauBandHtml();
  assert.match(html, /<nav class="plateau-band col-span-3" id="plateau-band" aria-label="Plateaus">/);
  const band = bandOf(sandbox);
  assert.deepEqual(plain(band.plateaus.map((o) => [o.value, o.selected])), [['baseline', true]], 'baseline alone, drawn');
  assert.deepEqual(plain(band.compare.map((o) => [o.value, o.selected, o.disabled])), [['', true, false], ['plateau:baseline', false, true]], 'nothing to compare baseline with: no past, and the only plateau, the one drawn, is greyed');
  assert.equal(band.mistakes, null);
  assert.match(sandbox.renderShellHtml(), /grid-rows-\[auto_auto_auto_minmax\(0,1fr\)\]/, 'the shell has a row for it, and one for the pages below Timeline');
  // a click on it changes nothing
  const before = state.index;
  sandbox.drawPlateau('baseline');
  assert.equal(state.index, before);
  sandbox.toggleCompareWithPast();
  assert.equal(state.layers.compare, null);
  assert.equal(state.index.application.size, 1);
});

test('the band of the layered Brightcart lists the four plateaus in the order of the tree, baseline drawn, and shows the same tree to compare with, the plateau drawn greyed in it', async () => {
  const { sandbox, state } = await openLayered();
  const band = bandOf(sandbox);
  assert.deepEqual(plain(band.plateaus.map((o) => o.value)), ['baseline', 'inhouse', 'marketplace', 'saas'], 'the order of the tree');
  assert.equal(band.drawn, 'baseline');
  assert.match(band.plateaus.find((o) => o.value === 'saas').label, /Buy the commerce platform/, 'an entry says the name of its plateau');
  assert.match(band.plateaus.find((o) => o.value === 'saas').label, /2026-Q4/, 'and its horizon');
  assert.match(band.html, /<option value="marketplace">\u2003\u2003/, 'a plateau is indented by its depth: marketplace overrides inhouse');
  // baseline overrides nothing (no past); the tree is the one of the list Plateau, in the same order, and baseline, which is drawn, is greyed in its place
  assert.deepEqual(plain(band.compare.map((o) => o.value)), ['', 'plateau:baseline', 'plateau:inhouse', 'plateau:marketplace', 'plateau:saas']);
  assert.deepEqual(plain(band.compare.filter((o) => o.disabled).map((o) => o.value)), ['plateau:baseline']);
  assert.deepEqual(plain(band.compare.slice(1).map((o) => o.label)), plain(band.plateaus.map((o) => o.label)), 'the same labels');
  assert.match(band.html, /<select id="band-compare"[\s\S]*<option value="plateau:marketplace">\u2003\u2003/, 'and the same indentation: marketplace overrides inhouse');
  assert.ok(!band.html.includes('optgroup'));
  assert.equal(band.compared, '');
  assert.equal(state.layers.blocked, null);
  assert.ok(!/<(ul|li)\b|data-action="(draw|compare)-/.test(band.html), 'no tree and no button that chooses');
});

test('a choice in the lists of the band is what the buttons were: draw a plateau, compare with the past, the future, or any other plateau, or with nothing', async () => {
  const { sandbox, state } = await openLayered();
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  assert.equal(state.layers.current, 'marketplace');
  assert.equal(bandOf(sandbox).drawn, 'marketplace');
  chooseOnBand(sandbox, 'compare', 'past');
  assert.deepEqual(plain(state.layers.compare), { mode: 'past', other: 'inhouse', chosen: false });
  let band = bandOf(sandbox);
  assert.equal(band.compared, 'past');
  assert.equal(band.compare.find((o) => o.value === 'past').label, 'Past (follows the plateau drawn)');
  chooseOnBand(sandbox, 'compare', 'plateau:saas');
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'saas', chosen: true }, 'a plateau that is neither the past nor a future of the one drawn');
  assert.equal(bandOf(sandbox).compared, 'plateau:saas');
  chooseOnBand(sandbox, 'compare', '');
  assert.equal(state.layers.compare, null);
  assert.equal(bandOf(sandbox).compared, '');
  // inhouse is overridden by marketplace alone: the future is one entry
  chooseOnBand(sandbox, 'plateau', 'inhouse');
  band = bandOf(sandbox);
  assert.deepEqual(plain(band.compare.map((o) => o.value)), ['', 'past', 'plateau:baseline', 'plateau:inhouse', 'plateau:marketplace', 'plateau:saas']);
  chooseOnBand(sandbox, 'compare', 'plateau:marketplace');
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: 'marketplace', chosen: true });
  assert.equal(bandOf(sandbox).compared, 'plateau:marketplace');
  // a list put back on what it was when nothing can be done: the plateaus are blocked (a mistake in the tree), a write is in flight
  state.layers.blocked = 'blocked for the test';
  chooseOnBand(sandbox, 'plateau', 'saas');
  assert.equal(state.layers.current, 'inhouse');
});

test('a workspace with settings.plateaus is refused with the one sentence of the command line, and there is no band and no selector to draw', async () => {
  const mem = memFolder({ 'workspace.yaml': 'settings:\n  plateaus:\n    - id: as-is\n      path: plateaus/10_as-is\n', 'plateaus/10_as-is/app.shop.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n' });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.match(state.fatalError, /^Could not read\/parse workspace\.yaml: `settings\.plateaus` no longer exists: a plateau is a layer now\. Remove the key, write `plateau: <id>` in the header of the manifests of each plateau, /);
  assert.equal(state.workspace, null);
  assert.equal(state.layers, null);
  assert.equal(sandbox.renderPlateauBandHtml(), '');
  assert.doesNotMatch(sandbox.renderShellHtml(), /id="plateau-band"|data-action="set-plateau"|id="compare-to"/);
});

// ---- the plateau drawn: the whole editor draws it ----

test('a click on a node draws that plateau: the elements of its chain, and the sizes the command line gives', async () => {
  const { sandbox, state } = await openLayered();
  const sizes = expected('sizes').plateaus;
  for (const id of ['saas', 'inhouse', 'marketplace', 'baseline']) {
    sandbox.drawPlateau(id);
    assert.equal(state.layers.current, id);
    assert.equal(state.index.application.size, sizes[id].application, id + ': application elements');
    assert.equal(state.index.technology.size, sizes[id].technology, id + ': technology elements');
    assert.equal(state.layerProblems, null);
    assert.deepEqual(plain(state.relationshipStats), { total: sizes[id].relationships, dangling: 0 }, id + ': relationships');
  }
});

test('what is drawn is the plateau: an element a plateau removes is gone, one it adds is there, and the roots follow', async () => {
  const { sandbox, state } = await openLayered();
  assert.ok(state.index.application.has('shop.app.catalog'));
  assert.ok(!state.index.application.has('commerce-saas'));
  sandbox.drawPlateau('saas');
  assert.ok(!state.index.application.has('shop.app.catalog'), 'removed by patch of saas');
  assert.ok(state.index.application.has('commerce-saas'), 'declared by a manifest of saas');
  assert.deepEqual(plain(state.workspace.application.elements.map((r) => r.reference).sort()), Array.from(state.index.application.values()).filter((r) => !r.reference.includes('.')).map((r) => r.reference).sort());
  sandbox.drawPlateau('marketplace');
  assert.ok(!state.index.application.has('commerce-saas'), 'saas is a sibling, not an ancestor');
  assert.ok(state.index.application.has('commerce.gateway'), 'declared by inhouse, inherited by marketplace');
});

test('a patch that sets a field is what the plateau says: the value of the plateau, not the one of the manifest that declares the element', async () => {
  const { sandbox, state } = await openLayered();
  const before = state.index.application.get('shop.web').description;
  sandbox.drawPlateau('saas');
  assert.equal(state.index.application.get('shop.web').description, 'Headless storefront on the commerce platform.');
  assert.notEqual(before, 'Headless storefront on the commerce platform.');
  assert.deepEqual(plain(state.index.application.get('shop.web').qualifiers), ['React', 'Next.js']);
});

/** Every file below `root` as a path -> text object, for a memory folder. */
function filesOf(root) {
  const out = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else out[path.relative(root, full).split(path.sep).join('/')] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(root);
  return out;
}

test('the files of the folder are not read again by a click, and the models of a plateau are kept: a click resolves nothing twice', async () => {
  const mem = memFolder(filesOf(LAYERED));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  assert.ok(state.manifestFiles.length > 40, 'the folder was read');
  mem.failGetFile = 'the folder was read again'; // a read of any file from here on is an error the page would show
  for (const id of ['saas', 'inhouse', 'marketplace', 'baseline', 'marketplace', 'saas']) sandbox.drawPlateau(id);
  assert.equal(state.fatalError, null);
  assert.ok(state.manifestFiles.every((f) => !f.error), 'no file was read again');
  assert.equal(state.layers.current, 'saas');
  const steps = () => run(sandbox, 'layerCache.counters.steps');
  const models = () => run(sandbox, 'layerCache.counters.models');
  const afterFirstRound = { steps: steps(), models: models() };
  assert.equal(afterFirstRound.steps, 4, 'one layer for each plateau, and marketplace reuses the layers of inhouse and baseline');
  assert.equal(afterFirstRound.models, 4);
  for (const id of ['saas', 'inhouse', 'marketplace', 'baseline', 'saas']) sandbox.drawPlateau(id);
  assert.deepEqual({ steps: steps(), models: models() }, afterFirstRound, 'drawing a plateau again resolves nothing');
});

test('a click on the band does not compute more than needed: one comparison per comparison asked for, and none for a plain render', async () => {
  const { sandbox, state } = await openLayered();
  run(sandbox, `globalThis.__spy = { compares: 0 }; const kernel = loadedKernel; const compare = kernel.compare; kernel.compare = function (input) { __spy.compares++; return compare.call(this, input); };`);
  const compares = () => run(sandbox, '__spy.compares');
  sandbox.drawPlateau('saas');
  assert.equal(compares(), 0, 'nothing is compared, so the kernel is not asked');
  sandbox.toggleCompareWithPast();
  sandbox.comparisonState();
  assert.equal(compares(), 1);
  sandbox.comparisonState();
  sandbox.renderShellHtml();
  assert.equal(compares(), 1, 'a render reads the answer it has');
  sandbox.drawPlateau('inhouse');
  sandbox.comparisonState();
  assert.equal(compares(), 2, 'another pair, another answer');
  assert.ok(state.layers.compare && state.layers.compare.mode === 'past');
});

// ---- the counts of the Changes panel: the counts of `archicode diff` ----

const PAIRS = [
  ['P1', 'saas', 'past', 'baseline'],
  ['P2', 'inhouse', 'past', 'baseline'],
  ['P3', 'marketplace', 'past', 'inhouse'],
  ['P5', 'inhouse', 'other', 'saas']
];

for (const [id, drawn, how, other] of PAIRS) {
  test(id + ': ' + drawn + ' compared with ' + other + ' gives the counts of `archicode diff`', async () => {
    const { sandbox, state } = await openLayered();
    sandbox.drawPlateau(drawn);
    if (how === 'past') sandbox.toggleCompareWithPast();
    else sandbox.compareWithPlateau(other);
    assert.equal(state.baseline.plateau.id, other);
    const comparison = sandbox.comparisonState();
    assert.ok(comparison && !comparison.problems, JSON.stringify(comparison && comparison.problems));
    assert.equal(comparison.target.id, drawn);
    assert.equal(comparison.base.id, other);
    assert.deepEqual(countsOf(comparison), wanted(id));
  });

  test(id + ': the panel says the numbers, and the table of changes is the one of expected/changes.json', async () => {
    const { sandbox } = await openLayered();
    sandbox.drawPlateau(drawn);
    if (how === 'past') sandbox.toggleCompareWithPast();
    else sandbox.compareWithPlateau(other);
    const comparison = sandbox.comparisonState();
    const want = CHANGES[id];
    // the states a box gets from what is below it (contains-changes) are the drawing's; a box another one replaced and that stays to hold what was below it is neither counted nor listed
    const wantElements = want.elements.filter((e) => e.state !== 'contains-changes').map((e) => e.layer + '|' + e.ref + '|' + e.state).sort();
    const gotElements = [];
    for (const layer of ['application', 'technology']) {
      for (const e of comparison.layers[layer]) if (e.change !== 'none' && !e.replaced_by) gotElements.push(layer + '|' + e.reference + '|' + e.change);
    }
    assert.deepEqual(gotElements.sort(), wantElements);
    const html = sandbox.renderChangesPanelHtml(comparison);
    assert.match(html, new RegExp('<p class="changes-compared">' + state_title(drawn) + ' compared with ' + state_title(other) + '\\.</p>'));
    for (const [n, label] of [[wanted(id).elements.new, 'new'], [wanted(id).elements.removed, 'removed']]) assert.ok(html.includes('<span class="change-count">' + n + '</span> ' + label), label);
  });
}

/** What the panel calls a plateau: its name, else its id. */
function state_title(id) {
  return { baseline: 'Monolith', saas: 'Buy the commerce platform', inhouse: 'Build commerce services', marketplace: 'Marketplace and personalisation' }[id];
}

test('the future gives the same numbers: the plateau drawn is the base, the plateau that overrides it the target', async () => {
  const { sandbox, state } = await openLayered();
  // inhouse is overridden by marketplace alone: the Future toggle picks it
  sandbox.drawPlateau('inhouse');
  sandbox.toggleCompareWithFuture();
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: 'marketplace', chosen: false });
  let comparison = sandbox.comparisonState();
  assert.equal(comparison.future, true);
  assert.equal(comparison.base.id, 'inhouse');
  assert.equal(comparison.target.id, 'marketplace');
  assert.deepEqual(countsOf(comparison), wanted('P3'));
  // baseline is overridden by two plateaus: the band asks which, and the toggle stays on
  sandbox.drawPlateau('baseline');
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: null, chosen: false });
  assert.equal(sandbox.comparisonState(), null, 'nothing is compared until the target is chosen');
  const asking = bandOf(sandbox);
  assert.deepEqual(plain(asking.compare.map((o) => [o.value, o.selected, o.disabled])), [['', false, false], ['future', true, true], ['plateau:baseline', false, true], ['plateau:inhouse', false, false], ['plateau:marketplace', false, false], ['plateau:saas', false, false]], 'the list says the choice is still to make, and the tree under it has nothing selected');
  assert.match(asking.compare[1].label, /Choose a future plateau/);
  sandbox.compareWithPlateau('saas');
  comparison = sandbox.comparisonState();
  assert.equal(comparison.base.id, 'baseline');
  assert.equal(comparison.target.id, 'saas');
  assert.deepEqual(countsOf(comparison), wanted('P1'));
  // a plateau further down is the future too: the P4 of the document, which the command line gives with the one move less
  sandbox.compareWithPlateau('marketplace');
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: 'marketplace', chosen: true });
  comparison = sandbox.comparisonState();
  assert.equal(comparison.target.id, 'marketplace');
  assert.equal(comparison.base.id, 'baseline');
  assert.deepEqual([comparison.counts.elements.new, comparison.counts.elements.changed, comparison.counts.elements.removed], [39, 3, 7], 'what `diff --plateau marketplace --against baseline` prints (#89)');
});

test('with the future, what the plateau drawn does not have is read from the other one, and what it has is selectable as ever', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('baseline');
  sandbox.compareWithPlateau('saas');
  const comparison = sandbox.comparisonState();
  const commerce = comparison.records.get('application|commerce-saas');
  assert.equal(commerce.change, 'new');
  assert.ok(!state.index.application.has('commerce-saas'));
  assert.equal(sandbox.elementIsOnlyInTheOtherPlateau('application', 'commerce-saas', 'new'), true, 'only in the future');
  assert.equal(sandbox.elementIsOnlyInTheOtherPlateau('application', 'shop.app.catalog', 'removed'), false, 'baseline has it: a box like any other');
  assert.ok(state.index.application.has('shop.app.catalog'));
  // a click on its row picks it, read-only, from the plateau compared with
  sandbox.selectChange({ thing: 'element', change: 'new', layer: 'application', ref: 'commerce-saas' });
  const panel = sandbox.inspectionPanelHtml(state.selection, 'elements');
  assert.match(panel, /inspection-removed/);
  assert.match(panel, /the plateau that overrides this one/);
  assert.match(panel, />new</);
  // and the boxes of the drawing are told, from the union
  const result = { items: [{ id: 'commerce-saas', reference: 'commerce-saas', change: 'new' }, { id: 'shop.app.catalog', reference: 'shop.app.catalog', change: 'removed' }] };
  sandbox.tellRemovedItems(result, comparison, 'application');
  assert.ok(result.items[0].removed, 'the future\'s box is told what it is');
  assert.equal(result.items[1].removed, undefined, 'a removed box of the plateau drawn is a box of the plateau drawn');
  assert.match(sandbox.diagramItemText(result.items[1]).tooltip, /not in the plateau that overrides the one drawn/);
});

test('the two toggles follow the plateau drawn, and the same button again stops the comparison', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('marketplace');
  sandbox.toggleCompareWithPast();
  assert.deepEqual(plain(state.layers.compare), { mode: 'past', other: 'inhouse', chosen: false });
  sandbox.drawPlateau('inhouse');
  assert.deepEqual(plain(state.layers.compare), { mode: 'past', other: 'baseline', chosen: false }, 'the past of the plateau now drawn');
  assert.equal(state.baseline.plateau.id, 'baseline');
  sandbox.drawPlateau('baseline');
  assert.equal(state.layers.compare, null, 'baseline has no past');
  assert.equal(state.baseline, null);
  sandbox.drawPlateau('saas');
  sandbox.toggleCompareWithPast();
  assert.ok(state.layers.compare);
  sandbox.toggleCompareWithPast();
  assert.equal(state.layers.compare, null);
  sandbox.toggleCompareWithFuture();
  assert.equal(state.layers.compare, null, 'saas is overridden by nothing');
});

test('any two nodes of the band can be compared: a sibling is the base, the node again stops it', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('saas'); // a cousin
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'saas', chosen: true });
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.base.id, 'saas');
  assert.equal(comparison.target.id, 'marketplace');
  assert.ok(comparison.counts.elements.new > 0);
  sandbox.drawPlateau('inhouse');
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'saas', chosen: true }, 'the choice stays while it is another plateau');
  sandbox.compareWithPlateau('saas');
  assert.equal(state.layers.compare, null);
});

// ---- the cascade of a REMOVE: where the command line lists it ----

const rowText = (row) => [row.plateau, row.effect, row.layer, row.element, row.detail].join('|');

for (const [id, drawn, how, other] of PAIRS) {
  test(id + ': the cascade of the removals is the one `archicode diff` lists, row by row, in the Changes panel', async () => {
    const { sandbox } = await openLayered();
    sandbox.drawPlateau(drawn);
    if (how === 'past') sandbox.toggleCompareWithPast();
    else sandbox.compareWithPlateau(other);
    const comparison = sandbox.comparisonState();
    assert.deepEqual(plain(comparison.cascade.map(rowText)), CASCADE[id]);
    const html = sandbox.renderChangesPanelHtml(comparison);
    assert.equal((html.match(/class="change-cascade-row"/g) || []).length, CASCADE[id].length);
    assert.match(html, new RegExp('<h4 class="inspection-subhead changes-subhead">Cascade of the removals <span class="field-count">' + CASCADE[id].length + '</span>'));
  });
}

test('against a descendant nothing is removed between the two: no cascade, no section', async () => {
  const { sandbox } = await openLayered();
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('inhouse'); // the past of marketplace: its own removals
  assert.ok(sandbox.comparisonState().cascade.length > 0);
  sandbox.drawPlateau('inhouse');
  sandbox.compareWithPlateau('marketplace'); // the future: marketplace is the target, inhouse the base
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.future, true);
  assert.deepEqual(plain(comparison.cascade.map(rowText)), CASCADE.P3, 'the future of inhouse is the P3 of marketplace');
  sandbox.drawPlateau('baseline');
  sandbox.compareWithPlateau('inhouse');
  assert.deepEqual(plain(sandbox.comparisonState().cascade.map(rowText)), CASCADE.P2);
});

// ---- where a value comes from ----

test('the value of a field says where it comes from: declared in the plateau, inherited from another, set by patch N', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  const web = state.index.application.get('shop.web');
  assert.equal(web.declaredIn, 'baseline');
  const description = sandbox.fieldOriginOf(web, 'description');
  assert.equal(description.kind, 'patch');
  assert.equal(description.plateau, 'saas');
  assert.equal(description.operator, 'SET');
  assert.equal(description.selector, 'target shop.web');
  assert.ok(Number.isInteger(description.rank) && description.rank > 0);
  assert.equal(description.inherited, false);
  assert.equal(sandbox.originText(description), 'set by patch ' + description.rank + ' of saas (SET target shop.web)');
  const name = sandbox.fieldOriginOf(web, 'name');
  assert.deepEqual(plain(name), { kind: 'inherited', plateau: 'baseline', inherited: true });
  assert.equal(sandbox.originText(name), 'inherited from baseline');
  const saas = state.index.application.get('commerce-saas');
  assert.equal(saas.declaredIn, 'saas');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(saas, 'name')), 'declared in saas');
  // in a plateau further down, what a patch of an ancestor set is inherited
  sandbox.drawPlateau('baseline');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(state.index.application.get('shop.web'), 'name')), 'declared in baseline');
  sandbox.drawPlateau('marketplace');
  const gateway = state.index.application.get('commerce.gateway');
  assert.equal(gateway.declaredIn, 'inhouse');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(gateway, 'description')), 'inherited from inhouse');
});

test('the origin is on the page: after each value of an element, and as a block with the patches that selected it', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  const record = state.index.application.get('shop.web');
  const properties = sandbox.renderElementPropertiesHtml(record);
  assert.match(properties, /<span class="field-origin" data-origin="patch" data-field="description" title="set by patch \d+ of saas \(SET target shop\.web\)">set by patch \d+ of saas \(SET target shop\.web\)<\/span>/);
  assert.match(properties, /data-origin="inherited" data-field="name"[^>]*>inherited from baseline</);
  assert.match(properties, /data-origin="patch" data-field="qualifiers"/);
  const view = sandbox.renderElementViewHtml('shop.web');
  assert.match(view, /<section class="origin-block" aria-label="Origin" data-declared-in="baseline">/);
  assert.match(view, /inherited from baseline/);
  assert.match(view, /patch \d+ of saas: SET target shop\.web/);
  assert.match(view, /data-origin="[a-z]+" data-field="relationships"/, 'the relationships row says too');
  const panel = sandbox.inspectionPanelHtml({ kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' }, 'elements');
  assert.match(panel, /class="origin-block"/);
  // a workspace with no layers says nothing of the kind
  const plain_ = await openFiles({ 'manifests/app.shop.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n' });
  assert.doesNotMatch(plain_.sandbox.renderElementPropertiesHtml(plain_.state.index.application.get('shop')), /field-origin/);
  assert.doesNotMatch(plain_.sandbox.renderElementViewHtml('shop'), /origin-block/);
});

// ---- the mistakes of a layer name the plateau ----

const SYSTEM = (id, extra, plateau, parent) =>
  'header:\n  kind: "archicode.morin.io/system"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n' + (extra || '');
const PLATEAU = (id, body, override) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '') + (body || '');

test('a patch that selects nothing is the sentence of the command line, naming the plateau and the patch, and the plateau is not drawn', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: SET\n      target: nope\n      field: name\n      value: x\n')
  });
  sandbox.drawPlateau('later');
  assert.equal(state.layers.current, 'later');
  assert.deepEqual(plain(state.layerProblems), ['plateau later: patch 1 (SET target nope): selects nothing, there is no element nope in the application layer']);
  assert.equal(state.layerUndrawable, true);
  assert.equal(state.index.application.size, 0, 'nothing of it is drawn');
  const band = bandOf(sandbox);
  assert.equal(band.mistakes, '! 1 mistake', 'the band has one button, that says there is a mistake');
  assert.match(band.plateaus.find((o) => o.value === 'later').label, /^! later/, 'and the plateau is marked in the list');
  assert.match(sandbox.renderMistakesDialogBodyHtml(), /<strong>later cannot be drawn\.<\/strong><ul><li>plateau later: patch 1 \(SET target nope\)/, 'the button opens the sentences of the command line');
  assert.deepEqual(plain(sandbox.comparisonState()), null, 'nothing is compared');
  sandbox.toggleCompareWithPast();
  assert.match(sandbox.comparisonState().problems[0], /cannot be drawn, so there is nothing to compare/);
  // baseline is still there to go back to
  sandbox.drawPlateau('baseline');
  assert.equal(state.layerProblems, null);
  assert.ok(state.index.application.has('ferry'));
});

test('a plateau the command line refuses for a link to nothing is drawn all the same, with the sentence, so that it can be repaired; the plateaus above tell the same', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry', '  relationships:\n    - destination: "dock"\n      label: "uses"\n    - destination: "lost"\n'),
    'app.dock.yaml': SYSTEM('dock'),
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: REMOVE\n      target: dock\n'),
    'env.yaml': 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "prod"\n  uses: ["nowhere"]\n  elements:\n    - kind: node\n      id: "vm"\n      applications: ["ferry", "gone"]\n'
  });
  assert.deepEqual(plain(state.layerProblems), [
    'in the plateau `baseline`, `ferry` has a relationship towards `lost`, which does not exist',
    'in the plateau `baseline`, `prod` uses `nowhere`, which does not exist',
    'in the plateau `baseline`, `prod.vm` hosts `gone`, which does not exist'
  ], 'by element, then by what it points at, as the command line orders them');
  assert.equal(state.layerUndrawable, false);
  assert.ok(state.index.application.has('ferry') && state.index.application.has('dock'), 'it is drawn');
  assert.equal(state.relationshipStats.dangling, 1, 'and the link to nothing is flagged as ever');
  sandbox.drawPlateau('later');
  assert.deepEqual(plain(state.layerProblems), plain(sandbox.layerModelOf('baseline', state.workspace.settings).problems), 'the first layer that is wrong ends the chain, and says what is wrong in it');
  assert.equal(sandbox.layerModelOf('later', state.workspace.settings).failedAt, 'baseline');
  assert.ok(!state.index.application.has('dock'), 'later is drawn');
  const band = bandOf(sandbox);
  assert.match(sandbox.renderMistakesDialogBodyHtml(), /later is drawn, and the command line refuses it:/);
  assert.equal(band.mistakes, '! 3 mistakes', 'every sentence is counted');
  assert.match(band.plateaus.find((o) => o.value === 'baseline').label, /^! /, 'the plateau that is wrong in the chain is marked in the list');
});

test('the cascade of a REMOVE takes the link to the removed element, so the plateau that removes it is not wrong for it', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry', '  relationships:\n    - destination: "dock"\n      label: "uses"\n'),
    'app.dock.yaml': SYSTEM('dock'),
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: REMOVE\n      target: dock\n')
  });
  sandbox.drawPlateau('later');
  assert.equal(state.layerProblems, null);
  assert.ok(!state.index.application.has('dock'));
  assert.equal(state.index.application.get('ferry').relationships.length, 0, 'the cascade took the link');
  sandbox.toggleCompareWithPast();
  const comparison = sandbox.comparisonState();
  assert.deepEqual(plain(comparison.cascade.map(rowText)), ['later|dropped|application|ferry|relationships: dock (uses)']);
});

test('an element declared under a parent that does not exist names the plateau, and a view or a story that names an element no plateau has is told apart from the plateaus', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/plateau.yaml': PLATEAU('later'),
    'later/app.ferry.dock.yaml': 'header:\n  kind: "archicode.morin.io/container"\n  parent: "ferry.lost"\n  plateau: later\n  version: "1"\ncontent:\n  id: "dock"\n'
  });
  sandbox.drawPlateau('later');
  assert.deepEqual(plain(state.layerProblems), ['in the plateau `later`, `ferry.lost.dock` is declared under `ferry.lost`, which does not exist']);
  assert.ok(state.index.application.has('ferry.lost.dock'), 'it stays at the top under the reference its manifest gives it, and can be repaired');
  assert.equal(sandbox.findElementRecord('ferry.lost.dock').sourceFile, 'later/app.ferry.dock.yaml');
  const files = {
    'app.ferry.yaml': SYSTEM('ferry'),
    'view.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "v"\n  viewpoint: "overview"\n  properties:\n    element: "ferry"\n    pinned: ["ghost"]\n',
    'story.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  plateau: later\n  version: "1"\ncontent:\n  id: "s"\n  steps:\n    - viewpoint: "overview"\n      layer: TECHNOLOGY\n      properties:\n        element: "vm"\n',
    'later/plateau.yaml': PLATEAU('later')
  };
  const second = await openFiles(files);
  // what a view and a story name is not a mistake of a plateau (run 0100, issue #100): no layer is wrong, and the page tells the entries once, whatever plateau is drawn
  assert.equal(second.sandbox.layerModelOf('baseline', second.state.workspace.settings).problems, null);
  const told = [
    'the view `v` (`view.yaml`) names `ghost`, which exists in no plateau',
    'the story `s` (`story.yaml`) names `vm`, which exists in no plateau'
  ];
  assert.deepEqual(plain(second.sandbox.entryProblemsOf(second.state.workspace.settings)), told);
  for (const drawn of ['baseline', 'later']) {
    second.sandbox.drawPlateau(drawn);
    assert.equal(second.state.layerProblems, null, drawn + ': the layers are fine');
    assert.deepEqual(plain(second.sandbox.bandMistakes().sections), [{ heading: 'The views and the stories name elements that no plateau has:', lines: told }], drawn);
    assert.equal(second.sandbox.bandMistakes().count, 2);
  }
  // a name that another plateau has is no mistake: the story names `vm`, which `later` declares
  const third = await openFiles(Object.assign({}, files, {
    'view.yaml': files['view.yaml'].replace('pinned: ["ghost"]', 'pinned: ["ferry"]'),
    'later/env.vm.yaml': 'header:\n  kind: "archicode.morin.io/environment"\n  plateau: later\n  version: "1"\ncontent:\n  id: "vm"\n'
  }));
  assert.deepEqual(plain(third.sandbox.entryProblemsOf(third.state.workspace.settings)), []);
  assert.equal(third.sandbox.bandMistakes().count, 0);
  third.sandbox.drawPlateau('baseline');
  assert.equal(third.sandbox.viewProblem(third.sandbox.findSavedView('v')), null);
});

test('the views and the stories that workspace.yaml keeps are looked at too, after those of the manifests, unless a manifest has the id', async () => {
  const settings = 'settings:\n  manifests:\n    paths: ["./**"]\nviews:\n  - id: old\n    viewpoint: overview\n    layer: Technology\n    properties:\n      element: ghost\n  - id: shadowed\n    viewpoint: overview\n    properties:\n      element: nowhere\nstories:\n  - id: tale\n    steps:\n      - viewpoint: overview\n        properties:\n          element: gone\n';
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/plateau.yaml': PLATEAU('later'),
    'view.shadowed.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "shadowed"\n  viewpoint: "overview"\n  properties:\n    element: "ferry"\n'
  }, settings);
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [
    'the view `old` (`workspace.yaml`) names `ghost`, which exists in no plateau',
    'the story `tale` (`workspace.yaml`) names `gone`, which exists in no plateau'
  ]);
});

test('a view or a story that says `plateau:` is not told, with or without plateaus in the workspace: the key names none and means nothing', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'story.tour.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  plateau: later\n  version: "1"\ncontent:\n  id: "tour"\n  steps: []\n'
  });
  assert.equal(state.plateauTree.layered, false);
  assert.deepEqual(Array.from(state.plateauTree.warnings), []);
  assert.deepEqual(Array.from(state.plateauTree.problems), []);
  assert.deepEqual(Array.from(state.plateauTree.ids), ['baseline']);
  assert.doesNotMatch(sandbox.renderPlateauTreeHtml(), /story\.tour\.yaml|ignored/);
});

test('a mistake in the tree leaves baseline drawn and the other nodes out, with the reason', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'a.yaml': PLATEAU('one', '', 'nowhere')
  });
  assert.ok(state.plateauTree.problems.length > 0);
  assert.equal(state.layers.current, 'baseline');
  assert.ok(state.index.application.has('ferry'));
  const band = bandOf(sandbox);
  assert.match(sandbox.renderMistakesDialogBodyHtml(), /The plateaus have a mistake/);
  assert.equal(band.mistakes, '! 1 mistake');
  assert.equal(band.disabled, true, 'only baseline is drawn: nothing to choose');
  assert.deepEqual(plain(band.plateaus.map((o) => o.value)), ['baseline'], 'the plateau with the mistake is not offered: it is not drawn');
  sandbox.drawPlateau('one');
  assert.equal(state.layers.current, 'baseline');
});

test('settings.current names the plateau drawn at the opening, and one that is not a plateau is the sentence of the command line', async () => {
  const files = { 'app.ferry.yaml': SYSTEM('ferry'), 'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: REMOVE\n      target: ferry\n') };
  const { state } = await openFiles(files, 'settings:\n  current: later\n  manifests:\n    paths: ["./**"]\n');
  assert.equal(state.layers.current, 'later');
  assert.equal(state.index.application.size, 0);
  const bad = await openFiles(files, 'settings:\n  current: nope\n  manifests:\n    paths: ["./**"]\n');
  assert.equal(bad.state.fatalError, 'Could not read the plateaus of workspace.yaml:\n`settings.current` names the plateau `nope`, which is not a plateau of this workspace (the plateaus are `baseline`, `later`)');
  const none = await openFiles({ 'app.ferry.yaml': SYSTEM('ferry') }, 'settings:\n  current: later\n');
  assert.equal(none.state.fatalError, 'Could not read the plateaus of workspace.yaml:\n`settings.current` is `later` but the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)');
});

// ---- writing ----

test('a plateau that cannot be drawn is not written: every writer refuses with one sentence, and baseline edits as it did', async () => {
  // (run 0082 lifts the rule of run 0080 for the plateau drawn; what stays is a plateau whose patches the kernel refuses: it has no graph to edit)
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: SET\n      target: nope\n      field: name\n      value: x\n')
  });
  assert.equal(sandbox.readOnlyPlateauMessage(), null);
  sandbox.drawPlateau('later');
  const message = sandbox.readOnlyPlateauMessage();
  assert.equal(message, 'The plateau `later` cannot be drawn, so nothing is written in it: repair its patches in Files first.');
  assert.match(sandbox.renderMistakesDialogBodyHtml(), /<p class="band-readonly">The plateau <code>later<\/code> cannot be drawn, so nothing is written in it/, 'the dialog of the mistakes says why nothing is written');
  for (const write of [
    () => sandbox.commitElementEdit('ferry', (node) => { node.name = 'x'; }, 'application'),
    () => sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'zz', name: 'zz', description: '' }),
    () => sandbox.commitDeleteElement('ferry', 'application', [])
  ]) assert.throws(write, (e) => e.message === message);
  assert.ok(state.manifestFiles.every((f) => !f.dirty), 'nothing was marked as modified');
  // the click on a button that writes says it in the top bar and changes nothing
  sandbox.handleAppClick({ target: { closest: () => ({ getAttribute: (name) => (name === 'data-action' ? 'toggle-element-edit' : null) }), classList: { contains: () => false } } });
  assert.deepEqual(plain(state.selection.mode), 'view');
  assert.equal(run(sandbox, 'saveStatus.state'), 'denied');
  assert.equal(run(sandbox, 'saveStatus.message'), message);
  // baseline: as before
  sandbox.drawPlateau('baseline');
  assert.equal(sandbox.readOnlyPlateauMessage(), null);
  sandbox.commitElementEdit('ferry', (node) => { node.name = 'Ferry company'; }, 'application');
  assert.equal(state.index.application.get('ferry').name, 'Ferry company');
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 1);
});

test('Write replaces is written on the element of the more recent plateau, with the future as with the past', async () => {
  const files = {
    'app.ferry.yaml': SYSTEM('ferry'),
    'app.ferry.dock.yaml': 'header:\n  kind: "archicode.morin.io/container"\n  parent: "ferry"\n  version: "1"\ncontent:\n  id: "dock"\n  name: "Dock planner"\n  description: "Plans the docks"\n',
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: REMOVE\n      target: ferry.dock\n'),
    'later/app.ferry.harbour.yaml': 'header:\n  kind: "archicode.morin.io/container"\n  parent: "ferry"\n  plateau: later\n  version: "1"\ncontent:\n  id: "harbour"\n  name: "Dock planner"\n  description: "Plans the docks"\n'
  };
  for (const how of ['past', 'future']) {
    const { sandbox, state, mem } = await openFiles(files);
    if (how === 'past') { sandbox.drawPlateau('later'); sandbox.toggleCompareWithPast(); }
    else { sandbox.toggleCompareWithFuture(); }
    const comparison = sandbox.comparisonState();
    assert.deepEqual(plain(comparison.candidates.map((c) => c.from + '>' + c.to)), ['ferry.dock>ferry.harbour'], how);
    const result = sandbox.acceptCandidate(comparison.candidates[0]);
    assert.equal(result.ok, true, how + ': ' + (result.message || ''));
    const file = state.manifestFiles.find((f) => f.relPath === 'later/app.ferry.harbour.yaml');
    assert.equal(file.dirty, true, how + ': the manifest of the new element is the one written');
    assert.match(file.rawText, /replaces:\n\s+- "ferry\.dock"/);
    assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 1, 'and nothing else');
    // and the comparison now says moved, not new and removed
    const after = sandbox.comparisonState();
    assert.equal(after.counts.elements.moved, 1, how);
    assert.equal(mem.writes.length, 0, 'nothing is written to the disk before Save');
  }
  // an element the plateau inherits is declared in the plateau above: refused, nothing written
  const { sandbox, state } = await openFiles(files);
  sandbox.drawPlateau('later');
  sandbox.toggleCompareWithPast();
  const refused = sandbox.acceptCandidate({ layer: 'application', from: 'ferry.dock', to: 'ferry' });
  assert.equal(refused.ok, false);
  assert.ok(state.manifestFiles.every((f) => !f.dirty));
});

test('"Not related" sets a pair aside for the two plateaus compared, on any pair', async () => {
  const files = {
    'app.ferry.yaml': SYSTEM('ferry'),
    'app.ferry.dock.yaml': 'header:\n  kind: "archicode.morin.io/container"\n  parent: "ferry"\n  version: "1"\ncontent:\n  id: "dock"\n  name: "Dock planner"\n',
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: REMOVE\n      target: ferry.dock\n'),
    'later/app.ferry.harbour.yaml': 'header:\n  kind: "archicode.morin.io/container"\n  parent: "ferry"\n  plateau: later\n  version: "1"\ncontent:\n  id: "harbour"\n  name: "Dock planner"\n'
  };
  const { sandbox } = await openFiles(files);
  sandbox.drawPlateau('later');
  sandbox.toggleCompareWithPast();
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.candidates.length, 1);
  const html = sandbox.renderChangesPanelHtml(comparison);
  assert.match(html, /data-action="accept-candidate"[^>]*>Write replaces</);
  assert.match(html, /data-action="dismiss-candidate"[^>]*>Not related</);
  sandbox.dismissCandidate(comparison.candidates[0]);
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /data-action="accept-candidate"/);
});

// ---- what the page remembers ----

test('the plateau drawn and the comparison are remembered for the folder and come back at the next opening', async () => {
  const first = await openLayered();
  first.sandbox.drawPlateau('marketplace');
  first.sandbox.toggleCompareWithPast();
  assert.equal(run(first.sandbox, 'layerCompareChoice()'), 'past');
  // the choice is kept by folder in the page itself when the storage is refused (`chosenPlateaus`): reopening in the same page finds it
  const state = first.sandbox.__state();
  await first.sandbox.loadWorkspace(state.folder.handle);
  assert.equal(first.sandbox.__state().layers.current, 'marketplace');
  assert.deepEqual(plain(first.sandbox.__state().layers.compare), { mode: 'past', other: 'inhouse', chosen: false });
});

test('the address names the plateau and the comparison, and a removed element picked in a comparison is addressed with them', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  sandbox.toggleCompareWithPast();
  assert.match(run(sandbox, 'currentRouteHash()'), /plateau=saas/);
  sandbox.selectChange({ thing: 'element', change: 'removed', layer: 'application', ref: 'shop.app.cart' });
  const hash = run(sandbox, 'currentRouteHash()');
  assert.match(hash, /removed=shop\.app\.cart/);
  assert.match(hash, /compare=past/);
  assert.match(hash, /plateau=saas/);
  sandbox.drawPlateau('baseline');
  assert.doesNotMatch(run(sandbox, 'currentRouteHash()'), /plateau=/, 'the root is the default');
  assert.ok(state.layers);
});

test('a comparison with a plateau chosen on the band is read as it stands to the plateau drawn, whichever way it was reached', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('inhouse');
  sandbox.compareWithPlateau('saas'); // a sibling: the base
  sandbox.drawPlateau('baseline'); // saas is now below the plateau drawn: the future
  assert.deepEqual(plain(state.layers.compare), { mode: 'future', other: 'saas', chosen: true });
  const viaTheSibling = sandbox.comparisonState();
  assert.deepEqual(countsOf(viaTheSibling), wanted('P1'), 'the pair has one answer, the one of `diff --plateau saas`');
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('baseline'); // an ancestor that is not the parent: the base
  assert.deepEqual(plain(state.layers.compare), { mode: 'other', other: 'baseline', chosen: true });
  sandbox.drawPlateau('inhouse');
  assert.deepEqual(plain(state.layers.compare), { mode: 'past', other: 'baseline', chosen: false }, 'it is the plateau inhouse overrides now: the past');
});

test('the relationships of the table of expected/changes.json are the ones of the Changes panel, with a label change as one row', async () => {
  const { sandbox } = await openLayered();
  for (const [id, drawn, how, other] of PAIRS) {
    sandbox.drawPlateau('baseline');
    sandbox.drawPlateau(drawn);
    if (how === 'past') sandbox.toggleCompareWithPast();
    else sandbox.compareWithPlateau(other);
    const comparison = sandbox.comparisonState();
    const labelBefore = new Map(comparison.changes.filter((c) => c.thing === 'relationship' && c.change === 'changed').map((c) => [c.layer + '|' + c.reference + '|' + c.destination + '|' + c.label, c.before && c.before.label]));
    const got = [];
    for (const layer of ['application', 'technology']) {
      for (const element of comparison.layers[layer]) {
        for (const r of element.relationships) {
          if (r.change === 'none' || r.change === undefined) continue;
          const before = labelBefore.get(r.layer + '|' + r.from + '|' + r.destination + '|' + r.label);
          const labelChanged = r.change === 'changed' && before !== undefined && before !== r.label;
          got.push([r.layer, r.from, r.destination, labelChanged ? before : r.label, labelChanged ? 'label-changed' : r.change].join('|'));
        }
      }
    }
    const want = CHANGES[id].relationships.map((r) => [r.layer, r.source, r.destination, r.label, r.state].join('|'));
    assert.deepEqual(got.sort(), want.sort(), id);
  }
});

test('what an edit of baseline changes is seen by the plateaus that stand on it: the cache is not served after an edit', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('inhouse');
  assert.equal(state.index.application.get('commerce.gateway').name, 'API gateway');
  sandbox.drawPlateau('baseline');
  sandbox.commitElementEdit('shop.web', (node) => { node.name = 'Storefront'; }, 'application', { confirmed: true }); // (run 0082: a plateau with plateaus on top of it asks first)
  assert.equal(state.index.application.get('shop.web').name, 'Storefront');
  sandbox.drawPlateau('saas');
  assert.equal(state.index.application.get('shop.web').name, 'Storefront', 'saas inherits the new name');
  assert.equal(state.index.application.get('shop.web').description, 'Headless storefront on the commerce platform.', 'and keeps what its patch sets');
  const steps = run(sandbox, 'layerCache.counters.steps');
  assert.ok(steps <= 4, 'the cache of the new tree: baseline, saas (resolved on the way), the other plateaus when they are asked for: ' + steps);
});

test('a plateau a patch of an earlier layer cannot be built on is told with the earlier layer, as the command line stops there', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry', '  relationships:\n    - destination: "lost"\n'),
    'later/plateau.yaml': PLATEAU('later', '  patches:\n    - operator: SET\n      target: nope\n      field: name\n      value: x\n')
  });
  sandbox.drawPlateau('later');
  assert.equal(state.layerUndrawable, true);
  assert.deepEqual(plain(state.layerProblems), ['in the plateau `baseline`, `ferry` has a relationship towards `lost`, which does not exist']);
  assert.equal(sandbox.layerModelOf('later', state.workspace.settings).failedAt, 'baseline');
});

test('what the cascade of a REMOVE took out of an element that stays says so in the origin of that field', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  const vm = state.index.technology.get('staging.vm');
  const origin = sandbox.fieldOriginOf(vm, 'applications');
  assert.equal(origin.kind, 'patch');
  assert.equal(origin.operator, 'REMOVE');
  assert.equal(origin.plateau, 'saas');
  assert.match(sandbox.originText(origin), /^taken out by patch \d+ of saas \(REMOVE target shop\.cache\)$/);
});

test('the band keeps the focus where it was: a list of the band is found again after the page is drawn', async () => {
  const { sandbox } = await openLayered();
  const control = (id) => ({ getAttribute: () => null, id });
  for (const id of ['band-plateau', 'band-compare']) {
    const el = { closest: (selector) => (/plateau-band select/.test(selector) ? control(id) : null) };
    assert.equal(sandbox.headerControlSelector(el), '#' + id);
  }
  const mistakes = { closest: (selector) => (/plateau-band button/.test(selector) ? { getAttribute: (name) => (name === 'data-action' ? 'open-mistakes' : null), id: '' } : null) };
  assert.equal(sandbox.headerControlSelector(mistakes), '[data-action="open-mistakes"]');
});

test('a selection that was a form to create something does not outlive the plateau it was opened in', async () => {
  const { sandbox, state } = await openLayered();
  state.selection = { kind: 'create', createMode: 'child', category: 'application', parentReference: 'shop.app.catalog' };
  sandbox.drawPlateau('saas');
  assert.equal(state.selection.kind, 'none');
});

test('the fields of a view and of a story are written whatever plateau is drawn: they belong to none', async () => {
  const { sandbox, state } = await openFiles({
    'app.ferry.yaml': SYSTEM('ferry'),
    'view.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "v"\n  name: "First"\n  viewpoint: "overview"\n  properties:\n    element: "ferry"\n',
    'story.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "s"\n  name: "Tale"\n  steps: []\n',
    'later/plateau.yaml': PLATEAU('later')
  });
  run(sandbox, "currentPerspective = 'library'; libraryTab = 'views'; selectedViewId = 'v';");
  for (const drawn of ['later', 'baseline']) {
    sandbox.drawPlateau(drawn);
    run(sandbox, "currentPerspective = 'library'; libraryTab = 'views'; selectedViewId = 'v';");
    const name = drawn === 'later' ? 'Second' : 'Third';
    assert.equal(sandbox.editSavedView((view) => { view.name = name; }, false), true, drawn);
    assert.equal(run(sandbox, "savedViews()[0].name"), name);
    sandbox.updateStoryField({ getAttribute: (attribute) => ({ 'data-story': 's', 'data-story-field': 'name' }[attribute]), value: 'Other ' + name });
    assert.equal(run(sandbox, "storiesList()[0].name"), 'Other ' + name);
    assert.notEqual(run(sandbox, 'saveStatus.state'), 'denied', drawn);
  }
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 2, 'the view and the story are the two files written');
});
