'use strict';
// #68 (wave 013, run 0066): an element that is opened (Unfold all, or a box opened by hand), pinned or hidden on the Map and that a facet then removes
// no longer turns the Map into `dangling reference: <reference>`. The kernel checks `opened`, `pinned` and `hidden` against the elements the facet leaves;
// the editor drops from the three lists, before the kernel draws, what the facet removes (it keeps the user's choices: the lists of the page are untouched,
// so Facet: none brings back the open box, the pin or the hidden one). The page is the real `render()` over the real kernel and a fake layout engine, on the
// Brightcart folders (src/test/resources/brightcart/folders, invented), plateau baseline: the facet `journey` removes `backoffice`, among others.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { run, plain, startPage, click } = require('./library-page');

const FOLDERS = path.resolve(__dirname, '../../resources/brightcart/folders');

/** The Map of the plateau `baseline`, drawn, with the kernel and the page's own state. */
async function baselineMap() {
  const page = await startPage({ dir: FOLDERS, plateau: 'baseline' });
  await page.go('map');
  assert.equal(run(page.sandbox, 'currentPerspective'), 'map');
  return page;
}

/** The facet menu of the Map, driven the way the page hears it. */
async function chooseFacet(page, name) {
  page.sandbox.handleAppInput({ target: { id: 'diagram-facet-select', value: name, matches: () => false } });
  return page.drawn();
}

const text = (canvas) => canvas.innerHTML.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
const boxes = (page) => Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]);

test('Unfold all, then the facet journey: the Map is drawn, with no dangling reference', async () => {
  const page = await baselineMap();
  const before = boxes(page);
  assert.ok(before.includes('backoffice'), 'the Back office is on the Map before the facet');
  click(page.sandbox, { 'data-action': 'unfold-all' });
  await page.drawn();
  assert.ok(run(page.sandbox, 'Array.from(currentMapOpened())').includes('backoffice'), 'Unfold all opened the Back office');
  const canvas = await chooseFacet(page, 'journey');
  assert.doesNotMatch(text(canvas), /dangling reference/, text(canvas));
  assert.equal(run(page.sandbox, 'diagramFacet'), 'journey');
  const drawn = boxes(page);
  assert.ok(drawn.length > 0 && !drawn.includes('backoffice') && !drawn.some((id) => id.startsWith('backoffice.')), 'the facet removed the Back office: ' + drawn.join(', '));
  // the choice of the user is kept: without the facet the opened boxes are open again
  const without = await chooseFacet(page, '');
  assert.doesNotMatch(text(without), /dangling reference/);
  assert.ok(boxes(page).some((id) => id.startsWith('backoffice.')), 'Facet: none draws the Back office open again');
});

test('a pinned element and a hidden one that the facet removes are left out, and the others stay', async () => {
  for (const action of ['map-pin', 'map-hide']) {
    const page = await baselineMap();
    click(page.sandbox, { 'data-action': action, 'data-ref': 'backoffice' });
    await page.drawn();
    const canvas = await chooseFacet(page, 'journey');
    assert.doesNotMatch(text(canvas), /dangling reference/, action + ': ' + text(canvas));
    const drawn = boxes(page);
    assert.ok(drawn.length > 0 && !drawn.includes('backoffice'), action + ': ' + drawn.join(', '));
    const list = action === 'map-pin' ? 'mapPinned' : 'mapHidden';
    assert.deepEqual(plain(run(page.sandbox, 'Array.from(' + list + ')')), ['backoffice'], action + ': the page still remembers the choice');
  }
});

test('a pinned element that the facet leaves still pins the Map', async () => {
  const page = await baselineMap();
  click(page.sandbox, { 'data-action': 'map-pin', 'data-ref': 'shop' });
  await page.drawn();
  click(page.sandbox, { 'data-action': 'map-hide', 'data-ref': 'backoffice' });
  await page.drawn();
  const canvas = await chooseFacet(page, 'journey');
  assert.doesNotMatch(text(canvas), /dangling reference/);
  const drawn = boxes(page);
  assert.ok(drawn.includes('shop') && !drawn.includes('backoffice'), drawn.join(', '));
});
