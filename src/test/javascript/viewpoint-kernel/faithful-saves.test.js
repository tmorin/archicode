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

const PLATEAUS = 'settings:\n  manifests:\n    paths:\n      - plateaus/10_base\n';
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

test('#54: when the lines of the block do not match what was read, the comments are kept above the block and nothing else is applied', () => {
  const read = { leaves: [{ quote: '"', word: null, line: 0, col: 0 }], keys: [], comments: [{ text: '# first', gap: ' ', before: 0, after: -1 }, { text: '# second', gap: '  ', before: 1, after: 0 }] };
  assert.deepEqual(app.emitFlowBlock(['a', 'b'], read, 4), ['    # first', '    # second', '    - a', '    - b']);
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// #57 (wave 013, run 0067): a list written at the column of its key (`tags:` then `- a` at the same column) is followed by the save: the items an edit does not touch stay
// as written, an item the edit adds is written at the column the list already uses, and the comments and blank lines of the list stay. The rule stays: a result is accepted
// only if re-reading it gives the emitter's text of the new value.

const KEY_COLUMN = [
  '# the mill',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: mill   # keep',
  '  name: Mill',
  '  tags:',
  '  # why these three',
  '  - flour   # one',
  '  - "grain"',
  '',
  '  - sack',
  '  relationships:',
  '  - destination: bakery.oven   # sells to',
  '    label: sells flour',
  '    tags:',
  '    - bulk   # nested, at the column of its key',
  '    - fresh',
  '  - destination: bakery.door',
  '    label: opens',
  '    note: |',
  '      Three keys.',
  '      - not an item',
  '  description: A mill.',
  '  size: 3',
  '# end of the mill',
  ''
].join('\n');

test('#57: the issue\'s example — a list at the column of its key, a comment on the id line — saves only the lines the edit changes', () => {
  const text = 'content:\n  id: m   # keep\n  tags:\n  - a\n  - b\n  name: N\n';
  const renamed = save(text, (v) => { v.content.tags[0] = 'x'; });
  assert.deepEqual(lineDiff(text, renamed), { removed: ['  - a'], added: ['  - x'] });
  const added = save(text, (v) => { v.content.tags.push('c'); });
  assert.equal(added, 'content:\n  id: m   # keep\n  tags:\n  - a\n  - b\n  - c\n  name: N\n', 'the item is written at the column of the list');
  const removed = save(text, (v) => { v.content.tags.splice(0, 1); });
  assert.deepEqual(lineDiff(text, removed), { removed: ['  - a'], added: [] });
  const other = save(text, (v) => { v.content.name = 'M'; });
  assert.deepEqual(lineDiff(text, other), { removed: ['  name: N'], added: ['  name: M'] });
});

test('#57: rename, add, remove an item and change another key: only those lines differ, and the comments, the blank line and the quotes stay', () => {
  const rename = save(KEY_COLUMN, (v) => { v.content.tags[0] = 'bran'; });
  assert.deepEqual(lineDiff(KEY_COLUMN, rename), { removed: ['  - flour   # one'], added: ['  - bran   # one'] });
  const add = save(KEY_COLUMN, (v) => { v.content.tags.push('husk'); });
  assert.deepEqual(lineDiff(KEY_COLUMN, add), { removed: [], added: ['  - husk'] });
  assert.ok(add.includes('\n  - sack\n  - husk\n  relationships:\n'), 'the new item follows the last one, at the column of the list');
  const remove = save(KEY_COLUMN, (v) => { v.content.tags.splice(1, 1); });
  assert.deepEqual(lineDiff(KEY_COLUMN, remove), { removed: ['  - "grain"'], added: [] });
  const other = save(KEY_COLUMN, (v) => { v.content.name = 'Flour mill'; v.content.size = 4; v.content.description = 'A mill of flour.'; });
  assert.deepEqual(lineDiff(KEY_COLUMN, other), {
    removed: ['  name: Mill', '  description: A mill.', '  size: 3'],
    added: ['  name: Flour mill', '  description: A mill of flour.', '  size: 4']
  });
});

test('#57: a list of maps at the column of its key, with a list at the column of its own key inside an item: an item added, an item removed, a nested item added', () => {
  const nested = save(KEY_COLUMN, (v) => { v.content.relationships[0].tags.push('loose'); });
  assert.deepEqual(lineDiff(KEY_COLUMN, nested), { removed: [], added: ['    - loose'] });
  const item = save(KEY_COLUMN, (v) => { v.content.relationships.push({ destination: 'bakery.shelf', label: 'stocks' }); });
  assert.deepEqual(lineDiff(KEY_COLUMN, item), { removed: [], added: ['  - destination: bakery.shelf', '    label: stocks'] });
  const last = save(KEY_COLUMN, (v) => { v.content.relationships.splice(1, 1); });
  assert.deepEqual(lineDiff(KEY_COLUMN, last), { removed: ['  - destination: bakery.door', '    label: opens', '    note: |', '      Three keys.', '      - not an item'], added: [] });
  const first = save(KEY_COLUMN, (v) => { v.content.relationships[0].destination = 'bakery.stove'; });
  assert.deepEqual(lineDiff(KEY_COLUMN, first), { removed: ['  - destination: bakery.oven   # sells to'], added: ['  - destination: bakery.stove   # sells to'] });
  const block = save(KEY_COLUMN, (v) => { v.content.relationships[1].note = 'Two keys.\n- not an item\n'; });
  assert.ok(block.includes('  - destination: bakery.door\n'), block);
  const all = save(KEY_COLUMN, (v) => {
    v.content.tags[2] = 'sacks'; v.content.tags.push('husk'); v.content.relationships[0].tags.splice(0, 1); v.content.relationships[1].label = 'closes'; v.content.size = 5;
  });
  assert.deepEqual(lineDiff(KEY_COLUMN, all), {
    removed: ['  - sack', '    - bulk   # nested, at the column of its key', '    label: opens', '  size: 3'],
    added: ['  - sacks', '  - "husk"', '    label: closes', '  size: 5']
  });
});

test('#57: a file that writes one list at the column of its key and another indented keeps each as it is, and an item added goes at the column of its own list', () => {
  const text = 'content:\n  id: m\n  tags:\n  - a   # flat\n  qualifiers:\n    - q   # deep\n  name: N\n';
  const out = save(text, (v) => { v.content.tags.push('b'); v.content.qualifiers.push('r'); });
  assert.equal(out, 'content:\n  id: m\n  tags:\n  - a   # flat\n  - b\n  qualifiers:\n    - q   # deep\n    - r\n  name: N\n');
});

test('#57: a list that grows from nothing, and one that is emptied, are the emitter\'s lines for that key and the rest of the file stays', () => {
  const grown = save(KEY_COLUMN.replace(/  tags:\n  # why these three\n  - flour   # one\n  - "grain"\n\n  - sack\n/, '  tags: []\n'), (v) => { v.content.tags.push('flour'); });
  assert.ok(grown.includes('  id: mill   # keep\n  name: Mill\n  tags:\n    - flour\n  relationships:\n  - destination: bakery.oven   # sells to\n'), grown);
  const emptied = save(KEY_COLUMN, (v) => { v.content.tags = []; });
  assert.ok(emptied.includes('  id: mill   # keep\n  name: Mill\n  tags: []\n  # why these three\n\n  relationships:\n  - destination: bakery.oven   # sells to\n    label: sells flour\n'), emptied);
  assert.ok(emptied.startsWith('# the mill\nheader:') && emptied.endsWith('  size: 3\n# end of the mill\n'));
});

test('#57: a file with CRLF line breaks and a list at the column of its key', () => {
  const text = KEY_COLUMN.replace(/\n/g, '\r\n');
  const out = save(text, (v) => { v.content.tags.push('husk'); v.content.name = 'M'; });
  assert.equal(out, text.replace('  name: Mill', '  name: M').replace('  - sack\r\n', '  - sack\r\n  - husk\r\n'));
});

test('#57: lists at the column of their keys in the elements of a tree: a nested element added, the others stay', () => {
  const text = [
    'header:',
    '  kind: "archicode.morin.io/system"',
    'content:',
    '  id: bakery   # the bakery',
    '  elements:',
    '  - kind: container   # first',
    '    id: oven',
    '    tags:',
    '    - hot',
    '    elements:',
    '    - kind: component',
    '      id: door',
    '      qualifiers:',
    '      - steel   # strong',
    '  - kind: container',
    '    id: shelf',
    ''
  ].join('\n');
  const out = save(text, (v) => {
    v.content.elements[0].elements[0].qualifiers.push('glass');
    v.content.elements[1].tags = ['wood'];
    v.content.elements.push({ kind: 'container', id: 'till' });
  });
  assert.deepEqual(lineDiff(text, out), {
    removed: [],
    added: ['      - glass', '    tags:', '      - wood', '  - kind: container', '    id: till']
  });
});

test('#57: a result that does not read back as the emitter\'s text is not accepted for a file with a list at the column of its key either', () => {
  const sandbox = createApp({});
  const value = plain(sandbox.parseYaml(KEY_COLUMN));
  value.content.name = 'Flour mill';
  const emitted = sandbox.serializeYamlValue(value, 0);
  assert.equal(sandbox.patchYamlText(KEY_COLUMN, value), KEY_COLUMN.replace('  name: Mill', '  name: Flour mill'));
  const real = sandbox.patchYamlLines;
  sandbox.patchYamlLines = (...args) => { const text = real(...args); return text === null ? null : text.replace('name: Flour mill', 'name: [broken'); };
  assert.equal(sandbox.patchYamlText(KEY_COLUMN, value), emitted);
  sandbox.patchYamlLines = real;
  // a file that already uses a character the save keeps for itself is the emitter's text, not a guess
  const odd = 'content:\n  id: m \u0001\n  tags:\n  - a\n';
  assert.equal(sandbox.patchYamlText(odd, { content: { id: 'm \u0001', tags: ['a', 'b'] } }), sandbox.serializeYamlValue({ content: { id: 'm \u0001', tags: ['a', 'b'] } }, 0));
});

test('#57: when the aligner keeps the line of a key for another value (the first item of a list of maps goes, the second stays), the lines under it are the emitter\'s and the data is right', () => {
  const text = 'content:\n  id: m\n  size:\n  - note:\n    - gamma   # c1\n    # c2\n    - x\n  - note:   # c3\n      q: 1\n    label: l\n';
  const out = save(text, (v) => { v.content.size.splice(0, 1); });
  // the same lines as for the same file with the lists indented: the first `note:` line is the one that stays, so the comment of the second (`# c3`) goes with the line that goes
  assert.equal(out, 'content:\n  id: m\n  size:\n  - note:\n      # c2\n      q: 1\n    label: l\n');
});

test('#57: the editor renames an element whose file writes its lists at the column of their keys: the id, the references and the comments are the only lines that differ', async () => {
  const files = {
    'app.mill.yaml': [
      '# the mill', 'header:', '  kind: "archicode.morin.io/system"', '  version: "1"', '', 'content:', '  id: "mill"   # the id', '  name: "Mill"', '  qualifiers:', '  # two qualifiers', '  - flour', '  - grain   # last', '# end of the mill', ''
    ].join('\n'),
    'app.bakery.yaml': [
      '# the bakery', 'header:', '  kind: "archicode.morin.io/system"', '  version: "1"', '', 'content:', '  id: "bakery"', '  name: "Bakery"', '  relationships:',
      '  # flour comes from the mill', '  - destination: "mill" # why', '    label: "buys from"', '  - destination: "mill"    # again', '    label: "pays"', '# end of the bakery', ''
    ].join('\n')
  };
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, Object.fromEntries(Object.entries(files).map(([file, body]) => ['plateaus/10_base/' + file, body]))));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  sandbox.commitElementEdit('mill', (node) => { node.id = 'granary'; node.qualifiers.push('bran'); return { renamedTo: { from: 'mill', to: 'granary' } }; });
  await sandbox.saveAllChanges();
  const saved = (file) => mem.files.get('plateaus/10_base/' + file).text;
  assert.deepEqual(lineDiff(files['app.mill.yaml'], saved('app.mill.yaml')), { removed: ['  id: "mill"   # the id'], added: ['  id: "granary"   # the id', '  - bran'] });
  assert.deepEqual(lineDiff(files['app.bakery.yaml'], saved('app.bakery.yaml')), {
    removed: ['  - destination: "mill" # why', '  - destination: "mill"    # again'],
    added: ['  - destination: "granary" # why', '  - destination: "granary"    # again']
  });
});

// ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------
// a comment in an empty collection that an edit fills (wave 013, run 0067): the comment on the line of the key, and the comments inside the brackets, are kept

const EMPTY = (line) => 'header:\n  kind: x\ncontent:\n  id: m   # keep\n' + line + '  name: N\n';

test('a comment after `[]`, `{}`, `~` or a bare key that an edit fills stays on the line of the key', () => {
  for (const [line, write] of [['  tags: [] # note\n', ' # note'], ['  tags:  []    # note\n', '  # note'], ['  tags: # note\n', ' # note'], ['  tags: ~ # note\n', ' # note']]) {
    const text = EMPTY(line);
    const out = save(text, (v) => { v.content.tags = ['z', 'y']; });
    // a bare key is the very line the emitter writes: it stays, and the items come under it
    assert.deepEqual(lineDiff(text, out), line === '  tags: # note\n' ? { removed: [], added: ['    - z', '    - y'] } : { removed: [line.slice(0, -1)], added: ['  tags:' + write, '    - z', '    - y'] }, line);
  }
  const map = EMPTY('  props: {} # note\n');
  assert.deepEqual(lineDiff(map, save(map, (v) => { v.content.props = { a: 'b' }; })), { removed: ['  props: {} # note'], added: ['  props: # note', '    a: b'] });
});

test('the comment of a collection that an edit empties stays on its line', () => {
  const text = EMPTY('  tags:   # why\n    - z\n    - y\n');
  assert.deepEqual(lineDiff(text, save(text, (v) => { v.content.tags = []; })), { removed: ['  tags:   # why', '    - z', '    - y'], added: ['  tags: []   # why'] });
});

test('a comment on a line of its own inside an empty block, or inside the brackets of an empty collection, is kept when an edit fills it', () => {
  const block = EMPTY('  tags:\n    # note about tags\n');
  const filled = save(block, (v) => { v.content.tags = ['z']; });
  assert.equal(filled.split('# note about tags').length, 2, filled);
  assert.deepEqual(lineDiff(block, filled), { removed: [], added: ['    - z'] });
  const flow = EMPTY('  tags: [\n    # note inside\n  ]\n');
  const opened = save(flow, (v) => { v.content.tags = ['z']; });
  assert.equal(opened.split('# note inside').length, 2, opened);
  assert.equal(opened.split('\n').filter((l) => /^\s*- z$/.test(l)).length, 1);
  assert.ok(opened.startsWith('header:\n  kind: x\ncontent:\n  id: m   # keep\n  tags:\n'), opened);
  const after = EMPTY('  tags: [ ]   # after\n');
  assert.deepEqual(lineDiff(after, save(after, (v) => { v.content.tags = ['z']; })), { removed: ['  tags: [ ]   # after'], added: ['  tags:  # after', '    - z'] });
});

test('a collection that no edit fills is saved as written, comments inside included', () => {
  for (const line of ['  tags: [] # note\n', '  tags: # note\n', '  tags: [\n    # note inside\n  ]\n', '  tags:\n    # note about tags\n']) {
    const text = EMPTY(line);
    assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('  name: N', '  name: M'), line);
  }
});
