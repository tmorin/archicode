'use strict';
// The workspace file is not a manifest of the folder it is in, and nothing else is left out: the editor skips the file it opened
// (`.archicode.yaml`) as the command line skips the workspace file it read, not every file whose name looks like one. Invented folder.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const plain = (value) => JSON.parse(JSON.stringify(value));
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const SHOP = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state };
}

test('a folder that is the one of the workspace file does not read the workspace file as a manifest', async () => {
  const { state } = await open({ '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["."]\n', 'shop.yaml': SHOP });
  assert.equal(state.fatalError, null);
  assert.deepEqual(plain(state.manifestFiles.map((f) => f.relPath)), ['shop.yaml']);
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.error)), []);
});

test('a file named like a workspace file but that is not the one opened is a manifest, as for the command line', async () => {
  const { state } = await open({
    '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["."]\n',
    'shop.yaml': SHOP,
    'workspace.yml': SHOP.replace('"shop"', '"other"').replace('"Shop"', '"Other"'),
    'workspace.json': '{}',
    'workspace.toml': ''
  });
  assert.deepEqual(plain(state.manifestFiles.map((f) => f.relPath)), ['shop.yaml', 'workspace.yml']);
  assert.ok(state.index.application.has('other'), 'workspace.yml declares an element and is read');
  assert.deepEqual(plain(state.unreadManifestFiles), ['workspace.json', 'workspace.toml'], 'the files the editor does not read are told, as for any other name');
});
