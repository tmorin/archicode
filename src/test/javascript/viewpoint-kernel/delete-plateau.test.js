'use strict';
// A plateau is deleted from the page Plateaus (wave 015, run 0102, W-14, issue #93). Any plateau but the root can go (one that others override: wave 018, run 0132, #112,
// delete-plateau-in-the-middle.test.js); a dialog lists the files that go (its manifest of kind plateau and every manifest whose header says its id) and, for a leaf, nothing else goes. A `settings.current` that names it is taken out of
// .archicode.yaml; a step of a story that names it, or a view or a step that names an element only it declares, refuses the delete (the author changes them in Stories).
// The write runs under `guardedLayerWrite`: refused, it puts everything back. The layered Brightcart (src/test/resources/brightcart/layered/: baseline, inhouse over
// baseline, marketplace over inhouse, saas over baseline) is copied into an in-memory folder; "Save all changes" writes the folder and the files are compared byte for byte.
// The other workspaces here are invented (a ferry company).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

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

// The layered Brightcart as the plateaus are deleted from it: without the views and the stories it ships in `shared/` (run 0110, #115), which name `saas` and `marketplace` and refuse
// this very delete. That they do is tested on the shipped files in brightcart-views-and-stories.test.js; here the delete is the subject, so it starts from the elements and the plateaus.
const BRIGHTCART = Object.fromEntries(Object.entries(walk(LAYERED, LAYERED, {})).filter(([file]) => !file.startsWith('shared/')));
const SAAS_FILES = ['saas/application/commerce-saas.yaml', 'saas/plateau.yaml', 'saas/technology/partners.commerce-live.yaml', 'saas/technology/sandbox.commerce-sandbox.yaml'];

async function open(files, options) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  if (options && options.drawn) sandbox.drawPlateau(options.drawn);
  if (options && options.compared) sandbox.compareWithPlateau(options.compared);
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

/** Saves the folder: the files whose text changed, the files that are new, and the files removed. */
async function saved(opened) {
  await opened.sandbox.saveAllChanges();
  const changed = [];
  const added = [];
  for (const [p, f] of opened.mem.files) {
    if (!(p in opened.original)) added.push(p);
    else if (f.text !== opened.original[p]) changed.push(p);
  }
  return { changed: changed.sort(), added: added.sort(), removed: opened.mem.removals.slice().sort(), status: plain(run(opened.sandbox, 'saveStatus')) };
}

const withSettings = (files, line) => Object.assign({}, files, { '.archicode.yaml': files['.archicode.yaml'].replace(/^settings:\n/, 'settings:\n' + line + '\n') });
const drawing = (state) => ({ plateau: state.layers.current, compare: state.layers.compare ? state.layers.compare.other : null });
const dialogHtml = (sandbox) => sandbox.renderAppDialogHtml();
const text = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const STORY = (id, steps) => 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;
const VIEW = (id, element) => 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  viewpoint: overview\n  properties:\n    element: ' + element + '\n';

// ---- what can be deleted ----

test('a plateau that another plateau overrides is not refused for that alone (run 0132, #112): inhouse is refused by what marketplace would be without it, and nothing changes', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'inhouse' });
  const { sandbox, state } = opened;
  const plan = plain(sandbox.plateauDeletion('inhouse'));
  assert.deepEqual(plan.overriding, ['marketplace']);
  assert.equal(plan.refusal, null);
  assert.match(plan.breaks[0], /^the plateau `marketplace` could no longer be resolved \(plateau marketplace: patch 3 \(ADD target commerce\.checkout\): selects nothing/);
  assert.throws(() => sandbox.commitPlateauDelete('inhouse'), /^Error: The plateau `inhouse` cannot be deleted: 2 mistakes would appear in the plateaus that stand on it /);
  sandbox.openPlateauDeleteDialog('inhouse');
  const html = dialogHtml(sandbox);
  assert.match(html, /<li data-plateau="marketplace"><code>marketplace<\/code> Marketplace and personalisation, over <code>baseline<\/code> instead of <code>inhouse<\/code>:/);
  assert.doesNotMatch(html, /Delete plateau<\/button>/, 'no button deletes it');
  assert.equal(state.plateauTree.nodes.has('inhouse'), true);
  assert.deepEqual(plain(state.pendingFileRemovals), []);
  const out = await saved(opened);
  assert.deepEqual(out, { changed: [], added: [], removed: [], status: out.status });
});

test('the plateaus that override it are all named, in the order of the band', async () => {
  const files = Object.assign({}, BRIGHTCART, {
    'inhouse2/plateau.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "alt"\n  override: "inhouse"\n'
  });
  const { sandbox } = await open(files);
  const plan = plain(sandbox.plateauDeletion('inhouse'));
  assert.deepEqual(plan.overriding, ['marketplace', 'alt'], 'the order of the band: a plateau with a horizon before one without');
  assert.deepEqual(plan.rewritten.map((r) => r.relPath), ['marketplace/plateau.yaml', 'inhouse2/plateau.yaml'], 'each goes under baseline in its own manifest (run 0132)');
  assert.deepEqual(plan.above.map((a) => a.id), ['alt', 'marketplace'], 'what each plateau above loses is told, in the order of the tree');
});

test('the root cannot be deleted, and no button offers it', async () => {
  const { sandbox } = await open(BRIGHTCART);
  assert.equal(sandbox.plateauDeletion('baseline').refusal, 'The plateau `baseline` is the root of the plateaus: every other plateau stands on it, so it cannot be deleted.');
  assert.throws(() => sandbox.commitPlateauDelete('baseline'), /is the root of the plateaus/);
  assert.doesNotMatch(sandbox.plateauWritingHtml(), /data-action="plateau-delete"/, 'baseline is drawn: the controls of the page offer no delete');
  const page = sandbox.renderPlateausPageHtml();
  const deletes = Array.from(page.matchAll(/data-action="plateau-delete" data-plateau="([^"]+)"/g)).map((m) => m[1]);
  assert.deepEqual(deletes.sort(), ['inhouse', 'marketplace', 'saas'], 'every plateau but the root has the button (the dialog says why inhouse cannot go)');
  sandbox.drawPlateau('saas');
  assert.match(sandbox.plateauWritingHtml(), /data-action="plateau-delete" data-plateau="saas"[^>]*>Delete plateau<\/button>/);
});

test('a workspace with no plateau has nothing to delete', async () => {
  const { sandbox } = await open({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n', 'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: ferry\n' });
  assert.match(sandbox.plateauDeletion('baseline').refusal, /no plateau but baseline/);
  assert.doesNotMatch(sandbox.renderPlateausPageHtml(), /plateau-delete/);
});

// ---- the dialog ----

test('the dialog lists exactly the files that go: the manifest of the plateau and the manifests whose header says it', async () => {
  const files = Object.assign({}, BRIGHTCART, { 'shared/view.saas-header.yaml': VIEW('mono', 'shop').replace('header:\n', 'header:\n  plateau: saas\n') });
  const { sandbox, state } = await open(files, { drawn: 'saas' });
  const plan = plain(sandbox.plateauDeletion('saas'));
  assert.equal(plan.refusal, null);
  assert.deepEqual(plan.files.map((f) => f.relPath), SAAS_FILES);
  assert.deepEqual(plan.files.filter((f) => f.plateau).map((f) => f.relPath), ['saas/plateau.yaml']);
  assert.deepEqual(plan.kept, ['shared/view.saas-header.yaml'], 'a view that says `plateau: saas` belongs to no plateau: it stays');
  assert.deepEqual(plan.blocking, []);
  assert.equal(plan.current, null);
  // the files of the dialog are those of the plan, and only those
  sandbox.openPlateauDeleteDialog('saas');
  const html = dialogHtml(sandbox);
  const listed = Array.from(html.matchAll(/<li><code>([^<]+)<\/code>/g)).map((m) => m[1]);
  assert.deepEqual(listed, SAAS_FILES.concat(['shared/view.saas-header.yaml']));
  assert.match(text(html), /These 4 files go, and nothing else:/);
  assert.match(text(html), /shared\/view\.saas-header\.yaml/);
  assert.match(text(html), /it stays/);
  assert.match(text(html), /views-saas and the folders of its comparisons\) are not manifests/);
  assert.match(text(html), /The plateau it overrides, baseline, is drawn instead\./);
  assert.match(html, /<button type="button" class="btn-danger-solid" data-action="dialog-submit">Delete plateau<\/button>/);
  // an edit not yet saved is said, since it goes with the file
  sandbox.commitElementEdit('commerce-saas', (n) => { n.description = 'edited'; }, 'application');
  const edited = plain(sandbox.plateauDeletion('saas')).files.find((f) => f.relPath === 'saas/application/commerce-saas.yaml');
  assert.equal(edited.modified, true);
  assert.match(text(dialogHtml(sandbox)), /commerce-saas\.yaml.*\(modified, not saved: the changes go with it\)/);
  assert.equal(state.layers.current, 'saas', 'opening the dialog changed nothing');
});

// ---- the delete ----

test('a leaf is deleted: its files are queued, then removed by the save; every other file is byte for byte what it was', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'saas' });
  const { sandbox, state } = opened;
  sandbox.openPlateauDeleteDialog('saas');
  sandbox.submitAppDialog({ fields: {} });
  assert.equal(run(sandbox, 'appDialog'), null, 'the dialog closed');
  assert.equal(state.plateauTree.nodes.has('saas'), false);
  assert.deepEqual(plain(state.plateauTree.ids), ['baseline', 'inhouse', 'marketplace']);
  assert.deepEqual(plain(state.pendingFileRemovals).sort(), SAAS_FILES);
  assert.equal(state.manifestFiles.some((mf) => mf.relPath.startsWith('saas/')), false);
  assert.deepEqual(drawing(state), { plateau: 'baseline', compare: null }, 'the plateau it overrode is drawn');
  assert.equal(state.index.application.has('commerce-saas'), false);
  const out = await saved(opened);
  assert.equal(out.status.state, 'success');
  assert.deepEqual(out.removed, SAAS_FILES);
  assert.deepEqual(out.changed, [], 'no other file was written');
  assert.deepEqual(out.added, []);
  for (const [p, text] of Object.entries(BRIGHTCART)) {
    if (SAAS_FILES.includes(p)) assert.equal(opened.mem.files.has(p), false, p + ' is gone');
    else assert.equal(opened.mem.files.get(p).text, text, p + ' is untouched');
  }
  // the folder opened again reads the same plateaus
  const again = await open(Object.fromEntries(Array.from(opened.mem.files).map(([p, f]) => [p, f.text])));
  assert.deepEqual(plain(again.state.plateauTree.ids), ['baseline', 'inhouse', 'marketplace']);
});

test('a leaf over a plateau that is not the root is deleted, and the plateau it overrode is drawn', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'marketplace', compared: 'saas' });
  const { sandbox, state } = opened;
  assert.deepEqual(drawing(state), { plateau: 'marketplace', compare: 'saas' });
  const result = plain(sandbox.commitPlateauDelete('marketplace'));
  assert.equal(result.drawn, 'inhouse');
  assert.deepEqual(drawing(state), { plateau: 'inhouse', compare: null }, 'the comparison of a plateau that is gone is not carried over');
  assert.match(run(sandbox, 'currentRouteHash()'), /plateau=inhouse/, 'the address the page writes says the plateau drawn');
  const out = await saved(opened);
  assert.deepEqual(out.removed, Object.keys(BRIGHTCART).filter((p) => p.startsWith('marketplace/')).sort());
  assert.deepEqual(out.changed, []);
});

test('the plateau compared with is deleted: the plateau drawn stays, and nothing is compared', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'inhouse', compared: 'saas' });
  const { sandbox, state } = opened;
  assert.deepEqual(drawing(state), { plateau: 'inhouse', compare: 'saas' });
  assert.ok(state.baseline, 'a comparison is drawn');
  sandbox.commitPlateauDelete('saas');
  assert.deepEqual(drawing(state), { plateau: 'inhouse', compare: null });
  assert.equal(state.baseline, null);
  // the future of a plateau that is deleted: inhouse compared with marketplace, its only future
  const other = await open(BRIGHTCART, { drawn: 'inhouse' });
  other.sandbox.toggleCompareWithFuture();
  assert.deepEqual(drawing(other.state), { plateau: 'inhouse', compare: 'marketplace' });
  other.sandbox.commitPlateauDelete('marketplace');
  assert.deepEqual(drawing(other.state), { plateau: 'inhouse', compare: null });
});

test('settings.current that names the plateau is taken out of .archicode.yaml, and only that line', async () => {
  const files = withSettings(BRIGHTCART, '  current: "saas"');
  const opened = await open(files);
  const { sandbox, state } = opened;
  const plan = plain(sandbox.plateauDeletion('saas'));
  assert.equal(plan.current, 'saas');
  sandbox.openPlateauDeleteDialog('saas');
  assert.match(text(dialogHtml(sandbox)), /settings\.current names saas: the key is taken out of \.archicode\.yaml/);
  sandbox.closeAppDialog();
  sandbox.commitPlateauDelete('saas');
  assert.equal(state.workspace.settings.current, '');
  const out = await saved(opened);
  assert.deepEqual(out.changed, ['.archicode.yaml']);
  assert.equal(opened.mem.files.get('.archicode.yaml').text, BRIGHTCART['.archicode.yaml'], '.archicode.yaml is the file without the line of `current`');
  const again = await open(Object.fromEntries(Array.from(opened.mem.files).map(([p, f]) => [p, f.text])));
  assert.equal(again.state.fatalError, null);
});

test('a settings.current that names another plateau stays', async () => {
  const opened = await open(withSettings(BRIGHTCART, '  current: "marketplace"'));
  assert.equal(opened.sandbox.plateauDeletion('saas').current, null);
  opened.sandbox.commitPlateauDelete('saas');
  const out = await saved(opened);
  assert.deepEqual(out.changed, []);
  assert.equal(opened.state.workspace.settings.current, 'marketplace');
});

// ---- what refuses the delete ----

test('a step of a story that names the plateau refuses the delete: the dialog lists the steps, the write is refused, nothing changes', async () => {
  const files = Object.assign({}, BRIGHTCART, {
    'stories/story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: shop\n      at: saas\n    - viewpoint: overview\n      properties:\n        element: shop\n      at: inhouse\n      against: saas\n')
  });
  const opened = await open(files, { drawn: 'saas' });
  const { sandbox, state } = opened;
  const plan = plain(sandbox.plateauDeletion('saas'));
  assert.equal(plan.refusal, null);
  assert.deepEqual(plan.blocking, [
    'the story `tour` (`stories/story.tour.yaml`) step 1 says `at: saas`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`)',
    'the story `tour` (`stories/story.tour.yaml`) step 2 says `against: saas`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`)'
  ], 'the sentences both tools would say once the plateau is gone');
  sandbox.openPlateauDeleteDialog('saas');
  const html = dialogHtml(sandbox);
  assert.match(text(html), /It cannot be deleted yet:/);
  assert.match(text(html), /step 2 says against: saas/);
  assert.doesNotMatch(html, /Delete plateau<\/button>/);
  assert.throws(() => sandbox.commitPlateauDelete('saas'), (e) => e.message.startsWith('The plateau `saas` cannot be deleted: 2 views or story steps would no longer be valid (the story `tour`'));
  assert.equal(state.plateauTree.nodes.has('saas'), true);
  assert.equal(state.layers.current, 'saas');
  const out = await saved(opened);
  assert.deepEqual([out.changed, out.added, out.removed], [[], [], []]);
});

test('a view that names an element only the plateau declares refuses the delete; one whose element another plateau has does not', async () => {
  const files = Object.assign({}, BRIGHTCART, { 'shared/view.saas.yaml': VIEW('platform', 'commerce-saas'), 'shared/view.shop.yaml': VIEW('shop', 'shop') });
  const { sandbox } = await open(files);
  assert.deepEqual(plain(sandbox.plateauDeletion('saas').blocking), ['the view `platform` (`shared/view.saas.yaml`) names `commerce-saas`, which exists in no plateau']);
  assert.throws(() => sandbox.commitPlateauDelete('saas'), /a view or a story would no longer be valid \(the view `platform`/);
});

test('a write the checks refuse puts everything back: the files, the queue of removals, the settings, the plateau drawn', async () => {
  const opened = await open(withSettings(BRIGHTCART, '  current: "saas"'), { drawn: 'saas', compared: 'inhouse' });
  const { sandbox, state } = opened;
  const before = {
    files: state.manifestFiles.map((mf) => [mf.relPath, mf.rawText, mf.dirty]),
    removals: plain(state.pendingFileRemovals),
    topLevel: plain(state.workspace.topLevel),
    current: state.workspace.settings.current,
    dirty: state.workspace.settingsDirty,
    drawing: drawing(state)
  };
  // the checks of `guardedLayerWrite` find a mistake the plan did not foresee
  run(sandbox, 'judgeLayerWrite = () => ({ broken: "the plateau `inhouse` could no longer be resolved (forced by the test)", changed: [] });');
  assert.throws(() => sandbox.commitPlateauDelete('saas'), /^Error: Not written: the plateau `inhouse` could no longer be resolved \(forced by the test\)\. Nothing was changed\.$/);
  assert.deepEqual(state.manifestFiles.map((mf) => [mf.relPath, mf.rawText, mf.dirty]), before.files);
  assert.deepEqual(plain(state.pendingFileRemovals), before.removals);
  assert.deepEqual(plain(state.workspace.topLevel), before.topLevel);
  assert.equal(state.workspace.settings.current, before.current);
  assert.equal(state.workspace.settingsDirty, before.dirty);
  assert.deepEqual(drawing(state), before.drawing);
  assert.equal(state.plateauTree.nodes.has('saas'), true);
  const out = await saved(opened);
  assert.deepEqual([out.changed, out.added, out.removed], [[], [], []], 'nothing on disk');
});

test('a write the checks say changes other plateaus asks first, and changes nothing until the author says yes', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'saas' });
  const { sandbox, state } = opened;
  const real = run(sandbox, 'judgeLayerWrite');
  run(sandbox, 'judgeLayerWrite = (a, b, c) => Object.assign(__real(a, b, c), { changed: ["inhouse"] });'.replace('__real', 'globalThis.__realJudge'));
  sandbox.__realJudge = real;
  const result = plain(sandbox.commitPlateauDelete('saas'));
  assert.deepEqual(result, { pending: true, changed: ['inhouse'] });
  assert.equal(state.plateauTree.nodes.has('saas'), true);
  assert.deepEqual(plain(state.pendingFileRemovals), []);
  assert.equal(run(sandbox, 'appDialog.kind'), 'layer-confirm');
  sandbox.submitAppDialog({});
  assert.equal(state.plateauTree.nodes.has('saas'), false, 'said yes: deleted');
  assert.deepEqual(drawing(state), { plateau: 'baseline', compare: null });
});

// ---- a plateau that headers alone declare ----

test('a plateau declared by headers only (no manifest of kind plateau) is deleted with those files; the workspace is then one plateau', async () => {
  const SYSTEM = (id, plateau) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + 'content:\n  id: ' + id + '\n';
  const files = {
    '.archicode.yaml': 'settings:\n  current: later\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/app.port.yaml': SYSTEM('port', 'later'),
    'later/app.dock.yaml': SYSTEM('dock', 'later')
  };
  const opened = await open(files, { drawn: 'later' });
  const { sandbox, state } = opened;
  const plan = plain(sandbox.plateauDeletion('later'));
  assert.deepEqual(plan.files.map((f) => [f.relPath, f.plateau]), [['later/app.dock.yaml', false], ['later/app.port.yaml', false]]);
  assert.equal(plan.current, 'later');
  sandbox.commitPlateauDelete('later');
  assert.equal(state.plateauTree.layered, false, 'only the root is left: the workspace has no plateau');
  assert.deepEqual(drawing(state), { plateau: 'baseline', compare: null });
  assert.equal(state.index.application.has('ferry'), true);
  const out = await saved(opened);
  assert.deepEqual(out.removed, ['later/app.dock.yaml', 'later/app.port.yaml']);
  assert.deepEqual(out.changed, ['.archicode.yaml']);
  assert.equal(opened.mem.files.get('.archicode.yaml').text, 'settings:\n  manifests:\n    paths: ["./**"]\n');
  assert.equal(opened.mem.files.get('app.ferry.yaml').text, files['app.ferry.yaml']);
});

test('the last plateau goes: `current: baseline` and a step told at baseline would name a plateau of a workspace that has none', async () => {
  const SYSTEM = (id, plateau) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' + (plateau ? '  plateau: ' + plateau + '\n' : '') + 'content:\n  id: ' + id + '\n';
  const files = {
    '.archicode.yaml': 'settings:\n  current: baseline\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml': SYSTEM('ferry'),
    'later/app.port.yaml': SYSTEM('port', 'later')
  };
  const { sandbox } = await open(files);
  assert.equal(sandbox.plateauDeletion('later').current, 'baseline', 'taken out: the command line refuses a `current` in a workspace with no plateau');
  const told = await open(Object.assign({}, files, { 'story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: ferry\n      at: baseline\n') }));
  assert.deepEqual(plain(told.sandbox.plateauDeletion('later').blocking), [
    'the story `tour` (`story.tour.yaml`) step 1 says `at: baseline` but the workspace declares no plateau (a `plateau` key in a header, or a manifest of kind `archicode.morin.io/plateau`)'
  ]);
});

test('a plateau created and not saved yet is deleted from memory: nothing is removed from the disk', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.commitPlateauCreate({ id: 'draft', parent: 'saas' });
  const created = state.manifestFiles.find((mf) => mf.content && mf.content.id === 'draft').relPath;
  assert.equal(plain(sandbox.plateauDeletion('draft')).files[0].unsaved, true);
  assert.deepEqual(plain(sandbox.plateauDeletion('saas').overriding), ['draft'], 'saas could go too, and draft with it under baseline (run 0132)');
  sandbox.commitPlateauDelete('draft');
  assert.equal(state.manifestFiles.some((mf) => mf.relPath === created), false);
  assert.deepEqual(plain(state.pendingFileRemovals), []);
  const out = await saved(opened);
  assert.deepEqual([out.changed, out.added, out.removed], [[], [], []]);
});

test('the files the editor does not read are said, and never deleted: a TOML manifest, a YAML file it could not read that has the id', async () => {
  const files = Object.assign({}, BRIGHTCART, {
    'saas/application/extra.toml': '[header]\nkind = "archicode.morin.io/system"\nversion = "1"\nplateau = "saas"\n[content]\nid = "extra"\n',
    'saas/application/broken.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  plateau: saas\n---\ncontent: {}\n',
    'inhouse/application/broken-too.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  plateau: inhouse\n---\ncontent: {}\n'
  });
  const opened = await open(files);
  const { sandbox } = opened;
  const plan = plain(sandbox.plateauDeletion('saas'));
  assert.deepEqual(plan.unread, ['saas/application/broken.yaml', 'saas/application/extra.toml'], 'the broken file of another plateau is not named');
  assert.deepEqual(plan.files.map((f) => f.relPath), SAAS_FILES, 'neither goes');
  sandbox.openPlateauDeleteDialog('saas');
  assert.match(text(dialogHtml(sandbox)), /The editor does not read these files \(TOML, JSON, or YAML it could not read\), so they are not deleted: if one says plateau: saas, the command line still reads the plateau\./);
  sandbox.closeAppDialog();
  sandbox.commitPlateauDelete('saas');
  const out = await saved(opened);
  assert.deepEqual(out.removed, SAAS_FILES);
  assert.equal(opened.mem.files.get('saas/application/extra.toml').text, files['saas/application/extra.toml']);
  assert.equal(opened.mem.files.get('saas/application/broken.yaml').text, files['saas/application/broken.yaml']);
});

test('no plateau is deleted while the folder is being saved', async () => {
  const { sandbox, state } = await open(BRIGHTCART);
  run(sandbox, 'saveInFlight = true;');
  assert.throws(() => sandbox.commitPlateauDelete('saas'), /being saved/);
  run(sandbox, 'saveInFlight = false;');
  assert.equal(state.plateauTree.nodes.has('saas'), true);
});

test('a step that already named no plateau is not the delete\'s: it neither refuses the delete nor the creation of a plateau', async () => {
  const files = Object.assign({}, BRIGHTCART, {
    'stories/story.tour.yaml': STORY('tour', '    - viewpoint: overview\n      properties:\n        element: shop\n      at: typo\n')
  });
  const opened = await open(files);
  const { sandbox, state } = opened;
  assert.deepEqual(plain(sandbox.plateauDeletion('saas').blocking), [], 'its sentence lists the plateaus, which change: it is the same mistake');
  sandbox.commitPlateauDelete('saas');
  assert.equal(state.plateauTree.nodes.has('saas'), false);
  assert.equal(sandbox.commitPlateauCreate({ id: 'next', parent: 'marketplace' }).relPath !== undefined, true, 'creating a plateau changes the list too');
  assert.equal(state.plateauTree.nodes.has('next'), true);
});

test('a settings.current that names another plateau that is gone is not taken out by the delete', async () => {
  const opened = await open(withSettings(BRIGHTCART, '  current: "saas"'));
  const { sandbox, state } = opened;
  state.workspace.settings.current = 'elsewhere'; // as if the plateau it named had been renamed in Files meanwhile
  assert.equal(sandbox.plateauDeletion('marketplace').current, null);
});

test('the marks of what is modified go with the files, and stay for a reference another plateau declares', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'saas' });
  const { sandbox, state } = opened;
  sandbox.commitElementEdit('commerce-saas', (n) => { n.description = 'edited'; }, 'application');
  assert.equal(state.dirtyReferences.has(sandbox.nodeKey('commerce-saas', 'application')), true);
  state.dirtyReferences.add(sandbox.nodeKey('shop', 'application')); // declared by baseline, which stays
  sandbox.drawPlateau('baseline');
  sandbox.commitPlateauDelete('saas');
  assert.equal(state.dirtyReferences.has(sandbox.nodeKey('commerce-saas', 'application')), false);
  assert.equal(state.dirtyReferences.has(sandbox.nodeKey('shop', 'application')), true);
});
