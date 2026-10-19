'use strict';
// Wave 014, run 0073 (W-16): three odds and ends of the editor.
//   1. Issue #37. The cache of the diagram (`diagramCache`) and the cache of the quiet references (`treeQuietCache`) are keyed on the version of the models and the small
//      parts that vary, not on the serialised input of the kernel: a render that finds its answer builds no kernel input and serialises no model (counted below on an invented
//      ferry company, and on the largest plateau of the Brightcart fixture), and a change of the model, of the facet (picked, or edited under the same name), of the viewpoint, of the
//      element, of the plateau compared with, of the options of the comparison, of the styles or of what the map has opened still gives a fresh render. The oracle for "fresh" is the
//      render of a page that has no cache: whatever the cache serves must be what the page without it draws.
//   2. The panel of a removed environment lists its `uses`, Before only, as the panel of a changed environment does and as the panel of a removed node lists its applications.
//   3. The document is not wider than the window at 360 px: the rule that keeps the centre panel inside its column is read from the stylesheet the browser is given (the harness has no
//      layout engine; the run says whether the page was also looked at in a browser).
// The harness has no DOM and no layout engine; the kernel is the real embedded module. The ferry company is invented. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');
const { inPlateau, layeredFiles, compareWith } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

// ---- an invented ferry company in three plateaus, with two facets ----

const element = (kind, parent, id, name, extra) =>
  'header:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '');
const rel = (destination, label) => '  relationships:\n    - destination: "' + destination + '"\n      label: "' + label + '"\n';
const FLEET_NOW = {
  'app.fleet.yaml': element('system', null, 'fleet', 'Fleet'),
  'app.fleet.dock.yaml': element('container', 'fleet', 'dock', 'Dock planner', rel('fleet.ferry', 'schedules') + '  tags:\n    rendering-stereotypes: "planner"\n'),
  'app.fleet.ferry.yaml': element('container', 'fleet', 'ferry', 'Ferry log'),
  'app.fleet.radio.yaml': element('container', 'fleet', 'radio', 'Radio desk', rel('fleet.dock', 'calls'))
};
const FLEET_NEXT = {
  'app.fleet.yaml': element('system', null, 'fleet', 'Fleet'),
  'app.fleet.dock.yaml': element('container', 'fleet', 'dock', 'Dock planner', rel('fleet.ferry', 'schedules')),
  'app.fleet.ferry.yaml': element('container', 'fleet', 'ferry', 'Ferry log'),
  'app.fleet.beacon.yaml': element('container', 'fleet', 'beacon', 'Beacon feed', rel('fleet.dock', 'feeds'))
};
const folder = (dir, files) => Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));
const FILES = Object.assign({}, folder('10_now', FLEET_NOW), folder('20_next', FLEET_NEXT));
const PLATEAU_LIST = [{ id: 'now', path: 'plateaus/10_now' }, { id: 'next', path: 'plateaus/20_next' }];
const SETTINGS = '  current: next\n' +
  '  facets:\n    customs:\n' +
  '      - name: no-ferry\n        actions:\n          - operator: REMOVE\n            json-path: "$.application..elements[?(@.id == \'ferry\')]"\n' +
  '      - name: no-radio\n        actions:\n          - operator: REMOVE\n            json-path: "$.application..elements[?(@.id == \'radio\')]"\n';

/**
 * The page on the ferry company, as layers (see layered-folders.js: `now` and `next` are siblings over an empty baseline), `next` drawn and compared on the band with `compareTo`,
 * with the counters: `kernelInputs` (the walks of a model that make a kernel input), `computes` (the kernel's `compute`), `quiets` (its `quiet`) and `models`
 * (the serialisations of a model by `JSON.stringify`), a canvas and a recipe the test moves, and `showDiagramScene` collecting what the page shows.
 */
async function open({ compareTo = null, files = FILES, folderHandle = null } = {}) {
  const mem = memFolder(layeredFiles(PLATEAU_LIST, files, SETTINGS));
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = folderHandle || mem.handle;
  state.folder = { handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  if (!folderHandle) sandbox.drawPlateau('next');
  if (compareTo) compareWith(sandbox, compareTo);
  const realGet = sandbox.document.getElementById.bind(sandbox.document);
  const canvas = { id: 'diagram-canvas' };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : realGet(id));
  sandbox.console = Object.assign({}, console, { error() {} });
  sandbox.__scenes = [];
  sandbox.__recipe = null;
  run(sandbox, `
    globalThis.__count = { kernelInputs: 0, computes: 0, quiets: 0, models: 0 };
    showDiagramScene = (scene) => { __scenes.push(scene); };
    diagramRecipeOf = () => __recipe;
    loadElk = async () => null; // no layout engine here: the drawing is the list of relationships, which is the page's own fallback and is cached all the same
    { const toKernel = toKernelElements; toKernelElements = function (...a) { __count.kernelInputs++; return toKernel.apply(this, a); }; }
    { const kernel = loadedKernel; const compute = kernel.compute; kernel.compute = function (input) { __count.computes++; return compute.call(this, input); }; }
    { const kernel = loadedKernel; const quiet = kernel.quiet; kernel.quiet = function (input) { __count.quiets++; return quiet.call(this, input); }; } // wave 015, issue #81: the quiet references are one call per layer
    { const stringify = JSON.stringify; JSON.stringify = function (...a) { const text = stringify.apply(this, a); if (typeof text === 'string' && text.includes('"reference"') && text.includes('"relationships"')) __count.models++; return text; }; }
  `);
  const count = () => plain(run(sandbox, '__count'));
  const facet = (name) => state.workspace.settings.facets.customs.find((candidate) => candidate.name === name);
  return { sandbox, state, mem, count, facet, kernel: run(sandbox, 'loadedKernel') };
}

const recipeOf = (sandbox, state, over) => Object.assign({
  host: 'main', view: null, isMap: false, reference: 'fleet.dock', record: state.index.application.get('fleet.dock'), layer: 'application', viewpoint: 'overview',
  facet: null, mapState: null, hideUnlinked: false, shows: { labels: true, qualifiers: false, descriptions: false, wrap: false }
}, over);
const mapRecipe = (sandbox, state, over) => recipeOf(sandbox, state, Object.assign({ isMap: true, reference: '', record: null, viewpoint: 'map', layer: undefined, mapState: { opened: ['fleet'], pinned: [], hidden: [] } }, over));

/** Draws what the recipe says and returns the scene the page showed (waits for the layout, which here is the fallback). */
async function draw(ctx, recipe) {
  ctx.sandbox.__recipe = recipe;
  ctx.sandbox.__scenes.length = 0;
  ctx.sandbox.mountDiagramIfNeeded();
  for (let i = 0; i < 100 && !ctx.sandbox.__scenes.length; i++) await new Promise((resolve) => setTimeout(resolve, 5));
  assert.equal(ctx.sandbox.__scenes.length, 1, 'one scene is shown');
  return ctx.sandbox.__scenes[0];
}

/** What a page that has no cache draws for the same recipe. */
async function drawWithoutCache(ctx, recipe) {
  run(ctx.sandbox, 'diagramCache = null;');
  return draw(ctx, recipe);
}

// ---- 1. The diagram: a render that finds its answer builds nothing and serialises nothing ----

test('#37: two renders of an unchanged model, with or without a comparison, build no kernel input, compute nothing and serialise no model', async () => {
  for (const compareTo of [null, 'now']) {
    const ctx = await open({ compareTo });
    for (const recipe of [recipeOf(null, ctx.state, {}), recipeOf(null, ctx.state, { facet: ctx.facet('no-ferry') }), mapRecipe(null, ctx.state, {}), mapRecipe(null, ctx.state, { facet: ctx.facet('no-radio') })]) {
      const first = await draw(ctx, recipe);
      assert.ok(run(ctx.sandbox, 'diagramCache') && !first.html.includes('error-panel'), 'the drawing is one, and it is kept');
      const before = ctx.count();
      assert.ok(before.kernelInputs > 0 && before.computes > 0, 'the first render did the work');
      for (let i = 0; i < 2; i++) {
        const again = await draw(ctx, recipe);
        assert.equal(again.html, first.html, 'the same drawing');
      }
      assert.deepEqual(ctx.count(), before, 'compare to ' + compareTo + ', ' + recipe.viewpoint + (recipe.facet ? ' through ' + recipe.facet.name : '') + ': the second and the third render did nothing');
    }
  }
});

test('#37: the counters are real: a render that has to compute is seen by them', async () => {
  const ctx = await open({ compareTo: 'now' });
  await draw(ctx, recipeOf(null, ctx.state, {}));
  const before = ctx.count();
  run(ctx.sandbox, 'JSON.stringify(buildKernelInput("overview", "fleet.dock", {}).input);');
  const after = ctx.count();
  assert.equal(after.models - before.models, 1);
  assert.ok(after.kernelInputs > before.kernelInputs);
  await drawWithoutCache(ctx, recipeOf(null, ctx.state, {}));
  assert.ok(ctx.count().computes > before.computes);
});

test('#37: the key of the drawing is not the kernel input and no walk of the index: the source says so', () => {
  const key = HTML.slice(HTML.indexOf('function diagramCacheKey('), HTML.indexOf('let treeQuietCache'));
  assert.ok(key.includes('modelsKey(') && !key.includes('buildKernelInput(') && !key.includes('JSON.stringify(input)') && !key.includes('AppState.index['));
  assert.ok(!HTML.includes('diagramModelFingerprint'), 'the third walk of the model is gone');
  const quiet = HTML.slice(HTML.indexOf('function quietReferencesThroughFacet('), HTML.indexOf('async function markTreeThroughFacet'));
  assert.ok(quiet.indexOf('treeQuietCache.key === key') < quiet.indexOf('buildKernelInput('), 'the cache is asked before any input is built');
  assert.ok(!quiet.includes('JSON.stringify(Object.values(bases)'));
});

// ---- 2. ... and a change of the model, the facet or the viewpoint still gives a fresh render ----

test('#37: a change of the model gives a fresh drawing, the one a page without a cache draws', async () => {
  const ctx = await open({ compareTo: 'now' });
  const recipe = () => recipeOf(null, ctx.state, {});
  const first = await draw(ctx, recipe());
  assert.ok(first.html.includes('Ferry log') && !first.html.includes('Ferry journal'));
  let computes = ctx.count().computes;

  ctx.sandbox.commitElementEdit('fleet.ferry', (node) => { node.name = 'Ferry journal'; });
  const renamed = await draw(ctx, recipe());
  assert.ok(ctx.count().computes > computes, 'computed again');
  assert.ok(renamed.html.includes('Ferry journal') && !renamed.html.includes('Ferry log'), 'the new name, not the cached drawing');
  assert.equal(renamed.html, (await drawWithoutCache(ctx, recipe())).html);
  computes = ctx.count().computes;

  // a relationship added: the drawing has one more link
  ctx.sandbox.commitFileEdit('plateaus/20_next/app.fleet.ferry.yaml', inPlateau('next', element('container', 'fleet', 'ferry', 'Ferry journal', rel('fleet.dock', 'reports to'))));
  const linked = await draw(ctx, recipeOf(null, ctx.state, { reference: 'fleet.ferry', record: ctx.state.index.application.get('fleet.ferry') }));
  assert.ok(linked.html.includes('reports to') || linked.html.includes('Dock planner'));
  assert.equal(linked.html, (await drawWithoutCache(ctx, recipeOf(null, ctx.state, { reference: 'fleet.ferry', record: ctx.state.index.application.get('fleet.ferry') }))).html);

  // an element deleted: the drawing of what pointed at it changes
  const impact = ctx.sandbox.computeDeleteImpact('fleet.ferry', 'application');
  ctx.sandbox.commitDeleteElement('fleet.ferry', 'application', impact.affected);
  const deleted = await draw(ctx, recipe());
  assert.equal(deleted.html, (await drawWithoutCache(ctx, recipe())).html);
  assert.ok(!deleted.html.includes('Ferry journal'));
  computes = ctx.count().computes;

  // a load (Cancel reads the folder again): the entry of the model before it is not served
  await ctx.sandbox.loadWorkspace(ctx.state.folder.handle);
  const reloaded = await draw(ctx, recipeOf(null, ctx.state, {}));
  assert.ok(ctx.count().computes > computes);
  assert.ok(reloaded.html.includes('Ferry log'), 'the folder as it is on the disk');
  assert.equal(reloaded.html, (await drawWithoutCache(ctx, recipeOf(null, ctx.state, {}))).html);
});

test('#37: a change of the facet (another one, none, or the same one edited) gives a fresh drawing', async () => {
  const ctx = await open();
  const recipe = (facet) => recipeOf(null, ctx.state, { facet });
  const plainDrawing = await draw(ctx, recipe(null));
  assert.ok(plainDrawing.html.includes('Ferry log'));
  const throughNoFerry = await draw(ctx, recipe(ctx.facet('no-ferry')));
  assert.ok(!throughNoFerry.html.includes('Ferry log'), 'the facet removes the ferry log');
  assert.notEqual(throughNoFerry.html, plainDrawing.html);
  assert.equal(throughNoFerry.html, (await drawWithoutCache(ctx, recipe(ctx.facet('no-ferry')))).html);
  assert.equal((await draw(ctx, recipe(null))).html, plainDrawing.html, 'without the facet again: the first drawing');
  // the same facet, edited in the settings under the same name: it removes the radio desk now
  const facet = ctx.facet('no-ferry');
  facet.actions[0].jsonPath = "$.application..elements[?(@.id == 'radio')]";
  const edited = await draw(ctx, recipe(facet));
  assert.ok(edited.html.includes('Ferry log'), 'the ferry log is back');
  assert.equal(edited.html, (await drawWithoutCache(ctx, recipe(facet))).html);
  assert.notEqual(edited.html, throughNoFerry.html, 'and it is not the drawing of the facet as it was');
  // its option "hide unlinked" is a part of the facet too
  const before = ctx.count().computes;
  facet.hideUnlinked = true;
  await draw(ctx, recipe(facet));
  assert.ok(ctx.count().computes > before);
});

test('#37: a change of the viewpoint, of the element, of the layer of the drawing and of what is shown gives a fresh drawing', async () => {
  const ctx = await open();
  const seen = new Map();
  const step = async (label, recipe) => {
    const before = ctx.count().computes;
    const scene = await draw(ctx, recipe);
    assert.ok(ctx.count().computes > before, label + ': not served from the entry of the render before');
    assert.equal(scene.html, (await drawWithoutCache(ctx, recipe)).html, label);
    seen.set(label, scene.html);
    return scene;
  };
  await step('dock, overview', recipeOf(null, ctx.state, {}));
  await step('dock, detailed', recipeOf(null, ctx.state, { viewpoint: 'detailed' }));
  await step('fleet, overview', recipeOf(null, ctx.state, { reference: 'fleet', record: ctx.state.index.application.get('fleet') }));
  await step('fleet, detailed', recipeOf(null, ctx.state, { reference: 'fleet', record: ctx.state.index.application.get('fleet'), viewpoint: 'detailed' }));
  await step('radio, overview', recipeOf(null, ctx.state, { reference: 'fleet.radio', record: ctx.state.index.application.get('fleet.radio') }));
  assert.notEqual(seen.get('dock, overview'), seen.get('radio, overview'));
  await step('radio, hide unlinked', recipeOf(null, ctx.state, { reference: 'fleet.radio', record: ctx.state.index.application.get('fleet.radio'), hideUnlinked: true }));
  // what is shown (the captions): the entry holds the text of the options too
  const before = ctx.count().computes;
  const withoutLabels = recipeOf(null, ctx.state, { shows: { labels: false, qualifiers: false, descriptions: false, wrap: false } });
  await draw(ctx, withoutLabels);
  assert.ok(ctx.count().computes > before);
});

test('#37: a change of what the map has opened, pinned or hidden gives a fresh drawing', async () => {
  const ctx = await open();
  for (const [label, mapState] of [
    ['opened', { opened: ['fleet'], pinned: [], hidden: [] }],
    ['closed', { opened: [], pinned: [], hidden: [] }],
    ['pinned', { opened: ['fleet'], pinned: ['fleet.dock'], hidden: [] }],
    ['hidden', { opened: ['fleet'], pinned: [], hidden: ['fleet.radio'] }]
  ]) {
    const before = ctx.count().computes;
    const recipe = mapRecipe(null, ctx.state, { mapState });
    const scene = await draw(ctx, recipe);
    assert.ok(ctx.count().computes > before, label + ': computed');
    assert.equal(scene.html, (await drawWithoutCache(ctx, recipe)).html, label);
  }
});

test('#37: a change of the plateau compared with, of Changes only, of the wording and of the styles gives a fresh drawing', async () => {
  const ctx = await open({ compareTo: 'now' });
  const recipe = () => recipeOf(null, ctx.state, { reference: 'fleet', record: ctx.state.index.application.get('fleet'), viewpoint: 'detailed' });
  const stepAfter = async (label, change) => {
    await change();
    const before = ctx.count().computes;
    const scene = await draw(ctx, recipe());
    assert.ok(ctx.count().computes > before, label + ': computed');
    assert.equal(scene.html, (await drawWithoutCache(ctx, recipe())).html, label);
    return scene;
  };
  const compared = await draw(ctx, recipe());
  const nothing = await stepAfter('compare to nothing', () => compareWith(ctx.sandbox, ''));
  assert.notEqual(nothing.html, compared.html, 'a comparison draws the new and the removed ones');
  const back = await stepAfter('compare to now again', () => compareWith(ctx.sandbox, 'now'));
  assert.equal(back.html, compared.html);
  await stepAfter('Changes only', () => { ctx.state.changesOnly = true; });
  await stepAfter('Changes only off', () => { ctx.state.changesOnly = false; });
  await stepAfter('the styles', () => { ctx.state.workspace.styles = { 'by-tags': { planner: { 'background-color': '#abcdef' } } }; });
  await stepAfter('the other direction: now drawn, compared with next', () => { ctx.sandbox.drawPlateau('now'); compareWith(ctx.sandbox, 'next'); });
});

test('#37: a drawing computed before an edit is not served after it, even when the edit lands while the layout is being made', async () => {
  const ctx = await open();
  const recipe = recipeOf(null, ctx.state, {});
  let release;
  run(ctx.sandbox, 'loadElk = () => new Promise((resolve) => { __release = () => resolve(null); });');
  ctx.sandbox.__recipe = recipe;
  ctx.sandbox.mountDiagramIfNeeded(); // the layout starts and waits
  ctx.sandbox.commitElementEdit('fleet.ferry', (node) => { node.name = 'Ferry journal'; });
  ctx.sandbox.mountDiagramIfNeeded(); // the render of the edit supersedes it
  release = ctx.sandbox.__release;
  release();
  await new Promise((resolve) => setTimeout(resolve, 50));
  run(ctx.sandbox, 'loadElk = async () => null;');
  const scene = await draw(ctx, recipe);
  assert.ok(scene.html.includes('Ferry journal'), 'the drawing of the model as it is');
  assert.ok(ctx.sandbox.__scenes.every((s) => !s.html.includes('Ferry log')));
});

// ---- 3. The quiet references ----

test('#37: the quiet references of two renders of an unchanged model are the same set, found without a kernel input, a kernel call or a serialised model', async () => {
  for (const compareTo of [null, 'now']) {
    const ctx = await open({ compareTo });
    const facet = ctx.facet('no-ferry');
    const first = ctx.sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
    const before = ctx.count();
    assert.ok(before.kernelInputs > 0 && before.quiets > 0 && before.computes === 0, 'the first answer: one call per layer, no compute');
    for (let i = 0; i < 3; i++) assert.equal(ctx.sandbox.quietReferencesThroughFacet(ctx.kernel, facet), first, 'the same answer, not a copy of it');
    assert.deepEqual(ctx.count(), before);
  }
});

test('#37: the quiet references are computed again after a change of the model, the facet (picked or edited), the tab, Changes only and the comparison, and are those of a page without a cache', async () => {
  const ctx = await open({ compareTo: 'now' });
  const quiet = (facet) => ctx.sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
  const fresh = (facet) => { run(ctx.sandbox, 'treeQuietCache = null;'); return Array.from(quiet(facet)).sort(); };
  const sorted = (set) => Array.from(set).sort();
  const noFerry = ctx.facet('no-ferry');
  const noRadio = ctx.facet('no-radio');
  const step = (label, facet, change) => {
    const before = ctx.count().quiets;
    const prior = quiet(facet);
    change();
    const after = quiet(facet);
    assert.ok(ctx.count().quiets > before, label + ': computed');
    assert.notEqual(after, prior, label + ': another set');
    assert.deepEqual(sorted(after), fresh(facet), label + ': the set of a page without a cache');
    return after;
  };
  quiet(noFerry);
  step('a file edited: the beacon feed now points at the ferry log', noFerry, () => ctx.sandbox.commitFileEdit('plateaus/20_next/app.fleet.beacon.yaml', inPlateau('next', element('container', 'fleet', 'beacon', 'Beacon feed', rel('fleet.ferry', 'feeds')))));
  const afterCut = step('a file edited: the beacon feed points at nothing', noRadio, () => ctx.sandbox.commitFileEdit('plateaus/20_next/app.fleet.beacon.yaml', inPlateau('next', element('container', 'fleet', 'beacon', 'Beacon feed'))));
  assert.ok(afterCut.has('fleet.beacon'), 'and so the beacon feed has nothing left to draw');
  step('a rename', noFerry, () => ctx.sandbox.commitElementEdit('fleet.beacon', (node) => { node.name = 'Beacon'; }));
  const picked = quiet(noRadio);
  assert.notEqual(picked, quiet(noFerry), 'another facet, another answer');
  noRadio.actions[0].jsonPath = "$.application..elements[?(@.id == 'beacon')]";
  assert.notEqual(quiet(noRadio), picked, 'the same facet edited, another answer');
  assert.deepEqual(sorted(quiet(noRadio)), fresh(noRadio));
  step('another tab of an element', noFerry, () => { run(ctx.sandbox, "currentPerspective = 'elements'; elementTab = 'detailed';"); });
  step('Changes only', noFerry, () => { ctx.sandbox.__state().changesOnly = true; });
  // a comparison turned off, then on with the other plateau
  const prior = quiet(noFerry);
  const computes = ctx.count().quiets;
  compareWith(ctx.sandbox, '');
  const alone = quiet(noFerry);
  assert.ok(ctx.count().quiets > computes, 'no comparison: computed');
  assert.notEqual(alone, prior);
  assert.deepEqual(sorted(alone), fresh(noFerry));
});

// ---- the largest plateau of the Brightcart fixture ----

test('#37: on the 82 elements of the Brightcart marketplace plateau, with a comparison and a facet, a second render builds nothing and serialises no model', async () => {
  const handle = makeDirHandle(BRIGHTCART);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('marketplace');
  assert.equal(state.index.application.size + state.index.technology.size, 82);
  sandbox.compareWithPlateau('inhouse');
  const ctx = { sandbox, state };
  const realGet = sandbox.document.getElementById.bind(sandbox.document);
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? { id } : realGet(id));
  sandbox.console = Object.assign({}, console, { error() {} });
  sandbox.__scenes = [];
  run(sandbox, `
    globalThis.__count = { kernelInputs: 0, models: 0 };
    showDiagramScene = (scene) => { __scenes.push(scene); };
    diagramRecipeOf = () => __recipe;
    loadElk = async () => null;
    { const toKernel = toKernelElements; toKernelElements = function (...a) { __count.kernelInputs++; return toKernel.apply(this, a); }; }
    { const stringify = JSON.stringify; JSON.stringify = function (...a) { const text = stringify.apply(this, a); if (typeof text === 'string' && text.includes('"reference"') && text.includes('"relationships"')) __count.models++; return text; }; }
  `);
  const facet = state.workspace.settings.facets.customs.find((candidate) => candidate.name === 'journey');
  const recipe = { host: 'main', view: null, isMap: true, reference: '', record: null, layer: undefined, viewpoint: 'map', facet, mapState: { opened: ['commerce'], pinned: [], hidden: [] }, hideUnlinked: false, shows: { labels: false, qualifiers: false, descriptions: false, wrap: false } };
  const first = await draw(ctx, recipe);
  assert.ok(run(sandbox, 'diagramCache') && !first.html.includes('error-panel'), 'the drawing is one, and it is kept');
  const quiet = sandbox.quietReferencesThroughFacet(run(sandbox, 'loadedKernel'), facet);
  const before = plain(run(sandbox, '__count'));
  assert.ok(before.kernelInputs > 0);
  for (let i = 0; i < 3; i++) {
    assert.equal((await draw(ctx, recipe)).html, first.html);
    assert.equal(sandbox.quietReferencesThroughFacet(run(sandbox, 'loadedKernel'), facet), quiet);
  }
  assert.deepEqual(plain(run(sandbox, '__count')), before);
});

// ---- 4. The panel of a removed environment lists its `uses` ----

const environment = (id, name, uses, elements) => 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' +
  (uses ? '  uses:\n' + uses.map((u) => '    - "' + u + '"\n').join('') : '') + (elements || '');
const HARBOUR_FILES = layeredFiles([{ id: 'now', path: 'p/now' }, { id: 'next', path: 'p/next' }], {
  'p/now/tec.quay.yaml': environment('quay', 'Quay'),
  'p/now/tec.pier.yaml': environment('pier', 'Pier'),
  'p/now/tec.harbour.yaml': environment('harbour', 'Harbour', ['quay', 'pier'], '  elements:\n    - kind: "node"\n      id: "crane"\n      name: "Crane"\n'),
  'p/now/tec.lonely.yaml': environment('lonely', 'Lonely'),
  'p/next/tec.quay.yaml': environment('quay', 'Quay'),
  'p/next/tec.pier.yaml': environment('pier', 'Pier')
}, '  current: next\n', 'p/**');

async function harbourAgainstNow() {
  const mem = memFolder(HARBOUR_FILES);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  compareWith(sandbox, 'now');
  return { sandbox, state };
}

function removedPanel(sandbox, reference) {
  run(sandbox, "currentPerspective = 'map';");
  const target = { getAttribute: (name) => ({ 'data-action': 'select-removed', 'data-ref': reference, 'data-layer': 'technology' })[name] || null, closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
  return sandbox.renderMapPerspectiveHtml().right;
}
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();

test('the panel of a removed environment lists what it used in the other plateau, Before only, under the label of a changed environment', async () => {
  const { sandbox, state } = await harbourAgainstNow();
  assert.equal(sandbox.comparisonState().records.get('technology|harbour').change, 'removed');
  assert.deepEqual(plain(state.baseline.index.technology.get('harbour').uses), ['quay', 'pier']);
  const panel = removedPanel(sandbox, 'harbour');
  assert.match(panel, /inspection-removed" data-inspection-ref="harbour"/);
  const block = panel.match(/<div class="change-diff" data-property="uses">[\s\S]*?(?=<div class="change-diff"|<h5|<\/section>)/);
  assert.ok(block, 'the panel has a Uses block');
  assert.match(text(block[0]), /^Uses − Before quay pier$/);
  assert.doesNotMatch(block[0], /change-after/, 'an environment that is gone has no After');
  assert.equal(panel.split('data-property="uses"').length - 1, 1, 'said once');
});

test('a removed environment that used nothing shows no empty block, and a removed node shows no Uses', async () => {
  const { sandbox } = await harbourAgainstNow();
  assert.doesNotMatch(removedPanel(sandbox, 'lonely'), /data-property="uses"/);
  const node = removedPanel(sandbox, 'harbour.crane');
  assert.doesNotMatch(node, /data-property="uses"/, 'a node has no uses');
});

test('the changed environment keeps its Before and After under the same label', async () => {
  const { sandbox } = await harbourAgainstNow();
  sandbox.drawPlateau('now');
  compareWith(sandbox, 'next');
  // `harbour` is new when `next` is the plateau compared with the other way round; a changed environment is one that kept its place: quay gains a use
  sandbox.commitFileEdit('p/now/tec.quay.yaml', inPlateau('now', environment('quay', 'Quay', ['pier'])));
  const html = sandbox.renderWhatChangedHtml('technology', 'quay');
  assert.match(html, /<div class="change-diff-label">Uses<\/div><div class="change-before">/);
  assert.match(html, /change-after/);
});

// ---- 5. The document holds the width of the window at 360 px ----

const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const rem = (text) => Number(/([\d.]+)rem/.exec(text)[1]);
/** The declarations of a top-level rule `selector { ... }` of the stylesheet, as written (the first one). */
const declarationsOf = (selector, css = CSS) => {
  const at = css.indexOf('\n  ' + selector + ' {');
  assert.ok(at >= 0, selector + ' is in the stylesheet');
  return css.slice(css.indexOf('{', at) + 1, css.indexOf('}', at));
};
const narrowRules = () => {
  const at = CSS.indexOf('@media (max-width: 40rem) {');
  assert.ok(at >= 0, 'the stylesheet has a rule for a window of 40rem or less');
  let depth = 0;
  for (let i = CSS.indexOf('{', at); i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    if (CSS[i] === '}' && --depth === 0) return CSS.slice(CSS.indexOf('{', at) + 1, i);
  }
  throw new Error('the rule is not closed');
};

test('at 360 px the three columns do not fit: the tree and the inspection alone are wider than the window (what made the document 424 px wide)', () => {
  const left = rem(declarationsOf('.min-w-48')) * 16; // the minimum width the tree, the inspection and the handles take
  const right = rem(declarationsOf('.min-w-56')) * 16;
  const handles = 2 * rem(declarationsOf('.w-1')) * 16;
  assert.equal(left + right + handles, 424, 'the width the document had at 360 px, measured in a browser on the Brightcart fixture');
  assert.ok(left + right + handles > 360);
});

test('below 40rem the regions are stacked, as wide as the window, with no handle and none of the sizes the user gave them by dragging', () => {
  const rules = (selector) => {
    const found = [];
    for (const m of narrowRules().matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(',').map((x) => x.trim()).includes(selector)) found.push(m[2]);
    return found.join(';');
  };
  assert.match(rules('.app-shell'), /display:\s*flex;\s*flex-direction:\s*column/);
  assert.match(rules('.app-shell [data-resize]'), /display:\s*none/, 'the handles that set the widths are gone');
  for (const panel of ['.app-shell > .left-panel', '.app-shell .right-panel']) {
    const css = rules(panel);
    assert.match(css, /width:\s*auto\s*!important/, panel + ': the width saved by dragging does not apply (it is an inline style)');
    assert.match(css, /min-width:\s*0/, panel + ': and no minimum width');
    assert.match(css, /max-width:\s*none/);
  }
  assert.match(rules('.app-shell > div.col-start-3'), /flex-direction:\s*column/, 'the grid that holds the centre and the inspection is a column too');
  assert.match(rules('.app-shell .center-panel'), /height:\s*80vh/, 'the centre has a height of its own (it had the row of the grid), enough for a diagram');
  // the window below which the three columns are not used leaves the centre at least 200 px when it is the three columns above it
  const columns = rem(declarationsOf('.min-w-48')) * 16 + rem(declarationsOf('.min-w-56')) * 16 + 2 * rem(declarationsOf('.w-1')) * 16;
  assert.ok(40 * 16 - columns >= 200, 'at 40rem the centre still has ' + (40 * 16 - columns) + ' px in the three-column layout');
});

test('the wide layout is untouched: the rules for the narrow window are inside the media query and nowhere else', () => {
  const outside = CSS.replace(narrowRules(), '');
  for (const text of ['flex-direction: column; height: auto', 'height: 80vh', 'width: auto !important']) assert.ok(!outside.includes(text), text + ' only in the query');
  assert.match(declarationsOf('.app-shell'), /height:\s*100%/);
  assert.match(declarationsOf('#app'), /height:\s*100vh/);
});
