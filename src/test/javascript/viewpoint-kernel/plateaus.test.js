'use strict';
// Plateaus (run 0035): `settings.plateaus` lists the states of an architecture, each one a folder of manifests below the
// folder of workspace.yaml, and the editor draws one of them. The rules and their words are the ones of the command line
// (`PlateausTest` runs the same cases against the loader of the CLI); the editor adds the selector of the header, the
// memory of the choice per folder, and a save of workspace.yaml that keeps the plateaus as they were written.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

const system = (id, name) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n';

const TWO =
  '  plateaus:\n' +
  '    - id: as-is\n      name: As is\n      path: plateaus/10_as-is\n' +
  '    - id: to-be\n      name: To be\n      horizon: 2027-Q1\n      path: plateaus/20_to-be\n';

/** Two plateaus: `shop` is in both (named differently), `crm` only in the second. */
const FOLDERS = {
  'plateaus/10_as-is/app.shop.yaml': system('shop', 'Shop as is'),
  'plateaus/20_to-be/app.shop.yaml': system('shop', 'Shop to be'),
  'plateaus/20_to-be/app.crm.yaml': system('crm', 'CRM')
};

function storage() {
  const values = new Map();
  return { values, getItem: (k) => (values.has(k) ? values.get(k) : null), setItem: (k, v) => values.set(k, String(v)), removeItem: (k) => values.delete(k) };
}

async function open(settings, files, options = {}) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': 'settings:\n' + settings }, files === undefined ? FOLDERS : files));
  const sandbox = createApp(options);
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state, mem };
}

const names = (state) => Array.from(state.index.application.values()).map((r) => r.reference + '=' + r.name).sort();
const messages = (state) => state.fatalError.split('\n').slice(1);

test('the last plateau is drawn when none is asked for, and its manifests are the ones read', async () => {
  const { state } = await open(TWO);
  assert.equal(state.fatalError, null);
  assert.equal(state.plateau.id, 'to-be');
  assert.deepEqual(plain(state.plateaus.map((p) => p.id)), ['as-is', 'to-be'], 'in the order of the file');
  assert.deepEqual(names(state), ['crm=CRM', 'shop=Shop to be']);
  assert.deepEqual(plain(state.manifestFiles.map((f) => f.relPath)), ['plateaus/20_to-be/app.crm.yaml', 'plateaus/20_to-be/app.shop.yaml'], 'the files are named from the folder of the workspace');
});

test('current names the plateau drawn by default', async () => {
  const { state } = await open('  current: as-is\n' + TWO);
  assert.equal(state.plateau.id, 'as-is');
  assert.deepEqual(names(state), ['shop=Shop as is']);
});

test('the same reference in two plateaus is no duplicate: each plateau is one set of manifests', async () => {
  for (const current of ['as-is', 'to-be']) {
    const { state } = await open('  current: ' + current + '\n' + TWO);
    assert.deepEqual(plain(state.duplicateReferences), []);
  }
});

test('a reference declared twice in one plateau is reported with both files, in the words of the command line', async () => {
  const { state } = await open(TWO, Object.assign({}, FOLDERS, { 'plateaus/20_to-be/app.shop2.yaml': system('shop', 'Again') }));
  assert.deepEqual(plain(state.duplicateReferences.map((d) => d.message)), ['the reference `shop` is declared twice: in `plateaus/20_to-be/app.shop.yaml` and `plateaus/20_to-be/app.shop2.yaml`']);
});

test('a single plateau may be the folder of the workspace itself: workspace.yaml is no manifest', async () => {
  const { state } = await open('  plateaus:\n    - id: only\n      path: .\n', { 'app.shop.yaml': system('shop', 'Shop') });
  assert.equal(state.fatalError, null);
  assert.deepEqual(names(state), ['shop=Shop']);
  assert.deepEqual(plain(state.manifestFiles.map((f) => f.relPath)), ['app.shop.yaml']);
});

test('a workspace without plateaus is read as it always was: no selector, its manifests folders', async () => {
  const { sandbox, state } = await open('  views:\n    path: out\n', { 'manifests/app.shop.yaml': system('shop', 'Shop') });
  assert.equal(state.plateau, null);
  assert.deepEqual(plain(state.plateaus), []);
  assert.deepEqual(names(state), ['shop=Shop']);
  assert.doesNotMatch(sandbox.renderTopPanelHtml(), /plateau/);
});

// ---- the rules: the same cases and words as PlateausTest ----

const refused = async (settings, files) => {
  const { state } = await open(settings, files === undefined ? FOLDERS : files);
  assert.ok(state.fatalError, 'refused: ' + settings);
  assert.match(state.fatalError, /^Could not read the plateaus of workspace\.yaml:\n/);
  return messages(state);
};

test('from is reserved and refused with a message that says what to do', async () => {
  const [message] = await refused('  plateaus:\n    - id: as-is\n      path: plateaus/10_as-is\n    - id: to-be\n      from: as-is\n      path: plateaus/20_to-be\n');
  assert.match(message, /^the plateau `to-be` has a `from`: it is reserved for a later version/);
  assert.match(message, /Remove it and give the plateau its own `path`/);
});

test('an unknown key of a plateau is refused and the known ones are listed', async () => {
  assert.deepEqual(await refused('  plateaus:\n    - id: as-is\n      path: plateaus/10_as-is\n      date: 2026\n'),
    ['the plateau `as-is` has the key `date`, which ArchiCode does not know: a plateau has `id`, `name`, `horizon`, `path` and `baseline`']);
});

test('a plateau without a path, or without an id, is refused', async () => {
  assert.deepEqual(await refused('  plateaus:\n    - id: as-is\n    - id: to-be\n      path: plateaus/20_to-be\n'),
    ['the plateau `as-is` has no `path`: write the folder of its manifests, relative to the folder of workspace.yaml (for example `plateaus/as-is`)']);
  assert.deepEqual(await refused('  plateaus:\n    - path: plateaus/10_as-is\n'), ['the plateau number 1 has no `id`']);
});

test('a path that leaves the folder or is absolute is refused, however it is written', async () => {
  for (const bad of ['../shared', 'a/../../b', 'a\\..\\b', '/etc', '\\share', 'C:\\data', 'd:/data']) {
    const [message] = await refused('  plateaus:\n    - id: p\n      path: "' + bad.replace(/\\/g, '\\\\') + '"\n');
    assert.ok(message.startsWith('the path `' + bad + '` of the plateau `p` '), bad + ' -> ' + message);
    assert.match(message, /it must be a folder below the one of workspace\.yaml/);
  }
  assert.match((await refused('  plateaus:\n    - id: p\n      path: ../x\n'))[0], /contains `\.\.`:/);
  assert.match((await refused('  plateaus:\n    - id: p\n      path: /x\n'))[0], /is absolute:/);
});

test('a duplicate id, a duplicate path and a dot with several plateaus are refused', async () => {
  assert.deepEqual(await refused('  plateaus:\n    - id: p\n      path: plateaus/10_as-is\n    - id: p\n      path: plateaus/20_to-be\n'),
    ['the plateau id `p` is used more than once']);
  assert.deepEqual(await refused('  plateaus:\n    - id: a\n      path: plateaus/10_as-is\n    - id: b\n      path: ./plateaus/10_as-is/\n'),
    ['the plateaus `a` and `b` share the path `plateaus/10_as-is`: each plateau needs a folder of its own']);
  assert.deepEqual(await refused('  plateaus:\n    - id: a\n      path: .\n    - id: b\n      path: plateaus/20_to-be\n'),
    ['the plateau `a` has the path `.`, which is the folder of workspace.yaml itself and holds the others: with several plateaus, give each one a folder of its own']);
});

test('an id that cannot be a folder name, and a plateau that is no mapping, are refused', async () => {
  assert.match((await refused('  plateaus:\n    - id: "a/b"\n      path: plateaus/10_as-is\n'))[0], /^the plateau id `a\/b` is not valid: use letters, digits/);
  assert.deepEqual(await refused('  plateaus:\n    - as-is\n'), ['the plateau number 1 of `settings.plateaus` must be a mapping with an `id` and a `path`']);
});

test('current must name a plateau', async () => {
  assert.deepEqual(await refused('  current: x\n' + TWO), ['`settings.current` names the plateau `x`, which is not in `settings.plateaus` (`as-is`, `to-be`)']);
  assert.deepEqual(await refused('  current: x\n', {}), ['`settings.current` is `x` but the workspace declares no `settings.plateaus`']);
});

test('manifests.paths written together with plateaus is an error', async () => {
  const [message] = await refused('  manifests:\n    paths:\n      - manifests\n' + TWO);
  assert.match(message, /^`settings\.manifests\.paths` and `settings\.plateaus` are both written: choose one\./);
});

test('manifests.paths that leaves the folder or is absolute is refused, and the message says what to change', async () => {
  for (const bad of ['../shared', '/srv/manifests', 'a/../../b']) {
    const [message] = await refused('  manifests:\n    paths:\n      - manifests\n      - ' + bad + '\n');
    assert.ok(message.startsWith('the path `' + bad + '` of `settings.manifests.paths` '), message);
    assert.match(message, /Move the folder below workspace\.yaml/);
    assert.match(message, /change the path to match/);
  }
});

test('several problems come one per line', async () => {
  assert.equal((await refused('  plateaus:\n    - id: a\n    - id: a\n      path: /x\n')).length, 3);
});

test('a plateau whose folder is not there is drawn empty, and the header says why', async () => {
  const { sandbox, state } = await open('  plateaus:\n    - id: a\n      path: nowhere\n', {});
  assert.equal(state.fatalError, null);
  assert.equal(state.plateauProblem, 'The folder `nowhere` of the plateau `a` does not exist.');
  assert.match(sandbox.renderTopPanelHtml(), /<span class="plateau-problem" role="alert">The folder `nowhere` of the plateau `a` does not exist\.<\/span>/);
});

// ---- the selector ----

test('the header has a button group of the plateaus, in the order of the file, the plateau drawn pressed', async () => {
  const { sandbox } = await open(TWO);
  const html = sandbox.renderTopPanelHtml();
  const group = html.match(/<span class="plateau-tabs button-group" role="group" aria-labelledby="plateau-label">([\s\S]*?)<\/span><\/span>(?!<span class="plateau-horizon)/);
  assert.ok(group, html);
  const buttons = group[1].match(/<button\b[^>]*>[\s\S]*?<\/button>/g);
  assert.equal(buttons.length, 2);
  assert.match(buttons[0], /data-action="set-plateau" data-plateau="as-is" aria-pressed="false"/);
  assert.match(buttons[0], />As is<\/button>/);
  assert.match(buttons[1], /data-plateau="to-be" aria-pressed="true"/);
  assert.match(buttons[1], /title="to-be · 2027-Q1 · plateaus\/20_to-be"/);
  assert.match(buttons[1], /<span class="plateau-horizon">2027-Q1<\/span>/);
  assert.ok(html.indexOf('class="plateau-switch"') < html.indexOf('class="perspective-tabs'), 'before the perspectives');
  assert.match(html, /<span class="plateau-label" id="plateau-label">Plateau<\/span>/);
});

test('the selector uses the pressed colour of the other selectors', () => {
  const html = require('node:fs').readFileSync(require('node:path').resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  assert.match(html, /\.plateau-tabs button\[aria-pressed="true"\]/);
});

test('choosing a plateau reads its folder, and the choice is remembered for this folder', async () => {
  const local = storage();
  const { sandbox, state } = await open(TWO, FOLDERS, { localStorage: local });
  assert.equal(state.plateau.id, 'to-be');
  await sandbox.switchPlateau('as-is');
  assert.equal(state.plateau.id, 'as-is');
  assert.deepEqual(names(state), ['shop=Shop as is']);
  assert.deepEqual(Array.from(local.values.values()), ['as-is']);
  assert.match(Array.from(local.values.keys())[0], /^archicode-standalone-editor:plateau:name:ws$/);
  // the page opened again in this browser draws it
  await sandbox.loadWorkspace(state.folder.handle);
  assert.equal(state.plateau.id, 'as-is');
});

test('a remembered plateau that the workspace no longer has is ignored', async () => {
  const local = storage();
  local.setItem('archicode-standalone-editor:plateau:name:ws', 'gone');
  const { state } = await open(TWO, FOLDERS, { localStorage: local });
  assert.equal(state.plateau.id, 'to-be');
});

test('the page works when the browser refuses its storage', async () => {
  const refusing = { getItem() { throw new Error('denied'); }, setItem() { throw new Error('denied'); } };
  const { sandbox, state } = await open(TWO, FOLDERS, { localStorage: refusing });
  await sandbox.switchPlateau('as-is');
  assert.equal(state.plateau.id, 'as-is');
});

test('switching with unsaved changes asks first, and keeps them when the answer is no', async () => {
  const { sandbox, state } = await open(TWO);
  sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', attachUnderReference: null, id: 'extra', name: null, description: null });
  let asked = null;
  sandbox.confirm = (text) => { asked = text; return false; };
  await sandbox.switchPlateau('as-is');
  assert.match(asked, /^Switch to the plateau “as-is” and discard 1 modified item\?/);
  assert.equal(state.plateau.id, 'to-be');
  assert.ok(state.index.application.has('extra'));
  sandbox.confirm = () => true;
  await sandbox.switchPlateau('as-is');
  assert.equal(state.plateau.id, 'as-is');
  assert.ok(!state.index.application.has('extra'));
});

// ---- saving ----

test('a manifest is written into the folder of the plateau it was read from, and a new one goes there too', async () => {
  const { sandbox, state, mem } = await open('  current: as-is\n' + TWO);
  const created = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', attachUnderReference: null, id: 'billing', name: 'Billing', description: null });
  assert.equal(created.relPath, 'plateaus/10_as-is/app.billing.yaml');
  state.manifestFiles.find((f) => f.relPath === 'plateaus/10_as-is/app.shop.yaml').rawText += '# touched\n';
  state.manifestFiles.find((f) => f.relPath === 'plateaus/10_as-is/app.shop.yaml').dirty = true;
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus').state, 'success');
  assert.deepEqual(plain(mem.writes.slice().sort()), ['plateaus/10_as-is/app.billing.yaml', 'plateaus/10_as-is/app.shop.yaml']);
  assert.match(mem.files.get('plateaus/10_as-is/app.shop.yaml').text, /# touched/);
  assert.equal(mem.files.get('plateaus/20_to-be/app.shop.yaml').text, FOLDERS['plateaus/20_to-be/app.shop.yaml'], 'the other plateau is left alone');
});

const COMMENTED =
  '# The architecture of the shop.\n' +
  'settings:\n' +
  '  name: Shop   # shown by the editor\n' +
  '  # the states of the shop\n' +
  '  current: as-is\n' +
  '  plateaus:   # as is, then to be\n' +
  '    # where we are\n' +
  '    - id: as-is\n      path: plateaus/10_as-is   # today\n\n' +
  '    # the next one\n' +
  '    - id: to-be\n      horizon: 2027-Q1\n      path: plateaus/20_to-be\n' +
  '  views:\n    path: out\n';

test('saving the settings keeps the plateaus, their comments and layout, and writes no manifests key', async () => {
  const { sandbox, state, mem } = await open('', FOLDERS);
  mem.put('workspace.yaml', COMMENTED);
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, null);
  state.workspace.settings.views.path = 'out2';
  state.workspace.settingsDirty = true;
  await sandbox.writeWorkspaceYaml();
  const after = mem.files.get('workspace.yaml').text;
  const head = COMMENTED.slice(0, COMMENTED.indexOf('  views:'));
  assert.equal(after.slice(0, head.length), head, 'everything up to the next setting, comments included, is as written');
  assert.match(after, /  views:\n    path: out2\n/);
  assert.doesNotMatch(after, /manifests/);
  assert.match(after, /  plateaus:   # as is, then to be\n    # where we are\n    - id: as-is\n      path: plateaus\/10_as-is   # today\n\n    # the next one\n    - id: to-be\n      horizon: 2027-Q1\n      path: plateaus\/20_to-be\n/);
  assert.match(after, /  current: as-is\n/);
});

test('the other keys of workspace.yaml and of the settings survive a save', async () => {
  const text = 'application:\n  elements: []\nsettings:\n  plateaus:\n    - id: a\n      path: plateaus/10_as-is\n  unknown-section: {a: 1}\n';
  const { sandbox, state, mem } = await open('', FOLDERS);
  mem.put('workspace.yaml', text);
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, null);
  state.workspace.settings.name = 'N';
  await sandbox.writeWorkspaceYaml();
  const reread = plain(sandbox.parseYaml(mem.files.get('workspace.yaml').text));
  assert.deepEqual(reread.settings.plateaus, [{ id: 'a', path: 'plateaus/10_as-is' }]);
  assert.deepEqual(reread.settings['unknown-section'], { a: 1 });
  assert.equal(reread.settings.name, 'N');
  assert.ok(!('manifests' in reread.settings));
  assert.deepEqual(plain(reread.application), { elements: [] });
});

test('a workspace without plateaus still gets its manifests paths written, as before', async () => {
  const { sandbox, state, mem } = await open('  views:\n    path: out\n', { 'manifests/app.shop.yaml': system('shop', 'Shop') });
  state.workspace.settings.name = 'N';
  await sandbox.writeWorkspaceYaml();
  assert.deepEqual(plain(sandbox.parseYaml(mem.files.get('workspace.yaml').text)).settings.manifests, { paths: ['manifests'] });
});

test('a workspace with manifests.paths written keeps it, and a plateau workspace without it does not gain it', async () => {
  const { sandbox, state } = await open('  manifests:\n    paths: [shared]\n', { 'shared/app.shop.yaml': system('shop', 'Shop') });
  assert.equal(state.workspace.settings.manifestsPathsWritten, true);
  assert.deepEqual(plain(sandbox.serializeManagedSettings(state.workspace.settings).manifests), { paths: ['shared'] });
  const two = await open(TWO);
  assert.ok(!('manifests' in plain(two.sandbox.serializeManagedSettings(two.state.workspace.settings))));
});

// ---- the Settings page ----

test('Settings lists the plateaus instead of the manifests paths, and saving it does not need the paths field', async () => {
  const { sandbox, state, mem } = await open('  current: as-is\n' + TWO);
  const html = sandbox.renderSettingsViewHtml();
  assert.match(html, /<h3>Plateaus<\/h3>/);
  assert.doesNotMatch(html, /settings-manifests-paths-input/);
  assert.doesNotMatch(html, /<h3>Manifests<\/h3>/);
  const items = html.match(/<li class="plateau-item">[\s\S]*?<\/li>/g);
  assert.equal(items.length, 2);
  assert.match(items[0], /<strong>As is<\/strong> <code>as-is<\/code> · <code>plateaus\/10_as-is<\/code> · <em>drawn<\/em> · <em>current<\/em>/);
  assert.match(items[1], /<strong>To be<\/strong> <code>to-be<\/code> · 2027-Q1 · <code>plateaus\/20_to-be<\/code><\/li>$/);

  // the form without a paths field is valid, and applying it leaves the paths alone
  const fields = {
    'settings-name-input': { value: 'Named' }, 'settings-views-path-input': { value: 'views' },
    'settings-facets-directory-template-input': { value: '%s-%s' }, 'settings-default-label-input': { value: 'uses' },
    'settings-facets-global-enabled-input': { checked: true }
  };
  const getElementById = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => fields[id] || getElementById(id);
  const querySelector = sandbox.document.querySelector;
  sandbox.document.querySelector = (selector) => (selector.startsWith('.json-editor-fallback') ? { value: '{}' } : querySelector(selector));
  const draft = sandbox.readSettingsDraft();
  assert.equal(draft.valid, true);
  sandbox.commitSettingsEdit(draft.apply);
  assert.deepEqual(plain(state.workspace.settings.manifests.paths), ['manifests']);
  await sandbox.writeWorkspaceYaml();
  const reread = plain(sandbox.parseYaml(mem.files.get('workspace.yaml').text));
  assert.equal(reread.settings.name, 'Named');
  assert.ok(!('manifests' in reread.settings));
});

test('a workspace without plateaus keeps the manifests paths field in Settings', async () => {
  const { sandbox } = await open('  views:\n    path: out\n', { 'manifests/app.shop.yaml': system('shop', 'Shop') });
  const html = sandbox.renderSettingsViewHtml();
  assert.match(html, /<h3>Manifests<\/h3>/);
  assert.match(html, /settings-manifests-paths-input/);
  assert.doesNotMatch(html, /<h3>Plateaus<\/h3>/);
});
