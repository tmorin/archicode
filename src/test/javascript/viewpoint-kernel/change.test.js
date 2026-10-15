'use strict';
// The views of a comparison (run 0037), through the WebAssembly the editor embeds: `compare` gives the union of two plateaus,
// `compute` draws it, and every item and link of the view says what changed. The rules are proven by `cargo test`
// (change_tests.rs); this proves that the module the editor carries does it, on the elements the editor builds from the
// fixture, that a view with no change in its input is what it always was, and that the computed state wins over the
// stereotypes the author wrote in the editor's own styles.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const REPO = path.resolve(__dirname, '../../../..');
const HTML = path.join(REPO, 'src/main/resources/editor-webapp/standalone.html');

/** The module of standalone.html, instantiated as the page does, with `compare` in addition to `compute`. */
async function loadEmbeddedKernel() {
  const html = fs.readFileSync(HTML, 'utf8');
  const block = html.match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/);
  assert.ok(block, 'the kernel is embedded in standalone.html');
  const { instance } = await WebAssembly.instantiate(Buffer.from(block[1].trim(), 'base64'), {});
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
  return { rawCompute: (input) => call('compute', input), compute: (input) => JSON.parse(call('compute', input)), compare: (input) => JSON.parse(call('compare', input)) };
}

const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));

/** What a caller does with the answer of `compare` to draw it: the elements of a layer, each with the relationships it declares. */
function unionElements(union, layer) {
  return union.elements
    .filter((e) => e.layer === layer)
    .map((e) => Object.assign({}, e, { relationships: union.relationships.filter((r) => r.layer === layer && r.from === e.reference) }));
}

/** The application layer of the fixture, as the editor sends it to the kernel, with the properties a comparison reads. */
function fixtureLayer(sandbox, state, layer) {
  return plain(sandbox.toKernelElements(state.index[layer], true).elements);
}

/** The target plateau: the fixture with a container removed, one added, one renamed. */
function changedApplication(base) {
  const target = JSON.parse(JSON.stringify(base));
  const find = (ref) => target.find((e) => e.reference === ref);
  // removed: the session store, and the one relationship that reached it
  target.splice(target.indexOf(find('shop.web.session')), 1);
  find('shop.web.api').relationships = find('shop.web.api').relationships.filter((r) => r.destination !== 'shop.web.session');
  // new: a cache next to the catalog's database, which it reads
  target.push({ reference: 'shop.catalog.cache', parent: true, kind: 'container', name: 'Cache', description: null, qualifiers: ['Redis'], tags: {}, applications: [], uses: [], relationships: [{ destination: 'shop.catalog.db', label: 'reads', qualifiers: [], tags: {} }] });
  // changed: a name
  find('shop.payments').name = 'Payments, renamed';
  return target;
}

async function pair() {
  const { sandbox, state } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  const base = fixtureLayer(sandbox, state, 'application');
  const technology = fixtureLayer(sandbox, state, 'technology');
  const union = kernel.compare({ base: { application: base, technology }, target: { application: changedApplication(base), technology } });
  assert.equal(union.error, undefined);
  return { sandbox, state, kernel, base, technology, union };
}

test('a view of the fixture whose input says nothing of change carries none of the new fields, and only_changes: false is the same bytes', async () => {
  const { sandbox, state } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  let views = 0;
  for (const layer of ['application', 'technology']) {
    for (const ref of state.index[layer].keys()) {
      for (const viewpoint of ['overview', 'detailed', 'deep']) {
        if (viewpoint === 'detailed' && /^(customer|shop\.web\.session)$/.test(ref)) continue;
        const input = sandbox.buildKernelInput(viewpoint, ref, { layer }).input;
        const plainCall = kernel.rawCompute(input);
        if (JSON.parse(plainCall).error) continue; // a detailed view of an element that is not a parent
        views++;
        assert.doesNotMatch(plainCall, /"change"|"context"|"natures"|contains-changes/, viewpoint + ' ' + ref);
        assert.match(plainCall, /^\{"version":4,/);
        assert.equal(kernel.rawCompute(Object.assign({}, plain(input), { only_changes: false })), plainCall, viewpoint + ' ' + ref + ' with only_changes: false');
        assert.equal(kernel.rawCompute(Object.assign({}, plain(input), { only_changes: null })), plainCall, 'null is not given');
      }
    }
  }
  assert.ok(views >= 40, 'only ' + views + ' views were compared');
});

test('the union that compare gives is drawn by compute: every item and link says what changed, a removed element is there under its parent', async () => {
  const { kernel, union } = await pair();
  assert.deepEqual(union.counts.elements, { new: 1, changed: 2, removed: 1, wording_only: 0 }, JSON.stringify(union.counts));
  const out = kernel.compute({ viewpoint: 'deep', layer: 'application', focal: 'shop', default_synthetic_label: 'uses', elements: unionElements(union, 'application') });
  assert.equal(out.error, undefined);
  assert.equal(out.version, 4);
  const item = (id) => out.items.find((i) => i.id === id);
  assert.deepEqual(['shop.web.session', 'shop.catalog.cache', 'shop.web.api', 'shop.payments'].map((id) => item(id).change), ['removed', 'new', 'changed', 'changed']);
  assert.equal(item('shop.web.session').parent, 'shop.web', 'the removed container is still under its parent');
  assert.equal(item('shop.web.frontend').change, 'none');
  assert.equal(out.items.every((i) => typeof i.change === 'string'), true, 'in a comparison every item says');
  const link = (from, to) => out.links.find((l) => l.from === from && l.to === to);
  assert.equal(link('shop.web.api', 'shop.web.session').change, 'removed', 'the relationship only the base had is drawn');
  assert.equal(link('shop.catalog.cache', 'shop.catalog.db').change, 'new');
  assert.equal(link('shop.web.frontend', 'shop.web.api').change, 'none');
  assert.ok(item('shop.web.api').natures.includes('relationships-removed'));
  // the containers whose only changes are below them are not changed: they carry the marker
  for (const id of ['shop', 'shop.catalog', 'shop.web']) {
    assert.equal(item(id).change, 'none', id);
    assert.deepEqual(item(id).stereotypes.slice(-1), ['contains-changes'], id);
  }
  assert.deepEqual(item('shop.payments').stereotypes, ['external', 'changed'], 'the hand-written word is not repeated');
  assert.deepEqual(item('shop.web.session').stereotypes, ['Redis', 'removed']);
});

test('a link that groups relationships adds up what they did, and the folded view of a pair is the same bytes twice', async () => {
  const { kernel, union } = await pair();
  const input = { viewpoint: 'deep', layer: 'application', focal: 'shop.web', default_synthetic_label: 'uses', elements: unionElements(union, 'application'), collapsed: ['shop.web.api', 'shop.web.edge'] };
  const out = kernel.compute(input);
  assert.equal(out.error, undefined);
  const grouped = out.links.filter((l) => l.synthetic);
  assert.ok(grouped.length > 0);
  const sessionLink = out.links.find((l) => l.relationships.some((r) => r.destination === 'shop.web.session'));
  assert.ok(sessionLink, 'the removed relationship is in a link');
  assert.equal(sessionLink.change, sessionLink.relationships.every((r) => r.change === 'removed') ? 'removed' : 'changed');
  for (const l of out.links) {
    const changes = new Set(l.relationships.map((r) => r.change || 'none'));
    const expected = changes.size === 1 && changes.has('new') ? 'new' : changes.size === 1 && changes.has('removed') ? 'removed' : changes.size === 1 && changes.has('none') ? 'none' : 'changed';
    assert.equal(l.change, expected, l.from + ' -> ' + l.to + ' ' + Array.from(changes));
  }
  assert.equal(kernel.rawCompute(input), kernel.rawCompute(JSON.parse(JSON.stringify(input))), 'twice');
  const reversed = Object.assign({}, input, { elements: input.elements.slice().reverse().map((e) => Object.assign({}, e, { relationships: e.relationships.slice().reverse() })) });
  assert.equal(kernel.rawCompute(reversed), kernel.rawCompute(input), 'whatever the order of the elements');
});

test('only_changes keeps the changes, the ends of changed links and what encloses them, and says which items are only context', async () => {
  const { kernel, union } = await pair();
  const out = kernel.compute({ viewpoint: 'deep', layer: 'application', focal: 'shop', default_synthetic_label: 'uses', elements: unionElements(union, 'application'), only_changes: true });
  assert.equal(out.error, undefined);
  const ids = out.items.map((i) => i.id);
  for (const id of ['shop.web.session', 'shop.catalog.cache', 'shop.web.api', 'shop.payments']) assert.ok(ids.includes(id), id + ' changed');
  const context = (id) => out.items.find((i) => i.id === id).context === true;
  for (const id of ['shop', 'shop.web', 'shop.catalog', 'shop.catalog.db']) assert.equal(context(id), true, id + ' is context');
  for (const id of ['shop.web.session', 'shop.catalog.cache', 'shop.web.api', 'shop.payments']) assert.equal(context(id), false, id + ' is a change');
  assert.ok(!ids.includes('shop.web.frontend'), 'an unchanged box that no changed link reaches is left out');
  assert.ok(out.links.length > 0 && out.links.every((l) => l.change !== 'none'), 'every link that stays changed');
});

test('a facet reads change like any field, through the JSONPath the kernel already evaluates', async () => {
  const { kernel, union } = await pair();
  const facet = (jsonPath) => ({ name: 'f', actions: [{ operator: 'REMOVE', json_path: jsonPath }] });
  const elements = unionElements(union, 'application');
  const draw = (extra) => kernel.compute(Object.assign({ viewpoint: 'deep', layer: 'application', focal: 'shop', default_synthetic_label: 'uses', elements }, extra));
  const all = draw({});
  const without = draw({ facet: facet("$..relationships[?(@.change=='removed')]") });
  assert.equal(without.error, undefined);
  assert.ok(all.links.some((l) => l.change === 'removed'));
  assert.ok(without.links.every((l) => l.change !== 'removed'), 'the removed relationships are gone');
  assert.equal(without.links.length, all.links.filter((l) => l.change !== 'removed').length);
  const onlyNew = draw({ only_changes: true, facet: facet("$..relationships[?(@.change!='new')]") });
  assert.equal(onlyNew.error, undefined);
  assert.deepEqual(onlyNew.links.map((l) => l.change), ['new'], 'the facet runs first, only_changes keeps what is left');
});

test('hide_unlinked and only_changes work together on the technology layer', async () => {
  const { sandbox, state } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  // a pair in which the deployment of one application moved to another node
  const application = fixtureLayer(sandbox, state, 'application');
  const technology = fixtureLayer(sandbox, state, 'technology');
  const moved = JSON.parse(JSON.stringify(technology));
  moved.find((e) => e.reference === 'prod.cluster.data.pg').applications = [];
  moved.find((e) => e.reference === 'prod.cluster.data.svc').applications = ['shop.catalog.service', 'shop.catalog.db'];
  const union = kernel.compare({ base: { application, technology }, target: { application, technology: moved } });
  assert.equal(union.error, undefined);
  assert.deepEqual(union.counts.elements, { new: 0, changed: 2, removed: 0, wording_only: 0 });
  const input = { viewpoint: 'deep', layer: 'technology', focal: 'prod', default_synthetic_label: 'uses', elements: unionElements(union, 'technology'), app_elements: unionElements(union, 'application') };
  const full = kernel.compute(input);
  const changes = kernel.compute(Object.assign({}, input, { only_changes: true }));
  const flow = kernel.compute(Object.assign({}, input, { only_changes: true, hide_unlinked: true }));
  assert.equal(full.error || changes.error || flow.error, undefined);
  assert.ok(changes.items.length < full.items.length);
  assert.ok(flow.items.length <= changes.items.length);
  for (const out of [changes, flow]) {
    assert.ok(out.items.find((i) => i.id === 'prod'), 'the focal item stays');
    assert.ok(out.items.some((i) => i.id === 'prod.cluster.data.svc' && i.change === 'changed' && i.context !== true));
  }
});

test('the computed state wins over the stereotypes the author wrote, in the editor\'s own look', async () => {
  const { sandbox, state } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  state.workspace.styles = {
    'by-tags': {
      external: { 'background-color': 'lightgray' },
      new: { 'background-color': '#DAF2E6', 'line-color': '#2A6A4B' },
      changed: { 'background-color': '#FAECDD', 'line-color': '#A2501C' },
      removed: { 'background-color': '#F3DCDC' },
      'contains-changes': { 'line-color': '#444444', 'line-style': 2 }
    }
  };
  const el = (reference, extra = {}) => Object.assign({ reference, parent: false, relationships: [] }, extra);
  const union = kernel.compare({
    base: { application: [el('a'), el('c', { tags: { 'rendering-stereotypes': 'external' } }), el('d', { tags: { 'rendering-stereotypes': 'external' } })] },
    target: { application: [el('a'), el('b', { tags: { 'rendering-stereotypes': 'changed external' } }), el('c', { tags: { 'rendering-stereotypes': 'new external' }, name: 'C' }), el('grp', { parent: true }), el('grp.x')] }
  });
  const out = kernel.compute({ viewpoint: 'map', layer: 'application', focal: '', default_synthetic_label: 'uses', elements: unionElements(union, 'application'), opened: ['grp'] });
  const stereotypes = (id) => plain(out.items.find((i) => i.id === id).stereotypes);
  const look = (id) => plain(sandbox.stereotypeLookOf(stereotypes(id)));
  // new, with a hand-written `changed`: the list ends with `new`, so `new` has the last word on the fill
  assert.deepEqual(stereotypes('b'), ['changed', 'external', 'new']);
  assert.equal(look('b').vars['--st-fill'], '#daf2e6', 'the fill of `new`');
  assert.equal(look('b').vars['--st-stroke'], '#2a6a4b');
  // changed, with a hand-written `new` before it: `changed` is last, so it wins
  assert.deepEqual(stereotypes('c'), ['new', 'external', 'changed'], 'the author\'s `new` stays where it is; the computed state is last');
  assert.equal(look('c').vars['--st-fill'], '#faecdd', 'the fill of `changed`, though `new` and `external` come before it');
  assert.equal(look('c').vars['--st-stroke'], '#a2501c');
  assert.deepEqual(stereotypes('d'), ['external', 'removed']);
  assert.equal(look('d').vars['--st-fill'], '#f3dcdc');
  // the marker is a stereotype of its own, with its own look, and the container is not `changed`
  assert.deepEqual(stereotypes('grp'), ['new']);
  assert.deepEqual(stereotypes('a'), []);
});

test('the marker of a container that did not change is a style of its own, which tells it from changed without colour', async () => {
  const { sandbox, state } = await openFixture();
  const { kernel, union } = await pair();
  state.workspace.styles = { 'by-tags': { changed: { 'background-color': '#FAECDD' }, 'contains-changes': { 'line-style': 2 } } };
  const out = kernel.compute({ viewpoint: 'deep', layer: 'application', focal: 'shop', default_synthetic_label: 'uses', elements: unionElements(union, 'application') });
  const marked = plain(sandbox.stereotypeLookOf(out.items.find((i) => i.id === 'shop.web').stereotypes));
  const changed = plain(sandbox.stereotypeLookOf(out.items.find((i) => i.id === 'shop.web.api').stereotypes));
  assert.deepEqual(marked.styled, ['contains-changes']);
  assert.deepEqual(changed.styled, ['changed']);
  assert.notDeepEqual(marked.vars, changed.vars);
});

test('the contract version the editor expects is the one the kernel speaks, for compute and for compare', async () => {
  const { sandbox } = await openFixture();
  const kernel = await loadEmbeddedKernel();
  const expected = vm.runInContext('KERNEL_CONTRACT_VERSION', sandbox);
  assert.equal(expected, 4);
  assert.equal(kernel.compare({ base: { application: [] }, target: { application: [] } }).version, expected);
  assert.equal(kernel.compute({ viewpoint: 'map', layer: 'application', elements: [] }).version, expected);
});
