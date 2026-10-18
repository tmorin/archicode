'use strict';
// The plateau model in the editor (run 0077, wave 014, W-3): the header key `plateau` on every kind of manifest, the manifest of kind `plateau` with its
// patches, the tree of the plateaus and the references declared once in a chain of plateaus. The cases are in plateau-model-cases.json, which the command
// line runs too (PlateauModelTest.java): the two tools accept the same manifests and refuse the same ones with the same sentence.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'plateau-model-cases.json'), 'utf8'));

async function open(c) {
  const files = Object.assign({ 'workspace.yaml': c.settings || 'settings: {}\n' }, c.files);
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state, mem };
}

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const { state } = await open(c);
    const expect = c.expect;
    if (expect.removedKey !== undefined) {
      // the command line refuses the key with this sentence; the page reads the key until W-10 removes its reading (the case says so: `editor: null`)
      assert.equal(expect.editor, null);
      assert.ok(typeof expect.editorReason === 'string' && expect.editorReason.includes('W-10'), 'the case says why the editor waits, and for which run');
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
      const told = Array.from(tree.problems).concat(state.duplicateReferences.map((d) => d.message), Array.from(tree.redeclared));
      assert.deepEqual(told, expect.errors);
      return;
    }
    assert.deepEqual(Array.from(tree.problems).concat(Array.from(tree.redeclared), state.duplicateReferences.map((d) => d.message)), [], 'no mistake in the plateaus');
    assert.deepEqual(Array.from(tree.warnings), expect.warnings);
    assert.deepEqual(Array.from(state.index.application.keys()).sort(), expect.loaded.slice().sort(), 'what is drawn');
  });
}

const manifest = (kind, extra) => 'header:\n  kind: "archicode.morin.io/' + kind + '"\n' + (extra || '') + '  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';

test('the place-holder refusal of wave 013 is gone: kind plateau, in any case, and the plateau key of the header are read', async () => {
  const { sandbox } = await open({ files: {} });
  assert.equal(sandbox.parseManifestText(manifest('plateau')).error, null);
  assert.equal(sandbox.parseManifestText(manifest('Plateau')).error, null, 'a kind is read in any case, as the command line reads it');
  assert.equal(sandbox.parseManifestText(manifest('system', '  plateau: later\n')).error, null);
  assert.equal(sandbox.parseManifestText(manifest('system', '  plateau: [a]\n')).error, 'the value has the wrong shape (found an array) at `header.plateau`');
  assert.equal(sandbox.parseManifestText(manifest('system', '  nothing: x\n')).error, 'unknown key `nothing` (known: kind, parent, plateau, version) at `header.nothing`');
});

test('the tree of the plateaus: the chain of a plateau, from baseline, and the order of the tree', async () => {
  const plateau = (id, override) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (override ? '  override: "' + override + '"\n' : '');
  const { sandbox, state } = await open({
    files: {
      'manifests/marketplace.yaml': plateau('marketplace', 'inhouse'),
      'manifests/saas.yaml': plateau('saas'),
      'manifests/inhouse.yaml': plateau('inhouse'),
    },
  });
  const model = state.plateauTree;
  assert.deepEqual(Array.from(model.ids), ['baseline', 'inhouse', 'marketplace', 'saas']);
  assert.deepEqual(Array.from(sandbox.plateauChain(model, 'marketplace').map((n) => n.id)), ['baseline', 'inhouse', 'marketplace']);
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
      'manifests/b.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "b"\n  override: "nothing"\n',
    },
  });
  assert.equal(state.fatalError, null);
  const html = sandbox.renderPlateauTreeHtml();
  assert.match(html, /One mistake in the plateaus/);
  assert.match(html, /<code>b<\/code> \(<code>manifests\/b.yaml<\/code>\) overrides <code>nothing<\/code>/);
  assert.deepEqual(Array.from(state.index.application.keys()), ['shop'], 'the folder is open, and baseline is drawn');
});

const SETTINGS_PLATEAUS = 'settings:\n  plateaus:\n    - id: a\n      path: plateaus/a\n    - id: b\n      path: plateaus/b\n';
const CONFLICT = (file, how) => '`settings.plateaus` and layered plateaus are both used: `' + file + '` ' + how + '. Choose one: remove `settings.plateaus`, or remove the `plateau` keys of the headers and the manifests of kind `archicode.morin.io/plateau`';

test('an edit that adds a layered plateau to a workspace that has settings.plateaus is told in the banner, and the command line refuses both', async () => {
  const { sandbox, state } = await open({
    settings: SETTINGS_PLATEAUS,
    files: { 'plateaus/a/shop.yaml': manifest('system'), 'plateaus/b/shop.yaml': manifest('system') },
  });
  assert.equal(state.fatalError, null);
  assert.equal(sandbox.renderPlateauTreeHtml(), '', 'nothing to tell while no plateau is layered');
  sandbox.commitFileEdit('plateaus/b/shop.yaml', manifest('system', '  plateau: later\n')); // plateau b is the one drawn (the last)
  assert.equal(state.plateauTree.layered, true);
  const html = sandbox.renderPlateauTreeHtml();
  assert.match(html, /One mistake in the plateaus/);
  assert.match(html, /<code>settings\.plateaus<\/code> and layered plateaus are both used/);
});

test('a plateau of settings.plateaus whose folder is layered cannot be compared with: the baseline says so, as the command line does when it loads that plateau', async () => {
  const { sandbox, state } = await open({
    settings: SETTINGS_PLATEAUS,
    files: { 'plateaus/a/shop.yaml': manifest('system', '  plateau: later\n'), 'plateaus/b/shop.yaml': manifest('system') },
  });
  assert.equal(state.fatalError, null, 'plateau b is the one drawn, and it is not layered');
  await sandbox.setCompareTo('a');
  assert.equal(state.baseline.problem, 'The plateau `a` of `settings.plateaus` cannot be read: ' + CONFLICT('plateaus/a/shop.yaml', 'says `plateau: later` in its header') + '.');
});
