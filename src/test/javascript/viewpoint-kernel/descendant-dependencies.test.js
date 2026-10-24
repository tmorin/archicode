'use strict';
// The relationships of what is inside a deployed application are dependencies of the node that hosts it (wave 018, run 0133, issue #124, decision D7),
// in the editor as in the command line (DescendantDependenciesTest): on the layered Brightcart, `prod.dc.app-vm` hosts the container `shop.app`, which
// declares nothing itself; its components call `psp`, `tax` and `mailer`, deployed on the nodes of `partners`, which `prod` uses. The Map of the
// technology layer is pinned by technology-map-shared.test.js (expected-boxes.json).
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

const draw = (sandbox, kernel, viewpoint, reference) =>
  plain(kernel.compute(sandbox.buildKernelInput(viewpoint, reference, { layer: 'technology' }).input));
const pairs = (out) => out.links.map((l) => l.from + ' -> ' + l.to).sort();

test('the deep viewpoint of the node that hosts shop.app links it to the nodes that host what the components call', async () => {
  const { sandbox, kernel } = await editor();
  const out = draw(sandbox, kernel, 'deep', 'prod.dc.app-vm');
  assert.equal(out.error, undefined);
  assert.deepEqual(
    pairs(out).filter((p) => p.startsWith('app-vm_shop_app')),
    ['app-vm_shop_app -> mail-live_mailer', 'app-vm_shop_app -> psp-live_psp', 'app-vm_shop_app -> tax-live_tax']
  );
  const psp = out.links.find((l) => l.to === 'psp-live_psp');
  assert.deepEqual(
    psp.relationships.map((r) => r.from),
    ['shop.app.payments'],
    'the link says which component declares the relationship'
  );
  assert.ok(psp.relationships[0].application);
});

test('the overview and the detailed viewpoints draw the dependency as a relationship of the node', async () => {
  const { sandbox, kernel } = await editor();
  const overview = draw(sandbox, kernel, 'overview', 'prod.dc.app-vm');
  assert.ok(
    overview.links.some((l) => l.from === 'prod.dc.app-vm' && l.to === 'partners'),
    pairs(overview)
  );
  const detailed = draw(sandbox, kernel, 'detailed', 'prod.dc');
  assert.ok(
    detailed.links.some((l) => l.from === 'prod.dc.app-vm' && l.to.startsWith('partners')),
    pairs(detailed)
  );
  const prod = draw(sandbox, kernel, 'overview', 'prod');
  assert.ok(
    prod.links.some((l) => l.from === 'prod' && l.to === 'partners' && (l.qualifiers || []).includes('SMTP')),
    'the mailer of the notifications component adds SMTP to the link of the environment'
  );
});
