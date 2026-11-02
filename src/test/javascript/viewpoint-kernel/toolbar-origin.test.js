'use strict';
// Wave 030, run 0218 (W-8, #194, TDD-0218 DEC-3, DEC-2, TG-1, TG-2): the origin of a diagram, the one key setter that *Open on diagram* and *Reset* share, and the one test "the diagram differs from
// its origin". Written first, red: none of these functions exists yet. The names are those of DEC-3 and CTR-3:
//   - `diagramOrigin`: null, or `{ perspective, element, name, properties }`, session state written by `applySavedView` and by nothing else;
//   - `currentDiagramOrigin()`: the origin while the page and the selected element are those it recorded, else null (and forgotten);
//   - `toolbarKeysOf(properties)`: the toolbar's subset of a canonical view's properties (opened, facet, hide-unlinked, applications, relationships, the four texts, layout);
//   - `applyToolbarKeys(properties, layer)`: sets the keys of the toolbar from such a subset (`{}` is the defaults) for the Map of `layer`, and never the scale, the centre, Changes only, the pins,
//     the hidden boxes, `links`, `highlight` or the selection; a facet the workspace does not define is dropped;
//   - `diagramDiffersFromOrigin()`: the toolbar subset of `currentViewDefinition()` is not the origin's (the defaults when there is none), compared as JSON text.
// The page is the real one over the layered Brightcart, with no drawing: these functions read and write state.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { run, plain, startPage } = require('./library-page');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const TOOLBAR_KEYS = [
  'opened',
  'facet',
  'hide-unlinked',
  'applications',
  'relationships',
  'labels',
  'qualifiers',
  'descriptions',
  'wrap',
  'layout'
];
const NOT_TOOLBAR = ['element', 'pinned', 'hidden', 'links', 'highlight'];

async function pageOn(perspective) {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
  page.sandbox.drawPlateau('marketplace', { compare: 'past' }); // the plateau that holds the elements the views name
  run(page.sandbox, 'diagramMaximized = false;');
  if (perspective) page.sandbox.setPerspective(perspective);
  return page;
}

/** A function of the page, or a failure that names it: the test is red because the function is not written, not because of a syntax error. */
function fn(sandbox, name) {
  assert.equal(
    run(sandbox, 'typeof ' + name),
    'function',
    'view-recipe.js defines no ' + name + '() (TDD-0218 DEC-3: the origin of a diagram and the toolbar keys)'
  );
  return (...args) => sandbox[name](...args);
}

const mapView = (extra) => ({
  id: 'v_map',
  name: 'My map',
  viewpoint: 'map',
  layer: 'application',
  properties: Object.assign(
    {
      opened: ['commerce'],
      pinned: ['commerce'],
      hidden: ['mailer'],
      'hide-unlinked': true,
      facet: 'journey',
      labels: true,
      layout: { columns: 3 }
    },
    extra
  )
});
const technologyView = () => ({
  id: 'v_tech',
  name: 'My environments',
  viewpoint: 'map',
  layer: 'technology',
  properties: { opened: ['prod'], applications: false, qualifiers: true }
});
const elementView = () => ({
  id: 'v_element',
  name: 'My element',
  viewpoint: 'overview',
  layer: 'application',
  properties: { element: 'commerce', 'hide-unlinked': true, wrap: true }
});

const stateOf = (page) =>
  plain(
    run(
      page.sandbox,
      `({ hideUnlinked: diagramHideUnlinked, facet: diagramFacet, columns: diagramColumns, show: diagramShow, parts: technologyMapParts,
          opened: Array.from(mapStateOf('application').opened || []).sort(), technologyOpened: Array.from(technologyMapState.opened || []).sort() })`
    )
  );
const sparedBy = (page) =>
  plain(
    run(
      page.sandbox,
      `({ changesOnly: AppState.changesOnly, scale: diagramScale, center: diagramCenter, pinned: mapStateOf('application').pinned,
          hidden: mapStateOf('application').hidden, links: mapLinks, highlight: mapHighlight, selection: AppState.selection })`
    )
  );

test('the functions of DEC-3 exist, by their names', async () => {
  const { sandbox } = await pageOn('map');
  for (const name of ['toolbarKeysOf', 'applyToolbarKeys', 'diagramDiffersFromOrigin', 'currentDiagramOrigin'])
    fn(sandbox, name);
  assert.notEqual(run(sandbox, 'typeof diagramOrigin'), 'undefined', 'no diagramOrigin: the session variable of CTR-3');
  assert.equal(run(sandbox, 'diagramOrigin'), null, 'there is no origin before a view is opened');
});

test('toolbarKeysOf keeps the keys of the toolbar of a canonical view and drops the others', async () => {
  const { sandbox } = await pageOn('map');
  const toolbarKeysOf = fn(sandbox, 'toolbarKeysOf');
  const canonical = plain(
    run(sandbox, 'canonicalViewDefinition(' + JSON.stringify(mapView({ qualifiers: true })) + ')')
  ).properties;
  const keys = plain(toolbarKeysOf(canonical));
  for (const key of ['opened', 'facet', 'hide-unlinked', 'layout'])
    assert.ok(key in keys, key + ' is a key of the toolbar');
  for (const key of Object.keys(keys)) assert.ok(TOOLBAR_KEYS.includes(key), key + ' is not a key of the toolbar');
  for (const key of NOT_TOOLBAR) assert.ok(!(key in keys), key + " is not the toolbar's: Reset does not restore it");
  for (const key of Object.keys(keys))
    assert.deepEqual(keys[key], canonical[key], key + ' is kept as the canonical view has it');
  assert.deepEqual(plain(toolbarKeysOf({})), {}, 'no property, no key');
});

test('applySavedView records the origin: the page, the element, the name and the toolbar keys of the view, nothing else', async () => {
  for (const [label, view, perspective, element] of [
    ['a Map of the application layer', mapView(), 'map', ''],
    ['a Map of the technology layer', technologyView(), 'environments', ''],
    ['an element', elementView(), 'elements', 'commerce']
  ]) {
    const page = await pageOn('map');
    const currentDiagramOrigin = fn(page.sandbox, 'currentDiagramOrigin');
    fn(page.sandbox, 'toolbarKeysOf');
    assert.equal(page.sandbox.applySavedView(view), null, label + ': the view applies');
    const origin = plain(currentDiagramOrigin());
    assert.ok(origin, label + ': the origin is recorded');
    assert.deepEqual(
      Object.keys(origin).sort(),
      ['element', 'name', 'perspective', 'properties'],
      label + ': the fields of CTR-3'
    );
    assert.equal(origin.perspective, perspective, label + ': the page the view drew');
    assert.equal(origin.element, element, label + ': the selected element of an element view, else empty');
    assert.equal(origin.name, view.name, label + ': the name of the view');
    const canonical = plain(run(page.sandbox, 'canonicalViewDefinition(' + JSON.stringify(view) + ')')).properties;
    assert.deepEqual(
      origin.properties,
      plain(page.sandbox.toolbarKeysOf(canonical)),
      label + ': the toolbar subset of the canonical view'
    );
    for (const key of NOT_TOOLBAR) assert.ok(!(key in origin.properties), label + ': ' + key + ' is not in the origin');
    assert.equal(
      run(page.sandbox, 'JSON.stringify(diagramOrigin)'),
      JSON.stringify(origin),
      label + ': the session variable is the origin'
    );
    // nothing of it leaves the session: not the address, not the view
    assert.ok(
      !page.sandbox.currentRouteHash().includes(encodeURIComponent(view.name)),
      label + ': the name is not in the address'
    );
  }
});

test('diagramDiffersFromOrigin is false on the origin, true after a change in Draw, Texts or Layout, false again once the origin is put back, and blind to what Reset does not restore', async () => {
  const page = await pageOn('map');
  const { sandbox } = page;
  const differs = fn(sandbox, 'diagramDiffersFromOrigin');
  assert.equal(sandbox.applySavedView(mapView()), null);
  assert.equal(differs(), false, 'right after the view is applied the diagram is its origin');
  const origin = plain(sandbox.currentDiagramOrigin());
  const changes = {
    'Hide unlinked (Draw)': 'diagramHideUnlinked = !diagramHideUnlinked;',
    'the Facet (Draw)': 'diagramFacet = null;',
    'what is opened (Draw)': "mapStateOf('application').opened.add('mailer');",
    'a text (Texts)': 'diagramShow.wrap = !diagramShows(true).wrap;',
    'the columns (Layout)': 'diagramColumns = 5;'
  };
  for (const [what, code] of Object.entries(changes)) {
    run(sandbox, code);
    assert.equal(differs(), true, what + ' changed: the diagram differs from its origin');
    sandbox.applyToolbarKeys(origin.properties, 'application');
    assert.equal(differs(), false, what + ': the origin put back, the diagram equals it again');
  }
  // what the toolbar leaves alone does not count: pins, hidden boxes, Changes only, the zoom
  run(
    sandbox,
    "mapStateOf('application').pinned = ['payments']; mapStateOf('application').hidden = []; AppState.changesOnly = true; diagramScale = 2;"
  );
  assert.equal(differs(), false, "a pin, a hidden box, Changes only and the zoom are not the toolbar's keys");
});

test('with no origin the defaults are the origin: false on a clean page, true after a change, false once applyToolbarKeys({}) has put the defaults back', async () => {
  for (const [perspective, layer] of [
    ['map', 'application'],
    ['environments', 'technology']
  ]) {
    const page = await pageOn(perspective);
    const { sandbox } = page;
    const differs = fn(sandbox, 'diagramDiffersFromOrigin');
    assert.equal(sandbox.currentDiagramOrigin(), null, layer + ': no origin');
    assert.equal(differs(), false, layer + ': a diagram opened with no view is its own defaults');
    const clean = stateOf(page);
    run(
      sandbox,
      "diagramHideUnlinked = true; diagramFacet = 'journey'; diagramColumns = 4; diagramShow.labels = true;"
    );
    run(
      sandbox,
      "mapStateOf('" + layer + "').opened = new Set(['" + (layer === 'technology' ? 'prod' : 'commerce') + "']);"
    );
    assert.equal(differs(), true, layer + ': the changes differ from the defaults');
    sandbox.applyToolbarKeys({}, layer);
    assert.equal(differs(), false, layer + ': the defaults put back');
    assert.deepEqual(stateOf(page), clean, layer + ': the state is the clean state');
  }
});

test('applyToolbarKeys sets the keys of the toolbar for the layer of the page, and never what the toolbar leaves alone', async () => {
  const page = await pageOn('map');
  const { sandbox } = page;
  const applyToolbarKeys = fn(sandbox, 'applyToolbarKeys');
  run(
    sandbox,
    "mapStateOf('application').pinned = ['commerce']; mapStateOf('application').hidden = ['mailer']; AppState.changesOnly = true; diagramScale = 2; diagramCenter = { x: 3, y: 4 };"
  );
  const spared = sparedBy(page);
  applyToolbarKeys(
    { opened: ['commerce'], facet: 'journey', 'hide-unlinked': true, wrap: true, labels: true, layout: { columns: 3 } },
    'application'
  );
  let state = stateOf(page);
  assert.deepEqual(state.opened, ['commerce'], 'opened');
  assert.equal(state.facet, 'journey', 'facet');
  assert.equal(state.hideUnlinked, true, 'hide-unlinked');
  assert.equal(state.columns, 3, 'layout.columns');
  assert.equal(state.show.wrap, true, 'a text');
  assert.equal(state.show.labels, true, 'a text');
  assert.equal(state.show.qualifiers, null, 'a text the keys do not give is not chosen');
  assert.deepEqual(
    sparedBy(page),
    spared,
    'the pins, the hidden boxes, links, highlight, Changes only, the zoom, the centre and the selection are not touched'
  );
  // the technology layer's own opened and parts
  applyToolbarKeys({ opened: ['prod'], applications: false }, 'technology');
  state = stateOf(page);
  assert.deepEqual(state.technologyOpened, ['prod'], 'the opened boxes of the technology Map');
  assert.deepEqual(
    state.parts,
    { applications: false, relationships: true },
    'what the view says false is left out, the rest is drawn'
  );
  assert.equal(state.facet, null, 'the keys of the call are the keys: a facet not given is none');
  assert.equal(state.hideUnlinked, false, 'a key not given is its default');
  assert.deepEqual(state.opened, ['commerce'], "the application layer is another layer: its opened is not the call's");
  // the defaults
  applyToolbarKeys({}, 'application');
  applyToolbarKeys({}, 'technology');
  state = stateOf(page);
  assert.deepEqual(
    state,
    {
      hideUnlinked: false,
      facet: null,
      columns: null,
      show: { labels: null, qualifiers: null, descriptions: null, wrap: null },
      parts: { applications: true, relationships: true },
      opened: [],
      technologyOpened: []
    },
    'no keys is the defaults, and clears the opened boxes of the layer'
  );
  assert.deepEqual(sparedBy(page), spared, 'the defaults leave what the toolbar leaves alone');
  // a facet the workspace does not define is dropped, as applySavedView did
  applyToolbarKeys({ facet: 'no-such-facet', 'hide-unlinked': true }, 'application');
  state = stateOf(page);
  assert.equal(state.facet, null, 'a facet the workspace lacks is dropped');
  assert.equal(state.hideUnlinked, true, 'the other keys are applied');
});

test('applySavedView and Reset go through applyToolbarKeys, the one key setter (TG-2)', async () => {
  const page = await pageOn('map');
  const { sandbox } = page;
  fn(sandbox, 'applyToolbarKeys');
  run(
    sandbox,
    `globalThis.__calls = [];
     (function () {
       const real = applyToolbarKeys;
       applyToolbarKeys = function (properties, layer) {
         globalThis.__calls.push({ properties: JSON.parse(JSON.stringify(properties)), layer });
         return real.apply(this, arguments);
       };
     })();`
  );
  assert.equal(sandbox.applySavedView(mapView()), null);
  const calls = plain(run(sandbox, '__calls'));
  assert.equal(calls.length, 1, 'applySavedView sets the keys of the toolbar through applyToolbarKeys, once');
  assert.equal(calls[0].layer, 'application', 'with the layer of the view');
  assert.deepEqual(
    calls[0].properties,
    plain(sandbox.currentDiagramOrigin()).properties,
    'with the keys it records as the origin'
  );
});

test('the origin is forgotten when the page or the selected element is not the one it recorded, whoever changed them, and is read nowhere but through currentDiagramOrigin', async () => {
  const page = await pageOn('map');
  const { sandbox } = page;
  const currentDiagramOrigin = fn(sandbox, 'currentDiagramOrigin');
  assert.equal(sandbox.applySavedView(mapView()), null);
  assert.ok(currentDiagramOrigin(), 'recorded');
  run(sandbox, "currentPerspective = 'elements';");
  assert.equal(currentDiagramOrigin(), null, 'another page: no origin');
  run(sandbox, "currentPerspective = 'map';");
  assert.equal(currentDiagramOrigin(), null, 'back on the page: the origin was forgotten when it was read away');
  assert.equal(run(sandbox, 'diagramOrigin'), null, 'and the variable is null');
  assert.equal(sandbox.applySavedView(elementView()), null);
  assert.equal(currentDiagramOrigin().element, 'commerce', 'an element view records its element');
  run(sandbox, "AppState.selection = { kind: 'element', key: 'commerce.cart', layer: 'application', mode: 'view' };");
  assert.equal(currentDiagramOrigin(), null, 'another element: no origin');
  // the differ test, with no origin, reads the defaults
  sandbox.applyToolbarKeys({}, 'application');
  assert.equal(
    fn(sandbox, 'diagramDiffersFromOrigin')(),
    false,
    'a diagram with no origin and the keys of the defaults does not differ'
  );
});
