'use strict';
// *Add to story...* can write `at` and `against` (wave 016, run 0111, issue #110, the author's decision of 2026-10-20). The dialog of the story picker has a box, offered when the
// workspace has plateaus and CHECKED when a comparison is on screen: checked, the step is written with `at` (the plateau drawn) and `against` (the plateau compared with, as the
// id it is now: a comparison that follows the plateau drawn is not written as a mode); unchecked, the step is written as it was, with no key. The keys are those of run 0101
// (`stepPlateauProblems`, `goToStoryStep`). Two sets of files: the layered Brightcart as it ships (src/test/resources/brightcart/layered/, with its three stories in `shared/`:
// `order_journey` names no plateau, `fork_tour` names them all), copied into an in-memory folder; and a few small invented ones (a ferry company) for what the fixture cannot be
// made to do (a tree that is wrong, a plateau the kernel refuses, a workspace with none).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}
const BRIGHTCART = walk(LAYERED, LAYERED, {});

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  // the harness has no layout engine: `render()` is the address and nothing else (the dialog is read through `renderAppDialogHtml`)
  sandbox.render = () => { sandbox.syncHashFromState(); };
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

/** A diagram on screen: the overview of an element, on the page Elements. */
function showElement(opened, key) {
  opened.state.selection = { kind: 'element', key, mode: 'view' };
  run(opened.sandbox, "currentPerspective = 'elements'; elementTab = 'overview'");
}

/** Presses *Add to story...* and answers the dialog as the page would read it (`checked` is what the box holds unless the test says). */
function addToStory(opened, choice, options) {
  const { sandbox } = opened;
  sandbox.addCurrentViewToStory();
  const dialog = run(sandbox, 'appDialog');
  assert.equal(dialog && dialog.kind, 'story-picker');
  const html = sandbox.renderAppDialogHtml();
  const box = /<input type="checkbox" data-dialog-plateaus([^>]*)>/.exec(html);
  const ticked = options && options.ticked !== undefined ? options.ticked : !!(box && /\bchecked\b/.test(box[1]));
  sandbox.submitAppDialog(Object.assign({ withPlateaus: ticked }, choice));
  return { html, box };
}

const stepsOf = (sandbox, id) => plain(sandbox.findStory(id).steps);
const file = (state, relPath) => state.manifestFiles.find((f) => f.relPath === relPath);
const drawing = (state) => ({ plateau: state.layers.current, against: state.layers.compare ? state.layers.compare.other : null });
const text = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');

const ORDER = 'shared/story.order_journey.yaml';
/** What a new step adds to the file of the story: the lines after the last step, nothing else changes. */
function appended(opened, relPath) {
  const before = opened.original[relPath];
  const after = file(opened.state, relPath).rawText;
  assert.ok(after.startsWith(before), 'the lines of the file are kept: the step is added after them');
  return after.slice(before.length);
}

const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, override, body) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '') + (body || '');
const TOUR = 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "tour"\n  steps:\n    # the ferry\n    - viewpoint: overview\n      properties:\n        element: ferry\n      text: Hello\n';
const FERRY = {
  'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
  'app.ferry.yaml': SYSTEM('ferry'),
  'later/plateau.yaml': PLATEAU('later', null),
  'latest/plateau.yaml': PLATEAU('latest', 'later'),
  'story.tour.yaml': TOUR
};

// ---- the box ----

test('a comparison on screen: the box is offered and CHECKED; the step is written with `at` and `against`, and plays back with them', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('inhouse');
  assert.deepEqual(drawing(state), { plateau: 'marketplace', against: 'inhouse' });
  showElement(opened, 'psp');
  const before = stepsOf(sandbox, 'order_journey').length;
  const { html, box } = addToStory(opened, { choice: 'order_journey' });
  assert.ok(box, 'the box is in the dialog');
  assert.match(box[1], /\bchecked\b/, 'a comparison is on screen: checked');
  assert.match(text(html), /Tell the step at marketplace, compared with inhouse/);
  assert.match(text(html), /written as the plateau it is now/, 'one sentence says that the keys name plateaus, not modes');

  const steps = stepsOf(sandbox, 'order_journey');
  assert.equal(steps.length, before + 1);
  assert.deepEqual(steps[before], { viewpoint: 'overview', layer: 'application', properties: { element: 'psp' }, at: 'marketplace', against: 'inhouse' });
  assert.match(appended(opened, ORDER), /^\s+- viewpoint: .*\n(.*\n)*\s+at: .*marketplace.*\n\s+against: .*inhouse.*\n$/, 'only the lines of the new step are added');
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [], 'the keys pass the checks of the stories');
  assert.deepEqual(plain(sandbox.stepPlateauProblem(sandbox.findStory('order_journey').steps[before])), null);
  assert.match(run(sandbox, 'storyBarNotice'), /Added as step 4 of .*, told at marketplace, compared with inhouse\./);

  // the story plays back with them, whatever the reader had drawn
  sandbox.drawPlateau('saas');
  assert.equal(state.layers.current, 'saas');
  sandbox.goToStoryStep('order_journey', before);
  assert.deepEqual(drawing(state), { plateau: 'marketplace', against: 'inhouse' });
  assert.equal(sandbox.stepProblem(sandbox.findStory('order_journey').steps[before]), null);

  // saved: the file of the story is the only one written, with those lines
  await sandbox.saveAllChanges();
  assert.deepEqual(opened.mem.writes, [ORDER]);
  assert.equal(opened.mem.files.get(ORDER).text, file(state, ORDER).rawText);
});

test('the box unchecked: the step is written as it was, with no key', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('inhouse');
  showElement(opened, 'psp');
  const before = stepsOf(sandbox, 'order_journey').length;
  addToStory(opened, { choice: 'order_journey' }, { ticked: false });
  const step = stepsOf(sandbox, 'order_journey')[before];
  assert.deepEqual(step, { viewpoint: 'overview', layer: 'application', properties: { element: 'psp' } });
  assert.equal(appended(opened, ORDER).includes('at:'), false);
  assert.equal(appended(opened, ORDER).includes('against:'), false);
  assert.doesNotMatch(run(sandbox, 'storyBarNotice'), /told at/);
  // the step is told at the plateau drawn when the story is told
  sandbox.drawPlateau('saas');
  const reader = drawing(state);
  assert.equal(reader.plateau, 'saas');
  sandbox.goToStoryStep('order_journey', before);
  assert.deepEqual(drawing(state), reader, 'drawn as the reader has it: the step names no plateau');
});

test('no comparison on screen: the box is offered and UNCHECKED; ticked, only `at` is written', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('inhouse');
  assert.equal(state.layers.compare, null);
  showElement(opened, 'psp');
  const offer = plain(sandbox.storyStepPlateaus());
  assert.deepEqual(offer, { at: 'inhouse', against: null, note: null, problem: null, checked: false });
  const before = stepsOf(sandbox, 'order_journey').length;
  const first = addToStory(opened, { choice: 'order_journey' });
  assert.ok(first.box);
  assert.doesNotMatch(first.box[1], /\bchecked\b/, 'no comparison: unchecked');
  assert.deepEqual(stepsOf(sandbox, 'order_journey')[before], { viewpoint: 'overview', layer: 'application', properties: { element: 'psp' } }, 'unchecked, as it was');
  // the author ticks it: the plateau drawn, no comparison to name
  const second = addToStory(opened, { choice: 'order_journey' }, { ticked: true });
  assert.match(text(second.html), /Tell the step at the plateau drawn, inhouse/);
  assert.deepEqual(stepsOf(sandbox, 'order_journey')[run(sandbox, 'activeStory').step], { viewpoint: 'overview', layer: 'application', properties: { element: 'psp' }, at: 'inhouse' });
});

test('a following comparison (the past) is written as the plateau it resolves to now, and stays that plateau when the plateau drawn changes', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('marketplace');
  sandbox.toggleCompareWithPast();
  assert.equal(state.layers.compare.mode, 'past');
  showElement(opened, 'psp');
  assert.deepEqual(plain(sandbox.storyStepPlateaus()), { at: 'marketplace', against: 'inhouse', note: null, problem: null, checked: true });
  const before = stepsOf(sandbox, 'order_journey').length;
  const { html } = addToStory(opened, { choice: 'order_journey' });
  assert.match(text(html), /written as the plateau it is now/);
  const step = stepsOf(sandbox, 'order_journey')[before];
  assert.equal(step.at, 'marketplace');
  assert.equal(step.against, 'inhouse', 'the id, not "past"');
  sandbox.drawPlateau('inhouse'); // the past now follows to `baseline`; the step does not
  assert.equal(stepsOf(sandbox, 'order_journey')[before].against, 'inhouse');
});

test('a comparison the page cannot name leaves `against` out and says why', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  showElement(opened, 'psp');
  // the future, with two plateaus to choose among: nothing is compared yet
  sandbox.drawPlateau('baseline');
  sandbox.toggleCompareWithFuture();
  assert.equal(state.layers.compare.mode, 'future');
  assert.equal(state.layers.compare.other, null);
  let offer = plain(sandbox.storyStepPlateaus());
  assert.equal(offer.against, null);
  assert.equal(offer.checked, false);
  assert.match(offer.note, /waits for a plateau to be chosen/);
  assert.match(text(sandbox.storyPlateauChoiceHtml()), /waits for a plateau to be chosen/);
  // the plateau compared with is the plateau drawn: the same plateau twice is no comparison
  state.layers.compare = { mode: 'other', other: state.layers.current, chosen: true };
  offer = plain(sandbox.storyStepPlateaus());
  assert.deepEqual([offer.at, offer.against, offer.checked, offer.problem], ['baseline', null, false, null]);
  assert.match(offer.note, /is the plateau drawn: nothing is compared/);
  const before = stepsOf(sandbox, 'order_journey').length;
  addToStory(opened, { choice: 'order_journey' }, { ticked: true });
  const step = stepsOf(sandbox, 'order_journey')[before];
  assert.deepEqual([step.at, step.against], ['baseline', undefined], '`at` alone: never the same plateau twice');
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), []);
  // a plateau that is gone
  state.layers.compare = { mode: 'other', other: 'vanished', chosen: true };
  offer = plain(sandbox.storyStepPlateaus());
  assert.equal(offer.against, null);
  assert.match(offer.note, /not a plateau of this workspace any more/);
});

test('the box writes into a new story too, and into a step that points at a named view', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('saas');
  sandbox.compareWithPlateau('baseline');
  // the diagram on screen is a view the workspace already keeps: the step points at it, with the plateaus
  const named = sandbox.findSavedView('customer_overview');
  assert.ok(named);
  showElement(opened, named.properties.element);
  assert.deepEqual(plain(sandbox.currentViewDefinition()), plain({ viewpoint: named.viewpoint, layer: named.layer || 'application', properties: named.properties }), 'the diagram on screen is that view');
  addToStory(opened, { choice: '__new__', newName: 'Saas tour' });
  const story = sandbox.storiesList().find((s) => s.name === 'Saas tour');
  assert.deepEqual(plain(story.steps), [{ view: 'customer_overview', at: 'saas', against: 'baseline' }]);
  const created = state.manifestFiles.find((f) => f.content === story);
  assert.ok(created && created.dirty && !created.existedOnDisk, 'a file of its own, not written yet');
  assert.match(created.rawText, /- view: .*customer_overview.*\n\s+at: .*saas.*\n\s+against: .*baseline/);
});

// ---- where the box is not ----

test('a workspace with no plateau shows no box and writes no key, ticked or not', async () => {
  const opened = await open({ 'workspace.yaml': FERRY['workspace.yaml'], 'app.ferry.yaml': SYSTEM('ferry'), 'story.tour.yaml': TOUR });
  const { sandbox, state } = opened;
  assert.equal(state.plateauTree.layered, false);
  showElement(opened, 'ferry');
  assert.equal(sandbox.storyStepPlateaus(), null);
  const { html, box } = addToStory(opened, { choice: 'tour' }, { ticked: true });
  assert.equal(box, null);
  assert.equal(html.includes('data-dialog-plateaus'), false);
  assert.deepEqual(stepsOf(sandbox, 'tour')[1], { viewpoint: 'overview', layer: 'application', properties: { element: 'ferry' } });
  assert.equal(appended(opened, 'story.tour.yaml').includes('at:'), false);
});

test('the plateaus cannot be drawn (a tree that is wrong): no box, the dialog says why, no key', async () => {
  const opened = await open(Object.assign({}, FERRY, { 'lost/plateau.yaml': PLATEAU('lost', 'nowhere') }));
  const { sandbox, state } = opened;
  assert.ok(state.layers.blocked);
  showElement(opened, 'ferry');
  const { html, box } = addToStory(opened, { choice: 'tour' }, { ticked: true });
  assert.equal(box, null);
  assert.match(text(html), /The plateaus cannot be drawn \(.*\), so the step is added without a plateau\./);
  assert.deepEqual(stepsOf(sandbox, 'tour')[1], { viewpoint: 'overview', layer: 'application', properties: { element: 'ferry' } });
});

test('a plateau the kernel refuses cannot be told: compared with it, `against` is left out and the reason said; drawn, nothing is written', async () => {
  const bad = PLATEAU('later', null, '  patches:\n    - operator: SET\n      target: nope\n      field: name\n      value: x\n');
  const opened = await open(Object.assign({}, FERRY, { 'later/plateau.yaml': bad, 'latest/plateau.yaml': PLATEAU('latest', null) }));
  const { sandbox } = opened;
  sandbox.drawPlateau('latest');
  sandbox.compareWithPlateau('later'); // compared with a plateau the command line refuses
  showElement(opened, 'ferry');
  const offer = plain(sandbox.storyStepPlateaus());
  assert.deepEqual([offer.at, offer.against, offer.problem, offer.checked], ['latest', null, null, false], 'the step can be told at the plateau drawn, not compared with that one');
  assert.match(offer.note, /The plateau “later” cannot be drawn: the command line refuses its patches\. No plateau is named for the comparison\./);
  assert.match(text(sandbox.storyPlateauChoiceHtml()), /No plateau is named for the comparison\./);
  sandbox.addCurrentViewToStoryChoice({ storyId: 'tour', withPlateaus: true });
  const written = stepsOf(sandbox, 'tour')[1];
  assert.deepEqual(written, { viewpoint: 'overview', layer: 'application', properties: { element: 'ferry' }, at: 'latest' });
  assert.equal(sandbox.stepProblem(sandbox.findStory('tour').steps[1]), null, 'a step the page does not flag');
});

// ---- the bytes ----

test('the line-preserving save: a step is added after the comment and the lines of the story, and nothing else in the file changes', async () => {
  const opened = await open(FERRY);
  const { sandbox, state, mem } = opened;
  sandbox.drawPlateau('latest');
  sandbox.compareWithPlateau('later');
  showElement(opened, 'ferry');
  addToStory(opened, { choice: 'tour' });
  const added = appended(opened, 'story.tour.yaml');
  assert.match(added, /^ {4}- viewpoint: overview\n {6}layer: application\n {6}properties:\n {8}element: ferry\n {6}at: "?latest"?\n {6}against: "?later"?\n$/);
  assert.equal(file(state, 'story.tour.yaml').rawText.startsWith(TOUR), true, 'the comment and the first step are as they were');
  assert.equal(state.workspace.settingsDirty, false, 'workspace.yaml is left alone');
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes, ['story.tour.yaml']);
  // read again, the step has its keys
  const again = await open(Object.fromEntries(Array.from(mem.files).map(([p, f]) => [p, f.text])));
  assert.deepEqual(stepsOf(again.sandbox, 'tour')[1], { viewpoint: 'overview', layer: 'application', properties: { element: 'ferry' }, at: 'latest', against: 'later' });
  assert.deepEqual(plain(again.sandbox.entryProblemsOf(again.state.workspace.settings)), []);
});

test('the step goes after the step being told, with its keys, and the story editor shows the two lists set', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox } = opened;
  sandbox.goToStoryStep('fork_tour', 1); // the second step is on screen: told at saas, compared with baseline
  assert.deepEqual(drawing(opened.state), { plateau: 'saas', against: 'baseline' });
  sandbox.drawPlateau('marketplace'); // the comparison followed the past of the plateau drawn
  assert.deepEqual(drawing(opened.state), { plateau: 'marketplace', against: 'inhouse' });
  showElement(opened, 'psp');
  addToStory(opened, { choice: 'fork_tour' });
  const steps = stepsOf(sandbox, 'fork_tour');
  assert.equal(steps.length, 8);
  assert.deepEqual(steps[2], { viewpoint: 'overview', layer: 'application', properties: { element: 'psp' }, at: 'marketplace', against: 'inhouse' });
  assert.deepEqual(steps[1].at, 'saas', 'the steps around it are what they were');
  const html = sandbox.renderStoryEditorHtml(sandbox.findStory('fork_tour'));
  assert.match(html, /<select data-story-step-plateau="at" data-story="fork_tour" data-step="2"[^>]*>.*<option value="marketplace" selected>/s);
});

test('the dialog reads the box from the page: what is ticked is what is written (`submitAppDialog` with no values)', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox } = opened;
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('inhouse');
  showElement(opened, 'psp');
  const before = stepsOf(sandbox, 'order_journey').length;
  const answer = (ticked) => {
    const real = sandbox.document.querySelector;
    sandbox.document.querySelector = (selector) => {
      if (selector === '[data-dialog-plateaus]') return { checked: ticked };
      if (selector === 'input[name="story-choice"]:checked') return { value: 'order_journey' };
      return real(selector);
    };
    try {
      sandbox.addCurrentViewToStory();
      sandbox.submitAppDialog();
    } finally {
      sandbox.document.querySelector = real;
    }
  };
  answer(false);
  assert.equal(stepsOf(sandbox, 'order_journey')[before].at, undefined);
  answer(true);
  const steps = stepsOf(sandbox, 'order_journey');
  assert.deepEqual([steps[run(sandbox, 'activeStory').step].at, steps[run(sandbox, 'activeStory').step].against], ['marketplace', 'inhouse']);
});
