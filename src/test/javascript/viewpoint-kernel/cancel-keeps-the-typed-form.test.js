'use strict';
// Cancelling a dialog opened by saving the form of an element gives the form back as it was typed (wave 017, run 0121, issue #123). Saving the form can open two dialogs before
// anything is written: `layer-confirm` (the plateaus a write changes) and `rename-siblings` (the plateaus and the views a rename leaves behind, run 0113). Opening a dialog draws
// the page again, and a redraw gives every field afresh from the model; so Cancel, Escape and a click beside the dialog used to leave the id, the name and the description as the
// model has them, not as the author typed them. Seen in a browser first (the layered Brightcart served by `archicode editor serve`, Mail provider, name, id and description typed,
// Save all changes, Cancel: the three fields were back to the model). The page keeps the typed values as view state while the dialog is open (`keptElementForm`).
// The harness has no DOM, so the test gives the page a small one: a form whose fields are drawn from the model each time the page assigns `#app`'s innerHTML, as a redraw does.
// The layered Brightcart (src/test/resources/brightcart/layered/) is copied into an in-memory folder; the fork that opens `rename-siblings` is the one of
// rename-sibling-plateaus.test.js. Everything else here is invented (a ferry company).
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

function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}

const BRIGHTCART = walk(LAYERED, LAYERED, {});
const system = (id, plateau) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') + 'content:\n  id: "' + id + '"\n  name: "' + id + '"\n';
const FORK_ON_COMMERCE = Object.assign({}, BRIGHTCART, { 'saas/application/commerce.yaml': system('commerce', 'saas') });

async function open(files, drawn) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  sandbox.window.showDirectoryPicker = function showDirectoryPicker() {}; // a browser that can open a folder: without it `render()` draws the landing card and no form
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  if (drawn) sandbox.drawPlateau(drawn);
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

/**
 * A DOM for the form of one element: `render()` assigns `#app`'s innerHTML, which draws the fields again from the model (id, name, description, the box of a new qualifier and one
 * relationship row), whatever was typed. `form.fields` are the fields on screen now, by id; `type` is the author typing in one of them.
 */
function giveForm(sandbox, reference) {
  const doc = sandbox.document;
  const app = doc.getElementById('app');
  if (!app.querySelector) app.querySelector = () => null; // no focus to give back in Node
  if (!app.querySelectorAll) app.querySelectorAll = () => [];
  const form = { fields: {}, draws: 0 };
  const field = (id, tag, value, extra) => {
    const attributes = Object.assign({}, extra && extra.attributes);
    return Object.assign({
      id, tagName: tag, type: 'text', className: '', value, defaultValue: value,
      getAttribute: (name) => (name in attributes ? attributes[name] : null),
      closest: (selector) => (selector === '[data-index]' && extra && extra.row !== undefined ? { getAttribute: () => String(extra.row) } : null)
    }, extra && extra.props);
  };
  const draw = () => {
    const record = sandbox.findElementRecord(reference, sandbox.layerOfReference(reference) || 'application');
    form.draws++;
    if (!record) { form.fields = {}; return; } // the element is gone (renamed): the page draws another form
    form.fields = {
      'edit-id-input': field('edit-id-input', 'INPUT', String(record.id)),
      'edit-name-input': field('edit-name-input', 'INPUT', record.name === null || record.name === undefined ? '' : String(record.name)),
      'edit-description-input': field('edit-description-input', 'TEXTAREA', record.description === null || record.description === undefined ? '' : String(record.description)),
      'add-qualifier-input': field('add-qualifier-input', 'INPUT', '', { attributes: { placeholder: 'new qualifier' } }),
      'rel-label': field('', 'INPUT', '', { props: { className: 'rel-label-input' }, row: 0, attributes: { placeholder: 'label' } })
    };
  };
  let html = '';
  Object.defineProperty(app, 'innerHTML', { get: () => html, set: (v) => { html = v; draw(); }, configurable: true });
  draw();
  const formElement = { querySelectorAll: () => Object.values(form.fields) };
  const original = { getElementById: doc.getElementById, querySelector: doc.querySelector, querySelectorAll: doc.querySelectorAll };
  doc.getElementById = (name) => form.fields[name] || original.getElementById.call(doc, name);
  doc.querySelector = (selector) => (selector === '.element-edition-form' ? formElement : original.querySelector.call(doc, selector));
  doc.querySelectorAll = (selector) => (selector.includes('relationship-edit-row') ? [] : original.querySelectorAll.call(doc, selector));
  const state = sandbox.__state();
  state.selection = Object.assign({}, state.selection, { kind: 'element', key: reference, mode: 'edit', layer: sandbox.layerOfReference(reference) || 'application' });
  return {
    form,
    type(id, value) { form.fields[id].value = value; },
    value: (id) => form.fields[id].value,
    values: () => Object.fromEntries(Object.entries(form.fields).map(([id, f]) => [id, f.value]))
  };
}

const dialogOf = (sandbox) => run(sandbox, 'appDialog');
const kept = (sandbox) => run(sandbox, 'keptElementForm');
const draftTyped = (sandbox) => run(sandbox, 'draftTyped');

const TYPED = { 'edit-id-input': 'billing', 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description', 'add-qualifier-input': 'later' };
function typeAll(screen, typed) {
  for (const [id, value] of Object.entries(typed)) screen.type(id, value);
}

// ---- layer-confirm: the plateaus a write changes ----

test('layer-confirm: the form is back as typed after the dialog opens and after Cancel', async () => {
  const { sandbox } = await open(BRIGHTCART, 'baseline');
  const screen = giveForm(sandbox, 'mailer');
  const model = screen.values();
  typeAll(screen, { 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description', 'add-qualifier-input': 'later', 'edit-id-input': 'mailer' });
  const typed = screen.values();
  assert.notDeepEqual(typed, model);
  assert.equal(sandbox.commitElementWithDraft('mailer', null), false, 'the save waits for the answer');
  assert.equal(dialogOf(sandbox).kind, 'layer-confirm');
  assert.deepEqual(screen.values(), typed, 'behind the dialog, the form shows what was typed');
  assert.equal(draftTyped(sandbox), true, 'and it is still typed text that is not written');
  sandbox.closeAppDialog();
  assert.equal(dialogOf(sandbox), null);
  assert.deepEqual(screen.values(), typed, 'Cancel gives the form back as it was typed');
  assert.equal(kept(sandbox), null, 'the copy is gone with the dialog');
  assert.equal(draftTyped(sandbox), true, 'Save all changes is still lit for it');
});

test('layer-confirm: nothing is written, and typing again then saving opens the dialog again with the typed values', async () => {
  const opened = await open(BRIGHTCART, 'baseline');
  const { sandbox, state } = opened;
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-name-input': 'Typed name' });
  sandbox.commitElementWithDraft('mailer', null);
  sandbox.closeAppDialog();
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 0, 'Cancel writes nothing');
  assert.equal(sandbox.findElementRecord('mailer', 'application').name, 'Mail provider', 'the model has the name it had');
  assert.equal(sandbox.commitElementWithDraft('mailer', null), false);
  assert.equal(dialogOf(sandbox).kind, 'layer-confirm', 'the form still holds the typed name, so the same dialog');
  sandbox.closeAppDialog();
  assert.equal(screen.value('edit-name-input'), 'Typed name');
});

test('layer-confirm: Escape and a click beside the dialog give the form back as typed', async () => {
  const { sandbox } = await open(BRIGHTCART, 'baseline');
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description' });
  const typed = screen.values();
  sandbox.commitElementWithDraft('mailer', null);
  sandbox.handleAppDialogKeydown({ key: 'Escape', preventDefault() {}, stopPropagation() {} });
  assert.equal(dialogOf(sandbox), null, 'Escape closes the dialog');
  assert.deepEqual(screen.values(), typed);
  sandbox.commitElementWithDraft('mailer', null);
  assert.equal(dialogOf(sandbox).kind, 'layer-confirm');
  sandbox.handleAppClick({ target: { classList: { contains: (name) => name === 'app-dialog-backdrop' }, closest: () => null, getAttribute: () => null } });
  assert.equal(dialogOf(sandbox), null, 'a click beside the dialog closes it');
  assert.deepEqual(screen.values(), typed);
});

test('layer-confirm: saying yes still writes what was typed, and keeps no copy', async () => {
  const opened = await open(BRIGHTCART, 'baseline');
  const { sandbox } = opened;
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description' });
  sandbox.commitElementWithDraft('mailer', null);
  assert.equal(dialogOf(sandbox).kind, 'layer-confirm');
  sandbox.submitAppDialog({});
  assert.equal(dialogOf(sandbox), null);
  assert.equal(kept(sandbox), null);
  const record = sandbox.findElementRecord('mailer', 'application');
  assert.equal(record.name, 'Typed name');
  assert.equal(record.description, 'Typed description');
});

// ---- rename-siblings: the plateaus and the views a rename leaves behind ----

test('rename-siblings: Cancel gives back the id, the name and the description as typed', async () => {
  const { sandbox, state } = await open(FORK_ON_COMMERCE, 'inhouse');
  const screen = giveForm(sandbox, 'commerce');
  typeAll(screen, { 'edit-id-input': 'billing', 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description', 'add-qualifier-input': 'later' });
  const typed = screen.values();
  assert.equal(typed['edit-id-input'], 'billing');
  assert.equal(sandbox.commitElementWithDraft('commerce', null), false);
  assert.equal(dialogOf(sandbox).kind, 'rename-siblings');
  assert.deepEqual(screen.values(), typed, 'behind the dialog');
  sandbox.closeAppDialog();
  assert.deepEqual(screen.values(), typed, 'after Cancel');
  assert.equal(state.index.application.has('commerce'), true, 'nothing was renamed');
  assert.equal(state.index.application.has('billing'), false);
  assert.equal(kept(sandbox), null);
});

test('rename-siblings: Rename anyway renames, and the form does not come back with the old id', async () => {
  const { sandbox, state } = await open(FORK_ON_COMMERCE, 'inhouse');
  const screen = giveForm(sandbox, 'commerce');
  typeAll(screen, { 'edit-id-input': 'billing', 'edit-name-input': 'Typed name' });
  sandbox.commitElementWithDraft('commerce', null);
  assert.equal(dialogOf(sandbox).kind, 'rename-siblings');
  const out = [];
  for (let i = 0; i < 4 && dialogOf(sandbox); i++) { out.push(dialogOf(sandbox).kind); sandbox.submitAppDialog({}); }
  assert.deepEqual(out, ['rename-siblings', 'layer-confirm'].slice(0, out.length));
  assert.equal(dialogOf(sandbox), null);
  assert.equal(state.index.application.has('billing'), true);
  assert.equal(state.index.application.has('commerce'), false);
  assert.equal(kept(sandbox), null);
});

// ---- what the copy is not ----

test('the copy is view state: Cancel and the restore change no model, and a form of another element does not take it', async () => {
  const { sandbox, state } = await open(BRIGHTCART, 'baseline');
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-name-input': 'Typed name' });
  sandbox.commitElementWithDraft('mailer', null); // the write is tried and put back (it counts as models changed), then the dialog is asked
  const version = run(sandbox, 'modelVersion');
  assert.equal(typeof version, 'number');
  sandbox.closeAppDialog();
  assert.equal(run(sandbox, 'modelVersion'), version, 'Cancel and the restore of the form are no modelsChanged()');
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 0);
  // the author leaves for another element while the dialog is open (an address typed): the form drawn is the other one's
  sandbox.commitElementWithDraft('mailer', null);
  assert.equal(dialogOf(sandbox).kind, 'layer-confirm');
  state.selection = Object.assign({}, state.selection, { key: 'carrier' });
  const other = giveForm(sandbox, 'carrier');
  const model = other.values();
  sandbox.closeAppDialog();
  assert.deepEqual(other.values(), model, 'the typed name of mailer is not put in the form of carrier');
  assert.equal(kept(sandbox), null);
});

test('a dialog of another kind, or a form that is not in edition, keeps nothing', async () => {
  const { sandbox, state } = await open(BRIGHTCART, 'baseline');
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-name-input': 'Typed name' });
  sandbox.openAppDialog({ kind: 'text', title: 't', label: 'l', value: '', confirmLabel: 'ok', onSubmit() {} });
  assert.equal(kept(sandbox), null, 'only the two dialogs that wait for an answer to a save keep the form');
  sandbox.closeAppDialog();
  state.selection = Object.assign({}, state.selection, { mode: 'view' });
  sandbox.openAppDialog({ kind: 'layer-confirm', plateau: 'baseline', summary: 's', changed: [], onConfirm() {} });
  assert.equal(kept(sandbox), null, 'the form is not on screen in view mode');
  sandbox.closeAppDialog();
});

// ---- a refused write and an error of the write, which open no dialog (wave 018, run 0130, issue #129) ----
// Both redrew the form from the model, so the author read the sentence next to a form that no longer held the edit. `writeElementDraft` keeps the fields as typed before it writes and
// `render()` puts them back (and drops the copy: no dialog is open). They fail on the page of run 0129, where the three fields are the model's.

test('a refused write keeps the id, the name and the description as typed, next to the sentence', async () => {
  const { sandbox, state } = await open(FORK_ON_COMMERCE, 'saas');
  const screen = giveForm(sandbox, 'shop.web');
  typeAll(screen, { 'edit-id-input': 'front', 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description' });
  const typed = screen.values();
  assert.equal(sandbox.commitElementWithDraft('shop.web', null), false);
  assert.equal(dialogOf(sandbox), null, 'no dialog is open');
  assert.match(state.saveStatus ? state.saveStatus.message : run(sandbox, 'saveStatus').message, /^Not written: `shop\.web` is declared in the plateau `baseline`, and a patch never changes an id/);
  assert.deepEqual(screen.values(), typed, 'the form holds what was typed');
  assert.equal(draftTyped(sandbox), true, 'and Save all changes is lit for it');
  assert.equal(kept(sandbox), null, 'the copy is gone once the form is back');
  assert.equal(state.manifestFiles.filter((f) => f.dirty).length, 0, 'nothing was written');
});

test('an error of the write keeps the fields as typed', async () => {
  const { sandbox } = await open(BRIGHTCART, 'baseline');
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-id-input': 'mailer', 'edit-name-input': 'Typed name', 'edit-description-input': 'Typed description' });
  const typed = screen.values();
  run(sandbox, 'commitElementEdit = function commitElementEdit() { throw new Error("disk full"); }');
  assert.equal(sandbox.commitElementWithDraft('mailer', null), false);
  assert.equal(run(sandbox, 'saveStatus').message, 'disk full');
  assert.deepEqual(screen.values(), typed);
  assert.equal(kept(sandbox), null);
});

test('the typed values are not kept once the write succeeds', async () => {
  const { sandbox } = await open(BRIGHTCART, 'baseline');
  const screen = giveForm(sandbox, 'mailer');
  typeAll(screen, { 'edit-name-input': 'Typed name' });
  sandbox.commitElementWithDraft('mailer', null);
  sandbox.submitAppDialog({});
  assert.equal(kept(sandbox), null);
  assert.equal(sandbox.findElementRecord('mailer', 'application').name, 'Typed name');
  assert.equal(screen.value('edit-name-input'), 'Typed name');
});
