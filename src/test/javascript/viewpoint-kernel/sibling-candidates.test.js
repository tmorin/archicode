'use strict';
// Candidates between sibling plateaus, and the state words said once (wave 014, run 0086, W-12; kernel contract 5; issues #70 and #34).
//
//   #70: `compare` takes `on_one_chain`, whether one of the two plateaus is the past of the other. The host knows it from the tree of plateaus; the editor says it
//        (`plateausOnOneChain`). Between siblings the only two elements of a kind under one parent are two alternatives, so the reason `parent` is not given and a pair that
//        has no other reason is not listed. The layered Brightcart has the case: `commerce-live` and `tax-live` (and the two sandbox nodes) under `inhouse` against `saas`.
//   #34: the seven state words are the kernel's (`states`); the page keeps no list of its own (it fills its arrays from the kernel), and an item says `contains_changes`
//        when the kernel computed the state, so that the word written by hand on a box that holds nothing is not read as the state.
//
// The kernel is the real embedded module; the Rust tests (`cargo test`) prove the rules, these prove that the editor and the module agree and that the page reads the kernel.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const HTML = path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html');
const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

async function loadEmbeddedKernel() {
  const block = fs.readFileSync(HTML, 'utf8').match(/<script type="application\/octet-stream" id="viewpoint-kernel-wasm">([^<]+)<\/script>/);
  const { instance } = await WebAssembly.instantiate(Buffer.from(block[1].trim(), 'base64'), {});
  const x = instance.exports;
  return (name, input) => {
    const data = Buffer.isBuffer(input) ? input : Buffer.from(typeof input === 'string' ? input : JSON.stringify(input), 'utf8');
    const ptr = x.alloc(data.length);
    new Uint8Array(x.memory.buffer, ptr, data.length).set(data);
    const length = x[name](ptr, data.length);
    const text = Buffer.from(new Uint8Array(x.memory.buffer, x.result_ptr(), length)).toString('utf8');
    x.dealloc(ptr, data.length);
    return JSON.parse(text);
  };
}

async function openLayered() {
  const sandbox = createApp({});
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state };
}

const node = (reference, name) => ({ reference, parent: false, kind: 'node', name, description: name });
const side = (...elements) => ({ application: [], technology: [{ reference: 'partners', parent: true }].concat(elements) });
const pairs = (answer) => answer.candidates.map((c) => [c.from, c.to, c.reasons.join('+')]);

// ---- the module ----

test('the kernel asks whether the plateaus are on one chain and takes no default: an input without it is refused with one sentence', async () => {
  const call = await loadEmbeddedKernel();
  const base = side(node('partners.commerce-live', 'Commerce platform'));
  const target = side(node('partners.tax-live', 'Tax service'));
  for (const input of [{ base, target }, { base, target, on_one_chain: null }]) {
    const answer = call('compare', input);
    assert.match(answer.error, /^invalid input: `on_one_chain` is missing: say whether one of the two plateaus is the past of the other/);
    assert.deepEqual(Object.keys(answer), ['error'], 'no partial answer');
  }
  for (const wrong of ['yes', 1, [true], {}]) {
    const answer = call('compare', { base, target, on_one_chain: wrong });
    assert.match(answer.error, /^invalid input.*boolean/, JSON.stringify(wrong));
  }
});

test('on a chain two nodes alone under a parent are a candidate for the parent; between siblings they are not, and the table and the counts do not move', async () => {
  const call = await loadEmbeddedKernel();
  const base = side(node('partners.commerce-live', 'Commerce platform'));
  const target = side(node('partners.tax-live', 'Tax service'));
  const chain = call('compare', { base, target, on_one_chain: true });
  const siblings = call('compare', { base, target, on_one_chain: false });
  assert.deepEqual(pairs(chain), [['partners.commerce-live', 'partners.tax-live', 'parent']]);
  assert.deepEqual(pairs(siblings), []);
  assert.deepEqual(plain(siblings.counts), plain(chain.counts));
  assert.deepEqual(plain(siblings.changes), plain(chain.changes));
  assert.deepEqual(plain(siblings.elements), plain(chain.elements));
  assert.equal(chain.version, 5);
});

test('between siblings a pair keeps the reasons that are not the parent', async () => {
  const call = await loadEmbeddedKernel();
  const container = (reference, name, description) => ({ reference, parent: false, kind: 'container', name, description });
  const input = (onOneChain) => ({
    base: { application: [{ reference: 'p', parent: true }, container('p.a', 'Billing')] },
    target: { application: [{ reference: 'p', parent: true }, container('p.b', 'Billing')] },
    on_one_chain: onOneChain
  });
  assert.deepEqual(pairs(call('compare', input(true))), [['p.a', 'p.b', 'name+parent']]);
  assert.deepEqual(pairs(call('compare', input(false))), [['p.a', 'p.b', 'name']]);
});

// ---- the editor says it from the tree ----

test('the editor tells the kernel that a plateau and one it builds on are a chain and that two plateaus that build on the same one are not', async () => {
  const { sandbox } = await openLayered();
  const onOneChain = (a, b) => run(sandbox, 'plateausOnOneChain(' + JSON.stringify(a) + ', ' + JSON.stringify(b) + ')');
  for (const [a, b] of [['baseline', 'saas'], ['saas', 'baseline'], ['inhouse', 'marketplace'], ['marketplace', 'baseline'], ['baseline', 'marketplace'], ['saas', 'saas']]) {
    assert.equal(onOneChain(a, b), true, a + ' / ' + b);
  }
  for (const [a, b] of [['inhouse', 'saas'], ['saas', 'inhouse'], ['marketplace', 'saas'], ['saas', 'marketplace']]) {
    assert.equal(onOneChain(a, b), false, a + ' / ' + b);
  }
  // a plateau that does not exist is a mistake of the caller, told as `PlateauTree.onOneChain` does, not an answer
  assert.throws(() => onOneChain('saas', 'nowhere'), /There is no plateau “nowhere”/);
});

/** What `compare` is sent, for the plateau drawn and the one it is compared with. */
async function sentWhenComparing(drawn, other) {
  const { sandbox, state } = await openLayered();
  const kernel = run(sandbox, 'loadedKernel');
  const sent = [];
  const compare = kernel.compare;
  kernel.compare = (input) => { sent.push(input.on_one_chain); return compare.call(kernel, input); };
  sandbox.drawPlateau(drawn);
  sandbox.compareWithPlateau(other);
  const comparison = sandbox.comparisonState();
  assert.equal(comparison.problems, undefined, JSON.stringify(comparison.problems));
  return { sandbox, state, comparison, sent };
}

test('inhouse against saas, two alternatives on the Brightcart, lists neither pair of nodes that only share a parent, in the page and in the Changes panel', async () => {
  const { sandbox, comparison, sent } = await sentWhenComparing('inhouse', 'saas');
  assert.deepEqual(sent, [false]);
  assert.deepEqual(plain(comparison.candidates), [], 'neither commerce-live/tax-live nor commerce-sandbox/tax-sandbox');
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(comparison), /changes-candidates/);
});

test('saas against baseline, its past, still proposes them, and the swap pair is the one the document says (N15)', async () => {
  const { state, sandbox } = await openLayered();
  const kernel = run(sandbox, 'loadedKernel');
  const sent = [];
  const compare = kernel.compare;
  kernel.compare = (input) => { sent.push(input.on_one_chain); return compare.call(kernel, input); };
  sandbox.drawPlateau('saas');
  sandbox.toggleCompareWithPast();
  assert.equal(state.layers.compare.other, 'baseline');
  const comparison = sandbox.comparisonState();
  assert.deepEqual(sent, [true]);
  const found = plain(comparison.candidates).map((c) => [c.layer, c.from, c.to, c.reasons.join('+')]);
  assert.deepEqual(found, [
    ['technology', 'partners.tax-live', 'partners.commerce-live', 'parent'],
    ['technology', 'sandbox.tax-sandbox', 'sandbox.commerce-sandbox', 'parent']
  ]);
  assert.match(sandbox.renderChangesPanelHtml(comparison), /changes-candidates/);
});

test('the pair is the same however the two siblings are chosen, and a comparison with the future of the plateau drawn is a chain', async () => {
  const around = await sentWhenComparing('saas', 'inhouse');
  assert.deepEqual(around.sent, [false]);
  assert.deepEqual(plain(around.comparison.candidates), []);
  // inhouse drawn, compared with marketplace that builds on it: one is the future of the other
  const { sandbox, state } = await openLayered();
  const kernel = run(sandbox, 'loadedKernel');
  const sent = [];
  const compare = kernel.compare;
  kernel.compare = (input) => { sent.push(input.on_one_chain); return compare.call(kernel, input); };
  sandbox.drawPlateau('inhouse');
  sandbox.toggleCompareWithFuture();
  assert.equal(state.layers.compare.other, 'marketplace');
  assert.equal(sandbox.comparisonState().problems, undefined);
  assert.deepEqual(sent, [true]);
});

test('the counts of the band are those of a plateau and the one it overrides: a chain', async () => {
  const { sandbox } = await openLayered();
  const kernel = run(sandbox, 'loadedKernel');
  const sent = [];
  const compare = kernel.compare;
  kernel.compare = (input) => { sent.push(input.on_one_chain); return compare.call(kernel, input); };
  for (const id of ['saas', 'inhouse', 'marketplace']) assert.ok(sandbox.layerNodeCounts(id), id);
  assert.deepEqual(sent, [true, true, true]);
});

// ---- the state words, said once ----

test('the kernel says the seven state words once, in a fixed order, and ignores what it is sent', async () => {
  const call = await loadEmbeddedKernel();
  const said = call('states', {});
  assert.deepEqual(plain(said), {
    version: 5,
    relationship: ['new', 'changed', 'removed'],
    identity: ['moved', 'split', 'merged'],
    container: 'contains-changes',
    states: ['new', 'changed', 'removed', 'moved', 'split', 'merged', 'contains-changes']
  });
  for (const input of ['', 'null', 'nonsense', '{"relationship":[]}', Buffer.from([0xff, 0xfe])]) assert.deepEqual(plain(call('states', input)), plain(said), JSON.stringify(input));
});

test('the page keeps no list of the state words: its four arrays are filled from the kernel when it loads, and each word has a glyph, words and a look', async () => {
  const sandbox = createApp({});
  const names = ['RELATIONSHIP_STATES', 'IDENTITY_STATES', 'CHANGE_STATES', 'STATE_WORDS'];
  for (const name of names) assert.deepEqual(plain(run(sandbox, name)), [], name + ' is empty until the kernel is loaded');
  await sandbox.loadViewpointKernel();
  const said = (await loadEmbeddedKernel())('states', {});
  assert.deepEqual(plain(run(sandbox, 'RELATIONSHIP_STATES')), said.relationship);
  assert.deepEqual(plain(run(sandbox, 'IDENTITY_STATES')), said.identity);
  assert.deepEqual(plain(run(sandbox, 'CHANGE_STATES')), said.relationship.concat(said.identity));
  assert.deepEqual(plain(run(sandbox, 'STATE_WORDS')), said.states);
  // the look of each word is the page's own, and every word of the kernel has one
  for (const word of said.states) {
    for (const table of ['CHANGE_GLYPHS', 'CHANGE_WORDS', 'CHANGE_DEFAULT_LOOK']) assert.ok(run(sandbox, table)[word], word + ' has an entry in ' + table);
  }
  assert.equal(said.container, 'contains-changes');
  // loading it again does not duplicate a word
  await sandbox.loadViewpointKernel();
  assert.deepEqual(plain(run(sandbox, 'STATE_WORDS')), said.states);
  // and the source of the page does not write the lists again
  const source = fs.readFileSync(HTML, 'utf8');
  assert.doesNotMatch(source, /=\s*\[\s*'new',\s*'changed',\s*'removed'\s*\]/);
  assert.doesNotMatch(source, /=\s*\[\s*'moved',\s*'split',\s*'merged'\s*\]/);
  assert.doesNotMatch(source, /\['new',\s*'changed',\s*'removed'\]\.concat/);
});

test('an item says it holds a change when the kernel computed it; the word written by hand on a box that holds nothing is not the state', async () => {
  const call = await loadEmbeddedKernel();
  const elements = [
    { reference: 'box', parent: true, change: 'none', qualifiers: ['contains-changes'], relationships: [] },
    { reference: 'sys', parent: true, change: 'none', relationships: [] },
    { reference: 'sys.fresh', parent: false, change: 'new', relationships: [] },
    { reference: 'sys.leaf', parent: false, change: 'none', tags: { 'rendering-stereotypes': 'contains-changes' }, relationships: [] }
  ];
  const view = call('compute', { viewpoint: 'map', layer: 'application', focal: '', elements, opened: ['sys'] });
  const item = (id) => view.items.find((i) => i.id === id);
  assert.equal(view.version, 5);
  assert.equal(item('sys').contains_changes, true);
  assert.deepEqual(plain(item('sys').stereotypes), ['contains-changes']);
  for (const id of ['box', 'sys.leaf']) {
    assert.deepEqual(plain(item(id).stereotypes), ['contains-changes'], id + ': the author\'s word is in the list');
    assert.equal('contains_changes' in item(id), false, id + ': the kernel did not compute it');
  }
  assert.equal('contains_changes' in item('sys.fresh'), false, 'a new box says new');
  // without a comparison the key is never there
  const plainView = call('compute', { viewpoint: 'map', layer: 'application', focal: '', elements: [{ reference: 'box', parent: false, qualifiers: ['contains-changes'] }] });
  assert.equal(JSON.stringify(plainView).includes('contains_changes'), false);

  // and the page reads the key, not the last stereotype
  const sandbox = createApp({});
  await sandbox.loadViewpointKernel();
  const state = (drawn) => run(sandbox, 'changeStateOfItem(' + JSON.stringify(drawn) + ')');
  assert.equal(state(plain(item('sys'))), 'contains-changes');
  assert.equal(state(plain(item('box'))), null, 'a hand-written word on an unchanged box is not drawn as the state');
  assert.equal(state(plain(item('sys.fresh'))), 'new');
});
