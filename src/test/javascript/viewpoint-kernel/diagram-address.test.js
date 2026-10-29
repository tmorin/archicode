'use strict';
// Wave 027, run 0203 (W-3, issue #178), TDD DEC-1 to DEC-6, VER-1, VER-2, VER-3; PRD-less requirements REQ-1 to REQ-5 (RFC-001 DEC-2): a link copied from the address bar of a diagram
// surface draws, for another reader of the same files, the same boxes and links. The rule: an option is in the address when it changes which boxes and links are drawn, or where; never
// when it changes only the surroundings (the wording toggle, the key, zoom and pan, the selection of a box are the exceptions).
// The four surfaces are the page of an element (overview, detailed, deep), the Map of the application layer, the Map of the technology layer and the page of a saved view, all on the layered
// Brightcart, at the plateau marketplace unless a case says otherwise. Page A sets one option and takes `currentRouteHash()`; page B, a fresh page on the same files, opens that hash; B must
// draw the same boxes and links, hold the same view state, and write the same hash (a fixed point). The first assertion of each case names the parameter the address lacks.
// Written first, red: the page writes and reads none of `layout`, `changes-only`, `open`, `hide`, and writes `compare` only with a removed element.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const {
  REPO,
  BRIGHTCART,
  run,
  plain,
  click,
  openWorkspace,
  boxIdsOf,
  linkPairsOf,
  entry
} = require('../map-links-support');

const NO_PLATEAUS = path.join(REPO, 'src/doc/examples/domain_technology_map');

/** The surfaces that draw a diagram and are written from the address. `tags` say which options exist on each. */
const SURFACES = {
  'element overview': { path: '/timeline/elements?ref=fulfilment&tab=overview', tags: ['element', 'diagram'] },
  'element detailed': { path: '/timeline/elements?ref=fulfilment&tab=detailed', tags: ['element', 'diagram'] },
  'element deep': { path: '/timeline/elements?ref=fulfilment.sync&tab=deep', tags: ['element', 'diagram'] },
  'application map': { path: '/timeline/applications', tags: ['map', 'appmap', 'diagram'], layer: 'application' },
  'technology map': { path: '/timeline/environments', tags: ['map', 'techmap', 'diagram'], layer: 'technology' },
  'saved view': { path: '/stories/views?view=applications_map', tags: ['view'] }
};
const addressOf = (surface, plateau) =>
  SURFACES[surface].path +
  (plateau && plateau !== 'baseline' ? (SURFACES[surface].path.includes('?') ? '&' : '?') + 'plateau=' + plateau : '');

/** A fresh page on the layered Brightcart that opens `hash` (without the `#`), the way a reader who follows a link does. */
async function visit(hash, dir) {
  const page = await openWorkspace(dir || BRIGHTCART, undefined);
  await applyAddress(page, hash);
  return page;
}

/** What a hash change does: the address is read, the page is drawn. */
async function applyAddress(page, hash) {
  page.sandbox.location.hash = '#' + hash;
  page.sandbox.syncPerspectiveFromHash();
  await page.show();
}

/** The boxes, the links and the classes (the states) of what is on the canvas. */
function drawing(page) {
  const scene = page.scene();
  if (!scene || !scene.html) return null;
  return {
    boxes: boxIdsOf(scene.html),
    links: linkPairsOf(scene.html),
    classes: Array.from(scene.html.matchAll(/<g class="(dg-(?:node|link)[^"]*)"/g), (m) => m[1]).sort()
  };
}

const sortedEntries = (list) => list.map((e) => [e.source, e.destination, e.label || null]).sort();

/** The view state the address stands for, read from the page. */
function stateOf(page, surface) {
  const isMap = SURFACES[surface].tags.includes('map');
  const state = plain(
    run(
      page.sandbox,
      `({ plateau: AppState.layers.current, compare: layerCompareChoice(), changesOnly: AppState.changesOnly, columns: diagramColumns,
        facet: diagramFacet, hideUnlinked: diagramHideUnlinked, shows: diagramShows(${isMap}), parts: technologyMapParts })`
    )
  );
  if (isMap) {
    const map = plain(
      run(
        page.sandbox,
        `(() => { const s = mapStateOf(); return { opened: Array.from(s.opened || []).sort(), hidden: Array.from(s.hidden || []).sort(), pinned: Array.from(s.pinned || []).sort() }; })()`
      )
    );
    Object.assign(state, map);
    if (SURFACES[surface].layer === 'application')
      state.links = sortedEntries(plain(run(page.sandbox, 'mapLinks'))).concat(
        ['highlight'],
        sortedEntries(plain(run(page.sandbox, 'mapHighlight')))
      );
  }
  return state;
}

/** A relationship of the application layer, as an entry of `rel=` and `hl=`. */
function someRelationship(page) {
  const found = plain(
    run(
      page.sandbox,
      `(() => { for (const r of AppState.index.application.values()) if (r.relationships.length) return { source: r.reference, destination: r.relationships[0].destination, label: r.relationships[0].rawLabel }; return null; })()`
    )
  );
  assert.ok(found, 'the layered Brightcart has a relationship');
  return found.label === null
    ? entry(found.source, found.destination)
    : entry(found.source, found.destination, found.label);
}

const OPEN_REFS = { application: ['commerce', 'orders'], technology: ['prod', 'prod.cloud'] };
const HIDE_REFS = { application: ['mailer'], technology: ['partners'] };
const PIN_REFS = { application: 'commerce.cart', technology: 'prod.dc' };

/**
 * The options. `params` are the patterns the address must hold (the missing one is named in the failure); `set` puts the option on page A.
 * `plateau` is the plateau A is opened at (default marketplace).
 */
const OPTIONS = [
  {
    name: 'layout',
    on: ['element', 'map'],
    params: [/[?&]layout=3(&|$)/],
    set: (page) => run(page.sandbox, 'diagramColumns = 3;')
  },
  {
    name: 'changes-only',
    on: ['diagram', 'view'],
    params: [/[?&]compare=past(&|$)/, /[?&]changes-only=1(&|$)/],
    set: (page) => {
      page.sandbox.drawPlateau('marketplace', { compare: 'past' });
      run(page.sandbox, 'AppState.changesOnly = true;');
    }
  },
  {
    name: 'compare past',
    on: ['diagram', 'view'],
    params: [/[?&]compare=past(&|$)/],
    set: (page) => page.sandbox.drawPlateau('marketplace', { compare: 'past' })
  },
  {
    name: 'compare future',
    on: ['diagram', 'view'],
    plateau: 'baseline',
    params: [/[?&]compare=future(&|$)/],
    set: (page) => page.sandbox.drawPlateau('baseline', { compare: 'future' })
  },
  {
    name: 'compare future:<id>',
    on: ['diagram', 'view'],
    plateau: 'baseline',
    params: [/[?&]compare=future%3Amarketplace(&|$)|[?&]compare=future:marketplace(&|$)/],
    set: (page) => page.sandbox.drawPlateau('baseline', { compare: 'future:marketplace' })
  },
  {
    name: 'compare other:<id>',
    on: ['diagram', 'view'],
    params: [/[?&]compare=other%3Asaas(&|$)|[?&]compare=other:saas(&|$)/],
    set: (page) => page.sandbox.drawPlateau('marketplace', { compare: 'other:saas' })
  },
  { name: 'compare empty', on: ['diagram', 'view'], params: [/[?&]compare=(&|$)/], set: () => {} },
  {
    name: 'open',
    on: ['map'],
    params: (surface) => [new RegExp('[?&]open=' + OPEN_REFS[SURFACES[surface].layer].join(',') + '(&|$)')],
    set: (page, surface) =>
      run(page.sandbox, `mapStateOf().opened = new Set(${JSON.stringify(OPEN_REFS[SURFACES[surface].layer])});`)
  },
  {
    name: 'hide',
    on: ['map'],
    params: (surface) => [new RegExp('[?&]hide=' + HIDE_REFS[SURFACES[surface].layer].join(',') + '(&|$)')],
    set: (page, surface) =>
      click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': HIDE_REFS[SURFACES[surface].layer][0] })
  },
  {
    name: 'pin',
    on: ['map'],
    params: (surface) => [new RegExp('[?&]pin=' + PIN_REFS[SURFACES[surface].layer].replace('.', '\\.') + '(&|$)')],
    set: (page, surface) =>
      click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': PIN_REFS[SURFACES[surface].layer] })
  },
  {
    name: 'rel',
    on: ['appmap'],
    params: [/[?&]rel=/],
    set: (page) => run(page.sandbox, 'mapLinks = ' + JSON.stringify([someRelationship(page)]) + ';')
  },
  {
    name: 'hl',
    on: ['appmap'],
    params: [/[?&]hl=/],
    set: (page) => run(page.sandbox, 'mapHighlight = ' + JSON.stringify([someRelationship(page)]) + ';')
  },
  {
    name: 'facet',
    on: ['element', 'map'],
    params: [/[?&]facet=journey(&|$)/],
    set: (page) => run(page.sandbox, 'diagramFacet = "journey";')
  },
  {
    name: 'hide-unlinked',
    on: ['element', 'map'],
    params: [/[?&]hide-unlinked=1(&|$)/],
    set: (page) => run(page.sandbox, 'diagramHideUnlinked = true;')
  },
  {
    name: 'applications=0',
    on: ['techmap'],
    params: [/[?&]applications=0(&|$)/],
    set: (page) => run(page.sandbox, 'technologyMapParts = { applications: false, relationships: true };')
  },
  {
    name: 'relationships=0',
    on: ['techmap'],
    params: [/[?&]relationships=0(&|$)/],
    set: (page) => run(page.sandbox, 'technologyMapParts = { applications: true, relationships: false };')
  }
];
// the four texts: the opposite of what the diagram starts with (an element's diagram starts with labels and qualifiers, the Map with none)
for (const name of ['labels', 'qualifiers', 'descriptions', 'wrap'])
  OPTIONS.push({
    name,
    on: ['element', 'map'],
    params: (surface) => [
      new RegExp(
        '[?&]' +
          name +
          '=' +
          (SURFACES[surface].tags.includes('map') ? '1' : name === 'labels' || name === 'qualifiers' ? '0' : '1') +
          '(&|$)'
      )
    ],
    set: (page, surface) => {
      const isMap = SURFACES[surface].tags.includes('map');
      const on = isMap ? true : name === 'labels' || name === 'qualifiers' ? false : true;
      run(page.sandbox, `setDiagramShow({ ${name}: ${on} });`);
    }
  });

/** Options with no tag match on a surface are skipped; an option may be on several tags (any one). */
const appliesTo = (option, surface) => option.on.some((tag) => SURFACES[surface].tags.includes(tag));

for (const option of OPTIONS)
  for (const surface of Object.keys(SURFACES).filter((name) => appliesTo(option, name))) {
    test(`${option.name} on the ${surface}: the address written is read back into the same drawing, and written again`, async () => {
      const plateau = option.plateau || 'marketplace';
      const a = await visit(addressOf(surface, plateau));
      const before = drawing(a);
      assert.ok(before && before.boxes.length > 0, 'the surface draws something before the option is set');
      await option.set(a, surface);
      await a.show();
      const hash = a.sandbox.currentRouteHash();
      const wanted = typeof option.params === 'function' ? option.params(surface) : option.params;
      for (const pattern of wanted)
        assert.match(hash, pattern, `the address lacks the parameter ${pattern} for ${option.name}: ${hash}`);
      const b = await visit(hash);
      assert.deepEqual(stateOf(b, surface), stateOf(a, surface), `B holds the view state A had (${hash})`);
      assert.deepEqual(drawing(b), drawing(a), `B draws what A drew (${hash})`);
      assert.equal(b.sandbox.currentRouteHash(), hash, 'B writes the address it was given (a fixed point)');
    });
  }

for (const surface of Object.keys(SURFACES)) {
  test(`${surface}: an option at its default writes no parameter, and a layered workspace says the comparison is none`, async () => {
    const page = await visit(addressOf(surface, 'marketplace'));
    const hash = page.sandbox.currentRouteHash();
    assert.doesNotMatch(hash, /[?&](layout|changes-only|open|hide)=/, hash);
    assert.match(hash, /[?&]compare=(&|$)/, 'a layered workspace writes compare= (empty for none), see DEC-3: ' + hash);
  });
}

test('a workspace without plateaus writes no compare and no changes-only, whatever the flag is, and still writes layout', async () => {
  for (const route of ['/timeline/applications', '/timeline/environments']) {
    const page = await visit(route, NO_PLATEAUS);
    run(page.sandbox, 'AppState.changesOnly = true; diagramColumns = 3;');
    await page.show();
    const hash = page.sandbox.currentRouteHash();
    assert.doesNotMatch(hash, /compare=|changes-only=/, hash);
    assert.match(hash, /[?&]layout=3(&|$)/, 'layout is written on a workspace without plateaus: ' + hash);
  }
});

test('changes-only is written only with a comparison on, and never as changes-only=0', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  run(page.sandbox, 'AppState.changesOnly = true;');
  await page.show();
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /changes-only=/, 'no comparison: the flag means nothing');
  page.sandbox.drawPlateau('marketplace', { compare: 'past' });
  run(page.sandbox, 'AppState.changesOnly = false;');
  await page.show();
  assert.doesNotMatch(page.sandbox.currentRouteHash(), /changes-only=/, 'a flag that is off writes nothing');
  run(page.sandbox, 'AppState.changesOnly = true;');
  await page.show();
  assert.match(page.sandbox.currentRouteHash(), /changes-only=1/);
});

test('the pages with no diagram and the Stories page with no view write none of the parameters of a diagram', async () => {
  // '/stories/views' is not here: the page selects a view by default, and the page of a saved view writes compare and changes-only (gap-006)
  for (const route of ['/stories', '/settings', '/files', '/timeline/plateaus']) {
    const page = await visit(route + (route.includes('?') ? '&' : '?') + 'plateau=marketplace');
    page.sandbox.drawPlateau('marketplace', { compare: 'past' });
    run(page.sandbox, 'AppState.changesOnly = true; diagramColumns = 3;');
    await page.show();
    assert.doesNotMatch(page.sandbox.currentRouteHash(), /[?&](layout|changes-only|open|hide|compare)=/, route);
  }
});

// RFC-001 DEC-2: the three exceptions (and the selection of a box) change the address by nothing that draws the diagram.
test('the wording toggle, the key, zoom, pan and the selection of a box change none of the parameters of the diagram', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  page.sandbox.drawPlateau('marketplace', { compare: 'past' });
  run(page.sandbox, 'AppState.changesOnly = true; diagramColumns = 3;');
  await page.show();
  const hash = page.sandbox.currentRouteHash();
  const drawn = (h) =>
    h
      .split('?')[1]
      .split('&')
      .filter((p) => !/^(ref|layer)=/.test(p))
      .join('&');
  for (const [what, code] of [
    ['the wording toggle', 'AppState.hideWording = true;'],
    ['the key', 'diagramKeyOpen = true;'],
    ['the zoom', 'diagramScale = 2;'],
    ['the pan', 'diagramCenter = { x: 40, y: 25 };'],
    [
      'the selection of a box',
      'AppState.selection = { kind: "element", key: "commerce", layer: "application", mode: "view" };'
    ]
  ]) {
    run(page.sandbox, code);
    assert.equal(drawn(page.sandbox.currentRouteHash()), drawn(hash), what + ' is not in the address');
  }
  assert.match(hash, /layout=3/, 'the reference address does carry the layout: ' + hash);
});

// VER-3: a reader whose browser remembers another Changes only and another comparison.
const remember = (page, changesOnly, comparison) => {
  run(page.sandbox, `rememberFlag('changes-only', ${changesOnly}); rememberComparison(${JSON.stringify(comparison)});`);
  run(
    page.sandbox,
    `AppState.changesOnly = ${changesOnly}; AppState.layers.compare = layerCompareFromChoice(${JSON.stringify(comparison)});`
  );
};

test('a reader with another memory draws the diagram of the address, and keeps their own remembered Changes only', async () => {
  const a = await visit(addressOf('application map', 'marketplace'));
  a.sandbox.drawPlateau('marketplace', { compare: 'past' });
  await a.show();
  const hash = a.sandbox.currentRouteHash(); // Changes only is off in A
  const b = await openWorkspace(BRIGHTCART, undefined);
  remember(b, true, 'other:saas');
  await applyAddress(b, hash);
  assert.deepEqual(drawing(b), drawing(a), 'B draws what A drew: ' + hash);
  assert.equal(run(b.sandbox, 'AppState.changesOnly'), false, 'the address has compare= and no changes-only: off in B');
  assert.equal(
    run(b.sandbox, "recalledFlag('changes-only')"),
    true,
    'B remembered flag is unchanged: an address is not a choice of the reader'
  );
  // what the code does for the comparison (gap-002): drawPlateau remembers the addressed comparison, as it always did for compare=
  assert.equal(run(b.sandbox, 'recalledComparison()'), 'past');
});

test('a reader whose flag is off draws Changes only when the address says so, without remembering it', async () => {
  const a = await visit(addressOf('application map', 'marketplace'));
  a.sandbox.drawPlateau('marketplace', { compare: 'past' });
  run(a.sandbox, 'AppState.changesOnly = true;');
  await a.show();
  const hash = a.sandbox.currentRouteHash();
  assert.match(hash, /changes-only=1/);
  const b = await openWorkspace(BRIGHTCART, undefined);
  remember(b, false, '');
  await applyAddress(b, hash);
  assert.deepEqual(drawing(b), drawing(a));
  assert.equal(run(b.sandbox, 'AppState.changesOnly'), true);
  assert.equal(run(b.sandbox, "recalledFlag('changes-only')"), false, 'not remembered from an address');
});

test('an address with no compare=, or an empty one, leaves the remembered flag as it is (the empty one clears the comparison)', async () => {
  const b = await openWorkspace(BRIGHTCART, undefined);
  remember(b, true, 'other:saas');
  await applyAddress(b, '/timeline/applications?plateau=marketplace');
  assert.equal(run(b.sandbox, 'AppState.changesOnly'), true, 'no compare=: the flag is as it was');
  assert.equal(run(b.sandbox, 'layerCompareChoice()'), 'other:saas', 'no compare=: the comparison is as it was');
  await applyAddress(b, '/timeline/applications?plateau=marketplace&compare=');
  assert.equal(
    run(b.sandbox, 'AppState.changesOnly'),
    true,
    'an empty compare= says no comparison, and the flag means nothing then: it is left'
  );
  assert.equal(run(b.sandbox, 'layerCompareChoice()'), '');
});

test('a tab click between the Maps, with Changes only on and no comparison, keeps the flag', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  run(page.sandbox, 'AppState.changesOnly = true;');
  for (const id of ['environments', 'map']) {
    page.sandbox.setPerspective(id);
    page.sandbox.syncPerspectiveFromHash(); // the hashchange of the browser
    await page.show();
  }
  assert.equal(run(page.sandbox, 'AppState.changesOnly'), true);
});

test('Settings or Stories visited and back leave the columns of the toolbar as the address of the diagram says', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  run(page.sandbox, 'diagramColumns = 4;');
  await page.show();
  for (const id of ['settings', 'library', 'map']) {
    page.sandbox.setPerspective(id);
    page.sandbox.syncPerspectiveFromHash();
    await page.show();
  }
  assert.match(
    page.sandbox.currentRouteHash(),
    /[?&]layout=4(&|$)/,
    'the address of the Map says the columns: ' + page.sandbox.currentRouteHash()
  );
  assert.equal(run(page.sandbox, 'diagramColumns'), 4);
});

test('a layout that is not a whole number from 1 to 20 is dropped, the toolbar value with it, and the address is written without it', async () => {
  for (const bad of ['0', '21', '1.5', 'abc', '', '-3', '4x']) {
    const page = await openWorkspace(BRIGHTCART, undefined);
    run(page.sandbox, 'diagramColumns = 5;');
    await applyAddress(page, '/timeline/applications?plateau=marketplace&layout=' + encodeURIComponent(bad));
    assert.equal(run(page.sandbox, 'diagramColumns'), null, `layout=${bad} names no columns`);
    assert.doesNotMatch(page.sandbox.currentRouteHash(), /layout=/, `layout=${bad} is written back without it`);
  }
  for (const good of ['1', '20']) {
    const page = await visit('/timeline/applications?plateau=marketplace&layout=' + good);
    assert.equal(run(page.sandbox, 'diagramColumns'), Number(good));
    assert.match(page.sandbox.currentRouteHash(), new RegExp('layout=' + good + '(&|$)'));
  }
});

test('an address that does not say layout, open, hide or pin resets them: a Map is what the address says', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  run(
    page.sandbox,
    'diagramColumns = 3; mapStateOf().opened = new Set(["commerce"]); mapStateOf().hidden = ["mailer"]; mapStateOf().pinned = ["orders"];'
  );
  await applyAddress(page, '/timeline/applications?plateau=marketplace');
  assert.equal(run(page.sandbox, 'diagramColumns'), null, 'layout');
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(mapStateOf().opened || [])')), [], 'open');
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(mapStateOf().hidden)')), [], 'hide');
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(mapStateOf().pinned)')), [], 'pin');
});

test('a reference that open= or hide= names and the layer lacks is dropped, and the address is written without it', async () => {
  const page = await visit('/timeline/applications?plateau=marketplace&open=nowhere,commerce&hide=ghost');
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(mapStateOf().opened)')), ['commerce']);
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(mapStateOf().hidden)')), []);
  const hash = page.sandbox.currentRouteHash();
  assert.match(hash, /[?&]open=commerce(&|$)/, hash);
  assert.doesNotMatch(hash, /nowhere|ghost|hide=/, hash);
});

test('an opened box of an element only the compared plateau has (a removed one) survives the round trip', async () => {
  const a = await visit('/timeline/applications?plateau=marketplace&compare=past');
  const boxesBefore = boxIdsOf(a.scene().html);
  assert.ok(boxesBefore.includes('shop') || boxesBefore.length > 0, 'the Map draws');
  run(a.sandbox, 'mapStateOf().opened = new Set(["shop", "shop.app"]);');
  await a.show();
  const opened = boxIdsOf(a.scene().html);
  assert.ok(
    opened.includes('shop.app'),
    'the removed container is drawn, as a ghost of the compared plateau: ' + opened.join(',')
  );
  const hash = a.sandbox.currentRouteHash();
  assert.match(hash, /[?&]open=shop,shop\.app(&|$)/, 'the address lacks open= with the removed box: ' + hash);
  const b = await visit(hash);
  assert.deepEqual(boxIdsOf(b.scene().html), opened);
  assert.equal(b.sandbox.currentRouteHash(), hash);
});

test('Back and Forward restore the pins, the hidden elements, the open boxes, the columns and Changes only', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  page.sandbox.drawPlateau('marketplace', { compare: 'past' });
  run(
    page.sandbox,
    'AppState.changesOnly = true; diagramColumns = 3; mapStateOf().opened = new Set(["commerce", "orders"]); mapStateOf().hidden = ["mailer"];'
  );
  await page.show();
  const first = page.sandbox.currentRouteHash();
  const stateFirst = stateOf(page, 'application map');
  const drawnFirst = drawing(page);
  // another entry of the history: the bare Map, then Back to the first
  await applyAddress(page, '/timeline/applications?plateau=marketplace&compare=past');
  assert.notDeepEqual(stateOf(page, 'application map'), stateFirst, 'the second address is another state');
  await applyAddress(page, first);
  assert.deepEqual(stateOf(page, 'application map'), stateFirst, 'Back restores the view state (' + first + ')');
  assert.deepEqual(drawing(page), drawnFirst);
  assert.equal(page.sandbox.currentRouteHash(), first);
});

test('going to the Map of the technology layer and back keeps the folds and the columns of the Map of the application layer', async () => {
  const page = await visit(addressOf('application map', 'marketplace'));
  run(page.sandbox, 'diagramColumns = 4; mapStateOf().opened = new Set(["commerce"]);');
  await page.show();
  for (const id of ['environments', 'map']) {
    page.sandbox.setPerspective(id);
    page.sandbox.syncPerspectiveFromHash();
    await page.show();
  }
  assert.deepEqual(plain(run(page.sandbox, 'Array.from(mapStateOf().opened)')), ['commerce']);
  assert.equal(run(page.sandbox, 'diagramColumns'), 4);
});
