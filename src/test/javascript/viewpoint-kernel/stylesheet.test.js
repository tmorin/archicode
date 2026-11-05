'use strict';
// The self-tests of the reader of the stylesheet (stylesheet.js), on a small sheet.
const test = require('node:test');
const assert = require('node:assert/strict');
const { styleOf, rulesOf, declarationsOf, loadStylesheet } = require('./stylesheet');

const PAGE = `<html><head><style>
  /* a comment { not: a rule; } */
  :root { --bg: #fff; }
  .a { color: red; color: blue !important; content: "a;b"; }
  .b, .c { margin: 0 }
  @media (max-width: 600px) {
    .a { color: green; }
    @container (min-width: 10px) { .d { top: 1px; } }
  }
  .e { padding: 1px; }
  .twice { x: 1; }
  .twice { x: 2; }
</style></head><body></body></html>`;

const sheet = loadStylesheet(PAGE);

test('styleOf drops the comments and keeps the rules', () => {
  assert.ok(!styleOf(PAGE).includes('a comment'));
  assert.equal(rulesOf(styleOf(PAGE)).length, 8);
});

test('declarationsOf splits outside strings and parentheses and strips !important', () => {
  assert.deepEqual(declarationsOf('a: url(x;y); content: "a;b" ; b: 1 !important'), [
    ['a', 'url(x;y)'],
    ['content', '"a;b"'],
    ['b', '1']
  ]);
});

test('rule gives the declarations of the one rule at the top level', () => {
  assert.deepEqual(sheet.rule(':root'), [['--bg', '#fff']]);
  assert.deepEqual(sheet.rule('.b,  .c'), [['margin', '0']]);
});

test('decl gives the last value of a property, undefined when absent', () => {
  assert.equal(sheet.decl('.a', 'color'), 'blue');
  assert.equal(sheet.decl('.a', 'content'), '"a;b"');
  assert.equal(sheet.decl('.a', 'top'), undefined);
});

test('at selects the rule inside exactly those at-rules, nested ones included', () => {
  assert.equal(sheet.decl('.a', 'color', ['@media (max-width: 600px)']), 'green');
  assert.equal(sheet.decl('.a', 'color', ['max-width']), 'green');
  assert.equal(sheet.decl('.d', 'top', ['@media', '@container']), '1px');
  assert.equal(sheet.has('.d'), false);
  assert.equal(sheet.has('.d', ['@media']), false);
});

test('has is true for a match and false for none', () => {
  assert.equal(sheet.has('.twice'), true);
  assert.equal(sheet.has('.missing'), false);
});

test('a lookup with zero matches throws with the selector, the at and the near matches', () => {
  assert.throws(
    () => sheet.rule('.aa', ['@media']),
    (error) => /"\.aa"/.test(error.message) && /@media/.test(error.message) && /found 0/.test(error.message)
  );
  assert.throws(
    () => sheet.decl('.b', 'margin'),
    (error) => /near matches: "\.b, \.c"/.test(error.message)
  );
});

test('a lookup with several matches throws with the selector, the at and the near matches', () => {
  assert.throws(
    () => sheet.rule('.twice'),
    (error) =>
      /"\.twice"/.test(error.message) &&
      /top level/.test(error.message) &&
      /found 2/.test(error.message) &&
      /near matches: "\.twice" at \[\], "\.twice" at \[\]/.test(error.message)
  );
  assert.throws(() => sheet.decl('.twice', 'x'), /found 2/);
});

test('order tells which rule comes first in the source', () => {
  assert.equal(sheet.order(':root', '.b, .c'), true);
  assert.equal(sheet.order('.b, .c', ':root'), false);
  assert.equal(sheet.order(['.a', ['@media']], ['.d', ['@media', '@container']]), true);
  assert.throws(() => sheet.order('.twice', ':root'), /found 2/);
});

test('the sheet of one page is parsed once', () => {
  assert.equal(loadStylesheet(PAGE), sheet);
});
