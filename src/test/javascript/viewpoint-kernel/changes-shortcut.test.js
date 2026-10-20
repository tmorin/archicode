'use strict';
// The keyboard shortcut of Next change and Previous change, and the detail of the current change under the walk buttons (wave 016, run 0112, issue #113; the walk, the filters and the list are
// wave 015, run 0103, issue #27, tested in reading-changes.test.js). The pairs are those of the layered Brightcart (src/test/resources/brightcart/layered/: four plateaus, `saas` and
// `inhouse` both override `baseline`; the pair `inhouse` / `saas` has 69 changes of the six states, both layers, relationships among them) and its two stories `order_journey` and
// `fork_tour`, read as the editor reads a folder, with the real kernel. The page is not drawn in this harness (no layout engine): what a page writes is read through its own functions
// (`renderPlateausPerspectiveHtml`, `renderElementsPerspectiveHtml`, `renderLibraryPerspectiveHtml`), and the keys are given to the page's own listener as the browser gives them.
// Everything here is invented (the Brightcart is a made-up shop). Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');
const { compareWith } = require('./layered-folders');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

/** The Brightcart, opened, with `drawn` drawn and compared with `against` on the band; `page` is the page on screen. */
async function openBrightcart(drawn, against, page) {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  sandbox.drawPlateau(drawn || 'inhouse');
  if (against !== null) compareWith(sandbox, against || 'saas');
  if (page === 'elements') run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  else if (page === 'map') run(sandbox, "currentPerspective = 'map';");
  else if (page === 'story') run(sandbox, "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'order_journey';");
  else if (page === 'fork') run(sandbox, "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'fork_tour';");
  else run(sandbox, "currentPerspective = 'plateaus';");
  return { sandbox, state };
}

/** A click as handleAppClick reads it: the nearest data-action element, with these attributes. */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}
const next = (sandbox) => click(sandbox, { 'data-action': 'change-next' });
const previous = (sandbox) => click(sandbox, { 'data-action': 'change-previous' });

/** A choice made in one of the two filters, as `handleAppInput` reads it. */
function choose(sandbox, kind, value) {
  const attributes = { 'data-changes-filter': kind };
  sandbox.handleAppInput({ target: { value, tagName: 'SELECT', matches: () => false, closest: () => null, getAttribute: (name) => (name in attributes ? attributes[name] : null) } });
}

/** An element the keys can come from: the body (nothing focused), an input, a textarea, a select, a contenteditable, a code editor (CodeMirror), a button of the Changes panel. */
const BODY = { tagName: 'BODY', closest: () => null };
const FROM = {
  input: { tagName: 'INPUT', closest: (selector) => (selector.includes('input') ? FROM.input : null) },
  textarea: { tagName: 'TEXTAREA', closest: (selector) => (selector.includes('textarea') ? FROM.textarea : null) },
  select: { tagName: 'SELECT', closest: (selector) => (selector.includes('select') ? FROM.select : null) },
  editable: { tagName: 'DIV', isContentEditable: true, closest: () => null },
  editableByAttribute: { tagName: 'DIV', closest: (selector) => (selector.includes('[contenteditable]') ? {} : null) },
  codeEditor: { tagName: 'DIV', isContentEditable: false, closest: (selector) => (selector.includes('.cm-editor') ? {} : null) },
  textboxRole: { tagName: 'DIV', closest: (selector) => (selector.includes('[role="textbox"]') ? {} : null) },
  panelButton: { tagName: 'BUTTON', closest: (selector) => (selector === '[data-changes-panel]' ? {} : null) }
};

/** A keydown as the browser gives it; `prevented` says whether the page asked to keep the key from the browser. The page's listeners on the document are the ones that get it. */
function press(sandbox, key, options) {
  const opts = options || {};
  const event = Object.assign({ key, ctrlKey: false, metaKey: false, altKey: false, shiftKey: false, defaultPrevented: false, isComposing: false, target: BODY, prevented: false,
    preventDefault() { this.prevented = true; } }, opts.event || {});
  sandbox.document.activeElement = opts.focus === undefined ? undefined : opts.focus;
  for (const listener of sandbox.__documentListeners.keydown || []) listener(event);
  sandbox.document.activeElement = undefined;
  return event;
}
const j = (sandbox, options) => press(sandbox, 'j', options);
const k = (sandbox, options) => press(sandbox, 'k', options);

/** The Changes panel as the page on screen writes it, and the list read from it (the rows in order, the mark, the position, the buttons). */
function panelOf(sandbox) {
  const perspective = run(sandbox, 'currentPerspective');
  const regions = perspective === 'plateaus' ? sandbox.renderPlateausPerspectiveHtml() : perspective === 'library' ? sandbox.renderLibraryPerspectiveHtml() : sandbox.renderElementsPerspectiveHtml();
  return regions.right || '';
}
function listOf(sandbox) {
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const rows = Array.from(panel.matchAll(/<button type="button" class="change-row( selected)?"[^>]*data-thing="([a-z]+)" data-change="([a-z-]+)" data-layer="([a-z]+)" data-ref="([^"]*)"(?: data-to="([^"]*)")?(?: data-label="([^"]*)")?/g),
    (m) => ({ selected: !!m[1], thing: m[2], change: m[3], layer: m[4], ref: m[5], to: m[6] || '', label: m[7] || '' }));
  const position = panel.match(/data-changes-position="(\d+)">(\d+ of \d+)</);
  const button = (action) => {
    const tag = panel.match(new RegExp('<button type="button" data-action="' + action + '"[^>]*>'));
    return tag ? !/ disabled/.test(tag[0]) : null;
  };
  return { panel, rows, position: position ? position[2] : null, canNext: button('change-next'), canPrevious: button('change-previous') };
}
const keyOf = (row) => [row.thing, row.layer, row.reference || row.ref, row.destination || row.to || '', row.label || ''].join('|');

/** What a walk leaves behind, for two sandboxes to be compared: the mark, the page, the selection and the address. */
function trace(sandbox) {
  const list = listOf(sandbox);
  return { position: list.position, marked: list.rows.filter((row) => row.selected).map(keyOf), canNext: list.canNext, canPrevious: list.canPrevious, page: run(sandbox, 'currentPerspective'),
    selection: plain(sandbox.__state().selection), hash: sandbox.location.hash, tab: run(sandbox, 'changesTabPick !== null'), walk: plain(run(sandbox, 'changesWalk && changesWalk.key')) };
}

/** Count what must not happen while the reader walks: a model change, a computed comparison, a render beyond one per step. */
function spyOn(sandbox) {
  run(sandbox, 'globalThis.__spy = { modelsChanged: 0, renders: 0 }; { const m = modelsChanged; modelsChanged = function (...a) { __spy.modelsChanged++; return m.apply(this, a); }; const r = render; render = function (...a) { __spy.renders++; return r.apply(this, a); }; }');
  return () => plain(run(sandbox, '__spy'));
}
const versionOf = (sandbox) => ({ version: run(sandbox, 'modelVersion'), cache: run(sandbox, 'comparisonCache') });

// ---- 1. The key is the walk of the buttons ----

test('the page registers one listener for the key, on the document, in the bubbling phase, and J and K are the keys the buttons say', () => {
  assert.match(HTML, /document\.addEventListener\('keydown', handleChangesKeydown\);/, 'bubbling: the capture handlers (Escape for the dialog, the help and the menu) come first');
  const sandbox = createApp({});
  assert.ok(sandbox.__documentListeners.keydown.some((fn) => fn.name === 'handleChangesKeydown'));
  // the two buttons tell the key, in the title and for the assistive technology
  return openBrightcart().then(({ sandbox: app }) => {
    const panel = app.renderChangesPanelHtml(app.comparisonState());
    assert.match(panel, /data-action="change-previous"[^>]* aria-keyshortcuts="k" title="The change before this one in the list \(shortcut: K\)"/);
    assert.match(panel, /data-action="change-next"[^>]* aria-keyshortcuts="j" title="The change after this one in the list \(shortcut: J\)"/);
  });
});

test('J and K walk the list exactly as the buttons do: same marks, same page, same selection, same address, same stops, on every page that has the list', async () => {
  for (const page of ['plateaus', 'elements', 'map', 'story']) {
    const keys = await openBrightcart('inhouse', 'saas', page);
    const buttons = await openBrightcart('inhouse', 'saas', page);
    const rows = listOf(keys.sandbox).rows;
    assert.ok(rows.length >= 60, page + ': the pair has ' + rows.length + ' changes');
    assert.deepEqual([...new Set(rows.map((row) => row.change))].sort(), ['changed', 'merged', 'new', 'removed', 'split'], page);
    for (let i = 0; i < rows.length + 2; i++) { // two steps past the end: the walk stops, it does not wrap
      const event = j(keys.sandbox);
      next(buttons.sandbox);
      assert.deepEqual(trace(keys.sandbox), trace(buttons.sandbox), page + ': step ' + (i + 1));
      assert.equal(trace(keys.sandbox).position, Math.min(i + 1, rows.length) + ' of ' + rows.length, page + ': the walk is where the list says, not only where the buttons are');
      assert.equal(event.prevented, true, 'the key is the page\'s: the browser does not get it');
    }
    assert.equal(listOf(keys.sandbox).position, rows.length + ' of ' + rows.length, page + ': it stops at the last change');
    assert.equal(listOf(keys.sandbox).canNext, false);
    for (let i = rows.length - 2; i >= -2; i--) {
      k(keys.sandbox);
      previous(buttons.sandbox);
      assert.deepEqual(trace(keys.sandbox), trace(buttons.sandbox), page + ': back at ' + (i + 1));
    }
    assert.equal(listOf(keys.sandbox).position, '1 of ' + rows.length, page + ': and at the first');
    assert.equal(listOf(keys.sandbox).canPrevious, false);
    assert.equal(trace(keys.sandbox).position, '1 of ' + rows.length);
  }
});

test('with no change selected K goes to the last change and J to the first, as the buttons do; Caps Lock (J, K with no Shift) works', async () => {
  const { sandbox } = await openBrightcart();
  const rows = listOf(sandbox).rows;
  press(sandbox, 'K');
  assert.equal(listOf(sandbox).position, rows.length + ' of ' + rows.length);
  const other = await openBrightcart();
  press(other.sandbox, 'J');
  assert.equal(listOf(other.sandbox).position, '1 of ' + rows.length);
});

test('the filters are respected: with a state chosen the keys visit the changes that are shown, only those, and stop at the ends of them', async () => {
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'elements');
  choose(sandbox, 'state', 'removed');
  const shown = listOf(sandbox).rows;
  assert.ok(shown.length >= 2 && shown.length < 69);
  const seen = [];
  for (let i = 0; i < shown.length + 2; i++) {
    j(sandbox);
    const marked = listOf(sandbox).rows.find((row) => row.selected);
    if (marked && seen[seen.length - 1] !== keyOf(marked)) seen.push(keyOf(marked));
  }
  assert.deepEqual(seen, shown.map(keyOf));
  assert.equal(listOf(sandbox).position, shown.length + ' of ' + shown.length);
  k(sandbox);
  assert.equal(listOf(sandbox).position, (shown.length - 1) + ' of ' + shown.length);
  choose(sandbox, 'layer', 'technology');
  const both = listOf(sandbox).rows;
  assert.ok(both.length >= 1 && both.length <= shown.length, 'removed changes of the technology layer: ' + both.length);
  assert.ok(both.every((row) => row.change === 'removed' && row.layer === 'technology'));
  for (let i = 0; i < both.length + 3; i++) j(sandbox);
  assert.equal(listOf(sandbox).position, both.length + ' of ' + both.length, 'the walk ended on the last change of both filters');
  assert.deepEqual(listOf(sandbox).rows.filter((row) => row.selected).map(keyOf), [keyOf(both[both.length - 1])]);
});

// ---- 2. Where the key must leave the page alone ----

test('the key does nothing when the reader types: an input, a textarea, a select, a contenteditable, a code editor; the target and the focused element are both looked at', async () => {
  const { sandbox } = await openBrightcart();
  const before = trace(sandbox);
  for (const [name, element] of Object.entries(FROM)) {
    if (name === 'panelButton') continue;
    for (const key of ['j', 'k']) {
      const asTarget = press(sandbox, key, { event: { target: element } });
      assert.equal(asTarget.prevented, false, name + ' as the target: the letter is the reader\'s');
      const asFocus = press(sandbox, key, { focus: element });
      assert.equal(asFocus.prevented, false, name + ' as the focus: the letter is the reader\'s');
    }
  }
  assert.deepEqual(trace(sandbox), before, 'nothing moved');
  assert.equal(run(sandbox, 'changesWalk'), null);
  // and the same key walks when the focus is on the body or on a button
  assert.equal(j(sandbox, { focus: FROM.panelButton }).prevented, true);
  assert.equal(listOf(sandbox).position, '1 of ' + listOf(sandbox).rows.length);
});

test('the key does nothing while a dialog is open, the help or the menu of the header is open, or a rejected YAML text is waiting; it works again after', async () => {
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'elements');
  const before = trace(sandbox);
  sandbox.newStory(); // a dialog of the page (the name of a new story)
  assert.ok(run(sandbox, 'appDialog'), 'the dialog is open');
  assert.equal(j(sandbox).prevented, false);
  assert.equal(k(sandbox).prevented, false);
  assert.deepEqual(trace(sandbox), before);
  sandbox.closeAppDialog();
  assert.equal(run(sandbox, 'appDialog'), null);
  sandbox.setHelpOpen(true);
  assert.equal(j(sandbox).prevented, false, 'the help menu');
  sandbox.setHelpOpen(false);
  run(sandbox, 'headerMenuOpen = true;');
  assert.equal(j(sandbox).prevented, false, 'the menu of the header');
  run(sandbox, 'headerMenuOpen = false;');
  run(sandbox, "rawYamlEditDraft = { text: 'x: [' };");
  assert.equal(j(sandbox).prevented, false, 'a YAML text that was refused is kept: a selection would drop it');
  assert.deepEqual(plain(run(sandbox, 'rawYamlEditDraft')), { text: 'x: [' });
  run(sandbox, 'rawYamlEditDraft = null;');
  assert.deepEqual(trace(sandbox), before);
  assert.equal(j(sandbox).prevented, true, 'all closed: the key walks');
  assert.equal(listOf(sandbox).position, '1 of ' + listOf(sandbox).rows.length);
});

test('modifier keys leave it alone: Ctrl, Alt, Meta, Shift; so do the other keys, a composed key and a key another handler took', async () => {
  const { sandbox } = await openBrightcart();
  const before = trace(sandbox);
  for (const modifier of ['ctrlKey', 'altKey', 'metaKey', 'shiftKey']) {
    for (const key of ['j', 'k', 'J', 'K']) {
      const event = press(sandbox, key, { event: { [modifier]: true } });
      assert.equal(event.prevented, false, modifier + ' + ' + key + ' is not ours');
    }
  }
  for (const key of ['n', 'p', 'f', 'c', 'm', 'h', 'ArrowDown', 'ArrowUp', 'Home', 'End', 'Enter', ' ', 'Escape', 'Tab', ']', '[', 'l']) {
    assert.equal(press(sandbox, key).prevented, false, key + ' is not ours');
  }
  assert.equal(press(sandbox, 'j', { event: { isComposing: true } }).prevented, false, 'a key of an input method');
  assert.equal(press(sandbox, 'j', { event: { defaultPrevented: true } }).prevented, false, 'a key another handler took');
  assert.deepEqual(trace(sandbox), before);
});

test('the key does nothing where no Changes list is on screen: no comparison, the pages Files and Settings, a comparison that cannot be listed, a diagram that fills the page', async () => {
  const none = await openBrightcart('inhouse', null, 'plateaus');
  assert.equal(none.sandbox.comparisonState(), null);
  assert.equal(j(none.sandbox).prevented, false, 'nothing is compared');
  assert.equal(run(none.sandbox, 'changesWalk'), null);
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'plateaus');
  for (const page of ['files', 'settings']) {
    run(sandbox, "currentPerspective = '" + page + "';");
    assert.equal(j(sandbox).prevented, false, page);
    assert.equal(k(sandbox).prevented, false, page);
  }
  assert.equal(run(sandbox, 'changesWalk'), null, 'no walk was made behind the page');
  run(sandbox, "currentPerspective = 'map';");
  run(sandbox, 'diagramMaximized = true;');
  assert.equal(j(sandbox).prevented, false, 'the right panel is hidden by a maximized diagram: the list is not on screen');
  run(sandbox, 'diagramMaximized = false;');
  assert.equal(j(sandbox).prevented, true);
  // the kernel is not loaded yet: the list is not there
  run(sandbox, 'const kernel = loadedKernel; globalThis.__kernel = kernel; loadedKernel = null;');
  assert.equal(sandbox.comparisonState().pending, true);
  assert.equal(k(sandbox).prevented, false);
  run(sandbox, 'loadedKernel = __kernel;');
  assert.equal(k(sandbox).prevented, true);
});

test('the key is view state like the buttons: no model change, no comparison computed again, one render for a step, the diagram asked the same, the address as the button leaves it', async () => {
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'map');
  const draw = () => JSON.stringify(sandbox.buildKernelInput('map', '', { layer: 'application' }));
  const input = draw();
  const before = versionOf(sandbox);
  const counts = spyOn(sandbox);
  for (let i = 0; i < 6; i++) j(sandbox);
  k(sandbox);
  k(sandbox);
  choose(sandbox, 'state', 'moved');
  const after = versionOf(sandbox);
  assert.equal(counts().modelsChanged, 0, 'no `modelsChanged()`');
  assert.ok(counts().renders >= 8, 'the page is drawn again after each step');
  assert.equal(after.version, before.version);
  assert.equal(after.cache, before.cache, 'the comparison is not computed again');
  assert.equal(draw(), input, 'the kernel is asked for the same drawing');
  // on the page Plateaus the address is the address: the key does not write one
  const plateaus = await openBrightcart('inhouse', 'saas', 'plateaus');
  plateaus.sandbox.render();
  const hash = plateaus.sandbox.location.hash;
  const entries = plateaus.sandbox.__history.entries.length;
  for (let i = 0; i < 5; i++) j(plateaus.sandbox);
  assert.equal(plateaus.sandbox.location.hash, hash);
  assert.equal(plateaus.sandbox.__history.entries.length, entries, 'and no entry of the history');
});

test('the focus: from the page the key leaves it where it was, from a control of the Changes panel it is the button\'s walk', async () => {
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'elements');
  j(sandbox);
  assert.equal(run(sandbox, 'pendingFocusSelector'), null, 'the reader was not on the panel: no control takes the focus');
  const button = await openBrightcart('inhouse', 'saas', 'elements');
  next(button.sandbox);
  assert.equal(run(button.sandbox, 'pendingFocusSelector'), '[data-action="change-next"]', 'the button keeps the focus');
  j(sandbox, { focus: FROM.panelButton });
  assert.equal(run(sandbox, 'pendingFocusSelector'), '[data-action="change-next"]', 'from the panel the key is the button');
});

// ---- 3. The detail of the current change ----

/** The detail the panel shows now: its html, or null. */
function detailOf(html) {
  const at = html.indexOf('<div class="changes-detail"');
  if (at < 0) return null;
  const end = html.indexOf('<h4 class="inspection-subhead">Elements', at);
  return html.slice(at, end < 0 ? html.length : end);
}

test('on the page Plateaus each step shows what changed under the buttons: the block of the inspection for an element, the line of the relationship for a relationship, all six states told', async () => {
  const seen = new Set();
  const sentences = { new: 'Whole element is new', removed: 'Whole element is removed', changed: 'Changed: ', moved: 'Moved or renamed', split: 'Split: ', merged: 'Merged: ' };
  for (const [drawn, against] of [['inhouse', 'saas'], ['marketplace', 'inhouse']]) {
    const { sandbox } = await openBrightcart(drawn, against, 'plateaus');
    assert.equal(detailOf(panelOf(sandbox)), null, 'no change is current before the walk starts: nothing to show');
    const rows = listOf(sandbox).rows;
    for (let i = 0; i < rows.length; i++) {
      j(sandbox);
      const panel = panelOf(sandbox);
      const detail = detailOf(panel);
      const row = rows[i];
      const where = drawn + ' / ' + against + ', step ' + (i + 1) + ': ' + keyOf(row);
      assert.ok(detail, where + ': a detail');
      assert.equal(run(sandbox, 'currentPerspective'), 'plateaus', 'the page stays');
      assert.ok(panel.indexOf('data-changes-detail') > panel.indexOf('data-action="change-next"'), 'the detail is under the walk buttons');
      assert.ok(panel.indexOf('data-changes-detail') < panel.indexOf('class="change-list"'), 'and above the list');
      assert.match(detail, new RegExp('<section class="what-changed" aria-label="What changed" data-state="' + row.change + '">'), where);
      if (row.thing === 'element') {
        assert.ok(detail.includes(sandbox.renderWhatChangedHtml(row.layer, row.ref, false)), 'one function writes the block, here and in the inspection: ' + where);
        assert.ok(detail.includes(sentences[row.change]), row.change + ' is told: ' + where);
      } else {
        const rel = { from: row.ref, destination: row.to, label: row.label, change: row.change };
        assert.ok(detail.includes(sandbox.renderChangedRelationshipHtml(sandbox.comparisonState(), row.layer, rel, true)), 'the line of the relationship, with its source: ' + where);
      }
      seen.add(row.thing + '/' + row.change);
    }
    // the detail is the one of the change the reader is at, and Previous goes back to it
    k(sandbox);
    assert.match(detailOf(panelOf(sandbox)), new RegExp('data-state="' + rows[rows.length - 2].change + '"'));
  }
  for (const state of ['new', 'changed', 'removed', 'moved', 'split', 'merged']) assert.ok(seen.has('element/' + state), 'an element ' + state + ' was walked');
  assert.ok(seen.has('relationship/new') && seen.has('relationship/removed') && seen.has('relationship/changed'), 'relationships of three states were walked');
});

test('the same walk, with the keys and with the buttons, writes the same detail', async () => {
  const keys = await openBrightcart('marketplace', 'inhouse', 'plateaus');
  const buttons = await openBrightcart('marketplace', 'inhouse', 'plateaus');
  const total = listOf(keys.sandbox).rows.length;
  assert.ok(total >= 60, String(total));
  for (let i = 0; i < total; i++) {
    j(keys.sandbox);
    next(buttons.sandbox);
    assert.equal(detailOf(panelOf(keys.sandbox)), detailOf(panelOf(buttons.sandbox)), 'step ' + (i + 1));
  }
});

test('on a story with no view drawn Next change shows the detail, on the story and on the one that goes across the fork; the page and the selection stay', async () => {
  const { sandbox, state } = await openBrightcart('inhouse', 'saas', 'story');
  assert.equal(sandbox.changeSelectionIsShown(), false, 'no view is drawn: nothing can be selected on the page');
  assert.match(panelOf(sandbox), /^<div class="changes-panel" data-changes-panel>/, 'the Changes panel is alone on the right, as before');
  const selection = JSON.stringify(state.selection);
  const rows = listOf(sandbox).rows;
  j(sandbox);
  j(sandbox);
  const detail = detailOf(panelOf(sandbox));
  assert.ok(detail, 'a story with no view drawn shows what the change is');
  assert.ok(detail.includes(sandbox.renderWhatChangedHtml(rows[1].layer, rows[1].ref, false)));
  assert.equal(run(sandbox, 'currentPerspective'), 'library');
  assert.equal(JSON.stringify(state.selection), selection);
  // the story that is told across the fork: the step draws a pair, and the page is left on the story
  const fork = await openBrightcart();
  fork.sandbox.goToStoryStep('fork_tour', 3);
  run(fork.sandbox, "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'fork_tour';");
  assert.deepEqual(plain([fork.state.layers.current, fork.state.layers.compare.other]), ['inhouse', 'saas'], 'the step is told at inhouse, compared with saas');
  const forkRows = listOf(fork.sandbox).rows;
  k(fork.sandbox);
  assert.match(detailOf(panelOf(fork.sandbox)), new RegExp('data-state="' + forkRows[forkRows.length - 1].change + '"'));
  assert.equal(run(fork.sandbox, 'currentPerspective'), 'library');
});

test('a page that shows a selection shows the detail under the buttons, and the Selected tab is still there, one click away, while the reader walks', async () => {
  for (const page of ['elements', 'map']) {
    const { sandbox } = await openBrightcart('inhouse', 'saas', page);
    const rows = listOf(sandbox).rows;
    j(sandbox);
    j(sandbox);
    j(sandbox);
    const row = rows[2];
    let panel = panelOf(sandbox);
    assert.match(panel, /aria-pressed="true">Changes/, page + ': the walk stays on the Changes tab');
    assert.match(panel, /data-tab="selected" aria-pressed="false">Selected/, page + ': and the Selected tab is there');
    const detail = detailOf(panel);
    assert.ok(detail && detail.includes('aria-label="What changed"'), page + ': the detail is read without leaving the list');
    assert.match(detail, new RegExp('data-state="' + row.change + '"'));
    // the Selected tab, one click: the inspection of what the walk selected, with its own "What changed" (the same function), and the list is not shown
    click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'selected' });
    panel = panelOf(sandbox);
    assert.match(panel, /aria-pressed="true">Selected/, page);
    assert.doesNotMatch(panel, /data-changes-panel/, page);
    assert.ok(panel.includes('aria-label="What changed"') && panel.includes('data-state="' + row.change + '"'), page + ': the inspection of the selected change, with the block it has always had');
    // and a key walks again, back to the Changes tab, from where the reader was
    j(sandbox);
    panel = panelOf(sandbox);
    assert.match(panel, /aria-pressed="true">Changes/, page + ': the key brings the list back');
    assert.equal(listOf(sandbox).position, '4 of ' + rows.length, page);
  }
});

test('on the page of a view in Stories the walk selects on the page, keeps the View | Changes strip, and the detail is under the buttons', async () => {
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'story');
  run(sandbox, "currentPerspective = 'library'; libraryTab = 'views'; selectedViewId = 'applications_map';");
  assert.equal(sandbox.changeSelectionIsShown(), true, 'the saved map of the fixture can be drawn in inhouse: the page shows a selection');
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  j(sandbox);
  j(sandbox);
  const panel = panelOf(sandbox);
  assert.match(panel, /data-tab="view" aria-pressed="false">View/, 'the View tab is there, one click away');
  assert.match(panel, /data-tab="changes" aria-pressed="true"/);
  const detail = detailOf(panel);
  assert.ok(detail);
  assert.match(detail, new RegExp('data-state="' + listOf(sandbox).rows[1].change + '"'));
  assert.equal(run(sandbox, 'currentPerspective'), 'library');
  assert.equal(run(sandbox, 'libraryPickFor(selectedViewId).selection.key'), listOf(sandbox).rows[1].ref, 'the change is selected on the page itself');
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'view' });
  assert.match(panelOf(sandbox), /library-selection/, 'the View tab shows the selection of the walk');
});

test('the detail follows the filters: a change left out of the list is not shown; with nothing shown there is none; Show all brings the walk back', async () => {
  const { sandbox } = await openBrightcart('inhouse', 'saas', 'plateaus');
  j(sandbox);
  const first = listOf(sandbox).rows.find((row) => row.selected);
  assert.ok(detailOf(panelOf(sandbox)));
  choose(sandbox, 'state', first.change === 'removed' ? 'new' : 'removed'); // leaves the change out: the walk moves to the nearest one that is shown
  const moved = listOf(sandbox).rows.find((row) => row.selected);
  assert.ok(moved && keyOf(moved) !== keyOf(first));
  assert.match(detailOf(panelOf(sandbox)), new RegExp('data-state="' + moved.change + '"'), 'the detail is the one of the change it moved to');
  choose(sandbox, 'layer', 'technology');
  choose(sandbox, 'state', 'merged'); // no merged change of the technology layer: nothing is shown
  assert.equal(listOf(sandbox).rows.length, 0);
  assert.equal(detailOf(panelOf(sandbox)), null, 'nothing is shown, so nothing is detailed');
  assert.equal(j(sandbox).prevented, true, 'the key is still the page\'s (it is the walk, and the walk has nowhere to go)');
  click(sandbox, { 'data-action': 'change-filters-clear' });
  assert.ok(listOf(sandbox).rows.length >= 60);
});

test('the detail is view state: the models, the comparison, the filters and the diagram are what they were; a click on a row does what it did (opens Elements from Plateaus and from a story)', async () => {
  for (const page of ['plateaus', 'story']) {
    const { sandbox, state } = await openBrightcart('inhouse', 'saas', page);
    assert.ok(sandbox.comparisonState().changes.length > 0); // computed once, as the page does when it draws
    const before = versionOf(sandbox);
    assert.ok(before.cache);
    const counts = spyOn(sandbox);
    listOf(sandbox); // the list is written once: the filters are set for the pair
    const filter = JSON.stringify(run(sandbox, 'changesFilter'));
    for (let i = 0; i < 4; i++) j(sandbox);
    assert.ok(detailOf(panelOf(sandbox)));
    assert.equal(counts().modelsChanged, 0, page);
    const after = versionOf(sandbox);
    assert.equal(after.version, before.version, page);
    assert.equal(after.cache, before.cache, page + ': the comparison is not computed again');
    assert.equal(JSON.stringify(run(sandbox, 'changesFilter')), filter, page);
    // the click (#113, third bullet, left as described): the page opens the thing in Elements; the detail on screen changes nothing of it
    const row = listOf(sandbox).rows[1];
    click(sandbox, { 'data-action': 'select-change', 'data-thing': row.thing, 'data-change': row.change, 'data-layer': row.layer, 'data-ref': row.ref });
    assert.equal(run(sandbox, 'currentPerspective'), 'elements', page + ': a click opens Elements, as before');
    assert.equal(state.selection.key, row.ref, page);
    assert.equal(counts().modelsChanged, 0, page);
  }
});

test('without a comparison, or while the comparison cannot be listed, there is no detail anywhere', async () => {
  const { sandbox } = await openBrightcart('inhouse', null, 'plateaus');
  assert.equal(sandbox.comparisonState(), null);
  assert.equal(detailOf(panelOf(sandbox)), null);
  assert.doesNotMatch(panelOf(sandbox), /changes-detail/);
});
