'use strict';
// The walk row of the Changes list is its own block (wave 027, run 0201, CTR-1): `.changes-reading` holds the filters and the status, and `[data-changes-walkbar]`
// follows it under `.changes-panel` and holds `.changes-walk`, so that the row can stay in view under the tabs. The pair is the invented harbour of
// `src/test/resources/replaces-large-pair/`, read as the editor reads a folder. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');
const { compareWith } = require('./layered-folders');

const HARBOUR = path.resolve(__dirname, '../../resources/replaces-large-pair');

function filesOf(root, base) {
  const out = {};
  for (const name of fs.readdirSync(path.join(root, base || ''))) {
    const relative = base ? base + '/' + name : name;
    if (fs.statSync(path.join(root, relative)).isDirectory()) Object.assign(out, filesOf(root, relative));
    else out[relative] = fs.readFileSync(path.join(root, relative), 'utf8');
  }
  return out;
}

async function openHarbour() {
  const mem = memFolder(filesOf(HARBOUR));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('after-declared');
  compareWith(sandbox, 'before');
  return sandbox;
}

/** The tags of the panel, in order, as `{ name, attrs, depth }` (void elements and the markup the panel writes only). */
function tagsOf(html) {
  const out = [];
  const stack = [];
  for (const m of html.matchAll(/<(\/?)([a-z0-9]+)([^>]*)>/g)) {
    const [, closing, name, attrs] = m;
    if (['input', 'br', 'hr', 'img'].includes(name) || attrs.endsWith('/')) continue;
    if (closing) stack.pop();
    else {
      out.push({ name, attrs, depth: stack.length, parent: stack[stack.length - 1] });
      stack.push(out[out.length - 1]);
    }
  }
  return out;
}

test('CTR-1: the walk row is one [data-changes-walkbar], a child of .changes-panel, after .changes-reading and outside it', async () => {
  const sandbox = await openHarbour();
  const html = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const tags = tagsOf(html);
  const bars = tags.filter((tag) => /data-changes-walkbar/.test(tag.attrs));
  assert.equal(bars.length, 1, 'one [data-changes-walkbar] in the panel');
  const bar = bars[0];
  assert.ok(/class="[^"]*changes-walkbar/.test(bar.attrs), 'it has the class changes-walkbar');
  assert.ok(/changes-panel/.test(bar.parent.attrs), 'a direct child of .changes-panel');
  const reading = tags.find((tag) => /class="changes-reading"/.test(tag.attrs));
  assert.ok(reading, '.changes-reading exists');
  assert.ok(/changes-panel/.test(reading.parent.attrs), '.changes-reading is a child of .changes-panel too');
  assert.ok(tags.indexOf(bar) > tags.indexOf(reading), 'the bar follows .changes-reading');
  const inside = (tag, ancestor) => {
    for (let t = tag.parent; t; t = t.parent) if (t === ancestor) return true;
    return false;
  };
  assert.ok(!inside(bar, reading), 'the bar is outside .changes-reading');
  const walk = tags.find((tag) => /class="changes-walk"/.test(tag.attrs));
  assert.ok(walk && inside(walk, bar), '.changes-walk is inside the bar');
  assert.ok(!inside(walk, reading), 'and not inside .changes-reading');
  for (const needle of [/data-action="change-previous"/, /data-action="change-next"/]) {
    assert.ok(
      tags.some((tag) => needle.test(tag.attrs) && inside(tag, bar)),
      String(needle) + ' is in the bar'
    );
  }
  assert.ok(
    tags.some((tag) => /changes-filter/.test(tag.attrs) && inside(tag, reading)),
    'the filters stay in .changes-reading'
  );
  assert.ok(
    tags.some((tag) => /data-changes-shown/.test(tag.attrs) && inside(tag, reading)),
    'the status stays in .changes-reading'
  );
});

test('REQ-4: a list with no change renders no walk bar', async () => {
  const sandbox = await openHarbour();
  const state = Object.assign({}, sandbox.comparisonState(), { changes: [] });
  const html = sandbox.renderChangesPanelHtml(state);
  assert.ok(!/data-changes-walkbar/.test(html), 'no [data-changes-walkbar]');
  assert.ok(!/data-action="change-next"/.test(html), 'and no walk buttons');
});

// ---- a short list, and every page that writes the list (REQ-4, wave 027 run 0201) ----
// The layered Brightcart (`src/test/resources/brightcart/layered/`), plateau `inhouse` compared with `saas`: 69 changes, and two filters that leave a few. The pages are read through their own
// functions (`renderPlateausPerspectiveHtml`, `renderMapPerspectiveHtml`, `renderElementsPerspectiveHtml`, `renderLibraryPerspectiveHtml`), as `changes-shortcut.test.js` reads them: the harness has no layout engine.

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const run = (sandbox, code) => vm.runInContext(code, sandbox);

async function openBrightcart(against) {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  sandbox.drawPlateau('inhouse');
  if (against) compareWith(sandbox, against);
  return sandbox;
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

const PAGES = {
  plateaus: "currentPerspective = 'plateaus';",
  applications: "currentPerspective = 'map';",
  environments: "currentPerspective = 'environments';",
  elements: "currentPerspective = 'elements'; elementTab = 'details';",
  'a view (Stories)': "currentPerspective = 'library'; libraryTab = 'views'; selectedViewId = 'applications_map';",
  'a story (Stories)': "currentPerspective = 'library'; libraryTab = 'stories'; selectedStoryId = 'order_journey';"
};

/** The right-hand region of the page on screen, as the page writes it. */
function rightOf(sandbox) {
  const perspective = run(sandbox, 'currentPerspective');
  const regions =
    perspective === 'plateaus'
      ? sandbox.renderPlateausPerspectiveHtml()
      : perspective === 'library'
        ? sandbox.renderLibraryPerspectiveHtml()
        : perspective === 'elements'
          ? sandbox.renderElementsPerspectiveHtml()
          : sandbox.renderMapPerspectiveHtml();
  return regions.right || '';
}

const barsIn = (html) => (html.match(/data-changes-walkbar/g) || []).length;

/** The classes of `html` that the style makes sticky (`position: sticky` in a rule whose selector names the class). */
function stickyClassesIn(html) {
  const present = new Set(Array.from(html.matchAll(/class="([^"]*)"/g), (m) => m[1].split(/\s+/)).flat());
  const sticky = new Set();
  for (const rule of CSS.matchAll(/([^{}]+)\{([^{}]*position:\s*sticky[^{}]*)\}/g))
    for (const selector of rule[1].split(',')) {
      // the last compound of the selector is what the rule styles: `.right-tabs.button-group` is the element that has both classes
      const compound = selector
        .trim()
        .split(/[\s>+~]+/)
        .pop();
      const names = Array.from(compound.matchAll(/\.([a-zA-Z0-9_-]+)/g), (m) => m[1]);
      if (names.length && names.every((name) => present.has(name))) sticky.add(names.join('.'));
    }
  assert.ok(!/style="[^"]*sticky/.test(html), 'no inline sticky');
  return Array.from(sticky).sort();
}

/** The buttons of the walk row in the panel: `true` when enabled, `null` when absent; and the position text. */
function walkOf(html) {
  const button = (action) => {
    const tag = html.match(new RegExp('<button type="button" data-action="' + action + '"[^>]*>'));
    return tag ? !/ disabled/.test(tag[0]) : null;
  };
  const position = html.match(/data-changes-position="\d+">(\d+ of \d+)</);
  return {
    previous: button('change-previous'),
    next: button('change-next'),
    position: position ? position[1] : null,
    showAll: /data-action="change-filters-clear"/.test(html)
  };
}

const panelOf = (sandbox) => sandbox.renderChangesPanelHtml(sandbox.comparisonState());
const shownOf = (html) => Number(html.match(/data-changes-shown="(\d+)"/)[1]);

for (const [state, layer, count] of [
  ['merged', 'application', 1],
  ['split', 'application', 2],
  ['removed', 'technology', 2]
]) {
  test(
    'REQ-4: a list of ' +
      count +
      ' (' +
      state +
      ', ' +
      layer +
      ') has one walk bar, no other sticky block than it and the tabs, and the buttons stop at the ends',
    async () => {
      const sandbox = await openBrightcart('saas');
      assert.ok(sandbox.setChangesFilter('state', state));
      assert.ok(sandbox.setChangesFilter('layer', layer));
      let html = panelOf(sandbox);
      assert.equal(shownOf(html), count, 'the filters leave ' + count + ' of the changes');
      assert.ok(count < Number(html.match(/data-changes-total="(\d+)"/)[1]), 'a short list, not the whole one');
      assert.equal(barsIn(html), 1, 'one walk bar');
      assert.deepEqual(stickyClassesIn(html), ['changes-walkbar'], 'the bar is the only sticky block of the panel');
      // nothing walked to yet: no position, and either end is one press away (Previous goes to the last change, Next to the first)
      assert.deepEqual(walkOf(html), { previous: true, next: true, position: null, showAll: true });
      for (let at = 1; at <= count; at++) {
        click(sandbox, { 'data-action': 'change-next' });
        html = panelOf(sandbox);
        assert.equal(barsIn(html), 1, 'one walk bar at ' + at);
        assert.deepEqual(walkOf(html), {
          previous: at > 1,
          next: at < count,
          position: at + ' of ' + count,
          showAll: true
        });
      }
      click(sandbox, { 'data-action': 'change-previous' });
      html = panelOf(sandbox);
      if (count > 1) assert.equal(walkOf(html).position, count - 1 + ' of ' + count, 'Previous walks back');
      assert.equal(barsIn(html), 1);
      // Show all brings every change back; the bar stays one
      click(sandbox, { 'data-action': 'change-filters-clear' });
      html = panelOf(sandbox);
      assert.equal(shownOf(html), Number(html.match(/data-changes-total="(\d+)"/)[1]));
      assert.equal(barsIn(html), 1);
      assert.equal(walkOf(html).showAll, false, 'no Show all when nothing is filtered');
    }
  );
}

test('REQ-4: a filter that leaves no change of a list that has some keeps the one bar, with both walk buttons off and Show all', async () => {
  const sandbox = await openBrightcart('saas');
  sandbox.setChangesFilter('state', 'moved');
  sandbox.setChangesFilter('layer', 'technology');
  const html = panelOf(sandbox);
  assert.equal(shownOf(html), 0);
  // the list is not empty (69 changes), only the filtered one is: the bar stays, both walk buttons off, so that Show all is in reach
  assert.equal(barsIn(html), 1, 'the bar holds Show all');
  assert.deepEqual(walkOf(html), { previous: false, next: false, position: null, showAll: true });
});

for (const [name, code] of Object.entries(PAGES)) {
  test(
    'REQ-4: ' + name + ' gets the walk bar from renderChangesPanelHtml while a comparison is on, and none without one',
    async () => {
      const compared = await openBrightcart('saas');
      run(compared, code);
      assert.ok(compared.comparisonState(), 'a comparison is on');
      let right = rightOf(compared);
      if (/^a view/.test(name)) {
        // the page of a view opens on its View tab: the list is the Changes tab
        assert.equal(barsIn(right), 0, 'the View tab is the view, not the list');
        assert.match(right, /^<div class="right-tabs button-group"/);
        click(compared, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
        right = rightOf(compared);
      }
      assert.equal(barsIn(right), 1, name + ': one walk bar');
      assert.match(right, /data-changes-panel/);
      assert.ok(right.includes(panelOf(compared)), name + ': the panel is the one renderChangesPanelHtml writes');
      const sticky = stickyClassesIn(right);
      assert.deepEqual(
        sticky,
        /^a view/.test(name) ? ['changes-walkbar', 'right-tabs.button-group'] : ['changes-walkbar'],
        name + ': the bar, and the tabs where the page has them, are the only sticky blocks'
      );
      if (/^a view/.test(name)) assert.ok(right.indexOf('right-tabs') < right.indexOf('data-changes-walkbar'));

      const alone = await openBrightcart(null);
      run(alone, code);
      assert.equal(alone.comparisonState(), null, 'no comparison');
      right = rightOf(alone);
      assert.equal(barsIn(right), 0, name + ': no walk bar without a comparison');
      assert.doesNotMatch(right, /changes-panel|right-tabs|data-action="change-(next|previous)"/);
    }
  );
}

for (const [name, layer] of [
  ['applications', 'application'],
  ['environments', 'technology'],
  ['elements', 'application']
]) {
  test(
    'REQ-4: ' + name + ' with a change selected has the tabs and, on the Changes tab, the one walk bar after them',
    async () => {
      const sandbox = await openBrightcart('saas');
      run(sandbox, PAGES[name]);
      sandbox.setChangesFilter('layer', layer);
      click(sandbox, { 'data-action': 'change-next' }); // selects the first change shown and keeps the list on screen
      let right = rightOf(sandbox);
      assert.match(right, /^<div class="right-tabs button-group"/, 'the tabs, since something is selected');
      assert.match(right, /data-tab="changes" aria-pressed="true"/);
      assert.equal(barsIn(right), 1, 'one walk bar on the Changes tab');
      assert.ok(right.indexOf('right-tabs') < right.indexOf('data-changes-walkbar'), 'the bar follows the tabs');
      assert.deepEqual(stickyClassesIn(right), ['changes-walkbar', 'right-tabs.button-group']);
      assert.equal(walkOf(right).position, '1 of ' + shownOf(right));
      // the Selected tab is the inspection: the list, and with it the bar, is one click away
      click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'selected' });
      right = rightOf(sandbox);
      assert.match(right, /data-tab="selected" aria-pressed="true"/);
      assert.equal(barsIn(right), 0, 'the inspection has no walk bar');
      assert.deepEqual(stickyClassesIn(right), ['right-tabs.button-group'], 'the tabs are the only sticky block there');
    }
  );
}
