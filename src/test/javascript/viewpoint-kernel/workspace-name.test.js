'use strict';
// The name of a workspace (`settings.name`): read and written with the other settings, chosen in the Settings screen, and
// shown by the editor in place of the name of the folder. How it looks is checked in a browser; here, the model and the markup.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const plain = (value) => JSON.parse(JSON.stringify(value));
const MANIFEST = 'header:\n  kind: archicode.morin.io/system\ncontent:\n  id: s1\n  name: S1\n';

function writableFolder(dir) {
  const handle = makeDirHandle(dir);
  const getFileHandle = handle.getFileHandle;
  handle.getFileHandle = async (name, options) => {
    const file = await getFileHandle(name, options);
    file.createWritable = async () => {
      const parts = [];
      return { write: async (data) => { parts.push(data); }, close: async () => fs.writeFileSync(path.join(dir, name), parts.join('')) };
    };
    return file;
  };
  return handle;
}

/** A folder on disk with the given `settings` text (after `settings:`), loaded the way the editor loads a folder. */
async function open(settingsYaml, folderName = 'my-folder') {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-name-'));
  fs.mkdirSync(path.join(dir, 'manifests'));
  fs.writeFileSync(path.join(dir, 'manifests', 'app.s1.yaml'), MANIFEST);
  fs.writeFileSync(path.join(dir, 'workspace.yaml'), 'application:\n  elements: []\n' + (settingsYaml === null ? '' : 'settings:\n' + settingsYaml));
  const sandbox = createApp();
  sandbox.window.showDirectoryPicker = function () {};
  const handle = writableFolder(dir);
  await sandbox.loadWorkspace(handle);
  const state = sandbox.__state();
  assert.equal(state.fatalError, null);
  state.folder = { handle, name: folderName };
  state.permissionState = 'granted';
  return { sandbox, state, dir };
}

const saved = (dir) => fs.readFileSync(path.join(dir, 'workspace.yaml'), 'utf8');
const run = (sandbox, code) => vm.runInContext(code, sandbox);

test('the name is read from the settings, and is empty when the key is absent, blank or not a text', async () => {
  const { sandbox } = await open(null);
  assert.equal(plain(sandbox.parseSettings(undefined)).name, '');
  assert.equal(plain(sandbox.parseSettings({})).name, '');
  assert.equal(plain(sandbox.parseSettings({ name: 'Shop' })).name, 'Shop');
  assert.equal(plain(sandbox.parseSettings({ name: '   ' })).name, '');
  assert.equal(plain(sandbox.parseSettings({ name: null })).name, '');
  assert.equal(plain(sandbox.parseSettings({ name: { a: 1 } })).name, '', 'a mapping is no name');
  assert.equal(plain(sandbox.parseSettings({ name: 42 })).name, '42', 'as the CLI reads a number into its text field');
});

test('a name round-trips through a save, in its place, with the other settings and the unknown keys', async () => {
  const { sandbox, state, dir } = await open('  unknown-section: {a: 1}\n  name: Shop\n  views:\n    path: out\n    extra: kept\n');
  assert.equal(state.workspace.settings.name, 'Shop');
  state.workspace.settings.name = '  Shop 2  ';
  await sandbox.writeWorkspaceYaml();
  const reread = plain(sandbox.parseYaml(saved(dir)));
  assert.deepEqual(Object.keys(reread.settings).slice(0, 2), ['unknown-section', 'name'], 'it keeps its place');
  assert.equal(reread.settings.name, 'Shop 2', 'trimmed');
  assert.deepEqual(reread.settings['unknown-section'], { a: 1 });
  assert.equal(reread.settings.views.extra, 'kept');
  assert.equal(reread.settings.views.path, 'out');
});

test('a name given to a workspace that had none is written first in the settings', async () => {
  const { sandbox, state, dir } = await open('  views:\n    path: out\n');
  assert.equal(state.workspace.settings.name, '');
  state.workspace.settings.name = 'Shop';
  await sandbox.writeWorkspaceYaml();
  const reread = plain(sandbox.parseYaml(saved(dir)));
  assert.deepEqual(Object.keys(reread.settings)[0], 'name');
  assert.equal(reread.settings.name, 'Shop');
});

test('a workspace without a name does not get one in the file, and an emptied name leaves the file', async () => {
  const none = await open('  views:\n    path: out\n');
  await none.sandbox.writeWorkspaceYaml();
  assert.ok(!('name' in plain(none.sandbox.parseYaml(saved(none.dir))).settings), 'absent stays absent');
  assert.ok(!('name' in plain(none.sandbox.serializeManagedSettings(none.state.workspace.settings))));

  const named = await open('  name: Shop\n  views:\n    path: out\n');
  named.state.workspace.settings.name = '   ';
  await named.sandbox.writeWorkspaceYaml();
  const reread = plain(named.sandbox.parseYaml(saved(named.dir)));
  assert.ok(!('name' in reread.settings), 'blank is omitted, not written empty, and the old value is not kept as an unknown key');
  assert.equal(reread.settings.views.path, 'out');
});

test('a workspace whose settings are not a mapping still gets a name written with the other settings', async () => {
  const { sandbox, state } = await open(null);
  state.workspace.settings.name = 'Shop';
  const raw = plain(sandbox.serializeSettingsToRaw(state.workspace.settings, undefined));
  assert.equal(raw.name, 'Shop');
  assert.ok(raw.manifests && raw.facets);
});

test('the Settings screen has a Workspace section with the Name, between Appearance and Manifests', async () => {
  const { sandbox } = await open('  name: Shop\n');
  const html = sandbox.renderSettingsViewHtml();
  const section = html.match(/<div class="edition-section" id="settings-workspace"><h3>Workspace<\/h3>([\s\S]*?)<\/div><\/div>/);
  assert.ok(section, 'the section');
  assert.match(section[1], /<label class="field-label" for="settings-name-input">Name<\/label>/);
  assert.match(section[1], /<input type="text" id="settings-name-input" value="Shop" placeholder="my-folder" aria-describedby="settings-help-name">/);
  assert.match(section[1], /id="settings-help-name"/);
  assert.ok(html.indexOf('id="settings-appearance"') < html.indexOf('id="settings-workspace"'));
  assert.ok(html.indexOf('id="settings-workspace"') < html.indexOf('<h3>Manifests</h3>'));
  assert.equal(html.split('id="settings-workspace"').length, 2);
  assert.match(html, /<h3>Appearance \(this browser\)<\/h3>/, 'the appearance section is still there, apart');
});

test('typing a name in Settings goes through Save all changes, and marks the workspace modified', async () => {
  const { sandbox, state, dir } = await open(null);
  // the form as Settings renders it: the name typed, the other fields as they were
  const fields = {
    'settings-name-input': { value: '  My shop ' },
    'settings-manifests-paths-input': { value: 'manifests' },
    'settings-views-path-input': { value: 'views' },
    'settings-facets-directory-template-input': { value: '%s-%s' },
    'settings-default-label-input': { value: 'uses' },
    'settings-facets-global-enabled-input': { checked: true }
  };
  const getElementById = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => fields[id] || getElementById(id);
  const querySelector = sandbox.document.querySelector;
  sandbox.document.querySelector = (selector) => (selector.startsWith('.json-editor-fallback') ? { value: '{}' } : querySelector(selector));
  assert.equal(sandbox.hasUnsavedChanges(), false);
  const draft = sandbox.readSettingsDraft();
  assert.equal(draft.valid, true);
  assert.equal(state.workspace.settings.name, '', 'reading the form changes nothing');
  sandbox.commitSettingsEdit(draft.apply);
  assert.equal(state.workspace.settings.name, 'My shop');
  assert.equal(sandbox.hasUnsavedChanges(), true);
  assert.equal(state.workspace.settingsDirty, true);
  await sandbox.writeWorkspaceYaml();
  assert.equal(plain(sandbox.parseYaml(saved(dir))).settings.name, 'My shop');
});

test('typing in the Name field dirties the form, as any field of Settings (Save all changes lights up)', async () => {
  const { sandbox } = await open(null);
  run(sandbox, "currentPerspective = 'settings'");
  assert.equal(run(sandbox, 'draftTyped'), false);
  sandbox.handleAppInput({ target: { id: 'settings-name-input', matches: () => false, closest: (selector) => (/settings-view/.test(selector) ? {} : null) } });
  assert.equal(run(sandbox, 'draftTyped'), true);
  assert.doesNotMatch(sandbox.renderSaveButtonHtml(), /disabled/);
});

test('the top bar shows the name in place of the folder, and the folder is its tooltip', async () => {
  const { sandbox } = await open('  name: Shop\n', 'archi');
  const html = sandbox.renderTopPanelHtml();
  assert.match(html, /<span class="folder-name workspace-name" title="Folder: archi">Shop<\/span>/);
  assert.doesNotMatch(html, /folder-root-slash/, 'no root slash after a name');
  assert.ok(!html.includes('>archi<'), 'the folder name is not displayed');
});

test('without a name the top bar is unchanged: the folder name and its slash', async () => {
  const { sandbox } = await open('  views:\n    path: out\n', 'archi');
  const html = sandbox.renderTopPanelHtml();
  assert.match(html, /<span class="folder-name" title="Folder: archi \(a browser does not tell the full path of a folder\)">archi<span class="folder-root-slash">\/<\/span><\/span>/);
  assert.doesNotMatch(html, /workspace-name/);
  const blank = await open('  name: "  "\n', 'archi');
  assert.equal(blank.sandbox.renderTopPanelHtml(), html, 'a blank name is no name');
});

test('the name is escaped in the top bar, the tooltip, the title of the page and the Settings field', async () => {
  const nasty = '<img src=x onerror="a()"> & "q"';
  const { sandbox, state } = await open(null, 'a"<b>');
  state.workspace.settings.name = nasty;
  const top = sandbox.renderTopPanelHtml();
  assert.ok(!top.includes('<img'), 'markup in a name is text');
  assert.match(top, /&lt;img src=x onerror=&quot;a\(\)&quot;&gt; &amp; &quot;q&quot;<\/span>/);
  assert.match(top, /title="Folder: a&quot;&lt;b&gt;"/, 'the folder name in the tooltip is escaped too');
  const settings = sandbox.renderSettingsViewHtml();
  assert.ok(!settings.includes('<img'));
  assert.match(settings, /id="settings-name-input" value="&lt;img src=x onerror=&quot;a\(\)&quot;&gt; &amp; &quot;q&quot;"/);
});

test('the title of the page is the editor then the name, or the folder when there is no name', async () => {
  const named = await open('  name: Shop\n', 'archi');
  assert.equal(named.sandbox.pageTitle(), 'ArchiCode Editor Shop');
  run(named.sandbox, 'render()');
  assert.equal(run(named.sandbox, 'document.title'), 'ArchiCode Editor Shop');

  const unnamed = await open(null, 'archi');
  assert.equal(unnamed.sandbox.pageTitle(), 'ArchiCode Editor archi');
  unnamed.state.workspace.settings.name = 'Typed';
  assert.equal(unnamed.sandbox.pageTitle(), 'ArchiCode Editor Typed', 'follows the settings as they are edited');
});

test('"Opening “x”…" says the name stored with the folder, and the folder otherwise', () => {
  // the name comes from the remembered folder (run 0020), not from what this page rendered last: folders.test.js checks
  // that each opening passes it
  const sandbox = createApp();
  assert.equal(sandbox.openingMessage('archi', 'Shop'), 'Opening “Shop”…');
  assert.equal(sandbox.openingMessage('archi', ''), 'Opening “archi”…', 'no name, the folder');
  assert.equal(sandbox.openingMessage('archi'), 'Opening “archi”…', 'a folder never opened, or the served one');
  assert.equal(run(sandbox, 'typeof lastWorkspaceName'), 'undefined', 'the memory of the last name rendered is gone');
});

test('a save keeps the comments of workspace.yaml and the lines it did not touch', async () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-keep-'));
  fs.mkdirSync(path.join(dir, 'manifests'));
  fs.writeFileSync(path.join(dir, 'manifests', 'app.s1.yaml'), MANIFEST);
  const original = '# my workspace\napplication:\n  elements: []\nsettings:\n  views:\n    path: "out"   # where the views go\n';
  fs.writeFileSync(path.join(dir, 'workspace.yaml'), original);
  const sandbox = createApp();
  await sandbox.loadWorkspace(writableFolder(dir));
  const state = sandbox.__state();
  state.folder = { handle: writableFolder(dir), name: 'f' };
  state.workspace.settings.name = 'Shop';
  await sandbox.writeWorkspaceYaml();
  const text = saved(dir);
  assert.ok(text.startsWith('# my workspace\napplication:\n'));
  assert.ok(text.includes('    path: "out"   # where the views go\n'));
  assert.equal(plain(sandbox.parseYaml(text)).settings.name, 'Shop');
  await sandbox.writeWorkspaceYaml();
  assert.equal(saved(dir), text, 'a second save with nothing changed writes the same text');
});
