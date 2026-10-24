'use strict';
// #68 (wave 013, run 0066): an element that is opened (Unfold all, or a box opened by hand), pinned or hidden on the Map and that a facet then removes
// no longer turns the Map into `dangling reference: <reference>`. The kernel checks `opened`, `pinned` and `hidden` against the elements the facet leaves;
// the editor drops from the three lists, before the kernel draws, what the facet removes (it keeps the user's choices: the lists of the page are untouched,
// so Facet: none brings back the open box, the pin or the hidden one). The page is the real `render()` over the real kernel and a fake layout engine, on the
// layered Brightcart (src/test/resources/brightcart/layered, invented), plateau baseline: the facet `journey` removes `backoffice`, among others.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { run, plain, startPage, click } = require('./library-page');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');

/** The Map of the plateau `baseline`, drawn, with the kernel and the page's own state. */
async function baselineMap() {
  const page = await startPage({ dir: LAYERED, plateau: 'baseline' });
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
const boxes = (page) =>
  Array.from(page.scene().html.matchAll(/<g class="dg-node[^>]*? data-id="([^"]*)"/g), (m) => m[1]);

test('Unfold all, then the facet journey: the Map is drawn, with no dangling reference', async () => {
  const page = await baselineMap();
  const before = boxes(page);
  assert.ok(before.includes('backoffice'), 'the Back office is on the Map before the facet');
  click(page.sandbox, { 'data-action': 'unfold-all' });
  await page.drawn();
  assert.ok(
    run(page.sandbox, 'Array.from(currentMapOpened())').includes('backoffice'),
    'Unfold all opened the Back office'
  );
  const canvas = await chooseFacet(page, 'journey');
  assert.doesNotMatch(text(canvas), /dangling reference/, text(canvas));
  assert.equal(run(page.sandbox, 'diagramFacet'), 'journey');
  const drawn = boxes(page);
  assert.ok(
    drawn.length > 0 && !drawn.includes('backoffice') && !drawn.some((id) => id.startsWith('backoffice.')),
    'the facet removed the Back office: ' + drawn.join(', ')
  );
  // the choice of the user is kept: without the facet the opened boxes are open again
  const without = await chooseFacet(page, '');
  assert.doesNotMatch(text(without), /dangling reference/);
  assert.ok(
    boxes(page).some((id) => id.startsWith('backoffice.')),
    'Facet: none draws the Back office open again'
  );
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
    assert.deepEqual(
      plain(run(page.sandbox, 'Array.from(' + list + ')')),
      ['backoffice'],
      action + ': the page still remembers the choice'
    );
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

// Wave 014, run 0074 (#77 item 4): the kernel names every entry of the lists it cannot find (`dangling` of its error), so the page drops them all and computes the Map twice
// (the refusal, the Map), however many references the facet removed. It computed once more for each (k + 1 computations, the kernel naming one reference at a time).
test('the Map through a facet is computed twice, whatever the number of references the facet removes', async () => {
  const page = await baselineMap();
  const { sandbox } = page;
  const journey = run(sandbox, 'AppState.workspace.settings.facets.customs.find((facet) => facet.name === "journey")');
  const removed = ['agent', 'backoffice', 'fulfilment', 'merchandiser']; // four boxes of the baseline that `journey` removes (backoffice.console and fulfilment.sync go with their parents)
  let computes = 0;
  const kernel = {
    compute: (input) => {
      computes++;
      return page.kernel.compute(input);
    }
  };
  const lists = (opened, pinned, hidden) => {
    const { input } = run(
      sandbox,
      '(function () { return buildKernelInput("map", "", { facet: AppState.workspace.settings.facets.customs.find((f) => f.name === "journey"), layer: "application" }); })()'
    );
    return Object.assign(input, { opened, pinned, hidden });
  };
  assert.ok(journey, 'the facet exists');
  for (const [opened, pinned, hidden] of [
    [removed.concat(['backoffice.console']), ['shop'], ['shop.cache']],
    [['shop'], removed, []],
    [[], ['shop'], removed.concat(['fulfilment.sync'])],
    [
      ['shop', 'backoffice'],
      ['agent', 'shop', 'merchandiser'],
      ['backoffice.console', 'fulfilment', 'tax']
    ]
  ]) {
    computes = 0;
    const input = lists(opened, pinned, hidden);
    const result = sandbox.computeMapThroughFacet(kernel, input);
    assert.equal(result.error, undefined, 'drawn: ' + result.error);
    assert.ok(computes <= 2, computes + ' computations for ' + JSON.stringify({ opened, pinned, hidden }));
    for (const list of ['opened', 'pinned', 'hidden']) {
      assert.ok(
        input[list].every(
          (reference) =>
            !reference.startsWith('backoffice') &&
            !reference.startsWith('fulfilment') &&
            reference !== 'agent' &&
            reference !== 'merchandiser'
        ),
        list + ': ' + input[list].join(', ')
      );
    }
  }
  // what the facet leaves is kept, and nothing is computed twice when nothing was removed
  computes = 0;
  const input = lists(['shop'], ['shop.web'], ['tax']);
  assert.equal(sandbox.computeMapThroughFacet(kernel, input).error, undefined);
  assert.equal(computes, 1);
  assert.deepEqual(plain(input.opened.concat(input.pinned, input.hidden)), ['shop', 'shop.web', 'tax']);
  // an entry that no plateau has is dropped with the others: the lists name it
  computes = 0;
  const unknown = lists([], ['nowhere', 'shop'], ['agent']);
  assert.equal(sandbox.computeMapThroughFacet(kernel, unknown).error, undefined);
  assert.ok(computes <= 2);
  assert.deepEqual(plain(unknown.pinned), ['shop']);
  // an error that is not about the lists stays an error, and costs one computation
  computes = 0;
  const other = lists([], [], []);
  other.viewpoint = 'nonsense';
  assert.match(sandbox.computeMapThroughFacet(kernel, other).error, /unsupported viewpoint/);
  assert.equal(computes, 1);
});
