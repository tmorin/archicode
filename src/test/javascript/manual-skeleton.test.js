'use strict';
// The skeleton of the manual (wave 030, W-3, DEC-6): six parts by kind of reading, every address kept, no draft line.
// manual-anchors.json lists the explicit ids of the manual before the move. W-4 and W-5 may add an id to it, never remove one.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../doc/README.adoc'), 'utf8');
const ANCHORS = JSON.parse(fs.readFileSync(path.resolve(__dirname, 'manual-anchors.json'), 'utf8'));
const LINES = MANUAL.split('\n');

const PARTS = ['Start here', 'Tutorials', 'How-to guides', 'Reference', 'Concepts', 'Upgrading'];

/** The level-0 headings: index of the line and title, the document title included. */
const levelZero = LINES.flatMap((line, index) => {
  const match = /^= (.+)$/.exec(line);
  return match ? [{ index, title: match[1] }] : [];
});

/** The part that holds a line: the last level-0 heading above it after the title, or null above the first part. */
function partOf(index) {
  const above = levelZero.filter((heading) => heading.index < index && PARTS.includes(heading.title));
  return above.length === 0 ? null : above[above.length - 1].title;
}

function lineOfAnchor(id) {
  return LINES.findIndex((line) => line.startsWith(`[[${id}]]`));
}

function lineOfHeading(title) {
  return LINES.findIndex((line) => new RegExp(`^=+ ${title.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`).test(line));
}

test('the fixture is sorted, without duplicate, and holds the 91 ids of the manual before the move (W-4 and W-5 may add, never remove)', () => {
  assert.equal(ANCHORS.length, 91);
  assert.deepEqual(ANCHORS, [...ANCHORS].sort());
  assert.equal(new Set(ANCHORS).size, ANCHORS.length);
});

test('every id of the fixture is defined, at the start of a line or inline', () => {
  for (const id of ANCHORS) {
    // An inline anchor can carry a reference text (`[[id,Text]]`, run 0214, CON-3).
    assert.ok(MANUAL.includes(`[[${id}]]`) || MANUAL.includes(`[[${id},`), `the anchor ${id} is gone`);
  }
});

test('the level-0 headings after the title are the six parts, in order', () => {
  assert.equal(levelZero[0].title, 'ArchiCode');
  assert.deepEqual(
    levelZero.slice(1).map((heading) => heading.title),
    PARTS
  );
});

test('the anchors upgrade-0-17 to upgrade-0-22 sit after the Upgrading heading', () => {
  const upgrading = levelZero.find((heading) => heading.title === 'Upgrading');
  assert.ok(upgrading, 'no Upgrading part');
  for (let minor = 17; minor <= 22; minor += 1) {
    const line = lineOfAnchor(`upgrade-0-${minor}`);
    assert.ok(line > upgrading.index, `upgrade-0-${minor} is not under Upgrading`);
  }
});

test('no line of the manual is a draft line (starts with //)', () => {
  const drafts = LINES.flatMap((line, index) => (line.startsWith('//') ? [index + 1] : []));
  assert.deepEqual(drafts, []);
});

test('the header says the manual is a book with a table of contents of one level below the parts', () => {
  const header = LINES.slice(0, levelZero.length > 1 ? levelZero[1].index : 20).join('\n');
  assert.match(header, /^:doctype: book$/m);
  assert.match(header, /^:toclevels: 1$/m);
});

test('the walkthroughs and the tutorial are Tutorials, Domain, Editor and Commands are Reference', () => {
  const placed = [
    ['Tutorials', lineOfHeading('Example: An ecommerce platform')],
    ['Tutorials', lineOfAnchor('facets')],
    ['Tutorials', lineOfHeading('A tutorial: from one workspace to a review of the changes')],
    ['Reference', lineOfAnchor('domain')],
    ['Reference', lineOfAnchor('editor')],
    ['Reference', lineOfHeading('Commands')]
  ];
  for (const [part, line] of placed) {
    assert.ok(line >= 0, `a block that DEC-2 places under ${part} is not found`);
    assert.equal(partOf(line), part, `line ${line + 1} is not under ${part}`);
  }
});

test('the manual does not promise a pluggable Viewpoint Service', () => {
  assert.equal(MANUAL.includes('Pluggable Viewpoint Service'), false);
});
