'use strict';
// The lines of removed, split and merged boxes differ visibly (run 0057, issue 55): each has a dash and a gap of its own, the same in the command line and in
// the editor, and no other state has them. The command line is read from its source (`ChangeMarks.java`), so that one side cannot change without the other.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');

const CHANGE_MARKS = fs.readFileSync(path.resolve(__dirname, '../../../main/java/io/morin/archicode/rendering/plantuml/ChangeMarks.java'), 'utf8');
const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../../doc/README.adoc'), 'utf8');
const plain = (value) => JSON.parse(JSON.stringify(value));

/** The dash and the gap of each state of the command line (`LineStyle: <dash>-<gap>`, a gap as long as the dash without one), from `ChangeMarks.style`. */
function commandLinePairs() {
  const body = CHANGE_MARKS.slice(CHANGE_MARKS.indexOf('Styles.Style style('));
  const out = {};
  for (const [, state, rest] of body.matchAll(/(?:case ([A-Z_]+)|default) ->\s*(Styles\.Style\.builder\(\)[^;]*?\.build\(\));/g)) {
    const dash = Number(/\.lineStyle\((\d+)\)/.exec(rest)[1]);
    const gap = /\.lineGap\((\d+)\)/.exec(rest);
    out[state ? state.toLowerCase().replace('_', '-') : 'contains-changes'] = [dash, gap ? Number(gap[1]) : dash];
  }
  return out;
}

const THREE = ['removed', 'split', 'merged'];

test('the editor draws removed, split, merged and moved with the dash and the gap of the command line', () => {
  const cli = commandLinePairs();
  assert.deepEqual(Object.keys(cli).sort(), ['changed', 'contains-changes', 'merged', 'moved', 'new', 'removed', 'split']);
  assert.deepEqual(cli.removed, [16, 3]);
  assert.deepEqual(cli.split, [8, 8]);
  assert.deepEqual(cli.merged, [3, 9]);
  const look = plain(vm.runInContext('CHANGE_DEFAULT_LOOK', createApp()));
  for (const state of [...THREE, 'moved']) assert.equal(look[state]['--st-dash'], cli[state].join(' '), state);
});

test('the three pairs differ pairwise and from every other state, by at least 4 in the dash or in the gap, in both tools', () => {
  const cli = commandLinePairs();
  const look = plain(vm.runInContext('CHANGE_DEFAULT_LOOK', createApp()));
  const editor = {};
  for (const state of Object.keys(look)) {
    const dash = look[state]['--st-dash'];
    if (dash !== 'none') editor[state] = dash.split(' ').map(Number);
  }
  for (const [tool, pairs] of [['the command line', Object.fromEntries(Object.entries(cli).filter(([, p]) => p[0] > 0))], ['the editor', editor]]) {
    for (const state of THREE) {
      for (const other of Object.keys(pairs)) {
        if (other === state || (THREE.includes(other) && other < state)) continue;
        const apart = Math.max(Math.abs(pairs[state][0] - pairs[other][0]), Math.abs(pairs[state][1] - pairs[other][1]));
        assert.ok(apart >= 4, tool + ': ' + state + ' ' + pairs[state].join('-') + ' and ' + other + ' ' + pairs[other].join('-') + ' are ' + apart + ' apart');
      }
    }
  }
});

test('the keys of the command line, of the editor and of the two manual tables say the same lines', () => {
  const words = plain(vm.runInContext('CHANGE_WORDS', createApp()));
  // what each state says of its line, in every place that says it
  const says = {
    removed: { lead: 'removed: ', phrases: ['long dashes', 'narrow gaps'] },
    moved: { lead: 'moved or renamed', phrases: ['long dashes', 'wide gaps'] },
    split: { lead: 'split, one of several', phrases: ['medium dashes'] },
    merged: { lead: 'merged, replaces several', phrases: ['short dashes', 'far apart'] }
  };
  const legend = HTML.slice(HTML.indexOf('function diagramComparisonLegendHtml'));
  const rows = MANUAL.split('\n').filter((line) => /^\| (removed|moved|split|merged) \| /.test(line));
  assert.equal(rows.length, 8, 'each of the four states is in the two tables of the manual');
  for (const [state, { lead, phrases }] of Object.entries(says)) {
    const where = {
      'the legend of the command line': (CHANGE_MARKS.split('\n').find((line) => line.includes('.append("** | ' + lead)) || ''),
      'the words of the editor': words[state].box,
      'the key of the editor': new RegExp('\\b' + state + ": '([^']*)'").exec(legend)[1],
      'the table of the command line (plateau-comparison)': rows.filter((line) => line.startsWith('| ' + state + ' | '))[0],
      'the table of the editor (editor-compare)': rows.filter((line) => line.startsWith('| ' + state + ' | '))[1]
    };
    for (const [place, text] of Object.entries(where)) for (const phrase of phrases) assert.ok(text.includes(phrase), state + ' in ' + place + ' says "' + phrase + '": ' + text);
  }
});

test('`line-gap` is the gap of `line-style` in the editor, as in the command line: without it the gap is the dash, alone it means nothing', () => {
  const sandbox = createApp();
  const dash = (style) => plain(vm.runInContext('styleLookOf(' + JSON.stringify(style) + ')', sandbox)).vars['--st-dash'];
  assert.equal(dash({ 'line-style': 5 }), '5 5');
  assert.equal(dash({ 'line-style': 16, 'line-gap': 3 }), '16 3');
  assert.equal(dash({ 'line-style': '3', 'line-gap': '9' }), '3 9');
  assert.equal(dash({ 'line-style': 0, 'line-gap': 3 }), 'none');
  assert.equal(dash({ 'line-gap': 3 }), undefined);
  // the author's `line-style` on a state replaces the dash of the default and its gap with it
  const vars = plain(vm.runInContext('changeDefaultVars("removed", { "line-style": 7 })', sandbox));
  assert.equal('--st-dash' in vars, false);
});
