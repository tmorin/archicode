'use strict';
// The page of a view in the Library draws that view (run 0027, TDD-0027): the centre of `#/library/views` holds the canvas of the
// Map and Elements, drawn from the view's own recipe, and visiting it changes nothing that the Map and Elements show. The
// harness has no DOM and no layout engine: the page is the real `render()` over the real kernel, a fake layout engine and a fake
// canvas built from the markup the page produced. The look, the real layout engine and the real folder are checked in a browser.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));
const NONE = { kind: 'none', key: null, mode: 'view' };

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

/**
 * The fixture loaded, the real kernel, a fake layout engine, and a DOM just big enough for the page: `render()` writes the page
 * into #app, and `#diagram-canvas` is a fake element whose attributes are those of the canvas the page wrote. Every redraw of
 * the page gives a new, empty canvas, as a browser would.
 */
async function startPage() {
  const { sandbox, state, kernel } = await openFixture();
  sandbox.window.showDirectoryPicker = function showDirectoryPicker() {}; // the page draws its shell, not the landing card
  sandbox.__elk = { layout: async (graph) => fakeLayout(graph) };
  run(sandbox, 'loadElk = async () => __elk;');
  const app = sandbox.document.getElementById('app');
  const originalGet = sandbox.document.getElementById;
  let html = '';
  let canvas = null;
  Object.defineProperty(app, 'innerHTML', { get: () => html, set: (value) => { html = value; canvas = null; }, configurable: true });
  const canvasOf = () => {
    if (canvas) return canvas;
    const tag = /<div class="diagram-canvas" id="diagram-canvas"([^>]*)>/.exec(html);
    if (!tag) return null;
    const attributes = {};
    for (const m of tag[1].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[m[1]] = m[2] === undefined ? '' : m[2];
    canvas = {
      attributes,
      innerHTML: '',
      clientWidth: 800,
      clientHeight: 600,
      parentElement: null,
      classList: { add() {}, remove() {}, contains: () => false },
      getAttribute: (name) => (name in attributes ? attributes[name] : null),
      hasAttribute: (name) => name in attributes,
      querySelector: () => null,
      querySelectorAll: () => [],
      contains: () => false,
      focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
    };
    return canvas;
  };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvasOf() : originalGet(id));
  const page = {
    sandbox, state, kernel,
    html: () => html,
    canvas: canvasOf,
    /** Waits until the diagram of the page is on the canvas (the kernel and the layout are asynchronous). */
    async drawn() {
      for (let i = 0; i < 400; i++) {
        const c = canvasOf();
        if (c && c.innerHTML !== '') return c;
        await new Promise((resolve) => setImmediate(resolve));
      }
      throw new Error('the diagram was never put on the canvas');
    },
    /** One render of the page, and the diagram it draws. */
    async show() {
      sandbox.render();
      return canvasOf() ? page.drawn() : null;
    },
    scene: () => run(sandbox, 'diagramScene'),
    go(perspective) {
      sandbox.setPerspective(perspective);
      return page.drawn().catch(() => null);
    }
  };
  return page;
}

/** A view of the workspace, in memory only (the workspace has its own manifests; this one is new and unsaved). */
function addView(page, content) {
  const view = page.sandbox.createManifestEntry('view', Object.assign({ layer: 'application' }, content));
  return view;
}

function openView(page, view) {
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(view.id) + ";");
  page.sandbox.setPerspective('library');
  return page.drawn().catch(() => null);
}

function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

const idsOf = (scene) => plain(Object.keys(scene.boxes).sort());
const pairsOf = (scene) => plain(scene.links.map((pair) => pair.from + '>' + pair.to + 'x' + pair.links.length).sort());

/** What the kernel computes for an Elements recipe, as boxes (non-ghost) and pairs of links. */
function expectedElements(page, viewpoint, reference, options) {
  const { sandbox, kernel } = page;
  const opts = options || {};
  const facet = opts.facet ? page.state.workspace.settings.facets.customs.find((f) => f.name === opts.facet) : null;
  const layer = opts.layer || 'application';
  const result = kernel.compute(sandbox.buildKernelInput(viewpoint, reference, { layer, facet }).input);
  const ghosts = sandbox.buildDiagramGhosts(result, reference, layer);
  let drawn = { items: result.items.concat(ghosts.items), links: result.links.concat(ghosts.links) };
  if (opts.hideUnlinked) {
    const kept = sandbox.hideUnlinkedItems(drawn.items, drawn.links, reference);
    drawn = { items: kept.items, links: kept.links };
  }
  const boxes = plain(drawn.items.filter((item) => !item.ghost).map((item) => item.id).sort());
  const ids = new Set(drawn.items.map((item) => item.id));
  const pairs = new Map();
  for (const link of drawn.links) {
    if (link.secondary || !ids.has(link.from) || !ids.has(link.to)) continue; // not drawn: the layout is not given them
    const key = link.from + '>' + link.to;
    pairs.set(key, (pairs.get(key) || 0) + 1);
  }
  return { boxes, pairs: plain(Array.from(pairs, ([key, n]) => key + 'x' + n).sort()), result, drawn };
}

// ============================================================ 1. The page of an Elements view draws it

test('the page of an Elements view puts a canvas in the centre that draws what the kernel computes, for each viewpoint', async () => {
  const page = await startPage();
  for (const [viewpoint, element] of [['overview', 'shop.web.api'], ['detailed', 'shop'], ['deep', 'shop']]) {
    const view = addView(page, { id: 'v_' + viewpoint, name: 'View ' + viewpoint, viewpoint, properties: { element } });
    const canvas = await openView(page, view);
    assert.ok(canvas, viewpoint + ': a canvas is on the page');
    assert.equal(canvas.getAttribute('data-host'), 'library');
    assert.equal(canvas.getAttribute('data-view'), view.id);
    assert.equal(canvas.hasAttribute('data-map'), false, 'not the Map');
    assert.equal(canvas.hasAttribute('data-ref'), false, 'and not the diagram of an element of Elements');
    const expected = expectedElements(page, viewpoint, element);
    assert.ok(expected.boxes.length > 1, 'the fixture draws something for ' + viewpoint);
    const scene = page.scene();
    assert.deepEqual(idsOf(scene), expected.boxes, viewpoint + ': the boxes the kernel computes');
    assert.deepEqual(pairsOf(scene), expected.pairs, viewpoint + ': and its links');
    assert.equal(scene.hasSvg, true);
    assert.equal(canvas.innerHTML, scene.html, 'the canvas holds the drawing');
    assert.match(scene.viewKey, new RegExp('^' + element + '\\|' + viewpoint + '\\|\\|\\|view:' + view.id + '$'), 'framed on this view when another is shown');
  }
});

test('a view of the technology layer is drawn from the technology layer, even though the selection is somewhere else', async () => {
  const page = await startPage();
  page.state.selection = { kind: 'element', key: 'shop', mode: 'view' }; // the selection says application: the view does not read it
  const view = addView(page, { id: 'infra', name: 'Infra', viewpoint: 'deep', layer: 'technology', properties: { element: 'prod.cluster' } });
  await openView(page, view);
  const expected = expectedElements(page, 'deep', 'prod.cluster', { layer: 'technology' });
  assert.ok(expected.boxes.length > 2);
  assert.deepEqual(idsOf(page.scene()), expected.boxes);
  assert.deepEqual(pairsOf(page.scene()), expected.pairs);
  assert.ok(page.scene().boxes['prod.cluster.web'], 'technology boxes');
});

test('a leaf element asked for the detailed viewpoint is drawn as its overview, as the tab of Elements does', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'leaf', name: 'Leaf', viewpoint: 'detailed', properties: { element: 'shop.catalog.service.search' } });
  await openView(page, view);
  const expected = expectedElements(page, 'overview', 'shop.catalog.service.search');
  assert.deepEqual(idsOf(page.scene()), expected.boxes);
  assert.match(page.scene().viewKey, /^shop\.catalog\.service\.search\|overview\|/);
});

test('the facet of the view is drawn through, and the status line says so', async () => {
  const page = await startPage();
  const plainView = addView(page, { id: 'plain', name: 'Plain', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, plainView);
  const without = page.scene();
  const view = addView(page, { id: 'through', name: 'Through', viewpoint: 'deep', properties: { element: 'shop', facet: 'rest-only' } });
  await openView(page, view);
  const expected = expectedElements(page, 'deep', 'shop', { facet: 'rest-only' });
  const scene = page.scene();
  assert.deepEqual(idsOf(scene), expected.boxes);
  assert.deepEqual(pairsOf(scene), expected.pairs);
  assert.notDeepEqual(pairsOf(scene), pairsOf(without), 'the facet does remove links of this element');
  assert.match(scene.status, /through facet “rest-only”/);
  assert.match(scene.viewKey, /\|rest-only\|/);
  assert.doesNotMatch(without.status, /facet/);
});

test('Hide unlinked of the view leaves out the boxes no link reaches, as the toolbar does', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'tidy', name: 'Tidy', viewpoint: 'deep', layer: 'technology', properties: { element: 'prod.cluster', 'hide-unlinked': true } });
  await openView(page, view);
  const expected = expectedElements(page, 'deep', 'prod.cluster', { layer: 'technology', hideUnlinked: true });
  const all = expectedElements(page, 'deep', 'prod.cluster', { layer: 'technology' });
  assert.ok(expected.boxes.length < all.boxes.length, 'the fixture has unlinked boxes in this diagram');
  assert.deepEqual(idsOf(page.scene()), expected.boxes);
  assert.match(page.scene().status, /unlinked box(es)? hidden/);
  // and the button says it is on
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="true"/);
});

test('the texts of the view are drawn: its labels, and the defaults of an Elements diagram when it says nothing', async () => {
  const page = await startPage();
  const captions = (scene) => (scene.html.match(/<text class="dg-label"/g) || []).length;
  const silent = addView(page, { id: 'silent', name: 'Silent', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, silent);
  const withLabels = captions(page.scene());
  assert.ok(withLabels > 0, 'an element diagram starts with its captions');
  const quiet = addView(page, { id: 'quiet', name: 'Quiet', viewpoint: 'overview', properties: { element: 'shop.web.api', labels: false } });
  await openView(page, quiet);
  assert.equal(captions(page.scene()), 0, 'labels: false');
  assert.match(page.html(), /data-show="labels" aria-pressed="false"/);
  assert.match(page.html(), /data-show="qualifiers" aria-pressed="true"/, 'the other texts follow the defaults');
});

// ============================================================ 2. The page of a Map view draws the map

test('the page of a Map view draws the map of its pinned, hidden and opened elements', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'scope', name: 'Scope', viewpoint: 'map', properties: { pinned: ['shop.web'], hidden: ['customer'], opened: ['shop'] } });
  const canvas = await openView(page, view);
  assert.equal(canvas.getAttribute('data-host'), 'library');
  assert.equal(canvas.hasAttribute('data-map'), false);
  const input = page.sandbox.buildKernelInput('map', '', { opened: ['shop'], pinned: ['shop.web'] }).input;
  input.hidden = ['customer'];
  const result = page.kernel.compute(input);
  const scene = page.scene();
  assert.deepEqual(idsOf(scene), plain(result.items.filter((item) => !item.ghost).map((item) => item.id).sort()));
  assert.ok(!scene.boxes.customer, 'hidden');
  assert.ok(scene.boxes.shop && scene.boxes['shop.web'], 'opened and pinned');
  assert.match(scene.viewKey, /^map\|map\|\|shop\.web\|view:scope$/);
  assert.match(scene.status, /^Map of the workspace/);
  // a Map diagram starts without captions
  assert.match(page.html(), /data-show="labels" aria-pressed="false"/);
});

test('a Map view that names elements that no longer exist is drawn with the ones that do', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'gone', name: 'Gone', viewpoint: 'map', properties: { pinned: ['shop.web', 'removed.long.ago'], hidden: ['nobody'] } });
  await openView(page, view);
  const expected = page.sandbox.buildKernelInput('map', '', { opened: [], pinned: ['shop.web'] }).input;
  expected.hidden = [];
  assert.deepEqual(idsOf(page.scene()), plain(page.kernel.compute(expected).items.filter((item) => !item.ghost).map((item) => item.id).sort()));
});

// ============================================================ 3. The page: header, tools, details

test('the page keeps Open on diagram, Rename, Delete, the facts and the steps that show the view, and has the tools of the diagram', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'shown', name: 'Shown', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, view);
  const html = page.html();
  assert.match(html, /data-action="saved-view-open" data-view="shown"/);
  assert.match(html, /data-action="saved-view-rename" data-view="shown"/);
  assert.match(html, /data-action="saved-view-delete" data-view="shown"/);
  assert.match(html, /<dl class="view-facts">/);
  assert.match(html, /<h3>Shown in<\/h3>/);
  // the tools of the Map and Elements
  for (const tool of ['toggle-hide-unlinked', 'diagram-recenter', 'diagram-export']) assert.ok(html.includes('data-action="' + tool + '"'), tool);
  assert.match(html, /data-dir="out"[^]*data-dir="reset"[^]*data-dir="in"[^]*data-dir="fit"/);
  for (const name of ['labels', 'qualifiers', 'descriptions', 'wrap']) assert.ok(html.includes('data-show="' + name + '"'), name);
  assert.match(html, /data-format="png"[^]*data-format="svg"/);
  assert.match(html, /id="diagram-status"/);
  // what the page does not offer: folding, a facet picker, Maximize, the Map's chips
  for (const absent of ['fold-all', 'unfold-all', 'diagram-facet-select', 'toggle-maximize', 'map-chips', 'toggle-fold']) assert.ok(!html.includes(absent), absent + ' is not on this page');
  assert.match(html, /aria-label="Diagram of the view Shown\. Arrow keys move between boxes, plus and minus zoom\."/);
  assert.equal(page.sandbox.renderLibraryPerspectiveHtml().right, null, 'no right-hand panel yet (W-2)');
});

test('the facts and the steps come after the diagram, in a block of their own', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'order', name: 'Order', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, view);
  const html = page.html();
  const at = (needle) => { const i = html.indexOf(needle); assert.ok(i > 0, needle); return i; };
  assert.ok(at('class="element-header"') < at('class="diagram-stage"'));
  assert.ok(at('id="diagram-status"') < at('class="library-view-details'));
  assert.ok(at('class="library-view-details') < at('class="view-facts"'));
  assert.match(html, /class="diagram-view library-view"/);
});

// ============================================================ 4. A view that cannot be drawn keeps its message

test('a view that cannot be drawn keeps its message and has no canvas', async () => {
  const page = await startPage();
  const elementGone = addView(page, { id: 'orphan', name: 'Orphan', viewpoint: 'deep', properties: { element: 'shop.web.removed' } });
  const mapGone = addView(page, { id: 'nopins', name: 'No pins', viewpoint: 'map', properties: { pinned: ['nothing.here'] } });
  const unknown = addView(page, { id: 'weird', name: 'Weird', viewpoint: 'sideways', properties: { element: 'shop' } });
  for (const [view, message] of [[elementGone, /The element “shop\.web\.removed” does not exist any more/], [mapGone, /None of the elements it was pinned on exists any more/], [unknown, /does not draw the viewpoint “sideways”/]]) {
    run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(view.id) + ";");
    page.sandbox.setPerspective('library');
    assert.equal(page.canvas(), null, view.id + ': no canvas');
    assert.ok(!page.html().includes('diagram-canvas'), view.id + ': nothing of a diagram');
    assert.match(page.html(), message);
    assert.match(page.html(), /class="story-step-problem"/);
    assert.match(page.html(), /data-action="saved-view-rename"/);
    assert.ok(!page.html().includes('data-action="saved-view-open"'), 'no Open on diagram for a view that cannot be drawn');
  }
  assert.equal(page.scene(), null, 'and no scene is left behind');
});

test('an element deleted while its view is on screen turns the page into the message', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'fragile', name: 'Fragile', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, view);
  assert.ok(page.canvas());
  run(page.sandbox, "AppState.index.application.delete('shop.web.api');");
  page.sandbox.render();
  assert.equal(page.canvas(), null);
  assert.match(page.html(), /does not exist any more/);
});

// ============================================================ 5. Visiting the page changes nothing the Map and Elements show

/** Every global the Map and Elements read, as text. */
function snapshot(page) {
  return run(page.sandbox, `JSON.stringify({
    selection: AppState.selection, expanded: Array.from(AppState.expanded || []),
    perspective: currentPerspective, elementTab, diagramFacet, diagramHideUnlinked, diagramShow, diagramMaximized,
    mapPinned, mapHidden, mapOpened: mapOpened ? Array.from(mapOpened) : null,
    diagramScale, diagramCenter, diagramShownView, diagramLinkStop, activeStory, helpOpen, headerMenuOpen,
    treeExpandedApplications, treeExpandedEnvironments, navActiveKey, mapSelectionCheck, revealLinkAfterDrawing
  })`);
}

/** Sets the Map and Elements up with choices that none of the defaults would give. */
function setUp(page, perspective) {
  const { sandbox, state } = page;
  run(sandbox, `
    mapPinned = ['shop.web']; mapHidden = ['customer']; mapOpened = new Set(['shop']);
    diagramFacet = 'no-smtp'; diagramHideUnlinked = true; setDiagramShow({ labels: true, qualifiers: false, descriptions: true, wrap: true });
    elementTab = 'deep'; diagramMaximized = false;
  `);
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  run(sandbox, "currentPerspective = '" + perspective + "'; diagramScale = 1.5; diagramCenter = { x: 120, y: 80 };");
}

for (const perspective of ['map', 'elements']) {
  test('visiting the page of a view and coming back to ' + perspective + ' leaves what it shows, and its address, as they were', async () => {
    const page = await startPage();
    const elementsView = addView(page, { id: 'e', name: 'E', viewpoint: 'detailed', properties: { element: 'shop', facet: 'rest-only', 'hide-unlinked': true, labels: false, wrap: true } });
    const mapView = addView(page, { id: 'm', name: 'M', viewpoint: 'map', properties: { pinned: ['shop.catalog'], hidden: ['mailer'], opened: ['shop.catalog'], facet: 'no-smtp', 'hide-unlinked': true, labels: true } });
    const broken = addView(page, { id: 'b', name: 'B', viewpoint: 'deep', properties: { element: 'removed' } });
    setUp(page, perspective);
    await page.show();
    const before = snapshot(page);
    const hashBefore = page.sandbox.location.hash;
    const sceneBefore = page.scene();
    const cacheBefore = run(page.sandbox, 'diagramCache');
    assert.ok(sceneBefore && cacheBefore, 'the ' + perspective + ' is drawn before the visit');
    assert.match(hashBefore, new RegExp('^#/' + perspective));
    const unsavedBefore = page.sandbox.countUnsavedChanges();

    for (const view of [elementsView, mapView, broken, elementsView]) {
      await openView(page, view);
      // the tools of the page, used
      if (page.canvas()) {
        for (const attributes of [
          { 'data-action': 'diagram-zoom', 'data-dir': 'in' }, { 'data-action': 'diagram-zoom', 'data-dir': 'fit' }, { 'data-action': 'diagram-recenter' },
          { 'data-action': 'toggle-hide-unlinked' }, { 'data-action': 'toggle-show', 'data-show': 'labels' }, { 'data-action': 'toggle-show', 'data-show': 'wrap' }
        ]) {
          click(page.sandbox, attributes);
          await page.drawn().catch(() => null);
        }
        const stage = { closest: (selector) => (selector === '.diagram-stage' ? {} : null) };
        for (const key of ['m', 'M', 'Escape', 'f', 'c', '+', '-', '0']) page.sandbox.handleDiagramKeydown({ key, target: stage, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false });
      }
      assert.equal(snapshot(page).includes('"perspective":"library"'), true);
    }
    await page.go(perspective);
    page.sandbox.location.hash = '#' + page.sandbox.currentRouteHash();

    const after = JSON.parse(snapshot(page));
    const expected = JSON.parse(before);
    assert.deepEqual(after, expected, 'selection, pins, hidden and opened sets, facet, hide-unlinked, texts, tab, maximized state, camera: all as before');
    assert.equal(page.sandbox.location.hash, hashBefore, 'the address');
    assert.equal(page.sandbox.countUnsavedChanges(), unsavedBefore, 'and nothing was marked modified');
    assert.equal(page.scene().html, sceneBefore.html, 'the drawing on screen is the Map\'s or Elements\' own');
    assert.equal(page.scene().viewKey, sceneBefore.viewKey);
    assert.equal(run(page.sandbox, 'diagramCache'), cacheBefore, 'and so is its cache');
  });
}

test('a zoom and a move on the page do not move the Map, and the page opens framed on its own', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'cam', name: 'Cam', viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, "currentPerspective = 'map';");
  await page.show();
  run(page.sandbox, 'diagramScale = 2; diagramCenter = { x: 300, y: 40 };'); // the user's own zoom of the Map, after it was first drawn
  await openView(page, view);
  assert.equal(run(page.sandbox, 'diagramScale'), 'auto', 'a view opens framed on itself, whatever the Map was doing');
  click(page.sandbox, { 'data-action': 'diagram-zoom', 'data-dir': 'in' });
  const zoomed = run(page.sandbox, 'diagramScale');
  assert.equal(typeof zoomed, 'number');
  click(page.sandbox, { 'data-action': 'diagram-zoom', 'data-dir': 'fit' });
  assert.equal(run(page.sandbox, 'diagramScale'), 'fit');
  assert.doesNotMatch(page.sandbox.location.hash, /frame=/, 'the camera of the page is not in its address');
  await page.go('map');
  assert.equal(run(page.sandbox, 'diagramScale'), 2);
  assert.deepEqual(plain(run(page.sandbox, 'diagramCenter')), { x: 300, y: 40 });
  // and coming back to the page: the view it left is still framed as it was left
  await openView(page, view);
  assert.equal(run(page.sandbox, 'diagramScale'), 'fit');
});

test('a Map link selection is ended by entering the Library, as it already is by entering Files or Settings', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'sel', name: 'Sel', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  page.state.selection = { kind: 'link', key: 'a -> b', from: 'a', to: 'b', layer: 'application', mode: 'view' };
  run(page.sandbox, "currentPerspective = 'map';");
  await openView(page, view);
  assert.equal(page.state.selection.kind, 'none', 'unchanged behaviour of settleLinkSelection (finding F-1 of run 0027)');
});

test('the page is its own host: the Map and Elements globals are not even readable by the pipeline of the page', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'iso', name: 'Iso', viewpoint: 'deep', properties: { element: 'shop' } });
  // whatever the Map says, the page draws its view: a Map with a hidden element, a facet and Hide unlinked on does not leak in
  run(page.sandbox, "diagramFacet = 'rest-only'; diagramHideUnlinked = true; mapHidden = ['shop']; elementTab = 'overview'; setDiagramShow({ labels: false, qualifiers: false, descriptions: false, wrap: false });");
  page.state.selection = { kind: 'element', key: 'customer', mode: 'view' };
  await openView(page, view);
  const expected = expectedElements(page, 'deep', 'shop');
  assert.deepEqual(idsOf(page.scene()), expected.boxes);
  assert.deepEqual(pairsOf(page.scene()), expected.pairs);
  assert.doesNotMatch(page.scene().status, /facet/);
  assert.ok((page.scene().html.match(/<text class="dg-label"/g) || []).length > 0, 'the captions of the view, not those the Map turned off');
});

// ============================================================ 6. The tools: a look of the page, not an edit

test('Hide unlinked and the texts redraw the page only: no global changes, nothing is marked modified, the view is untouched', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'look', name: 'Look', viewpoint: 'deep', layer: 'technology', properties: { element: 'prod.cluster', labels: true } });
  await openView(page, view);
  const unsaved = page.sandbox.countUnsavedChanges();
  const manifest = JSON.stringify(plain(view));
  const globals = snapshot(page);
  const all = idsOf(page.scene());
  const captions = (scene) => (scene.html.match(/<text class="dg-label"/g) || []).length;
  const withCaptions = captions(page.scene());

  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await page.drawn();
  assert.ok(idsOf(page.scene()).length < all.length, 'the unlinked boxes are out');
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="true"/);
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'labels' });
  await page.drawn();
  assert.ok(captions(page.scene()) < withCaptions || withCaptions === 0, 'the captions are out');
  assert.match(page.html(), /data-show="labels" aria-pressed="false"/);

  assert.equal(snapshot(page), globals, 'not one global of the Map and Elements changed');
  assert.equal(page.sandbox.countUnsavedChanges(), unsaved);
  assert.equal(JSON.stringify(plain(view)), manifest, 'the manifest in memory is what it was');

  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await page.drawn();
  assert.deepEqual(idsOf(page.scene()), all, 'and back');
});

test('showing another view starts from that view, not from what was toggled on the last one', async () => {
  const page = await startPage();
  const a = addView(page, { id: 'a', name: 'A', viewpoint: 'deep', properties: { element: 'shop' } });
  const b = addView(page, { id: 'b', name: 'B', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, a);
  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await page.drawn();
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="true"/);
  await openView(page, b);
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="false"/);
  await openView(page, a);
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="false"/, 'a look is for one visit of one view');
});

test('the Map and Elements still toggle their own texts and Hide unlinked (the page did not take the actions over)', async () => {
  const page = await startPage();
  run(page.sandbox, "currentPerspective = 'map';");
  page.state.selection = NONE;
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'labels' });
  assert.equal(run(page.sandbox, 'diagramShow.labels'), true, 'the Map shows labels now (its default is off)');
  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  assert.equal(run(page.sandbox, 'diagramHideUnlinked'), true);
});

// ============================================================ 7. The drawing is read-only

test('the drawing of the page carries no action: a click on a box, a link or a caption reaches no case of the click handler', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'ro', name: 'RO', viewpoint: 'deep', properties: { element: 'shop', labels: true } });
  await openView(page, view);
  const svg = page.scene().html;
  assert.ok(svg.includes('class="dg-node'), 'there are boxes');
  assert.ok(svg.includes('class="dg-link"'), 'and links');
  assert.ok(svg.includes('class="dg-label"'), 'and captions');
  assert.doesNotMatch(svg, /data-action=/);
  assert.doesNotMatch(svg, /class="dg-fold"/);
  assert.doesNotMatch(svg, /aria-pressed/);
  assert.doesNotMatch(svg, /role="(link|button)"/);
  assert.match(svg, /<g class="dg-node[^>]*role="img"/);
  assert.match(svg, /<g class="dg-link"[^>]*role="img"/);
  // the boxes and links stay in the keyboard order, with their names
  assert.match(svg, /<g class="dg-node[^>]*tabindex="0"[^>]*aria-label="/);
  assert.equal((svg.match(/<g class="dg-link"[^>]*tabindex="0"/g) || []).length, 1, 'the links are still one tab stop');
  // nothing to click: the handler is given the target a browser would give (no [data-action] on the way up)
  const before = snapshot(page);
  page.sandbox.handleAppClick({ target: { closest: () => null }, preventDefault() {}, stopPropagation() {}, detail: 1 });
  assert.equal(snapshot(page), before);
});

test('the same drawing of the Map and Elements keeps its actions and its fold buttons', async () => {
  const page = await startPage();
  run(page.sandbox, "currentPerspective = 'map'; mapOpened = new Set();");
  page.state.selection = NONE;
  await page.show();
  const svg = page.scene().html;
  assert.match(svg, /data-action="goto-element"/);
  assert.match(svg, /data-action="select-link"/);
  assert.match(svg, /data-action="toggle-fold"/);
  assert.match(svg, /role="link"/);
});

test('the empty and the offline messages of the page offer no action of the Map', async () => {
  const page = await startPage();
  // offline: the plain list, names as text
  run(page.sandbox, 'loadElk = async () => null;');
  const view = addView(page, { id: 'off', name: 'Offline', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, view);
  assert.match(page.scene().html, /class="dg-list"/);
  assert.doesNotMatch(page.scene().html, /data-action=/);
  // a facet that removes the element
  run(page.sandbox, 'loadElk = async () => __elk;');
  const removed = addView(page, { id: 'rm', name: 'Removed', viewpoint: 'overview', properties: { element: 'customer', facet: 'rest-only' } });
  await openView(page, removed);
  const scene = page.scene();
  assert.doesNotMatch(scene.html, /clear-facet|data-action=/);
  assert.match(scene.html, /Nothing to show/);
});

// ============================================================ 8. Several redraws in a row, and the host switch

test('edit, edit, edit: only the last redraw reaches the canvas', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'rapid', name: 'Rapid', viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = 'rapid'; currentPerspective = 'library';");
  const shown = [];
  page.sandbox.__log = (scene) => shown.push(scene.viewKey + (scene.html.length > 200 ? ' drawn' : ' message'));
  run(page.sandbox, 'globalThis.__show = showDiagramScene; showDiagramScene = (scene) => { __log(scene); __show(scene); };');
  page.sandbox.render();
  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'labels' });
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'wrap' });
  await page.drawn();
  for (let i = 0; i < 40; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shown.length, 1, 'the layouts of the first two were superseded: ' + shown.join(', '));
  const look = plain(run(page.sandbox, 'libraryLook'));
  assert.equal(look.hideUnlinked, true);
  assert.equal(look.shows.labels, false);
  assert.equal(look.shows.wrap, true);
  const expected = expectedElements(page, 'deep', 'shop', { hideUnlinked: true });
  assert.deepEqual(idsOf(page.scene()), expected.boxes, 'and it is the last state');
  assert.equal(view.properties.wrap, undefined);
});

test('the Map keeps its drawing across a visit: the way back is a cache hit, not a new layout', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'v', name: 'V', viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, "currentPerspective = 'map'; mapOpened = new Set();");
  page.state.selection = NONE;
  await page.show();
  let layouts = 0;
  page.sandbox.__elk = { layout: async (graph) => { layouts++; return fakeLayout(graph); } };
  await openView(page, view);
  const visitLayouts = layouts;
  assert.equal(visitLayouts, 1, 'the page lays its own diagram out');
  await page.go('map');
  assert.equal(layouts, visitLayouts, 'the Map is served from its cache');
});

test('an address with frame=fit typed while on the page is the Map\'s framing, not the page\'s', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'fit', name: 'Fit', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, view);
  run(page.sandbox, "diagramScale = 1.25;"); // the page's own zoom
  page.sandbox.location.hash = '#/map?pin=shop&frame=fit';
  page.sandbox.syncPerspectiveFromHash();
  assert.equal(run(page.sandbox, 'diagramScale'), 'fit', 'the Map is framed as the address says');
  await page.show();
  await openView(page, view);
  assert.equal(run(page.sandbox, 'diagramScale'), 1.25, 'and the page kept its own zoom');
});

test('closing a folder forgets what the page remembered: the look, the camera and the Map\'s parked state', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'reset', name: 'Reset', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, view);
  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await page.drawn();
  click(page.sandbox, { 'data-action': 'diagram-zoom', 'data-dir': 'in' });
  page.sandbox.resetUiState();
  assert.equal(run(page.sandbox, 'diagramScale'), 'auto');
  assert.equal(run(page.sandbox, 'libraryLook.view'), null);
  assert.equal(run(page.sandbox, 'diagramHost'), 'main');
  assert.equal(run(page.sandbox, 'parkedDiagramHost.scene'), null);
  assert.equal(run(page.sandbox, 'diagramScene'), null);
});

// ============================================================ 9. The keyboard

test('M and Escape on the page do not maximize or restore the diagram of the Map', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'kb', name: 'KB', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, view);
  const stage = { closest: (selector) => (selector === '.diagram-stage' ? {} : null) };
  const press = (key) => page.sandbox.handleDiagramKeydown({ key, target: stage, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false });
  press('m');
  press('M');
  assert.equal(run(page.sandbox, 'diagramMaximized'), false);
  run(page.sandbox, 'diagramMaximized = true;');
  press('Escape');
  assert.equal(run(page.sandbox, 'diagramMaximized'), true, 'the Map\'s maximized state is not the page\'s to lift');
  press('+');
  assert.equal(typeof run(page.sandbox, 'diagramScale'), 'number', 'while the zoom keys work');
});

test('the export is named after the view', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'authentication_token_validation', name: 'Auth', viewpoint: 'detailed', properties: { element: 'shop' } });
  await openView(page, view);
  const made = [];
  const node = (tag) => ({ tag, attrs: {}, children: [], setAttribute(k, v) { this.attrs[k] = v; }, removeAttribute() {}, insertBefore() {}, classList: { remove() {} }, querySelectorAll: () => [], style: {} });
  const canvas = page.canvas();
  canvas.querySelector = (selector) => (selector === 'svg' ? { cloneNode: () => node('svg') } : null);
  page.sandbox.document.createElementNS = (ns, tag) => node(tag);
  page.sandbox.document.documentElement.getAttribute = () => null;
  page.sandbox.getComputedStyle = () => ({ getPropertyValue: () => '#123456' });
  page.sandbox.XMLSerializer = class { serializeToString() { made.push(1); return '<svg/>'; } };
  const exported = page.sandbox.diagramExportDocument();
  assert.equal(exported.name, 'authentication_token_validation-detailed');
});

// ============================================================ 10. Source pins that keep the seams where W-2 and W-3 expect them

test('the recipe is the one place the pipeline reads what to draw', () => {
  const mount = HTML.slice(HTML.indexOf('function mountDiagramIfNeeded('), HTML.indexOf('/** The center of Elements on a diagram tab'));
  for (const global of ['diagramHideUnlinked', 'diagramFacet', 'currentDiagramFacet(', 'currentMapState(', 'diagramShows(', 'effectiveDiagramViewpoint(', 'mapPinned', 'elementTab']) {
    assert.ok(!mount.includes(global), 'mountDiagramIfNeeded no longer reads ' + global);
  }
  assert.match(mount, /diagramRecipeOf\(canvas\)/);
  const library = HTML.slice(HTML.indexOf('function libraryDiagramRecipe('), HTML.indexOf('function diagramRecipeOf('));
  for (const global of ['diagramHideUnlinked', 'diagramFacet', 'currentDiagramFacet(', 'currentMapState(', 'diagramShows(', 'effectiveDiagramViewpoint(', 'mapPinned', 'mapHidden', 'mapOpened', 'elementTab', 'AppState.selection', 'diagramShow ', 'currentPerspective']) {
    assert.ok(!library.includes(global), 'the recipe of the page does not read ' + global);
  }
});

test('the links of the page press nothing: markLinkSelection leaves the role img links without aria-pressed', async () => {
  const { sandbox, state } = await openFixture();
  const el = (role) => { const attrs = { 'data-from': 'a', 'data-to': 'b', role }; return { attrs, classList: { contains: (c) => c === 'dg-link', toggle() {} }, getAttribute: (n) => attrs[n], setAttribute: (n, v) => { attrs[n] = v; } }; };
  const readonly = el('img');
  const normal = el('button');
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? { querySelectorAll: () => [readonly, normal] } : null);
  state.selection = NONE;
  sandbox.markLinkSelection();
  assert.equal(readonly.attrs['aria-pressed'], undefined);
  assert.equal(normal.attrs['aria-pressed'], 'false');
});

// ============================================================ 11. What the review of the design found

test('a box is named and described from the layer of the view, not from whatever is selected', async () => {
  const page = await startPage();
  // an environment that shares a reference with an application element, as `epr` does in a real workspace
  const tech = Object.assign({}, page.state.index.technology.get('psp.gateway'), { reference: 'mailer', id: 'mailer', name: 'The mailer machine', kind: 'node', relationships: [], children: [] });
  page.state.index.technology.set('mailer', tech);
  const item = { id: 'mailer', reference: 'mailer', parent: null };
  page.state.selection = { kind: 'element', key: 'mailer', layer: 'application', mode: 'view' };
  assert.equal(page.sandbox.diagramItemText(item, {}, 'technology').title, 'The mailer machine');
  page.state.selection = { kind: 'element', key: 'mailer', layer: 'technology', mode: 'view' };
  assert.equal(page.sandbox.diagramItemText(item, {}, 'application').title, page.state.index.application.get('mailer').name);
  assert.equal(page.sandbox.diagramItemText({ id: 'pod_mailer', reference: 'mailer', parent: null }, {}, 'technology').title, page.state.index.application.get('mailer').name, 'an application hosted by the node keeps its own record');
  // and the Map and Elements, which name no layer, still let the selection decide
  assert.equal(page.sandbox.diagramItemText(item, {}).title, 'The mailer machine');
  // the whole drawing of a technology view carries it down to the title of its boxes and the label of its links
  const svg = page.sandbox.renderDiagramSvg(fakeLayout(page.sandbox.buildElkGraph({ items: [item, { id: 'x', reference: 'psp.gateway', parent: null }], links: [{ from: 'mailer', to: 'x', label: '', qualifiers: [] }] })),
    { items: [item, { id: 'x', reference: 'psp.gateway', parent: null }], links: [{ from: 'mailer', to: 'x', label: '', qualifiers: [] }] }, '', { layer: 'technology', itemLayer: 'technology', readonly: true }).html;
  page.state.selection = NONE;
  assert.match(svg, /aria-label="The mailer machine/);
  assert.match(svg, /Link from The mailer machine/);
});

test('leaving the page by its tab or by an address writes the address of the Map from the Map\'s camera, before anything is redrawn', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'adr', name: 'Adr', viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, "currentPerspective = 'map';");
  await page.show();
  await openView(page, view);
  click(page.sandbox, { 'data-action': 'diagram-zoom', 'data-dir': 'fit' });
  assert.equal(run(page.sandbox, 'diagramScale'), 'fit');
  page.sandbox.render = () => {}; // only the address, as setPerspective writes it before it draws
  page.sandbox.setPerspective('map');
  assert.doesNotMatch(page.sandbox.location.hash, /frame=fit/, 'the page\'s Fit is not the Map\'s');
  assert.equal(run(page.sandbox, 'diagramScale'), 'auto');
});

test('a box that had the focus on one host is not given the focus on the other', async () => {
  const { sandbox } = await openFixture();
  run(sandbox, "pendingDiagramFocus = { fold: false, id: 'shop' };");
  sandbox.useDiagramHost('library');
  assert.equal(run(sandbox, 'pendingDiagramFocus'), null);
});

test('a map view with a box that could be opened draws it without a fold button, and the same box has one on the Map', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'closed', name: 'Closed', viewpoint: 'map', properties: { pinned: ['shop.web'] } });
  await openView(page, view);
  assert.ok(page.scene().links.length > 0 && page.scene().html.includes('dg-node'));
  assert.doesNotMatch(page.scene().html, /dg-fold/);
  const opened = addView(page, { id: 'opened', name: 'Opened', viewpoint: 'map', properties: { opened: ['shop'] } });
  await openView(page, opened);
  assert.doesNotMatch(page.scene().html, /dg-fold|toggle-fold/, 'neither Expand nor Close');
  run(page.sandbox, "currentPerspective = 'map'; mapOpened = new Set(['shop']); mapPinned = [];");
  page.state.selection = NONE;
  await page.show();
  assert.match(page.scene().html, /data-mode="close"/, 'the Map offers Close on the same box');
});

test('two views with the same recipe do not share a scene: each is framed, keyed and cached for itself', async () => {
  const page = await startPage();
  const a = addView(page, { id: 'twin_a', name: 'A', viewpoint: 'deep', properties: { element: 'shop' } });
  const b = addView(page, { id: 'twin_b', name: 'B', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, a);
  assert.match(page.scene().viewKey, /view:twin_a$/);
  await openView(page, b);
  assert.match(page.scene().viewKey, /view:twin_b$/, 'not the scene cached for the other view');
});

test('another view opens framed on itself: a manual zoom is dropped, as it is between two diagrams of the Map', async () => {
  const page = await startPage();
  const a = addView(page, { id: 'za', name: 'A', viewpoint: 'deep', properties: { element: 'shop' } });
  const b = addView(page, { id: 'zb', name: 'B', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, a);
  click(page.sandbox, { 'data-action': 'diagram-zoom', 'data-dir': 'in' });
  assert.equal(typeof run(page.sandbox, 'diagramScale'), 'number');
  await openView(page, b);
  assert.equal(run(page.sandbox, 'diagramScale'), 'auto');
});

test('a facet that removes the element, and a kernel that refuses, are said without a button to change the view', async () => {
  const page = await startPage();
  const real = await page.sandbox.loadViewpointKernel();
  page.sandbox.__kernel = { compute: (input) => (input.facet ? { error: 'the facet removed everything' } : real.compute(input)) };
  run(page.sandbox, 'loadViewpointKernel = async () => __kernel;');
  const view = addView(page, { id: 'gone_facet', name: 'Gone', viewpoint: 'overview', properties: { element: 'customer', facet: 'rest-only' } });
  await openView(page, view);
  assert.match(page.scene().html, /facet “rest-only” removes this element/);
  assert.doesNotMatch(page.scene().html, /<button|data-action/);
  // the same message on the Map's and Elements' side keeps its button
  run(page.sandbox, "currentPerspective = 'elements'; elementTab = 'overview'; diagramFacet = 'rest-only';");
  page.state.selection = { kind: 'element', key: 'customer', mode: 'view' };
  await page.show();
  assert.match(page.scene().html, /data-action="clear-facet"/);
});

test('closing a folder, after a visit with the Map drawn first, leaves nothing parked', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'park', name: 'Park', viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, "currentPerspective = 'map';");
  page.state.selection = NONE;
  await page.show();
  await openView(page, view);
  assert.ok(run(page.sandbox, 'parkedDiagramHost.scene'), 'the Map\'s drawing is parked while the page is shown');
  page.sandbox.resetUiState();
  assert.equal(run(page.sandbox, 'parkedDiagramHost.scene'), null);
  assert.equal(run(page.sandbox, 'parkedDiagramHost.cache'), null);
});

test('the host switch parks the camera, the scene, the cache and the tab stop of the links, and gives each host its own', async () => {
  const { sandbox } = await openFixture();
  run(sandbox, "diagramScale = 2; diagramCenter = { x: 5, y: 6 }; diagramShownView = 'main-view'; diagramScene = { id: 'main' }; diagramCache = { key: 'main' }; diagramLinkStop = { link: true, from: 'a', to: 'b', nth: null };");
  sandbox.useDiagramHost('library');
  assert.equal(run(sandbox, 'diagramHost'), 'library');
  assert.deepEqual(plain(run(sandbox, '[diagramScale, diagramCenter, diagramShownView, diagramScene, diagramCache, diagramLinkStop]')), ['auto', { x: 0, y: 0 }, null, null, null, null], 'the page starts from nothing');
  run(sandbox, "diagramScale = 'fit'; diagramCenter = { x: 9, y: 9 }; diagramShownView = 'lib-view'; diagramScene = { id: 'lib' }; diagramCache = { key: 'lib' }; diagramLinkStop = { link: true, from: 'c', to: 'd', nth: '1' };");
  sandbox.useDiagramHost('library');
  assert.equal(run(sandbox, 'diagramScale'), 'fit', 'asking for the host that is on screen changes nothing');
  sandbox.useDiagramHost('main');
  assert.deepEqual(plain(run(sandbox, '[diagramScale, diagramCenter, diagramShownView, diagramScene, diagramCache, diagramLinkStop]')),
    [2, { x: 5, y: 6 }, 'main-view', { id: 'main' }, { key: 'main' }, { link: true, from: 'a', to: 'b', nth: null }], 'the Map gets back exactly its own');
  sandbox.useDiagramHost('library');
  assert.deepEqual(plain(run(sandbox, '[diagramScale, diagramCenter, diagramShownView, diagramScene, diagramCache, diagramLinkStop]')),
    ['fit', { x: 9, y: 9 }, 'lib-view', { id: 'lib' }, { key: 'lib' }, { link: true, from: 'c', to: 'd', nth: '1' }]);
  assert.equal(sandbox.diagramHostOf('library'), 'library');
  for (const perspective of ['map', 'elements', 'files', 'settings']) assert.equal(sandbox.diagramHostOf(perspective), 'main');
});

test('render() takes the host of the perspective it draws, whoever changed the perspective', async () => {
  const page = await startPage();
  run(page.sandbox, "currentPerspective = 'map'; diagramScale = 2;");
  await page.show();
  run(page.sandbox, "currentPerspective = 'library'; libraryTab = 'views';");
  page.sandbox.render();
  assert.equal(run(page.sandbox, 'diagramHost'), 'library');
  run(page.sandbox, "currentPerspective = 'elements';");
  page.sandbox.render();
  assert.equal(run(page.sandbox, 'diagramHost'), 'main');
});

test('the Library tab itself, with no view to draw, leaves the Map\'s drawing parked and no canvas on the page', async () => {
  const page = await startPage();
  run(page.sandbox, "currentPerspective = 'map';");
  page.state.selection = NONE;
  await page.show();
  const mapHtml = page.scene().html;
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = null;");
  page.sandbox.setPerspective('library'); // the workspace has no view yet
  assert.equal(page.canvas(), null);
  assert.match(page.html(), /A view is a diagram kept under a name/);
  await page.go('map');
  assert.equal(page.scene().html, mapHtml);
});

test('the layer of a technology view reaches the names of its boxes and the labels of its links, whatever is selected', async () => {
  const page = await startPage();
  const tech = Object.assign({}, page.state.index.technology.get('psp.gateway'), { reference: 'mailer', id: 'mailer', name: 'The mailer machine', kind: 'node', children: [],
    relationships: [{ destination: 'psp.gateway', resolved: true, rawLabel: 'talks to', label: 'talks to', qualifiers: [], tags: {} }] });
  page.state.index.technology.set('mailer', tech);
  page.state.selection = { kind: 'element', key: 'mailer', layer: 'application', mode: 'view' }; // the application mailer: the selection must not name the box
  const view = addView(page, { id: 'both', name: 'Both', viewpoint: 'overview', layer: 'technology', properties: { element: 'mailer' } });
  await openView(page, view);
  const scene = page.scene();
  assert.ok(scene.boxes.mailer && scene.boxes.psp, 'the technology element is the one drawn, with the environment it points at');
  assert.match(scene.html, /aria-label="The mailer machine/);
  assert.match(scene.html, /Link from The mailer machine/);
  assert.equal(page.state.selection.layer, 'application', 'and the selection is as it was');
});
