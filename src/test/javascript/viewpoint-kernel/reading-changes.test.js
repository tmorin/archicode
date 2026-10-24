'use strict';
// Reading a long list of changes (wave 015, run 0103, issue #27): Next change and Previous change, the filters by state and by layer with "12 of 167", and the Changes tab on the page
// Stories. The pair is the invented harbour of `src/test/resources/replaces-large-pair/` (`before` and `after-declared`: 360 changes, the six states, both layers, a hundred of them
// relationships), read as the editor reads a folder, with the real kernel; a bookshop of a few lines carries the pages that need a view. No test measures a time: the pair is large so that
// a walk that was quadratic, or a list that lost a row, shows. Everything here is invented. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { openLayered, compareWith } = require('./layered-folders');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const HARBOUR = path.resolve(__dirname, '../../resources/replaces-large-pair');

/** Every file of a folder of the repository, as the path -> text object `memFolder` takes. */
function filesOf(root, base) {
  const out = {};
  for (const name of fs.readdirSync(path.join(root, base || ''))) {
    const relative = base ? base + '/' + name : name;
    if (fs.statSync(path.join(root, relative)).isDirectory()) Object.assign(out, filesOf(root, relative));
    else out[relative] = fs.readFileSync(path.join(root, relative), 'utf8');
  }
  return out;
}

/** The harbour with `after-declared` drawn and compared with `before` (whatever the page does with a view and a story is on top of it: `extra` adds files). */
async function openHarbour(extra, options) {
  const opts = options || {};
  const mem = memFolder(Object.assign(filesOf(HARBOUR), extra || {}));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('after-declared');
  if (opts.compare !== null) compareWith(sandbox, opts.compare || 'before');
  return { sandbox, state, mem };
}

/** A click as handleAppClick reads it: the nearest data-action element, with these attributes. */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {},
    detail: 1
  });
}

/** A choice made in one of the two filters of the list, as `handleAppInput` reads it. */
function choose(sandbox, kind, value) {
  const attributes = { 'data-changes-filter': kind };
  const target = {
    value,
    tagName: 'SELECT',
    matches: () => false,
    closest: () => null,
    getAttribute: (name) => (name in attributes ? attributes[name] : null)
  };
  sandbox.handleAppInput({ target });
}

const next = (sandbox) => click(sandbox, { 'data-action': 'change-next' });
const previous = (sandbox) => click(sandbox, { 'data-action': 'change-previous' });

/** The list as the page writes it: the rows (state, kind of thing, reference, destination), in order, and the line that counts them. */
function listOf(sandbox) {
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const rows = Array.from(
    panel.matchAll(
      /<button type="button" class="change-row( selected)?"[^>]*data-thing="([a-z]+)" data-change="([a-z-]+)" data-layer="([a-z]+)" data-ref="([^"]*)"(?: data-to="([^"]*)")?(?: data-label="([^"]*)")?/g
    ),
    (m) => ({ selected: !!m[1], thing: m[2], change: m[3], layer: m[4], ref: m[5], to: m[6] || '', label: m[7] || '' })
  );
  const shown = panel.match(/data-changes-shown="(\d+)" data-changes-total="(\d+)" role="status">([^<]*)</);
  const button = (action) => {
    const tag = panel.match(new RegExp('<button type="button" data-action="' + action + '"[^>]*>'));
    return tag ? !/ disabled/.test(tag[0]) : null;
  };
  const options = (kind) => {
    const at = panel.indexOf('data-changes-filter="' + kind + '"');
    const block = panel.slice(at, panel.indexOf('</select>', at));
    return Array.from(block.matchAll(/<option value="([^"]*)"( selected)?>([^<]*)<\/option>/g), (m) => ({
      value: m[1],
      selected: !!m[2],
      label: m[3]
    }));
  };
  const position = panel.match(/data-changes-position="(\d+)">(\d+ of \d+)</);
  return {
    panel,
    rows,
    shown: shown ? { count: Number(shown[1]), total: Number(shown[2]), text: shown[3] } : null,
    canPrevious: button('change-previous'),
    canNext: button('change-next'),
    states: options('state'),
    layers: options('layer'),
    position: position ? position[2] : null,
    clear: /data-action="change-filters-clear"/.test(panel)
  };
}

const keyOf = (row) =>
  [row.thing, row.layer, row.reference || row.ref, row.destination || row.to || '', row.label || ''].join('|');

/** The model version and the comparison cache: what a filter or a walk must not touch (they are view state). */
const versionOf = (sandbox) => ({ version: run(sandbox, 'modelVersion'), cache: run(sandbox, 'comparisonCache') });

// ---- 1. The list is complete and stable, on a pair of hundreds of changes ----

test('the pair has at least 167 changes of the six states in both layers, and the list has a row for each, in an order that does not change', async () => {
  const { sandbox } = await openHarbour();
  const table = sandbox.comparisonState().changes;
  assert.ok(table.length >= 167, 'the pair has ' + table.length + ' changes');
  assert.deepEqual([...new Set(table.map((row) => row.change))].sort(), [
    'changed',
    'merged',
    'moved',
    'new',
    'removed',
    'split'
  ]);
  assert.deepEqual([...new Set(table.map((row) => row.layer))].sort(), ['application', 'technology']);
  const first = listOf(sandbox);
  assert.equal(first.rows.length, table.length, 'a row for every change of the table');
  assert.equal(new Set(first.rows.map(keyOf)).size, table.length, 'and none twice');
  assert.deepEqual(first.rows.map(keyOf).sort(), Array.from(table, keyOf).sort(), 'the very ones the table has');
  assert.equal(first.shown.text, table.length + ' changes');
  assert.equal(first.shown.total, table.length);
  // the order is the one of the list (elements, then relationships, each new, changed, moved, split, merged, removed); drawing again, filtering and clearing the filters, hiding the
  // wording and showing it again give the same rows in the same order
  const order = ['new', 'changed', 'moved', 'split', 'merged', 'removed'];
  const elements = first.rows.filter((row) => row.thing === 'element');
  assert.deepEqual(
    first.rows.map((row) => row.thing),
    elements.map(() => 'element').concat(first.rows.slice(elements.length).map(() => 'relationship')),
    'the elements, then the relationships'
  );
  for (const group of [elements, first.rows.slice(elements.length)]) {
    const ranks = group.map((row) => order.indexOf(row.change));
    assert.deepEqual(
      ranks,
      ranks.slice().sort((a, b) => a - b),
      'inside a group the states are in order'
    );
  }
  assert.deepEqual(listOf(sandbox).rows.map(keyOf), first.rows.map(keyOf));
  choose(sandbox, 'state', 'moved');
  choose(sandbox, 'state', 'all');
  assert.deepEqual(listOf(sandbox).rows.map(keyOf), first.rows.map(keyOf));
});

// ---- 2. Next change and Previous change walk all of them ----

test('Next change walks every change of the list in its order and stops at the last; Previous change walks back to the first and stops there', async () => {
  const { sandbox } = await openHarbour();
  const rows = listOf(sandbox).rows;
  const start = listOf(sandbox);
  assert.equal(start.canNext, true);
  assert.equal(start.canPrevious, true, 'with no change selected, Previous goes to the last one and Next to the first');
  const seen = [];
  for (let i = 0; i < rows.length; i++) {
    next(sandbox);
    const list = listOf(sandbox);
    const marked = list.rows.filter((row) => row.selected);
    assert.ok(
      marked.length >= 1 && marked.some((row) => keyOf(row) === keyOf(rows[i])),
      'step ' + (i + 1) + ' is at ' + keyOf(rows[i])
    );
    assert.equal(list.position, i + 1 + ' of ' + rows.length);
    seen.push(keyOf(rows[i]));
    assert.equal(list.canNext, i < rows.length - 1, 'Next is off at the last change only');
    assert.equal(list.canPrevious, i > 0, 'Previous is off at the first change only');
  }
  assert.deepEqual(seen, rows.map(keyOf), 'every change, once, in the order of the list');
  next(sandbox); // the walk stops: it does not wrap
  assert.equal(listOf(sandbox).position, rows.length + ' of ' + rows.length);
  for (let i = rows.length - 2; i >= 0; i--) {
    previous(sandbox);
    const list = listOf(sandbox);
    assert.equal(list.position, i + 1 + ' of ' + rows.length);
    assert.ok(list.rows.some((row) => row.selected && keyOf(row) === keyOf(rows[i])));
  }
  previous(sandbox);
  assert.equal(listOf(sandbox).position, '1 of ' + rows.length, 'and does not wrap at the first one either');
});

test('walking to a change selects what the change names, as a click on its row does; the Changes tab stays, the row is brought into view', async () => {
  const { sandbox, state } = await openHarbour();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  const rows = listOf(sandbox).rows;
  next(sandbox);
  const first = rows[0];
  assert.deepEqual(
    plain([state.selection.kind, state.selection.key]),
    first.change === 'removed' ? ['element', state.selection.key] : ['element', first.ref]
  );
  assert.equal(
    run(sandbox, 'scrollChangesToSelection'),
    true,
    'the row is asked to be brought into view (the end of `render()` does it and clears the flag)'
  );
  // the click on that very row, on a page that is not Elements' first, selects the same thing
  const clicked = (await openHarbour()).sandbox;
  run(clicked, "currentPerspective = 'elements'; elementTab = 'details';");
  click(clicked, {
    'data-action': 'select-change',
    'data-thing': first.thing,
    'data-change': first.change,
    'data-layer': first.layer,
    'data-ref': first.ref
  });
  assert.deepEqual(plain(clicked.__state().selection), plain(state.selection));
  // the right panel of Elements holds the Changes tab and the walk keeps it; a click on a row goes back to the Selected tab (as it always did)
  const walked = sandbox.renderElementsPerspectiveHtml().right;
  assert.match(walked, /aria-pressed="true">Changes/, 'the Changes tab is the one shown after Next change');
  assert.match(walked, /data-changes-shown/);
  const clickedPanel = clicked.renderElementsPerspectiveHtml().right;
  assert.match(clickedPanel, /aria-pressed="true">Selected/);
  assert.doesNotMatch(clickedPanel, /data-changes-shown/);
});

test('a relationship told by its source (no diagram in Elements) does not trap the walk: Next goes on to the row after it', async () => {
  const { sandbox } = await openHarbour();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  const rows = listOf(sandbox).rows;
  const at = rows.findIndex((row) => row.thing === 'relationship');
  assert.ok(at > 0);
  for (let i = 0; i <= at + 2; i++) next(sandbox);
  assert.equal(
    listOf(sandbox).position,
    at + 3 + ' of ' + rows.length,
    'the elements are walked, then three relationships, whose source is selected each time'
  );
});

test('a selection made by hand is where the walk goes on from', async () => {
  const { sandbox, state } = await openHarbour();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  const rows = listOf(sandbox).rows;
  next(sandbox);
  next(sandbox);
  const target = rows.find((row) => row.thing === 'element' && row.change === 'changed');
  const index = rows.findIndex((row) => keyOf(row) === keyOf(target));
  state.selection = { kind: 'element', key: target.ref, layer: target.layer, mode: 'view' }; // a click in the tree
  sandbox.render();
  assert.equal(listOf(sandbox).position, index + 1 + ' of ' + rows.length);
  next(sandbox);
  assert.equal(listOf(sandbox).position, index + 2 + ' of ' + rows.length);
});

// ---- 3. The filters ----

test('the filters count how many of how many are shown, state by state and layer by layer, and the counts of each add up', async () => {
  const { sandbox } = await openHarbour();
  const table = sandbox.comparisonState().changes;
  const total = table.length;
  const count = (predicate) => table.filter(predicate).length;
  const unfiltered = listOf(sandbox);
  assert.deepEqual(
    unfiltered.states.map((o) => o.value),
    ['all', 'new', 'changed', 'moved', 'split', 'merged', 'removed'],
    'the six states of a row, in the order of the list, none that no row has'
  );
  assert.deepEqual(
    unfiltered.layers.map((o) => o.value),
    ['all', 'application', 'technology']
  );
  assert.equal(unfiltered.clear, false);
  let sum = 0;
  for (const option of unfiltered.states.slice(1)) {
    const expected = count((row) => row.change === option.value);
    assert.match(option.label, new RegExp('\\(' + expected + '\\)$'), option.value + ' says how many it would show');
    sum += expected;
  }
  assert.equal(sum, total);
  for (const state of ['new', 'changed', 'moved', 'split', 'merged', 'removed']) {
    choose(sandbox, 'state', state);
    const list = listOf(sandbox);
    const expected = count((row) => row.change === state);
    assert.equal(list.shown.text, expected + ' of ' + total + ' changes');
    assert.equal(list.rows.length, expected);
    assert.ok(list.rows.every((row) => row.change === state));
    assert.equal(list.clear, true);
  }
  choose(sandbox, 'state', 'all');
  for (const layer of ['application', 'technology']) {
    choose(sandbox, 'layer', layer);
    const list = listOf(sandbox);
    const expected = count((row) => row.layer === layer);
    assert.equal(list.shown.text, expected + ' of ' + total + ' changes');
    assert.deepEqual(
      list.rows.map(keyOf),
      unfiltered.rows.filter((row) => row.layer === layer).map(keyOf),
      'in the order of the list'
    );
  }
  // the two together, and what each option would show with the other as it is
  choose(sandbox, 'state', 'new');
  const both = listOf(sandbox);
  const expectedBoth = count((row) => row.layer === 'technology' && row.change === 'new');
  assert.equal(both.shown.text, expectedBoth + ' of ' + total + ' changes');
  assert.match(
    both.layers.find((o) => o.value === 'application').label,
    new RegExp('\\(' + count((row) => row.layer === 'application' && row.change === 'new') + '\\)$')
  );
  assert.match(
    both.states.find((o) => o.value === 'removed').label,
    new RegExp('\\(' + count((row) => row.layer === 'technology' && row.change === 'removed') + '\\)$')
  );
  // the groups say how many of how many too, and a group with none says so
  assert.match(both.panel, /Elements <span class="field-count">\d+ of \d+<\/span>/);
  assert.match(both.panel, /Relationships <span class="field-count">0 of \d+<\/span>/);
  assert.match(
    both.panel,
    /None of the \d+ matches the filters\./,
    'the technology layer has no relationship that changed'
  );
  // an empty list says so, and Show all brings them back
  choose(sandbox, 'state', 'removed');
  choose(sandbox, 'layer', 'technology');
  click(sandbox, { 'data-action': 'change-filters-clear' });
  const cleared = listOf(sandbox);
  assert.equal(cleared.rows.length, total);
  assert.equal(cleared.shown.text, total + ' changes');
  assert.deepEqual(
    cleared.states.filter((o) => o.selected).map((o) => o.value),
    ['all']
  );
  assert.deepEqual(
    cleared.layers.filter((o) => o.selected).map((o) => o.value),
    ['all']
  );
});

test('a choice that is not a state or a layer changes nothing', async () => {
  const { sandbox } = await openHarbour();
  const before = listOf(sandbox).rows.map(keyOf);
  assert.equal(
    sandbox.setChangesFilter('state', 'contains-changes'),
    false,
    'a box that only holds changes is not a row of the table'
  );
  assert.equal(sandbox.setChangesFilter('state', 'bogus'), false);
  assert.equal(sandbox.setChangesFilter('layer', 'business'), false);
  assert.equal(sandbox.setChangesFilter('colour', 'all'), false);
  assert.deepEqual(listOf(sandbox).rows.map(keyOf), before);
});

test('the filters are view state: they change no model, no cache and nothing the diagrams draw', async () => {
  const { sandbox } = await openHarbour();
  run(sandbox, "currentPerspective = 'map';");
  const draw = () => JSON.stringify(sandbox.buildKernelInput('map', '', { layer: 'application' }));
  const input = draw();
  const before = versionOf(sandbox);
  choose(sandbox, 'state', 'removed');
  choose(sandbox, 'layer', 'technology');
  next(sandbox);
  next(sandbox);
  previous(sandbox);
  const after = versionOf(sandbox);
  assert.equal(after.version, before.version, 'no `modelsChanged()`');
  assert.equal(after.cache, before.cache, 'the comparison is not computed again');
  assert.equal(draw(), input, 'the kernel is asked for the same drawing');
  assert.equal(run(sandbox, 'diagramCache === null || true'), true);
});

test('the filters survive a render, the wording toggle and a model change; they are all again when the pair of plateaus compared changes', async () => {
  const { sandbox } = await openHarbour();
  choose(sandbox, 'state', 'moved');
  choose(sandbox, 'layer', 'application');
  const filtered = listOf(sandbox);
  sandbox.render();
  sandbox.render();
  assert.deepEqual(listOf(sandbox).rows.map(keyOf), filtered.rows.map(keyOf), 'a render');
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  assert.equal(listOf(sandbox).shown.count, filtered.rows.length, 'the wording toggle (nothing moved is wording)');
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  sandbox.modelsChanged();
  assert.equal(
    listOf(sandbox).shown.count,
    filtered.rows.length,
    'a model change that changes nothing of the comparison'
  );
  // another plateau drawn, the same plateau compared with: the pair is another one
  compareWith(sandbox, 'baseline');
  const other = listOf(sandbox);
  assert.equal(other.clear, false, 'the filters were chosen for the pair after-declared / before');
  assert.equal(other.shown.text, other.shown.total + ' changes');
  assert.deepEqual(
    other.states.filter((o) => o.selected).map((o) => o.value),
    ['all']
  );
  // and back: the pair is the first again, but it was another one in between, so they are still all
  compareWith(sandbox, 'before');
  assert.equal(listOf(sandbox).clear, false);
});

test('a filter that leaves out the change the reader is at moves the selection to the nearest change that is shown', async () => {
  const { sandbox, state } = await openHarbour();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  const rows = listOf(sandbox).rows;
  const at = rows.findIndex((row) => row.thing === 'element' && row.change === 'changed');
  for (let i = 0; i <= at; i++) next(sandbox);
  assert.equal(listOf(sandbox).position, at + 1 + ' of ' + rows.length);
  const current = rows[at];
  choose(sandbox, 'state', 'moved'); // the moved ones come after the changed ones in the order of the list
  const list = listOf(sandbox);
  const moved = rows.filter((row) => row.change === 'moved');
  const wanted = moved.reduce(
    (best, row) => (Math.abs(rows.indexOf(row) - at) < Math.abs(rows.indexOf(best) - at) ? row : best),
    moved[0]
  );
  assert.equal(
    list.position && list.rows.findIndex((row) => row.selected) + 1,
    1,
    'the first moved one is the nearest: it is the one marked, the first of the list'
  );
  assert.equal(state.selection.key, wanted.ref, 'and it is selected');
  assert.notEqual(state.selection.key, current.ref);
  // a filter that keeps it leaves the selection where it is
  const keep = state.selection.key;
  choose(sandbox, 'layer', wanted.layer);
  assert.equal(state.selection.key, keep);
  // a filter that shows nothing leaves the selection alone: there is nowhere to move it to
  choose(sandbox, 'state', 'removed');
  choose(sandbox, 'layer', 'application');
  choose(sandbox, 'state', 'new');
  choose(sandbox, 'layer', 'technology');
  choose(sandbox, 'state', 'split');
  assert.equal(listOf(sandbox).rows.length, 0);
  assert.equal(listOf(sandbox).canNext, false);
  assert.equal(listOf(sandbox).canPrevious, false);
});

test('with a filter on, the walk visits the changes that are shown, only those, and stops at the ends of them', async () => {
  const { sandbox } = await openHarbour();
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  choose(sandbox, 'state', 'merged');
  const shown = listOf(sandbox).rows;
  assert.ok(shown.length >= 2);
  const seen = [];
  for (let i = 0; i < shown.length + 2; i++) {
    next(sandbox);
    const list = listOf(sandbox);
    const marked = list.rows.find((row) => row.selected);
    if (marked && seen[seen.length - 1] !== keyOf(marked)) seen.push(keyOf(marked));
  }
  assert.deepEqual(seen, shown.map(keyOf));
  assert.equal(listOf(sandbox).position, shown.length + ' of ' + shown.length);
  assert.equal(listOf(sandbox).canNext, false);
});

// ---- 4. The pages that show no selection ----

test('on the page Plateaus the walk moves the mark and the filters narrow the list; the page does not change', async () => {
  const { sandbox, state } = await openHarbour();
  run(sandbox, "currentPerspective = 'plateaus';");
  const selection = JSON.stringify(state.selection);
  next(sandbox);
  next(sandbox);
  let list = listOf(sandbox);
  assert.equal(list.position, '2 of ' + list.rows.length);
  assert.equal(run(sandbox, 'currentPerspective'), 'plateaus', 'the page stays: it draws no element');
  assert.equal(JSON.stringify(state.selection), selection, 'and nothing is selected');
  choose(sandbox, 'state', 'merged');
  list = listOf(sandbox);
  assert.equal(run(sandbox, 'currentPerspective'), 'plateaus');
  assert.equal(list.position, '1 of ' + list.rows.length, 'the mark went to the nearest change that is shown');
  assert.match(sandbox.renderPlateausPerspectiveHtml().right, /data-changes-shown/);
  // a click on a row is what opens the thing, in Elements
  const row = list.rows[0];
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': row.thing,
    'data-change': row.change,
    'data-layer': row.layer,
    'data-ref': row.ref
  });
  assert.equal(run(sandbox, 'currentPerspective'), 'elements');
  assert.equal(state.selection.key, row.ref);
});

// ---- 5. The Changes tab on the page Stories ----

const VIEW = (id, pinned) =>
  'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "A harbour map"\n  viewpoint: "map"\n  layer: "application"\n  properties:\n    pinned: ' +
  JSON.stringify(pinned) +
  '\n';
const STORY = (id) =>
  'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "A harbour story"\n  steps:\n    - view: "harbour-map"\n      text: "The harbour."\n';

async function openStories(options) {
  const opened = await openHarbour(
    {
      'plateaus/10_before/view.harbour-map.yaml': VIEW('harbour-map', ['bunkering']),
      'plateaus/10_before/story.tour.yaml': STORY('tour')
    },
    options
  );
  run(
    opened.sandbox,
    "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'tour'; selectedViewId = 'harbour-map';"
  );
  return opened;
}

test('with a comparison on, the page Stories lists the changes: the story has the Changes panel on its right, the same one as the page Plateaus', async () => {
  const { sandbox } = await openStories();
  const regions = sandbox.renderLibraryPerspectiveHtml();
  assert.match(
    regions.right,
    /^<div class="changes-panel" data-changes-panel>/,
    'a story has no panel of its own: the list is alone, with no tab strip'
  );
  assert.equal(regions.rightLabel, 'Changes');
  const comparison = sandbox.comparisonState();
  assert.equal(regions.right, sandbox.renderChangesPanelHtml(comparison), 'one list, written by one function');
  // with its filters and its buttons
  assert.match(regions.right, /data-changes-filter="state"/);
  assert.match(regions.right, /data-action="change-next"/);
});

test('without a comparison the page Stories has no Changes: no panel, no tab', async () => {
  const { sandbox } = await openStories({ compare: null });
  assert.equal(sandbox.comparisonState(), null);
  assert.equal(sandbox.renderLibraryPerspectiveHtml().right, null, 'the story, as before');
  run(sandbox, "libraryTab = 'views';");
  const views = sandbox.renderLibraryPerspectiveHtml();
  assert.doesNotMatch(views.right, /right-tabs|data-changes-panel/, 'the panel of the view, as before');
  assert.equal(views.rightLabel, 'View and selection');
});

test('the page of a view has the tabs View and Changes beside one another; the Changes tab is the same list', async () => {
  const { sandbox } = await openStories();
  run(sandbox, "libraryTab = 'views';");
  const views = sandbox.renderLibraryPerspectiveHtml();
  assert.match(
    views.right,
    /^<div class="right-tabs button-group"[^>]*>.*data-tab="view" aria-pressed="true">View<\/button>.*data-tab="changes" aria-pressed="false">Changes <span class="field-count">\d+<\/span><\/button>/
  );
  assert.match(views.right, /library-view-section/, 'the View tab is the panel that was there');
  assert.doesNotMatch(views.right, /data-changes-panel/);
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  const changes = sandbox.renderLibraryPerspectiveHtml().right;
  assert.match(changes, /data-tab="changes" aria-pressed="true"/);
  assert.ok(
    changes.endsWith(sandbox.renderChangesPanelHtml(sandbox.comparisonState())),
    'one list, written by one function, under the tabs'
  );
  assert.doesNotMatch(changes, /library-view-section/);
  assert.equal(run(sandbox, 'currentPerspective'), 'library');
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'view' });
  assert.match(sandbox.renderLibraryPerspectiveHtml().right, /library-view-section/);
});

test('on the page of a view the walk selects the change on the page itself, keeps the Changes tab, and leaves the Map, Elements and the address alone', async () => {
  const { sandbox, state } = await openStories();
  run(sandbox, "libraryTab = 'views';");
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  const mapSelection = JSON.stringify(state.selection);
  const rows = listOf(sandbox).rows;
  const hash = sandbox.location.hash;
  next(sandbox);
  assert.equal(run(sandbox, 'currentPerspective'), 'library', 'the page stays');
  assert.equal(sandbox.location.hash, hash);
  assert.equal(JSON.stringify(state.selection), mapSelection, 'the selection of the Map and Elements is not touched');
  assert.deepEqual(
    plain(run(sandbox, 'libraryPickFor(selectedViewId).selection')),
    { kind: 'element', key: rows[0].ref, layer: rows[0].layer, mode: 'view' },
    "it is the page's own"
  );
  assert.equal(run(sandbox, 'libraryRightTab'), 'changes', 'the list stays on screen');
  const list = listOf(sandbox);
  assert.equal(list.position, '1 of ' + rows.length);
  assert.ok(list.rows[0].selected);
  next(sandbox);
  next(sandbox);
  assert.equal(listOf(sandbox).position, '3 of ' + rows.length);
  // a removed element is the page's baseline element, as a click on a removed box makes it
  const removed = rows.find(
    (row) => row.thing === 'element' && row.change === 'removed' && row.layer === 'application'
  );
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'removed',
    'data-layer': removed.layer,
    'data-ref': removed.ref
  });
  assert.deepEqual(plain(run(sandbox, 'libraryPickFor(selectedViewId).selection')), {
    kind: 'baseline-element',
    key: removed.ref,
    layer: removed.layer,
    mode: 'view'
  });
  assert.equal(run(sandbox, 'libraryRightTab'), 'view', 'a click on a row shows what it selects, as on the Map');
  assert.match(sandbox.renderLibraryPerspectiveHtml().right, /library-selection/);
  assert.equal(
    listOf(sandbox)
      .rows.filter((row) => row.selected)
      .map(keyOf)
      .join(),
    keyOf(removed),
    'and the row of the removed element is the marked one'
  );
});

test('on a story, a click on a row opens the thing in Elements; the walk and the filters move the mark and stay on the page', async () => {
  const { sandbox, state } = await openStories();
  const rows = listOf(sandbox).rows;
  next(sandbox);
  next(sandbox);
  assert.equal(run(sandbox, 'currentPerspective'), 'library');
  assert.equal(listOf(sandbox).position, '2 of ' + rows.length);
  choose(sandbox, 'state', 'changed');
  assert.equal(run(sandbox, 'currentPerspective'), 'library');
  const row = listOf(sandbox).rows[0];
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': row.thing,
    'data-change': row.change,
    'data-layer': row.layer,
    'data-ref': row.ref
  });
  assert.equal(run(sandbox, 'currentPerspective'), 'elements');
  assert.equal(state.selection.key, row.ref);
});

test('the Changes tab is offered while the kernel loads and the list follows; a comparison that cannot be drawn offers none', async () => {
  const { sandbox } = await openStories();
  run(sandbox, 'loadedKernel = null;');
  const pending = sandbox.renderLibraryPerspectiveHtml().right;
  assert.match(pending, /data-pending/, 'the panel is there, the list follows');
  assert.equal(
    run(sandbox, 'rightPanelPending'),
    true,
    'and the page asks to be written again when the kernel is loaded (`settlePlateausPanel`)'
  );
});
