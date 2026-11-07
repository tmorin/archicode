'use strict';
// The rule of the plateau matrix (model/plateau-matrix.js, the port of rendering/matrix/PlateauMatrix.java) on small hand-made inputs. The expected values are written from the comment
// of the Java class, not from the code: a predecessor is a reference a node `replaces` that the plateau on its left holds, else its own reference; a row is traced back from a node no
// node of the next plateau names; a split origin is drawn in the row of each result, a merge is one row; the Span of a row is the comparison of the first plateau with the last,
// `removed` for a row that begins in the first plateau and ends before the last, null for a transient; a row with no change is counted in `unchanged`.
// Everything here is invented.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');

const sandbox = createApp({});
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const matrixOf = (...args) => plain(sandbox.plateauMatrixOf(...args));

const node = (reference, layer = 'application') => ({
  layer,
  reference,
  kind: 'container',
  name: reference.toUpperCase()
});
const change = (reference, word, extra = {}, layer = 'application') =>
  Object.assign({ layer, reference, change: word }, extra);
const cols = (...ids) => ids.map((id) => ({ id }));
const states = (row) => row.cells.map((cell) => cell.state);
const byReference = (matrix, reference) => matrix.rows.find((row) => row.reference === reference);

test('an element that changes in a pair is a row, one that does not is counted', () => {
  const m = matrixOf(
    cols('a', 'b'),
    [
      [node('x'), node('y')],
      [node('x'), node('y')]
    ],
    [[change('x', 'changed', { natures: ['name'] })]],
    null
  );
  assert.equal(m.unchanged, 1);
  assert.equal(m.rows.length, 2);
  const x = byReference(m, 'x');
  assert.equal(x.changes, true);
  assert.deepEqual(states(x), ['present', 'changed']);
  assert.deepEqual(x.cells[1].natures, ['name']);
  assert.equal(x.span, null, 'two plateaus have no Span');
  const y = byReference(m, 'y');
  assert.equal(y.changes, false);
  assert.deepEqual(states(y), ['present', 'present']);
});

test('a new element is absent before, an element the next plateau lacks is removed, then absent', () => {
  const m = matrixOf(
    cols('a', 'b', 'c'),
    [[node('gone')], [node('fresh')], [node('fresh')]],
    [[change('fresh', 'new')], []],
    [change('fresh', 'new')]
  );
  assert.deepEqual(states(byReference(m, 'fresh')), ['absent', 'new', 'present']);
  assert.equal(byReference(m, 'fresh').span.state, 'new');
  const gone = byReference(m, 'gone');
  assert.deepEqual(states(gone), ['present', 'removed', 'absent']);
  assert.equal(gone.span.state, 'removed', 'a row that begins in the first plateau and ends before the last');
});

test('a split origin is drawn in the row of each of its results', () => {
  const m = matrixOf(
    cols('a', 'b'),
    [[node('old')], [node('left'), node('right')]],
    [[change('left', 'split', { replaces: ['old'] }), change('right', 'split', { replaces: ['old'] })]],
    null
  );
  assert.equal(m.rows.length, 2);
  for (const reference of ['left', 'right']) {
    const row = byReference(m, reference);
    assert.deepEqual(states(row), ['present', 'split']);
    assert.equal(row.cells[0].reference, 'old');
    assert.deepEqual(row.cells[1].from, ['old']);
  }
});

test('a merge is one row whose first cell lists no origin and whose second lists the origins', () => {
  const m = matrixOf(
    cols('a', 'b'),
    [[node('one'), node('two')], [node('both')]],
    [[change('both', 'merged', { replaces: ['one', 'two'] })]],
    null
  );
  assert.equal(m.rows.length, 1);
  const row = m.rows[0];
  assert.equal(row.reference, 'both');
  assert.deepEqual(states(row), ['absent', 'merged']);
  assert.deepEqual(row.cells[1].from, ['one', 'two']);
  assert.equal(row.cells[0].reference, null);
});

test('a moved element is followed through replaces, and its Span is the comparison of the first with the last', () => {
  const m = matrixOf(
    cols('a', 'b', 'c'),
    [[node('x')], [node('y')], [node('y')]],
    [[change('y', 'moved', { replaces: ['x'] })], []],
    [change('y', 'moved', { replaces: ['x'] })]
  );
  assert.equal(m.rows.length, 1);
  const row = m.rows[0];
  assert.deepEqual(
    row.cells.map((cell) => cell.reference),
    ['x', 'y', 'y']
  );
  assert.deepEqual(states(row), ['present', 'moved', 'present']);
  assert.deepEqual(row.span, { state: 'moved', from: ['x'], natures: [] });
});

test('a transient row (born after the first plateau, gone before the last) has no Span', () => {
  const m = matrixOf(cols('a', 'b', 'c'), [[], [node('t')], []], [[change('t', 'new')], []], []);
  const row = byReference(m, 't');
  assert.deepEqual(states(row), ['absent', 'new', 'removed']);
  assert.equal(row.span, null);
  assert.equal(row.changes, true);
});

test('the rows are sorted by layer, then reference by code point, then first column', () => {
  const astral = '\u{1F600}'; // two UTF-16 units, one code point above the BMP
  const bmpHigh = 'Ａ'; // a single unit above the surrogates: UTF-16 order puts the astral reference first, code point order last
  const m = matrixOf(
    cols('a', 'b'),
    [[], [node(astral), node(bmpHigh), node('b'), node('A'), node('z', 'technology'), node('a', 'technology')]],
    [
      [astral, bmpHigh, 'b', 'A']
        .map((r) => change(r, 'new'))
        .concat([change('z', 'new', {}, 'technology'), change('a', 'new', {}, 'technology')])
    ],
    null
  );
  assert.deepEqual(
    m.rows.map((row) => row.layer + ':' + row.reference),
    [
      'application:A',
      'application:b',
      'application:' + bmpHigh,
      'application:' + astral,
      'technology:a',
      'technology:z'
    ]
  );
});

test('two plateaus have no Span, and a span given with two plateaus, or missing with three, is refused', () => {
  const sentence =
    /a matrix is made of two plateaus or more, their elements, one comparison per step and, from three plateaus, a span/;
  assert.throws(() => sandbox.plateauMatrixOf(cols('a', 'b'), [[], []], [[]], []), sentence);
  assert.throws(() => sandbox.plateauMatrixOf(cols('a', 'b', 'c'), [[], [], []], [[], []], null), sentence);
});

test('sizes that disagree are refused', () => {
  const sentence = /a matrix is made of two plateaus or more/;
  assert.throws(() => sandbox.plateauMatrixOf(cols('a'), [[]], [], null), sentence);
  assert.throws(() => sandbox.plateauMatrixOf(cols('a', 'b'), [[]], [[]], null), sentence);
  assert.throws(() => sandbox.plateauMatrixOf(cols('a', 'b'), [[], []], [], null), sentence);
});

test('the same input gives the same rows', () => {
  const args = [cols('a', 'b'), [[node('x')], [node('x'), node('n')]], [[change('n', 'new')]], null];
  assert.deepEqual(matrixOf(...args), matrixOf(...args));
});
