'use strict';
// `compare`, the third entry point of the viewpoint kernel, called through the WebAssembly the editor embeds (and the CLI
// translates): what changes between two plateaus. The rules are proven by `cargo test` on invented pairs; this proves that
// the module the editor carries has the entry point, speaks JSON through the same memory protocol as `compute`, answers the
// same bytes whatever the order of the lists, and reads the elements the editor builds (`toKernelElements`) from the fixture.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const REPO = path.resolve(__dirname, '../../../..');
const HTML = path.join(REPO, 'src/main/resources/editor-webapp/standalone.html');
const WASM = path.join(REPO, 'src/main/wasm/viewpoint_kernel.wasm');

/** The module of standalone.html, instantiated as the page does, with `compare` in addition to `compute`. */
async function loadEmbeddedKernel() {
  const html = fs.readFileSync(HTML, 'utf8');
  const block = html.match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/);
  assert.ok(block, 'the kernel is embedded in standalone.html');
  const bytes = Buffer.from(block[1].trim(), 'base64');
  const { instance } = await WebAssembly.instantiate(bytes, {});
  const x = instance.exports;
  const call = (name, input) => {
    const data = Buffer.from(typeof input === 'string' ? input : JSON.stringify(input), 'utf8');
    const ptr = x.alloc(data.length);
    new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
    const length = x[name](ptr, data.length);
    const text = Buffer.from(new Uint8Array(x.memory.buffer, x.result_ptr(), length)).toString('utf8');
    x.dealloc(ptr, data.length);
    return text;
  };
  return { bytes, exports: x, raw: (input) => call('compare', input), compare: (input) => JSON.parse(call('compare', input)), compute: (input) => JSON.parse(call('compute', input)) };
}

const el = (reference, extra = {}) => Object.assign({ reference, parent: !reference.includes('.') }, extra);
const rel = (destination, label, extra = {}) => Object.assign({ destination, label }, extra);
const plateau = (application = [], technology = []) => ({ application, technology });

test('the module the editor embeds is the one the CLI loads, and it exports compare next to compute', async () => {
  const kernel = await loadEmbeddedKernel();
  assert.ok(Buffer.compare(kernel.bytes, fs.readFileSync(WASM)) === 0, 'the same bytes in standalone.html and in src/main/wasm');
  for (const name of ['alloc', 'dealloc', 'compute', 'apply_facet', 'compare', 'result_ptr', 'memory']) assert.ok(name in kernel.exports, name + ' is exported');
});

test('compare lists the new, changed and removed things of two small plateaus, and says why', async () => {
  const kernel = await loadEmbeddedKernel();
  const base = plateau(
    [el('shop', { name: 'Shop', description: 'sells' }), el('shop.web', { relationships: [rel('shop.api', 'calls')] }), el('shop.api'), el('legacy'), el('legacy.batch')],
    [el('env', { applications: ['shop.web'] })]
  );
  const target = plateau(
    [el('shop', { name: 'Shop', description: 'sells things' }), el('shop.web', { relationships: [rel('shop.api', 'calls'), rel('shop.cache', 'reads')] }), el('shop.api', { tags: { 'rendering-stereotypes': 'external' } }), el('shop.cache')],
    [el('env', { applications: ['shop.web', 'shop.api'] })]
  );
  const out = kernel.compare({ base, target });
  assert.equal(out.error, undefined);
  assert.deepEqual(out.counts, { elements: { new: 1, changed: 3, removed: 2, wording_only: 1 }, relationships: { new: 1, changed: 0, removed: 0 } });
  const changes = new Map(out.changes.map((r) => [r.thing + ':' + r.reference, r]));
  assert.deepEqual(Array.from(changes.keys()), ['element:legacy', 'element:legacy.batch', 'element:shop', 'element:shop.cache', 'element:shop.web', 'element:env', 'relationship:shop.web'], 'by layer, then reference; the elements, then the relationships');
  assert.deepEqual(changes.get('element:env').natures, ['deployment']);
  assert.equal(changes.get('element:shop').wording_only, true, 'a description alone is wording');
  assert.deepEqual(changes.get('element:shop').before, { description: 'sells' });
  assert.deepEqual(changes.get('element:shop.web').natures, ['relationships-added']);
  assert.equal(out.elements.find((e) => e.reference === 'shop.api').change, 'none', 'a rendering tag is no change');
  const batch = out.elements.find((e) => e.reference === 'legacy.batch');
  assert.deepEqual([batch.change, batch.parent_reference], ['removed', 'legacy'], 'a removed child keeps its parent');
});

test('compare answers the same bytes for the same input, whatever the order of its lists', async () => {
  const kernel = await loadEmbeddedKernel();
  const input = {
    base: plateau([el('a', { relationships: [rel('b', 'x'), rel('c', 'y')] }), el('b'), el('c'), el('gone')], [el('env', { applications: ['a', 'b'], uses: ['env.n', 'env.m'] }), el('env.n'), el('env.m')]),
    target: plateau([el('a', { name: 'A', relationships: [rel('c', 'y'), rel('b', 'z')] }), el('c'), el('b'), el('fresh')], [el('env', { applications: ['b', 'a'], uses: ['env.m'] }), el('env.m'), el('env.n')])
  };
  const reverse = (side) => ({ application: side.application.slice().reverse().map((e) => (e.relationships ? Object.assign({}, e, { relationships: e.relationships.slice().reverse() }) : e)), technology: side.technology.slice().reverse() });
  const first = kernel.raw(input);
  assert.equal(first, kernel.raw(input), 'twice');
  assert.equal(first, kernel.raw({ target: reverse(input.target), base: reverse(input.base) }), 'reordered');
  assert.ok(!JSON.parse(first).error);
});

test('compare reads the elements the editor builds from the fixture: a plateau against itself is empty, against a changed copy it is not', async () => {
  const { sandbox } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  const side = () => {
    const state = sandbox.__state();
    // plain objects of this realm, as the editor sends them
    return JSON.parse(JSON.stringify({ application: sandbox.toKernelElements(state.index.application, true).elements, technology: sandbox.toKernelElements(state.index.technology, true).elements }));
  };
  const base = side();
  assert.ok(base.application.length >= 15 && base.technology.length >= 8);
  const same = kernel.compare({ base, target: side() });
  assert.equal(same.error, undefined);
  assert.deepEqual(same.changes, []);
  assert.deepEqual(same.counts, { elements: { new: 0, changed: 0, removed: 0, wording_only: 0 }, relationships: { new: 0, changed: 0, removed: 0 } });
  assert.equal(same.elements.length, base.application.length + base.technology.length);

  const target = side();
  const renamed = target.application.find((e) => e.name && !e.reference.includes('.'));
  renamed.name += ' (renamed)';
  const described = target.application.find((e) => e !== renamed && e.description);
  described.description += ' More words.';
  const withRels = target.application.find((e) => e !== renamed && e !== described && e.relationships.length);
  const dropped = withRels.relationships.pop();
  const out = kernel.compare({ base, target });
  assert.equal(out.error, undefined);
  assert.equal(out.counts.elements.changed, 3, JSON.stringify(out.changes));
  assert.equal(out.counts.elements.wording_only, 1);
  assert.equal(out.counts.relationships.removed, 1);
  const removed = out.relationships.find((r) => r.change === 'removed');
  assert.deepEqual([removed.from, removed.destination], [withRels.reference, dropped.destination]);
  assert.ok(out.changes.some((r) => r.reference === renamed.reference && r.natures.includes('name')));
});

test('compare reports its errors the way compute does: an object with an error, never a trap', async () => {
  const kernel = await loadEmbeddedKernel();
  assert.match(kernel.compare({ base: plateau([el('a', { relationships: [rel('nowhere', 'x')] })]), target: plateau() }).error, /^dangling reference: nowhere/);
  assert.match(kernel.compare({ base: plateau([el('a'), el('a')]), target: plateau() }).error, /^duplicate reference: a/);
  assert.match(JSON.parse(kernel.raw('not json')).error, /^invalid input/);
  assert.match(kernel.compare({ base: plateau() }).error, /^invalid input/);
});

test('adding compare changed neither the answer of compute nor the contract version the editor expects', async () => {
  const { sandbox } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  const expected = vm.runInContext('KERNEL_CONTRACT_VERSION', sandbox);
  const out = kernel.compute(sandbox.buildKernelInput('map', '', { layer: 'application' }).input);
  assert.equal(out.error, undefined);
  assert.equal(out.version, expected);
  assert.equal(kernel.compare({ base: plateau(), target: plateau() }).version, expected);
});

test('replaces: moved, split and merged elements through the embedded module, the same bytes whatever the order, and compute takes the union back', async () => {
  const kernel = await loadEmbeddedKernel();
  const base = plateau([el('a'), el('a.svc', { name: 'Billing' }), el('b'), el('s'), el('m1'), el('m2')]);
  const target = plateau([
    el('a'),
    el('b'),
    el('b.svc', { name: 'Billing', replaces: ['a.svc'] }),
    el('t1', { replaces: ['s'] }),
    el('t2', { replaces: ['s', 'nowhere'] }),
    el('m', { replaces: ['m2', 'm1'] })
  ]);
  const raw = kernel.raw({ base, target });
  const out = JSON.parse(raw);
  assert.equal(out.error, undefined);
  assert.equal(out.version, 4);
  const change = Object.fromEntries(out.elements.map((e) => [e.reference, e.change]));
  assert.deepEqual(change, { a: 'none', b: 'none', 'b.svc': 'moved', m: 'merged', t1: 'split', t2: 'split' });
  assert.deepEqual(out.counts.elements, { new: 0, changed: 0, removed: 0, wording_only: 0, moved: 1, split: 2, merged: 1 });
  assert.equal(out.warnings.length, 1);
  assert.equal(raw, kernel.raw({ base: plateau([...base.application].reverse()), target: plateau([...target.application].reverse()) }), 'the order of the lists never shows');
  // the union is drawn like any other: the state ends the stereotypes
  const view = kernel.compute({ viewpoint: 'map', focal: '', elements: out.elements.map((e) => Object.assign({}, e, { relationships: [] })), opened: ['a', 'b'] });
  assert.equal(view.error, undefined);
  assert.deepEqual(view.items.find((i) => i.reference === 'b.svc').stereotypes, ['moved']);
});
