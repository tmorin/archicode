'use strict';
// A saved view whose facet is written in the earlier Jayway dialect (wave 019, run 0138, issue #137, third part of the rough edges of wave 018): the kernel refuses the path with one
// sentence that names the standard form (#128, facet-dialect-cases.json), and the page shows that sentence as the error of the view, where the diagram would be. The harness has no
// layout engine: the page is the real `render()` over the real kernel, with a fake layout and a fake canvas, as library-view-diagram.test.js has it. Everything here is invented.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { openFixture } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'facet-dialect-cases.json'), 'utf8'));

async function startPage() {
  const { sandbox, state, kernel } = await openFixture();
  sandbox.window.showDirectoryPicker = function showDirectoryPicker() {};
  sandbox.__elk = { layout: async (graph) => ({ ...graph, x: 0, y: 0, width: 900, height: 600, children: [], edges: [] }) };
  run(sandbox, 'loadElk = async () => __elk;');
  const app = sandbox.document.getElementById('app');
  const originalGet = sandbox.document.getElementById;
  let html = '';
  let canvas = null;
  Object.defineProperty(app, 'innerHTML', { get: () => html, set: (value) => { html = value; canvas = null; }, configurable: true });
  const canvasOf = () => {
    if (canvas) return canvas;
    const tag = /<div class="diagram-canvas" id="diagram-canvas"([^>]*)>/.exec(html);
    if (!tag) return null;
    const attributes = {};
    for (const m of tag[1].matchAll(/([\w-]+)(?:="([^"]*)")?/g)) attributes[m[1]] = m[2] === undefined ? '' : m[2];
    canvas = {
      attributes, innerHTML: '', clientWidth: 800, clientHeight: 600, parentElement: null,
      classList: { add() {}, remove() {}, contains: () => false },
      getAttribute: (name) => (name in attributes ? attributes[name] : null),
      hasAttribute: (name) => name in attributes,
      querySelector: () => null, querySelectorAll: () => [], contains: () => false, focus() {},
      getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 600 })
    };
    return canvas;
  };
  sandbox.document.getElementById = (id) => (id === 'diagram-canvas' ? canvasOf() : originalGet(id));
  return { sandbox, state, kernel, html: () => html, canvasOf };
}

async function drawn(page) {
  for (let i = 0; i < 400; i++) {
    const c = page.canvasOf();
    if (c && c.innerHTML !== '') return c;
    await new Promise((resolve) => setImmediate(resolve));
  }
  throw new Error('nothing was put on the canvas');
}

test('a saved view through a facet in the Jayway dialect shows the one sentence of the kernel as its error, and the standard form draws', async () => {
  const page = await startPage();
  const { sandbox, state } = page;
  const refused = CASES.refused.find((c) => c.id === 'F3');
  const facets = state.workspace.settings.facets.customs;
  facets.push({ name: 'old-dialect', hideUnlinked: false, actions: [{ operator: 'REMOVE', jsonPath: refused.path }] });
  facets.push({ name: 'standard', hideUnlinked: false, actions: [{ operator: 'REMOVE', jsonPath: '$..relationships[?(!@.qualifiers)]' }] });
  const view = sandbox.createManifestEntry('view', { id: 'jayway', name: 'Jayway', layer: 'application', viewpoint: 'deep', properties: { element: 'shop', facet: 'old-dialect' } });
  run(sandbox, "libraryTab = 'views'; selectedViewId = " + JSON.stringify(view.id) + ";");
  sandbox.setPerspective('library');
  const canvas = await drawn(page);
  const scene = run(sandbox, 'diagramScene');
  const text = canvas.innerHTML + ' ' + (scene && scene.html ? scene.html : '') + ' ' + page.html();
  assert.ok(text.includes(refused.error.replace(/&/g, '&amp;').replace(/</g, '&lt;')) || text.includes(refused.error), 'the page says: ' + text.slice(0, 600));
  assert.equal(scene && scene.hasSvg, false, 'no diagram is drawn');
  // the standard form of the same facet draws
  const ok = sandbox.createManifestEntry('view', { id: 'standard', name: 'Standard', layer: 'application', viewpoint: 'deep', properties: { element: 'shop', facet: 'standard' } });
  run(sandbox, "selectedViewId = " + JSON.stringify(ok.id) + ";");
  sandbox.render();
  await drawn(page);
  assert.equal(run(sandbox, 'diagramScene').hasSvg, true);
});

test('every sentence the kernel says of a facet it refuses is the error of the view, not "the facet removes this element" (wave 019, #137: the list had missed "a facet left an element without an id")', async () => {
  const { sandbox, kernel } = await openFixture();
  const refusals = [
    'the facet path `$..x[?(@.qualifiers anyof [\'a\'])]` uses `@.qualifiers anyof [\'a\']`, which is not JSONPath (RFC 9535) and is no longer read',
    'unsupported facet action: ADD $..x',
    'invalid facet JSONPath $..[: expected a selector',
    'a facet cannot remove the whole workspace: $',
    'a facet left an unreadable relationship of shop: invalid type',
    'a facet left an unreadable `uses` in shop',
    'a facet left an element without an id'
  ];
  for (const error of refusals) assert.equal(sandbox.facetRemovesElement(kernel, 'overview', 'shop', 'application', error), false, error);
  // an element the view draws without the facet and not with it is what a removal looks like
  assert.equal(sandbox.facetRemovesElement(kernel, 'overview', 'shop', 'application', 'dangling reference: shop'), true);
});
