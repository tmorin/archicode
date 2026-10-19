'use strict';
// The structure of the editor (wave 014, run 0081, W-7): the perspectives are Timeline (with the pages Plateaus, Applications, Environments and Elements), Stories, Files and
// Settings; every page has its own route and the former routes (#/map, #/elements, #/library, #/stories) still open; the Plateaus page lists the plateaus with what each
// changes over the one it overrides; Stories and Files show what belongs to the plateau of the band, and Files says the plateau of each manifest. The layered Brightcart
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
const COMPARISONS = new Map(JSON.parse(fs.readFileSync(path.join(BRIGHTCART, 'expected', 'comparisons.json'), 'utf8')).map((c) => [c.id, c]));
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
  const mem = memFolder(Object.assign({ 'workspace.yaml': settings || 'settings:\n  manifests:\n    paths: ["./**"]\n' }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  return { sandbox, state, mem };
}

const SYSTEM = (id, plateau) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') + 'content:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const ENVIRONMENT = (id) => 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, name) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n';
const STORY = (id, plateau) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') + 'content:\n  id: "' + id + '"\n  name: "' + id + '"\n  steps: []\n';
const VIEW = (id, element, plateau) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') +
  'content:\n  id: "' + id + '"\n  viewpoint: overview\n  layer: application\n  properties:\n    element: "' + element + '"\n';

/** A ferry company with a root and two sibling plateaus, `fast` and `green`, each with a story and a view of its own, and a story and a view in the root. */
const FERRY = {
  'baseline/app.fleet.yaml': SYSTEM('fleet'),
  'baseline/env.harbour.yaml': ENVIRONMENT('harbour'),
  'baseline/story.tour.yaml': STORY('tour'),
  'baseline/view.fleet_view.yaml': VIEW('fleet_view', 'fleet'),
  'fast/plateau.yaml': PLATEAU('fast', 'Faster crossings'),
  'fast/app.jet.yaml': SYSTEM('jet', 'fast'),
  'fast/story.speed.yaml': STORY('speed', 'fast'),
  'fast/view.jet_view.yaml': VIEW('jet_view', 'jet', 'fast'),
  'green/plateau.yaml': PLATEAU('green', 'Greener crossings'),
  'green/app.sail.yaml': SYSTEM('sail', 'green'),
  'green/story.wind.yaml': STORY('wind', 'green')
};

const ids = (list) => Array.from(list, (entry) => entry.id).sort();
const stripTags = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');

// ---- the perspectives and the pages ----

test('the top bar has four perspectives, Timeline, Stories, Files and Settings, and the pressed one is the group of the page on screen', async () => {
  const { sandbox } = await openLayered();
  const bar = sandbox.renderPerspectiveTabsHtml();
  const buttons = Array.from(bar.matchAll(/data-perspective="([a-z]+)" aria-pressed="(true|false)">([^<]+)</g), (m) => [m[1], m[2], m[3]]);
  assert.deepEqual(buttons, [['map', 'true', 'Timeline'], ['library', 'false', 'Stories'], ['files', 'false', 'Files'], ['settings', 'false', 'Settings']]);
  assert.doesNotMatch(bar, /Library|>Map</, 'the former names are gone from the bar');
  for (const [page, pressed] of [['plateaus', 'map'], ['map', 'map'], ['environments', 'map'], ['elements', 'map'], ['library', 'library'], ['files', 'files'], ['settings', 'settings']]) {
    sandbox.setPerspective(page);
    const now = Array.from(sandbox.renderPerspectiveTabsHtml().matchAll(/data-perspective="([a-z]+)" aria-pressed="true"/g), (m) => m[1]);
    assert.deepEqual(now, [pressed], page + ': one button is pressed, the one of its perspective');
  }
});

test('the pages of Timeline are in a bar under the band: Plateaus, Applications, Environments, Elements, and only while one of them is on screen', async () => {
  const { sandbox } = await openLayered();
  sandbox.setPerspective('map');
  const bar = sandbox.renderPageTabsHtml();
  assert.match(bar, /^<nav class="page-tabs col-span-3" id="page-tabs" aria-label="Pages of the Timeline">/);
  const buttons = Array.from(bar.matchAll(/data-action="set-page" data-perspective="([a-z]+)" aria-pressed="(true|false)"[^>]*>([^<]+)</g), (m) => [m[1], m[2], m[3]]);
  assert.deepEqual(buttons, [['plateaus', 'false', 'Plateaus'], ['map', 'true', 'Applications'], ['environments', 'false', 'Environments'], ['elements', 'false', 'Elements']]);
  assert.match(bar, /aria-current="page"/);
  // under the top bar and the band, in the shell, in that order
  const shell = sandbox.renderShellHtml();
  assert.ok(shell.indexOf('class="top-panel') < shell.indexOf('id="plateau-band"') && shell.indexOf('id="plateau-band"') < shell.indexOf('id="page-tabs"'));
  assert.match(shell, /grid-rows-\[auto_auto_auto_minmax\(0,1fr\)\]/);
  for (const page of ['library', 'files', 'settings']) {
    sandbox.setPerspective(page);
    assert.equal(sandbox.renderPageTabsHtml(), '', page + ' has no pages below it');
    assert.doesNotMatch(sandbox.renderShellHtml(), /id="page-tabs"/);
  }
  sandbox.setPerspective('files');
  assert.match(sandbox.renderShellHtml(), /grid-rows-\[auto_auto_minmax\(0,1fr\)\]/, 'the band and no pages: two rows above the page');
});

test('a click on a page of the bar opens it, with its own address', async () => {
  const { sandbox } = await openLayered();
  const at = () => [sandbox.currentRouteHash(), run(sandbox, 'currentPerspective'), run(sandbox, 'elementsScope')];
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'environments' });
  assert.deepEqual(at(), ['/timeline/environments', 'elements', 'technology']);
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'elements' });
  assert.deepEqual(at(), ['/timeline/elements', 'elements', 'all']);
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'map' });
  assert.deepEqual(at(), ['/timeline/applications', 'map', 'all']);
  click(sandbox, { 'data-action': 'set-page', 'data-perspective': 'plateaus' });
  assert.deepEqual(at(), ['/timeline/plateaus', 'plateaus', 'all']);
  // the button Timeline of the top bar opens the first page that draws something, Applications, whichever page of the perspective is on screen
  const top = Array.from(sandbox.renderPerspectiveTabsHtml().matchAll(/data-action="set-perspective" data-perspective="([a-z]+)"[^>]*>([^<]+)</g), (m) => [m[1], m[2]]);
  assert.deepEqual(top[0], ['map', 'Timeline'], 'the button Timeline opens Applications');
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': top[0][0] });
  assert.deepEqual(at(), ['/timeline/applications', 'map', 'all']);
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': 'library' });
  assert.equal(sandbox.currentRouteHash(), '/stories');
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': 'files' });
  assert.equal(sandbox.currentRouteHash(), '/files');
  click(sandbox, { 'data-action': 'set-perspective', 'data-perspective': 'settings' });
  assert.equal(sandbox.currentRouteHash(), '/settings');
});

// ---- the routes ----

/** What an address opens: the page, the perspective the code holds, the scope of Elements, and the side of Stories. */
function opens(sandbox, hash) {
  run(sandbox, 'location.hash = ' + JSON.stringify(hash));
  sandbox.syncPerspectiveFromHash();
  return { page: sandbox.pageIdFromHash(), perspective: run(sandbox, 'currentPerspective'), scope: run(sandbox, 'elementsScope'), side: sandbox.libraryTabFromHash() };
}

test('each page has one address, and that address opens it', async () => {
  const { sandbox } = await openLayered();
  const routes = [
    ['#/timeline/plateaus', 'plateaus', 'plateaus', 'all'],
    ['#/timeline/applications', 'map', 'map', 'all'],
    ['#/timeline/environments', 'environments', 'elements', 'technology'],
    ['#/timeline/elements', 'elements', 'elements', 'all'],
    ['#/stories', 'library', 'library', 'all'],
    ['#/files', 'files', 'files', 'all'],
    ['#/settings', 'settings', 'settings', 'all']
  ];
  for (const [hash, page, perspective, scope] of routes) {
    const got = opens(sandbox, hash);
    assert.deepEqual([got.page, got.perspective, got.scope], [page, perspective, scope], hash);
    assert.equal('#' + sandbox.currentRouteHash(), hash, hash + ' is the address the page writes for itself');
  }
  assert.equal(opens(sandbox, '#/stories/views').side, 'views');
  assert.equal(opens(sandbox, '#/stories').side, 'stories');
  // an address that names a page by a part only, an unknown one, or nothing: the default page, Applications
  for (const hash of ['', '#', '#/', '#/nowhere', '#/timeline/nowhere?x=1']) {
    const got = opens(sandbox, hash);
    assert.equal(got.page, 'map', JSON.stringify(hash));
  }
});

// The former routes are links that people have kept: each still opens the page that took its place, and the page then writes its new address.
const FORMER_ROUTES = [
  ['#/map', 'map', '/timeline/applications'],
  ['#/map?pin=fleet', 'map', '/timeline/applications?pin=fleet'],
  ['#/elements', 'elements', '/timeline/elements'],
  ['#/elements?ref=harbour', 'elements', '/timeline/elements?ref=harbour'],
  ['#/diagram?ref=harbour&vp=overview', 'elements', '/timeline/elements?ref=harbour&tab=overview'],
  ['#/library', 'library', '/stories'],
  ['#/library/stories', 'library', '/stories'],
  ['#/library/views', 'library', '/stories/views'],
  ['#/stories', 'library', '/stories'],
  ['#/stories?story=tour', 'library', '/stories?story=tour'],
  ['#/applications', 'map', '/timeline/applications'],
  ['#/timeline', 'map', '/timeline/applications'], // it named the list of the plateaus, which is now #/timeline/plateaus
  ['#/timeline?plateau=fast', 'map', '/timeline/applications?plateau=fast'],
  ['#/plateaus', 'plateaus', '/timeline/plateaus'], // the short address of the page Plateaus keeps working
  ['#/environments', 'environments', '/timeline/environments']
];
for (const [former, page, address] of FORMER_ROUTES) {
  test('the former address ' + former + ' still opens ' + page + ', and the page writes ' + address, async () => {
    const { sandbox } = await openFiles(FERRY);
    const got = opens(sandbox, former);
    assert.equal(got.page, page);
    assert.equal(sandbox.pageIdFromHash(), page);
    sandbox.applySelectionFromHashRef();
    sandbox.syncHashFromState(); // the end of every drawing
    assert.equal(sandbox.location.hash, '#' + address, 'the address is rewritten, without a new entry in the history');
    assert.equal(run(sandbox, 'currentPageId()'), page);
  });
}

test('an address opens the page when the workspace is loaded, as a bookmark does', async () => {
  for (const [former, page] of [['#/map', 'map'], ['#/elements', 'elements'], ['#/library', 'library'], ['#/stories', 'library'], ['#/timeline/environments', 'environments'], ['#/timeline', 'map'], ['#/timeline/plateaus', 'plateaus'], ['#/plateaus', 'plateaus']]) {
    const sandbox = createApp({});
    run(sandbox, 'location.hash = ' + JSON.stringify(former));
    sandbox.syncPerspectiveFromHash(); // what the page does as it starts
    const mem = memFolder(Object.assign({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' }, FERRY));
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    assert.equal(run(sandbox, 'currentPageId()'), page, former);
  }
});

test('the plateau of the band stays in the address of every page', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.drawPlateau('fast');
  for (const [page, route] of [['plateaus', '/timeline/plateaus'], ['map', '/timeline/applications'], ['environments', '/timeline/environments'], ['elements', '/timeline/elements'], ['library', '/stories'], ['files', '/files'], ['settings', '/settings']]) {
    sandbox.setPerspective(page);
    assert.equal(sandbox.currentRouteHash(), route + '?plateau=fast', page);
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

test('Environments lists the technology tree alone; Elements lists both; the two show the same pages of an element', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('elements');
  const both = sandbox.renderActivePerspectiveHtml();
  assert.match(both.left, /aria-label="Applications"/);
  assert.match(both.left, /aria-label="Environments"/);
  sandbox.setPerspective('environments');
  const technology = sandbox.renderActivePerspectiveHtml();
  assert.doesNotMatch(technology.left, /data-ref="fleet"/, 'the application tree is not there');
  assert.doesNotMatch(technology.left, />\s*▾ Applications|▸ Applications/);
  assert.match(technology.left, /data-action="select-element" data-ref="harbour" data-layer="technology"/);
  assert.match(technology.left, /open-create-top-level-form" data-category="technology"/, 'an environment can be added here');
  assert.doesNotMatch(technology.left, /open-create-top-level-form" data-category="application"/);
  assert.match(technology.center, /Select an environment/);
  // an environment is selected: its page is the page of Elements
  click(sandbox, { 'data-action': 'select-element', 'data-ref': 'harbour', 'data-layer': 'technology' });
  assert.equal(state.selection.key, 'harbour');
  assert.equal(sandbox.currentRouteHash(), '/timeline/environments?ref=harbour');
  const onEnvironments = sandbox.renderActivePerspectiveHtml();
  sandbox.setPerspective('elements');
  const onElements = sandbox.renderActivePerspectiveHtml();
  assert.equal(onEnvironments.center, onElements.center, 'the same page of the element');
  assert.equal(state.selection.key, 'harbour', 'the selection goes with the page');
});

test('an application element is not on the Environments page: arriving there drops it, and an address that names one opens Elements', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('elements');
  click(sandbox, { 'data-action': 'select-element', 'data-ref': 'fleet', 'data-layer': 'application' });
  assert.equal(state.selection.key, 'fleet');
  sandbox.setPerspective('environments');
  assert.equal(state.selection.kind, 'none', 'the selection is let go, not kept behind a tree that does not list it');
  assert.equal(sandbox.currentRouteHash(), '/timeline/environments');
  const got = opens(sandbox, '#/timeline/environments?ref=fleet');
  assert.deepEqual([got.perspective, got.scope], ['elements', 'all'], 'an application element is the page of Elements');
  assert.equal(state.selection.key, 'fleet');
  assert.equal(opens(sandbox, '#/timeline/environments?ref=harbour').scope, 'technology');
  assert.equal(state.selection.key, 'harbour');
});

test('Environments keeps the diagram tabs of an environment and writes them in its address', async () => {
  const { sandbox } = await openFiles(FERRY);
  opens(sandbox, '#/timeline/environments?ref=harbour&tab=overview');
  sandbox.applySelectionFromHashRef();
  assert.equal(run(sandbox, 'elementTab'), 'overview');
  assert.equal(sandbox.currentRouteHash(), '/timeline/environments?ref=harbour&tab=overview');
});

// ---- the Plateaus page ----

const TIMELINE_PAIRS = [['inhouse', 'baseline'], ['marketplace', 'inhouse'], ['saas', 'baseline']];

test('the Plateaus page lists the plateaus of the layered Brightcart in the order of the band, each with what it changes over the plateau it overrides', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.setPerspective('plateaus');
  // what the band computes one plateau per turn after a drawing; the page shows the counts that are there and says it is counting for the others
  assert.match(sandbox.renderActivePerspectiveHtml().center, /<span class="muted">Counting…<\/span>/);
  assert.equal(sandbox.cachedNodeCounts('saas'), undefined, 'the page computed nothing: a big tree must not hold its first drawing');
  for (const id of state.plateauTree.ids) sandbox.layerNodeCounts(id);
  const page = sandbox.renderActivePerspectiveHtml();
  assert.equal(page.left, null);
  const items = Array.from(page.center.matchAll(/<li class="timeline-item[^"]*" data-plateau="([^"]+)" style="--depth:(\d)"/g), (m) => [m[1], Number(m[2])]);
  assert.deepEqual(items, [['baseline', 0], ['inhouse', 1], ['marketplace', 2], ['saas', 1]], 'the tree of the band, flattened, each indented by its depth');
  assert.deepEqual(Array.from(sandbox.bandOrderOf(state.plateauTree)), items.map((item) => item[0]));
  // the counts of the page are the counts of `archicode diff` for the same pair
  for (const [id, against] of TIMELINE_PAIRS) {
    const wanted = COMPARISONS.get(id === 'marketplace' ? 'P3' : id === 'inhouse' ? 'P2' : 'P1');
    const item = page.center.slice(page.center.indexOf('data-plateau="' + id + '"'));
    const block = item.slice(0, item.indexOf('</li>'));
    const read = (group) => {
      const part = block.slice(block.indexOf('data-counts-of="' + group + '"'));
      const chips = part.slice(0, part.indexOf('</span></span>') + 14);
      const out = {};
      for (const m of chips.matchAll(/data-state="([a-z-]+)"[^>]*>.*?<span class="change-count">(\d+)<\/span>/g)) out[m[1]] = Number(m[2]);
      return out;
    };
    assert.deepEqual({ new: read('elements').new, changed: read('elements').changed, removed: read('elements').removed }, wanted.elements, id + ' over ' + against + ': elements');
    assert.deepEqual({ new: read('relationships').new, changed: read('relationships').changed, removed: read('relationships').removed }, wanted.relationships, id + ' over ' + against + ': relationships');
  }
  assert.match(page.center, /The root: it overrides nothing\./);
});

test('the Plateaus page says where each plateau is written, how many patches and files it has', async () => {
  const { sandbox } = await openLayered();
  const text = stripTags(sandbox.renderPlateausPageHtml());
  assert.match(text, /Build commerce services inhouse 2026-Q4 overrides baseline · described in inhouse\/plateau\.yaml · 26 patches · 11 files/);
  assert.match(text, /Marketplace and personalisation marketplace 2027-Q4 overrides inhouse · described in marketplace\/plateau\.yaml/);
  const { sandbox: headers } = await openFiles({ 'baseline/app.fleet.yaml': SYSTEM('fleet'), 'later/app.jet.yaml': SYSTEM('jet', 'later') });
  const later = stripTags(headers.renderPlateausPageHtml());
  assert.match(later, /overrides baseline · exists only through the plateau key of a header · 0 patches · 1 file/, 'a plateau that exists through a header has no manifest');
});

test('the drawn plateau is marked on the Plateaus page, and Draw and Changes use the band', async () => {
  const { sandbox, state } = await openLayered();
  let page = sandbox.renderPlateausPageHtml();
  assert.match(page, /class="timeline-item timeline-drawn" data-plateau="baseline"/);
  assert.match(page, /data-action="timeline-draw" data-plateau="saas" aria-pressed="false"/);
  assert.doesNotMatch(page, /data-action="timeline-changes" data-plateau="baseline"/, 'the root overrides nothing: nothing to list');
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
  const counts = Array.from(page.right.slice(page.right.indexOf('aria-label="Counts"')).matchAll(/data-state="(new|changed|removed)"[^>]*>.*?<span class="change-count">(\d+)<\/span>/g), (m) => [m[1], Number(m[2])]).slice(0, 3);
  assert.deepEqual(Object.fromEntries(counts), wanted);
  // a row of the list
  const tag = page.right.match(/<button[^>]*data-action="select-change" data-thing="element" data-change="new"[^>]*>/);
  assert.ok(tag, 'a new element is listed');
  const attrs = Object.fromEntries(Array.from(tag[0].matchAll(/(data-[a-z-]+)="([^"]*)"/g), (m) => [m[1], m[2]]));
  const ref = attrs['data-ref'];
  click(sandbox, attrs);
  assert.equal(run(sandbox, 'currentPageId()'), 'elements', 'the Plateaus page shows no element: the row opens it in Elements');
  assert.equal(state.selection.key, ref);
});

test('a workspace with no other plateau has the Plateaus page too: baseline alone, and what a plateau is', async () => {
  const { sandbox } = await openFiles({ 'manifests/app.fleet.yaml': SYSTEM('fleet') });
  sandbox.setPerspective('plateaus');
  const page = sandbox.renderActivePerspectiveHtml();
  assert.equal((page.center.match(/class="timeline-item/g) || []).length, 1);
  assert.match(stripTags(page.center), /This workspace has one plateau, baseline \. A plateau is a layer over another one/);
  assert.equal(page.right, null);
  assert.doesNotMatch(page.center, /timeline-status/, 'nothing to say about a comparison that cannot be made');
  assert.doesNotMatch(page.center, /class="timeline-id"/, 'a plateau with no name is called by its id: the id is not said twice');
  assert.doesNotMatch(page.center, /data-action="timeline-changes"/);
});

test('a workspace with settings.plateaus opens no page: it is refused with the one sentence, so there is no list of plateaus to show and no selector', async () => {
  const mem = memFolder({ 'workspace.yaml': 'settings:\n  plateaus: []\n' });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.match(state.fatalError, /^Could not read\/parse workspace\.yaml: `settings\.plateaus` no longer exists/);
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

test('the stories and views of a page are those of the plateau drawn and of the plateaus it overrides', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  assert.deepEqual(ids(sandbox.storiesList()), ['tour'], 'baseline: its own');
  assert.deepEqual(ids(sandbox.savedViews()), ['fleet_view']);
  sandbox.drawPlateau('fast');
  assert.deepEqual(ids(sandbox.storiesList()), ['speed', 'tour'], 'fast: its own and baseline\'s, not those of its sibling green');
  assert.deepEqual(ids(sandbox.savedViews()), ['fleet_view', 'jet_view']);
  sandbox.drawPlateau('green');
  assert.deepEqual(ids(sandbox.storiesList()), ['tour', 'wind']);
  assert.deepEqual(ids(sandbox.savedViews()), ['fleet_view']);
  assert.equal(state.layers.current, 'green');
});

test('the Stories page says whose stories it lists and how many belong to other plateaus', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.setPerspective('library');
  sandbox.drawPlateau('fast');
  let note = stripTags(sandbox.renderLayerEntriesNoticeHtml());
  assert.match(note, /The stories of Faster crossings and of the plateaus it overrides \( baseline \)\. 1 belongs to other plateaus\. Draw one to see it\./);
  run(sandbox, "libraryTab = 'views'");
  note = stripTags(sandbox.renderLayerEntriesNoticeHtml());
  assert.match(note, /The views of Faster crossings and of the plateaus it overrides \( baseline \)\. *$/, 'green has no view: nothing is left out');
  sandbox.drawPlateau('baseline');
  note = stripTags(sandbox.renderLayerEntriesNoticeHtml());
  assert.match(note, /^ ?The views of Monolith|^ ?The views of baseline/);
  assert.match(note, /1 belongs to other plateaus/);
  // the page itself carries the note
  assert.match(sandbox.renderActivePerspectiveHtml().center, /layer-entries-note/);
});

test('a workspace with no layer lists every story and view, and says nothing about plateaus', async () => {
  const { sandbox } = await openFiles({ 'manifests/app.fleet.yaml': SYSTEM('fleet'), 'manifests/story.tour.yaml': STORY('tour'), 'manifests/view.v.yaml': VIEW('v', 'fleet') });
  assert.deepEqual(ids(sandbox.storiesList()), ['tour']);
  assert.deepEqual(ids(sandbox.savedViews()), ['v']);
  assert.equal(sandbox.renderLayerEntriesNoticeHtml(), '');
  assert.equal(run(sandbox, 'layerChainSet()'), null);
});

test('drawing another plateau lets go of a story or a view it does not have', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.drawPlateau('fast');
  run(sandbox, "selectedStoryId = 'speed'; selectedViewId = 'jet_view'; activeStory = { id: 'speed', step: 0 }");
  sandbox.drawPlateau('green');
  assert.equal(run(sandbox, 'selectedStoryId'), null);
  assert.equal(run(sandbox, 'selectedViewId'), null);
  assert.equal(run(sandbox, 'activeStory'), null);
  run(sandbox, "selectedStoryId = 'tour'");
  sandbox.drawPlateau('fast');
  assert.equal(run(sandbox, 'selectedStoryId'), 'tour', 'one that the new plateau has too stays open');
});

test('a new story or view takes an id that no plateau uses, so that it cannot be declared again in a plateau that overrides', async () => {
  const { sandbox } = await openFiles(FERRY);
  const story = sandbox.createStory('speed'); // drawn: baseline, which does not list the story `speed` of fast
  assert.notEqual(story.id, 'speed');
  assert.equal(story.id, 'speed_2');
});

// ---- Files ----

const MOVED = Object.assign({}, FERRY, {
  'fast/app.slow.yaml': SYSTEM('slow', 'green'), // says green, sits in fast
  'green/app.keel.yaml': SYSTEM('keel'), // says nothing, so baseline, sits in green
  'fast/plateau.later.yaml': PLATEAU('later', 'Later') // declares later, sits in fast
});

test('Files says the plateau of each file, as a badge, and a Plateau manifest is the plateau it declares', async () => {
  const { sandbox } = await openFiles(FERRY);
  sandbox.setPerspective('files');
  sandbox.handleAppClick({ target: { closest: () => ({ getAttribute: (a) => ({ 'data-action': 'set-files-scope', 'data-value': 'all' })[a] ?? null }), classList: { contains: () => false } } });
  const rows = new Map(Array.from(sandbox.renderFilesNavHtml().matchAll(/data-relpath="([^"]+)">\s*<span class="file-relpath">[^<]*<\/span><span class="plateau-badge" data-plateau-of="([^"]+)"/g), (m) => [m[1], m[2]]));
  assert.equal(rows.get('baseline/app.fleet.yaml'), 'baseline', 'no header: baseline');
  assert.equal(rows.get('fast/app.jet.yaml'), 'fast');
  assert.equal(rows.get('fast/plateau.yaml'), 'fast', 'the plateau a manifest of kind Plateau declares');
  assert.equal(rows.get('green/story.wind.yaml'), 'green', 'a story has a plateau too');
  assert.equal(rows.size, Object.keys(FERRY).length);
  assert.equal(sandbox.filePlateauOf(sandbox.__state().manifestFiles.find((f) => f.relPath === 'fast/view.jet_view.yaml')), 'fast');
});

test('Files lists the files of the plateau of the band, with its past, or all of them; the choice is on the page', async () => {
  const { sandbox } = await openFiles(FERRY);
  const listed = () => Array.from(sandbox.renderFilesNavHtml().matchAll(/data-action="select-file" data-relpath="([^"]+)"/g), (m) => m[1]).sort();
  const files = Object.keys(FERRY).sort();
  const of = (plateau) => files.filter((f) => f.startsWith(plateau + '/'));
  assert.deepEqual(listed(), of('baseline'), 'baseline is drawn: its files');
  sandbox.drawPlateau('fast');
  assert.deepEqual(listed(), of('fast'), 'fast is drawn: its files');
  assert.match(stripTags(sandbox.renderFilesNavHtml()), /Plateau drawn: fast/);
  assert.match(stripTags(sandbox.renderFilesNavHtml()), /7 files of other plateaus are not listed\./);
  click(sandbox, { 'data-action': 'set-files-scope', 'data-value': 'chain' });
  assert.deepEqual(listed(), of('baseline').concat(of('fast')).sort(), 'with its past: the files of fast and baseline, not green');
  click(sandbox, { 'data-action': 'set-files-scope', 'data-value': 'all' });
  assert.deepEqual(listed(), files);
  assert.doesNotMatch(stripTags(sandbox.renderFilesNavHtml()), /not listed/);
  click(sandbox, { 'data-action': 'set-files-scope', 'data-value': 'plateau' });
  sandbox.drawPlateau('green');
  assert.deepEqual(listed(), of('green'), 'the list follows the band');
  const bar = sandbox.renderFilesNavHtml();
  assert.match(bar, /data-action="set-files-scope" data-value="plateau" aria-pressed="true"/);
  assert.match(bar, /data-action="set-files-scope" data-value="all" aria-pressed="false"/);
});

test('the file that is open stays in the list, and so does a file that could not be read', async () => {
  const { sandbox, state } = await openFiles(Object.assign({ 'baseline/broken.yaml': 'header: [unclosed\n' }, FERRY));
  const listed = () => Array.from(sandbox.renderFilesNavHtml().matchAll(/data-action="select-file" data-relpath="([^"]+)"/g), (m) => m[1]);
  sandbox.drawPlateau('green');
  assert.ok(listed().includes('baseline/broken.yaml'), 'a file with an error belongs to no plateau: it is always listed');
  assert.ok(!listed().includes('baseline/app.fleet.yaml'));
  state.selection = { kind: 'file', key: 'baseline/app.fleet.yaml', mode: 'view' };
  assert.ok(listed().includes('baseline/app.fleet.yaml'), 'the open file is not lost from the list');
  assert.match(sandbox.renderFilesNavHtml(), /data-relpath="baseline\/broken\.yaml">\s*<span class="file-relpath">[^<]*<\/span><span class="error-badge"/, 'and it has no plateau badge');
});

test('a workspace with no layer lists every file, with no filter and no badge, as it always did', async () => {
  const { sandbox } = await openFiles({ 'manifests/app.fleet.yaml': SYSTEM('fleet'), 'manifests/env.harbour.yaml': ENVIRONMENT('harbour') });
  const nav = sandbox.renderFilesNavHtml();
  assert.equal((nav.match(/data-action="select-file"/g) || []).length, 2);
  assert.doesNotMatch(nav, /files-scope|plateau-badge|warning-badge/);
});

test('a manifest whose plateau disagrees with the folder it is in, when that is the name of another plateau, gets a warning', async () => {
  const { sandbox } = await openFiles(MOVED);
  const warning = (relPath) => sandbox.filePlateauFolderWarning(sandbox.__state().manifestFiles.find((f) => f.relPath === relPath));
  assert.equal(warning('fast/app.slow.yaml'), '`fast/app.slow.yaml` says `plateau: green` in its header, but it sits in the folder `fast`, which is the name of another plateau');
  assert.equal(warning('green/app.keel.yaml'), '`green/app.keel.yaml` has no `plateau` key in its header, so it belongs to `baseline`, but it sits in the folder `green`, which is the name of another plateau');
  assert.equal(warning('fast/plateau.later.yaml'), '`fast/plateau.later.yaml` declares the plateau `later`, but it sits in the folder `fast`, which is the name of another plateau');
  // the ones that agree, or that sit in no folder named like a plateau, have none
  for (const ok of ['fast/app.jet.yaml', 'fast/plateau.yaml', 'baseline/app.fleet.yaml', 'green/story.wind.yaml']) assert.equal(warning(ok), null, ok);
  // the deepest folder that is a plateau counts
  const nested = await openFiles({ 'baseline/app.fleet.yaml': SYSTEM('fleet'), 'fast/deep/app.a.yaml': SYSTEM('a', 'fast'), 'fast/baseline/app.b.yaml': SYSTEM('b', 'fast'), 'other/app.c.yaml': SYSTEM('c', 'fast') });
  const w = (relPath) => nested.sandbox.filePlateauFolderWarning(nested.state.manifestFiles.find((f) => f.relPath === relPath));
  assert.equal(w('fast/deep/app.a.yaml'), null);
  assert.match(w('fast/baseline/app.b.yaml'), /sits in the folder `baseline`/);
  assert.equal(w('other/app.c.yaml'), null, 'a folder that is no plateau says nothing');
});

test('the warning is on the row, in the list\'s count, and on the page of the file; nothing is blocked', async () => {
  const { sandbox, state } = await openFiles(MOVED);
  sandbox.setPerspective('files');
  click(sandbox, { 'data-action': 'set-files-scope', 'data-value': 'all' });
  const nav = sandbox.renderFilesNavHtml();
  assert.equal((nav.match(/class="warning-badge"/g) || []).length, 3);
  assert.match(stripTags(nav), /3 files sit in the folder of another plateau\./);
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.slow.yaml' });
  assert.equal(state.selection.key, 'fast/app.slow.yaml');
  const center = sandbox.renderActivePerspectiveHtml().center;
  assert.match(center, /class="nav-facet-note file-plateau-warning" role="status"><strong>Warning:<\/strong> <code>fast\/app\.slow\.yaml<\/code> says <code>plateau: green<\/code>/);
  assert.match(center, /Nothing is wrong for the tools/);
  click(sandbox, { 'data-action': 'select-file', 'data-relpath': 'fast/app.jet.yaml' });
  assert.doesNotMatch(sandbox.renderActivePerspectiveHtml().center, /file-plateau-warning/, 'a file that agrees has no warning');
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
  const html = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  assert.match(html, /\.page-tabs \{[^}]*flex-wrap: wrap;[^}]*min-width: 0;[^}]*max-width: 100%;/);
  assert.match(html, /\.timeline-item \{[^}]*min-width: 0;[^}]*margin-left: calc\(var\(--depth, 0\) \* 1rem\);/);
  assert.match(html, /\.timeline-main \{[^}]*flex-wrap: wrap;/);
  assert.match(html, /\.grid-rows-\\\[auto_auto_auto_minmax\\\(0\\,1fr\\\)\\\] \{ grid-template-rows: auto auto auto minmax\(0, 1fr\); \}/);
  assert.match(html, /\.files-scope \{[^}]*flex-wrap: wrap;/);
  // 360 px (issue #82): four pages in one row, and the fields of Settings under their labels, never wider than what holds them
  assert.match(html, /\.page-tabs \.button-group \{ flex-wrap: wrap; max-width: 100%;/);
  const narrow = html.slice(html.indexOf('@media (max-width: 40rem) {'), html.indexOf('</style>'));
  assert.equal((html.match(/@media \(max-width: 40rem\)/g) || []).length, 1, 'one rule for the narrow window: the tests of run 0073 read the first');
  assert.match(narrow, /\.page-tabs button \{ padding: 0 0\.45rem !important;/);
  assert.match(narrow, /\.settings-view \.field-row \{ flex-wrap: wrap;/);
  assert.match(narrow, /\.settings-view \.field-label \{ width: 100%; \}/);
  assert.match(narrow, /\.settings-view \.field-value \{ flex-basis: 100%; \}/);
  assert.match(html, /\.settings-view input\[type="text"\], \.settings-view select, \.settings-view textarea \{ max-width: 100%; min-width: 0;/);
});

// ---- what the review of the run found ----

test('an address that names an application element on Environments is Elements when the workspace is loaded, as a bookmark is', async () => {
  const sandbox = createApp({});
  run(sandbox, "location.hash = '#/timeline/environments?ref=fleet'");
  sandbox.syncPerspectiveFromHash();
  const mem = memFolder(Object.assign({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n' }, FERRY));
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.deepEqual([run(sandbox, 'currentPageId()'), state.selection.key], ['elements', 'fleet'], 'the tree of Environments does not list it');
  sandbox.syncHashFromState(); // the end of the drawing
  assert.equal(sandbox.location.hash, '#/timeline/elements?ref=fleet', 'and the address says so');
});

test('a link from Environments to an application element, and a row of the Changes panel, open Elements', async () => {
  const { sandbox, state } = await openFiles(FERRY);
  sandbox.setPerspective('environments');
  click(sandbox, { 'data-action': 'select-element', 'data-ref': 'harbour', 'data-layer': 'technology' });
  assert.equal(run(sandbox, 'currentPageId()'), 'environments');
  click(sandbox, { 'data-action': 'goto-element', 'data-ref': 'fleet', 'data-layer': 'application' });
  assert.equal(state.selection.key, 'fleet');
  assert.equal(run(sandbox, 'currentPageId()'), 'elements', 'the tree of Environments cannot show the row of an application element');
  assert.equal(sandbox.currentRouteHash(), '/timeline/elements?ref=fleet');
  // an environment stays on Environments
  sandbox.setPerspective('environments');
  click(sandbox, { 'data-action': 'goto-element', 'data-ref': 'harbour', 'data-layer': 'technology' });
  assert.equal(run(sandbox, 'currentPageId()'), 'environments');
});

test('renaming an element reaches the views and stories of every plateau, and deleting a view counts the steps of every plateau', async () => {
  const files = Object.assign({}, FERRY, {
    'fast/view.fleet_fast.yaml': VIEW('fleet_fast', 'fleet', 'fast'),
    'fast/story.uses_view.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\n  plateau: "fast"\ncontent:\n  id: "uses_view"\n  name: "Uses a view"\n  steps:\n    - view: "fleet_view"\n      text: "the fleet"\n    - viewpoint: overview\n      layer: application\n      properties:\n        element: "fleet"\n      text: "its own"\n'
  });
  const { sandbox, state } = await openFiles(files);
  assert.deepEqual(ids(sandbox.savedViews()), ['fleet_view'], 'baseline is drawn: the view of fast is not listed');
  assert.equal(sandbox.storiesUsingView('fleet_view'), 1, 'but the step of the story of fast that shows the baseline view is counted: deleting the view says so');
  sandbox.rewriteInboundReferences('fleet', 'armada', 'application');
  const file = (relPath) => state.manifestFiles.find((f) => f.relPath === relPath);
  assert.equal(file('fast/view.fleet_fast.yaml').content.properties.element, 'armada', 'the view of a plateau that is not drawn follows the rename');
  assert.equal(file('baseline/view.fleet_view.yaml').content.properties.element, 'armada');
  assert.equal(file('fast/story.uses_view.yaml').content.steps[1].properties.element, 'armada', 'and so does the step that carries its own view');
  assert.ok(file('fast/view.fleet_fast.yaml').dirty && file('fast/story.uses_view.yaml').dirty, 'the files are written with the rest');
});

test('the count of a move reaches the views and stories of every plateau, as the move does', async () => {
  const files = Object.assign({}, FERRY, { 'fast/view.fleet_fast.yaml': VIEW('fleet_fast', 'fleet', 'fast') });
  const { sandbox } = await openFiles(files);
  assert.equal(sandbox.scanMoveReferences('fleet', 'application').views, 2, 'the view of baseline and the view of fast');
});

test('a view or story of workspace.yaml whose id a manifest of another plateau has is not moved, and does not show twice', async () => {
  const settings = 'settings:\n  manifests:\n    paths: ["./**"]\nstories:\n  - id: speed\n    name: Old speed\n    steps: []\n  - id: only_old\n    name: Only old\n    steps: []\n';
  const { sandbox } = await openFiles(FERRY, settings);
  assert.deepEqual(ids(sandbox.legacyEntriesToMove().stories), ['only_old'], 'speed is declared by a manifest of fast: moving it would declare it twice');
  assert.deepEqual(ids(sandbox.storiesList()), ['only_old', 'tour'], 'baseline is drawn: the entry that a manifest of fast shadows is not shown');
  sandbox.drawPlateau('fast');
  assert.deepEqual(ids(sandbox.storiesList()), ['only_old', 'speed', 'tour']);
});

test('the Plateaus page loads the kernel its Changes panel waits for, and writes the panel again', async () => {
  const { sandbox } = await openFiles(FERRY);
  run(sandbox, "globalThis.__loads = 0; globalThis.__refreshes = 0; loadViewpointKernel = async () => { __loads++; }; refreshRightPanel = () => { __refreshes++; };");
  const tick = () => new Promise((resolve) => setImmediate(resolve));
  for (const [perspective, pending, loads] of [['plateaus', true, 1], ['plateaus', false, 1], ['map', true, 1]]) {
    run(sandbox, "currentPerspective = " + JSON.stringify(perspective) + "; rightPanelPending = " + pending + "; settlePlateausPanel();");
    await tick();
    assert.equal(run(sandbox, '__loads'), loads, perspective + ' / pending ' + pending);
  }
  assert.equal(run(sandbox, '__refreshes'), 1, 'the panel is written once, when the kernel is there');
  // and every drawing asks (the harness does not draw the page: the call is read in the function that does)
  const html = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  const render = html.slice(html.indexOf('\nfunction render() {'));
  assert.ok(render.indexOf('mountDiagramIfNeeded();\n  settlePlateausPanel();') > 0 && render.indexOf('mountDiagramIfNeeded();\n  settlePlateausPanel();') < render.indexOf('\n}\n'), 'render() settles the panel of the Plateaus page after it mounts the diagrams');
});

test('a row of the Changes panel on the Plateaus page leaves an entry of the history for the page it leaves', async () => {
  const { sandbox } = await openLayered();
  sandbox.setPerspective('plateaus');
  click(sandbox, { 'data-action': 'timeline-changes', 'data-plateau': 'saas' });
  sandbox.syncHashFromState(); // the end of the drawing
  const entries = [];
  sandbox.history.pushState = (s, t, url) => entries.push(url);
  Object.defineProperty(sandbox.location, 'href', { get: () => 'http://localhost/editor.html' + sandbox.location.hash });
  const tag = sandbox.renderActivePerspectiveHtml().right.match(/<button[^>]*data-action="select-change" data-thing="element" data-change="new"[^>]*>/)[0];
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
  assert.match(stripTags(sandbox.renderPlateausPageHtml()), /Buy the commerce platform is compared with Monolith: the Changes panel on the right lists what differs\./);
  // a plateau the comparison cannot be made on
  run(sandbox, "comparisonState = () => ({ problems: ['x'] })");
  assert.match(stripTags(sandbox.renderPlateausPageHtml()), /compared with Monolith, but the two cannot be compared: the band says what is wrong\./);
  assert.ok(state.layers.compare);
});
