'use strict';
// The relationships of a split element in the Changes panel (wave 013, run 0069, issue #61). The kernel does not compare the relationships of an element that
// was split (rule 6 of compare.rs: which half would own them is a guess), so those of the halves read as new. The panel says it, as `archicode diff` does: a row
// ends with `of the split X` and a line under the counts says how many of the new relationships are of that kind. The kernel is the real embedded module;
// the harness has no DOM. Everything here is invented: a small shop whose order service is split in two.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const text = (html) => html.replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ').replace(/&rarr;/g, '→').replace(/\s+/g, ' ').trim();

const element = (kind, parent, id, name, extra) =>
  'header:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + '  version: "1"\n\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '');
const relationships = (...lines) => '  relationships:\n' + lines.map(([destination, label]) => '    - destination: "' + destination + '"\n      label: "' + label + '"\n').join('');

const BASE = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  'app.shop.web.yaml': element('container', 'shop', 'web', 'Web', relationships(['shop.orders', 'places orders with'])),
  'app.shop.orders.yaml': element('container', 'shop', 'orders', 'Orders', relationships(['shop.db', 'stores in'], ['shop.mail', 'asks'])),
  'app.shop.db.yaml': element('container', 'shop', 'db', 'Database'),
  'app.shop.mail.yaml': element('container', 'shop', 'mail', 'Mailer')
};
const TARGET = {
  'app.shop.yaml': element('system', null, 'shop', 'Shop'),
  // ends on a split element: new, of the split orders-intake
  'app.shop.web.yaml': element('container', 'shop', 'web', 'Web', relationships(['shop.orders-intake', 'places orders with'], ['shop.db', 'reads'])),
  // the two halves of orders: every relationship they declare is new, whether the old orders had it or not
  'app.shop.orders-intake.yaml': element('container', 'shop', 'orders-intake', 'Order intake', '  replaces: [shop.orders]\n' + relationships(['shop.db', 'stores in'])),
  'app.shop.orders-billing.yaml': element('container', 'shop', 'orders-billing', 'Order billing', '  replaces: [shop.orders]\n' + relationships(['shop.mail', 'asks'], ['shop.orders-intake', 'follows'])),
  'app.shop.db.yaml': element('container', 'shop', 'db', 'Database'),
  'app.shop.mail.yaml': element('container', 'shop', 'mail', 'Mailer')
};
const folder = (dir, files) => Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));
const PLATEAUS = '  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n    - id: target\n      name: Target\n      path: plateaus/20_target\n';

async function open(options = {}) {
  const files = Object.assign({ 'workspace.yaml': 'settings:\n' + PLATEAUS }, folder('10_base', options.base || BASE), folder('20_target', options.target || TARGET));
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  await sandbox.setCompareTo('base');
  return sandbox;
}

test('a new relationship of a split element says so in its row, and the panel counts them', async () => {
  const sandbox = await open();
  const state = sandbox.comparisonState();
  const rows = state.changes.filter((row) => row.thing === 'relationship');
  // the kernel's answer is what it was: the relationships of the halves are new, those that end on a half too, and the one that is really new is new
  assert.deepEqual(plain(rows.map((row) => row.reference + ' -> ' + row.destination + ' ' + row.change).sort()), [
    'shop.orders-billing -> shop.mail new',
    'shop.orders-billing -> shop.orders-intake new',
    'shop.orders-intake -> shop.db new',
    'shop.web -> shop.db new',
    'shop.web -> shop.orders-intake new'
  ]);
  assert.equal(rows.filter((row) => sandbox.ofSplitOf(row, state.changes).length).length, 4, 'the panel finds four of the five');

  const panel = sandbox.renderChangesPanelHtml(state);
  const row = (needle) => (panel.match(new RegExp('<li><button[^>]*data-ref="' + needle + '"[^>]*>[\\s\\S]*?</button></li>')) || [''])[0];
  assert.match(text(row('shop.orders-intake" data-to="shop.db')), /of the split shop\.orders-intake$/);
  assert.match(text(row('shop.web" data-to="shop.orders-intake')), /of the split shop\.orders-intake$/, 'a relationship that ends on a half is of the split too');
  assert.match(text(row('shop.orders-billing" data-to="shop.orders-intake')), /of the split shop\.orders-billing, shop\.orders-intake$/, 'both ends are halves: both are named, source first');
  assert.doesNotMatch(text(row('shop.web" data-to="shop.db')), /split/, 'a really new relationship has no note');
  assert.match(panel, /data-of-split="4"/);
  assert.match(text(panel), /4 of the 5 new relationships belong to split elements/);
});

test('a comparison without a split has no note, and neither has a split element that has no relationship', async () => {
  const base = Object.assign({}, BASE);
  const noSplit = await open({ base, target: BASE });
  assert.doesNotMatch(noSplit.renderChangesPanelHtml(noSplit.comparisonState()), /of-split|of the split/);

  // the halves declare no relationship and nothing points at them: nothing to say
  const quiet = Object.assign({}, TARGET, {
    'app.shop.web.yaml': element('container', 'shop', 'web', 'Web'),
    'app.shop.orders-intake.yaml': element('container', 'shop', 'orders-intake', 'Order intake', '  replaces: [shop.orders]\n'),
    'app.shop.orders-billing.yaml': element('container', 'shop', 'orders-billing', 'Order billing', '  replaces: [shop.orders]\n')
  });
  const sandbox = await open({ target: quiet });
  assert.equal(sandbox.comparisonState().counts.elements.split, 2);
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), /of-split|of the split/);
});
