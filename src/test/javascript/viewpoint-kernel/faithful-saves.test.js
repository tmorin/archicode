'use strict';
// The editor's save changes the lines an edit means to change and nothing else (wave 011, run 0055, issues #50, #52, #53 and #54). Each case compares the saved text with the
// original: a line that is rewritten keeps its end-of-line comment and the spaces before it (#50); a comment or a blank line above a line that is rewritten stays above it (#52);
// a boolean written `yes`, `no`, `on`, `off` (and a null written `~`, or not written) does not make the save rewrite the file, and stays as written on the lines the edit does
// not set (#53); a flow collection that an edit changes keeps its comments, the quotes of its keys and the words of its booleans as the lines of the block it becomes (#54).
// A result is accepted only if re-reading it gives the emitter's text of the new value: every save here is read back. The kernel is the real embedded module.
// Everything here is invented: a bakery, a mill, a market.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const plain = (value) => JSON.parse(JSON.stringify(value));

/** What changed between two texts, line by line (a longest common subsequence): the lines that went and the lines that came, each in order. */
function lineDiff(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const removed = [];
  const added = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) added.push(b[j++]);
    else removed.push(a[i++]);
  }
  return { removed, added };
}

const app = createApp({});
/** `text` after `change` was made to its value, saved as the editor saves it; it must read back as that value, and no change at all gives the text back. */
function save(text, change) {
  assert.equal(app.patchYamlText(text, plain(app.parseYaml(text))), text, 'no edit, no change');
  const value = plain(app.parseYaml(text));
  change(value);
  const out = app.patchYamlText(text, value);
  assert.deepEqual(plain(app.parseYaml(out)), value, 'what is written says what the edit says');
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// #50: the end-of-line comment of a line that is rewritten

test('#50: a rewritten scalar keeps its end-of-line comment and the spaces before it', () => {
  const text = 'header:\n  kind: "archicode.morin.io/system"\ncontent:\n  id: "oven"  # the id\n  name: "Oven"      # shown on the map\n  size: 3 # tight\n';
  const out = save(text, (v) => { v.content.id = 'stove'; v.content.name = 'Stove'; v.content.size = 4; });
  assert.deepEqual(lineDiff(text, out), {
    removed: ['  id: "oven"  # the id', '  name: "Oven"      # shown on the map', '  size: 3 # tight'],
    added: ['  id: "stove"  # the id', '  name: "Stove"      # shown on the map', '  size: 4 # tight']
  });
  assert.equal(out, text.replace('"oven"', '"stove"').replace('"Oven"', '"Stove"').replace('3 #', '4 #'));
});

test('#50: the reference of a relationship that is rewritten keeps its comment, in a list of maps and in a list of texts', () => {
  const text = [
    'content:',
    '  id: mill',
    '  relationships:',
    '    - destination: "bakery.oven" # why',
    '      label: "sells flour to"',
    '    - destination: "bakery.door"    # the door',
    '      label: "opens"',
    '  tags:',
    '    - "flour"  # one',
    '    - "grain" # two',
    '    - sack',
    ''
  ].join('\n');
  const out = save(text, (v) => {
    v.content.relationships[0].destination = 'shop.oven';
    v.content.relationships[1].destination = 'shop.door';
    v.content.tags[0] = 'bran';
    v.content.tags[1] = 'oats';
  });
  assert.equal(out, text.replace('bakery.oven', 'shop.oven').replace('bakery.door', 'shop.door').replace('"flour"', '"bran"').replace('"grain"', '"oats"'));
});

test('#50: a line that is rewritten without a comment, or one that goes with no line that comes, is as before', () => {
  const text = 'content:\n  id: oven\n  tags:\n    - a  # one\n    - b  # two\n  name: Oven # shown\n';
  assert.equal(save(text, (v) => { v.content.id = 'stove'; }), text.replace('id: oven', 'id: stove'));
  // an item that goes takes its comment with it; the others stay
  assert.equal(save(text, (v) => { v.content.tags.shift(); }), 'content:\n  id: oven\n  tags:\n    - b  # two\n  name: Oven # shown\n');
  // one item replaced by two: not told apart, nothing is guessed
  assert.equal(save(text, (v) => { v.content.tags = ['x', 'y', 'z']; }), 'content:\n  id: oven\n  tags:\n    - x\n    - y\n    - z\n  name: Oven # shown\n');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// #52: the comment or the blank line above a rewritten line

test('#52: a comment above a rewritten line stays above it', () => {
  const text = 'content:\n  id: m\n  # why\n  name: N\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), 'content:\n  id: m\n  # why\n  name: M\n');
});

test('#52: a blank line above a rewritten line stays above it', () => {
  const text = 'content:\n  id: m\n\n  name: N\n';
  const out = save(text, (v) => { v.content.name = 'M'; });
  assert.equal(out, 'content:\n  id: m\n\n  name: M\n');
  assert.deepEqual(lineDiff(text, out), { removed: ['  name: N'], added: ['  name: M'] });
});

test('#52: with several lines rewritten, each comment and blank line stays above the line it was above', () => {
  const text = 'content:\n  a: 1\n  # about b\n  b: 2\n\n  # about c\n  c: 3\n  # about d\n  d: 4\n';
  const out = save(text, (v) => { v.content.a = 5; v.content.b = 6; v.content.c = 7; });
  assert.equal(out, 'content:\n  a: 5\n  # about b\n  b: 6\n\n  # about c\n  c: 7\n  # about d\n  d: 4\n');
  const items = 'content:\n  tags:\n    - a\n    # the second\n    - b\n\n    # the third\n    - c\n';
  assert.equal(save(items, (v) => { v.content.tags = ['a', 'x', 'y']; }), 'content:\n  tags:\n    - a\n    # the second\n    - x\n\n    # the third\n    - y\n');
});

test('#52: a line that is added still goes where it went (before the comments that follow the last line), and a comment above a line that goes stays', () => {
  const text = 'content:\n  a: 1\n  # about b\n  b: 2\n  # the end\n';
  assert.equal(save(text, (v) => { v.content.z = 9; }), 'content:\n  a: 1\n  # about b\n  b: 2\n  z: 9\n  # the end\n');
  assert.equal(save(text, (v) => { delete v.content.b; }), 'content:\n  a: 1\n  # about b\n  # the end\n');
});

test('#52: a file reduced to an empty mapping keeps its comments above it', () => {
  assert.equal(save('# the market\nsettings:\n  name: "Market"\n', (v) => { delete v.settings; }), '# the market\n{}\n');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// #53: the words the reader reads as a boolean or a null

const WORDS = [
  '# keep',
  'content:',
  '  id: m',
  '  flag: yes   # on purpose',
  '  other: No',
  '  heat: ON # warm',
  '  cold: off',
  '  loud: True',
  '  quiet: FALSE',
  '  nothing: ~',
  '  nil: Null   # none',
  '  empty:',
  '  quoted: "yes"',
  '  list:',
  '    - yes',
  '    - off # last',
  '  items:',
  '    - on: x',
  '      ready: on',
  '      note:',
  '      size: 2',
  '  name: N',
  ''
].join('\n');

test('#53: a file with yes, no, on, off, ~ and empty values is saved line by line: the words stay, the comments stay, only the edited line differs', () => {
  const out = save(WORDS, (v) => { v.content.name = 'M'; });
  assert.deepEqual(lineDiff(WORDS, out), { removed: ['  name: N'], added: ['  name: M'] });
  assert.equal(out, WORDS.replace('name: N', 'name: M'));
});

test('#53: an edit elsewhere, in the lists too, leaves the words as they are', () => {
  const out = save(WORDS, (v) => { v.content.list.push('x'); v.content.items[0].size = 3; v.content.id = 'n'; });
  assert.deepEqual(lineDiff(WORDS, out), { removed: ['  id: m', '      size: 2'], added: ['  id: n', '    - x', '      size: 3'] });
  assert.ok(out.includes('  flag: yes   # on purpose\n  other: No\n  heat: ON # warm\n  cold: off\n  loud: True\n  quiet: FALSE\n  nothing: ~\n  nil: Null   # none\n  empty:\n  quoted: "yes"\n'));
  assert.ok(out.includes('    - yes\n    - off # last\n    - x\n'));
  assert.ok(out.includes('    - on: x\n      ready: on\n      note:\n      size: 3\n'));
});

test('#53: a boolean that the edit sets is written true or false, and keeps its comment; one set to the value it has is not touched', () => {
  const out = save(WORDS, (v) => { v.content.flag = false; v.content.heat = true; v.content.other = true; v.content.cold = true; });
  assert.deepEqual(lineDiff(WORDS, out), { removed: ['  flag: yes   # on purpose', '  other: No', '  cold: off'], added: ['  flag: false   # on purpose', '  other: true', '  cold: true'] });
  assert.ok(out.includes('  heat: ON # warm\n'), 'ON read true and is true: not rewritten');
});

test('#53: a quoted word is a text and is never read as a boolean; a text that looks like one is told so by its quotes', () => {
  const out = save(WORDS, (v) => { v.content.quoted = 'no'; v.content.name = 'yes'; });
  assert.deepEqual(lineDiff(WORDS, out), { removed: ['  quoted: "yes"', '  name: N'], added: ['  quoted: "no"', '  name: "yes"'] });
});

test('#53: a key with nothing after it is a null, and one with a block under it is not', () => {
  const text = 'content:\n  a: ~\n  b:\n  c:\n    - x\n  e:\n    f: 1\n  g:   # last\n';
  assert.equal(save(text, (v) => { v.content.c.push('z'); }), 'content:\n  a: ~\n  b:\n  c:\n    - x\n    - z\n  e:\n    f: 1\n  g:   # last\n');
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// #54: a flow collection that an edit changes

const TAGS = [
  '# the market',
  'content:',
  '  id: stall',
  '  tags: [',
  '    # first',
  '    "a.one",',
  '    "a.two",   # second',
  "    'a.three',",
  '    # before the bracket',
  '  ]  # on several lines',
  '  zone: {"tier": \'gold\', heat: on, "cold": off, "label": plain}   # one line',
  '  name: N',
  ''
].join('\n');

test('#54: a list on several lines that an edit changes keeps its comments as lines of the block, in place', () => {
  const out = save(TAGS, (v) => { v.content.tags.push('a.four'); });
  assert.equal(out, TAGS.replace(/  tags: \[[\s\S]*?\]  # on several lines/, '  tags:  # on several lines\n    # first\n    - "a.one"\n    - "a.two"   # second\n    - \'a.three\'\n    - \'a.four\'\n    # before the bracket'));
});

test('#54: a value changed in the list keeps the comment of its line, and the comments of the others stay', () => {
  const out = save(TAGS, (v) => { v.content.tags[1] = 'b.two'; });
  assert.deepEqual(lineDiff(TAGS, out), {
    removed: ['  tags: [', '    "a.one",', '    "a.two",   # second', "    'a.three',", '  ]  # on several lines'],
    added: ['  tags:  # on several lines', '    - "a.one"', '    - "b.two"   # second', "    - 'a.three'"]
  });
  assert.ok(out.includes('    # first\n') && out.includes('    # before the bracket\n'));
});

test('#54: a map that an edit changes keeps the quotes of its keys, the quotes of its values and the words of its booleans, and writes true or false only for what the edit sets', () => {
  const out = save(TAGS, (v) => { v.content.zone.size = 'big'; });
  assert.equal(out, TAGS.replace(/  zone: \{.*\}   # one line/, '  zone:  # one line\n    "tier": \'gold\'\n    heat: on\n    "cold": off\n    "label": plain\n    size: big'));
  const set = save(TAGS, (v) => { v.content.zone.heat = false; });
  assert.ok(set.includes('    "tier": \'gold\'\n    heat: false\n    "cold": off\n    "label": plain\n'));
});

test('#54: a collection that no edit reaches is saved as written, comments inside included', () => {
  const out = save(TAGS, (v) => { v.content.name = 'M'; });
  assert.equal(out, TAGS.replace('name: N', 'name: M'));
});

test('#54: a map on several lines, an item that is a flow map, and a nested list: the comments of each go with its lines', () => {
  const text = [
    'content:',
    '  id: stall',
    '  zone: {',
    '    # where',
    '    place: north,   # the place',
    '    "tier": gold,',
    '    # and when',
    '    open: yes',
    '  }',
    '  relationships:',
    '    - {destination: "shop.till", # the till',
    '       "label": "pays", ready: yes}',
    '    - destination: "shop.door"',
    '  grid: [[a, b],',
    '    # second row',
    '    [c, d]  # last row',
    '  ]',
    ''
  ].join('\n');
  const zone = save(text, (v) => { v.content.zone.place = 'south'; });
  assert.equal(zone, text.replace(/  zone: \{[\s\S]*?\n  \}\n/, '  zone:\n    # where\n    place: south   # the place\n    "tier": gold\n    # and when\n    open: yes\n'));
  const item = save(text, (v) => { v.content.relationships[0].label = 'settles'; });
  assert.equal(item, text.replace(/    - \{[\s\S]*?ready: yes\}\n/, '    - destination: "shop.till" # the till\n      "label": "settles"\n      ready: yes\n'));
  const grid = save(text, (v) => { v.content.grid[1].push('e'); });
  assert.ok(grid.includes('  grid:\n    -\n      - a\n      - b\n    # second row\n    -\n      - c\n      - d  # last row\n      - e\n'), grid);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// the whole editor: a rename, saved to the disk

const PLATEAUS = 'settings:\n  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n';
const MANIFESTS = {
  'app.mill.yaml': [
    '# the mill',
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    '',
    'content:',
    '  id: "mill"   # the id',
    '  name: "Mill"',
    '# end of the mill',
    ''
  ].join('\n'),
  'app.bakery.yaml': [
    '# the bakery',
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    '',
    'content:',
    '  id: "bakery"',
    '  name: "Bakery"',
    '  relationships:',
    '    # flour comes from the mill',
    '    - destination: "mill" # why',
    '      label: "buys from"',
    '    - destination: "mill"    # again',
    '      label: "pays"',
    '# end of the bakery',
    ''
  ].join('\n')
};

test('the editor renames an element: the id, the references that follow and their comments are the only lines that differ', async () => {
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, Object.fromEntries(Object.entries(MANIFESTS).map(([file, body]) => ['plateaus/10_base/' + file, body]))));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  sandbox.commitElementEdit('mill', (node) => { node.id = 'granary'; return { renamedTo: { from: 'mill', to: 'granary' } }; });
  await sandbox.saveAllChanges();
  const saved = (file) => mem.files.get('plateaus/10_base/' + file).text;
  assert.deepEqual(lineDiff(MANIFESTS['app.mill.yaml'], saved('app.mill.yaml')), { removed: ['  id: "mill"   # the id'], added: ['  id: "granary"   # the id'] });
  assert.deepEqual(lineDiff(MANIFESTS['app.bakery.yaml'], saved('app.bakery.yaml')), {
    removed: ['    - destination: "mill" # why', '    - destination: "mill"    # again'],
    added: ['    - destination: "granary" # why', '    - destination: "granary"    # again']
  });
});
