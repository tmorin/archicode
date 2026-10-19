'use strict';
// The state of a box that did not change and holds a change is said by the kernel, on the union `compare` gives (wave 015, run 0094, issue #96): `contains_changes`
// on the element, and `contains_more_than_wording` for the editor's toggle that sets the wording-only changes aside. The page and the command line read the key; neither works
// the rule out from the references any more (`referencesAboveChanges` and `computedStateOf` of the page, `StateTags.stateOf` of the command line, are gone).
//
// This test draws the same data through `compute`, which works the state out for itself on the elements it is given, and compares every item with what the union says. The data is the
// invented library of src/test/resources/plateau-state-hints: both layers, the seven states, a change of the description alone, and a box that holds a rewording only.
// `PlateauComparerTest.shouldReadTheStateOfAContainerFromTheUnionAndFindItAgainOnTheItemsOfTheView` is the same check for the command line.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const HTML = path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html');
const FIXTURE = path.resolve(__dirname, '../../resources/plateau-state-hints');
const plain = (value) => JSON.parse(JSON.stringify(value));

async function loadEmbeddedKernel() {
  const block = fs.readFileSync(HTML, 'utf8').match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/);
  const { instance } = await WebAssembly.instantiate(Buffer.from(block[1].trim(), 'base64'), {});
  const x = instance.exports;
  return (name, input) => {
    const data = Buffer.from(typeof input === 'string' ? input : JSON.stringify(input), 'utf8');
    const ptr = x.alloc(data.length);
    new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
    const length = x[name](ptr, data.length);
    const text = Buffer.from(new Uint8Array(x.memory.buffer, x.result_ptr(), length)).toString('utf8');
    x.dealloc(ptr, data.length);
    return JSON.parse(text);
  };
}

async function open() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(FIXTURE);
  state.folder = { handle, name: 'plateau-state-hints' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  await sandbox.loadViewpointKernel();
  await sandbox.drawPlateau('after');
  await sandbox.compareWithPlateau('before');
  return { sandbox, state };
}

/** The union of a layer drawn as a map with every box open, as the page hands it to `compute`. */
function drawn(call, layers, layer, extra) {
  const elements = layers[layer];
  const input = Object.assign({ viewpoint: 'map', layer, focal: '', elements: plain(elements), opened: elements.filter((e) => e.parent).map((e) => e.reference) }, extra || {});
  const view = call('compute', input);
  assert.equal(view.error, undefined, JSON.stringify(view.error));
  return view;
}

for (const layer of ['application', 'technology']) {
  test('compute works out, on the ' + layer + ' layer of the union, the state the union says: every item and every element agree', async () => {
    const call = await loadEmbeddedKernel();
    const { sandbox } = await open();
    const state = sandbox.comparisonState();
    const view = drawn(call, state.full.layers, layer);
    let boxes = 0;
    for (const item of view.items) {
      const element = state.full.records.get(layer + '|' + item.reference);
      assert.ok(element, item.reference + ' is in the union');
      assert.equal(item.contains_changes === true, element.contains_changes === true, layer + ' ' + item.reference + ': the item and the union say the same');
      if (item.contains_changes) boxes++;
    }
    assert.ok(view.items.length >= 3);
    assert.ok(boxes >= 1, 'the data has a box that holds a change in this layer');
    // an element that changed itself never says it, whatever is inside it
    for (const [key, element] of state.full.records) if (key.startsWith(layer + '|') && element.change !== 'none') assert.equal(element.contains_changes, undefined, key);
  });

  test('with the wording-only changes set aside, compute and the union agree on the ' + layer + ' layer as well (the box that holds a rewording only is not marked)', async () => {
    const call = await loadEmbeddedKernel();
    const { sandbox, state } = await open();
    const full = sandbox.comparisonState();
    state.hideWording = true;
    vm.runInContext('AppState.hideWording = true;', sandbox);
    const quiet = sandbox.comparisonState();
    const view = drawn(call, quiet.layers, layer);
    for (const item of view.items) {
      const element = quiet.records.get(layer + '|' + item.reference);
      assert.equal(item.contains_changes === true, element.contains_changes === true, layer + ' ' + item.reference + ': set aside, the item and the record say the same');
    }
    // an element that is not a rewording keeps what the union says of it
    for (const [key, element] of full.records) {
      if (key.startsWith(layer + '|') && !(element.change === 'changed' && element.wording_only === true)) assert.equal(quiet.records.get(key).change, element.change, key);
    }
  });
}

test('the key is not a free-form field of compute: a facet does not see it, and the drawing does not depend on it', async () => {
  const call = await loadEmbeddedKernel();
  const { sandbox } = await open();
  const state = sandbox.comparisonState();
  const marked = state.full.layers.application.filter((e) => e.contains_changes === true);
  assert.ok(marked.length >= 1);
  const facet = { actions: [{ operator: 'REMOVE', json_path: '$..elements[?(@.contains_changes == true)]' }] };
  const through = drawn(call, state.full.layers, 'application', { facet });
  const without = drawn(call, state.full.layers, 'application');
  assert.deepEqual(plain(through.items.map((i) => i.id)), plain(without.items.map((i) => i.id)), 'the facet removed nothing: it never saw the key');
  const stripped = { application: state.full.layers.application.map((e) => { const copy = Object.assign({}, e); delete copy.contains_changes; delete copy.contains_more_than_wording; return copy; }) };
  assert.deepEqual(plain(drawn(call, stripped, 'application')), plain(without), 'the drawing is the same without the keys');
});

test('the page keeps no copy of the rule: it reads the key of the union (the tree, the hints about hand-written states)', async () => {
  const source = fs.readFileSync(HTML, 'utf8');
  assert.doesNotMatch(source, /referencesAboveChanges|computedStateOf/);
  const { sandbox } = await open();
  const state = sandbox.comparisonState();
  assert.equal(state.above, undefined, 'the comparison no longer carries the references above a change');
  assert.equal(state.full.above, undefined);
  const loans = state.full.records.get('application|library.loans');
  assert.equal(sandbox.comparisonStateOfElement(loans), 'changed');
  const viaKey = (element) => sandbox.comparisonStateOfElement(Object.assign({}, element, { change: 'none', contains_changes: true }));
  assert.equal(viaKey(loans), 'contains-changes');
  assert.equal(sandbox.comparisonStateOfElement(undefined), null, 'a reference the union does not hold');
  assert.equal(sandbox.comparisonStateOfElement({ reference: 'x', change: 'none' }), null);
});

test('a box that holds a rewording only is marked in the full drawing and not once the wording-only changes are set aside, and the kernel says both', async () => {
  const call = await loadEmbeddedKernel();
  const { sandbox } = await open();
  const el = (reference, extra) => Object.assign({ reference, parent: !reference.includes('.') }, extra || {});
  const base = { application: [el('wording'), el('wording.leaf', { description: 'one' }), el('mixed'), el('mixed.leaf', { description: 'one' }), el('mixed.fresh-ground')], technology: [] };
  const target = { application: [el('wording'), el('wording.leaf', { description: 'two' }), el('mixed'), el('mixed.leaf', { description: 'two' }), el('mixed.born')], technology: [] };
  const answer = call('compare', { base, target, on_one_chain: true });
  assert.equal(answer.error, undefined);
  const flags = (records, reference) => records.get('application|' + reference);
  const value = Object.assign({ answer }, sandbox.unionLayersOf(answer));
  // the union: both boxes hold a change; `wording` holds nothing but a rewording
  assert.equal(flags(value.records, 'wording').contains_changes, true);
  assert.equal(flags(value.records, 'wording').contains_more_than_wording, undefined);
  assert.equal(flags(value.records, 'mixed').contains_changes, true);
  assert.equal(flags(value.records, 'mixed').contains_more_than_wording, true);
  // set aside: the page reads the second key for the boxes that are unchanged now
  const quiet = sandbox.setWordingAside(value);
  assert.equal(flags(quiet.records, 'wording').contains_changes, undefined);
  assert.equal(flags(quiet.records, 'mixed').contains_changes, true);
  assert.equal(sandbox.comparisonStateOfElement(flags(quiet.records, 'wording')), null);
  assert.equal(sandbox.comparisonStateOfElement(flags(quiet.records, 'wording.leaf')), null, 'set aside, the leaf is unchanged');
  assert.equal(sandbox.comparisonStateOfElement(flags(value.records, 'wording.leaf')), 'changed');
  // and `compute`, given the elements as they are set aside, says what the records say
  for (const [layers, records] of [[value.layers, value.records], [quiet.layers, quiet.records]]) {
    const view = drawn(call, layers, 'application');
    assert.ok(view.items.length >= 4);
    for (const item of view.items) assert.equal(item.contains_changes === true, records.get('application|' + item.reference).contains_changes === true, item.reference);
  }
});
