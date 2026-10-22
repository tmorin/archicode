'use strict';
// Which facet names can be the name of a folder (wave 020, run 0146, issue #147, decision T2). The name of a facet goes into the name of the folders the
// views are written in, so one that cannot be a folder name is refused with one sentence, the command line's word for word; the cases are in
// facet-name-cases.json, which FacetNamesTest.java runs on the command line. A workspace file that holds such a name is N94 to N104 of negative-cases.json.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'facet-name-cases.json'), 'utf8'));
const sandbox = createApp();

for (const c of DOCUMENT.cases) {
  test('the sentence for ' + JSON.stringify(c.name) + ': ' + c.what, () => {
    assert.equal(sandbox.facetNameProblem(c.name), c.problem);
  });
}

test('the cases cover the classes the plan refuses: empty, `.`, `..`, `/`, `\\`, a control character and what Windows refuses', () => {
  const sentences = DOCUMENT.cases.map((c) => c.problem).filter((p) => p !== null).join('\n');
  for (const part of ['is empty', 'is `.`', 'is `..`', 'holds `/`', 'holds `\\`', 'holds a control character', 'holds `<`', 'holds `>`', 'holds `:`', 'holds `"`', 'holds `|`', 'holds `?`', 'holds `*`', 'ends with a dot', 'ends with a space']) {
    assert.ok(sentences.includes(part), 'no case for: ' + part);
  }
  assert.ok(DOCUMENT.cases.some((c) => c.problem === null), 'names that are folders are in the cases too');
});

test('the editor does not write a facet name that it would refuse when it loads the workspace', () => {
  for (const c of DOCUMENT.cases) {
    const result = sandbox.validateFacetName(c.name, []);
    const trimmed = c.name.trim();
    const problem = sandbox.facetNameProblem(trimmed);
    if (trimmed === '') {
      assert.equal(result.valid, false);
    } else if (problem === null) {
      assert.deepEqual({ ...result }, { valid: true, name: trimmed }, JSON.stringify(c.name));
    } else {
      assert.equal(result.valid, false, JSON.stringify(c.name) + ' is refused');
      assert.match(result.error, /^Facet name /, JSON.stringify(c.name));
    }
  }
});

test('a facet named `journey` is still added, and a second one of the same name is still refused', () => {
  assert.deepEqual({ ...sandbox.validateFacetName('  journey ', []) }, { valid: true, name: 'journey' });
  assert.equal(sandbox.validateFacetName('journey', [{ name: 'journey' }]).valid, false);
});
