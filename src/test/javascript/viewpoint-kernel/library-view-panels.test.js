'use strict';
// The right-hand panel of the page of a view in the Library (run 0028, TDD-0028): the attributes of the view, then the inspection of the
// box or the link selected in its diagram, on the page, without leaving it and without touching the Map and Elements. Same harness as
// library-view-diagram.test.js: the real `render()` over the real kernel, a fake layout engine and a fake canvas.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, plain, NONE, startPage, addView, openView, click, boxesOf, linksOf } = require('./library-page');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

const pick = (page) => plain(run(page.sandbox, 'libraryPick.selection'));

async function viewWith(page, content) {
  const view = addView(
    page,
    Object.assign({ id: 'v' + Math.random().toString(36).slice(2, 8), name: 'View' }, content)
  );
  await openView(page, view);
  return view;
}

// ============================================================ 1. The right-hand panel lists the attributes of the view

test('the panel on the right lists the attributes of an Elements view: what it draws, viewpoint, layer, element, facet, hide-unlinked, texts, the file and the steps', async () => {
  const page = await startPage();
  const view = addView(page, {
    id: 'full',
    name: 'Full',
    viewpoint: 'detailed',
    properties: {
      element: 'shop',
      facet: 'rest-only',
      'hide-unlinked': true,
      labels: false,
      qualifiers: false,
      descriptions: true,
      wrap: true
    }
  });
  page.sandbox.createManifestEntry('story', {
    id: 'tour',
    name: 'Tour',
    steps: [
      { view: 'full', text: 'first' },
      { view: 'full', text: 'second' }
    ]
  });
  await openView(page, view);
  const right = page.right();
  assert.ok(right, 'there is a right-hand region');
  assert.match(right, /<dt>Draws<\/dt>/);
  assert.match(right, /<option value="detailed" selected>Detailed<\/option>/, 'the viewpoint');
  assert.match(right, /<option value="application" selected>Application<\/option>/, 'the layer');
  assert.match(right, /id="view-edit-element"[^>]* value="shop"/, 'the element');
  assert.match(right, /<option value="rest-only" selected>rest-only<\/option>/, 'the facet');
  assert.match(right, /id="view-edit-hide-unlinked" data-view-field="hide-unlinked" checked/);
  assert.doesNotMatch(right, /id="view-edit-show-labels"[^>]* checked/);
  assert.doesNotMatch(right, /id="view-edit-show-qualifiers"[^>]* checked/);
  assert.match(right, /id="view-edit-show-descriptions"[^>]* checked/);
  assert.match(right, /id="view-edit-show-wrap"[^>]* checked/);
  assert.ok(right.includes('<dt>Kept in</dt>') && right.includes('<h3>Shown in</h3>'));
  assert.match(right, /<code>manifests\/view\.full\.yaml<\/code>/);
  assert.match(right, /data-action="library-go-story" data-story="tour" data-step="0"/);
  assert.match(right, /data-action="library-go-story" data-story="tour" data-step="1"/);
  assert.ok(!page.center().includes('view-facts'), 'the centre holds the diagram only');
  assert.ok(!right.includes('library-selection'), 'nothing is selected yet: no selection section');
});

test('the panel lists the pinned, hidden and opened elements of a Map view', async () => {
  const page = await startPage();
  const view = addView(page, {
    id: 'scope',
    name: 'Scope',
    viewpoint: 'map',
    properties: { pinned: ['shop.web'], hidden: ['customer'], opened: ['shop'] }
  });
  await openView(page, view);
  const right = page.right();
  assert.match(right, /<option value="map" selected>Map<\/option>/);
  for (const [list, reference] of [
    ['pinned', 'shop.web'],
    ['hidden', 'customer'],
    ['opened', 'shop']
  ]) {
    assert.ok(
      right.includes('data-action="view-list-remove" data-list="' + list + '" data-ref="' + reference + '"'),
      list + ' lists ' + reference
    );
  }
  assert.ok(right.includes('<dt>Kept in</dt>'));
});

test("the panel is the shell's right panel: a handle to resize it, the width remembered, and a name", async () => {
  const page = await startPage();
  const view = addView(page, {
    id: 'shell',
    name: 'Shell',
    viewpoint: 'overview',
    properties: { element: 'shop.web.api' }
  });
  await openView(page, view);
  assert.match(
    page.html(),
    /<div data-resize="panel-right" data-axis="x" data-sign="-1"[^>]*><\/div><aside id="panel-right" class="right-panel[^"]*" aria-label="View and selection" style="">/
  );
  const stored = new Map();
  page.sandbox.localStorage = {
    getItem: (key) => (stored.has(key) ? stored.get(key) : null),
    setItem: (key, value) => stored.set(key, value),
    removeItem: (key) => stored.delete(key)
  };
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
  const view = addView(page, {
    id: 'orphan',
    name: 'Orphan',
    viewpoint: 'deep',
    properties: { element: 'shop.web.removed' }
  });
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
  const view = addView(page, {
    id: 'led',
    name: 'Led',
    viewpoint: 'overview',
    properties: { element: 'shop.web.api' }
  });
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
  assert.ok(
    right.indexOf('class="view-facts"') < right.indexOf('class="library-selection"'),
    'the view first, the selection after it'
  );
  assert.match(page.html(), /class="library-selection"/, 'and the page itself shows it');
  assert.doesNotMatch(
    right,
    /inspection-offmap|The map draws applications only/,
    "the notes of the Map are not the page's"
  );
  // the page stays where it is
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
  assert.equal(page.sandbox.location.hash, hash, 'its address');
  assert.deepEqual(
    plain(page.state.selection),
    { kind: 'element', key: 'customer', mode: 'view' },
    'the selection of the Map and Elements'
  );
  assert.equal(run(page.sandbox, 'revealLinkAfterDrawing'), false);
  assert.equal(page.sandbox.countUnsavedChanges(), 1, 'the new view is the only change: selecting is not an edit');
  assert.ok(page.panel.right.scrollTop > 0, 'the selection is brought into sight under the view');
  assert.equal(view.properties.element, 'shop');
});

test("a selection whose top is already in the panel leaves the panel where it is; one out of sight is brought into it by as little as it takes (the view's attributes stay in sight)", async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const [first, second, third] = boxesOf(page).filter((box) => box['data-ref'] !== 'shop');
  const scroll = () => page.panel.right.scrollTop;
  page.panel.sectionTop = 380; // under the attributes of the view, in the window of the panel
  click(page.sandbox, first);
  assert.equal(scroll(), 0, 'in sight: no scroll');
  page.panel.sectionTop = 790; // its first line would be cut by the foot of the panel: not in sight
  click(page.sandbox, second);
  assert.equal(
    scroll(),
    790 - (800 - 120),
    'too low: its first 120 px are shown at the foot of the panel, not the whole of it at the top'
  );
  page.panel.sectionTop = -300; // the reader scrolled past it
  click(page.sandbox, third);
  assert.equal(scroll(), 110 - 300, 'above: its top edge comes to the head of the panel');
  assert.equal(page.panel.scrolled, 0, 'the section itself is never scrolled to the top of the panel');
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
  assert.deepEqual(
    page
      .marks()
      .nodes.filter((node) => node.classes.has('dg-selected'))
      .map((node) => node.attrs['data-id']),
    [boxes[0]['data-id']]
  );
  click(page.sandbox, boxes[1]);
  await page.drawn();
  page.sandbox.markMapSelection();
  assert.deepEqual(
    page
      .marks()
      .nodes.filter((node) => node.classes.has('dg-selected'))
      .map((node) => node.attrs['data-id']),
    [boxes[1]['data-id']]
  );
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
  const pair = page
    .scene()
    .links.find((candidate) => candidate.from === link['data-from'] && candidate.to === link['data-to']);
  const relationships = page.sandbox.relationshipsOfPair(pair);
  const right = page.right();
  assert.match(right, /<h3>Selected link<\/h3>/);
  assert.match(right, /class="inspection inspection-link"/);
  assert.equal(
    (right.match(/class="inspection-rel( inspection-rel-marked)?"/g) || []).length,
    relationships.length,
    'one block for each relationship the link stands for'
  );
  assert.match(right, /Relationships <span class="field-count">\d+<\/span>/);
  // the relationship names its declaring element as a button that selects on the page
  assert.match(right, /class="relationship-link" data-action="goto-element" data-ref="[^"]+" data-layer="application"/);
  assert.equal(run(page.sandbox, 'currentPerspective'), 'library');
  assert.equal(page.sandbox.location.hash, hash);
  assert.deepEqual(plain(page.state.selection), { kind: 'element', key: 'customer', mode: 'view' });
  assert.equal(
    run(page.sandbox, 'diagramLinkStop').from,
    link['data-from'],
    'the tab stop of the links is where the click was'
  );
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
  assert.ok(
    marked.every(
      (el) =>
        el.attrs['data-from'] === link['data-from'] &&
        el.attrs['data-to'] === link['data-to'] &&
        el.attrs['aria-pressed'] === 'true'
    )
  );
  assert.ok(
    page
      .marks()
      .links.filter((el) => !el.classes.has('dg-link-selected'))
      .every((el) => el.attrs['aria-pressed'] === 'false')
  );
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
  run(
    page.sandbox,
    "libraryPick.selection = { kind: 'link', key: 'a -> b', from: 'nowhere', to: 'else', layer: 'application', mode: 'view' };"
  );
  page.sandbox.reconcileLinkSelection();
  assert.equal(pick(page), null, 'a link no drawing holds is not selected');
  assert.equal(page.panel.removed, true, 'and only the selection section leaves the panel (the view stays)');
  // an element needs no box: the panel shows any element of the workspace
  run(
    page.sandbox,
    "libraryPick.selection = { kind: 'element', key: 'customer', layer: 'application', mode: 'view' };"
  );
  page.sandbox.reconcileLinkSelection();
  assert.equal(pick(page).key, 'customer');
});

test("selecting a link on the page does not leave anything for the Map: the link is not in the address, nor the Map's selection a link", async () => {
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
  const press = (key) =>
    page.sandbox.handleDiagramKeydown({
      key,
      target: stage,
      preventDefault() {},
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
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
  const b = addView(page, {
    id: 'other',
    name: 'Other',
    viewpoint: 'overview',
    properties: { element: 'shop.web.api' }
  });
  click(page.sandbox, { 'data-action': 'select-view', 'data-view': b.id });
  assert.equal(pick(page), null, 'another view');
  click(page.sandbox, { 'data-action': 'select-view', 'data-view': a.id });
  assert.equal(pick(page), null, 'and coming back to the first one after another is a new visit');
});

test('Escape restores a maximized page first and then gives the selection up; and with nothing selected it does nothing', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const stage = { closest: (selector) => (selector === '.diagram-stage' ? {} : null) };
  const press = (key) =>
    page.sandbox.handleDiagramKeydown({
      key,
      target: stage,
      preventDefault() {},
      ctrlKey: false,
      metaKey: false,
      altKey: false
    });
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
  click(
    page.sandbox,
    boxesOf(page).find((box) => box['data-ref'] === 'shop.web.api')
  );
  const right = page.right();
  assert.match(
    right,
    /<button type="button" class="inspection-open with-icon" data-action="library-open-element" data-ref="shop\.web\.api" data-layer="application"/
  );
  assert.match(right, /<span>Show in Elements<\/span>/);
  click(page.sandbox, {
    'data-action': 'library-open-element',
    'data-ref': 'shop.web.api',
    'data-layer': 'application'
  });
  assert.equal(run(page.sandbox, 'currentPerspective'), 'elements');
  assert.deepEqual(plain(page.state.selection), {
    kind: 'element',
    key: 'shop.web.api',
    layer: 'application',
    mode: 'view'
  });
  assert.match(page.sandbox.location.hash, /^#\/timeline\/elements\?ref=shop\.web\.api/);
  assert.ok(
    run(page.sandbox, "AppState.expanded.has(nodeKey('shop.web', 'application'))") ||
      run(page.sandbox, "AppState.expanded.has(nodeKey('shop', 'application'))"),
    'its ancestors are open in the tree'
  );
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
  assert.match(
    page.html(),
    /data-action="toggle-maximize" aria-label="Maximize" title="Hide the list of views and the panel to give the diagram all the room \(M\)"/
  );
  assert.ok(page.sandbox.renderLibraryPerspectiveHtml().left && page.right());
  click(page.sandbox, { 'data-action': 'toggle-maximize' });
  const region = page.sandbox.renderLibraryPerspectiveHtml();
  assert.equal(region.left, null);
  assert.equal(region.right, null);
  assert.ok(
    !page.html().includes('id="panel-right"') &&
      !page.html().includes('id="panel-left"') &&
      !page.html().includes('data-resize='),
    'no panel, no handle'
  );
  assert.match(
    page.html(),
    /data-action="toggle-maximize" aria-label="Restore" title="Bring back the list of views and the panel \(Esc\)"/
  );
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
  const mapView = addView(map, {
    id: 'mv',
    name: 'MV',
    viewpoint: 'overview',
    properties: { element: 'shop.web.api' }
  });
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

test("diagramSelection is the Map's and Elements' selection everywhere but on the page", async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(page.sandbox, boxesOf(page)[0]);
  const picked = page.sandbox.diagramSelection();
  assert.equal(picked.kind, 'element');
  for (const perspective of ['map', 'elements', 'files', 'settings']) {
    run(page.sandbox, "currentPerspective = '" + perspective + "';");
    page.state.selection = { kind: 'element', key: 'customer', mode: 'view' };
    assert.equal(
      page.sandbox.diagramSelection(),
      page.state.selection,
      perspective + ': the very object of the Map and Elements'
    );
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
  const outlined = page
    .marks()
    .nodes.filter((node) => node.classes.has('dg-selected'))
    .map((node) => node.attrs['data-id']);
  assert.deepEqual(outlined, outlined.length ? ['shop.web.api'] : [], 'the Map outlines its own selection only');
});

test('the outline finds a box by its element and layer, also when the id of the box is not the reference (an application hosted by a node)', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  run(
    page.sandbox,
    `diagramScene = Object.assign({}, diagramScene, { html: '<g class="dg-node dg-leaf" data-id="pod_mailer" data-action="goto-element" data-ref="mailer" data-layer="application" tabindex="0"></g><g class="dg-node dg-leaf" data-id="mailer" data-action="goto-element" data-ref="mailer" data-layer="technology" tabindex="0"></g>' });`
  );
  page.resetMarks();
  run(page.sandbox, "libraryPick.selection = { kind: 'element', key: 'mailer', layer: 'application', mode: 'view' };");
  page.sandbox.markMapSelection();
  assert.deepEqual(
    page
      .marks()
      .nodes.filter((node) => node.classes.has('dg-selected'))
      .map((node) => node.attrs['data-id']),
    ['pod_mailer']
  );
});

test('the roving tab stop of the links starts on the link selected on the page', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  const links = linksOf(page);
  assert.ok(links.length > 1);
  const wanted = links[links.length - 1];
  run(page.sandbox, 'diagramLinkStop = null;');
  run(
    page.sandbox,
    `libraryPick.selection = { kind: 'link', key: 'x', from: ${JSON.stringify(wanted['data-from'])}, to: ${JSON.stringify(wanted['data-to'])}, layer: 'application', mode: 'view' };`
  );
  page.sandbox.syncLinkTabStop(page.canvas());
  const stops = page.marks().links.filter((el) => el.attrs.tabindex === '0');
  assert.equal(stops.length, 1);
  assert.equal(stops[0].attrs['data-from'], wanted['data-from']);
  assert.equal(stops[0].attrs['data-to'], wanted['data-to']);
});

test('a selected element that has been renamed or deleted meanwhile is not left half drawn in the panel', async () => {
  const page = await startPage();
  await viewWith(page, { viewpoint: 'deep', properties: { element: 'shop' } });
  click(
    page.sandbox,
    boxesOf(page).find((box) => box['data-ref'] === 'shop.web.api')
  );
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
  run(
    page.sandbox,
    `diagramScene = Object.assign({}, diagramScene, { links: [{ from: 'a', to: 'b', fromEnd: ${JSON.stringify(end('a'))}, toEnd: ${JSON.stringify(end('b'))}, links: [${JSON.stringify(first)}, ${JSON.stringify(second)}] }] });`
  );
  let made = null;
  page.sandbox.selectOnLibraryPage = (selection) => {
    made = selection;
  }; // the redraw would put the real scene back, which has no such pair
  click(page.sandbox, {
    'data-action': 'select-link',
    'data-from': 'a',
    'data-to': 'b',
    'data-layer': 'application',
    'data-nth': '1'
  });
  assert.deepEqual(plain(made.via), [page.sandbox.relationshipKeyOf(second.relationships[0])]);
  assert.equal(made.from, 'a');
  assert.equal(run(page.sandbox, 'ACTIONS_LEAVING_THE_FORM.has("library-open-element")'), true);
});

test('the header keeps PNG and SVG at every width: they, Open on diagram, Rename and Delete are in the menu a narrow header folds, Maximize stays in the row', async () => {
  const page = await startPage();
  const view = addView(page, {
    id: 'hdr',
    name: 'Hdr',
    viewpoint: 'overview',
    properties: { element: 'shop.web.api' }
  });
  await openView(page, view);
  const header = page
    .center()
    .match(/<div class="element-header-actions">([^]*?)<\/div><\/div><div class="diagram-stage"/)[1];
  const menu = /<div class="header-overflow" id="header-overflow"[^>]*>([^]*)<\/div><\/span>/.exec(header)[1];
  for (const action of [
    'data-format="png"',
    'data-format="svg"',
    'saved-view-open',
    'saved-view-rename',
    'saved-view-delete'
  ])
    assert.ok(menu.includes(action), action + ' is in the menu');
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
  assert.ok(!body.includes('AppState.selection'), "selecting and closing on the page never touch the Map's selection");
  const open = HTML.slice(HTML.indexOf("case 'library-open-element'"), HTML.indexOf("case 'toggle-element-edit'"));
  assert.match(open, /AppState\.selection = /);
  assert.match(open, /setPerspective\('elements'\)/);
  const library = HTML.slice(
    HTML.indexOf('function renderLibraryPanelHtml('),
    HTML.indexOf('/** Dispatch to the active perspective')
  );
  assert.ok(!library.includes('AppState.selection'));
});

// ============================================================ 9. A row of the list of views

test('in the list of views the name keeps a width of its own and the badges wrap under it instead of taking its room', async () => {
  const css = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
  const rule = (selector) => {
    const m = new RegExp('\\n\\s*' + selector.replace(/[.]/g, '\\.') + ' \\{([^}]*)\\}').exec(css);
    assert.ok(m, selector + ' has a rule');
    return m[1];
  };
  assert.match(rule('.story-row'), /flex-wrap: wrap/, 'what does not fit goes on a second line');
  assert.match(
    rule('.story-row .file-relpath'),
    /flex: 1 1 6rem/,
    'the name asks for 6rem, and takes what the line leaves'
  );
  assert.match(rule('.story-row .file-relpath'), /min-width: 0/, 'and is still cut with an ellipsis beyond');
  // the badges keep their size (a shrinking name was the cause: `broken`, `modified` and `unused` do not give way)
  assert.match(rule('.modified-badge'), /flex-shrink: 0/);
  assert.match(rule('.story-count'), /flex-shrink: 0/);
  // the row of a view is made of the name, then the badges and the count, in that order
  const page = await startPage();
  const view = await viewWith(page, {
    id: 'a_long_named_view',
    name: 'A view whose name is long enough to need a cut',
    viewpoint: 'deep',
    properties: { element: 'shop' }
  });
  page.sandbox.markEntryChanged(view);
  const nav = page.sandbox.renderViewsNavHtml();
  const row = nav.slice(nav.indexOf('data-view="a_long_named_view"'));
  assert.ok(
    row.indexOf('file-relpath') < row.indexOf('modified-badge') &&
      row.indexOf('modified-badge') < row.indexOf('story-count')
  );
});
