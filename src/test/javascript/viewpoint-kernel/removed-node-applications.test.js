'use strict';
// #71 (wave 013, run 0066): the panel of a removed node lists the applications it deployed, as the panel of a changed node does, with the same label
// ("Applications deployed") and the Before line alone (a node that is gone has no After). On the layered Brightcart (invented, src/test/resources/brightcart/layered),
// `inhouse` drawn and compared with `baseline`: the removed `Cache VM` (prod.dc.cache-vm) deployed `shop.cache` in the baseline's own file, and the changed `staging.vm`
// shows its applications before and after. What the removed panel reads is the other plateau's file as it was written: `shop.cache`, as the relationships of the same panel
// are listed with the destinations the file wrote. (The Before of `staging.vm` reads a reference to an element that another replaced as the replacing one, `commerce.cart-store`,
// since #67, as `archicode diff` does: the two panels agree on the label and the shape, not on that reading, and the test pins both.)
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const vm = require('node:vm');
const { createApp, makeDirHandle } = require('./harness');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

async function inhouseAgainstBaseline() {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(LAYERED);
  state.folder = { handle, name: 'layered' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  sandbox.drawPlateau('inhouse');
  sandbox.compareWithPlateau('baseline');
  assert.equal(state.baseline.plateau.id, 'baseline');
  return { sandbox, state };
}

/** The panel of a node, as the Changes panel opens it: a click on its row (removed) or the page's own selection (changed). */
function removedPanel(sandbox, reference) {
  run(sandbox, "currentPerspective = 'map';");
  const target = {
    getAttribute: (name) =>
      ({ 'data-action': 'select-removed', 'data-ref': reference, 'data-layer': 'technology' })[name] || null,
    closest: () => null
  };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {},
    detail: 1
  });
  return sandbox.renderMapPerspectiveHtml().right;
}

/** The "Applications deployed" block of a panel: its label and the lines it has. */
function applicationsBlock(panel) {
  const block = panel.match(
    /<div class="change-diff" data-property="applications">[\s\S]*?(?=<div class="change-diff"|<h5|<\/section>)/
  );
  assert.ok(block, 'the panel has an Applications deployed block');
  return block[0];
}

test('the panel of the removed Cache VM lists the applications it deployed in the baseline, under the label of the changed node, Before only', async () => {
  const { sandbox, state } = await inhouseAgainstBaseline();
  assert.deepEqual(
    JSON.parse(JSON.stringify(state.baseline.index.technology.get('prod.dc.cache-vm').applications)),
    ['shop.cache'],
    'the baseline file says the node deployed shop.cache'
  );
  const panel = removedPanel(sandbox, 'prod.dc.cache-vm');
  assert.match(panel, /inspection-removed" data-inspection-ref="prod\.dc\.cache-vm"/);
  const block = applicationsBlock(panel);
  assert.match(text(block), /^Applications deployed − Before shop\.cache$/);
  assert.doesNotMatch(block, /change-after/, 'a node that is gone has no After');
  assert.equal(panel.split('data-property="applications"').length - 1, 1, 'said once');
});

test('the changed node staging.vm keeps its Before and After, under the same label', async () => {
  const { sandbox } = await inhouseAgainstBaseline();
  const html = sandbox.renderWhatChangedHtml('technology', 'staging.vm');
  assert.match(html, /<div class="change-diff-label">Applications deployed<\/div><div class="change-before">/);
  assert.match(html, /change-after/);
  // the Before reads a reference to a replaced element as the replacing one (#67), which `archicode diff` prints too: commerce.cart-store, which the baseline never had
  assert.match(text(html), /Before .*commerce\.cart-store.* \+ After/);
});

test('every removed node that deployed something in the baseline lists it, and a removed element with nothing to list shows no empty block', async () => {
  const { sandbox, state } = await inhouseAgainstBaseline();
  const removed = Array.from(sandbox.comparisonState().records.values()).filter(
    (r) => r.layer === 'technology' && r.change === 'removed'
  );
  assert.ok(removed.length > 0, 'the comparison removes at least one technology element');
  let listed = 0;
  for (const record of removed) {
    const applications = state.baseline.index.technology.get(record.reference).applications || [];
    const panel = removedPanel(sandbox, record.reference);
    if (applications.length) {
      listed++;
      const block = text(applicationsBlock(panel));
      for (const application of applications)
        assert.ok(block.includes(application), record.reference + ' lists ' + application);
    } else {
      assert.doesNotMatch(panel, /data-property="applications"/, record.reference + ' deployed nothing: no block');
    }
  }
  assert.ok(listed > 0);
});
