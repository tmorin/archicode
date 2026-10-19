'use strict';
// A step of a story may be told at a plateau (`at`) and compared with another one (`against`), wave 015, run 0101 (issue #24, second half). A story belongs to no plateau
// (run 0100); a step may carry these two optional keys, which are not the `plateau:` of a header. Here: what the page says of them (the checks of
// `src/test/resources/brightcart/negative-cases.json` and `layer-checks-cases.json` hold the sentences both tools share), how a step is looked at in its own plateau, how the
// story is told (the plateau and the comparison are drawn, a step that names none is drawn as the reader had it), and how the story editor writes the two keys.
// Everything is invented (a ferry company). Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const vm = require('node:vm');
const { memFolder } = require('./mem-folder');
const run = (sandbox, code) => vm.runInContext(code, sandbox);

const plain = (value) => JSON.parse(JSON.stringify(value));
const SYSTEM = (id, extra, plateau) => 'header:\n  kind: "archicode.morin.io/system"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n' + (extra || '');
const CONTAINER = (id, parent, plateau) => 'header:\n  kind: "archicode.morin.io/container"\n  parent: "' + parent + '"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, override, body) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '') + (body || '');
const STORY = (id, steps, extra) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (extra || '') + '  steps:\n' + steps;
const VIEW = (id, element) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  viewpoint: "overview"\n  properties:\n    element: "' + element + '"\n';

/** Three plateaus in a line: `baseline` (the ferry and its ticket office), `later` (adds the dock, drops the office), `latest` (adds a pier). */
const FERRY = {
  'app.ferry.yaml': SYSTEM('ferry'),
  'app.ferry.office.yaml': CONTAINER('office', 'ferry'),
  'later/plateau.yaml': PLATEAU('later', null, '  patches:\n    - operator: REMOVE\n      target: "ferry.office"\n'),
  'later/app.ferry.dock.yaml': CONTAINER('dock', 'ferry', 'later'),
  'latest/plateau.yaml': PLATEAU('latest', 'later'),
  'latest/app.ferry.pier.yaml': CONTAINER('pier', 'ferry', 'latest')
};

async function open(files, settings) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': settings || 'settings:\n  manifests:\n    paths: ["./**"]\n' }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  return { sandbox, state, mem };
}

const stepsOf = (sandbox, id) => sandbox.findStory(id).steps;

test('a step that names a plateau that is none, or that compares a plateau with itself, is told; `against` alone is read', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'story.tour.yaml': STORY('tour',
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: baseline\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: lates\n      against: later\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: later\n      against: later\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      against: baseline\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: ""\n      against:\n')
  }));
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [
    'the story `tour` (`story.tour.yaml`) step 2 says `at: lates`, which is not a plateau of this workspace (the plateaus are `baseline`, `later`, `latest`)',
    'the story `tour` (`story.tour.yaml`) step 3 says `at: later` and `against: later`: a plateau is never compared with itself'
  ]);
  assert.equal(sandbox.stepProblem(stepsOf(sandbox, 'tour')[0]), null, 'a step told at a plateau of the workspace can be drawn');
  assert.equal(sandbox.stepProblem(stepsOf(sandbox, 'tour')[3]), null, '`against` with no `at` is a step told at the plateau drawn');
  assert.equal(sandbox.stepProblem(stepsOf(sandbox, 'tour')[4]), null, 'a key with nothing after it names nothing');
  assert.equal(sandbox.stepProblem(stepsOf(sandbox, 'tour')[1]), 'The plateau “lates” is not a plateau of this workspace.');
  assert.match(sandbox.stepProblem(stepsOf(sandbox, 'tour')[2]), /^A plateau is never compared with itself/);
  // the band counts them with the other mistakes of the stories
  assert.equal(sandbox.bandMistakes().count, 2);
});

test('a workspace with no plateau refuses a step that names one, in the story and nowhere else', async () => {
  const { sandbox, state } = await open({
    'app.ferry.yaml': SYSTEM('ferry'),
    'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: later\n      against: earlier\n')
  });
  assert.equal(state.plateauTree.layered, false);
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [
    'the story `tour` (`story.tour.yaml`) step 1 says `at: later` but the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)',
    'the story `tour` (`story.tour.yaml`) step 1 says `against: earlier` but the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)'
  ]);
  assert.equal(sandbox.stepProblem(stepsOf(sandbox, 'tour')[0]), 'This workspace has no plateau, so a step cannot be told at “later”.');
});

test('the stories of workspace.yaml are looked at too', async () => {
  const { sandbox, state } = await open(FERRY, 'settings:\n  manifests:\n    paths: ["./**"]\nstories:\n  - id: old\n    steps:\n      - viewpoint: overview\n        properties:\n          element: ferry\n        at: nowhere\n');
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [
    'the story `old` (`workspace.yaml`) step 1 says `at: nowhere`, which is not a plateau of this workspace (the plateaus are `baseline`, `later`, `latest`)'
  ]);
});

test('a step is looked at in its own plateau: a name that plateau lacks says so, a name that only the step\'s plateau has does not fail it', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'view.dock.yaml': VIEW('dock_view', 'ferry.dock'),
    'view.office.yaml': VIEW('office_view', 'ferry.office'),
    'story.tour.yaml': STORY('tour',
      '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n      at: later\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n      at: baseline\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n' +
      '    - view: dock_view\n      at: later\n' +
      '    - view: office_view\n      at: later\n' +
      '    - view: office_view\n      at: baseline\n' +
      '    - viewpoint: map\n      properties:\n        pinned: [ferry.dock, ferry.office]\n      at: later\n')
  }));
  const steps = stepsOf(sandbox, 'tour');
  const said = steps.map((step) => sandbox.stepProblem(step));
  assert.deepEqual(plain(said), [
    null,
    'The element “ferry.dock” is not in the plateau “baseline”.',
    'The element “ferry.dock” is not in the plateau “baseline”.', // the plateau drawn (baseline) is where a step with no `at` is told
    null,
    'The element “ferry.office” is not in the plateau “later”.',
    null,
    null
  ]);
  // nothing here is a mistake of the stories: every name is declared by some plateau
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), []);
  // the same steps with `later` drawn: the plateau drawn is where a step with no `at` is told, and a step with `at` does not depend on it
  sandbox.drawPlateau('later');
  assert.deepEqual(plain(steps.map((step) => sandbox.stepProblem(step))), [null, 'The element “ferry.dock” is not in the plateau “baseline”.', null, null, 'The element “ferry.office” is not in the plateau “later”.', null, null]);
});

test('a plateau the kernel refuses cannot be drawn: a step told at it, or compared with it, says so', async () => {
  const files = Object.assign({}, FERRY, { 'later/plateau.yaml': PLATEAU('later', null, '  patches:\n    - operator: SET\n      target: nope\n      field: name\n      value: x\n') });
  const { sandbox } = await open(Object.assign(files, {
    'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: later\n    - viewpoint: overview\n      properties:\n        element: ferry\n      against: later\n')
  }));
  const steps = stepsOf(sandbox, 'tour');
  assert.equal(sandbox.stepProblem(steps[0]), 'The plateau “later” cannot be drawn: the command line refuses its patches.');
  assert.equal(sandbox.stepProblem(steps[1]), 'The plateau “later” cannot be drawn: the command line refuses its patches.');
});

test('the story editor writes `at` and `against` in the step, and takes them out when the choice is the default', async () => {
  const text = STORY('tour', '    # the first look\n    - viewpoint: overview\n      properties:\n        element: ferry\n      text: Hello\n');
  const { sandbox, state, mem } = await open(Object.assign({}, FERRY, { 'story.tour.yaml': text }));
  const file = () => state.manifestFiles.find((f) => f.relPath === 'story.tour.yaml');
  assert.equal(sandbox.setStepPlateau('tour', 0, 'at', 'later'), true);
  assert.equal(sandbox.setStepPlateau('tour', 0, 'against', 'baseline'), true);
  assert.equal(file().dirty, true);
  assert.equal(file().rawText, text.replace('      text: Hello\n', '      text: Hello\n      at: later\n      against: baseline\n'), 'the file keeps its comment and its lines, and gains two');
  assert.equal(sandbox.setStepPlateau('tour', 0, 'at', 'later'), false, 'the same choice changes nothing');
  assert.equal(sandbox.setStepPlateau('tour', 0, 'at', ''), true);
  assert.equal(sandbox.setStepPlateau('tour', 0, 'against', ''), true);
  assert.equal(file().rawText, text, 'put back, the file is what it was');
  assert.equal(file().dirty, false);
  assert.equal(sandbox.setStepPlateau('tour', 0, 'plateau', 'later'), false, 'no other key is written');
  assert.equal(sandbox.setStepPlateau('tour', 5, 'at', 'later'), false);
  sandbox.setStepPlateau('tour', 0, 'at', 'later');
  await sandbox.saveAllChanges();
  assert.match(mem.files.get('story.tour.yaml').text, /at: later\n$/);
});

test('the story editor lists the plateaus, and the plateau a step names that does not exist, flagged', async () => {
  const { sandbox } = await open(Object.assign({}, FERRY, {
    'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: later\n      against: lost\n')
  }));
  const html = sandbox.renderStoryEditorHtml(sandbox.findStory('tour'));
  assert.match(html, /<select data-story-step-plateau="at"[^>]*>.*<option value="">The plateau drawn<\/option>.*<option value="later" selected>later<\/option>/s);
  assert.match(html, /<select data-story-step-plateau="against"[^>]*>.*<option value="">Nothing<\/option>.*<option value="lost" selected>lost \(not a plateau\)<\/option>/s);
  assert.match(html, /The plateau “lost” is not a plateau of this workspace\./);
  // a workspace with no plateau offers none, unless the step already names one
  const flat = await open({ 'app.ferry.yaml': SYSTEM('ferry'), 'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n') });
  assert.doesNotMatch(flat.sandbox.renderStoryEditorHtml(flat.sandbox.findStory('tour')), /data-story-step-plateau/);
});

test('keeping a step\'s own view as a named view keeps the plateaus of the step', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: Hello\n      at: later\n      against: baseline\n')
  }));
  let confirmed = null;
  sandbox.openTextDialog = (title, hint, value, label, onSave) => { confirmed = onSave; };
  sandbox.keepStepAsNamedView('tour', 0);
  assert.ok(confirmed, 'a dialog asks for the name');
  confirmed('Ferry view');
  const step = stepsOf(sandbox, 'tour')[0];
  assert.deepEqual(plain(step), { view: 'ferry_view', at: 'later', against: 'baseline', text: 'Hello' });
  assert.equal(state.manifestFiles.some((f) => /^view\./.test(f.relPath.split('/').pop()) && f.dirty), true);
});

// ---- telling the story ----

const drawing = (state) => ({ plateau: state.layers.current, against: state.layers.compare ? state.layers.compare.other : null, mode: state.layers.compare ? state.layers.compare.mode : null });

const TOUR = STORY('tour',
  '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: today\n      at: baseline\n' +
  '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: next\n      at: later\n      against: baseline\n' +
  '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: as the reader has it\n' +
  '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n      text: later, from the reader\'s plateau\n      against: baseline\n' +
  '    - viewpoint: overview\n      properties:\n        element: ferry.pier\n      text: lost\n      at: later\n');

test('a step is drawn in its plateau and, with `against`, as a comparison; a step that names none is drawn as the reader had it', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, { 'story.tour.yaml': TOUR }));
  sandbox.drawPlateau('latest');
  assert.deepEqual(drawing(state), { plateau: 'latest', against: null, mode: null });

  sandbox.goToStoryStep('tour', 0);
  assert.deepEqual(drawing(state), { plateau: 'baseline', against: null, mode: null }, 'told at baseline');
  assert.equal(state.index.application.has('ferry.office'), true, 'the model is the one of baseline');
  assert.match(sandbox.renderStoryBarHtml(), /told at baseline/);

  sandbox.goToStoryStep('tour', 1);
  assert.deepEqual(drawing(state), { plateau: 'later', against: 'baseline', mode: 'past' }, 'told at `later`, compared with the plateau it overrides');
  assert.equal(state.baseline.plateau.id, 'baseline', 'the plateau compared with is the one the step names');
  assert.match(sandbox.renderStoryBarHtml(), /told at later, compared with baseline/);
  assert.ok(sandbox.comparisonState().full.changes.length > 0, 'the comparison is the one of the Changes panel: the dock is new, the office is removed');

  sandbox.goToStoryStep('tour', 2);
  assert.deepEqual(drawing(state), { plateau: 'latest', against: null, mode: null }, 'no plateau named: the one the reader had when the story began, and its comparison');
  assert.doesNotMatch(sandbox.renderStoryBarHtml(), /told at/);

  sandbox.goToStoryStep('tour', 3);
  assert.deepEqual(drawing(state), { plateau: 'latest', against: 'baseline', mode: 'other' }, '`against` alone: told at the plateau the reader had');
  assert.equal(sandbox.stepProblem(sandbox.findStory('tour').steps[3]), null);
  assert.match(sandbox.renderStoryBarHtml(), /compared with baseline/);

  // a step whose plateau lacks the name is said in the bar, which stays, and the diagram is the one before it
  sandbox.goToStoryStep('tour', 4);
  assert.deepEqual(drawing(state).plateau, 'later', 'the plateau of the step is drawn');
  assert.match(sandbox.renderStoryBarHtml(), /Step 5 cannot be shown: The element “ferry.pier” is not in the plateau “later”\./);
  assert.match(sandbox.renderStoryBarHtml(), /data-action="story-prev"(?! disabled)/, 'the way on stays open');
});

test('a plateau chosen on the band in the middle of a story is the new home of the steps that name none, and "Back to this step" draws the step again', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, { 'story.tour.yaml': TOUR }));
  sandbox.goToStoryStep('tour', 1);
  assert.equal(drawing(state).plateau, 'later');
  sandbox.drawPlateau('latest'); // the reader draws another plateau
  assert.match(sandbox.renderStoryBarHtml(), /data-action="story-restore"/, 'the screen is no longer the step');
  sandbox.goToStoryStep('tour', 1);
  assert.deepEqual(drawing(state), { plateau: 'later', against: 'baseline', mode: 'past' });
  assert.doesNotMatch(sandbox.renderStoryBarHtml(), /data-action="story-restore"/);
  sandbox.drawPlateau('latest');
  sandbox.goToStoryStep('tour', 2);
  assert.equal(drawing(state).plateau, 'latest', 'what the reader chose in the middle of the story');
  // leaving the story and telling it again begins from what is drawn then
  run(sandbox, 'activeStory = null');
  sandbox.drawPlateau('baseline');
  sandbox.goToStoryStep('tour', 2);
  assert.equal(drawing(state).plateau, 'baseline');
});

test('a step that names a plateau that is none draws nothing else, and the story is told in a workspace with no plateau as it was', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: lates\n')
  }));
  sandbox.drawPlateau('later');
  sandbox.goToStoryStep('tour', 0);
  assert.equal(drawing(state).plateau, 'later', 'nothing changed');
  assert.match(sandbox.renderStoryBarHtml(), /cannot be shown: The plateau “lates” is not a plateau of this workspace\./);
  const flat = await open({ 'app.ferry.yaml': SYSTEM('ferry'), 'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n') });
  flat.sandbox.goToStoryStep('tour', 0);
  assert.equal(flat.sandbox.renderStoryBarHtml().includes('cannot be shown'), false);
  assert.equal(flat.state.layers.current, 'baseline');
});

// ---- the shipped example ----

test('the example of the manual (domain_plateaus) tells a story with steps at plateaus, and the page draws them in the plateau and the comparison they name', async () => {
  const path = require('node:path');
  const { makeDirHandle } = require('./harness');
  const dir = path.resolve(__dirname, '../../../doc/examples/domain_plateaus');
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(dir);
  state.folder = { handle, name: 'domain_plateaus' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  const story = sandbox.findStory('migration');
  const steps = sandbox.storySteps(story);
  assert.equal(steps.length, 4);
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), []);
  for (const drawn of ['baseline', 'to-be']) {
    sandbox.drawPlateau(drawn);
    assert.deepEqual(plain(steps.map((step) => sandbox.stepProblem(step))), [null, null, null, null], 'every step can be drawn, whatever plateau is drawn (' + drawn + ')');
  }
  sandbox.drawPlateau('baseline');
  sandbox.goToStoryStep('migration', 1);
  assert.deepEqual(drawing(state), { plateau: 'to-be', against: 'baseline', mode: 'past' });
  assert.ok(sandbox.comparisonState().full.changes.length > 0, 'what the plateau changes is drawn as a comparison');
  sandbox.goToStoryStep('migration', 2);
  assert.deepEqual(drawing(state), { plateau: 'to-be', against: null, mode: null });
  sandbox.goToStoryStep('migration', 3);
  assert.deepEqual(drawing(state), { plateau: 'baseline', against: null, mode: null }, 'told at baseline (the plateau drawn when the story began) and compared with itself is no comparison');
});

// ---- the edges (the read-only review of the diff of run 0101) ----

test('a story kept in workspace.yaml is repaired in the page: the mistake it told goes with the edit, and a workspace with no plateau says the steps apart from the names', async () => {
  const settings = 'settings:\n  manifests:\n    paths: ["./**"]\nstories:\n  - id: old\n    steps:\n      - viewpoint: overview\n        properties:\n          element: ferry\n        at: gone\n';
  const { sandbox, state } = await open(FERRY, settings);
  assert.equal(sandbox.entryProblemsOf(state.workspace.settings).length, 1);
  assert.equal(sandbox.setStepPlateau('old', 0, 'at', 'later'), true);
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [], 'the answer kept with the layers does not outlive the edit of workspace.yaml');
  assert.equal(state.workspace.settingsDirty, true);
  // a workspace that has no plateau: the band is shown, and says what is wrong with the steps, not that an element exists in no plateau
  const flat = await open({ 'app.ferry.yaml': SYSTEM('ferry'), 'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ghost\n      at: later\n') });
  assert.deepEqual(plain(flat.sandbox.bandMistakes().sections.map((section) => section.heading)), ['The steps of the stories name plateaus that are none:']);
  assert.equal(flat.sandbox.bandMistakes().count, 1);
});

test('an item with no value in the steps takes no number, and a plateau written as a number or a word is read as the text it is', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'story.tour.yaml': STORY('tour', '    -\n    - viewpoint: overview\n      properties:\n        element: ferry\n      at: 5\n')
  }));
  assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), [
    'the story `tour` (`story.tour.yaml`) step 1 says `at: 5`, which is not a plateau of this workspace (the plateaus are `baseline`, `later`, `latest`)'
  ]);
});

test('a tree that is wrong draws baseline only: a step told there is fine, a step told elsewhere, or compared, says why', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'lates/plateau.yaml': PLATEAU('lates', 'nowhere'),
    'story.tour.yaml': STORY('tour',
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: baseline\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: later\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      against: baseline\n')
  }));
  assert.ok(state.layers.blocked, 'the tree is refused');
  const said = plain(stepsOf(sandbox, 'tour').map((step) => sandbox.stepProblem(step)));
  assert.equal(said[0], null);
  assert.match(said[1], /^Only baseline is drawn \(.*\), so a step cannot be told at another plateau or compared\.$/);
  assert.match(said[2], /^Only baseline is drawn/);
});

test('a step that cannot be drawn does not take the story\'s home away: a plateau the reader draws after it is the home of the next steps', async () => {
  const { sandbox, state } = await open(Object.assign({}, FERRY, {
    'story.tour.yaml': STORY('tour',
      '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: lates\n' +
      '    - viewpoint: overview\n      properties:\n        element: ferry\n')
  }));
  sandbox.goToStoryStep('tour', 0); // a plateau that is none: nothing is drawn, the bar says why
  assert.equal(drawing(state).plateau, 'baseline');
  sandbox.drawPlateau('latest'); // the reader chooses a plateau on the band
  sandbox.goToStoryStep('tour', 1);
  assert.equal(drawing(state).plateau, 'latest', 'what the reader chose, not what was drawn when the story began');
});
