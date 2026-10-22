'use strict';
// The key under a comparison is folded (wave 018, run 0130, issue #132). Folded, it is one row: a sample, a glyph, a word and a count for each state (the sample carries the line style,
// so it reads without colour) and a Key button; open, it also says how each line is drawn and the note about dangling references, capped at about 30 % of the diagram area, with its own
// scroll. The open key holds what it held (plateau-compare.test.js, replaces-editor.test.js, changes-panel.test.js read its text). The choice is view state: kept while the editor stays
// open on the folder, dropped with it, no `modelsChanged()`, not in the address, not in the cache key of the diagram. The harness has no layout, so the heights are measured in a
// browser (see the run's document); here: the markup, the rules of the page, and the state.
// Everything here is invented. Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const CSS = HTML.slice(HTML.indexOf('<style>'), HTML.indexOf('</style>'));
const run = (sandbox, code) => vm.runInContext(code, sandbox);

const COUNTS = {
  new: { boxes: 2, links: 1 }, changed: { boxes: 1, links: 0 }, removed: { boxes: 3, links: 2 }, 'contains-changes': { boxes: 1 },
  moved: { boxes: 0 }, split: { boxes: 0 }, merged: { boxes: 0 }
};
const keyHtml = (sandbox) => sandbox.diagramComparisonLegendHtml({ target: { id: 'to-be', name: 'To be' }, base: { id: 'as-is', name: 'As is' }, layers: true }, COUNTS);

/** The key as a page would have it: the button and the group, with the attributes `syncDiagramKey` sets. */
function giveKey(sandbox) {
  const attributes = { 'aria-expanded': 'false' };
  const classes = new Set(['dg-legend-compare']);
  const properties = {};
  const button = { getAttribute: (name) => attributes[name], setAttribute: (name, value) => { attributes[name] = value; } };
  const holder = { clientHeight: 600 };
  const key = {
    classList: { toggle: (name, on) => { if (on) classes.add(name); else classes.delete(name); }, contains: (name) => classes.has(name) },
    querySelector: (selector) => (selector === '[data-action="toggle-diagram-key"]' ? button : null),
    closest: (selector) => (selector === '.diagram-status' ? { parentElement: holder } : null),
    style: { setProperty: (name, value) => { properties[name] = value; } }
  };
  const doc = sandbox.document;
  const original = doc.getElementById;
  doc.getElementById = (id) => (id === 'diagram-key' ? key : original.call(doc, id));
  return { attributes, classes, properties };
}

test('the key is a folded row with a Key button that says what it opens', async () => {
  const sandbox = createApp({});
  await sandbox.loadViewpointKernel(); // the words of the states come from the kernel
  const html = keyHtml(sandbox);
  assert.match(html, /<button type="button" class="dg-legend-toggle" data-action="toggle-diagram-key" aria-expanded="false" aria-controls="diagram-key" title="[^"]*">Key<\/button>/);
  assert.match(html, /id="diagram-key"/, 'aria-controls names the key');
  // every state keeps its sample, its glyph, its word and its count in the entry, whatever the state of the key is; the sentence and the note are there, hidden by the folded row
  for (const state of ['new', 'changed', 'removed', 'contains-changes']) {
    const entry = html.split('<span class="dg-legend-state"').find((chunk) => chunk.startsWith(' data-state="' + state + '"'));
    assert.ok(entry, state);
    assert.match(entry, /<svg/);
    assert.match(entry, /class="dg-glyph"/);
    assert.match(entry, /dg-legend-count/);
    assert.match(entry, /dg-legend-how/);
  }
  assert.match(html, /class="dg-legend-note"/);
});

test('the rules of the page: folded hides the sentences and the note, open is capped and scrolls, a narrow screen keeps one row', () => {
  assert.match(CSS, /\.dg-legend-compare:not\(\.dg-key-open\) \.dg-legend-how, [^{]*\.dg-legend-note[^{]*\{ display: none; \}/);
  assert.match(CSS, /\.dg-legend-compare\.dg-key-open \{ max-height: var\(--dg-key-max, 30vh\); overflow-y: auto; \}/);
  assert.match(CSS, /@media \(max-width: 700px\) \{ \.dg-legend-compare:not\(\.dg-key-open\) \{ flex-wrap: nowrap; overflow-x: auto;/);
  assert.match(CSS, /\.dg-legend-toggle\[aria-expanded="true"\]/);
});

test('the Key button opens and folds the key in place, and says so with aria-expanded; the cap is 30 % of the diagram area', () => {
  const sandbox = createApp({});
  const page = giveKey(sandbox);
  assert.equal(run(sandbox, 'diagramKeyOpen'), false, 'folded by default');
  const target = { getAttribute: (name) => (name === 'data-action' ? 'toggle-diagram-key' : null), closest: () => null };
  const click = () => sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
  const version = run(sandbox, 'modelVersion');
  click();
  assert.equal(run(sandbox, 'diagramKeyOpen'), true);
  assert.equal(page.attributes['aria-expanded'], 'true');
  assert.equal(page.classes.has('dg-key-open'), true);
  assert.equal(page.properties['--dg-key-max'], '180px');
  click();
  assert.equal(page.attributes['aria-expanded'], 'false');
  assert.equal(page.classes.has('dg-key-open'), false);
  assert.equal(run(sandbox, 'modelVersion'), version, 'view state: no modelsChanged()');
});

test('the choice is kept when the diagram is drawn again, and is not in the address, the workspace or the cache key', () => {
  const sandbox = createApp({});
  const page = giveKey(sandbox);
  run(sandbox, 'diagramKeyOpen = true');
  run(sandbox, 'syncDiagramKey()'); // what `showDiagramScene` does after it puts the same markup back
  assert.equal(page.attributes['aria-expanded'], 'true');
  assert.equal(page.classes.has('dg-key-open'), true);
  const source = (name) => HTML.slice(HTML.indexOf('function ' + name + '('), HTML.indexOf('\n}\n', HTML.indexOf('function ' + name + '(')));
  for (const name of ['diagramCacheKey', 'syncHashFromState', 'diagramComparisonLegendHtml']) {
    assert.doesNotMatch(source(name), /diagramKeyOpen/, name + ' does not know it');
  }
});

test('a new folder folds the key again', () => {
  const sandbox = createApp({});
  run(sandbox, 'diagramKeyOpen = true');
  run(sandbox, 'resetUiState()');
  assert.equal(run(sandbox, 'diagramKeyOpen'), false);
});

test('a resize of the window sets the cap of the open key again (wave 019, run 0138, #137)', () => {
  const sandbox = createApp({});
  const page = giveKey(sandbox);
  run(sandbox, 'diagramKeyOpen = true');
  run(sandbox, 'syncDiagramKey()');
  assert.equal(page.properties['--dg-key-max'], '180px');
  // the diagram area is taller now: the window was resized, and the page listens
  const holder = sandbox.document.getElementById('diagram-key').closest('.diagram-status').parentElement;
  holder.clientHeight = 1000;
  const listeners = sandbox.__windowListeners.resize || [];
  assert.ok(listeners.length > 0, 'the page listens to resize');
  const version = run(sandbox, 'modelVersion');
  for (const fn of listeners) fn();
  assert.equal(page.properties['--dg-key-max'], '300px');
  assert.equal(run(sandbox, 'modelVersion'), version, 'view state: no modelsChanged()');
  // a folded key has no cap to set
  run(sandbox, 'diagramKeyOpen = false');
  holder.clientHeight = 500;
  for (const fn of listeners) fn();
  assert.equal(page.properties['--dg-key-max'], '300px', 'folded: left as it was');
});
