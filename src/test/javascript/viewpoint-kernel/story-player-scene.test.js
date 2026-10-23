'use strict';
// Wave 021, run 0152 (W-1), issue #153: the scene of a step of a story, drawn without the editor (plan decision T4). `storyStepScene(story, step, { home })` gives what the editor draws for
// that step (the diagram, its status line, the key of a comparison, the plateau and the comparison the step names, or why it cannot be drawn), computed from `layerModelOf`, the kernel's
// `compare` and `computeDiagramScene` (the function the editor draws through), and it writes nothing: not `AppState`, not the page, not the address, not a file, and it never calls
// `modelsChanged()`. The wave 020 reading mode is gone (T2); what the player reuses of it is kept (the announcer, the menu of the steps).
// Here: on each shipped story (`migration` of domain_plateaus; `fork_tour`, `order_journey`, `seller_journey` of the layered Brightcart) and for several homes (the plateau and the
// comparison on screen when Play is pressed), every step's scene is the one the editing walk (`goToStoryStep`, the real `render()`, the same fake layout) draws, box by box and link
// by link, key included; drawing every scene leaves the editor as it was; a step that cannot be drawn is a problem, not an exception; and the editing layout is that of the page of
// `archicode-0.18.0` apart from the step menu the bar gained in wave 020.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { run, startPage } = require('./library-page');

const REPO = path.resolve(__dirname, '../../../..');
const PAGE = path.join(REPO, 'src/main/resources/editor-webapp/standalone.html');
const LAYERED = path.join(REPO, 'src/test/resources/brightcart/layered');
const DOMAIN_PLATEAUS = path.join(REPO, 'src/doc/examples/domain_plateaus');

/** Every file of a folder, as a path -> text object. */
function filesOf(dir, prefix = '') {
  const out = {};
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) Object.assign(out, filesOf(dir, rel));
    else out[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  return out;
}
const FILES = new Map();
const shippedFiles = (dir) => { if (!FILES.has(dir)) FILES.set(dir, filesOf(dir)); return FILES.get(dir); };

/**
 * Each shipped story with the homes it is played from: what the editor draws when Play is pressed. `compare` is the comparison choice of the band (`past`, `other:<id>`).
 * The first home is the one a folder opens on.
 */
const SHIPPED = [
  { story: 'migration', dir: DOMAIN_PLATEAUS, homes: [{}, { plateau: 'to-be', compare: 'past' }] },
  { story: 'fork_tour', dir: LAYERED, homes: [{}, { plateau: 'marketplace', compare: 'past' }] },
  { story: 'order_journey', dir: LAYERED, homes: [{}, { plateau: 'marketplace', compare: 'past' }, { plateau: 'saas', compare: 'other:marketplace' }] },
  { story: 'seller_journey', dir: LAYERED, homes: [{}, { plateau: 'inhouse', compare: 'other:saas' }] }
];

/** A page on a copy of a folder in memory (the real `render()`, a fake layout), with the home drawn as the reader would have drawn it. */
async function openPage(files, home) {
  const page = await startPage({ only: files });
  await page.show();
  if (home.plateau) {
    page.sandbox.drawPlateau(home.plateau, { compare: home.compare || '' });
    await page.show();
  }
  return page;
}

const sorted = (set) => Array.from(set || []).sort();
/** What of a diagram scene is its drawing: the markup, the status line, the key, the size, the boxes and the links. */
function drawingOf(scene) {
  assert.ok(scene, 'a scene');
  // through JSON: the two pages are two realms, whose arrays and objects are not equal to one another's by prototype
  return JSON.parse(JSON.stringify({
    html: scene.html, status: scene.status, legend: scene.legend, width: scene.width, height: scene.height, hasSvg: scene.hasSvg,
    boxes: scene.boxes || null, links: scene.links || null, drawnIds: sorted(scene.drawnIds), drawnApps: sorted(scene.drawnApps),
    foldable: scene.foldable || null, expandable: scene.expandable || null
  }));
}

/** The ids of the boxes and the `from>to` of the links of a markup, which is what "the same boxes and links" means. */
function boxesAndLinks(html) {
  return {
    boxes: Array.from(html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort(),
    links: Array.from(html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"/g), (m) => m[1] + '>' + m[2]).sort()
  };
}

/** A copy of a value that a later write cannot change: maps, sets, arrays and plain objects, cycles kept. */
function cloneDeep(value, seen = new Map()) {
  if (value === null || typeof value !== 'object') return value;
  if (seen.has(value)) return seen.get(value);
  if (value instanceof Map || Object.prototype.toString.call(value) === '[object Map]') {
    const out = new Map();
    seen.set(value, out);
    for (const [k, v] of value) out.set(cloneDeep(k, seen), cloneDeep(v, seen));
    return out;
  }
  if (value instanceof Set || Object.prototype.toString.call(value) === '[object Set]') {
    const out = new Set();
    seen.set(value, out);
    for (const v of value) out.add(cloneDeep(v, seen));
    return out;
  }
  if (Array.isArray(value)) {
    const out = [];
    seen.set(value, out);
    for (const v of value) out.push(cloneDeep(v, seen));
    return out;
  }
  const out = {};
  seen.set(value, out);
  for (const key of Object.keys(value)) out[key] = cloneDeep(value[key], seen);
  return out;
}

/** Everything of the editor a scene must leave alone, by value and by identity. */
function editorOf(page) {
  const { sandbox, state } = page;
  return {
    state: cloneDeep(state),
    identity: [state.index, state.baseline, state.layers, state.layers && state.layers.compare, state.selection, state.plateauTree, state.workspace],
    perspective: run(sandbox, 'currentPerspective'),
    hash: sandbox.location.hash,
    version: run(sandbox, 'modelVersion'),
    activeStory: cloneDeep(run(sandbox, 'activeStory')),
    storyHome: cloneDeep(run(sandbox, 'storyHome')),
    diagramScene: run(sandbox, 'diagramScene'),
    diagramCache: run(sandbox, 'diagramCache'),
    comparisonCache: run(sandbox, 'comparisonCache'),
    shown: run(sandbox, 'diagramShownView'),
    html: page.html(),
    files: Object.fromEntries(Array.from(page.mem.files, ([p, f]) => [p, f.text])),
    writes: page.mem.writes.slice()
  };
}

for (const { story, dir, homes } of SHIPPED) {
  homes.forEach((home, h) => {
    test('story `' + story + '`' + (home.plateau ? ' from ' + home.plateau + ' (' + home.compare + ')' : '') + ': the scene of every step has the boxes, the links, the status and the key the editing walk draws', async () => {
      const files = shippedFiles(dir);
      // the editing walk: `goToStoryStep`, the real `render()`, the diagram the page puts on its canvas
      const editing = await openPage(files, home);
      const homeNow = run(editing.sandbox, 'storyHomeNow()');
      const count = editing.sandbox.storySteps(editing.sandbox.findStory(story)).length;
      const walked = [];
      for (let i = 0; i < count; i++) {
        editing.sandbox.goToStoryStep(story, i);
        await editing.drawn();
        const state = editing.state;
        const compare = state.layers.compare;
        walked.push({ drawing: drawingOf(editing.scene()), plateau: state.layers.current, against: compare ? compare.other : null, mode: compare ? compare.mode : null });
      }
      // the scenes, from a page that stays where Play was pressed, with the home fixed at that moment
      const player = await openPage(files, home);
      assert.deepEqual(JSON.parse(JSON.stringify(run(player.sandbox, 'storyHomeNow()'))), JSON.parse(JSON.stringify(homeNow)), 'the same home');
      const fixed = JSON.parse(JSON.stringify(homeNow));
      let compared = 0;
      let drawnBoxes = 0;
      for (let i = 0; i < count; i++) {
        const scene = await player.sandbox.storyStepScene(story, i, { home: fixed });
        assert.equal(scene.problem, null, 'step ' + (i + 1) + ' of a shipped story can be drawn');
        assert.equal(scene.storyId, story);
        assert.equal(scene.index, i);
        assert.equal(scene.count, count);
        assert.equal(scene.plateau, walked[i].plateau, 'step ' + (i + 1) + ': the plateau it is drawn at');
        assert.equal(scene.against, walked[i].against, 'step ' + (i + 1) + ': the plateau it is compared with');
        assert.deepEqual(drawingOf(scene.diagram), walked[i].drawing, 'step ' + (i + 1) + ': the drawing of the editor');
        // and so the boxes and the links, said on their own
        assert.deepEqual(boxesAndLinks(scene.diagram.html), boxesAndLinks(walked[i].drawing.html));
        drawnBoxes += boxesAndLinks(scene.diagram.html).boxes.length;
        // a comparison step carries the key (the counts of each state) and says which plateaus it compares
        if (walked[i].against) {
          compared++;
          assert.match(scene.diagram.legend, /id="diagram-key"/, 'step ' + (i + 1) + ': the key of the comparison');
          assert.ok(scene.comparison && typeof scene.comparison.future === 'boolean', 'the sides of the comparison');
          assert.deepEqual([scene.comparison.base, scene.comparison.target].sort(), [scene.plateau, scene.against].sort());
        } else {
          assert.equal(scene.comparison, null);
          assert.doesNotMatch(scene.diagram.legend, /diagram-key/);
        }
        // the words and the names the player shows
        const step = player.sandbox.storySteps(player.sandbox.findStory(story))[i];
        assert.equal(scene.text, typeof step.text === 'string' ? step.text : '');
        assert.equal(scene.title, player.sandbox.storyStepTitle(step));
        assert.equal(scene.announcement, player.sandbox.storyStepAnnouncement(player.sandbox.findStory(story), i));
        assert.deepEqual(JSON.parse(JSON.stringify(scene.told)), JSON.parse(JSON.stringify(player.sandbox.stepPlateauKeys(step))));
      }
      assert.ok(drawnBoxes > 0, 'something is drawn');
      if (story === 'fork_tour' || story === 'migration') assert.ok(compared >= 1 || h > 0, 'a story that compares has a comparison step');
    });
  });
}

test('the comparison steps of the shipped stories carry the counts of their states in the key, as the editor draws them', async () => {
  const files = shippedFiles(LAYERED);
  const editing = await openPage(files, {});
  const player = await openPage(files, {});
  const fixed = JSON.parse(JSON.stringify(run(player.sandbox, 'storyHomeNow()')));
  let keyed = 0;
  for (let i = 0; i < 7; i++) {
    editing.sandbox.goToStoryStep('fork_tour', i);
    await editing.drawn();
    const scene = await player.sandbox.storyStepScene('fork_tour', i, { home: fixed });
    assert.equal(scene.diagram.legend, editing.scene().legend, 'step ' + (i + 1));
    const counts = Array.from(scene.diagram.legend.matchAll(/<span class="dg-legend-count">([^<]*)<\/span>/g), (m) => m[1]);
    if (scene.against) { keyed++; assert.ok(counts.length >= 4 && counts.every((c) => /\d+ box/.test(c)), 'a count for each state of the key'); }
  }
  assert.ok(keyed >= 5, 'fork_tour compares most of its steps');
});

test('drawing the scenes of every step leaves the editor as it was: AppState, selection, perspective, address, page, caches and files; modelsChanged() is not called', async () => {
  for (const { story, dir, homes } of SHIPPED) {
    for (const home of homes) {
      const page = await openPage(shippedFiles(dir), home);
      // something selected and a plateau the reader chose: the scene must neither use nor change them
      const before = editorOf(page);
      let changed = 0;
      const original = page.sandbox.modelsChanged;
      page.sandbox.modelsChanged = (...args) => { changed++; return original.apply(page.sandbox, args); };
      const fixed = JSON.parse(JSON.stringify(run(page.sandbox, 'storyHomeNow()')));
      const count = page.sandbox.storySteps(page.sandbox.findStory(story)).length;
      for (let i = 0; i < count; i++) assert.ok(await page.sandbox.storyStepScene(story, i, { home: fixed }));
      page.sandbox.modelsChanged = original;
      const after = editorOf(page);
      assert.equal(changed, 0, story + ': modelsChanged() is not called');
      assert.equal(after.version, before.version);
      assert.deepStrictEqual(after.state, before.state, story + ': AppState is deeply equal');
      before.identity.forEach((value, i) => assert.equal(after.identity[i], value, story + ': the same object (' + i + ')'));
      for (const key of ['perspective', 'hash', 'activeStory', 'storyHome', 'html', 'files', 'writes', 'shown']) assert.deepStrictEqual(after[key], before[key], story + ': ' + key);
      for (const key of ['diagramScene', 'diagramCache', 'comparisonCache']) assert.equal(after[key], before[key], story + ': ' + key + ' (the same object)');
      assert.deepEqual(after.writes, [], 'no file written');
    }
  }
});

test('a scene does not use the selection or the toggles of the page that it was not given: a selected element, a plateau drawn elsewhere and a hidden box change nothing', async () => {
  const files = shippedFiles(LAYERED);
  const reference = await openPage(files, {});
  const fixed = JSON.parse(JSON.stringify(run(reference.sandbox, 'storyHomeNow()')));
  const wanted = [];
  for (let i = 0; i < 3; i++) wanted.push(drawingOf((await reference.sandbox.storyStepScene('order_journey', i, { home: fixed })).diagram));
  // the same story, from a page that has moved on since Play: another plateau drawn, an element selected, a box pinned on the map; the home is the one fixed at Play
  const moved = await openPage(files, { plateau: 'saas', compare: 'other:marketplace' });
  moved.state.selection = { kind: 'element', key: 'shop', layer: 'application', mode: 'view' };
  run(moved.sandbox, "mapPinned = ['shop'];");
  for (let i = 0; i < 3; i++) assert.deepEqual(drawingOf((await moved.sandbox.storyStepScene('order_journey', i, { home: fixed })).diagram), wanted[i], 'step ' + (i + 1) + ' from the fixed home');
  // the home is the caller's: another home gives another drawing
  const there = await moved.sandbox.storyStepScene('order_journey', 1, { home: { plateau: 'saas', against: 'marketplace' } });
  assert.equal(there.plateau, 'saas');
  assert.equal(there.against, 'marketplace');
  assert.notEqual(there.diagram.html, wanted[1].html);
  // taken at call time when it is not given
  const now = await moved.sandbox.storyStepScene('order_journey', 1);
  assert.equal(now.plateau, 'saas');
  assert.equal(now.against, 'marketplace');
});

test('the readonly scene draws the same boxes and links without the buttons that change a map', async () => {
  const page = await openPage(shippedFiles(LAYERED), {});
  const fixed = JSON.parse(JSON.stringify(run(page.sandbox, 'storyHomeNow()')));
  const map = await page.sandbox.storyStepScene('order_journey', 2, { home: fixed });
  const quiet = await page.sandbox.storyStepScene('order_journey', 2, { home: fixed, readonly: true });
  assert.deepEqual(boxesAndLinks(quiet.diagram.html), boxesAndLinks(map.diagram.html));
  assert.ok(map.diagram.html.includes('dg-fold'), 'the map of the editor has its fold buttons');
  assert.ok(!quiet.diagram.html.includes('dg-fold'), 'the readonly one has none');
});

// ---- a step that cannot be drawn ----

const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const CONTAINER = (id, parent, plateau) => 'header:\n  kind: "archicode.morin.io/container"\n  parent: "' + parent + '"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, override) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '');
const STORY = (id, steps) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;
const VIEW = (id, element) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "Named ' + id + '"\n  viewpoint: "overview"\n  properties:\n    element: "' + element + '"\n';
const FERRY = {
  '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
  'app.ferry.yaml': SYSTEM('ferry'),
  'later/plateau.yaml': PLATEAU('later', null),
  'later/app.ferry.dock.yaml': CONTAINER('dock', 'ferry', 'later'),
  'view.dock.yaml': VIEW('dock_view', 'ferry.dock'),
  'story.tour.yaml': STORY('tour',
    '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: baseline\n      text: The ferry company as it is.\n' +
    '    - viewpoint: overview\n      properties:\n        element: ferry.dock\n      at: baseline\n      text: The dock, which is not there yet.\n' +
    '    - view: ghost_view\n' +
    '    - view: dock_view\n      at: later\n' +
    '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: lates\n' +
    '    - view: dock_view\n      at: later\n      against: later\n' +
    '    - view: dock_view\n      at: later\n      against: baseline\n')
};

test('a step that cannot be drawn is a scene with its problem and no diagram, not an exception; the others around it are drawn', async () => {
  const page = await openPage(FERRY, {});
  const steps = page.sandbox.storySteps(page.sandbox.findStory('tour'));
  const fixed = JSON.parse(JSON.stringify(run(page.sandbox, 'storyHomeNow()')));
  const before = editorOf(page);
  const scenes = [];
  for (let i = 0; i < steps.length; i++) scenes.push(await page.sandbox.storyStepScene('tour', i, { home: fixed }));
  // the problem is the one the editor's bar and menu say for the step
  const sentences = steps.map((step) => page.sandbox.stepProblem(step));
  scenes.forEach((scene, i) => assert.equal(scene.problem, sentences[i], 'step ' + (i + 1)));
  assert.equal(scenes[0].problem, null);
  assert.ok(scenes[0].diagram && scenes[0].diagram.html.includes('diagram-empty'), 'the first step is drawn: the ferry has no relationship yet, and the scene says so as the editor does');
  assert.match(scenes[1].problem, /ferry\.dock/, 'the dock is not in baseline');
  assert.match(scenes[2].problem, /ghost_view/, 'a view that is gone');
  assert.equal(scenes[3].problem, null, 'the dock is in `later`');
  assert.match(scenes[4].problem, /lates/, 'a plateau that is none');
  assert.match(scenes[5].problem, /never compared with itself/);
  assert.equal(scenes[6].problem, null, 'later against baseline is a comparison');
  assert.equal(scenes[6].against, 'baseline');
  assert.match(scenes[6].diagram.legend, /diagram-key/);
  for (const i of [1, 2, 4, 5]) {
    assert.equal(scenes[i].diagram, null, 'no diagram for step ' + (i + 1));
    assert.equal(scenes[i].comparison, null);
    assert.equal(scenes[i].announcement, 'Step ' + (i + 1) + ' of 7' + (i === 2 ? '' : ', ' + page.sandbox.viewLabel(page.sandbox.stepView(steps[i]))));
  }
  assert.deepStrictEqual(editorOf(page).state, before.state);
  assert.equal(await page.sandbox.storyStepScene('tour', 7, { home: fixed }), null, 'a step that is not there');
  assert.equal(await page.sandbox.storyStepScene('tour', -1, { home: fixed }), null);
  assert.equal(await page.sandbox.storyStepScene('nobody', 0, { home: fixed }), null, 'a story that is not there');
});

test('a step that names no plateau is drawn at the home, and the home is the caller\'s: the problem of the view is looked for in it', async () => {
  const files = Object.assign({}, FERRY, {
    'story.dock.yaml': STORY('dock', '    - view: dock_view\n      text: The dock.\n')
  });
  const page = await openPage(files, {});
  const atBaseline = await page.sandbox.storyStepScene('dock', 0, { home: { plateau: 'baseline', against: null } });
  assert.match(atBaseline.problem, /dock/, 'the dock is not in baseline');
  assert.equal(atBaseline.plateau, 'baseline');
  const atLater = await page.sandbox.storyStepScene('dock', 0, { home: { plateau: 'later', against: null } });
  assert.equal(atLater.problem, null);
  assert.equal(atLater.plateau, 'later');
  assert.ok(atLater.diagram.hasSvg);
  const compared = await page.sandbox.storyStepScene('dock', 0, { home: { plateau: 'later', against: 'baseline' } });
  assert.equal(compared.against, 'baseline');
  assert.match(compared.diagram.html, /dg-chg-new/, 'the dock is new against baseline');
  assert.match(compared.diagram.legend, /diagram-key/);
  // while the editor sat at baseline the whole time
  assert.equal(page.state.layers.current, 'baseline');
});

test('a workspace with no plateau has one drawing: the scene of a step is the editor\'s', async () => {
  const files = { '.archicode.yaml': FERRY['.archicode.yaml'], 'app.ferry.yaml': FERRY['app.ferry.yaml'], 'view.f.yaml': VIEW('f', 'ferry'), 'story.s.yaml': STORY('s', '    - view: f\n      text: One.\n') };
  const editing = await openPage(files, {});
  editing.sandbox.goToStoryStep('s', 0);
  await editing.drawn();
  const player = await openPage(files, {});
  const scene = await player.sandbox.storyStepScene('s', 0);
  assert.equal(scene.plateau, 'baseline');
  assert.equal(scene.against, null);
  assert.deepEqual(drawingOf(scene.diagram), drawingOf(editing.scene()));
});

// ---- the reading mode is gone, the announcer is kept ----

test('the wave 020 reading mode is gone from the page', () => {
  const html = fs.readFileSync(process.env.ARCHICODE_EDITOR_HTML || PAGE, 'utf8');
  const count = (pattern) => (html.match(pattern) || []).length;
  assert.equal(count(/readingMode|read=1|renderReadingShellHtml|quietDiagramForReading/g), 0, 'the grep of the gate prints 0');
  for (const name of ['enterReadingMode', 'leaveReadingMode', 'readStep', 'handleReadingKeydown', 'drawStepOfReadingAddress', 'readingModeOn', 'announceReadingStep', 'renderDiagramEditingToolsHtml', 'story-read', 'reading-announcer']) {
    assert.ok(!html.includes(name), name + ' is gone');
  }
  assert.ok(!/\.reading-/.test(html), 'and its sheet');
  assert.ok(!/>Read<\/button>/.test(html), 'there is no Read button');
});

test('the announcer is kept for the player: a live region outside #app that render() does not replace, said once per change', () => {
  const html = fs.readFileSync(PAGE, 'utf8');
  assert.match(html, /<div id="app"><\/div>\s*<!--[^>]*-->\s*<div id="story-announcer" class="story-announcer" role="status" aria-live="polite"><\/div>/, 'a live region beside #app, not inside it');
  const sandbox = createApp({});
  const region = { textContent: '' };
  const original = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => (id === 'story-announcer' ? region : original.call(sandbox.document, id));
  sandbox.announceStoryStep('Step 2 of 4, Overview');
  assert.equal(region.textContent, 'Step 2 of 4, Overview');
  region.textContent = 'changed by something else';
  sandbox.announceStoryStep('Step 2 of 4, Overview');
  assert.equal(region.textContent, 'changed by something else', 'the same text twice in a row is said once');
  sandbox.announceStoryStep('');
  assert.equal(region.textContent, '', 'an empty text empties the region');
  sandbox.announceStoryStep('Step 2 of 4, Overview');
  assert.equal(region.textContent, 'Step 2 of 4, Overview', 'and the next step is a change again');
  assert.ok(!sandbox.render.toString().includes('announceStoryStep'), 'the editing layout never announces');
});

// ---- the editing layout is the one of the tag ----

/** The editor of `archicode-0.18.0`, from git, or null when the tag is not there (a shallow clone). */
function pageOfTag() {
  try {
    return require('node:child_process').execFileSync('git', ['show', 'archicode-0.18.0:src/main/resources/editor-webapp/standalone.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return null;
  }
}

const SKIP_TAG = pageOfTag() === null || process.env.ARCHICODE_EDITOR_HTML ? 'the page of the tag archicode-0.18.0 is not available (a shallow clone), or another page is under test' : false;

test('against the page of archicode-0.18.0: the editing layout (the whole shell, on every step of every shipped story, and the page of the stories) is the same with the step menu taken out', { skip: SKIP_TAG }, async () => {
  const html = pageOfTag();
  const open0 = async (files, withHtml) => {
    const mem = memFolder(files);
    const sandbox = createApp(withHtml ? { html: withHtml } : {});
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    await sandbox.loadViewpointKernel();
    sandbox.render = () => { sandbox.syncHashFromState(); };
    return sandbox;
  };
  const withoutMenu = (text) => text.replace(/<select class="story-step-menu"[\s\S]*?<\/select>/g, '');
  let compared = 0;
  for (const { story, dir } of SHIPPED) {
    const files = shippedFiles(dir);
    const old = await open0(files, html);
    const now = await open0(files);
    const steps = now.storySteps(now.findStory(story)).length;
    for (let step = 0; step < steps; step++) {
      old.goToStoryStep(story, step);
      now.goToStoryStep(story, step);
      assert.equal(withoutMenu(now.renderShellHtml()), old.renderShellHtml(), story + ' step ' + (step + 1) + ': the shell');
      assert.equal(now.renderDiagramCanvasHtml(null, ''), old.renderDiagramCanvasHtml(null, ''), story + ' step ' + (step + 1) + ': the diagram and its tools');
      compared++;
    }
    for (const sandbox of [old, now]) { sandbox.selectStory(story); run(sandbox, "currentPerspective = 'library';"); }
    assert.equal(withoutMenu(now.renderShellHtml()), old.renderShellHtml(), story + ': the page of the stories');
  }
  assert.ok(compared >= 10, 'the shells of the steps were compared');
});
