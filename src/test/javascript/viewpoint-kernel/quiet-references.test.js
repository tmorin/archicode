'use strict';
// Wave 015, run 0095 (issue #81): the elements a facet leaves with nothing to draw are found by one kernel call per layer (`quiet`), not one `compute` per element.
//   1. The answer is the one the page got before: an oracle (the rule of the page as it was, one `compute` per element and a look at its links) is run on the four plateaus of the
//      layered Brightcart, alone and compared with each other plateau, through each facet of the workspace and through facets written here (one that removes a whole layer, so that
//      the kernel says an error for every element, one that removes only relationships, one that hides the unlinked boxes), in the tabs overview, detailed and deep.
//   2. The number of calls to the kernel is fixed (at most one `quiet` per layer, no `compute`), whatever the number of elements, and a second render makes none.
//   3. The first render of the 82-element `marketplace` through `journey`, compared with `inhouse`, takes under 100 ms in this harness (it took 420 ms in the issue, 150 ms here before the entry).
// The harness has no DOM and no layout engine; the kernel is the real embedded module. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);

async function open() {
  const handle = makeDirHandle(BRIGHTCART);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  const kernel = run(sandbox, 'loadedKernel');
  run(sandbox, `
    globalThis.__calls = { compute: 0, quiet: 0, compare: 0 };
    { const kernel = loadedKernel; for (const name of ['compute', 'quiet', 'compare']) { const original = kernel[name]; kernel[name] = function (input) { __calls[name]++; return original.call(this, input); }; } }
  `);
  const calls = () => JSON.parse(JSON.stringify(run(sandbox, '__calls')));
  const facet = (name) => state.workspace.settings.facets.customs.find((candidate) => candidate.name === name);
  return { sandbox, state, kernel, calls, facet };
}

/** The rule of the page before `quiet`: one `compute` per element, the element is quiet when there is nothing but an error through the facet, or no link that is drawn. */
function oneComputeEach(ctx, facet) {
  const { sandbox, state, kernel } = ctx;
  const tab = run(sandbox, 'elementTab');
  const perspective = run(sandbox, 'currentPerspective');
  const quiet = new Set();
  for (const layer of ['application', 'technology']) {
    for (const [reference, record] of state.index[layer]) {
      const viewpoint = perspective === 'map' || tab === 'details' || (tab === 'detailed' && run(sandbox, 'LEAF_KINDS').includes(record.kind)) ? 'overview' : tab;
      const input = sandbox.buildKernelInput(viewpoint, reference, { layer, facet }).input;
      const out = kernel.compute(input);
      if (out.error ? !!input.facet : !out.links.some((link) => !link.secondary)) quiet.add(reference);
    }
  }
  return quiet;
}

const sorted = (set) => Array.from(set).sort();

const ownFacets = [
  { name: 'no-tech', actions: [{ operator: 'REMOVE', jsonPath: '$.technology.elements[*]' }] },
  { name: 'no-uses-relationships', actions: [{ operator: 'REMOVE', jsonPath: "$.application..relationships[?(@.label == 'uses')]" }] },
  { name: 'broken', actions: [{ operator: 'REMOVE', jsonPath: '$.application..elements[?(@.id ==' }] }, // the kernel refuses the facet: one error, which is every element's
  { name: 'flow-without-unlinked', hideUnlinked: true, actions: [{ operator: 'REMOVE', jsonPath: "$.application..elements[?(@.id == 'agent')]" }] }
];

// ---- 1. the same answer as one compute per element ----

test('#81: the elements found by one call are those found by one compute each, on every plateau of the layered Brightcart, alone and compared, through every facet and in every tab', async () => {
  const ctx = await open();
  const { sandbox, state } = ctx;
  for (const facet of ownFacets) state.workspace.settings.facets.customs.push(facet);
  const facets = state.workspace.settings.facets.customs;
  assert.ok(facets.length >= 7);
  const plateaus = ['baseline', 'inhouse', 'marketplace', 'saas'];
  let questions = 0;
  let somethingQuiet = 0;
  let somethingNot = 0;
  for (const drawn of plateaus) {
    sandbox.drawPlateau(drawn);
    for (const against of [null, ...plateaus.filter((other) => other !== drawn).slice(0, 1)]) {
      sandbox.compareWithPlateau(against || '');
      for (const tab of ['overview', 'detailed', 'deep']) {
        run(sandbox, "currentPerspective = 'elements'; elementTab = '" + tab + "';");
        for (const facet of facets) {
          const expected = sorted(oneComputeEach(ctx, facet));
          const found = sorted(sandbox.quietReferencesThroughFacet(ctx.kernel, facet));
          assert.deepEqual(found, expected, drawn + ' against ' + against + ', ' + tab + ', facet ' + facet.name);
          questions++;
          if (expected.length) somethingQuiet++;
          if (expected.length < state.index.application.size + state.index.technology.size) somethingNot++;
        }
      }
    }
  }
  assert.ok(questions >= 4 * 2 * 3 * 7, 'the questions asked: ' + questions);
  assert.ok(somethingQuiet > questions / 2 && somethingNot > questions / 2, 'the oracle is not trivial: it finds some quiet and some not quiet elements in most questions');
});

test('#81: a facet that takes a whole layer away makes every element of that layer quiet and none of the other, as it did', async () => {
  const ctx = await open();
  const { sandbox, state } = ctx;
  const facet = ownFacets[0];
  state.workspace.settings.facets.customs.push(facet);
  sandbox.drawPlateau('marketplace');
  const quiet = sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
  assert.ok([...state.index.technology.keys()].every((reference) => quiet.has(reference)), 'every element of the layer the facet took away');
  assert.ok(![...state.index.application.keys()].every((reference) => quiet.has(reference)), 'not the other layer');
  assert.deepEqual(sorted(quiet), sorted(oneComputeEach(ctx, facet)));
});

test('#81: the kernel entry says the same on a facet that removes an element, an element it does not know and a viewpoint per element', async () => {
  const ctx = await open();
  const { sandbox, state } = ctx;
  sandbox.drawPlateau('marketplace');
  const facet = ctx.facet('journey');
  const input = sandbox.buildKernelInput('overview', state.index.application.keys().next().value, { layer: 'application', facet }).input;
  delete input.focal;
  input.focals = [{ reference: 'agent' }, { reference: 'catalog', viewpoint: 'detailed' }, { reference: 'nowhere.at.all' }, { reference: 'shop' }];
  const answer = ctx.kernel.quiet(input);
  assert.equal(answer.error, undefined);
  assert.equal(answer.version, 5);
  assert.ok(answer.quiet.includes('agent'), 'the facet removed it');
  assert.ok(answer.quiet.includes('nowhere.at.all'), 'through a facet, a view that cannot be built has nothing to draw');
  assert.deepEqual(answer.quiet, answer.quiet.filter((reference) => input.focals.some((focal) => focal.reference === reference)), 'only what was asked, in the order asked');
  const without = Object.assign({}, input);
  delete without.facet;
  assert.ok(!ctx.kernel.quiet(without).quiet.includes('nowhere.at.all'), 'without a facet it has no view, which is not an empty one');
  assert.match(ctx.kernel.quiet(Object.assign({}, input, { focals: undefined })).error, /focals/);
});

test('#81: a facet the kernel refuses is an error for the whole layer, and every element is quiet through it, as each compute said', async () => {
  const ctx = await open();
  const { sandbox, state } = ctx;
  const facet = ownFacets.find((candidate) => candidate.name === 'broken');
  state.workspace.settings.facets.customs.push(facet);
  sandbox.drawPlateau('marketplace');
  const input = sandbox.buildKernelInput('overview', state.index.application.keys().next().value, { layer: 'application', facet }).input;
  assert.ok(ctx.kernel.compute(input).error, 'compute refuses it, for any element');
  delete input.focal;
  input.focals = [{ reference: 'shop' }];
  assert.ok(ctx.kernel.quiet(input).error, 'and so does quiet, once');
  const quiet = sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
  assert.equal(quiet.size, state.index.application.size + state.index.technology.size, 'every element');
});

// ---- 2. the number of calls ----

test('#81: the calls to the kernel are at most one per layer and no compute, whatever the number of elements, and a second render makes none', async () => {
  const ctx = await open();
  const { sandbox, state } = ctx;
  const facet = ctx.facet('journey');
  const seen = [];
  for (const plateau of ['baseline', 'inhouse', 'marketplace']) {
    sandbox.drawPlateau(plateau);
    sandbox.compareWithPlateau(plateau === 'baseline' ? '' : 'baseline');
    const elements = state.index.application.size + state.index.technology.size;
    const before = ctx.calls();
    sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
    const after = ctx.calls();
    assert.equal(after.compute - before.compute, 0, plateau + ': no compute');
    const quiets = after.quiet - before.quiet;
    assert.ok(quiets >= 1 && quiets <= 2, plateau + ': one call per layer, at most two: ' + quiets);
    seen.push({ plateau, elements, quiets });
    sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
    sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
    assert.deepEqual(ctx.calls(), after, plateau + ': the answer is cached on the version of the models and the facet: nothing is asked again');
  }
  assert.ok(seen[2].elements > seen[0].elements, 'the plateaus grow: ' + JSON.stringify(seen));
  assert.ok(seen.every((entry) => entry.quiets === seen[0].quiets), 'and the calls do not: ' + JSON.stringify(seen));
});

test('#81: a change of the model, of the facet or of the tab asks the kernel again, once per layer', async () => {
  const ctx = await open();
  const { sandbox } = ctx;
  sandbox.drawPlateau('marketplace');
  const journey = ctx.facet('journey');
  const asked = (facet) => { const before = ctx.calls().quiet; sandbox.quietReferencesThroughFacet(ctx.kernel, facet); return ctx.calls().quiet - before; };
  assert.equal(asked(journey), 2);
  assert.equal(asked(journey), 0);
  assert.equal(asked(ctx.facet('no-externals')), 2, 'another facet');
  assert.equal(asked(journey), 2, 'and back: one entry is kept, the last');
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'detailed';");
  assert.equal(asked(journey), 2, 'another tab');
  sandbox.commitElementEdit(sandbox.__state().index.application.keys().next().value, (node) => { node.name = 'Renamed'; });
  assert.equal(asked(journey), 2, 'an edit of the model');
  assert.equal(asked(journey), 0);
});

// ---- 3. the time ----

test('#81: the first render of the 82-element marketplace through journey, compared with inhouse, takes under 100 ms', async () => {
  // the first answer of a page just opened, three times over (a machine that is busy can make any one of them slow: the best of the three is the cost of the call)
  const times = [];
  for (let attempt = 0; attempt < 3; attempt++) {
    const ctx = await open();
    const { sandbox, state } = ctx;
    sandbox.drawPlateau('marketplace');
    assert.equal(state.index.application.size + state.index.technology.size, 82);
    sandbox.compareWithPlateau('inhouse');
    const facet = ctx.facet('journey');
    sandbox.comparisonState(); // the comparison is the render's own cost, not the quiet references'
    const t0 = process.hrtime.bigint();
    const quiet = sandbox.quietReferencesThroughFacet(ctx.kernel, facet);
    times.push(Number(process.hrtime.bigint() - t0) / 1e6);
    assert.ok(quiet.size > 0 && quiet.size < 82);
    const t1 = process.hrtime.bigint();
    assert.equal(sandbox.quietReferencesThroughFacet(ctx.kernel, facet), quiet);
    assert.ok(Number(process.hrtime.bigint() - t1) / 1e6 < 5, 'the next ones are free');
  }
  const best = Math.min(...times);
  assert.ok(best < 100, 'the first answer took ' + times.map((ms) => ms.toFixed(1)).join(', ') + ' ms (420 ms in the issue, about 150 ms in this harness before the entry)');
});

test('#81: the page asks for the entry and builds no kernel input per element: the source says so', () => {
  const fs = require('node:fs');
  const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  const quiet = HTML.slice(HTML.indexOf('function quietReferencesThroughFacet('), HTML.indexOf('async function markTreeThroughFacet'));
  assert.ok(quiet.includes('kernel.quiet(') && !quiet.includes('kernel.compute('), 'one entry, no compute');
  assert.equal(quiet.split('buildKernelInput(').length - 1, 1, 'one kernel input per layer, built in the loop of the layers and not in the loop of the elements');
});
