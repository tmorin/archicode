'use strict';
// The Remove button of a qualifier, an application and a use removes the item it sits on (issue #120, wave 017 run 0120). The command line leaves an item with no value
// (`- ` or `null`) out of these lists, so does the page; the forms address a pill by `data-index`, its place among the pills drawn, and the handler counts the items with a value in the list it edits (the manifest's own, which still
// holds the items with no value, or the resolution of a plateau, which may not), so that it reaches the item the button sits on (a relationship is addressed by its place in the file, #105). The tests click the real button (`handleAppClick`, with the `data-index` the form drew), on a list that holds items with no
// value before, between and after the ones it draws, and read what the file says afterwards.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const HEADER = (kind) => 'header:\n  kind: "archicode.morin.io/' + kind + '"\n  version: "1"\n';
const FILES = {
  'workspace.yaml': 'settings:\n  manifests:\n    paths: [m]\n',
  'm/s.yaml': HEADER('system') + 'content:\n  id: s\n  qualifiers: [null, a, ~, b, c, null]\n',
  'm/e.yaml':
    HEADER('environment') +
    'content:\n  id: e\n  uses: [null, p, ~, q]\n  elements:\n    - kind: node\n      id: n\n      applications: [null, s, ~, t]\n',
  'm/p.yaml': HEADER('environment') + 'content:\n  id: p\n',
  'm/q.yaml': HEADER('environment') + 'content:\n  id: q\n',
  'm/t.yaml': HEADER('system') + 'content:\n  id: t\n'
};

async function open(files = FILES) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  sandbox.confirm = () => true;
  return { sandbox, state };
}

/** The `data-index` of each Remove button of an action, in the order the form draws them, with the text of the pill each one sits on. */
function buttons(html, action) {
  return Array.from(html.matchAll(new RegExp('<span class="pill">([^<]*) <button[^>]*data-action="' + action + '"[^>]*data-index="(\\d+)"', 'g')), (m) => [m[1], Number(m[2])]);
}

/** A click on the Remove button drawn for `text`, as the page gets it; the fields of the form are those of the element, untouched. */
function clickRemove(sandbox, action, reference, html, text) {
  const found = buttons(html, action).find(([pill]) => pill === text);
  assert.ok(found, 'the form draws a Remove button on ' + text);
  const attributes = { 'data-action': action, 'data-ref': reference, 'data-index': String(found[1]) };
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null) };
  const doc = sandbox.document;
  const original = { getElementById: doc.getElementById, querySelectorAll: doc.querySelectorAll };
  const record = sandbox.findElementRecord(reference);
  const byId = { 'edit-id-input': { value: record.id }, 'edit-name-input': { value: record.name || '' }, 'edit-description-input': { value: record.description || '' } };
  doc.getElementById = (id) => byId[id] || original.getElementById.call(doc, id);
  doc.querySelectorAll = (selector) => (selector.includes('relationship-edit-row') ? [] : original.querySelectorAll.call(doc, selector));
  try {
    sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null), classList: { contains: () => false } }, preventDefault() {}, stopPropagation() {}, detail: 1 });
  } finally {
    Object.assign(doc, original);
  }
  // a plateau beyond the one drawn inherits what was written: the author is asked first, and says yes
  const dialog = vm.runInContext('appDialog', sandbox);
  if (dialog && dialog.kind === 'layer-confirm') sandbox.submitAppDialog({});
}

const plain = (value) => JSON.parse(JSON.stringify(value));
const listOf = (sandbox, reference, key) => JSON.parse(JSON.stringify(sandbox.locateContentNode(reference).node[key]));
const read = (state, layer, reference, key) => Array.from(state.index[layer].get(reference)[key]);

test('Remove on a qualifier removes that qualifier when the list holds items with no value (#120)', async () => {
  const { sandbox, state } = await open();
  assert.deepEqual(read(state, 'application', 's', 'qualifiers'), ['a', 'b', 'c']);
  const html = sandbox.renderElementEditionFormHtml('s');
  assert.deepEqual(buttons(html, 'remove-qualifier').map(([pill]) => pill), ['a', 'b', 'c']);
  clickRemove(sandbox, 'remove-qualifier', 's', html, 'c');
  assert.deepEqual(read(state, 'application', 's', 'qualifiers'), ['a', 'b'], 'c is gone, a and b stay');
  assert.deepEqual(listOf(sandbox, 's', 'qualifiers').filter((q) => q !== null), ['a', 'b']);
  // and then the first one: each button removes its own item
  clickRemove(sandbox, 'remove-qualifier', 's', sandbox.renderElementEditionFormHtml('s'), 'a');
  assert.deepEqual(read(state, 'application', 's', 'qualifiers'), ['b']);
});

test('Remove on an application removes that application when the list holds items with no value (#120)', async () => {
  const { sandbox, state } = await open();
  assert.deepEqual(read(state, 'technology', 'e.n', 'applications'), ['s', 't']);
  const html = sandbox.renderElementEditionFormHtml('e.n');
  assert.deepEqual(buttons(html, 'remove-application').map(([pill]) => pill), ['s', 't']);
  clickRemove(sandbox, 'remove-application', 'e.n', html, 't');
  assert.deepEqual(read(state, 'technology', 'e.n', 'applications'), ['s'], 't is gone, s stays');
});

test('Remove on a use removes that use when the list holds items with no value (#120)', async () => {
  const { sandbox, state } = await open();
  assert.deepEqual(read(state, 'technology', 'e', 'uses'), ['p', 'q']);
  const html = sandbox.renderElementEditionFormHtml('e');
  assert.deepEqual(buttons(html, 'remove-use').map(([pill]) => pill), ['p', 'q']);
  clickRemove(sandbox, 'remove-use', 'e', html, 'q');
  assert.deepEqual(read(state, 'technology', 'e', 'uses'), ['p'], 'q is gone, p stays');
});

test('a list without an item with no value is addressed as before: the place in the list is the place in the file (#120)', async () => {
  const { sandbox } = await open({
    ...FILES,
    'm/s.yaml': HEADER('system') + 'content:\n  id: s\n  qualifiers: [a, b, c]\n',
    'm/e.yaml': HEADER('environment') + 'content:\n  id: e\n  uses: [p, q]\n  elements:\n    - kind: node\n      id: n\n      applications: [s, t]\n'
  });
  assert.deepEqual(buttons(sandbox.renderElementEditionFormHtml('s'), 'remove-qualifier'), [['a', 0], ['b', 1], ['c', 2]]);
  assert.deepEqual(buttons(sandbox.renderElementEditionFormHtml('e'), 'remove-use'), [['p', 0], ['q', 1]]);
  assert.deepEqual(buttons(sandbox.renderElementEditionFormHtml('e.n'), 'remove-application'), [['s', 0], ['t', 1]]);
});

test('a button names the pill it sits on by its place among the pills drawn, and the items with no value stay where the file has them (#120)', async () => {
  const { sandbox } = await open();
  assert.deepEqual(buttons(sandbox.renderElementEditionFormHtml('s'), 'remove-qualifier'), [['a', 0], ['b', 1], ['c', 2]]);
  assert.deepEqual(plain(sandbox.withoutNthPresent([null, 'a', null, 'b', 'c', null], 1)), [null, 'a', null, 'c', null]);
  assert.deepEqual(plain(sandbox.withoutNthPresent([null, 'a'], 0)), [null]);
  assert.deepEqual(plain(sandbox.withoutNthPresent(['a', 'b'], 5)), ['a', 'b'], 'a place beyond the list removes nothing');
  assert.deepEqual(plain(sandbox.withoutNthPresent(undefined, 0)), []);
});

test('in a workspace with plateaus, Remove removes the item it sits on, in the plateau that declares the list and in one that inherits it (#120)', async () => {
  const layered = {
    ...FILES,
    'm/later.yaml': HEADER('plateau') + 'content:\n  id: later\n  override: baseline\n'
  };
  for (const drawn of ['baseline', 'later']) {
    const { sandbox, state } = await open(layered);
    await sandbox.loadViewpointKernel();
    assert.equal(state.fatalError, null);
    sandbox.drawPlateau(drawn);
    assert.deepEqual(read(state, 'application', 's', 'qualifiers'), ['a', 'b', 'c'], drawn);
    const html = sandbox.renderElementEditionFormHtml('s');
    clickRemove(sandbox, 'remove-qualifier', 's', html, 'c');
        assert.deepEqual(read(state, 'application', 's', 'qualifiers'), ['a', 'b'], 'c is gone, a and b stay, with ' + drawn + ' drawn');
    // the uses of an environment and the applications of a node the same
    clickRemove(sandbox, 'remove-use', 'e', sandbox.renderElementEditionFormHtml('e'), 'q');
    assert.deepEqual(read(state, 'technology', 'e', 'uses'), ['p'], drawn);
    clickRemove(sandbox, 'remove-application', 'e.n', sandbox.renderElementEditionFormHtml('e.n'), 't');
    assert.deepEqual(read(state, 'technology', 'e.n', 'applications'), ['s'], drawn);
  }
});

test('what the file keeps around the item removed is what it kept before (#120): the comments and the other keys', async () => {
  const text = HEADER('system') + 'content:\n  id: s # the system\n  qualifiers: [null, a, ~, b, c, null] # three\n  name: S\n';
  const { sandbox, state } = await open({ ...FILES, 'm/s.yaml': text });
  clickRemove(sandbox, 'remove-qualifier', 's', sandbox.renderElementEditionFormHtml('s'), 'b');
  const mf = state.manifestFiles.find((f) => f.relPath === 'm/s.yaml');
  assert.equal(mf.dirty, true);
  assert.match(mf.rawText, /id: s # the system\n/);
  assert.match(mf.rawText, /\n {2}name: S\n$/);
  assert.deepEqual(plain(sandbox.parseManifestText(mf.rawText).content.qualifiers), [null, 'a', null, 'c', null], 'only b went; the items with no value are where they were');
});
