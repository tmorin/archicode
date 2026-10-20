'use strict';
// The views and the stories that the layered Brightcart ships (wave 016, run 0110, issue #115): src/test/resources/brightcart/layered/shared/, written by generate.mjs from ENTRIES of
// description.mjs, and described by expected/entries.json (which the generator works out from the model: in which plateaus each view can be drawn, what the command line says where
// it cannot, what each step of a story names). They belong to no plateau (wave 015, run 0100), so they have no `plateau:` and sit in a folder no plateau owns.
// Here the editor opens the fixture, reads every file, lists the same stories and views whatever plateau is drawn, says in each plateau which views cannot be drawn there, draws the
// saved maps of both layers, and plays the stories: one whose steps name no plateau, one whose steps are told at the plateaus of the fork (`saas` and `inhouse` both override
// `baseline` and do not stack) and compared with others, one told in a single plateau. The command line is asked the same in BrightcartViewsAndStoriesTest.java.
// Nothing here is typed from memory: the plateaus a view can be drawn in, and the sentences the command line says, are read from entries.json; the numbers of a comparison are those
// of expected/comparisons.json (P4: what the tool prints, `gives`).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const read = (name) => JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', name + '.json'), 'utf8'));
const ENTRIES = read('entries');
const COMPARISONS = new Map(read('comparisons').map((c) => [c.id, c]));
const vm = require('node:vm');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const PLATEAUS = ENTRIES.plateaus;
const VIEW_IDS = ENTRIES.views.map((v) => v.id).sort();
const STORY_IDS = ENTRIES.stories.map((s) => s.id).sort();

async function openBrightcart() {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  // the harness has no layout engine: `render()` is the address and nothing else
  sandbox.render = () => { sandbox.syncHashFromState(); };
  return { sandbox, state };
}

const drawing = (state) => ({ plateau: state.layers.current, against: state.layers.compare ? state.layers.compare.other : null, mode: state.layers.compare ? state.layers.compare.mode : null });
const viewOf = (id) => ENTRIES.views.find((v) => v.id === id);
const storyOf = (id) => ENTRIES.stories.find((s) => s.id === id);
/** `expected/comparisons.json` as the counts the page gives: elements and relationships `+new ~changed -removed`, then moved/split/merged. */
const wanted = (id) => {
  const c = COMPARISONS.get(id);
  if (c.gives) {
    const [n, ch, r, mv, sp, mg, rn, rch, rr] = c.gives;
    return { elements: { new: n, changed: ch, removed: r }, replacing: { moved: mv, split: sp, merged: mg }, relationships: { new: rn, changed: rch, removed: rr } };
  }
  return { elements: c.elements, replacing: c.replacing, relationships: c.relationships };
};
const countsOf = (comparison) => {
  const e = comparison.counts.elements;
  const r = comparison.counts.relationships;
  return { elements: { new: e.new, changed: e.changed, removed: e.removed }, replacing: { moved: e.moved || 0, split: e.split || 0, merged: e.merged || 0 }, relationships: { new: r.new, changed: r.changed, removed: r.removed } };
};

// ---- the files ----

test('the editor opens the views and the stories of layered/: every file is read, none says a plateau, none is a mistake, and the folder is the one no plateau owns', async () => {
  const { sandbox, state } = await openBrightcart();
  const shared = state.manifestFiles.filter((f) => f.relPath.startsWith(ENTRIES.folder + '/'));
  assert.equal(shared.length, ENTRIES.views.length + ENTRIES.stories.length);
  assert.deepEqual(plain(shared.filter((f) => f.error).map((f) => f.relPath + ': ' + f.error)), []);
  assert.deepEqual(plain(shared.map((f) => f.relPath).sort()), plain(ENTRIES.views.concat(ENTRIES.stories).map((e) => e.file).sort()));
  for (const file of shared) assert.equal(file.header.plateau, undefined, file.relPath + ': a view and a story belong to no plateau');
  assert.deepEqual(plain(state.unreadManifestFiles), []);
  // the plateau-free check: every name is declared by some plateau, every plateau a step names is one
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), []);
  assert.equal(sandbox.bandMistakes().count, 0, 'the band has nothing to say');
  // Files lists them in the group of no plateau, last
  const groups = run(sandbox, 'filesGroups(AppState.manifestFiles)');
  const none = groups[groups.length - 1];
  assert.equal(none.key, run(sandbox, 'FILES_NO_PLATEAU_GROUP'));
  assert.deepEqual(plain(Array.from(none.files, (f) => f.relPath).filter((p) => p.startsWith(ENTRIES.folder + '/')).sort()), plain(shared.map((f) => f.relPath).sort()));
  assert.deepEqual(plain(Array.from(none.files, (f) => f.relPath).filter((p) => !p.startsWith(ENTRIES.folder + '/'))), [], 'the group of no plateau holds the views and the stories of the fixture and no other file');
});

test('the page Stories lists the same stories and the same views whatever plateau is drawn, the ones the fixture ships', async () => {
  const { sandbox, state } = await openBrightcart();
  for (const drawn of PLATEAUS) {
    sandbox.drawPlateau(drawn);
    assert.equal(state.layers.current, drawn);
    assert.deepEqual(plain(sandbox.storiesList().map((s) => s.id).sort()), STORY_IDS, drawn + ': every story');
    assert.deepEqual(plain(sandbox.savedViews().map((v) => v.id).sort()), VIEW_IDS, drawn + ': every view');
    assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [], drawn + ': what they name exists in a plateau');
    assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 0, drawn + ': reading changes no file');
  }
});

// ---- the views ----

/** The sentence of the page when a view cannot be drawn in a plateau (`viewLacksInPlateau`: it names the pinned elements when there are several). */
const lacks = (view, plateau) => (view.viewpoint === 'map' ? (view.pinned.length === 1 ? 'The element “' + view.pinned[0] + '” is not in the plateau “' + plateau + '”.' : 'The elements it was pinned on are not in the plateau “' + plateau + '”.') : 'The element “' + view.names[0] + '” is not in the plateau “' + plateau + '”.');

test('a view is drawn in the plateaus that have what it names and says so in the others, as expected/entries.json says (the command line warns of the same ones)', async () => {
  const { sandbox } = await openBrightcart();
  for (const drawn of PLATEAUS) {
    sandbox.drawPlateau(drawn);
    for (const fact of ENTRIES.views) {
      const view = sandbox.findSavedView(fact.id);
      const problem = sandbox.viewProblem(view);
      const there = fact.plateaus[drawn];
      assert.equal(problem, there.drawn ? null : lacks(fact, drawn), fact.id + ' in ' + drawn);
      assert.equal(there.drawn, there.file !== null, fact.id + ' in ' + drawn + ': the file is written where the view is drawn');
      assert.equal(there.warnings.length, there.drawn && !there.leftOut.length ? 0 : 1, fact.id + ' in ' + drawn + ': one warning when the view is skipped or an entry is left out');
    }
  }
  // the shapes the fixture was asked to hold (#115)
  const drawnIn = (id) => PLATEAUS.filter((p) => viewOf(id).plateaus[p].drawn);
  assert.deepEqual(drawnIn('customer_overview'), PLATEAUS, 'an element every plateau has');
  assert.deepEqual(drawnIn('marketplace_overview'), ['marketplace'], 'an element one plateau alone declares');
  assert.deepEqual(drawnIn('shop_overview'), ['baseline', 'saas', 'inhouse'], '`shop` is renamed `storefront` in marketplace');
  assert.deepEqual(drawnIn('cloud_map'), ['inhouse', 'marketplace'], 'a map pinned on what two plateaus have');
  assert.deepEqual(drawnIn('environments_map'), PLATEAUS);
  assert.deepEqual(viewOf('applications_map').plateaus.marketplace.leftOut, ['shop'], 'an entry of a map that a plateau lacks is left out');
});

test('a saved map of the technology layer is the page Environments, and a saved map of the application layer is the page Applications, in every plateau that can draw it', async () => {
  const { sandbox, state } = await openBrightcart();
  const cur = () => run(sandbox, 'currentPerspective');
  for (const drawn of PLATEAUS) {
    sandbox.drawPlateau(drawn);
    // the technology map: production opened, the sandboxes and staging hidden
    assert.equal(sandbox.applySavedView(sandbox.findSavedView('environments_map')), null, 'environments_map in ' + drawn);
    assert.equal(cur(), 'environments');
    const technology = sandbox.mapStateOf('technology');
    assert.deepEqual(plain(Array.from(technology.opened)), ['prod'], drawn);
    assert.deepEqual(plain(technology.hidden), ['sandbox', 'staging'], drawn);
    // the application map: two elements pinned, the shop opened where there is a shop
    assert.equal(sandbox.applySavedView(sandbox.findSavedView('applications_map')), null, 'applications_map in ' + drawn);
    assert.equal(cur(), 'map');
    const application = sandbox.mapStateOf('application');
    assert.deepEqual(plain(application.pinned), ['customer', 'psp'], drawn);
    assert.deepEqual(plain(Array.from(application.opened)), viewOf('applications_map').plateaus[drawn].leftOut.includes('shop') ? [] : ['shop'], drawn);
    // the map of the cloud: drawn where there is a cloud, said not to be drawable where there is none
    const cloud = sandbox.applySavedView(sandbox.findSavedView('cloud_map'));
    if (viewOf('cloud_map').plateaus[drawn].drawn) {
      assert.equal(cloud, null, 'cloud_map in ' + drawn);
      assert.deepEqual(plain(sandbox.mapStateOf('technology').pinned), ['prod.cloud.k8s']);
    } else {
      assert.equal(cloud, lacks(viewOf('cloud_map'), drawn), 'cloud_map in ' + drawn);
    }
  }
  assert.equal(state.fatalError, null);
});

// ---- the stories ----

test('a story whose steps name no plateau is told in whatever plateau is drawn: every step can be drawn in each of the four', async () => {
  const { sandbox, state } = await openBrightcart();
  const facts = storyOf('order_journey');
  assert.ok(facts.steps.every((s) => s.at === null && s.against === null));
  const steps = sandbox.storySteps(sandbox.findStory('order_journey'));
  assert.equal(steps.length, facts.steps.length);
  for (const drawn of PLATEAUS) {
    sandbox.drawPlateau(drawn);
    assert.deepEqual(plain(Array.from(steps, (step) => sandbox.stepProblem(step))), Array.from(steps, () => null), drawn);
    steps.forEach((step, i) => {
      sandbox.goToStoryStep('order_journey', i);
      assert.deepEqual(drawing(state), { plateau: drawn, against: null, mode: null }, drawn + ' step ' + (i + 1) + ': no plateau named, the one drawn stays');
    });
    run(sandbox, 'activeStory = null');
  }
});

test('a story across the fork tells each step at the plateau it names and compared with the one it names: the counts are those of `archicode diff`, and nothing stacks saas on inhouse', async () => {
  const { sandbox, state } = await openBrightcart();
  const story = sandbox.findStory('fork_tour');
  const steps = sandbox.storySteps(story);
  const facts = storyOf('fork_tour');
  assert.equal(steps.length, facts.steps.length);
  // what the story names: both alternatives, in the same story, and the plateau that stands on one of them
  const named = new Set(facts.steps.flatMap((s) => [s.at, s.against]).filter(Boolean));
  assert.deepEqual(Array.from(named).sort(), ['baseline', 'inhouse', 'marketplace', 'saas']);
  assert.equal(state.plateauTree.nodes.get('saas').parent, 'baseline');
  assert.equal(state.plateauTree.nodes.get('inhouse').parent, 'baseline', 'saas and inhouse are two plateaus that override baseline and do not stack');
  // every step can be drawn, whatever plateau the reader had drawn (a step that names no `at` is told at that plateau, which is why `customer` is the element of the last one)
  for (const drawn of PLATEAUS) {
    sandbox.drawPlateau(drawn);
    assert.deepEqual(plain(Array.from(steps, (step) => sandbox.stepProblem(step))), Array.from(steps, () => null), 'the plateau drawn is ' + drawn);
  }
  // told: the plateau and the comparison of the step are drawn, and the Changes panel has the numbers of the tool
  const expectedCounts = { 2: 'P1', 3: 'P2', 4: 'P5', 5: 'P3', 6: 'P4' };
  sandbox.drawPlateau('baseline');
  for (const fact of facts.steps) {
    sandbox.goToStoryStep('fork_tour', fact.number - 1);
    if (fact.at === null) continue;
    const shown = drawing(state);
    assert.equal(shown.plateau, fact.at, 'step ' + fact.number);
    assert.equal(shown.against, fact.against, 'step ' + fact.number);
    if (fact.against === null) {
      assert.equal(shown.mode, null, 'step 1 is told at baseline and compared with nothing');
      continue;
    }
    assert.deepEqual(countsOf(sandbox.comparisonState().full), wanted(expectedCounts[fact.number]), 'step ' + fact.number + ': ' + fact.comparison + ' is ' + expectedCounts[fact.number]);
    const title = (id) => String(state.plateauTree.nodes.get(id).name || id);
    assert.ok(sandbox.renderStoryBarHtml().includes('told at ' + title(fact.at) + ', compared with ' + title(fact.against)), 'step ' + fact.number + ': the bar says where the step is told and what it is compared with');
  }
  // the step that is a comparison of the two alternatives: a sibling, not a parent and not a child
  sandbox.goToStoryStep('fork_tour', 3);
  assert.deepEqual(drawing(state), { plateau: 'inhouse', against: 'saas', mode: 'other' });
  // the step that names `against` and no `at`: told at the plateau the reader had when the story began, which is drawn again after the steps that named another
  sandbox.drawPlateau('inhouse');
  run(sandbox, 'activeStory = null');
  sandbox.goToStoryStep('fork_tour', 6);
  assert.deepEqual(drawing(state), { plateau: 'inhouse', against: 'saas', mode: 'other' }, 'inhouse drawn, compared with saas: the pair of P5');
  assert.deepEqual(countsOf(sandbox.comparisonState().full), wanted('P5'));
  run(sandbox, 'activeStory = null');
  sandbox.drawPlateau('baseline');
  sandbox.goToStoryStep('fork_tour', 6);
  assert.deepEqual(drawing(state), { plateau: 'baseline', against: 'saas', mode: 'future' }, 'baseline drawn, compared with saas, its descendant');
  assert.deepEqual(countsOf(sandbox.comparisonState().full), wanted('P1'), 'baseline against its descendant saas is the pair of P1');
  // `against: saas` with `saas` drawn: a plateau compared with itself is no comparison (as for the step of `migration` that is told at baseline against baseline), and the step says nothing
  run(sandbox, 'activeStory = null');
  sandbox.drawPlateau('saas');
  sandbox.goToStoryStep('fork_tour', 6);
  assert.deepEqual(drawing(state), { plateau: 'saas', against: null, mode: null }, 'saas drawn, compared with saas: nothing is compared');
  assert.equal(sandbox.stepProblem(steps[6]), null);
});

test('a story told in one plateau says so in every step, and is the same story whatever plateau is drawn; the step that names `marketplace` and `inhouse` is the pair of P3', async () => {
  const { sandbox, state } = await openBrightcart();
  const facts = storyOf('seller_journey');
  assert.ok(facts.steps.every((s) => s.at === 'marketplace'));
  const steps = sandbox.storySteps(sandbox.findStory('seller_journey'));
  for (const drawn of PLATEAUS) {
    sandbox.drawPlateau(drawn);
    assert.deepEqual(plain(Array.from(steps, (step) => sandbox.stepProblem(step))), Array.from(steps, () => null), 'drawn ' + drawn + ': every step is told at marketplace');
    sandbox.goToStoryStep('seller_journey', 0);
    assert.equal(drawing(state).plateau, 'marketplace');
    run(sandbox, 'activeStory = null');
  }
  sandbox.goToStoryStep('seller_journey', 2);
  assert.deepEqual(drawing(state), { plateau: 'marketplace', against: 'inhouse', mode: 'past' });
  assert.deepEqual(countsOf(sandbox.comparisonState().full), wanted('P3'));
});

test('the steps of the stories are the ones expected/entries.json lists: the view each names is declared once, and the plateaus they name are the four of the tree', async () => {
  const { sandbox, state } = await openBrightcart();
  const viewCount = new Map();
  for (const view of sandbox.savedViews()) viewCount.set(view.id, (viewCount.get(view.id) || 0) + 1);
  for (const story of ENTRIES.stories) {
    const steps = sandbox.storySteps(sandbox.findStory(story.id));
    steps.forEach((step, i) => {
      const fact = story.steps[i];
      assert.equal(step.view || null, fact.view, story.id + ' step ' + fact.number);
      assert.equal(step.at || null, fact.at, story.id + ' step ' + fact.number);
      assert.equal(step.against || null, fact.against, story.id + ' step ' + fact.number);
      if (step.view) assert.equal(viewCount.get(step.view), 1, story.id + ' step ' + fact.number + ': the view ' + step.view + ' is declared once');
      for (const key of ['at', 'against']) if (step[key]) assert.ok(state.plateauTree.ids.includes(step[key]), step[key] + ' is a plateau');
    });
  }
});

// ---- what the shipped files guard ----

test('a plateau that the shipped stories and views name cannot be deleted: the guard of the page tells the steps and the views it would break, on files that ship', async () => {
  const { sandbox } = await openBrightcart();
  const saas = plain(sandbox.plateauDeletion('saas'));
  assert.equal(saas.refusal, null);
  assert.ok(saas.blocking.some((line) => line.includes('the story `fork_tour` (`' + ENTRIES.folder + '/story.fork_tour.yaml`) step 2 says `at: saas`')), saas.blocking.join('\n'));
  assert.ok(saas.blocking.some((line) => line.includes('the story `fork_tour`') && line.includes('names `commerce-saas`, which exists in no plateau')), 'the step that carries its own view of `commerce-saas`');
  assert.throws(() => sandbox.commitPlateauDelete('saas'), /cannot be deleted: \d+ views or story steps would no longer be valid/);
  const marketplace = plain(sandbox.plateauDeletion('marketplace'));
  assert.ok(marketplace.blocking.some((line) => line.includes('the view `marketplace_overview`') && line.includes('names `marketplace`, which exists in no plateau')), marketplace.blocking.join('\n'));
});
