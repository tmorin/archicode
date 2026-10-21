'use strict';
// A patch can take a field out (wave 017, run 0126, issue #94): `REMOVE` with a `field`. The kernel applies it (patch-cases.json), both tools read it the same way
// (field-removal-cases.json, which FieldRemovalCasesTest.java runs through the command line), and the editor WRITES it where it used to refuse to clear a text an inherited element
// has: one patch for the field, at the end of the patches of the plateau drawn, found again by (target, field) by the next edit.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const vm = require('node:vm');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'field-removal-cases.json'), 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value));
const caseOf = (id) => DOCUMENT.cases.find((c) => c.id === id);

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null, 'the folder opens: ' + state.fatalError);
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

const rowsOf = (changes) => changes.filter((row) => row.thing === 'element').map((row) => [row.layer, row.reference, row.change, (row.natures || []).slice().sort().join(',')].join('|')).sort();
const edit = (sandbox, reference, fn, layer, options) => sandbox.commitElementEdit(reference, fn, layer || 'application', options);
const patchesOf = (state, plateau) => plain(state.plateauTree.nodes.get(plateau).patches);
const manifestText = (opened, relPath) => opened.mem.files.get(relPath).text;

async function saved(opened, relPath) {
  await opened.sandbox.saveAllChanges();
  return opened.mem.files.get(relPath).text;
}

for (const c of DOCUMENT.cases) {
  for (const want of c.resolved) {
    test(c.id + ': ' + want.field + ' of ' + want.reference + ' in ' + want.plateau + ' (' + c.what + ')', async () => {
      const { sandbox, state } = await open(c.files);
      sandbox.drawPlateau(want.plateau);
      const record = state.index[want.layer].get(want.reference);
      const got = record[want.field];
      assert.deepEqual(plain(got === undefined || got === null ? null : got), want.value);
    });
  }
  for (const comparison of c.comparisons) {
    test(c.id + ': ' + comparison.plateau + ' compared with ' + comparison.against, async () => {
      const { sandbox, state } = await open(c.files);
      sandbox.drawPlateau(comparison.plateau);
      sandbox.compareWithPlateau(comparison.against);
      assert.equal(state.baseline.plateau.id, comparison.against);
      const view = sandbox.comparisonState();
      assert.equal(view.problems, undefined, JSON.stringify(view.problems));
      assert.deepEqual(rowsOf(plain(view.changes)), comparison.rows.slice().sort(), 'the table');
      assert.deepEqual(plain(view.warnings), [], 'no warning');
      assert.deepEqual(plain(view.cascade || []), [], 'nothing left the graph: no cascade');
    });
  }
}

test('the origin of a field a plateau took out says so, and the patch is a change of that field, not a removal', async () => {
  const { sandbox, state } = await open(caseOf('F01').files);
  sandbox.drawPlateau('lean');
  const record = state.index.application.get('shop');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(record, 'description')), 'taken out by patch 1 of lean (REMOVE target shop)');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(record, 'name')), 'inherited from baseline');
  assert.deepEqual(plain(state.index.application.get('shop').touchedBy.map((t) => [t.rank, t.operator, t.field])), [[1, 'REMOVE', 'description']]);
  // the plateau over it inherits the field gone, from the layer that took it out
  sandbox.drawPlateau('leaner');
  assert.equal(state.index.application.get('shop').description, null);
  // no removal is listed for it: the layer removed no element
  const model = sandbox.layerModelOf('lean', state.workspace.settings);
  assert.deepEqual(plain(model.removals), []);
});

test('a REMOVE of a kind, an id or an element that does not exist is told by the plateau, in the editor as in the command line', async () => {
  for (const [field, sentence] of [['kind', 'plateau lean: patch 1 (REMOVE target shop): `kind` cannot be taken out: an element always has a kind'], ['id', 'plateau lean: patch 1 (REMOVE target shop): `id` cannot be changed: a patch never changes an id or a parent']]) {
    const files = Object.assign({}, caseOf('F01').files);
    files['manifests/lean/plateau.yaml'] = files['manifests/lean/plateau.yaml'].replace('field: description', 'field: ' + field);
    const { sandbox, state } = await open(files);
    sandbox.drawPlateau('lean');
    assert.deepEqual(plain(state.layerProblems), [sentence]);
  }
});

// ---- the editor writes it ----

test('clearing a text the plateau inherits writes one REMOVE patch at the end, and nothing else; the plateaus that stand on it ask first', async () => {
  const files = caseOf('F01').files;
  const opened = await open(files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('leaner');
  // `leaner` stands on `lean`, which has no patch on the description of `shop`: the REMOVE goes in the plateau drawn
  assert.equal(edit(sandbox, 'shop.web', (n) => { delete n.description; }), undefined);
  assert.equal(state.index.application.get('shop.web').description, null);
  const text = await saved(opened, 'manifests/leaner/plateau.yaml');
  assert.equal(text, 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "leaner"\n  override: "lean"\n  patches:\n    - operator: "REMOVE"\n      target: "shop.web"\n      field: "description"\n');
  for (const relPath of Object.keys(files)) if (relPath !== 'manifests/leaner/plateau.yaml') assert.equal(manifestText(opened, relPath), files[relPath], relPath + ' is as the author left it');
  assert.deepEqual(patchesOf(state, 'leaner'), [{ operator: 'REMOVE', target: 'shop.web', field: 'description' }]);
  // lean, which leaner stands on, still has it
  sandbox.drawPlateau('lean');
  assert.equal(state.index.application.get('shop.web').description, 'The storefront.');
});

test('the same edit in a plateau other plateaus stand on opens the dialog of the plateaus it changes, and writes the patch when the author says yes', async () => {
  const opened = await open(caseOf('F01').files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('lean');
  edit(sandbox, 'shop.web', (n) => { delete n.description; });
  assert.equal(vm.runInContext('appDialog', sandbox).kind, 'layer-confirm', 'the author is asked first: the plateau that stands on this one changes too');
  assert.equal(state.dirtyReferences.size, 0, 'nothing was written before the author said yes');
  assert.deepEqual(patchesOf(state, 'lean').map((p) => p.target + ':' + p.field), ['shop:description']);
  edit(sandbox, 'shop.web', (n) => { delete n.description; }, 'application', { confirmed: true });
  assert.deepEqual(patchesOf(state, 'lean').map((p) => p.target + ':' + p.field), ['shop:description', 'shop.web:description']);
  sandbox.drawPlateau('leaner');
  assert.equal(state.index.application.get('shop.web').description, null, 'the plateau that stands on it sees the field gone');
});

test('a new text after the field was taken out changes that patch in place: one patch, REMOVE becomes SET; the text the plateau inherits takes the patch out', async () => {
  const opened = await open(caseOf('F01').files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('lean');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(state.index.application.get('shop'), 'description')), 'taken out by patch 1 of lean (REMOVE target shop)');
  edit(sandbox, 'shop', (n) => { n.description = 'Sells more.'; }, 'application', { confirmed: true });
  assert.deepEqual(patchesOf(state, 'lean'), [{ operator: 'SET', target: 'shop', field: 'description', value: 'Sells more.' }], 'the REMOVE was changed, no patch was added');
  const text = await saved(opened, 'manifests/lean/plateau.yaml');
  assert.equal(text, 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "lean"\n  patches:\n    - operator: SET\n      target: shop\n      field: description\n      value: Sells more.\n');
  // cleared again: the SET becomes a REMOVE, still one patch
  edit(sandbox, 'shop', (n) => { delete n.description; }, 'application', { confirmed: true });
  assert.deepEqual(patchesOf(state, 'lean'), [{ operator: 'REMOVE', target: 'shop', field: 'description' }]);
  assert.equal(state.index.application.get('shop').description, null);
  // the text baseline gives it: the plateau has nothing to say about it any more
  edit(sandbox, 'shop', (n) => { n.description = 'Sells things.'; }, 'application', { confirmed: true });
  assert.equal(state.plateauTree.nodes.get('lean').patches.length, 0);
  assert.equal(state.index.application.get('shop').description, 'Sells things.');
});

test('a plateau that sets the field again after one that took it out gets it back; clearing it there leaves what the plateau below says', async () => {
  const opened = await open(caseOf('F02').files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('back');
  assert.equal(state.index.application.get('shop').description, 'Sells again.');
  // clearing it in `back`: `lean` already gives the field gone, so the SET of the plateau has nothing left to say and goes
  edit(sandbox, 'shop', (n) => { delete n.description; });
  assert.deepEqual(patchesOf(state, 'back'), []);
  assert.equal(state.index.application.get('shop').description, null);
  sandbox.compareWithPlateau('lean');
  assert.deepEqual(rowsOf(plain(sandbox.comparisonState().changes)), [], 'back and lean both lack it');
});

test('a field of the technology layer, and a name, are taken out the same way', async () => {
  const opened = await open(caseOf('F05').files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('baseline');
  assert.equal(state.index.technology.get('prod.vm').description, 'The machine.');
  const second = await open(Object.assign({}, caseOf('F05').files, { 'manifests/anon/plateau.yaml': caseOf('F05').files['manifests/anon/plateau.yaml'].replace(/patches:[\s\S]*$/, 'patches:\n    - operator: REMOVE\n      target: tax\n      field: qualifiers\n') }));
  second.sandbox.drawPlateau('anon');
  edit(second.sandbox, 'prod.vm', (n) => { delete n.description; }, 'technology');
  edit(second.sandbox, 'shop.web', (n) => { delete n.name; });
  assert.deepEqual(patchesOf(second.state, 'anon'), [
    { operator: 'REMOVE', target: 'tax', field: 'qualifiers' },
    { operator: 'REMOVE', target: 'prod.vm', layer: 'technology', field: 'description' },
    { operator: 'REMOVE', target: 'shop.web', field: 'name' }
  ]);
  assert.equal(second.state.index.technology.get('prod.vm').description, null);
  assert.equal(second.state.index.application.get('shop.web').name, null);
});

test('clearing a field an element declares in the plateau drawn still takes the line out of its manifest: no patch', async () => {
  const files = Object.assign({}, caseOf('F01').files, {
    'manifests/lean/extra.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n  plateau: lean\ncontent:\n  id: "extra"\n  name: "Extra"\n  description: "Only in lean."\n'
  });
  const opened = await open(files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('lean');
  edit(sandbox, 'extra', (n) => { delete n.description; }, 'application', { confirmed: true });
  assert.deepEqual(patchesOf(state, 'lean').map((p) => p.target), ['shop'], 'the plateau has no patch on it');
  const text = await saved(opened, 'manifests/lean/extra.yaml');
  assert.ok(!text.includes('description'), text);
});

test('an inherited list is still emptied with a SET of the empty list, and a list does not get a REMOVE', async () => {
  const files = Object.assign({}, caseOf('F01').files);
  const opened = await open(files);
  const { sandbox, state } = opened;
  sandbox.drawPlateau('leaner');
  edit(sandbox, 'shop.api', (n) => { n.tags = {}; });
  assert.deepEqual(patchesOf(state, 'leaner'), [{ operator: 'SET', target: 'shop.api', field: 'tags', value: {} }]);
});

test('two patches on a text, written by hand: clearing it turns the last whole-value SET into the REMOVE and leaves the first alone', async () => {
  const files = Object.assign({}, caseOf('F01').files, {
    'manifests/two/plateau.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "two"\n  patches:\n    - operator: SET\n      target: shop\n      field: description\n      value: "First."\n    - operator: SET\n      target: shop\n      field: description\n      value: "Second."\n'
  });
  const { sandbox, state } = await open(files);
  sandbox.drawPlateau('two');
  assert.equal(state.index.application.get('shop').description, 'Second.');
  edit(sandbox, 'shop', (n) => { delete n.description; });
  assert.deepEqual(patchesOf(state, 'two'), [
    { operator: 'SET', target: 'shop', field: 'description', value: 'First.' },
    { operator: 'REMOVE', target: 'shop', field: 'description' }
  ]);
  assert.equal(state.index.application.get('shop').description, null);
});
