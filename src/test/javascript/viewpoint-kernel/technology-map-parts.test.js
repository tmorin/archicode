'use strict';
// Wave 016, run 0114 (W-8, #107): the Map of the technology layer draws the applications deployed on its nodes and the relationships (the ones the technology elements declare and the
// dependencies between environments that the deployed applications give), and each of the two can be left out or brought back from the tools of the diagram. The page is the real
// `render()` over the real kernel and a fake layout engine, on the layered Brightcart (src/test/resources/brightcart/layered, invented: `prod` hosts its applications on the nodes of
// `dc` and uses `partners`). The boxes and links of the saved maps are also pinned, for both tools, by technology-map-shared.test.js.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { run, plain, startPage, click, addView, openView } = require('./library-page');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');

const boxes = (page) =>
  Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]).sort();
const links = (page) =>
  Array.from(
    page.scene().html.matchAll(/<g class="dg-link" data-from="([^"]*)" data-to="([^"]*)"/g),
    (m) => m[1] + ' -> ' + m[2]
  ).sort();
const tool = (html, part) =>
  new RegExp(
    '<button type="button" data-action="toggle-map-part" data-part="' +
      part +
      '" aria-pressed="(true|false)" title="[^"]+">'
  ).exec(html);

/** The page Environments, `prod` opened down to the batch node and the partners to the nodes it reaches: the applications are inside the nodes. */
async function opened(options) {
  const page = await startPage({ dir: LAYERED, plateau: (options && options.plateau) || 'baseline' });
  await page.go('environments');
  run(
    page.sandbox,
    'technologyMapState.opened = new Set(["prod", "prod.dc", "prod.dc.batch-vm", "prod.dc.app-vm", "partners", "partners.carrier-live", "partners.erp-live"]); technologyMapState.hidden = ["staging", "sandbox"];'
  );
  await page.show();
  return page;
}

test('the tools: Applications and Relationships are on the page Environments and the page of a technology Map view, lit while drawn, and nowhere else', async () => {
  const page = await opened();
  assert.equal(tool(page.html(), 'applications')[1], 'true');
  assert.equal(tool(page.html(), 'relationships')[1], 'true');
  assert.match(
    page.html(),
    /data-action="toggle-map-part" data-part="applications"[^>]*title="Draw the applications deployed on the nodes/
  );
  // the Map of the application layer has neither
  await page.go('map');
  assert.equal(tool(page.html(), 'applications'), null);
  assert.equal(tool(page.html(), 'relationships'), null);
  // nor has the diagram of an element
  click(page.sandbox, { 'data-action': 'select-element', 'data-ref': 'prod', 'data-layer': 'technology' });
  run(page.sandbox, "elementTab = 'overview'; currentPerspective = 'elements';");
  await page.show();
  assert.equal(tool(page.html(), 'applications'), null);
  // the page of a saved view: the Map of the technology layer has them, the Map of the application layer has not
  const technology = addView(page, {
    id: 'tm',
    viewpoint: 'map',
    layer: 'technology',
    properties: { opened: ['prod'] }
  });
  const application = addView(page, {
    id: 'am',
    viewpoint: 'map',
    layer: 'application',
    properties: { opened: ['shop'] }
  });
  await openView(page, technology);
  assert.equal(tool(page.html(), 'applications')[1], 'true');
  await openView(page, application);
  assert.equal(tool(page.html(), 'applications'), null);
});

test('Applications: the boxes of the applications deployed on the nodes that are open go and come back, with the links that end on them', async () => {
  const page = await opened();
  const before = boxes(page);
  assert.ok(
    before.includes('batch-vm_fulfilment_sync') &&
      before.includes('app-vm_shop_app') &&
      before.includes('carrier-live_carrier'),
    before.join(', ')
  );
  assert.deepEqual(links(page), [
    'app-vm_shop_app -> partners.mail-live',
    'app-vm_shop_app -> partners.psp-live',
    'app-vm_shop_app -> partners.tax-live',
    'batch-vm_fulfilment_sync -> carrier-live_carrier',
    'batch-vm_fulfilment_sync -> erp-live_erp'
  ]);
  const version = run(page.sandbox, 'modelVersion');
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.equal(tool(page.html(), 'applications')[1], 'false', 'the tool says it is off');
  assert.equal(tool(page.html(), 'relationships')[1], 'true');
  const applicationBoxes = ['app-vm_shop_app', 'batch-vm_fulfilment_sync', 'carrier-live_carrier', 'erp-live_erp'];
  assert.deepEqual(
    boxes(page),
    before.filter((id) => !applicationBoxes.includes(id)),
    'the nodes stay, the four applications go'
  );
  assert.deepEqual(
    links(page),
    [
      'prod.dc.app-vm -> partners.mail-live',
      'prod.dc.app-vm -> partners.psp-live',
      'prod.dc.app-vm -> partners.tax-live',
      'prod.dc.batch-vm -> partners.carrier-live',
      'prod.dc.batch-vm -> partners.erp-live'
    ],
    'the dependencies stay, between the nodes that host the applications (shop.app through its components, #124)'
  );
  assert.equal(run(page.sandbox, 'modelVersion'), version, 'it is view state: no model changed');
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.equal(tool(page.html(), 'applications')[1], 'true');
  assert.ok(boxes(page).includes('batch-vm_fulfilment_sync'));
  assert.deepEqual(links(page), [
    'app-vm_shop_app -> partners.mail-live',
    'app-vm_shop_app -> partners.psp-live',
    'app-vm_shop_app -> partners.tax-live',
    'batch-vm_fulfilment_sync -> carrier-live_carrier',
    'batch-vm_fulfilment_sync -> erp-live_erp'
  ]);
});

test('Relationships: every link goes, the boxes stay, and the status line says so', async () => {
  const page = await opened();
  const before = boxes(page);
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'relationships' });
  await page.drawn();
  assert.equal(tool(page.html(), 'relationships')[1], 'false');
  assert.deepEqual(links(page), []);
  assert.deepEqual(boxes(page), before, 'the boxes are the same with the links or without');
  assert.match(page.scene().status, /, 0 links\./);
  // neither: the nodes alone
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.deepEqual(
    boxes(page),
    before.filter(
      (id) =>
        !id.includes('_vm_') &&
        !id.endsWith('_carrier') &&
        !id.endsWith('_erp') &&
        !id.endsWith('_shop_app') &&
        !id.endsWith('_fulfilment_sync')
    )
  );
  assert.deepEqual(links(page), []);
});

test('a folded node that hosts applications can be opened, and the opened box shows them', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  await page.go('environments');
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod', 'data-mode': 'expand' });
  await page.drawn();
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod.dc', 'data-mode': 'expand' });
  await page.drawn();
  assert.match(
    page.scene().html,
    /data-action="toggle-fold" data-mode="expand" data-id="prod.dc.web-vm"/,
    'the node offers to be opened: it hosts an application'
  );
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod.dc.web-vm', 'data-mode': 'expand' });
  await page.drawn();
  assert.ok(boxes(page).includes('web-vm_shop_web'));
  assert.match(
    page.scene().html,
    /data-action="toggle-fold" data-mode="close" data-id="prod.dc.web-vm"/,
    'and to be closed again'
  );
  // the node's own reference opens nothing more: the application box has nothing to open
  assert.doesNotMatch(page.scene().html, /data-mode="expand" data-id="web-vm_shop_web"/);
  // with Applications off the node has nothing to show: it is no longer offered
  click(page.sandbox, { 'data-action': 'toggle-fold', 'data-id': 'prod.dc.web-vm', 'data-mode': 'close' });
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.doesNotMatch(page.scene().html, /data-action="toggle-fold" data-mode="expand" data-id="prod.dc.web-vm"/);
});

test('a box of an application is an element of the application layer: a click selects it there, the panel does not say the Map leaves it out, and a toggle that removes it drops the selection', async () => {
  const page = await opened();
  assert.match(
    page.scene().html,
    /data-id="batch-vm_fulfilment_sync" data-action="goto-element" data-ref="fulfilment\.sync" data-layer="application"/
  );
  click(page.sandbox, { 'data-action': 'goto-element', 'data-ref': 'fulfilment.sync', 'data-layer': 'application' });
  await page.drawn();
  assert.deepEqual(plain(run(page.sandbox, '[AppState.selection.key, AppState.selection.layer]')), [
    'fulfilment.sync',
    'application'
  ]);
  const panel = page.sandbox.renderActivePerspectiveHtml().right;
  assert.match(panel, /data-inspection-layer="application"/);
  assert.doesNotMatch(panel, /This map draws the technology layer/, 'a deployed application is on this Map');
  assert.match(panel, /id="inspection-offmap" hidden/);
  assert.equal(page.sandbox.mapElementIsOnMap('fulfilment.sync', 'application'), true);
  // an application that is deployed nowhere is not on the Map
  assert.equal(page.sandbox.applicationIsDeployed('fulfilment.sync'), true);
  assert.equal(page.sandbox.applicationIsDeployed('customer'), false);
  // the toggle takes the box away: the selection goes with it
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.equal(run(page.sandbox, 'AppState.selection.kind'), 'none');
});

test('a link between two applications is drawn as a link of the Map, and selecting it shows the relationship of the application that declares it', async () => {
  const page = await opened();
  assert.match(
    page.scene().html,
    /<g class="dg-link" data-from="batch-vm_fulfilment_sync" data-to="carrier-live_carrier"[^>]*data-layer="technology" data-action="select-link"/
  );
  const selection = page.sandbox.linkSelectionFor(
    'batch-vm_fulfilment_sync',
    'carrier-live_carrier',
    'technology',
    null,
    null
  );
  assert.equal(selection.kind, 'link');
  const panel = page.sandbox.renderLinkInspectionHtml(selection);
  assert.match(panel, /fulfilment\.sync/, "the relationship is the application's: " + panel.slice(0, 400));
  assert.match(panel, /carrier/);
  // with the applications left out the same dependency is a link between the nodes that host them, and it says the same
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.ok(links(page).includes('prod.dc.batch-vm -> partners.carrier-live'));
  const between = page.sandbox.renderLinkInspectionHtml(
    page.sandbox.linkSelectionFor('prod.dc.batch-vm', 'partners.carrier-live', 'technology', null, null)
  );
  assert.match(
    between,
    /fulfilment\.sync/,
    'the application that declares it, though the link ends on its node: ' + between.slice(0, 400)
  );
});

test('the pins and the hidden elements apply to the applications: hiding a node takes its applications and their links, a pin keeps the applications inside it', async () => {
  const page = await opened();
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'prod.dc.batch-vm' });
  await page.drawn();
  assert.ok(!boxes(page).includes('batch-vm_fulfilment_sync') && !boxes(page).includes('prod.dc.batch-vm'));
  assert.deepEqual(
    links(page),
    [
      'app-vm_shop_app -> partners.mail-live',
      'app-vm_shop_app -> partners.psp-live',
      'app-vm_shop_app -> partners.tax-live'
    ],
    'the links of the hidden node go; the ones the components of shop.app give (#124) stay'
  );
  click(page.sandbox, { 'data-action': 'map-unhide', 'data-ref': 'prod.dc.batch-vm' });
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'prod.dc.batch-vm' });
  await page.drawn();
  assert.ok(
    boxes(page).includes('prod.dc.batch-vm') && boxes(page).includes('batch-vm_fulfilment_sync'),
    'the node is open (it is in the list of the open ones), so its application is drawn: ' + boxes(page).join(', ')
  );
  assert.deepEqual(
    links(page),
    ['batch-vm_fulfilment_sync -> partners.carrier-live', 'batch-vm_fulfilment_sync -> partners.erp-live'],
    'the links that touch what is pinned, to the nodes of the partners: the pin leaves their applications out'
  );
  assert.ok(!boxes(page).includes('app-vm_shop_app'), 'what the pin does not touch is out');
});

test('the choice is kept in the address, and an address with it opens the Map as it was', async () => {
  const page = await opened();
  assert.doesNotMatch(
    page.sandbox.currentRouteHash(),
    /applications=|relationships=/,
    'drawn is the default: the address says nothing'
  );
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  assert.match(page.sandbox.currentRouteHash(), /^\/timeline\/environments\?.*applications=0/);
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'relationships' });
  assert.match(page.sandbox.currentRouteHash(), /applications=0.*relationships=0/);
  const reopened = await startPage({ dir: LAYERED, plateau: 'baseline' });
  run(reopened.sandbox, 'location.hash = "#/timeline/environments?applications=0&relationships=0"');
  reopened.sandbox.syncPerspectiveFromHash();
  reopened.sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(run(reopened.sandbox, 'technologyMapParts')), { applications: false, relationships: false });
  run(reopened.sandbox, 'location.hash = "#/timeline/environments"');
  reopened.sandbox.syncPerspectiveFromHash();
  reopened.sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(run(reopened.sandbox, 'technologyMapParts')), { applications: true, relationships: true });
  // the application Map has no such parameter in its address
  await page.go('map');
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /applications=|relationships=/);
});

test('a saved view keeps the choice: `false` is written, drawn is the default, and loading a view without them draws both', async () => {
  const page = await opened();
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'relationships' });
  const definition = plain(run(page.sandbox, 'currentViewDefinition()'));
  assert.equal(definition.layer, 'technology');
  assert.equal(definition.properties.relationships, false);
  assert.ok(!('applications' in definition.properties), 'a part that is drawn is not written');
  assert.deepEqual(Object.keys(definition.properties).slice(-1), ['relationships']);
  const view = page.sandbox.viewForDefinition(definition, 'Without links');
  assert.equal(view.properties.relationships, false);
  assert.equal(run(page.sandbox, 'viewMatchesScreen(' + JSON.stringify(view) + ')'), true);
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'relationships' });
  assert.equal(
    run(page.sandbox, 'viewMatchesScreen(' + JSON.stringify(view) + ')'),
    false,
    'the links are back: the screen is another view'
  );
  assert.equal(page.sandbox.applySavedView(view), null);
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapParts')), { applications: true, relationships: false });
  await page.show();
  assert.deepEqual(links(page), []);
  // a view that says nothing draws both, also after one that left a part out
  const plain_ = page.sandbox.createManifestEntry('view', {
    id: 'both',
    viewpoint: 'map',
    layer: 'technology',
    properties: { opened: ['prod'] }
  });
  assert.equal(page.sandbox.applySavedView(plain_), null);
  assert.deepEqual(plain(run(page.sandbox, 'technologyMapParts')), { applications: true, relationships: true });
  // only the Map of the technology layer has the keys: they are not part of any other view
  const other = plain(
    run(
      page.sandbox,
      'canonicalViewDefinition({ viewpoint: "map", layer: "application", properties: { applications: false, relationships: false, opened: ["shop"] } })'
    )
  );
  assert.deepEqual(other.properties, { opened: ['shop'] });
  const overview = plain(
    run(
      page.sandbox,
      'canonicalViewDefinition({ viewpoint: "overview", layer: "technology", properties: { element: "prod", applications: false } })'
    )
  );
  assert.deepEqual(overview.properties, { element: 'prod' });
  // a value that is not the boolean false is no choice
  const odd = plain(
    run(
      page.sandbox,
      'canonicalViewDefinition({ viewpoint: "map", layer: "technology", properties: { applications: "no", relationships: 0 } })'
    )
  );
  assert.deepEqual(odd.properties, {});
});

test('the page of a saved view: the tools edit the view, the form has the two boxes, and a view without the keys draws both', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  const view = addView(page, {
    id: 'tm',
    viewpoint: 'map',
    layer: 'technology',
    properties: {
      opened: ['prod', 'prod.dc', 'prod.dc.batch-vm', 'partners', 'partners.carrier-live'],
      hidden: ['staging', 'sandbox']
    }
  });
  await openView(page, view);
  assert.ok(boxes(page).includes('batch-vm_fulfilment_sync'));
  assert.deepEqual(links(page), [
    'batch-vm_fulfilment_sync -> carrier-live_carrier',
    'batch-vm_fulfilment_sync -> partners.erp-live',
    'prod.dc.app-vm -> partners.mail-live',
    'prod.dc.app-vm -> partners.psp-live',
    'prod.dc.app-vm -> partners.tax-live'
  ]);
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.equal(view.properties.applications, false, 'the view is edited');
  assert.deepEqual(
    Object.keys(view.properties),
    ['opened', 'hidden', 'applications'],
    'in the order the editor writes'
  );
  assert.ok(!boxes(page).includes('batch-vm_fulfilment_sync'));
  assert.deepEqual(links(page), [
    'prod.dc.app-vm -> partners.mail-live',
    'prod.dc.app-vm -> partners.psp-live',
    'prod.dc.app-vm -> partners.tax-live',
    'prod.dc.batch-vm -> partners.carrier-live',
    'prod.dc.batch-vm -> partners.erp-live'
  ]);
  assert.match(page.right(), /id="view-edit-part-applications" data-view-field="part:applications"/);
  assert.doesNotMatch(page.right(), /id="view-edit-part-applications"[^>]* checked/);
  assert.match(page.right(), /id="view-edit-part-relationships" data-view-field="part:relationships" checked/);
  // the form's box puts it back: the key goes, since drawn is the default
  const attributes = { id: 'view-edit-part-applications', 'data-view-field': 'part:applications' };
  const box = {
    tagName: 'INPUT',
    type: 'checkbox',
    value: '',
    checked: true,
    id: attributes.id,
    getAttribute: (name) => (name in attributes ? attributes[name] : null)
  };
  box.closest = () => box;
  page.sandbox.handleAppChange({ target: box });
  await page.drawn().catch(() => null);
  assert.ok(!('applications' in view.properties));
  // the Map of the application layer has no such box in its form
  const application = addView(page, {
    id: 'am',
    viewpoint: 'map',
    layer: 'application',
    properties: { opened: ['shop'] }
  });
  await openView(page, application);
  assert.doesNotMatch(page.right(), /view-edit-part-/);
});

test('the cache of the drawing is keyed on the two choices, for the Map of the technology layer only', async () => {
  const page = await opened();
  const recipe = () => run(page.sandbox, 'mainDiagramRecipe(document.getElementById("diagram-canvas"))');
  const key = (r) => page.sandbox.diagramCacheKey(r, null, 'k');
  const base = recipe();
  assert.deepEqual(plain(base.parts), { applications: true, relationships: true });
  const off = Object.assign({}, base, { parts: { applications: false, relationships: true } });
  const links_ = Object.assign({}, base, { parts: { applications: true, relationships: false } });
  assert.notEqual(key(base), key(off));
  assert.notEqual(key(base), key(links_));
  assert.notEqual(key(off), key(links_));
  assert.equal(key(base), key(Object.assign({}, base, { parts: { applications: true, relationships: true } })));
  // the Map of the application layer does not carry them: its key is what it was
  await page.go('map');
  const app = recipe();
  assert.equal(app.layer, 'application');
  assert.equal(key(app), key(Object.assign({}, app, { parts: { applications: false, relationships: false } })));
  // and a toggle gives a new drawing, not the one of the cache
  await page.go('environments');
  run(page.sandbox, 'technologyMapState.opened = new Set(["prod", "prod.dc", "prod.dc.batch-vm"]);');
  await page.show();
  const withApplications = boxes(page);
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.notDeepEqual(boxes(page), withApplications);
  click(page.sandbox, { 'data-action': 'toggle-map-part', 'data-part': 'applications' });
  await page.drawn();
  assert.deepEqual(boxes(page), withApplications);
});

test('the Map of the application layer is what it was: no application layer in its input, the two keys unknown to it, the tools absent', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  const { input } = run(
    page.sandbox,
    'buildKernelInput("map", "", { layer: "application", opened: ["shop"], pinned: [], applications: false, relationships: false })'
  );
  assert.deepEqual(plain(input.app_elements), []);
  assert.equal('applications' in input || 'relationships' in input, false);
  const technology = run(
    page.sandbox,
    'buildKernelInput("map", "", { layer: "technology", opened: [], pinned: [], applications: false })'
  ).input;
  assert.equal(technology.applications, false);
  assert.equal('relationships' in technology, false, 'only what is left out is said');
  // the kernel draws the application layer's Map the same with or without the keys
  const plainMap = page.kernel.compute(Object.assign({}, input));
  const keyed = page.kernel.compute(Object.assign({}, input, { applications: false, relationships: true }));
  assert.deepEqual(plain(keyed), plain(plainMap));
});

test('a comparison: the applications and the dependencies say what changed, Changes only keeps them with their context, and a facet that removes application elements still draws', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'inhouse' });
  await page.sandbox.compareWithPlateau('baseline');
  await page.go('environments');
  run(
    page.sandbox,
    'technologyMapState.opened = new Set(["prod", "prod.dc", "prod.dc.web-vm", "prod.cloud", "prod.cloud.k8s", "prod.cloud.k8s.commerce"]);'
  );
  await page.show();
  const { input } = run(
    page.sandbox,
    'buildKernelInput("map", "", { layer: "technology", opened: Array.from(technologyMapState.opened), pinned: [] })'
  );
  const items = Object.fromEntries(plain(page.kernel.compute(input).items).map((item) => [item.id, item]));
  const applications = Object.values(items).filter((item) => item.id !== item.reference);
  assert.ok(applications.length > 0, 'applications are drawn in a comparison: ' + Object.keys(items).join(', '));
  assert.ok(
    applications.every((item) => typeof item.change === 'string'),
    'each says what changed'
  );
  click(page.sandbox, { 'data-action': 'set-changes-only', 'data-value': '1' });
  await page.drawn();
  assert.ok(boxes(page).includes('prod.cloud'), 'the new part of the environment');
  // a facet that removes application elements: the technology layer keeps its nodes and the applications left
  click(page.sandbox, { 'data-action': 'set-changes-only', 'data-value': '0' });
  page.sandbox.handleAppInput({ target: { id: 'diagram-facet-select', value: 'journey', matches: () => false } });
  await page.drawn();
  assert.doesNotMatch(page.scene().html, /dangling/);
  assert.ok(boxes(page).includes('prod'));
});

test('a view that stops being a Map, or a Map of the technology layer, loses the two keys that mean nothing elsewhere', async () => {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  const view = addView(page, {
    id: 'tm',
    viewpoint: 'map',
    layer: 'technology',
    properties: { pinned: ['prod'], applications: false, relationships: false }
  });
  assert.equal(page.sandbox.setViewLayer(view, 'application'), true);
  assert.deepEqual(plain(view.properties), {}, 'the pin of the other layer goes, and so do both keys');
  const again = addView(page, {
    id: 'tm2',
    viewpoint: 'map',
    layer: 'technology',
    properties: { pinned: ['prod'], applications: false }
  });
  assert.equal(page.sandbox.setViewViewpoint(again, 'overview'), true);
  assert.deepEqual(
    plain(again.properties),
    { element: 'prod', labels: false, qualifiers: false },
    "the texts the Map drew are kept, the Map's keys are not"
  );
  // to the Map: the keys are put back by the tools, not invented
  assert.equal(page.sandbox.setViewViewpoint(again, 'map'), true);
  assert.deepEqual(plain(again.properties), { pinned: ['prod'] });
  assert.equal(page.sandbox.setViewMapPart(again, 'relationships', false), true);
  assert.equal(page.sandbox.setViewMapPart(again, 'relationships', false), false, 'nothing to change');
  assert.deepEqual(plain(again.properties), { pinned: ['prod'], relationships: false });
  assert.equal(page.sandbox.setViewMapPart(again, 'relationships', true), true);
  assert.deepEqual(plain(again.properties), { pinned: ['prod'] }, 'drawn is the default: the key goes');
});
