'use strict';
// Wave 020, run 0150 (W-5), issue #142, first request: a story is read in a mode of its own (plan decisions T4 to T6). Full screen, in the same page: the diagram (zoom and pan only), the
// words of the step, the menu of the steps (W-4's), Previous / Next, the key of a comparison, and the plateau and comparison the step names; none of the tree, the inspection, the
// forms, the band and the tools that edit. Left / Right (previous, next), Home / End (first, last) and Escape (leave) are one listener that leaves a typing reader, a control that owns
// the arrows, a dialog and a modifier key alone. The mode is view state: it is in the address as `read=1`, reset with the folder, and it writes nothing and changes no model.
// Here: on each shipped story (`migration` of domain_plateaus; `fork_tour`, `order_journey`, `seller_journey` of the layered Brightcart) a walk in the mode, with the buttons, the keys
// and the menu, draws what the walk in the editing layout draws; what is on screen in the mode is exactly the listed parts; a click selects nothing; leaving puts the editing layout back on
// the same step; `read=1` opens the mode, and Back and Forward move between steps and modes; nothing is written; the editing layout is the one of archicode-0.18.0.
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
const PAGE = fs.readFileSync(process.env.ARCHICODE_EDITOR_HTML || path.join(REPO, 'src/main/resources/editor-webapp/standalone.html'), 'utf8');

function filesOf(dir, prefix = '') {
  const out = {};
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) Object.assign(out, filesOf(dir, rel));
    else out[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  return out;
}

/** A page on a copy of the files, with the address it is opened on (a link). The harness has no layout engine: `render()` writes the address and nothing else. */
async function open(files, name, address, options) {
  const mem = memFolder(files);
  const sandbox = createApp(options || {});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: name || 'ws' };
  state.permissionState = 'granted';
  if (address) sandbox.location.hash = address;
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
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

/** A click as handleAppClick reads it; `inCanvas`: the target is inside the drawing. */
function click(sandbox, action, attributes, inCanvas) {
  const target = { getAttribute: (name) => (name === 'data-action' ? action : attributes && name in attributes ? attributes[name] : null) };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : selector === '#diagram-canvas' && inCanvas ? {} : null) },
    preventDefault() {}, stopPropagation() {}, detail: 1
  });
}

function menuSelect(story, index) {
  return { value: String(index), matches: (selector) => selector === '[data-story-step-menu]', getAttribute: (name) => (name === 'data-story' ? story : null), closest: () => null };
}
const choose = (sandbox, story, index) => sandbox.handleAppChange({ target: menuSelect(story, index) });

const BODY = { tagName: 'BODY', closest: () => null };
const FROM = {
  input: { tagName: 'INPUT', closest: (selector) => (selector.includes('input') ? FROM.input : null) },
  textarea: { tagName: 'TEXTAREA', closest: (selector) => (selector.includes('textarea') ? FROM.textarea : null) },
  select: { tagName: 'SELECT', closest: (selector) => (selector.includes('select') ? FROM.select : null) },
  editable: { tagName: 'DIV', isContentEditable: true, closest: () => null },
  codeEditor: { tagName: 'DIV', isContentEditable: false, closest: (selector) => (selector.includes('.cm-editor') ? {} : null) },
  button: { tagName: 'BUTTON', closest: () => null }
};

/** A keydown as the browser gives it, to the page's listeners on the document. */
function press(sandbox, key, options) {
  const opts = options || {};
  const event = Object.assign({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, defaultPrevented: false, isComposing: false, target: BODY, prevented: false,
    preventDefault() { this.prevented = true; } }, opts.event || {});
  sandbox.document.activeElement = opts.focus === undefined ? undefined : opts.focus;
  // `only`: the listener of the mode alone (the others, such as the one that closes a dialog on Escape, answer the same event in a browser, and are not under test)
  for (const listener of opts.only ? [sandbox.handleReadingKeydown] : sandbox.__documentListeners.keydown || []) listener(event);
  sandbox.document.activeElement = undefined;
  return event;
}

/** Everything the page shows of a step that is drawn: the plateau, the comparison, the view, the counts of the comparison. (The bar and the address differ between the layouts, and are compared where they are the point.) */
function drawn(sandbox, state) {
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
    // `ref`, the element selected, is whatever an earlier step left (no step sets it): not what the layout draws
    hash: run(sandbox, 'currentRouteHash()').replace(/([?&])ref=[^&]*&?/, '$1').replace(/&?read=1/, '').replace(/[?&]$/, '')
  });
}

const reading = (sandbox) => run(sandbox, 'readingModeOn()');
const storyOf = (sandbox, id) => sandbox.storySteps(sandbox.findStory(id));
const actionsOf = (html) => Array.from(new Set(Array.from(html.matchAll(/data-action="([^"]+)"/g), (m) => m[1]))).sort();

// ---- 1. every shipped story, walked in the mode ----

for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
  test('story `' + storyId + '`: walked in the reading mode (buttons, keys, menu), every step draws what the editing layout draws', async () => {
    const files = shippedFiles(dir);
    const editing = await open(files, name);
    const count = storyOf(editing.sandbox, storyId).length;
    assert.ok(count >= 2);
    // the editing layout, Next one step at a time
    editing.sandbox.goToStoryStep(storyId, 0);
    const byNext = [drawn(editing.sandbox, editing.state)];
    for (let i = 1; i < count; i++) { click(editing.sandbox, 'story-next'); byNext.push(drawn(editing.sandbox, editing.state)); }

    // the mode, the buttons
    const buttons = await open(files, name);
    assert.equal(buttons.sandbox.enterReadingMode(storyId, 0), true);
    assert.ok(reading(buttons.sandbox));
    assert.deepEqual(drawn(buttons.sandbox, buttons.state), byNext[0], 'step 1');
    for (let i = 1; i < count; i++) {
      click(buttons.sandbox, 'story-next');
      assert.ok(reading(buttons.sandbox), 'the mode stays on');
      assert.deepEqual(drawn(buttons.sandbox, buttons.state), byNext[i], 'step ' + (i + 1) + ' with Next');
      assert.ok(buttons.sandbox.renderShellHtml().includes('Step ' + (i + 1) + ' of ' + count));
    }
    for (let i = count - 2; i >= 0; i--) {
      click(buttons.sandbox, 'story-prev');
      assert.deepEqual(drawn(buttons.sandbox, buttons.state), byNext[i], 'step ' + (i + 1) + ' with Previous');
    }

    // the keys
    const keys = await open(files, name);
    keys.sandbox.enterReadingMode(storyId, 0);
    for (let i = 1; i < count; i++) {
      assert.equal(press(keys.sandbox, 'ArrowRight').prevented, true);
      assert.deepEqual(drawn(keys.sandbox, keys.state), byNext[i], 'step ' + (i + 1) + ' with the Right arrow');
    }
    press(keys.sandbox, 'Home');
    assert.deepEqual(drawn(keys.sandbox, keys.state), byNext[0], 'Home');
    press(keys.sandbox, 'End');
    assert.deepEqual(drawn(keys.sandbox, keys.state), byNext[count - 1], 'End');
    for (let i = count - 2; i >= 0; i--) {
      press(keys.sandbox, 'ArrowLeft');
      assert.deepEqual(drawn(keys.sandbox, keys.state), byNext[i], 'step ' + (i + 1) + ' with the Left arrow');
    }

    // the menu, in an order that is not the story's
    const menu = await open(files, name);
    menu.sandbox.enterReadingMode(storyId, 0);
    const order = [];
    for (let i = count - 1; i >= 0; i--) order.push(i);
    for (let lo = 0, hi = count - 1; lo <= hi; lo++, hi--) { order.push(lo); if (hi !== lo) order.push(hi); }
    for (const index of order) {
      choose(menu.sandbox, storyId, index);
      assert.ok(reading(menu.sandbox));
      assert.deepEqual(drawn(menu.sandbox, menu.state), byNext[index], 'step ' + (index + 1) + ' from the menu');
    }
  });
}

// ---- 2. what is on screen in the mode ----

for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
  test('story `' + storyId + '`: in the mode exactly the listed parts are on screen, for every step', async () => {
    const { sandbox } = await open(shippedFiles(dir), name);
    sandbox.enterReadingMode(storyId, 0);
    const steps = storyOf(sandbox, storyId);
    for (let n = 0; n < steps.length; n++) {
      sandbox.goToStoryStep(storyId, n);
      assert.ok(reading(sandbox));
      const html = sandbox.renderShellHtml();
      // the region, labelled, and the parts
      assert.match(html, /^<div class="reading-shell" role="region" aria-label="Reading the story [^"]+" data-reading-mode>/);
      for (const part of ['id="diagram-canvas"', 'id="diagram-status"', 'id="diagram-legend"', 'class="story-bar-words', 'data-story-step-menu', 'data-action="story-prev"', 'data-action="story-next"', 'data-action="story-read-exit"', 'data-action="diagram-zoom"']) {
        assert.ok(html.includes(part), 'step ' + (n + 1) + ' has ' + part);
      }
      assert.ok(html.includes('Step ' + (n + 1) + ' of ' + steps.length), '"Step n of N"');
      // the words of the step
      if (steps[n].text) assert.ok(html.includes(sandbox.escapeHtml(steps[n].text)), 'the words');
      // the plateau and the comparison the step names, said (read only: no list)
      const named = steps[n].at || steps[n].against;
      assert.equal(html.includes('class="story-bar-plateaus"'), !!named, 'the plateaus a step names are said, and only then');
      // nothing else: not a tree, an inspection, a form, the band, the pages, the top bar, a tool that edits or changes what the diagram draws
      assert.deepEqual(actionsOf(html), ['diagram-recenter', 'diagram-zoom', 'story-next', 'story-prev', 'story-read-exit'], 'the only things a click does');
      for (const absent of ['top-panel', 'perspective-tabs', 'page-tabs', 'band-', 'panel-left', 'panel-right', 'panel-bottom', 'left-panel', 'right-panel', 'role="tree"', 'data-resize',
        '<form', '<input', '<textarea', 'story-bar-text', 'inspection', 'element-header', 'save-all', 'Save all changes', 'Maximize', 'diagram-export', 'toggle-hide-unlinked', 'fold-all',
        'toggle-show', 'set-changes-only', 'toggle-map-part', 'story-bar-edit', 'story-edit', 'story-exit', 'name-view', 'add-to-story', 'class="app-shell']) {
        assert.ok(!html.includes(absent), 'step ' + (n + 1) + ' has no ' + absent);
      }
      assert.equal((html.match(/<select /g) || []).length, 1, 'one list: the menu of the steps');
      assert.ok(html.includes('class="reading-step-menu"'), 'the menu is the one of W-4, with a class of its own');
    }
  });
}

test('the Read button is on the bar and on the Stories page, and the mode is the Read of the bar or the page', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 1);
  const bar = sandbox.renderStoryBarHtml();
  assert.match(bar, /<button type="button" data-action="story-read" title="[^"]+">Read<\/button>/);
  assert.ok(bar.indexOf('data-action="story-next"') < bar.indexOf('data-action="story-read"'));
  const story = sandbox.findStory('order_journey');
  run(sandbox, "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'order_journey'");
  const page = sandbox.renderLibraryPerspectiveHtml().center;
  assert.match(page, /data-action="story-play" data-story="order_journey" data-step="0"[^>]*>Play<\/button><button type="button" data-action="story-read" data-story="order_journey" data-step="0"[^>]*>Read<\/button>/);
  assert.ok(story);
  // the Read of the bar reads the step on screen, nothing is drawn again (the address gets one entry)
  run(sandbox, "currentPerspective = 'map'");
  const entries = sandbox.__history.entries.length;
  click(sandbox, 'story-read');
  assert.ok(reading(sandbox));
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'order_journey', step: 1 });
  assert.equal(sandbox.__history.entries.length, entries + 1, 'one entry of the history');
  assert.match(sandbox.location.hash, /story=order_journey&step=1&read=1/);
  // the Read of the Stories page starts at its first step, as Play does
  run(sandbox, "readingMode = false; activeStory = null; currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'order_journey'");
  click(sandbox, 'story-read', { 'data-story': 'order_journey', 'data-step': '0' });
  assert.ok(reading(sandbox));
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'order_journey', step: 0 });
  assert.notEqual(run(sandbox, 'currentPerspective'), 'library', 'the diagram of the step is drawn on its own page');
  // a story with no step cannot be read
  const empty = await open({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
    'story.none.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "none"\n  steps: []\n' });
  assert.equal(empty.sandbox.enterReadingMode('none', 0), false);
  assert.equal(reading(empty.sandbox), false);
  assert.equal(empty.sandbox.enterReadingMode('nobody', 0), false);
});

// ---- 3. nothing to click, nothing selected ----

test('a click on the diagram of the mode selects nothing and opens no inspection; the zoom tools work; the selection the editor had is kept and not shown', async () => {
  const { sandbox, state } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 0);
  click(sandbox, 'goto-element', { 'data-ref': 'commerce' });
  const selected = plain(state.selection);
  assert.equal(selected.kind, 'element', 'the editing layout selects');
  sandbox.enterReadingMode('order_journey');
  assert.ok(reading(sandbox));
  const hash = sandbox.location.hash;
  const entries = sandbox.__history.entries.length;
  for (const [action, attributes] of [['goto-element', { 'data-ref': 'payment' }], ['select-removed', { 'data-ref': 'payment', 'data-layer': 'application' }], ['fix-dangling', { 'data-ref': 'payment' }],
    ['toggle-fold', { 'data-id': 'payment', 'data-mode': 'expand' }], ['select-link', { 'data-from': 'a', 'data-to': 'b' }]]) {
    click(sandbox, action, attributes, true);
    assert.deepEqual(plain(state.selection), selected, action + ' selects nothing');
    assert.equal(sandbox.location.hash, hash, action + ' writes no address');
  }
  assert.equal(sandbox.__history.entries.length, entries);
  assert.equal(run(sandbox, 'removedPick'), null);
  assert.ok(reading(sandbox));
  // the keys on the drawing: Enter and Space do not open a box, the arrows do not move among the boxes, the zoom keys still zoom
  const stage = { closest: (selector) => (selector === '.diagram-stage' || selector === '#diagram-canvas' ? {} : selector === '[data-action]' ? { tagName: 'g' } : null) };
  const keyOnCanvas = (key) => { const e = { key, ctrlKey: false, metaKey: false, altKey: false, target: stage, prevented: false, preventDefault() { this.prevented = true; } }; sandbox.handleDiagramKeydown(e); return e; };
  for (const key of ['Enter', ' ', 'ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Escape', 'm']) assert.equal(keyOnCanvas(key).prevented, false, key + ' is not the diagram\'s here');
  assert.equal(keyOnCanvas('+').prevented, true, 'plus zooms');
  assert.equal(keyOnCanvas('-').prevented, true, 'minus zooms');
  assert.equal(keyOnCanvas('f').prevented, true, 'f fits');
  // the zoom buttons are outside the drawing: they still act (the scale is the page's)
  const zoomed = [];
  sandbox.setDiagramScale = (scale) => { zoomed.push(scale); };
  click(sandbox, 'diagram-zoom', { 'data-dir': 'fit' }, false);
  assert.deepEqual(plain(zoomed), ['fit']);
  // the editing layout: the same click selects
  run(sandbox, 'readingMode = false');
  click(sandbox, 'goto-element', { 'data-ref': 'payment' }, true);
  assert.equal(state.selection.key, 'payment');
});

test('the drawing on screen loses its actions, fold buttons and tab stops in the mode (and the selection mark is not drawn)', () => {
  const sandbox = createApp({});
  const attributes = (initial) => { const a = Object.assign({}, initial); return { get: (n) => (n in a ? a[n] : null), set: (n, v) => { a[n] = String(v); }, remove: (n) => { delete a[n]; }, has: (n) => n in a, all: a }; };
  const make = (initial) => { const a = attributes(initial); return { a, getAttribute: a.get, setAttribute: a.set, removeAttribute: a.remove, removed: false, remove() { this.removed = true; } }; };
  const nodes = [make({ class: 'dg-node', 'data-action': 'goto-element', role: 'link', tabindex: '0' }), make({ class: 'dg-node', 'data-action': 'select-removed', role: 'link', tabindex: '-1' })];
  const links = [make({ class: 'dg-link', 'data-action': 'select-link', role: 'button', tabindex: '0' })];
  const folds = [make({ class: 'dg-fold', 'data-action': 'toggle-fold' })];
  const canvas = {
    querySelectorAll(selector) {
      const all = { '.dg-fold': folds, '[data-action]': nodes.concat(links).filter((el) => el.a.has('data-action')), '.dg-node, .dg-link': nodes.concat(links) };
      return all[selector] || [];
    }
  };
  sandbox.quietDiagramForReading(canvas);
  assert.ok(folds[0].removed, 'the fold buttons go');
  for (const el of nodes.concat(links)) { assert.equal(el.getAttribute('data-action'), null); assert.equal(el.getAttribute('tabindex'), null); }
  assert.equal(nodes[0].getAttribute('role'), 'img', 'a box that goes nowhere is not a link');
  assert.equal(links[0].getAttribute('role'), 'button', 'the rest is left alone');
  sandbox.quietDiagramForReading(null); // nothing to quiet
});

// ---- 4. leaving ----

for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
  test('story `' + storyId + '`: Escape and Edit leave the mode on the same step, with the plateau and the comparison it drew, and the home of the story is untouched', async () => {
    const files = shippedFiles(dir);
    const count = storyOf((await open(files, name)).sandbox, storyId).length;
    // what the editing layout shows at each step: the bar, the drawn parts
    const editing = await open(files, name);
    editing.sandbox.goToStoryStep(storyId, 0);
    const bars = [];
    const parts = [];
    for (let i = 0; i < count; i++) {
      if (i) click(editing.sandbox, 'story-next');
      bars.push(editing.sandbox.renderStoryBarHtml());
      parts.push(drawn(editing.sandbox, editing.state));
    }
    for (const how of ['escape', 'edit']) {
      for (const step of [0, count - 1, Math.floor(count / 2)]) {
        const page = await open(files, name);
        page.sandbox.goToStoryStep(storyId, 0);
        const home = plain(run(page.sandbox, 'storyHome'));
        // read from the first step to `step`, then leave
        page.sandbox.enterReadingMode(storyId);
        choose(page.sandbox, storyId, step);
        const left = how === 'escape' ? press(page.sandbox, 'Escape') : null;
        if (how === 'edit') click(page.sandbox, 'story-read-exit');
        else assert.equal(left.prevented, true);
        assert.equal(reading(page.sandbox), false, how + ' leaves');
        assert.equal(run(page.sandbox, 'readingMode'), false);
        assert.deepEqual(drawn(page.sandbox, page.state), parts[step], how + ': the plateau, the comparison and the view of step ' + (step + 1));
        assert.equal(page.sandbox.renderStoryBarHtml(), bars[step], how + ': the bar of the editing layout, on the same step');
        const now = plain(run(page.sandbox, 'storyHome'));
        assert.equal(now.plateau, home.plateau, 'the home of the story: the plateau the reader had before it began');
        assert.equal(now.against, home.against);
        assert.equal(run(page.sandbox, 'pendingFocusSelector'), '[data-action="story-read"]', 'the focus goes to the Read button of the bar');
        assert.ok(!page.sandbox.renderShellHtml().includes('data-reading-mode'), 'the editing shell is drawn');
        assert.ok(page.sandbox.renderShellHtml().includes('class="app-shell'));
        // and the reader can read again from there
        page.sandbox.enterReadingMode(storyId);
        assert.ok(reading(page.sandbox));
        assert.deepEqual(plain(run(page.sandbox, 'activeStory')), { id: storyId, step });
      }
    }
  });
}

test('Escape and Edit leave a mode that was entered from the Stories page: the diagram of the step, with its bar', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  run(sandbox, "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'seller_journey'");
  click(sandbox, 'story-read', { 'data-story': 'seller_journey', 'data-step': '0' });
  assert.ok(reading(sandbox));
  press(sandbox, 'ArrowRight');
  press(sandbox, 'Escape');
  assert.equal(reading(sandbox), false);
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'seller_journey', step: 1 });
  assert.ok(sandbox.renderStoryBarHtml().includes('Step 2 of '), 'the bar of the editing layout, on step 2');
  assert.ok(['map', 'environments', 'elements'].includes(run(sandbox, 'currentPerspective')));
});

// ---- 5. the address ----

test('the mode is in the address as read=1 beside story= and step=, and only while a story is on a step', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 2);
  assert.ok(!/read=/.test(sandbox.location.hash));
  sandbox.enterReadingMode('order_journey');
  assert.match(sandbox.location.hash, /[?&]story=order_journey&step=2&read=1(&|$)/);
  choose(sandbox, 'order_journey', 1);
  assert.match(sandbox.location.hash, /[?&]story=order_journey&step=1&read=1(&|$)/);
  press(sandbox, 'Escape');
  assert.ok(!/read=/.test(sandbox.location.hash));
  // a flag left over by a story that is gone says nothing
  run(sandbox, 'readingMode = true; activeStory = null');
  assert.ok(!/read=|story=/.test(run(sandbox, 'currentRouteHash()')));
  assert.equal(reading(sandbox), false);
  assert.ok(sandbox.renderShellHtml().includes('class="app-shell'), 'and the editing layout is drawn');
});

test('read=1 opens the mode on the step step= names: when the folder is opened on a link, and when the address is typed in an open editor', async () => {
  const steps = { fork_tour: 4, order_journey: 2, seller_journey: 1 };
  for (const [storyId, step] of Object.entries(steps)) {
    // the address the page writes for that step (a link someone copies)
    const origin = await open(shippedFiles(LAYERED), 'layered');
    origin.sandbox.enterReadingMode(storyId, step);
    const link = origin.sandbox.location.hash;
    assert.match(link, /read=1/);
    const want = drawn(origin.sandbox, origin.state);
    // a folder opened on the link
    const opened = await open(shippedFiles(LAYERED), 'layered', link);
    assert.ok(reading(opened.sandbox), storyId + ': opened on the link');
    assert.deepEqual(plain(run(opened.sandbox, 'activeStory')), { id: storyId, step });
    assert.equal(opened.state.layers.current, want.plateau, 'the plateau');
    assert.equal(opened.state.layers.compare ? opened.state.layers.compare.other : null, want.against, 'and the comparison the step names, which the address does not carry');
    assert.deepEqual(drawn(opened.sandbox, opened.state).counts, want.counts);
    // an address typed in an open editor
    const typed = await open(shippedFiles(LAYERED), 'layered');
    assert.equal(reading(typed.sandbox), false);
    typed.sandbox.location.hash = link;
    for (const listener of typed.sandbox.__windowListeners.hashchange) listener();
    assert.ok(reading(typed.sandbox), storyId + ': typed');
    assert.deepEqual(drawn(typed.sandbox, typed.state), Object.assign({}, want, { view: drawn(typed.sandbox, typed.state).view }), 'the plateau and the comparison of the step');
  }
  // the example with the plateaus of the manual
  const origin = await open(shippedFiles(DOMAIN_PLATEAUS), 'domain_plateaus');
  origin.sandbox.enterReadingMode('migration', 3);
  const opened = await open(shippedFiles(DOMAIN_PLATEAUS), 'domain_plateaus', origin.sandbox.location.hash);
  assert.ok(reading(opened.sandbox));
  assert.deepEqual(plain(run(opened.sandbox, 'activeStory')), { id: 'migration', step: 3 });
  assert.equal(opened.state.layers.current, origin.state.layers.current);
});

test('read=1 with no story, an unknown story, a step that is none, or on a page that draws no story leaves the mode off; anything but 1 is not the mode', async () => {
  const page = await open(shippedFiles(LAYERED), 'layered');
  const at = (address) => {
    page.sandbox.location.hash = address;
    for (const listener of page.sandbox.__windowListeners.hashchange) listener();
    return reading(page.sandbox);
  };
  assert.equal(at('#/timeline/applications?story=order_journey&step=1&read=1'), true);
  assert.equal(at('#/timeline/applications?read=1'), false, 'no story');
  assert.equal(at('#/timeline/applications?story=nobody&step=0&read=1'), false, 'an unknown story');
  assert.equal(at('#/timeline/applications?story=order_journey&step=99&read=1'), false, 'a step beyond the story');
  assert.equal(at('#/timeline/applications?story=order_journey&step=-1&read=1'), false, 'a step before it');
  assert.equal(at('#/timeline/applications?story=order_journey&step=x&read=1'), false, 'a step that is not a number');
  assert.equal(at('#/timeline/applications?story=order_journey&step=1&read=0'), false);
  assert.equal(at('#/timeline/applications?story=order_journey&step=1&read=true'), false);
  assert.equal(at('#/timeline/applications?story=order_journey&step=1'), false);
  assert.equal(at('#/timeline/applications?story=order_journey&step=1&read=1'), true);
  assert.equal(at('#/settings?story=order_journey&step=1&read=1'), false, 'Settings draws no story');
  assert.equal(run(page.sandbox, 'readingMode'), false, 'and the flag is down');
  assert.equal(at('#/stories?story=order_journey&read=1'), false, 'the Stories page draws no story either');
  assert.equal(at('#/timeline/elements?story=order_journey&step=2&read=1'), true, 'the page of an element is a page that draws it');
  // a mode that is left by the address is left: the page writes back the address of what is on screen
  assert.equal(at('#/timeline/applications?story=nobody&step=0&read=1'), false);
  assert.ok(!/read=/.test(run(page.sandbox, 'currentRouteHash()')));
});

test('Back and Forward move between the steps and the modes, and the address of each entry is the one the page wrote', async () => {
  for (const storyId of ['fork_tour', 'order_journey', 'seller_journey']) {
    const { sandbox, state } = await open(shippedFiles(LAYERED), 'layered');
    const hashchange = () => sandbox.__windowListeners.hashchange;
    assert.ok(hashchange().length);
    sandbox.goToStoryStep(storyId, 0);           // entry A: the editing layout, step 1
    sandbox.enterReadingMode(storyId);           // entry B: the mode, step 1
    const marks = [{ step: 0, on: false }, { step: 0, on: true }];
    const want = [drawn(sandbox, state)];        // what step 1 draws
    click(sandbox, 'story-next');                // entry C: step 2
    marks.push({ step: 1, on: true });
    want.push(drawn(sandbox, state));
    click(sandbox, 'story-next');                // entry D: step 3
    marks.push({ step: 2, on: true });
    want.push(drawn(sandbox, state));
    press(sandbox, 'Escape');                    // entry E: the editing layout, step 3
    marks.push({ step: 2, on: false });
    const at = () => ({ step: run(sandbox, 'activeStory').step, on: reading(sandbox) });
    assert.deepEqual(at(), marks[4]);
    for (let i = 3; i >= 0; i--) {
      sandbox.history.back();
      assert.deepEqual(at(), marks[i], storyId + ': back to entry ' + 'ABCDE'[i]);
      if (marks[i].on) {
        const expected = want[Math.max(0, marks[i].step)];
        const now = drawn(sandbox, state);
        assert.equal(now.plateau, expected.plateau, 'the plateau of the step');
        assert.equal(now.against, expected.against, 'the comparison of the step');
        assert.deepEqual(now.counts, expected.counts);
      }
    }
    for (let i = 1; i <= 4; i++) {
      sandbox.history.forward();
      assert.deepEqual(at(), marks[i], storyId + ': forward to entry ' + 'ABCDE'[i]);
    }
  }
});

test('Back from a step to the one before keeps the home of the story: a step that names no plateau is drawn where the reader began', async () => {
  const { sandbox, state } = await open(shippedFiles(LAYERED), 'layered');
  const before = { plateau: state.layers.current, against: state.layers.compare ? state.layers.compare.other : null };
  sandbox.goToStoryStep('fork_tour', 0);
  sandbox.enterReadingMode('fork_tour');
  for (let i = 0; i < 4; i++) click(sandbox, 'story-next');
  for (let i = 0; i < 4; i++) sandbox.history.back();
  const home = plain(run(sandbox, 'storyHome'));
  assert.equal(home.plateau, before.plateau);
  assert.equal(home.against, before.against);
});

// ---- 6. the keys ----

test('the keys do nothing while a control that owns them has the focus, a dialog, the help or the menu is open, a modifier is held, or the mode is off', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  const step = () => run(sandbox, 'activeStory').step;
  const quiet = (key, options, why) => {
    const before = step();
    const hash = sandbox.location.hash;
    const e = press(sandbox, key, options);
    assert.equal(step(), before, why + ': the step stays');
    assert.equal(e.prevented, false, why + ': the key is left to the browser');
    assert.equal(sandbox.location.hash, hash, why + ': nothing is written');
    assert.ok(reading(sandbox), why + ': the mode stays');
  };
  sandbox.enterReadingMode('order_journey', 1);
  // a reader who types, or a control that owns the arrows (the menu of the steps is a select), by the target or by the focused element
  for (const [name, el] of Object.entries(FROM)) {
    if (name === 'button') continue;
    quiet('ArrowRight', { event: { target: el } }, name + ' as the target');
    quiet('ArrowLeft', { focus: el }, name + ' focused');
    quiet('Home', { focus: el }, name + ' focused, Home');
    quiet('End', { focus: el }, name + ' focused, End');
    quiet('Escape', { focus: el }, name + ' focused, Escape');
  }
  // modifiers
  for (const modifier of ['ctrlKey', 'metaKey', 'altKey', 'shiftKey']) {
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape']) quiet(key, { event: { [modifier]: true } }, modifier + ' ' + key);
  }
  quiet('ArrowRight', { event: { defaultPrevented: true } }, 'a key already taken');
  quiet('ArrowRight', { event: { isComposing: true } }, 'an input method');
  // a key that is not the mode's
  for (const key of ['ArrowUp', 'ArrowDown', 'PageDown', 'PageUp', 'j', 'k', 'n', 'Enter', ' ']) quiet(key, {}, key);
  // a dialog, the help, the menu of the header, a rejected YAML text
  for (const [what, set, unset] of [['a dialog', "appDialog = { kind: 'x' }", 'appDialog = null'], ['the help', 'helpOpen = true', 'helpOpen = false'],
    ['the menu of the header', 'headerMenuOpen = true', 'headerMenuOpen = false'], ['a rejected YAML text', "rawYamlEditDraft = { relPath: 'x' }", 'rawYamlEditDraft = null']]) {
    run(sandbox, set);
    for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape']) quiet(key, { only: true }, what + ', ' + key);
    run(sandbox, unset);
  }
  // and with none of that, a button focused is no obstacle (the buttons own no arrow)
  const moved = press(sandbox, 'ArrowRight', { focus: FROM.button, event: { target: FROM.button } });
  assert.equal(moved.prevented, true);
  assert.equal(step(), 2);
  // the ends: the key does nothing there, and is not kept from the browser
  press(sandbox, 'End');
  const last = step();
  assert.equal(press(sandbox, 'ArrowRight').prevented, false);
  assert.equal(press(sandbox, 'End').prevented, false);
  assert.equal(step(), last);
  press(sandbox, 'Home');
  assert.equal(step(), 0);
  assert.equal(press(sandbox, 'ArrowLeft').prevented, false);
  assert.equal(press(sandbox, 'Home').prevented, false);
  assert.equal(step(), 0);
  // the mode off: the editing layout has no such keys
  press(sandbox, 'Escape');
  assert.equal(reading(sandbox), false);
  for (const key of ['ArrowRight', 'ArrowLeft', 'Home', 'End', 'Escape']) {
    const e = press(sandbox, key);
    assert.equal(e.prevented, false, key);
    assert.equal(step(), 0);
  }
});

test('J and K, the keys of the list of changes, walk nothing in the mode: there is no list, and nothing is selected', async () => {
  const { sandbox, state } = await open(shippedFiles(LAYERED), 'layered');
  // a step of fork_tour that is compared: the list of changes exists in the editing layout
  const compared = storyOf(sandbox, 'fork_tour').findIndex((step) => step.against);
  assert.ok(compared >= 0);
  sandbox.goToStoryStep('fork_tour', compared);
  assert.ok(sandbox.comparisonState().changes, 'a comparison is on');
  assert.equal(run(sandbox, 'changesListIsOnPage()'), true, 'the editing layout has the list');
  sandbox.enterReadingMode('fork_tour');
  assert.equal(run(sandbox, 'changesListIsOnPage()'), false);
  const selection = plain(state.selection);
  const hash = sandbox.location.hash;
  for (const key of ['j', 'k', 'J', 'K']) {
    const e = press(sandbox, key);
    assert.equal(e.prevented, false, key);
  }
  assert.deepEqual(plain(state.selection), selection, 'nothing is selected by a key');
  assert.equal(sandbox.location.hash, hash);
  assert.equal(run(sandbox, 'changesWalk'), null);
  press(sandbox, 'Escape');
  assert.equal(run(sandbox, 'changesListIsOnPage()'), true, 'and the list is back in the editing layout');
});

test('one listener on the document, in the bubbling phase; the keys the buttons tell are the keys', async () => {
  assert.match(PAGE, /document\.addEventListener\('keydown', handleReadingKeydown\);/);
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  assert.equal(sandbox.__documentListeners.keydown.filter((fn) => fn.name === 'handleReadingKeydown').length, 1);
  sandbox.enterReadingMode('order_journey', 1);
  const html = sandbox.renderShellHtml();
  assert.match(html, /data-action="story-prev" aria-keyshortcuts="ArrowLeft" title="The step before \(Left arrow\)"/);
  assert.match(html, /data-action="story-next" aria-keyshortcuts="ArrowRight" title="The next step \(Right arrow\)"/);
  assert.match(html, /data-action="story-read-exit" aria-keyshortcuts="Escape" title="Back to the editor, on this step \(Escape\)">Edit<\/button>/);
  assert.match(html, /aria-label="(Map|Diagram) of [^"]*\. Plus and minus zoom, drag to move\. The left and right arrow keys show the previous and the next step\."/);
});

// ---- 7. steps that cannot be drawn, in the mode ----

const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const CONTAINER = (id, parent, plateau) => 'header:\n  kind: "archicode.morin.io/container"\n  parent: "' + parent + '"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, override) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '');
const STORY = (id, steps) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;
const VIEW = (id, element) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "Named ' + id + '"\n  viewpoint: "overview"\n  properties:\n    element: "' + element + '"\n';
const SETTINGS = 'settings:\n  manifests:\n    paths: ["./**"]\n';
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

test('a step that cannot be drawn is marked in the menu of the mode and says why; the way on stays open', async () => {
  const { sandbox } = await open(FERRY);
  sandbox.enterReadingMode('tour', 0);
  const sentences = storyOf(sandbox, 'tour').map((step) => sandbox.stepProblem(step));
  assert.ok(sentences[1] && sentences[2] && sentences[4] && !sentences[0] && !sentences[3]);
  const html = sandbox.renderShellHtml();
  const entries = Array.from(html.matchAll(/<option value="(\d+)"( selected)?(?: title="([^"]*)")?>([^<]*)<\/option>/g), (m) => ({ value: Number(m[1]), selected: !!m[2], title: m[3], text: m[4] }));
  assert.equal(entries.length, 5);
  const un = (text) => text.replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&#39;/g, "'");
  entries.forEach((entry, i) => {
    if (sentences[i]) {
      assert.equal(un(entry.title), sentences[i], 'step ' + (i + 1) + ': the sentence is the title');
      assert.ok(un(entry.text).endsWith(' — cannot be shown: ' + sentences[i]), 'step ' + (i + 1) + ': and the text of the entry');
    } else {
      assert.equal(entry.title, undefined);
      assert.ok(!entry.text.includes('cannot be shown'));
    }
  });
  // walked onto, the step says so in the bar of the mode, which stays
  click(sandbox, 'story-next');
  assert.ok(reading(sandbox));
  let bar = sandbox.renderShellHtml();
  assert.ok(bar.includes('Step 2 cannot be shown: ' + sentences[1] + ' The diagram below is the one before it.'), bar);
  assert.ok(bar.includes('class="story-step-problem" role="status"'));
  choose(sandbox, 'tour', 2);
  bar = sandbox.renderShellHtml();
  assert.ok(bar.includes('Step 3 cannot be shown: ' + sentences[2]));
  assert.ok(reading(sandbox));
  // from the menu, the way on is open: step 4 can be drawn, at its plateau
  choose(sandbox, 'tour', 3);
  assert.ok(!sandbox.renderShellHtml().includes('class="story-step-problem"'));
  assert.equal(sandbox.__state().layers.current, 'later');
  press(sandbox, 'ArrowRight');
  assert.ok(sandbox.renderShellHtml().includes('Step 5 cannot be shown'));
  press(sandbox, 'Home');
  assert.equal(run(sandbox, 'activeStory').step, 0);
  assert.ok(reading(sandbox));
});

// ---- 8. view state only: nothing is written, no model changes ----

for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
  test('story `' + storyId + '`: reading it in the mode writes nothing and calls modelsChanged as often as the editing walk does', async () => {
    const files = shippedFiles(dir);
    const count = storyOf((await open(files, name)).sandbox, storyId).length;
    const counting = async (walk) => {
      const page = await open(files, name);
      let calls = 0;
      const original = page.sandbox.modelsChanged;
      page.sandbox.modelsChanged = () => { calls++; original(); };
      const unsaved = () => page.state.manifestFiles.filter((file) => file.dirty).length;
      walk(page);
      page.sandbox.modelsChanged = original;
      // nothing is written, nothing is marked, the files are what they were
      assert.equal(unsaved(), 0, 'no file is marked modified');
      assert.equal(page.mem.writes.length, 0, 'nothing is written to the folder');
      assert.equal(page.mem.removals.length, 0);
      for (const [file, text] of Object.entries(files)) assert.equal(page.mem.files.get(file).text, text, file + ' is what it was');
      assert.ok(!page.state.workspace.settingsDirty, '.archicode.yaml is not touched');
      assert.deepEqual(plain(page.state.pendingFileRemovals), []);
      return { calls, page };
    };
    const editing = await counting(({ sandbox }) => {
      sandbox.goToStoryStep(storyId, 0);
      for (let i = 1; i < count; i++) click(sandbox, 'story-next');
      for (let i = count - 1; i >= 0; i--) choose(sandbox, storyId, i);
    });
    const reading = await counting(({ sandbox }) => {
      sandbox.enterReadingMode(storyId, 0);
      for (let i = 1; i < count; i++) press(sandbox, 'ArrowRight');
      for (let i = count - 1; i >= 0; i--) choose(sandbox, storyId, i);
      press(sandbox, 'Escape');
    });
    assert.equal(reading.calls, editing.calls, 'the mode adds no model change to the walk');
    const naming = storyOf(editing.page.sandbox, storyId).some((step) => step.at || step.against);
    if (!naming) assert.equal(reading.calls, 0, 'a story that names no plateau builds no model');
  });
}

test('entering and leaving the mode touch no model, no cache and no file, on every shipped story', async () => {
  for (const [storyId, { dir, name }] of Object.entries(SHIPPED)) {
    const files = shippedFiles(dir);
    const { sandbox, state, mem } = await open(files, name);
    sandbox.goToStoryStep(storyId, 1);
    let calls = 0;
    const original = sandbox.modelsChanged;
    sandbox.modelsChanged = () => { calls++; original(); };
    const before = { version: run(sandbox, 'modelVersion'), index: state.index, baseline: state.baseline, comparison: run(sandbox, 'comparisonCache'), diagram: run(sandbox, 'diagramCache'), key: run(sandbox, 'diagramKeyOpen'),
      options: plain({ changesOnly: state.changesOnly, hideWording: state.hideWording }), facet: run(sandbox, 'diagramFacet'), hide: run(sandbox, 'diagramHideUnlinked'), mapState: plain(sandbox.mapStateOf()) };
    sandbox.enterReadingMode(storyId);
    press(sandbox, 'Escape');
    sandbox.enterReadingMode(storyId);
    click(sandbox, 'story-read-exit');
    sandbox.modelsChanged = original;
    assert.equal(calls, 0, storyId + ': no model changed');
    assert.equal(run(sandbox, 'modelVersion'), before.version);
    assert.equal(state.index, before.index);
    assert.equal(state.baseline, before.baseline);
    assert.equal(run(sandbox, 'comparisonCache'), before.comparison, 'the comparison cache is the same object');
    assert.equal(run(sandbox, 'diagramCache'), before.diagram, 'and so is the diagram cache');
    assert.equal(run(sandbox, 'diagramKeyOpen'), before.key);
    assert.equal(run(sandbox, 'diagramFacet'), before.facet);
    assert.equal(run(sandbox, 'diagramHideUnlinked'), before.hide);
    assert.deepEqual(plain(sandbox.mapStateOf()), before.mapState);
    assert.equal(mem.writes.length, 0);
    assert.ok(!state.manifestFiles.some((file) => file.dirty));
    // the input of the diagram, and so its cache key, is not a function of the mode
    const recipe = { isMap: true, reference: '', viewpoint: 'map', facet: null, mapState: sandbox.mapStateOf(), shows: sandbox.diagramShows(true), hideUnlinked: false, layer: 'application' };
    run(sandbox, 'readingMode = false');
    const off = sandbox.diagramCacheKey(recipe, sandbox.comparisonState(), 'map|map||');
    run(sandbox, 'readingMode = true');
    assert.equal(sandbox.diagramCacheKey(recipe, sandbox.comparisonState(), 'map|map||'), off, storyId + ': the key of the diagram cache does not read the mode');
    run(sandbox, 'readingMode = false');
  }
  assert.doesNotMatch(PAGE.slice(PAGE.indexOf('function diagramCacheKey'), PAGE.indexOf('let treeQuietCache')), /readingMode|readingModeOn/, 'the mode is not in the cache key');
  assert.doesNotMatch(PAGE.slice(PAGE.indexOf('function modelsKey'), PAGE.indexOf('function diagramCacheKey')), /readingMode|readingModeOn/);
});

test('the mode is reset with the folder', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.enterReadingMode('order_journey', 0);
  assert.ok(reading(sandbox));
  run(sandbox, 'resetUiState()');
  assert.equal(run(sandbox, 'readingMode'), false);
  assert.equal(run(sandbox, 'activeStory'), null);
  assert.equal(reading(sandbox), false);
});

// ---- 9. focus ----

test('the focus goes to the menu when the mode opens, stays with Next or Previous (and moves to the other at an end), and goes to Read when it closes', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.goToStoryStep('order_journey', 0);
  sandbox.enterReadingMode('order_journey');
  const first = run(sandbox, 'pendingFocusSelector');
  assert.equal(first, run(sandbox, 'READING_FIRST_FOCUS'));
  assert.ok(first.startsWith('.reading-bar [data-story-step-menu]'), 'the menu of the steps first');
  const html = sandbox.renderShellHtml();
  assert.ok(html.includes('data-story-step-menu'), 'which is there');
  // Next keeps Next, until the last step, where Previous has the focus (Next is disabled there)
  const count = storyOf(sandbox, 'order_journey').length;
  for (let i = 1; i < count; i++) {
    click(sandbox, 'story-next');
    assert.equal(run(sandbox, 'pendingFocusSelector'), i < count - 1 ? '.reading-bar [data-action="story-next"]' : '.reading-bar [data-action="story-prev"]', 'step ' + (i + 1));
  }
  for (let i = count - 2; i >= 0; i--) {
    click(sandbox, 'story-prev');
    assert.equal(run(sandbox, 'pendingFocusSelector'), i > 0 ? '.reading-bar [data-action="story-prev"]' : '.reading-bar [data-action="story-next"]', 'step ' + (i + 1));
  }
  // the menu keeps the focus (W-4), the keys leave it where it is
  choose(sandbox, 'order_journey', 1);
  assert.equal(run(sandbox, 'pendingFocusSelector'), '[data-story-step-menu]');
  press(sandbox, 'ArrowRight');
  assert.equal(run(sandbox, 'pendingFocusSelector'), null);
  // a key pressed with the focus on Next or on Previous keeps it there, as the click does
  const onAction = (action) => ({ tagName: 'BUTTON', closest: () => null, getAttribute: (name) => (name === 'data-action' ? action : null) });
  press(sandbox, 'ArrowLeft', { focus: onAction('story-prev'), event: { target: onAction('story-prev') } });
  assert.equal(run(sandbox, 'pendingFocusSelector'), '.reading-bar [data-action="story-prev"]');
  // a story of one step has no menu: the focus goes to Next if it can, else to Edit
  const one = await open({ '.archicode.yaml': SETTINGS, 'app.ferry.yaml': SYSTEM('ferry'),
    'story.one.yaml': STORY('one', '    - viewpoint: overview\n      properties:\n        element: ferry\n      text: Only this.\n') });
  one.sandbox.enterReadingMode('one', 0);
  const shell = one.sandbox.renderShellHtml();
  assert.ok(!shell.includes('data-story-step-menu'));
  assert.ok(shell.includes('data-action="story-next" aria-keyshortcuts="ArrowRight" disabled') === false);
  assert.match(shell, /data-action="story-next" disabled/);
  assert.ok(run(one.sandbox, 'pendingFocusSelector').endsWith('[data-action="story-read-exit"]'), 'the way back is the last choice');
  // closing
  click(sandbox, 'story-read-exit');
  assert.equal(run(sandbox, 'pendingFocusSelector'), '[data-action="story-read"]');
  assert.ok(sandbox.renderStoryBarHtml().includes('data-action="story-read"'), 'and the button is on the bar');
});

test('a form that holds what was typed is asked about before the step changes, once, with a click or a key; no keeps the step', async () => {
  const { sandbox } = await open(shippedFiles(LAYERED), 'layered');
  sandbox.enterReadingMode('order_journey', 0);
  const asked = [];
  sandbox.confirm = (message) => { asked.push(message); return false; };
  run(sandbox, 'draftTyped = true');
  press(sandbox, 'ArrowRight');
  assert.equal(asked.length, 1, 'the key asks');
  assert.equal(run(sandbox, 'activeStory').step, 0);
  click(sandbox, 'story-next');
  assert.equal(asked.length, 2, 'the click asks once, not twice');
  assert.equal(run(sandbox, 'activeStory').step, 0);
  sandbox.confirm = () => true;
  press(sandbox, 'ArrowRight');
  assert.equal(run(sandbox, 'activeStory').step, 1);
});

// ---- 10. the sheet (the phone) ----

const CSS = PAGE.slice(PAGE.indexOf('<style>'), PAGE.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const declarationsFor = (selector) => {
  const found = [];
  for (const m of CSS.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(',').map((x) => x.trim()).includes(selector)) found.push(m[2]);
  return found.join(';');
};

test('the sheet: the mode is as high and as wide as the window and never wider, its line wraps, the menu shrinks, nothing has a width of its own (what a human looks at at 360 px is in the run)', () => {
  const shell = declarationsFor('.reading-shell');
  assert.match(shell, /height:\s*100vh/);
  assert.match(shell, /height:\s*100dvh/, 'the dynamic viewport on a phone');
  assert.match(shell, /max-width:\s*100vw/);
  assert.match(shell, /min-width:\s*0/);
  assert.match(shell, /overflow:\s*hidden/, 'the page does not scroll sideways');
  assert.match(declarationsFor('.reading-shell .reading-center'), /min-height:\s*0/);
  assert.match(declarationsFor('.reading-shell .reading-center'), /flex:\s*1 1 0/, 'the diagram takes what the bar leaves');
  const menu = declarationsFor('.reading-step-menu');
  assert.match(menu, /min-width:\s*0/);
  assert.match(menu, /max-width:\s*100%/);
  assert.match(menu, /flex:\s*0 1 /, 'it may shrink');
  assert.match(declarationsFor('.story-bar-line'), /flex-wrap:\s*wrap/, 'the line of the bar wraps (the rule the bar of the editing layout has)');
  assert.match(declarationsFor('.story-bar-actions'), /flex-wrap:\s*wrap/);
  assert.match(declarationsFor('.reading-bar'), /max-height:\s*45vh/);
  assert.match(declarationsFor('.reading-bar'), /overflow-y:\s*auto/, 'a long bar scrolls inside itself');
  assert.match(declarationsFor('.reading-words'), /overflow-wrap:\s*anywhere/);
  assert.match(declarationsFor('.reading-words'), /max-height:\s*30vh/);
  assert.match(declarationsFor('.story-bar-words'), /overflow-y:\s*auto/, 'and so do the words');
  for (const selector of ['.reading-shell', '.reading-shell .reading-center', '.reading-shell .reading-view', '.reading-bar', '.reading-title', '.reading-step-menu', '.reading-words']) {
    assert.doesNotMatch(declarationsFor(selector), /(^|[;\s])(min-)?width:\s*\d+(px|rem)/, selector + ' has no width of its own');
  }
  // the window query for 40rem and less does not turn the shell into the stacked layout of the editor: it has none of its classes
  assert.ok(!/reading-shell[^{]*app-shell|app-shell[^{]*reading-shell/.test(CSS));
  assert.equal((CSS.match(/@media \(max-width: 40rem\)/g) || []).length, 1, 'still one query for the narrow window');
});

test('the mode is the editor\'s page and the editor\'s sheet: the page has the viewport meta and the diagram stage keeps its rules', () => {
  assert.match(PAGE, /<meta name="viewport"/);
  assert.match(declarationsFor('.diagram-stage'), /flex:\s*1 1 0/);
  assert.match(declarationsFor('.diagram-canvas'), /overflow:\s*hidden/);
  assert.match(declarationsFor('.diagram-canvas'), /touch-action:\s*none/, 'a finger pans the drawing, not the page');
});

// ---- 11. the editing layout is the one of 0.18.0 when the mode is off ----

/** The editor of `archicode-0.18.0`, from git, or null when the tag is not there (a shallow clone). */
function pageOfTag() {
  try {
    return require('node:child_process').execFileSync('git', ['show', 'archicode-0.18.0:src/main/resources/editor-webapp/standalone.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 1 << 28, stdio: ['ignore', 'pipe', 'ignore'] });
  } catch (e) {
    return null;
  }
}

test('against the page of archicode-0.18.0: with the mode off the editing shell is the same, with the menu and the Read button (and nothing else) taken out', { skip: pageOfTag() === null || process.env.ARCHICODE_EDITOR_HTML ? 'the page of the tag is not available, or another page is under test' : false }, async () => {
  const html = pageOfTag();
  const taken = (text) => text.replace(/<select class="story-step-menu"[\s\S]*?<\/select>/g, '').replace(/<button type="button" data-action="story-read"[^>]*>Read<\/button>/g, '');
  const cases = [
    [shippedFiles(LAYERED), 'layered', 'fork_tour', [0, 2, 4, 6]],
    [shippedFiles(LAYERED), 'layered', 'order_journey', [0, 1, 3]],
    [shippedFiles(LAYERED), 'layered', 'seller_journey', [0, 2]],
    [shippedFiles(DOMAIN_PLATEAUS), 'domain_plateaus', 'migration', [0, 1, 3]],
    [FERRY, 'ferry', 'tour', [0, 1, 2, 3]]
  ];
  for (const [files, name, story, steps] of cases) {
    const old = (await open(files, name, '', { html })).sandbox;
    const now = (await open(files, name)).sandbox;
    for (const step of steps) {
      old.goToStoryStep(story, step);
      now.goToStoryStep(story, step);
      assert.equal(reading(now), false);
      assert.equal(taken(now.renderShellHtml()), old.renderShellHtml(), story + ' step ' + (step + 1) + ': the editing shell');
      assert.equal(now.location.hash, old.location.hash, story + ' step ' + (step + 1) + ': the address');
    }
    // the page of the stories, the page of a story, the plain map and the plain elements page
    for (const sandbox of [old, now]) run(sandbox, "activeStory = null; currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = '" + story + "'");
    assert.equal(taken(now.renderShellHtml()), old.renderShellHtml(), story + ': the Stories page, with Play beside Read');
    for (const sandbox of [old, now]) run(sandbox, "currentPerspective = 'map'");
    assert.equal(taken(now.renderShellHtml()), old.renderShellHtml(), 'the Map with no story');
    assert.equal(now.location.hash, old.location.hash);
  }
});

test('the diagram tools of the editing layout are written as they were (the page that is not reading is the tag\'s, byte for byte)', { skip: pageOfTag() === null || process.env.ARCHICODE_EDITOR_HTML ? 'the page of the tag is not available, or another page is under test' : false }, async () => {
  const old = (await open(shippedFiles(LAYERED), 'layered', '', { html: pageOfTag() })).sandbox;
  const now = (await open(shippedFiles(LAYERED), 'layered')).sandbox;
  for (const compare of [false, true]) {
    if (compare) for (const sandbox of [old, now]) sandbox.drawPlateau('inhouse', { compare: 'other:baseline' });
    for (const [record, host] of [[null, undefined], [old.findElementRecord('commerce'), undefined]]) {
      const was = old.renderDiagramCanvasHtml(record, '<i></i>', host);
      const is = now.renderDiagramCanvasHtml(record === null ? null : now.findElementRecord('commerce'), '<i></i>', host);
      assert.equal(is, was, (compare ? 'with a comparison, ' : '') + (record ? 'an element' : 'the map'));
      assert.notEqual(now.renderDiagramCanvasHtml(record === null ? null : now.findElementRecord('commerce'), '', undefined, { reading: true }), is, 'and the reading mode draws other tools');
    }
  }
});
