'use strict';
// The line-preserving save writes a collection that the file has in brackets (`qualifiers: [a, b]`, `tags: {zone: north}`, `replaces: [a, b]`) back in brackets, on its
// line, when an edit changes it and the result fits (wave 020, run 0148, GitHub issue #145). Before (the page of `archicode-0.18.0`, and every page back to wave 009) a
// collection the edit changed was written as a block: the model was the same and nothing was lost, but the author's layout was
// (ARCHICODE_EDITOR_HTML=<that page> makes the tests below that keep a layout fail). Each case saves an edit, compares the file before and after line by line (every line the
// edit did not touch byte for byte), and reads the result back as the edit says. The rule, in one place:
//   - the collection goes back in brackets on one line when it is only keys, items and values (nested ones too), with the comment that followed its closing bracket, the quotes
//     and the words its values had, and the spacing inside the brackets the file used (`[ a ]`, `{ k: v }`);
//   - it fits when the line, comment included, is no wider than the widest line of the file, between 100 and 120 columns, or no wider than the line was (`bracketWidth`);
//   - else it is the block, as before. Also the block, as before: a comment inside the brackets (it has no place there), an empty collection that the edit fills (`[]` and `{}` are
//     what the emitter writes for nothing, not a layout the author chose), a collection with an anchor, an alias or a tag in it (written as a block, which keeps them), and a file
//     the aligner cannot follow (the emitter's text).
// Everything here is invented: a mill, a bakery, a garden.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { execFileSync } = require('node:child_process');
const { createApp } = require('./harness');

const REPO = path.resolve(__dirname, '../../../..');
const plain = (value) => JSON.parse(JSON.stringify(value));
const app = createApp({});

/** What changed between two texts, line by line (a longest common subsequence). */
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

/** `text` after `change` was made to its value (as the editor reads a file), saved as the editor saves it; it must read back as that value and carry no mark. */
function save(text, change, page = app) {
  const value = plain(page.parseYaml(text));
  change(value);
  const out = page.patchYamlText(text, value);
  assert.deepEqual(plain(page.parseYaml(out)), value, 'what is written says what the edit says\n' + out);
  assert.equal(/[\u0001-\u0007]/.test(out), false, 'no mark is left');
  return out;
}

// every shape in one file: a list and a map in brackets with a comment after them, quotes and words, a nested list, a list of maps, a list of lists
const MILL = [
  '# the mill: grinds the grain',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "mill"',
  '  name: "Mill"',
  '  qualifiers: [Sack, "Cart", \'Belt\']   # how it ships',
  '  tags: {zone: north, tier: "gold", heat: on}   # where it is',
  '',
  '  # what it talks to',
  '  relationships:',
  '    - destination: "bakery.oven"',
  '      label: "sells flour to"',
  '      qualifiers: [Sack, "Cart"]   # how',
  '    - qualifiers: [Belt]',
  '      destination: "bakery.mixer"',
  '    - destination: "bakery.door"',
  '      qualifiers: [[a, b], [c]]  # nested',
  '    - {destination: "bakery.shelf", label: "fills"}   # inline',
  '  matrix:',
  '    - [a, b]',
  '    - [c, d]  # row',
  '  replaces: [mill.old, mill.older]',
  '# end of the mill',
  ''
].join('\n');

test('an item added to a list in brackets: the list stays on its line, with its comment, its quotes and the spacing of the file', () => {
  const out = save(MILL, (v) => { v.content.qualifiers.push('Crate'); });
  assert.deepEqual(lineDiff(MILL, out), { removed: ['  qualifiers: [Sack, "Cart", \'Belt\']   # how it ships'], added: ['  qualifiers: [Sack, "Cart", \'Belt\', \'Crate\']   # how it ships'] }); // a new text takes the quotes of the items around it, as in a block
  // plain, in an item of a list of maps, after the first key or on the dash line
  assert.equal(save(MILL, (v) => { v.content.relationships[0].qualifiers.push('Rope'); }), MILL.replace('      qualifiers: [Sack, "Cart"]   # how', '      qualifiers: [Sack, "Cart", "Rope"]   # how'));
  assert.equal(save(MILL, (v) => { v.content.relationships[1].qualifiers.push('Rope'); }), MILL.replace('    - qualifiers: [Belt]', '    - qualifiers: [Belt, Rope]'));
  assert.equal(save(MILL, (v) => { v.content.replaces.push('mill.oldest'); }), MILL.replace('replaces: [mill.old, mill.older]', 'replaces: [mill.old, mill.older, mill.oldest]'));
});

test('an item removed, and items reordered, in a list in brackets', () => {
  assert.equal(save(MILL, (v) => { v.content.qualifiers.splice(1, 1); }), MILL.replace('[Sack, "Cart", \'Belt\']', "[Sack, 'Belt']"));
  assert.equal(save(MILL, (v) => { v.content.qualifiers.reverse(); }), MILL.replace('[Sack, "Cart", \'Belt\']', '[Belt, Cart, Sack]')); // a line that moves is a new line for the aligner: its quotes are not carried, in a block as in brackets
  assert.equal(save(MILL, (v) => { v.content.replaces.shift(); }), MILL.replace('replaces: [mill.old, mill.older]', 'replaces: [mill.older]'));
  assert.equal(save(MILL, (v) => { v.content.qualifiers[0] = 'Bag'; }), MILL.replace('[Sack, "Cart", \'Belt\']', '[Bag, "Cart", \'Belt\']'));
});

test('a map in brackets: a value changed, a key added, a key removed; the words and the quotes of what the edit did not touch stay', () => {
  assert.equal(save(MILL, (v) => { v.content.tags.zone = 'south'; }), MILL.replace('{zone: north, tier: "gold", heat: on}', '{zone: south, tier: "gold", heat: on}'));
  assert.equal(save(MILL, (v) => { v.content.tags.size = 'big'; }), MILL.replace('{zone: north, tier: "gold", heat: on}', '{zone: north, tier: "gold", heat: on, size: "big"}'));
  assert.equal(save(MILL, (v) => { delete v.content.tags.tier; }), MILL.replace('{zone: north, tier: "gold", heat: on}', '{zone: north, heat: on}'));
  // `on` is the author's word for true: it stays while the edit leaves the value alone
  assert.equal(save(MILL, (v) => { v.content.tags.heat = false; }), MILL.replace('{zone: north, tier: "gold", heat: on}', '{zone: north, tier: "gold", heat: false}'));
});

test('an empty result: the list or the map the edit empties is `[]` or `{}` on its line, with its comment', () => {
  assert.equal(save(MILL, (v) => { v.content.qualifiers = []; }), MILL.replace('qualifiers: [Sack, "Cart", \'Belt\']   # how it ships', 'qualifiers: []   # how it ships'));
  assert.equal(save(MILL, (v) => { v.content.tags = {}; }), MILL.replace('tags: {zone: north, tier: "gold", heat: on}   # where it is', 'tags: {}   # where it is'));
  // and the key gone with its line
  assert.deepEqual(lineDiff(MILL, save(MILL, (v) => { delete v.content.tags; })), { removed: ['  tags: {zone: north, tier: "gold", heat: on}   # where it is'], added: [] });
});

test('a list that does not fit: the block, as before (the line would be wider than the widest of the file, 100 columns at least)', () => {
  const words = Array.from({ length: 9 }, (_, i) => 'reference.number-' + i); // 9 x 18 characters
  const text = 'content:\n  id: m\n  replaces: [reference.zero, reference.one]\n  name: N\n';
  const out = save(text, (v) => { v.content.replaces = words; });
  assert.equal(out, 'content:\n  id: m\n  replaces:\n' + words.map((w) => '    - ' + w + '\n').join('') + '  name: N\n');
  // the same list a few words shorter is on one line
  const shorter = words.slice(0, 4);
  assert.equal(save(text, (v) => { v.content.replaces = shorter; }), 'content:\n  id: m\n  replaces: [' + shorter.join(', ') + ']\n  name: N\n');
  // a line that was on one line may keep the width it had, even when the file has no wider one: an edit that shortens it never moves it
  const wide = 'content:\n  id: m\n  replaces: [' + words.join(', ') + ']  # long\n  name: N\n';
  assert.equal(wide.split('\n')[2].length > 120, true);
  assert.equal(save(wide, (v) => { v.content.replaces.shift(); }), wide.replace('reference.number-0, ', ''));
  assert.equal(save(wide, (v) => { v.content.replaces.push('x'); }).includes('  replaces:  # long\n    - reference.number-0\n'), true, 'one more item is wider than the line was: the block');
  // the widest line of the file sets the width, up to 120 columns: a file with a long description lets a longer list stay on its line
  const longer = 'content:\n  id: m\n  description: "' + 'd'.repeat(110) + '"\n  replaces: [' + words.slice(0, 4).join(', ') + ']\n';
  assert.equal(save(longer, (v) => { v.content.replaces.push('reference.number-4'); }).includes('replaces: [' + words.slice(0, 5).join(', ') + ']\n'), true, '112 columns');
  assert.equal(save(longer, (v) => { v.content.replaces.push('reference.number-4', 'reference.number-5'); }).includes('replaces:\n    - reference.number-0\n'), true, '132 columns: over 120');
});

test('a comment inside the brackets has no place there: the list on several lines with comments is a block with them, one without is on its line', () => {
  const text = 'content:\n  id: m\n  replaces: [\n    # the old mill\n    "mill.old",\n    \'mill.older\',   # the oldest\n  ]  # on several lines\n  name: N\n';
  const out = save(text, (v) => { v.content.replaces.push('mill.oldest'); });
  assert.equal(out, 'content:\n  id: m\n  replaces:  # on several lines\n    # the old mill\n    - "mill.old"\n    - \'mill.older\'   # the oldest\n    - \'mill.oldest\'\n  name: N\n');
  // a comment on the line of the first value of a map in brackets is inside too
  const item = 'content:\n  id: m\n  relationships:\n    - {destination: "shop.till", # the till\n       "label": "pays", ready: yes}\n    - destination: "shop.door"\n';
  assert.equal(save(item, (v) => { v.content.relationships[0].label = 'settles'; }), 'content:\n  id: m\n  relationships:\n    - destination: "shop.till" # the till\n      "label": "settles"\n      ready: yes\n    - destination: "shop.door"\n');
  // over several lines and no comment inside: on one line, where it starts, with the comment after the closing bracket
  const plainLines = 'content:\n  id: m\n  tags: {\n    zone: north,\n    tier: gold\n  }   # where\n  name: N\n';
  assert.equal(save(plainLines, (v) => { v.content.tags.zone = 'south'; }), 'content:\n  id: m\n  tags: {zone: south, tier: gold}   # where\n  name: N\n');
});

test('nested brackets: a list of lists and a map with a list in it, written back with their nesting', () => {
  assert.equal(save(MILL, (v) => { v.content.relationships[2].qualifiers[0].push('d'); }), MILL.replace('qualifiers: [[a, b], [c]]  # nested', 'qualifiers: [[a, b, d], [c]]  # nested'));
  assert.equal(save(MILL, (v) => { v.content.relationships[2].qualifiers.push(['e']); }), MILL.replace('qualifiers: [[a, b], [c]]  # nested', 'qualifiers: [[a, b], [c], ["e"]]  # nested'));
  const text = 'content:\n  id: m\n  tags: {zone: [north, east], tier: {level: 1, name: gold}}\n';
  assert.equal(save(text, (v) => { v.content.tags.zone.push('south'); }), 'content:\n  id: m\n  tags: {zone: [north, east, south], tier: {level: 1, name: gold}}\n');
  assert.equal(save(text, (v) => { v.content.tags.tier.name = 'silver'; }), 'content:\n  id: m\n  tags: {zone: [north, east], tier: {level: 1, name: silver}}\n');
});

test('an item of a list that is a map or a list in brackets: kept on its dash line, with its comment', () => {
  assert.equal(save(MILL, (v) => { v.content.relationships[3].label = 'stocks'; }), MILL.replace('{destination: "bakery.shelf", label: "fills"}', '{destination: "bakery.shelf", label: "stocks"}'));
  assert.equal(save(MILL, (v) => { v.content.relationships[3].qualifiers = ['Crate', 'Cart']; }), MILL.replace('{destination: "bakery.shelf", label: "fills"}', '{destination: "bakery.shelf", label: "fills", qualifiers: ["Crate", "Cart"]}'));
  assert.equal(save(MILL, (v) => { v.content.matrix[1].push('e'); }), MILL.replace('    - [c, d]  # row', '    - [c, d, e]  # row'));
  assert.equal(save(MILL, (v) => { v.content.matrix[0].shift(); }), MILL.replace('    - [a, b]', '    - [b]'));
  // the item next to it is not touched; an item that is added is a block of its own, as before
  const added = save(MILL, (v) => { v.content.matrix.push(['x', 'y']); });
  assert.deepEqual(lineDiff(MILL, added).removed, []);
});

test('the spacing inside the brackets is the file\'s: `[ a ]` and `{ k: v }` stay padded; a plain text with a comma, a bracket or a brace is quoted, because the brackets cannot hold it', () => {
  const text = 'content:\n  id: m\n  list: [ a, b ]\n  map: { k: v }\n';
  assert.equal(save(text, (v) => { v.content.list.push('c'); }), 'content:\n  id: m\n  list: [ a, b, c ]\n  map: { k: v }\n');
  assert.equal(save(text, (v) => { v.content.map.l = 'w'; }), 'content:\n  id: m\n  list: [ a, b ]\n  map: { k: v, l: w }\n');
  const out = save(MILL, (v) => { v.content.qualifiers.push('a, b', 'c]', 'it\'s'); });
  assert.ok(out.includes('qualifiers: [Sack, "Cart", \'Belt\', \'a, b\', \'c]\', \'it\'\'s\']'), out);
  const keys = save(MILL, (v) => { v.content.tags['k, l'] = 'v'; v.content.tags['z: y'] = 'w'; });
  assert.ok(keys.includes('{zone: north, tier: "gold", heat: on, "k, l": "v", "z: y": "w"}'), keys);
});

test('an empty collection that the edit fills is a block, as before: `[]` and `{}` are what the emitter writes for nothing', () => {
  const text = 'content:\n  id: m\n  tags: []\n  zone: {}   # none yet\n  name: N\n';
  assert.equal(save(text, (v) => { v.content.tags.push('a'); }), 'content:\n  id: m\n  tags:\n    - a\n  zone: {}   # none yet\n  name: N\n');
  assert.equal(save(text, (v) => { v.content.zone.k = 'v'; }), 'content:\n  id: m\n  tags: []\n  zone:   # none yet\n    k: v\n  name: N\n');
});

test('what the aligner keeps for a collection with an anchor, an alias or a tag in it stays a block that keeps them (wave 019); a collection beside it is in brackets', () => {
  const text = 'content:\n  id: m\n  qualifiers: [&a oven, *a]\n  tags: {zone: north}\n';
  const out = save(text, (v) => { v.content.tags.zone = 'south'; });
  assert.equal(out, 'content:\n  id: m\n  qualifiers: [&a oven, *a]\n  tags: {zone: south}\n', 'the one with the anchor is not touched, the other is in brackets');
  const changed = save(text, (v) => { v.content.qualifiers.push('x'); });
  assert.equal(changed, 'content:\n  id: m\n  qualifiers:\n    - &a oven\n    - *a\n    - x\n  tags: {zone: north}\n');
});

test('Windows line breaks and a byte-order mark are kept around a collection written back in brackets', () => {
  const text = MILL.replace(/\n/g, '\r\n');
  const out = save(text, (v) => { v.content.qualifiers.push('Crate'); v.content.matrix[1].push('e'); });
  assert.equal(out, text.replace('\'Belt\']', '\'Belt\', \'Crate\']').replace('[c, d]', '[c, d, e]'));
  const page = app.patchYamlText('﻿' + MILL, Object.assign(plain(app.parseYaml(MILL)), {}));
  assert.equal(page, '﻿' + MILL);
  const value = plain(app.parseYaml(MILL));
  value.content.replaces.push('x');
  assert.equal(app.patchYamlText('﻿' + MILL, value), '﻿' + MILL.replace('mill.older]', 'mill.older, x]'));
});

test('two collections that read the same: the one the edit changes is in brackets with its own spelling, the other stays as written', () => {
  const text = 'content:\n  elements:\n    - id: a\n      tags: {zone: north}\n    - id: b\n      tags: { zone:  north }\n';
  const out = save(text, (v) => { v.content.elements[1].tags.zone = 'south'; });
  assert.equal(out, 'content:\n  elements:\n    - id: a\n      tags: {zone: north}\n    - id: b\n      tags: { zone: south }\n');
  const first = save(text, (v) => { v.content.elements[0].tags.zone = 'south'; });
  assert.equal(first, 'content:\n  elements:\n    - id: a\n      tags: {zone: south}\n    - id: b\n      tags: { zone:  north }\n');
});

test('`.archicode.yaml` keeps the brackets too: the list of manifest paths and a facet\'s lists', () => {
  const text = 'settings:\n  manifests:\n    paths: [manifests/**, "more"]   # where\n  current: now\n';
  const value = plain(app.parseYaml(text));
  value.settings.manifests.paths.push('other');
  assert.equal(app.patchYamlText(text, value, true), 'settings:\n  manifests:\n    paths: [manifests/**, "more", "other"]   # where\n  current: now\n');
});

test('a file that already uses the mark characters, or a layout the aligner cannot follow, is saved as before', () => {
  const marked = 'content:\n  id: m\n  tags: {zone: north}   # \u0006 mark\n';
  const value = plain(app.parseYaml(marked));
  value.content.tags.zone = 'south';
  const out = app.patchYamlText(marked, value);
  assert.deepEqual(plain(app.parseYaml(out)), value);
  assert.equal(out, 'content:\n  id: m\n  tags:  # \u0006 mark\n    zone: south\n');
  const four = 'header:\n    kind: x\ncontent:\n    id: m\n    tags: {a: b}\n';
  const v4 = plain(app.parseYaml(four));
  v4.content.tags.c = 'd';
  assert.equal(app.patchYamlText(four, v4), app.serializeYamlValue(v4, 0));
});

test('files of every mix of block and flow shapes: every edit reads back, the result is a fixed point, and no mark is left', () => {
  let seed = 11; // a fixed sequence: the same files at each run
  const random = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
  const pick = (list) => list[Math.floor(random() * list.length)];
  const words = ['alpha', 'beta', 'oven', 'till', 'a.b', 'x-y', 'Redis', '3', "it's", 'a: b', 'c, d', 'on', 'yes', '[e]'];
  const quote = (w) => pick([JSON.stringify(w), "'" + w.replace(/'/g, "''") + "'", /[,:\[\]#']|^(on|yes|3)$/.test(w) ? JSON.stringify(w) : w]);
  const make = (depth) => {
    const r = random();
    if (depth > 3 || r < 0.35) return { text: quote(pick(words)) };
    const n = 1 + Math.floor(random() * 3);
    if (r < 0.65) return { list: Array.from({ length: n }, () => make(depth + 1)) };
    return { map: Array.from({ length: n }, (_, i) => ['k' + i + pick(['', 'x']), make(depth + 1)]) };
  };
  const flow = (node) => (node.text !== undefined ? node.text : node.list ? '[' + node.list.map(flow).join(', ') + ']' : '{' + node.map.map(([k, v]) => k + ': ' + flow(v)).join(', ') + '}');
  const write = (node, indent, prefix, lines) => {
    const pad = ' '.repeat(indent);
    if (node.text !== undefined) { lines.push(pad + prefix + ' ' + node.text); return; }
    const style = random();
    if (style < 0.55) { lines.push(pad + prefix + ' ' + flow(node) + pick(['', '  # flow'])); return; }
    if (style < 0.65) {
      const items = node.list ? node.list.map(flow) : node.map.map(([k, v]) => k + ': ' + flow(v));
      lines.push(pad + prefix + ' ' + (node.list ? '[' : '{'));
      items.forEach((item, i) => lines.push(pad + '  ' + item + (i < items.length - 1 ? ',' : '') + pick(['', '', '  # item'])));
      lines.push(pad + (node.list ? ']' : '}') + pick(['', '  # end']));
      return;
    }
    lines.push(pad + prefix);
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
  let bracketed = 0;
  for (let round = 0; round < 500; round++) {
    const root = { map: [['first', make(1)], ['second', make(1)], ['third', make(1)]] };
    const body = [];
    root.map.forEach(([k, v], i) => { if (i === 1) body.push(''); write(v, 2, k + ':', body); if (i === 0) body.push('  # between'); });
    const text = 'header:\n  kind: x\ncontent:\n' + body.join('\n') + '\n# end\n';
    let value;
    try { value = plain(app.parseYaml(text)); } catch (e) { continue; }
    files++;
    assert.equal(app.patchYamlText(text, plain(value)), text, 'no edit, no change:\n' + text);
    const edited = plain(value);
    const places = [];
    (function walk(node, path2) { if (node && typeof node === 'object') { places.push(path2); Object.keys(node).forEach((k) => walk(node[k], path2.concat(k))); } })(edited.content, []);
    let target = edited.content;
    for (const key of pick(places)) target = target[key];
    if (Array.isArray(target)) { if (random() < 0.5) target.push('new'); else target.splice(0, 1); }
    else if (random() < 0.5) target.added = 'new';
    else delete target[Object.keys(target)[0]];
    const out = app.patchYamlText(text, edited);
    assert.deepEqual(plain(app.parseYaml(out)), edited, 'the edit reads back:\n' + text + '\n--\n' + out);
    assert.equal(/[\u0001-\u0007]/.test(out), false, 'no mark is left');
    assert.equal(app.patchYamlText(out, plain(edited)), out, 'saving the result again changes nothing:\n' + out);
    if (/[\[{]/.test(lineDiff(text, out).added.join('\n'))) bracketed++;
  }
  assert.ok(files > 300, 'most of the files are usable');
  assert.ok(bracketed > 100, 'many of the edits keep brackets (' + bracketed + ')');
});

// ---- against the page of the tag archicode-0.18.0: a save that changes no collection in brackets writes the same bytes ----

const TAG = 'archicode-0.18.0';
let released = null;
try {
  released = execFileSync('git', ['show', TAG + ':src/main/resources/editor-webapp/standalone.html'], { cwd: REPO, encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'ignore'] });
} catch (e) {
  released = null; // no tag in this clone
}

/** The YAML files the repository ships as a workspace, an example or a fixture. */
function shippedYaml() {
  const roots = ['src/doc/examples', 'src/test/resources'];
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (/\.ya?ml$/.test(entry.name)) found.push(p);
    }
  };
  for (const root of roots) if (fs.existsSync(path.join(REPO, root))) walk(path.join(REPO, root));
  return found.sort();
}

test('every shipped file, saved with no edit and with an edit that changes no collection in brackets, is the same bytes as the page of archicode-0.18.0 writes', { skip: released === null ? 'the tag ' + TAG + ' is not in this clone' : false }, () => {
  const before = createApp({ html: released });
  let files = 0;
  let withBrackets = 0;
  for (const file of shippedYaml()) {
    const text = fs.readFileSync(file, 'utf8');
    const name = path.relative(REPO, file);
    let value;
    try {
      value = before.parseYamlAsModel(text);
    } catch (e) {
      continue; // not a file the editor reads (a TOML twin, a negative case)
    }
    if (value === null || typeof value !== 'object') continue;
    files++;
    if (/:\s*[\[{][^\]}\s]/.test(text)) withBrackets++;
    const edits = [
      (v) => v,
      (v) => { if (v.content && typeof v.content === 'object' && !Array.isArray(v.content)) v.content.zz_probe = 'x'; return v; },
      (v) => { if (v.content && typeof v.content === 'object' && typeof v.content.name === 'string') v.content.name = v.content.name + ' (edited)'; return v; }
    ];
    for (const edit of edits) {
      const a = edit(before.parseYamlAsModel(text));
      const b = edit(app.parseYamlAsModel(text));
      assert.equal(app.patchYamlText(text, b), before.patchYamlText(text, a), name);
    }
  }
  assert.ok(files > 100, 'many shipped files (' + files + ')');
  assert.ok(withBrackets > 20, 'some of them hold brackets (' + withBrackets + ')');
});

test('the page of archicode-0.18.0 wrote the block where this page keeps the brackets (the cases above fail on it)', { skip: released === null ? 'the tag ' + TAG + ' is not in this clone' : process.env.ARCHICODE_EDITOR_HTML ? 'another page is run for every test (ARCHICODE_EDITOR_HTML)' : false }, () => {
  const before = createApp({ html: released });
  const value = plain(before.parseYaml(MILL));
  value.content.qualifiers.push('Crate');
  const old = before.patchYamlText(MILL, value);
  assert.ok(old.includes('  qualifiers:   # how it ships\n') || old.includes('  qualifiers:  # how it ships\n'), old);
  const value2 = plain(app.parseYaml(MILL));
  value2.content.qualifiers.push('Crate');
  assert.ok(app.patchYamlText(MILL, value2).includes('  qualifiers: [Sack, "Cart", \'Belt\', \'Crate\']   # how it ships\n'));
});

// ---- every shipped file, an edit of each collection in brackets: the result reads back, and only the lines of that collection differ from what the old page wrote ----

test('every collection in brackets of the shipped files, edited: it reads back as the edit says, and the file differs from the original in the lines of that collection only', () => {
  let edits = 0;
  let kept = 0;
  for (const file of shippedYaml()) {
    const text = fs.readFileSync(file, 'utf8');
    const name = path.relative(REPO, file);
    if (!/:\s*[\[{][^\]}\s]|^\s*-\s*[\[{][^\]}\s]/m.test(text)) continue;
    let model;
    try {
      model = app.parseYamlAsModel(text);
    } catch (e) {
      continue;
    }
    // every list and every map that is not empty, by path
    const places = [];
    (function walk(node, trail) {
      if (node && typeof node === 'object') {
        if (trail.length > 0 && Object.keys(node).length > 0) places.push(trail);
        Object.keys(node).forEach((k) => walk(node[k], trail.concat(k)));
      }
    })(model, []);
    for (const trail of places.slice(0, 60)) {
      const edited = app.parseYamlAsModel(text);
      let target = edited;
      for (const key of trail) target = target[key];
      if (Array.isArray(target)) target.push('probe');
      else target.zz_probe = 'x';
      const out = app.patchYamlText(text, edited);
      assert.equal(app.serializeYamlValue(app.parseYamlAsModel(out), 0), app.serializeYamlValue(edited, 0), name + ' ' + trail.join('.') + ' reads back');
      assert.equal(/[\u0001-\u0007]/.test(out), false, name + ' no mark');
      edits++;
      if (lineDiff(text, out).added.some((line) => /[\[{]/.test(line))) kept++;
    }
  }
  assert.ok(edits > 200, 'many edits (' + edits + ')');
  assert.ok(kept > 20, 'some keep brackets (' + kept + ')');
});
