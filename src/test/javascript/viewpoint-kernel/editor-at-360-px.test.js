'use strict';
// Wave 017, run 0124 (W-6), issue #82: the editor at 360 px.
// Measured in the built-in browser at 360x800 (`getBoundingClientRect`, `scrollWidth`) on a copy of the layered Brightcart and of the example `domain_application`, light
// theme, on every page (Plateaus, Applications, Environments, Elements, Stories, Files, Settings), in the forms of an element, a story and a view and in the dialogs. The
// document is 360 px wide everywhere. Four places went past the window, inside the scroll of the centre panel (`#panel-center`, 360 px wide, `scrollWidth` greater):
//   - the row that adds a tag (two text fields and the *Add* button) in the form of an element: right edge at x 492 (`scrollWidth` 492);
//   - the four buttons of the header of an element that can hold children and be moved (Delete, Move, Add child, Back to view): right edge at x 373;
//   - the list *Add a saved view as the last step* of a story: right edge at x 412 (`scrollWidth` 412), as wide as its longest view name;
//   - the lists of *Confirm delete* (the elements inside, the manifests removed): one unbroken word each, `scrollWidth` 541 for a reference of four segments and the path of its
//     manifest, on `domain_application`.
// The harness has no layout engine, so what is pinned here is the stylesheet the browser is given: the rules of the rows, the list and *Confirm delete* are in the query for the
// narrow window and nowhere else, and the buttons of the header are on the form (a row that fits does not wrap), so a window wider than 40rem is drawn exactly as it was. The numbers above are the ones the browser gave before the rules; after them the same scan finds no element of any
// page, form or dialog past x 360 and the `scrollWidth` of the centre is 360 (the run's document has the table).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>')).replace(/\/\*[\s\S]*?\*\//g, '');

/** The body of the one query for the narrow window. */
const narrow = () => {
  assert.equal((CSS.match(/@media \(max-width: 40rem\)/g) || []).length, 1, 'one query for the narrow window');
  const at = CSS.indexOf('@media (max-width: 40rem) {');
  let depth = 0;
  for (let i = CSS.indexOf('{', at); i < CSS.length; i++) {
    if (CSS[i] === '{') depth++;
    if (CSS[i] === '}' && --depth === 0) return CSS.slice(CSS.indexOf('{', at) + 1, i);
  }
  throw new Error('the query is not closed');
};

/** The declarations of every rule of `css` whose selector list has `selector` as one of its selectors, joined. */
const declarationsFor = (css, selector) => {
  const found = [];
  for (const m of css.matchAll(/([^{}]+)\{([^{}]*)\}/g)) if (m[1].split(',').map((x) => x.trim()).includes(selector)) found.push(m[2]);
  return found.join(';');
};

test('at 360 px the row that adds a tag, a qualifier or a relationship wraps, and its fields are never wider than the row', () => {
  const rules = narrow();
  assert.match(declarationsFor(rules, '.edition-add-row'), /flex-wrap:\s*wrap/);
  for (const field of ['.edition-add-row input[type="text"]', '.edition-add-row select']) {
    const css = declarationsFor(rules, field);
    assert.match(css, /max-width:\s*100%/, field);
    assert.match(css, /min-width:\s*0/, field);
  }
});

test('the buttons in the header of the form of an element wrap instead of going past the edge (345 px of buttons in a 304 px row at 360 px)', () => {
  // a rule on the form, not in the window query: the header is told by the width of the centre, not by the window (header.test.js, "the strip is gone"), and a row that fits does not wrap
  const css = declarationsFor(CSS, '.element-edition-form .element-header-actions');
  assert.match(css, /flex-wrap:\s*wrap/);
  assert.match(css, /flex-shrink:\s*1/, 'the group may be narrower than its buttons side by side (it is flex-shrink: 0 in the other headers)');
  assert.match(css, /min-width:\s*0/);
  assert.match(css, /max-width:\s*100%/);
  assert.equal(declarationsFor(narrow(), '.element-header-actions'), '', 'the window query does not name the header');
  assert.match(declarationsFor(CSS, '.element-header-actions'), /flex-shrink:\s*0/, 'the other headers keep their row');
  assert.doesNotMatch(declarationsFor(CSS, '.element-header-actions'), /flex-wrap/);
});

test('the form of an element is the one that holds the header with Delete, Move, Add child and Back to view', () => {
  const form = HTML.slice(HTML.indexOf("let html = '<div class=\"element-edition-form\">';"));
  const header = form.slice(0, form.indexOf('// TDD-0010 DEC-4: a pending delete'));
  assert.match(header, /html \+= renderElementHeaderHtml\(/);
  for (const action of ['request-delete-element', 'open-move-dialog', 'open-create-child-form', 'toggle-element-edit']) assert.ok(header.includes(action), action);
});

test('at 360 px the list of saved views under a story is never wider than its row', () => {
  const css = declarationsFor(narrow(), '.story-add select');
  assert.match(css, /max-width:\s*100%/);
  assert.match(css, /min-width:\s*0/);
});

test('at 360 px the references and the paths that Confirm delete lists break where they must', () => {
  assert.match(declarationsFor(narrow(), '.delete-confirmation li'), /overflow-wrap:\s*anywhere/);
});

test('the wide layout is untouched: the three rows keep their declarations outside the query', () => {
  const outside = CSS.replace(narrow(), '');
  assert.match(declarationsFor(outside, '.edition-add-row'), /display:\s*flex/);
  assert.doesNotMatch(declarationsFor(outside, '.edition-add-row'), /flex-wrap/, 'the row of fields does not wrap in a wide window');
  assert.doesNotMatch(declarationsFor(outside, '.story-add select'), /max-width/);
  assert.doesNotMatch(declarationsFor(outside, '.delete-confirmation li'), /overflow-wrap/);
});

test('the rows of the forms of the centre that hold two fields and a button are the ones the narrow rule names', () => {
  // every row of that class is written with the class `edition-add-row`: a row of fields that has its own class would not be wrapped, so it is looked for here
  const rows = [...HTML.matchAll(/class="(edition-add-row[^"]*)"/g)].map((m) => m[1]);
  assert.ok(rows.length >= 6, 'the page writes ' + rows.length + ' rows of that class');
  for (const row of rows) assert.equal(row, 'edition-add-row', 'a row with a second class has to be measured: ' + row);
});
