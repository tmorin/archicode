'use strict';
// A facet that removes an element removes what points at it (wave 010, run 0051, decision D-1, issue #46): in the editor, as
// `archicode views generate` does it (FacetRemovesElementTest), on the example of the manual (src/doc/examples/domain_plateaus,
// an invented bookshop). Before, the kernel answered `dangling reference: ...` and the diagram of every element that pointed at
// the removed one was an error. The facets are those of the issue, built in memory: the example has none.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const EXAMPLE = path.resolve(__dirname, '../../../doc/examples/domain_plateaus');
const plain = (value) => JSON.parse(JSON.stringify(value));
const facet = (name, jsonPath) => ({ name, hideUnlinked: false, actions: [{ operator: 'REMOVE', jsonPath }] });
const byId = facet('by-id', "$.application..elements[?(@.id == 'catalog')]");
const changed = facet('changed', "$.application..elements[?(@.change == 'changed')]");
const moved = facet('moved', "$.application..elements[?(@.change == 'moved')]");
const split = facet('split', "$.application..elements[?(@.change == 'split')]");

async function editorOnTheExample() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(EXAMPLE);
  state.folder = { handle, name: 'domain_plateaus' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  const kernel = await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('to-be');
  return { sandbox, state, kernel };
}

const draw = (sandbox, kernel, viewpoint, reference, options) =>
  plain(kernel.compute(sandbox.buildKernelInput(viewpoint, reference, options).input));
const targets = (out) => out.links.map((l) => l.to).sort();

test('a facet that removes an element takes the relationships that point at it out of the diagram', async () => {
  const { sandbox, kernel } = await editorOnTheExample();
  const without = draw(sandbox, kernel, 'overview', 'shop.web');
  assert.ok(targets(without).includes('shop.catalog'), 'the diagram without the facet draws the link');
  const through = draw(sandbox, kernel, 'overview', 'shop.web', { facet: byId });
  assert.equal(through.error, undefined);
  assert.ok(
    !targets(through).includes('shop.catalog') && targets(through).includes('shop.payments'),
    JSON.stringify(targets(through))
  );
  assert.ok(!through.items.some((item) => item.reference === 'shop.catalog'));
  for (const viewpoint of ['detailed', 'deep']) {
    const out = draw(sandbox, kernel, viewpoint, 'shop', { facet: byId });
    assert.equal(out.error, undefined, viewpoint);
    assert.ok(
      !out.items.some((item) => item.reference === 'shop.catalog') && !out.links.some((l) => l.to === 'shop.catalog'),
      viewpoint
    );
  }
});

test('the facets of the comparison that remove a changed or a moved element draw what is left', async () => {
  const { sandbox, state, kernel } = await editorOnTheExample();
  await sandbox.compareWithPlateau('baseline');
  assert.equal(state.baseline.plateau.id, 'baseline');
  // the customer pointed at shop.web, which is `changed`; warehouse.picking at warehouse.inventory, which is `moved`
  assert.ok(targets(draw(sandbox, kernel, 'overview', 'customer')).includes('shop'));
  const customer = draw(sandbox, kernel, 'overview', 'customer', { facet: changed });
  assert.equal(customer.error, undefined);
  assert.ok(
    !customer.items.some((item) => item.reference === 'shop.web') && customer.links.length === 0,
    JSON.stringify(customer.links)
  );
  assert.ok(targets(draw(sandbox, kernel, 'overview', 'warehouse.picking')).includes('warehouse.inventory'));
  const picking = draw(sandbox, kernel, 'overview', 'warehouse.picking', { facet: moved });
  assert.equal(picking.error, undefined);
  assert.ok(!picking.items.some((item) => item.reference === 'warehouse.inventory') && picking.links.length === 0);
  // nobody pointed at what `split` removes: nothing else changes
  const web = draw(sandbox, kernel, 'overview', 'shop.web', { facet: split });
  assert.equal(web.error, undefined);
  assert.deepEqual(targets(web), targets(draw(sandbox, kernel, 'overview', 'shop.web')));
});

test('the element a facet removes is still an error when it is the one the diagram is about', async () => {
  const { sandbox, kernel } = await editorOnTheExample();
  const out = draw(sandbox, kernel, 'overview', 'shop.catalog', { facet: byId });
  assert.ok(out.error, 'the focal element is gone');
});

test('the tree greys the elements a facet leaves with nothing to draw, and no longer the ones that pointed at a removed element', async () => {
  const { sandbox, kernel } = await editorOnTheExample();
  const quiet = sandbox.quietReferencesThroughFacet(kernel, byId);
  assert.ok(!quiet.has('shop.web'), 'shop.web still has its link to the payments');
  assert.ok(!quiet.has('shop'), 'shop still has links to draw');
});

test('an element left with nothing to draw says which facet removed its link, and offers the diagram without it', async () => {
  const { sandbox, state, kernel } = await editorOnTheExample();
  await sandbox.compareWithPlateau('baseline');
  assert.equal(state.baseline.plateau.id, 'baseline');
  const html = sandbox.diagramEmptyHtml(kernel, 'overview', 'warehouse.picking', moved, '');
  assert.match(html, /facet “moved” removes the link of this element/);
  assert.ok(html.includes('data-action="clear-facet"'));
  assert.ok(sandbox.quietReferencesThroughFacet(kernel, moved).has('warehouse.picking'));
});
