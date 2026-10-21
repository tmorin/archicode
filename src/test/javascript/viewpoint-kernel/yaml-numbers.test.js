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
  const mem = memFolder(Object.assign({ 'workspace.yaml': DEFAULT_WORKSPACE }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  if (state.fatalError) return { error: state.fatalError.replace(/^Could not read\/parse workspace\.yaml: /, ''), file: 'workspace.yaml' };
  const bad = (state.manifestFiles || []).find((f) => f.error);
  if (bad) return { error: bad.error, file: bad.relPath };
  const records = [];
  for (const layer of ['application', 'technology']) for (const [reference, record] of state.index[layer]) records.push([reference, record]);
  const references = records.map(([reference]) => reference).sort();
  const qualifiers = {};
  for (const [reference, record] of records) if (record.qualifiers && record.qualifiers.length) qualifiers[reference] = Array.from(record.qualifiers, String); // a list of the record may hold a number (`[12]`): the text of it is what is compared
  return Object.keys(qualifiers).length ? { references, qualifiers } : { references };
}

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.title, async () => {
    const expected = c.editor || c.expect;
    assert.deepEqual(JSON.parse(JSON.stringify(await read(c.files))), expected);
  });
}

// ---- what the save keeps: a number is written back as it was written (the line-preserving save finds the line of `id: 010` for the `8` the page holds)
const vm = require('node:vm');
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
const CHILD = 'header:\n  kind: "archicode.morin.io/container"\n  parent: 0\n  version: 1.0\ncontent:\n  id: c\n  name: Child\n';
const ROOT_ZERO = 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "0"\n  name: Zero\n';

async function open(manifests) {
  const files = Object.assign({ 'workspace.yaml': WORKSPACE }, Object.fromEntries(Object.entries(manifests).map(([name, body]) => ['manifests/' + name, body])));
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
  page.sandbox.commitElementEdit('8', (node) => { node.name = 'Big shop'; return {}; });
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'shop.yaml'), NUMBERS.replace('name: Shop', 'name: Big shop'));
  page.sandbox.commitElementEdit('8.31', (node) => { node.name = 'Cash desk'; return {}; });
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'shop.yaml'), NUMBERS.replace('name: Shop', 'name: Big shop').replace('name: Till', 'name: Cash desk'));
  page.sandbox.commitElementEdit('0.c', (node) => { node.name = 'Kid'; return {}; });
  await page.sandbox.saveAllChanges();
  assert.equal(onDisk(page, 'child.yaml'), CHILD.replace('name: Child', 'name: Kid'), 'parent: 0 and version: 1.0 stay as written');
});

test('a block with numbers moves to another manifest as written (the cut and the paste follow the text)', async () => {
  const page = await open({ 'shop.yaml': NUMBERS, 'zero.yaml': ROOT_ZERO });
  page.sandbox.commitMoveElement('8.31', 'application', '0');
  await page.sandbox.saveAllChanges();
  assert.match(onDisk(page, 'zero.yaml'), /id: 0x1F\n/);
  assert.doesNotMatch(onDisk(page, 'shop.yaml'), /0x1F/);
  assert.match(onDisk(page, 'shop.yaml'), /id: 010   # an octal\n/);
});

test('workspace.yaml keeps its numbers when it is saved (the text as written, quoted or not)', () => {
  const sandbox = createApp({});
  const text = 'settings:\n  name: 010  # the name\n  manifests:\n    paths: [manifests]\nstyles:\n  composite:\n    line-gap: 0x1F  # a gap\n    line-style: 5.0\n';
  const value = sandbox.parseYaml(text);
  value.settings.name = '010';
  value.styles.composite['round-corner'] = 4;
  assert.equal(sandbox.patchYamlText(text, value, true), text.replace('    line-style: 5.0\n', '    line-style: 5.0\n    round-corner: 4\n'));
});

test('a style written as a YAML 1.1 number is accepted, and drawn as the editor draws a text it cannot tell from a quoted one: with the default (pinned, issue #103)', () => {
  const sandbox = createApp({});
  const look = sandbox.styleLookOf(sandbox.parseYaml('line-style: 0x5\nline-gap: 1_0\nround-corner: 8.0\n'));
  assert.deepEqual(JSON.parse(JSON.stringify(look.vars)), {}, 'the diagram draws only whole numbers written in digits; the command line reads these as 5, 10 and 8');
  assert.equal(look.rx, null);
});
