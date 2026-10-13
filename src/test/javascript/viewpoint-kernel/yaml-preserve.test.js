'use strict';
// Saving a file keeps of it what the edit did not touch (patchYamlText): its comments, blank lines, quotes and final line break.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');

const REPO = path.resolve(__dirname, '../../../..');
const app = createApp();
const plain = (value) => JSON.parse(JSON.stringify(value));
const parse = (text) => plain(app.parseYaml(text));
const patch = (text, value) => app.patchYamlText(text, value);

const FILE = [
  '# the system of the shop',
  'header:',
  '  kind: archicode.morin.io/system',
  'content:',
  '  id: "shop"   # the id is quoted',
  '  name: Shop',
  '',
  '  # who it talks to',
  '  relationships:',
  '    - label: "uses"',
  '      destination: payment',
  '    - label: sends mail',
  '      destination: mail',
  '# end of the file',
  ''
].join('\n');

test('a value that did not change is the file as it was, byte for byte', () => {
  assert.equal(patch(FILE, parse(FILE)), FILE);
});

test('a changed value changes its own line only: comments, blank lines, quotes and the final line break stay', () => {
  const value = parse(FILE);
  value.content.name = 'Shop front';
  const expected = FILE.replace('  name: Shop\n', '  name: Shop front\n');
  assert.equal(patch(FILE, value), expected);
});

test('an added and a removed line keep the comments around them', () => {
  const value = parse(FILE);
  value.content.relationships.splice(0, 1);
  value.content.relationships.push({ label: 'logs', destination: 'audit' });
  const text = patch(FILE, value);
  assert.deepEqual(parse(text), value);
  assert.ok(text.includes('# the system of the shop\n') && text.includes('  # who it talks to\n') && text.includes('# end of the file\n'));
  assert.ok(text.includes('id: "shop"   # the id is quoted'));
  assert.ok(!text.includes('"uses"') && text.includes('label: logs') && text.endsWith('\n'));
});

test('a file with no final line break stays without one, and CRLF stays CRLF', () => {
  const value = parse(FILE);
  value.content.name = 'X';
  assert.ok(!patch(FILE.replace(/\n$/, ''), value).endsWith('\n'));
  const crlf = patch(FILE.replace(/\n/g, '\r\n'), value);
  assert.ok(crlf.includes('\r\n') && !/[^\r]\n/.test(crlf));
  assert.deepEqual(parse(crlf), value);
});

test('a layout the emitter does not write falls back to the emitter, and the value is still right', () => {
  const flow = 'header: {kind: archicode.morin.io/system}\ncontent:\n    id: s\n    name: S\n'; // a flow mapping and 4-space indentation
  const value = parse(flow);
  value.content.name = 'T';
  const text = patch(flow, value);
  assert.deepEqual(parse(text), value);
  assert.equal(text, app.serializeYamlValue(value, 0));
});

test('text that is not YAML the editor reads is replaced by the emitter text', () => {
  assert.equal(patch('a: [1', { a: 1 }), 'a: 1');
  assert.equal(patch('', { a: 1 }), 'a: 1');
});

test('block scalars, with blank lines in them, are followed', () => {
  const file = 'content:\n  id: a\n  description: |\n    first\n\n    third\n  name: A\n';
  const value = parse(file);
  assert.equal(patch(file, value), file);
  value.content.name = 'B';
  assert.equal(patch(file, value), file.replace('name: A', 'name: B'));
});

test('every YAML file of the repository: unchanged is identical, and an edit is read back as the edit', () => {
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
  let followed = 0;
  for (const file of found) {
    const text = fs.readFileSync(file, 'utf8');
    const value = parse(text);
    if (value === null || typeof value !== 'object') continue;
    const same = patch(text, value);
    if (same === text) followed++;
    assert.deepEqual(parse(same), value, file);
    const edited = plain(value);
    const key = Object.keys(edited)[0];
    edited[key] = edited[key] && typeof edited[key] === 'object' ? edited[key] : 'edited';
    edited['zz-added'] = 'added';
    assert.deepEqual(parse(patch(text, edited)), edited, file);
  }
  assert.ok(followed > found.length / 2, 'most files are followed, not rewritten: ' + followed + ' of ' + found.length);
});

test('the same edit made over and over (random lines dropped and added) is always read back right', () => {
  let seed = 7;
  const next = () => (seed = (seed * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
  let text = FILE;
  let value = parse(FILE);
  for (let i = 0; i < 200; i++) {
    const list = value.content.relationships;
    if (next() < 0.5 && list.length > 0) list.splice(Math.floor(next() * list.length), 1);
    else list.splice(Math.floor(next() * (list.length + 1)), 0, { label: 'l' + i, destination: 'd' + i });
    value.content.name = 'N' + i;
    text = patch(text, value);
    assert.deepEqual(parse(text), value, text);
  }
  assert.ok(text.includes('# the system of the shop') && text.includes('# end of the file'));
});

const { openFixture } = require('./harness');

test('an edit of an element rewrites its manifest line by line: the comments of the file stay', async () => {
  const { sandbox, state } = await openFixture();
  const mf = state.manifestFiles.find((f) => f.relPath.endsWith('app.shop.web.yaml'));
  mf.rawText = '# kept: the owner of this file\n' + mf.rawText.replace('  name: "Web Shop"', '  name: "Web Shop"   # kept too') + '# trailing\n';
  sandbox.commitElementEdit('shop.web.frontend', (node) => { node.name = 'Frontend 2'; });
  assert.ok(mf.rawText.startsWith('# kept: the owner of this file\n'));
  assert.ok(mf.rawText.includes('  name: "Web Shop"   # kept too\n'));
  assert.ok(mf.rawText.endsWith('# trailing\n'));
  assert.ok(mf.rawText.includes('name: Frontend 2'));
  assert.ok(mf.rawText.includes('      qualifiers:\n        - "Angular"'), 'a line the edit did not touch keeps its quotes');
  assert.equal(mf.rawText.split('\n').length, (mf.rawText.match(/\n/g) || []).length + 1);
  assert.deepEqual(parse(mf.rawText), plain({ header: mf.header, content: mf.content }));
});

test('a relationship that points at nothing is a button to the edit form of its owner in Details, as it is in the diagram', async () => {
  const { sandbox, state } = await openFixture();
  sandbox.commitElementEdit('shop.web.frontend', (node) => { node.relationships[0].destination = 'shop.nowhere'; });
  const html = sandbox.renderElementRelationshipsHtml(state.index.application.get('shop.web.frontend'));
  assert.match(html, /<button type="button" class="relationship-link relationship-dangling" data-action="fix-dangling" data-ref="shop\.web\.frontend"[^>]*>shop\.nowhere<\/button><span class="dangling-badge">dangling<\/span>/);
  // a reference that is not a relationship (a parent, a child) stays a plain text
  assert.match(sandbox.renderReferenceItemHtml('shop.nowhere', 'application'), /^<span class="relationship-dangling">shop\.nowhere<span class="dangling-badge">dangling<\/span><\/span>$/);
});
