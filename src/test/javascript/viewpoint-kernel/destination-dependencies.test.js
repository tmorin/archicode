'use strict';
// A relationship towards the inside of a deployed application is a dependency of the node that hosts it, and the links drawn for a flow read what is inside the
// deployed element on both ends (issue #139, decision T5, wave 019 run 0140), in the editor as in the command line (DestinationDependenciesTest): on the layered
// Brightcart `shop.app` is deployed on `prod.dc.app-vm`, `shop.db` on `prod.dc.db-vm`; the component `shop.app.catalog` reads `shop.db`, and the container
// `backoffice.console`, on `prod.dc.admin-vm`, maintains `shop.app.catalog`. Both nodes are in `prod`: the links are the "secondary" ones, drawn for a flow
// (`application_links`, what the command line says for the workspace of a facet). The Map of the technology layer is pinned by technology-map-shared.test.js.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const BRIGHTCART = path.resolve(__dirname, '../../resources/brightcart/layered');
const plain = (value) => JSON.parse(JSON.stringify(value));

async function editor() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(BRIGHTCART);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  assert.equal(state.fatalError, null);
  const kernel = await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('baseline');
  return { sandbox, kernel };
}

function draw(sandbox, kernel, viewpoint, reference, flow) {
  const { input } = sandbox.buildKernelInput(viewpoint, reference, { layer: 'technology' });
  const given = plain(input);
  if (flow) given.application_links = true;
  return plain(kernel.compute(given));
}
const labelled = (out) => out.links.map((l) => l.from + ' -> ' + l.to + ' : ' + l.label).sort();

test('a flow draws the node of the container towards the node of the database through its components', async () => {
  const { sandbox, kernel } = await editor();
  const out = draw(sandbox, kernel, 'deep', 'prod.dc', true);
  assert.equal(out.error, undefined);
  const links = labelled(out);
  assert.ok(links.includes('app-vm_shop_app -> db-vm_shop_db : reads and writes'), links.join('\n'));
  assert.ok(links.includes('app-vm_shop_app -> db-vm_shop_db : queries'), links.join('\n'));
  const found = out.links.find((l) => l.label === 'queries' && l.from === 'app-vm_shop_app');
  assert.deepEqual(found.relationships.map((r) => r.from), ['shop.app.search'], 'the link says which component declares the relationship');
});

test('a flow draws the node of the caller towards the node whose container holds the component it calls', async () => {
  const { sandbox, kernel } = await editor();
  const out = draw(sandbox, kernel, 'deep', 'prod.dc', true);
  const links = labelled(out);
  assert.ok(links.includes('admin-vm_backoffice_console -> app-vm_shop_app : maintains products in'), links.join('\n'));
  assert.ok(links.includes('admin-vm_backoffice_console -> app-vm_shop_app : looks up customers in'), links.join('\n'));
  const found = out.links.find((l) => l.label === 'maintains products in');
  assert.equal(found.relationships[0].destination, 'shop.app.catalog', 'the relationship says what it ends on');
  assert.equal(found.secondary, false, 'a flow draws it');
});

test('a relationship between two components of one container is internal, in the deep viewpoint and in the lifted ones', async () => {
  const { sandbox, kernel } = await editor();
  const out = draw(sandbox, kernel, 'deep', 'prod.dc', true);
  assert.ok(!out.links.some((l) => l.from === 'app-vm_shop_app' && l.to === 'app-vm_shop_app'), 'no loop on the box of the container');
  const overview = draw(sandbox, kernel, 'overview', 'prod.dc.admin-vm', true);
  assert.ok(overview.links.some((l) => l.from === 'prod.dc.admin-vm' && l.to === 'prod.dc.app-vm'), labelled(overview).join('\n'));
  const detailed = draw(sandbox, kernel, 'detailed', 'prod.dc', true);
  assert.ok(detailed.links.some((l) => l.from === 'prod.dc.app-vm' && l.to === 'prod.dc.db-vm'), labelled(detailed).join('\n'));
});

test('a view that is not about a flow draws none of them', async () => {
  const { sandbox, kernel } = await editor();
  const out = draw(sandbox, kernel, 'deep', 'prod.dc', false);
  assert.ok(!out.links.some((l) => !l.secondary && l.label === 'maintains products in'), labelled(out).join('\n'));
  assert.ok(out.links.every((l) => l.secondary || l.label !== 'queries'));
});
