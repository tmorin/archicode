'use strict';
// What a step draws, what the kernel is given and what the cache remembers about a highlight (wave 026, run 0200, issue #143, TDD DEC-1, DEC-2, DEC-3, DEC-6; REQ-1, REQ-3, REQ-7). RED until the
// editor has `mapHighlight`, `stepViewForDrawing` and the `highlight` of the kernel input: today the editor keeps a `highlight` verbatim and never sends it. The bookshop of the manual
// (domain_plateaus) is opened in memory; its `to-be` plateau no longer has the mailer.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { BOOKSHOP, entry, run, plain, openWorkspace, addMapView } = require('./map-links-support');

const ORDERS = entry('customer', 'shop.web', 'orders on');
const READS = entry('shop.web', 'shop.catalog', 'reads');
const MAILS = entry('shop.web', 'shop.mailer', 'sends mails with');
const PAYS = entry('shop.web', 'shop.payments', 'pays with');
const keys = (list) => list.map((e) => JSON.stringify([e.source, e.destination, e.label || ''])).sort();

const recipeOf = (page, view) =>
  plain(run(page.sandbox, `viewDiagramRecipe(findSavedView(${JSON.stringify(view.id)}), AppState.index, 'library')`));
const drawn = (page, step) => plain(run(page.sandbox, 'stepViewForDrawing(' + JSON.stringify(step) + ')'));

test('a step that has no highlight key draws the view it names, the very object', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'one', { opened: ['shop'], links: [ORDERS, READS], highlight: [ORDERS] });
  page.sandbox.__step = { view: view.id };
  assert.equal(run(page.sandbox, 'stepViewForDrawing(__step) === stepView(__step)'), true);
  assert.equal(run(page.sandbox, 'stepViewForDrawing(__step) === findSavedView("one")'), true);
});

test('a step key replaces the highlight of the view it names, and the saved view is not touched', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'one', { opened: ['shop'], links: [ORDERS, READS], highlight: [ORDERS] });
  const before = JSON.stringify(view);
  const got = drawn(page, { view: view.id, highlight: [READS] });
  assert.deepEqual(got.properties.highlight, [READS], 'replaced, not merged');
  assert.deepEqual(got.properties.links, [ORDERS, READS], 'the rest of the view is the view’s');
  assert.equal(got.id, view.id);
  assert.equal(JSON.stringify(page.sandbox.findSavedView(view.id)), before, 'the saved view is untouched');
  assert.equal(run(page.sandbox, 'stepViewForDrawing({ view: "one", highlight: [] }) !== findSavedView("one")'), true);
});

test('an empty list in the step switches the highlight of the view off', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'one', { opened: ['shop'], links: [ORDERS], highlight: [ORDERS] });
  const got = drawn(page, { view: view.id, highlight: [] });
  assert.deepEqual(got.properties.highlight, []);
  const withoutKey = recipeOf(page, { id: view.id });
  assert.deepEqual(withoutKey.mapState.highlight, [ORDERS], 'the view alone still highlights');
});

test('a step with its own recipe: the step key wins over properties.highlight of the same step', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const step = {
    viewpoint: 'map',
    layer: 'application',
    properties: { links: [ORDERS, READS], highlight: [ORDERS] },
    highlight: [READS]
  };
  const got = drawn(page, step);
  assert.deepEqual(got.properties.highlight, [READS]);
  assert.deepEqual(got.properties.links, [ORDERS, READS]);
  const alone = drawn(page, { viewpoint: 'map', layer: 'application', properties: { highlight: [ORDERS] } });
  assert.deepEqual(alone.properties.highlight, [ORDERS], 'no key: the recipe as it was');
});

test('the recipe of a view carries its highlight, filtered by the model drawn like links are', async () => {
  const page = await openWorkspace(BOOKSHOP, 'to-be');
  const view = addMapView(page, 'in_tobe', { opened: ['shop'], links: [MAILS, PAYS], highlight: [MAILS, PAYS] });
  const recipe = recipeOf(page, view);
  assert.deepEqual(recipe.mapState.highlight, [PAYS], 'the mailer is not in the to-be plateau');
  assert.deepEqual(recipe.mapState.links, [PAYS]);
  const ghost = addMapView(page, 'ghost', { links: [PAYS], highlight: [MAILS] });
  assert.equal(
    'highlight' in recipeOf(page, ghost).mapState || recipeOf(page, ghost).mapState.highlight.length === 0,
    true,
    'an entry the plateau lacks makes no highlight, and never makes "nothing is drawn"'
  );
  assert.equal(run(page.sandbox, 'viewProblem(findSavedView("ghost"))'), null);
});

test('the kernel is given highlight only when it is not empty, and only for the Map of the application layer', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const input = (options) =>
    plain(run(page.sandbox, 'buildKernelInput("map", "", ' + JSON.stringify(options) + ').input'));
  assert.deepEqual(input({ layer: 'application', links: [ORDERS], highlight: [ORDERS] }).highlight, [ORDERS]);
  assert.equal('highlight' in input({ layer: 'application', links: [ORDERS], highlight: [] }), false);
  assert.equal(
    'highlight' in input({ layer: 'application', links: [ORDERS] }),
    false,
    'the input of before, key for key'
  );
  assert.equal('highlight' in input({ layer: 'technology', highlight: [ORDERS] }), false);
});

test('the live state: currentMapState gives the entries of mapHighlight the model has, and the folder reset forgets it', async () => {
  const page = await openWorkspace(BOOKSHOP, 'to-be');
  await page.go('map');
  run(page.sandbox, 'mapHighlight = ' + JSON.stringify([PAYS, MAILS]) + ';');
  assert.deepEqual(plain(run(page.sandbox, 'currentMapState().highlight')), [PAYS]);
  assert.deepEqual(plain(run(page.sandbox, 'mapHighlight')), [PAYS, MAILS], 'the author’s choice is not rewritten');
  const snapshot = run(page.sandbox, 'snapshotWriteState()');
  run(page.sandbox, 'mapHighlight = [];');
  page.sandbox.restoreWriteState(snapshot);
  assert.deepEqual(keys(plain(run(page.sandbox, 'mapHighlight'))), keys([PAYS, MAILS]), 'a refused write puts it back');
  const version = run(page.sandbox, 'modelVersion');
  run(page.sandbox, 'resetUiState();');
  assert.deepEqual(plain(run(page.sandbox, 'mapHighlight')), []);
  assert.equal(run(page.sandbox, 'modelVersion'), version, 'view state: no model changed');
});

test('the cache key and the view key hold the highlight only when there is one, so a map without one keeps its key', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const key = (properties) => {
    const view = addMapView(page, 'k' + Math.random().toString(36).slice(2, 8), properties);
    return run(
      page.sandbox,
      `diagramCacheKey(viewDiagramRecipe(findSavedView(${JSON.stringify(view.id)}), AppState.index, 'library'), null, 'v')`
    );
  };
  const without = key({ opened: ['shop'], links: [ORDERS, READS] });
  assert.equal(key({ opened: ['shop'], links: [ORDERS, READS], highlight: [] }), without, 'highlight: [] is none');
  assert.doesNotMatch(without, /highlight/);
  const one = key({ opened: ['shop'], links: [ORDERS, READS], highlight: [ORDERS] });
  const other = key({ opened: ['shop'], links: [ORDERS, READS], highlight: [READS] });
  assert.notEqual(one, without);
  assert.notEqual(one, other);
  assert.equal(
    key({ opened: ['shop'], links: [ORDERS, READS], highlight: [READS, ORDERS] }),
    key({ opened: ['shop'], links: [ORDERS, READS], highlight: [ORDERS, READS] }),
    'the order of the entries is not a choice'
  );
});

test('a highlight of the wrong shape or that names nothing says the sentence of the command line, with the key highlight', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline'); // no facet and, for the bookshop, plateaus: a shape is told anywhere
  const view = addMapView(page, 'bad', { links: [ORDERS], highlight: [{ source: 'customer' }] });
  const problem = String(run(page.sandbox, `viewProblem(findSavedView(${JSON.stringify(view.id)}))`));
  assert.match(problem, /`highlight\[0\]` is a mapping with `source`, `destination` and optionally `label`/);
  const tech = addMapView(page, 'tech', { highlight: [ORDERS] });
  page.sandbox.findSavedView(tech.id).layer = 'technology';
  assert.match(
    String(run(page.sandbox, `viewProblem(findSavedView(${JSON.stringify(tech.id)}))`)),
    /highlight is read in the map of the application layer only/
  );
});

test('stepProblem looks at the view a step draws, the key included', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'one', { opened: ['shop'], links: [ORDERS] });
  page.sandbox.__ok = { view: view.id, highlight: [ORDERS] };
  assert.equal(run(page.sandbox, 'stepProblem(__ok)'), null);
  page.sandbox.__bad = { view: view.id, highlight: [{ source: 'customer' }] };
  assert.match(String(run(page.sandbox, 'stepProblem(__bad)')), /highlight\[0\]/);
});

test('a step with no highlight key is read, drawn and cached as it was: the recipe has no highlight at all', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const view = addMapView(page, 'plain', { opened: ['shop'], links: [ORDERS] });
  const recipe = recipeOf(page, view);
  assert.equal('highlight' in recipe.mapState, false);
  assert.equal(
    JSON.stringify(drawn(page, { view: view.id })),
    JSON.stringify(plain(page.sandbox.findSavedView(view.id)))
  );
});
