'use strict';
// A manifest of `kind: plateau` and a manifest with a `plateau` in its header are refused, as `from` of a plateau of the workspace is: they are
// reserved for the layered plateaus of a later version (#30), never recognised. The editor says the sentence the command line says
// (`LayeredPlateauRefusalTest.java` runs the same cases), where it says `Unrecognized header.kind` for another kind; every other message stays.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const manifest = (kind, extra) => 'header:\n  kind: "' + kind + '"\n' + (extra || '') + '  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';

async function open(files) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': 'settings: {}\n' }, files));
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state };
}

const LATER = ' is not supported yet: layered plateaus (a plateau written as an increment on top of another one) are reserved for a later version of ArchiCode (see #30). Give each plateau its own folder of manifests in `settings.plateaus` instead';

for (const kind of ['archicode.morin.io/plateau', 'plateau', 'archicode.morin.io/Plateau']) {
  test('kind ' + kind + ' is refused with the sentence of #30', async () => {
    const { state } = await open({ 'manifests/shop.yaml': manifest(kind) });
    assert.equal(state.fatalError, null);
    assert.equal(state.manifestFiles.length, 1);
    assert.equal(state.manifestFiles[0].error, '`kind: plateau`' + LATER);
    assert.equal(state.index.application.size, 0, 'nothing of it is read');
  });
}

test('a plateau key in the header is refused with the sentence of #30', async () => {
  const { state } = await open({ 'manifests/shop.yaml': manifest('archicode.morin.io/system', '  plateau: later\n') });
  assert.equal(state.manifestFiles[0].error, '`header.plateau`' + LATER);
  assert.equal(state.index.application.size, 0);
});

test('another unknown kind keeps its message, and a plateau elsewhere than in the header is no refusal', async () => {
  const { state } = await open({
    'manifests/a.yaml': manifest('archicode.morin.io/nothing'),
    'manifests/b.yaml': manifest('archicode.morin.io/system').replace('name: "Shop"', 'name: "Shop"\n  plateau: "this is content, not the header"').replace('id: "shop"', 'id: "other"')
  });
  const byFile = Object.fromEntries(state.manifestFiles.map((f) => [f.relPath, f.error]));
  assert.equal(byFile['manifests/a.yaml'], 'Unrecognized header.kind "archicode.morin.io/nothing"');
  assert.equal(byFile['manifests/b.yaml'], null);
});

test('a manifest edited into a layered plateau is refused with the same sentence', async () => {
  const { sandbox, state } = await open({ 'manifests/shop.yaml': manifest('archicode.morin.io/system') });
  assert.equal(state.manifestFiles[0].error, null);
  const parsed = sandbox.parseManifestText(manifest('archicode.morin.io/system', '  plateau: later\n'));
  assert.equal(parsed.error, '`header.plateau`' + LATER);
});
