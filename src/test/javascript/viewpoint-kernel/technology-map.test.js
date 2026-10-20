'use strict';
// Wave 015, run 0099 (W-11, #92): the page Environments is a Map of the technology layer, as the page Applications is the Map of the application layer. One code, the layer as
// its parameter: the kernel input of the layer with the same folding, pins, hidden elements and open boxes that are technology references (kept apart from the other Map's),
// a saved view of `layer: technology` and `viewpoint: map` that loads and saves like an application one, the states of a comparison on the boxes and in the tree, the chips and
// the Changes panel. The page is the real `render()` over the real kernel and a fake layout engine, on the layered Brightcart (src/test/resources/brightcart/layered, invented:
// environments `prod`, `staging`, `sandbox` and `partners`, with nodes), and on a small folder written here for the views.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { run, plain, startPage, click } = require('./library-page');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');

/** The page Environments on a plateau of the layered Brightcart, drawn. */
async function environments(plateau) {
  const page = await startPage({ dir: LAYERED, plateau: plateau || 'baseline' });
  await page.go('environments');
  assert.equal(run(page.sandbox, 'currentPerspective'), 'environments');
  return page;
}

const boxes = (page) => Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]);
const boxLayers = (page) => Array.from(new Set(Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-layer="([^"]*)"/g), (m) => m[1])));
/** The `g` of a box in the drawing on screen. */
function nodeOf(page, id) {
  const html = page.scene().html;
  const at = html.indexOf('data-id="' + id + '"');
  assert.ok(at > 0, id + ' is drawn');
  const start = html.lastIndexOf('<g class="dg-node', at);
  const ends = ['<g class="dg-node', '<g class="dg-links"', '<g class="dg-link"', '<g class="dg-fold"', '<text class="dg-label"', '</svg>'].map((m) => html.indexOf(m, start + 10)).filter((i) => i > 0);
  return html.slice(start, Math.min(...ends));
}

// ---- draw ----

test('draw: the page Environments draws the technology layer, folded, with the boxes of that layer and no other', async () => {
  const page = await environments();
  assert.deepEqual(boxes(page).sort(), ['partners', 'prod', 'sandbox', 'staging'], 'the environments of the baseline, folded');
  assert.deepEqual(boxLayers(page), ['technology'], 'every box says the layer it was drawn for');
  assert.match(page.html(), /<h2>Environments<\/h2>/);
  assert.match(page.html(), /data-map="true"/);
  assert.match(page.html(), /aria-label="Map of the technology layer\./, 'a screen reader is told which Map it is on');
  assert.match(page.scene().viewKey, /^map\|.*\|technology$/, 'a drawing of the Map, of its layer: another Map is another drawing');
  assert.match(page.scene().status, /^Map of the technology layer — 4 items, 2 links/, 'prod uses the partners and staging the sandbox: since #107 the dependencies of the deployed applications are links');
  // the kernel input is the one of the layer, plus the application layer the deployed applications are told by (issue #107); the elements of the map are the layer's own
  const { input } = run(page.sandbox, 'buildKernelInput("map", "", { layer: "technology", opened: [], pinned: [] })');
  assert.equal(input.layer, 'technology');
  assert.equal(input.app_elements.length, run(page.sandbox, 'AppState.index.application.size'));
  assert.equal(input.elements.length, run(page.sandbox, 'AppState.index.technology.size'));
  assert.equal('applications' in input || 'relationships' in input, false, 'both are drawn: the kernel is told nothing');
  // the page Applications is the application layer, as it was
  await page.go('map');
  assert.ok(boxes(page).includes('shop') && !boxes(page).includes('prod'));
  assert.deepEqual(boxLayers(page), ['application']);
  assert.match(page.html(), /<h2>Applications<\/h2>/);
});

test('draw: opening a box draws what is inside it, and Unfold all opens one more level of the technology layer', async () => {
  const page = await environments();
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod', 'data-mode': 'expand' });
  await page.drawn();
  assert.ok(boxes(page).includes('prod.dc'), boxes(page).join(', '));
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(technologyMapState.opened)')), ['prod'], 'the open box is the technology Map\'s own');
  assert.equal(run(page.sandbox, 'mapOpened'), null, 'the application Map is untouched');
  click(page.sandbox, { 'data-action': 'unfold-all' });
  await page.drawn();
  assert.ok(boxes(page).includes('prod.dc.web-vm'), 'one more level, opened by the Environments toolbar');
  click(page.sandbox, { 'data-action': 'fold-all' });
  await page.drawn();
  assert.deepEqual(boxes(page).sort(), ['partners', 'prod', 'sandbox', 'staging']);
});

test('draw: the tree is the technology layer, folds and unfolds, and its tools act on that layer', async () => {
  const page = await environments();
  const left = page.sandbox.renderMapScopeHtml();
  assert.match(left, /role="tree" aria-label="Technology elements of the map"/);
  assert.match(left, /data-node="technology:prod"/);
  assert.doesNotMatch(left, /data-node="application:/);
  assert.match(left, /data-action="nav-unfold-all" data-layer="technology"/);
  assert.match(left, /data-action="toggle-element" data-ref="prod" data-layer="technology"/);
});

// ---- pin and hide ----

test('hide: an environment hidden on the Map is out, with what is inside it; showing it again brings it back; the chips say so', async () => {
  const page = await environments();
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'partners' });
  await page.drawn();
  assert.deepEqual(boxes(page).sort(), ['prod', 'sandbox', 'staging']);
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.hidden')), ['partners']);
  assert.deepEqual(plain(run(page.sandbox, 'mapHidden')), [], 'the application Map hides nothing');
  const chips = page.sandbox.renderMapChipsHtml();
  assert.match(chips, /Hidden: Partners/);
  assert.match(chips, /data-action="map-unhide" data-ref="partners"/);
  assert.match(page.sandbox.renderMapScopeHtml(), /map-scope-row left-out[^>]*data-node="technology:partners"/);
  click(page.sandbox, { 'data-action': 'map-unhide', 'data-ref': 'partners' });
  await page.drawn();
  assert.deepEqual(boxes(page).sort(), ['partners', 'prod', 'sandbox', 'staging']);
});

test('pin: a pinned node keeps its enclosing environments open and the address carries the pin; unpinning and Clear all empty the Map\'s own lists', async () => {
  const page = await environments();
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'prod.dc.web-vm' });
  await page.drawn();
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.pinned')), ['prod.dc.web-vm']);
  assert.deepEqual(plain(run(page.sandbox, 'mapPinned')), [], 'a pin of the technology layer is not a pin of the application layer');
  const drawn = boxes(page);
  assert.ok(drawn.includes('prod.dc.web-vm') && drawn.includes('prod.dc') && drawn.includes('prod'), 'the node and what encloses it: ' + drawn.join(', '));
  assert.ok(!drawn.includes('staging') && !drawn.includes('partners'), 'only what touches the pin');
  assert.equal(page.sandbox.currentRouteHash(), '/timeline/environments?pin=prod.dc.web-vm');
  assert.match(page.sandbox.renderMapChipsHtml(), /Pinned: Web VM/);
  assert.ok(run(page.sandbox, 'AppState.expanded.has("technology:prod")'), 'the tree opened the branches above the pin, in the technology tree');
  click(page.sandbox, { 'data-action': 'map-unpin', 'data-ref': 'prod.dc.web-vm' });
  await page.drawn();
  assert.deepEqual(boxes(page).sort(), ['partners', 'prod', 'sandbox', 'staging']);
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'prod' });
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'partners' });
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'sandbox' });
  click(page.sandbox, { 'data-action': 'map-clear' });
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.pinned.concat(technologyMapState.hidden)')), []);
});

test('pin: the pins of the two Maps are kept apart, and each page draws its own', async () => {
  const page = await environments();
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'staging' });
  await page.drawn();
  await page.go('map');
  assert.deepEqual(plain(run(page.sandbox, 'mapPinned')), [], 'nothing is pinned on Applications');
  assert.ok(boxes(page).includes('shop'), 'the whole application layer');
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'shop' });
  await page.drawn();
  await page.go('environments');
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.pinned')), ['staging'], 'and back on Environments the pin is still there');
  assert.deepEqual(boxes(page).sort(), ['sandbox', 'staging'], 'what touches staging: the sandbox it uses, folded');
});

test('pin: Show on map from an environment draws the Map of the technology layer, pinned on it', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  click(page.sandbox, { 'data-action': 'select-element', 'data-ref': 'prod', 'data-layer': 'technology' });
  run(page.sandbox, "elementTab = 'overview'; currentPerspective = 'elements';");
  assert.match(page.sandbox.renderShowOnMapButtonHtml(page.sandbox.findElementRecord('prod', 'technology')), /data-action="show-on-map" data-ref="prod" data-layer="technology"/);
  click(page.sandbox, { 'data-action': 'show-on-map', 'data-ref': 'prod', 'data-layer': 'technology' });
  await page.drawn();
  assert.equal(run(page.sandbox, 'currentPerspective'), 'environments');
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.pinned')), ['prod']);
  assert.deepEqual(plain(run(page.sandbox, 'mapPinned')), []);
});

test('select: a click on a box selects the element of the technology layer, and Open in Elements leads to its page', async () => {
  const page = await environments();
  click(page.sandbox, { 'data-action': 'goto-element', 'data-ref': 'prod', 'data-layer': 'technology' });
  await page.drawn();
  assert.deepEqual(plain(run(page.sandbox, '[AppState.selection.key, AppState.selection.layer]')), ['prod', 'technology']);
  const centre = page.sandbox.renderActivePerspectiveHtml();
  assert.match(centre.center, /data-action="open-as-diagram" data-ref="prod" data-layer="technology"/);
  assert.match(centre.right, /data-inspection-layer="technology"/);
  assert.doesNotMatch(centre.right, /The map draws applications only|This map draws the technology layer only/, 'the element is of the layer the Map draws');
  click(page.sandbox, { 'data-action': 'open-as-diagram', 'data-ref': 'prod', 'data-layer': 'technology' });
  assert.equal(run(page.sandbox, 'currentPerspective'), 'elements');
  assert.deepEqual(plain(run(page.sandbox, '[AppState.selection.key, AppState.selection.layer]')), ['prod', 'technology']);
});

// ---- save ----

test('save: the Map on screen is a view of layer technology and viewpoint map, kept and loaded like an application one', async () => {
  const page = await startPage({ mem: false, dir: LAYERED, plateau: 'baseline' });
  await page.go('environments');
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'partners' });
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'prod' });
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod', 'data-mode': 'expand' });
  await page.drawn();
  const definition = plain(run(page.sandbox, 'currentViewDefinition()'));
  assert.equal(definition.viewpoint, 'map');
  assert.equal(definition.layer, 'technology');
  assert.deepEqual(definition.properties, { pinned: ['prod'], hidden: ['partners'], opened: ['prod'] });
  const view = page.sandbox.viewForDefinition(definition, 'The production map');
  assert.deepEqual(plain({ viewpoint: view.viewpoint, layer: view.layer, properties: view.properties }), { viewpoint: 'map', layer: 'technology', properties: { pinned: ['prod'], hidden: ['partners'], opened: ['prod'] } });
  assert.match(plain(run(page.sandbox, 'describeViewDefinition(' + JSON.stringify(definition) + ')')), /^Map of Production$/);
  assert.equal(run(page.sandbox, 'viewMatchesScreen(' + JSON.stringify(view) + ')'), true);
  // the same definition on the other Map is another view
  await page.go('map');
  assert.equal(run(page.sandbox, 'currentViewDefinition().layer'), 'application');
  assert.equal(run(page.sandbox, 'viewMatchesScreen(' + JSON.stringify(view) + ')'), false);
  // loaded: the page Environments with the lists of the view in the technology Map, the application Map untouched
  run(page.sandbox, 'technologyMapState = { opened: null, pinned: [], hidden: [] }; mapPinned = ["shop"];');
  assert.equal(page.sandbox.applySavedView(view), null);
  assert.equal(run(page.sandbox, 'currentPerspective'), 'environments');
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.pinned')), ['prod']);
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(technologyMapState.opened)')), ['prod']);
  assert.deepEqual(plain(run(page.sandbox, 'mapPinned')), ['shop'], 'the application Map keeps its own pin');
  assert.equal(run(page.sandbox, 'viewMatchesScreen(' + JSON.stringify(view) + ')'), true);
});

test('save: a saved view of the technology Map is drawn by the page of a view with the boxes of the page Environments, and its problems are told', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  const view = page.sandbox.createManifestEntry('view', { id: 'tm', name: 'TM', viewpoint: 'map', layer: 'technology', properties: { pinned: ['prod'], hidden: ['prod.dc'], opened: ['prod'] } });
  assert.equal(run(page.sandbox, 'viewProblem(findSavedView("tm"))'), null);
  const recipe = plain(run(page.sandbox, 'libraryDiagramRecipe(findSavedView("tm"))'));
  assert.equal(recipe.layer, 'technology');
  assert.deepEqual(recipe.mapState, { opened: ['prod'], pinned: ['prod'], hidden: ['prod.dc'] });
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = 'tm';");
  page.sandbox.setPerspective('library');
  await page.drawn();
  assert.deepEqual(boxes(page), ['prod'], 'pinned on prod, whose only child is hidden');
  assert.deepEqual(boxLayers(page), ['technology']);
  assert.match(page.scene().status, /^Map of the technology layer/);
  // a pin that is an application element is not a pin of this Map
  const wrong = { viewpoint: 'map', layer: 'technology', properties: { pinned: ['shop'] } };
  assert.match(run(page.sandbox, 'viewProblem(' + JSON.stringify(wrong) + ')'), /None of the elements it was pinned on exists any more/);
  assert.equal(run(page.sandbox, 'viewProblem(' + JSON.stringify(Object.assign({}, wrong, { layer: 'application' })) + ')'), null);
  assert.ok(view);
});

test('save: renaming and deleting an environment reach the technology Map\'s lists and the saved views that name it', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  const view = page.sandbox.createManifestEntry('view', { id: 'tm', viewpoint: 'map', layer: 'technology', properties: { pinned: ['prod.dc'], hidden: ['partners'], opened: ['prod'] } });
  run(page.sandbox, "technologyMapState = { opened: new Set(['prod']), pinned: ['prod.dc'], hidden: ['partners'] }; mapPinned = ['prod.dc'];");
  page.sandbox.rewriteUiReferences('prod', 'production', 'technology');
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.pinned')), ['production.dc']);
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(technologyMapState.opened)')), ['production']);
  assert.deepEqual(plain(run(page.sandbox, 'mapPinned')), ['prod.dc'], 'an application element of the same name is not renamed');
  assert.equal(page.sandbox.rewriteSavedViewReferences('prod', 'production', 'technology'), true);
  assert.deepEqual(plain(view.properties), { pinned: ['production.dc'], hidden: ['partners'], opened: ['production'] });
  assert.equal(page.sandbox.rewriteSavedViewReferences('prod', 'production', 'application'), false, 'the layer of the rename is the layer of the view');
  page.sandbox.forgetUiReferences(new Set(['partners']), 'technology');
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.hidden')), []);
});

// ---- compare ----

test('compare: the boxes of the technology Map say what changed, the tree too, and a removed box can be opened', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'inhouse' });
  await page.sandbox.compareWithPlateau('baseline');
  await page.go('environments');
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod', 'data-mode': 'expand' });
  await page.drawn();
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod.dc', 'data-mode': 'expand' });
  await page.drawn();
  const ids = boxes(page);
  assert.ok(ids.includes('prod.cloud') && ids.includes('prod.dc.cache-vm'), 'the new environment part and the removed node: ' + ids.join(', '));
  const { input } = run(page.sandbox, 'buildKernelInput("map", "", { layer: "technology", opened: ["prod", "prod.dc"], pinned: [] })');
  const items = Object.fromEntries(plain(page.kernel.compute(input).items).map((item) => [item.id, item]));
  assert.equal(items['prod.cloud'].change, 'new');
  assert.equal(items['prod.dc.cache-vm'].change, 'removed');
  assert.deepEqual([items.prod.change, items.prod.contains_changes], ['none', true], 'it did not change itself and holds changes');
  assert.deepEqual([items.partners.change, !!items.partners.contains_changes], ['none', false], 'partners is the same in both plateaus');
  assert.match(nodeOf(page, 'prod.cloud'), />new</, 'the box says new');
  assert.match(nodeOf(page, 'prod.dc.cache-vm'), />removed</, 'and the removed one is told, struck');
  // the removed node is not an element of the plateau drawn: it is a way to read what it was
  assert.match(nodeOf(page, 'prod.dc.cache-vm'), /data-action="select-removed" data-ref="prod\.dc\.cache-vm" data-layer="technology"/);
  // the tree
  const tree = page.sandbox.renderMapScopeHtml();
  assert.match(tree, /data-node="technology:prod"[^>]*data-change="contains-changes"/);
  // the Changes panel lists both layers; a row of the technology layer is drawn by this Map
  const panel = page.sandbox.renderActivePerspectiveHtml().right;
  assert.match(panel, /data-action="select-change" data-thing="element" data-change="new" data-layer="technology" data-ref="prod\.cloud"/);
  click(page.sandbox, { 'data-action': 'select-change', 'data-thing': 'element', 'data-change': 'new', 'data-layer': 'technology', 'data-ref': 'prod.cloud' });
  await page.drawn();
  assert.equal(run(page.sandbox, 'currentPerspective'), 'environments', 'a row of the layer this Map draws stays on it');
  assert.deepEqual(plain(run(page.sandbox, '[AppState.selection.key, AppState.selection.layer]')), ['prod.cloud', 'technology']);
  assert.ok(boxes(page).includes('prod.cloud'));
  // a removed box is picked: the panel reads the baseline's element
  click(page.sandbox, { 'data-action': 'select-removed', 'data-ref': 'prod.dc.cache-vm', 'data-layer': 'technology' });
  assert.match(page.sandbox.renderActivePerspectiveHtml().right, /inspection-removed" data-inspection-ref="prod\.dc\.cache-vm" data-inspection-layer="technology"/);
  // only what changed, with the boxes around it
  click(page.sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  await page.drawn();
  assert.ok(!boxes(page).includes('partners'), 'Changes only: the environment that did not change is out');
  assert.ok(boxes(page).includes('prod.cloud'));
});

test('compare: a row of the Changes panel about the other layer leaves the Map for the Map of that layer, and the pins stay where they were', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'inhouse' });
  await page.sandbox.compareWithPlateau('baseline');
  await page.go('environments');
  click(page.sandbox, { 'data-action': 'select-change', 'data-thing': 'element', 'data-change': 'new', 'data-layer': 'application', 'data-ref': 'shop.app.cart' });
  assert.equal(run(page.sandbox, 'currentPerspective'), 'map', 'the application layer is drawn by the page Applications');
  assert.equal(run(page.sandbox, 'AppState.selection.key'), 'shop.app.cart');
});

test('compare: a comparison does not draw the other layer in the technology Map', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'saas' });
  await page.sandbox.compareWithPlateau('baseline');
  await page.go('environments');
  const ids = boxes(page);
  assert.deepEqual(ids.sort(), ['partners', 'prod', 'sandbox', 'staging']);
  assert.deepEqual(boxLayers(page), ['technology']);
});

// ---- through a facet ----

test('facet: the Map of the technology layer is drawn through a facet that removes application elements, and through one that removes an environment', async () => {
  const page = await environments();
  const facetNamed = (name) => run(page.sandbox, 'AppState.workspace.settings.facets.customs.find((facet) => facet.name === ' + JSON.stringify(name) + ')');
  // `journey` removes application elements: the technology layer is what it was
  page.sandbox.handleAppInput({ target: { id: 'diagram-facet-select', value: 'journey', matches: () => false } });
  await page.drawn();
  assert.doesNotMatch(page.scene().html, /dangling reference/);
  assert.deepEqual(boxes(page).sort(), ['partners', 'prod', 'sandbox', 'staging']);
  assert.match(page.scene().status, /^Map of the technology layer through facet “journey” — 4 items/);
  // a facet of the technology layer: a pin and a hidden element it removes are left out of the lists the kernel is given, and the lists of the page are kept
  const removing = { name: 'no-sandbox', actions: [{ operator: 'REMOVE', jsonPath: "$.technology.elements[?(@.id == 'sandbox')]" }], hideUnlinked: false };
  run(page.sandbox, 'AppState.workspace.settings.facets.customs.push(' + JSON.stringify(removing) + ')');
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'sandbox' });
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'prod' });
  await page.drawn();
  page.sandbox.handleAppInput({ target: { id: 'diagram-facet-select', value: 'no-sandbox', matches: () => false } });
  const canvas = await page.drawn();
  assert.doesNotMatch(canvas.innerHTML, /dangling reference/);
  assert.deepEqual(boxes(page).sort(), ['partners', 'prod'], 'pinned on prod: the partners it uses are linked to it');
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapState.hidden')), ['sandbox'], 'without the facet the choice of the user is back');
  assert.ok(facetNamed('no-sandbox'));
});
