'use strict';
// Wave 020, run 0149 (W-4), issue #142, second request: the bar of a story has a menu that shows any step directly (T7). It lists the steps by number and title, marks the one on
// screen and the ones that cannot be drawn (with the sentence), and choosing one is `goToStoryStep`, so the plateau and the comparison of the step are drawn as for Next. It is a
// native list (`<select data-story-step-menu>`) whose one handler, `chooseStoryStep`, is called from `handleAppChange`; the player of wave 021 places the same function in its own layout.
// Here: on each shipped story (`migration` of domain_plateaus; `fork_tour`, `order_journey`, `seller_journey` of the layered Brightcart) the menu, then every step reached from the
// menu is what Next pressed to get there draws (the plateau, the comparison, the view, the counts, the bar, the address); steps that cannot be drawn are marked; viewing writes
// nothing and changes no model; the bar of a story with one step, and the page of a story, are as they were.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const REPO = path.resolve(__dirname, '../../../..');
const LAYERED = path.join(REPO, 'src/test/resources/brightcart/layered');
const DOMAIN_PLATEAUS = path.join(REPO, 'src/doc/examples/domain_plateaus');

/** Every file of a folder, as a path -> text object (a copy the editor can open and the test can check byte for byte). */
function filesOf(dir, prefix = '') {
  const out = {};
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) Object.assign(out, filesOf(dir, rel));
    else out[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  return out;
}

async function open(files, name) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: name || 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  // the harness has no layout engine: `render()` is the address and nothing else
  sandbox.render = () => { sandbox.syncHashFromState(); };
  return { sandbox, state, mem, files };
}

const SHIPPED = {
  migration: { dir: DOMAIN_PLATEAUS, name: 'domain_plateaus' },
  fork_tour: { dir: LAYERED, name: 'layered' },
  order_journey: { dir: LAYERED, name: 'layered' },
  seller_journey: { dir: LAYERED, name: 'layered' }
};
const FILES = new Map();
const shippedFiles = (dir) => { if (!FILES.has(dir)) FILES.set(dir, filesOf(dir)); return FILES.get(dir); };

/** A click as handleAppClick reads it. */
function click(sandbox, action, attributes) {
  const target = { getAttribute: (name) => (name === 'data-action' ? action : attributes && name in attributes ? attributes[name] : null) };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

/** The menu as the browser would give it to `handleAppChange`: the list of the bar, with the value of the entry chosen. */
function menuSelect(story, index) {
  return { value: String(index), matches: (selector) => selector === '[data-story-step-menu]', getAttribute: (name) => (name === 'data-story' ? story : null), closest: () => null };
}
const choose = (sandbox, story, index) => sandbox.handleAppChange({ target: menuSelect(story, index) });

/** The entries of the menu in a bar: `{ value, selected, title, text }`. */
function entriesOf(html) {
  const entries = [];
  for (const m of html.matchAll(/<option value="(\d+)"( selected)?(?: title="([^"]*)")?>([^<]*)<\/option>/g)) {
    entries.push({ value: Number(m[1]), selected: !!m[2], title: m[3] === undefined ? null : m[3], text: m[4] });
  }
  return entries;
}
const menuOf = (sandbox) => entriesOf(sandbox.renderStoryBarHtml());
const unescape = (text) => text.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

/** Everything the page shows of a step that is drawn: the plateau, the comparison, the view, the counts of the comparison, the bar, the address. */
function snapshot(sandbox, state) {
  const compare = state.layers && state.layers.compare;
  const comparison = compare ? sandbox.comparisonState() : null;
  return plain({
    story: run(sandbox, 'activeStory'),
    plateau: state.layers ? state.layers.current : null,
    against: compare ? compare.other : null,
    mode: compare ? compare.mode : null,
    view: sandbox.currentViewDefinition(),
    counts: comparison && comparison.full ? comparison.full.counts : null,
    changes: comparison && comparison.full ? comparison.full.changes.length : null,
    bar: sandbox.renderStoryBarHtml(),
    // `ref`, the element selected, is whatever an earlier step left: no step of a story sets it, so it depends on the road taken (Next or the menu), not on the step
    hash: run(sandbox, 'currentRouteHash()').replace(/([?&])ref=[^&]*&?/, '$1').replace(/[?&]$/, '')
  });
}

for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
  test('story `' + storyId + '`: the menu lists every step, and a step chosen from it draws what Next draws', async () => {
    const files = shippedFiles(dir);
    const first = await open(files, name);
    const count = first.sandbox.storySteps(first.sandbox.findStory(storyId)).length;
    assert.ok(count >= 2, 'a story with a menu');

    // Next, one step at a time: what each step draws
    first.sandbox.goToStoryStep(storyId, 0);
    const byNext = [snapshot(first.sandbox, first.state)];
    for (let i = 1; i < count; i++) {
      click(first.sandbox, 'story-next');
      byNext.push(snapshot(first.sandbox, first.state));
    }
    // the menu on the bar: one entry per step, "n. title", the step on screen selected, none refused
    for (let n = 0; n < count; n++) {
      const entries = entriesOf(byNext[n].bar);
      assert.equal(entries.length, count);
      assert.deepEqual(entries.map((entry) => entry.value), Array.from({ length: count }, (_, i) => i));
      assert.deepEqual(entries.map((entry) => entry.selected), entries.map((entry) => entry.value === n), 'step ' + (n + 1) + ' is the one selected');
      entries.forEach((entry, i) => {
        assert.match(unescape(entry.text), new RegExp('^' + (i + 1) + '\\. \\S'), 'number and title');
        assert.ok(!entry.text.includes('cannot be shown') && entry.title === null, 'every step of a shipped story can be drawn');
      });
      assert.ok(byNext[n].bar.includes('Step ' + (n + 1) + ' of ' + count), '"Step n of N" stays on the bar');
    }

    // the menu, in an order that is not the story's (last to first, then from the ends towards the middle), from a page that played the first step
    const second = await open(files, name);
    second.sandbox.goToStoryStep(storyId, 0);
    const order = [];
    for (let i = count - 1; i >= 0; i--) order.push(i);
    for (let lo = 0, hi = count - 1; lo <= hi; lo++, hi--) { order.push(lo); if (hi !== lo) order.push(hi); }
    for (const index of order) {
      choose(second.sandbox, storyId, index);
      assert.deepEqual(snapshot(second.sandbox, second.state), byNext[index], 'step ' + (index + 1) + ' from the menu is step ' + (index + 1) + ' from Next');
    }
  });
}

test('the titles: the label of the view a step names, else the first words of its text, else the label of the recipe it carries', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  let named = 0;
  for (const id of ['order_journey', 'seller_journey', 'fork_tour']) {
    sandbox.goToStoryStep(id, 0);
    const steps = sandbox.storySteps(sandbox.findStory(id));
    const entries = menuOf(sandbox);
    steps.forEach((step, i) => {
      const expected = step.view ? sandbox.viewLabel(sandbox.findSavedView(step.view)) : null;
      if (expected) named++;
      else assert.ok(step.text || step.viewpoint, 'a step that names no view says something or carries a recipe');
      if (expected) assert.equal(unescape(entries[i].text), (i + 1) + '. ' + expected, id + ' step ' + (i + 1));
    });
  }
  assert.ok(named >= 6, 'the Brightcart stories name saved views');
  // `migration` steps carry their own recipe and say something: the first words of what they say
  const own = await open(shippedFiles(DOMAIN_PLATEAUS), 'domain_plateaus');
  own.sandbox.goToStoryStep('migration', 0);
  assert.deepEqual(menuOf(own.sandbox).map((entry) => unescape(entry.text)), [
    '1. Today the shop is one system…',
    '2. The same system next year, with…',
    '3. The inventory moved to the warehouse.',
    '4. The web site in the plateau…'
  ]);
  // no text: the label of the recipe (the element and the viewpoint)
  const story = own.sandbox.findStory('migration');
  const silent = JSON.parse(JSON.stringify(story.steps[2]));
  delete silent.text;
  assert.equal(own.sandbox.storyStepTitle(silent), 'Warehouse — Overview');
  assert.equal(own.sandbox.storyStepTitle({ view: 'ghost' }), 'Missing view “ghost”');
  assert.equal(own.sandbox.storyStepTitle({}), 'No view');
  assert.equal(own.sandbox.storyStepTitle({ view: 'ghost', text: 'It was here.' }), 'It was here.', 'a view that is gone does not hide what the step says');
});

// ---- the steps that cannot be drawn ----

const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const CONTAINER = (id, parent, plateau) => 'header:\n  kind: "archicode.morin.io/container"\n  parent: "' + parent + '"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, override) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '');
const STORY = (id, steps) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;
const VIEW = (id, element) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "Named ' + id + '"\n  viewpoint: "overview"\n  properties:\n    element: "' + element + '"\n';
const SETTINGS = 'settings:\n  manifests:\n    paths: ["./**"]\n';

/** A ferry company in two plateaus; the dock exists in `later` only, so a step that wants it in `baseline` cannot be drawn. */
const FERRY = {
  '.archicode.yaml': SETTINGS,
  'app.ferry.yaml': SYSTEM('ferry'),
  'later/plateau.yaml': PLATEAU('later', null),
  'later/app.ferry.dock.yaml': CONTAINER('dock', 'ferry', 'later'),
  'view.dock.yaml': VIEW('dock_view', 'ferry.dock'),
  'story.tour.yaml': STORY('tour',
    '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: baseline\n      text: The ferry company as it is.\n' +
    '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n      at: baseline\n      text: The dock, which is not there yet.\n' +
    '    - view: ghost_view\n' +
    '    - view: dock_view\n      at: later\n' +
    '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: lates\n')
};

test('a step that cannot be drawn is marked in the menu, with its sentence in the text of the entry and as its title; the others are not', async () => {
  const { sandbox } = await open(FERRY);
  sandbox.goToStoryStep('tour', 0);
  const steps = sandbox.storySteps(sandbox.findStory('tour'));
  const sentences = steps.map((step) => sandbox.stepProblem(step));
  assert.deepEqual(plain(sentences), [
    null,
    'The element “ferry.dock” is not in the plateau “baseline”.',
    'The view “ghost_view” does not exist any more.',
    null,
    'The plateau “lates” is not a plateau of this workspace.'
  ]);
  const entries = menuOf(sandbox);
  assert.equal(entries.length, 5);
  entries.forEach((entry, i) => {
    if (sentences[i] === null) {
      assert.equal(entry.title, null, 'step ' + (i + 1));
      assert.ok(!entry.text.includes('cannot be shown'), 'step ' + (i + 1));
    } else {
      assert.equal(unescape(entry.title), sentences[i], 'step ' + (i + 1) + ': the sentence is the title');
      assert.ok(unescape(entry.text).endsWith(' — cannot be shown: ' + sentences[i]), 'step ' + (i + 1) + ': and it is the text, which a screen reader reads');
    }
  });
  assert.equal(unescape(entries[1].text), '2. The dock, which is not there… — cannot be shown: The element “ferry.dock” is not in the plateau “baseline”.');
  assert.equal(unescape(entries[2].text), '3. Missing view “ghost_view” — cannot be shown: The view “ghost_view” does not exist any more.');
  assert.equal(unescape(entries[3].text), '4. Named dock_view');
});

test('choosing a step that cannot be drawn is walking onto it with Next: the step is the one on screen, the bar says why, and the menu keeps the way open', async () => {
  const { sandbox, state } = await open(FERRY);
  sandbox.goToStoryStep('tour', 0);
  const before = JSON.stringify(sandbox.currentViewDefinition());
  choose(sandbox, 'tour', 1);
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'tour', step: 1 });
  const bar = sandbox.renderStoryBarHtml();
  assert.ok(bar.includes('Step 2 cannot be shown: The element “ferry.dock” is not in the plateau “baseline”.'), bar);
  assert.equal(JSON.stringify(sandbox.currentViewDefinition()), before, 'the diagram is the one before it');
  assert.deepEqual(menuOf(sandbox).map((entry) => entry.selected), [false, true, false, false, false]);
  // what Next gives on the same page, from the same step
  const nextState = await open(FERRY);
  nextState.sandbox.goToStoryStep('tour', 0);
  click(nextState.sandbox, 'story-next');
  assert.equal(nextState.sandbox.renderStoryBarHtml(), bar);
  // and the way on stays open from there
  choose(sandbox, 'tour', 3);
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'tour', step: 3 });
  assert.equal(state.layers.current, 'later', 'the step is told at later');
  assert.ok(!sandbox.renderStoryBarHtml().includes('cannot be shown:  '), 'the step can be drawn');
  assert.ok(!sandbox.renderStoryBarHtml().includes('class="story-step-problem"'));
});

// ---- the control: a view-state-only, keyboard-usable, small list ----

test('the control is a native list with a label, one handler, and it keeps the focus; a story of one step has no menu and its bar is as it was', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 1);
  const bar = sandbox.renderStoryBarHtml();
  assert.equal((bar.match(/<select /g) || []).length, 1, 'one list on the bar');
  assert.match(bar, /<select class="story-step-menu" data-story-step-menu data-story="order_journey" aria-label="Show a step of the story" title="[^"]+">/);
  // the same piece, rendered for another layout: the class is the caller's
  const story = sandbox.findStory('order_journey');
  const reused = sandbox.renderStoryStepMenuHtml(story, 1, 'player-menu');
  assert.ok(reused.startsWith('<select class="player-menu" data-story-step-menu data-story="order_journey"'));
  assert.deepEqual(entriesOf(reused), entriesOf(bar));
  // the list keeps the focus across the redraw
  choose(sandbox, 'order_journey', 2);
  assert.equal(run(sandbox, 'pendingFocusSelector'), '[data-story-step-menu]');
  // one step: no list, and nothing else on the bar changes
  const one = await open({
    '.archicode.yaml': SETTINGS, 'app.ferry.yaml': SYSTEM('ferry'),
    'story.one.yaml': STORY('one', '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: Only this.\n')
  });
  one.sandbox.goToStoryStep('one', 0);
  const oneBar = one.sandbox.renderStoryBarHtml();
  assert.ok(!oneBar.includes('<select') && !oneBar.includes('data-story-step-menu'));
  assert.ok(oneBar.includes('Step 1 of 1'));
  assert.deepEqual(oneBar.replace(/<select[\s\S]*?<\/select>/g, ''), oneBar);
  // an empty story and a story that is not on screen have no bar at all
  run(one.sandbox, 'activeStory = null');
  assert.equal(one.sandbox.renderStoryBarHtml(), '');
  assert.equal(one.sandbox.renderStoryStepMenuHtml(one.sandbox.findStory('one'), 0), '', 'a menu of one step is nothing');
});

test('an answer that is not a step of the story draws nothing and changes nothing', async () => {
  const { sandbox, state } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('seller_journey', 1);
  const before = snapshot(sandbox, state);
  for (const value of ['', 'x', '-1', '99', '1.5']) choose(sandbox, 'seller_journey', value === '' ? NaN : Number(value));
  assert.equal(sandbox.chooseStoryStep('nobody', 0), false);
  assert.deepEqual(snapshot(sandbox, state), before);
});

test('what was typed in a form is asked about before the step changes, as for Next; no answers the question and keeps the step', async () => {
  const { sandbox, state } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 0);
  const asked = [];
  sandbox.confirm = (message) => { asked.push(message); return false; };
  run(sandbox, 'draftTyped = true');
  choose(sandbox, 'order_journey', 2);
  assert.equal(asked.length, 1);
  assert.match(asked[0], /what you typed in this form has not been saved/);
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'order_journey', step: 0 }, 'no: the step stays');
  assert.equal(run(sandbox, 'draftTyped'), true);
  // the same question for Next
  click(sandbox, 'story-next');
  assert.equal(asked.length, 2);
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'order_journey', step: 0 });
  sandbox.confirm = () => true;
  choose(sandbox, 'order_journey', 2);
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'order_journey', step: 2 }, 'yes: the step is drawn');
  assert.equal(run(sandbox, 'draftTyped'), false);
  assert.equal(state.fatalError, null);
});

// ---- viewing writes nothing ----

for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
  test('story `' + storyId + '`: walking it from the menu writes nothing, changes no file, and changes no model', async () => {
    const files = shippedFiles(dir);
    const { sandbox, state, mem } = await open(files, name);
    const count = sandbox.storySteps(sandbox.findStory(storyId)).length;
    sandbox.goToStoryStep(storyId, 0);
    const version = run(sandbox, 'modelVersion');
    const index = state.index;
    // a count of the calls of `modelsChanged`: the page's own, wrapped
    let calls = 0;
    const original = sandbox.modelsChanged;
    sandbox.modelsChanged = () => { calls++; original(); };
    const unsaved = () => state.manifestFiles.filter((file) => file.dirty).length;
    for (let i = count - 1; i >= 0; i--) choose(sandbox, storyId, i);
    for (let i = 0; i < count; i++) choose(sandbox, storyId, i);
    sandbox.modelsChanged = original;
    // a plateau drawn is a model drawn (the model of the plateau): a story that names none changes none
    const naming = sandbox.storySteps(sandbox.findStory(storyId)).some((step) => step.at || step.against);
    if (!naming) {
      assert.equal(calls, 0, 'no plateau is named, no model is built');
      assert.equal(run(sandbox, 'modelVersion'), version);
      assert.equal(state.index, index);
    }
    assert.equal(unsaved(), 0, 'no file is marked modified');
    assert.equal(mem.writes.length, 0, 'nothing is written to the folder');
    assert.equal(mem.removals.length, 0);
    for (const [file, text] of Object.entries(files)) assert.equal(mem.files.get(file).text, text, file + ' is what it was');
    assert.ok(!state.workspace.settingsDirty, '.archicode.yaml is not touched');
    assert.equal(state.manifestFiles.every((file) => file.rawText === file.savedRawText || file.savedRawText === undefined), true);
  });
}

test('the menu is not in the address: it is the one Next gives', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 0);
  choose(sandbox, 'order_journey', 2);
  const hash = run(sandbox, 'currentRouteHash()');
  assert.match(hash, /story=order_journey&step=2$/, 'the address names the story and the step, as Next writes them');
  assert.ok(!/menu/.test(hash));
});

test('the story page (Stories) is as it was: no menu there', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  const story = sandbox.findStory('order_journey');
  const page = sandbox.renderStoryEditorHtml(story);
  assert.ok(!page.includes('data-story-step-menu'));
});

test('the sheet gives the list room to shrink: it never makes the bar wider than the window', () => {
  const html = fs.readFileSync(process.env.ARCHICODE_EDITOR_HTML || path.join(REPO, 'src/main/resources/editor-webapp/standalone.html'), 'utf8');
  const css = html.slice(html.indexOf('<style>'), html.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
  const rule = css.match(/\.story-step-menu\s*\{([^}]*)\}/);
  assert.ok(rule, 'a rule for the menu');
  assert.match(rule[1], /min-width:\s*0/);
  assert.match(rule[1], /max-width:\s*100%/);
  assert.match(rule[1], /flex:\s*0 1 /, 'it may shrink');
  assert.match(css.match(/\.story-bar-line\s*\{([^}]*)\}/)[1], /flex-wrap:\s*wrap/, 'and the line wraps');
});

// ---- the page of the tag ----

/** The editor of `archicode-0.18.0`, from git, or null when the tag is not there (a shallow clone). */
function pageOfTag() {
  try {
    return require('node:child_process').execFileSync('git', ['show', 'archicode-0.18.0:src/main/resources/editor-webapp/standalone.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return null;
  }
}

test('against the page of archicode-0.18.0: the bar is the same with the menu taken out, and the bar of a story of one step is the same', { skip: pageOfTag() === null || process.env.ARCHICODE_EDITOR_HTML ? 'the page of the tag is not available, or another page is under test' : false }, async () => {
  const html = pageOfTag();
  const one = Object.assign({}, FERRY, { 'story.solo.yaml': STORY('solo', '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: Only this.\n') });
  const open0 = async (files, name) => {
    const mem = memFolder(files);
    const sandbox = createApp({ html });
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: name || 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    await sandbox.loadViewpointKernel();
    sandbox.render = () => { sandbox.syncHashFromState(); };
    return sandbox;
  };
  const cases = [[one, 'solo', [0]], [one, 'tour', [0, 1, 2, 3, 4]], [shippedFiles(LAYERED), 'fork_tour', [0, 1, 2, 3, 4, 5, 6]], [shippedFiles(DOMAIN_PLATEAUS), 'migration', [0, 1, 2, 3]]];
  for (const [files, story, steps] of cases) {
    const old = await open0(files);
    const now = (await open(files)).sandbox;
    for (const step of steps) {
      old.goToStoryStep(story, step);
      now.goToStoryStep(story, step);
      const was = old.renderStoryBarHtml();
      const is = now.renderStoryBarHtml();
      // the menu (wave 020, W-4) is the one thing the bar gained
      assert.equal(is.replace(/<select class="story-step-menu"[\s\S]*?<\/select>/, ''), was, story + ' step ' + (step + 1) + ': the bar of 0.18.0, and a menu');
      assert.equal(is.includes('data-story-step-menu'), steps.length > 1, story + ': a menu where there is a step to choose');
    }
  }
});
