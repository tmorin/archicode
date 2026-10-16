'use strict';
// The editor keeps the quotes of a manifest (wave 010, run 0052, issue #45). A value that a save writes anew (the id of a rename, the `parent` and the references of
// a move, the `replaces` of "Write replaces") is written in the quoting the file uses: the line it replaces keeps its style, a line added takes the style of the lines
// next to it, then of the lines with the same key, then of the file, and plain when the file has no quote of its own. Only the value changes in a diff of the saved file;
// the files that no edit reaches, and the edits that write no string, are byte for byte what they were. The kernel is the real embedded module.
// Everything here is invented: a depot, a hall, a stock and a row of shelves.
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

// ---- the same invented manifests written in the three ways: double quotes, single quotes, none ----

const STYLES = {
  double: (text) => '"' + text + '"',
  single: (text) => "'" + text + "'",
  plain: (text) => text
};

/** The manifests of the depot and the hall in the quoting `style`. `version: 1` reads as a number, so every file quotes it, whatever its style. */
function manifests(style) {
  const q = STYLES[style];
  const one = style === 'plain' ? '"1"' : q('1');
  const file = (kind, parent, id, name, body) => [
    '# the manifest of ' + id,
    'header:',
    '  kind: ' + q('archicode.morin.io/' + kind),
    '  version: ' + one,
    ...(parent ? ['  parent: ' + q(parent)] : []),
    '',
    'content:',
    '  id: ' + q(id),
    '  name: ' + q(name),
    ...(body || []),
    '# end of ' + id,
    ''
  ].join('\n');
  return {
    'app.depot.yaml': file('system', null, 'depot', 'Depot'),
    'app.hall.yaml': file('system', null, 'hall', 'Hall'),
    // a container with a component inside the file, one relationship each way
    'app.depot.stock.yaml': file('container', 'depot', 'stock', 'Stock', [
      '  description: ' + q('Counts the crates on the racks.'),
      '  elements:',
      '    - kind: ' + q('component'),
      '      id: ' + q('counts'),
      '      name: ' + q('Counts'),
      '      description: ' + q('The count of each crate.'),
      '      relationships:',
      '        - destination: ' + q('hall.picker'),
      '          label: ' + q('tells')
    ]),
    'app.hall.picker.yaml': file('container', 'hall', 'picker', 'Picker', [
      '  relationships:',
      '    - destination: ' + q('depot.stock'),
      '      label: ' + q('counts with'),
      '    - destination: ' + q('depot.stock.counts'),
      '      label: ' + q('reads')
    ]),
    'app.depot.shelves.yaml': file('container', 'depot', 'shelves', 'Shelves', ['  description: ' + q('Holds the crates in rows.')])
  };
}
/** The plateau before: the shelves are `crates` there (same description, the only two containers of the depot that changed: a candidate for "Write replaces"). */
function before(style) {
  const files = manifests(style);
  const crates = files['app.depot.shelves.yaml'].replace(/shelves/g, 'crates').replace(/Shelves/g, 'Crates');
  delete files['app.depot.shelves.yaml'];
  files['app.depot.crates.yaml'] = crates;
  return files;
}

const PLATEAUS = 'settings:\n  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n    - id: target\n      name: Target\n      path: plateaus/20_target\n';
const dir = (name, files) => Object.fromEntries(Object.entries(files).map(([file, body]) => ['plateaus/' + name + '/' + file, body]));
const path = (file) => 'plateaus/20_target/' + file;

/** The workspace opened as the editor opens a folder, the target drawn and compared with the base. */
async function open(files, baseFiles) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': PLATEAUS }, dir('10_base', baseFiles || files), dir('20_target', files)));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  await sandbox.setCompareTo('base');
  return { sandbox, state, mem };
}
const saved = (mem, file) => mem.files.get(path(file)).text;
/** The names of the target files whose text is not the original. */
const changed = (mem, files) => Object.keys(files).filter((file) => saved(mem, file) !== files[file]);
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

for (const style of ['double', 'single']) {
  const q = STYLES[style];
  const name = style + ' quotes';

  test('move and write replaces, a file with ' + name + ': the new parent, the added lists and the references are written with them, and nothing else differs', async () => {
    const files = manifests(style);
    const { sandbox, state, mem } = await open(files, before(style));
    const result = sandbox.commitMoveElement('depot.stock', 'application', 'hall', { writeReplaces: true });
    assert.deepEqual(plain(result), { ok: true, reference: 'hall.stock', replaces: 2 });
    await sandbox.saveAllChanges();
    assert.deepEqual(changed(mem, files), ['app.depot.stock.yaml', 'app.hall.picker.yaml']);
    assert.deepEqual(lineDiff(files['app.depot.stock.yaml'], saved(mem, 'app.depot.stock.yaml')), {
      removed: ['  parent: ' + q('depot')],
      added: ['  parent: ' + q('hall'), '      replaces:', '        - ' + q('depot.stock.counts'), '  replaces:', '    - ' + q('depot.stock')]
    }, 'the parent is the value that changed, the two lists are the lines more');
    // the element inside the file says it too, in its own list
    assert.ok(saved(mem, 'app.depot.stock.yaml').includes('      replaces:\n        - ' + q('depot.stock.counts') + '\n'), 'the component inside the file');
    assert.deepEqual(lineDiff(files['app.hall.picker.yaml'], saved(mem, 'app.hall.picker.yaml')), {
      removed: ['    - destination: ' + q('depot.stock'), '    - destination: ' + q('depot.stock.counts')],
      added: ['    - destination: ' + q('hall.stock'), '    - destination: ' + q('hall.stock.counts')]
    }, 'both references follow, each in the quotes it had');
    // nothing else of the file is touched: the comments, the blank line and the final line break are the original's
    for (const file of ['app.depot.stock.yaml', 'app.hall.picker.yaml']) {
      assert.ok(saved(mem, file).startsWith('# the manifest of ') && saved(mem, file).endsWith('\n# end of ' + (file.includes('stock') ? 'stock' : 'picker') + '\n'), file);
      assert.equal(saved(mem, file).split('\n').length - files[file].split('\n').length, file.includes('stock') ? 4 : 0, 'the lines added, no other');
    }
    // the file is read the same way by the editor
    const again = createApp({});
    await again.loadWorkspace(mem.handle);
    assert.ok(again.__state().index.application.has('hall.stock.counts') && again.__state().index.application.get('hall.stock').replaces.includes('depot.stock'));
    assert.equal(state.relationshipStats.dangling, 0);
  });

  test('rename an id, a file with ' + name + ': the id, the parents of the files below it and the references that follow keep their quotes', async () => {
    const files = manifests(style);
    const { sandbox, mem } = await open(files);
    sandbox.commitElementEdit('depot.stock', (node) => { node.id = 'store'; return { renamedTo: { from: 'depot.stock', to: 'depot.store' } }; });
    await sandbox.saveAllChanges();
    assert.deepEqual(changed(mem, files), ['app.depot.stock.yaml', 'app.hall.picker.yaml']);
    assert.deepEqual(lineDiff(files['app.depot.stock.yaml'], saved(mem, 'app.depot.stock.yaml')), { removed: ['  id: ' + q('stock')], added: ['  id: ' + q('store')] });
    assert.deepEqual(lineDiff(files['app.hall.picker.yaml'], saved(mem, 'app.hall.picker.yaml')), {
      removed: ['    - destination: ' + q('depot.stock'), '    - destination: ' + q('depot.stock.counts')],
      added: ['    - destination: ' + q('depot.store'), '    - destination: ' + q('depot.store.counts')]
    });
  });

  test('"Write replaces", a file with ' + name + ': the one `replaces` added is written with them', async () => {
    const files = manifests(style);
    const { sandbox, mem } = await open(files, before(style));
    click(sandbox, { 'data-action': 'accept-candidate', 'data-layer': 'application', 'data-from': 'depot.crates', 'data-to': 'depot.shelves' });
    await sandbox.saveAllChanges();
    assert.deepEqual(changed(mem, files), ['app.depot.shelves.yaml']);
    assert.deepEqual(lineDiff(files['app.depot.shelves.yaml'], saved(mem, 'app.depot.shelves.yaml')), { removed: [], added: ['  replaces:', '    - ' + q('depot.crates')] });
    assert.ok(saved(mem, 'app.depot.shelves.yaml').endsWith('  replaces:\n    - ' + q('depot.crates') + '\n# end of shelves\n'));
  });
}

test('a file with strings that are not quoted stays that way: the moved parent, the references and the added lists are written plain', async () => {
  const files = manifests('plain');
  const { sandbox, mem } = await open(files, before('plain'));
  assert.equal(sandbox.commitMoveElement('depot.stock', 'application', 'hall', { writeReplaces: true }).ok, true);
  await sandbox.saveAllChanges();
  assert.deepEqual(changed(mem, files), ['app.depot.stock.yaml', 'app.hall.picker.yaml']);
  assert.deepEqual(lineDiff(files['app.depot.stock.yaml'], saved(mem, 'app.depot.stock.yaml')), { removed: ['  parent: depot'], added: ['  parent: hall', '      replaces:', '        - depot.stock.counts', '  replaces:', '    - depot.stock'] });
  assert.deepEqual(lineDiff(files['app.hall.picker.yaml'], saved(mem, 'app.hall.picker.yaml')), {
    removed: ['    - destination: depot.stock', '    - destination: depot.stock.counts'],
    added: ['    - destination: hall.stock', '    - destination: hall.stock.counts']
  });
  for (const file of Object.keys(files)) assert.equal(/["']/.test(saved(mem, file).replace('version: "1"', '')), false, file + ' has no quote but the one `1` needs');
});

test('a file that mixes the two: a line that is rewritten keeps its own style, a line that is added takes the style of the lines of the same key', async () => {
  const files = manifests('double');
  // the second reference is written plain; one `replaces` already exists with a single-quoted item (a neighbour of the same list)
  files['app.hall.picker.yaml'] = files['app.hall.picker.yaml'].replace('    - destination: "depot.stock.counts"', '    - destination: depot.stock.counts');
  files['app.depot.shelves.yaml'] = files['app.depot.shelves.yaml'].replace('# end of shelves', "  replaces:\n    - 'depot.crates'\n# end of shelves");
  const { sandbox, mem } = await open(files, before('double'));
  assert.equal(sandbox.commitMoveElement('depot.stock', 'application', 'hall', { writeReplaces: false }).ok, true);
  await sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(files['app.hall.picker.yaml'], saved(mem, 'app.hall.picker.yaml')), {
    removed: ['    - destination: "depot.stock"', '    - destination: depot.stock.counts'],
    added: ['    - destination: "hall.stock"', '    - destination: hall.stock.counts']
  });
  // adding to a list whose items are single-quoted: the new item is single-quoted, whatever the rest of the file does
  const text = files['app.depot.shelves.yaml'];
  const value = plain(sandbox.parseYaml(text));
  value.content.replaces.push('depot.racks');
  assert.equal(sandbox.patchYamlText(text, value), text.replace("    - 'depot.crates'\n", "    - 'depot.crates'\n    - 'depot.racks'\n"));
});

test('a text that needs quotes keeps the emitter\'s, a number or a boolean is never quoted, and a quote inside a plain value is escaped for the style', () => {
  const app = createApp({});
  const edit = (text, change) => {
    const value = plain(app.parseYaml(text));
    change(value);
    return app.patchYamlText(text, value);
  };
  const doubles = 'content:\n  id: "a"\n  name: "Alpha"\n  description: "Plain words."\n';
  assert.equal(edit(doubles, (v) => { v.content.name = 'Beta: the second'; }), doubles.replace('name: "Alpha"', 'name: "Beta: the second"'), 'a colon needs the quotes anyway, the emitter\'s double ones');
  assert.equal(edit(doubles, (v) => { v.content.count = 3; v.content.flag = true; }), doubles + '  count: 3\n  flag: true\n', 'numbers and booleans are not strings');
  assert.equal(edit(doubles, (v) => { v.content.name = 'Say "hi"'; }), doubles.replace('name: "Alpha"', 'name: "Say \\"hi\\""'));
  const singles = "content:\n  id: 'a'\n  name: 'Alpha'\n";
  assert.equal(edit(singles, (v) => { v.content.name = "It's here"; }), singles.replace("name: 'Alpha'", "name: 'It''s here'"), 'a single quote inside a single-quoted value is doubled');
  assert.equal(edit(singles, (v) => { v.content.name = '12'; }), singles.replace("name: 'Alpha'", 'name: "12"'), 'a string that reads as a number needs the emitter\'s quotes');
  // a block scalar is not a vote: its lines are text
  const block = 'content:\n  id: a\n  text: |\n    "one"\n    "two"\n  name: Alpha\n';
  assert.equal(edit(block, (v) => { v.content.name = 'Beta'; }), block.replace('name: Alpha', 'name: Beta'));
});

test('an edit that writes no string, and a save that changes nothing, leave every file byte for byte as it was', async () => {
  for (const style of ['double', 'single', 'plain']) {
    const files = manifests(style);
    const { sandbox, mem } = await open(files);
    // nothing edited: nothing written
    assert.equal(mem.writes.length, 0);
    // every file read and written again by the line-preserving save
    for (const file of Object.keys(files)) assert.equal(sandbox.patchYamlText(files[file], plain(sandbox.parseYaml(files[file]))), files[file], style + ' ' + file);
    // an edit of something that is not a scalar: the last relationship of a file goes
    const value = plain(sandbox.parseYaml(files['app.hall.picker.yaml']));
    value.content.relationships.pop();
    const lines = files['app.hall.picker.yaml'].split('\n');
    assert.equal(sandbox.patchYamlText(files['app.hall.picker.yaml'], value), lines.filter((line, i) => !(i >= lines.length - 4 && i < lines.length - 2)).join('\n'), style);
    // a number and a boolean written next to quoted strings are the emitter's
    const withCount = plain(sandbox.parseYaml(files['app.depot.yaml']));
    withCount.content.size = 7;
    withCount.content.open = false;
    assert.equal(sandbox.patchYamlText(files['app.depot.yaml'], withCount), files['app.depot.yaml'].replace('# end of depot', 'size: 7\nopen: false\n# end of depot').replace('size: 7', '  size: 7').replace('open: false', '  open: false'), style);
  }
});

test('a result that does not read back as the emitter\'s text is not accepted: the value is then written plain, as before', () => {
  const app = createApp({});
  const text = 'content:\n  id: "a"\n  name: "Alpha"\n';
  const value = plain(app.parseYaml(text));
  value.content.name = 'Beta';
  const emitted = app.serializeYamlValue(value, 0);
  // the quoting of a line written for a value that the file reads another way is refused: break the quoting on purpose and the plain text is what comes back
  const original = app.escapeYamlDoubleQuoted;
  try {
    app.escapeYamlDoubleQuoted = () => 'broken" : [';
    const out = app.patchYamlText(text, value);
    assert.equal(out, text.replace('name: "Alpha"', 'name: Beta'));
    assert.equal(app.serializeYamlValue(plain(app.parseYaml(out)), 0), emitted);
  } finally {
    app.escapeYamlDoubleQuoted = original;
  }
});

// ---- a line that changes keeps its trailing comment and the way its key is written (review of wave 010) ----

test('a line whose value changes keeps its trailing comment and its quoted key; a line that goes takes its comment with it, one that no edit reaches is as it was', () => {
  const app = createApp({});
  const edit = (text, change) => {
    const value = plain(app.parseYaml(text));
    change(value);
    const out = app.patchYamlText(text, value);
    assert.deepEqual(plain(app.parseYaml(out)), value);
    return out;
  };
  const text = ['content:', '  "id": "a"   # why', "  'name': 'Alpha'  # the name", '  size: 3 # three', '  tags:', '    - "x"   # c1', '    - y   # c2', ''].join('\n');
  assert.equal(edit(text, (v) => { v.content.id = 'b'; }), text.replace('"id": "a"', '"id": "b"'));
  assert.equal(edit(text, (v) => { v.content.name = 'Beta'; }), text.replace("'Alpha'", "'Beta'"));
  assert.equal(edit(text, (v) => { v.content.size = 4; }), text.replace('size: 3', 'size: 4'));
  assert.equal(edit(text, (v) => { v.content.tags[0] = 'z'; }), text.replace('- "x"', '- "z"'));
  // an item that goes is gone with its comment; the other one keeps its own
  assert.equal(edit(text, (v) => { v.content.tags.shift(); }), text.replace('    - "x"   # c1\n', ''));
  // an item added next to others takes no comment of theirs
  const added = edit(text, (v) => { v.content.tags.push('w'); });
  assert.deepEqual(lineDiff(text, added), { removed: [], added: ['    - w'] });
});
