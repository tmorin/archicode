'use strict';
// Wave 030, run 0217 (W-5, #194, TDD-0217 DEC-8): the toolbar of a diagram is docked before the canvas, in five named groups, one pressed convention, one *Changes only*
// toggle and a title that says what happens. Written first, red: the page still floats its tools over the canvas. The page is the real `render()` over the real kernel and a fake
// layout engine, on the layered Brightcart (the openers of header.test.js, technology-map-parts.test.js and library-view-diagram.test.js), for six surfaces (an element, the Map
// of each layer, the page of a saved view of each of the three kinds) and a story step. The controls of each surface are the table `toolbar-controls.json` (CTR-2).
// One test per check, a to h, named "check x:".
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, startPage, click, addView, openView } = require('./library-page');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const TABLE = JSON.parse(fs.readFileSync(path.join(__dirname, 'toolbar-controls.json'), 'utf8'));
const GROUPS = TABLE.groupOrder;
const SURFACES = Object.keys(TABLE.surfaces);
const PAGE = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

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

/** The groups of a toolbar, in markup order, each with its name, its `data-group` and its controls (`{ key, tag, attributes, label }`). */
function groupsOf(toolbar, where) {
  const groups = [];
  for (const m of toolbar.matchAll(/<div class="tool-group"/g)) {
    const tag = toolbar.slice(m.index, toolbar.indexOf('>', m.index) + 1);
    const attributes = attributesOf(tag);
    const inner = divInner(toolbar, m.index);
    const controls = [];
    for (const c of inner.matchAll(/<(button|select)\b([^>]*)>([\s\S]*?)<\/\1>/g)) {
      const attrs = attributesOf(c[2]);
      const suffix = attrs['data-show'] || attrs['data-part'] || attrs['data-dir'];
      const key = c[1] === 'select' ? attrs.id : (attrs['data-action'] || attrs.id) + (suffix ? ':' + suffix : '');
      controls.push({ key, tag: c[1], attributes: attrs, label: textOf(c[3]) });
    }
    groups.push({ name: attributes['aria-label'], data: attributes['data-group'], role: attributes.role, controls });
  }
  assert.ok(groups.length > 0, where + ': the toolbar holds no div.tool-group');
  return groups;
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

test('check b: each control of the toolbar is in exactly one group, and the controls of a surface are the table', async () => {
  for (const { name, table, html, story } of await all()) {
    const groups = groupsOf(toolbarOf(html, name).inner, name);
    const seen = new Map();
    for (const g of groups)
      for (const c of g.controls) {
        assert.ok(!seen.has(c.key), name + ': ' + c.key + ' is in ' + seen.get(c.key) + ' and in ' + g.name);
        seen.set(c.key, g.name);
      }
    const expected = new Map();
    for (const g of TABLE.surfaces[table].groups) for (const c of g.controls) expected.set(c, g.name);
    for (const [key, group] of seen)
      assert.equal(
        expected.get(key),
        group,
        name + ': ' + key + ' is in ' + group + ', the table puts it in ' + expected.get(key)
      );
    if (!story)
      assert.deepEqual(
        Array.from(seen.keys()).sort(),
        Array.from(expected.keys()).sort(),
        name + ': the controls of the page are those of the table'
      );
    // a group holds the controls the table gives it, in the order of the table
    for (const g of groups)
      assert.deepEqual(
        g.controls.map((c) => c.key),
        TABLE.surfaces[table].groups.find((t) => t.name === g.name).controls.filter((c) => seen.has(c)),
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

test('check h: the Facet is in Draw on an element and on a Map, and not on the page of a saved view', async () => {
  for (const name of SURFACES) {
    const html = (await openSurface(name)).html();
    const draw = groupsOf(toolbarOf(html, name).inner, name).find((g) => g.name === 'Draw');
    assert.ok(draw, name + ': there is a Draw group');
    const hasFacet = draw.controls.some((c) => c.key === 'diagram-facet-select');
    assert.equal(hasFacet, !name.startsWith('view-'), name + ': the Facet select in Draw');
    assert.equal(
      (html.match(/id="diagram-facet-select"/g) || []).length,
      hasFacet ? 1 : 0,
      name + ': the Facet select is in the page ' + (hasFacet ? 'once' : 'nowhere')
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
