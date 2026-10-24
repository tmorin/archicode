'use strict';
// Comparing two plateaus in the editor (run 0039; wave 014 run 0084: the plateaus are layers and the comparison is made on the band, the tests of the control
// it replaced and of the key that listed the folders are gone, the rest runs on the same data as layers, see layered-folders.js). The editor reads the plateau drawn and, read-only and apart from it, the one it is
// compared with; the kernel's `compare` gives the union, `compute` draws it, and every box and link says what changed: a glyph, a line
// style, a pill with the word and a tint, never colour alone, as defaults that an entry of the workspace's `styles` with the same name
// overrides property by property. A comparison turned off draws exactly what the editor drew before. The harness has no DOM and no ELK:
// the kernel is the real embedded module, the layout is a fake one, and the look itself is checked in a browser (see the run's document).
// Everything here is invented; nothing of a real workspace is in it.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, openFixture } = require('./harness');
const { memFolder } = require('./mem-folder');
const { inPlateau, layeredFiles, openLayered, compareWith, bandOf } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

/** A layout shaped like ELK's answer, without ELK. */
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

// ---- an invented bookshop in three plateaus ----

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

const AS_IS = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  'app.shop.web.yaml': element(
    'container',
    'shop',
    'web',
    'Web',
    rel(['shop.session', 'shop.db'], ['stores', 'reads'])
  ),
  'app.shop.db.yaml': element('container', 'shop', 'db', 'Database'),
  'app.shop.session.yaml': element('container', 'shop', 'session', 'Session store', '  qualifiers: [Redis]\n'),
  'app.shop.legacy.yaml': element(
    'container',
    'shop',
    'legacy',
    'Legacy batch',
    '  elements:\n    - id: "job"\n      kind: "component"\n      name: "Nightly job"\n'
  ),
  'app.customer.yaml': element('person', null, 'customer', 'Customer', rel('shop.web', 'browses'))
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
  'app.shop.db.yaml': element('container', 'shop', 'db', 'Database'),
  'app.shop.cache.yaml': element(
    'container',
    'shop',
    'cache',
    'Cache',
    '  elements:\n    - id: "index"\n      kind: "component"\n      name: "Index"\n'
  ),
  'app.customer.yaml': element('person', null, 'customer', 'Customer', rel('shop.web', 'browses'))
};
const INTERIM = Object.assign({}, AS_IS, { 'app.shop.legacy.yaml': undefined });
delete INTERIM['app.shop.legacy.yaml'];

const folder = (dir, files) =>
  Object.fromEntries(Object.entries(files).map(([name, text]) => ['plateaus/' + dir + '/' + name, text]));

const PLATEAU_LIST = [
  { id: 'as-is', name: 'As is', path: 'plateaus/10_as-is' },
  { id: 'interim', name: 'Interim', path: 'plateaus/20_interim' },
  { id: 'to-be', name: 'To be', horizon: '2027-Q1', path: 'plateaus/30_to-be' }
];

const FILES = Object.assign({}, folder('10_as-is', AS_IS), folder('20_interim', INTERIM), folder('30_to-be', TO_BE));

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
 * The bookshop as layers (see layered-folders.js): the three states are siblings over an empty `baseline`, `drawn` is drawn (default: `to-be`, the last one, as the page used to
 * open) and a comparison is made on the band (`compareWith`, a press on the ⇄ of a node), as it used to be made with the control that listed the plateaus.
 */
async function open(drawn, files, options = {}) {
  return openLayered(createApp, memFolder, layeredFiles(PLATEAU_LIST, files === undefined ? FILES : files), {
    drawn: drawn || 'to-be',
    app: options
  });
}

/** The kernel's answer for a view, the graph made from it and the SVG drawn on a fake layout, as the page draws a comparison. */
async function draw(sandbox, viewpoint, reference, options = {}) {
  run(sandbox, "currentPerspective = '" + (viewpoint === 'map' ? 'map' : 'elements') + "';");
  const kernel = await sandbox.loadViewpointKernel();
  const { input } = sandbox.buildKernelInput(
    viewpoint,
    reference,
    Object.assign(viewpoint === 'map' ? { opened: ['shop'] } : {}, options.input)
  );
  const result = kernel.compute(input);
  assert.equal(result.error, undefined);
  const comparison = sandbox.comparisonState();
  if (comparison && comparison.layers) sandbox.tellRemovedItems(result, comparison, input.layer);
  const graph = sandbox.buildElkGraph(result, options.graph || { captions: false });
  const svg = sandbox.renderDiagramSvg(
    fakeLayout(graph),
    result,
    reference,
    Object.assign({ map: viewpoint === 'map', show: { labels: false } }, options.render)
  ).html;
  return { result, graph, svg, comparison };
}

/** The `g` of a box in a drawing, from its opening tag to the next box, link or label. */
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
const openingTag = (node) => node.slice(0, node.indexOf('>') + 1);
const styleOf = (node) => {
  const m = /^<g [^>]*? style="([^"]*)"/.exec(node);
  return m ? m[1] : '';
};
const varsOf = (node) =>
  Object.fromEntries(
    styleOf(node)
      .split(';')
      .filter(Boolean)
      .map((d) => [d.slice(0, d.indexOf(':')), d.slice(d.indexOf(':') + 1)])
  );
const pillsOf = (node) =>
  Array.from(
    node.matchAll(/<g class="dg-badge[^"]*"[^>]*>(?:<rect [^>]*\/>)<text [^>]*>([^<]*)<\/text><\/g>/g),
    (m) => m[1]
  );
/** The `g` of a link between two boxes. */
function linkOf(svg, from, to) {
  const at = svg.indexOf('<g class="dg-link" data-from="' + from + '" data-to="' + to + '"');
  assert.ok(at > 0, from + ' -> ' + to + ' is drawn');
  return svg.slice(at, svg.indexOf('</g>', at) + 4);
}

const sha = (text) => crypto.createHash('sha256').update(text).digest('hex').slice(0, 16);

// ---- 1. The comparison is made on the band ----

test('comparing on the band reads the other plateau as the baseline, says so on the band, and stopping drops it', async () => {
  const { sandbox, state } = await open();
  assert.equal(state.baseline, null, 'nothing is compared when a plateau is drawn');
  assert.doesNotMatch(
    sandbox.renderTopPanelHtml(),
    /compare-to|Compare to|data-action="set-plateau"/,
    'the top bar has no selector and no list to compare to: the band is the way'
  );
  compareWith(sandbox, 'as-is');
  assert.equal(state.baseline.plateau.id, 'as-is');
  let band = bandOf(sandbox);
  assert.equal(band.compared, 'plateau:as-is', 'the list says what is compared');
  assert.match(band.compare.find((o) => o.selected).label, /^As is/);
  compareWith(sandbox, 'interim');
  assert.equal(state.baseline.plateau.id, 'interim');
  compareWith(sandbox, '');
  assert.equal(state.baseline, null);
  band = bandOf(sandbox);
  assert.equal(band.compared, '');
  assert.equal(band.compare.find((o) => o.selected).label, 'Nothing');
});

test('the same plateau compared with itself compares nothing', async () => {
  const { sandbox, state } = await open();
  sandbox.compareWithPlateau('to-be'); // the plateau drawn: its node has no ⇄, but a page can be asked
  assert.equal(sandbox.compareTargetPlateau(), null, 'a plateau is not compared with itself');
  assert.equal(state.baseline, null);
  compareWith(sandbox, 'interim');
  sandbox.drawPlateau('interim'); // the plateau drawn is now the one compared with
  assert.equal(state.layers.current, 'interim');
  assert.equal(state.baseline, null, 'nothing is compared with itself');
  assert.equal(sandbox.comparisonState(), null);
});

test('a comparison is remembered for this folder, under its own key, and comes back at the next opening', async () => {
  const local = storage();
  const first = await open(undefined, undefined, { localStorage: local });
  compareWith(first.sandbox, 'as-is');
  assert.deepEqual(
    Array.from(local.values.entries()).sort(),
    [
      ['archicode-standalone-editor:compare:name:ws', 'other:as-is'],
      ['archicode-standalone-editor:plateau:name:ws', 'to-be']
    ],
    'the plateau drawn and the comparison do not share a key'
  );
  await first.sandbox.loadWorkspace(first.state.folder.handle);
  assert.equal(first.state.layers.current, 'to-be');
  assert.equal(first.state.baseline.plateau.id, 'as-is', 'the page opened again in this browser draws the comparison');
  compareWith(first.sandbox, '');
  assert.equal(local.getItem('archicode-standalone-editor:compare:name:ws'), '', 'nothing compared is a choice too');
  await first.sandbox.loadWorkspace(first.state.folder.handle);
  assert.equal(first.state.baseline, null);
  // a plateau that is gone
  local.setItem('archicode-standalone-editor:compare:name:ws', 'other:gone');
  const second = await open(undefined, undefined, { localStorage: local });
  assert.equal(second.state.baseline, null);
});

test('the page works when the browser refuses its storage: the plateau and the comparison last as long as the page', async () => {
  const refusing = {
    getItem() {
      throw new Error('denied');
    },
    setItem() {
      throw new Error('denied');
    }
  };
  const { sandbox, state } = await open('interim', undefined, { localStorage: refusing });
  compareWith(sandbox, 'as-is');
  assert.equal(state.baseline.plateau.id, 'as-is');
  await sandbox.loadWorkspace(state.folder.handle);
  assert.equal(state.layers.current, 'interim', 'remembered in the page');
  assert.equal(state.baseline.plateau.id, 'as-is', 'and so is the comparison');
});

// ---- 2. The plateau compared with is read, never written ----

test('the plateau compared with is kept apart: it has its own index, nothing of it is counted as modified, and whatever is saved writes the plateau drawn only', async () => {
  const { sandbox, state, mem } = await open();
  compareWith(sandbox, 'as-is');
  assert.equal(sandbox.countUnsavedChanges(), 0);
  assert.ok(
    state.baseline.index.application.has('shop.session') && !state.index.application.has('shop.session'),
    'the baseline has its own index'
  );
  // an edit of the plateau drawn, and a new element, are saved; the files of the other plateau are never written
  sandbox.commitCreateTopLevelElement({
    category: 'application',
    headerKind: 'system',
    attachUnderReference: null,
    id: 'billing',
    name: 'Billing',
    description: null
  });
  const web = state.manifestFiles.find((f) => f.relPath === 'plateaus/30_to-be/app.shop.web.yaml');
  web.rawText += '# touched\n';
  web.dirty = true;
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus').state, 'success');
  const written = plain(mem.writes.slice().sort());
  assert.ok(written.includes('plateaus/30_to-be/app.shop.web.yaml'), written.join());
  assert.ok(
    written.every((w) => w.startsWith('plateaus/30_to-be/')),
    'only the plateau drawn is written: ' + written.join()
  );
  for (const [name, text] of Object.entries(AS_IS))
    assert.equal(
      mem.files.get('plateaus/10_as-is/' + name).text,
      inPlateau('as-is', text),
      'the other plateau is as it was'
    );
  assert.equal(mem.removals.length, 0);
  assert.deepEqual(
    plain(Array.from(state.dirtyReferences)).filter(
      (r) => state.baseline.index.application.has(r) && !state.index.application.has(r)
    ),
    [],
    'no reference of the other plateau is modified'
  );
});

test('an element of the plateau compared with is not editable: it has no record in the plateau drawn, so no form, no delete, no source file to write', async () => {
  const { sandbox, state } = await open();
  compareWith(sandbox, 'as-is');
  assert.equal(sandbox.findElementRecord('shop.session'), null);
  assert.equal(sandbox.locateContentNode('shop.session'), null);
  assert.ok(
    !state.manifestFiles.some(
      (f) => f.relPath.startsWith('plateaus/10_as-is') && state.index.application.has('shop.session')
    )
  );
});

// ---- 4. The comparison ----

test('compare is called through the embedded module, once for a pair that does not change; its union is what compute draws', async () => {
  const { sandbox, state } = await open();
  assert.equal(sandbox.comparisonState(), null, 'nothing is compared');
  compareWith(sandbox, 'as-is');
  const first = sandbox.comparisonState();
  assert.deepEqual(plain(first.counts), {
    elements: { new: 2, changed: 1, removed: 3, wording_only: 0 },
    relationships: { new: 1, changed: 0, removed: 1 }
  });
  assert.equal(first.base.id, 'as-is');
  assert.equal(first.target.id, 'to-be');
  assert.equal(sandbox.comparisonState().layers, first.layers, 'the same answer while the models are the same');
  sandbox.commitElementEdit('shop.db', (node) => {
    node.name = 'Database, renamed';
  }); // an edit as the page makes it: it ends in a rebuild of the model (run 0045: that is what the comparison is kept by)
  assert.notEqual(sandbox.comparisonState().layers, first.layers, 'an edit of the plateau is compared at once');
  assert.equal(sandbox.comparisonState().counts.elements.changed, 2, 'the database too');
});

test('the kernel input of a comparison is the union: the removed boxes are in it, each relationship under the element that declares it', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['shop'] });
  const byRef = (ref) => input.elements.find((e) => e.reference === ref);
  assert.deepEqual(plain(input.elements.map((e) => e.reference).sort()), [
    'customer',
    'shop',
    'shop.cache',
    'shop.cache.index',
    'shop.db',
    'shop.legacy',
    'shop.legacy.job',
    'shop.session',
    'shop.web'
  ]);
  assert.equal(byRef('shop.session').change, 'removed');
  assert.equal(byRef('shop.cache').change, 'new');
  assert.equal(byRef('shop.web').change, 'changed');
  assert.deepEqual(
    plain(
      byRef('shop.web')
        .relationships.map((r) => r.destination + ':' + r.change)
        .sort()
    ),
    ['shop.cache:new', 'shop.db:none', 'shop.session:removed']
  );
});

test('the comparison draws the four states on the boxes: glyph in the title, line, pill with the word, tint', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const { svg, result } = await draw(sandbox, 'map', '');
  const state = (id) => result.items.find((i) => i.id === id);
  assert.deepEqual(
    ['shop.cache', 'shop.web', 'shop.session', 'shop', 'shop.db'].map((id) => state(id).change),
    ['new', 'changed', 'removed', 'none', 'none']
  );

  const fresh = nodeOf(svg, 'shop.cache');
  assert.match(openingTag(fresh), /class="dg-node dg-leaf dg-styled dg-chg-new"/);
  assert.deepEqual(varsOf(fresh), {
    '--st-stroke': 'var(--chg-new)',
    '--st-width': '3px',
    '--st-dash': 'none',
    '--st-tint': 'var(--chg-new)',
    '--st-stroke-opacity': '1'
  });
  assert.match(fresh, /<text class="dg-title"[^>]*><tspan class="dg-glyph">\+<\/tspan> Cache<\/text>/);
  assert.deepEqual(pillsOf(fresh), ['new']);
  assert.match(fresh, /<rect class="dg-tint" /);

  const changed = nodeOf(svg, 'shop.web');
  assert.match(openingTag(changed), /class="dg-node dg-leaf dg-styled dg-chg-changed"/);
  assert.equal(varsOf(changed)['--st-dash'], '2 3');
  assert.equal(varsOf(changed)['--st-width'], '2px');
  assert.match(changed, /<tspan class="dg-glyph">~<\/tspan> Web storefront<\/text>/);
  assert.deepEqual(pillsOf(changed), ['changed']);

  const removed = nodeOf(svg, 'shop.session');
  assert.match(openingTag(removed), /class="dg-node dg-leaf dg-styled dg-chg-removed"/);
  assert.match(
    openingTag(removed),
    /data-action="select-removed" data-ref="shop\.session" data-layer="application"/,
    'a removed box is not a link to an element'
  );
  assert.equal(varsOf(removed)['--st-dash'], '16 3');
  assert.equal(varsOf(removed)['--st-text'], 'var(--chg-removed-text)');
  assert.match(
    removed,
    /<tspan class="dg-glyph">−<\/tspan> <tspan class="dg-struck">Session store<\/tspan><\/text>/,
    'the glyph is outside the strike'
  );
  assert.match(
    removed,
    /<text class="dg-sub"[^>]*>\[container\]<\/text>/,
    'what it was: its kind, from the other plateau'
  );
  assert.deepEqual(
    pillsOf(removed),
    ['removed'],
    'the word of the state; the qualifier Redis is not styled, so it is no pill'
  );

  const marked = nodeOf(svg, 'shop');
  assert.match(openingTag(marked), /class="dg-node dg-compound dg-styled dg-chg-contains-changes"/);
  assert.deepEqual(varsOf(marked), {
    '--st-stroke': 'var(--chg-contains)',
    '--st-width': '1px',
    '--st-dash': '4 3',
    '--st-stroke-opacity': '1'
  });
  assert.match(marked, /<tspan class="dg-glyph">±<\/tspan> Shop /);
  assert.doesNotMatch(marked, /dg-tint/, 'the marker is discreet: no tint');
  assert.deepEqual(pillsOf(marked), ['contains-changes']);

  const same = nodeOf(svg, 'shop.db');
  assert.doesNotMatch(
    same,
    /dg-styled|dg-chg|dg-tint|dg-glyph|dg-badge/,
    'a box that did not change is drawn as it always was'
  );
  assert.match(same, /<text class="dg-title"[^>]*>Database<\/text>/);
});

test("a box inside a box of the same state has its own line, glyph, pill and tint, and the nesting is the model's", async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const { svg, result } = await draw(sandbox, 'map', '', { input: { opened: ['shop', 'shop.cache', 'shop.legacy'] } });
  const parent = (id) => result.items.find((i) => i.id === id).parent;
  assert.equal(parent('shop.cache.index'), 'shop.cache');
  assert.equal(parent('shop.legacy.job'), 'shop.legacy');
  for (const [outer, inner, glyph] of [
    ['shop.cache', 'shop.cache.index', '+'],
    ['shop.legacy', 'shop.legacy.job', '−']
  ]) {
    const o = nodeOf(svg, outer);
    const i = nodeOf(svg, inner);
    for (const box of [o, i]) {
      assert.match(box, /<rect class="dg-tint" /);
      assert.ok(box.includes('<tspan class="dg-glyph">' + glyph + '</tspan>'));
      assert.equal(pillsOf(box).length, 1);
      assert.equal(varsOf(box)['--st-stroke'], glyph === '+' ? 'var(--chg-new)' : 'var(--chg-removed)');
    }
    assert.match(openingTag(o), /dg-compound/);
    assert.match(openingTag(i), /dg-leaf/);
    assert.ok(
      svg.indexOf('data-id="' + outer + '"') < svg.indexOf('data-id="' + inner + '"'),
      'the box that contains is drawn first, so the inner one is on top'
    );
  }
  // the inner removed box is struck too
  assert.match(nodeOf(svg, 'shop.legacy.job'), /<tspan class="dg-struck">Nightly job<\/tspan>/);
  // the tint of a box that contains others is lighter, so that the boxes inside read on it
  assert.match(CSS, /\.dg-compound \.dg-tint \{ fill-opacity: 0\.08; \}/);
  assert.match(CSS, /\.dg-tint \{ fill: var\(--st-tint, none\); fill-opacity: 0\.16;/);
});

test('the links say their state: line style, an arrowhead of their colour, and the glyph in the caption, also when the captions are off', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const off = await draw(sandbox, 'map', '', { graph: { captions: false }, render: { show: { labels: false } } });
  const l = (from, to) => linkOf(off.svg, from, to);
  assert.match(l('shop.web', 'shop.cache'), /<path class="dg-edge dg-chg-new" marker-end="url\(#dg-arrow-new\)"/);
  assert.match(
    l('shop.web', 'shop.session'),
    /<path class="dg-edge dg-chg-removed" marker-end="url\(#dg-arrow-removed\)"/
  );
  assert.match(l('shop.web', 'shop.db'), /<path class="dg-edge" marker-end="url\(#dg-arrow\)"/, 'unchanged: as it was');
  assert.match(
    l('shop.web', 'shop.cache'),
    /aria-label="Link from Web storefront to Cache: caches in, new"|aria-label="Link from Web storefront to Cache, new"/
  );
  assert.match(off.svg, /<marker id="dg-arrow-new"[^>]*><path class="dg-arrowhead dg-chg-new"/);
  assert.match(off.svg, /<marker id="dg-arrow-removed"/);
  assert.doesNotMatch(off.svg, /<marker id="dg-arrow-changed"/, 'only the states drawn');
  // captions off: the glyph alone, in bold; a link that did not change has no caption
  const captions = Array.from(
    off.svg.matchAll(/<text class="dg-label" data-from="([^"]*)" data-to="([^"]*)"[^>]*>(.*?)<\/text>/g),
    (m) => [m[1] + '>' + m[2], m[3]]
  );
  assert.deepEqual(captions, [
    ['shop.web>shop.cache', '<tspan class="dg-glyph">+</tspan>'],
    ['shop.web>shop.session', '<tspan class="dg-glyph">−</tspan>']
  ]);
  // captions on: the glyph opens the caption
  const on = await draw(sandbox, 'map', '', { graph: { captions: true }, render: { show: { labels: true } } });
  assert.match(
    on.svg,
    /<text class="dg-label" data-from="shop\.web" data-to="shop\.cache"[^>]*><tspan class="dg-glyph">\+<\/tspan> caches in<\/text>/
  );
  assert.match(
    on.svg,
    /<text class="dg-label" data-from="shop\.web" data-to="shop\.session"[^>]*><tspan class="dg-glyph">−<\/tspan> stores<\/text>/
  );
  assert.match(
    on.svg,
    /<text class="dg-label" data-from="shop\.web" data-to="shop\.db"[^>]*>reads<\/text>/,
    'an unchanged link keeps its caption as it was'
  );
  // the tooltip says it too
  assert.match(l('shop.web', 'shop.session'), /<title>Web storefront → Session store : stores\n− removed<\/title>/);
});

test('a changed link is dotted, and a grouped link is the sum of what it stands for', async () => {
  // the label of a relationship that stays between the same two elements is a change of the link
  const files = Object.assign({}, FILES, {
    'plateaus/30_to-be/app.customer.yaml': element('person', null, 'customer', 'Customer', rel('shop.web', 'visits'))
  });
  const changed = await open(undefined, files);
  compareWith(changed.sandbox, 'as-is');
  const { svg, result } = await draw(changed.sandbox, 'map', '');
  assert.equal(result.links.find((x) => x.from === 'customer' && x.to === 'shop.web').change, 'changed');
  assert.match(
    linkOf(svg, 'customer', 'shop.web'),
    /<path class="dg-edge dg-chg-changed" marker-end="url\(#dg-arrow-changed\)"/
  );
  assert.match(
    CSS,
    /\.dg-edge\.dg-chg-changed \{ stroke: var\(--chg-changed\); stroke-width: 2; stroke-dasharray: 2 3; \}/
  );
  assert.match(CSS, /\.dg-edge\.dg-chg-new \{[^}]*stroke-width: 3;[^}]*\}/);
  assert.match(CSS, /\.dg-edge\.dg-chg-removed \{[^}]*stroke-dasharray: 7 4;[^}]*\}/);
});

test('the legend explains the four states with their glyph, their line and their word, and says what red dashed is kept for', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const legend = sandbox.diagramComparisonLegendHtml(sandbox.comparisonState());
  // the Key button (run 0130, #132) is the only addition: the text of the open key is what it was
  assert.match(
    legend,
    /<button type="button" class="dg-legend-toggle" data-action="toggle-diagram-key" aria-expanded="false" aria-controls="diagram-key"[^>]*>Key<\/button>/
  );
  assert.match(legend, /id="diagram-key"/);
  const text = legend
    .replace(/<button[\s\S]*?<\/button>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  assert.equal(
    text,
    'To be compared with As is: + new thick solid ~ changed dotted − removed long dashes, narrow gaps, struck title ± contains changes thin dashed: something inside changed Red dashed is kept for dangling references (unknown elements).'
  );
  assert.deepEqual(
    Array.from(legend.matchAll(/data-state="([^"]*)"/g), (m) => m[1]),
    ['new', 'changed', 'removed', 'contains-changes']
  );
  // a sample of each: the box with the classes and variables of the boxes, the link with the class of the links
  for (const state of ['new', 'changed', 'removed']) {
    assert.match(
      legend,
      new RegExp('<g class="dg-styled dg-chg-' + state + '" style="[^"]*--st-dash:[^"]*"><rect class="dg-box"')
    );
    assert.match(legend, new RegExp('<line class="dg-edge dg-chg-' + state + '"'));
  }
  assert.match(legend, /role="group" aria-label="Comparison"/);
  assert.doesNotMatch(legend, /color|#[0-9a-f]{6}/i, 'the key says nothing by colour');
});

test('the legend sample follows the look the workspace gave a state, as the boxes do', async () => {
  const { sandbox, state } = await open();
  compareWith(sandbox, 'as-is');
  state.workspace.styles = { 'by-tags': { removed: { 'line-style': 3, 'line-color': '#112233' } } };
  const legend = sandbox.diagramComparisonLegendHtml(sandbox.comparisonState());
  assert.match(legend, /dg-chg-removed" style="[^"]*--st-stroke:#112233;[^"]*--st-dash:3 3/);
});

test('the key says, next to each state, how many boxes and links of it the drawing shows', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const { result, comparison } = await draw(sandbox, 'map', '');
  const counts = plain(sandbox.comparisonCountsOf(result));
  assert.deepEqual(counts, {
    new: { boxes: 1, links: 1 },
    changed: { boxes: 1, links: 0 },
    removed: { boxes: 2, links: 1 },
    'contains-changes': { boxes: 1, links: 0 }
  });
  const text = sandbox
    .diagramComparisonLegendHtml(comparison, counts)
    .replace(/<button[\s\S]*?<\/button>/g, '')
    .replace(/<svg[\s\S]*?<\/svg>/g, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  assert.equal(
    text,
    'To be compared with As is: + new thick solid 1 box, 1 link ~ changed dotted 1 box, 0 links \u2212 removed long dashes, narrow gaps, struck title 2 boxes, 1 link \u00B1 contains changes thin dashed: something inside changed 1 box Red dashed is kept for dangling references (unknown elements).'
  );
});

// ---- 5. The author's styles win, property by property ----

test('an entry of styles with the name of a state wins over its default, property by property; the rest of the default stays', async () => {
  const { sandbox, state } = await open();
  compareWith(sandbox, 'as-is');
  state.workspace.styles = { 'by-tags': { new: { 'line-color': '#2A6A4B', 'line-thickness': 5 } } };
  let drawn = await draw(sandbox, 'map', '');
  let vars = varsOf(nodeOf(drawn.svg, 'shop.cache'));
  assert.equal(vars['--st-stroke'], '#2a6a4b', "the author's line");
  assert.equal(vars['--st-width'], '5px', "the author's thickness");
  assert.equal(vars['--st-dash'], 'none', 'the default line style');
  assert.equal(vars['--st-tint'], 'var(--chg-new)', 'the default tint, over the fill');
  assert.deepEqual(pillsOf(nodeOf(drawn.svg, 'shop.cache')), ['new']);
  assert.match(
    nodeOf(drawn.svg, 'shop.cache'),
    /<g class="dg-badge" style="--st-fill:initial;--st-stroke:#2a6a4b;--st-text:initial"/,
    "and the pill is the author's as for any styled stereotype"
  );

  // a fill given by the author replaces the tint (it is the fill of the box, which the tint is laid over)
  state.workspace.styles = {
    'by-tags': {
      changed: { 'background-color': '#FAECDD' },
      removed: { 'font-color': '#aa0000', 'background-color': 'transparent' }
    }
  };
  drawn = await draw(sandbox, 'map', '');
  vars = varsOf(nodeOf(drawn.svg, 'shop.web'));
  assert.equal(vars['--st-fill'], '#faecdd');
  assert.ok(!('--st-tint' in vars), 'no tint: the author coloured the box');
  assert.equal(
    vars['--st-stroke'],
    'var(--chg-changed)',
    'a fill alone does not take the line: the default state line is kept, not the derived outline'
  );
  assert.equal(vars['--st-dash'], '2 3');
  vars = varsOf(nodeOf(drawn.svg, 'shop.session'));
  assert.ok(!('--st-tint' in vars), 'a transparent fill is a fill: no tint');
  assert.equal(vars['--st-stroke'], 'var(--chg-removed)', 'the line is the default');
  assert.notEqual(
    vars['--st-text'],
    'var(--chg-removed-text)',
    "the author's font colour replaces the grey of a removed title (a fill that is transparent gives the box no colour to read it against, so the colour is the page's own)"
  );
});

test("the fill the author gave to another stereotype stays under the tint, and the state's line wins over theirs", async () => {
  const { sandbox, state } = await open();
  state.workspace.styles = {
    'by-qualifiers': { Redis: { 'background-color': 'lightgray', 'line-color': '#333333', 'line-style': 4 } }
  };
  compareWith(sandbox, 'as-is');
  const { svg } = await draw(sandbox, 'map', '');
  const vars = varsOf(nodeOf(svg, 'shop.session'));
  assert.equal(vars['--st-fill'], '#d3d3d3', "the author's fill is kept");
  assert.equal(vars['--st-tint'], 'var(--chg-removed)', 'with the tint over it');
  assert.equal(
    vars['--st-stroke'],
    'var(--chg-removed)',
    'the state comes last and overrides the line of the qualifier, as a later stereotype does'
  );
  assert.equal(vars['--st-dash'], '16 3');
});

test('a hand-written stereotype with the name of a state does not make a box that did not change look like one', async () => {
  const files = Object.assign({}, FILES);
  files['plateaus/30_to-be/app.shop.db.yaml'] = element('container', 'shop', 'db', 'Database', '  qualifiers: [new]\n');
  files['plateaus/10_as-is/app.shop.db.yaml'] = files['plateaus/30_to-be/app.shop.db.yaml'];
  const { sandbox } = await open(undefined, files);
  compareWith(sandbox, 'as-is');
  const { svg, result } = await draw(sandbox, 'map', '');
  assert.deepEqual(
    plain(result.items.find((i) => i.id === 'shop.db').stereotypes),
    ['new'],
    "the author's word, which the kernel keeps on a box that did not change"
  );
  assert.doesNotMatch(nodeOf(svg, 'shop.db'), /dg-styled|dg-glyph|dg-tint/, 'but it is no state: no default look');
});

// ---- 6. Nothing is today's editor ----

test('with Nothing the drawing is byte for byte what it was before the comparison existed', async () => {
  // hashes made with the editor of the commit before this run, on the invented fixture of the other tests and a fake layout; they change only if the
  // drawing of a plain diagram changes on purpose
  const { sandbox, state, kernel } = await openFixture();
  state.workspace.styles = {
    'by-tags': {
      external: { 'background-color': 'lightgray' },
      new: { 'background-color': '#DAF2E6', 'line-color': '#2A6A4B' }
    }
  };
  run(sandbox, "currentPerspective = 'elements';");
  const cases = [
    ['map', '', { opened: ['shop'] }, false, '1a0bdc9985dce9ff'],
    ['map', '', { opened: ['shop'] }, true, 'f8b2870c66ae26cf'],
    ['overview', 'shop.web.api', {}, false, 'e6ddcb235de2694a'],
    ['overview', 'shop.web.api', {}, true, '062843508b2565f0'],
    ['deep', 'shop', {}, false, 'c305d271995ba73c'],
    ['deep', 'shop', {}, true, '6f186c1fb01f4fa3'],
    ['detailed', 'shop', {}, false, '9c0e4da41a64d94b'],
    ['detailed', 'shop', {}, true, '9647cd9194428675'],
    ['overview', 'prod.cluster', { layer: 'technology' }, false, '1bff9fe59a4677e8'],
    ['overview', 'prod.cluster', { layer: 'technology' }, true, '1bff9fe59a4677e8']
  ];
  for (const [viewpoint, reference, options, wrap, expected] of cases) {
    const result = kernel.compute(sandbox.buildKernelInput(viewpoint, reference, options).input);
    const graph = sandbox.buildElkGraph(result, { qualifiers: true, descriptions: wrap, wrap, captions: true });
    const svg = sandbox.renderDiagramSvg(fakeLayout(graph), result, reference, {}).html;
    assert.equal(sha(svg), expected, viewpoint + ' ' + reference + ' wrap=' + wrap);
    assert.doesNotMatch(svg, /dg-chg|dg-tint|dg-glyph|dg-struck|dg-arrow-/, 'none of the markup of a comparison');
  }
  const legend = sandbox.diagramLegendHtml(true, ['external', 'new', 'plain']);
  assert.equal(sha(legend), '2f63bbc2693fd2bb');
});

test('turning the comparison on and off gives the same markup as before it was turned on', async () => {
  const { sandbox } = await open();
  const before = await draw(sandbox, 'map', '');
  compareWith(sandbox, 'as-is');
  const during = await draw(sandbox, 'map', '');
  assert.notEqual(during.svg, before.svg);
  compareWith(sandbox, '');
  const after = await draw(sandbox, 'map', '');
  assert.equal(after.svg, before.svg);
  assert.deepEqual(plain(after.graph), plain(before.graph));
  assert.doesNotMatch(JSON.stringify(sandbox.buildKernelInput('map', '', { opened: ['shop'] }).input), /"change"/);
});

test('the kernel input with Nothing carries no trace of a comparison, and the same elements as the plateau alone', async () => {
  const { sandbox, state } = await open();
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['shop'] });
  assert.deepEqual(plain(input.elements.map((e) => e.reference).sort()), [
    'customer',
    'shop',
    'shop.cache',
    'shop.cache.index',
    'shop.db',
    'shop.web'
  ]);
  assert.deepEqual(plain(input.elements), plain(sandbox.toKernelElements(state.index.application, false).elements));
});

// ---- 7. The layout is posed on the union ----

test('the layout graph is the same for the pair turned either way: no box changes size, so none moves when the plateaus are swapped', async () => {
  const graphOf = async (current, other) => {
    const { sandbox } = await open(current);
    compareWith(sandbox, other);
    const { graph } = await draw(sandbox, 'map', '', {
      input: { opened: ['shop', 'shop.legacy'] },
      graph: { captions: true }
    });
    const strip = (g) => JSON.parse(JSON.stringify(g, (key, value) => (key === 'text' ? undefined : value)));
    return strip(graph);
  };
  // interim is as-is without the legacy batch and its job: what is removed from one side is new from the other, and nothing is renamed
  const forward = await graphOf('interim', 'as-is');
  const backward = await graphOf('as-is', 'interim');
  assert.deepEqual(backward, forward);
  assert.ok(
    JSON.stringify(forward).includes('shop.legacy.job'),
    'the union: the elements of both plateaus are laid out'
  );
});

test('a comparison lays out the elements of both plateaus; with Nothing the plateau is laid out alone', async () => {
  const { sandbox } = await open();
  const alone = await draw(sandbox, 'map', '', { input: { opened: ['shop', 'shop.cache'] } });
  compareWith(sandbox, 'as-is');
  const union = await draw(sandbox, 'map', '', { input: { opened: ['shop', 'shop.cache', 'shop.legacy'] } });
  const ids = (graph) => {
    const out = [];
    const walk = (n) => {
      for (const c of n.children || []) {
        out.push(c.id);
        walk(c);
      }
    };
    walk(graph);
    return out.sort();
  };
  assert.ok(!ids(alone.graph).includes('shop.session') && !ids(alone.graph).includes('shop.legacy'));
  assert.ok(
    ids(union.graph).includes('shop.session') &&
      ids(union.graph).includes('shop.legacy') &&
      ids(union.graph).includes('shop.legacy.job')
  );
});

// ---- 8. A click on a removed box ----

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

test('a click on a removed box shows what the other plateau had, read-only, and selects nothing in this one', async () => {
  const { sandbox, state } = await open();
  compareWith(sandbox, 'as-is');
  run(sandbox, "currentPerspective = 'map';");
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.session', 'data-layer': 'application' });
  assert.equal(state.selection.kind, 'none');
  const panel = sandbox.renderMapPerspectiveHtml().right;
  assert.ok(panel, "the Map's panel is there");
  assert.match(
    panel,
    /class="inspection inspection-removed" data-inspection-ref="shop\.session" data-inspection-layer="application"/
  );
  assert.match(
    panel,
    /<div class="inspection-name"><span>Session store<\/span><span class="stereotype-badge"[^>]*>removed<\/span><\/div>/
  );
  assert.match(panel, /Removed: this element is only in “As is”, the plateau this one is compared with\./);
  assert.match(panel, /nothing here is edited or saved/);
  assert.match(
    panel,
    /<span class="field-label">Source file<\/span><span class="field-value">plateaus\/10_as-is\/app\.shop\.session\.yaml<\/span>/
  );
  assert.match(panel, /<span class="pill[^>]*>Redis<\/span>|Redis/);
  assert.doesNotMatch(
    panel,
    /data-action="goto-element"|data-action="toggle-element-edit"|data-action="delete/,
    'nothing leads into the other plateau, nothing edits it'
  );
  // a box with relationships lists them as text
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.legacy', 'data-layer': 'application' });
  assert.match(sandbox.renderMapPerspectiveHtml().right, /data-inspection-ref="shop\.legacy"/);
  // any other selection ends it, and so does the cross of the panel
  state.selection = { kind: 'element', key: 'shop.web', mode: 'view' };
  assert.match(sandbox.renderMapPerspectiveHtml().right, /data-inspection-ref="shop\.web"/);
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.session', 'data-layer': 'application' });
  click(sandbox, { 'data-action': 'close-inspection' });
  // run 0040: with a comparison on the right-hand panel never goes: nothing selected, it is the Changes panel (it was no panel before this run)
  const closed = sandbox.renderMapPerspectiveHtml().right;
  assert.doesNotMatch(
    closed,
    /class="inspection( inspection-removed)?" data-inspection-ref/,
    'closed: nothing of the selection is left'
  );
  assert.match(closed, /data-changes-panel/, 'the list of the changes is what the panel shows');
});

test('in Elements the element of the diagram stays the subject while the panel tells about the removed box', async () => {
  const { sandbox, state } = await open();
  compareWith(sandbox, 'as-is');
  state.selection = { kind: 'element', key: 'shop.web', mode: 'view' };
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview';");
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.session', 'data-layer': 'application' });
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.web', mode: 'view' });
  assert.match(
    sandbox.renderElementsPerspectiveHtml().right,
    /inspection-removed" data-inspection-ref="shop\.session"/
  );
  click(sandbox, { 'data-action': 'close-removed' });
  assert.match(sandbox.renderElementsPerspectiveHtml().right, /data-inspection-ref="shop\.web"/);
});

test('the removed box that was clicked is outlined as a selected box is', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  run(sandbox, "currentPerspective = 'map';");
  click(sandbox, { 'data-action': 'select-removed', 'data-ref': 'shop.session', 'data-layer': 'application' });
  const classes = [];
  const box = {
    getAttribute: (n) => ({ 'data-ref': 'shop.session', 'data-layer': 'application' })[n] || null,
    classList: { add: (c) => classes.push(c) }
  };
  const canvas = {
    hasAttribute: (n) => n === 'data-map',
    getAttribute: () => null,
    querySelectorAll: (s) => (s === '.dg-selected' ? [] : [box])
  };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  sandbox.markMapSelection();
  assert.deepEqual(classes, ['dg-selected']);
});

test('Center puts the removed box that was clicked in the middle, as it does the selected element', () => {
  const source = run(createApp(), 'showDiagramScene.toString()');
  assert.match(source, /const pickedRemoved = removedInspectionOf\(sel, 'map'\)/);
  assert.match(
    source,
    /scene\.focal = pickedRemoved && scene\.boxes && scene\.boxes\[pickedRemoved\.reference\] \? scene\.boxes\[pickedRemoved\.reference\]/
  );
});

test('the page of a view in the Library draws the comparison too, and a click on a removed box there is the selection of the page', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const view = { id: 'v1', viewpoint: 'map', properties: { opened: ['shop'] } };
  assert.equal(sandbox.libraryDiagramRecipe(view).viewpoint, 'map');
  const { input } = sandbox.buildKernelInput('map', '', { layer: 'application', opened: ['shop'], pinned: [] });
  assert.ok(
    input.elements.some((e) => e.change === 'removed'),
    'the same union'
  );
  // the removed box of a page that only shows the drawing is still a way to read what it was
  const { result, comparison } = await draw(sandbox, 'map', '');
  sandbox.tellRemovedItems(result, comparison, 'application');
  const svg = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result, { captions: false })), result, '', {
    map: true,
    readonly: true,
    show: { labels: false }
  }).html;
  assert.match(
    nodeOf(svg, 'shop.session'),
    /data-action="select-removed" data-ref="shop\.session" data-layer="application"/
  );
  const panel = sandbox.inspectionPanelHtml(
    { kind: 'baseline-element', key: 'shop.session', layer: 'application', mode: 'view' },
    'library'
  );
  assert.match(panel, /inspection-removed" data-inspection-ref="shop\.session"/);
  // not removed any more (the comparison is off): nothing to tell
  compareWith(sandbox, '');
  assert.equal(
    sandbox.inspectionPanelHtml(
      { kind: 'baseline-element', key: 'shop.session', layer: 'application', mode: 'view' },
      'library'
    ),
    null
  );
});

test('a removed box can be opened on the map: the kernel is given the references of the union that it may open', async () => {
  const { sandbox } = await open();
  run(sandbox, 'mapOpened = new Set(["shop", "shop.legacy"]);');
  assert.deepEqual(plain(sandbox.currentMapState().opened), ['shop'], 'alone, the plateau does not have it');
  compareWith(sandbox, 'as-is');
  assert.deepEqual(plain(sandbox.currentMapState().opened), ['shop', 'shop.legacy']);
  const { svg } = await draw(sandbox, 'map', '', { input: { opened: sandbox.currentMapState().opened } });
  assert.match(svg, /data-id="shop\.legacy\.job"/);
});

// ---- 9. The export agrees with the screen ----

test('the CSS of the export repeats the rules of the states with the colours of the theme, and defines the variables the boxes carry inline', async () => {
  const { sandbox } = await open();
  const themes = {
    light: {
      '--bg': '#fcfcfc',
      '--panel-bg': '#f1f1f1',
      '--border': '#dddddd',
      '--muted': '#667788',
      '--fg': '#111111',
      '--accent': '#0a66cc',
      '--danger': '#cc0000',
      '--chg-new': '#007744',
      '--chg-changed': '#995500',
      '--chg-removed': '#666666',
      '--chg-removed-text': '#555555',
      '--chg-contains': '#446688'
    },
    dark: {
      '--bg': '#1c1c1c',
      '--panel-bg': '#222222',
      '--border': '#444444',
      '--muted': '#99aabb',
      '--fg': '#eeeeee',
      '--accent': '#66aaff',
      '--danger': '#ff6666',
      '--chg-new': '#33dd99',
      '--chg-changed': '#ffb050',
      '--chg-removed': '#a0a0a0',
      '--chg-removed-text': '#b0b0b0',
      '--chg-contains': '#88b0d8'
    }
  };
  for (const theme of ['light', 'dark']) {
    sandbox.getComputedStyle = () => ({ getPropertyValue: (name) => ' ' + themes[theme][name] + ' ' });
    const css = sandbox.diagramExportCss();
    const t = themes[theme];
    assert.ok(
      css.includes(
        'svg{--chg-new:' +
          t['--chg-new'] +
          ';--chg-changed:' +
          t['--chg-changed'] +
          ';--chg-removed:' +
          t['--chg-removed'] +
          ';--chg-removed-text:' +
          t['--chg-removed-text'] +
          ';--chg-contains:' +
          t['--chg-contains'] +
          '}'
      ),
      theme
    );
    assert.ok(
      css.includes(
        '.dg-tint{fill:var(--st-tint,none);fill-opacity:.16;stroke:none}.dg-compound .dg-tint{fill-opacity:.08}'
      )
    );
    assert.ok(
      css.includes(
        '.dg-struck{text-decoration:line-through}.dg-glyph{font-weight:700}.dg-label .dg-glyph{font-size:14px}'
      )
    );
    assert.ok(css.includes('.dg-edge.dg-chg-new{stroke:' + t['--chg-new'] + ';stroke-width:3;stroke-dasharray:none}'));
    assert.ok(
      css.includes('.dg-edge.dg-chg-changed{stroke:' + t['--chg-changed'] + ';stroke-width:2;stroke-dasharray:2 3}')
    );
    assert.ok(
      css.includes('.dg-edge.dg-chg-removed{stroke:' + t['--chg-removed'] + ';stroke-width:1.6;stroke-dasharray:7 4}')
    );
    assert.ok(css.includes('.dg-arrowhead.dg-chg-removed{fill:' + t['--chg-removed'] + '}'));
    // the red dashed of a dangling reference is still there, and still its own
    assert.ok(css.includes('.dg-ghost .dg-box{stroke:' + t['--danger'] + ';stroke-dasharray:5 4}'));
    assert.ok(css.indexOf('.dg-ghost-edge') < css.indexOf('.dg-edge.dg-chg-new'));
    assert.ok(
      css.indexOf('.dg-styled>.dg-box') < css.indexOf('.dg-tint'),
      'the tint is laid over the box the styled rule draws'
    );
  }
});

test('the page and the export agree on the lines of the states', () => {
  const page = (cls) =>
    CSS.match(new RegExp('\\.dg-edge\\.dg-chg-' + cls + ' \\{([^}]*)\\}'))[1]
      .replace(/\s+/g, ' ')
      .trim();
  assert.equal(page('new'), 'stroke: var(--chg-new); stroke-width: 3; stroke-dasharray: none;');
  assert.equal(page('changed'), 'stroke: var(--chg-changed); stroke-width: 2; stroke-dasharray: 2 3;');
  assert.equal(page('removed'), 'stroke: var(--chg-removed); stroke-width: 1.6; stroke-dasharray: 7 4;');
  const source = HTML.slice(
    HTML.indexOf('function diagramExportCss()'),
    HTML.indexOf('function diagramExportDocument()')
  );
  assert.doesNotMatch(source, /#[0-9a-f]{6}/i, 'the export has no colour of its own');
});

test('the export of a comparison carries the glyphs, the struck titles, the pills and the tint: they are in the drawing it clones; the key is not exported, as before', async () => {
  const { sandbox } = await open();
  compareWith(sandbox, 'as-is');
  const { svg } = await draw(sandbox, 'map', '');
  for (const needle of [
    '<tspan class="dg-glyph">+</tspan>',
    '<tspan class="dg-glyph">−</tspan>',
    '<tspan class="dg-struck">',
    'class="dg-tint"',
    'class="dg-badge"',
    'dg-chg-removed',
    'marker-end="url(#dg-arrow-new)"'
  ])
    assert.ok(svg.includes(needle), needle);
  const source = sandbox.diagramExportDocument.toString();
  assert.doesNotMatch(source, /legend/i, 'the export has never carried the key');
  assert.match(source, /querySelectorAll\('\.dg-fold'\)/);
  assert.doesNotMatch(source, /dg-tint|dg-struck|dg-glyph|dg-chg/, 'and removes nothing of what a state draws');
});

// ---- 10. The look reads in both themes ----

test("the colours of the states are defined for the light theme, the system's dark and the forced dark", () => {
  const names = ['--chg-new', '--chg-changed', '--chg-removed', '--chg-removed-text', '--chg-contains'];
  const light = CSS.match(/:root \{([^}]*)\}/)[1];
  const system = CSS.match(/prefers-color-scheme: dark\) \{\s*:root:not\(\[data-theme="light"\]\) \{([^}]*)\}/)[1];
  const forced = CSS.match(/:root\[data-theme="dark"\] \{([^}]*)\}/)[1];
  const value = (block, name) => {
    const m = new RegExp(name + ': (#[0-9a-f]{6});').exec(block);
    assert.ok(m, name);
    return m[1];
  };
  const luminance = (hex) => {
    const c = [1, 3, 5]
      .map((i) => parseInt(hex.slice(i, i + 2), 16) / 255)
      .map((v) => (v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4)));
    return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
  };
  const contrast = (a, b) => {
    const [h, l] = [luminance(a), luminance(b)].sort((x, y) => y - x);
    return (h + 0.05) / (l + 0.05);
  };
  for (const name of names)
    assert.equal(value(system, name), value(forced, name), name + ': the two dark blocks agree');
  // a line must be seen against the page (3:1, the least WCAG asks of a graphic), the grey of a removed title read (4.5:1)
  for (const name of ['--chg-new', '--chg-changed', '--chg-removed', '--chg-contains']) {
    assert.ok(contrast(value(light, name), '#f7f7f8') >= 3, name + ' on the light panel');
    assert.ok(contrast(value(system, name), '#1e1e1e') >= 3, name + ' on the dark page');
  }
  assert.ok(contrast(value(light, '--chg-removed-text'), '#f7f7f8') >= 4.5);
  assert.ok(contrast(value(system, '--chg-removed-text'), '#262626') >= 4.5);
});

// ---- 11. A comparison that cannot be made ----

test('the kernel refusing a pair is said, and the plateau alone is still what the input holds', async () => {
  const files = Object.assign({}, FILES);
  files['plateaus/30_to-be/app.env.yaml'] = element(
    'environment',
    null,
    'prod',
    'Production',
    '  uses:\n    - nowhere\n'
  );
  const { sandbox } = await open(undefined, files);
  compareWith(sandbox, 'as-is');
  const comparison = sandbox.comparisonState();
  assert.match(comparison.problems[0], /^The comparison with “As is” could not be made: dangling reference: nowhere/);
  const { input } = sandbox.buildKernelInput('map', '', { opened: ['shop'] });
  assert.ok(
    input.elements.every((e) => e.change === undefined),
    'no half-comparison'
  );
});

test('the drawing waits for the kernel when a comparison is asked for while it is not loaded', async () => {
  // the page loads the kernel before it resolves a layer, so the window is a kernel that is gone (a failed load): the comparison says it is pending, and the next load fills it
  const { sandbox, state } = await open();
  compareWith(sandbox, 'as-is');
  assert.equal(state.baseline.plateau.id, 'as-is');
  run(sandbox, 'loadedKernel = null; viewpointKernelPromise = null;');
  assert.deepEqual(plain(sandbox.comparisonState()), { pending: true });
  await sandbox.loadViewpointKernel();
  assert.ok(sandbox.comparisonState().layers);
});
