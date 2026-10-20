'use strict';
// A rename names the plateaus beside the one drawn that keep the old reference (wave 016, run 0113, issue #116). A rename rewrites the files of the plateau drawn and of the
// plateaus that stand on it, and the views and the stories of the whole workspace, which belong to no plateau (wave 015, run 0100). When two plateaus that do not stack both have
// the reference (a fork: on the layered Brightcart `saas` and `inhouse` both override `baseline`), a view that names it is rewritten to a name the other plateau lacks and cannot be
// drawn there. The form of the element, saved with a new id, says so in a dialog before anything is rewritten: the plateaus that keep the old reference and the views and the steps
// that would break there; "Rename anyway" writes what a rename has always written, "Cancel" writes nothing. The layered Brightcart (src/test/resources/brightcart/layered/, with its
// shipped views and stories in shared/) is copied into an in-memory folder; the fork is made by giving `saas` an element `inhouse` already declares, the way an author would.
// Everything else here is invented (a ferry company).
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

/** The layered Brightcart as a path -> text object, shipped views and stories included. */
const BRIGHTCART = walk(LAYERED, LAYERED, {});
const WITHOUT_ENTRIES = Object.fromEntries(Object.entries(BRIGHTCART).filter(([file]) => !file.startsWith('shared/')));

/** `saas` declares `id` too (a system with that id), as `inhouse` does: a fork where both plateaus have the reference. */
const system = (id, plateau) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') + 'content:\n  id: "' + id + '"\n  name: "' + id + ' of ' + plateau + '"\n';
const FORK_ON_COMMERCE = Object.assign({}, BRIGHTCART, { 'saas/application/commerce.yaml': system('commerce', 'saas') });
const FORK_ON_COMMERCE_SAAS = Object.assign({}, BRIGHTCART, { 'inhouse/application/commerce-saas.yaml': system('commerce-saas', 'inhouse') });

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

/** Saves the folder and tells what changed on disk: path -> text for a file that changed or is new, and the files that went. */
async function saved(opened) {
  await opened.sandbox.saveAllChanges();
  const changed = {};
  for (const [p, f] of opened.mem.files) if (opened.original[p] !== f.text) changed[p] = f.text;
  return { changed, removed: opened.mem.removals.slice().sort() };
}

/** The form of the element as the page reads it (`readElementDraft`): the id typed, the name and the description as they are. */
function typeId(sandbox, reference, id) {
  const record = sandbox.findElementRecord(reference, sandbox.layerOfReference(reference) || 'application');
  const byId = {
    'edit-id-input': { value: id },
    'edit-name-input': { value: record.name === null ? '' : String(record.name) },
    'edit-description-input': { value: record.description === null ? '' : String(record.description) }
  };
  const doc = sandbox.document;
  const original = { getElementById: doc.getElementById, querySelectorAll: doc.querySelectorAll };
  doc.getElementById = (name) => byId[name] || original.getElementById.call(doc, name);
  doc.querySelectorAll = (selector) => (selector.includes('relationship-edit-row') ? [] : original.querySelectorAll.call(doc, selector));
  return () => Object.assign(doc, original);
}

/** What the page does when "Save all changes" applies the form on screen with the id typed: `commitElementWithDraft`. */
function saveForm(sandbox, reference, id) {
  const restore = typeId(sandbox, reference, id);
  try {
    return sandbox.commitElementWithDraft(reference, null);
  } finally {
    restore();
  }
}

const dialogOf = (sandbox) => run(sandbox, 'appDialog');
/** Says yes to every dialog that stands between the save and the write, and tells the kinds of dialog it met, in order (`rename-siblings`, then `layer-confirm` when plateaus that stand on the one drawn change too). */
function sayYes(sandbox) {
  const met = [];
  for (let i = 0; i < 4 && dialogOf(sandbox); i++) {
    met.push(dialogOf(sandbox).kind);
    sandbox.submitAppDialog({});
  }
  return met;
}
const text = (html) => html.replace(/<[^>]*>/g, '').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, '&');
const status = (sandbox) => plain(run(sandbox, 'saveStatus'));
const dirty = (state) => Array.from(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)).sort();

// ---- the fork: `saas` and `inhouse` both have `commerce` ----

test('the fixture is a fork: saas and inhouse do not stack, and marketplace stands on inhouse', async () => {
  const { state } = await open(FORK_ON_COMMERCE, 'inhouse');
  assert.equal(state.plateauTree.nodes.get('saas').parent, 'baseline');
  assert.equal(state.plateauTree.nodes.get('inhouse').parent, 'baseline');
  assert.equal(state.plateauTree.nodes.get('marketplace').parent, 'inhouse');
  assert.equal(state.index.application.get('commerce').declaredIn, 'inhouse');
});

test('renaming an element a sibling plateau still declares opens a dialog before anything is rewritten: the plateau, and the shipped view that would break there', async () => {
  const opened = await open(FORK_ON_COMMERCE, 'inhouse');
  const { sandbox, state } = opened;
  assert.equal(saveForm(sandbox, 'commerce', 'billing'), false, 'the save waits for the answer');
  const dialog = dialogOf(sandbox);
  assert.equal(dialog.kind, 'rename-siblings');
  const impact = plain(dialog.impact);
  assert.deepEqual(impact, {
    from: 'commerce', to: 'billing', plateau: 'inhouse',
    plateaus: [{ id: 'saas', name: 'Buy the commerce platform', declaredIn: 'saas', references: ['commerce'] }],
    views: [{ id: 'commerce_overview', label: 'The commerce services we would build', plateaus: ['saas'] }],
    steps: []
  });
  // nothing was rewritten while the author reads: no file is modified, the element still has its reference, the view its element
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('commerce'), true);
  assert.equal(state.index.application.has('billing'), false);
  assert.equal(sandbox.findSavedView('commerce_overview').properties.element, 'commerce');
  const out = await saved(opened);
  assert.deepEqual(out, { changed: {}, removed: [] }, 'and a save writes nothing');
});

test('the dialog names the plateau, the old and the new reference, the view and where it breaks, and says what to do instead', async () => {
  const { sandbox } = await open(FORK_ON_COMMERCE, 'inhouse');
  saveForm(sandbox, 'commerce', 'billing');
  const html = sandbox.renderAppDialogHtml();
  assert.match(html, /role="dialog" aria-modal="true"/);
  assert.match(html, /class="app-dialog app-dialog-wide"/);
  const said = text(html);
  assert.match(said, /Rename “Commerce services”: 1 plateau keeps the old reference/);
  assert.match(said, /commerce becomes billing in the plateau inhouse, and in the plateaus that stand on it\./);
  assert.match(said, /This plateau does not stand on inhouse and still has commerce \(the rename does not reach it\):\s*saas/);
  assert.match(said, /Views and stories belong to no plateau: they follow the rename everywhere, so this one cannot be drawn any more in the plateaus that keep the old reference:/);
  assert.match(said, /the view The commerce services we would build commerce_overview in saas/);
  assert.match(said, /cancel, draw that plateau and give the element the same new id there/);
  assert.doesNotMatch(said, /marketplace/, 'marketplace stands on inhouse: it is rewritten, not listed');
  assert.match(html, /data-action="dialog-cancel" data-dialog-autofocus>Cancel<\/button>/, 'the focus is on Cancel');
  assert.match(html, /data-action="dialog-submit">Rename anyway<\/button>/);
});

test('"Rename anyway" writes what a rename has always written: the same files, byte for byte, as the same rename on the workspace without the sibling', async () => {
  const forked = await open(FORK_ON_COMMERCE, 'inhouse');
  assert.equal(saveForm(forked.sandbox, 'commerce', 'billing'), false);
  // marketplace stands on inhouse and inherits `commerce`, so the dialog of the plateaus a write changes follows (run 0082), as it always did; the first answer is ours
  assert.deepEqual(sayYes(forked.sandbox), ['rename-siblings', 'layer-confirm']);
  assert.equal(dialogOf(forked.sandbox), null, 'no dialog is left');
  assert.equal(forked.state.index.application.has('billing'), true);
  assert.equal(forked.state.index.application.has('commerce'), false);
  const out = await saved(forked);
  // the control: the same rename where no plateau keeps the reference (the low-level write, which asks nothing of ours)
  const control = await open(BRIGHTCART, 'inhouse');
  control.sandbox.commitElementEdit('commerce', (n) => { n.id = 'billing'; return { renamedTo: { from: 'commerce', to: 'billing' } }; }, 'application', { confirmed: true });
  const expected = await saved(control);
  assert.deepEqual(out.changed, expected.changed, 'the rewrite is the rewrite');
  assert.deepEqual(out.removed, expected.removed);
  assert.ok(Object.keys(out.changed).includes('shared/view.commerce_overview.yaml'), 'the view follows');
  assert.match(out.changed['shared/view.commerce_overview.yaml'], /element: "billing"/);
  assert.ok(Object.keys(out.changed).some((file) => file.startsWith('marketplace/')), 'a plateau that stands on inhouse is rewritten');
  assert.ok(!Object.keys(out.changed).some((file) => file.startsWith('saas/')), 'the sibling keeps its own commerce');
  // the sibling really cannot draw the view now, as the dialog said
  forked.sandbox.drawPlateau('saas');
  assert.equal(forked.sandbox.viewProblem(forked.sandbox.findSavedView('commerce_overview')), 'The element “billing” is not in the plateau “saas”.');
});

test('the views and the steps the dialog lists are the ones the rename rewrites, and only those', async () => {
  const opened = await open(FORK_ON_COMMERCE_SAAS, 'saas');
  const { sandbox } = opened;
  assert.equal(saveForm(sandbox, 'commerce-saas', 'commerce-hosted'), false);
  const impact = plain(dialogOf(sandbox).impact);
  assert.deepEqual(impact.views, []);
  assert.deepEqual(impact.steps, [{ story: 'fork_tour', label: 'Two ways out of the monolith', number: 2, plateaus: ['inhouse', 'marketplace'] }]);
  sandbox.submitAppDialog({});
  const out = await saved(opened);
  const entries = Object.keys(out.changed).filter((file) => file.startsWith('shared/'));
  assert.deepEqual(entries, ['shared/story.fork_tour.yaml'], 'the story that has a step on it, and no view');
  assert.match(out.changed['shared/story.fork_tour.yaml'], /element: "commerce-hosted"/);
});

test('a plateau that only inherits the reference counts as one that declares it, and says where it comes from', async () => {
  const { sandbox } = await open(FORK_ON_COMMERCE_SAAS, 'saas');
  saveForm(sandbox, 'commerce-saas', 'commerce-hosted');
  assert.deepEqual(plain(dialogOf(sandbox).impact.plateaus).map((p) => [p.id, p.declaredIn]), [['inhouse', 'inhouse'], ['marketplace', 'inhouse']]);
  const said = text(sandbox.renderAppDialogHtml());
  assert.match(said, /Rename “Commerce platform \(SaaS\)”: 2 plateaus keep the old reference/);
  assert.match(said, /These 2 plateaus do not stand on saas and still have commerce-saas/);
  assert.match(said, /Marketplace and personalisation \(inherits it from inhouse\)/);
  assert.match(said, /so this one cannot be drawn any more/);
  assert.match(said, /the story Two ways out of the monolith fork_tour, step 2 in inhouse, marketplace/);
  assert.match(said, /draw each of these plateaus/);
});

test('"Cancel" writes nothing: the manifests, the views and the page are as they were', async () => {
  const opened = await open(FORK_ON_COMMERCE, 'inhouse');
  const { sandbox, state } = opened;
  saveForm(sandbox, 'commerce', 'billing');
  const selection = plain(state.selection);
  sandbox.closeAppDialog();
  assert.equal(dialogOf(sandbox), null);
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('commerce'), true);
  assert.equal(sandbox.findSavedView('commerce_overview').properties.element, 'commerce');
  assert.deepEqual(plain(state.selection), selection);
  assert.equal(status(sandbox).state, 'idle', 'no error, no success: nothing was written');
  assert.deepEqual(await saved(opened), { changed: {}, removed: [] });
});

// ---- the rename that asks nothing ----

test('Escape closes the dialog as Cancel does: nothing is written and the focus goes back where it was', async () => {
  const opened = await open(FORK_ON_COMMERCE, 'inhouse');
  const { sandbox, state } = opened;
  saveForm(sandbox, 'commerce', 'billing');
  assert.equal(dialogOf(sandbox).kind, 'rename-siblings');
  sandbox.handleAppDialogKeydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(dialogOf(sandbox), null);
  assert.deepEqual(dirty(state), []);
  assert.equal(state.index.application.has('commerce'), true);
  assert.deepEqual(await saved(opened), { changed: {}, removed: [] });
});

test('a rename in a layered workspace where no plateau beside keeps the reference opens no dialog of ours, and writes what the low-level write writes', async () => {
  const form = await open(BRIGHTCART, 'inhouse');
  assert.equal(form.sandbox.renameSiblingImpact('commerce', 'billing', 'application'), null);
  saveForm(form.sandbox, 'commerce', 'billing');
  assert.deepEqual(sayYes(form.sandbox), ['layer-confirm'], 'only the dialog of the plateaus that stand on inhouse, as before this run');
  const low = await open(BRIGHTCART, 'inhouse');
  low.sandbox.commitElementEdit('commerce', (n) => { n.id = 'billing'; return { renamedTo: { from: 'commerce', to: 'billing' } }; }, 'application', { confirmed: true });
  assert.deepEqual(await saved(form), await saved(low), 'byte for byte');
});

test('a rename where nothing stands on the plateau drawn and no sibling keeps the reference is written at once, as before', async () => {
  const form = await open(BRIGHTCART, 'saas');
  assert.equal(saveForm(form.sandbox, 'commerce-saas', 'commerce-hosted'), true);
  assert.equal(dialogOf(form.sandbox), null);
  assert.equal(form.state.index.application.has('commerce-hosted'), true);
  const low = await open(BRIGHTCART, 'saas');
  low.sandbox.commitElementEdit('commerce-saas', (n) => { n.id = 'commerce-hosted'; return { renamedTo: { from: 'commerce-saas', to: 'commerce-hosted' } }; }, 'application');
  assert.deepEqual(await saved(form), await saved(low), 'byte for byte, the story with a step on it included');
});

test('a sibling that keeps the reference but is named by no view and no step asks nothing either', async () => {
  const files = Object.assign({}, WITHOUT_ENTRIES, { 'saas/application/commerce.yaml': system('commerce', 'saas') });
  const form = await open(files, 'inhouse');
  assert.equal(form.sandbox.renameSiblingImpact('commerce', 'billing', 'application'), null);
  saveForm(form.sandbox, 'commerce', 'billing');
  assert.deepEqual(sayYes(form.sandbox), ['layer-confirm'], 'the sibling asks nothing: only the plateaus that stand on inhouse are asked, as before');
  assert.equal(form.state.index.application.has('billing'), true);
});

test('a rename in baseline asks nothing: every plateau stands on it, and the views follow in all of them', async () => {
  const opened = await open(FORK_ON_COMMERCE, 'baseline');
  const { sandbox, state } = opened;
  assert.equal(sandbox.findSavedView('customer_overview').properties.element, 'customer');
  assert.equal(sandbox.renameSiblingImpact('customer', 'shopper', 'application'), null);
  assert.equal(saveForm(sandbox, 'customer', 'shopper'), false);
  assert.deepEqual(sayYes(sandbox), ['layer-confirm'], 'the plateaus that inherit `customer` change too, and that is all that is asked');
  assert.equal(sandbox.findSavedView('customer_overview').properties.element, 'shopper');
  for (const id of ['saas', 'inhouse', 'marketplace']) {
    sandbox.drawPlateau(id);
    assert.equal(state.index.application.has('shopper'), true, id);
    assert.equal(sandbox.viewProblem(sandbox.findSavedView('customer_overview')), null, 'drawn in ' + id);
  }
});

test('an element the plateau drawn only inherits is refused with its own sentence, not by the dialog', async () => {
  const opened = await open(FORK_ON_COMMERCE, 'saas');
  const { sandbox } = opened;
  // `shop` is named by the shipped view `shop_overview` and kept by every plateau, `baseline` (below saas) and `inhouse` (beside it) included; saas does not declare it, so the write
  // refuses it and the dialog does not offer what cannot be done
  assert.equal(sandbox.findSavedView('shop_overview').properties.element, 'shop');
  assert.equal(sandbox.renameSiblingImpact('shop', 'retail', 'application'), null);
  assert.equal(saveForm(sandbox, 'shop.web', 'front'), false);
  assert.equal(dialogOf(sandbox), null);
  assert.equal(status(sandbox).state, 'error');
  assert.equal(status(sandbox).message, 'Not written: `shop.web` is declared in the plateau `baseline`, and a patch never changes an id: it is renamed where it is declared. Draw `baseline` to rename it. Nothing was changed.');
});

test('a plain edit of the form that does not change the id asks nothing', async () => {
  const { sandbox } = await open(FORK_ON_COMMERCE, 'inhouse');
  assert.equal(saveForm(sandbox, 'commerce', 'commerce'), true);
  assert.equal(dialogOf(sandbox), null);
});

test('a workspace with no plateau renames as it always did: no dialog, the view follows', async () => {
  const files = {
    'workspace.yaml': 'settings:\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml': system('ferry', null).replace('name: "ferry of null"', 'name: "Ferry"'),
    'app.pier.yaml': system('pier', null).replace('name: "pier of null"', 'name: "Pier"'),
    'view.ferry_overview.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "ferry_overview"\n  viewpoint: overview\n  properties:\n    element: ferry\n'
  };
  const opened = await open(files);
  const { sandbox } = opened;
  assert.equal(sandbox.writingPlateau(), null);
  assert.equal(sandbox.renameSiblingImpact('ferry', 'boat', 'application'), null);
  assert.equal(saveForm(sandbox, 'ferry', 'boat'), true);
  assert.equal(dialogOf(sandbox), null);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.changed).sort(), ['app.ferry.yaml', 'view.ferry_overview.yaml']);
  assert.match(out.changed['view.ferry_overview.yaml'], /element: boat/);
});

// ---- what a recipe names ----

test('what a recipe names is what the rewrite rewrites: the element of a view, the pinned, hidden and opened elements of a map, in the layer of the recipe only', async () => {
  const { sandbox } = await open(BRIGHTCART, 'inhouse');
  const recipes = [
    { viewpoint: 'overview', layer: 'application', properties: { element: 'commerce.cart' } },
    { viewpoint: 'detailed', properties: { element: 'commerce' } },
    { viewpoint: 'overview', layer: 'technology', properties: { element: 'commerce' } },
    { viewpoint: 'map', layer: 'application', properties: { pinned: ['commerce', 'customer'], hidden: ['commerce.cart'], opened: ['commerce', 3] } },
    { viewpoint: 'map', layer: 'technology', properties: { pinned: ['commerce'] } },
    { viewpoint: 'overview', layer: 'application' },
    { viewpoint: 'map', layer: 'application', properties: { pinned: 'commerce' } }
  ];
  for (const recipe of recipes) {
    const names = sandbox.recipeNamedReferences(recipe, 'application');
    const copy = plain(recipe);
    const rewritten = sandbox.rewriteRecipeReferences(copy, 'commerce', 'billing', 'application');
    const affected = names.some((reference) => sandbox.rewriteReferenceValue(reference, 'commerce', 'billing') !== reference);
    assert.equal(affected, rewritten, JSON.stringify(recipe));
  }
  assert.deepEqual(plain(sandbox.recipeNamedReferences(recipes[3], 'application')), ['commerce', 'customer', 'commerce.cart', 'commerce']);
  assert.deepEqual(plain(sandbox.recipeNamedReferences(recipes[3], 'technology')), []);
});

test('a map that pins the element in a sibling is listed too', async () => {
  const files = Object.assign({}, FORK_ON_COMMERCE, {
    'shared/view.commerce_map.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "commerce_map"\n  name: "Commerce map"\n  viewpoint: map\n  layer: application\n  properties:\n    pinned: ["commerce", "customer"]\n'
  });
  const { sandbox } = await open(files, 'inhouse');
  saveForm(sandbox, 'commerce', 'billing');
  assert.deepEqual(plain(dialogOf(sandbox).impact.views).map((v) => v.id), ['commerce_map', 'commerce_overview']);
});
