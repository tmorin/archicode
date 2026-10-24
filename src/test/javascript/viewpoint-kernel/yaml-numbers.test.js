'use strict';
// A plain scalar that YAML 1.1 reads as a number is read by the editor as the command line reads it (wave 018 run 0134, issue #103): `id: 010` is the reference `8`,
// `line-gap: 0x1F` is accepted, `header.parent: 0` is the reference `0.c`, a quoted `"010"` is the text. The cases are in yaml-number-cases.json, which the command line
// runs too (YamlOneDotOneNumbersTest.java). What the page keeps of the file when it saves (a number is written back as it was) is the second half of this file.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'yaml-number-cases.json'), 'utf8'));
const DEFAULT_WORKSPACE = 'settings:\n  manifests:\n    paths: [manifests]\n';

/** What the editor makes of the folder of a case, in the words of `expect`: the references and the qualifiers, or the one error and the file it names. */
async function read(files) {
  const mem = memFolder(Object.assign({ '.archicode.yaml': DEFAULT_WORKSPACE }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  if (state.fatalError)
    return {
      error: state.fatalError.replace(/^Could not read\/parse \.archicode\.yaml: /, ''),
      file: '.archicode.yaml'
    };
  const bad = (state.manifestFiles || []).find((f) => f.error);
  if (bad) return { error: bad.error, file: bad.relPath };
  const records = [];
  for (const layer of ['application', 'technology'])
    for (const [reference, record] of state.index[layer]) records.push([reference, record]);
  const references = records.map(([reference]) => reference).sort();
  const qualifiers = {};
  for (const [reference, record] of records)
    if (record.qualifiers && record.qualifiers.length) qualifiers[reference] = Array.from(record.qualifiers, String); // a list of the record may hold a number (`[12]`): the text of it is what is compared
  return Object.keys(qualifiers).length ? { references, qualifiers } : { references };
}

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.title, async () => {
    const expected = c.editor || c.expect;
    assert.deepEqual(JSON.parse(JSON.stringify(await read(c.files))), expected);
  });
}

// ---- what the save keeps: a number is written back as it was written (the line-preserving save finds the line of `id: 010` for the `8` the page holds)
const WORKSPACE = 'settings:\n  manifests:\n    paths:\n      - manifests\n';
const NUMBERS = [
  '# a shop whose ids are numbers',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: 1',
  'content:',
  '  id: 010   # an octal',
  '  name: Shop',
  '  qualifiers: [5.0, 1_000, "010"]   # three texts',
  '  elements:',
  '    - kind: container',
  '      id: 0x1F',
  '      name: Till',
  '    - kind: container',
  '      id: 1e3x',
  '      name: Back',
  ''
].join('\n');
const CHILD =
  'header:\n  kind: "archicode.morin.io/container"\n  parent: 0\n  version: 1.0\ncontent:\n  id: c\n  name: Child\n';
const ROOT_ZERO = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "0"\n  name: Zero\n';

async function open(manifests) {
  const files = Object.assign(
    { '.archicode.yaml': WORKSPACE },
    Object.fromEntries(Object.entries(manifests).map(([name, body]) => ['manifests/' + name, body]))
  );
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem };
}
const onDisk = (page, name) => page.mem.files.get('manifests/' + name).text;

test('the page holds the numbers of a manifest as the command line does and the references follow (the folder of this file)', async () => {
  const page = await open({ 'shop.yaml': NUMBERS, 'child.yaml': CHILD, 'zero.yaml': ROOT_ZERO });
  assert.deepEqual(Array.from(page.state.index.application.keys()).sort(), ['0', '0.c', '8', '8.1e3x', '8.31']);
});

test('an edit of the name of an element whose id is a number leaves the number, its comment and the rest of the file as written', async () => {
  const page = await open({ 'shop.yaml': NUMBERS, 'child.yaml': CHILD, 'zero.yaml': ROOT_ZERO });
  page.sandbox.commitElementEdit('8', (node) => {
    node.name = 'Big shop';
    return {};
  });
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'shop.yaml'), NUMBERS.replace('name: Shop', 'name: Big shop'));
  page.sandbox.commitElementEdit('8.31', (node) => {
    node.name = 'Cash desk';
    return {};
  });
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'shop.yaml'),
    NUMBERS.replace('name: Shop', 'name: Big shop').replace('name: Till', 'name: Cash desk')
  );
  page.sandbox.commitElementEdit('0.c', (node) => {
    node.name = 'Kid';
    return {};
  });
  await page.sandbox.saveAllChanges();
  assert.equal(
    onDisk(page, 'child.yaml'),
    CHILD.replace('name: Child', 'name: Kid'),
    'parent: 0 and version: 1.0 stay as written'
  );
});

test('a block with numbers moves to another manifest as written (the cut and the paste follow the text)', async () => {
  const page = await open({ 'shop.yaml': NUMBERS, 'zero.yaml': ROOT_ZERO });
  page.sandbox.commitMoveElement('8.31', 'application', '0');
  await page.sandbox.saveAllChanges();
  assert.match(onDisk(page, 'zero.yaml'), /id: 0x1F\n/);
  assert.doesNotMatch(onDisk(page, 'shop.yaml'), /0x1F/);
  assert.match(onDisk(page, 'shop.yaml'), /id: 010 {3}# an octal\n/);
});

test('.archicode.yaml keeps its numbers when it is saved (the text as written, quoted or not)', () => {
  const sandbox = createApp({});
  const text =
    'settings:\n  name: 010  # the name\n  manifests:\n    paths: [manifests]\nstyles:\n  composite:\n    line-gap: 0x1F  # a gap\n    line-style: 5.0\n';
  const value = sandbox.parseYaml(text);
  value.settings.name = '010';
  value.styles.composite['round-corner'] = 4;
  assert.equal(
    sandbox.patchYamlText(text, value, true),
    text.replace('    line-style: 5.0\n', '    line-style: 5.0\n    round-corner: 4\n')
  );
});

test('a style written as a YAML 1.1 number is drawn as the command line reads it: the whole number (issue #136, was pinned in #103)', async () => {
  const workspace = [
    'settings:',
    '  manifests:',
    '    paths: [manifests]',
    'styles:',
    '  by-tags:',
    '    hot:',
    '      line-style: 0x5',
    '      line-gap: 1_0',
    '      line-thickness: 1e1',
    '      round-corner: 8.0',
    '    cut:',
    '      line-style: 0b11',
    '      line-gap: 1.5',
    '      round-corner: 8.9',
    '    quoted:',
    '      line-style: "7"',
    '      round-corner: !!int 0x1F',
    '      line-gap: 0x7FFFFFFF',
    ''
  ].join('\n');
  const mem = memFolder({
    '.archicode.yaml': workspace,
    'manifests/m0.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: s\n'
  });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, null);
  const plain = (value) => JSON.parse(JSON.stringify(value));
  // the numbers the command line reads (StyleNumbersTest.java): 0x5 is 5, 1_0 is 10, 1e1 is 10, 8.0 and 8.9 are 8, 1.5 is 1
  assert.deepEqual(plain(sandbox.styleLookOf(sandbox.stereotypeStyleOf('hot')).vars), {
    '--st-width': '10px',
    '--st-dash': '5 10'
  });
  assert.equal(sandbox.styleLookOf(sandbox.stereotypeStyleOf('hot')).rx, 4);
  assert.deepEqual(plain(sandbox.styleLookOf(sandbox.stereotypeStyleOf('cut')).vars), { '--st-dash': '3 1' });
  assert.equal(sandbox.styleLookOf(sandbox.stereotypeStyleOf('cut')).rx, 4);
  // a quoted whole number is the number, a tagged one too (`!!int 0x1F` is 31, which is more than the diagram draws: it stops at 100)
  assert.deepEqual(plain(sandbox.styleLookOf(sandbox.stereotypeStyleOf('quoted')).vars), { '--st-dash': '7 50' });
  assert.equal(sandbox.styleLookOf(sandbox.stereotypeStyleOf('quoted')).rx, 15.5);
  // the file is not touched by it: the text of the number is the one the author wrote
  assert.equal(state.workspace.styles['by-tags'].hot['line-style'], '0x5');
});

// ---- a number with a tag (issue #136, tagged scalars of #78): read as the command line reads it, and written back as it was written
test('a tagged number is saved as written: the line, its tag and its comment stay when another field is edited', () => {
  const sandbox = createApp({});
  const text = [
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: !!int 010',
    'content:',
    '  id: !!int 0x1F   # hex id',
    '  name: Shop',
    '  description: !!binary YR==',
    '  qualifiers:',
    '    - !!int 0x1F',
    '    - !!float 5   # five',
    '    - !!float 1e3',
    '    - a',
    '  tags:',
    '    size: !!float 1e3',
    '    n: !!int 1_000',
    '    big: !!int 0xFFFFFFFFFFFFFFFFFFFFFF',
    '  elements:',
    '    - kind: container',
    '      id: !!int 010',
    '      name: Till',
    ''
  ].join('\n');
  const parsed = sandbox.parseManifestText(text);
  assert.equal(parsed.error, null);
  const plain = JSON.parse(JSON.stringify(parsed.content));
  // what the command line makes of them (Y145 to Y200): the numbers, and the text of a number JavaScript prints otherwise
  assert.deepEqual(plain.qualifiers, [31, '5.0', '1000.0', 'a']);
  assert.equal(plain.id, 31);
  assert.equal(plain.description, 'YQ==', 'a binary text is the base64 text of its bytes, with the bits that are zero');
  assert.equal(plain.tags.big, '309485009821345068724781055');
  assert.equal(plain.elements[0].id, 8);
  parsed.content.name = 'Shop2';
  assert.equal(
    sandbox.patchYamlText(text, { header: parsed.header, content: parsed.content }),
    text.replace('name: Shop\n', 'name: Shop2\n')
  );
  const again = sandbox.parseManifestText(text);
  again.content.elements[0].name = 'Till2';
  assert.equal(
    sandbox.patchYamlText(text, { header: again.header, content: again.content }),
    text.replace('name: Till', 'name: Till2')
  );
});

test('a tag says what a plain scalar is before it is looked at as a number: `.inf` is a text under `!!str` and `!!int`', () => {
  const sandbox = createApp({});
  const readBack = (text) => JSON.parse(JSON.stringify(sandbox.parseYaml(text)));
  assert.deepEqual(readBack('a: !!str .inf\nb: !!int .inf\nc: !!int 1e3\nd: !!int 1:30\n'), {
    a: '.inf',
    b: '.inf',
    c: '1e3',
    d: '1:30'
  });
  // the tagged integer is the number the command line reads (Jackson over SnakeYAML), and what it cannot read is its sentence
  const failing = (text) => {
    try {
      sandbox.parseYaml(text);
    } catch (e) {
      return e.message;
    }
    return null;
  };
  assert.equal(failing('a: !!int 09\n'), 'Invalid base-8 number (\'9\'), problem: For input string: "9" under radix 8');
  assert.equal(failing('a: !!float 0x1F\n'), "Malformed numeric value '0x1F'");
  assert.equal(failing('a: !!binary abc\n').startsWith('Unexpected end of base64-encoded String'), true);
});
