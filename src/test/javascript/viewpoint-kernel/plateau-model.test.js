'use strict';
// The plateau model in the editor (run 0077, wave 014, W-3): the header key `plateau` on every kind of manifest, the manifest of kind `plateau` with its
// patches, the tree of the plateaus and the references declared once in a chain of plateaus. The cases are in plateau-model-cases.json, which the command
// line runs too (PlateauModelTest.java): the two tools accept the same manifests and refuse the same ones with the same sentence.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'plateau-model-cases.json'), 'utf8'));

async function open(c, hash) {
  const files = Object.assign({ '.archicode.yaml': c.settings !== undefined ? c.settings : 'settings: {}\n' }, c.files); // an empty text is a .archicode.yaml with nothing in it (M74)
  const mem = memFolder(files);
  const sandbox = createApp({});
  if (hash) vm.runInContext('location.hash = ' + JSON.stringify(hash), sandbox);
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state, mem };
}

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const { state } = await open(c, c.plateau ? '#/timeline/applications?plateau=' + c.plateau : '');
    const expect = c.expect;
    if (expect.removedKey !== undefined || expect.noPlateau !== undefined) {
      // the command line refuses the workspace with this sentence, and the editor with the same one under its own heading (a capital and a full stop apart)
      if (expect.editorSays !== undefined) {
        assert.equal(state.fatalError, expect.editorSays);
        if (expect.removedKey !== undefined)
          assert.equal(
            state.fatalError,
            'Could not read/parse .archicode.yaml: ' + expect.removedKey,
            'one line: the heading and the sentence of the command line'
          );
        else assert.equal(state.fatalError.split('\n').slice(1).join('\n'), expect.noPlateau);
      } else {
        // the editor has no option to type: the address names a plateau it does not have, and the page draws baseline
        assert.equal(state.fatalError, null);
        assert.equal(state.layers.current, expect.editorDraws);
      }
      return;
    }
    assert.equal(state.fatalError, null, 'the folder opens: ' + state.fatalError);
    if (expect.fileError !== undefined) {
      const file = state.manifestFiles.find((f) => f.relPath === expect.fileError.file);
      assert.ok(file, 'the editor reads ' + expect.fileError.file);
      assert.equal(file.error, expect.fileError.sentence);
      return;
    }
    for (const f of state.manifestFiles) assert.equal(f.error, null, f.relPath + ' is read');
    const tree = state.plateauTree;
    if (expect.errors !== undefined) {
      // the order the command line tells them in: the tree, the references declared twice in a plateau, those declared again in an ancestor
      const told = Array.from(tree.problems).concat(
        state.duplicateReferences.map((d) => d.message),
        Array.from(tree.redeclared)
      );
      assert.deepEqual(told, expect.errors);
      return;
    }
    assert.deepEqual(
      Array.from(tree.problems).concat(
        Array.from(tree.redeclared),
        state.duplicateReferences.map((d) => d.message)
      ),
      [],
      'no mistake in the plateaus'
    );
    assert.deepEqual(Array.from(tree.warnings), expect.warnings);
    assert.deepEqual(Array.from(state.index.application.keys()).sort(), expect.loaded.slice().sort(), 'what is drawn');
  });
}

const manifest = (kind, extra) =>
  'header:\n  kind: "archicode.morin.io/' +
  kind +
  '"\n' +
  (extra || '') +
  '  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';

test('the place-holder refusal of wave 013 is gone: kind plateau, in any case, and the plateau key of the header are read', async () => {
  const { sandbox } = await open({ files: {} });
  assert.equal(sandbox.parseManifestText(manifest('plateau')).error, null);
  assert.equal(
    sandbox.parseManifestText(manifest('Plateau')).error,
    null,
    'a kind is read in any case, as the command line reads it'
  );
  assert.equal(sandbox.parseManifestText(manifest('system', '  plateau: later\n')).error, null);
  assert.equal(
    sandbox.parseManifestText(manifest('system', '  plateau: [a]\n')).error,
    'the value has the wrong shape (found an array) at `header.plateau`'
  );
  assert.equal(
    sandbox.parseManifestText(manifest('system', '  nothing: x\n')).error,
    'unknown key `nothing` (known: kind, parent, plateau, version) at `header.nothing`'
  );
});

test('the tree of the plateaus: the chain of a plateau, from baseline, and the order of the tree', async () => {
  const plateau = (id, override) =>
    'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' +
    id +
    '"\n' +
    (override ? '  override: "' + override + '"\n' : '');
  const { sandbox, state } = await open({
    files: {
      'manifests/marketplace.yaml': plateau('marketplace', 'inhouse'),
      'manifests/saas.yaml': plateau('saas'),
      'manifests/inhouse.yaml': plateau('inhouse')
    }
  });
  const model = state.plateauTree;
  assert.deepEqual(Array.from(model.ids), ['baseline', 'inhouse', 'marketplace', 'saas']);
  assert.deepEqual(Array.from(sandbox.plateauChain(model, 'marketplace').map((n) => n.id)), [
    'baseline',
    'inhouse',
    'marketplace'
  ]);
  assert.deepEqual(Array.from(sandbox.plateauChain(model, 'baseline').map((n) => n.id)), ['baseline']);
  assert.equal(model.nodes.get('baseline').parent, null);
  assert.equal(model.nodes.get('saas').parent, 'baseline');
  assert.equal(model.nodes.get('marketplace').manifest, 'manifests/marketplace.yaml');
});

test('a workspace that writes no plateau has the tree of baseline alone, and no banner', async () => {
  const { state } = await open({ files: { 'manifests/shop.yaml': manifest('system') } });
  assert.equal(state.plateauTree.layered, false);
  assert.deepEqual(Array.from(state.plateauTree.ids), ['baseline']);
  assert.deepEqual(Array.from(state.plateauTree.problems), []);
  assert.deepEqual(Array.from(state.plateauTree.warnings), []);
  assert.deepEqual(Array.from(state.index.application.keys()), ['shop']);
});

test('the mistakes of the tree and the warnings are told on the page, nothing else is blocked', async () => {
  const { sandbox, state } = await open({
    files: {
      'manifests/shop.yaml': manifest('system'),
      'manifests/a.yaml': manifest('system', '  plateau: later\n').replace('"shop"', '"a"'),
      'manifests/b.yaml':
        'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "b"\n  override: "nothing"\n'
    }
  });
  assert.equal(state.fatalError, null);
  const html = sandbox.renderPlateauTreeHtml();
  assert.match(html, /One mistake in the plateaus/);
  assert.match(html, /<code>b<\/code> \(<code>manifests\/b.yaml<\/code>\) overrides <code>nothing<\/code>/);
  assert.deepEqual(Array.from(state.index.application.keys()), ['shop'], 'the folder is open, and baseline is drawn');
});
