'use strict';
// A link of a diagram is selected (run 0019, TDD-0019): the selection kind `link`, keyed by the pair of boxes, the markup of
// the links in the SVG, the panel that lists the declared relationships of the pair, and everything that reads the selection
// while a link is selected. The harness has no DOM: the drawing is built from the real kernel and a fake layout, the page
// is driven with fake elements. The look beside a real drawing is checked in a browser.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS_NO_COMMENTS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');
const NONE = { kind: 'none', key: null, mode: 'view' };
const plain = (value) => JSON.parse(JSON.stringify(value));

function fakeLayout(graph) {
  const place = (node, x) => Object.assign({}, node, {
    x, y: 0, width: node.width || 400, height: node.height || 200,
    children: (node.children || []).map((child, i) => place(child, 10 + i * 20))
  });
  return Object.assign(place(graph, 0), {
    width: 900, height: 600,
    edges: graph.edges.map((edge) => Object.assign({}, edge, {
      sections: [{ startPoint: { x: 1, y: 1 }, bendPoints: [{ x: 5, y: 1 }], endPoint: { x: 9, y: 9 } }],
      labels: (edge.labels || []).map((label) => Object.assign({ x: 3, y: 3 }, label))
    }))
  });
}

/** A drawing of the fixture, as the page draws it, put on screen as the scene `showDiagramScene` would hold. */
async function page(perspective, viewpoint, reference, options) {
  const { sandbox, state, kernel } = await openFixture();
  const map = perspective === 'map';
  const layer = (options && options.layer) || 'application';
  run(sandbox, "currentPerspective = '" + perspective + "'; elementTab = '" + (map ? 'overview' : viewpoint) + "'; diagramMaximized = false;");
  if (!map) state.selection = { kind: 'element', key: reference, mode: 'view' };
  const result = kernel.compute(sandbox.buildKernelInput(viewpoint, reference, Object.assign({ layer }, options && options.kernel)).input);
  const ghosts = sandbox.buildDiagramGhosts(result, map ? null : reference, layer);
  const drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(drawn)), drawn, map ? '' : reference, { map, layer, opened: [], pinned: [] });
  const scene = { viewKey: map ? 'map|map||' : reference + '|' + viewpoint, html: drawing.html, hasSvg: true, links: drawing.links, boxes: drawing.boxes, drawnIds: new Set(Object.keys(drawing.boxes)), status: '', legend: '', width: drawing.width, height: drawing.height, focal: null };
  const show = (shown) => { sandbox.__scene = shown || scene; run(sandbox, 'diagramScene = __scene;'); };
  show();
  const regions = () => (map ? sandbox.renderMapPerspectiveHtml() : sandbox.renderElementsPerspectiveHtml());
  return { sandbox, state, kernel, drawing, scene, show, regions };
}

const linkSelection = (from, to, extra) => Object.assign({ kind: 'link', key: from + ' -> ' + to, from, to, layer: 'application', mode: 'view' }, extra);

// ============================================================ the markup of a link in the drawing

test('a link and its caption are selectable: the action, the pair, the layer, a role, a label and a place in the roving tab stop', async () => {
  const { drawing } = await page('elements', 'overview', 'shop.web.api');
  const link = drawing.html.match(/<g class="dg-link"[^>]*>/g).find((g) => g.includes('data-from="shop.web.frontend"'));
  assert.match(link, /^<g class="dg-link" data-from="shop\.web\.frontend" data-to="shop\.web\.api" data-layer="application" data-action="select-link" tabindex="-?[01]" role="button" aria-pressed="false" aria-label="Link from [^"]+ to [^"]+: calls \[REST\]">$/);
  const caption = drawing.html.match(/<text class="dg-label"[^>]*>/g).find((t) => t.includes('data-from="shop.web.frontend"'));
  assert.match(caption, /data-action="select-link"/);
  assert.ok(!/tabindex/.test(caption), 'the caption is clickable, not a tab stop: its link is');
  assert.ok(drawing.html.includes('data-action="goto-element"'), 'the boxes keep their action');
});

test('the drawing records one pair per two boxes, with its ends and every link between them', async () => {
  const { drawing } = await page('elements', 'overview', 'shop.web.api');
  assert.equal(drawing.links.length, 6);
  const pair = drawing.links.find((p) => p.from === 'shop.web.frontend' && p.to === 'shop.web.api');
  assert.equal(pair.links.length, 1);
  assert.equal(pair.fromEnd.reference, 'shop.web.frontend');
  assert.equal(pair.toEnd.title, 'API');
  assert.equal(pair.fromEnd.ghost, false);
});

test('two links between the same two boxes are one pair', async () => {
  const { sandbox } = await openFixture();
  const result = {
    items: [{ id: 'a', reference: 'a', parent: null }, { id: 'b', reference: 'b', parent: null }],
    links: [
      { from: 'a', to: 'b', label: 'one', qualifiers: [], tags: { x: '1' }, synthetic: false, secondary: false, relationships: [{ from: 'a', destination: 'b', label: 'one', qualifiers: [], tags: { x: '1' } }] },
      { from: 'a', to: 'b', label: 'two', qualifiers: [], tags: { x: '2' }, synthetic: false, secondary: false, relationships: [{ from: 'a', destination: 'b', label: 'two', qualifiers: [], tags: { x: '2' } }] },
      { from: 'b', to: 'a', label: 'back', qualifiers: [], tags: {}, synthetic: false, secondary: false, relationships: [] }
    ]
  };
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(result)), result, '');
  assert.equal(drawing.links.length, 2, 'A to B and B to A are two pairs');
  assert.equal(drawing.links.find((p) => p.from === 'a').links.length, 2);
});

// ============================================================ the panel

test('the panel of a natural link: its ends, its label, its qualifiers and its tags', async () => {
  // the Map groups by box: the diagram of an element has the natural link
  const elements = await page('elements', 'overview', 'shop.web.api');
  elements.state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  const right = elements.regions().right;
  assert.match(right, /class="inspection inspection-link" data-inspection-from="shop\.web\.frontend" data-inspection-to="shop\.web\.api" data-inspection-layer="application"/);
  assert.match(right, /<h3>Selected link<\/h3>/);
  assert.match(right, /<span class="field-label">From<\/span><span class="field-value"><span class="inspection-end-name">Frontend<\/span>/);
  assert.match(right, /<span class="field-label">To<\/span><span class="field-value"><span class="inspection-end-name">API<\/span>/);
  // the declaring element is a button (run 0024); the destination is text
  assert.match(right, /<div class="inspection-rel-label">calls<\/div><div class="inspection-rel-path"><button [^>]*data-ref="shop\.web\.frontend"[^>]*>shop\.web\.frontend<\/button> &rarr; shop\.web\.api<\/div>/);
  assert.match(right, /<span class="field-label">Qualifiers<\/span><span class="field-value"><span class="pill">REST<\/span>/);
  assert.match(right, /<span class="tag-key">audited<\/span>: <span class="tag-value">no<\/span>/);
  assert.ok(!right.includes('are grouped'), 'a single relationship is not a group');
  assert.match(right, /<span class="field-count">1<\/span>/);
  assert.ok(right.includes('data-action="close-inspection"'), 'and it can be closed');
});

test('a relationship without a label, qualifiers or tags says none of each', async () => {
  const { state, regions } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.api', 'shop.web.session', { focal: 'shop.web.api' });
  const right = regions().right;
  assert.match(right, /<div class="inspection-rel-label"><span class="muted">no label<\/span><\/div>/);
  assert.equal((right.match(/<span class="muted">none<\/span>/g) || []).length, 2, 'qualifiers and tags');
});

test('a link that groups several relationships lists them all and says so', async () => {
  const { state, regions } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  const right = regions().right;
  assert.match(right, /2 relationships are grouped in this link\./);
  assert.equal((right.match(/class="inspection-rel"/g) || []).length, 2);
  assert.match(right, />customer<\/button> &rarr; shop\.web\.edge\.gateway/);
  assert.match(right, /<div class="inspection-rel-label">browses with<\/div><div class="inspection-rel-path"><button [^>]*data-ref="customer"[^>]*>customer<\/button> &rarr; shop\.web\.frontend/);
});

test('a link to a folded box names the folded end and what it hides', async () => {
  const { state, regions } = await page('elements', 'deep', 'shop.catalog', { kernel: { collapsed: ['shop.catalog.service'] } });
  state.selection = linkSelection('shop.catalog.service', 'shop.catalog.db', { focal: 'shop.catalog' });
  const right = regions().right;
  assert.match(right, /is folded: it stands for 2 hidden elements\. Open it to see their relationships one by one\./);
  assert.match(right, /3 relationships are grouped in this link\./);
  assert.match(right, />shop\.catalog\.service\.indexer<\/button> &rarr; shop\.catalog\.db/, 'the declaring elements are the ones inside the folded box');
});

test('a link to an unknown element says it points at nothing', async () => {
  const { sandbox, state, kernel } = await openFixture();
  sandbox.commitElementEdit('shop.web.api', (node) => { node.relationships = node.relationships.concat([{ destination: 'shop.nowhere', label: 'lost', qualifiers: ['X'], tags: { t: 'v' } }]); });
  run(sandbox, "currentPerspective = 'elements'; elementTab = 'overview'; diagramMaximized = false;");
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  const result = kernel.compute(sandbox.buildKernelInput('overview', 'shop.web.api').input);
  const ghosts = sandbox.buildDiagramGhosts(result, 'shop.web.api', 'application');
  const drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  const drawing = sandbox.renderDiagramSvg(fakeLayout(sandbox.buildElkGraph(drawn)), drawn, 'shop.web.api', { layer: 'application' });
  sandbox.__scene = { links: drawing.links };
  run(sandbox, 'diagramScene = __scene;');
  const ghostId = ghosts.items[0].id;
  assert.ok(drawing.html.includes('data-from="shop.web.api" data-to="' + sandbox.escapeHtml(ghostId) + '"'), 'the ghost link is selectable too');
  state.selection = linkSelection('shop.web.api', ghostId, { focal: 'shop.web.api' });
  const right = sandbox.renderElementsPerspectiveHtml().right;
  assert.match(right, /unknown element/);
  assert.match(right, /<div class="inspection-rel-label">lost<\/div>/);
  assert.match(right, /<span class="pill">X<\/span>/);
  assert.match(right, /<span class="tag-key">t<\/span>: <span class="tag-value">v<\/span>/);
  assert.match(right, /There is no element &ldquo;shop\.nowhere&rdquo;: the relationship points at nothing\./);
});

test('what the YAML says never reaches the panel as markup', async () => {
  const { state, scene, show, regions } = await page('elements', 'overview', 'shop.web.api');
  const pair = scene.links.find((p) => p.from === 'shop.web.frontend');
  pair.links[0].relationships = [{ from: '<b>x</b>', destination: '"><img src=x onerror=alert(1)>', label: '<script>alert(2)</script>', qualifiers: ['<i>q</i>'], tags: { '<k>': '<v>' } }];
  show(scene);
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  const right = regions().right;
  assert.ok(!right.includes('<script') && !right.includes('<img') && !right.includes('<b>') && !right.includes('<i>') && !right.includes('<k>'));
  assert.ok(right.includes('&lt;script&gt;alert(2)&lt;/script&gt;'));
});

test('with no drawing that has the pair, the panel waits instead of guessing', async () => {
  const { sandbox, state, regions } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  run(sandbox, 'diagramScene = null;');
  const right = regions().right;
  assert.match(right, /Reading the link&hellip;/);
  assert.ok(right.includes('close-inspection'));
});

test('the element panel is unchanged by the link code: the helpers give the markup the Details page had', async () => {
  const { sandbox } = await openFixture();
  const record = sandbox.findElementRecord('shop.payments');
  const rows = sandbox.renderElementPropertiesHtml(record);
  assert.ok(rows.includes(sandbox.renderQualifierPillsHtml(record.qualifiers)) && rows.includes(sandbox.renderTagListHtml(record.tags)));
  assert.equal(sandbox.renderQualifierPillsHtml([]), '<span class="muted">none</span>');
  assert.equal(sandbox.renderTagListHtml({}), '<span class="muted">none</span>');
  assert.equal(sandbox.renderTagListHtml({ 'tcp-port': '443' }), '<ul class="tag-list"><li><span class="tag-key">tcp-port</span>: <span class="tag-value">443</span></li></ul>');
});

// ============================================================ the selection kind, in Elements

test('in Elements the element stays the subject: centre, tree row, URL and tabs follow it while a link is selected', async () => {
  const { sandbox, state } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  assert.deepEqual(plain(sandbox.elementSelection()), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' });
  assert.equal(sandbox.currentRouteHash(), '/timeline/elements?ref=shop.web.api&tab=overview&link-from=shop.web.frontend&link-to=shop.web.api', 'the element, its tab, and now the link (run 0024)');
  assert.equal(sandbox.diagramTabShown(), true);
  assert.match(sandbox.renderCenterPanelHtml(), /diagram-canvas/);
  sandbox.expandAncestorsOf('shop.web.api');
  assert.match(sandbox.renderElementsNavHtml(true), /aria-selected="true"[^>]*data-node="application:shop\.web\.api"/, 'the tree still marks the row of the element');
  assert.equal(sandbox.layerOfReference('shop.web.api'), 'application');
  assert.ok(sandbox.renderElementsPerspectiveHtml().right.includes('inspection-link'));
});

test('on the Map a link selection is no element: no subject, no Open in Elements, no ref in the address (the link is)', async () => {
  const { sandbox, state, regions } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  assert.equal(sandbox.elementSelection().kind, 'link');
  assert.equal(sandbox.currentRouteHash(), '/timeline/applications?link-from=customer&link-to=shop');
  const center = regions().center;
  assert.ok(!center.includes('element-header-subject') && !center.includes('open-as-diagram'));
});

test('a link is not an element for the readers that only know elements', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  assert.equal(sandbox.inspectionRecordFor(state.selection), null);
  assert.equal(sandbox.diagramTabShown(), false);
  assert.equal(sandbox.mapIsShown(), true);
});

test('dropLinkSelection: the element of Elements, nothing on the Map', async () => {
  const { sandbox, state } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  sandbox.dropLinkSelection();
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' });
  state.selection = linkSelection('customer', 'shop');
  sandbox.dropLinkSelection();
  assert.deepEqual(plain(state.selection), NONE);
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  sandbox.dropLinkSelection();
  assert.equal(state.selection.kind, 'element', 'any other kind is left alone');
});

// ============================================================ the lifetime of a link selection

test('a link is cleared on navigation: another perspective, Details, a deleted element', async () => {
  const mapLink = linkSelection('customer', 'shop');
  const elementsLink = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });

  let p = await page('map', 'map', null);
  p.state.selection = mapLink;
  p.sandbox.settleLinkSelection();
  assert.equal(p.state.selection.kind, 'link', 'the Map keeps it');
  run(p.sandbox, "currentPerspective = 'elements';");
  p.sandbox.settleLinkSelection();
  assert.deepEqual(plain(p.state.selection), NONE, 'leaving the Map ends it');

  p = await page('elements', 'overview', 'shop.web.api');
  p.state.selection = elementsLink;
  p.sandbox.settleLinkSelection();
  assert.equal(p.state.selection.kind, 'link', 'a diagram tab of the element keeps it');
  run(p.sandbox, "elementTab = 'deep';");
  p.sandbox.settleLinkSelection();
  assert.equal(p.state.selection.kind, 'link', 'another diagram tab too (the new drawing decides)');
  run(p.sandbox, "elementTab = 'details';");
  p.sandbox.settleLinkSelection();
  assert.deepEqual(plain(p.state.selection), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' }, 'Details ends it and keeps the element');

  p = await page('elements', 'overview', 'shop.web.api');
  p.state.selection = elementsLink;
  run(p.sandbox, "currentPerspective = 'map';");
  p.sandbox.settleLinkSelection();
  assert.deepEqual(plain(p.state.selection), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' }, 'the Map is another diagram');

  p = await page('elements', 'overview', 'shop.web.api');
  p.state.selection = linkSelection('a', 'b', { focal: 'shop.gone' });
  p.sandbox.settleLinkSelection();
  assert.equal(p.state.selection.kind, 'element', 'the element is gone: back to the element selection, which render() then drops');
});

test('render() settles the link first, before anything reads the selection', () => {
  const body = HTML.slice(HTML.indexOf('\nfunction render() {'));
  const first = body.indexOf('settleLinkSelection();');
  assert.ok(first > 0 && first < body.indexOf('landingScreenConfig()'), 'at the top of render()');
  assert.ok(first < body.indexOf('renderShellHtml()'));
});

test('the rename and delete paths turn a link into its element before they read the selection', () => {
  for (const name of ['function rewriteUiReferences(', 'function forgetUiReferences(']) {
    const body = HTML.slice(HTML.indexOf(name), HTML.indexOf(name) + 900);
    assert.ok(body.indexOf('dropLinkSelection();') > 0 && body.indexOf('dropLinkSelection();') < body.indexOf('const sel = AppState.selection;'), name);
  }
});

// ============================================================ the new drawing decides

function fakePanel(sandbox, { holder, removed }) {
  sandbox.document.querySelector = (selector) => (selector === '.inspection' ? holder : null);
  sandbox.document.querySelectorAll = (selector) => {
    if (selector === '#panel-right, [data-resize="panel-right"]') return [{ remove() { removed.push('panel'); } }, { remove() { removed.push('handle'); } }];
    return [];
  };
}

test('a drawing that has the pair refreshes the panel and keeps the selection', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  const holder = { outerHTML: 'old' };
  fakePanel(sandbox, { holder, removed: [] });
  sandbox.reconcileLinkSelection();
  assert.equal(state.selection.kind, 'link');
  assert.match(holder.outerHTML, /inspection-link/);
  assert.match(holder.outerHTML, /2 relationships are grouped/);
});

test('on the Map a drawing without the pair drops the selection and the panel with its handle, without a redraw', async () => {
  const { sandbox, state, show, scene } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  const removed = [];
  fakePanel(sandbox, { holder: { outerHTML: 'old' }, removed });
  show(Object.assign({}, scene, { links: scene.links.filter((p) => p.from !== 'customer') }));
  sandbox.reconcileLinkSelection();
  assert.deepEqual(plain(state.selection), NONE);
  assert.deepEqual(removed, ['panel', 'handle']);
});

test('in Elements a drawing without the pair gives the panel of the element back', async () => {
  const { sandbox, state, show, scene } = await page('elements', 'overview', 'shop.web.api');
  state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  const holder = { outerHTML: 'old' };
  fakePanel(sandbox, { holder, removed: [] });
  show(Object.assign({}, scene, { links: [] }));
  sandbox.reconcileLinkSelection();
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' });
  assert.match(holder.outerHTML, /data-inspection-ref="shop\.web\.api"/);
});

test('a scene that draws no links at all (an error, nothing to show) ends the selection too', async () => {
  const { sandbox, state, show } = await page('map', 'map', null);
  state.selection = linkSelection('customer', 'shop');
  fakePanel(sandbox, { holder: null, removed: [] });
  show({ viewKey: 'map|x', hasSvg: false });
  sandbox.reconcileLinkSelection();
  assert.deepEqual(plain(state.selection), NONE);
});

test('showDiagramScene reconciles the link before the outlines, and the Map keeps its own clear of an element', () => {
  const body = HTML.slice(HTML.indexOf('function showDiagramScene('), HTML.indexOf('function markMapSelection('));
  assert.ok(body.indexOf('reconcileLinkSelection();') > body.indexOf('diagramScene = scene;'));
  assert.ok(body.indexOf('reconcileLinkSelection();') < body.indexOf('markLinkSelection();'));
  assert.ok(body.includes("mapSelectionCheck && sel.kind === 'element'"), 'the clear of an element is as it was');
});

// ============================================================ clicks and keys

function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

test('a click on a link selects the pair on the Map, discards the drafts, and goes nowhere', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  let renders = 0;
  sandbox.render = () => { renders++; };
  run(sandbox, "rawYamlEditDraft = { relPath: 'x', text: 'y', error: null }; pendingDeleteConfirmation = { reference: 'x' }; draftTyped = false;");
  state.selection = { kind: 'element', key: 'shop.payments', mode: 'view' };
  click(sandbox, { 'data-action': 'select-link', 'data-from': 'customer', 'data-to': 'shop', 'data-layer': 'application' });
  assert.deepEqual(plain(state.selection), linkSelection('customer', 'shop'));
  assert.equal(renders, 1);
  assert.equal(run(sandbox, 'rawYamlEditDraft'), null);
  assert.equal(run(sandbox, 'pendingDeleteConfirmation'), null);
  assert.equal(run(sandbox, 'currentPerspective'), 'map');
});

test('a click on a link of the diagram of an element keeps the element as focal, and the tab', async () => {
  const { sandbox, state } = await page('elements', 'deep', 'shop.catalog');
  sandbox.render = () => {};
  const canvas = { getAttribute: (name) => (name === 'data-ref' ? 'shop.catalog' : null) };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  click(sandbox, { 'data-action': 'select-link', 'data-from': 'shop.catalog.service', 'data-to': 'shop.catalog.db', 'data-layer': 'application' });
  assert.deepEqual(plain(state.selection), linkSelection('shop.catalog.service', 'shop.catalog.db', { focal: 'shop.catalog' }));
  assert.equal(run(sandbox, 'elementTab'), 'deep');
  assert.equal(run(sandbox, 'currentPerspective'), 'elements');
});

test('a click on a link pins the framing of the Map first, like a click on a box', async () => {
  const { sandbox } = await page('map', 'map', null);
  sandbox.render = () => {};
  const taken = [];
  sandbox.takeOverDiagramFraming = (canvas) => taken.push(canvas);
  const canvas = { getAttribute: () => null };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvas : null);
  run(sandbox, "diagramScale = 'auto';");
  click(sandbox, { 'data-action': 'select-link', 'data-from': 'customer', 'data-to': 'shop' });
  assert.deepEqual(taken, [canvas]);
});

test('a box click is exactly what it was: goto-element is untouched and select-link is a separate case', () => {
  const goto = HTML.slice(HTML.indexOf("case 'goto-element': {"), HTML.indexOf("case 'select-link':"));
  assert.ok(!goto.includes('link') && !goto.includes('Link'), 'no link code in goto-element');
  assert.match(goto, /AppState\.selection = destinationLayer \? \{ kind: 'element'/);
  assert.ok(HTML.includes("'select-link', 'open-create-child-form'"), 'and it is among the clicks that leave a form');
});

test('Close: the Map deselects, Elements goes back to the element, and both redraw', async () => {
  let p = await page('map', 'map', null);
  p.sandbox.render = () => {};
  p.state.selection = linkSelection('customer', 'shop');
  click(p.sandbox, { 'data-action': 'close-inspection' });
  assert.deepEqual(plain(p.state.selection), NONE);

  p = await page('elements', 'overview', 'shop.web.api');
  p.sandbox.render = () => {};
  p.state.selection = linkSelection('shop.web.frontend', 'shop.web.api', { focal: 'shop.web.api' });
  click(p.sandbox, { 'data-action': 'close-inspection' });
  assert.deepEqual(plain(p.state.selection), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' });

  p = await page('map', 'map', null);
  p.sandbox.render = () => {};
  p.state.selection = { kind: 'element', key: 'shop.payments', mode: 'view' };
  click(p.sandbox, { 'data-action': 'close-inspection' });
  assert.deepEqual(plain(p.state.selection), NONE, 'an element on the Map closes as it did');
});

test('Escape in the diagram deselects a link, and still leaves Maximize first', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  let renders = 0;
  sandbox.render = () => { renders++; };
  const stage = { closest: (selector) => (selector === '.diagram-stage' ? {} : null) };
  const key = () => ({ key: 'Escape', target: stage, preventDefault() {} });
  state.selection = linkSelection('customer', 'shop');
  sandbox.handleDiagramKeydown(key());
  assert.deepEqual(plain(state.selection), NONE);
  assert.equal(renders, 1);
  state.selection = { kind: 'element', key: 'shop.payments', mode: 'view' };
  sandbox.handleDiagramKeydown(key());
  assert.equal(state.selection.kind, 'element', 'an element is not deselected by Escape');
});

test('Enter on a focused link is a click: the handler that already did it for boxes takes any <g> with an action', async () => {
  const { sandbox } = await page('map', 'map', null);
  const dispatched = [];
  const link = { tagName: 'G', dispatchEvent: (event) => dispatched.push(event.type) };
  const target = { closest: (selector) => (selector === '[data-action]' ? link : selector === '#diagram-canvas' ? {} : selector === '.diagram-stage' ? {} : null) };
  sandbox.MouseEvent = class { constructor(type) { this.type = type; } };
  sandbox.handleDiagramKeydown({ key: 'Enter', target, preventDefault() {} });
  assert.deepEqual(dispatched, ['click']);
});

// ============================================================ the outline, the focus, the highlight

// the arrow keys on a link moved to a box next to the link's start box until run 0025: they move among the links now
// (diagram-link-tab-stops.test.js)

test('the pair of the selected link is outlined and says it is pressed; the others are not', async () => {
  const { sandbox, state } = await page('map', 'map', null);
  const el = (cls, from, to) => { const attrs = { 'data-from': from, 'data-to': to }; const classes = new Set(cls.split(' ')); return { attrs, classes, getAttribute: (n) => attrs[n], setAttribute: (n, v) => { attrs[n] = v; }, classList: { contains: (c) => classes.has(c), toggle: (c, on) => (on ? classes.add(c) : classes.delete(c)) } }; };
  const els = [el('dg-link', 'customer', 'shop'), el('dg-label', 'customer', 'shop'), el('dg-link', 'mailer', 'customer')];
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? { querySelectorAll: () => els } : null);
  state.selection = linkSelection('customer', 'shop');
  sandbox.markLinkSelection();
  assert.deepEqual(els.map((e) => e.classes.has('dg-link-selected')), [true, true, false]);
  assert.deepEqual([els[0].attrs['aria-pressed'], els[2].attrs['aria-pressed']], ['true', 'false']);
  state.selection = NONE;
  sandbox.markLinkSelection();
  assert.deepEqual(els.map((e) => e.classes.has('dg-link-selected')), [false, false, false]);
});

test('the focus goes back to the same link after the drawing is rebuilt', async () => {
  const { sandbox } = await page('map', 'map', null);
  const part = { classList: { contains: (c) => c === 'dg-link' }, getAttribute: (n) => ({ 'data-from': 'customer', 'data-to': 'shop' })[n] };
  const wanted = sandbox.diagramFocusTargetOf({ closest: () => part });
  assert.deepEqual(plain(wanted), { link: true, from: 'customer', to: 'shop', nth: null });
  const focused = [];
  const mk = (from, to) => ({ getAttribute: (n) => ({ 'data-from': from, 'data-to': to })[n], focus: () => focused.push(from + '>' + to) });
  const canvas = { contains: () => true, focus() { focused.push('canvas'); }, querySelectorAll: (selector) => (selector === '.dg-link' ? [mk('mailer', 'customer'), mk('customer', 'shop')] : []) };
  run(sandbox, 'pendingDiagramFocus = ' + JSON.stringify(wanted) + ';');
  sandbox.restoreDiagramFocus(canvas);
  assert.deepEqual(focused, ['customer>shop']);
  // a box is found as before
  const boxFocus = [];
  const box = { getAttribute: (n) => (n === 'data-id' ? 'shop' : null), focus: () => boxFocus.push('box') };
  run(sandbox, "pendingDiagramFocus = { fold: false, id: 'shop' };");
  sandbox.restoreDiagramFocus({ contains: () => true, focus() {}, querySelectorAll: (selector) => (selector === '.dg-node' ? [box] : []) });
  assert.deepEqual(boxFocus, ['box']);
});

test('hover and focus of a link light its pair, and leaving keeps the focus of a link', () => {
  const focus = HTML.slice(HTML.indexOf('function handleDiagramFocus('), HTML.indexOf('function handleAppWheel('));
  assert.match(focus, /closest\('\.dg-node, \.dg-fold, \.dg-link'\)/);
  const out = HTML.slice(HTML.indexOf('function handleDiagramPointerOut('), HTML.indexOf('function handleDiagramFocus('));
  assert.match(out, /closest\('\.dg-node, \.dg-fold, \.dg-link'\)/);
  assert.match(HTML.slice(HTML.indexOf('function handleDiagramPointerOver(')), /closest\('\.dg-node, \.dg-fold, \.dg-link'\)/);
});

test('the view key of the page tells two links, and a link from its element, apart', () => {
  assert.match(HTML, /AppState\.selection\.layer \|\| ''\) \+ '\|' \+ \(AppState\.selection\.focal \|\| ''\)/);
});

// ============================================================ the stylesheet and the export

const ruleBodies = (selector) => Array.from(CSS_NO_COMMENTS.matchAll(/([^{}@]+)\{([^{}]*)\}/g)).filter((m) => m[1].trim() === selector).map((m) => m[2].trim());

test('links are clickable, show the keyboard, and the selected pair takes the accent of the theme', () => {
  assert.match(ruleBodies('.dg-link, .dg-label[data-action]')[0], /cursor: pointer/);
  assert.match(ruleBodies('.dg-link:focus-visible .dg-edge')[0], /stroke: var\(--accent\)/);
  assert.match(ruleBodies('.dg-link-selected .dg-edge')[0], /stroke: var\(--accent\)/);
  assert.match(ruleBodies('.dg-label.dg-link-selected')[0], /fill: var\(--accent\)/);
  for (const selector of ['.inspection-rel', '.inspection-rel-path', '.inspection-subhead']) assert.ok(ruleBodies(selector).length, selector);
  const rules = ['.inspection-rel', '.inspection-rel-path', '.inspection-subhead', '.inspection-end-name'].map((s) => ruleBodies(s)[0]).join(' ');
  assert.ok(!/#[0-9a-f]{3,6}\b|rgb\(/i.test(rules), 'colours come from the theme variables');
  const selectedAfterBase = CSS_NO_COMMENTS.indexOf('.dg-link-selected .dg-edge') > CSS_NO_COMMENTS.indexOf('.dg-edge.dg-ghost-edge');
  assert.ok(selectedAfterBase, 'the selected outline follows the ghost edge rule it ties with in specificity');
});

test('the dark blocks of the stylesheet still hold the same variables: the panel added none', () => {
  const blocks = Array.from(CSS_NO_COMMENTS.matchAll(/(?::root\[data-theme="dark"\]|:root:not\(\[data-theme="light"\]\))\s*\{([^{}]*)\}/g)).map((m) => (m[1].match(/--[\w-]+(?=:)/g) || []).sort().join());
  assert.equal(blocks.length, 2);
  assert.equal(blocks[0], blocks[1]);
});

test('the exported SVG loses what only makes sense on screen: tab stops, actions and the pressed state', () => {
  const body = HTML.slice(HTML.indexOf('function diagramExportDocument('), HTML.indexOf('function downloadDiagramFile('));
  assert.match(body, /querySelectorAll\('\[aria-pressed\]'\)\) el\.removeAttribute\('aria-pressed'\)/);
});
