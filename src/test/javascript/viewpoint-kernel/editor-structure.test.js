'use strict';
// The structure of the editor (wave 014, run 0081, W-7): the perspectives are Timeline (with the pages Plateaus, Applications, Environments and Elements), Stories, Files and
// Settings; every page has its own route and the former routes (#/map, #/elements, #/library, #/diagram) are dropped and open the default page; the Plateaus page lists the plateaus with what each
// changes over the one it overrides; Stories show what belongs to the plateau of the band, and Files lists every file in a group per plateau (wave 015, run 0098); the plateau of each manifest. The layered Brightcart
// (src/test/resources/brightcart/layered/) is the workspace for the counts, read from expected/comparisons.json as in editor-reads-layers.test.js; the other workspaces are
// small files written here (a ferry company).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');
const { click } = require('./library-page');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart');
const LAYERED = path.join(BRIGHTCART, 'layered');
const COMPARISONS = new Map(
  JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', 'comparisons.json'), 'utf8')).map((c) => [c.id, c])
);
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

async function openLayered() {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state };
}

async function openFiles(files, settings) {
  const mem = memFolder(
    Object.assign({ '.archicode.yaml': settings || 'settings:\n  manifests:\n    paths: ["./**"]\n' }, files)
  );
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  return { sandbox, state, mem };
}

const SYSTEM = (id, plateau) =>
  'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' +
  (plateau ? '  plateau: "' + plateau + '"\n' : '') +
  'content:\n  id: "' +
  id +
  '"\n  name: "' +
  id +
  '"\n';
const ENVIRONMENT = (id) =>
  'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  id +
  '"\n';
const PLATEAU = (id, name) =>
  'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n';
const STORY = (id, plateau) =>
  'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\n' +
  (plateau ? '  plateau: "' + plateau + '"\n' : '') +
  'content:\n  id: "' +
  id +
  '"\n  name: "' +
  id +
  '"\n  steps: []\n';
const VIEW = (id, element, plateau) =>
  'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\n' +
  (plateau ? '  plateau: "' + plateau + '"\n' : '') +
  'content:\n  id: "' +
  id +
  '"\n  viewpoint: overview\n  layer: application\n  properties:\n    element: "' +
  element +
  '"\n';

/**
 * A ferry company with a root and two sibling plateaus, `fast` and `green`, each with a story and a view of its own, and a story and a view in the root. A story and a
 * view belong to no plateau (run 0100): the folders only say where the author keeps them.
 */
const FERRY = {
  'baseline/app.fleet.yaml': SYSTEM('fleet'),
  'baseline/env.harbour.yaml': ENVIRONMENT('harbour'),
  'baseline/story.tour.yaml': STORY('tour'),
  'baseline/view.fleet_view.yaml': VIEW('fleet_view', 'fleet'),
  'fast/plateau.yaml': PLATEAU('fast', 'Faster crossings'),
  'fast/app.jet.yaml': SYSTEM('jet', 'fast'),
  'fast/story.speed.yaml': STORY('speed'),
  'fast/view.jet_view.yaml': VIEW('jet_view', 'jet'),
  'green/plateau.yaml': PLATEAU('green', 'Greener crossings'),
  'green/app.sail.yaml': SYSTEM('sail', 'green'),
  'green/story.wind.yaml': STORY('wind')
};

const ids = (list) => Array.from(list, (entry) => entry.id).sort();
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// ---- the perspectives and the pages ----

test('the top bar has four perspectives, Timeline, Stories, Files and Settings, and the pressed one is the group of the page on screen', async () => {
  const { sandbox } = await openLayered();
  const bar = sandbox.renderPerspectiveTabsHtml();
  const buttons = Array.from(bar.matchAll(/data-perspective="([a-z]+)" aria-pressed="(true|false)">([^<]+)</g), (m) => [
    m[1],
    m[2],
    m[3]
  ]);
  assert.deepEqual(buttons, [
    ['map', 'true', 'Timeline'],
    ['library', 'false', 'Stories'],
    ['files', 'false', 'Files'],
    ['settings', 'false', 'Settings']
  ]);
  assert.doesNotMatch(bar, /Library|>Map</, 'the former names are gone from the bar');
  for (const [page, pressed] of [
    ['plateaus', 'map'],
    ['map', 'map'],
    ['environments', 'map'],
    ['elements', 'map'],
    ['library', 'library'],
    ['files', 'files'],
    ['settings', 'settings']
  ]) {
    sandbox.setPerspective(page);
    const now = Array.from(
      sandbox.renderPerspectiveTabsHtml().matchAll(/data-perspective="([a-z]+)" aria-pressed="true"/g),
      (m) => m[1]
    );
    assert.deepEqual(now, [pressed], page + ': one button is pressed, the one of its perspective');
  }
});

test('the pages of Timeline are in a bar under the band: Plateaus, Applications, Environments, Elements, and only while one of them is on screen', async () => {
  const { sandbox } = await openLayered();
  sandbox.setPerspective('map');
  const bar = sandbox.renderPageTabsHtml();
  assert.match(bar, /^<nav class="page-tabs col-span-3" id="page-tabs" aria-label="Pages of the Timeline">/);
  const buttons = Array.from(
    bar.matchAll(/data-action="set-page" data-perspective="([a-z]+)" aria-pressed="(true|false)"[^>]*>([^<]+)</g),
    (m) => [m[1], m[2], m[3]]
  );
  assert.deepEqual(buttons, [
    ['plateaus', 'false', 'Plateaus'],
    ['map', 'true', 'Applications'],
    ['environments', 'false', 'Environments'],
    ['elements', 'false', 'Elements']
  ]);
  assert.match(bar, /aria-current="page"/);
  // under the top bar and the band, in the shell, in that order
  const shell = sandbox.renderShellHtml();
  assert.ok(
    shell.indexOf('class="top-panel') < shell.indexOf('id="plateau-band"') &&
      shell.indexOf('id="plateau-band"') < shell.indexOf('id="page-tabs"')
  );
  assert.match(shell, /grid-rows-\[auto_auto_auto_minmax\(0,1fr\)\]/);
  for (const page of ['library', 'files', 'settings']) {
    sandbox.setPerspective(page);
    assert.equal(sandbox.renderPageTabsHtml(), '', page + ' has no pages below it');
    assert.doesNotMatch(sandbox.renderShellHtml(), /id="page-tabs"/);
    assert.doesNotMatch(
      sandbox.renderShellHtml(),
      /id="plateau-band"/,
      page + ' has no band either (wave 015, run 0097, #98)'
    );
  }
  sandbox.setPerspective('files');
  assert.match(
    sandbox.renderShellHtml(),
    /grid-rows-\[auto_minmax\(0,1fr\)\]/,
    'neither the band nor pages: one row above the page'
  );
});

test('a click on a page of the bar opens it, with its own address', async () => {
  const { sandbox } = await openLayered();
  const at = () => [sandbox.currentRouteHash(), run(sandbox, 'currentPerspective')];
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'environments' });
  assert.deepEqual(at(), ['/timeline/environments?compare=', 'environments']);
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'elements' });
  assert.deepEqual(at(), ['/timeline/elements', 'elements']);
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'map' });
  assert.deepEqual(at(), ['/timeline/applications?compare=', 'map']);
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'plateaus' });
  assert.deepEqual(at(), ['/timeline/plateaus', 'plateaus']);
  // the button Timeline of the top bar opens the first page that draws something, Applications, whichever page of the perspective is on screen
  const top = Array.from(
    sandbox
      .renderPerspectiveTabsHtml()
      .matchAll(/data-action="set-perspective" data-perspective="([a-z]+)"[^>]*>([^<]+)</g),
    (m) => [m[1], m[2]]
  );
  assert.deepEqual(top[0], ['map', 'Timeline'], 'the button Timeline opens Applications');
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': top[0][0] });
  assert.deepEqual(at(), ['/timeline/applications?compare=', 'map']);
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': 'library' });
  assert.equal(sandbox.currentRouteHash(), '/stories');
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': 'files' });
  assert.equal(sandbox.currentRouteHash(), '/files');
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': 'settings' });
  assert.equal(sandbox.currentRouteHash(), '/settings');
});

// ---- the routes ----

/** What an address opens: the page, the perspective the code holds (the same since wave 015, run 0099), and the side of Stories. */
function opens(sandbox, hash) {
  run(sandbox, 'location.hash = ' + JSON.stringify(hash));
  sandbox.syncPerspectiveFromHash();
  return {
    page: sandbox.pageIdFromHash(),
    perspective: run(sandbox, 'currentPerspective'),
    side: sandbox.libraryTabFromHash()
  };
}

test('each page has one address, and that address opens it', async () => {
  const { sandbox } = await openLayered();
  const routes = [
    ['#/timeline/plateaus', 'plateaus', 'plateaus'],
    ['#/timeline/applications', 'map', 'map'],
    ['#/timeline/environments', 'environments', 'environments'],
    ['#/timeline/elements', 'elements', 'elements'],
    ['#/stories', 'library', 'library'],
    ['#/files', 'files', 'files'],
    ['#/settings', 'settings', 'settings']
  ];
  for (const [hash, page, perspective] of routes) {
    const got = opens(sandbox, hash);
    assert.deepEqual([got.page, got.perspective], [page, perspective], hash);
    // a layered workspace says the comparison on a diagram surface (run 0203, DEC-3): empty for none
    const written = page === 'map' || page === 'environments' ? hash + '?compare=' : hash;
    assert.equal('#' + sandbox.currentRouteHash(), written, hash + ' is the address the page writes for itself');
  }
  assert.equal(opens(sandbox, '#/stories/views').side, 'views');
  assert.equal(opens(sandbox, '#/stories').side, 'stories');
  // an address that names a page by a part only, an unknown one, or nothing: the default page, Applications
  for (const hash of ['', '#', '#/', '#/nowhere', '#/timeline/nowhere?x=1']) {
    const got = opens(sandbox, hash);
    assert.equal(got.page, 'map', JSON.stringify(hash));
  }
});

// The routes are the ones the pages write. The former routes (0.17: no legacy) are no routes: they open the default page, Applications, and the page writes its address.
const ROUTES = [
  ['#/timeline/applications?pin=fleet', 'map', '/timeline/applications?pin=fleet&compare='],
  ['#/timeline/elements', 'elements', '/timeline/elements'],
  ['#/timeline/elements?ref=harbour', 'elements', '/timeline/elements?ref=harbour'],
  ['#/timeline/environments', 'environments', '/timeline/environments?compare='],
  ['#/timeline/plateaus', 'plateaus', '/timeline/plateaus'],
  ['#/stories', 'library', '/stories'],
  ['#/stories/views', 'library', '/stories/views'],
  ['#/stories?story=tour', 'library', '/stories?story=tour'],
  ['#/files', 'files', '/files'],
  ['#/settings', 'settings', '/settings'],
  // dropped: no legacy
  ['#/map', 'map', '/timeline/applications?compare='],
  ['#/map?pin=fleet', 'map', '/timeline/applications?pin=fleet&compare='],
  ['#/elements', 'map', '/timeline/applications?compare='],
  ['#/elements?ref=harbour', 'map', '/timeline/applications?ref=harbour&compare='],
  ['#/diagram?ref=harbour&vp=overview', 'map', '/timeline/applications?ref=harbour&compare='],
  ['#/library', 'map', '/timeline/applications?compare='],
  ['#/library/stories', 'map', '/timeline/applications?compare='],
  ['#/library/views', 'map', '/timeline/applications?compare='],
  ['#/applications', 'map', '/timeline/applications?compare='],
  ['#/timeline', 'map', '/timeline/applications?compare='],
  ['#/timeline?plateau=fast', 'map', '/timeline/applications?compare=&plateau=fast'],
  ['#/plateaus', 'map', '/timeline/applications?compare='],
  ['#/environments', 'map', '/timeline/applications?compare=']
];
for (const [former, page, address] of ROUTES) {
  test('the address ' + former + ' opens ' + page + ', and the page writes ' + address, async () => {
    const { sandbox } = await openFiles(FERRY);
    const got = opens(sandbox, former);
    assert.equal(got.page, page);
    assert.equal(sandbox.pageIdFromHash(), page);
    sandbox.applySelectionFromHashRef();
    sandbox.syncHashFromState(); // the end of every drawing
    assert.equal(sandbox.location.hash, '#' + address, 'the address is rewritten, without a new entry in the history');
    assert.equal(run(sandbox, 'currentPerspective'), page);
  });
}

test('an address opens the page when the workspace is loaded, as a bookmark does', async () => {
  for (const [former, page] of [
    ['#/map', 'map'],
    ['#/timeline/elements', 'elements'],
    ['#/library', 'map'],
    ['#/stories', 'library'],
    ['#/timeline/environments', 'environments'],
    ['#/timeline', 'map'],
    ['#/timeline/plateaus', 'plateaus'],
    ['#/plateaus', 'map']
  ]) {
    const sandbox = createApp({});
    run(sandbox, 'location.hash = ' + JSON.stringify(former));
    sandbox.syncPerspectiveFromHash(); // what the page does as it starts
    const mem = memFolder(
      Object.assign({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' }, FERRY)
    );
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    assert.equal(run(sandbox, 'currentPerspective'), page, former);
  }
});

test('the plateau of the band stays in the address of every page', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.drawPlateau('fast');
  for (const [page, route] of [
    ['plateaus', '/timeline/plateaus'],
    ['map', '/timeline/applications'],
    ['environments', '/timeline/environments'],
    ['elements', '/timeline/elements'],
    ['library', '/stories'],
    ['files', '/files'],
    ['settings', '/settings']
  ]) {
    sandbox.setPerspective(page);
    assert.equal(
      sandbox.currentRouteHash(),
      route + (page === 'map' || page === 'environments' ? '?compare=&plateau=fast' : '?plateau=fast'),
      page
    );
  }
});

// ---- Applications, Environments, Elements ----

test('Applications is the page the Map was: the drawing of the application layer, under the name Applications', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.setPerspective('map');
  const page = sandbox.renderActivePerspectiveHtml();
  assert.match(page.center, /<h2>Applications<\/h2>/);
  assert.match(page.center, /data-map="true"/);
  assert.doesNotMatch(page.center, /<h2>Map<\/h2>/);
});

test('Elements lists both trees; Environments is a Map of the technology layer, with a tree of its own that pins and hides', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('elements');
  const both = sandbox.renderActivePerspectiveHtml();
  assert.match(both.left, /aria-label="Applications"/);
  assert.match(both.left, /aria-label="Environments"/);
  assert.match(both.left, /open-create-top-level-form" data-category="application"/);
  assert.match(both.left, /open-create-top-level-form" data-category="technology"/);
  sandbox.setPerspective('environments');
  const technology = sandbox.renderActivePerspectiveHtml();
  assert.match(technology.center, /<h2>Environments<\/h2>/, 'the page is titled by what it draws');
  assert.match(technology.center, /data-map="true"/, 'and it is a Map');
  assert.match(technology.left, /role="tree" aria-label="Technology elements of the map"/);
  assert.match(technology.left, /data-node="technology:harbour"/);
  assert.doesNotMatch(technology.left, /data-node="application:fleet"/, 'the application tree is not there');
  assert.match(technology.left, /data-action="map-pin" data-ref="harbour"/, 'an environment is pinned from its row');
  assert.match(technology.left, /data-action="map-hide" data-ref="harbour"/, 'and hidden from it');
  assert.doesNotMatch(technology.left, /open-create-top-level-form/, 'the Map adds nothing: that is the page Elements');
  // a row of the tree selects nothing and is not a page of the element: an element is selected on the map by a click on its box
  assert.equal(state.selection.kind, 'none');
  // the page of the same environment is Elements
  click(sandbox, { 'data-action': 'select-element', 'data-ref': 'harbour', 'data-layer': 'technology' });
  assert.equal(sandbox.currentRouteHash(), '/timeline/environments?ref=harbour&compare=');
  sandbox.setPerspective('elements');
  assert.equal(state.selection.key, 'harbour', 'the selection goes with the page');
});

test('an application element selected on Environments stays selected, and the panel says the Map does not draw it; so does a technology one on Applications', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('elements');
  click(sandbox, { 'data-action': 'select-element', 'data-ref': 'fleet', 'data-layer': 'application' });
  sandbox.setPerspective('environments');
  assert.equal(state.selection.key, 'fleet', 'nothing lets the selection go');
  assert.match(
    sandbox.renderActivePerspectiveHtml().right,
    /This map draws the technology layer, and the applications deployed on its nodes\./
  );
  assert.equal(sandbox.currentRouteHash(), '/timeline/environments?ref=fleet&compare=');
  sandbox.setPerspective('elements');
  click(sandbox, { 'data-action': 'select-element', 'data-ref': 'harbour', 'data-layer': 'technology' });
  sandbox.setPerspective('map');
  assert.match(sandbox.renderActivePerspectiveHtml().right, /The map draws applications only\./);
});

test('Environments writes the pins of its Map in its address, and an address with pins opens them', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  const got = opens(sandbox, '#/timeline/environments?pin=harbour');
  assert.equal(got.perspective, 'environments');
  sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(run(sandbox, 'technologyMapState.pinned')), ['harbour']);
  assert.deepEqual(plain(run(sandbox, 'mapPinned')), [], 'the pins of the other Map are its own');
  assert.equal(sandbox.currentRouteHash(), '/timeline/environments?pin=harbour&compare=');
  // a pin that is not an element of the technology layer is dropped, whatever the other layer has
  opens(sandbox, '#/timeline/environments?pin=fleet');
  sandbox.applySelectionFromHashRef();
  assert.deepEqual(plain(run(sandbox, 'technologyMapState.pinned')), []);
  assert.equal(state.fatalError, null);
});

// ---- the Plateaus page ----

const TIMELINE_PAIRS = [
  ['inhouse', 'baseline'],
  ['marketplace', 'inhouse'],
  ['saas', 'baseline']
];

test('the Plateaus page lists the plateaus of the layered Brightcart in the order of the band, each with what it changes over the plateau it overrides', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.setPerspective('plateaus');
  // what the band computes one plateau per turn after a drawing; the page shows the counts that are there and says it is counting for the others
  assert.match(sandbox.renderActivePerspectiveHtml().center, /<span class="muted">Counting…<\/span>/);
  assert.equal(
    sandbox.cachedNodeCounts('saas'),
    undefined,
    'the page computed nothing: a big tree must not hold its first drawing'
  );
  for (const id of state.plateauTree.ids) sandbox.layerNodeCounts(id);
  const page = sandbox.renderActivePerspectiveHtml();
  assert.equal(page.left, null);
  const items = Array.from(
    page.center.matchAll(/<li class="timeline-item[^"]*" data-plateau="([^"]+)" style="--depth:(\d+)"/g),
    (m) => [m[1], Number(m[2])]
  );
  assert.deepEqual(
    items,
    [
      ['baseline', 0],
      ['inhouse', 1],
      ['marketplace', 2],
      ['saas', 1]
    ],
    'the tree of the band, flattened, each indented by its depth'
  );
  assert.deepEqual(
    Array.from(sandbox.bandOrderOf(state.plateauTree)),
    items.map((item) => item[0])
  );
  // the counts of the page are the counts of `archicode diff` for the same pair
  for (const [id, against] of TIMELINE_PAIRS) {
    const wanted = COMPARISONS.get(id === 'marketplace' ? 'P3' : id === 'inhouse' ? 'P2' : 'P1');
    const item = page.center.slice(page.center.indexOf('data-plateau="' + id + '"'));
    const block = item.slice(0, item.indexOf('</li>'));
    const read = (group) => {
      const part = block.slice(block.indexOf('data-counts-of="' + group + '"'));
      const chips = part.slice(0, part.indexOf('</span></span>') + 14);
      const out = {};
      for (const m of chips.matchAll(/data-state="([a-z-]+)"[^>]*>.*?<span class="change-count">(\d+)<\/span>/g))
        out[m[1]] = Number(m[2]);
      return out;
    };
    assert.deepEqual(
      { new: read('elements').new, changed: read('elements').changed, removed: read('elements').removed },
      wanted.elements,
      id + ' over ' + against + ': elements'
    );
    assert.deepEqual(
      {
        new: read('relationships').new,
        changed: read('relationships').changed,
        removed: read('relationships').removed
      },
      wanted.relationships,
      id + ' over ' + against + ': relationships'
    );
  }
  assert.match(page.center, /The root: it overrides nothing\./);
});

test('the Plateaus page says where each plateau is written, how many patches and files it has', async () => {
  const { sandbox } = await openLayered();
  const text = stripTags(sandbox.renderPlateausPageHtml());
  assert.match(
    text,
    /Build commerce services inhouse 2026-Q4 overrides baseline · described in inhouse\/plateau\.yaml · 26 patches · 11 files/
  );
  assert.match(
    text,
    /Marketplace and personalisation marketplace 2027-Q4 overrides inhouse · described in marketplace\/plateau\.yaml/
  );
  const { sandbox: headers } = await openFiles({
    'baseline/app.fleet.yaml': SYSTEM('fleet'),
    'later/app.jet.yaml': SYSTEM('jet', 'later')
  });
  const later = stripTags(headers.renderPlateausPageHtml());
  assert.match(
    later,
    /overrides baseline · exists only through the plateau key of a header · 0 patches · 1 file/,
    'a plateau that exists through a header has no manifest'
  );
});

test('the drawn plateau is marked on the Plateaus page, and Draw and Changes use the band', async () => {
  const { sandbox, state } = await openLayered();
  let page = sandbox.renderPlateausPageHtml();
  assert.match(page, /class="timeline-item timeline-drawn" data-plateau="baseline"/);
  assert.match(page, /data-action="timeline-draw" data-plateau="saas" aria-pressed="false"/);
  assert.doesNotMatch(
    page,
    /data-action="timeline-changes" data-plateau="baseline"/,
    'the root overrides nothing: nothing to list'
  );
  click(sandbox, { 'data-action': 'timeline-draw', 'data-plateau': 'saas' });
  assert.equal(state.layers.current, 'saas');
  assert.equal(state.layers.compare, null, 'Draw compares nothing');
  page = sandbox.renderPlateausPageHtml();
  assert.match(page, /class="timeline-item timeline-drawn" data-plateau="saas"/);
  click(sandbox, { 'data-action': 'timeline-changes', 'data-plateau': 'marketplace' });
  assert.equal(state.layers.current, 'marketplace');
  assert.equal(state.layers.compare.mode, 'past');
  assert.equal(state.layers.compare.other, 'inhouse');
  const state2 = sandbox.comparisonState();
  assert.equal(state2.target.id, 'marketplace');
  assert.equal(state2.base.id, 'inhouse');
});

test('with a comparison the Plateaus page has the Changes panel on the right, with the counts of archicode diff, and a row opens its element in Elements', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.setPerspective('plateaus');
  assert.equal(sandbox.renderActivePerspectiveHtml().right, null, 'nothing compared, nothing to list');
  click(sandbox, { 'data-action': 'timeline-changes', 'data-plateau': 'saas' });
  const page = sandbox.renderActivePerspectiveHtml();
  assert.match(page.right, /data-changes-panel/);
  assert.match(page.right, /Buy the commerce platform compared with Monolith\./);
  const wanted = COMPARISONS.get('P1').elements;
  const counts = Array.from(
    page.right
      .slice(page.right.indexOf('aria-label="Counts"'))
      .matchAll(/data-state="(new|changed|removed)"[^>]*>.*?<span class="change-count">(\d+)<\/span>/g),
    (m) => [m[1], Number(m[2])]
  ).slice(0, 3);
  assert.deepEqual(Object.fromEntries(counts), wanted);
  // a row of the list
  const tag = page.right.match(/<button[^>]*data-action="select-change" data-thing="element" data-change="new"[^>]*>/);
  assert.ok(tag, 'a new element is listed');
  const attrs = Object.fromEntries(Array.from(tag[0].matchAll(/(data-[a-z-]+)="([^"]*)"/g), (m) => [m[1], m[2]]));
  const ref = attrs['data-ref'];
  click(sandbox, attrs);
  assert.equal(
    run(sandbox, 'currentPerspective'),
    'elements',
    'the Plateaus page shows no element: the row opens it in Elements'
  );
  assert.equal(state.selection.key, ref);
});

test('a workspace with no other plateau has the Plateaus page too: baseline alone, and what a plateau is', async () => {
  const { sandbox } = await openFiles({ 'manifests/app.fleet.yaml': SYSTEM('fleet') });
  sandbox.setPerspective('plateaus');
  const page = sandbox.renderActivePerspectiveHtml();
  assert.equal((page.center.match(/class="timeline-item/g) || []).length, 1);
  assert.match(
    stripTags(page.center),
    /This workspace has one plateau, baseline \. A plateau is a layer over another one/
  );
  assert.equal(page.right, null);
  assert.doesNotMatch(page.center, /timeline-status/, 'nothing to say about a comparison that cannot be made');
  assert.doesNotMatch(
    page.center,
    /class="timeline-id"/,
    'a plateau with no name is called by its id: the id is not said twice'
  );
  assert.doesNotMatch(page.center, /data-action="timeline-changes"/);
});

test('a workspace with settings.plateaus opens no page: it is refused with the one sentence, so there is no list of plateaus to show and no selector', async () => {
  const mem = memFolder({ '.archicode.yaml': 'settings:\n  plateaus: []\n' });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.match(state.fatalError, /^Could not read\/parse \.archicode\.yaml: `settings\.plateaus` no longer exists/);
  assert.equal(state.workspace, null);
  assert.doesNotMatch(sandbox.renderShellHtml(), /id="plateau-band"|data-action="set-plateau"|id="page-tabs"/);
});

// ---- Stories ----

test('Stories is the name of the page that was the Library, with its Stories and Views sides', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.setPerspective('library');
  const page = sandbox.renderActivePerspectiveHtml();
  assert.match(page.center, /<h2>Stories<\/h2>/);
  assert.doesNotMatch(page.center, /Library/);
  assert.match(page.center, /aria-label="Stories and views"/);
  assert.equal(sandbox.currentRouteHash().split('?')[0], '/stories');
  run(sandbox, "libraryTab = 'views'");
  assert.equal(sandbox.currentRouteHash().split('?')[0], '/stories/views');
});

test('the page Stories lists the same stories and views whatever plateau is drawn', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  for (const drawn of ['baseline', 'fast', 'green']) {
    sandbox.drawPlateau(drawn);
    assert.equal(state.layers.current, drawn);
    assert.deepEqual(ids(sandbox.storiesList()), ['speed', 'tour', 'wind'], drawn + ': every story');
    assert.deepEqual(ids(sandbox.savedViews()), ['fleet_view', 'jet_view'], drawn + ': every view');
  }
  assert.equal(
    run(sandbox, 'typeof layerChainSet'),
    'undefined',
    'the pages no longer ask which plateaus a story belongs to'
  );
});

/** The files of the layered Brightcart, as a folder in memory, with the files of `extra` added. */
function layeredBrightcartFiles(extra) {
  const files = {};
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else files[path.relative(LAYERED, full).split(path.sep).join('/')] = fs.readFileSync(full, 'utf8');
    }
  };
  walk(LAYERED);
  return Object.assign(files, extra);
}

test('the layered Brightcart with two stories and a view added to the ones it ships: the four plateaus list the same ones, and a story that names an element of one plateau only is no mistake', async () => {
  // `commerce.cart` is declared by `inhouse` only and `seller` by `marketplace` only: the stories are told on each plateau, and exist in all of them. The fixture ships its own (run 0110,
  // expected/entries.json; brightcart-views-and-stories.test.js looks at those): they are listed too, and the two stories and the view added here come with them
  const shipped = JSON.parse(fs.readFileSync(path.join(LAYERED, '..', 'expected', 'entries.json'), 'utf8'));
  const story = (id, element) =>
    'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' +
    id +
    '"\n  name: "' +
    id +
    '"\n  steps:\n    - viewpoint: overview\n      layer: application\n      properties:\n        element: "' +
    element +
    '"\n      text: "Look."\n';
  const files = layeredBrightcartFiles({
    'stories/story.cart.yaml': story('cart_story', 'commerce.cart'),
    'stories/story.seller.yaml': story('seller_story', 'seller'),
    'stories/view.cart.yaml': VIEW('cart_view', 'commerce.cart')
  });
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  assert.deepEqual(Array.from(state.plateauTree.ids), ['baseline', 'inhouse', 'marketplace', 'saas']);
  for (const drawn of state.plateauTree.ids) {
    sandbox.drawPlateau(drawn);
    assert.equal(state.layers.current, drawn);
    assert.deepEqual(
      ids(sandbox.storiesList()),
      shipped.stories
        .map((entry) => entry.id)
        .concat(['cart_story', 'seller_story'])
        .sort(),
      drawn + ': every story'
    );
    assert.deepEqual(
      ids(sandbox.savedViews()),
      shipped.views
        .map((view) => view.id)
        .concat(['cart_view'])
        .sort(),
      drawn + ': every view'
    );
    assert.deepEqual(
      Array.from(sandbox.entryProblemsOf(state.workspace.settings)),
      [],
      drawn + ': what they name exists in a plateau'
    );
  }
  // in a plateau that lacks what a view names the view cannot be drawn there: it says which plateau lacks the element, and nothing is a mistake of the view
  sandbox.drawPlateau('baseline');
  assert.equal(
    sandbox.viewProblem(sandbox.findSavedView('cart_view')),
    'The element “commerce.cart” is not in the plateau “baseline”.'
  );
  sandbox.drawPlateau('inhouse');
  assert.equal(sandbox.viewProblem(sandbox.findSavedView('cart_view')), null);
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 0);
});

test('a workspace with no layer lists every story and view', async () => {
  const { sandbox } = await openFiles({
    'manifests/app.fleet.yaml': SYSTEM('fleet'),
    'manifests/story.tour.yaml': STORY('tour'),
    'manifests/view.v.yaml': VIEW('v', 'fleet')
  });
  assert.deepEqual(ids(sandbox.storiesList()), ['tour']);
  assert.deepEqual(ids(sandbox.savedViews()), ['v']);
  assert.deepEqual(
    Array.from(sandbox.entryProblemsOf(sandbox.__state().workspace.settings)),
    [],
    'a workspace without plateaus is not checked: what a view names is looked at when it is drawn'
  );
});

test('drawing another plateau does not let go of a story or a view', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.drawPlateau('fast');
  run(sandbox, "selectedStoryId = 'speed'; selectedViewId = 'jet_view'; activeStory = { id: 'speed', step: 0 }");
  sandbox.drawPlateau('green');
  assert.equal(run(sandbox, 'selectedStoryId'), 'speed');
  assert.equal(run(sandbox, 'selectedViewId'), 'jet_view');
  assert.deepEqual(plain(run(sandbox, 'activeStory')), { id: 'speed', step: 0 });
});

test('a new story or view is a manifest of no plateau, in the first manifests folder, whatever plateau is drawn', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.drawPlateau('fast');
  const story = sandbox.createStory('speed'); // `speed` is taken: a story is declared once in the workspace
  assert.equal(story.id, 'speed_2');
  const created = state.manifestFiles.find((f) => f.content === story);
  assert.equal(
    created.relPath,
    'story.speed_2.yaml',
    'the first folder of manifests.paths, not the folder of the plateau drawn'
  );
  assert.equal(created.header.plateau, undefined, 'no plateau: in the header');
  assert.doesNotMatch(created.rawText, /plateau/);
  sandbox.drawPlateau('green');
  const view = sandbox.createManifestEntry('view', {
    id: 'wide',
    viewpoint: 'overview',
    layer: 'application',
    properties: { element: 'fleet' }
  });
  const file = state.manifestFiles.find((f) => f.content === view);
  assert.equal(file.relPath, 'view.wide.yaml');
  assert.doesNotMatch(file.rawText, /plateau/);
  assert.deepEqual(ids(sandbox.storiesList()), ['speed', 'speed_2', 'tour', 'wind']);
});

test('a story that still says plateau: in its header is read, listed in every plateau and told by nothing', async () => {
  const old =
    'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\n  plateau: "fast"\ncontent:\n  id: "old"\n  name: "Old"\n  steps: []\n';
  const { sandbox, state } = await openFiles(Object.assign({}, FERRY, { 'fast/story.old.yaml': old }));
  assert.deepEqual(Array.from(state.plateauTree.warnings), [], 'no message: the key means nothing for a story');
  for (const drawn of ['baseline', 'green']) {
    sandbox.drawPlateau(drawn);
    assert.ok(ids(sandbox.storiesList()).includes('old'), drawn);
  }
  assert.equal(
    sandbox.filePlateauOf(state.manifestFiles.find((f) => f.relPath === 'fast/story.old.yaml')),
    null,
    'the file belongs to no plateau'
  );
  // the key names no plateau: a plateau that only a story names is no plateau
  const only = await openFiles({
    'manifests/app.fleet.yaml': SYSTEM('fleet'),
    'manifests/story.old.yaml': old.replace('"fast"', '"nowhere"')
  });
  assert.equal(only.state.plateauTree.layered, false);
  assert.deepEqual(Array.from(only.state.plateauTree.ids), ['baseline']);
});

// ---- Files ----

const MOVED = Object.assign({}, FERRY, {
  'fast/app.slow.yaml': SYSTEM('slow', 'green'), // says green, sits in fast
  'green/app.keel.yaml': SYSTEM('keel'), // says nothing, so baseline, sits in green
  'fast/plateau.later.yaml': PLATEAU('later', 'Later') // declares later, sits in fast
});

/** What the Files list says: its groups in order, with the files listed under each (a folded group lists none) and whether it is folded. */
function filesGroupsOf(sandbox) {
  const html = sandbox.renderFilesNavHtml();
  return Array.from(html.split('<div class="files-group" ').slice(1), (chunk) => ({
    key: /data-files-group="([^"]+)"/.exec(chunk)[1],
    folded: /aria-expanded="(true|false)"/.exec(chunk)[1] === 'false',
    count: /files-group-count">(?:<span[^>]*>[^<]*<\/span>)*([^<]+)</.exec(chunk)[1],
    files: Array.from(chunk.matchAll(/data-action="select-file" data-relpath="([^"]+)"/g), (m) => m[1])
  }));
}
const filesOfGroup = (groups, key) => (groups.find((g) => g.key === key) || { files: [] }).files;

test('Files lists every file, in a group per plateau, whatever plateau is drawn; a file of a sibling plateau is listed', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.setPerspective('files');
  const everything = Object.keys(FERRY).sort();
  const listed = () =>
    filesGroupsOf(sandbox)
      .flatMap((g) => g.files)
      .sort();
  const isEntry = (f) => /\/(story|view)\./.test(f); // a story and a view belong to no plateau, whatever the folder they are in
  const of = (plateau) => everything.filter((f) => f.startsWith(plateau + '/') && !isEntry(f));
  for (const drawn of ['baseline', 'fast', 'green']) {
    sandbox.drawPlateau(drawn);
    assert.deepEqual(listed(), everything, drawn + ' is drawn: all the files are listed');
  }
  const groups = filesGroupsOf(sandbox);
  assert.deepEqual(
    groups.map((g) => g.key),
    ['plateau:baseline', 'plateau:fast', 'plateau:green', 'none'],
    'the root first, then the plateaus in the order of the tree, then the files of no plateau'
  );
  assert.deepEqual(
    filesOfGroup(groups, 'none'),
    everything.filter(isEntry),
    'the stories and the views are in the group of no plateau, wherever they are written'
  );
  assert.deepEqual(filesOfGroup(groups, 'plateau:baseline'), of('baseline'));
  assert.deepEqual(filesOfGroup(groups, 'plateau:fast'), of('fast'));
  assert.deepEqual(
    filesOfGroup(groups, 'plateau:green'),
    of('green'),
    'drawing fast, a file of the sibling green is listed'
  );
  assert.equal(groups[1].count, '2 files');
  const nav = sandbox.renderFilesNavHtml();
  assert.match(
    stripTags(nav),
    /fast Faster crossings 2 files/,
    'a group says its plateau, its name and how many files'
  );
  assert.doesNotMatch(
    nav,
    /not listed|This plateau|With its past|All files|plateau-badge/,
    'there is no scope to choose and no badge on a row: the group says the plateau'
  );
  for (const entry of ['fast/view.jet_view.yaml', 'baseline/story.tour.yaml'])
    assert.equal(
      sandbox.filePlateauOf(sandbox.__state().manifestFiles.find((f) => f.relPath === entry)),
      null,
      entry + ' belongs to no plateau'
    );
  assert.equal(
    sandbox.filePlateauOf(sandbox.__state().manifestFiles.find((f) => f.relPath === 'fast/plateau.yaml')),
    'fast',
    'a manifest of kind Plateau is the plateau it declares'
  );
});

test('a group of Files folds and unfolds, as the author wishes, and the folds are kept while the editor stays open on the folder', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('files');
  assert.ok(
    filesGroupsOf(sandbox).every((g) => !g.folded && g.files.length > 0),
    'all unfolded to begin with'
  );
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'plateau:fast' });
  let groups = filesGroupsOf(sandbox);
  assert.deepEqual(
    groups.map((g) => [g.key, g.folded, g.files.length > 0]),
    [
      ['plateau:baseline', false, true],
      ['plateau:fast', true, false],
      ['plateau:green', false, true],
      ['none', false, true]
    ]
  );
  assert.equal(groups[1].count, '2 files', 'a folded group still says how many files it holds');
  assert.match(
    sandbox.renderFilesNavHtml(),
    /data-action="toggle-files-group"[^>]*><span class="tree-branch-title" role="button" tabindex="0" aria-expanded="false"/
  );
  sandbox.drawPlateau('green');
  sandbox.setPerspective('settings');
  sandbox.setPerspective('files');
  assert.equal(
    filesGroupsOf(sandbox)[1].folded,
    true,
    'drawing another plateau and visiting another page keep the fold'
  );
  click(sandbox, { 'data-action': 'files-fold-all' });
  assert.ok(
    filesGroupsOf(sandbox).every((g) => g.folded && g.files.length === 0),
    'Fold all'
  );
  click(sandbox, { 'data-action': 'files-unfold-all' });
  assert.ok(
    filesGroupsOf(sandbox).every((g) => !g.folded && g.files.length > 0),
    'Unfold all'
  );
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'plateau:green' });
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'plateau:green' });
  assert.equal(filesGroupsOf(sandbox)[2].folded, false, 'a second click unfolds it again');
  // reading the workspace again keeps them (a reload of the same folder), nothing is written in the workspace
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'plateau:baseline' });
  await sandbox.loadWorkspace(state.folder.handle);
  assert.equal(filesGroupsOf(sandbox)[0].folded, true, 'a reload of the same folder keeps the folds');
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 0, 'a fold changes no file');
  assert.doesNotMatch(
    Object.values(state.manifestFiles)
      .map((f) => f.rawText)
      .join('\n'),
    /fold/i
  );
});

test('opening a file unfolds its group, and the open file stays in the list', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('files');
  click(sandbox, { 'data-action': 'files-fold-all' });
  state.selection = { kind: 'file', key: 'green/app.sail.yaml', mode: 'view' }; // however it is opened: an address, a link, a row
  let groups = filesGroupsOf(sandbox);
  assert.deepEqual(
    groups.map((g) => g.folded),
    [true, true, false, true],
    'the group of the open file is unfolded, the others stay folded'
  );
  assert.ok(filesOfGroup(groups, 'plateau:green').includes('green/app.sail.yaml'));
  assert.match(
    sandbox.renderFilesNavHtml(),
    /file-row active[^"]*" role="button" tabindex="0" aria-current="true" data-action="select-file" data-relpath="green\/app\.sail\.yaml"/
  );
  // the author folds the group of the open file: the fold is kept, until another file is opened there
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'plateau:green' });
  assert.equal(filesGroupsOf(sandbox)[2].folded, true);
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.jet.yaml' });
  groups = filesGroupsOf(sandbox);
  assert.deepEqual(
    groups.map((g) => g.folded),
    [true, false, true, true],
    'selecting a row unfolds its group'
  );
});

test('opening the same file again, after the page has been left, unfolds its group again', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('files');
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.jet.yaml' });
  filesGroupsOf(sandbox); // the list is written with the file open
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'plateau:fast' });
  assert.equal(filesGroupsOf(sandbox)[1].folded, true);
  state.selection = { kind: 'none', key: null, mode: 'view' };
  sandbox.render();
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.jet.yaml' });
  assert.equal(filesGroupsOf(sandbox)[1].folded, false, 'the same file, opened again');
});

test('a folded group still says that one of its files has an error or unsaved changes', async () => {
  const { sandbox, state } = await openFiles(Object.assign({ 'baseline/broken.yaml': 'header: [unclosed\n' }, FERRY));
  sandbox.setPerspective('files');
  state.manifestFiles.find((f) => f.relPath === 'fast/app.jet.yaml').dirty = true;
  click(sandbox, { 'data-action': 'files-fold-all' });
  const heading = (key) =>
    sandbox
      .renderFilesNavHtml()
      .split('<div class="files-group" ')
      .find((chunk) => chunk.includes('data-files-group="' + key + '"'))
      .split('tree-branch-body')[0];
  assert.match(heading('plateau:fast'), /modified-badge[^>]*>modified</);
  assert.doesNotMatch(heading('plateau:fast'), /error-badge/);
  assert.match(heading('none'), /error-badge[^>]*>error</);
  assert.doesNotMatch(heading('plateau:green'), /error-badge|modified-badge/);
  click(sandbox, { 'data-action': 'files-unfold-all' });
  assert.doesNotMatch(heading('none'), /error-badge/, 'unfolded, the rows say it');
});

test('the folds belong to one folder: another folder starts unfolded', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('files');
  click(sandbox, { 'data-action': 'files-fold-all' });
  const mem = memFolder(Object.assign({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' }, FERRY));
  state.folder = { handle: mem.handle, name: 'other' };
  await sandbox.loadWorkspace(mem.handle);
  assert.ok(filesGroupsOf(sandbox).every((g) => !g.folded));
});

test('the files that belong to no plateau (a file the editor cannot read, a story, a view) are a group of their own, last, whoever they are; the open one is not lost', async () => {
  const { sandbox, state } = await openFiles(Object.assign({ 'baseline/broken.yaml': 'header: [unclosed\n' }, FERRY));
  sandbox.setPerspective('files');
  sandbox.drawPlateau('green');
  let groups = filesGroupsOf(sandbox);
  assert.deepEqual(
    groups.map((g) => g.key),
    ['plateau:baseline', 'plateau:fast', 'plateau:green', 'none'],
    'the group of the files with no plateau comes last'
  );
  const entries = [
    'baseline/story.tour.yaml',
    'baseline/view.fleet_view.yaml',
    'fast/story.speed.yaml',
    'fast/view.jet_view.yaml',
    'green/story.wind.yaml'
  ];
  assert.deepEqual(
    filesOfGroup(groups, 'none'),
    ['baseline/broken.yaml'].concat(entries),
    'a file with an error, the stories and the views belong to no plateau'
  );
  assert.ok(!filesOfGroup(groups, 'plateau:baseline').includes('baseline/broken.yaml'));
  assert.match(stripTags(sandbox.renderFilesNavHtml()), /No plateau 6 files/);
  assert.match(
    sandbox.renderFilesNavHtml(),
    /data-relpath="baseline\/broken\.yaml">\s*<span class="file-relpath">[^<]*<\/span><span class="error-badge"/
  );
  // the group is generic: it holds what filePlateauOf says is null, it is not made for one file
  assert.equal(sandbox.filePlateauOf(state.manifestFiles.find((f) => f.relPath === 'baseline/broken.yaml')), null);
  click(sandbox, { 'data-action': 'toggle-files-group', 'data-group': 'none' });
  assert.equal(filesGroupsOf(sandbox)[3].folded, true);
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'baseline/broken.yaml' });
  groups = filesGroupsOf(sandbox);
  assert.equal(groups[3].folded, false);
  assert.deepEqual(groups[3].files, ['baseline/broken.yaml'].concat(entries));
});

test('a plateau the tree refuses still has its group: the files are listed whatever the mistake', async () => {
  const { sandbox, state } = await openFiles({
    'a/app.x.yaml': SYSTEM('x', 'two'),
    'a/plateau.yaml': PLATEAU('two', 'Two').replace('name: "Two"', 'name: "Two"\n  override: "nowhere"'),
    'a/app.y.yaml': SYSTEM('y')
  });
  sandbox.setPerspective('files');
  assert.ok(state.plateauTree.problems.length > 0);
  const groups = filesGroupsOf(sandbox);
  assert.deepEqual(groups.flatMap((g) => g.files).sort(), ['a/app.x.yaml', 'a/app.y.yaml', 'a/plateau.yaml']);
  assert.deepEqual(
    groups.map((g) => g.key),
    ['plateau:baseline', 'plateau:two']
  );
});

test('a workspace with no layer lists every file, with no group and no badge, as it always did', async () => {
  const { sandbox } = await openFiles({
    'manifests/app.fleet.yaml': SYSTEM('fleet'),
    'manifests/env.harbour.yaml': ENVIRONMENT('harbour')
  });
  const nav = sandbox.renderFilesNavHtml();
  assert.equal((nav.match(/data-action="select-file"/g) || []).length, 2);
  assert.doesNotMatch(
    nav,
    /files-group|toggle-files-group|plateau-badge|warning-badge/,
    'one plateau only: no groups to fold'
  );
});

test('a manifest whose plateau disagrees with the folder it is in, when that is the name of another plateau, gets a warning', async () => {
  const { sandbox } = await openFiles(MOVED);
  const warning = (relPath) =>
    sandbox.filePlateauFolderWarning(sandbox.__state().manifestFiles.find((f) => f.relPath === relPath));
  assert.equal(
    warning('fast/app.slow.yaml'),
    '`fast/app.slow.yaml` says `plateau: green` in its header, but it sits in the folder `fast`, which is the name of another plateau'
  );
  assert.equal(
    warning('green/app.keel.yaml'),
    '`green/app.keel.yaml` has no `plateau` key in its header, so it belongs to `baseline`, but it sits in the folder `green`, which is the name of another plateau'
  );
  assert.equal(
    warning('fast/plateau.later.yaml'),
    '`fast/plateau.later.yaml` declares the plateau `later`, but it sits in the folder `fast`, which is the name of another plateau'
  );
  // the ones that agree, or that sit in no folder named like a plateau, have none
  for (const ok of ['fast/app.jet.yaml', 'fast/plateau.yaml', 'baseline/app.fleet.yaml', 'green/story.wind.yaml'])
    assert.equal(warning(ok), null, ok);
  // the deepest folder that is a plateau counts
  const nested = await openFiles({
    'baseline/app.fleet.yaml': SYSTEM('fleet'),
    'fast/deep/app.a.yaml': SYSTEM('a', 'fast'),
    'fast/baseline/app.b.yaml': SYSTEM('b', 'fast'),
    'other/app.c.yaml': SYSTEM('c', 'fast')
  });
  const w = (relPath) =>
    nested.sandbox.filePlateauFolderWarning(nested.state.manifestFiles.find((f) => f.relPath === relPath));
  assert.equal(w('fast/deep/app.a.yaml'), null);
  assert.match(w('fast/baseline/app.b.yaml'), /sits in the folder `baseline`/);
  assert.equal(w('other/app.c.yaml'), null, 'a folder that is no plateau says nothing');
});

test("the warning is on the row, in the list's count, and on the page of the file; nothing is blocked", async () => {
  const { sandbox, state } = await openFiles(MOVED);
  sandbox.setPerspective('files');
  const nav = sandbox.renderFilesNavHtml();
  assert.equal((nav.match(/class="warning-badge"/g) || []).length, 3);
  assert.match(stripTags(nav), /3 files sit in the folder of another plateau\./);
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.slow.yaml' });
  assert.equal(state.selection.key, 'fast/app.slow.yaml');
  const center = sandbox.renderActivePerspectiveHtml().center;
  assert.match(
    center,
    /class="nav-facet-note file-plateau-warning" role="status"><strong>Warning:<\/strong> <code>fast\/app\.slow\.yaml<\/code> says <code>plateau: green<\/code>/
  );
  assert.match(center, /Nothing is wrong for the tools/);
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.jet.yaml' });
  assert.doesNotMatch(
    sandbox.renderActivePerspectiveHtml().center,
    /file-plateau-warning/,
    'a file that agrees has no warning'
  );
  // the plateaus themselves are not wrong: the tree has no mistake and the command line would load it
  assert.equal(state.plateauTree.problems.length, 0);
  assert.equal(state.layerProblems, null);
});

// ---- Settings ----

test('Settings has no plateau section for a layered or a plateau-less workspace', async () => {
  const { sandbox } = await openLayered();
  sandbox.setPerspective('settings');
  for (const workspace of [sandbox, (await openFiles({ 'manifests/app.fleet.yaml': SYSTEM('fleet') })).sandbox]) {
    workspace.setPerspective('settings');
    const center = workspace.renderActivePerspectiveHtml().center;
    assert.doesNotMatch(center, /id="settings-plateaus"|<h3>Plateaus<\/h3>/);
    assert.match(center, /<h3>Manifests<\/h3>/, 'the folders of the manifests, as before');
    assert.doesNotMatch(center, /settings\.plateaus|plateau add/, 'and no sentence about the old key');
  }
});

// ---- the layout ----

test('the bar of the pages and the Plateaus page hold the width: they wrap, and the helper for the third row of the shell exists', async () => {
  const html = fs.readFileSync(
    path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'),
    'utf8'
  );
  assert.match(html, /\.page-tabs \{[^}]*flex-wrap: wrap;[^}]*min-width: 0;[^}]*max-width: 100%;/);
  assert.match(html, /\.timeline-item \{[^}]*min-width: 0;[^}]*margin-left: calc\(var\(--depth, 0\) \* 1rem\);/);
  assert.match(html, /\.timeline-main \{[^}]*flex-wrap: wrap;/);
  assert.match(
    html,
    /\.grid-rows-\\\[auto_auto_auto_minmax\\\(0\\,1fr\\\)\\\] \{ grid-template-rows: auto auto auto minmax\(0, 1fr\); \}/
  );
  assert.match(html, /\.files-group \.tree-branch-title \{ min-width: 0; \}/);
  // 360 px (issue #82): four pages in one row, and the fields of Settings under their labels, never wider than what holds them
  assert.match(html, /\.page-tabs \.button-group \{ flex-wrap: wrap; max-width: 100%;/);
  const narrow = html.slice(html.indexOf('@media (max-width: 40rem) {'), html.indexOf('</style>'));
  assert.equal(
    (html.match(/@media \(max-width: 40rem\)/g) || []).length,
    1,
    'one rule for the narrow window: the tests of run 0073 read the first'
  );
  assert.match(narrow, /\.page-tabs button \{ padding: 0 0\.45rem !important;/);
  assert.match(narrow, /\.settings-view \.field-row \{ flex-wrap: wrap;/);
  assert.match(narrow, /\.settings-view \.field-label \{ width: 100%; \}/);
  assert.match(narrow, /\.settings-view \.field-value \{ flex-basis: 100%; \}/);
  assert.match(
    html,
    /\.settings-view input\[type="text"\], \.settings-view select, \.settings-view textarea \{ max-width: 100%; min-width: 0;/
  );
});

// ---- what the review of the run found ----

test('an address that names an application element on Environments opens Environments when the workspace is loaded, as a bookmark does', async () => {
  const sandbox = createApp({});
  run(sandbox, "location.hash = '#/timeline/environments?ref=fleet'");
  sandbox.syncPerspectiveFromHash();
  const mem = memFolder(Object.assign({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' }, FERRY));
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.deepEqual([run(sandbox, 'currentPerspective'), state.selection.key], ['environments', 'fleet']);
  sandbox.syncHashFromState(); // the end of the drawing
  assert.equal(sandbox.location.hash, '#/timeline/environments?ref=fleet&compare=');
});

test('a link from Environments to an element of the other layer selects it where it is: both Maps keep a selection of the other layer', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('environments');
  click(sandbox, { 'data-action': 'goto-element', 'data-ref': 'harbour', 'data-layer': 'technology' });
  assert.equal(run(sandbox, 'currentPerspective'), 'environments');
  click(sandbox, { 'data-action': 'goto-element', 'data-ref': 'fleet', 'data-layer': 'application' });
  assert.equal(state.selection.key, 'fleet');
  assert.equal(run(sandbox, 'currentPerspective'), 'environments');
});

test('renaming an element reaches every view and story, whatever plateau is drawn, and deleting a view counts the steps of every story', async () => {
  const files = Object.assign({}, FERRY, {
    'fast/view.fleet_fast.yaml': VIEW('fleet_fast', 'fleet'),
    'fast/story.uses_view.yaml':
      'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "uses_view"\n  name: "Uses a view"\n  steps:\n    - view: "fleet_view"\n      text: "the fleet"\n    - viewpoint: overview\n      layer: application\n      properties:\n        element: "fleet"\n      text: "its own"\n'
  });
  const { sandbox, state } = await openFiles(files);
  assert.deepEqual(
    ids(sandbox.savedViews()),
    ['fleet_fast', 'fleet_view', 'jet_view'],
    'baseline is drawn: the views of fast are listed'
  );
  assert.equal(
    sandbox.storiesUsingView('fleet_view'),
    1,
    'the step of the story that shows the view is counted: deleting the view says so'
  );
  sandbox.rewriteInboundReferences('fleet', 'armada', 'application');
  const file = (relPath) => state.manifestFiles.find((f) => f.relPath === relPath);
  assert.equal(file('fast/view.fleet_fast.yaml').content.properties.element, 'armada');
  assert.equal(file('baseline/view.fleet_view.yaml').content.properties.element, 'armada');
  assert.equal(
    file('fast/story.uses_view.yaml').content.steps[1].properties.element,
    'armada',
    'and so does the step that carries its own view'
  );
  assert.ok(
    file('fast/view.fleet_fast.yaml').dirty && file('fast/story.uses_view.yaml').dirty,
    'the files are written with the rest'
  );
});

test('the count of a move reaches every view and story, as the move does', async () => {
  const files = Object.assign({}, FERRY, { 'fast/view.fleet_fast.yaml': VIEW('fleet_fast', 'fleet') });
  const { sandbox } = await openFiles(files);
  assert.equal(
    sandbox.scanMoveReferences('fleet', 'application').views,
    2,
    'the view of baseline and the view of fast'
  );
});

test('a view or story of .archicode.yaml whose id a manifest has is not moved, and does not show twice', async () => {
  const settings =
    'settings:\n  manifests:\n    paths: ["./**"]\nstories:\n  - id: speed\n    name: Old speed\n    steps: []\n  - id: only_old\n    name: Only old\n    steps: []\n';
  const { sandbox } = await openFiles(FERRY, settings);
  assert.deepEqual(
    ids(sandbox.legacyEntriesToMove().stories),
    ['only_old'],
    'speed is declared by a manifest: moving it would declare it twice'
  );
  assert.deepEqual(
    ids(sandbox.storiesList()),
    ['only_old', 'speed', 'tour', 'wind'],
    'the entry that a manifest shadows is not shown twice'
  );
  sandbox.drawPlateau('fast');
  assert.deepEqual(
    ids(sandbox.storiesList()),
    ['only_old', 'speed', 'tour', 'wind'],
    'and the plateau drawn changes nothing'
  );
});

test('the Plateaus page loads the kernel its Changes panel waits for, and writes the panel again', async () => {
  const { sandbox } = await openFiles(FERRY);
  run(
    sandbox,
    'globalThis.__loads = 0; globalThis.__refreshes = 0; loadViewpointKernel = async () => { __loads++; }; refreshRightPanel = () => { __refreshes++; };'
  );
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  for (const [perspective, pending, loads] of [
    ['plateaus', true, 1],
    ['plateaus', false, 1],
    ['map', true, 1]
  ]) {
    run(
      sandbox,
      'currentPerspective = ' +
        JSON.stringify(perspective) +
        '; rightPanelPending = ' +
        pending +
        '; settlePlateausPanel();'
    );
    await tick();
    assert.equal(run(sandbox, '__loads'), loads, perspective + ' / pending ' + pending);
  }
  assert.equal(run(sandbox, '__refreshes'), 1, 'the panel is written once, when the kernel is there');
  // and every drawing asks (the harness does not draw the page: the call is read in the function that does)
  const html = fs.readFileSync(
    path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'),
    'utf8'
  );
  const render = html.slice(html.indexOf('\nfunction render() {'));
  assert.ok(
    render.indexOf('mountDiagramIfNeeded();\n  settlePlateausPanel();') > 0 &&
      render.indexOf('mountDiagramIfNeeded();\n  settlePlateausPanel();') < render.indexOf('\n}\n'),
    'render() settles the panel of the Plateaus page after it mounts the diagrams'
  );
});

test('a row of the Changes panel on the Plateaus page leaves an entry of the history for the page it leaves', async () => {
  const { sandbox } = await openLayered();
  sandbox.setPerspective('plateaus');
  click(sandbox, { 'data-action': 'timeline-changes', 'data-plateau': 'saas' });
  sandbox.syncHashFromState(); // the end of the drawing
  const entries = [];
  sandbox.history.pushState = (s, t, url) => entries.push(url);
  Object.defineProperty(sandbox.location, 'href', {
    get: () => 'http://localhost/editor.html' + sandbox.location.hash
  });
  const tag = sandbox
    .renderActivePerspectiveHtml()
    .right.match(/<button[^>]*data-action="select-change" data-thing="element" data-change="new"[^>]*>/)[0];
  click(sandbox, Object.fromEntries(Array.from(tag.matchAll(/(data-[a-z-]+)="([^"]*)"/g), (m) => [m[1], m[2]])));
  assert.equal(entries.length, 1);
  assert.match(entries[0], /#\/timeline\/plateaus\?plateau=saas$/, 'the Plateaus page is what Back returns to');
  sandbox.syncHashFromState(); // the end of the drawing
  assert.match(sandbox.location.hash, /^#\/timeline\/elements\?ref=/);
});

test('the status of the Plateaus page does not promise a panel that is not there', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  sandbox.toggleCompareWithPast();
  assert.match(
    stripTags(sandbox.renderPlateausPageHtml()),
    /Buy the commerce platform is compared with Monolith: the Changes panel on the right lists what differs\./
  );
  // a plateau the comparison cannot be made on
  run(sandbox, "comparisonState = () => ({ problems: ['x'] })");
  assert.match(
    stripTags(sandbox.renderPlateausPageHtml()),
    /compared with Monolith, but the two cannot be compared: the diagram of Applications says why./
  );
  assert.ok(state.layers.compare);
});
