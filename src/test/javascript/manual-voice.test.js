'use strict';
// The voice of the manual (wave 030, W-4, run 0214, DEC-7): one page about plateaus under Concepts, the filler words gone.
// It reads src/doc/README.adoc as text, or the file named by MANUAL_VOICE_PATH (the mutation check runs it on a copy).
// The checks are words, headings and the order of ids; the voice itself is judged by a reader, not by this file.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const MANUAL_PATH = process.env.MANUAL_VOICE_PATH || path.resolve(__dirname, '../../doc/README.adoc');
const MANUAL = fs.readFileSync(MANUAL_PATH, 'utf8');
const LINES = MANUAL.split('\n');

// The gate words (list A) and the other filler words (list B) of DEC-5, as prefixes of a word, case-insensitive.
const GATE_WORDS = /\b(?:journey|prowess|delve|unlock)/i;
const FILLER_WORDS =
  /\b(?:empower|embark|elevate|seamless|realm|intricate|pivotal|let['’]s|tapestry|in essence|leverage)/i;

/** The prose of the manual: listing blocks (between ---- lines) are blanked, then the inline code spans. Line numbers are kept. */
function prose(lines) {
  let inListing = false;
  return lines.map((line) => {
    if (/^-{4,}$/.test(line)) {
      inListing = !inListing;
      return '';
    }
    return inListing ? '' : line.replace(/`[^`\n]*`/g, '``');
  });
}

const PROSE = prose(LINES);

function hits(regex, exempt) {
  return PROSE.flatMap((line, index) =>
    regex.test(line) && !exempt?.test(line) ? [`${index + 1}: ${LINES[index].slice(0, 70)}`] : []
  );
}

/** The line index of the explicit id, at the start of a line or inline, or -1. */
function lineOfId(id) {
  return LINES.findIndex((line) => line.includes(`[[${id}]]`) || line.includes(`[[${id},`));
}

const headings = LINES.flatMap((line, index) => {
  const match = /^(=+) (.+)$/.exec(line);
  return match && !PROSE[index].startsWith('----') ? [{ index, level: match[1].length, title: match[2] }] : [];
});

function partOf(index) {
  const above = headings.filter((heading) => heading.level === 1 && heading.index < index);
  return above.length === 0 ? null : above[above.length - 1].title;
}

test('the gate words journey, prowess, delve and unlock are absent outside listings and code spans', () => {
  assert.deepEqual(hits(GATE_WORDS), []);
});

test('the other filler words are absent outside listings and code spans', () => {
  assert.deepEqual(hits(FILLER_WORDS), []);
});

test('the filler check is not vacuous: the words are found in a sample and ignored in a listing or a code span', () => {
  const sample = ['You unlock `journey` here.', '----', 'a journey', '----', 'It leverages the realm.'];
  const found = prose(sample).filter((line) => GATE_WORDS.test(line) || FILLER_WORDS.test(line));
  assert.deepEqual(found, ['You unlock `` here.', 'It leverages the realm.']);
});

test('exactly one heading is titled Plateaus, a == under the part Concepts, and Limits of today is the next == of that part', () => {
  const plateaus = headings.filter((heading) => /^Plateaus$/.test(heading.title));
  assert.equal(plateaus.length, 1, `${plateaus.length} headings titled Plateaus`);
  assert.equal(plateaus[0].level, 2, 'the page is not a == section');
  assert.equal(partOf(plateaus[0].index), 'Concepts');
  const level2InConcepts = headings.filter((heading) => heading.level === 2 && partOf(heading.index) === 'Concepts');
  const position = level2InConcepts.findIndex((heading) => heading.title === 'Plateaus');
  assert.equal(level2InConcepts[position + 1]?.title, 'Limits of today');
});

test('the old title States of an architecture is gone and no text calls a plateau a state', () => {
  assert.doesNotMatch(MANUAL, /states? of an architecture/i);
  assert.deepEqual(hits(/plateaus? (?:is|are) (?:a |an |the )?states?\b/i), []);
});

test('the Domain part holds no Plateaus or Comparing two plateaus heading and no definition of the page', () => {
  const domain = lineOfId('domain');
  const editor = lineOfId('editor');
  assert.ok(domain >= 0 && editor > domain, 'the Domain part is not found');
  const inDomain = headings.filter(
    (heading) =>
      heading.index > domain && heading.index < editor && /^(?:Plateaus|Comparing two plateaus)$/.test(heading.title)
  );
  assert.deepEqual(inDomain, []);
  const plateaus = lineOfId('plateaus');
  assert.ok(plateaus < domain || plateaus > editor, 'the anchor plateaus is still defined in Domain');
});

test('Domain ends its Workspace chapter with a pointer to the page', () => {
  const domain = lineOfId('domain');
  const editor = lineOfId('editor');
  const pointer = LINES.slice(domain, editor).filter((line) => /<<plateaus,\s*Plateaus>>/.test(line));
  assert.ok(pointer.length >= 1, 'no <<plateaus,Plateaus>> pointer in Domain');
});

test('the ids of the page come in the order of the page, after plateaus and before plateau-limits', () => {
  const order = [
    'plateaus',
    'plateau-header',
    'plateau-untied',
    'plateau-manifest',
    'plateau-patches',
    'plateau-cascade',
    'plateau-choose',
    'plateau-comparison',
    'plateau-state-tags',
    'plateau-replaces',
    'plateau-candidates',
    'plateau-replaces-warnings',
    'plateau-limits'
  ];
  const lines = order.map(lineOfId);
  order.forEach((id, index) => assert.ok(lines[index] >= 0, `the id ${id} is not defined`));
  for (let index = 1; index < order.length; index += 1) {
    assert.ok(lines[index] > lines[index - 1], `${order[index]} is not after ${order[index - 1]}`);
  }
});

test('plateaus-overview is defined once, inline, at the start of the first paragraph of the page', () => {
  const defined = LINES.flatMap((line, index) => (line.includes('[[plateaus-overview') ? [index] : []));
  assert.equal(defined.length, 1);
  assert.doesNotMatch(LINES[defined[0]], /^\[\[plateaus-overview[^\]]*\]\]$/, 'the anchor is alone on its line');
  assert.ok(LINES[defined[0]].startsWith('[[plateaus-overview'), 'the anchor does not start its paragraph');
});

test('no link is worded as in the Domain section', () => {
  assert.deepEqual(hits(/in the Domain section/i), []);
});

test('the Pluggable Viewpoint Service stays absent', () => {
  assert.doesNotMatch(MANUAL, /Pluggable Viewpoint Service/);
});
