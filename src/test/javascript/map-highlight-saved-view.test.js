'use strict';
// A saved Map view keeps the highlight the author picked (wave 026, run 0200, issue #143, TDD DEC-1, DEC-5, DEC-6, CTR-1; REQ-1, REQ-3, REQ-4): `properties.highlight` is applied to the live
// state (`mapHighlight`) by *Apply*, drawn by the page of the view, written sorted and without repeats after `links`, edited from the form of the view (pills and a select), kept by
// *Keep as named view* and by *Add to story...* (the step key), carried by the address as one `hl=` per entry, and a view with a highlight now matches the screen. A view without a highlight is
// read, drawn and written as before. RED until the editor does it. The workspace is the fixture of the kernel tests (src/test/resources/viewpoint-kernel/workspace, invented), in memory.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { run, plain, click, startPage, entry, linkPairsOf } = require('./map-links-support');

const FRONTEND = entry('customer', 'shop.web.frontend', 'browses with');
const QUERIES = entry('shop.web.api', 'shop.catalog.service', 'queries');
const PAYMENTS = entry('shop.web.api', 'shop.payments', 'charges with');

const VIEW_FILE = `# the architecture review reads this one
header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: web_links
  name: Web links
  viewpoint: map
  layer: application
  properties:
    # the web site and what it calls
    opened: [shop, shop.web, shop.catalog]
    links:
      - source: shop.web.api   # the api
        destination: shop.catalog.service
        label: queries
      - {source: customer, destination: shop.web.frontend, label: "browses with"}
    highlight:
      - source: shop.web.api
        destination: shop.catalog.service
        label: queries
`;
const PLAIN_FILE = `header:
  kind: archicode.morin.io/view
  version: "1"
content:
  id: plain_map
  name: A plain map
  viewpoint: map
  layer: application
  properties:
    pinned:
      - shop.web
    opened: [shop]
`;
const STORY_FILE = `header:
  kind: archicode.morin.io/story
  version: "1"
content:
  id: tour
  name: Tour
  steps:
    - view: web_links
    - view: web_links
      highlight:
        - {source: customer, destination: shop.web.frontend, label: "browses with"}
    - view: web_links
      highlight: []
`;

async function open() {
  const page = await startPage({
    mem: true,
    files: {
      'manifests/view.web_links.yaml': VIEW_FILE,
      'manifests/view.plain_map.yaml': PLAIN_FILE,
      'manifests/story.tour.yaml': STORY_FILE
    }
  });
  run(page.sandbox, 'revealDiagramNode = function () {};'); // the marks of the fake canvas have no geometry to scroll to
  return page;
}
const view = (page, id) => page.sandbox.findSavedView(id);
const call = (page, code) => plain(run(page.sandbox, code));
const keyOf = (page, e) => run(page.sandbox, 'linkEntryKey(' + JSON.stringify(e) + ')');
const keys = (page, list) => list.map((e) => keyOf(page, e)).sort();
const control = (attributes, props) => {
  const el = Object.assign(
    { tagName: 'SELECT', type: 'select-one', value: '', checked: false, id: attributes.id || '' },
    props
  );
  el.getAttribute = (name) => (name in attributes ? attributes[name] : null);
  el.closest = () => el;
  return el;
};
async function change(page, attributes, props) {
  page.sandbox.handleAppChange({ target: control(attributes, props) });
  await page.drawn().catch(() => null);
}
async function openViewPage(page, id) {
  run(page.sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(id) + ';');
  page.sandbox.setPerspective('library');
  return page.drawn().catch(() => null);
}
const heavy = (html) =>
  Array.from(html.matchAll(/<g class="dg-link"[^>]*data-from="([^"]*)" data-to="([^"]*)"[^>]*>[\s\S]*?<\/g>/g))
    .filter((m) => /class="dg-edge[^"]*\bdg-hl\b/.test(m[0]))
    .map((m) => m[1] + ' -> ' + m[2]);

// ============================================================ read

test('the page of a view with a highlight draws that link heavy and the other one calm', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  assert.deepEqual(heavy(page.scene().html), ['shop.web.api -> shop.catalog.service']);
  assert.match(page.scene().html, /dg-calm/);
  assert.deepEqual(linkPairsOf(page.scene().html), [
    'customer -> shop.web.frontend',
    'shop.web.api -> shop.catalog.service'
  ]);
});

test('Apply sets mapHighlight from the view, a view without one clears it, and the screen is then the view', async () => {
  const page = await open();
  assert.equal(page.sandbox.applySavedView(view(page, 'web_links')), null);
  assert.deepEqual(keys(page, call(page, 'mapHighlight')), keys(page, [QUERIES]));
  await page.show();
  assert.deepEqual(heavy(page.scene().html), ['shop.web.api -> shop.catalog.service']);
  assert.equal(page.sandbox.viewMatchesScreen(view(page, 'web_links')), true, 'no "the highlight apart" any more');
  assert.equal(page.sandbox.applySavedView(view(page, 'plain_map')), null);
  assert.deepEqual(call(page, 'mapHighlight'), []);
  assert.equal(page.sandbox.viewMatchesScreen(view(page, 'plain_map')), true);
  assert.equal(page.sandbox.viewMatchesScreen(view(page, 'web_links')), false);
});

test('the screen is a view: the highlight is in the definition sorted, and absent when there is none', async () => {
  const page = await open();
  await page.go('map');
  run(
    page.sandbox,
    'mapLinks = ' +
      JSON.stringify([QUERIES, FRONTEND]) +
      '; mapHighlight = ' +
      JSON.stringify([QUERIES, FRONTEND]) +
      ';'
  );
  const definition = call(page, 'currentViewDefinition()');
  assert.deepEqual(
    definition.properties.highlight.map((e) => keyOf(page, e)),
    keys(page, [FRONTEND, QUERIES])
  );
  assert.deepEqual(Object.keys(definition.properties), ['links', 'highlight']);
  run(page.sandbox, 'mapHighlight = [];');
  assert.equal('highlight' in call(page, 'currentViewDefinition()').properties, false);
});

test('canonicalViewProperties writes the highlight sorted and without repeats after links, and not in another viewpoint or layer', async () => {
  const page = await open();
  const properties = call(
    page,
    `canonicalViewProperties({ highlight: [${JSON.stringify(QUERIES)}, ${JSON.stringify(FRONTEND)}, ${JSON.stringify(entry('customer', 'shop.web.frontend', ' browses with '))}], links: [${JSON.stringify(QUERIES)}], opened: ['shop'] })`
  );
  assert.deepEqual(Object.keys(properties), ['opened', 'links', 'highlight']);
  assert.deepEqual(
    properties.highlight.map((e) => keyOf(page, e)),
    keys(page, [FRONTEND, QUERIES])
  );
  assert.deepEqual(call(page, 'Object.keys(canonicalViewProperties({ highlight: [] }))'), []);
  const definition = (viewpoint, layer) =>
    call(
      page,
      `canonicalViewDefinition({ viewpoint: '${viewpoint}', layer: '${layer}', properties: { highlight: [${JSON.stringify(FRONTEND)}] } })`
    );
  assert.deepEqual(Object.keys(definition('map', 'application').properties), ['highlight']);
  assert.deepEqual(Object.keys(definition('map', 'technology').properties), []);
  assert.deepEqual(Object.keys(definition('overview', 'application').properties), []);
});

test('Keep as named view writes the highlight of the screen and finds the view again when the screen is the same', async () => {
  const page = await open();
  await page.go('map');
  run(
    page.sandbox,
    'mapLinks = ' + JSON.stringify([QUERIES, FRONTEND]) + '; mapHighlight = ' + JSON.stringify([FRONTEND]) + ';'
  );
  const kept = call(page, "viewForDefinition(currentViewDefinition(), 'Flow')");
  assert.deepEqual(
    kept.properties.highlight.map((e) => keyOf(page, e)),
    keys(page, [FRONTEND])
  );
  const again = call(page, "viewForDefinition(currentViewDefinition(), 'Other name')");
  assert.equal(again.id, kept.id, 'one view, not two');
  run(page.sandbox, 'mapHighlight = [];');
  assert.notEqual(call(page, "viewForDefinition(currentViewDefinition(), 'Without')").id, kept.id);
});

// ============================================================ the form

test('the form of a Map view has a Highlight field: a pill per entry, missing ones marked, a remove button, a select', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  const right = page.right();
  assert.match(right, /id="view-edit-add-highlight"/);
  assert.match(right, /data-action="view-highlight-remove" data-key="/);
  const pills = Array.from(
    right.matchAll(/<span class="pill[^"]*" role="listitem"[^>]*>[\s\S]*?<\/span>/g),
    (m) => m[0]
  );
  assert.ok(pills.some((p) => /view-highlight-remove/.test(p) && /queries/.test(p)));
  const select = /<select[^>]*id="view-edit-add-highlight"[^>]*>([\s\S]*?)<\/select>/.exec(right);
  assert.ok(select);
  assert.match(select[1], /charges with/);
  assert.doesNotMatch(select[1], /queries/, 'the one already there is not offered again');
});

test('adding from the select writes the entry; one that is no relationship, or is already there, writes nothing', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  await change(page, { id: 'view-edit-add-highlight', 'data-view-highlight': 'add' }, { value: keyOf(page, PAYMENTS) });
  assert.deepEqual(keys(page, plain(view(page, 'web_links').properties.highlight)), keys(page, [QUERIES, PAYMENTS]));
  assert.equal(
    page.sandbox.setViewHighlight(view(page, 'web_links'), entry('customer', 'shop.web.frontend', 'nope'), true),
    false
  );
  assert.equal(page.sandbox.setViewHighlight(view(page, 'web_links'), PAYMENTS, true), false, 'already there');
  assert.equal(view(page, 'web_links').properties.highlight.length, 2);
});

test('removing takes the entry out and the last one takes the key out; links are never touched', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  const links = JSON.stringify(plain(view(page, 'web_links').properties.links));
  click(page.sandbox, { 'data-action': 'view-highlight-remove', 'data-key': keyOf(page, QUERIES) });
  await page.drawn().catch(() => null);
  assert.equal('highlight' in view(page, 'web_links').properties, false);
  assert.equal(JSON.stringify(plain(view(page, 'web_links').properties.links)), links);
  assert.equal(
    page.sandbox.setViewHighlight(view(page, 'plain_map'), QUERIES, true),
    true,
    'a view without a highlight gets one'
  );
});

test('the save writes the highlight and keeps the comments, and a view without a highlight is written as before', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  await change(page, { id: 'view-edit-add-highlight', 'data-view-highlight': 'add' }, { value: keyOf(page, PAYMENTS) });
  await page.sandbox.saveAllChanges();
  const text = page.mem.files.get('manifests/view.web_links.yaml').text;
  assert.ok(text.includes('# the architecture review reads this one'));
  assert.ok(text.includes('# the web site and what it calls'));
  assert.ok(text.includes('      - source: shop.web.api   # the api'));
  assert.ok(text.indexOf('shop.payments') > text.indexOf('highlight:'), 'the new entry is in the highlight');
  const plainText = page.mem.files.get('manifests/view.plain_map.yaml');
  assert.ok(!plainText || plainText.text === PLAIN_FILE, 'an untouched view is not rewritten');
});

// ============================================================ the address

test('the address carries the highlight as one hl= per entry with the codec of rel=, and reads it back', async () => {
  const page = await open();
  await page.go('map');
  run(
    page.sandbox,
    'mapLinks = ' +
      JSON.stringify([QUERIES, FRONTEND]) +
      '; mapHighlight = ' +
      JSON.stringify([QUERIES, FRONTEND]) +
      ';'
  );
  const hash = page.sandbox.currentRouteHash();
  assert.equal((hash.match(/hl=/g) || []).length, 2, hash);
  assert.ok(
    hash.includes('hl=' + encodeURIComponent(JSON.stringify(['shop.web.api', 'shop.catalog.service', 'queries'])))
  );
  assert.equal((hash.match(/rel=/g) || []).length, 2, 'rel= is as it was');
  run(page.sandbox, 'mapHighlight = [];');
  page.sandbox.location.hash = '#' + hash;
  page.sandbox.syncPerspectiveFromHash();
  assert.deepEqual(keys(page, call(page, 'mapHighlight')), keys(page, [QUERIES, FRONTEND]));
});

test('an address with an hl= that names no relationship drops it; an address with no hl= clears the choice', async () => {
  const page = await open();
  await page.go('map');
  const bad = encodeURIComponent(JSON.stringify(['customer', 'shop.web.frontend', 'no such label']));
  const good = encodeURIComponent(JSON.stringify(['customer', 'shop.web.frontend', 'browses with']));
  page.sandbox.location.hash =
    '#/timeline/applications?hl=' + bad + '&hl=' + good + '&hl=' + encodeURIComponent('not json');
  page.sandbox.syncPerspectiveFromHash();
  assert.deepEqual(call(page, 'mapHighlight'), [FRONTEND]);
  page.sandbox.location.hash = '#/timeline/applications?pin=shop.web';
  page.sandbox.syncPerspectiveFromHash();
  assert.deepEqual(call(page, 'mapHighlight'), []);
});

test('a map without a highlight has an address with no hl=, as before', async () => {
  const page = await open();
  await page.go('map');
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([QUERIES]) + ';');
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /hl=/);
});

// ============================================================ the Applications page

test('the panel of a selected link has a Highlight box beside the relationship boxes, and a chip with a Clear', async () => {
  const page = await open();
  await page.go('map');
  run(
    page.sandbox,
    'mapStateOf("application").opened = new Set(["shop", "shop.web", "shop.catalog"]); mapLinks = ' +
      JSON.stringify([QUERIES, FRONTEND]) +
      ';'
  );
  await page.show();
  click(page.sandbox, {
    'data-action': 'select-link',
    'data-from': 'shop.web.api',
    'data-to': 'shop.catalog.service',
    'data-layer': 'application'
  });
  const panel = page.sandbox.renderMapPerspectiveHtml().right;
  assert.match(panel, /data-action="map-link-highlight"/);
  click(page.sandbox, { 'data-action': 'map-link-highlight', 'data-key': keyOf(page, QUERIES) });
  await page.drawn();
  assert.deepEqual(keys(page, call(page, 'mapHighlight')), keys(page, [QUERIES]));
  assert.deepEqual(heavy(page.scene().html), ['shop.web.api -> shop.catalog.service']);
  const chips = page.sandbox.renderMapChipsHtml();
  assert.match(chips, /Highlight: 1/);
  assert.match(chips, /data-action="map-highlight-clear"/);
  click(page.sandbox, { 'data-action': 'map-highlight-clear' });
  assert.deepEqual(call(page, 'mapHighlight'), []);
  assert.deepEqual(keys(page, call(page, 'mapLinks')), keys(page, [QUERIES, FRONTEND]), 'the links stay');
  click(page.sandbox, { 'data-action': 'map-link-highlight', 'data-key': keyOf(page, QUERIES) });
  click(page.sandbox, { 'data-action': 'map-clear' });
  assert.deepEqual(call(page, 'mapHighlight'), [], 'Clear all clears it too');
});

test('the highlight is view state: no model changed, and a folder reset forgets it', async () => {
  const page = await open();
  await page.go('map');
  const version = run(page.sandbox, 'modelVersion');
  click(page.sandbox, { 'data-action': 'map-link-highlight', 'data-key': keyOf(page, QUERIES) });
  assert.equal(run(page.sandbox, 'modelVersion'), version);
  run(page.sandbox, 'resetUiState();');
  assert.deepEqual(call(page, 'mapHighlight'), []);
});

// ============================================================ the stories

test('Add to story writes the live highlight as the key of the step and the links in properties; the view the step names is found without it', async () => {
  const page = await open();
  await page.go('map');
  run(
    page.sandbox,
    'mapLinks = ' + JSON.stringify([QUERIES, FRONTEND]) + '; mapHighlight = ' + JSON.stringify([FRONTEND]) + ';'
  );
  page.sandbox.addCurrentViewToStoryChoice({ newName: 'Written' });
  const step = call(page, "storiesList().find((s) => s.name === 'Written').steps[0]");
  assert.deepEqual(keys(page, step.highlight), keys(page, [FRONTEND]));
  assert.equal('highlight' in (step.properties || {}), false);
  assert.deepEqual(keys(page, step.properties.links), keys(page, [QUERIES, FRONTEND]));
  // a view with the same links names itself in the step, and the key stays on the step
  run(
    page.sandbox,
    'mapLinks = ' + JSON.stringify([QUERIES, FRONTEND]) + '; mapHighlight = ' + JSON.stringify([QUERIES]) + ';'
  );
  page.sandbox.createManifestEntry('view', {
    id: 'both',
    name: 'Both',
    viewpoint: 'map',
    layer: 'application',
    properties: { links: [QUERIES, FRONTEND] }
  });
  page.sandbox.addCurrentViewToStoryChoice({ newName: 'Named' });
  const named = call(page, "storiesList().find((s) => s.name === 'Named').steps[0]");
  assert.equal(named.view, 'both');
  assert.deepEqual(keys(page, named.highlight), keys(page, [QUERIES]));
});

test('the walk draws the key of the step: it replaces the view’s, an empty list switches it off, no key is the view’s', async () => {
  const page = await open();
  const at = async (i) => {
    page.sandbox.goToStoryStep('tour', i);
    await page.drawn();
    return heavy(page.scene().html);
  };
  assert.deepEqual(await at(0), ['shop.web.api -> shop.catalog.service'], 'the view’s');
  assert.deepEqual(await at(1), ['customer -> shop.web.frontend'], 'the step’s key replaces it');
  assert.deepEqual(await at(2), [], 'an empty list switches it off');
  assert.doesNotMatch(page.scene().html, /dg-calm/);
  assert.deepEqual(
    keys(page, plain(view(page, 'web_links').properties.highlight)),
    keys(page, [QUERIES]),
    'the view is untouched'
  );
});

test('leaving a story keeps the last step’s live highlight and links, restoring the plateau only', async () => {
  const page = await open();
  page.sandbox.goToStoryStep('tour', 1);
  await page.drawn();
  assert.deepEqual(keys(page, call(page, 'mapHighlight')), keys(page, [FRONTEND]));
  click(page.sandbox, { 'data-action': 'story-exit' });
  assert.deepEqual(keys(page, call(page, 'mapHighlight')), keys(page, [FRONTEND]));
});

test('the story editor has a field for the key of a step, a note that it replaces the view’s, and removes the last entry as the view needs', async () => {
  const page = await open();
  const html = page.sandbox.renderStoryStepHtml(
    page.sandbox.findStory('tour'),
    page.sandbox.findStory('tour').steps[1],
    1,
    3
  );
  assert.match(html, /step-highlight/);
  assert.match(html, /replaces the highlight of the view/i);
  assert.equal(page.sandbox.setStepHighlight('tour', 1, FRONTEND, false), true);
  assert.deepEqual(
    call(page, 'findStory("tour").steps[1].highlight'),
    [],
    'the view has a highlight to switch off: [] stays'
  );
  assert.equal(page.sandbox.setStepHighlight('tour', 0, PAYMENTS, true), true);
  assert.equal(page.sandbox.setStepHighlight('tour', 0, PAYMENTS, false), true);
  assert.equal(
    'highlight' in call(page, 'findStory("tour").steps[0]'),
    false,
    'no view highlight changed: the key goes'
  );
  assert.equal(page.sandbox.setStepHighlight('tour', 0, entry('customer', 'shop.web.frontend', 'nope'), true), false);
});
