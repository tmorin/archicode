'use strict';
// A manifest with a YAML anchor, an alias or a tag (`&a`, `*a`, `!!str`) is not read by the editor, so the line-preserving save has nothing to follow in it (wave 013, run 0067,
// the case wave 011 named "files with anchors or tags" and did not file). The save cannot carry it: the editor's reader refuses these three forms, because the model the editor
// edits (a plain tree, written back by the emitter) has no place for an anchor and would have to expand every alias into a copy, which the command line does not do either
// (it reads an alias as its name). What these tests pin is what the editor does instead, which is safe: the file is told as unreadable, left out of the model, never written
// (byte for byte), and the emitter's text, not a guess, is what a save of such a text gives. The gap with the command line, which reads anchors and tags, is tmorin/archicode#74.
// Everything here is invented: a mill and a bakery.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const plain = (value) => JSON.parse(JSON.stringify(value));
const app = createApp({});

const HEAD = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "bakery"   # keep\n';
const FORMS = {
  anchor: HEAD + '  name: &n "Bakery"   # anchored\n',
  alias: HEAD + '  name: &n "Bakery"\n  description: *n\n',
  tag: HEAD + '  name: !!str "Bakery"\n',
  'anchor in a flow collection': HEAD + '  name: Bakery\n  tags: [&a one, two]\n',
  'anchor on a mapping': HEAD + '  name: Bakery\n  properties: &p\n    heat: high\n'
};

test('the reader of the editor refuses an anchor, an alias and a tag, in a block and in a flow collection, and says why', () => {
  for (const [form, text] of Object.entries(FORMS)) {
    assert.throws(() => app.parseYaml(text), /anchors, aliases and tags are not supported/, form);
  }
});

test('a save of such a text is the emitter\'s text of the new value, and reads back as that value (the layout of the file is not followed, as before)', () => {
  for (const [form, text] of Object.entries(FORMS)) {
    const value = { header: { kind: 'archicode.morin.io/system', version: '1' }, content: { id: 'bakery', name: 'Bakery', size: 2 } };
    const out = app.patchYamlText(text, value);
    assert.equal(out, app.serializeYamlValue(value, 0), form);
    assert.deepEqual(plain(app.parseYaml(out)), value, form);
  }
});

const PLATEAUS = 'settings:\n  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n';
const FILES = {
  'app.mill.yaml': '# the mill\nheader:\n  kind: "archicode.morin.io/system"\n  version: "1"\n\ncontent:\n  id: "mill"   # the id\n  name: "Mill"\n  tags:\n  - flour   # one\n# end of the mill\n',
  'app.bakery.yaml': '# the bakery\n' + FORMS.alias.replace('description: *n', 'description: *n   # an alias') + '  relationships:\n    - destination: "mill"\n# end of the bakery\n'
};

test('in the editor, a manifest with an anchor is told as unreadable, left out of the model and never written; the other files are saved line by line', async () => {
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, Object.fromEntries(Object.entries(FILES).map(([file, body]) => ['plateaus/10_base/' + file, body]))));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  const unreadable = state.manifestFiles.filter((f) => f.error);
  assert.deepEqual(plain(unreadable.map((f) => [f.relPath, f.error])), [['plateaus/10_base/app.bakery.yaml', 'YAML error at line 7: anchors, aliases and tags are not supported']]);
  assert.deepEqual(Array.from(state.index.application.keys()), ['mill'], 'what the file declares is not in the model');
  sandbox.commitElementEdit('mill', (node) => { node.name = 'Flour mill'; node.tags.push('bran'); return {}; });
  await sandbox.saveAllChanges();
  const saved = (file) => mem.files.get('plateaus/10_base/' + file).text;
  assert.deepEqual(mem.writes, ['plateaus/10_base/app.mill.yaml'], 'the file with the anchor is not written');
  assert.equal(saved('app.bakery.yaml'), FILES['app.bakery.yaml'], 'and stays byte for byte');
  assert.equal(saved('app.mill.yaml'), FILES['app.mill.yaml'].replace('name: "Mill"', 'name: "Flour mill"').replace('  - flour   # one\n', '  - flour   # one\n  - bran\n'));
});

test('in the editor, moving an element is refused while a manifest cannot be read, and a rename does not follow into it (pinned as it is today; see #74)', async () => {
  const shop = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';
  const sack = 'header:\n  kind: "archicode.morin.io/container"\n  version: "1"\n  parent: "mill"\ncontent:\n  id: "sack"\n  name: "Sack"\n';
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, Object.fromEntries(Object.entries(Object.assign({ 'app.shop.yaml': shop, 'app.sack.yaml': sack }, FILES)).map(([file, body]) => ['plateaus/10_base/' + file, body]))));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  const moved = sandbox.commitMoveElement('mill.sack', 'application', 'shop', {});
  assert.equal(moved.ok, false);
  assert.match(moved.message, /A manifest cannot be read \(plateaus\/10_base\/app\.bakery\.yaml\): a reference in it could not be rewritten\./);
  // the rename goes through and the reference `mill` of the unreadable file is left behind, the file itself is not touched
  sandbox.commitElementEdit('mill', (node) => { node.id = 'granary'; return { renamedTo: { from: 'mill', to: 'granary' } }; });
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes.slice().sort(), ['plateaus/10_base/app.mill.yaml', 'plateaus/10_base/app.sack.yaml']);
  assert.equal(mem.files.get('plateaus/10_base/app.bakery.yaml').text, FILES['app.bakery.yaml']);
});
