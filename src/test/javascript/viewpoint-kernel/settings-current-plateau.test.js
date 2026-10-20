'use strict';
// The page Settings has a field *Current plateau* (wave 016, run 0111, issue #111): `settings.current`, the plateau both tools draw by default. A list of the plateaus and
// *none*, shown when the workspace has plateaus to choose among; it writes the key through `commitSettingsEdit` and the line-preserving save (a file whose managed settings did
// not change gets that one line and not the defaults: run 0102); a plateau that is none is refused with the sentence of the tools; the plateau on screen is not redrawn.
// The layered Brightcart (src/test/resources/brightcart/layered/: baseline, inhouse over baseline, marketplace over inhouse, saas over baseline; its stories and views in `shared/`
// name `saas` and `marketplace`, so the tests that delete one start from the files without `shared/`, run 0110) is copied into an in-memory folder; a few small invented workspaces
// (a ferry company) stand for the rest.
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
const BRIGHTCART = walk(LAYERED, LAYERED, {});
const WITHOUT_SHARED = Object.fromEntries(Object.entries(BRIGHTCART).filter(([file]) => !file.startsWith('shared/')));

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  sandbox.render = () => { sandbox.syncHashFromState(); };
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

const WORKSPACE = BRIGHTCART['workspace.yaml'];
const text = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const field = (sandbox, state) => sandbox.renderCurrentPlateauSettingsHtml(state.workspace.settings);
const drawing = (state) => ({ plateau: state.layers.current, against: state.layers.compare ? state.layers.compare.other : null });

const SYSTEM = (id) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const PLATEAU = (id, override, body) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '') + (body || '');
/** Three plateaus in a line, the manifests in the default folder, and a workspace.yaml with NO `settings` block. */
const FERRY = {
  'workspace.yaml': 'styles:\n  by-tags:\n    external:\n      background-color: "lightgray"\n',
  'manifests/app.ferry.yaml': SYSTEM('ferry'),
  'manifests/plateau.later.yaml': PLATEAU('later', null),
  'manifests/plateau.latest.yaml': PLATEAU('latest', 'later')
};

// ---- the field ----

test('the field lists the plateaus in the order of the band and "None", with the current one selected, and says what it does', async () => {
  const { sandbox, state } = await open(BRIGHTCART);
  const html = field(sandbox, state);
  assert.match(html, /<label class="field-label" for="settings-current-select">Current plateau<\/label>/);
  assert.match(html, /<select id="settings-current-select" data-settings-current aria-describedby="settings-help-current">/);
  const options = Array.from(html.matchAll(/<option value="([^"]*)"( selected)?>/g)).map((m) => [m[1], !!m[2]]);
  assert.deepEqual(options, [['', true], ['baseline', false], ['inhouse', false], ['marketplace', false], ['saas', false]]);
  assert.match(text(html), /the command line draws when --plateau is not given/);
  assert.match(text(html), /Changing it does not redraw what is on screen\./);
  // the page Settings carries it, in the section Workspace under the name (it is a field, not a section of plateaus: those are made on the page Plateaus)
  const page = sandbox.renderSettingsViewHtml();
  assert.ok(page.indexOf('settings-current-select') > page.indexOf('settings-name-input'));
  assert.ok(page.indexOf('settings-current-select') < page.indexOf('<h3>Manifests</h3>'));
  assert.doesNotMatch(page, /<h3>Plateaus<\/h3>/);
  // a `current` the file has is the one selected
  const named = await open(Object.assign({}, BRIGHTCART, { 'workspace.yaml': WORKSPACE.replace(/^settings:\n/, 'settings:\n  current: "saas"\n') }));
  assert.match(field(named.sandbox, named.state), /<option value="saas" selected>/);
  assert.match(field(named.sandbox, named.state), /<option value="">None<\/option>/);
});

test('a workspace with no plateau shows no field; one plateau alone shows none either (nothing to choose), unless the file already has a `current`', async () => {
  const flat = await open({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n', 'app.ferry.yaml': SYSTEM('ferry') });
  assert.equal(flat.state.plateauTree.layered, false);
  assert.equal(field(flat.sandbox, flat.state), '');
  assert.equal(flat.sandbox.renderSettingsViewHtml().includes('settings-current-select'), false);
  const one = await open({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n', 'app.ferry.yaml': SYSTEM('ferry'), 'plateau.baseline.yaml': PLATEAU('baseline', null) });
  assert.equal(one.state.plateauTree.layered, true);
  assert.deepEqual(plain(one.state.plateauTree.ids), ['baseline']);
  assert.equal(field(one.sandbox, one.state), '', 'one plateau: the command line draws it, there is nothing to choose');
  const keeps = await open({ 'workspace.yaml': 'settings:\n  current: baseline\n  manifests:\n    paths: ["./**"]\n', 'app.ferry.yaml': SYSTEM('ferry'), 'plateau.baseline.yaml': PLATEAU('baseline', null) });
  assert.match(field(keeps.sandbox, keeps.state), /<option value="baseline" selected>/, 'a `current` the file has can be taken out');
  await keeps.sandbox.commitCurrentPlateau('');
  assert.equal(keeps.state.workspace.settings.current, '');
});

test('while the plateaus have mistakes no plateau is offered, the field says why, and a `current` the file has can still be taken out', async () => {
  const lost = Object.assign({}, FERRY, { 'manifests/plateau.lost.yaml': PLATEAU('lost', 'nowhere') });
  const { sandbox, state } = await open(lost);
  assert.ok(state.plateauTree.problems.length > 0);
  const html = field(sandbox, state);
  assert.match(html, /<option value="" selected>None<\/option>/);
  assert.equal((html.match(/<option value="[^"]+"(?! selected)[^>]*>/g) || []).every((option) => option.includes('disabled')), true, 'no plateau can be chosen');
  assert.match(text(html), /The plateaus have mistakes \(see the Plateaus page\): put them right first\./);
  assert.throws(() => sandbox.commitCurrentPlateau('later'), (e) => /^The plateaus have mistakes/.test(e.message));
  // a file that names a plateau: it is the one selected, and *None* takes it out
  const named = await open(Object.assign({}, lost, { 'workspace.yaml': 'settings:\n  current: later\n  manifests:\n    paths: ["manifests"]\n' }));
  assert.match(field(named.sandbox, named.state), /<option value="later" selected>/);
  assert.equal(named.sandbox.commitCurrentPlateau(''), true);
  assert.equal(named.state.workspace.settings.current, '');
});

// ---- the write ----

test('choosing a plateau writes that one line in workspace.yaml and nothing else; none takes it out and the file is as it was', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state, mem } = opened;
  assert.equal(state.workspace.settingsDirty, false);
  assert.equal(sandbox.commitCurrentPlateau('saas'), true);
  assert.equal(state.workspace.settings.current, 'saas');
  assert.equal(state.workspace.settingsDirty, true);
  assert.equal(sandbox.countUnsavedChanges(), 1);
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes, ['workspace.yaml']);
  const written = mem.files.get('workspace.yaml').text;
  const gained = written.split('\n').filter((line) => !WORKSPACE.split('\n').includes(line));
  assert.equal(gained.length, 1, 'one line is new');
  assert.match(gained[0], /^ {2}current: "?saas"?$/);
  assert.equal(written.replace(gained[0] + '\n', ''), WORKSPACE, 'every other byte is the original');
  assert.equal(state.workspace.settingsDirty, false);

  // another plateau: the line changes in place
  sandbox.commitCurrentPlateau('inhouse');
  mem.writes.length = 0;
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('workspace.yaml').text, written.replace('current: "saas"', 'current: "inhouse"'));

  // none: the key goes, the file is what it was
  sandbox.commitCurrentPlateau('');
  assert.equal(state.workspace.settings.current, '');
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('workspace.yaml').text, WORKSPACE);
  assert.equal(sandbox.commitCurrentPlateau(''), false, 'none again changes nothing');
  assert.equal(sandbox.commitCurrentPlateau('baseline'), true);
  assert.equal(sandbox.commitCurrentPlateau('baseline'), false, 'the same plateau again changes nothing');
});

test('a workspace.yaml with no `settings` block yet gets one with that key alone, not the defaults', async () => {
  const opened = await open(FERRY);
  const { sandbox, state, mem } = opened;
  assert.equal(state.plateauTree.layered, true);
  sandbox.commitCurrentPlateau('latest');
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes, ['workspace.yaml']);
  assert.equal(mem.files.get('workspace.yaml').text, FERRY['workspace.yaml'] + 'settings:\n  current: "latest"\n');
  // read again: the plateau is the current one
  const again = await open(Object.fromEntries(Array.from(mem.files).map(([p, f]) => [p, f.text])));
  assert.equal(again.state.fatalError, null);
  assert.equal(again.state.workspace.settings.current, 'latest');
  // and none takes the line out: the block is left empty (`settings: {}`, as the delete of a plateau leaves it), which both tools read as the defaults
  again.sandbox.commitCurrentPlateau('');
  await again.sandbox.saveAllChanges();
  assert.equal(again.mem.files.get('workspace.yaml').text, FERRY['workspace.yaml'] + 'settings: {}\n');
  const empty = await open(Object.fromEntries(Array.from(again.mem.files).map(([p, f]) => [p, f.text])));
  assert.equal(empty.state.fatalError, null);
  assert.equal(empty.state.workspace.settings.current, '');
});

test('a plateau that is none is refused with the sentence of the tools, and nothing is written', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  const sentence = '`settings.current` names the plateau `gone`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`, `saas`)';
  assert.throws(() => sandbox.commitCurrentPlateau('gone'), (e) => e.message === sentence);
  assert.equal(state.workspace.settingsDirty, false);
  assert.equal(state.workspace.settings.current, '');
  // it is the very sentence a file that says so gets when it is opened (and the one of WorkspaceFactory.chosen, pinned by layer-checks-cases.json)
  const bad = await open(Object.assign({}, BRIGHTCART, { 'workspace.yaml': WORKSPACE.replace(/^settings:\n/, 'settings:\n  current: "gone"\n') }));
  assert.equal(bad.state.fatalError, 'Could not read the plateaus of workspace.yaml:\n' + sentence);
  // a workspace with no plateau: the sentence for that
  const flat = await open({ 'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n', 'app.ferry.yaml': SYSTEM('ferry') });
  assert.throws(() => flat.sandbox.commitCurrentPlateau('later'), (e) => /^`settings.current` is `later` but the workspace declares no plateau \(/.test(e.message));
  // a tree with mistakes
  const broken = await open(Object.assign({}, FERRY, { 'manifests/plateau.lost.yaml': PLATEAU('lost', 'nowhere') }));
  assert.throws(() => broken.sandbox.commitCurrentPlateau('gone'), (e) => /^The plateaus have mistakes/.test(e.message), 'the sentence would name no plateau: the mistakes are told');
});

test('the list of the page: a choice is written, a refusal is told in the top bar and the list shows the file again', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  const select = { value: 'marketplace' };
  sandbox.chooseCurrentPlateau(select);
  assert.equal(state.workspace.settings.current, 'marketplace');
  const refused = { value: 'gone' };
  sandbox.chooseCurrentPlateau(refused);
  assert.equal(state.workspace.settings.current, 'marketplace', 'nothing changed');
  assert.equal(refused.value, 'marketplace', 'the list shows what the file says');
  const status = plain(run(sandbox, 'saveStatus'));
  assert.equal(status.state, 'error');
  assert.match(status.message, /names the plateau `gone`/);
});

test('what was typed in the form is kept: the draft is applied in the same step, and an invalid draft stops the choice', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state } = opened;
  sandbox.commitCurrentPlateau('saas', { apply: (settings) => { settings.name = 'Brightcart shop'; } });
  assert.equal(state.workspace.settings.name, 'Brightcart shop');
  assert.equal(state.workspace.settings.current, 'saas');
  await sandbox.saveAllChanges();
  const written = opened.mem.files.get('workspace.yaml').text;
  assert.match(written, /name: "?Brightcart shop"?/);
  assert.match(written, /current: "?saas"?/, 'the key the settings do not manage survives the rewrite of the ones they do');
  assert.match(written, /customs:/, 'the rest of the settings is kept');
  const again = await open(Object.fromEntries(Array.from(opened.mem.files).map(([p, f]) => [p, f.text])));
  assert.equal(again.state.fatalError, null);
  assert.equal(again.state.workspace.settings.current, 'saas');
});

/** The form of Settings on screen, as far as `readSettingsDraft` looks: the fields it reads, with the values the test types. */
function typeIntoForm(sandbox, typed) {
  const elements = {
    'settings-name-input': { value: typed.name },
    'settings-views-path-input': { value: typed.viewsPath },
    'settings-facets-directory-template-input': { value: '%s-%s' },
    'settings-default-label-input': { value: 'uses' },
    'settings-facets-global-enabled-input': { checked: true }
  };
  const real = { getElementById: sandbox.document.getElementById, querySelector: sandbox.document.querySelector };
  sandbox.document.getElementById = (id) => elements[id] || real.getElementById(id);
  sandbox.document.querySelector = (selector) => (selector.startsWith('.json-editor-fallback') ? { value: '{}' } : real.querySelector(selector));
  run(sandbox, 'draftTyped = true');
  return () => { Object.assign(sandbox.document, real); run(sandbox, 'draftTyped = false'); };
}

test('choosing in the list is not typing: the input event leaves the draft alone, the change event writes', async () => {
  const { sandbox, state } = await open(BRIGHTCART);
  const select = { value: 'saas', matches: (selector) => selector === '[data-settings-current]', closest: () => ({}) };
  sandbox.handleAppInput({ target: select });
  assert.equal(run(sandbox, 'draftTyped'), false, 'the list of plateaus is no typed text: "Save all changes" does not light for it');
  assert.equal(state.workspace.settings.current, '');
  sandbox.handleAppChange({ target: select });
  assert.equal(state.workspace.settings.current, 'saas');
  assert.equal(state.workspace.settingsDirty, true);
});

test('what was typed in the form goes in the same step as the choice; a form that is wrong stops the choice; a refused choice keeps what was typed', async () => {
  const { sandbox, state } = await open(BRIGHTCART);
  // valid: both are written
  let done = typeIntoForm(sandbox, { name: 'Typed name', viewsPath: 'views' });
  sandbox.chooseCurrentPlateau({ value: 'saas' });
  done();
  assert.equal(state.workspace.settings.name, 'Typed name');
  assert.equal(state.workspace.settings.current, 'saas');
  // wrong (an empty views path): nothing is written, the list shows the file again
  done = typeIntoForm(sandbox, { name: 'Other name', viewsPath: '' });
  const wrong = { value: 'inhouse' };
  sandbox.chooseCurrentPlateau(wrong);
  done();
  assert.equal(state.workspace.settings.current, 'saas');
  assert.equal(state.workspace.settings.name, 'Typed name');
  assert.equal(wrong.value, 'saas');
  // a choice that is refused: the name typed is kept, the sentence is told
  done = typeIntoForm(sandbox, { name: 'Kept name', viewsPath: 'views' });
  sandbox.chooseCurrentPlateau({ value: 'gone' });
  done();
  assert.equal(state.workspace.settings.name, 'Kept name');
  assert.equal(state.workspace.settings.current, 'saas');
  assert.match(plain(run(sandbox, 'saveStatus')).message, /names the plateau `gone`/);
});

// ---- the plateau drawn ----

test('the plateau on screen is not redrawn by the setting; the folder opened again is drawn at the plateau it names', async () => {
  const opened = await open(BRIGHTCART);
  const { sandbox, state, mem } = opened;
  sandbox.drawPlateau('marketplace');
  sandbox.compareWithPlateau('inhouse');
  const before = drawing(state);
  assert.deepEqual(before, { plateau: 'marketplace', against: 'inhouse' });
  sandbox.commitCurrentPlateau('saas');
  assert.deepEqual(drawing(state), before, 'what the reader chose on the band is not undone by a setting for the next time');
  sandbox.commitCurrentPlateau('');
  assert.deepEqual(drawing(state), before);
  sandbox.commitCurrentPlateau('saas');
  await sandbox.saveAllChanges();
  // opened with nothing else to go by (no address, no plateau remembered by this browser): the plateau of `settings.current`
  const again = await open(Object.fromEntries(Array.from(mem.files).map(([p, f]) => [p, f.text])));
  assert.equal(again.state.layers.current, 'saas');
  // without it: the root, as before (the editor starts where it can edit)
  const none = await open(BRIGHTCART);
  assert.equal(none.state.layers.current, 'baseline');
});

// ---- with the delete of a plateau (run 0102) ----

test('the delete of the plateau the setting names takes the key out again: the file is what it was', async () => {
  const opened = await open(WITHOUT_SHARED);
  const { sandbox, state, mem } = opened;
  sandbox.commitCurrentPlateau('saas');
  await sandbox.saveAllChanges();
  assert.match(mem.files.get('workspace.yaml').text, /current: "?saas"?/);
  sandbox.commitPlateauDelete('saas');
  assert.equal(state.workspace.settings.current, '');
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('workspace.yaml').text, WORKSPACE);
  assert.equal(state.plateauTree.nodes.has('saas'), false);
  assert.equal(field(sandbox, state).includes('value="saas"'), false);
});
