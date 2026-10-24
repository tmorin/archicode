'use strict';
// Reading a comparison in the editor (run 0040): the Changes panel (counts, two lists, state chips with a glyph and a word), the "What changed" block of the
// inspection (before and after), the Changes only filter, hiding the wording-only changes, the selection in the address, the marks in the trees. All of it
// is active only while a plateau is compared on the band (wave 014, run 0084: the plateaus are layers, see layered-folders.js); with nothing compared the editor is what it was. The harness has no DOM and no layout engine: the markup is checked
// from the real kernel and a fake layout, and the look itself in a browser (see the run's document). Everything here is invented.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles, openLayered, compareWith } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const text = (html) =>
  html
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&rarr;/g, '→')
    .replace(/\s+/g, ' ')
    .trim();

function fakeLayout(graph) {
  const place = (node, x) =>
    Object.assign({}, node, {
      x,
      y: 0,
      width: node.width || 400,
      height: node.height || 200,
      children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
    });
  return Object.assign(place(graph, 0), {
    width: 900,
    height: 600,
    edges: graph.edges.map((edge) =>
      Object.assign({}, edge, {
        sections: [{ startPoint: { x: 1, y: 1 }, bendPoints: [{ x: 5, y: 1 }], endPoint: { x: 9, y: 9 } }],
        labels: (edge.labels || []).map((label) => Object.assign({ x: 3, y: 3 }, label))
      })
    )
  });
}

// ---- an invented bookshop in two plateaus, with one change of every kind ----

const element = (kind, parent, id, name, extra) =>
  'header:\n  kind: "archicode.morin.io/' +
  kind +
  '"\n' +
  (parent ? '  parent: "' + parent + '"\n' : '') +
  '  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n' +
  (extra || '');
const rel = (destination, label) =>
  '  relationships:\n' +
  []
    .concat(destination)
    .map((d, i) => '    - destination: "' + d + '"\n      label: "' + [].concat(label)[i] + '"\n')
    .join('');
const described = (description) => '  description: "' + description + '"\n';

const AS_IS = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  'app.shop.web.yaml': element(
    'container',
    'shop',
    'web',
    'Web',
    rel(['shop.session', 'shop.db'], ['stores', 'reads'])
  ),
  'app.shop.db.yaml': element('container', 'shop', 'db', 'Database', described('Keeps the orders.')),
  'app.shop.session.yaml': element('container', 'shop', 'session', 'Session store', '  qualifiers: [Redis]\n'),
  'app.customer.yaml': element('person', null, 'customer', 'Customer', rel('shop.web', 'browses')),
  'app.reports.yaml': element('system', null, 'reports', 'Reports'),
  'app.reports.daily.yaml': element('container', 'reports', 'daily', 'Daily report', described('Runs at night.'))
};
const TO_BE = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  'app.shop.web.yaml': element(
    'container',
    'shop',
    'web',
    'Web storefront',
    rel(['shop.cache', 'shop.db'], ['caches in', 'reads'])
  ),
  'app.shop.db.yaml': element('container', 'shop', 'db', 'Database', described('Keeps the orders of the shop.')),
  'app.shop.cache.yaml': element(
    'container',
    'shop',
    'cache',
    'Cache',
    described('Answers the pages that were asked before.') + '  qualifiers: [Redis]\n' + rel('shop.db', 'fills from')
  ),
  'app.customer.yaml': element('person', null, 'customer', 'Customer', rel('shop.web', 'visits')),
  'app.reports.yaml': element('system', null, 'reports', 'Reports'),
  'app.reports.daily.yaml': element('container', 'reports', 'daily', 'Daily report', described('Runs every night.'))
};
const folder = (dir, files) =>
  Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));
const PLATEAU_LIST = [
  { id: 'as-is', name: 'As is', path: 'plateaus/10_as-is' },
  { id: 'to-be', name: 'To be', path: 'plateaus/30_to-be' }
];
const FILES = Object.assign({}, folder('10_as-is', AS_IS), folder('30_to-be', TO_BE));

function storage() {
  const values = new Map();
  return {
    values,
    getItem: (k) => (values.has(k) ? values.get(k) : null),
    setItem: (k, v) => values.set(k, String(v)),
    removeItem: (k) => values.delete(k)
  };
}

/**
 * The bookshop opened as the editor opens a folder, with the kernel loaded, as layers (see layered-folders.js): the two states are siblings over an empty baseline, `to-be`
 * is drawn and `compare` is the plateau to compare it with on the band ('' for nothing).
 */
async function open(compare, options = {}) {
  const opened = await openLayered(createApp, memFolder, layeredFiles(PLATEAU_LIST, FILES), {
    drawn: 'to-be',
    app: options,
    hash: options.hash
  });
  if (compare) compareWith(opened.sandbox, compare);
  return opened;
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

/** The attributes of the first button of `html` whose opening tag holds `needle`. */
function attributesOf(html, needle) {
  const tag = html.match(new RegExp('<button[^>]*' + needle + '[^>]*>'))[0];
  const attributes = {};
  for (const m of tag.matchAll(/([a-z-]+)="([^"]*)"/g))
    attributes[m[1]] = m[2].replace(/&quot;/g, '"').replace(/&amp;/g, '&');
  return attributes;
}

/** The "What changed" section of a panel, and nothing around it. */
function blockOf(panel) {
  const start = panel.indexOf('<section class="what-changed"');
  assert.ok(start >= 0, 'the panel has the block');
  return panel.slice(start, panel.indexOf('</section>', start) + '</section>'.length);
}

/** A drawing of the kernel's answer, as the page draws it, and the scene a click on a link reads its pair from. */
async function draw(sandbox, viewpoint, reference, options = {}) {
  run(sandbox, "currentPerspective = '" + (viewpoint === 'map' ? 'map' : 'elements') + "';");
  const kernel = await sandbox.loadViewpointKernel();
  const { input } = sandbox.buildKernelInput(
    viewpoint,
    reference,
    Object.assign(viewpoint === 'map' ? { opened: ['shop', 'reports'] } : {}, options.input)
  );
  const result = kernel.compute(input);
  assert.equal(result.error, undefined);
  const comparison = sandbox.comparisonState();
  if (comparison && comparison.layers) sandbox.tellRemovedItems(result, comparison, input.layer);
  const graph = sandbox.buildElkGraph(result, { captions: false });
  const drawing = sandbox.renderDiagramSvg(fakeLayout(graph), result, reference, {
    map: viewpoint === 'map',
    show: { labels: false },
    layer: input.layer,
    opened: [],
    pinned: []
  });
  sandbox.__scene = {
    viewKey: 'k',
    html: drawing.html,
    hasSvg: true,
    links: drawing.links,
    boxes: drawing.boxes,
    drawnIds: new Set(Object.keys(drawing.boxes)),
    status: '',
    legend: '',
    width: drawing.width,
    height: drawing.height,
    focal: null
  };
  run(sandbox, 'diagramScene = __scene;');
  return { input, result, drawing, svg: drawing.html, comparison };
}

function nodeOf(svg, id) {
  const at = svg.indexOf('data-id="' + id + '"');
  assert.ok(at > 0, id + ' is drawn');
  const start = svg.lastIndexOf('<g class="dg-node', at);
  const ends = [
    '<g class="dg-node',
    '<g class="dg-links"',
    '<g class="dg-link"',
    '<g class="dg-fold"',
    '<text class="dg-label"',
    '</svg>'
  ]
    .map((m) => svg.indexOf(m, start + 10))
    .filter((i) => i > 0);
  return svg.slice(start, Math.min(...ends));
}
const pillsOf = (node) =>
  Array.from(
    node.matchAll(/<g class="dg-badge[^"]*"[^>]*>(?:<rect [^>]*\/>)<text [^>]*>([^<]*)<\/text><\/g>/g),
    (m) => m[1]
  );

// ---- 1. The Changes panel ----

test('with a comparison the right-hand panel is the Changes panel when nothing is selected, on the Map and in Elements, reachable without a click', async () => {
  const { sandbox } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  const onMap = sandbox.renderMapPerspectiveHtml().right;
  assert.match(
    onMap,
    /^<div class="changes-panel" data-changes-panel>/,
    'the panel alone, no tab strip: there is nothing selected to tell it from'
  );
  assert.doesNotMatch(onMap, /right-tabs/);
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  assert.match(
    sandbox.renderElementsPerspectiveHtml().right,
    /data-changes-panel/,
    'also in Elements, whatever tab is shown'
  );
  assert.match(sandbox.renderShellHtml(), /<aside id="panel-right" class="right-panel[^"]*" aria-label="Inspection"/);
});

test('the counts: elements and relationships, new, changed and removed, each a chip with a glyph, a number and a word', async () => {
  const { sandbox } = await open('as-is');
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const counts = panel.slice(
    panel.indexOf('<div class="changes-counts"'),
    panel.indexOf('<label class="changes-toggle"')
  );
  assert.equal(text(counts), 'Elements + 1 new ~ 4 changed − 1 removed Relationships + 2 new ~ 1 changed − 1 removed');
  assert.match(panel, /<p class="changes-compared">To be compared with As is\.<\/p>/);
});

test('a chip is its glyph and its word, in the look of the state; the glyph is never the only carrier', async () => {
  const { sandbox, state } = await open('as-is');
  for (const [name, glyph] of [
    ['new', '+'],
    ['changed', '~'],
    ['removed', '−']
  ]) {
    const chip = sandbox.changeChipHtml(name);
    assert.match(chip, new RegExp('data-state="' + name + '"'));
    assert.ok(
      chip.endsWith('<span class="change-glyph" aria-hidden="true">' + glyph + '</span> ' + name + '</span>'),
      'the word follows the glyph and is not hidden from a screen reader'
    );
  }
  assert.match(sandbox.changeChipHtml('new', 3), /\+<\/span> <span class="change-count">3<\/span> new<\/span>$/);
  // an entry of styles with the name of the state styles the chip as it styles the pill of a box
  state.workspace.styles = { 'by-tags': { new: { 'line-color': '#123456' } } };
  assert.match(sandbox.changeChipHtml('new'), /--st-stroke:#123456/);
});

test('the lists: Elements and Relationships, ordered new, changed, removed, each row naming the thing, its reference and what changed in it', async () => {
  const { sandbox } = await open('as-is');
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  const lists = panel.split('<h4 class="inspection-subhead">').slice(1);
  assert.equal(lists.length, 2);
  const rows = (html) => Array.from(html.matchAll(/<li><button[^>]*>([\s\S]*?)<\/button><\/li>/g), (m) => text(m[1]));
  assert.deepEqual(rows(lists[0]), [
    '+ new Cache shop.cache',
    '~ changed Customer customer relationships changed',
    '~ changed Daily report reports.daily description (wording only)',
    '~ changed Database shop.db description (wording only)',
    '~ changed Web storefront shop.web name, relationships added, relationships removed',
    '− removed Session store shop.session'
  ]);
  assert.deepEqual(rows(lists[1]), [
    '+ new shop.cache → shop.db “fills from”',
    '+ new shop.web → shop.cache “caches in”',
    '~ changed customer → shop.web “visits” label: “browses” → “visits”',
    '− removed shop.web → shop.session “stores”'
  ]);
  assert.match(lists[0], /^Elements <span class="field-count">6<\/span>/);
  assert.match(lists[1], /^Relationships <span class="field-count">4<\/span>/);
});

test("the rows are in the order new, changed, removed whatever the order of the table, and the table's order inside a state", async () => {
  const { sandbox } = await open('as-is');
  const rows = sandbox.comparisonState().changes.filter((r) => r.thing === 'element');
  assert.deepEqual(
    plain(rows.map((r) => r.reference)),
    plain(rows.map((r) => r.reference))
      .slice()
      .sort(),
    "the kernel's table is by reference: the three states are interleaved in it"
  );
  assert.deepEqual(plain(sandbox.sortedChangeRows(rows).map((r) => r.change + ' ' + r.reference)), [
    'new shop.cache',
    'changed customer',
    'changed reports.daily',
    'changed shop.db',
    'changed shop.web',
    'removed shop.session'
  ]);
  assert.deepEqual(plain(sandbox.sortedChangeRows(rows.slice().reverse()).map((r) => r.change)), [
    'new',
    'changed',
    'changed',
    'changed',
    'changed',
    'removed'
  ]);
});

test('a row is a button that selects, with everything it needs to find the thing; the row of the selection is marked', async () => {
  const { sandbox, state } = await open('as-is');
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.deepEqual(attributesOf(panel, 'data-ref="shop.web" data-to=') && undefined, undefined);
  const elementAttrs = attributesOf(
    panel,
    'data-thing="element" data-change="changed" data-layer="application" data-ref="shop.web"'
  );
  assert.deepEqual(
    [
      elementAttrs['data-action'],
      elementAttrs['data-thing'],
      elementAttrs['data-change'],
      elementAttrs['data-layer'],
      elementAttrs['data-ref']
    ],
    ['select-change', 'element', 'changed', 'application', 'shop.web']
  );
  const link = attributesOf(panel, 'data-thing="relationship" data-change="changed"');
  assert.deepEqual([link['data-ref'], link['data-to'], link['data-label']], ['customer', 'shop.web', 'visits']);
  assert.doesNotMatch(panel, /aria-current/);
  state.selection = { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' };
  const marked = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.equal((marked.match(/aria-current="true"/g) || []).length, 1);
  assert.match(marked, /class="change-row selected"[^>]*data-ref="shop\.web"[^>]*aria-current="true"/);
  assert.match(
    CSS,
    /\.change-row\.selected \{ border-color: var\(--accent\) !important; box-shadow: inset 3px 0 0 var\(--accent\); \}/,
    'a bar as well as a colour'
  );
});

test('with nothing that differs, the panel says so', async () => {
  const { sandbox } = await openLayered(
    createApp,
    memFolder,
    layeredFiles(PLATEAU_LIST, Object.assign(folder('10_as-is', AS_IS), folder('30_to-be', AS_IS))),
    { drawn: 'to-be' }
  );
  compareWith(sandbox, 'as-is');
  const panel = sandbox.renderChangesPanelHtml(sandbox.comparisonState());
  assert.match(panel, /Nothing differs between the two plateaus\./);
  assert.equal((panel.match(/<p class="muted change-none">None\.<\/p>/g) || []).length, 2);
});

// ---- 2. The tabs of the right-hand panel ----

test('with something selected the panel has two tabs, Selected first; the Changes tab shows the list while the selection is what it was', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  state.selection = { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' };
  const selected = sandbox.renderMapPerspectiveHtml().right;
  assert.match(
    selected,
    /^<div class="right-tabs button-group" role="group" aria-label="Right panel"><button type="button" data-action="set-right-tab" data-tab="selected" aria-pressed="true">Selected<\/button><button type="button" data-action="set-right-tab" data-tab="changes" aria-pressed="false">Changes <span class="field-count">10<\/span><\/button><\/div><div class="inspection"/
  );
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  const changes = sandbox.renderMapPerspectiveHtml().right;
  assert.match(changes, /aria-pressed="true">Changes/);
  assert.match(changes, /data-changes-panel/);
  assert.doesNotMatch(changes, /class="inspection"/);
  // another selection (a click on a row, a box) ends the pick: the panel is about the new selection
  state.selection = { kind: 'element', key: 'shop.db', layer: 'application', mode: 'view' };
  assert.match(sandbox.renderMapPerspectiveHtml().right, /data-tab="selected" aria-pressed="true"/);
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'selected' });
  assert.match(sandbox.renderMapPerspectiveHtml().right, /data-tab="selected" aria-pressed="true"/);
});

test('the panel drawn while the kernel is not loaded says it is reading, and the first drawing fills it', async () => {
  // the page loads the kernel before it resolves a layer: the window is a kernel that is gone (a failed load)
  const { sandbox } = await open('as-is');
  run(sandbox, "currentPerspective = 'map'; loadedKernel = null; viewpointKernelPromise = null;");
  assert.match(sandbox.renderMapPerspectiveHtml().right, /data-changes-panel data-pending>.*Reading the comparison/);
  assert.equal(run(sandbox, 'rightPanelPending'), true);
  await sandbox.loadViewpointKernel();
  assert.doesNotMatch(sandbox.renderMapPerspectiveHtml().right, /data-pending/);
  assert.equal(run(sandbox, 'rightPanelPending'), false);
});

// ---- 3. Wording-only changes ----

test('wording-only changes are visible by default, counted apart, and the panel says how many', async () => {
  const { sandbox, state } = await open('as-is');
  assert.equal(state.hideWording, false);
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.wordingOnly, 2);
  assert.equal(comparison.wordingHidden, 0);
  assert.equal(comparison.counts.elements.changed, 4);
  const panel = sandbox.renderChangesPanelHtml(comparison);
  assert.match(panel, /<input type="checkbox" data-action="toggle-hide-wording"> Hide wording-only changes<\/label>/);
  assert.match(
    panel,
    /<p class="changes-note" data-wording="shown">2 of the changed elements are changes of wording only \(the description is all that changed\)\.<\/p>/
  );
});

test('hiding wording-only changes: the rows go, the counts say how many were set aside, and the kernel is given those elements as unchanged', async () => {
  const { sandbox, state } = await open('as-is');
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  assert.equal(state.hideWording, true);
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.wordingHidden, 2);
  assert.deepEqual(plain(comparison.counts.elements), { new: 1, changed: 2, removed: 1, wording_only: 0 });
  assert.deepEqual(
    plain(comparison.counts.relationships),
    { new: 2, changed: 1, removed: 1 },
    'relationships are structure: never set aside'
  );
  const panel = sandbox.renderChangesPanelHtml(comparison);
  assert.match(panel, /<input type="checkbox" data-action="toggle-hide-wording" checked> Hide wording-only changes/);
  assert.match(panel, /<p class="changes-note" data-wording="hidden">2 wording-only changes hidden\.<\/p>/);
  const rows = Array.from(
    panel.matchAll(/data-thing="element" data-change="[a-z]+" data-layer="[a-z]+" data-ref="([^"]*)"/g),
    (m) => m[1]
  );
  assert.deepEqual(
    rows,
    ['shop.cache', 'customer', 'shop.web', 'shop.session'],
    'the element rows of wording only are gone, the others stay'
  );
  // the kernel is given the elements as unchanged: on the input, so its markers and its filter follow
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['shop', 'reports'] });
  const byRef = Object.fromEntries(input.elements.map((e) => [e.reference, e]));
  for (const reference of ['shop.db', 'reports.daily']) {
    assert.equal(byRef[reference].change, 'none', reference);
    assert.equal(byRef[reference].natures, undefined);
    assert.equal(byRef[reference].wording_only, undefined);
  }
  assert.equal(byRef['shop.web'].change, 'changed');
  // and turned off again
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  assert.equal(sandbox.comparisonState().wordingHidden, 0);
  assert.equal(
    sandbox.buildKernelInput('map', '', { opened: ['shop'] }).input.elements.find((e) => e.reference === 'shop.db')
      .change,
    'changed'
  );
});

test('a wording-only element set aside is not marked in the drawing, and the container that only it changed loses its marker; with the toggle off both are marked', async () => {
  const { sandbox } = await open('as-is');
  let drawn = await draw(sandbox, 'map', '');
  assert.deepEqual(pillsOf(nodeOf(drawn.svg, 'reports.daily')), ['changed']);
  assert.deepEqual(
    pillsOf(nodeOf(drawn.svg, 'reports')),
    ['contains-changes'],
    'the container is marked because of what is inside it'
  );
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  drawn = await draw(sandbox, 'map', '');
  assert.deepEqual(pillsOf(nodeOf(drawn.svg, 'reports.daily')), []);
  assert.deepEqual(
    pillsOf(nodeOf(drawn.svg, 'reports')),
    [],
    'the kernel computed the marker from the input: nothing below reports changed any more'
  );
  assert.deepEqual(pillsOf(nodeOf(drawn.svg, 'shop.web')), ['changed'], 'a structural change stays');
  assert.deepEqual(pillsOf(nodeOf(drawn.svg, 'shop')), ['contains-changes']);
});

test('with Changes only, a wording-only element set aside is not kept either', async () => {
  const { sandbox } = await open('as-is');
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  let drawn = await draw(sandbox, 'map', '');
  assert.ok(
    drawn.result.items.some((i) => i.id === 'reports.daily'),
    'kept while it counts as a change'
  );
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  drawn = await draw(sandbox, 'map', '');
  assert.ok(
    !drawn.result.items.some((i) => i.id === 'reports.daily' || i.id === 'reports'),
    'set aside: neither it nor its container is kept'
  );
});

test('the wording-only toggle is remembered per folder in this browser, and the page works when the storage is refused', async () => {
  const local = storage();
  const first = await open('as-is', { localStorage: local });
  click(first.sandbox, { 'data-action': 'toggle-hide-wording' });
  click(first.sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  assert.deepEqual(Array.from(local.values.entries()).sort(), [
    ['archicode-standalone-editor:compare:name:ws', 'other:as-is'],
    ['archicode-standalone-editor:flag:changes-only:name:ws', '1'],
    ['archicode-standalone-editor:flag:hide-wording:name:ws', '1'],
    ['archicode-standalone-editor:plateau:name:ws', 'to-be']
  ]);
  await first.sandbox.loadWorkspace(first.state.folder.handle);
  assert.equal(first.state.hideWording, true);
  assert.equal(first.state.changesOnly, true);
  const second = await open(undefined, { localStorage: local });
  assert.equal(second.state.hideWording, true, 'the page opened again in this browser');
  const refusing = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    }
  };
  const third = await open('as-is', { localStorage: refusing });
  click(third.sandbox, { 'data-action': 'toggle-hide-wording' });
  await third.sandbox.loadWorkspace(third.state.folder.handle);
  assert.equal(third.state.hideWording, true, 'remembered in the page');
});

// ---- 4. What changed ----

test('a changed element: the natures in words, the properties that differ before and after, and its relationships added and removed', async () => {
  const { sandbox } = await open('as-is');
  const panel = sandbox.inspectionPanelHtml(
    { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' },
    'map'
  );
  const block = blockOf(panel);
  assert.match(
    block,
    /^<section class="what-changed" aria-label="What changed" data-state="changed"><h4 class="inspection-subhead">What changed <span class="stereotype-badge change-chip" data-state="changed"/
  );
  assert.equal(
    text(block),
    'What changed ~ changed Changed: name, relationships added, relationships removed. Compared with “As is”. ' +
      'Name − Before Web + After Web storefront ' +
      'Relationships 2 + new → shop.cache “caches in” − removed → shop.session “stores”'
  );
  assert.match(block, /<div class="change-diff" data-property="name">/);
  assert.match(
    block,
    /<div class="change-before"><span class="change-side"><span aria-hidden="true">−<\/span> Before<\/span><span class="change-text">Web<\/span>/
  );
  assert.match(
    block,
    /<div class="change-after"><span class="change-side"><span aria-hidden="true">\+<\/span> After<\/span><span class="change-text">Web storefront<\/span>/
  );
  assert.match(block, /<li class="change-rel" data-state="new">/);
  assert.match(block, /<li class="change-rel" data-state="removed">/);
});

test('a change of the description alone: the description before and after, and the wording-only mark', async () => {
  const { sandbox } = await open('as-is');
  const panel = sandbox.inspectionPanelHtml(
    { kind: 'element', key: 'shop.db', layer: 'application', mode: 'view' },
    'elements'
  );
  const block = blockOf(panel);
  assert.equal(
    text(block),
    'What changed ~ changed Changed: description (wording only). Compared with “As is”. Description − Before Keeps the orders. + After Keeps the orders of the shop.'
  );
});

test('a new element: whole element is new, its properties are the ones below, and the relationships it declares are new', async () => {
  const { sandbox } = await open('as-is');
  const panel = sandbox.inspectionPanelHtml(
    { kind: 'element', key: 'shop.cache', layer: 'application', mode: 'view' },
    'map'
  );
  const block = blockOf(panel);
  assert.equal(
    text(block),
    'What changed + new Whole element is new: it is not in “As is”. Its properties are the ones below. Relationships 1 + new → shop.db “fills from”'
  );
  assert.ok(
    panel.indexOf('Answers the pages that were asked before.') > panel.indexOf('<section class="what-changed"'),
    'the block comes first, the properties follow it: a long description does not push it out of sight'
  );
});

test('a removed element: the read-only panel of run 0039, with the block that says the whole element is removed, and nothing said twice', async () => {
  const { sandbox } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.web.legacy', 'data-layer': 'application' });
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.session', 'data-layer': 'application' });
  const panel = sandbox.renderMapPerspectiveHtml().right;
  assert.match(panel, /inspection-removed" data-inspection-ref="shop\.session"/);
  const block = blockOf(panel);
  assert.equal(
    text(block),
    'What changed − removed Whole element is removed. Its properties and its relationships are the ones below.'
  );
  for (const once of ['Source file', 'plateaus/10_as-is/app.shop.session.yaml'])
    assert.equal(panel.split(once).length - 1, 1, once + ' is said once: the block does not repeat the panel');
  assert.equal(panel.split('class="inspection ').length - 1, 1, 'one panel, the block is a section of it');
});

test('an unchanged element, and a wording-only one set aside, have no block; with no comparison nothing is added', async () => {
  const { sandbox } = await open('as-is');
  assert.doesNotMatch(
    sandbox.inspectionPanelHtml({ kind: 'element', key: 'shop', layer: 'application', mode: 'view' }, 'map'),
    /what-changed/
  );
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  assert.doesNotMatch(
    sandbox.inspectionPanelHtml({ kind: 'element', key: 'shop.db', layer: 'application', mode: 'view' }, 'map'),
    /what-changed/
  );
  const nothing = await open('');
  assert.doesNotMatch(
    nothing.sandbox.inspectionPanelHtml(
      { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' },
      'map'
    ),
    /what-changed|change-chip/
  );
});

test("a link: its state, and for each relationship it groups, that relationship's state; a changed label tells what it was and what it is", async () => {
  const { sandbox } = await open('as-is');
  await draw(sandbox, 'map', '');
  const changed = sandbox.renderLinkInspectionHtml(
    sandbox.linkSelectionFor('customer', 'shop.web', 'application', null, null)
  );
  assert.match(changed, /<section class="what-changed" aria-label="What changed" data-state="changed">/);
  assert.match(changed, /The relationship it stands for changed\./);
  const relChange = changed.slice(changed.indexOf('<div class="rel-change"'));
  assert.equal(
    text(relChange.slice(0, relChange.indexOf('<div class="field-row">'))),
    '~ changed Changed: label Label − Before browses + After visits'
  );
  const added = sandbox.renderLinkInspectionHtml(
    sandbox.linkSelectionFor('shop.web', 'shop.cache', 'application', null, null)
  );
  assert.match(
    added,
    /data-state="new"><h4 class="inspection-subhead">What changed <span class="stereotype-badge change-chip" data-state="new"/
  );
  assert.match(added, /The relationship it stands for is new\./);
  const removed = sandbox.renderLinkInspectionHtml(
    sandbox.linkSelectionFor('shop.web', 'shop.session', 'application', null, null)
  );
  assert.match(removed, /data-state="removed"[^>]*><h4/);
  assert.match(removed, /The relationship it stands for is removed\./);
  const same = sandbox.renderLinkInspectionHtml(
    sandbox.linkSelectionFor('shop.web', 'shop.db', 'application', null, null)
  );
  assert.doesNotMatch(same, /what-changed|rel-change/, 'an unchanged link says nothing');
});

test("the state of a link that groups several relationships follows the kernel's rule: all new, all removed, a mixture is changed", async () => {
  const { sandbox } = await open('as-is');
  const rels = (...changes) => changes.map((change) => ({ from: 'a', destination: 'b', label: change, change }));
  const sentence = (list) => text(sandbox.renderLinkChangeHtml(list));
  assert.match(sentence(rels('new', 'new')), /What changed \+ new All of the relationships it groups are new\.$/);
  assert.match(
    sentence(rels('removed', 'removed')),
    /What changed \u2212 removed All of the relationships it groups are removed\.$/
  );
  assert.match(
    sentence(rels('new', 'none')),
    /What changed ~ changed The relationships it groups are not all the same: some are new, changed or removed\.$/
  );
  assert.match(
    sentence(rels('new', 'removed')),
    /~ changed The relationships it groups are not all the same/,
    'a new one and a removed one: replaced by something else'
  );
  assert.match(sentence(rels('changed', 'changed')), /All of the relationships it groups changed\.$/);
  assert.equal(sandbox.renderLinkChangeHtml(rels('none', 'none')), '', 'nothing changed: nothing said');
  assert.equal(
    sandbox.renderLinkChangeHtml([{ from: 'a', destination: 'b', label: 'x' }]),
    '',
    'no change given at all (a drawing of one plateau)'
  );
});

test('the Changes tab, once asked for, brings the row of the selection into view', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  state.selection = { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' };
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  assert.equal(run(sandbox, 'scrollChangesToSelection'), true);
  const source = run(sandbox, 'render.toString()');
  assert.match(
    source,
    /if \(scrollChangesToSelection\) \{[\s\S]*?document\.querySelector\('\.change-row\.selected'\)[\s\S]*?scrollIntoView\(\{ block: 'center' \}\)/
  );
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'selected' });
  assert.equal(run(sandbox, 'scrollChangesToSelection'), false);
});

test('the block is in the inspection, so the page of a view in the Library has it too', async () => {
  const { sandbox } = await open('as-is');
  const panel = sandbox.inspectionPanelHtml(
    { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' },
    'library'
  );
  assert.match(panel, /<section class="what-changed"/);
  assert.match(panel, /Show in Elements/);
});

// ---- 5. Changes only ----

test('Changes only is among the tools of the diagram, not on the band, only while a comparison is on, and says which of the two is pressed', async () => {
  const off = await open('');
  assert.doesNotMatch(
    off.sandbox.renderDiagramCanvasHtml(null, '', null),
    /Changes only|set-changes-only/,
    'nothing is compared: nothing to choose'
  );
  assert.doesNotMatch(off.sandbox.renderPlateauBandHtml(), /Changes only|set-changes-only/);
  assert.doesNotMatch(off.sandbox.renderTopPanelHtml(), /Changes only|set-changes-only/, 'not in the top bar any more');
  const { sandbox } = await open('as-is');
  assert.doesNotMatch(
    sandbox.renderPlateauBandHtml(),
    /Changes only|set-changes-only/,
    'the band chooses the plateaus and does nothing else (#98)'
  );
  for (const tools of [
    sandbox.renderDiagramCanvasHtml(null, '', null),
    sandbox.renderDiagramCanvasHtml({ name: 'Shop', id: 'shop', reference: 'shop' }, '', null)
  ]) {
    assert.ok(
      tools.indexOf('data-action="toggle-hide-unlinked"') < tools.indexOf('data-action="set-changes-only"') &&
        tools.indexOf('data-action="set-changes-only"') < tools.indexOf('aria-label="Show"'),
      'in the toolbar, after Hide unlinked'
    );
    assert.match(
      tools,
      /<span class="button-group changes-switch" role="group" aria-label="What the diagram draws of the comparison"><button type="button" data-action="set-changes-only" data-value="0" aria-pressed="true"[^>]*>Everything<\/button><button type="button" data-action="set-changes-only" data-value="1" aria-pressed="false"[^>]*>Changes only<\/button><\/span>/
    );
  }
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  assert.match(
    sandbox.renderDiagramCanvasHtml(null, '', null),
    /data-value="0" aria-pressed="false"[^>]*>Everything<\/button><button type="button" data-action="set-changes-only" data-value="1" aria-pressed="true"/
  );
  assert.match(
    sandbox.renderDiagramCanvasHtml(null, '', {
      view: { id: 'v1' },
      isMap: true,
      hideUnlinked: false,
      shows: undefined
    }),
    /set-changes-only/,
    "the page of a view in the Library has it too: the switch is the diagram's wherever it is drawn"
  );
});

test('Changes only reaches the kernel as only_changes, for the Map and for the diagram of an element; without it, nothing is added', async () => {
  const { sandbox } = await open('as-is');
  assert.equal(sandbox.buildKernelInput('map', '', {}).input.only_changes, undefined);
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  assert.equal(sandbox.buildKernelInput('map', '', {}).input.only_changes, true);
  assert.equal(sandbox.buildKernelInput('overview', 'shop.web', { layer: 'application' }).input.only_changes, true);
  assert.equal(sandbox.buildKernelInput('deep', 'shop', { layer: 'application' }).input.only_changes, true);
  const view = { id: 'v1', viewpoint: 'map', properties: { opened: ['shop'] } };
  const recipe = sandbox.libraryDiagramRecipe(view);
  assert.equal(
    sandbox.buildKernelInput(recipe.viewpoint, recipe.reference, { layer: recipe.layer, opened: ['shop'] }).input
      .only_changes,
    true,
    'the page of a view in the Library too'
  );
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '0' });
  assert.equal(sandbox.buildKernelInput('map', '', {}).input.only_changes, undefined);
  // with Nothing the filter has nothing to filter, even when it was left on
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  compareWith(sandbox, '');
  assert.equal(sandbox.buildKernelInput('map', '', {}).input.only_changes, undefined);
});

test('the Map with Changes only keeps what changed and the boxes that place it; those are faded, with no state, and the key says so', async () => {
  const { sandbox, state } = await open('as-is');
  click(sandbox, { 'data-action': 'toggle-hide-wording' }); // the database is then unchanged: the end of a new link, it is context
  const all = await draw(sandbox, 'map', '');
  assert.ok(
    all.result.items.some((i) => i.id === 'shop.db'),
    'the unchanged database is on the map'
  );
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  const only = await draw(sandbox, 'map', '');
  assert.deepEqual(
    plain(
      only.result.items
        .filter((i) => i.context)
        .map((i) => i.id)
        .sort()
    ),
    ['shop', 'shop.db'],
    'the container of the changes and the end of a changed link'
  );
  assert.ok(!only.result.items.some((i) => i.id === 'reports'), 'a wording-only change set aside keeps nothing');
  assert.match(nodeOf(only.svg, 'shop.db'), /^<g class="dg-node dg-leaf dg-context"/);
  assert.deepEqual(pillsOf(nodeOf(only.svg, 'shop.db')), [], 'no state pill on context');
  assert.doesNotMatch(nodeOf(only.svg, 'shop.db'), /dg-chg-|dg-glyph/);
  assert.match(nodeOf(only.svg, 'shop'), /^<g class="dg-node dg-compound dg-context"/);
  assert.doesNotMatch(
    nodeOf(only.svg, 'shop'),
    /dg-chg-/,
    'a container kept for its changes is not marked contains-changes: it is faded'
  );
  assert.match(nodeOf(only.svg, 'shop.web'), /dg-chg-changed/);
  assert.match(nodeOf(only.svg, 'shop.web'), /aria-label="Web storefront \[container\], changed"/);
  assert.match(nodeOf(only.svg, 'shop.db'), /aria-label="Database \[container\], context"/);
  assert.match(
    nodeOf(only.svg, 'shop.db'),
    /<title>[^<]*Context: shown to place the changes around it; it did not change itself\./
  );
  // the unchanged link between kept boxes is left out
  assert.ok(!only.result.links.some((l) => l.from === 'shop.web' && l.to === 'shop.db'));
  assert.ok(all.result.links.some((l) => l.from === 'shop.web' && l.to === 'shop.db'));
  // the key
  const counts = plain(sandbox.comparisonCountsOf(only.result, null));
  assert.deepEqual(counts.context, { boxes: 2 });
  const legend = text(sandbox.diagramComparisonLegendHtml(only.comparison, counts));
  assert.match(legend, /context faded: shown to place the changes 2 boxes Red dashed is kept for dangling references/);
  assert.doesNotMatch(
    text(sandbox.diagramComparisonLegendHtml(all.comparison, sandbox.comparisonCountsOf(all.result, null))),
    /context/,
    'a drawing that keeps everything has no context to explain'
  );
  assert.match(CSS, /\.dg-node\.dg-context \{ opacity: 0\.55; \}/);
  assert.equal(state.changesOnly, true);
});

test('the diagram of an element with Changes only: the focal box always stays and is never faded', async () => {
  const { sandbox } = await open('as-is');
  click(sandbox, { 'data-action': 'toggle-hide-wording' }); // the database is then unchanged
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  const drawn = await draw(sandbox, 'overview', 'shop.db', { input: { layer: 'application' } });
  const focal = drawn.result.items.find((i) => i.id === 'shop.db');
  assert.ok(focal, 'the focal element stays');
  assert.doesNotMatch(nodeOf(drawn.svg, 'shop.db'), /dg-context/, 'and is not faded');
  const others = drawn.result.items.filter((i) => i.context && i.id !== 'shop.db').length;
  assert.equal(
    drawn.result.items.find((i) => i.id === 'shop.db').context,
    true,
    'the kernel calls it context: it has no change of its own'
  );
  assert.deepEqual(
    plain(sandbox.comparisonCountsOf(drawn.result, 'shop.db').context),
    others ? { boxes: others } : undefined,
    'and does not count it'
  );
});

test('the focal box of a diagram that contains changes keeps its marker under Changes only: it is not context, and is not faded', async () => {
  const { sandbox } = await open('as-is');
  const everything = await draw(sandbox, 'deep', 'shop', { input: { layer: 'application' } });
  assert.deepEqual(pillsOf(nodeOf(everything.svg, 'shop')), ['contains-changes']);
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  const only = await draw(sandbox, 'deep', 'shop', { input: { layer: 'application' } });
  assert.equal(
    only.result.items.find((i) => i.id === 'shop').context,
    true,
    'the kernel keeps it for no change of its own'
  );
  assert.deepEqual(pillsOf(nodeOf(only.svg, 'shop')), ['contains-changes'], 'it says so, as in the full drawing');
  assert.doesNotMatch(nodeOf(only.svg, 'shop'), /dg-context/);
  assert.equal(
    sandbox.comparisonCountsOf(only.result, 'shop')['contains-changes'].boxes,
    1,
    'and the key counts it as such'
  );
  // a box that is not focal and has the same state is context: faded, no pill
  const map = await draw(sandbox, 'map', '');
  assert.deepEqual(pillsOf(nodeOf(map.svg, 'shop')), []);
  assert.match(nodeOf(map.svg, 'shop'), /dg-context/);
});

test('Changes only works with the pins and the hidden elements of the Map: they still apply', async () => {
  const { sandbox } = await open('as-is');
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['shop'], pinned: ['shop.web'], hidden: [] });
  assert.equal(input.only_changes, true);
  assert.deepEqual(plain(input.pinned), ['shop.web']);
  const kernel = await sandbox.loadViewpointKernel();
  const result = kernel.compute(Object.assign({}, input, { hidden: ['shop.cache'] }));
  assert.equal(result.error, undefined);
  assert.ok(!result.items.some((i) => i.id === 'shop.cache'), 'a hidden element stays out');
  assert.ok(
    result.items.some((i) => i.id === 'shop.web'),
    'a pinned one stays in'
  );
});

test('the SVG export carries the faded rule', async () => {
  const { sandbox } = await open('as-is');
  run(sandbox, "document.documentElement.style = {}; getComputedStyle = () => ({ getPropertyValue: () => '#000' });");
  assert.match(sandbox.diagramExportCss(), /\.dg-node\.dg-context\{opacity:\.55\}/);
});

// ---- 6. The address ----
// The address names the plateau drawn (`plateau=`, none for baseline) and, with a removed element, the comparison (`compare=`, as the band chose it: `other:<id>`).

test('a removed element picked on the Map is in the address with the comparison; the other selections are as they were', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  assert.equal(sandbox.currentRouteHash(), '/timeline/applications?plateau=to-be');
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'removed',
    'data-layer': 'application',
    'data-ref': 'shop.session'
  });
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/applications?removed=shop.session&compare=other%3Aas-is&plateau=to-be'
  );
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'changed',
    'data-layer': 'application',
    'data-ref': 'shop.web'
  });
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/applications?ref=shop.web&plateau=to-be',
    'a changed element is an ordinary selection: nothing new in the address'
  );
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'relationship',
    'data-change': 'changed',
    'data-layer': 'application',
    'data-ref': 'customer',
    'data-to': 'shop.web'
  });
  assert.equal(sandbox.currentRouteHash(), '/timeline/applications?link-from=customer&link-to=shop.web&plateau=to-be');
  assert.equal(state.selection.kind, 'link');
  // closing the panel takes it out of the address
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'removed',
    'data-layer': 'application',
    'data-ref': 'shop.session'
  });
  click(sandbox, { 'data-action': 'close-removed' });
  assert.equal(sandbox.currentRouteHash(), '/timeline/applications?plateau=to-be');
});

test('in Elements the removed element is in the address next to the element that stays the subject', async () => {
  const { sandbox, state } = await open('as-is');
  state.selection = { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.session', 'data-layer': 'application' });
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/elements?ref=shop.web&tab=overview&removed=shop.session&compare=other%3Aas-is&plateau=to-be'
  );
});

test('an address with a removed element reopens it with the same comparison, whatever this browser had remembered', async () => {
  const hash = '#/timeline/applications?removed=shop.session&compare=other%3Aas-is&plateau=to-be';
  const local = storage();
  local.setItem('archicode-standalone-editor:compare:name:ws', ''); // this browser had nothing compared
  const { sandbox, state } = await open(undefined, { localStorage: local, hash });
  run(sandbox, "currentPerspective = 'map';");
  assert.equal(state.layers.current, 'to-be', 'the plateau of the address');
  assert.equal(sandbox.layerCompareChoice(), 'other:as-is', 'the address wins');
  assert.equal(
    local.getItem('archicode-standalone-editor:compare:name:ws'),
    'other:as-is',
    'and is kept like a choice made'
  );
  assert.equal(state.baseline.plateau.id, 'as-is');
  assert.deepEqual(plain(sandbox.removedFromHash()), { reference: 'shop.session', layer: 'application' });
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/applications?removed=shop.session&compare=other%3Aas-is&plateau=to-be'
  );
  assert.match(
    sandbox.renderMapPerspectiveHtml().right,
    /inspection-removed" data-inspection-ref="shop\.session"/,
    'and it is there'
  );
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/applications?removed=shop.session&compare=other%3Aas-is&plateau=to-be',
    'a reload would do the same again'
  );
  // the kernel is gone (a failed load): the address is kept, the panel waits, and the next load fills it
  run(sandbox, 'loadedKernel = null; viewpointKernelPromise = null;');
  assert.equal(
    sandbox.currentRouteHash(),
    '/timeline/applications?removed=shop.session&compare=other%3Aas-is&plateau=to-be'
  );
  assert.match(sandbox.renderMapPerspectiveHtml().right, /data-pending/);
  await sandbox.loadViewpointKernel();
  assert.match(sandbox.renderMapPerspectiveHtml().right, /inspection-removed" data-inspection-ref="shop\.session"/);
});

test('an address that names a comparison the plateaus cannot honour is no choice made: what this browser remembered stays', async () => {
  const local = storage();
  await open('as-is', { localStorage: local });
  assert.equal(local.getItem('archicode-standalone-editor:compare:name:ws'), 'other:as-is');
  const page = await open(undefined, {
    localStorage: local,
    hash: '#/timeline/applications?plateau=to-be&compare=other%3Anowhere'
  });
  assert.equal(page.sandbox.layerCompareChoice(), '', 'the address wins, and names nothing the workspace has');
  assert.equal(
    local.getItem('archicode-standalone-editor:compare:name:ws'),
    'other:as-is',
    'and the browser keeps what it had'
  );
});

test('the address of a removed element round trips: written, read back by a fresh page, written again the same', async () => {
  const first = await open('as-is');
  run(first.sandbox, "currentPerspective = 'map';");
  click(first.sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'removed',
    'data-layer': 'application',
    'data-ref': 'shop.session'
  });
  const hash = '#' + first.sandbox.currentRouteHash();
  const second = await open(undefined, { hash });
  run(second.sandbox, "currentPerspective = 'map';");
  assert.equal(second.sandbox.layerCompareChoice(), 'other:as-is');
  assert.equal('#' + second.sandbox.currentRouteHash(), hash);
  assert.match(
    second.sandbox.renderMapPerspectiveHtml().right,
    /inspection-removed" data-inspection-ref="shop\.session"/
  );
});

test('an address that names a removed element the comparison does not have, or no comparison at all, picks nothing and is cleaned', async () => {
  const gone = await open(undefined, {
    hash: '#/timeline/applications?removed=shop.nothing&compare=other%3Aas-is&plateau=to-be'
  });
  run(gone.sandbox, "currentPerspective = 'map';");
  assert.equal(
    gone.sandbox.currentRouteHash(),
    '/timeline/applications?plateau=to-be',
    'the element is not in the comparison, and the comparison is not in the address without it'
  );
  const none = await open(undefined, {
    hash: '#/timeline/applications?removed=shop.session&compare=other%3Anowhere&plateau=to-be'
  });
  assert.equal(none.sandbox.layerCompareChoice(), '', 'a plateau the workspace does not have is nothing compared');
  assert.equal(run(none.sandbox, 'removedPick'), null);
  const plain1 = await open('', { hash: '#/timeline/applications?removed=shop.session&plateau=to-be' });
  assert.equal(run(plain1.sandbox, 'removedPick'), null, 'without a comparison there is nothing to pick');
});

test('a selected change row reloads the same: the element, the link', async () => {
  const local = storage(); // the comparison is the one this browser remembers, as it is for a page that is reloaded
  const first = await open('as-is', { localStorage: local });
  run(first.sandbox, "currentPerspective = 'map';");
  click(first.sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'new',
    'data-layer': 'application',
    'data-ref': 'shop.cache'
  });
  const second = await open(undefined, { localStorage: local, hash: '#' + first.sandbox.currentRouteHash() });
  assert.deepEqual(plain(second.state.selection), { kind: 'element', key: 'shop.cache', mode: 'view' });
  click(first.sandbox, {
    'data-action': 'select-change',
    'data-thing': 'relationship',
    'data-change': 'new',
    'data-layer': 'application',
    'data-ref': 'shop.web',
    'data-to': 'shop.cache'
  });
  const third = await open(undefined, { localStorage: local, hash: '#' + first.sandbox.currentRouteHash() });
  assert.equal(third.state.selection.kind, 'link');
  assert.deepEqual([third.state.selection.from, third.state.selection.to], ['shop.web', 'shop.cache']);
});

// ---- 7. A click on a row ----

test('a click on an element row selects it on the Map, opens the boxes around it and centres the view; the trees open down to it', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'map'; diagramScale = 'fit';");
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'new',
    'data-layer': 'application',
    'data-ref': 'shop.cache'
  });
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.cache', layer: 'application', mode: 'view' });
  assert.deepEqual(
    plain(run(sandbox, 'Array.from(currentMapOpened())')),
    ['shop'],
    'the box that encloses it is open, so that it is drawn'
  );
  assert.equal(run(sandbox, 'diagramScale'), 'auto', 'Center');
  assert.ok(
    state.expanded.has('shop|application') || Array.from(state.expanded).some((k) => k.includes('shop')),
    'the tree is open down to it'
  );
  assert.match(
    sandbox.renderMapPerspectiveHtml().right,
    /data-tab="selected" aria-pressed="true"[\s\S]*data-inspection-ref="shop\.cache"/,
    'and the panel is about it, on the Selected tab'
  );
});

test('a click on a removed row opens the read-only panel of run 0039 and opens the boxes around the removed box', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'removed',
    'data-layer': 'application',
    'data-ref': 'shop.session'
  });
  assert.equal(state.selection.kind, 'none', 'nothing of this plateau is selected');
  assert.deepEqual(plain(run(sandbox, 'Array.from(currentMapOpened())')), ['shop']);
  const panel = sandbox.renderMapPerspectiveHtml().right;
  assert.match(panel, /inspection-removed" data-inspection-ref="shop\.session"/);
  assert.match(panel, /data-tab="selected" aria-pressed="true"/);
  // the row of the pick is marked in the list
  click(sandbox, { 'data-action': 'set-right-tab', 'data-tab': 'changes' });
  const marked = sandbox.renderMapPerspectiveHtml().right;
  assert.match(marked, /class="change-row selected"[^>]*data-ref="shop\.session"[^>]*aria-current="true"/);
});

test('a click on a relationship row selects its link on the Map, with both ends opened', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'map';");
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'relationship',
    'data-change': 'removed',
    'data-layer': 'application',
    'data-ref': 'shop.web',
    'data-to': 'shop.session'
  });
  assert.deepEqual(
    [state.selection.kind, state.selection.from, state.selection.to, state.selection.layer],
    ['link', 'shop.web', 'shop.session', 'application']
  );
  assert.deepEqual(plain(run(sandbox, 'Array.from(currentMapOpened())')), ['shop']);
  assert.deepEqual(
    plain(run(sandbox, 'revealLinkAfterDrawing')),
    { nth: null },
    'the next drawing brings the link into view'
  );
});

test('in Elements a row selects the element, and for a relationship the declaring element; a removed row keeps the subject', async () => {
  const { sandbox, state } = await open('as-is');
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'changed',
    'data-layer': 'application',
    'data-ref': 'shop.web'
  });
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' });
  assert.equal(run(sandbox, 'Array.from(currentMapOpened()).length'), 0, 'the Map is not touched');
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'relationship',
    'data-change': 'new',
    'data-layer': 'application',
    'data-ref': 'shop.cache',
    'data-to': 'shop.db'
  });
  assert.deepEqual(
    plain(state.selection),
    { kind: 'element', key: 'shop.cache', layer: 'application', mode: 'view' },
    'the Details page shows no diagram: the declaring element'
  );
  run(sandbox, "elementTab = 'overview';");
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'relationship',
    'data-change': 'new',
    'data-layer': 'application',
    'data-ref': 'shop.cache',
    'data-to': 'shop.db'
  });
  assert.deepEqual(
    [state.selection.kind, state.selection.focal, state.selection.from, state.selection.to],
    ['link', 'shop.cache', 'shop.cache', 'shop.db'],
    'over its diagram: the link'
  );
  click(sandbox, {
    'data-action': 'select-change',
    'data-thing': 'element',
    'data-change': 'removed',
    'data-layer': 'application',
    'data-ref': 'shop.session'
  });
  assert.equal(state.selection.kind, 'link', 'the subject stays');
  assert.equal(sandbox.removedInspectionOf(state.selection, 'elements').reference, 'shop.session');
});

test('a row leaves the form of an element being edited only after asking', async () => {
  const source = run(createApp(), 'ACTIONS_LEAVING_THE_FORM.has("select-change")');
  assert.equal(source, true);
});

// ---- 8. The trees ----

test('the Elements tree marks each element with its state after its name, and says it to a screen reader', async () => {
  const { sandbox, state } = await open('as-is');
  state.expanded.add('application:shop');
  state.expanded.add('application:reports');
  const nav = sandbox.renderElementsNavHtml(false);
  const row = (reference) =>
    nav.match(
      new RegExp(
        '<div class="tree-node-row[^"]*"[^>]*data-ref="' +
          reference.replace(/\./g, '\\.') +
          '"[^>]*>[\\s\\S]*?</div>(?=<)'
      )
    )[0];
  assert.match(
    row('shop.cache'),
    /<span class="tree-change" data-state="new" title="New since As is" aria-hidden="true">\+<\/span>/
  );
  assert.match(row('shop.cache'), /aria-label="Cache, new"/);
  assert.match(row('shop.web'), /data-state="changed" title="Changed since As is" aria-hidden="true">~<\/span>/);
  assert.match(row('shop.web'), /aria-label="Web storefront, changed"/);
  assert.match(
    row('shop'),
    /data-state="contains-changes" title="Contains changes: something inside it is new, changed or removed" aria-hidden="true">±<\/span>/
  );
  assert.match(row('shop'), /aria-label="Shop, contains changes"/);
  assert.match(row('shop.db'), /data-state="changed"/, 'wording only is a change: it is marked while it is shown');
  assert.doesNotMatch(
    row('customer'),
    /data-state="contains-changes"/,
    'a changed element is not also marked as containing changes'
  );
  assert.doesNotMatch(
    nav,
    /shop\.session/,
    'a removed element is not in the tree (it is not an element of the plateau drawn)'
  );
  assert.doesNotMatch(nav, /Session store/);
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  const quiet = sandbox.renderElementsNavHtml(false);
  assert.doesNotMatch(
    quiet.match(new RegExp('<div class="tree-node-row[^"]*"[^>]*data-ref="reports"[^>]*>[\\s\\S]*?</div>(?=<)'))[0],
    /tree-change/,
    'and the container of a wording-only change loses its mark'
  );
});

test('the tree of the Map marks the elements too, and keeps its pin and hide buttons', async () => {
  const { sandbox, state } = await open('as-is');
  state.expanded.add('application:shop');
  const html = sandbox.renderMapScopeHtml();
  const row = (reference) =>
    html.match(
      new RegExp(
        '<div class="tree-node-row map-scope-row[^"]*"[^>]*data-node="application:' +
          reference.replace(/\./g, '\\.') +
          '"[^>]*>[\\s\\S]*?</span></div>(?=<)'
      )
    )[0];
  assert.match(row('shop.cache'), /data-change="new"/);
  assert.match(row('shop.cache'), /<span class="tree-change" data-state="new"[^>]*>\+<\/span>/);
  assert.match(row('shop.cache'), /aria-label="Cache, new"/);
  assert.match(row('shop.cache'), /data-action="map-pin"/);
  assert.match(row('shop.cache'), /data-action="map-hide"/);
  assert.match(row('shop'), /data-state="contains-changes"/);
  assert.equal(sandbox.mapScopeRowLabel('Cache', true, false, false, '', 'new'), 'Cache, pinned, new');
  assert.equal(sandbox.mapScopeRowLabel('Cache', true, false, false, ''), 'Cache, pinned', 'no comparison: as it was');
});

// ---- 9. Nothing is today\'s editor ----

test('while nothing is compared none of it is on the page: no panel, no tabs, no chips, no filter, no marks in the trees, no only_changes', async () => {
  const { sandbox, state } = await open('');
  run(sandbox, "currentPerspective = 'map';");
  assert.equal(sandbox.renderMapPerspectiveHtml().right, null, 'nothing selected: no panel, as it always was');
  state.selection = { kind: 'element', key: 'shop.web', layer: 'application', mode: 'view' };
  const selected = sandbox.renderMapPerspectiveHtml().right;
  assert.match(selected, /^<div class="inspection"/, 'the inspection alone, no tab strip');
  assert.doesNotMatch(selected, /right-tabs|what-changed|change-chip/);
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'details';");
  assert.equal(sandbox.renderElementsPerspectiveHtml().right, null);
  const header = sandbox.renderTopPanelHtml();
  assert.doesNotMatch(header, /Changes only|set-changes-only/);
  assert.doesNotMatch(sandbox.renderElementsNavHtml(false) + sandbox.renderMapScopeHtml(), /tree-change|data-change/);
  assert.equal(sandbox.buildKernelInput('map', '', {}).input.only_changes, undefined);
  assert.equal(sandbox.comparisonState(), null);
  assert.equal(sandbox.currentRouteHash(), '/timeline/elements?ref=shop.web&plateau=to-be');
  // the flags are not stored until they are used, and a leftover filter does nothing without a comparison
  click(sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  assert.equal(sandbox.buildKernelInput('map', '', {}).input.only_changes, undefined);
});

test('the choices of the comparison live in AppState and are reset with it', async () => {
  const { sandbox, state } = await open('as-is');
  click(sandbox, { 'data-action': 'toggle-hide-wording' });
  assert.equal(state.hideWording, true);
  const fresh = run(sandbox, 'createInitialAppState()');
  assert.equal(fresh.hideWording, false);
  assert.equal(fresh.changesOnly, false);
});

test('the styles of the new panels are written for the theme variables only', () => {
  for (const selector of [
    '.right-tabs',
    '.change-chip',
    '.changes-panel',
    '.change-row',
    '.what-changed',
    '.change-diff',
    '.tree-change'
  ]) {
    assert.ok(CSS.includes(selector), selector + ' is styled');
  }
  const written = CSS.slice(CSS.indexOf('.right-tabs {'), CSS.indexOf('[data-resize] {'));
  assert.doesNotMatch(
    written,
    /#[0-9a-fA-F]{3,6}\b|rgb\(/,
    'no colour of its own: the variables of the theme (light, dark) only'
  );
});
