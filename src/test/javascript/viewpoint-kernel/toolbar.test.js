'use strict';
// Wave 030, run 0217 (W-5, #194, TDD-0217 DEC-8): the toolbar of a diagram is docked before the canvas, in five named groups, one pressed convention, one *Changes only*
// toggle and a title that says what happens. Written first, red: the page still floats its tools over the canvas. The page is the real `render()` over the real kernel and a fake
// layout engine, on the layered Brightcart (the openers of header.test.js, technology-map-parts.test.js and library-view-diagram.test.js), for six surfaces (an element, the Map
// of each layer, the page of a saved view of each of the three kinds) and a story step. The controls of each surface are the table `toolbar-controls.json` (CTR-2).
// One test per check, a to h, named "check x:". Run 0218 (W-8, TDD-0218 DEC-8) adds the table's `key`, `actions` and `absent`, and the checks i: to o: (the dot, the count, Reset, what Reset
// restores, the origin, the three controls of the page of a saved view, Escape on a group panel), written first and red: the page has none of it yet. The older test `check i (F1)` keeps its name.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, plain, startPage, click, addView, openView } = require('./library-page');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const TABLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'toolbar-controls.json'), 'utf8'));
const GROUPS = TABLE.groupOrder;
const SURFACES = Object.keys(TABLE.surfaces);
const PAGE = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

/** The controls of a surface in the table, flat: `{ id, key, group }`. */
const tableControls = (surface) =>
  TABLE.surfaces[surface].groups.flatMap((g) => g.controls.map((c) => Object.assign({ group: g.name }, c)));
/** What a reader calls a control of the table, for a message. */
const NAMES = {
  'fold-all': 'Fold all',
  'unfold-all': 'Unfold all',
  'diagram-facet-select': 'the Facet select',
  'toggle-hide-unlinked': 'Hide unlinked',
  'diagram-reset': 'Reset'
};
const nameOf = (id) => NAMES[id] || id;

// ---- helpers: markup ----

/** The inside of the div whose opening tag starts at `from` in `html`, closed at its own `</div>`. */
function divInner(html, from) {
  const open = html.indexOf('>', from) + 1;
  let depth = 1;
  for (const m of html.slice(open).matchAll(/<div\b|<\/div>/g)) {
    depth += m[0] === '</div>' ? -1 : 1;
    if (depth === 0) return html.slice(open, open + m.index);
  }
  throw new Error('a div does not close: ' + html.slice(from, from + 80));
}

/** The inside of the span whose opening tag starts at `from` in `html`, closed at its own `</span>`. */
function spanInner(html, from) {
  const open = html.indexOf('>', from) + 1;
  let depth = 1;
  for (const m of html.slice(open).matchAll(/<span\b|<\/span>/g)) {
    depth += m[0] === '</span>' ? -1 : 1;
    if (depth === 0) return html.slice(open, open + m.index);
  }
  throw new Error('a span does not close: ' + html.slice(from, from + 80));
}

const attributesOf = (tag) => Object.fromEntries(Array.from(tag.matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]]));
const textOf = (html) => html.replace(/<[^>]*>/g, '').trim();

/** The toolbar of a page: its markup, or a failure that says the page has none as designed. */
function toolbarOf(html, where) {
  const from = html.indexOf('<div class="diagram-toolbar"');
  assert.notEqual(
    from,
    -1,
    where + ': there is no div.diagram-toolbar in the page (the tools still float in div.diagram-tools over the canvas)'
  );
  const tag = html.slice(from, html.indexOf('>', from) + 1);
  const attributes = attributesOf(tag);
  assert.equal(attributes.role, 'toolbar', where + ': the toolbar has role=toolbar');
  assert.equal(attributes['aria-label'], 'Diagram tools', where + ': the toolbar is named Diagram tools');
  return { from, inner: divInner(html, from) };
}

/** The key of a control in the table: its data-action plus ':' and its data-show, data-part or data-dir, or the id of a select. */
function controlKey(tag, attrs) {
  const suffix = attrs['data-show'] || attrs['data-part'] || attrs['data-dir'];
  return tag === 'select' ? attrs.id : (attrs['data-action'] || attrs.id) + (suffix ? ':' + suffix : '');
}

/** The buttons and selects of a piece of markup, as `{ key, tag, attributes, label }`. */
function controlsIn(html) {
  const controls = [];
  for (const c of html.matchAll(/<(button|select)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
    const attrs = attributesOf(c[2]);
    controls.push({ key: controlKey(c[1], attrs), tag: c[1], attributes: attrs, label: textOf(c[3]) });
  }
  return controls;
}

/**
 * The groups of a toolbar, in markup order, each with its name, its `data-group` and its controls (`{ key, tag, attributes, label }`). The controls are the ones inside
 * `span.tool-group-controls` only: the group button of the head (TDD-0218 CTR-1) is not a control of the group.
 */
function groupsOf(toolbar, where) {
  const groups = [];
  for (const m of toolbar.matchAll(/<div class="tool-group"/g)) {
    const tag = toolbar.slice(m.index, toolbar.indexOf('>', m.index) + 1);
    const attributes = attributesOf(tag);
    const inner = divInner(toolbar, m.index);
    const panel = /<span\b[^>]*class="tool-group-controls"[^>]*>/.exec(inner);
    assert.ok(panel, where + ': the group ' + attributes['aria-label'] + ' has no span.tool-group-controls');
    const controlsHtml = spanInner(inner, panel.index);
    groups.push({
      name: attributes['aria-label'],
      data: attributes['data-group'],
      role: attributes.role,
      attributes,
      inner,
      panel: attributesOf(panel[0]),
      controls: controlsIn(controlsHtml)
    });
  }
  assert.ok(groups.length > 0, where + ': the toolbar holds no div.tool-group');
  return groups;
}

/** The toolbar's own markup without its groups: what is a direct child of `div.diagram-toolbar` (Reset, the legend). */
function outsideGroups(toolbar) {
  let rest = '';
  let at = 0;
  for (const m of toolbar.matchAll(/<div class="tool-group"/g)) {
    if (m.index < at) continue;
    const tag = toolbar.slice(m.index, toolbar.indexOf('>', m.index) + 1);
    rest += toolbar.slice(at, m.index);
    at = m.index + tag.length + divInner(toolbar, m.index).length + '</div>'.length;
  }
  return rest + toolbar.slice(at);
}

// ---- helpers: the surfaces ----

/** A page on the layered Brightcart with the comparison on (so that Compare is drawn): `marketplace` against its past. */
async function basePage() {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  page.sandbox.drawPlateau('marketplace', { compare: 'past' });
  run(page.sandbox, 'diagramMaximized = false;');
  return page;
}

const OPENERS = {
  async element() {
    const page = await basePage();
    click(page.sandbox, { 'data-action': 'select-element', 'data-ref': 'commerce.cart', 'data-layer': 'application' });
    run(page.sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
    await page.show();
    return page;
  },
  async 'map-application'() {
    const page = await basePage();
    await page.go('map');
    run(page.sandbox, "mapStateOf('application').hidden = ['mailer'];"); // a chip, to place the toolbar against
    await page.show();
    return page;
  },
  async 'map-technology'() {
    const page = await basePage();
    await page.go('environments');
    run(
      page.sandbox,
      'technologyMapState.opened = new Set(["prod", "prod.dc"]); technologyMapState.hidden = ["staging", "sandbox"];'
    );
    await page.show();
    return page;
  },
  'view-element': (page) => saved(page, { id: 'v_element', viewpoint: 'deep', properties: { element: 'commerce' } }),
  'view-map-application': (page) =>
    saved(page, { id: 'v_map_app', viewpoint: 'map', layer: 'application', properties: { opened: ['commerce'] } }),
  'view-map-technology': (page) =>
    saved(page, { id: 'v_map_tech', viewpoint: 'map', layer: 'technology', properties: { opened: ['prod'] } })
};

async function saved(_unused, content) {
  const page = await basePage();
  const view = addView(page, Object.assign({ name: content.id }, content));
  await openView(page, view);
  return page;
}

const CACHE = new Map();
/** A surface of the table, opened once and shared by the read-only checks. */
function openSurface(name) {
  if (!CACHE.has(name)) CACHE.set(name, OPENERS[name]());
  return CACHE.get(name);
}

/** A story step: `fork_tour` of the layered Brightcart, at its first step. */
async function storyStep() {
  const page = await basePage();
  await page.show();
  page.sandbox.goToStoryStep('fork_tour', 0);
  await page.drawn();
  return page;
}

/** What table a story step is checked against: the element column, or the Map of the layer it draws. */
function storySurface(page) {
  if (!/data-map="true"/.test(page.html())) return 'element';
  return run(page.sandbox, 'mapLayer()') === 'technology' ? 'map-technology' : 'map-application';
}

const all = async () => {
  const pages = [];
  for (const name of SURFACES) pages.push({ name, table: name, html: (await openSurface(name)).html() });
  const step = await storyStep();
  pages.push({ name: 'story step', table: storySurface(step), html: step.html(), story: true });
  return pages;
};

// ---- the table itself ----

test('the table lists six surfaces, each with the groups in the order Draw, Texts, Layout, Compare, Frame', () => {
  assert.deepEqual(GROUPS, ['Draw', 'Texts', 'Layout', 'Compare', 'Frame']);
  assert.deepEqual(SURFACES, [
    'element',
    'map-application',
    'map-technology',
    'view-element',
    'view-map-application',
    'view-map-technology'
  ]);
  for (const name of SURFACES)
    assert.deepEqual(
      TABLE.surfaces[name].groups.map((g) => g.name),
      GROUPS,
      name
    );
});

// ---- the checks ----

test('check a: on each surface the groups present are a subsequence of Draw, Texts, Layout, Compare, Frame, in that order, named and in the tree', async () => {
  for (const { name, html } of await all()) {
    const groups = groupsOf(toolbarOf(html, name).inner, name);
    const names = groups.map((g) => g.name);
    let at = 0;
    for (const n of names) {
      const found = GROUPS.indexOf(n, at);
      assert.notEqual(found, -1, name + ': the group ' + n + ' is out of order or unknown in ' + names.join(', '));
      at = found + 1;
    }
    for (const g of groups) {
      assert.equal(g.role, 'group', name + ': ' + g.name + ' has role=group');
      assert.equal(g.data, g.name.toLowerCase(), name + ': ' + g.name + ' has its data-group');
      assert.ok(g.controls.length > 0, name + ': a group with no control is not drawn (' + g.name + ')');
    }
    // the comparison is on, a facet is defined: nothing the table lists is left out of the groups
    if (name !== 'story step')
      assert.deepEqual(names, GROUPS, name + ': every group has controls with a comparison on and a facet defined');
  }
});

test('check b: each control of the toolbar is in exactly one group or is the one listed action, and the controls of a surface are the table', async () => {
  for (const { name, table, html, story } of await all()) {
    const toolbar = toolbarOf(html, name).inner;
    const groups = groupsOf(toolbar, name);
    const seen = new Map();
    for (const g of groups)
      for (const c of g.controls) {
        assert.ok(!seen.has(c.key), name + ': ' + c.key + ' is in ' + seen.get(c.key) + ' and in ' + g.name);
        seen.set(c.key, g.name);
      }
    // outside the groups there is nothing but the actions the table lists (Reset, TDD-0218 DEC-1): a second exception fails here
    const loose = controlsIn(outsideGroups(toolbar)).map((c) => c.key);
    for (const key of loose)
      assert.ok(
        TABLE.surfaces[table].actions.includes(key),
        name +
          ': ' +
          key +
          ' is a control outside the groups and the table lists no such action: ' +
          TABLE.surfaces[table].actions
      );
    const expected = new Map();
    for (const c of tableControls(table)) expected.set(c.id, c.group);
    for (const [key, group] of seen)
      assert.equal(
        expected.get(key),
        group,
        name + ': ' + key + ' is in ' + group + ', the table puts it in ' + expected.get(key)
      );
    if (!story) {
      for (const [key, group] of expected)
        assert.ok(
          seen.has(key),
          name + ': the table puts ' + nameOf(key) + ' in ' + group + ' and the page does not draw it (' + key + ')'
        );
      assert.deepEqual(
        Array.from(seen.keys()).sort(),
        Array.from(expected.keys()).sort(),
        name + ': the controls of the page are those of the table'
      );
    }
    // a group holds the controls the table gives it, in the order of the table
    for (const g of groups)
      assert.deepEqual(
        g.controls.map((c) => c.key),
        TABLE.surfaces[table].groups
          .find((t) => t.name === g.name)
          .controls.map((c) => c.id)
          .filter((c) => seen.has(c)),
        name + ': the order of ' + g.name
      );
  }
});

test('check c: the toolbar is after the header and before the chips and the canvas, and the status line is after the canvas', async () => {
  for (const { name, html, story } of await all()) {
    const at = (needle) => html.indexOf(needle);
    const toolbar = at('<div class="diagram-toolbar"');
    assert.notEqual(toolbar, -1, name + ': there is no div.diagram-toolbar in the page');
    const canvas = at('id="diagram-canvas"');
    const status = at('<div class="diagram-status"');
    assert.ok(canvas > -1 && status > -1, name + ': the canvas and the status line are in the page');
    assert.ok(at('<div class="element-header"') < toolbar, name + ': the header comes before the toolbar');
    assert.ok(toolbar < canvas, name + ': the toolbar comes before the canvas');
    assert.ok(canvas < status, name + ': the status line comes after the canvas');
    assert.ok(toolbar < status, name + ': the status line comes after the toolbar');
    const chips = at('class="map-chip');
    if (name.startsWith('map-')) assert.notEqual(chips, -1, name + ': the opener hides a box, so a chip is drawn');
    if (chips !== -1)
      assert.ok(
        toolbar < chips && chips < canvas,
        name + ': the toolbar comes before the chips, the chips before the canvas'
      );
    // the tools no longer float in the stage that holds the canvas
    const stage = at('<div class="diagram-stage"');
    assert.ok(toolbar < stage, name + ': the toolbar is not inside the stage');
    assert.ok(
      !html.includes('<div class="diagram-tools" role="toolbar"'),
      name + ': no floating diagram-tools toolbar is left'
    );
    if (story)
      assert.ok(
        at('class="story-bar"') < at('<div class="element-header"'),
        name + ': the story bar is over the header'
      );
  }
});

test('check d: every toggle has aria-pressed, no label of a toggle names a state, and data-lit is gone', async () => {
  const TOGGLES = new Set([
    'toggle-hide-unlinked',
    'toggle-show',
    'toggle-map-part',
    'set-changes-only',
    'diagram-recenter'
  ]);
  for (const { name, html } of await all()) {
    for (const g of groupsOf(toolbarOf(html, name).inner, name))
      for (const c of g.controls) {
        const action = c.attributes['data-action'];
        const isToggle = TOGGLES.has(action) || (action === 'diagram-zoom' && c.attributes['data-dir'] === 'fit');
        if (isToggle)
          assert.match(c.attributes['aria-pressed'] || '', /^(true|false)$/, name + ': ' + c.key + ' has aria-pressed');
        else assert.equal(c.attributes['aria-pressed'], undefined, name + ': ' + c.key + ' is not a toggle');
        assert.ok(!('data-lit' in c.attributes), name + ': ' + c.key + ' has no data-lit');
      }
    assert.ok(!html.includes('data-lit'), name + ': no data-lit in the page');
  }
  assert.ok(!PAGE.includes('data-lit'), 'no data-lit anywhere in the page, script and styles');
  for (const label of ['Restore', 'Exit full screen'])
    assert.ok(!new RegExp("'" + label + "'").test(PAGE), 'no label of a toggle is the state pair ' + label);
  // Maximize keeps its label and says it is pressed; Edit text keeps its label while the text is edited
  const page = await openSurface('element');
  run(page.sandbox, 'diagramMaximized = true;');
  page.sandbox.render();
  await page.drawn();
  const maximize = /<button\b[^>]*data-action="toggle-maximize"[^>]*>[\s\S]*?<\/button>/.exec(page.html());
  assert.ok(maximize, 'the page has Maximize');
  assert.equal(textOf(maximize[0]), 'Maximize', 'Maximize keeps its label when pressed');
  assert.equal(attributesOf(maximize[0])['aria-pressed'], 'true', 'Maximize is pressed while maximized');
  run(page.sandbox, 'diagramMaximized = false;');
  const step = await storyStep();
  run(step.sandbox, 'storyBarEditing = true;');
  step.sandbox.render();
  await step.drawn();
  const edit = /<button\b[^>]*data-action="story-bar-edit"[^>]*>[\s\S]*?<\/button>/.exec(step.html());
  assert.ok(edit, 'the story bar has its Edit text button');
  assert.equal(textOf(edit[0]), 'Edit text', 'Edit text keeps its label while the text is edited');
  assert.equal(attributesOf(edit[0])['aria-pressed'], 'true');
});

test('check e: Changes only is one button with one id in both states, its data-value flips, the selector finds it again and a click sets the flag and the address', async () => {
  const page = await basePage();
  click(page.sandbox, { 'data-action': 'select-element', 'data-ref': 'commerce.cart', 'data-layer': 'application' });
  run(page.sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
  await page.show();
  const stateOf = () => {
    const groups = groupsOf(toolbarOf(page.html(), 'element').inner, 'element');
    const compare = groups.find((g) => g.name === 'Compare');
    assert.ok(compare, 'the Compare group is drawn with a comparison on');
    assert.equal(
      compare.controls.length,
      1,
      'Changes only is one button: ' + compare.controls.map((c) => c.label).join(', ')
    );
    return compare.controls[0];
  };
  const off = stateOf();
  assert.equal(off.tag, 'button');
  assert.equal(off.label, 'Changes only');
  assert.equal(off.attributes.id, 'diagram-changes-only-button');
  assert.equal(off.attributes['data-action'], 'set-changes-only');
  assert.equal(off.attributes['aria-pressed'], 'false');
  assert.equal(off.attributes['data-value'], '1', 'a click turns it on');
  assert.ok(!/>Everything</.test(page.html()), 'no Everything button');
  // the focus goes back to it by its id, in both states: the selector of the toolbar is `.diagram-toolbar button`
  const fake = (control) => ({
    id: control.attributes.id,
    getAttribute: (name) => (name in control.attributes ? control.attributes[name] : null),
    closest(selector) {
      return /\.diagram-toolbar button/.test(selector) ? this : null;
    }
  });
  assert.equal(page.sandbox.headerControlSelector(fake(off)), '#diagram-changes-only-button');
  assert.equal(run(page.sandbox, 'AppState.changesOnly'), false);
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /changes-only=/);
  click(page.sandbox, { 'data-action': off.attributes['data-action'], 'data-value': off.attributes['data-value'] });
  assert.equal(run(page.sandbox, 'AppState.changesOnly'), true, 'the click sets the flag');
  assert.match(page.sandbox.currentRouteHash(), /[?&]changes-only=1(&|$)/, 'the address key is as before');
  await page.show();
  const on = stateOf();
  assert.equal(on.label, 'Changes only', 'the label does not change');
  assert.equal(on.attributes.id, 'diagram-changes-only-button', 'the id is kept in the other state');
  assert.equal(on.attributes['aria-pressed'], 'true');
  assert.equal(on.attributes['data-value'], '0', 'a click turns it off');
  assert.equal(page.sandbox.headerControlSelector(fake(on)), '#diagram-changes-only-button');
  click(page.sandbox, { 'data-action': on.attributes['data-action'], 'data-value': on.attributes['data-value'] });
  assert.equal(run(page.sandbox, 'AppState.changesOnly'), false, 'pressed again, off');
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /changes-only=/);
});

test('check f: every button and select of the toolbar has a title that is not its label, and every key a title names is handled by handleDiagramKeydown', async () => {
  const handled = String(run((await openSurface('element')).sandbox, 'handleDiagramKeydown'));
  // the keys CTR-4 allows in a title, and the test of the handler that stands for each
  const KEYS = { '-': "'-'", 0: "'0'", '+': "'+'", C: "'c'", F: "'f'", M: "'m'", Esc: "'Escape'" };
  for (const { name, html } of await all())
    for (const g of groupsOf(toolbarOf(html, name).inner, name))
      for (const c of g.controls) {
        const title = c.attributes.title;
        assert.ok(title, name + ': ' + c.key + ' has a title');
        assert.notEqual(title, c.label, name + ': the title of ' + c.key + ' is its label');
        assert.notEqual(title, c.attributes['aria-label'], name + ': the title of ' + c.key + ' is its aria-label');
        const named = /\(([^()]+)\)\s*$/.exec(title);
        if (named) {
          assert.ok(
            named[1] in KEYS,
            name + ': the key ' + named[1] + ' in the title of ' + c.key + ' is not one CTR-4 allows'
          );
          assert.ok(handled.includes(KEYS[named[1]]), name + ': handleDiagramKeydown does not handle ' + named[1]);
        }
      }
  // the keys the titles of the frame name, as a whole: they are all in the toolbar of a page
  const frame = groupsOf(toolbarOf((await openSurface('element')).html(), 'element').inner, 'element').find(
    (g) => g.name === 'Frame'
  );
  const titles = frame.controls.map((c) => c.attributes.title).join(' | ');
  for (const key of ['(-)', '(0)', '(+)', '(C)', '(F)'])
    assert.ok(titles.includes(key), 'the titles of Frame name the key ' + key + ': ' + titles);
});

test('check g: the header of an element and of a Map has no Facet select', async () => {
  for (const name of ['element', 'map-application', 'map-technology']) {
    const html = (await openSurface(name)).html();
    const from = html.indexOf('<div class="element-header">');
    assert.notEqual(from, -1, name + ': the page has a header');
    assert.ok(!divInner(html, from).includes('diagram-facet-select'), name + ': the Facet select is in the header');
  }
});

test('check h: the Facet is in Draw on every surface, the page of a saved view included, once per page', async () => {
  for (const name of SURFACES) {
    const html = (await openSurface(name)).html();
    const draw = groupsOf(toolbarOf(html, name).inner, name).find((g) => g.name === 'Draw');
    assert.ok(draw, name + ': there is a Draw group');
    assert.ok(
      draw.controls.some((c) => c.key === 'diagram-facet-select'),
      name +
        ': the Facet select is not in Draw (a control is absent only when it can never apply, and a facet applies to every diagram)'
    );
    assert.equal(
      (html.match(/id="diagram-facet-select"/g) || []).length,
      1,
      name + ': the Facet select is in the page once'
    );
  }
});

test('check i (F1): pressing Changes only through the click handler redraws the page and puts the focus back on #diagram-changes-only-button', async () => {
  const page = await basePage();
  click(page.sandbox, { 'data-action': 'select-element', 'data-ref': 'commerce.cart', 'data-layer': 'application' });
  run(page.sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
  await page.show();
  const { document } = page.sandbox;
  const app = document.getElementById('app');
  // the button the press happens on, as the browser holds it: it is focused, and it sits in the toolbar
  const focused = [];
  const button = {
    id: 'diagram-changes-only-button',
    disabled: false,
    getAttribute: (name) =>
      ({ id: 'diagram-changes-only-button', 'data-action': 'set-changes-only', 'data-value': '1' })[name] ?? null,
    closest(selector) {
      return /\.diagram-toolbar button/.test(selector) ? this : null;
    },
    focus() {
      focused.push('#diagram-changes-only-button');
    }
  };
  const asked = [];
  app.querySelector = (selector) => {
    asked.push(selector);
    return selector === '#diagram-changes-only-button' ? button : null;
  };
  document.activeElement = button;
  click(page.sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  await page.show();
  assert.equal(run(page.sandbox, 'AppState.changesOnly'), true, 'the press set the flag');
  assert.ok(asked.includes('#diagram-changes-only-button'), 'the redraw looked for the button by its id: ' + asked);
  assert.ok(
    focused.length > 0 && focused.every((f) => f === '#diagram-changes-only-button'),
    'the focus is back on Changes only after the redraw: ' + focused
  );
  document.activeElement = undefined;
});

// ---- run 0218: the state the toolbar shows (TDD-0218 DEC-1 to DEC-8) ----

const decode = (text) =>
  text
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/&#39;/g, "'");

/** The spans of a piece of markup that carry a class: `{ attributes, text }`. */
function spansWithClass(html, className) {
  const found = [];
  for (const m of html.matchAll(/<span\b([^>]*)>([\s\S]*?)<\/span>/g)) {
    const attributes = attributesOf(m[1]);
    if ((attributes.class || '').split(/\s+/).includes(className)) found.push({ attributes, text: textOf(m[2]) });
  }
  return found;
}

/** The group button of a group's head (TDD-0218 CTR-1): `{ attributes, label, count }` or null; `count` is the text of its span.tool-group-count, null if it has none. */
function groupButtonOf(group) {
  const m = /<button\b([^>]*data-action="toggle-tool-group"[^>]*)>([\s\S]*?)<\/button>/.exec(group.inner);
  if (!m) return null;
  const counts = spansWithClass(m[2], 'tool-group-count');
  return {
    attributes: attributesOf(m[1]),
    label: decode(textOf(m[2])),
    html: m[2],
    count: counts.length ? counts[0].text : null
  };
}

/** Reset (TDD-0218 CTR-2): the direct child of the toolbar, outside the groups; null when the page has none. */
function resetOf(html, where) {
  const toolbar = toolbarOf(html, where).inner;
  const m = /<button\b([^>]*id="diagram-reset-button"[^>]*)>([\s\S]*?)<\/button>/.exec(outsideGroups(toolbar));
  if (!m) return null;
  return {
    toolbar,
    attributes: attributesOf(m[1]),
    label: decode(textOf(m[2])),
    dots: spansWithClass(m[2], 'reset-dot'),
    index: toolbar.indexOf('id="diagram-reset-button"')
  };
}

/** The controls of a group that are on, read from the group's own markup: a pressed button, a select that says `data-on="true"` (TDD-0218 DEC-5). */
const onControls = (group) =>
  group.controls.filter((c) => c.attributes['aria-pressed'] === 'true' || c.attributes['data-on'] === 'true').length;

/** The surfaces a session diagram is drawn on, with no change to the toolbar's keys: Reset is disabled on each. */
const SESSION_SURFACES = SURFACES.filter((name) => !name.startsWith('view-'));
async function cleanSurface(name) {
  if (name === 'element') return OPENERS.element();
  const page = await basePage();
  await page.go(name === 'map-application' ? 'map' : 'environments');
  await page.show();
  return page;
}

/** The keys of the toolbar as the session holds them, and what the toolbar leaves alone, as plain data. */
const keysOf = (page) =>
  plain(
    run(
      page.sandbox,
      `({ hideUnlinked: diagramHideUnlinked, facet: diagramFacet, columns: diagramColumns, show: diagramShow, parts: technologyMapParts,
          opened: Array.from(mapStateOf('application').opened || []).sort(), technologyOpened: Array.from(technologyMapState.opened || []).sort() })`
    )
  );
const sessionOf = (page) =>
  plain(
    run(
      page.sandbox,
      `({ changesOnly: AppState.changesOnly, scale: diagramScale, center: diagramCenter, pinned: mapStateOf('application').pinned,
          hidden: mapStateOf('application').hidden, selection: AppState.selection })`
    )
  );

/** One change in each group of the toolbar that a view keeps. */
const CHANGERS = {
  Draw: (page) => click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' }),
  Texts: (page) => click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'wrap' }),
  Layout: (page) => page.sandbox.chooseColumns('4')
};

/** A named view with something in each group, opened as *Open on diagram* opens it. */
async function openNamedView(page, id, name) {
  const view = addView(page, {
    id,
    name,
    viewpoint: 'overview',
    properties: {
      element: 'commerce',
      'hide-unlinked': true,
      facet: 'journey',
      qualifiers: false,
      layout: { columns: 3 }
    }
  });
  click(page.sandbox, { 'data-action': 'saved-view-open', 'data-view': view.id });
  await page.show();
  return view;
}

const NOT_ON_SAVED = ['Compare', 'Frame'];

test('the table: every control has a key (a view property or null), Compare and Frame have none, and each surface lists its actions and the controls it lacks', async () => {
  const order = plain(run((await openSurface('element')).sandbox, 'VIEW_PROPERTY_ORDER'));
  const every = new Set(SURFACES.flatMap((name) => tableControls(name).map((c) => c.id)));
  for (const name of SURFACES) {
    const controls = tableControls(name);
    assert.deepEqual(new Set(controls.map((c) => c.id)).size, controls.length, name + ': a control is listed twice');
    for (const c of controls) {
      assert.ok(c.key === null || typeof c.key === 'string', name + ': ' + c.id + ' has a key, a string or null');
      assert.ok('key' in c, name + ': ' + c.id + ' has no key');
      if (NOT_ON_SAVED.includes(c.group))
        assert.equal(c.key, null, name + ': ' + c.id + ' is in ' + c.group + ' and has a key');
      else assert.ok(order.includes(c.key), name + ': the key of ' + c.id + ' is not in VIEW_PROPERTY_ORDER: ' + c.key);
    }
    const table = TABLE.surfaces[name];
    assert.ok(Array.isArray(table.actions), name + ': the surface lists its actions');
    for (const a of table.actions)
      assert.equal(a, 'diagram-reset', name + ': the only action outside the groups is Reset');
    assert.equal(
      table.actions.includes('diagram-reset'),
      !name.startsWith('view-'),
      name + ': Reset is on every surface but the page of a saved view'
    );
    // what a surface lacks is said, with why: the table has no silent hole (a control is absent only when it can never apply)
    const present = new Set(controls.map((c) => c.id).concat(table.actions));
    const absent = table.absent.map((a) => a.id).sort();
    for (const a of table.absent)
      assert.ok(a.why && a.why.length > 10, name + ': ' + a.id + ' is absent and says no why');
    assert.deepEqual(
      absent,
      Array.from(every.add('diagram-reset'))
        .filter((id) => !present.has(id))
        .sort(),
      name + ': the absent controls are those of the other surfaces that this one lacks'
    );
  }
});

test('check i: the dot is on exactly the groups of SAVED_GROUPS, which are the groups with a keyed control, with the accessible name "Saved with the view"', async () => {
  const { sandbox } = await openSurface('element');
  // the fact: a control's key. The groups that have one, on any surface
  const keyed = GROUPS.filter((g) =>
    SURFACES.some((name) => TABLE.surfaces[name].groups.find((t) => t.name === g).controls.some((c) => c.key !== null))
  );
  assert.deepEqual(keyed, ['Draw', 'Texts', 'Layout'], 'the groups with a keyed control are Draw, Texts and Layout');
  assert.notEqual(
    run(sandbox, 'typeof SAVED_GROUPS'),
    'undefined',
    'diagram-toolbar.js defines no SAVED_GROUPS (the groups that carry the dot)'
  );
  assert.deepEqual(plain(run(sandbox, 'SAVED_GROUPS')), keyed, 'SAVED_GROUPS is the groups that have a keyed control');
  // audit: every key of the table is one a view keeps, in its canonical form
  const sample = {
    opened: ['prod'],
    facet: 'journey',
    'hide-unlinked': true,
    applications: false,
    relationships: false,
    labels: true,
    qualifiers: true,
    descriptions: true,
    wrap: true,
    layout: { columns: 7 }
  };
  const kept = plain(
    run(
      sandbox,
      'canonicalViewDefinition(' + JSON.stringify({ viewpoint: 'map', layer: 'technology', properties: sample }) + ')'
    )
  ).properties;
  const order = plain(run(sandbox, 'VIEW_PROPERTY_ORDER'));
  for (const name of SURFACES)
    for (const c of tableControls(name).filter((x) => x.key !== null)) {
      assert.ok(order.includes(c.key), c.id + ': ' + c.key + ' is not in VIEW_PROPERTY_ORDER');
      assert.ok(c.key in kept, c.id + ': a view does not keep ' + c.key + ' (canonicalViewProperties drops it)');
    }
  // the markup: one dot in each saved group, none elsewhere, and the legend after Reset on a page that has one
  for (const { name, html } of await all()) {
    const toolbar = toolbarOf(html, name).inner;
    for (const g of groupsOf(toolbar, name)) {
      const dots = spansWithClass(g.inner, 'tool-group-dot');
      if (keyed.includes(g.name)) {
        assert.equal(
          dots.length,
          1,
          name + ': ' + g.name + ' is a group a view keeps and has no dot (span.tool-group-dot)'
        );
        assert.equal(dots[0].attributes.role, 'img', name + ': the dot of ' + g.name + ' has role=img');
        assert.equal(
          dots[0].attributes['aria-label'],
          'Saved with the view',
          name + ': the dot of ' + g.name + ' is named'
        );
        assert.equal(
          dots[0].attributes.title,
          'Kept when you name the view',
          name + ': the title of the dot of ' + g.name
        );
      } else {
        assert.equal(dots.length, 0, name + ': ' + g.name + ' is not kept by a view and has a dot');
        assert.equal(g.attributes.title, 'Not part of a view', name + ': ' + g.name + ' says it is not part of a view');
      }
    }
    assert.equal(
      (toolbar.match(/aria-label="Saved with the view"/g) || []).length,
      keyed.filter((g) => groupsOf(toolbar, name).some((x) => x.name === g)).length,
      name + ': the dot is found on exactly the saved groups'
    );
    const reset = resetOf(html, name);
    if (reset) {
      const legend = spansWithClass(toolbar, 'tool-legend');
      assert.equal(legend.length, 1, name + ': the legend of the dot (span.tool-legend) is missing after Reset');
      assert.equal(legend[0].attributes['aria-hidden'], 'true', name + ': the legend is aria-hidden');
      assert.match(legend[0].text, /kept in a named view/, name + ': the legend says what the dot means');
      assert.ok(toolbar.indexOf('tool-legend') > reset.index, name + ': the legend comes after Reset');
    }
  }
});

test('check j: under 40 rem each group but Compare has a button with its count read from its own markup, Frame shows the zoom, and Compare has no button', async () => {
  for (const { name, html } of await all()) {
    const groups = groupsOf(toolbarOf(html, name).inner, name);
    for (const g of groups) {
      const button = groupButtonOf(g);
      if (g.name === 'Compare') {
        assert.equal(button, null, name + ': Compare is one control and has no group button');
        assert.equal(g.panel.id, undefined, name + ': Compare has no panel id');
        assert.equal(spansWithClass(g.inner, 'tool-group-count').length, 0, name + ': Compare has no count');
        continue;
      }
      assert.ok(button, name + ': ' + g.name + ' has no group button (button[data-action=toggle-tool-group])');
      assert.equal(button.attributes['data-group'], g.data, name + ': the button of ' + g.name + ' names its group');
      assert.equal(button.attributes['aria-controls'], 'tool-panel-' + g.data, name + ': ' + g.name + ' aria-controls');
      assert.equal(g.panel.id, 'tool-panel-' + g.data, name + ': the controls of ' + g.name + ' are the panel');
      assert.match(
        button.attributes['aria-expanded'] || '',
        /^(true|false)$/,
        name + ': ' + g.name + ' has aria-expanded'
      );
      assert.equal(
        button.attributes['aria-expanded'],
        g.attributes['data-open'],
        name + ': data-open follows aria-expanded'
      );
      assert.equal(button.attributes['aria-expanded'], 'false', name + ': a panel is closed when the page opens');
      assert.ok(button.attributes.title, name + ': the button of ' + g.name + ' has a title');
      assert.notEqual(
        button.attributes.title,
        button.label,
        name + ': the title of the ' + g.name + ' button is its label'
      );
      assert.ok(
        button.label.includes(g.name),
        name + ': the button of ' + g.name + ' carries the name: ' + button.label
      );
      if (g.name === 'Frame') {
        const zoom = g.controls.find((c) => c.attributes.id === 'diagram-zoom-label');
        assert.ok(
          button.label.includes(zoom.label),
          name + ': Frame shows the zoom (' + zoom.label + '): ' + button.label
        );
      } else {
        assert.notEqual(
          button.count,
          null,
          name + ': the button of ' + g.name + ' has no count (span.tool-group-count)'
        );
        assert.equal(
          button.count,
          String(onControls(g)),
          name + ': the count of ' + g.name + ' is the controls that are on in its markup'
        );
      }
    }
  }
  // after a toggle: the count follows, from the same markup, and a control that is a choice counts when one is chosen
  const page = await OPENERS.element();
  const counts = () =>
    Object.fromEntries(
      groupsOf(toolbarOf(page.html(), 'element').inner, 'element')
        .filter((g) => ['Draw', 'Texts', 'Layout'].includes(g.name))
        .map((g) => [
          g.name,
          {
            shown: groupButtonOf(g).count,
            markup: String(onControls(g)),
            select: g.controls.some((c) => c.attributes['data-on'] === 'true')
          }
        ])
    );
  const countOf = (group) => {
    const c = counts()[group];
    assert.equal(c.shown, c.markup, group + ': the count shown is the count of the markup');
    return Number(c.shown);
  };
  const base = { Draw: countOf('Draw'), Texts: countOf('Texts'), Layout: countOf('Layout') };
  assert.equal(base.Draw, 0, 'nothing in Draw is on with the defaults');
  assert.equal(base.Layout, 0, 'no number of columns is chosen with the defaults');
  const wrapWasOn =
    groupsOf(toolbarOf(page.html(), 'element').inner, 'element')
      .find((g) => g.name === 'Texts')
      .controls.find((c) => c.key === 'toggle-show:wrap').attributes['aria-pressed'] === 'true';
  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await page.show();
  assert.equal(countOf('Draw'), 1, 'Hide unlinked is on: Draw counts 1');
  page.sandbox.handleAppInput({ target: { id: 'diagram-facet-select', value: 'journey', matches: () => false } });
  await page.show();
  assert.equal(countOf('Draw'), 2, 'a Facet is chosen: Draw counts 2');
  assert.ok(counts().Draw.select, 'the Facet select says data-on="true" when one is chosen');
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'wrap' });
  await page.show();
  assert.equal(countOf('Texts'), base.Texts + (wrapWasOn ? -1 : 1), 'Wrap flipped: Texts counts one more or one less');
  page.sandbox.chooseColumns('3');
  await page.show();
  assert.equal(countOf('Layout'), 1, 'a number of columns is chosen: Layout counts 1');
  assert.ok(counts().Layout.select, 'Columns says data-on="true" when a number is chosen');
  page.sandbox.chooseColumns('');
  await page.show();
  assert.equal(countOf('Layout'), 0, 'no number chosen: Layout counts 0');
});

test('check k: Reset is after Layout on every surface but the page of a saved view, aria-disabled while the diagram equals its origin, and named after it', async () => {
  const labelled = (reset, where) => {
    assert.equal(reset.attributes['data-action'], 'diagram-reset', where + ': Reset has its action');
    assert.equal(
      reset.attributes.disabled,
      undefined,
      where + ': Reset is aria-disabled, never disabled (it would lose the focus)'
    );
    assert.equal(reset.attributes.type, 'button', where + ': Reset is a button of type button');
    assert.ok(
      reset.attributes.title && reset.attributes.title !== reset.label,
      where + ': Reset has a title that is not its label'
    );
  };
  const equalAndNamed = (html, where, label) => {
    const reset = resetOf(html, where);
    assert.ok(reset, where + ': there is no #diagram-reset-button in the toolbar');
    labelled(reset, where);
    assert.equal(
      reset.attributes['aria-disabled'],
      'true',
      where + ': Reset is aria-disabled while the diagram equals its origin'
    );
    assert.equal(reset.dots.length, 0, where + ': no dot on Reset while the diagram equals its origin');
    assert.equal(reset.label, label, where + ': the name of Reset');
    for (const word of ['Draw, Texts and Layout', 'Changes only'])
      assert.ok(
        reset.attributes.title.includes(word),
        where + ': the title of Reset says what it restores or spares (' + word + '): ' + reset.attributes.title
      );
    const toolbar = reset.toolbar;
    assert.ok(reset.index > toolbar.indexOf('data-group="layout"'), where + ': Reset is after Layout');
    if (toolbar.includes('data-group="compare"'))
      assert.ok(reset.index < toolbar.indexOf('data-group="compare"'), where + ': Reset is before Compare');
    return reset;
  };
  // a diagram with no origin: the defaults are its origin
  for (const name of SESSION_SURFACES) equalAndNamed((await cleanSurface(name)).html(), name, 'Reset to defaults');
  // a page of a saved view: no Reset, and no mention of it
  for (const name of SURFACES.filter((n) => n.startsWith('view-'))) {
    const html = (await openSurface(name)).html();
    assert.equal(resetOf(html, name), null, name + ': the page of a saved view has no Reset');
    assert.ok(!html.includes('diagram-reset'), name + ': nothing of Reset is on the page of a saved view');
  }
  // after Open on diagram: the origin is the view, and the label says so
  const page = await OPENERS.element();
  await openNamedView(page, 'v_origin', 'Origin view');
  equalAndNamed(page.html(), 'opened view', 'Reset to "Origin view"');
  // after a step of a story: the origin is the view of the step
  const step = await storyStep();
  const stepName = plain(run(step.sandbox, "viewLabel(findSavedView('shop_overview'))"));
  equalAndNamed(step.html(), 'story step', 'Reset to "' + step.sandbox.diagramTruncate(stepName, 24) + '"');
  // a change enables it, with its dot; the click handler ignores it while it says aria-disabled (RISK-5)
  const changed = await OPENERS.element();
  click(changed.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await changed.show();
  const enabled = resetOf(changed.html(), 'changed');
  assert.notEqual(enabled.attributes['aria-disabled'], 'true', 'Reset is enabled once the diagram differs');
  assert.equal(enabled.dots.length, 1, 'Reset carries span.reset-dot once the diagram differs');
  assert.equal(enabled.dots[0].attributes['aria-hidden'], 'true', 'the dot of Reset is aria-hidden');
  assert.match(enabled.attributes.title, /differs/, 'the title of an enabled Reset says the diagram differs');
  click(changed.sandbox, { 'data-action': 'diagram-reset', 'aria-disabled': 'true' });
  assert.equal(
    run(changed.sandbox, 'diagramHideUnlinked'),
    true,
    'a click on a Reset that says aria-disabled does nothing'
  );
  click(changed.sandbox, { 'data-action': 'diagram-reset' });
  assert.equal(
    run(changed.sandbox, 'diagramHideUnlinked'),
    false,
    'a click on an enabled Reset puts Hide unlinked back'
  );
  // the focus stays on it: the selector of the toolbar finds it again by its id
  const fake = {
    id: 'diagram-reset-button',
    getAttribute: (n) => ({ id: 'diagram-reset-button', 'data-action': 'diagram-reset' })[n] ?? null,
    closest() {
      return /\.diagram-toolbar button/.test(arguments[0]) ? this : null;
    }
  };
  assert.equal(
    changed.sandbox.headerControlSelector(fake),
    '#diagram-reset-button',
    'the focus goes back to Reset by its id'
  );
});

test('check l: a change in Draw, in Texts or in Layout enables Reset, and pressing it puts the origin back and the address as it was, leaving Changes only, the zoom, the pins and the selection', async () => {
  const cases = {
    'no origin (the defaults)': async () => {
      const page = await cleanSurface('map-application');
      run(page.sandbox, "mapStateOf('application').pinned = ['commerce'];");
      return page;
    },
    'an opened view': async () => {
      const page = await OPENERS.element();
      await openNamedView(page, 'v_origin', 'Origin view');
      return page;
    }
  };
  for (const [label, open] of Object.entries(cases)) {
    const page = await open();
    click(page.sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
    run(page.sandbox, 'diagramScale = 1.5;');
    await page.show();
    const origin = keysOf(page);
    const session = sessionOf(page);
    const address = page.sandbox.currentRouteHash();
    const reset = () => {
      const found = resetOf(page.html(), label);
      assert.ok(found, label + ': there is no Reset (#diagram-reset-button) in the toolbar');
      return found;
    };
    assert.equal(reset().attributes['aria-disabled'], 'true', label + ': Reset starts disabled');
    // one group at a time: each enables Reset and Reset undoes it alone
    for (const group of Object.keys(CHANGERS)) {
      CHANGERS[group](page);
      await page.show();
      assert.notEqual(reset().attributes['aria-disabled'], 'true', label + ': a change in ' + group + ' enables Reset');
      assert.notDeepEqual(keysOf(page), origin, label + ': the change in ' + group + ' changed a key');
      click(page.sandbox, { 'data-action': 'diagram-reset' });
      await page.show();
      assert.deepEqual(keysOf(page), origin, label + ': Reset puts back what ' + group + ' changed');
      assert.equal(reset().attributes['aria-disabled'], 'true', label + ': Reset is disabled again after ' + group);
    }
    // all three, then once
    for (const group of Object.keys(CHANGERS)) CHANGERS[group](page);
    await page.show();
    assert.notDeepEqual(keysOf(page), origin, label + ': the three groups changed');
    click(page.sandbox, { 'data-action': 'diagram-reset' });
    await page.show();
    assert.deepEqual(keysOf(page), origin, label + ': Reset puts the three groups back to the origin');
    assert.equal(page.sandbox.currentRouteHash(), address, label + ': the address is that of the first drawing');
    assert.deepEqual(
      sessionOf(page),
      session,
      label + ': Changes only, the zoom, the pins and the selection are as they were'
    );
    assert.equal(run(page.sandbox, 'AppState.changesOnly'), true, label + ': Changes only is still on');
    assert.equal(reset().attributes['aria-disabled'], 'true', label + ': Reset is disabled again');
  }
});

test('check m: the origin is cleared by leaving the page, by selecting another element and by closing the folder', async () => {
  const hasOrigin = (page) => {
    assert.equal(
      run(page.sandbox, 'typeof currentDiagramOrigin'),
      'function',
      'view-recipe.js defines no currentDiagramOrigin() (the origin of the diagram, TDD-0218 DEC-3)'
    );
    return run(page.sandbox, 'currentDiagramOrigin()') !== null;
  };
  const named = async () => {
    const page = await OPENERS.element();
    await openNamedView(page, 'v_origin', 'Origin view');
    assert.ok(hasOrigin(page), 'Open on diagram records an origin');
    assert.equal(resetOf(page.html(), 'opened view').label, 'Reset to "Origin view"');
    return page;
  };
  // leaving the page, and coming back
  let page = await named();
  await page.go('map');
  assert.ok(!hasOrigin(page), 'the Map is another page: the origin is gone');
  page.sandbox.setPerspective('elements');
  await page.show();
  assert.ok(!hasOrigin(page), 'back on the page of the element the origin does not come back');
  assert.equal(
    resetOf(page.html(), 'back').label,
    'Reset to defaults',
    'Reset names the defaults after the reader came back'
  );
  // selecting another element
  page = await named();
  click(page.sandbox, { 'data-action': 'select-element', 'data-ref': 'commerce.cart', 'data-layer': 'application' });
  await page.show();
  assert.ok(!hasOrigin(page), 'another element is selected: the origin is gone');
  assert.equal(
    resetOf(page.html(), 'other element').label,
    'Reset to defaults',
    'Reset names the defaults for another element'
  );
  // closing the folder: the session state is forgotten with the rest, even if the reader is back on the same page and the same element
  page = await named();
  const origin = plain(run(page.sandbox, 'diagramOrigin'));
  run(page.sandbox, 'resetUiState();');
  run(page.sandbox, "currentPerspective = '" + origin.perspective + "';");
  assert.equal(run(page.sandbox, 'diagramOrigin'), null, 'resetUiState forgets the origin (folder-session.js)');
  assert.equal(run(page.sandbox, 'currentDiagramOrigin()'), null, 'no origin is read after the folder is closed');
});

test('check n: the page of a saved view has Fold all and Unfold all (a Map view) and the Facet (every view), and one press edits the view and not the session', async () => {
  for (const name of ['view-map-application', 'view-map-technology', 'view-element']) {
    const page = await OPENERS[name]();
    const isMap = name !== 'view-element';
    const layer = name === 'view-map-technology' ? 'technology' : 'application';
    const draw = groupsOf(toolbarOf(page.html(), name).inner, name).find((g) => g.name === 'Draw');
    const keys = draw.controls.map((c) => c.key);
    for (const id of ['fold-all', 'unfold-all'])
      assert.equal(
        keys.includes(id),
        isMap,
        name +
          ': ' +
          nameOf(id) +
          (isMap ? ' is missing from the page of a Map view' : ' is on the page of an element view')
      );
    assert.ok(keys.includes('diagram-facet-select'), name + ': the Facet is missing from the page of a saved view');
    const view = () =>
      plain(
        run(
          page.sandbox,
          'findSavedView(' +
            JSON.stringify(
              name === 'view-element' ? 'v_element' : name === 'view-map-application' ? 'v_map_app' : 'v_map_tech'
            ) +
            ')'
        )
      );
    const session = () =>
      plain(
        run(
          page.sandbox,
          `({ facet: diagramFacet, opened: Array.from(mapStateOf(${JSON.stringify(layer)}).opened || []).sort() })`
        )
      );
    const before = session();
    if (isMap) {
      const opened = view().properties.opened;
      assert.ok(opened && opened.length, name + ': the view opens a box');
      click(page.sandbox, { 'data-action': 'fold-all' });
      await page.show();
      assert.equal(view().properties.opened, undefined, name + ': Fold all removes opened from the view');
      assert.deepEqual(session(), before, name + ': Fold all leaves the session alone');
      // the scene before the press: the press redraws, and the new scene lists the boxes still folded one level down
      const expandable = page.scene() && page.scene().expandable;
      assert.ok(
        Array.isArray(expandable) && expandable.length,
        name + ': the scene lists the boxes Unfold all may open'
      );
      click(page.sandbox, { 'data-action': 'unfold-all' });
      await page.show();
      const unfolded = view().properties.opened;
      assert.ok(
        Array.isArray(unfolded) && unfolded.length > 0,
        name + ': Unfold all writes opened into the view (the scene has boxes to open)'
      );
      assert.deepEqual(unfolded, unfolded.slice().sort(), name + ': opened is written sorted');
      assert.deepEqual(
        unfolded,
        Array.from(new Set(expandable)).sort(),
        name + ': opened is the union of the view and the boxes the scene says are expandable'
      );
      assert.deepEqual(session(), before, name + ': Unfold all leaves the session alone');
    }
    page.sandbox.handleAppInput({ target: { id: 'diagram-facet-select', value: 'journey', matches: () => false } });
    await page.show();
    assert.equal(view().properties.facet, 'journey', name + ': the Facet writes facet into the view');
    assert.deepEqual(
      session(),
      before,
      name + ': the Facet leaves diagramFacet and the Map opened of the session alone'
    );
  }
});

test('check o: Escape closes an open group panel and puts the focus on its group button, a second press of the button closes it, and another group replaces it', async () => {
  const page = await OPENERS.element();
  // the focus the page gives back: any selector that names the Texts group button finds this fake
  const focused = [];
  const asked = [];
  const app = page.sandbox.document.getElementById('app');
  const button = { focus: () => focused.push('texts'), getAttribute: () => null };
  app.querySelector = (selector) => {
    asked.push(selector);
    return /texts/i.test(selector) && !/^#tool-panel-/.test(selector) ? button : null;
  };
  const groupOf = (name) => groupsOf(toolbarOf(page.html(), 'element').inner, 'element').find((g) => g.name === name);
  const open = async (name) => {
    const b = groupButtonOf(groupOf(name));
    assert.ok(b, name + ' has a group button to press');
    click(page.sandbox, b.attributes);
    await page.show();
  };
  const isOpen = (name) => {
    const g = groupOf(name);
    assert.equal(
      groupButtonOf(g).attributes['aria-expanded'],
      g.attributes['data-open'],
      name + ': aria-expanded and data-open agree'
    );
    return g.attributes['data-open'] === 'true';
  };
  await open('Texts');
  assert.ok(isOpen('Texts'), 'pressing the Texts button opens its panel');
  // a control inside the panel redraws the page with the panel still open
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'wrap' });
  await page.show();
  assert.ok(isOpen('Texts'), 'the panel stays open across a toggle inside it');
  // Escape, with the focus in the toolbar
  const event = {
    key: 'Escape',
    ctrlKey: false,
    metaKey: false,
    altKey: false,
    preventDefault() {},
    target: { closest: () => ({}) }
  };
  focused.length = 0;
  page.sandbox.handleDiagramKeydown(event);
  await page.show();
  assert.ok(!isOpen('Texts'), 'Escape closes the open panel');
  assert.ok(
    focused.length > 0,
    'Escape puts the focus on the Texts group button: the page asked for ' + asked.slice(-3).join(' | ')
  );
  // a second press of the group button closes it
  await open('Texts');
  assert.ok(isOpen('Texts'), 'the panel opens again');
  await open('Texts');
  assert.ok(!isOpen('Texts'), 'a second press of the group button closes the panel');
  // another group replaces it
  await open('Texts');
  await open('Layout');
  assert.ok(isOpen('Layout') && !isOpen('Texts'), 'opening Layout closes Texts: one panel at a time');
  // with no panel open, Escape is the old Escape: it leaves Maximize
  await open('Layout');
  assert.ok(!isOpen('Layout'), 'Layout is closed');
  run(page.sandbox, 'diagramMaximized = true;');
  page.sandbox.handleDiagramKeydown(event);
  assert.equal(run(page.sandbox, 'diagramMaximized'), false, 'Escape with no panel open still leaves Maximize');
});
