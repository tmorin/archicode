'use strict';
// The relationships of the Map in the editor (wave 026, run 0199, issue #143, TDD DEC-1, DEC-4, DEC-5, DEC-6, DEC-8; REQ-2, REQ-3, REQ-5): ticking a relationship draws its ends and what
// encloses them, the panel of a selected link keeps the relationships it stands for, a chip says the map is narrowed, the kernel is given only the entries the model drawn has, the choice
// is in the address and in the cache key, and a facet, a plateau and a comparison are told apart. The bookshop of the manual (domain_plateaus) and the layered Brightcart are opened in memory.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  BOOKSHOP,
  BRIGHTCART,
  entry,
  run,
  plain,
  click,
  openWorkspace,
  addMapView,
  boxIdsOf,
  linkPairsOf,
  textOf
} = require('./map-links-support');

async function mapPage(dir, plateau) {
  const page = await openWorkspace(dir, plateau);
  await page.go('map');
  return page;
}

const keyOf = (page, e) => run(page.sandbox, 'linkEntryKey(' + JSON.stringify(e) + ')');
const tick = async (page, e) => {
  click(page.sandbox, { 'data-action': 'map-link-toggle', 'data-key': keyOf(page, e) });
  await page.drawn();
};
const openBox = async (page, reference) => {
  run(page.sandbox, 'mapStateOf("application").opened = new Set(' + JSON.stringify([reference]) + ');');
  await page.show();
};
const selectLink = (page, from, to) =>
  click(page.sandbox, { 'data-action': 'select-link', 'data-from': from, 'data-to': to, 'data-layer': 'application' });
const panel = (page) => page.sandbox.renderMapPerspectiveHtml().right;
const ORDERS = entry('customer', 'shop.web', 'orders on');

test('ticking a relationship draws the ends of that relationship and what encloses them, and nothing else', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  const before = boxIdsOf(page.scene().html);
  assert.ok(before.includes('warehouse'), 'the whole map is drawn first: ' + before);
  await tick(page, ORDERS);
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [ORDERS]);
  const html = page.scene().html;
  assert.deepEqual(boxIdsOf(html), ['customer', 'shop'], 'the web site is inside the closed shop');
  assert.deepEqual(linkPairsOf(html), ['customer -> shop']);
});

test('ticking it again gives the whole map back, and the address has no rel', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  const whole = boxIdsOf(page.scene().html);
  await tick(page, ORDERS);
  assert.match(page.sandbox.currentRouteHash(), /[?&]rel=/);
  await tick(page, ORDERS);
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), []);
  assert.deepEqual(boxIdsOf(page.scene().html), whole, 'an empty choice is no selection');
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /rel=/);
});

test('a chip says the map is narrowed and clears the choice', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  assert.doesNotMatch(page.sandbox.renderMapChipsHtml(), /Relationships/);
  await tick(page, ORDERS);
  await tick(page, entry('warehouse.picking', 'shop.inventory', 'counts with'));
  const chips = page.sandbox.renderMapChipsHtml();
  assert.match(textOf(chips), /Relationships: 2/);
  assert.match(chips, /data-action="map-links-clear"/);
  click(page.sandbox, { 'data-action': 'map-links-clear' });
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), []);
  assert.doesNotMatch(page.sandbox.renderMapChipsHtml(), /Relationships/);
});

test('Clear all of the chips clears the relationships too', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'customer' });
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'warehouse' });
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'shop.mailer' });
  await tick(page, ORDERS);
  click(page.sandbox, { 'data-action': 'map-clear' });
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), []);
  assert.deepEqual(plain(run(page.sandbox, 'mapPinned')), []);
});

test('the choice is view state: it calls modelsChanged() no more than a pin does, and a folder reset forgets it', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  const version = run(page.sandbox, 'modelVersion');
  await tick(page, ORDERS);
  assert.equal(run(page.sandbox, 'modelVersion'), version, 'no model changed');
  run(page.sandbox, 'resetUiState();');
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), []);
  assert.equal(run(page.sandbox, 'mapLinksFilter'), '');
  assert.equal(run(page.sandbox, 'mapLinksTickedOnly'), false);
  assert.equal(run(page.sandbox, 'mapLinksListOpen'), false);
});

test('a refused write puts the choice back: the snapshot of a write holds it', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  await tick(page, ORDERS);
  const snapshot = run(page.sandbox, 'snapshotWriteState()');
  run(page.sandbox, 'mapLinks = [];');
  page.sandbox.restoreWriteState(snapshot);
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [ORDERS]);
});

test('the panel of a selected link offers to draw only that link, and the click keeps its relationship', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  await openBox(page, 'shop');
  selectLink(page, 'customer', 'shop.web');
  assert.match(panel(page), /data-action="map-link-only"/);
  assert.match(textOf(panel(page)), /Draw only this link/);
  click(page.sandbox, { 'data-action': 'map-link-only' });
  await page.drawn();
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [ORDERS]);
  assert.deepEqual(boxIdsOf(page.scene().html), ['customer', 'shop', 'shop.web']);
});

test('under a choice the panel has a checkbox on each relationship of the link, ticked when it is in the choice, and no Draw only', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  await openBox(page, 'shop');
  await tick(page, ORDERS);
  selectLink(page, 'customer', 'shop.web');
  const html = panel(page);
  assert.doesNotMatch(html, /map-link-only/, 'a drawn link stands only for ticked relationships: nothing to add');
  const boxes = Array.from(html.matchAll(/<input[^>]*data-action="map-link-toggle"[^>]*>/g), (m) => m[0]);
  assert.equal(boxes.length, 1);
  assert.match(boxes[0], /\schecked\b/);
  click(page.sandbox, { 'data-action': 'map-link-toggle', 'data-key': keyOf(page, ORDERS) });
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [], 'a drawn link can be taken out from the panel');
});

test('a grouped link adds one entry for each relationship it stands for', async () => {
  const page = await mapPage(BRIGHTCART, 'baseline');
  await openBox(page, 'shop');
  const links = linkPairsOf(page.scene().html);
  assert.ok(links.includes('shop.app -> shop.db'), 'the link of the closed application to the database: ' + links);
  selectLink(page, 'shop.app', 'shop.db');
  click(page.sandbox, { 'data-action': 'map-link-only' });
  const expected = plain(
    run(
      page.sandbox,
      `Array.from(AppState.index.application.values()).filter((r) => r.reference.startsWith('shop.app.')).flatMap((r) =>
         r.relationships.filter((rel) => rel.destination === 'shop.db').map((rel) => linkEntryOf(rel, r.reference)))`
    )
  );
  assert.ok(expected.length >= 6, 'the application has many relationships to the database: ' + expected.length);
  const got = plain(run(page.sandbox, 'mapLinks'));
  assert.deepEqual(
    got.map((e) => JSON.stringify([e.source, e.destination, e.label])).sort(),
    expected.map((e) => JSON.stringify([e.source, e.destination, e.label])).sort()
  );
});

test('the kernel is given links only when the choice is not empty, and only for the Map of the application layer', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  const input = (options) =>
    plain(run(page.sandbox, 'buildKernelInput("map", "", ' + JSON.stringify(options) + ').input'));
  assert.deepEqual(input({ layer: 'application', links: [ORDERS] }).links, [ORDERS]);
  assert.equal('links' in input({ layer: 'application', links: [] }), false);
  assert.equal(
    'links' in input({ layer: 'application' }),
    false,
    'an input without links is the input of before, key for key'
  );
  assert.equal('links' in input({ layer: 'technology', links: [ORDERS] }), false);
});

test('an entry the plateau lacks is dropped from what the kernel is given, and kept in the choice', async () => {
  const page = await mapPage(BOOKSHOP, 'to-be');
  const lacking = entry('shop.web', 'shop.mailer', 'sends mails with'); // the baseline has it, the to-be removes it
  const payments = entry('shop.web', 'shop.payments', 'pays with');
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([lacking, payments]) + ';');
  assert.deepEqual(plain(run(page.sandbox, 'currentMapState().links')), [payments]);
  assert.deepEqual(
    plain(run(page.sandbox, 'mapLinks')),
    [lacking, payments],
    'the choice is the author’s: it is not rewritten'
  );
  await openBox(page, 'shop');
  assert.deepEqual(boxIdsOf(page.scene().html), ['shop', 'shop.payments', 'shop.web']);
});

test('when no ticked entry exists in the model drawn, nothing is drawn and the page says why, with Clear', async () => {
  const page = await mapPage(BOOKSHOP, 'to-be');
  run(page.sandbox, 'mapLinks = [' + JSON.stringify(entry('shop.web', 'shop.mailer', 'sends mails with')) + '];');
  await page.show();
  const html = page.canvas().innerHTML; // the scene of nothing drawn is shown on the canvas, as the other errors of the diagram
  assert.match(textOf(html), /Nothing is drawn: none of the relationships ticked is in this plateau\./);
  assert.match(html, /data-action="map-links-clear"/);
  assert.deepEqual(boxIdsOf(page.scene() ? page.scene().html || '' : ''), []);
});

test('with a comparison on, a removed relationship can be ticked and is drawn', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  page.sandbox.drawPlateau('to-be', { compare: 'past' });
  await page.go('map');
  const removed = entry('shop.web', 'shop.mailer', 'sends mails with');
  run(page.sandbox, 'mapStateOf("application").opened = new Set(["shop"]);');
  await tick(page, removed);
  assert.deepEqual(plain(run(page.sandbox, 'currentMapState().links')), [removed]);
  const html = page.scene().html;
  assert.ok(boxIdsOf(html).includes('shop.mailer'), boxIdsOf(html).join(','));
  assert.ok(linkPairsOf(html).includes('shop.web -> shop.mailer'));
});

test('a facet that removes an end of a ticked entry is the kernel’s sentence, shown as the error of the diagram', async () => {
  const page = await mapPage(BRIGHTCART, 'baseline');
  const console = entry('backoffice.console', 'shop.app.catalog', 'maintains products in');
  run(page.sandbox, 'mapLinks = [' + JSON.stringify(console) + ']; diagramFacet = "journey";');
  await page.show();
  assert.match(textOf(page.canvas().innerHTML), /dangling reference: backoffice\.console/);
});

test('the address carries the choice as one rel= per entry, a JSON array percent-encoded, and reads it back', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  const reads = entry('shop.web', 'shop.catalog', 'reads');
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([ORDERS, reads]) + ';');
  const hash = page.sandbox.currentRouteHash();
  assert.ok(hash.includes('rel=' + encodeURIComponent(JSON.stringify(['customer', 'shop.web', 'orders on']))), hash);
  assert.ok(hash.includes('rel=' + encodeURIComponent(JSON.stringify(['shop.web', 'shop.catalog', 'reads']))), hash);
  assert.equal((hash.match(/rel=/g) || []).length, 2);
  run(page.sandbox, 'mapLinks = [];');
  page.sandbox.location.hash = '#' + hash;
  page.sandbox.syncPerspectiveFromHash();
  const back = plain(run(page.sandbox, 'mapLinks'));
  assert.deepEqual(back.map((e) => keyOf(page, e)).sort(), [keyOf(page, ORDERS), keyOf(page, reads)].sort());
});

test('an entry with no label is written without one in the address', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  run(page.sandbox, 'mapLinks = [' + JSON.stringify(entry('customer', 'shop.web')) + '];');
  assert.ok(
    page.sandbox.currentRouteHash().includes('rel=' + encodeURIComponent(JSON.stringify(['customer', 'shop.web'])))
  );
});

test('an address with an entry that names no relationship drops it, as a pin that is gone is dropped', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  const bad = encodeURIComponent(JSON.stringify(['customer', 'shop.web', 'no such label']));
  const worse = encodeURIComponent('not json');
  const good = encodeURIComponent(JSON.stringify(['customer', 'shop.web', 'orders on']));
  page.sandbox.location.hash = '#/timeline/applications?rel=' + bad + '&rel=' + worse + '&rel=' + good;
  page.sandbox.syncPerspectiveFromHash();
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), [ORDERS]);
});

test('an address with no rel is read as before: the choice is empty', async () => {
  const page = await mapPage(BOOKSHOP, 'baseline');
  run(page.sandbox, 'mapLinks = [' + JSON.stringify(ORDERS) + '];');
  page.sandbox.location.hash = '#/timeline/applications?pin=shop.web';
  page.sandbox.syncPerspectiveFromHash();
  assert.deepEqual(plain(run(page.sandbox, 'mapLinks')), []);
});

test('the diagram cache key holds the choice only when there is one, so a map without links keeps its key', async () => {
  const page = await openWorkspace(BOOKSHOP, 'baseline');
  const key = (properties) => {
    const view = addMapView(page, 'k' + Math.random().toString(36).slice(2, 8), properties);
    return run(
      page.sandbox,
      `diagramCacheKey(viewDiagramRecipe(findSavedView(${JSON.stringify(view.id)}), AppState.index, 'library'), null, 'v')`
    );
  };
  const without = key({ opened: ['shop'] });
  assert.equal(key({ opened: ['shop'], links: [] }), without, 'links: [] is no selection');
  assert.doesNotMatch(without, /links|orders on/);
  const one = key({ opened: ['shop'], links: [ORDERS] });
  const other = key({ opened: ['shop'], links: [entry('shop.web', 'shop.catalog', 'reads')] });
  assert.notEqual(one, without);
  assert.notEqual(one, other);
  assert.equal(
    key({ opened: ['shop'], links: [entry('shop.web', 'shop.catalog', 'reads'), ORDERS] }),
    key({ opened: ['shop'], links: [ORDERS, entry('shop.web', 'shop.catalog', 'reads')] }),
    'the order of the entries is not a choice'
  );
});

test('the recipe of a saved view carries its entries, filtered by the model drawn', async () => {
  const page = await openWorkspace(BOOKSHOP, 'to-be');
  const payments = entry('shop.web', 'shop.payments', 'pays with');
  const lacking = entry('shop.web', 'shop.mailer', 'sends mails with');
  const view = addMapView(page, 'in_tobe', { opened: ['shop'], links: [lacking, payments] });
  const recipe = plain(
    run(page.sandbox, `viewDiagramRecipe(findSavedView(${JSON.stringify(view.id)}), AppState.index, 'library')`)
  );
  assert.deepEqual(recipe.mapState.links, [payments]);
});
