'use strict';
// Editing a view from its page in the Library (run 0029, TDD-0029): the attributes of the panel are controls that change the entry of the view
// in memory (modified, written by "Save all changes", given up by "Cancel"), and the diagram follows. Same harness as the other Library tests
// (library-page.js: the real `render()` over the real kernel, a fake layout engine, a fake canvas), over an in-memory folder to save and cancel.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, plain, NONE, startPage, addView, openView, click, boxesOf, linksOf } = require('./library-page');
const { createApp } = require('./harness');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');

/** A view manifest as a person writes it, with comments. */
const VIEW_FILE = `# the architecture review reads this one
header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: api_view
  name: The API
  viewpoint: overview
  layer: application
  properties:
    # the element it is about
    element: shop.web.api
    labels: false
`;
const MAP_FILE = `header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: map_view
  name: A map
  viewpoint: map
  layer: application
  properties:
    pinned:
      - shop.web
      - customer
    labels: true
`;

async function startMem(extra) {
  const page = await startPage({ mem: true, files: Object.assign({ 'manifests/view.api_view.yaml': VIEW_FILE, 'manifests/view.map_view.yaml': MAP_FILE }, extra || {}) });
  return page;
}

const viewOf = (page, id) => page.sandbox.findSavedView(id);
const ids = (page) => plain(Object.keys(page.scene().boxes).sort());
const dirtyFiles = (page) => plain(page.state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath).sort());
const written = (page) => plain(page.mem.writes);

/** The ids of the boxes the kernel computes for an Elements recipe. */
function expectedBoxes(page, viewpoint, reference, options) {
  const opts = options || {};
  const facet = opts.facet ? page.state.workspace.settings.facets.customs.find((f) => f.name === opts.facet) : null;
  const layer = opts.layer || 'application';
  const result = page.kernel.compute(page.sandbox.buildKernelInput(viewpoint, reference, { layer, facet }).input);
  const ghosts = page.sandbox.buildDiagramGhosts(result, reference, layer);
  let items = result.items.concat(ghosts.items);
  if (opts.hideUnlinked) items = page.sandbox.hideUnlinkedItems(items, result.links.concat(ghosts.links), reference).items;
  return plain(items.filter((item) => !item.ghost).map((item) => item.id).sort());
}

/** A control of the form, as the delegated `change` listener meets it. */
function control(attributes, props) {
  const el = Object.assign({ tagName: 'SELECT', type: 'select-one', value: '', checked: false, id: attributes.id || '' }, props);
  el.getAttribute = (name) => (name in attributes ? attributes[name] : null);
  el.closest = () => el;
  return el;
}

/** The change of a control of the panel: what a person does, then the redraw is waited for. */
async function change(page, attributes, props) {
  page.sandbox.handleAppChange({ target: control(attributes, props) });
  await page.drawn().catch(() => null);
}
const pickViewpoint = (page, value) => change(page, { id: 'view-edit-viewpoint', 'data-view-field': 'viewpoint' }, { value });
const pickLayer = (page, value) => change(page, { id: 'view-edit-layer', 'data-view-field': 'layer' }, { value });
const typeElement = (page, value) => change(page, { id: 'view-edit-element', 'data-view-field': 'element' }, { tagName: 'INPUT', type: 'text', value });
const pickFacet = (page, value) => change(page, { id: 'view-edit-facet', 'data-view-field': 'facet' }, { value });
const tick = (page, field, checked) => change(page, { id: 'view-edit-' + field, 'data-view-field': field.replace(/^show-/, 'show:') }, { tagName: 'INPUT', type: 'checkbox', checked });
const addToList = (page, list, value) => change(page, { id: 'view-edit-add-' + list, 'data-view-list': list }, { tagName: 'INPUT', type: 'text', value });
const removeFromList = (page, list, reference) => { click(page.sandbox, { 'data-action': 'view-list-remove', 'data-list': list, 'data-ref': reference }); return page.drawn().catch(() => null); };

// ============================================================ 1. Each attribute edit redraws, marks modified, writes nothing until the save

test('the panel offers a control for each attribute of an Elements view, holding the values of the view', async () => {
  const page = await startMem();
  await openView(page, viewOf(page, 'api_view'));
  const right = page.right();
  assert.match(right, /<select id="view-edit-viewpoint" data-view-field="viewpoint">[^]*<option value="overview" selected>Overview<\/option>/);
  assert.match(right, /<option value="application" selected>Application<\/option>/);
  assert.match(right, /<input type="text" id="view-edit-element" data-view-field="element" list="archicode-application-references" value="shop\.web\.api"/);
  assert.match(right, /<select id="view-edit-facet" data-view-field="facet"><option value="" selected>None<\/option>/);
  assert.match(right, /id="view-edit-hide-unlinked" data-view-field="hide-unlinked"(?! checked)/);
  assert.doesNotMatch(right, /id="view-edit-show-labels"[^>]* checked/, 'labels: false in the file');
  assert.match(right, /id="view-edit-show-qualifiers"[^>]* checked/, 'a text the file does not say is drawn as the default says');
  assert.match(right, /<div class="muted view-element-name">/, 'the name of the element is read back');
});

test('changing the viewpoint, the element, the facet, Hide unlinked and a text redraws the diagram and marks the view modified; nothing is written before the save', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  assert.deepEqual(ids(page), expectedBoxes(page, 'overview', 'shop.web.api'));
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  assert.doesNotMatch(page.html(), /modified-badge/);
  const writes = written(page);

  await pickViewpoint(page, 'deep');
  assert.equal(view.viewpoint, 'deep');
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'shop.web.api'));
  assert.deepEqual(dirtyFiles(page), ['manifests/view.api_view.yaml']);
  assert.match(page.center(), /class="modified-badge"[^>]*>modified</, 'in the header of the page');
  assert.match(page.sandbox.renderLibraryPerspectiveHtml().left, /class="modified-badge"[^>]*>modified</, 'and in the list');

  await typeElement(page, 'shop');
  assert.equal(view.properties.element, 'shop');
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'shop'));

  await pickFacet(page, 'rest-only');
  assert.equal(view.properties.facet, 'rest-only');
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'shop', { facet: 'rest-only' }));
  assert.match(page.scene().status, /rest-only/);

  await tick(page, 'hide-unlinked', true);
  assert.equal(view.properties['hide-unlinked'], true);
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'shop', { facet: 'rest-only', hideUnlinked: true }));

  const captions = () => (page.scene().html.match(/<text class="dg-label"/g) || []).length;
  await tick(page, 'show-labels', true);
  assert.equal(view.properties.labels, undefined, 'labels drawn is the default of this diagram: not a choice, not kept');
  const withLabels = captions();
  await tick(page, 'show-labels', false);
  assert.equal(view.properties.labels, false);
  assert.ok(captions() <= withLabels, 'turning labels off does not add captions');

  assert.deepEqual(written(page), writes, 'nothing was written');
  assert.equal(page.mem.files.get('manifests/view.api_view.yaml').text, VIEW_FILE, 'the file on the disk is what it was');
  assert.deepEqual(dirtyFiles(page), ['manifests/view.api_view.yaml'], 'only this manifest is marked');
  assert.equal(page.state.workspace.settingsDirty, false, 'and not workspace.yaml');
});

test('Save all changes writes the manifest of the view and no other file; the new values read back, with the comments of the file', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  const workspaceBefore = page.mem.files.get('workspace.yaml').text;
  await pickViewpoint(page, 'deep');
  await pickFacet(page, 'rest-only');
  await tick(page, 'hide-unlinked', true);
  await tick(page, 'show-wrap', true);
  const writes = written(page).length;
  await page.sandbox.saveAllChanges();
  assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  assert.deepEqual(written(page).slice(writes), ['manifests/view.api_view.yaml'], 'only the view manifest');
  assert.equal(page.mem.files.get('workspace.yaml').text, workspaceBefore);
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  const text = page.mem.files.get('manifests/view.api_view.yaml').text;
  assert.ok(text.startsWith('# the architecture review reads this one\n'), 'the comment above the file stays');
  assert.ok(text.includes('    # the element it is about\n    element: shop.web.api\n'), 'the comment of the properties and the untouched lines stay');
  assert.match(text, /viewpoint: deep\n/);
  assert.match(text, /facet: rest-only\n/);
  assert.match(text, /hide-unlinked: true\n/);
  assert.match(text, /wrap: true\n/);
  assert.match(text, /labels: false\n/);

  const again = createApp();
  await again.loadWorkspace(page.mem.handle);
  const reloaded = again.findSavedView('api_view');
  assert.equal(reloaded.viewpoint, 'deep');
  assert.deepEqual(plain(reloaded.properties), { element: 'shop.web.api', labels: false, facet: 'rest-only', 'hide-unlinked': true, wrap: true });
});

test('an edit puts nothing but the view in memory: the Map and Elements keep their state, and another view keeps its own', async () => {
  const page = await startMem();
  const other = addView(page, { id: 'other', name: 'Other', viewpoint: 'deep', properties: { element: 'shop' } });
  run(page.sandbox, "mapPinned = ['shop.web']; mapHidden = ['customer']; mapOpened = new Set(['shop']); diagramFacet = 'no-smtp'; diagramHideUnlinked = true; elementTab = 'deep';");
  page.state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  const globals = () => run(page.sandbox, 'JSON.stringify({ sel: AppState.selection, mapPinned, mapHidden, opened: Array.from(mapOpened), diagramFacet, diagramHideUnlinked, diagramShow, elementTab, hash: location.hash })');
  const before = globals();
  const otherBefore = JSON.stringify(plain(other));
  await openView(page, viewOf(page, 'api_view'));
  const hash = page.sandbox.location.hash;
  await pickViewpoint(page, 'deep');
  await pickFacet(page, 'rest-only');
  await tick(page, 'hide-unlinked', true);
  await tick(page, 'show-wrap', true);
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'descriptions' });
  assert.equal(page.sandbox.location.hash, hash, 'the address is the same');
  await page.go('map');
  assert.equal(globals(), before.replace(/"hash":"[^"]*"/, '"hash":' + JSON.stringify(page.sandbox.location.hash)), 'the Map and Elements keep what they had');
  assert.equal(JSON.stringify(plain(other)), otherBefore);
});

test('a text equal to the default is not kept, Hide unlinked off is not kept, a facet "None" is not kept', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  await pickFacet(page, 'rest-only');
  await tick(page, 'hide-unlinked', true);
  assert.deepEqual(plain(view.properties), { element: 'shop.web.api', labels: false, facet: 'rest-only', 'hide-unlinked': true });
  await pickFacet(page, '');
  await tick(page, 'hide-unlinked', false);
  assert.deepEqual(plain(view.properties), { element: 'shop.web.api', labels: false });
  await tick(page, 'show-labels', true); // the default of an Elements diagram
  assert.deepEqual(plain(view.properties), { element: 'shop.web.api' });
  await pickFacet(page, ''); // nothing to change: not marked again, nothing redrawn
  await page.sandbox.saveAllChanges();
  assert.match(page.mem.files.get('manifests/view.api_view.yaml').text, /properties:\n    # the element it is about\n    element: shop\.web\.api\n$/);
});

// ============================================================ 2. The pins of a Map view are edited in the panel

test('a Map view lists its pinned, hidden and opened elements; adding and removing redraws the map and writes the manifest after the save', async () => {
  const page = await startMem();
  const view = viewOf(page, 'map_view');
  await openView(page, view);
  const right = page.right();
  assert.match(right, /<option value="map" selected>Map<\/option>/);
  assert.match(right, /data-action="view-list-remove" data-list="pinned" data-ref="shop\.web"/);
  assert.match(right, /data-action="view-list-remove" data-list="pinned" data-ref="customer"/);
  assert.doesNotMatch(right, /id="view-edit-element"/, 'a map has pins, not an element');
  assert.doesNotMatch(right, /id="view-edit-layer"/);
  const mapIds = () => {
    const input = page.sandbox.buildKernelInput('map', '', { opened: [], pinned: plain(run(page.sandbox, 'libraryDiagramRecipe(findSavedView("map_view")).mapState.pinned')) }).input;
    input.hidden = plain(run(page.sandbox, 'libraryDiagramRecipe(findSavedView("map_view")).mapState.hidden'));
    return plain(page.kernel.compute(input).items.filter((item) => !item.ghost).map((item) => item.id).sort());
  };
  assert.deepEqual(ids(page), mapIds());

  await addToList(page, 'pinned', 'mailer');
  assert.deepEqual(plain(view.properties.pinned), ['shop.web', 'customer', 'mailer']);
  assert.ok(ids(page).includes('mailer'));
  assert.deepEqual(ids(page), mapIds());
  await addToList(page, 'hidden', 'customer');
  assert.ok(!ids(page).includes('customer'), 'a hidden element is out');
  await addToList(page, 'opened', 'shop');
  await removeFromList(page, 'pinned', 'customer');
  assert.deepEqual(plain(view.properties.pinned), ['shop.web', 'mailer']);
  await removeFromList(page, 'hidden', 'customer');
  assert.equal('hidden' in view.properties, false, 'a list that became empty is not kept');
  assert.deepEqual(written(page), []);

  await page.sandbox.saveAllChanges();
  assert.deepEqual(written(page), ['manifests/view.map_view.yaml']);
  const again = createApp();
  await again.loadWorkspace(page.mem.handle);
  assert.deepEqual(plain(again.findSavedView('map_view').properties), { pinned: ['shop.web', 'mailer'], labels: true, opened: ['shop'] });
});

test('a reference that is not an element is refused, says so, and stays in its field; the view is not marked', async () => {
  const page = await startMem();
  await openView(page, viewOf(page, 'map_view'));
  await addToList(page, 'pinned', 'nowhere');
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  assert.deepEqual(plain(viewOf(page, 'map_view').properties.pinned), ['shop.web', 'customer']);
  assert.match(page.html(), /role="alert">“nowhere” is not an element of the application layer\./);
  assert.match(page.html(), /id="view-edit-add-pinned"[^>]* value="nowhere"/, 'what was typed is kept, to be corrected');
  await addToList(page, 'pinned', 'customer');
  assert.match(page.html(), /“customer” is already there\./);

  await openView(page, viewOf(page, 'api_view'));
  const view = viewOf(page, 'api_view');
  await typeElement(page, 'prod.cluster'); // a technology element, in the application layer
  assert.equal(view.properties.element, 'shop.web.api');
  assert.match(page.html(), /“prod\.cluster” is not an element of the application layer\./);
  assert.match(page.html(), /id="view-edit-element"[^>]* value="prod\.cluster"/);
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  await tick(page, 'show-wrap', true);
  assert.doesNotMatch(page.html(), /role="alert"/, 'the next edit clears the notice');
});

test('a refusal does not follow the reader to another view', async () => {
  const page = await startMem();
  await openView(page, viewOf(page, 'api_view'));
  await typeElement(page, 'nowhere');
  assert.match(page.html(), /role="alert"/);
  await openView(page, viewOf(page, 'map_view'));
  assert.doesNotMatch(page.html(), /role="alert"/);
  await openView(page, viewOf(page, 'api_view'));
  assert.doesNotMatch(page.html(), /role="alert"/);
});

// ============================================================ 3. Viewpoint and layer

test('Elements to Map pins the element and keeps what the view showed; Map to Elements keeps the first pin that exists and drops the lists', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  assert.deepEqual(plain(view.properties), { element: 'shop.web.api', labels: false });
  await pickViewpoint(page, 'map');
  assert.equal(view.viewpoint, 'map');
  assert.deepEqual(plain(view.properties), { pinned: ['shop.web.api'], qualifiers: true }, 'labels off is a Map\'s default now, qualifiers on is not: the view still shows what it showed');
  const shows = plain(page.sandbox.libraryDiagramRecipe(view).shows);
  assert.equal(shows.labels, false);
  assert.equal(shows.qualifiers, true);
  assert.ok(Object.keys(page.scene().boxes).length > 0);

  await addToList(page, 'pinned', 'customer');
  await addToList(page, 'hidden', 'mailer');
  run(page.sandbox, 'findSavedView("api_view").properties.pinned = ["gone", "customer", "shop"]'); // a pin that no longer exists comes first
  await pickViewpoint(page, 'deep');
  assert.equal(view.viewpoint, 'deep');
  assert.equal(view.properties.element, 'customer', 'the first pin, in the order of the file, that still exists');
  for (const key of ['pinned', 'hidden', 'opened']) assert.equal(key in view.properties, false);
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'customer'));

  await pickViewpoint(page, 'sideways'); // not a viewpoint of the editor
  assert.equal(view.viewpoint, 'deep');
  await pickViewpoint(page, 'deep'); // the same: nothing
});

test('the layer: the element stays when the other layer has it, else the view needs an element and says so; choosing one draws again', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  await pickLayer(page, 'technology');
  assert.equal(view.layer, 'technology');
  assert.equal('element' in view.properties, false, 'shop.web.api is not a technology element');
  assert.equal(page.sandbox.viewProblem(view), 'This view has no element.');
  assert.equal(page.canvas(), null, 'no canvas');
  const center = page.center();
  assert.match(center, /This view has no element\./);
  assert.match(center, /id="view-edit-element" data-view-field="element" list="archicode-technology-references" value=""/, 'the form is in the centre, where the message is');
  assert.doesNotMatch(center, /undefined/);
  assert.equal(page.sandbox.viewLabel(view), 'The API', 'the name is the view\'s');
  assert.doesNotMatch(page.sandbox.describeViewDefinition(view), /undefined/);
  assert.match(page.sandbox.describeViewDefinition(view), /\(no element\)/);
  assert.equal(page.sandbox.renderLibraryPerspectiveHtml().right, null);

  await typeElement(page, 'prod.cluster');
  assert.equal(view.properties.element, 'prod.cluster');
  assert.equal(page.sandbox.viewProblem(view), null);
  assert.ok(page.canvas(), 'drawn again');
  assert.deepEqual(ids(page), expectedBoxes(page, 'overview', 'prod.cluster', { layer: 'technology' }));

  await pickLayer(page, 'application');
  assert.equal('element' in view.properties, false);
  await page.sandbox.saveAllChanges(); // a view that cannot be drawn is written as it is: Save is not blocked, Cancel gives it up
  assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
});

test('a Map view left with only pins that do not exist cannot be drawn and says so; an empty list is the whole map', async () => {
  const page = await startMem();
  const view = viewOf(page, 'map_view');
  await openView(page, view);
  run(page.sandbox, 'findSavedView("map_view").properties.pinned = ["customer", "gone"]');
  page.sandbox.render();
  await page.drawn();
  await removeFromList(page, 'pinned', 'customer');
  assert.match(page.sandbox.viewProblem(view), /None of the elements it was pinned on exists any more/);
  assert.equal(page.canvas(), null);
  assert.match(page.center(), /None of the elements it was pinned on exists any more/);
  assert.match(page.center(), /data-action="view-list-remove" data-list="pinned" data-ref="gone"/, 'and the form lets the reader take the missing pin out');
  assert.match(page.center(), /pill pill-missing/);
  await removeFromList(page, 'pinned', 'gone');
  assert.equal(page.sandbox.viewProblem(view), null);
  assert.equal('pinned' in view.properties, false);
  assert.ok(page.canvas() && Object.keys(page.scene().boxes).length > 0, 'the whole map');
});

test('a facet that removes the element is said by the diagram, and an unknown facet is listed as not defined', async () => {
  const page = await startMem({ 'manifests/view.old_facet.yaml': MAP_FILE.replace('map_view', 'old_facet').replace('labels: true', 'facet: gone') });
  await openView(page, viewOf(page, 'old_facet'));
  assert.match(page.right(), /<option value="gone" selected>gone \(not defined\)<\/option>/);
  await pickFacet(page, '');
  assert.equal('facet' in viewOf(page, 'old_facet').properties, false);
});

// ============================================================ 4. The toolbar of the page edits the view

test('Hide unlinked and the text buttons of the toolbar are the same edits as the panel\'s: the view changes, both surfaces agree', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  click(page.sandbox, { 'data-action': 'toggle-hide-unlinked' });
  await page.drawn();
  assert.equal(view.properties['hide-unlinked'], true);
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="true"/);
  assert.match(page.right(), /id="view-edit-hide-unlinked" data-view-field="hide-unlinked" checked/);
  assert.deepEqual(dirtyFiles(page), ['manifests/view.api_view.yaml']);
  click(page.sandbox, { 'data-action': 'toggle-show', 'data-show': 'wrap' });
  await page.drawn();
  assert.equal(view.properties.wrap, true);
  assert.match(page.html(), /data-show="wrap" aria-pressed="true"/);
  assert.match(page.right(), /id="view-edit-show-wrap"[^>]* checked/);
  await tick(page, 'hide-unlinked', false);
  assert.match(page.html(), /data-action="toggle-hide-unlinked" aria-pressed="false"/);
  assert.equal('hide-unlinked' in view.properties, false);
});

test('the camera is not an edit: zoom, fit and centre mark nothing', async () => {
  const page = await startMem();
  await openView(page, viewOf(page, 'api_view'));
  for (const attributes of [{ 'data-action': 'diagram-zoom', 'data-dir': 'in' }, { 'data-action': 'diagram-zoom', 'data-dir': 'fit' }, { 'data-action': 'diagram-recenter' }]) click(page.sandbox, attributes);
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
});

// ============================================================ 5. Cancel

test('Cancel gives the edit up: the manifest in memory and the diagram are the saved ones again', async () => {
  const page = await startMem();
  await openView(page, viewOf(page, 'api_view'));
  const saved = ids(page);
  await pickViewpoint(page, 'deep');
  await typeElement(page, 'shop');
  await tick(page, 'hide-unlinked', true);
  assert.notDeepEqual(ids(page), saved);
  assert.equal(page.sandbox.countUnsavedChanges(), 1);
  page.sandbox.confirm = () => true;
  await page.sandbox.cancelChanges();
  await page.drawn().catch(() => null);
  const view = viewOf(page, 'api_view');
  assert.equal(view.viewpoint, 'overview');
  assert.deepEqual(plain(view.properties), { element: 'shop.web.api', labels: false });
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  assert.doesNotMatch(page.html(), /class="modified-badge"/);
  assert.deepEqual(written(page), []);
  assert.deepEqual(ids(page), saved, 'the diagram is the saved one');
  assert.match(page.right(), /<option value="overview" selected>/);
});

// ============================================================ 6. Edits in a row, and what is selected on the page

test('edit, edit, edit: only the last redraw reaches the canvas, and it is the last state', async () => {
  const page = await startMem();
  await openView(page, viewOf(page, 'api_view'));
  const shown = [];
  page.sandbox.__log = (scene) => shown.push(scene.viewKey);
  run(page.sandbox, 'globalThis.__show = showDiagramScene; showDiagramScene = (scene) => { __log(scene); __show(scene); };');
  page.sandbox.handleAppChange({ target: control({ id: 'view-edit-viewpoint', 'data-view-field': 'viewpoint' }, { value: 'deep' }) });
  page.sandbox.handleAppChange({ target: control({ id: 'view-edit-element', 'data-view-field': 'element' }, { tagName: 'INPUT', type: 'text', value: 'shop' }) });
  page.sandbox.handleAppChange({ target: control({ id: 'view-edit-facet', 'data-view-field': 'facet' }, { value: 'rest-only' }) });
  await page.drawn();
  for (let i = 0; i < 40; i++) await new Promise((resolve) => setImmediate(resolve));
  assert.equal(shown.length, 1, 'the layouts of the first two were superseded: ' + shown.join(', '));
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'shop', { facet: 'rest-only' }));
});

test('a selected element stays selected through an edit; a selected link goes when the new drawing holds none; both come back to the same view', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  await pickViewpoint(page, 'deep');
  await typeElement(page, 'shop');
  const box = boxesOf(page).find((b) => b['data-ref'] === 'customer') || boxesOf(page)[0];
  click(page.sandbox, box);
  await page.drawn();
  const picked = plain(run(page.sandbox, 'libraryPick.selection'));
  assert.equal(picked.kind, 'element');
  await tick(page, 'hide-unlinked', true);
  assert.deepEqual(plain(run(page.sandbox, 'libraryPick.selection')), picked, 'an element exists whether or not the drawing has its box');
  assert.match(page.right(), /class="library-selection"/);

  const link = linksOf(page)[0];
  assert.ok(link, 'the drawing has a link');
  click(page.sandbox, link);
  await page.drawn();
  assert.equal(plain(run(page.sandbox, 'libraryPick.selection')).kind, 'link');
  await pickViewpoint(page, 'overview');
  await typeElement(page, 'customer');
  const remaining = linksOf(page).map((l) => l['data-from'] + '>' + l['data-to']);
  const sel = plain(run(page.sandbox, 'libraryPick.selection'));
  if (!remaining.includes(link['data-from'] + '>' + link['data-to'])) assert.ok(!sel || sel.kind !== 'link', 'the link no drawing holds is ended');

  // an undrawable view and back: the pick of the page is kept
  click(page.sandbox, boxesOf(page)[0]);
  const keep = plain(run(page.sandbox, 'libraryPick.selection'));
  await pickLayer(page, 'technology');
  assert.equal(page.canvas(), null);
  await typeElement(page, 'prod.cluster');
  assert.deepEqual(plain(run(page.sandbox, 'libraryPick.selection')), keep);
});

// ============================================================ 7. Renames, stories, other homes of a view

test('renaming an element still updates the views that point at it, and the page draws the renamed element', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  const map = viewOf(page, 'map_view');
  await openView(page, view);
  await pickViewpoint(page, 'deep'); // an edited view, not saved yet
  page.sandbox.commitElementEdit('shop', (node) => { node.id = 'store'; return { renamedTo: { from: 'shop', to: 'store' } }; });
  assert.equal(view.properties.element, 'store.web.api');
  assert.deepEqual(plain(map.properties.pinned), ['store.web', 'customer']);
  assert.match(page.mem.files.get('manifests/view.api_view.yaml').text, /element: shop\.web\.api/, 'the disk is the old one until the save');
  assert.match(page.state.manifestFiles.find((f) => f.relPath === 'manifests/view.api_view.yaml').rawText, /element: store\.web\.api/);
  page.sandbox.render();
  await page.drawn();
  assert.deepEqual(ids(page), expectedBoxes(page, 'deep', 'store.web.api'));
  assert.match(page.right(), /id="view-edit-element"[^>]* value="store\.web\.api"/);
});

test('the stories that show an edited view show the edited view', async () => {
  const page = await startMem();
  page.sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [{ view: 'api_view', text: 'the API' }] });
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  await pickViewpoint(page, 'deep');
  await typeElement(page, 'shop.web');
  await tick(page, 'hide-unlinked', true);
  const step = page.sandbox.findStory('tour').steps[0];
  assert.equal(page.sandbox.stepView(step), view, 'the step points at the entry');
  assert.equal(page.sandbox.stepProblem(step), null);
  page.sandbox.goToStoryStep('tour', 0);
  assert.equal(run(page.sandbox, 'currentPerspective'), 'elements');
  assert.equal(page.state.selection.key, 'shop.web');
  assert.equal(run(page.sandbox, 'elementTab'), 'deep');
  assert.equal(run(page.sandbox, 'diagramHideUnlinked'), true);
  // and the library says the story is shown by the view
  await openView(page, view);
  assert.match(page.right(), /data-action="library-go-story" data-story="tour"/);
});

test('a view that still lives in workspace.yaml is edited in place; saving it rewrites workspace.yaml, as it already did', async () => {
  const page = await startMem();
  run(page.sandbox, 'workspaceTopLevel().views = [{ id: "legacy", name: "Old", viewpoint: "overview", layer: "application", properties: { element: "shop" } }]');
  const legacy = viewOf(page, 'legacy');
  await openView(page, legacy);
  assert.match(page.right(), /<code>workspace\.yaml<\/code>/);
  await pickViewpoint(page, 'deep');
  assert.equal(legacy.viewpoint, 'deep');
  assert.equal(page.state.workspace.settingsDirty, true);
  assert.deepEqual(dirtyFiles(page), [], 'no manifest is marked');
  await page.sandbox.saveAllChanges();
  assert.deepEqual(written(page), ['workspace.yaml']);
  assert.match(page.mem.files.get('workspace.yaml').text, /viewpoint: deep/);
});

// ============================================================ 8. A text committed by leaving it

test('a text left for another control is applied and lights Save at once, and redrawn a moment later; Enter redraws at once', async () => {
  const page = await startMem();
  const view = viewOf(page, 'api_view');
  await openView(page, view);
  let renders = 0;
  const focusAsked = [];
  let lit = 0;
  run(page.sandbox, 'globalThis.__lit = syncSaveAllButtonsInPlace; syncSaveAllButtonsInPlace = () => { __count("lit"); };');
  page.sandbox.document.getElementById('app').querySelector = (selector) => { focusAsked.push(selector); return null; };
  run(page.sandbox, 'globalThis.__render = render; render = () => { __count(); __render(); };');
  page.sandbox.__count = (what) => { if (what === 'lit') lit++; else renders++; };
  page.sandbox.document.activeElement = { tagName: 'BUTTON' }; // the click that made the field lose the focus is on this button
  page.sandbox.handleAppChange({ target: control({ id: 'view-edit-element', 'data-view-field': 'element' }, { tagName: 'INPUT', type: 'text', value: 'shop.web' }) });
  assert.equal(view.properties.element, 'shop.web');
  assert.equal(page.sandbox.countUnsavedChanges(), 1);
  assert.equal(renders, 0, 'the controls are still there for the click that is being made');
  assert.equal(lit, 1, 'Save all changes is lit where it is, not replaced');
  await new Promise((resolve) => setTimeout(resolve, 400));
  assert.equal(renders, 1);
  assert.deepEqual(focusAsked, [], 'and the focus is not pulled back to the field that was left');
  page.sandbox.document.activeElement = undefined;
  page.sandbox.handleAppChange({ target: control({ id: 'view-edit-element', 'data-view-field': 'element' }, { tagName: 'INPUT', type: 'text', value: 'shop' }) });
  assert.equal(renders, 2, 'Enter: at once');
  assert.deepEqual(focusAsked, ['#view-edit-element'], 'and the field keeps the focus');
});

// ============================================================ 9. Source pins

test('the form is wired: a change listener on the page, a handler for each control, the page toolbar edits the view', () => {
  assert.match(HTML, /app\.addEventListener\('change', handleAppChange\);/);
  assert.ok(!HTML.includes('libraryLook'), 'the transient look is gone');
  const toolbar = HTML.slice(HTML.indexOf("case 'toggle-show'"), HTML.indexOf("case 'map-clear'"));
  assert.match(toolbar, /editSavedView\(\(entry\) => setViewShow\(entry, name, !recipe\.shows\[name\]\)\)/);
  const hide = HTML.slice(HTML.indexOf("case 'toggle-hide-unlinked'"), HTML.indexOf("case 'clear-facet'"));
  assert.match(hide, /editSavedView\(\(entry\) => setViewHideUnlinked\(entry, !recipe\.hideUnlinked\)\)/);
});

test('a technology element gives no pin when its view becomes a map; taking a pin out gives the focus to the field to add one', async () => {
  const page = await startMem({ 'manifests/view.tech.yaml': VIEW_FILE.replace('api_view', 'tech').replace('layer: application', 'layer: technology').replace('shop.web.api', 'prod.cluster').replace('overview', 'deep') });
  const view = viewOf(page, 'tech');
  await openView(page, view);
  await pickViewpoint(page, 'map');
  assert.equal(view.layer, 'application');
  assert.equal('pinned' in view.properties, false, 'the Map draws the application layer: the whole map');
  assert.equal('element' in view.properties, false);

  await openView(page, viewOf(page, 'map_view'));
  const asked = [];
  page.sandbox.document.getElementById('app').querySelector = (selector) => { asked.push(selector); return null; };
  await removeFromList(page, 'pinned', 'customer');
  assert.deepEqual(asked, ['#view-edit-add-pinned']);
});
