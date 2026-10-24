'use strict';
// The help under a field of the page Settings links to the manual (`SETTINGS_HELP_DOCS`): every field that has a help sentence and a place in the manual gets the link,
// and every anchor it names exists in the manual. *Current plateau* had a help and no link (found by run 0118 of wave 016). Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../../doc/README.adoc'), 'utf8');

const block = (name) => {
  const start = HTML.indexOf('const ' + name + ' = {');
  assert.ok(start >= 0, name + ' is in the page');
  return HTML.slice(start, HTML.indexOf('\n};', start));
};
const entries = (text) => [...text.matchAll(/^\s*(\w+):\s*'([^']*)'/gm)].map((m) => [m[1], m[2]]);

test('every anchor the help of Settings names is an anchor of the manual', () => {
  const links = new Map(entries(block('DOC_LINKS')));
  const docs = entries(block('SETTINGS_HELP_DOCS'));
  assert.ok(docs.length >= 6);
  for (const [field, link] of docs) {
    assert.ok(links.has(link), field + ' names the link ' + link + ', which DOC_LINKS does not have');
    const anchor = links.get(link).replace(/^#/, '');
    if (anchor) assert.ok(MANUAL.includes('[[' + anchor + ']]'), field + ' links to ' + anchor);
  }
});

test('the field Current plateau links to its section of the manual', () => {
  const docs = new Map(entries(block('SETTINGS_HELP_DOCS')));
  assert.equal(new Map(entries(block('DOC_LINKS'))).get(docs.get('current')), '#editor-current-plateau');
  assert.ok(MANUAL.includes('[[editor-current-plateau]]'));
  assert.ok(
    entries(block('SETTINGS_HELP')).some(([key]) => key === 'current'),
    'the help sentence of the field exists'
  );
});
