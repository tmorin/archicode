'use strict';
// The YAML layer of the standalone editor: the parser, the emitter, and what workspace.yaml goes through on a save.
// The golden cases of the emitter (src/test/resources/editor-yaml/emitter-cases.json) are checked on the Java side too
// (EditorYamlCompatibilityTest): what the editor writes is what the CLI reads.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const REPO = path.resolve(__dirname, '../../../..');
const CASES = JSON.parse(fs.readFileSync(path.join(REPO, 'src/test/resources/editor-yaml/emitter-cases.json'), 'utf8'));
const app = createApp();

/** A value of the sandbox, brought into this realm, so that deepStrictEqual compares prototypes of one realm. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const parse = (text) => plain(app.parseYaml(text));
const serializeAtK = (value) => app.serializeYamlValue({ k: value }, 0);

test('every golden case: the emitter writes the expected text, and the parser reads it back to the value', () => {
  assert.ok(CASES.length > 50);
  for (const { value, yaml } of CASES) {
    assert.equal(serializeAtK(value), yaml, 'emitter: ' + JSON.stringify(value));
    assert.deepEqual(parse(yaml), { k: value }, 'parser: ' + yaml);
    assert.equal(serializeAtK(plain(app.parseYaml(yaml)).k), yaml, 'a second round does not change anything: ' + yaml);
  }
});

test('an empty object and an empty array are written as flow collections, not as null or [object Object]', () => {
  assert.equal(app.serializeYamlValue({ tags: {}, relationships: [], n: { a: [] } }, 0), 'tags: {}\nrelationships: []\nn:\n  a: []');
  assert.deepEqual(parse('tags: {}\nrelationships: []\nitems:\n  - {}\n  - []'), { tags: {}, relationships: [], items: [{}, []] });
  assert.equal(app.serializeYamlValue({}, 0), '{}');
});

test('keys go through the same quoting as values', () => {
  const tags = { 'a: b': 1, '# n': 2, '- d': 3, 'x #y': 4, 'k:': 5, '': 6, 'true': 7, '[x]': 8, plain: 9 };
  const text = app.serializeYamlValue({ tags }, 0);
  assert.deepEqual(parse(text), { tags });
  assert.ok(text.includes('"a: b": 1') && text.includes('"# n": 2') && text.includes('"": 6'));
});

test('a key named __proto__ is kept', () => {
  const parsed = app.parseYaml('tags:\n  __proto__: x\n  b: y');
  assert.deepEqual(Object.keys(parsed.tags), ['__proto__', 'b']);
  assert.equal(Object.getOwnPropertyDescriptor(parsed.tags, '__proto__').value, 'x');
  assert.equal(app.serializeYamlValue(parsed, 0), 'tags:\n  __proto__: x\n  b: y');
});

test('a sequence may sit at the indent of its parent key', () => {
  assert.deepEqual(parse('qualifiers:\n- x\n- y\nother: 1'), { qualifiers: ['x', 'y'], other: 1 });
  assert.deepEqual(parse('items:\n- id: a\n  name: A\n- id: b\n'), { items: [{ id: 'a', name: 'A' }, { id: 'b' }] });
  assert.deepEqual(parse('- a:\n  - x\n- b'), [{ a: ['x'] }, 'b']);
  assert.deepEqual(parse('- - a\n  - b\n- c'), [['a', 'b'], 'c']);
});

test('block scalars: literal and folded, with chomping and indentation indicators', () => {
  assert.deepEqual(parse('a: |\n  one\n  two\nb: 1'), { a: 'one\ntwo\n', b: 1 });
  assert.deepEqual(parse('a: |-\n  one\n  two\nb: 1'), { a: 'one\ntwo', b: 1 });
  assert.deepEqual(parse('a: |+\n  one\n\n\nb: 1'), { a: 'one\n\n\n', b: 1 });
  assert.deepEqual(parse('a: |\n  one\n\n  two\n\nb: 1'), { a: 'one\n\ntwo\n', b: 1 });
  assert.deepEqual(parse('a: >\n  one\n  two\n\n  three\nb: 1'), { a: 'one two\nthree\n', b: 1 });
  assert.deepEqual(parse('a: >-\n  one\n  two'), { a: 'one two' });
  assert.deepEqual(parse('a: >+\n  one\n\n'), { a: 'one\n\n' });
  assert.deepEqual(parse('a: |2\n    indented\n  x'), { a: '  indented\nx\n' });
  assert.deepEqual(parse('a: |  # a comment\n  text # not a comment\n'), { a: 'text # not a comment\n' });
  assert.deepEqual(parse('items:\n  - |\n    first\n  - second'), { items: ['first\n', 'second'] });
  assert.deepEqual(parse('a: |\n  # kept\n  x\n# a comment'), { a: '# kept\nx\n' });
});

test('plain and quoted scalars folded over several lines', () => {
  assert.deepEqual(parse('a: one\n  two\n  three\nb: 1'), { a: 'one two three', b: 1 });
  assert.deepEqual(parse('a: one\n\n  two\nb: 1'), { a: 'one\ntwo', b: 1 });
  assert.deepEqual(parse('a: "one\n  two\n\n  three"\nb: 1'), { a: 'one two\nthree', b: 1 });
  assert.deepEqual(parse("a: 'it''s\n  folded'\nb: 1"), { a: "it's folded", b: 1 });
  assert.deepEqual(parse('a: "one \\\n   two"'), { a: 'one two' });
  assert.deepEqual(parse('a:\n  one\n  two\nb: 1'), { a: 'one two', b: 1 });
});

test('flow sequences and flow mappings', () => {
  assert.deepEqual(parse('q: [a, "b", \'c\', 1, true, null]'), { q: ['a', 'b', 'c', 1, true, null] });
  assert.deepEqual(parse('qualifiers: ["oidc"]'), { qualifiers: ['oidc'] });
  assert.deepEqual(parse('m: {a: b, "c d": 2, e}'), { m: { a: 'b', 'c d': 2, e: null } });
  assert.deepEqual(parse('m: {a: [1, 2], b: {c: d}}'), { m: { a: [1, 2], b: { c: 'd' } } });
  assert.deepEqual(parse('m: {"a":1,"b":[2]}'), { m: { a: 1, b: [2] } });
  assert.deepEqual(parse('q: [a, b,]'), { q: ['a', 'b'] });
  assert.deepEqual(parse('q: [a: b, c]'), { q: [{ a: 'b' }, 'c'] });
  assert.deepEqual(parse('q: []\nm: {}'), { q: [], m: {} });
  assert.deepEqual(parse('q: [a, # comment\n  b,\n  "c, d"]  # trailing\nnext: 1'), { q: ['a', 'b', 'c, d'], next: 1 });
  assert.deepEqual(parse('q: [http://x.org/a, a b c]'), { q: ['http://x.org/a', 'a b c'] });
  assert.deepEqual(parse('- [a, b]\n- {c: d}'), [['a', 'b'], { c: 'd' }]);
});

test('quoted keys lose their quotes, and the escapes of double quotes are read', () => {
  assert.deepEqual(parse('"a b": 1\n\'c: d\': 2\n"e\\"f": 3'), { 'a b': 1, 'c: d': 2, 'e"f': 3 });
  assert.deepEqual(parse('- "k": v'), [{ k: 'v' }]);
  assert.deepEqual(parse('a: "x\\ty\\nz\\r\\u00e9\\U0001F642\\x41\\\\ \\" \\/"'), { a: 'x\ty\nz\ré\u{1F642}A\\ " /' });
  assert.throws(() => app.parseYaml('a: "bad \\q"'), (e) => e.line === 1 && /escape/.test(e.message));
  assert.throws(() => app.parseYaml('a: "bad \\u12"'), (e) => e.line === 1);
});

test('comments: a hash starts one only at the start or after a blank', () => {
  assert.deepEqual(parse("a: don't # a comment\nb: 'it''s # kept' # a comment\nc: \"say \\\"hi # there\" # c\nd: x#y\ne: #f\n  z"), {
    a: "don't", b: "it's # kept", c: 'say "hi # there', d: 'x#y', e: 'z'
  });
  assert.equal(app.stripYamlComment("a: don't # c"), "a: don't ");
  assert.equal(app.stripYamlComment('a: "say \\"hi # there" # c'), 'a: "say \\"hi # there" ');
  assert.equal(app.stripYamlComment("a: 'it''s # kept' # c"), "a: 'it''s # kept' ");
  assert.equal(app.stripYamlComment('a: see issue#12'), 'a: see issue#12');
  assert.equal(app.stripYamlComment('a: see issue #12'), 'a: see issue ');
  assert.equal(app.stripYamlComment('  # only a comment'), '  ');
  assert.equal(app.stripYamlComment('- [a, "b # c", d] # e'), '- [a, "b # c", d] ');
  assert.equal(app.stripYamlComment('a: "multi'), 'a: "multi');
});

test('numbers are read as numbers only when writing them back gives the very same text', () => {
  const parsed = parse('a: 12\nb: 1.5\nc: 01234\nd: 1.50\ne: 2.0\nf: 12345678901234567890\ng: -0\nh: -3');
  assert.deepEqual(parsed, { a: 12, b: 1.5, c: '01234', d: '1.50', e: '2.0', f: '12345678901234567890', g: '-0', h: -3 });
  for (const text of ['01234', '1.50', '2.0', '12345678901234567890', '-0']) {
    assert.deepEqual(parse(app.serializeYamlValue({ v: parse('v: ' + text).v }, 0)), { v: parse('v: ' + text).v });
  }
});

test('booleans and null as the Java side reads them', () => {
  assert.deepEqual(parse('a: yes\nb: No\nc: ON\nd: off\ne: True\nf: ~\ng: Null\nh:\ni: tRuE'),
    { a: true, b: false, c: true, d: false, e: true, f: null, g: null, h: null, i: 'tRuE' });
});

test('documents: a leading --- and a trailing ... are accepted, CRLF and a BOM too', () => {
  assert.deepEqual(parse('---\na: 1\n...\n'), { a: 1 });
  assert.deepEqual(parse('\ufeffa: 1\r\nb:\r\n  - x\r\n'), { a: 1, b: ['x'] });
  assert.equal(app.parseYaml('# nothing\n\n'), null);
  assert.equal(app.parseYaml(''), null);
  assert.equal(app.parseYaml('just text'), 'just text');
});

test('whatever the parser cannot read is an error that names the line, never a silent drop', () => {
  const failing = [
    ['a: 1\nb: &anchor 2\n', 2],
    ['a: 1\nb: *alias\n', 2],
    ['a: !!str 1\n', 1],
    ['a: 1\n---\nb: 2\n', 2],
    ['a: 1\n   b: 2\n', 2],
    ['a:\n  b: 1\n c: 2\n', 3],
    ['a: 1\nnot a mapping entry\n', 2],
    ['a: "never closed\nb: 1\n', 1],
    ['a: [1, 2\nb: 1\n', 1],
    ['a: {b: 1\n', 1],
    ['a: b: c\n', 1],
    ['a: 1\n- b\n', 2],
    ['? complex\n: key\n', 1],
    ['%YAML 1.2\n---\na: 1\n', 1],
    ['a: |x\n  text\n', 1],
    ['a:\n\t- b\n', 2],
    ['a: [1, 2] extra\n', 1]
  ];
  for (const [text, line] of failing) {
    assert.throws(() => app.parseYaml(text), (e) => e.name === 'YamlParseError' && e.line === line && e.message.includes('line ' + line),
      'expected a parse error at line ' + line + ' for ' + JSON.stringify(text));
  }
});

// ---------------------------------------------------------------------------------------------------------------------
// The editor on top of it: workspace.yaml and the manifests that cannot be read.

function writableFolder(dir) {
  const handle = makeDirHandle(dir);
  const getFileHandle = handle.getFileHandle;
  handle.getFileHandle = async (name, options) => {
    const file = await getFileHandle(name, options);
    file.createWritable = async () => {
      const parts = [];
      return { write: async (data) => { parts.push(data); }, close: async () => fs.writeFileSync(path.join(dir, name), parts.join('')) };
    };
    return file;
  };
  return handle;
}

async function openTemp(files) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'archicode-yaml-'));
  for (const [name, content] of Object.entries(files)) {
    fs.mkdirSync(path.dirname(path.join(dir, name)), { recursive: true });
    fs.writeFileSync(path.join(dir, name), content);
  }
  const sandbox = createApp();
  const handle = writableFolder(dir);
  await sandbox.loadWorkspace(handle);
  const state = sandbox.__state();
  state.folder = { handle, name: 'tmp' };
  return { sandbox, state, dir };
}

const MANIFEST = 'header:\n  kind: archicode.morin.io/system\ncontent:\n  id: s1\n  name: S1\n';

test('saving the settings keeps the other top-level keys of workspace.yaml, in their order, and the unknown settings', async () => {
  const { sandbox, state, dir } = await openTemp({
    'workspace.yaml': [
      'application:', '  elements: []', 'technology:', '  elements:', '    - id: t1',
      'styles:', '  c: {color: "#ff0000"}',
      'views:', '  - name: v1',
      'settings:', '  unknown-section: {a: 1}', '  manifests:', '    paths: [manifests]', '    extra: kept',
      '  views:', '    labels: {a: b}', '  facets:', '    customs: []',
      'zeta: last', ''
    ].join('\n'),
    'manifests/app.s1.yaml': MANIFEST
  });
  state.workspace.settings.relationships.defaultSyntheticLabel = 'calls';
  await sandbox.writeWorkspaceYaml();
  const written = fs.readFileSync(path.join(dir, 'workspace.yaml'), 'utf8');
  const reread = plain(sandbox.parseYaml(written));
  assert.deepEqual(Object.keys(reread), ['application', 'technology', 'styles', 'views', 'settings', 'zeta']);
  assert.deepEqual(reread.application, { elements: [] });
  assert.deepEqual(reread.technology, { elements: [{ id: 't1' }] });
  assert.deepEqual(reread.views, [{ name: 'v1' }]);
  assert.equal(reread.zeta, 'last');
  assert.deepEqual(reread.styles, { c: { color: '#ff0000' } });
  assert.deepEqual(reread.settings['unknown-section'], { a: 1 });
  assert.equal(reread.settings.manifests.extra, 'kept');
  assert.deepEqual(reread.settings.manifests.paths, ['manifests']);
  assert.equal(reread.settings.relationships['default-synthetic-label'], 'calls');
  assert.deepEqual(reread.settings.views.labels, { a: 'b' });
  assert.deepEqual(reread.settings.views.properties, {});
  assert.deepEqual(reread.settings.facets.customs, []);
  assert.ok(!('formatters' in reread), 'a key the file did not have is not invented');
});

test('a workspace.yaml that cannot be read is a fatal error that names the line, and is never written', async () => {
  const { state } = await openTemp({ 'workspace.yaml': 'settings:\n  manifests: &paths\n    paths: [a]\n' });
  assert.match(state.fatalError, /workspace\.yaml/);
  assert.match(state.fatalError, /line 2/);
  assert.equal(state.workspace, null);
});

test('a manifest the parser cannot read is shown as unparseable: no element from it, and its text is kept as it is', async () => {
  const broken = 'header:\n  kind: archicode.morin.io/system\ncontent:\n  id: s2\n  name: &n S2\n  elements:\n    - id: lost\n';
  const { state } = await openTemp({
    'workspace.yaml': 'settings:\n  manifests:\n    paths: [manifests]\n',
    'manifests/app.s1.yaml': MANIFEST,
    'manifests/app.s2.yaml': broken
  });
  const mf = state.manifestFiles.find((f) => f.relPath.endsWith('app.s2.yaml'));
  assert.ok(mf.error && /line 5/.test(mf.error), mf.error);
  assert.equal(mf.header, null);
  assert.equal(mf.content, null);
  assert.equal(mf.rawText, broken);
  assert.ok(state.index.application.has('s1'));
  assert.ok(!state.index.application.has('s2'));
  assert.ok(!state.index.application.has('lost'));
});

test('every YAML file of the repository (manual examples, workspaces, fixtures) is read, and survives being written back', () => {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (/\.ya?ml$/.test(entry.name)) found.push(full);
    }
  };
  for (const dir of ['src/doc/examples', 'src/test/workspaces', 'src/test/resources/viewpoint-kernel/workspace']) walk(path.join(REPO, dir));
  assert.ok(found.length > 30);
  for (const file of found) {
    const parsed = parse(fs.readFileSync(file, 'utf8'));
    assert.deepEqual(parse(app.serializeYamlValue(parsed, 0)), parsed, file);
  }
});

test('whatever text is thrown at the emitter comes back unchanged', () => {
  const alphabet = ['a', 'Z', '0', '1', '.', '-', '+', ':', ' ', '#', '"', "'", '\\', '\n', '\t', '\r', '[', ']', '{', '}', ',', '&', '*', '!', '|', '>', '%', '@', '`', '?', '~', 'é', '\u{1F642}', ' ', '\u0000', '=', 'e'];
  let seed = 42;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  const text = () => Array.from({ length: Math.floor(next() * 8) }, () => alphabet[Math.floor(next() * alphabet.length)]).join('');
  for (let i = 0; i < 3000; i++) {
    const value = { [text()]: text(), k: [text(), { [text()]: [text()] }] };
    const yaml = app.serializeYamlValue(value, 0);
    assert.deepEqual(parse(yaml), value, yaml);
  }
});

test('garbled files only ever fail with a YamlParseError', () => {
  const sample = fs.readFileSync(path.join(REPO, 'src/test/resources/viewpoint-kernel/workspace/manifests/app.shop.yaml'), 'utf8');
  const inserts = [' ', '\n', '"', "'", '[', ']', '{', '}', ':', '-', '|', '>', '#', '\t', '&', '*', '!', ',', '\\'];
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  for (let i = 0; i < 3000; i++) {
    let text = sample;
    for (let m = 0; m < 3; m++) {
      const at = Math.floor(next() * text.length);
      text = next() < 0.5 ? text.slice(0, at) + inserts[Math.floor(next() * inserts.length)] + text.slice(at) : text.slice(0, at) + text.slice(at + 1);
    }
    try {
      app.parseYaml(text);
    } catch (e) {
      assert.equal(e.name, 'YamlParseError', e.stack);
      assert.ok(Number.isInteger(e.line) && e.line >= 1);
    }
  }
});
