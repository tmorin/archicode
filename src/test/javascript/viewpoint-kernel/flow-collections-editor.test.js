'use strict';
// The editor keeps the lines of a manifest that holds flow collections (wave 010, run 0053, issues #41 and #51). A list or a map written in flow style, on one line or on
// several, with other collections inside, as the value of a key, in an item of a list of maps or as an item itself, is read as the block the emitter writes, and goes back
// as it was written when the edit did not touch it; the one the edit changes is a block, whose values keep their quotes. A file that holds such a collection and is moved
// within (an element put under another parent) carries the block over as written, the collections too. A result is accepted only if re-reading it gives the emitter's text of
// the new value; any other layout is the emitter's, as before. The kernel is the real embedded module.
// Everything here is invented: a mill, a bakery, a garden.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles, openLayered } = require('./layered-folders');

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

// every shape in one file, with comments and a blank line around them: what a save must keep
const MILL = [
  '# the mill: grinds the grain',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "mill"',
  '  name: "Mill"',
  '  tags: {zone: north, tier: "gold"}   # where it is',
  '',
  '  # what it talks to',
  '  relationships:',
  '    - destination: "bakery.oven"',
  '      label: "sells flour to"',
  '      qualifiers: [Sack, "Cart"]   # how',
  '    # the second one',
  '    - qualifiers: [Belt]',
  '      destination: "bakery.mixer"',
  '    - destination: "bakery.door"',
  '      qualifiers: [[a, b], [c]]  # nested',
  '    - {destination: "bakery.shelf", label: "fills"}   # inline',
  '  replaces: [',
  '    # the old mill',
  '    "mill.old",',
  "    'mill.older',   # the oldest",
  '  ]  # on several lines',
  '# end of the mill',
  ''
].join('\n');

const app = createApp({});
/** `text` after `change` was made to its value, saved as the editor saves it; it must read back as that value. */
function save(text, change, app2 = app) {
  const value = plain(app2.parseYaml(text));
  change(value);
  const out = app2.patchYamlText(text, value);
  assert.deepEqual(plain(app2.parseYaml(out)), value, 'what is written says what the edit says');
  return out;
}

test('a file with every flow shape and an edit that touches none of them: only the edited line differs, the comments and the blank lines stay', () => {
  assert.equal(app.patchYamlText(MILL, plain(app.parseYaml(MILL))), MILL, 'no edit, no change');
  const out = save(MILL, (v) => { v.content.name = 'Flour mill'; });
  assert.deepEqual(lineDiff(MILL, out), { removed: ['  name: "Mill"'], added: ['  name: "Flour mill"'] });
  assert.equal(out, MILL.replace('name: "Mill"', 'name: "Flour mill"'));
  // a number written next to them, and a whole key that goes: still nothing else
  const more = save(MILL, (v) => { v.content.size = 3; });
  assert.equal(more, MILL.replace('# end of the mill', '  size: 3\n# end of the mill'));
});

test('a flow map: kept when the edit leaves it alone, a block of its own (with its comment and its quotes) when the edit changes it, gone with its line when it goes', () => {
  const changed = save(MILL, (v) => { v.content.tags.zone = 'south'; });
  assert.deepEqual(lineDiff(MILL, changed), {
    removed: ['  tags: {zone: north, tier: "gold"}   # where it is'],
    added: ['  tags:  # where it is', '    zone: south', '    tier: "gold"']
  });
  assert.equal(changed, MILL.replace('  tags: {zone: north, tier: "gold"}   # where it is', '  tags:  # where it is\n    zone: south\n    tier: "gold"'));
  // a key added is a key of the block, not a line under a map that was written on one line
  const added = save(MILL, (v) => { v.content.tags.size = 'big'; });
  assert.equal(added, MILL.replace('  tags: {zone: north, tier: "gold"}   # where it is', '  tags:  # where it is\n    zone: north\n    tier: "gold"\n    size: "big"'));  // a new string takes the quotes of the file
  const dropped = save(MILL, (v) => { delete v.content.tags; });
  assert.deepEqual(lineDiff(MILL, dropped), { removed: ['  tags: {zone: north, tier: "gold"}   # where it is'], added: [] });
});

test('a list in an item of a sequence of maps: written after the first key or on the dash line, kept alone, changed with the quotes of its values', () => {
  // `qualifiers` after the first key of its item
  const afterKey = save(MILL, (v) => { v.content.relationships[0].qualifiers.push('Crate'); });
  assert.equal(afterKey, MILL.replace('      qualifiers: [Sack, "Cart"]   # how', '      qualifiers:  # how\n        - Sack\n        - "Cart"\n        - "Crate"'));
  // `qualifiers` is the first key, on the dash line
  const onDash = save(MILL, (v) => { v.content.relationships[1].qualifiers.push('Rope'); });
  assert.deepEqual(lineDiff(MILL, onDash), { removed: ['    - qualifiers: [Belt]'], added: ['    - qualifiers:', '        - Belt', '        - Rope'] });
  // the item next to the one that changed is not touched; an item that goes takes its two lines, not its comment
  const dropped = save(MILL, (v) => { v.content.relationships.splice(1, 1); });
  assert.deepEqual(lineDiff(MILL, dropped), { removed: ['    - qualifiers: [Belt]', '      destination: "bakery.mixer"'], added: [] });
  assert.ok(dropped.includes('    # the second one\n    - destination: "bakery.door"\n'));
  // an item that comes after the lists that stay
  const appended = save(MILL, (v) => { v.content.relationships.push({ destination: 'bakery.till', label: 'rings' }); });
  assert.deepEqual(lineDiff(MILL, appended), { removed: [], added: ['    - destination: "bakery.till"', '      label: "rings"'] });
});

test('a list with nested brackets: kept when untouched, a block of blocks (read back the same) when changed', () => {
  const changed = save(MILL, (v) => { v.content.relationships[2].qualifiers[0].push('d'); });
  assert.equal(changed, MILL.replace('      qualifiers: [[a, b], [c]]  # nested', '      qualifiers:  # nested\n        -\n          - a\n          - b\n          - d\n        -\n          - c'));
  // brackets, commas and colons inside quoted values are text, not structure
  const text = 'content:\n  id: "m"\n  list: ["a, b", \'c]\', "d: e"]  # tricky\n  name: "N"\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('"N"', '"M"'));
  assert.equal(save(text, (v) => { v.content.list.push('f'); }), 'content:\n  id: "m"\n  list:  # tricky\n    - "a, b"\n    - \'c]\'\n    - "d: e"\n    - "f"\n  name: "N"\n');
});

test('a list on several lines: kept whole when untouched (comments inside, trailing comment), a block with the quotes of its items and its comments when changed', () => {
  const changed = save(MILL, (v) => { v.content.replaces.push('mill.oldest'); });
  assert.deepEqual(lineDiff(MILL, changed), {
    removed: ['  replaces: [', '    "mill.old",', "    'mill.older',   # the oldest", '  ]  # on several lines'],
    added: ['  replaces:  # on several lines', '    - "mill.old"', "    - 'mill.older'   # the oldest", "    - 'mill.oldest'"]
  }); // the comments inside the brackets stay, as lines of the block (#54): the one above the first item stays where it is
  // a text that needs the emitter's quotes keeps them; the other items keep the ones the author gave
  const needs = save(MILL, (v) => { v.content.replaces.push('a: b'); });
  assert.ok(needs.includes("    - 'mill.older'   # the oldest\n    - \"a: b\"\n# end of the mill\n"));
  // a map over several lines, and the lines of the file around it
  const text = 'header:\n  kind: x\n# note\ncontent:\n  id: m\n  name: N\n\n  tags: {\n    zone: north,\n    tier: gold\n  }\n\n  # last\n  size: 3\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('name: N', 'name: M'));
  assert.equal(save(text, (v) => { v.content.tags.zone = 'S'; }), 'header:\n  kind: x\n# note\ncontent:\n  id: m\n  name: N\n\n  tags:\n    zone: S\n    tier: gold\n\n  # last\n  size: 3\n');
});

test('a flow map that is an item of a list: kept alone, a block with its comment when changed', () => {
  const changed = save(MILL, (v) => { v.content.relationships[3].label = 'stocks'; });
  assert.deepEqual(lineDiff(MILL, changed), {
    removed: ['    - {destination: "bakery.shelf", label: "fills"}   # inline'],
    added: ['    - destination: "bakery.shelf"  # inline', '      label: "stocks"']
  });
  const text = 'content:\n  id: m\n  matrix:\n    - [a, b]\n    - [c, d]  # row\n  name: N\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('name: N', 'name: M'));
  assert.equal(save(text, (v) => { v.content.matrix[1].push('e'); }), 'content:\n  id: m\n  matrix:\n    - [a, b]\n    -  # row\n      - c\n      - d\n      - e\n  name: N\n');
});

test('a key written in quotes, or with a space in it, in front of a flow collection: the same rules, and the key keeps its quotes', () => {
  const text = 'content:\n  id: m\n  "tags": {a: b}\n  \'my list\': [x, y]  # two\n  name: N\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('name: N', 'name: M'));
  assert.equal(save(text, (v) => { v.content['my list'].push('z'); }), 'content:\n  id: m\n  "tags": {a: b}\n  \'my list\':  # two\n    - x\n    - y\n    - z\n  name: N\n');
  assert.equal(save(text, (v) => { v.content.tags.c = 'd'; }), 'content:\n  id: m\n  "tags":\n    a: b\n    c: d\n  \'my list\': [x, y]  # two\n  name: N\n');
});

test('an empty collection written with a blank inside is still an empty collection, and the file keeps it', () => {
  const text = 'content:\n  id: m\n  none: {  }\n  empty: [ ]\n  name: N\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('name: N', 'name: M'));
});

test('the lines of a block scalar are text, never a collection: a list written in them is not opened, and an edit elsewhere leaves them as they are', () => {
  const text = 'content:\n  id: m\n  description: |\n    tags: [a, b]\n    other: {x: y}\n  name: "N"\n  tags: {a: b}\n';
  assert.equal(save(text, (v) => { v.content.name = 'M'; }), text.replace('"N"', '"M"'));
  assert.equal(save(text, (v) => { v.content.tags.c = 'd'; }), 'content:\n  id: m\n  description: |\n    tags: [a, b]\n    other: {x: y}\n  name: "N"\n  tags:\n    a: b\n    c: d\n');
});

test('a file with Windows line breaks keeps them, around a collection on several lines too', () => {
  const text = 'header:\r\n  kind: x\r\n# c\r\ncontent:\r\n  id: m\r\n  tags: {a: b}\r\n  replaces: [\r\n    "x",\r\n    "y"\r\n  ]\r\n';
  assert.equal(save(text, (v) => { v.content.id = 'n'; }), text.replace('id: m', 'id: n'));
  assert.equal(save(text, (v) => { v.content.replaces.push('z'); }), 'header:\r\n  kind: x\r\n# c\r\ncontent:\r\n  id: m\r\n  tags: {a: b}\r\n  replaces:\r\n    - "x"\r\n    - "y"\r\n    - "z"\r\n');
});

test('the quotes of a list written on one line stay with its items when the edit changes the list (double, single, plain, mixed)', () => {
  for (const [list, quote] of [['["a.one", "a.two"]', '"'], ["['a.one', 'a.two']", "'"], ['[a.one, a.two]', '']]) {
    const text = 'content:\n  id: m\n  replaces: ' + list + '\n';
    assert.equal(save(text, (v) => { v.content.replaces.push('a.three'); }), 'content:\n  id: m\n  replaces:\n    - ' + quote + 'a.one' + quote + '\n    - ' + quote + 'a.two' + quote + '\n    - ' + quote + 'a.three' + quote + '\n', list);
    assert.equal(save(text, (v) => { v.content.replaces.shift(); }), 'content:\n  id: m\n  replaces:\n    - ' + quote + 'a.two' + quote + '\n', list);
  }
  const mixed = 'content:\n  id: m\n  replaces: ["a.one", b.two, \'c.three\']\n';
  assert.equal(save(mixed, (v) => { v.content.replaces.shift(); }), 'content:\n  id: m\n  replaces:\n    - b.two\n    - \'c.three\'\n');
});

test('files made of every mix of block and flow shapes, with comments: saving without an edit changes nothing, and every edit reads back as what was asked', () => {
  let seed = 7; // a fixed sequence: the same files at each run
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (list) => list[Math.floor(random() * list.length)];
  const words = ['alpha', 'beta', 'oven', 'till', 'a.b', 'x-y', 'Redis', '3', "it's", 'a: b'];
  const scalar = () => { const w = pick(words); return pick([w.includes(': ') ? JSON.stringify(w) : w, JSON.stringify(w), "'" + w.replace(/'/g, "''") + "'"]); };
  const make = (depth) => {
    const r = random();
    if (depth > 3 || r < 0.35) return { text: scalar() };
    const n = 1 + Math.floor(random() * 3);
    if (r < 0.65) return { list: Array.from({ length: n }, () => make(depth + 1)) };
    return { map: Array.from({ length: n }, (_, i) => ['k' + i + pick(['', 'x']), make(depth + 1)]) };
  };
  const flow = (node) => (node.text !== undefined ? node.text : node.list ? '[' + node.list.map(flow).join(', ') + ']' : '{' + node.map.map(([k, v]) => k + ': ' + flow(v)).join(', ') + '}');
  const write = (node, indent, prefix, lines) => {
    const pad = ' '.repeat(indent);
    if (node.text !== undefined) { lines.push(pad + prefix + ' ' + node.text + pick(['', '', '  # c'])); return; }
    const style = random();
    if (style < 0.4) { lines.push(pad + prefix + ' ' + flow(node) + pick(['', '  # flow'])); return; }
    if (style < 0.55) {
      const items = node.list ? node.list.map(flow) : node.map.map(([k, v]) => k + ': ' + flow(v));
      lines.push(pad + prefix + ' ' + (node.list ? '[' : '{'));
      items.forEach((item, i) => lines.push(pad + '  ' + item + (i < items.length - 1 ? ',' : '') + pick(['', '', '  # item'])));
      lines.push(pad + (node.list ? ']' : '}') + pick(['', '  # end']));
      return;
    }
    lines.push(pad + prefix + pick(['', '  # head']));
    if (node.list) {
      for (const item of node.list) {
        if (item.text !== undefined) lines.push(pad + '  - ' + item.text);
        else if (item.map) {
          item.map.forEach(([k, v], i) => {
            const part = [];
            write(v, indent + 4, k + ':', part);
            part[0] = (i === 0 ? pad + '  - ' : pad + '    ') + part[0].slice(indent + 4);
            lines.push(...part);
          });
        } else write(item, indent + 2, '-', lines);
      }
    } else node.map.forEach(([k, v]) => write(v, indent + 2, k + ':', lines));
  };
  let files = 0;
  for (let round = 0; round < 400; round++) {
    const root = { map: [['first', make(1)], ['second', make(1)], ['third', make(1)]] };
    const body = [];
    root.map.forEach(([k, v], i) => { if (i === 1) body.push(''); write(v, 2, k + ':', body); if (i === 0) body.push('  # between'); });
    const text = 'header:\n  kind: x\ncontent:\n' + body.join('\n') + '\n# end\n';
    let value;
    try { value = plain(app.parseYaml(text)); } catch (e) { continue; } // a plain `a: b` is not a value: not a file to save
    files++;
    assert.equal(app.patchYamlText(text, plain(value)), text, 'no edit, no change:\n' + text);
    const edited = plain(value);
    const places = [];
    (function walk(node, path) { if (node && typeof node === 'object') { places.push(path); Object.keys(node).forEach((k) => walk(node[k], path.concat(k))); } })(edited.content, []);
    let target = edited.content;
    for (const key of pick(places)) target = target[key];
    if (Array.isArray(target)) { if (random() < 0.5) target.push('new'); else target.splice(0, 1); }
    else if (random() < 0.5) target.added = 'new';
    else delete target[Object.keys(target)[0]];
    assert.deepEqual(plain(app.parseYaml(app.patchYamlText(text, edited))), edited, 'the edit reads back:\n' + text);
  }
  assert.ok(files > 250, 'most of the files are usable');
});

// ---- what is not followed is the emitter's, as before ----

test('a layout the aligner cannot follow gives the emitter\'s text, with or without a flow collection (a file indented by four, a flow collection it cannot read)', () => {
  const four = 'header:\n    kind: x\ncontent:\n    id: m\n    tags: {a: b}\n';
  const value = plain(app.parseYaml(four));
  value.content.id = 'n';
  assert.equal(app.patchYamlText(four, value), app.serializeYamlValue(value, 0));
  // a collection that does not close: the file is not read at all, the text is the emitter's
  const broken = 'content:\n  id: m\n  tags: [a, b\n  name: N\n';
  assert.equal(app.patchYamlText(broken, { content: { id: 'm', tags: ['a', 'b'], name: 'M' } }), 'content:\n  id: m\n  tags:\n    - a\n    - b\n  name: M');
  // an anchor inside the brackets is not followed (anchors-tags-save.test.js follows the other ones): the same
  const anchored = 'content:\n  id: m\n  tags: {a: &x b}\n';
  assert.equal(app.patchYamlText(anchored, { content: { id: 'm', tags: { a: 'c' } } }), 'content:\n  id: m\n  tags:\n    a: c');
});

test('a result that does not read back as the emitter\'s text is not accepted, whatever the collections did: the emitter\'s text is what comes back', () => {
  const sandbox = createApp({});
  const value = plain(sandbox.parseYaml(MILL));
  value.content.name = 'Flour mill';
  const emitted = sandbox.serializeYamlValue(value, 0);
  assert.equal(sandbox.patchYamlText(MILL, value), MILL.replace('name: "Mill"', 'name: "Flour mill"'));
  // put the collections back wrongly on purpose: what is written no longer says what the edit says
  sandbox.closeFlowLists = () => 'content: [broken';
  assert.equal(sandbox.patchYamlText(MILL, value), emitted);
});

// ---- #51: the block of a moved element is carried over as written, in a file that holds flow collections ----

const GARDEN = [
  '# the garden: where things grow',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "garden"',
  '  name: "Garden"',
  '  tags: {zone: north, tier: "gold"}   # where it is',
  '  elements:',
  '    # the greenhouse comes first',
  '    - kind: container',
  '      id: "greenhouse"',
  '      name: "Greenhouse"',
  '      replaces: [garden.old-greenhouse]  # the old one',
  '      tags: {heat: on}',
  '      relationships:',
  '        - destination: "garden.well"',
  '          label: "waters from"',
  '          qualifiers: [Pipe, "Pump"]   # how',
  '        - destination: "garden.tools"',
  '          qualifiers: [',
  '            "Door",',
  '            "Key",',
  '          ]',
  '      elements:',
  '        - kind: component',
  '          id: "vent"',
  '          name: "Vent"',
  '          tags: {open: "yes"}',
  '    # the well is on its own',
  '    - kind: container',
  '      id: "well"',
  '      name: "Well"',
  "      replaces: ['garden.old-well', 'garden.older-well']",
  '    - kind: group',
  '      id: "tools"',
  '      name: "Tools"',
  '# end of the garden',
  ''
].join('\n');
const PLATEAU_LIST = [{ id: 'base', name: 'Base', path: 'plateaus/10_base' }, { id: 'target', name: 'Target', path: 'plateaus/20_target' }];

/** One manifest, in a plain folder; with `compare`, as the two sibling layers `base` and `target` (see layered-folders.js), the target drawn and compared with the base. */
async function open(manifest, compare) {
  if (!compare) {
    const mem = memFolder({ 'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n', 'manifests/app.garden.yaml': manifest });
    const sandbox = createApp({});
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    await sandbox.loadViewpointKernel();
    return { sandbox, state, mem, file: () => mem.files.get('manifests/app.garden.yaml').text };
  }
  const files = layeredFiles(PLATEAU_LIST, { 'plateaus/10_base/app.garden.yaml': manifest, 'plateaus/20_target/app.garden.yaml': manifest });
  const { sandbox, state, mem } = await openLayered(createApp, memFolder, files, { drawn: 'target', compared: 'base' });
  return { sandbox, state, mem, file: () => mem.files.get('plateaus/20_target/app.garden.yaml').text };
}

test('moving an element in a file that holds flow collections carries its block over as written: the collections inside it too, one level deeper, and the comment of the next element stays on it', async () => {
  const { sandbox, file } = await open(GARDEN);
  assert.equal(sandbox.commitMoveElement('garden.greenhouse', 'application', 'garden.tools', { writeReplaces: false }).ok, true);
  await sandbox.saveAllChanges();
  const lines = GARDEN.split('\n');
  const block = lines.slice(10, 30).map((line) => '    ' + line); // the comment above the greenhouse goes with it, one level deeper
  const expected = lines.slice(0, 10).concat(lines.slice(30, 38), ['      elements:'], block, lines.slice(38)).join('\n');
  assert.equal(file(), expected);
  // the moved lines are the original's, shifted: nothing was written by the emitter
  for (const kept of ['          replaces: [garden.old-greenhouse]  # the old one', '          tags: {heat: on}', '              qualifiers: [Pipe, "Pump"]   # how', '              qualifiers: [', '                "Door",', '              tags: {open: "yes"}', "      replaces: ['garden.old-well', 'garden.older-well']", '  tags: {zone: north, tier: "gold"}   # where it is']) {
    assert.ok(file().split('\n').includes(kept), kept);
  }
  assert.ok(file().includes('    # the well is on its own\n    - kind: container\n      id: "well"\n'), 'the comment of the well stays above the well');
  assert.ok(file().includes('        # the greenhouse comes first\n        - kind: container\n          id: "greenhouse"\n'), 'the comment of the greenhouse goes with it');
});

test('"Move and write replaces" in the same file: the list the element already has takes its item in the style it was written, the other collections stay as they were', async () => {
  const { sandbox, file } = await open(GARDEN, true);
  assert.deepEqual(plain(sandbox.commitMoveElement('garden.greenhouse', 'application', 'garden.tools', { writeReplaces: true })), { ok: true, reference: 'garden.tools.greenhouse', replaces: 2 });
  await sandbox.saveAllChanges();
  const saved = file();
  // the list written on one line (plain) is a block of plain items with the new one; the new list of the vent takes the quotes of the file
  assert.ok(saved.includes('          replaces:  # the old one\n            - garden.old-greenhouse\n            - garden.greenhouse\n'), saved);
  assert.ok(saved.includes('              replaces:\n                - "garden.greenhouse.vent"\n'), saved);
  // everything else of the block is the original's, shifted (the lists of the relationships, the flow maps), and the comments are where they were
  for (const kept of ['          tags: {heat: on}', '              qualifiers: [Pipe, "Pump"]   # how', '                "Door",', '              tags: {open: "yes"}', "      replaces: ['garden.old-well', 'garden.older-well']", '  tags: {zone: north, tier: "gold"}   # where it is']) {
    assert.ok(saved.split('\n').includes(kept), kept);
  }
  assert.ok(saved.includes('    # the well is on its own\n    - kind: container\n      id: "well"\n'));
  assert.ok(saved.endsWith('# end of the garden\n') && saved.startsWith('# the garden: where things grow\n'));
  const again = createApp({});
  await again.loadWorkspace(sandbox.__state().folder.handle);
  again.drawPlateau('target');
  assert.ok(again.__state().index.application.has('garden.tools.greenhouse.vent'));
});

test('a move whose collections cannot be put back as they were is saved as the emitter writes it, as before, and the file still reads as the model says', async () => {
  const { sandbox, file, state } = await open(GARDEN);
  sandbox.closeFlowLists = () => 'content: [broken';
  assert.equal(sandbox.commitMoveElement('garden.greenhouse', 'application', 'garden.tools', { writeReplaces: false }).ok, true);
  await sandbox.saveAllChanges();
  assert.equal(file().includes('broken'), false);
  assert.equal(file(), sandbox.serializeYamlValue(plain(sandbox.parseYaml(file())), 0), 'the emitter\'s text, nothing of the original layout');
  const again = createApp({});
  await again.loadWorkspace(state.folder.handle);
  assert.ok(again.__state().index.application.has('garden.tools.greenhouse.vent'));
  assert.equal(again.__state().relationshipStats.dangling, 0);
});

// ---- two collections that read the same and are written differently: the edit of one never gives the other its spelling (review of wave 010) ----

const TWINS = [
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "bakery"',
  '  name: "Bakery"',
  '  elements:',
  '    - kind: container',
  '      id: "mixer"',
  '      name: "Mixer"',
  '      tags: {zone: north}',
  '    - kind: group',
  '      id: "oven"',
  '      name: "Oven"',
  '      tags: { zone:  north }',
  ''
].join('\n');

test('removing the collection of one of two that read the same leaves the other as it was written, and keeps the collection the edit did not touch', () => {
  const first = save(TWINS, (v) => { delete v.content.elements[0].tags; });
  assert.deepEqual(lineDiff(TWINS, first), { removed: ['      tags: {zone: north}'], added: [] });
  assert.ok(first.includes('      tags: { zone:  north }'));
  const second = save(TWINS, (v) => { delete v.content.elements[1].tags; });
  assert.deepEqual(lineDiff(TWINS, second), { removed: ['      tags: { zone:  north }'], added: [] });
  assert.ok(second.includes('      tags: {zone: north}'));
  // nobody touched them: both stay as they are
  assert.equal(app.patchYamlText(TWINS, plain(app.parseYaml(TWINS))), TWINS);
  // an edit of one of them changes that one only
  const changed = save(TWINS, (v) => { v.content.elements[1].tags.zone = 'south'; });
  assert.ok(changed.includes('      tags: {zone: north}\n'), changed);
  assert.ok(changed.includes('      tags:\n        zone: south'), changed);
});

test('moving one of two elements whose collections read the same: each keeps the spelling it had', async () => {
  const { sandbox, file } = await open(TWINS);
  assert.equal(sandbox.commitMoveElement('bakery.mixer', 'application', 'bakery.oven', { writeReplaces: false }).ok, true);
  await sandbox.saveAllChanges();
  assert.ok(file().includes('        tags: {zone: north}\n'), file()); // the mixer, one level deeper
  assert.ok(file().includes('      tags: { zone:  north }\n'), file()); // the oven
  assert.equal(file().split('\n').filter((l) => l.includes('zone')).length, 2);
});
