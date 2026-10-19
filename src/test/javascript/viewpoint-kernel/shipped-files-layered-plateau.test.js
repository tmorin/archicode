'use strict';
// A manifest of `kind: plateau` and a manifest with a `plateau` in its header are the layered plateaus of wave 014 (run 0077): the place-holder refusal that
// wave 013 put in their place (#30) is gone. The editor reads them as the command line does (`LayeredPlateauTest.java` runs the same sentences): a manifest of
// any kind accepts the header key, a manifest of kind plateau takes `id`, `name`, `horizon`, `override` and `patches`, and a mistake is the one sentence of both
// tools. The cases of the tree itself are in plateau-model-cases.json (plateau-model.test.js); every other kind and key keeps its message.
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

const KNOWN_KINDS = 'archicode.morin.io/component, archicode.morin.io/container, archicode.morin.io/environment, archicode.morin.io/node, archicode.morin.io/person, archicode.morin.io/plateau, archicode.morin.io/solution, archicode.morin.io/story, archicode.morin.io/system, archicode.morin.io/view';

for (const kind of ['archicode.morin.io/plateau', 'archicode.morin.io/Plateau', '  ARCHICODE.Morin.IO/PLATEAU ']) {
  test('kind ' + JSON.stringify(kind) + ' is a plateau, in any case and with spaces around it, as the command line reads a kind', async () => {
    const { state } = await open({ 'manifests/shop.yaml': manifest(kind) });
    assert.equal(state.fatalError, null);
    assert.equal(state.manifestFiles.length, 1);
    assert.equal(state.manifestFiles[0].error, null);
    assert.equal(state.index.application.size, 0, 'a plateau is no element');
    assert.deepEqual(Array.from(state.plateauTree.ids), ['baseline', 'shop']);
  });
}

test('the kind plateau needs its prefix, as every kind does, and it is one of the kinds the sentence lists', async () => {
  const { state } = await open({ 'manifests/shop.yaml': manifest('plateau') });
  assert.equal(state.manifestFiles[0].error, 'unrecognized `header.kind` "plateau" (known: ' + KNOWN_KINDS + ')');
});

test('a plateau key in the header of any kind of manifest is read', async () => {
  const { state } = await open({
    'manifests/shop.yaml': manifest('archicode.morin.io/system'),
    'manifests/mail.yaml': manifest('archicode.morin.io/system', '  plateau: later\n').replace('"shop"', '"mail"'),
  });
  assert.equal(state.fatalError, null);
  assert.deepEqual(Array.from(state.manifestFiles.map((f) => f.error)), [null, null]);
  assert.deepEqual(Array.from(state.index.application.keys()), ['shop'], 'only the plateau baseline is drawn until the plateaus are loaded as layers');
  assert.deepEqual(Array.from(state.plateauTree.ids), ['baseline', 'later']);
});

test('another unknown kind gets the one sentence of both tools (#76), and a plateau key in the content is an unknown key like any other, not a plateau', async () => {
  const { state } = await open({
    'manifests/a.yaml': manifest('archicode.morin.io/nothing'),
    'manifests/b.yaml': manifest('archicode.morin.io/system').replace('name: "Shop"', 'name: "Shop"\n  plateau: "this is content, not the header"').replace('id: "shop"', 'id: "other"'),
  });
  const byFile = Object.fromEntries(state.manifestFiles.map((f) => [f.relPath, f.error]));
  assert.equal(byFile['manifests/a.yaml'], 'unrecognized `header.kind` "archicode.morin.io/nothing" (known: ' + KNOWN_KINDS + ')');
  // the command line says the same of a key of the content that the element does not have
  assert.equal(byFile['manifests/b.yaml'], 'unknown key `plateau` (known: description, elements, id, name, qualifiers, relationships, replaces, tags) at `plateau`');
});

test('a manifest edited into a layered plateau is read, and one edited into a mistake is refused with the sentence of the command line', async () => {
  const { sandbox } = await open({ 'manifests/shop.yaml': manifest('archicode.morin.io/system') });
  assert.equal(sandbox.parseManifestText(manifest('archicode.morin.io/system', '  plateau: later\n')).error, null);
  assert.equal(sandbox.parseManifestText(manifest('archicode.morin.io/plateau')).error, null);
  assert.equal(sandbox.parseManifestText(manifest('archicode.morin.io/plateau').replace('name: "Shop"', 'override: [a]')).error, 'the value has the wrong shape (found an array) at `override`');
});
