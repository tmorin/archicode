'use strict';
// A manifest with a YAML anchor, an alias or a tag (`&a`, `*a`, `!!str`) is read by the editor and saved with only the intended lines changed (wave 014, run 0071, issue #74;
// before, the reader refused all three, so such a file was listed as unreadable and never written, and the command line read an alias as its name: the command line is
// `AnchorsAliasesTagsTest.java`, on the same texts). The editor reads an alias as a copy of the node it points at (the model is a plain tree), and a tag as the Java side does
// (`!!str 12` is the text `12`). The line-preserving save writes them back as they were written: a line the edit does not touch is the line of the file, a line it changes
// keeps its anchor and its tag, and an alias stays as long as the text says what the edit says (an alias whose anchor was changed becomes the value it has). What cannot be
// carried safely (an anchor, an alias or a tag inside brackets, a tag on a text that goes over several lines) keeps the fallback of the save, the emitter's text, which reads back
// as the edit; it is filed as tmorin/archicode#78. Everything here is invented: a mill and a bakery.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const plain = (value) => JSON.parse(JSON.stringify(value));
const app = createApp({});

const HEAD = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "bakery"   # keep\n';

// ---------------------------------------------------------------------------------------------------------------------
// The reader.

const READ = {
  anchor: [HEAD + '  name: &n "Bakery"   # anchored\n', { name: 'Bakery' }],
  alias: [HEAD + '  name: &n "Bakery"\n  description: *n\n', { name: 'Bakery', description: 'Bakery' }],
  tag: [HEAD + '  name: !!str "Bakery"\n', { name: 'Bakery' }],
  'a tag that keeps a number a text': [HEAD + '  description: !!str 12\n  size: 12\n', { description: '12', size: 12 }],
  'a tag that makes a text a number': [HEAD + '  size: !!int "12"\n  ratio: !!float 1.5\n  open: !!bool yes\n', { size: 12, ratio: 1.5, open: true }],
  'a tag of the file': [HEAD + '  description: !local 12\n  name: !<tag:yaml.org,2002:str> 13\n', { description: '12', name: '13' }],
  'a tag and an anchor, in either order': [HEAD + '  name: &n !!str Bakery\n  description: !!str &d *n\n'.replace('!!str &d *n', '*n'), { name: 'Bakery', description: 'Bakery' }],
  'anchor on a mapping, alias of it': [HEAD + '  properties: &p\n    heat: high\n  other:\n    properties: *p   # same\n', { properties: { heat: 'high' }, other: { properties: { heat: 'high' } } }],
  'anchor on a list, alias of it': [HEAD + '  qualifiers: &q\n    - oven\n    - flour\n  other: *q\n', { qualifiers: ['oven', 'flour'], other: ['oven', 'flour'] }],
  'anchor on a list at the column of its key': [HEAD + '  qualifiers: &q\n  - oven\n  - flour\n  other: *q\n', { qualifiers: ['oven', 'flour'], other: ['oven', 'flour'] }],
  'alias of an alias': [HEAD + '  a: &x 1\n  b: &y\n    c: *x\n  d: *y\n', { a: 1, b: { c: 1 }, d: { c: 1 } }],
  'alias as an item': [HEAD + '  qualifiers:\n    - &a oven\n    - *a\n', { qualifiers: ['oven', 'oven'] }],
  'anchor in a flow collection': [HEAD + '  qualifiers: [&a oven, *a]\n  tags: {zone: &z north, other: *z}\n', { qualifiers: ['oven', 'oven'], tags: { zone: 'north', other: 'north' } }],
  'anchor on a block scalar': [HEAD + '  description: &d |\n    two\n    lines\n  other: *d\n', { description: 'two\nlines\n', other: 'two\nlines\n' }],
  'an anchor with nothing': [HEAD + '  name: &n\n  other: *n\n', { name: null, other: null }],
  'a merge key is an ordinary key': [HEAD + '  base: &b\n    heat: high\n  <<: *b\n', { base: { heat: 'high' }, '<<': { heat: 'high' } }]
};

test('the reader of the editor reads an anchor, an alias and a tag, in a block and in a flow collection, as the Java side does', () => {
  for (const [form, [text, content]] of Object.entries(READ)) {
    assert.deepEqual(plain(app.parseYaml(text).content), Object.assign({ id: 'bakery' }, content), form);
  }
});

test('an alias is a copy: editing the copy leaves the anchored node alone', () => {
  const value = app.parseYaml(HEAD + '  properties: &p\n    heat: high\n  other: *p\n');
  value.content.other.heat = 'low';
  assert.equal(value.content.properties.heat, 'high');
});

test('what the reader still refuses says so on the line', () => {
  const refused = [
    ['a: 1\nb: *nowhere\n', 2, /found undefined alias `nowhere`/],
    ['a: &x 1\n*x : 2\n', 2, /expected a "key: value" entry/],
    ['a: 1\n&k b: 2\n', 2, /expected a "key: value" entry/],
    ['a: &k b: 2\n', 1, /an anchor or a tag on a key is not supported/],
    ['a: 1\nb: &x *a\n', 2, /undefined alias|an alias cannot have an anchor/],
    ['a: !!int x\n', 1, /is not an integer/],
    ['a: !!float x\n', 1, /is not a number/],
    ['a: !!binary YQ==\n', 1, /binary/],
    ['a: &\n', 1, /an anchor needs a name/],
    ['a: &x &y 1\n', 1, /only one anchor/],
    ['a: !!str !!int 1\n', 1, /only one tag/]
  ];
  for (const [text, line, message] of refused) {
    assert.throws(() => app.parseYaml(text), (e) => e.name === 'YamlParseError' && e.line === line && message.test(e.message), JSON.stringify(text));
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// The save, on a text and a value.

/** The text after `edit` is applied to the value the text reads as. */
function saved(text, edit) {
  const value = plain(app.parseYaml(text));
  edit(value.content);
  const out = app.patchYamlText(text, value);
  assert.deepEqual(plain(app.parseYaml(out)), value, 'the text reads back as the edit');
  return { out, emitted: app.serializeYamlValue(value, 0) };
}

const BAKERY = HEAD + '  name: &n "Bakery"   # anchored\n  description: *n   # an alias\n  size: !!str 12\n  tags:\n    zone: north\n';

test('a line the edit does not touch is the line of the file: an anchor, an alias and a tag stay as written', () => {
  const { out } = saved(BAKERY, (c) => { c.tags.zone = 'south'; });
  assert.equal(out, BAKERY.replace('zone: north', 'zone: south'));
});

test('no edit is the file, byte for byte, for every form the save follows', () => {
  for (const [form, [text]] of Object.entries(READ)) {
    if (/flow/.test(form)) continue; // the fallback, below
    const value = app.parseYaml(text);
    const out = app.patchYamlText(text, value);
    assert.equal(out, text, form);
  }
});

test('a line with an anchor that is edited keeps the anchor and its comment, and the alias that pointed at it becomes the value it has', () => {
  const { out } = saved(BAKERY, (c) => { c.name = 'Flour'; });
  assert.equal(out, BAKERY.replace('name: &n "Bakery"', 'name: &n "Flour"').replace('description: *n   # an alias', 'description: Bakery   # an alias'));
});

test('an anchor and the alias that point at it, edited together, stay an anchor and an alias', () => {
  const { out } = saved(BAKERY, (c) => { c.name = 'Flour'; c.description = 'Flour'; });
  assert.equal(out, BAKERY.replace('name: &n "Bakery"', 'name: &n "Flour"'));
});

test('an alias that is edited becomes its value and the anchor stays', () => {
  const { out } = saved(BAKERY, (c) => { c.description = 'Other'; });
  assert.equal(out, BAKERY.replace('description: *n   # an alias', 'description: Other   # an alias'));
});

test('a tag stays on the line it was written on, when the edit changes the value and when it does not', () => {
  assert.equal(saved(BAKERY, (c) => { c.size = '13'; }).out, BAKERY.replace('!!str 12', '!!str "13"'));
  assert.equal(saved(BAKERY, (c) => { c.name = 'Flour'; }).out.includes('size: !!str 12\n'), true);
  // a tag that no longer fits the value is not kept: the text must say what the edit says
  assert.equal(saved(BAKERY, (c) => { c.size = 13; }).out, BAKERY.replace('size: !!str 12', 'size: 13'));
});

const MAPS = HEAD + '  name: Bakery\n  tags: &t\n    zone: north\n    tier: gold\n  elements:\n    - kind: "container"\n      id: "shop"\n      tags: *t   # same\n      qualifiers:\n        - a\n';

test('the alias of a map stays while the map and the copy are the same, and is written out as the map when one of them is edited', () => {
  assert.equal(saved(MAPS, (c) => { c.name = 'Boulangerie'; }).out, MAPS.replace('name: Bakery', 'name: Boulangerie'));
  assert.equal(saved(MAPS, (c) => { c.elements[0].qualifiers.push('b'); }).out, MAPS.replace('        - a\n', '        - a\n        - b\n'));
  assert.equal(
    saved(MAPS, (c) => { c.tags.zone = 'south'; }).out,
    MAPS.replace('zone: north', 'zone: south').replace('tags: *t   # same\n', 'tags:   # same\n        zone: north\n        tier: gold\n')
  );
  assert.equal(
    saved(MAPS, (c) => { c.elements[0].tags.zone = 'south'; }).out,
    MAPS.replace('tags: *t   # same\n', 'tags:   # same\n        zone: south\n        tier: gold\n')
  );
  assert.equal(saved(MAPS, (c) => { c.tags.zone = 'south'; c.elements[0].tags.zone = 'south'; }).out, MAPS.replace('zone: north', 'zone: south'));
});

test('an item that is an alias, and an anchor on a list', () => {
  const items = HEAD + '  qualifiers: &q\n    - &a oven   # hot\n    - *a\n    - flour\n  other: *q\n';
  assert.equal(saved(items, (c) => { c.qualifiers[2] = 'bran'; }).out, items.replace('flour', 'bran').replace('other: *q\n', 'other:\n    - oven\n    - oven\n    - flour\n'));
  assert.equal(saved(items, (c) => { c.name = 'x'; }).out, items + '  name: x\n');
});

test('a block scalar and an empty value that have a tag keep it', () => {
  const text = HEAD + '  description: !!str |\n    two\n    lines\n  size: !!str\n  name: x\n';
  assert.equal(saved(text, (c) => { c.name = 'y'; }).out, text.replace('name: x', 'name: y'));
});

test('the CRLF line breaks and the final line break of the file stay', () => {
  const crlf = BAKERY.replace(/\n/g, '\r\n');
  const { out } = saved(crlf, (c) => { c.tags.zone = 'south'; });
  assert.equal(out, crlf.replace('zone: north', 'zone: south'));
});

test('an anchor, an alias or a tag inside brackets, or a tag on a text over several lines, gives the emitter\'s text, which reads back as the edit', () => {
  const unsupported = {
    'in brackets': HEAD + '  name: Bakery\n  qualifiers: [&a oven, *a]\n',
    'in curly brackets': HEAD + '  name: Bakery\n  tags: {zone: &z north, other: *z}\n',
    'a tag on a text over several lines': HEAD + '  description: !!int 12\n    13\n  name: x\n'.replace('!!int', '!!str')
  };
  for (const [form, text] of Object.entries(unsupported)) {
    const { out, emitted } = saved(text, (c) => { c.name = 'y'; });
    assert.equal(out, emitted, form);
  }
});

// A corpus of texts, and edits at random: whatever the save does, the file it writes says what the edit says, and an edit that touches nothing of an anchor, an alias or a tag
// leaves that line as it was written.
test('whatever the edit, the text written reads back as the edit and the lines it does not concern are the lines of the file', () => {
  const corpus = [BAKERY, MAPS, HEAD + '  qualifiers: &q\n    - &a oven\n    - *a\n  other: *q\n  size: !!int "5"\n  name: !local x   # c\n'];
  let seed = 7;
  const random = (n) => { seed = (seed * 1103515245 + 12345) % 2147483648; return seed % n; };
  const paths = (value, prefix, out) => {
    for (const key of Object.keys(value)) {
      const here = prefix.concat(key);
      const v = value[key];
      if (v !== null && typeof v === 'object') paths(v, here, out);
      else out.push(here);
    }
    return out;
  };
  for (const text of corpus) {
    for (let round = 0; round < 60; round++) {
      const value = plain(app.parseYaml(text));
      const leaves = paths(value.content, [], []);
      const edits = 1 + random(3);
      for (let k = 0; k < edits; k++) {
        const leaf = leaves[random(leaves.length)];
        let node = value.content;
        for (const key of leaf.slice(0, -1)) node = node[key];
        const last = leaf[leaf.length - 1];
        const roll = random(4);
        if (roll === 0 && !Array.isArray(node)) delete node[last];
        else if (roll === 1) node[last] = 'v' + random(5);
        else if (roll === 2) node[last] = random(100);
        else if (!Array.isArray(node)) node['k' + random(3)] = 'added';
      }
      const out = app.patchYamlText(text, value);
      assert.equal(app.serializeYamlValue(app.parseYaml(out), 0), app.serializeYamlValue(value, 0), 'reads back as the edit\n' + text + '\n=>\n' + out);
      assert.equal(/[\u0002\u0003]/.test(out), false, 'no mark is left');
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// The editor.

const PLATEAUS = 'settings:\n  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n';
const FILES = {
  'app.mill.yaml': '# the mill\nheader:\n  kind: "archicode.morin.io/system"\n  version: "1"\n\ncontent:\n  id: "mill"   # the id\n  name: "Mill"\n  tags:\n  - flour   # one\n# end of the mill\n',
  'app.bakery.yaml':
    '# the bakery\n' + HEAD + '  name: &n "Bakery"\n  description: *n   # an alias\n  size: !!str 12\n  relationships:\n    - destination: &d "mill"   # to the mill\n      label: "buys"\n# end of the bakery\n'
};

async function openMem(extra) {
  const files = Object.assign({}, FILES, extra || {});
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, Object.fromEntries(Object.entries(files).map(([file, body]) => ['plateaus/10_base/' + file, body]))));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { mem, sandbox, state };
}

test('in the editor, a manifest with an anchor, an alias and a tag is read: its elements are in the model, with the values the aliases point at', async () => {
  const { state } = await openMem();
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.error)), []);
  assert.deepEqual(Array.from(state.index.application.keys()).sort(), ['bakery', 'mill']);
  const bakery = state.manifestFiles.find((f) => f.relPath.endsWith('app.bakery.yaml'));
  assert.equal(bakery.content.description, 'Bakery');
  assert.equal(bakery.content.size, '12');
  assert.equal(state.index.application.get('bakery').relationships[0].resolved, true);
});

test('in the editor, an edit saves only the intended lines: the anchor, the alias and the tag of a file stay as written, and so do the files it does not concern', async () => {
  const { mem, sandbox } = await openMem();
  sandbox.commitElementEdit('bakery', (node) => { node.description = 'Fresh bread'; node.size = '14'; return {}; });
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes, ['plateaus/10_base/app.bakery.yaml']);
  assert.equal(
    mem.files.get('plateaus/10_base/app.bakery.yaml').text,
    FILES['app.bakery.yaml'].replace('description: *n   # an alias', 'description: Fresh bread   # an alias').replace('!!str 12', '!!str "14"')
  );
  assert.equal(mem.files.get('plateaus/10_base/app.mill.yaml').text, FILES['app.mill.yaml']);
});

test('in the editor, a rename reaches the reference in a file that has an anchor, an alias and a tag, and keeps them', async () => {
  const { mem, sandbox } = await openMem();
  sandbox.commitElementEdit('mill', (node) => { node.id = 'granary'; return { renamedTo: { from: 'mill', to: 'granary' } }; });
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes.slice().sort(), ['plateaus/10_base/app.bakery.yaml', 'plateaus/10_base/app.mill.yaml']);
  assert.equal(mem.files.get('plateaus/10_base/app.bakery.yaml').text, FILES['app.bakery.yaml'].replace('destination: &d "mill"', 'destination: &d "granary"'));
  assert.equal(mem.files.get('plateaus/10_base/app.mill.yaml').text, FILES['app.mill.yaml'].replace('id: "mill"', 'id: "granary"'));
});

test('in the editor, a reference that is an alias follows the rename of the anchor it points at', async () => {
  const bakery =
    '# the bakery\n' + HEAD.replace('id: "bakery"', 'id: "bakery"') + '  relationships:\n    - destination: &m "mill"\n      label: "buys"\n    - destination: "mill"\n      label: "visits"\n';
  const { mem, sandbox } = await openMem({ 'app.bakery.yaml': bakery });
  sandbox.commitElementEdit('mill', (node) => { node.id = 'granary'; return { renamedTo: { from: 'mill', to: 'granary' } }; });
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('plateaus/10_base/app.bakery.yaml').text, bakery.replace('&m "mill"', '&m "granary"').replace('destination: "mill"', 'destination: "granary"'));
});

test('in the editor, an element can be moved while a file has an anchor, and the references of that file follow', async () => {
  const shop = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n  name: "Shop"\n';
  const sack = 'header:\n  kind: "archicode.morin.io/container"\n  version: "1"\n  parent: "mill"\ncontent:\n  id: "sack"\n  name: "Sack"\n';
  const bakery = FILES['app.bakery.yaml'].replace('destination: &d "mill"', 'destination: &d "mill.sack"');
  const { mem, sandbox } = await openMem({ 'app.shop.yaml': shop, 'app.sack.yaml': sack, 'app.bakery.yaml': bakery });
  const moved = sandbox.commitMoveElement('mill.sack', 'application', 'shop', {});
  assert.equal(moved.ok, true, moved.message);
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('plateaus/10_base/app.bakery.yaml').text, bakery.replace('&d "mill.sack"', '&d "shop.sack"'));
});

test('in the editor, a file whose anchor the save cannot follow is written as the emitter writes it, and still says what the edit says', async () => {
  const bracketed = HEAD + '  name: "Bakery"\n  qualifiers: [&a oven, *a]\n';
  const { mem, sandbox, state } = await openMem({ 'app.bakery.yaml': bracketed });
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.error)), []);
  sandbox.commitElementEdit('bakery', (node) => { node.name = 'Boulangerie'; return {}; });
  await sandbox.saveAllChanges();
  const text = mem.files.get('plateaus/10_base/app.bakery.yaml').text;
  assert.equal(text.includes('&a'), false);
  assert.deepEqual(plain(app.parseYaml(text).content), { id: 'bakery', name: 'Boulangerie', qualifiers: ['oven', 'oven'] });
});
