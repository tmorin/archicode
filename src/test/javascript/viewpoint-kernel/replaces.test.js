'use strict';
// `replaces` in the editor's input (wave 009, run 0042): an element of the more recent plateau says which elements of the baseline it is the
// new place of, and the editor hands that to the kernel's `compare` as it hands it the rest of the element. Nothing else reads it. The kernel
// is the real embedded module (contract version 5); the rules of `replaces` themselves are proven by `cargo test` and the Java test. What this
// proves is the path from a manifest of the editor to the kernel and back to the union the page draws.
// The editor page for it (the Changes panel, the inspector, "Write replaces") is a later run. Everything here is invented.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles, openLayered, compareWith } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

const element = (kind, parent, id, name, extra) =>
  'header:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '');

// the base: a shop with a legacy till and a reporting job, a warehouse
const BASE = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  'app.shop.till.yaml': element('container', 'shop', 'till', 'Till'),
  'app.shop.report.yaml': element('container', 'shop', 'report', 'Report'),
  'app.stock.yaml': element('system', null, 'stock', 'Stock'),
  'app.stock.bin.yaml': element('container', 'stock', 'bin', 'Bin'),
  'app.stock.shelf.yaml': element('container', 'stock', 'shelf', 'Shelf')
};
// the target: the till moved under the stock system, the report was split in two, bin and shelf were merged, and a replaces that points nowhere
const TARGET = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  'app.shop.report-a.yaml': element('container', 'shop', 'report-a', 'Report A', '  replaces: [shop.report]\n'),
  'app.shop.report-b.yaml': element('container', 'shop', 'report-b', 'Report B', '  replaces:\n    - shop.report\n    - nowhere.at-all\n'),
  'app.stock.yaml': element('system', null, 'stock', 'Stock'),
  'app.stock.till.yaml': element('container', 'stock', 'till', 'Till', '  replaces: [shop.till]\n'),
  'app.stock.place.yaml': element('container', 'stock', 'place', 'Place', '  replaces: [stock.shelf, stock.bin]\n')
};
const PLAIN_TARGET = Object.assign({}, TARGET);
for (const name of Object.keys(PLAIN_TARGET)) PLAIN_TARGET[name] = PLAIN_TARGET[name].replace(/  replaces:(\n    - .*)*(?: \[.*\])?\n/, '');

const folder = (dir, files) => Object.fromEntries(Object.entries(files).map(([name, text]) => ['plateaus/' + dir + '/' + name, text]));
const PLATEAU_LIST = [{ id: 'base', path: 'plateaus/10_base' }, { id: 'target', path: 'plateaus/20_target' }];

/** The two states as layers (see layered-folders.js: siblings over an empty baseline), the target drawn and compared with the base on the band. */
async function open(target, base) {
  const { sandbox, state } = await openLayered(createApp, memFolder, layeredFiles(PLATEAU_LIST, Object.assign({}, folder('10_base', base || BASE), folder('20_target', target))), { drawn: 'target', compared: 'base' });
  return { sandbox, state, kernel: run(sandbox, 'loadedKernel') };
}

test('the editor and the kernel it embeds speak contract version 5', async () => {
  const { sandbox, kernel } = await open(TARGET);
  assert.equal(run(sandbox, 'KERNEL_CONTRACT_VERSION'), 5);
  assert.equal(kernel.compare({ base: {}, target: {}, on_one_chain: true }).version, 5);
});

test('the record of an element keeps what it replaces, and the kernel input carries it only with a comparison and only when there is one', async () => {
  const { sandbox, state } = await open(TARGET);
  assert.deepEqual(plain(state.index.application.get('stock.till').replaces), ['shop.till']);
  assert.deepEqual(plain(state.index.application.get('shop').replaces), []);
  const input = plain(sandbox.comparisonInput());
  const of = (side, reference) => input[side].application.find((e) => e.reference === reference);
  assert.deepEqual(of('target', 'stock.till').replaces, ['shop.till']);
  assert.deepEqual(of('target', 'stock.place').replaces, ['stock.shelf', 'stock.bin'], 'as the author wrote them: the kernel sorts');
  assert.equal('replaces' in of('target', 'shop'), false, 'no key for an element that replaces nothing');
  assert.equal(JSON.stringify(input.base).includes('replaces'), false, 'the baseline says nothing of it');
  // the views of the plateau drawn, with no comparison, do not take it
  compareWith(sandbox, '');
  const viewInput = plain(sandbox.buildKernelInput('overview', 'shop', {}).input);
  assert.equal(JSON.stringify(viewInput).includes('replaces'), false);
});

test('the comparison reports moved, split and merged elements, and the replaced ones are not removed', async () => {
  const { sandbox } = await open(TARGET);
  const state = sandbox.comparisonState();
  assert.equal(state.problems, undefined);
  const changeOf = (reference) => state.records.get('application|' + reference);
  assert.equal(changeOf('stock.till').change, 'moved');
  assert.deepEqual(plain(changeOf('stock.till').replaces), ['shop.till']);
  assert.equal(changeOf('shop.report-a').change, 'split');
  assert.equal(changeOf('shop.report-b').change, 'split');
  assert.deepEqual(plain(changeOf('shop.report-b').replaces), ['shop.report'], 'the reference that does not exist is ignored');
  assert.equal(changeOf('stock.place').change, 'merged');
  for (const replaced of ['shop.till', 'shop.report', 'stock.bin', 'stock.shelf']) assert.equal(state.records.has('application|' + replaced), false, replaced + ' is replaced, not removed');
  assert.deepEqual(plain(state.counts.elements), { new: 0, changed: 0, removed: 0, wording_only: 0, moved: 1, split: 2, merged: 1 });
  const answer = sandbox.comparisonState().changes;
  assert.equal(answer.filter((row) => row.thing === 'element').length, 4);
});

test('a union that has moved, split and merged elements is drawn without an error', async () => {
  const { sandbox } = await open(TARGET);
  run(sandbox, "currentPerspective = 'map';");
  const kernel = await sandbox.loadViewpointKernel();
  const { input } = sandbox.buildKernelInput('map', 'shop', { opened: ['shop', 'stock'] });
  const result = kernel.compute(input);
  assert.equal(result.error, undefined, JSON.stringify(result.error));
  assert.equal(result.version, 5);
  const stereotypes = Object.fromEntries(result.items.map((i) => [i.reference, i.stereotypes]));
  assert.ok(stereotypes['stock.till'].includes('moved'), JSON.stringify(stereotypes));
  assert.ok(stereotypes['shop.report-a'].includes('split'));
  assert.ok(stereotypes['stock.place'].includes('merged'));
});

test('a workspace without replaces compares as it did: same counts, no new key in the input, no warning', async () => {
  const { sandbox } = await open(PLAIN_TARGET);
  assert.equal(JSON.stringify(sandbox.comparisonInput()).includes('replaces'), false);
  const state = sandbox.comparisonState();
  assert.deepEqual(plain(state.counts.elements), { new: 4, changed: 0, removed: 4, wording_only: 0 }, 'the four elements the target lost, the four it gained, and none of the new counts');
  const answer = plain(run(sandbox, 'loadedKernel').compare(sandbox.comparisonInput()));
  assert.equal('warnings' in answer, false);
  assert.deepEqual(answer.candidates.map((c) => [c.from, c.to]), [['shop.till', 'stock.till']], 'listed, same kind and name, and not applied: both are still removed and new');
});

// ---- E1 of docs/fixtures/brightcart-spec.md (section 12), wave 012: a removed node that deployed an application another one replaced ----

const E1_BASE = {
  'app.s.yaml': element('system', null, 's', 'S'),
  'app.s.x.yaml': element('container', 's', 'x', 'X'),
  'tec.e.yaml': element('environment', null, 'e', 'E'),
  'tec.e.n.yaml': element('node', 'e', 'n', 'N', '  applications: [s.x]\n')
};
const E1_TARGET = {
  'app.s.yaml': element('system', null, 's', 'S'),
  'app.s.y.yaml': element('container', 's', 'y', 'Y', '  replaces: [s.x]\n'),
  'tec.e.yaml': element('environment', null, 'e', 'E'),
  'tec.e.m.yaml': element('node', 'e', 'm', 'M', '  applications: [s.y]\n')
};

test('E1: the removed node of a comparison deploys what replaced the application it deployed, and the deep view of the environment is drawn', async () => {
  const { sandbox, kernel } = await open(E1_TARGET, E1_BASE);
  const answer = plain(kernel.compare(sandbox.comparisonInput()));
  assert.equal(answer.error, undefined);
  const removed = answer.elements.find((e) => e.layer === 'technology' && e.reference === 'e.n');
  assert.equal(removed.change, 'removed');
  assert.deepEqual(removed.applications, ['s.y'], 'the application that took the place of s.x');
  assert.equal(answer.elements.some((e) => e.reference === 's.x'), false, 's.x is still not in the union');
  assert.deepEqual(answer.counts.elements, { new: 1, changed: 0, removed: 1, wording_only: 0, moved: 1 });
  for (const viewpoint of ['overview', 'detailed', 'deep']) {
    const { input } = sandbox.buildKernelInput(viewpoint, 'e', { layer: 'technology' });
    const result = kernel.compute(input);
    assert.equal(result.error, undefined, viewpoint + ': ' + JSON.stringify(result.error));
  }
});

// ---- #60, wave 013 (run 0069): a name that repeats says nothing about which element is which ----

test('the embedded kernel offers a pair for a name only when no other removed and no other new element of that kind has it', async () => {
  const kernel = await createApp({}).loadViewpointKernel();
  const component = (reference, extra) => Object.assign({ reference, parent: false, kind: 'component', name: 'Cache' }, extra);
  const system = (reference) => ({ reference, parent: true });
  const pairs = (answer) => plain(answer.candidates.map((c) => [c.from, c.to, c.reasons.join('+')]));
  // `Cache` is on two removed and two new components: four pairs for two answers, so none; the one Broker is alone on each side
  let answer = kernel.compare({
    base: { application: [system('a'), component('a.cache'), system('b'), component('b.cache'), component('a.broker', { name: 'Broker' })] },
    target: { application: [system('a2'), component('a2.cache'), system('b2'), component('b2.cache'), component('a2.broker', { name: 'Broker' })] },
    on_one_chain: true
  });
  assert.equal(answer.error, undefined);
  assert.deepEqual(pairs(answer), [['a.broker', 'a2.broker', 'name']], 'no pair for Cache, one for the Broker, whose name is the only one of its kind on each side');
  // once the author has said what one of the two Cache is, the other is alone on each side and its name tells again
  answer = kernel.compare({
    base: { application: [system('a'), component('a.cache'), system('b'), component('b.cache')] },
    target: { application: [system('a2'), component('a2.cache', { replaces: ['a.cache'] }), system('b2'), component('b2.cache')] },
    on_one_chain: true
  });
  assert.deepEqual(pairs(answer), [['b.cache', 'b2.cache', 'name']]);
});
