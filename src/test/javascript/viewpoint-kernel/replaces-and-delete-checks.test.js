'use strict';
// What a layer cannot hold is refused before anything is written (wave 019, run 0139, issue #138, decision T4: checks only, nothing is offered instead):
//   (a) "Add replaces" of the inspection asks `replacesLayerProblem`, as "Write replaces" does since #130;
//   (b) a merge, written one pair at a time by "Write replaces", is checked for all its pairs before the first is written, and refused as a whole;
//   (c) the delete of a plateau that others override looks at the `against` of the story steps and at the saved views drawn in a plateau above, as it looked at the `at`.
// Each check fails on the page of `archicode-0.17.0` (ARCHICODE_EDITOR_HTML=<the page of the tag> node --test this file). The cases are R07 of compose-replaces-cases.json,
// the layered Brightcart (src/test/resources/brightcart/layered/, without `shared/`, with the plateau `pilot` of delete-plateau-in-the-middle.test.js put in the middle) and
// small workspaces invented here; none is shipped.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value));
const text = (html) =>
  html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&times;/g, '×')
    .replace(/&quot;/g, '"')
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const filesOf = (mem) => Object.fromEntries(Array.from(mem.files, ([p, f]) => [p, f.text]));

async function open(files, plateau, against) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null, String(state.fatalError));
  if (plateau) sandbox.drawPlateau(plateau);
  if (against) sandbox.compareWithPlateau(against);
  return { sandbox, state, mem };
}

function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({
    target: { closest: (selector) => (selector === '[data-action]' ? target : null) },
    preventDefault() {},
    stopPropagation() {},
    detail: 1
  });
}

/** The fields of the edit form of `reference`, as the page reads them, with `adding` typed in the field of Add replaces; the inline errors are collected. */
function formFields(sandbox, reference, adding) {
  const record = sandbox.__state().index.application.get(reference);
  const errors = {};
  const fields = {
    'edit-id-input': { value: record.id },
    'edit-name-input': { value: record.name || '' },
    'edit-description-input': { value: record.description || '' },
    'add-replaces-input': { value: adding }
  };
  const original = sandbox.document.getElementById;
  sandbox.document.getElementById = (id) => {
    if (fields[id]) return fields[id];
    if (/error$/.test(id))
      return {
        set textContent(v) {
          errors[id] = v;
        },
        get textContent() {
          return errors[id];
        }
      };
    return original(id);
  };
  return { errors, fields };
}

const SYSTEM = (id, name, rest, plateau) =>
  'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' +
  (plateau ? '  plateau: ' + plateau + '\n' : '') +
  'content:\n  id: "' +
  id +
  '"\n  name: "' +
  name +
  '"\n' +
  (rest || '');
const PLATEAU = (id, rest) =>
  'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (rest || '');
const WORKSPACE = 'settings:\n  manifests:\n    paths: ["manifests/**"]\n';

// ---- (a) Add replaces ----

// R07: p1 removes a (b replaces it there), p2 over p1 removes b and adds n; compared with baseline, p2 is two layers away
const R07 = JSON.parse(fs.readFileSync(path.join(__dirname, 'compose-replaces-cases.json'), 'utf8')).cases.find(
  (c) => c.id === 'R07'
).files;
const SENTENCE =
  '“a” is not an element of “p1”, the plateau “p2” builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. ' +
  'Compare “p2” with “p1”, or write the entry in the layer that still has “a” (a plateau that overrides one that holds it); nothing was written.';

test('(a) Add replaces refuses a reference the layer cannot hold, with the sentence of Write replaces, and writes nothing', async () => {
  const { sandbox, state, mem } = await open(R07, 'p2', 'baseline');
  const before = filesOf(mem);
  const { errors, fields } = formFields(sandbox, 'n', 'a');
  click(sandbox, { 'data-action': 'add-replaces', 'data-ref': 'n' });
  assert.equal(errors['add-replaces-error'], SENTENCE);
  assert.equal(fields['add-replaces-input'].value, 'a', 'the reference typed stays in the field');
  assert.deepEqual(plain(state.index.application.get('n').replaces), []);
  assert.equal(state.dirtyReferences.size, 0);
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.dirty)), [], 'no file is marked modified');
  await sandbox.saveAllChanges();
  assert.deepEqual(plain(mem.writes), []);
  assert.deepEqual(filesOf(mem), before);
});

test('(a) Add replaces writes what the layer can hold, as before: a reference the plateau below has, one layer apart, no comparison', async () => {
  // k is an element of p1, the plateau p2 builds on
  const held = await open(R07, 'p2', 'baseline');
  formFields(held.sandbox, 'n', 'k');
  click(held.sandbox, { 'data-action': 'add-replaces', 'data-ref': 'n' });
  assert.deepEqual(plain(held.state.index.application.get('n').replaces), ['k']);
  // compared with p1 (one layer apart): the reference is flagged and the kernel warns, as in wave 009; nothing refuses it
  const near = await open(R07, 'p2', 'p1');
  const { errors } = formFields(near.sandbox, 'n', 'a');
  click(near.sandbox, { 'data-action': 'add-replaces', 'data-ref': 'n' });
  assert.equal(errors['add-replaces-error'] === undefined || errors['add-replaces-error'] === '', true);
  assert.deepEqual(plain(near.state.index.application.get('n').replaces), ['a']);
  assert.match(text(near.sandbox.renderElementEditionFormHtml('n')), /a not in “p1” ×/);
  // nothing compared: nothing to check against
  const alone = await open(R07, 'p2', null);
  formFields(alone.sandbox, 'n', 'a');
  click(alone.sandbox, { 'data-action': 'add-replaces', 'data-ref': 'n' });
  assert.deepEqual(plain(alone.state.index.application.get('n').replaces), ['a']);
});

test('(a) with the future the plateau drawn is the base of the comparison: its own entries are not checked against it', async () => {
  const { sandbox, state } = await open(R07, 'p1', null);
  sandbox.toggleCompareWithFuture();
  assert.equal(sandbox.comparisonState().future, true);
  assert.equal(sandbox.addReplacesLayerProblem(state.index.application.get('b'), 'zzz'), null);
});

// ---- (b) a merge ----

// a and b say the same thing as n: the kernel proposes (a, n) and (b, n), a merge. p1 removes a; p2 over p1 removes b and adds n.
const SAME = '  description: "Books the parcels of every order and tracks them."\n';
const MERGE = {
  '.archicode.yaml': WORKSPACE,
  'manifests/base/a.yaml': SYSTEM('a', 'A', SAME),
  'manifests/base/b.yaml': SYSTEM('b', 'B', SAME),
  'manifests/base/k.yaml': SYSTEM('k', 'K'),
  'manifests/p1/plateau.yaml': PLATEAU('p1', '  patches:\n    - operator: REMOVE\n      target: "a"\n'),
  'manifests/p2/plateau.yaml': PLATEAU(
    'p2',
    '  override: "p1"\n  patches:\n    - operator: REMOVE\n      target: "b"\n'
  ),
  'manifests/p2/n.yaml': SYSTEM('n', 'N', SAME, 'p2')
};
const MERGE_SENTENCE =
  '“n” would merge “a” and “b”, which is written one pair at a time, so every pair is checked before the first is written: ' +
  '“a” is not an element of “p1”, the plateau “p2” builds on (a layer in between removed it): replaces is read against that plateau, so the entry would name nothing there. ' +
  'Compare “p2” with “p1”, or write the entry in the layer that still has “a” (a plateau that overrides one that holds it). If a pair is no part of the merge, set it aside with “Not related”; nothing was written.';

test('(b) a merge one of whose pairs the layer cannot hold is refused as a whole: both buttons are off, and the pair the layer could hold is not written', async () => {
  const { sandbox, state, mem } = await open(MERGE, 'p2', 'baseline');
  const view = sandbox.comparisonState();
  assert.deepEqual(
    plain(view.candidates).map((c) => [c.from, c.to]),
    [
      ['a', 'n'],
      ['b', 'n']
    ],
    'the kernel proposes a merge'
  );
  assert.notEqual(sandbox.replacesLayerProblem('application', 'a', view), null);
  assert.equal(sandbox.replacesLayerProblem('application', 'b', view), null, 'b alone could be written: p1 has it');
  const panel = sandbox.renderChangesPanelHtml(view);
  const buttons = Array.from(panel.matchAll(/<button type="button" data-action="accept-candidate"[^>]*>/g)).map(
    (m) => m[0]
  );
  assert.equal(buttons.length, 2);
  for (const button of buttons) assert.match(button, / disabled title="/);
  assert.ok(
    buttons[0].includes('title="“a” is not an element of “p1”'),
    'the pair whose own from is refused keeps its own sentence (#130)'
  );
  assert.ok(text(panel).includes(MERGE_SENTENCE), 'the other pair says why the merge is refused');
  const before = filesOf(mem);
  assert.deepEqual(plain(sandbox.acceptCandidate({ layer: 'application', from: 'b', to: 'n' })), {
    ok: false,
    message: MERGE_SENTENCE
  });
  assert.deepEqual(plain(state.index.application.get('n').replaces), [], 'no half-written merge');
  assert.equal(state.dirtyReferences.size, 0);
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.dirty)), []);
  assert.deepEqual(filesOf(mem), before);
});

test('(b) a pair set aside with Not related is no part of the merge: the other pair is written, as a lone pair is', async () => {
  const { sandbox, state } = await open(MERGE, 'p2', 'baseline');
  sandbox.dismissCandidate({ layer: 'application', from: 'a', to: 'n' });
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(sandbox.comparisonState()), / disabled/);
  assert.deepEqual(plain(sandbox.acceptCandidate({ layer: 'application', from: 'b', to: 'n' })), { ok: true });
  assert.deepEqual(plain(state.index.application.get('n').replaces), ['b']);
  assert.deepEqual(plain(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)), ['manifests/p2/n.yaml']);
});

test('(b) a merge whose every pair the layer holds is written as before, one pair at a time', async () => {
  const files = Object.assign({}, MERGE, {
    'manifests/base/c.yaml': SYSTEM('c', 'C', SAME),
    'manifests/p1/plateau.yaml': PLATEAU('p1'),
    'manifests/p2/plateau.yaml': PLATEAU(
      'p2',
      '  override: "p1"\n  patches:\n    - operator: REMOVE\n      target: "a"\n    - operator: REMOVE\n      target: "c"\n'
    )
  });
  delete files['manifests/base/b.yaml'];
  const { sandbox, state } = await open(files, 'p2', 'baseline');
  const view = sandbox.comparisonState();
  assert.deepEqual(
    plain(view.candidates).map((c) => [c.from, c.to]),
    [
      ['a', 'n'],
      ['c', 'n']
    ]
  );
  assert.doesNotMatch(sandbox.renderChangesPanelHtml(view), / disabled/);
  assert.deepEqual(plain(sandbox.acceptCandidate({ layer: 'application', from: 'a', to: 'n' })), { ok: true });
  assert.deepEqual(plain(state.index.application.get('n').replaces), ['a']);
});

// ---- (c) the delete of a plateau ----

const LAYERED = path.resolve(__dirname, '../../resources/brightcart/layered');
function walk(dir, base, out) {
  for (const name of fs.readdirSync(dir).sort()) {
    const p = path.join(dir, name);
    if (fs.statSync(p).isDirectory()) walk(p, base, out);
    else out[path.relative(base, p).split(path.sep).join('/')] = fs.readFileSync(p, 'utf8');
  }
  return out;
}
const BRIGHTCART = Object.fromEntries(
  Object.entries(walk(LAYERED, LAYERED, {})).filter(([file]) => !file.startsWith('shared/'))
);
const ELEMENT = (kind, plateau, body) =>
  'header:\n  kind: "archicode.morin.io/' +
  kind +
  '"\n  version: "1"\n' +
  (plateau ? '  plateau: ' + plateau + '\n' : '') +
  'content:\n' +
  body;
const STORY = (id, steps) =>
  'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;
const VIEW = (id, body) =>
  'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + body;
// `pilot` stands between inhouse and marketplace and declares `loyalty` and the environment `lab`; `twin`, beside it, declares a `loyalty` of its own, so the name exists in a
// plateau once pilot is gone and the plateau-free check says nothing of it: only what marketplace loses is told
const PILOT = Object.assign({}, BRIGHTCART, {
  'pilot/plateau.yaml': PLATEAU('pilot', '  name: "Loyalty pilot"\n  override: "inhouse"\n'),
  'pilot/application/loyalty.yaml': ELEMENT('system', 'pilot', '  id: "loyalty"\n  name: "Loyalty scheme"\n'),
  'pilot/technology/lab.yaml': ELEMENT('environment', 'pilot', '  id: "lab"\n  name: "Pilot lab"\n'),
  'twin/plateau.yaml': PLATEAU('twin', '  override: "inhouse"\n'),
  'twin/application/loyalty.yaml': ELEMENT('system', 'twin', '  id: "loyalty"\n'),
  'twin/technology/lab.yaml': ELEMENT('environment', 'twin', '  id: "lab"\n'),
  'marketplace/plateau.yaml': BRIGHTCART['marketplace/plateau.yaml'].replace('override: "inhouse"', 'override: "pilot"')
});
const parents = (state) =>
  Object.fromEntries(Array.from(state.plateauTree.nodes.values()).map((n) => [n.id, n.parent]));
const snapshot = (state) => ({
  files: state.manifestFiles.map((mf) => [mf.relPath, mf.rawText, mf.dirty]),
  removals: plain(state.pendingFileRemovals),
  parents: parents(state),
  topLevel: plain(state.workspace.topLevel)
});

/** Asserts that the delete of `id` is refused with `blocking`, in the dialog and by the writer, and that nothing changes. */
async function refused(files, id, blocking) {
  const { sandbox, state, mem } = await open(files);
  const before = snapshot(state);
  const plan = plain(sandbox.plateauDeletion(id));
  assert.equal(plan.refusal, null);
  assert.deepEqual(plan.breaks, []);
  assert.deepEqual(plan.blocking, blocking);
  sandbox.openPlateauDeleteDialog(id);
  const html = sandbox.renderAppDialogHtml();
  assert.match(text(html), /It cannot be deleted yet: once these files are gone/);
  assert.doesNotMatch(html, /Delete plateau<\/button>/);
  sandbox.closeAppDialog();
  assert.throws(
    () => sandbox.commitPlateauDelete(id, { listed: true }),
    (e) =>
      e.message.startsWith('The plateau `' + id + '` cannot be deleted: ') &&
      e.message.includes(blocking[0].replace(/\.$/, ''))
  );
  assert.deepEqual(snapshot(state), before);
  await sandbox.saveAllChanges();
  assert.deepEqual(plain(mem.writes), [], 'nothing on disk');
  assert.deepEqual(plain(mem.removals), []);
  return { sandbox, state };
}

test('(c) a step compared with a plateau above refuses the delete when neither it nor the plateau it is told at keeps what it draws; one that keeps a pin there, is told at a plateau that keeps it, or compares with a plateau beside, does not', async () => {
  const files = Object.assign({}, PILOT, {
    'stories/story.tour.yaml': STORY(
      'tour',
      '    - viewpoint: overview\n      properties:\n        element: loyalty\n      against: marketplace\n' + // told at the plateau drawn
        '    - viewpoint: overview\n      properties:\n        element: loyalty\n      at: twin\n      against: marketplace\n' + // twin keeps loyalty: the comparison is drawn from it, so the step still draws
        '    - viewpoint: map\n      properties:\n        pinned: [loyalty, customer]\n      against: marketplace\n' + // customer stays: the map is drawn
        '    - viewpoint: overview\n      properties:\n        element: loyalty\n      against: saas\n' + // saas does not stand on pilot
        '    - viewpoint: map\n      layer: technology\n      properties:\n        pinned: [lab]\n      at: saas\n      against: marketplace\n'
    )
  });
  await refused(files, 'pilot', [
    'the story `tour` (`stories/story.tour.yaml`) step 1 is compared with `marketplace`, which would no longer have `loyalty`',
    'the story `tour` (`stories/story.tour.yaml`) step 5 is compared with `marketplace`, which would no longer have `lab`'
  ]);
});

test('(c) a step told at a plateau above and compared with another one above says both, the `at` first, as run 0132 said the `at`', async () => {
  const files = Object.assign({}, PILOT, {
    'beta/plateau.yaml': PLATEAU('beta', '  override: "pilot"\n'),
    'stories/story.tour.yaml': STORY(
      'tour',
      '    - viewpoint: overview\n      properties:\n        element: loyalty\n      at: beta\n      against: marketplace\n'
    )
  });
  await refused(files, 'pilot', [
    'the story `tour` (`stories/story.tour.yaml`) step 1 is told at `beta`, which would no longer have `loyalty`',
    'the story `tour` (`stories/story.tour.yaml`) step 1 is compared with `marketplace`, which would no longer have `loyalty`'
  ]);
});

test('(c) a saved view drawn in the plateaus above that would lose what it draws refuses the delete, one sentence naming them; a view that keeps it does not', async () => {
  const files = Object.assign({}, PILOT, {
    'beta/plateau.yaml': PLATEAU('beta', '  override: "pilot"\n'),
    'entries/view.loyalty.yaml': VIEW(
      'loyalty_overview',
      '  viewpoint: overview\n  properties:\n    element: loyalty\n'
    ),
    'entries/view.lab.yaml': VIEW(
      'lab_map',
      '  viewpoint: map\n  layer: technology\n  properties:\n    pinned: [lab]\n'
    ),
    'entries/view.kept.yaml': VIEW('kept_map', '  viewpoint: map\n  properties:\n    pinned: [loyalty, customer]\n'),
    'entries/view.customer.yaml': VIEW(
      'customer_overview',
      '  viewpoint: overview\n  properties:\n    element: customer\n'
    )
  });
  const { sandbox } = await refused(files, 'pilot', [
    'the view `lab_map` (`entries/view.lab.yaml`) is drawn in `beta`, `marketplace`, which would no longer have `lab`',
    'the view `loyalty_overview` (`entries/view.loyalty.yaml`) is drawn in `beta`, `marketplace`, which would no longer have `loyalty`'
  ]);
  assert.match(
    sandbox.plateauDeletion('pilot').blocking.join('\n'),
    /^(?![\s\S]*kept_map)(?![\s\S]*customer_overview)/,
    'a map that keeps a pin, and a view of an element that stays, are not told'
  );
});

test('(c) a view or a step of an element only the deleted plateau declares is told by the plateau-free check too, as the step told at a plateau above already was', async () => {
  const files = Object.assign({}, PILOT, {
    'pilot/application/perk.yaml': ELEMENT('system', 'pilot', '  id: "perk"\n'),
    'entries/view.perk.yaml': VIEW('perk_overview', '  viewpoint: overview\n  properties:\n    element: perk\n')
  });
  await refused(files, 'pilot', [
    'the view `perk_overview` (`entries/view.perk.yaml`) names `perk`, which exists in no plateau',
    'the view `perk_overview` (`entries/view.perk.yaml`) is drawn in `marketplace`, which would no longer have `perk`'
  ]);
});

test('(c) a leaf has no plateau above it: a view or a step of what it declares is told by the plateau-free check alone, as before', async () => {
  const files = Object.assign({}, PILOT, {
    'entries/view.loyalty.yaml': VIEW(
      'loyalty_overview',
      '  viewpoint: overview\n  properties:\n    element: loyalty\n'
    ),
    'stories/story.tour.yaml': STORY(
      'tour',
      '    - viewpoint: overview\n      properties:\n        element: loyalty\n      against: twin\n'
    )
  });
  const { sandbox } = await open(files);
  assert.deepEqual(plain(sandbox.plateauDeletion('twin').blocking), [
    'the story `tour` (`stories/story.tour.yaml`) step 1 says `against: twin`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `pilot`, `marketplace`, `saas`)'
  ]);
  assert.deepEqual(plain(sandbox.plateauDeletion('saas').blocking), []);
});
