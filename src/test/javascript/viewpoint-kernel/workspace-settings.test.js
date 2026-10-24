'use strict';
// What `.archicode.yaml` asks of the editor besides the plateaus (run 0035; wave 014, run 0084): the folders of the manifests (`settings.manifests.paths`) are checked in the words of the
// command line before any manifest is read, a workspace without plateaus is read as it always was (one `baseline`, its manifests folders), and saving the settings keeps
// the rest of the file as the author wrote it. The plateaus are layers and are tested elsewhere (plateau-model.test.js, editor-reads-layers.test.js); the key that listed
// folders of manifests is refused with one sentence (plateau-model-cases.json, M50 to M53), and the controls that went with it (the selector, Compare to, the list in
// Settings, the checks of its keys) are gone with their tests.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const plain = (value) => JSON.parse(JSON.stringify(value));

const system = (id, name) =>
  'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n';

async function open(settings, files) {
  const mem = memFolder(Object.assign({ '.archicode.yaml': 'settings:\n' + settings }, files));
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state, mem };
}

const names = (state) =>
  Array.from(state.index.application.values())
    .map((r) => r.reference + '=' + r.name)
    .sort();
const messages = (state) => state.fatalError.split('\n').slice(1);

test('a workspace without plateaus is read as it always was: its manifests folders, the band has baseline alone, no selector in the header', async () => {
  const { sandbox, state } = await open('  views:\n    path: out\n', {
    'manifests/app.shop.yaml': system('shop', 'Shop')
  });
  assert.equal(state.fatalError, null);
  assert.deepEqual(names(state), ['shop=Shop']);
  assert.equal(state.layers.current, 'baseline');
  assert.deepEqual(plain(state.plateauTree.ids), ['baseline']);
  assert.doesNotMatch(sandbox.renderTopPanelHtml(), /plateau/);
});

const refused = async (settings, files) => {
  const { state } = await open(settings, files === undefined ? {} : files);
  assert.ok(state.fatalError, 'refused: ' + settings);
  assert.match(state.fatalError, /^Could not read the plateaus of \.archicode\.yaml:\n/);
  return messages(state);
};

test('manifests.paths that leaves the folder or is absolute is refused, and the message says what to change', async () => {
  for (const bad of ['../shared', '/srv/manifests', 'a/../../b']) {
    const [message] = await refused('  manifests:\n    paths:\n      - manifests\n      - ' + bad + '\n');
    assert.ok(message.startsWith('the path `' + bad + '` of `settings.manifests.paths` '), message);
    assert.match(message, /Move the folder below \.archicode\.yaml/);
    assert.match(message, /change the path to match/);
  }
});

test('several problems come one per line', async () => {
  assert.equal((await refused('  manifests:\n    paths:\n      - /srv/a\n      - ../b\n      - a/**/b\n')).length, 3);
});

// ---- saving ----

test('the other keys of .archicode.yaml survive a save, comments and layout of the settings too', async () => {
  const text =
    '# The architecture of the shop.\napplication:\n  elements: []\nsettings:\n  name: Shop   # shown by the editor\n  # where the manifests are\n  manifests:\n    paths:\n      - shared   # all of them\n  views:\n    path: out\n';
  const { sandbox, state, mem } = await open('', { 'shared/app.shop.yaml': system('shop', 'Shop') });
  mem.put('.archicode.yaml', text);
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, null);
  state.workspace.settings.views.path = 'out2';
  state.workspace.settingsDirty = true;
  await sandbox.writeWorkspaceYaml();
  const after = mem.files.get('.archicode.yaml').text;
  assert.equal(
    after.slice(0, after.indexOf('  views:')),
    text.slice(0, text.indexOf('  views:')),
    'everything up to the next setting, comments included, is as written'
  );
  assert.match(after, / {2}views:\n {4}path: out2\n/);
  const reread = plain(sandbox.parseYaml(after));
  assert.deepEqual(reread.application, { elements: [] });
  assert.deepEqual(reread.settings.manifests, { paths: ['shared'] });
});

test('a workspace without a manifests.paths still gets the default written, as before, and one that has it keeps it', async () => {
  const { sandbox, state, mem } = await open('  views:\n    path: out\n', {
    'manifests/app.shop.yaml': system('shop', 'Shop')
  });
  state.workspace.settings.name = 'N';
  await sandbox.writeWorkspaceYaml();
  assert.deepEqual(plain(sandbox.parseYaml(mem.files.get('.archicode.yaml').text)).settings.manifests, {
    paths: ['manifests']
  });
  const kept = await open('  manifests:\n    paths: [shared]\n', { 'shared/app.shop.yaml': system('shop', 'Shop') });
  assert.deepEqual(plain(kept.sandbox.serializeManagedSettings(kept.state.workspace.settings).manifests), {
    paths: ['shared']
  });
});

test('Settings has the manifests paths field and no section of plateaus', async () => {
  const { sandbox } = await open('  views:\n    path: out\n', { 'manifests/app.shop.yaml': system('shop', 'Shop') });
  const html = sandbox.renderSettingsViewHtml();
  assert.match(html, /<h3>Manifests<\/h3>/);
  assert.match(html, /settings-manifests-paths-input/);
  assert.doesNotMatch(html, /<h3>Plateaus<\/h3>|settings-plateaus/);
});
