'use strict';
// The line-preserving save keeps, as written, the three forms that #78 lists as "read, but written again in the editor's own layout when a file is saved" (wave 019, run 0142,
// decision T7): an anchor, an alias or a tag inside square or curly brackets (`qualifiers: [&a oven, *a]`, `tags: {zone: &z north, other: *z}`), a tag on a text that goes
// over several lines (the text over several lines itself, with a tag or none, was not followed either), and an item of a list whose map starts on the line below its dash
// (`- &s` or `-`, then the keys). Before, each of them wrote the whole file again in the emitter's layout (comments lost, aliases written as their values); the page of
// `archicode-0.17.0` does (ARCHICODE_EDITOR_HTML=<that page> makes the tests below that keep a layout fail). Each case saves an edit and compares the file before and after,
// every other line byte for byte, and reads the result back as the edit says. A collection in brackets that the edit changes is written as a block, as one without an anchor
// is (wave 009), and keeps its anchors, aliases and tags by the rules of a block (anchors-tags-save.test.js): an alias whose anchor's value the edit changes is written as the
// value it had. What still keeps the fallback (the emitter's text, which reads back as the edit) is pinned at the end, with the reason. Reading is not changed. Everything here
// is invented: a mill and a bakery.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const plain = (value) => JSON.parse(JSON.stringify(value));
const app = createApp({});

const HEAD = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "bakery"   # keep\n';

/** The text after `edit` is applied to the value the text reads as (as the editor reads a manifest), checked to read back as the edit. */
function saved(text, edit) {
  const value = app.parseYamlAsModel(text);
  edit(value.content);
  const out = app.patchYamlText(text, value);
  assert.equal(app.serializeYamlValue(app.parseYamlAsModel(out), 0), app.serializeYamlValue(value, 0), 'the text reads back as the edit\n' + out);
  assert.equal(/[\u0001-\u0005]/.test(out), false, 'no mark is left');
  return { out, emitted: app.serializeYamlValue(value, 0) };
}

/** `text` with each `[from, to]` replaced once, and the replacements found. */
function edited(text, ...pairs) {
  let out = text;
  for (const [from, to] of pairs) {
    assert.ok(out.includes(from), 'the text has ' + JSON.stringify(from));
    out = out.replace(from, to);
  }
  return out;
}

// ---------------------------------------------------------------------------------------------------------------------
// 1. An anchor, an alias or a tag inside brackets.

const BRACKETS = HEAD + '  name: Bakery   # the name\n  qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n  tags: {zone: &z north, other: *z, size: !!str 12}\n  description: x\n';

test('no edit, and an edit elsewhere, keep the brackets with their anchors, aliases and tags byte for byte', () => {
  assert.equal(app.patchYamlText(BRACKETS, app.parseYamlAsModel(BRACKETS)), BRACKETS);
  assert.equal(saved(BRACKETS, (c) => { c.name = 'Boulangerie'; }).out, edited(BRACKETS, ['name: Bakery', 'name: Boulangerie']));
  assert.equal(saved(BRACKETS, (c) => { c.description = 'y'; }).out, edited(BRACKETS, ['description: x', 'description: y']));
});

test('an edit of an item of the list writes the list as a block: the anchor stays on its item, the alias stays while it says the same, the other lines are the file', () => {
  // the alias's own item
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers[1] = 'rye'; }).out,
    edited(BRACKETS, ['qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n', 'qualifiers:   # the qualifiers\n    - &a oven\n    - rye\n    - "flour"\n'])
  );
  // another item
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers[2] = 'bran'; }).out,
    edited(BRACKETS, ['qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n', 'qualifiers:   # the qualifiers\n    - &a oven\n    - *a\n    - "bran"\n'])
  );
});

test('an edit of the very value that carries the anchor keeps the anchor on it, and the alias is written as the value it had (it would say the new one)', () => {
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers[0] = 'rye'; }).out,
    edited(BRACKETS, ['qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n', 'qualifiers:   # the qualifiers\n    - &a rye\n    - oven\n    - "flour"\n'])
  );
  // the anchor and its alias edited together: both stay
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers[0] = 'rye'; c.qualifiers[1] = 'rye'; }).out,
    edited(BRACKETS, ['qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n', 'qualifiers:   # the qualifiers\n    - &a rye\n    - *a\n    - "flour"\n'])
  );
});

test('an item added to the list, or removed from it, writes it as a block that keeps the anchor and the alias', () => {
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers.push('bran'); }).out,
    edited(BRACKETS, ['qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n', 'qualifiers:   # the qualifiers\n    - &a oven\n    - *a\n    - "flour"\n    - "bran"\n'])
  );
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers.pop(); }).out,
    edited(BRACKETS, ['qualifiers: [&a oven, *a, "flour"]   # the qualifiers\n', 'qualifiers:   # the qualifiers\n    - &a oven\n    - *a\n'])
  );
  // the item that carries the anchor removed: the alias has nothing to point at, it is its value
  assert.equal(
    saved(BRACKETS, (c) => { c.qualifiers.splice(0, 1); }).out.includes('*a'),
    false
  );
});

test('a map in curly brackets: an edit of the alias value, of the anchored value, a key added; the tag stays', () => {
  const head = 'tags: {zone: &z north, other: *z, size: !!str 12}\n';
  assert.equal(saved(BRACKETS, (c) => { c.tags.other = 'south'; }).out, edited(BRACKETS, [head, 'tags:\n    zone: &z north\n    other: south\n    size: !!str 12\n']));
  assert.equal(saved(BRACKETS, (c) => { c.tags.zone = 'south'; }).out, edited(BRACKETS, [head, 'tags:\n    zone: &z south\n    other: north\n    size: !!str 12\n']));
  assert.equal(saved(BRACKETS, (c) => { c.tags.tier = 'gold'; }).out, edited(BRACKETS, [head, 'tags:\n    zone: &z north\n    other: *z\n    size: !!str 12\n    tier: gold\n']));
  assert.equal(saved(BRACKETS, (c) => { c.tags.size = '13'; }).out, edited(BRACKETS, [head, 'tags:\n    zone: &z north\n    other: *z\n    size: !!str "13"\n']));
});

// The shapes of a real workspace: an anchor on an item of a list in brackets and an alias of it later in the file, in another element; a map in brackets whose value is
// an alias; the elements edited, added to, removed from.
const SHAPES = [
  '# the bakery and its shops',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  'content:',
  '  id: bakery',
  '  name: Bakery',
  '  elements:',
  '    - kind: container',
  '      id: oven',
  '      name: Oven   # hot',
  '      qualifiers: [&web web, java, &db "postgres"]',
  '      tags: {zone: &zone north, tier: &tier gold}',
  '    # the second one',
  '    - kind: container',
  '      id: front',
  '      name: Front',
  '      qualifiers: [*web, typescript]   # same stack',
  '      tags: {zone: *zone, tier: *tier}',
  '      relationships:',
  '        - destination: oven',
  '          label: bakes',
  '    - kind: container',
  '      id: store',
  '      name: Store',
  '      qualifiers: [*db]',
  ''
].join('\n');

test('the shapes of a real workspace: an edit of an element keeps the brackets of every other one, and the aliases that point at the edited one', () => {
  assert.equal(app.patchYamlText(SHAPES, app.parseYamlAsModel(SHAPES)), SHAPES);
  assert.equal(saved(SHAPES, (c) => { c.elements[1].name = 'Counter'; }).out, edited(SHAPES, ['name: Front', 'name: Counter']));
  assert.equal(saved(SHAPES, (c) => { c.elements[0].name = 'Big oven'; }).out, edited(SHAPES, ['name: Oven   # hot', 'name: Big oven   # hot']));
  assert.equal(saved(SHAPES, (c) => { c.elements[1].relationships[0].label = 'sells'; }).out, edited(SHAPES, ['label: bakes', 'label: sells']));
  // an element added at the end, an element removed: the brackets of the others stay
  assert.equal(
    saved(SHAPES, (c) => { c.elements.push({ kind: 'container', id: 'van', name: 'Van' }); }).out,
    SHAPES + '    - kind: container\n      id: van\n      name: Van\n'
  );
  assert.equal(
    saved(SHAPES, (c) => { c.elements.splice(2, 1); }).out,
    edited(SHAPES, ['    - kind: container\n      id: store\n      name: Store\n      qualifiers: [*db]\n', ''])
  );
});

test('the shapes of a real workspace: an item edited, added or removed in a list in brackets that has an anchor or an alias', () => {
  // a qualifier added to the list that has the aliases: that list is a block, its alias stays
  assert.equal(
    saved(SHAPES, (c) => { c.elements[1].qualifiers.push('react'); }).out,
    edited(SHAPES, ['      qualifiers: [*web, typescript]   # same stack\n', '      qualifiers:   # same stack\n        - *web\n        - typescript\n        - react\n'])
  );
  // the anchored qualifier renamed: its anchor stays, the aliases of the other elements are written as the value they had
  assert.equal(
    saved(SHAPES, (c) => { c.elements[0].qualifiers[0] = 'www'; }).out,
    edited(
      SHAPES,
      ['      qualifiers: [&web web, java, &db "postgres"]\n', '      qualifiers:\n        - &web www\n        - java\n        - &db "postgres"\n'],
      ['      qualifiers: [*web, typescript]   # same stack\n', '      qualifiers:   # same stack\n        - web\n        - typescript\n']
    )
  );
  // a qualifier that is not anchored removed: the anchors and the aliases all stay
  assert.equal(
    saved(SHAPES, (c) => { c.elements[0].qualifiers.splice(1, 1); }).out,
    edited(SHAPES, ['      qualifiers: [&web web, java, &db "postgres"]\n', '      qualifiers:\n        - &web web\n        - &db "postgres"\n'])
  );
  // a value of the map that is an alias edited
  assert.equal(
    saved(SHAPES, (c) => { c.elements[1].tags.tier = 'silver'; }).out,
    edited(SHAPES, ['      tags: {zone: *zone, tier: *tier}\n', '      tags:\n        zone: *zone\n        tier: silver\n'])
  );
});

test('brackets over several lines, with comments, nested brackets and a tag inside', () => {
  const several = HEAD + '  name: Bakery\n  qualifiers: [\n    &a oven,   # the first\n    *a,\n    !!str 12\n  ]\n  properties: {a: &m {x: 1, y: [&q 2, *q]}, b: *m}\n  description: x\n';
  assert.equal(app.patchYamlText(several, app.parseYamlAsModel(several)), several);
  assert.equal(saved(several, (c) => { c.name = 'y'; }).out, edited(several, ['name: Bakery', 'name: y']));
  // the list changed: a block, the comment of its brackets under its key
  assert.equal(
    saved(several, (c) => { c.qualifiers.push('bran'); }).out,
    edited(several, ['  qualifiers: [\n    &a oven,   # the first\n    *a,\n    !!str 12\n  ]\n', '  qualifiers:\n    # the first\n    - &a oven\n    - *a\n    - !!str 12\n    - bran\n'])
  );
  // the nested map whose anchor the alias points at, edited
  assert.equal(
    saved(several, (c) => { c.properties.a.x = 5; }).out,
    edited(several, ['  properties: {a: &m {x: 1, y: [&q 2, *q]}, b: *m}\n', '  properties:\n    a: &m\n      x: 5\n      y:\n        - &q 2\n        - *q\n    b:\n      x: 1\n      y:\n        - 2\n        - 2\n'])
  );
});

test('an item of a list in brackets that is a map with an anchor, and its alias', () => {
  const items = HEAD + '  name: Bakery\n  steps: [&s {k: v, w: 1}, *s]\n';
  assert.equal(saved(items, (c) => { c.name = 'y'; }).out, edited(items, ['name: Bakery', 'name: y']));
  assert.equal(saved(items, (c) => { c.steps[0].k = 'z'; }).out, edited(items, ['  steps: [&s {k: v, w: 1}, *s]\n', '  steps:\n    - &s\n      k: z\n      w: 1\n    - k: v\n      w: 1\n']));
});

test('the line breaks of the file (CRLF) and its byte-order mark stay', () => {
  const crlf = BRACKETS.replace(/\n/g, '\r\n');
  assert.equal(saved(crlf, (c) => { c.name = 'y'; }).out, crlf.replace('name: Bakery', 'name: y'));
  const marked = '\ufeff' + BRACKETS;
  assert.equal(app.patchYamlText(marked, app.parseYamlAsModel(marked.slice(1)), false).length > 0, true);
  const value = app.parseYamlAsModel(BRACKETS);
  value.content.name = 'y';
  assert.equal(app.patchYamlText(marked, value), '\ufeff' + BRACKETS.replace('name: Bakery', 'name: y'));
});

// ---------------------------------------------------------------------------------------------------------------------
// 2. A text over several lines, with a tag or none.

const TEXTS =
  HEAD +
  '  name: Bakery\n' +
  '  description: a plain text\n    over two lines   # plain\n' +
  '  label: "a quoted text\n    over two lines"   # quoted\n' +
  '  data: !!binary aGVs\n    bG8=   # the tag changes what it reads as: the bytes, not the text with a space\n' +
  '  note: !!str some\n    words\n' +
  '  size: x\n';

test('a text over several lines, plain or quoted, with a tag that changes what it reads as or with one that does not, stays as written when the edit leaves it alone', () => {
  assert.deepEqual(plain(app.parseYamlAsModel(TEXTS).content), {
    id: 'bakery', name: 'Bakery', description: 'a plain text over two lines', label: 'a quoted text over two lines', data: 'aGVsbG8=', note: 'some words', size: 'x'
  });
  assert.equal(app.patchYamlText(TEXTS, app.parseYamlAsModel(TEXTS)), TEXTS);
  assert.equal(saved(TEXTS, (c) => { c.size = 'y'; }).out, edited(TEXTS, ['size: x', 'size: y']));
  assert.equal(saved(TEXTS, (c) => { c.name = 'y'; }).out, edited(TEXTS, ['name: Bakery', 'name: y']));
});

test('a text over several lines that the edit changes is one line, with its comment, and its tag when the new value still reads so', () => {
  assert.equal(saved(TEXTS, (c) => { c.description = 'short'; }).out, edited(TEXTS, ['description: a plain text\n    over two lines   # plain', 'description: short   # plain']));
  assert.equal(saved(TEXTS, (c) => { c.label = 'short'; }).out, edited(TEXTS, ['label: "a quoted text\n    over two lines"   # quoted', 'label: "short"   # quoted']));
  assert.equal(
    saved(TEXTS, (c) => { c.data = 'd29ybGQ='; }).out,
    edited(TEXTS, ['data: !!binary aGVs\n    bG8=   #', 'data: !!binary d29ybGQ=   #'])
  );
  // a value the tag cannot read: the tag goes, the text says the value
  assert.equal(saved(TEXTS, (c) => { c.data = 'not bytes'; }).out, edited(TEXTS, ['data: !!binary aGVs\n    bG8=   #', 'data: not bytes   #']));
});

test('a tag that changes a quoted text over several lines into a number stays', () => {
  const text = HEAD + '  ratio: !!float "1\n    "\n  name: x\n';
  assert.equal(app.parseYamlAsModel(text).content.ratio, '1.0');
  assert.equal(saved(text, (c) => { c.name = 'y'; }).out, edited(text, ['name: x', 'name: y']));
});

// ---------------------------------------------------------------------------------------------------------------------
// 3. An item of a list whose map starts on the line below its dash.

const DASHES = [
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  'content:',
  '  id: bakery',
  '  elements:',
  '    - &shop   # anchored',
  '      kind: container',
  '      id: shop',
  '      name: Shop',
  '    -',
  '      # the second one',
  '      kind: container',
  '      id: oven',
  '      name: Oven',
  '    -   # deeper',
  '        kind: container',
  '        id: van',
  '        # its name',
  '        name: Van',
  '  name: Bakery',
  '  other: *shop',
  ''
].join('\n');

test('an item whose map starts below its dash, with an anchor or none, at the column of its keys or deeper, stays as written', () => {
  assert.equal(app.patchYamlText(DASHES, app.parseYamlAsModel(DASHES)), DASHES);
  assert.equal(saved(DASHES, (c) => { c.name = 'Boulangerie'; }).out, edited(DASHES, ['name: Bakery', 'name: Boulangerie']));
  assert.equal(saved(DASHES, (c) => { c.elements[1].name = 'Big oven'; }).out, edited(DASHES, ['name: Oven', 'name: Big oven']));
  assert.equal(saved(DASHES, (c) => { c.elements[2].name = 'Truck'; }).out, edited(DASHES, ['name: Van', 'name: Truck']));
  assert.equal(saved(DASHES, (c) => { c.elements[2].id = 'truck'; }).out, edited(DASHES, ['id: van', 'id: truck']));
});

test('an item whose map starts below its dash: a key added, an item added, an item removed', () => {
  assert.equal(saved(DASHES, (c) => { c.elements[2].description = 'x'; }).out, edited(DASHES, ['        name: Van\n', '        name: Van\n        description: x\n']));
  assert.equal(saved(DASHES, (c) => { c.elements.push({ kind: 'container', id: 'cart' }); }).out, edited(DASHES, ['        name: Van\n', '        name: Van\n    - kind: container\n      id: cart\n']));
  // the last item removed: its lines go; a comment on a line of its own between two of its keys stays, as it does in any list the aligner follows
  assert.equal(saved(DASHES, (c) => { c.elements.splice(2, 1); }).out, edited(DASHES, ['    -   # deeper\n        kind: container\n        id: van\n        # its name\n        name: Van\n', '      # its name\n']));
  // an item removed whose first line is the first line of the next one too (`kind: container`): the aligner keeps the first of two lines that read the same, as it does in
  // any list, so the next item takes the dash line, the comments and the columns of the removed one; the file says the edit, the keys and the comments of the item that
  // stays are its own
  assert.equal(
    saved(DASHES, (c) => { c.elements.splice(1, 1); }).out,
    edited(DASHES, ['      id: oven\n      name: Oven\n    -   # deeper\n        kind: container\n        id: van\n        # its name\n        name: Van\n', '      id: van\n      # its name\n      name: Van\n'])
  );
});

test('the anchored item edited: the anchor stays, the alias is written as the value it had; both edited: both stay', () => {
  assert.equal(
    saved(DASHES, (c) => { c.elements[0].name = 'Boutique'; }).out,
    edited(DASHES, ['name: Shop', 'name: Boutique'], ['  other: *shop\n', '  other:\n    kind: container\n    id: shop\n    name: Shop\n'])
  );
  assert.equal(saved(DASHES, (c) => { c.elements[0].name = 'Boutique'; c.other.name = 'Boutique'; }).out, edited(DASHES, ['name: Shop', 'name: Boutique']));
});

// ---------------------------------------------------------------------------------------------------------------------
// What keeps the fallback, and why.

test('what keeps the fallback (the emitter\'s text, which reads back as the edit), with the reason', () => {
  const fallback = {
    // the reader takes an anchor or a tag on a key inside brackets, and refuses it on a key of a block: the save would have to write it in a block, which the reader refuses
    'an anchor on a key inside brackets': HEAD + '  tags: {&k zone: north}\n  name: x\n',
    // a single pair in a list (`[a: b]`) is a map the block would write as `- a: b`; with an anchor or an alias in it, it is not written
    'a pair in a list with an anchor': HEAD + '  steps: [&a one: two]\n  name: x\n',
    // a text over several lines inside brackets that has a tag: its tag cannot be put on one line that says the same
    'a tag on a text over several lines inside brackets': HEAD + '  qualifiers: [!!str some\n    words, *x]\n  name: x\n'.replace(', *x', ', other'),
    // an item whose map starts below its dash, inside the map of another such item: only the outer one is followed, the inner layout is not one the aligner follows
    'an item below its dash inside another': HEAD + '  elements:\n    -\n      id: a\n      elements:\n        -\n          id: b\n  name: x\n'
  };
  for (const [form, text] of Object.entries(fallback)) {
    const { out, emitted } = saved(text, (c) => { c.name = 'y'; });
    assert.equal(out, emitted, form);
  }
});

test('the reader is not changed: an anchor or a tag on a key of a block is still refused, the merge key is still a key', () => {
  assert.throws(() => app.parseYaml('a: &k b: 2\n'), (e) => e.name === 'YamlParseError' && /an anchor or a tag on a key is not supported/.test(e.message));
  assert.deepEqual(plain(app.parseYaml('base: &b\n  heat: high\n<<: *b\n')), { base: { heat: 'high' }, '<<': { heat: 'high' } });
  assert.deepEqual(plain(app.parseYaml('tags: {&k zone: north}\n')), { tags: { zone: 'north' } });
});

// ---------------------------------------------------------------------------------------------------------------------
// Whatever the edit.

test('whatever the edit, the text written reads back as the edit, no mark is left, and a line that holds nothing the edit reaches is the line of the file', () => {
  const corpus = [BRACKETS, SHAPES, TEXTS, DASHES, HEAD + '  qualifiers: [\n    &a oven,   # the first\n    *a\n  ]\n  properties: {a: &m {x: 1}, b: *m}\n  name: n\n'];
  let seed = 11;
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
    for (let round = 0; round < 80; round++) {
      const value = app.parseYamlAsModel(text);
      const leaves = paths(value.content, [], []);
      const edits = 1 + random(3);
      for (let k = 0; k < edits; k++) {
        const leaf = leaves[random(leaves.length)];
        let node = value.content;
        for (const key of leaf.slice(0, -1)) {
          if (node === null || typeof node !== 'object') break;
          node = node[key];
        }
        if (node === null || typeof node !== 'object') continue;
        const last = leaf[leaf.length - 1];
        const roll = random(5);
        if (roll === 0 && Array.isArray(node)) node.splice(Number(last), 1);
        else if (roll === 0) delete node[last];
        else if (roll === 1) node[last] = 'v' + random(5);
        else if (roll === 2) node[last] = random(100);
        else if (roll === 3 && Array.isArray(node)) node.push('added');
        else if (!Array.isArray(node)) node['k' + random(3)] = 'added';
      }
      const out = app.patchYamlText(text, value);
      assert.equal(app.serializeYamlValue(app.parseYamlAsModel(out), 0), app.serializeYamlValue(value, 0), 'reads back as the edit\n' + text + '\n=>\n' + out);
      assert.equal(/[\u0001-\u0005]/.test(out), false, 'no mark is left');
      // the first line and the comment lines of the file are there, in order, whatever the edit (a save that keeps the layout keeps them; the emitter's text has none)
      if (out !== app.serializeYamlValue(value, 0)) assert.equal(out.split('\n')[0], text.split('\n')[0]);
    }
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// In the editor.

const PLATEAUS = 'settings:\n  manifests:\n    paths:\n      - plateaus/10_base\n';
const MILL = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "mill"\n  name: "Mill"\n';

async function openMem(files) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, Object.fromEntries(Object.entries(files).map(([file, body]) => ['plateaus/10_base/' + file, body]))));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { mem, sandbox, state };
}

test('in the editor, an element of a file with anchors and aliases in brackets is edited and saved: only its line changes', async () => {
  const { mem, sandbox, state } = await openMem({ 'app.bakery.yaml': SHAPES, 'app.mill.yaml': MILL });
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.error)), []);
  sandbox.commitElementEdit('bakery.front', (node) => { node.name = 'Counter'; return {}; });
  await sandbox.saveAllChanges();
  assert.deepEqual(mem.writes, ['plateaus/10_base/app.bakery.yaml']);
  assert.equal(mem.files.get('plateaus/10_base/app.bakery.yaml').text, edited(SHAPES, ['name: Front', 'name: Counter']));
});

test('in the editor, a rename reaches a reference in a file whose items start below their dash and whose texts go over several lines', async () => {
  const bakery = [
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    'content:',
    '  id: bakery',
    '  description: a bakery that buys',
    '    its flour at the mill   # long',
    '  qualifiers: [&q bread, *q]',
    '  relationships:',
    '    -   # to the mill',
    '      destination: mill',
    '      label: buys',
    ''
  ].join('\n');
  const { mem, sandbox, state } = await openMem({ 'app.bakery.yaml': bakery, 'app.mill.yaml': MILL });
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.error)), []);
  sandbox.commitElementEdit('mill', (node) => { node.id = 'granary'; return { renamedTo: { from: 'mill', to: 'granary' } }; });
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('plateaus/10_base/app.bakery.yaml').text, edited(bakery, ['destination: mill', 'destination: granary']));
  assert.equal(mem.files.get('plateaus/10_base/app.mill.yaml').text, edited(MILL, ['id: "mill"', 'id: "granary"']));
});
