'use strict';
// One look for `split` in both tools (run 0054, issue 42, decision D-4 of wave 010). The command line draws a box with `LineStyle: N`, a dash and a gap of N, and
// cannot draw a dash-dot, so the editor takes the same plain pair; and no other state has it, in either tool, so that the line of `split` is told from the others.
// The command line is read from its source (`ChangeMarks.java`), so that one side cannot change without the other.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');

const CHANGE_MARKS = fs.readFileSync(path.resolve(__dirname, '../../../main/java/io/morin/archicode/rendering/plantuml/ChangeMarks.java'), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

/** The `LineStyle` of each state of the command line, from `ChangeMarks.style`. */
function commandLineStyles() {
  const body = CHANGE_MARKS.slice(CHANGE_MARKS.indexOf('Styles.Style style('));
  const out = {};
  // `default` is the style of `contains-changes`
  for (const [, state, rest] of body.matchAll(/(?:case ([A-Z_]+)|default) ->\s*(Styles\.Style\.builder\(\)[^;]*?\.build\(\));/g)) {
    out[state ? state.toLowerCase().replace('_', '-') : 'contains-changes'] = Number(/\.lineStyle\((\d+)\)/.exec(rest)[1]);
  }
  return out;
}

test('the editor draws `split` with the dash and the gap of the command line', () => {
  const cli = commandLineStyles();
  assert.deepEqual(Object.keys(cli).sort(), ['changed', 'contains-changes', 'merged', 'moved', 'new', 'removed', 'split'], 'every state is read');
  assert.equal(cli.split, 6);
  const sandbox = createApp();
  const look = plain(vm.runInContext('CHANGE_DEFAULT_LOOK', sandbox));
  assert.equal(look.split['--st-dash'], cli.split + ' ' + cli.split);
});

test('no other state has the pair of `split`, in either tool, and no line of the editor draws it', () => {
  const cli = commandLineStyles();
  const others = Object.keys(cli).filter((state) => state !== 'split');
  assert.equal(others.length, 6);
  for (const state of others) assert.notEqual(cli[state], cli.split, 'the command line: ' + state);
  const sandbox = createApp();
  const look = plain(vm.runInContext('CHANGE_DEFAULT_LOOK', sandbox));
  for (const state of Object.keys(look)) if (state !== 'split') assert.notEqual(look[state]['--st-dash'], look.split['--st-dash'], 'the editor: ' + state);
  // the lines of the page that are not a state (a grouped link, a dangling one, the edges of a change) draw other patterns: the CSS is read for any dash array equal to the pair
  const html = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  assert.ok(!/stroke-dasharray:\s*6[ ,]6\b/.test(html), 'no other line of the page is drawn with 6 6');
});

test('both keys say the same of `split`: medium dashes', () => {
  assert.match(CHANGE_MARKS, /split, one of several that replace one element: medium dashes/);
  const sandbox = createApp();
  assert.equal(plain(vm.runInContext('CHANGE_WORDS', sandbox)).split.box, 'medium dashed outline');
  const html = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
  assert.match(html, /split: 'medium dashes: one of several that replace one'/);
  assert.doesNotMatch(html, /dash-dot/);
});
