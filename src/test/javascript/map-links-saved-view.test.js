'use strict';
// A saved Map view keeps the relationships the author picked (wave 026, run 0199, issue #143, TDD DEC-7, REQ-5): `properties.links` is read by the recipe of a diagram, drawn by the page of the
// view, the page Applications and the story scene; it is written back sorted and without repeats by `canonicalViewProperties` (after `opened`), edited from the form of the view (pills and a
// select), kept by "Keep as named view", and a `highlight` the editor does not draw is kept verbatim through every edit and never lost. A view without `links` is read, drawn and written as before.
// The workspace is the fixture of the kernel tests (src/test/resources/viewpoint-kernel/workspace, invented), in memory, with no plateau and with facets.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { run, plain, click, startPage, entry, boxIdsOf, linkPairsOf, textOf } = require('./map-links-support');

const FRONTEND = entry('customer', 'shop.web.frontend', 'browses with');
const QUERIES = entry('shop.web.api', 'shop.catalog.service', 'queries');
const PAYMENTS = entry('shop.web.api', 'shop.payments', 'charges with');

/** A view as a person writes it: comments, a flow entry, a highlight. */
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

async function open(extra) {
  return startPage({
    mem: true,
    files: Object.assign(
      { 'manifests/view.web_links.yaml': VIEW_FILE, 'manifests/view.plain_map.yaml': PLAIN_FILE },
      extra || {}
    )
  });
}

const view = (page, id) => page.sandbox.findSavedView(id);
const call = (page, code) => plain(run(page.sandbox, code));
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
const keyOf = (page, e) => run(page.sandbox, 'linkEntryKey(' + JSON.stringify(e) + ')');

// ============================================================ read

test('the recipe of a view carries its entries, and the page of the view draws the ends of those relationships only', async () => {
  const page = await open();
  const recipe = call(page, "viewDiagramRecipe(findSavedView('web_links'), AppState.index, 'library')");
  assert.deepEqual(
    recipe.mapState.links.map((e) => keyOf(page, e)).sort(),
    [keyOf(page, FRONTEND), keyOf(page, QUERIES)].sort()
  );
  assert.equal(call(page, "viewProblem(findSavedView('web_links'))"), null);
  await openViewPage(page, 'web_links');
  const html = page.scene().html;
  assert.deepEqual(linkPairsOf(html), ['customer -> shop.web.frontend', 'shop.web.api -> shop.catalog.service'].sort());
  assert.ok(boxIdsOf(html).includes('customer') && boxIdsOf(html).includes('shop.catalog.service'));
  assert.ok(!boxIdsOf(html).includes('mailer'), 'what no ticked relationship reaches is not drawn');
});

test('Apply on the page Applications sets the choice, and the screen is the view once it is applied (the highlight apart)', async () => {
  const page = await open();
  const v = view(page, 'web_links');
  assert.equal(page.sandbox.applySavedView(v), null);
  assert.equal(call(page, 'currentPerspective'), 'map');
  assert.deepEqual(
    call(page, 'mapLinks')
      .map((e) => keyOf(page, e))
      .sort(),
    [keyOf(page, FRONTEND), keyOf(page, QUERIES)].sort()
  );
  await page.show();
  assert.deepEqual(
    linkPairsOf(page.scene().html),
    ['customer -> shop.web.frontend', 'shop.web.api -> shop.catalog.service'].sort()
  );
  // run 0200: the highlight is live state now, so the screen is the view with it
  assert.equal(page.sandbox.viewMatchesScreen(view(page, 'web_links')), true);
});

test('a view whose layer is technology does not read links, and a Map of the application layer with an empty list is the whole map', async () => {
  const page = await open();
  const tech = call(
    page,
    "createManifestEntry('view', { id: 't', name: 't', viewpoint: 'map', layer: 'technology', properties: { links: [" +
      JSON.stringify(FRONTEND) +
      '] } })'
  );
  assert.match(
    String(page.sandbox.viewProblem(page.sandbox.findSavedView(tech.id))),
    /links is read in the map of the application layer only/
  );
  const empty = call(
    page,
    "createManifestEntry('view', { id: 'e', name: 'e', viewpoint: 'map', layer: 'application', properties: { links: [] } })"
  );
  assert.equal(page.sandbox.viewProblem(page.sandbox.findSavedView(empty.id)), null);
});

test('the sentences of a broken view are the command line’s, for the shape, a relationship that does not exist and an unknown end', async () => {
  const page = await open();
  const make = (id, links) =>
    page.sandbox.createManifestEntry('view', {
      id,
      name: id,
      viewpoint: 'map',
      layer: 'application',
      properties: { links }
    });
  const problem = (id) => String(page.sandbox.viewProblem(page.sandbox.findSavedView(id)));
  make('shape', [{ source: 'customer', destination: 'shop.web.frontend', lable: 'x' }]);
  assert.match(
    problem('shape'),
    /`links\[0\]` is a mapping with `source`, `destination` and optionally `label`, and \{.*\} is not one/
  );
  make('missing', [
    entry('customer', 'shop.web.frontend', 'browses with'),
    entry('customer', 'shop.web.frontend', 'nope')
  ]);
  assert.match(
    problem('missing'),
    /`links\[1\]` names a relationship from `customer` to `shop\.web\.frontend` with the label `nope`, which does not exist/
  );
  make('nolabel', [entry('customer', 'shop.web.frontend')]);
  assert.match(
    problem('nolabel'),
    /`links\[0\]` names a relationship from `customer` to `shop\.web\.frontend` with no label, which does not exist/
  );
  make('dangling', [entry('nowhere', 'shop.web.frontend')]);
  assert.match(problem('dangling'), /dangling reference: nowhere/);
});

// ============================================================ write

test('the canonical properties put links after opened, sorted by key without repeats, and a highlight verbatim after them', () => {
  return startPage({ mem: true }).then((page) => {
    const properties = call(
      page,
      `canonicalViewProperties({ highlight: [${JSON.stringify(QUERIES)}], links: [${JSON.stringify(QUERIES)}, ${JSON.stringify(FRONTEND)}, ${JSON.stringify(
        entry('customer', 'shop.web.frontend', ' browses with ')
      )}], opened: ['shop'], pinned: ['customer'] })`
    );
    assert.deepEqual(Object.keys(properties), ['pinned', 'opened', 'links', 'highlight']);
    assert.deepEqual(
      properties.links.map((e) => keyOf(page, e)),
      [keyOf(page, FRONTEND), keyOf(page, QUERIES)].sort()
    );
    assert.deepEqual(properties.highlight, [QUERIES], 'verbatim');
    assert.deepEqual(
      call(page, 'Object.keys(canonicalViewProperties({ links: [], highlight: [] }))'),
      [],
      'empty lists are no choice'
    );
    assert.equal(properties.links.length, 2, 'a repeated entry, also after trimming, is written once');
    assert.ok(
      properties.links.every((e) => !e.label || e.label === e.label.trim()),
      'a label is written trimmed'
    );
  });
});

test('links and highlight are the Map of the application layer’s alone: another viewpoint and the technology layer take them out', async () => {
  const page = await open();
  const definition = (viewpoint, layer) =>
    call(
      page,
      `canonicalViewDefinition({ viewpoint: '${viewpoint}', layer: '${layer}', properties: { element: 'shop', links: [${JSON.stringify(FRONTEND)}], highlight: [${JSON.stringify(FRONTEND)}] } })`
    );
  assert.deepEqual(Object.keys(definition('overview', 'application').properties), ['element']);
  assert.deepEqual(Object.keys(definition('map', 'technology').properties), []);
  assert.deepEqual(Object.keys(definition('map', 'application').properties), ['links', 'highlight']);
});

test('VIEW_PROPERTY_ORDER writes links after opened and before the facet, and a highlight, which it does not know, last', async () => {
  const page = await open();
  const order = call(page, 'VIEW_PROPERTY_ORDER');
  assert.ok(order.indexOf('links') > order.indexOf('opened'));
  assert.ok(order.indexOf('links') < order.indexOf('facet'));
  assert.equal(order.includes('highlight'), false);
});

test('the screen is a view: the choice of the Map is in the definition of the diagram on screen, sorted', async () => {
  const page = await open();
  await page.go('map');
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([QUERIES, FRONTEND]) + ';');
  const definition = call(page, 'currentViewDefinition()');
  assert.deepEqual(
    definition.properties.links.map((e) => keyOf(page, e)),
    [keyOf(page, FRONTEND), keyOf(page, QUERIES)].sort()
  );
  run(page.sandbox, 'mapLinks = [];');
  assert.equal(
    'links' in call(page, 'currentViewDefinition()').properties,
    false,
    'a screen without a choice is the view as before'
  );
});

test('Keep as named view writes the links of the screen, and finds the view again when the screen is the same', async () => {
  const page = await open();
  await page.go('map');
  run(page.sandbox, 'mapLinks = ' + JSON.stringify([QUERIES, FRONTEND]) + ';');
  const kept = plain(run(page.sandbox, "viewForDefinition(currentViewDefinition(), 'Two links')"));
  assert.deepEqual(
    kept.properties.links.map((e) => keyOf(page, e)),
    [keyOf(page, FRONTEND), keyOf(page, QUERIES)].sort()
  );
  const again = plain(run(page.sandbox, "viewForDefinition(currentViewDefinition(), 'Other name')"));
  assert.equal(again.id, kept.id, 'one view, not two');
});

test('a view that has a highlight is the screen once applied (run 0200): Keep as named view finds it again; without the highlight the screen is another view', async () => {
  const page = await open();
  assert.equal(page.sandbox.applySavedView(view(page, 'web_links')), null);
  await page.show();
  assert.equal(page.sandbox.viewMatchesScreen(view(page, 'web_links')), true);
  const same = plain(run(page.sandbox, "viewForDefinition(currentViewDefinition(), 'Same')"));
  assert.equal(same.id, 'web_links', 'one view, not two');
  run(page.sandbox, 'mapHighlight = [];');
  assert.equal(page.sandbox.viewMatchesScreen(view(page, 'web_links')), false);
  const kept = plain(run(page.sandbox, "viewForDefinition(currentViewDefinition(), 'Without')"));
  assert.notEqual(kept.id, 'web_links');
  assert.equal('highlight' in kept.properties, false);
  assert.ok(Array.isArray(view(page, 'web_links').properties.highlight), 'and the first view keeps its highlight');
});

test('a step that carries its own recipe keeps the links when it is kept as a named view', async () => {
  const page = await open();
  const step = { viewpoint: 'map', layer: 'application', properties: { links: [FRONTEND], opened: ['shop'] } };
  const kept = plain(
    run(page.sandbox, `viewForDefinition(canonicalViewDefinition(${JSON.stringify(step)}), 'From a step')`)
  );
  assert.deepEqual(kept.properties.links, [FRONTEND]);
});

// ============================================================ the form

test('the form of a Map view has a Links field: a pill for each entry, missing ones marked, a remove button, and a select of the relationships not there yet', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  const right = page.right();
  assert.match(textOf(right), /Links/);
  const pills = Array.from(right.matchAll(/<span class="pill[^"]*" role="listitem"[^>]*>[\s\S]*?<\/span>/g), (m) =>
    textOf(m[0])
  );
  assert.ok(
    pills.some((p) => /customer\s*→\s*shop\.web\.frontend\s*:\s*browses with/.test(p)),
    pills.join(' | ')
  );
  assert.ok(pills.some((p) => /shop\.web\.api\s*→\s*shop\.catalog\.service\s*:\s*queries/.test(p)));
  assert.match(right, /data-action="view-link-remove" data-key="/);
  const select = /<select[^>]*id="view-edit-add-links"[^>]*>([\s\S]*?)<\/select>/.exec(right);
  assert.ok(select, 'a select to add a relationship');
  assert.doesNotMatch(
    select[1],
    /shop\.catalog\.service/,
    'the ones already there are not offered again, so the first option is a prompt or a later relationship'
  );
  assert.match(textOf(select[1]), /charges with/);
});

test('a pill of an entry that names no relationship is marked like a pill whose element is gone', async () => {
  const page = await open();
  page.sandbox.createManifestEntry('view', {
    id: 'gone',
    name: 'gone',
    viewpoint: 'map',
    layer: 'application',
    properties: {
      facet: 'rest-only',
      links: [
        entry('customer', 'shop.web.frontend', 'browses with'),
        entry('customer', 'shop.web.frontend', 'no such label')
      ]
    }
  });
  await openViewPage(page, 'gone');
  assert.match(page.right(), /class="pill pill-missing"[^>]*>[\s\S]*?no such label/);
});

test('adding a relationship from the select writes the entry; adding one that is not a relationship, or is already there, writes nothing', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  await change(page, { id: 'view-edit-add-links', 'data-view-link': 'add' }, { value: keyOf(page, PAYMENTS) });
  assert.deepEqual(
    plain(view(page, 'web_links').properties.links).map((e) => keyOf(page, e)),
    [keyOf(page, QUERIES), keyOf(page, FRONTEND), keyOf(page, PAYMENTS)],
    'appended to the list, in the order of the file'
  );
  assert.equal(
    page.sandbox.setViewLink(view(page, 'web_links'), entry('customer', 'shop.web.frontend', 'nope'), true),
    false
  );
  assert.equal(page.sandbox.setViewLink(view(page, 'web_links'), PAYMENTS, true), false, 'already there');
  assert.equal(view(page, 'web_links').properties.links.length, 3);
});

test('removing a relationship takes the entry out, and the last one takes the key out', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  click(page.sandbox, { 'data-action': 'view-link-remove', 'data-key': keyOf(page, QUERIES) });
  await page.drawn().catch(() => null);
  assert.deepEqual(plain(view(page, 'web_links').properties.links), [FRONTEND]);
  click(page.sandbox, { 'data-action': 'view-link-remove', 'data-key': keyOf(page, FRONTEND) });
  await page.drawn().catch(() => null);
  assert.equal('links' in view(page, 'web_links').properties, false);
  assert.deepEqual(plain(view(page, 'web_links').properties.highlight), [QUERIES], 'the highlight stays');
});

test('the layer and the viewpoint of a view drop links and highlight with the other keys of the Map', async () => {
  const page = await open();
  const copy = () => JSON.parse(JSON.stringify(view(page, 'web_links')));
  const toTechnology = copy();
  assert.equal(page.sandbox.setViewLayer(toTechnology, 'technology'), true);
  assert.deepEqual(
    Object.keys(toTechnology.properties).filter((k) => k === 'links' || k === 'highlight'),
    []
  );
  const toOverview = copy();
  assert.equal(page.sandbox.setViewViewpoint(toOverview, 'overview'), true);
  assert.deepEqual(
    Object.keys(toOverview.properties).filter((k) => k === 'links' || k === 'highlight'),
    []
  );
  const same = copy();
  assert.equal(page.sandbox.setViewLayer(same, 'application'), false, 'the same layer changes nothing');
  assert.ok(same.properties.links && same.properties.highlight);
});

test('a highlight is kept through every edit in place', async () => {
  const page = await open();
  const v = view(page, 'web_links');
  const highlight = JSON.parse(JSON.stringify(v.properties.highlight));
  assert.equal(page.sandbox.setViewListItem(v, 'pinned', 'customer', true), true);
  assert.equal(page.sandbox.setViewListItem(v, 'hidden', 'mailer', true), true);
  page.sandbox.setViewFacet(v, 'rest-only');
  page.sandbox.setViewHideUnlinked(v, true);
  page.sandbox.setViewShow(v, 'labels', true);
  page.sandbox.setViewLink(v, PAYMENTS, true);
  page.sandbox.setViewLink(v, PAYMENTS, false);
  assert.deepEqual(plain(v.properties.highlight), highlight);
});

// ============================================================ the save

test('the save writes the entry in the file with the comments, the flow entry and the highlight as they were', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  await change(page, { id: 'view-edit-add-links', 'data-view-link': 'add' }, { value: keyOf(page, PAYMENTS) });
  await page.sandbox.saveAllChanges();
  const text = page.mem.files.get('manifests/view.web_links.yaml').text;
  for (const line of [
    '    opened: [shop, shop.web, shop.catalog]',
    '      - source: shop.web.api   # the api',
    '        destination: shop.catalog.service',
    '        label: queries'
  ])
    assert.ok(text.includes(line), 'kept: ' + line);
  assert.ok(text.includes('# the architecture review reads this one'));
  assert.ok(text.includes('# the web site and what it calls'));
  assert.ok(text.includes('{source: customer, destination: shop.web.frontend, label: "browses with"}'));
  assert.match(
    text,
    /destination: shop\.payments\s+label: charges with|\{[^}]*destination:\s*"?shop\.payments"?[^}]*\}/
  );
  assert.ok(
    text.indexOf('highlight:') > text.indexOf('shop.payments'),
    'the new entry is in links, above the highlight'
  );
  assert.equal(
    text.slice(text.indexOf('highlight:')),
    VIEW_FILE.slice(VIEW_FILE.indexOf('highlight:')),
    'the highlight is byte for byte as it was'
  );
});

test('a view without links is written as before: an edit changes its lines and no other', async () => {
  const page = await open();
  await openViewPage(page, 'plain_map');
  await change(
    page,
    { id: 'view-edit-add-hidden', 'data-view-list': 'hidden' },
    { tagName: 'INPUT', type: 'text', value: 'mailer' }
  );
  await page.sandbox.saveAllChanges();
  const text = page.mem.files.get('manifests/view.plain_map.yaml').text;
  assert.doesNotMatch(text, /links|highlight/);
  for (const line of PLAIN_FILE.split('\n')) assert.ok(text.includes(line), 'kept: ' + line);
  assert.match(text, /hidden:/);
});

test('the file written is read again by the editor and draws the same boxes', async () => {
  const page = await open();
  await openViewPage(page, 'web_links');
  await change(page, { id: 'view-edit-add-links', 'data-view-link': 'add' }, { value: keyOf(page, PAYMENTS) });
  const drawn = boxIdsOf(page.scene().html);
  await page.sandbox.saveAllChanges();
  const again = await startPage({ only: Object.fromEntries(Array.from(page.mem.files, ([p, f]) => [p, f.text])) });
  await openViewPage(again, 'web_links');
  assert.deepEqual(boxIdsOf(again.scene().html), drawn);
  assert.ok(linkPairsOf(again.scene().html).includes('shop.web.api -> shop.payments'));
});
