'use strict';
// A move names the plateaus beside the one drawn that keep the old reference (wave 017, run 0122, issue #122; the rename does it since wave 016, run 0113, #116). A move changes
// the reference of the element, so it rewrites the views and the stories of the whole workspace, which belong to no plateau, and the files of the plateau drawn and of those that
// stand on it only. A plateau beside the plateau drawn (two plateaus that do not stack) keeps the old reference, and a view that names it can no longer be drawn there. The
// button of the Move dialog says so in a dialog first, once the parent is chosen: the plateaus that keep the old reference and the views and the steps that would break; "Move
// anyway" writes what a move has always written, "Back to Move" gives the Move dialog back as it was and writes nothing. The layered Brightcart (src/test/resources/brightcart/
// layered/, with its shipped views and stories in shared/) is copied into an in-memory folder; the fork is made by giving `saas` a `commerce` with a `cart`, as `inhouse` has,
// the way an author would, and a view and a story step that name `commerce.cart`. Everything else here is invented (a ferry company).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

const BRIGHTCART = walk(LAYERED, LAYERED, {});
const WITHOUT_ENTRIES = Object.fromEntries(Object.entries(BRIGHTCART).filter(([file]) => !file.startsWith('shared/')));

const element = (kind, id, plateau, parent) => 'header:\n  kind: "archicode.morin.io/' + kind + '"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') + (parent ? '  parent: "' + parent + '"\n' : '') +
  'content:\n  id: "' + id + '"\n  name: "' + id + ' of ' + plateau + '"\n';
const VIEW_ON_CART = 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "cart_overview"\n  name: "The cart service"\n  viewpoint: overview\n  layer: application\n  properties:\n    element: "commerce.cart"\n';
const STORY_ON_CART = 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "cart_story"\n  name: "Around the cart"\n  steps:\n    - viewpoint: "overview"\n      layer: "application"\n      properties:\n        element: "commerce.cart"\n      text: "The cart."\n';
const SAAS_CART = { 'saas/application/commerce.yaml': element('system', 'commerce', 'saas'), 'saas/application/commerce-cart.yaml': element('container', 'cart', 'saas', 'commerce') };
/** `saas` and `inhouse` both have `commerce.cart`, a view and a step of a story name it. */
const FORK = Object.assign({}, BRIGHTCART, SAAS_CART, { 'shared/view.cart_overview.yaml': VIEW_ON_CART, 'shared/story.cart_story.yaml': STORY_ON_CART });
const FORK_NO_ENTRIES = Object.assign({}, WITHOUT_ENTRIES, SAAS_CART);

async function open(files, drawn) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  if (drawn) sandbox.drawPlateau(drawn);
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

async function saved(opened) {
  await opened.sandbox.saveAllChanges();
  const changed = {};
  for (const [p, f] of opened.mem.files) if (opened.original[p] !== f.text) changed[p] = f.text;
  return { changed, removed: opened.mem.removals.slice().sort() };
}

const dialogOf = (sandbox) => run(sandbox, 'appDialog');
const text = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const status = (sandbox) => plain(run(sandbox, 'saveStatus'));
const dirty = (state) => Array.from(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)).sort();

/** The author opens the Move dialog of the element and presses Move with `parent` chosen (what `move-confirm` does: `submitMoveDialog`). Returns what it returned. */
function pressMove(sandbox, reference, parent, query) {
  sandbox.openAppDialog({ kind: 'move', reference, layer: 'application', query: query || '' });
  return sandbox.submitMoveDialog({ parent });
}

/** Says yes to every dialog that stands between the press and the write, and tells the kinds of dialog it met, in order. */
function sayYes(sandbox) {
  const met = [];
  for (let i = 0; i < 4 && dialogOf(sandbox); i++) {
    met.push(dialogOf(sandbox).kind);
    sandbox.submitAppDialog({});
  }
  return met;
}

// ---- the fork: saas and inhouse both have commerce.cart ----

test('the fixture is a fork: saas and inhouse both have commerce.cart, and a view and a step name it', async () => {
  const { sandbox, state } = await open(FORK, 'inhouse');
  assert.equal(state.plateauTree.nodes.get('saas').parent, 'baseline');
  assert.equal(state.plateauTree.nodes.get('inhouse').parent, 'baseline');
  assert.equal(state.index.application.get('commerce.cart').declaredIn, 'inhouse');
  assert.equal(sandbox.findSavedView('cart_overview').properties.element, 'commerce.cart');
});

test('pressing Move with a parent chosen opens the dialog of the plateaus that keep the old reference, and nothing is rewritten while the author reads', async () => {
  const opened = await open(FORK, 'inhouse');
  const { sandbox, state } = opened;
  assert.equal(pressMove(sandbox, 'commerce.cart', 'orders'), null, 'the move waits for the answer');
  const dialog = dialogOf(sandbox);
  assert.equal(dialog.kind, 'rename-siblings');
  assert.equal(dialog.moving, true);
  assert.deepEqual(plain(dialog.impact), {
    from: 'commerce.cart', to: 'orders.cart', plateau: 'inhouse',
    plateaus: [{ id: 'saas', name: 'Buy the commerce platform', declaredIn: 'saas', references: ['commerce.cart'] }],
    views: [{ id: 'cart_overview', label: 'The cart service', plateaus: ['saas'] }],
    steps: [{ story: 'cart_story', label: 'Around the cart', number: 1, plateaus: ['saas'] }]
  });
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('commerce.cart'), true);
  assert.equal(state.index.application.has('orders.cart'), false);
  assert.equal(sandbox.findSavedView('cart_overview').properties.element, 'commerce.cart');
  assert.deepEqual(await saved(opened), { changed: {}, removed: [] }, 'and a save writes nothing');
});

test('the dialog names the plateau, the old and the new reference, the view and the step and where they break, and says what to do instead', async () => {
  const { sandbox } = await open(FORK, 'inhouse');
  pressMove(sandbox, 'commerce.cart', 'orders');
  const html = sandbox.renderAppDialogHtml();
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /class="app-dialog app-dialog-wide"/);
  const said = text(html);
  assert.match(said, /Move “Cart service”: 1 plateau keeps the old reference/);
  assert.match(said, /commerce\.cart becomes orders\.cart in the plateau inhouse, and in the plateaus that stand on it\./);
  assert.match(said, /This plateau does not stand on inhouse and still has commerce\.cart \(the move does not reach it\):\s*saas/);
  assert.match(said, /Views and stories belong to no plateau: they follow the move everywhere, so these 2 cannot be drawn any more in the plateaus that keep the old reference:/);
  assert.match(said, /the view The cart service cart_overview in saas/);
  assert.match(said, /the story Around the cart cart_story, step 1 in saas/);
  assert.match(said, /go back, draw that plateau and move the element to the same place there/);
  assert.doesNotMatch(said, /rename/i, 'the words are the words of a move');
  assert.doesNotMatch(said, /marketplace/, 'marketplace stands on inhouse: it is rewritten, not listed');
  assert.match(html, /data-action="dialog-cancel" data-dialog-autofocus>Back to Move<\/button>/, 'the focus is on the safe button');
  assert.match(html, /data-action="dialog-submit">Move anyway<\/button>/);
});

test('"Move anyway" writes what a move has always written: the same files, byte for byte, as the same move on the workspace without the sibling', async () => {
  const forked = await open(FORK, 'inhouse');
  assert.equal(pressMove(forked.sandbox, 'commerce.cart', 'orders'), null);
  // marketplace stands on inhouse and inherits `commerce.cart`, so the dialog of the plateaus a write changes follows (run 0082), as it always did; the first answer is ours
  assert.deepEqual(sayYes(forked.sandbox), ['rename-siblings', 'layer-confirm']);
  assert.equal(dialogOf(forked.sandbox), null, 'no dialog is left');
  assert.equal(forked.state.index.application.has('orders.cart'), true);
  assert.equal(forked.state.index.application.has('commerce.cart'), false);
  assert.deepEqual(status(forked.sandbox).state === 'error' ? status(forked.sandbox) : null, null, 'no error is told');
  const out = await saved(forked);
  // the control: the same move where no plateau keeps the reference, written by the function the button called before this run
  const control = await open(Object.assign({}, BRIGHTCART, { 'shared/view.cart_overview.yaml': VIEW_ON_CART, 'shared/story.cart_story.yaml': STORY_ON_CART }), 'inhouse');
  assert.equal(control.sandbox.renameSiblingImpact('commerce.cart', 'orders.cart', 'application'), null);
  control.sandbox.commitMoveElement('commerce.cart', 'application', 'orders', { confirmed: true });
  const expected = await saved(control);
  const withoutSaas = (files) => Object.fromEntries(Object.entries(files).filter(([file]) => !file.startsWith('saas/')));
  assert.deepEqual(withoutSaas(out.changed), expected.changed, 'the rewrite is the rewrite');
  assert.deepEqual(out.removed, expected.removed);
  assert.match(out.changed['shared/view.cart_overview.yaml'], /element: "orders\.cart"/);
  assert.match(out.changed['shared/story.cart_story.yaml'], /element: "orders\.cart"/);
  assert.ok(!Object.keys(out.changed).some((file) => file.startsWith('saas/')), 'the sibling keeps its own commerce.cart');
  // the sibling really cannot draw the view now, as the dialog said
  forked.sandbox.drawPlateau('saas');
  assert.equal(forked.sandbox.viewProblem(forked.sandbox.findSavedView('cart_overview')), 'The element “orders.cart” is not in the plateau “saas”.');
});

// ---- the way back ----

test('"Back to Move" gives the Move dialog back with the parent chosen and the search typed, and writes nothing', async () => {
  const opened = await open(FORK, 'inhouse');
  const { sandbox, state } = opened;
  pressMove(sandbox, 'commerce.cart', 'orders', 'ord');
  const move = plain({ reference: dialogOf(sandbox).back.reference, query: dialogOf(sandbox).back.query });
  assert.deepEqual(move, { reference: 'commerce.cart', query: 'ord' });
  sandbox.closeAppDialog();
  const back = dialogOf(sandbox);
  assert.equal(back.kind, 'move');
  assert.equal(back.chosen, 'orders');
  assert.equal(back.query, 'ord');
  assert.equal(back.error, null);
  const html = sandbox.renderAppDialogHtml();
  assert.match(html, /name="move-parent" value="orders" checked/, 'the parent is still chosen');
  assert.match(html, /value="ord"/, 'and the search still says what was typed');
  assert.match(html, /data-action="move-confirm">Move<\/button>/);
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('commerce.cart'), true);
  assert.equal(status(sandbox).state, 'idle', 'no error, no success: nothing was written');
  assert.deepEqual(await saved(opened), { changed: {}, removed: [] });
});

test('after "Back to Move" the author chooses another parent, is asked again with the new reference, and can give the move up with Cancel', async () => {
  const opened = await open(FORK, 'inhouse');
  const { sandbox, state } = opened;
  pressMove(sandbox, 'commerce.cart', 'orders');
  sandbox.closeAppDialog();
  assert.equal(sandbox.submitMoveDialog({ parent: 'payments' }), null);
  assert.equal(dialogOf(sandbox).kind, 'rename-siblings');
  assert.equal(dialogOf(sandbox).impact.to, 'payments.cart');
  sandbox.closeAppDialog();
  assert.equal(dialogOf(sandbox).kind, 'move');
  sandbox.closeAppDialog(); // Cancel of the Move dialog itself: it was never a question, it closes
  assert.equal(dialogOf(sandbox), null);
  assert.deepEqual(dirty(state), []);
  assert.deepEqual(await saved(opened), { changed: {}, removed: [] });
});

/** A click on the control with that `data-action`, as the page's one listener gets it. */
function click(sandbox, action) {
  const target = { getAttribute: (name) => (name === 'data-action' ? action : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

test('the buttons do it: Move asks, Back to Move gives the dialog back, Move asks again and Move anyway writes (the clicks the page gets)', async () => {
  const opened = await open(FORK, 'inhouse');
  const { sandbox, state } = opened;
  sandbox.openAppDialog({ kind: 'move', reference: 'commerce.cart', layer: 'application' });
  const move = dialogOf(sandbox);
  move.chosen = 'orders'; // what the radio button says (the page reads it from the DOM; the harness has no radio)
  sandbox.document.querySelector = ((original) => (selector) => (selector === 'input[name="move-parent"]:checked' ? { value: 'orders' } : original.call(sandbox.document, selector)))(sandbox.document.querySelector);
  click(sandbox, 'move-confirm');
  assert.equal(dialogOf(sandbox).kind, 'rename-siblings');
  click(sandbox, 'dialog-cancel'); // Back to Move
  assert.equal(dialogOf(sandbox), move, 'the very Move dialog, with its choices');
  assert.deepEqual(dirty(state), []);
  click(sandbox, 'move-confirm');
  assert.equal(dialogOf(sandbox).kind, 'rename-siblings');
  click(sandbox, 'dialog-submit'); // Move anyway
  assert.equal(dialogOf(sandbox).kind, 'layer-confirm', 'marketplace inherits commerce.cart: its dialog follows');
  sayYes(sandbox);
  assert.equal(state.index.application.has('orders.cart'), true);
});

test('Escape and a click beside the dialog do what "Back to Move" does', async () => {
  const opened = await open(FORK, 'inhouse');
  const { sandbox, state } = opened;
  pressMove(sandbox, 'commerce.cart', 'orders');
  sandbox.handleAppDialogKeydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(dialogOf(sandbox).kind, 'move');
  assert.equal(dialogOf(sandbox).chosen, 'orders');
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('commerce.cart'), true);
});

test('a refused move is still told in the Move dialog before any question about the plateaus', async () => {
  const { sandbox, state } = await open(FORK, 'inhouse');
  sandbox.openAppDialog({ kind: 'move', reference: 'commerce.cart', layer: 'application' });
  assert.equal(sandbox.submitMoveDialog({ parent: 'accounts.db' }), null, 'a container cannot go under a container');
  assert.equal(dialogOf(sandbox).kind, 'move');
  assert.match(dialogOf(sandbox).error, /Nothing was changed\./);
  assert.deepEqual(dirty(state), []);
});

// ---- the move that asks nothing ----

test('a move where no sibling keeps the reference opens no dialog of ours, and writes what the low-level write writes', async () => {
  const form = await open(BRIGHTCART, 'inhouse');
  assert.equal(form.sandbox.renameSiblingImpact('commerce.cart', 'orders.cart', 'application'), null);
  const result = pressMove(form.sandbox, 'commerce.cart', 'orders');
  assert.equal(result && result.pending, true, 'only the dialog of the plateaus that stand on inhouse, as before this run');
  assert.deepEqual(sayYes(form.sandbox), ['layer-confirm']);
  const low = await open(BRIGHTCART, 'inhouse');
  low.sandbox.commitMoveElement('commerce.cart', 'application', 'orders', { confirmed: true });
  assert.deepEqual(await saved(form), await saved(low), 'byte for byte');
});

test('a sibling that keeps the reference but is named by no view and no step asks nothing either', async () => {
  const form = await open(FORK_NO_ENTRIES, 'inhouse');
  assert.equal(form.sandbox.renameSiblingImpact('commerce.cart', 'orders.cart', 'application'), null);
  pressMove(form.sandbox, 'commerce.cart', 'orders');
  assert.deepEqual(sayYes(form.sandbox), ['layer-confirm'], 'the sibling asks nothing: only the plateaus that stand on inhouse are asked, as before');
  assert.equal(form.state.index.application.has('orders.cart'), true);
});

test('a move in baseline asks nothing: every plateau stands on it, and the views follow in all of them', async () => {
  const view = VIEW_ON_CART.replace('cart_overview', 'app_overview').replace('The cart service', 'The shop application').replace('commerce.cart', 'shop.app');
  const opened = await open(Object.assign({}, FORK, { 'shared/view.app_overview.yaml': view }), 'baseline');
  const { sandbox, state } = opened;
  assert.equal(sandbox.findSavedView('app_overview').properties.element, 'shop.app');
  assert.equal(sandbox.renameSiblingImpact('shop.app', 'backoffice.app', 'application'), null);
  assert.equal(pressMove(sandbox, 'shop.app', 'backoffice').pending, true, 'the plateaus that inherit it are asked, as before');
  assert.deepEqual(sayYes(sandbox), ['layer-confirm'], 'and nothing else');
  assert.equal(state.index.application.has('backoffice.app'), true);
  assert.equal(sandbox.findSavedView('app_overview').properties.element, 'backoffice.app');
  for (const id of ['saas', 'inhouse', 'marketplace']) {
    sandbox.drawPlateau(id);
    assert.equal(state.index.application.has('shop.app'), false, 'no plateau keeps the old reference: ' + id);
    // a plateau that has the element at all has it moved, and draws the view (marketplace replaces the shop and has neither)
    if (state.index.application.has('backoffice.app')) assert.equal(sandbox.viewProblem(sandbox.findSavedView('app_overview')), null, 'drawn in ' + id);
  }
});

test('an element the plateau drawn only inherits is refused by the Move dialog with its own sentence, not by the question', async () => {
  const { sandbox, state } = await open(FORK, 'saas');
  assert.equal(sandbox.renameSiblingImpact('shop.app', 'backoffice.app', 'application'), null, 'saas does not declare shop.app');
  assert.equal(pressMove(sandbox, 'shop.app', 'backoffice'), null);
  const dialog = dialogOf(sandbox);
  assert.notEqual(dialog && dialog.kind, 'rename-siblings');
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('shop.app'), true);
});

test('a workspace with no plateau moves as it always did: no dialog, the view follows', async () => {
  const files = {
    '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n  elements:\n    - kind: container\n      id: "ticketing"\n      name: "Ticketing"\n',
    'app.pier.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "pier"\n  name: "Pier"\n',
    'view.ticketing_overview.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "ticketing_overview"\n  viewpoint: overview\n  properties:\n    element: ferry.ticketing\n'
  };
  const opened = await open(files);
  const { sandbox } = opened;
  assert.equal(sandbox.writingPlateau(), null);
  assert.equal(sandbox.renameSiblingImpact('ferry.ticketing', 'pier.ticketing', 'application'), null);
  const result = pressMove(sandbox, 'ferry.ticketing', 'pier');
  assert.equal(result.ok, true);
  assert.equal(dialogOf(sandbox), null);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.changed).sort(), ['app.ferry.yaml', 'app.pier.yaml', 'view.ticketing_overview.yaml']);
  assert.match(out.changed['view.ticketing_overview.yaml'], /element: pier\.ticketing/);
});
