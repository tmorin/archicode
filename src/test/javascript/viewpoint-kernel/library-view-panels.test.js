'use strict';
// The right-hand panel of the page of a view in the Library (run 0028, TDD-0028): the attributes of the view, then the inspection of the
// box or the link selected in its diagram, on the page, without leaving it and without touching the Map and Elements. Same harness as
// library-view-diagram.test.js: the real `render()` over the real kernel, a fake layout engine and a fake canvas.
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

/** A DOM element just big enough for the marks the page puts on the drawing (classes and attributes). */
function fakeMark(attributes, classes) {
  const classSet = new Set(classes);
  const attrs = Object.assign({}, attributes);
  return {
    attrs,
    classes: classSet,
    classList: { add: (c) => classSet.add(c), remove: (c) => classSet.delete(c), toggle: (c, on) => (on ? classSet.add(c) : classSet.delete(c)), contains: (c) => classSet.has(c) },
    getAttribute: (name) => (name in attrs ? attrs[name] : null),
    setAttribute: (name, value) => { attrs[name] = String(value); }
  };
}

async function startPage() {
  const { sandbox, state, kernel } = await openFixture();
  sandbox.window.showDirectoryPicker = function showDirectoryPicker() {};
  sandbox.__elk = { layout: async (graph) => fakeLayout(graph) };
  run(sandbox, 'loadElk = async () => __elk;');
  const app = sandbox.document.getElementById('app');
  const originalGet = sandbox.document.getElementById;
  const originalQuery = sandbox.document.querySelector;
  let html = '';
  let canvas = null;
  let marks = null;
  Object.defineProperty(app, 'innerHTML', { get: () => html, set: (value) => { html = value; canvas = null; marks = null; }, configurable: true });
  /** The nodes, links and captions of the scene on the canvas, as the elements `showDiagramScene` marks. */
  const marksOf = () => {
    if (marks) return marks;
    const scene = run(sandbox, 'diagramScene');
    marks = { nodes: [], links: [], labels: [] };
    if (!scene || !scene.html) return marks;
    for (const m of scene.html.matchAll(/<g class="(dg-node[^"]*)"([^>]*)>/g)) marks.nodes.push(fakeMark(Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]])), m[1].split(' ')));
    for (const m of scene.html.matchAll(/<g class="(dg-link)"([^>]*)>/g)) marks.links.push(fakeMark(Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]])), m[1].split(' ')));
    for (const m of scene.html.matchAll(/<text class="(dg-label)"([^>]*)>/g)) marks.labels.push(fakeMark(Object.fromEntries(Array.from(m[2].matchAll(/([\w-]+)="([^"]*)"/g), (a) => [a[1], a[2]])), m[1].split(' ')));
    return marks;
  };
  const canvasOf = () => {
    if (canvas) return canvas;
    const tag = /<div class="diagram-canvas" id="diagram-canvas"([^>]*)>/.exec(html);
    if (!tag) return null;
    const attributes = {};
    for (const m of tag[1].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[m[1]] = m[2] === undefined ? '' : m[2];
    canvas = {
      attributes, innerHTML: '', clientWidth: 800, clientHeight: 600, parentElement: null,
      classList: { add() {}, remove() {}, contains: () => false },
      getAttribute: (name) => (name in attributes ? attributes[name] : null),
      hasAttribute: (name) => name in attributes,
      querySelector: () => null,
      querySelectorAll: (selector) => {
        const found = marksOf();
        if (selector === '.dg-selected') return found.nodes.filter((el) => el.classes.has('dg-selected'));
        if (selector === '.dg-node') return found.nodes;
        if (selector === '.dg-link, .dg-label') return found.links.concat(found.labels);
        if (selector === '.dg-link') return found.links;
        return [];
      },
      contains: () => false, focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
    };
    return canvas;
  };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvasOf() : originalGet(id));
  // the panel of the page, as `refreshInspection` and the scroll after a selection find it
  const panel = { removed: false, scrolled: 0 };
  sandbox.document.querySelector = (selector) => {
    if (selector === '.library-selection') return html.includes('class="library-selection"') ? { remove() { panel.removed = true; }, scrollIntoView() { panel.scrolled++; } } : null;
    if (selector === '.inspection') return html.includes('class="inspection') ? { set outerHTML(value) { panel.refreshed = value; } } : null;
    return originalQuery ? originalQuery.call(sandbox.document, selector) : null;
  };
  const page = {
    sandbox, state, kernel, panel,
    html: () => html,
    canvas: canvasOf,
    marks: marksOf,
    resetMarks() { marks = null; },
    async drawn() {
      for (let i = 0; i < 400; i++) {
        const c = canvasOf();
        if (c && c.innerHTML !== '') return c;
        await new Promise((resolve) => setImmediate(resolve));
      }
      throw new Error('the diagram was never put on the canvas');
    },
    async show() { sandbox.render(); return canvasOf() ? page.drawn() : null; },
    scene: () => run(sandbox, 'diagramScene'),
    async go(perspective) { sandbox.setPerspective(perspective); return page.drawn().catch(() => null); },
    /** The panel on the right, as the page returns it. */
    right: () => sandbox.renderLibraryPerspectiveHtml().right,
    center: () => sandbox.renderLibraryPerspectiveHtml().center
  };
  return page;
}

function addView(page, content) {
  return page.sandbox.createManifestEntry('view', Object.assign({ layer: 'application' }, content));
}

async function openView(page, view) {
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(view.id) + ";");
  page.sandbox.setPerspective('library');
  return page.drawn().catch(() => null);
}

/** A click on an element carrying these attributes (what a browser gives the delegated handler). */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

/** The attributes of every box of the drawing that selects (the ones with an action), as written in the markup. */
function boxesOf(page) {
  return Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)" data-action="goto-element" data-ref="([^"]*)" data-layer="([^"]*)"/g), (m) => ({ 'data-action': 'goto-element', 'data-id': m[1], 'data-ref': m[2], 'data-layer': m[3] }));
}

/** The attributes of every link of the drawing, as written in the markup. */
function linksOf(page) {
  return Array.from(page.scene().html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"( data-nth="[^"]*")? data-layer="([^"]*)" data-action="select-link"/g), (m) => {
    const attributes = { 'data-action': 'select-link', 'data-from': m[1], 'data-to': m[2], 'data-layer': m[4] };
    if (m[3]) attributes['data-nth'] = /"([^"]*)"/.exec(m[3])[1];
    return attributes;
  });
}

const pick = (page) => plain(run(page.sandbox, 'libraryPick.selection'));

async function viewWith(page, content) {
  const view = addView(page, Object.assign({ id: 'v' + Math.random().toString(36).slice(2, 8), name: 'View' }, content));
  await openView(page, view);
  return view;
}

// ============================================================ 1. The right-hand panel lists the attributes of the view

test('the panel on the right lists the attributes of an Elements view: what it draws, viewpoint, layer, element, facet, hide-unlinked, texts, the file and the steps', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'full', name: 'Full', viewpoint: 'detailed', properties: { element: 'shop', facet: 'rest-only', 'hide-unlinked': true, labels: false, qualifiers: false, descriptions: true, wrap: true } });
  page.sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [{ view: 'full', text: 'first' }, { view: 'full', text: 'second' }] });
  await openView(page, view);
  const right = page.right();
  assert.ok(right, 'there is a right-hand region');
  const text = right.replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
  for (const expected of ['Draws', 'Viewpoint|detailed', 'Layer|application', 'element|shop', 'facet|rest-only', 'hide-unlinked|true', 'labels|false', 'qualifiers|false', 'descriptions|true', 'wrap|true', 'Kept in', 'Shown in']) {
    assert.ok(text.includes(expected), expected + ' is listed: ' + text);
  }
  assert.match(right, /<code>manifests\/view\.full\.yaml<\/code>/);
  assert.match(right, /data-action="library-go-story" data-story="tour" data-step="0"/);
  assert.match(right, /data-action="library-go-story" data-story="tour" data-step="1"/);
  assert.ok(!page.center().includes('view-facts'), 'the centre holds the diagram only');
  assert.ok(!right.includes('library-selection'), 'nothing is selected yet: no selection section');
});

test('the panel lists the pinned, hidden and opened elements of a Map view', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'scope', name: 'Scope', viewpoint: 'map', properties: { pinned: ['shop.web'], hidden: ['customer'], opened: ['shop'] } });
  await openView(page, view);
  const text = page.right().replace(/<[^>]+>/g, '|').replace(/\|+/g, '|');
  for (const expected of ['Viewpoint|map', 'pinned|shop.web', 'hidden|customer', 'opened|shop', 'Kept in']) assert.ok(text.includes(expected), expected + ': ' + text);
});

test('the panel is the shell\'s right panel: a handle to resize it, the width remembered, and a name', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'shell', name: 'Shell', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, view);
  assert.match(page.html(), /<div data-resize="panel-right" data-axis="x" data-sign="-1"[^>]*><\/div><aside id="panel-right" class="right-panel[^"]*" aria-label="View and selection" style="">/);
  const stored = new Map();
  page.sandbox.localStorage = { getItem: (key) => (stored.has(key) ? stored.get(key) : null), setItem: (key, value) => stored.set(key, value), removeItem: (key) => stored.delete(key) };
  run(page.sandbox, "panelSizeStorage.set(PANEL_SIZE_STORAGE_PREFIX + 'panel-right:width', '420');");
  page.sandbox.render();
  assert.match(page.html(), /<aside id="panel-right"[^>]*style="width: 420px;"/, 'the width the user chose is applied');
  // the Map\'s panel keeps its own name
  run(page.sandbox, "currentPerspective = 'map';");
  page.state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  page.sandbox.render();
  assert.match(page.html(), /<aside id="panel-right"[^>]*aria-label="Inspection"/);
});

test('a view that cannot be drawn keeps its message, its facts and its steps in the centre, with no diagram and no right-hand panel', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'orphan', name: 'Orphan', viewpoint: 'deep', properties: { element: 'shop.web.removed' } });
  page.sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [{ view: 'orphan', text: 'first' }] });
  await openView(page, view);
  const region = page.sandbox.renderLibraryPerspectiveHtml();
  assert.equal(region.right, null);
  assert.match(region.center, /does not exist any more/);
  assert.match(region.center, /class="view-facts"/);
  assert.match(region.center, /data-action="library-go-story" data-story="tour"/);
  assert.ok(!page.html().includes('id="panel-right"') && !page.html().includes('diagram-canvas'));
  assert.doesNotMatch(region.center, /toggle-maximize/, 'and nothing to maximize');
});

test('the steps that show the view lead to their story from the panel', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'led', name: 'Led', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  page.sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [{ view: 'led', text: 'first' }] });
  await openView(page, view);
  click(page.sandbox, { 'data-action': 'library-go-story', 'data-story': 'tour', 'data-step': '0' });
  assert.equal(run(page.sandbox, 'libraryTab'), 'stories');
  assert.equal(run(page.sandbox, 'selectedStoryId'), 'tour');
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
});

// ============================================================ 2. A box selected on the page: the inspection of the Map

test('a click on a box shows the inspection of that element in the panel, on the page, in its address, and leaves the selection of the Map and Elements alone', async () => {
  const page = await startPage();
  page.state.selection = { kind: 'element', key: 'customer', mode: 'view' }; // the selection of the Map and Elements: the page must not read or write it
  const view = await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const hash = page.sandbox.location.hash;
  const boxes = boxesOf(page);
  assert.ok(boxes.length > 3, 'the boxes of the page select');
  const api = boxes.find((box) => box['data-ref'] === 'shop.web.api');
  assert.ok(api);
  click(page.sandbox, api);
  assert.deepEqual(pick(page), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' });
  const right = page.right();
  assert.match(right, /<h3>Selected element<\/h3>/);
  assert.match(right, /data-inspection-ref="shop\.web\.api" data-inspection-layer="application"/);
  const record = page.state.index.application.get('shop.web.api');
  assert.ok(right.includes(record.name || record.id));
  assert.match(right, /class="inspection-close" data-action="close-inspection"/, 'it can be closed');
  assert.ok(right.indexOf('class="view-facts"') < right.indexOf('class="library-selection"'), 'the view first, the selection after it');
  assert.match(page.html(), /class="library-selection"/, 'and the page itself shows it');
  assert.doesNotMatch(right, /inspection-offmap|The map draws applications only/, 'the notes of the Map are not the page\'s');
  // the page stays where it is
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
  assert.equal(page.sandbox.location.hash, hash, 'its address');
  assert.deepEqual(plain(page.state.selection), { kind: 'element', key: 'customer', mode: 'view' }, 'the selection of the Map and Elements');
  assert.equal(run(page.sandbox, 'revealLinkAfterDrawing'), false);
  assert.equal(page.sandbox.countUnsavedChanges(), 1, 'the new view is the only change: selecting is not an edit');
  assert.ok(page.panel.scrolled > 0, 'the selection is brought into sight under the view');
  assert.equal(view.properties.element, 'shop');
});

test('a click on a box of a technology view selects the element of the technology layer', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', layer: 'technology', properties: { element: 'prod.cluster' } });
  const box = boxesOf(page).find((candidate) => candidate['data-ref'] === 'prod.cluster.web');
  assert.ok(box, 'a technology box');
  assert.equal(box['data-layer'], 'technology');
  click(page.sandbox, box);
  assert.deepEqual(pick(page), { kind: 'element', key: 'prod.cluster.web', layer: 'technology', mode: 'view' });
  assert.match(page.right(), /data-inspection-ref="prod\.cluster\.web" data-inspection-layer="technology"/);
  assert.match(page.right(), /Layer<\/span>[^]*technology/);
});

test('a click on a box of a Map view selects it too, whether or not the Map would draw it', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'map', properties: { pinned: ['shop.web'], opened: ['shop'] } });
  const box = boxesOf(page)[0];
  assert.ok(box);
  click(page.sandbox, box);
  assert.equal(pick(page).key, box['data-ref']);
  assert.match(page.right(), /<h3>Selected element<\/h3>/);
});

test('the outline follows the selected box, and the box that is selected next takes it', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const boxes = boxesOf(page);
  click(page.sandbox, boxes[0]);
  await page.drawn();
  page.sandbox.markMapSelection();
  assert.deepEqual(page.marks().nodes.filter((node) => node.classes.has('dg-selected')).map((node) => node.attrs['data-id']), [boxes[0]['data-id']]);
  click(page.sandbox, boxes[1]);
  await page.drawn();
  page.sandbox.markMapSelection();
  assert.deepEqual(page.marks().nodes.filter((node) => node.classes.has('dg-selected')).map((node) => node.attrs['data-id']), [boxes[1]['data-id']]);
});

test('selecting does not move the framing: an automatic framing becomes the zoom it was', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  assert.equal(run(page.sandbox, 'diagramScale'), 'auto');
  click(page.sandbox, boxesOf(page)[0]);
  assert.equal(typeof run(page.sandbox, 'diagramScale'), 'number', 'what is on screen stays as it is');
});

test('an element named in the panel (a declaring element of a relationship) is selected on the page, not opened', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const hash = page.sandbox.location.hash;
  click(page.sandbox, { 'data-action': 'goto-element', 'data-ref': 'customer', 'data-layer': 'application' });
  assert.deepEqual(pick(page), { kind: 'element', key: 'customer', layer: 'application', mode: 'view' });
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
  assert.equal(page.sandbox.location.hash, hash);
});

// ============================================================ 3. A link selected on the page: the link panel

test('a click on a link shows the link panel with the relationships it stands for, on the page, and leaves the selection of the Map alone', async () => {
  const page = await startPage();
  page.state.selection = { kind: 'element', key: 'customer', mode: 'view' };
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const hash = page.sandbox.location.hash;
  const link = linksOf(page)[0];
  assert.ok(link, 'the links of the page select');
  click(page.sandbox, link);
  const selection = pick(page);
  assert.equal(selection.kind, 'link');
  assert.equal(selection.from, link['data-from']);
  assert.equal(selection.to, link['data-to']);
  assert.equal(selection.layer, 'application');
  assert.ok(!('focal' in selection), 'a link of the page is not the link of an element');
  const pair = page.scene().links.find((candidate) => candidate.from === link['data-from'] && candidate.to === link['data-to']);
  const relationships = page.sandbox.relationshipsOfPair(pair);
  const right = page.right();
  assert.match(right, /<h3>Selected link<\/h3>/);
  assert.match(right, /class="inspection inspection-link"/);
  assert.equal((right.match(/class="inspection-rel( inspection-rel-marked)?"/g) || []).length, relationships.length, 'one block for each relationship the link stands for');
  assert.match(right, /Relationships <span class="field-count">\d+<\/span>/);
  // the relationship names its declaring element as a button that selects on the page
  assert.match(right, /class="relationship-link" data-action="goto-element" data-ref="[^"]+" data-layer="application"/);
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
  assert.equal(page.sandbox.location.hash, hash);
  assert.deepEqual(plain(page.state.selection), { kind: 'element', key: 'customer', mode: 'view' });
  assert.equal(run(page.sandbox, 'diagramLinkStop').from, link['data-from'], 'the tab stop of the links is where the click was');
});

test('the selected link and its caption are marked, and aria-pressed says it; a box selected next replaces the link', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop', labels: true } });
  const link = linksOf(page)[0];
  click(page.sandbox, link);
  await page.drawn();
  page.sandbox.markLinkSelection();
  const marked = page.marks().links.filter((el) => el.classes.has('dg-link-selected'));
  assert.ok(marked.length >= 1);
  assert.ok(marked.every((el) => el.attrs['data-from'] === link['data-from'] && el.attrs['data-to'] === link['data-to'] && el.attrs['aria-pressed'] === 'true'));
  assert.ok(page.marks().links.filter((el) => !el.classes.has('dg-link-selected')).every((el) => el.attrs['aria-pressed'] === 'false'));
  click(page.sandbox, boxesOf(page)[0]);
  assert.equal(pick(page).kind, 'element');
  assert.match(page.right(), /Selected element/);
  assert.doesNotMatch(page.right(), /Selected link/);
});

test('a link that the drawing no longer has is dropped by the drawing, and the panel keeps the view only', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, linksOf(page)[0]);
  assert.equal(pick(page).kind, 'link');
  run(page.sandbox, "libraryPick.selection = { kind: 'link', key: 'a -> b', from: 'nowhere', to: 'else', layer: 'application', mode: 'view' };");
  page.sandbox.reconcileLinkSelection();
  assert.equal(pick(page), null, 'a link no drawing holds is not selected');
  assert.equal(page.panel.removed, true, 'and only the selection section leaves the panel (the view stays)');
  // an element needs no box: the panel shows any element of the workspace
  run(page.sandbox, "libraryPick.selection = { kind: 'element', key: 'customer', layer: 'application', mode: 'view' };");
  page.sandbox.reconcileLinkSelection();
  assert.equal(pick(page).key, 'customer');
});

test('selecting a link on the page does not leave anything for the Map: the link is not in the address, nor the Map\'s selection a link', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, linksOf(page)[0]);
  assert.doesNotMatch(page.sandbox.location.hash, /link-from|link-to/);
  assert.equal(page.state.selection.kind, 'none');
  assert.equal(run(page.sandbox, 'revealLinkAfterDrawing'), false);
});

// ============================================================ 4. Giving the selection up

test('the cross of the panel, Escape and another view give the selection up; the same view keeps it while the reader is on the Map', async () => {
  const page = await startPage();
  const a = await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const stage = { closest: (selector) => (selector === '.diagram-stage' ? {} : null) };
  const press = (key) => page.sandbox.handleDiagramKeydown({ key, target: stage, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false });
  click(page.sandbox, boxesOf(page)[0]);
  assert.ok(pick(page));
  click(page.sandbox, { 'data-action': 'close-inspection' });
  assert.equal(pick(page), null, 'the cross');
  assert.ok(!page.right().includes('library-selection'));
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
  click(page.sandbox, boxesOf(page)[0]);
  press('Escape');
  assert.equal(pick(page), null, 'Escape');
  // the Map and back
  click(page.sandbox, boxesOf(page)[1]);
  const kept = pick(page);
  await page.go('map');
  await openView(page, a);
  assert.deepEqual(pick(page), kept, 'the same view comes back as it was left');
  // another view starts with nothing
  const b = addView(page, { id: 'other', name: 'Other', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  click(page.sandbox, { 'data-action': 'select-view', 'data-view': b.id });
  assert.equal(pick(page), null, 'another view');
  click(page.sandbox, { 'data-action': 'select-view', 'data-view': a.id });
  assert.equal(pick(page), null, 'and coming back to the first one after another is a new visit');
});

test('Escape restores a maximized page first and then gives the selection up; and with nothing selected it does nothing', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const stage = { closest: (selector) => (selector === '.diagram-stage' ? {} : null) };
  const press = (key) => page.sandbox.handleDiagramKeydown({ key, target: stage, preventDefault() {}, ctrlKey: false, metaKey: false, altKey: false });
  click(page.sandbox, boxesOf(page)[0]);
  press('m');
  assert.equal(run(page.sandbox, 'diagramMaximized'), true);
  press('Escape');
  assert.equal(run(page.sandbox, 'diagramMaximized'), false);
  assert.ok(pick(page), 'the selection is still there');
  press('Escape');
  assert.equal(pick(page), null);
  press('Escape');
  assert.equal(run(page.sandbox, 'diagramMaximized'), false);
});

test('closing the folder forgets the selection of the page', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, boxesOf(page)[0]);
  page.sandbox.resetUiState();
  assert.deepEqual(plain(run(page.sandbox, 'libraryPick')), { view: null, selection: null });
});

// ============================================================ 5. Reaching the element in Elements

test('Show in Elements leaves the page for the element: it becomes the selection of Elements, in its layer', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, boxesOf(page).find((box) => box['data-ref'] === 'shop.web.api'));
  const right = page.right();
  assert.match(right, /<button type="button" class="inspection-open with-icon" data-action="library-open-element" data-ref="shop\.web\.api" data-layer="application"/);
  assert.match(right, /<span>Show in Elements<\/span>/);
  click(page.sandbox, { 'data-action': 'library-open-element', 'data-ref': 'shop.web.api', 'data-layer': 'application' });
  assert.equal(run(page.sandbox, 'currentPerspective'), 'elements');
  assert.deepEqual(plain(page.state.selection), { kind: 'element', key: 'shop.web.api', layer: 'application', mode: 'view' });
  assert.match(page.sandbox.location.hash, /^#\/elements\?ref=shop\.web\.api/);
  assert.ok(run(page.sandbox, "AppState.expanded.has(nodeKey('shop.web', 'application'))") || run(page.sandbox, "AppState.expanded.has(nodeKey('shop', 'application'))"), 'its ancestors are open in the tree');
});

test('the panel of the Map and of Elements has no Show in Elements and Elements has no cross, as before', async () => {
  const page = await startPage();
  page.state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  const onMap = page.sandbox.renderInspectionHtml(true);
  const inElements = page.sandbox.renderInspectionHtml(false);
  assert.match(onMap, /data-action="close-inspection"/);
  assert.match(onMap, /inspection-offmap/);
  assert.doesNotMatch(inElements, /close-inspection/);
  assert.doesNotMatch(onMap + inElements, /library-open-element/);
});

// ============================================================ 6. Maximize

test('Maximize gives the diagram the room of the list and of the panel; Restore brings them back; the Map is not maximized by it', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  assert.match(page.html(), /data-action="toggle-maximize" aria-label="Maximize" title="Hide the list of views and the panel to give the diagram all the room \(M\)"/);
  assert.ok(page.sandbox.renderLibraryPerspectiveHtml().left && page.right());
  click(page.sandbox, { 'data-action': 'toggle-maximize' });
  const region = page.sandbox.renderLibraryPerspectiveHtml();
  assert.equal(region.left, null);
  assert.equal(region.right, null);
  assert.ok(!page.html().includes('id="panel-right"') && !page.html().includes('id="panel-left"') && !page.html().includes('data-resize='), 'no panel, no handle');
  assert.match(page.html(), /data-action="toggle-maximize" aria-label="Restore" title="Bring back the list of views and the panel \(Esc\)"/);
  await page.go('map');
  assert.equal(run(page.sandbox, 'diagramMaximized'), false, 'the Map is not maximized');
  await openView(page, run(page.sandbox, 'findSavedView(selectedViewId)'));
  assert.equal(run(page.sandbox, 'diagramMaximized'), true, 'the page was left maximized');
  click(page.sandbox, { 'data-action': 'toggle-maximize' });
  assert.ok(page.sandbox.renderLibraryPerspectiveHtml().left && page.right());
});

test('a maximized page that turns into a message gets its list back, and a Map maximized before the visit is still maximized after it', async () => {
  const page = await startPage();
  const view = await viewWith(page, { viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  click(page.sandbox, { 'data-action': 'toggle-maximize' });
  run(page.sandbox, "AppState.index.application.delete('shop.web.api');");
  const region = page.sandbox.renderLibraryPerspectiveHtml();
  assert.ok(region.left, 'the list of views is back: a message needs it');
  assert.equal(region.right, null);
  const map = await startPage();
  run(map.sandbox, "currentPerspective = 'map'; diagramMaximized = true;");
  map.state.selection = NONE;
  const mapView = addView(map, { id: 'mv', name: 'MV', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(map, mapView);
  assert.equal(run(map.sandbox, 'diagramMaximized'), false, 'the page starts restored');
  await map.go('map');
  assert.equal(run(map.sandbox, 'diagramMaximized'), true);
  assert.ok(view);
});

// ============================================================ 7. The panel scrolls from the top for another view

test('another view opens at the top of the panel: the view shown is part of what render() calls the same view', async () => {
  const page = await startPage();
  const a = addView(page, { id: 'sa', name: 'A', viewpoint: 'deep', properties: { element: 'shop' } });
  const b = addView(page, { id: 'sb', name: 'B', viewpoint: 'deep', properties: { element: 'shop' } });
  await openView(page, a);
  const first = run(page.sandbox, 'lastRenderedViewKey');
  page.sandbox.render();
  assert.equal(run(page.sandbox, 'lastRenderedViewKey'), first, 'a redraw of the same view');
  await openView(page, b);
  assert.notEqual(run(page.sandbox, 'lastRenderedViewKey'), first, 'another view');
  assert.match(run(page.sandbox, 'lastRenderedViewKey'), /\|sb$/);
});

// ============================================================ 8. The Map and Elements read their own selection

test('diagramSelection is the Map\'s and Elements\' selection everywhere but on the page', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, boxesOf(page)[0]);
  const picked = page.sandbox.diagramSelection();
  assert.equal(picked.kind, 'element');
  for (const perspective of ['map', 'elements', 'files', 'settings']) {
    run(page.sandbox, "currentPerspective = '" + perspective + "';");
    page.state.selection = { kind: 'element', key: 'customer', mode: 'view' };
    assert.equal(page.sandbox.diagramSelection(), page.state.selection, perspective + ': the very object of the Map and Elements');
  }
  run(page.sandbox, "currentPerspective = 'library'; libraryTab = 'stories';");
  assert.equal(page.sandbox.diagramSelection().kind, 'none', 'the Stories side selects nothing');
});

test('the Map still outlines and reconciles its own selection: a page pick does not leak into it', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, boxesOf(page)[0]);
  assert.ok(pick(page));
  await page.go('map');
  page.state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  page.sandbox.render();
  await page.drawn();
  page.sandbox.markMapSelection();
  const outlined = page.marks().nodes.filter((node) => node.classes.has('dg-selected')).map((node) => node.attrs['data-id']);
  assert.deepEqual(outlined, outlined.length ? ['shop.web.api'] : [], 'the Map outlines its own selection only');
});

test('the outline finds a box by its element and layer, also when the id of the box is not the reference (an application hosted by a node)', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, `diagramScene = Object.assign({}, diagramScene, { html: '<g class="dg-node dg-leaf" data-id="pod_mailer" data-action="goto-element" data-ref="mailer" data-layer="application" tabindex="0"></g><g class="dg-node dg-leaf" data-id="mailer" data-action="goto-element" data-ref="mailer" data-layer="technology" tabindex="0"></g>' });`);
  page.resetMarks();
  run(page.sandbox, "libraryPick.selection = { kind: 'element', key: 'mailer', layer: 'application', mode: 'view' };");
  page.sandbox.markMapSelection();
  assert.deepEqual(page.marks().nodes.filter((node) => node.classes.has('dg-selected')).map((node) => node.attrs['data-id']), ['pod_mailer']);
});

test('the roving tab stop of the links starts on the link selected on the page', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const links = linksOf(page);
  assert.ok(links.length > 1);
  const wanted = links[links.length - 1];
  run(page.sandbox, "diagramLinkStop = null;");
  run(page.sandbox, `libraryPick.selection = { kind: 'link', key: 'x', from: ${JSON.stringify(wanted['data-from'])}, to: ${JSON.stringify(wanted['data-to'])}, layer: 'application', mode: 'view' };`);
  page.sandbox.syncLinkTabStop(page.canvas());
  const stops = page.marks().links.filter((el) => el.attrs.tabindex === '0');
  assert.equal(stops.length, 1);
  assert.equal(stops[0].attrs['data-from'], wanted['data-from']);
  assert.equal(stops[0].attrs['data-to'], wanted['data-to']);
});

test('a selected element that has been renamed or deleted meanwhile is not left half drawn in the panel', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, boxesOf(page).find((box) => box['data-ref'] === 'shop.web.api'));
  assert.ok(pick(page));
  run(page.sandbox, "AppState.index.application.delete('shop.web.api');");
  const right = page.right();
  assert.ok(!right.includes('library-selection'));
  assert.equal(pick(page), null);
});

test('a click on one of several links between the same two boxes keeps the relationships of that link, and the leaving set includes the way to Elements', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const end = (id) => ({ id, reference: id, title: id, sub: '', ghost: false, collapsed: false, hidden: 0 });
  const first = { relationships: [{ from: 'a', destination: 'b', label: 'one', qualifiers: [], tags: {} }] };
  const second = { relationships: [{ from: 'a', destination: 'b', label: 'two', qualifiers: [], tags: {} }] };
  run(page.sandbox, `diagramScene = Object.assign({}, diagramScene, { links: [{ from: 'a', to: 'b', fromEnd: ${JSON.stringify(end('a'))}, toEnd: ${JSON.stringify(end('b'))}, links: [${JSON.stringify(first)}, ${JSON.stringify(second)}] }] });`);
  let made = null;
  page.sandbox.selectOnLibraryPage = (selection) => { made = selection; }; // the redraw would put the real scene back, which has no such pair
  click(page.sandbox, { 'data-action': 'select-link', 'data-from': 'a', 'data-to': 'b', 'data-layer': 'application', 'data-nth': '1' });
  assert.deepEqual(plain(made.via), [page.sandbox.relationshipKeyOf(second.relationships[0])]);
  assert.equal(made.from, 'a');
  assert.equal(run(page.sandbox, 'ACTIONS_LEAVING_THE_FORM.has("library-open-element")'), true);
});

test('the header keeps PNG and SVG at every width: they, Open on diagram, Rename and Delete are in the menu a narrow header folds, Maximize stays in the row', async () => {
  const page = await startPage();
  const view = addView(page, { id: 'hdr', name: 'Hdr', viewpoint: 'overview', properties: { element: 'shop.web.api' } });
  await openView(page, view);
  const header = page.center().match(/<div class="element-header-actions">([^]*?)<\/div><\/div><div class="diagram-stage"/)[1];
  const menu = /<div class="header-overflow" id="header-overflow"[^>]*>([^]*)<\/div><\/span>/.exec(header)[1];
  for (const action of ['data-format="png"', 'data-format="svg"', 'saved-view-open', 'saved-view-rename', 'saved-view-delete']) assert.ok(menu.includes(action), action + ' is in the menu');
  assert.ok(!menu.includes('toggle-maximize'), 'Maximize stays in the row');
  assert.match(header, /<\/span><button type="button" class="maximize-button with-icon" data-action="toggle-maximize"/);
  assert.match(header, /data-action="toggle-header-menu" aria-haspopup="true" aria-expanded="false"/);
  // a view that cannot be drawn has nothing to fold
  const broken = addView(page, { id: 'brk', name: 'Brk', viewpoint: 'deep', properties: { element: 'gone.for.good' } });
  await openView(page, broken);
  assert.ok(!page.center().includes('header-more'));
});

// ============================================================ 9. Source pins: the seams W-3 relies on

test('nothing the page does writes AppState.selection but the one explicit way out', () => {
  const start = HTML.indexOf('function selectOnLibraryPage(');
  const end = HTML.indexOf('function openSavedView(');
  const body = HTML.slice(start, end);
  assert.ok(!body.includes('AppState.selection'), 'selecting and closing on the page never touch the Map\'s selection');
  const open = HTML.slice(HTML.indexOf("case 'library-open-element'"), HTML.indexOf("case 'toggle-element-edit'"));
  assert.match(open, /AppState\.selection = /);
  assert.match(open, /setPerspective\('elements'\)/);
  const library = HTML.slice(HTML.indexOf('function renderLibraryPanelHtml('), HTML.indexOf('/** Dispatch to the active perspective'));
  assert.ok(!library.includes('AppState.selection'));
});
