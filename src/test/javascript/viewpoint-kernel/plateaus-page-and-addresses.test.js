'use strict';
// The page Plateaus and the addresses (wave 015, run 0096, W-8; issues #99 and #91). The page that lists and edits the plateaus is called Plateaus (it was Timeline) and
// lives at "#/timeline/plateaus" ("#/plateaus" is no route any more); the perspective Timeline opens on Applications; and an address typed while the editor is open (or
// reached by Back and Forward) draws the plateau and the comparison it names, through `drawPlateau`, reading nothing from the disk and losing nothing, with one entry of
// the history per plateau the author chooses. The layered Brightcart (src/test/resources/brightcart/layered/) is copied into an in-memory folder; the history is the one of
// the harness (`sandbox.history.back()` puts the old address back and fires hashchange, as a browser does).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { click } = require('./library-page');
const { chooseOnBand } = require('./layered-folders');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

const LAYERED_FILES = walk(LAYERED, LAYERED, {});

async function openIn(files) {
  const mem = memFolder(Object.assign({}, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  // The harness has no layout engine, so a page that draws a diagram cannot be drawn whole: `render()` is its last step, which writes the address (`syncHashFromState`).
  sandbox.render = () => {
    sandbox.syncHashFromState();
  };
  sandbox.render(); // the end of the first drawing: the address says what is on screen
  return { sandbox, state, mem };
}

const openLayered = () => openIn(LAYERED_FILES);

/** What a browser does when the address is typed: the new address is an entry, and hashchange fires. */
function typeAddress(sandbox, hash) {
  sandbox.location.hash = hash;
  for (const fn of sandbox.__windowListeners.hashchange) fn();
}

const where = (sandbox, state) => ({
  plateau: state.layers.current,
  compare: run(sandbox, 'layerCompareChoice()'),
  page: run(sandbox, 'currentPerspective'),
  hash: sandbox.location.hash
});

// ---- the page Plateaus (#99) ----

test('the page is called Plateaus, at #/timeline/plateaus, and #/plateaus is no route any more', async () => {
  const { sandbox } = await openLayered();
  assert.equal(run(sandbox, 'PERSPECTIVES.plateaus.label'), 'Plateaus');
  assert.equal(run(sandbox, 'PERSPECTIVES.plateaus.route'), 'timeline/plateaus');
  assert.equal(
    run(sandbox, "Object.prototype.hasOwnProperty.call(PERSPECTIVES, 'timeline')"),
    false,
    'no page is called Timeline: Timeline is the perspective'
  );
  for (const hash of ['#/timeline/plateaus', '#/timeline/plateaus?plateau=saas']) {
    run(sandbox, 'location.hash = ' + JSON.stringify(hash));
    sandbox.syncPerspectiveFromHash();
    assert.equal(run(sandbox, 'currentPerspective'), 'plateaus', hash);
  }
  const center = sandbox.renderPlateausPageHtml();
  assert.match(center, /<h2>Plateaus<\/h2>/);
  assert.doesNotMatch(center, /<h2>Timeline<\/h2>/);
});

test('#/timeline alone is no route, it opens the default page, Applications, whatever follows it, and the page then writes #/timeline/applications', async () => {
  const { sandbox, state } = await openLayered();
  for (const [typed, written] of [
    ['#/timeline', '#/timeline/applications'],
    ['#/timeline?x=1', '#/timeline/applications'],
    ['#/timeline/nowhere', '#/timeline/applications']
  ]) {
    typeAddress(sandbox, typed);
    assert.equal(run(sandbox, 'currentPerspective'), 'map', typed);
    assert.equal(sandbox.location.hash, written, typed + ' is no route: the default page is written');
  }
  assert.equal(state.layers.current, 'baseline');
});

test('the page Plateaus makes a plateau and edits one: the controls are on it and nowhere else (the band is read-only)', async () => {
  const { sandbox } = await openLayered();
  sandbox.drawPlateau('saas');
  const page = sandbox.renderPlateausPageHtml();
  assert.match(
    page,
    /<div class="timeline-writing"[^>]*><span class="band-writing">/,
    'in one place, above the list, for the plateau drawn'
  );
  assert.match(page, /writing in: <strong>Buy the commerce platform<\/strong> <code>saas<\/code>/);
  assert.match(page, /data-action="plateau-create" data-plateau="saas"[^>]*>New plateau</);
  assert.match(page, /data-action="plateau-edit" data-plateau="saas"[^>]*>Edit plateau</);
  assert.doesNotMatch(
    sandbox.renderPlateauBandHtml(),
    /band-writing|plateau-create|plateau-edit/,
    'and not on the band'
  );
  click(sandbox, { 'data-action': 'plateau-edit', 'data-plateau': 'saas' });
  assert.equal(run(sandbox, 'appDialog').kind, 'plateau-form');
  assert.equal(run(sandbox, 'appDialog').mode, 'edit');
  run(sandbox, 'appDialog = null');
  click(sandbox, { 'data-action': 'plateau-create', 'data-plateau': 'saas' });
  assert.equal(run(sandbox, 'appDialog').mode, 'create');
  assert.equal(run(sandbox, 'appDialog').values.parent, 'saas');
});

// ---- an address typed while the editor is open (#91) ----

test('an address that names a plateau draws it: nothing is read from the disk and nothing is lost', async () => {
  const { sandbox, state, mem } = await openLayered();
  const workspace = state.workspace;
  const files = state.manifestFiles;
  // an unsaved edit of saas (a patch in its manifest): it is not in inhouse, and must still be in saas when the address comes back to it
  sandbox.drawPlateau('saas');
  const inherited = sandbox.layerModelOf('inhouse', workspace.settings).index.application.get('shop.web').name;
  assert.equal(
    sandbox.commitElementEdit(
      'shop.web',
      (n) => {
        n.name = 'Shop front';
      },
      'application'
    ),
    undefined
  );
  const dirty = state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath);
  assert.deepEqual(plain(dirty), ['saas/plateau.yaml']);
  mem.failGetFile = 'the disk was read'; // any read of the folder from here on is an error
  typeAddress(sandbox, '#/files?plateau=inhouse');
  assert.equal(state.layers.current, 'inhouse', 'the plateau of the address is drawn');
  assert.equal(run(sandbox, 'currentPerspective'), 'files');
  assert.equal(state.fatalError, null);
  assert.equal(
    state.index,
    sandbox.layerModelOf('inhouse', workspace.settings).index,
    'what is drawn is the resolution of inhouse'
  );
  assert.equal(state.index.application.get('shop.web').name, inherited);
  assert.equal(sandbox.location.hash, '#/files?plateau=inhouse', 'the page writes its own address back, the same');
  typeAddress(sandbox, '#/files?plateau=saas');
  assert.equal(state.layers.current, 'saas');
  assert.equal(state.index.application.get('shop.web').name, 'Shop front', 'the edit made before is in what is drawn');
  assert.equal(state.workspace, workspace, 'the workspace is the one that was open');
  assert.equal(state.manifestFiles, files, 'and so are its files');
  assert.deepEqual(
    plain(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)),
    plain(dirty),
    'the edit is still unsaved'
  );
  assert.equal(state.fatalError, null);
});

test('an address that names no plateau is the root, one that names a plateau that does not exist leaves the plateau drawn', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('marketplace');
  typeAddress(sandbox, '#/timeline/elements?plateau=nowhere');
  assert.equal(
    state.layers.current,
    'marketplace',
    'there is no such plateau: nothing is drawn but the address is made true'
  );
  assert.equal(sandbox.location.hash, '#/timeline/elements?plateau=marketplace');
  typeAddress(sandbox, '#/timeline/elements');
  assert.equal(
    state.layers.current,
    'baseline',
    'the page writes no plateau for the root, so an address with none is the root (it is what Back returns to)'
  );
  assert.equal(sandbox.location.hash, '#/timeline/elements');
});

test('an address that names a comparison draws it, with the plateau, in one go', async () => {
  const { sandbox, state } = await openLayered();
  const cases = [
    ['#/timeline/applications?plateau=marketplace&compare=past', 'marketplace', 'past', 'inhouse'],
    ['#/timeline/applications?plateau=marketplace&compare=other%3Asaas', 'marketplace', 'other:saas', 'saas'],
    [
      '#/timeline/applications?plateau=inhouse&compare=future%3Amarketplace',
      'inhouse',
      'future:marketplace',
      'marketplace'
    ],
    ['#/timeline/applications?plateau=saas&compare=past', 'saas', 'past', 'baseline']
  ];
  for (const [hash, plateau, choice, other] of cases) {
    typeAddress(sandbox, hash);
    assert.equal(state.layers.current, plateau, hash);
    assert.equal(run(sandbox, 'layerCompareChoice()'), choice, hash);
    assert.equal(state.baseline.plateau.id, other, hash + ': the plateau compared with is read');
  }
  // an empty compare= is no comparison; an address without one leaves the comparison alone (the page writes compare= only with a removed element)
  typeAddress(sandbox, '#/timeline/applications?plateau=saas&compare=past');
  typeAddress(sandbox, '#/timeline/applications?plateau=saas');
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'past', 'nothing is said about the comparison');
  typeAddress(sandbox, '#/timeline/applications?plateau=saas&compare=');
  assert.equal(state.layers.compare, null, 'said to be nothing');
  assert.equal(state.baseline, null);
  // a comparison that the plateau cannot honour is read as the band reads it: the root overrides nothing
  typeAddress(sandbox, '#/timeline/applications?compare=past');
  assert.deepEqual([state.layers.current, state.layers.compare], ['baseline', null]);
});

test('an address is not followed while a write is in flight: the plateau written to stays the one drawn', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  run(sandbox, 'saveInFlight = true');
  typeAddress(sandbox, '#/files?plateau=inhouse');
  assert.equal(state.layers.current, 'saas');
  run(sandbox, 'saveInFlight = false');
  assert.equal(sandbox.location.hash, '#/files?plateau=saas', 'and the address says what is drawn');
});

test('an address is not followed while a dialog is open: the form or the question keeps the plateau it was opened in', async () => {
  const { sandbox, state } = await openLayered();
  sandbox.drawPlateau('saas');
  click(sandbox, { 'data-action': 'plateau-edit', 'data-plateau': 'saas' });
  assert.equal(run(sandbox, 'appDialog').kind, 'plateau-form');
  typeAddress(sandbox, '#/files?plateau=inhouse');
  assert.equal(state.layers.current, 'saas');
  assert.equal(sandbox.location.hash, '#/files?plateau=saas');
  run(sandbox, 'appDialog = null');
  typeAddress(sandbox, '#/files?plateau=inhouse');
  assert.equal(state.layers.current, 'inhouse', 'with the dialog closed the address is followed');
});

test('a drawing that fails does not leave the next address to be a new entry of the history', async () => {
  const { sandbox } = await openLayered();
  const history = sandbox.__history;
  const real = sandbox.render;
  sandbox.render = () => {
    throw new Error('the drawing failed');
  };
  assert.throws(() => sandbox.drawPlateau('saas'), /the drawing failed/);
  sandbox.render = real;
  const entries = history.entries.length;
  sandbox.render(); // the next drawing, of whatever
  assert.equal(history.entries.length, entries, 'it rewrites the address, it is not the plateau chosen');
  assert.equal(sandbox.location.hash, '#/timeline/applications?plateau=saas');
});

test('a workspace with no plateau ignores plateau= and compare=: it has the root only', async () => {
  const { sandbox, state } = await openIn({
    '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml':
      'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n'
  });
  typeAddress(sandbox, '#/files?plateau=saas&compare=past');
  assert.deepEqual([state.layers.current, state.layers.compare], ['baseline', null]);
  assert.equal(sandbox.location.hash, '#/files');
});

test('the selection an address names is found in the plateau the same address names', async () => {
  const { sandbox, state } = await openLayered();
  // an element that only a later plateau has
  const marketplace = sandbox.layerModelOf('marketplace', state.workspace.settings).index.application;
  const root = sandbox.layerModelOf('baseline', state.workspace.settings).index.application;
  const only = Array.from(marketplace.keys()).find((key) => !root.has(key));
  assert.ok(only, 'the fixture has an element marketplace adds');
  typeAddress(sandbox, '#/timeline/elements?ref=' + encodeURIComponent(only) + '&plateau=marketplace');
  assert.equal(state.layers.current, 'marketplace');
  assert.equal(state.selection.key, only, 'the plateau is drawn before the selection is read');
});

// ---- the history: one entry per plateau chosen, and Back and Forward change it (#91) ----

test('choosing a plateau is an entry of the history, and Back and Forward between two addresses that differ by the plateau change it', async () => {
  const { sandbox, state } = await openLayered();
  const history = sandbox.__history;
  const start = history.entries.length;
  assert.equal(sandbox.location.hash, '#/timeline/applications');
  chooseOnBand(sandbox, 'plateau', 'saas');
  assert.equal(sandbox.location.hash, '#/timeline/applications?plateau=saas');
  assert.equal(history.entries.length, start + 1, 'one entry for the plateau');
  assert.deepEqual(
    history.entries.slice(-2),
    ['#/timeline/applications', '#/timeline/applications?plateau=saas'],
    'the place before is kept, not rewritten'
  );
  sandbox.render(); // a drawing of the same state adds nothing
  assert.equal(history.entries.length, start + 1);
  click(sandbox, { 'data-action': 'timeline-draw', 'data-plateau': 'inhouse' });
  assert.equal(history.entries.length, start + 2);
  sandbox.history.back();
  assert.deepEqual(
    [state.layers.current, sandbox.location.hash],
    ['saas', '#/timeline/applications?plateau=saas'],
    'Back draws the plateau before'
  );
  assert.equal(history.entries.length, start + 2, 'and adds no entry, nor rewrites one');
  sandbox.history.back();
  assert.deepEqual([state.layers.current, sandbox.location.hash], ['baseline', '#/timeline/applications']);
  sandbox.history.forward();
  sandbox.history.forward();
  assert.deepEqual(
    [state.layers.current, sandbox.location.hash],
    ['inhouse', '#/timeline/applications?plateau=inhouse']
  );
  assert.equal(history.entries.length, start + 2);
});

test('Back across a change of page and of plateau returns to both', async () => {
  const { sandbox, state } = await openLayered();
  chooseOnBand(sandbox, 'plateau', 'saas');
  sandbox.setPerspective('files');
  assert.deepEqual([run(sandbox, 'currentPerspective'), state.layers.current], ['files', 'saas']);
  sandbox.history.back();
  assert.deepEqual([run(sandbox, 'currentPerspective'), state.layers.current], ['map', 'saas']);
  sandbox.history.back();
  assert.deepEqual([run(sandbox, 'currentPerspective'), state.layers.current], ['map', 'baseline']);
});

test('a comparison chosen on the band does not add an entry (the address does not change), and the Changes button of the page adds one for its plateau', async () => {
  const { sandbox, state } = await openLayered();
  const history = sandbox.__history;
  chooseOnBand(sandbox, 'plateau', 'marketplace');
  const entries = history.entries.length;
  chooseOnBand(sandbox, 'compare', 'past');
  assert.equal(run(sandbox, 'layerCompareChoice()'), 'past');
  assert.equal(
    history.entries.length,
    entries,
    'Past is not in the address: it is a choice of whoever looks, kept for the folder'
  );
  click(sandbox, { 'data-action': 'timeline-changes', 'data-plateau': 'saas' });
  assert.deepEqual([state.layers.current, run(sandbox, 'layerCompareChoice()')], ['saas', 'past']);
  assert.equal(history.entries.length, entries + 1);
  assert.equal(history.entries[entries], '#/timeline/applications?plateau=saas');
});

test('a plateau chosen is remembered for the folder, as before', async () => {
  const { sandbox } = await openLayered();
  chooseOnBand(sandbox, 'plateau', 'saas');
  typeAddress(sandbox, '#/files?plateau=marketplace&compare=past');
  assert.equal(run(sandbox, 'recalledPlateauId()'), 'marketplace', 'an address that draws a plateau is a choice made');
  assert.equal(run(sandbox, 'recalledComparison()'), 'past');
});
