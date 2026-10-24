'use strict';
// A plateau that other plateaus override is deleted in one step (wave 018, run 0132, issue #112, decision D5 of the author): the plateaus that override it go under the
// plateau it overrode (their `override` is rewritten, or taken out when that is the root), its files are queued for removal, and what it brought is lost to every plateau
// that stood on it. The dialog says, for each of them, what it loses, gets back and reads differently, from the kernel's resolution of the plateaus before and after.
// A plateau above that would no longer resolve, a step told at a plateau above that would lose what it draws, and the refusals of run 0102 refuse the delete; a refused
// delete changes nothing. The layered Brightcart (src/test/resources/brightcart/layered/: baseline, inhouse over baseline, marketplace over inhouse, saas over baseline) is
// copied into an in-memory folder, without the views and stories of `shared/` (they refuse deletes, see delete-plateau.test.js); the plateau `pilot` put in the middle, and
// the plateaus `beta`, `gamma` and `twin`, are built here and never shipped. The workspace of the ferry company is invented.
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

const BRIGHTCART = Object.fromEntries(
  Object.entries(walk(LAYERED, LAYERED, {})).filter(([file]) => !file.startsWith('shared/'))
);
const PLATEAU = (id, rest) =>
  'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (rest || '');
const ELEMENT = (kind, plateau, body) =>
  'header:\n  kind: "archicode.morin.io/' +
  kind +
  '"\n  version: "1"\n' +
  (plateau ? '  plateau: ' + plateau + '\n' : '') +
  'content:\n' +
  body;
const STORY = (id, steps) =>
  'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  steps:\n' + steps;

// `pilot` stands between inhouse and marketplace: it declares a system with a container and an environment, sets the description of `carrier` and removes `tax`
const PILOT_FILES = {
  'pilot/plateau.yaml': PLATEAU(
    'pilot',
    '  name: "Loyalty pilot"\n  horizon: "2027-Q1"\n  override: "inhouse"\n  patches:\n    - operator: SET\n      target: "carrier"\n      field: description\n      value: "Books parcels; next-day delivery in the pilot."\n    - operator: REMOVE\n      target: "tax"\n'
  ),
  'pilot/application/loyalty.yaml': ELEMENT(
    'system',
    'pilot',
    '  id: "loyalty"\n  name: "Loyalty scheme"\n  elements:\n    - kind: "container"\n      id: "points"\n      name: "Points ledger"\n'
  ),
  'pilot/technology/lab.yaml': ELEMENT('environment', 'pilot', '  id: "lab"\n  name: "Pilot lab"\n')
};
const PILOT = Object.assign({}, BRIGHTCART, PILOT_FILES, {
  'marketplace/plateau.yaml': BRIGHTCART['marketplace/plateau.yaml'].replace('override: "inhouse"', 'override: "pilot"')
});
const PILOT_GOES = Object.keys(PILOT_FILES).sort();

async function open(files, options) {
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  assert.equal(state.layers.blocked, null, 'the plateaus can be drawn');
  if (options && options.drawn) sandbox.drawPlateau(options.drawn);
  if (options && options.compared) sandbox.compareWithPlateau(options.compared);
  return { sandbox, state, mem, original: Object.assign({}, files) };
}

/** Saves the folder: the files whose text changed, the files that are new, and the files removed. */
async function saved(opened) {
  await opened.sandbox.saveAllChanges();
  const changed = [];
  const added = [];
  for (const [p, f] of opened.mem.files) {
    if (!(p in opened.original)) added.push(p);
    else if (f.text !== opened.original[p]) changed.push(p);
  }
  return {
    changed: changed.sort(),
    added: added.sort(),
    removed: opened.mem.removals.slice().sort(),
    status: plain(run(opened.sandbox, 'saveStatus'))
  };
}

const reopen = (opened) => open(Object.fromEntries(Array.from(opened.mem.files).map(([p, f]) => [p, f.text])));
const drawing = (state) => ({
  plateau: state.layers.current,
  compare: state.layers.compare ? state.layers.compare.other : null
});
const text = (html) =>
  html
    .replace(/<\/?(code|strong|span)[^>]*>/g, '')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/\s+/g, ' ')
    .trim();
const parents = (state) =>
  Object.fromEntries(Array.from(state.plateauTree.nodes.values()).map((n) => [n.id, n.parent]));
/** Every element a plateau resolves to, by layer, as the page draws it (`layerModelOf`). */
const elementsOf = (sandbox, state, plateau) => {
  const model = sandbox.layerModelOf(plateau, state.workspace.settings);
  assert.equal(model.undrawable, false, plateau + ' can be drawn');
  return {
    application: Array.from(model.index.application.keys()).sort(),
    technology: Array.from(model.index.technology.keys()).sort()
  };
};
const minus = (a, b) => ({
  application: a.application.filter((r) => !b.application.includes(r)),
  technology: a.technology.filter((r) => !b.technology.includes(r))
});
/** What the page holds that a refused delete must leave as it was. */
const snapshot = (state) => ({
  files: state.manifestFiles.map((mf) => [mf.relPath, mf.rawText, mf.dirty]),
  removals: plain(state.pendingFileRemovals),
  parents: parents(state),
  topLevel: plain(state.workspace.topLevel),
  drawing: drawing(state)
});

// ---- a plateau in the middle is deleted ----

test('pilot, between inhouse and marketplace, is deleted from the dialog: marketplace goes under inhouse, the files of pilot go, and marketplace/plateau.yaml is the shipped file again', async () => {
  const opened = await open(PILOT, { drawn: 'marketplace' });
  const { sandbox, state } = opened;
  assert.deepEqual(parents(state).marketplace, 'pilot');
  const before = elementsOf(sandbox, state, 'marketplace');
  const plan = plain(sandbox.plateauDeletion('pilot'));
  assert.equal(plan.refusal, null);
  assert.deepEqual([plan.breaks, plan.blocking], [[], []]);
  assert.equal(plan.parent, 'inhouse');
  assert.deepEqual(plan.overriding, ['marketplace']);
  assert.deepEqual(plan.rewritten, [{ id: 'marketplace', relPath: 'marketplace/plateau.yaml' }]);
  assert.deepEqual(
    plan.files.map((f) => f.relPath),
    PILOT_GOES
  );
  assert.equal(plan.patches, 2);
  // what marketplace loses, gets back and reads differently, as the kernel resolves it without pilot
  assert.deepEqual(plan.above, [
    {
      id: 'marketplace',
      parent: 'pilot',
      newParent: 'inhouse',
      unknown: false,
      lost: { application: ['loyalty', 'loyalty.points'], technology: ['lab'] },
      back: { application: ['tax'], technology: [] },
      changed: {
        application: ['carrier', 'commerce.checkout'],
        technology: ['partners.tax-live', 'sandbox.tax-sandbox']
      } // the description pilot set; the link and the hosted application the REMOVE of tax took
    }
  ]);

  sandbox.openPlateauDeleteDialog('pilot');
  sandbox.submitAppDialog({ fields: {} });
  assert.equal(
    run(sandbox, 'appDialog'),
    null,
    'the dialog closed, and no second dialog asks about marketplace: the first one said what it loses'
  );
  assert.equal(run(sandbox, 'saveStatus.state'), 'idle');
  // the tree reads as the dialog said
  assert.deepEqual(plain(state.plateauTree.ids), ['baseline', 'inhouse', 'marketplace', 'saas']);
  assert.equal(parents(state).marketplace, 'inhouse');
  assert.deepEqual(plain(state.pendingFileRemovals).sort(), PILOT_GOES);
  assert.deepEqual(
    drawing(state),
    { plateau: 'marketplace', compare: null },
    'the plateau drawn stood on pilot: it stays drawn'
  );
  // the elements lost are exactly the ones listed, and so are the ones that came back
  const after = elementsOf(sandbox, state, 'marketplace');
  assert.deepEqual(minus(before, after), plan.above[0].lost);
  assert.deepEqual(minus(after, before), plan.above[0].back);
  assert.equal(
    state.index.application.get('carrier').description,
    'Books parcels and returns tracking numbers.',
    'the description of baseline, not the one pilot set'
  );

  const out = await saved(opened);
  assert.equal(out.status.state, 'success');
  assert.deepEqual(out.removed, PILOT_GOES);
  assert.deepEqual(out.changed, ['marketplace/plateau.yaml'], 'no other file is written');
  assert.deepEqual(out.added, []);
  assert.equal(
    opened.mem.files.get('marketplace/plateau.yaml').text,
    BRIGHTCART['marketplace/plateau.yaml'],
    'the line `override` says inhouse again, and nothing else of the file moved'
  );
  for (const [p, t] of Object.entries(PILOT))
    if (!PILOT_GOES.includes(p) && p !== 'marketplace/plateau.yaml')
      assert.equal(opened.mem.files.get(p).text, t, p + ' is untouched');
  // the folder opened again is the shipped Brightcart
  const again = await reopen(opened);
  assert.deepEqual(plain(again.state.plateauTree.ids), ['baseline', 'inhouse', 'marketplace', 'saas']);
  assert.deepEqual(Object.fromEntries(Array.from(again.mem.files).map(([p, f]) => [p, f.text])), BRIGHTCART);
});

test('the dialog says which files go, which file changes, and what each plateau above loses, as the plan does', async () => {
  const { sandbox } = await open(PILOT);
  sandbox.openPlateauDeleteDialog('pilot');
  const html = sandbox.renderAppDialogHtml();
  const said = text(html);
  assert.match(
    said,
    /These 3 files go: pilot\/application\/loyalty\.yaml pilot\/plateau\.yaml the manifest of the plateau pilot\/technology\/lab\.yaml /
  );
  assert.match(
    said,
    /This file changes, and nothing else: the plateau that overrides pilot goes under inhouse\. marketplace\/plateau\.yaml says override: inhouse instead of override: pilot /
  );
  assert.match(
    said,
    /Nothing that pilot declares, nor its 2 patches, reaches the plateaus that stand on it any more\. Each of them, resolved again without it: /
  );
  assert.match(
    said,
    /marketplace Marketplace and personalisation, over inhouse instead of pilot: loses 2 elements: loyalty, loyalty\.points gets back 1 element that pilot removed: tax reads 2 elements differently, without what the patches of pilot did to them: carrier, commerce\.checkout loses 1 element of the technology layer: lab reads 2 elements of the technology layer differently/
  );
  assert.match(
    html,
    /<button type="button" class="btn-danger-solid" data-action="dialog-submit">Delete plateau<\/button>/
  );
  // every element listed is one of the plan, and every one of the plan is listed
  const plan = plain(sandbox.plateauDeletion('pilot'));
  const listed = { lost: [], back: [], changed: [] };
  for (const m of html.matchAll(/<li data-what="(lost|back|changed)" data-layer="(\w+)">([\s\S]*?)<\/li>/g))
    for (const c of m[3].matchAll(/<code>([^<]+)<\/code>/g)) if (c[1] !== 'pilot') listed[m[1]].push(m[2] + ':' + c[1]);
  const planned = (what) =>
    ['application', 'technology'].flatMap((layer) => plan.above[0][what][layer].map((r) => layer + ':' + r));
  assert.deepEqual(listed, { lost: planned('lost'), back: planned('back'), changed: planned('changed') });
  // the button of the page says it too
  sandbox.closeAppDialog();
  assert.match(
    sandbox.plateauDeleteButtonHtml('pilot', 'Delete plateau', ''),
    /title="Delete Loyalty pilot and its files, after a list of what goes and of what marketplace, which overrides it, loses \(it goes under inhouse\)"/
  );
});

test('siblings and a chain: every plateau that overrides it goes under its parent, and every plateau that stands on it is told', async () => {
  const files = Object.assign({}, PILOT, {
    'beta/plateau.yaml': PLATEAU('beta', '  override: "pilot"\n'),
    'beta/application/survey.yaml': ELEMENT(
      'system',
      'beta',
      '  id: "survey"\n  name: "Survey"\n  relationships:\n    - destination: "carrier"\n'
    ),
    'gamma/plateau.yaml': PLATEAU(
      'gamma',
      '  override: "beta"\n  patches:\n    - operator: SET\n      target: "survey"\n      field: description\n      value: "Asks the customers."\n'
    )
  });
  const opened = await open(files, { drawn: 'gamma', compared: 'beta' });
  const { sandbox, state } = opened;
  const plan = plain(sandbox.plateauDeletion('pilot'));
  assert.deepEqual([plan.breaks, plan.blocking], [[], []]);
  assert.deepEqual(plan.overriding, ['marketplace', 'beta'], 'in the order of the band: a horizon first');
  assert.deepEqual(
    plan.rewritten.map((r) => r.relPath),
    ['marketplace/plateau.yaml', 'beta/plateau.yaml']
  );
  assert.deepEqual(
    plan.above.map((a) => [a.id, a.parent, a.newParent]),
    [
      ['beta', 'pilot', 'inhouse'],
      ['gamma', 'beta', 'beta'],
      ['marketplace', 'pilot', 'inhouse']
    ],
    'in the order of the tree; gamma keeps its parent'
  );
  for (const entry of plan.above)
    assert.deepEqual(entry.lost, { application: ['loyalty', 'loyalty.points'], technology: ['lab'] }, entry.id);
  sandbox.openPlateauDeleteDialog('pilot');
  const said = text(sandbox.renderAppDialogHtml());
  assert.match(said, /These 2 files change, and nothing else: the plateaus that override pilot go under inhouse\./);
  assert.match(said, /gamma, over beta: loses 2 elements/);
  const befores = Object.fromEntries(
    ['beta', 'gamma', 'marketplace'].map((id) => [id, elementsOf(sandbox, state, id)])
  );
  sandbox.submitAppDialog({ fields: {} });
  assert.equal(run(sandbox, 'appDialog'), null);
  assert.deepEqual(parents(state), {
    baseline: null,
    inhouse: 'baseline',
    beta: 'inhouse',
    gamma: 'beta',
    marketplace: 'inhouse',
    saas: 'baseline'
  });
  for (const entry of plan.above)
    assert.deepEqual(
      minus(befores[entry.id], elementsOf(sandbox, state, entry.id)),
      entry.lost,
      entry.id + ' lost exactly what was listed'
    );
  assert.deepEqual(drawing(state), { plateau: 'gamma', compare: 'beta' });
  assert.equal(state.index.application.get('survey').description, 'Asks the customers.');
  const out = await saved(opened);
  assert.deepEqual(out.changed, ['beta/plateau.yaml', 'marketplace/plateau.yaml']);
  assert.equal(opened.mem.files.get('beta/plateau.yaml').text, PLATEAU('beta', '  override: "inhouse"\n'));
  assert.deepEqual(out.removed, PILOT_GOES);
});

test('the past of a plateau that overrode it follows it to its new parent', async () => {
  const opened = await open(PILOT, { drawn: 'marketplace' });
  const { sandbox, state } = opened;
  sandbox.toggleCompareWithPast();
  assert.deepEqual(drawing(state), { plateau: 'marketplace', compare: 'pilot' });
  sandbox.commitPlateauDelete('pilot', { listed: true });
  assert.deepEqual(drawing(state), { plateau: 'marketplace', compare: 'inhouse' });
  assert.equal(state.layers.compare.mode, 'past');
  assert.equal(state.baseline.plateau.id, 'inhouse');
  // pilot drawn: the plateau it overrode is drawn, as for a leaf
  const other = await open(PILOT, { drawn: 'pilot' });
  assert.equal(other.sandbox.commitPlateauDelete('pilot', { listed: true }).drawn, 'inhouse');
  assert.deepEqual(drawing(other.state), { plateau: 'inhouse', compare: null });
});

test('the root as the new parent: the line `override` is taken out, and saas/plateau.yaml is the shipped file again', async () => {
  const files = Object.assign({}, BRIGHTCART, {
    'pilot/plateau.yaml': PLATEAU(
      'pilot',
      '  name: "Pilot"\n  patches:\n    - operator: SET\n      target: "carrier"\n      field: name\n      value: "Carrier (pilot)"\n'
    ),
    'saas/plateau.yaml': BRIGHTCART['saas/plateau.yaml'].replace(
      '  horizon: "2026-Q4"\n',
      '  horizon: "2026-Q4"\n  override: "pilot"\n'
    )
  });
  const opened = await open(files);
  const { sandbox, state } = opened;
  const plan = plain(sandbox.plateauDeletion('pilot'));
  assert.equal(plan.parent, 'baseline');
  assert.deepEqual(
    plan.above.map((a) => [a.id, a.lost, a.changed]),
    [['saas', { application: [], technology: [] }, { application: ['carrier'], technology: [] }]]
  );
  sandbox.openPlateauDeleteDialog('pilot');
  assert.match(
    text(sandbox.renderAppDialogHtml()),
    /saas\/plateau\.yaml loses the line override: pilot \(a plateau that says none overrides the root\)/
  );
  sandbox.submitAppDialog({ fields: {} });
  assert.equal(parents(state).saas, 'baseline');
  const out = await saved(opened);
  assert.deepEqual(out.changed, ['saas/plateau.yaml']);
  assert.deepEqual(out.removed, ['pilot/plateau.yaml']);
  assert.equal(opened.mem.files.get('saas/plateau.yaml').text, BRIGHTCART['saas/plateau.yaml']);
});

test('a plateau that only headers name is deleted from the middle too: the plateau over it overrides the root, and loses what the headers declared', async () => {
  const files = {
    '.archicode.yaml': 'settings:\n  current: later\n  manifests:\n    paths: ["./**"]\n',
    'app.ferry.yaml': ELEMENT('system', null, '  id: ferry\n'),
    'later/app.port.yaml': ELEMENT('system', 'later', '  id: port\n  relationships:\n    - destination: ferry\n'),
    'next/plateau.yaml': PLATEAU('next', '  name: "Next season"\n  override: "later"\n'),
    'next/app.dock.yaml': ELEMENT('system', 'next', '  id: dock\n  relationships:\n    - destination: ferry\n')
  };
  const opened = await open(files, { drawn: 'later' });
  const { sandbox, state } = opened;
  assert.equal(state.plateauTree.nodes.get('later').manifest, null, 'later has no manifest of kind plateau');
  const plan = plain(sandbox.plateauDeletion('later'));
  assert.deepEqual(
    plan.files.map((f) => f.relPath),
    ['later/app.port.yaml']
  );
  assert.deepEqual(plan.rewritten, [{ id: 'next', relPath: 'next/plateau.yaml' }]);
  assert.deepEqual(
    plan.above.map((a) => [a.id, a.newParent, a.lost.application]),
    [['next', 'baseline', ['port']]]
  );
  assert.equal(plan.current, 'later');
  sandbox.commitPlateauDelete('later', { listed: true });
  assert.deepEqual(parents(state), { baseline: null, next: 'baseline' });
  assert.deepEqual(drawing(state), { plateau: 'baseline', compare: null });
  const out = await saved(opened);
  assert.deepEqual(out.removed, ['later/app.port.yaml']);
  assert.deepEqual(out.changed, ['.archicode.yaml', 'next/plateau.yaml']);
  assert.equal(opened.mem.files.get('next/plateau.yaml').text, PLATEAU('next', '  name: "Next season"\n'));
  assert.equal(opened.mem.files.get('.archicode.yaml').text, 'settings:\n  manifests:\n    paths: ["./**"]\n');
  const again = await reopen(opened);
  assert.deepEqual(plain(again.state.plateauTree.ids), ['baseline', 'next']);
});

test('called with no dialog before it, the delete asks about the plateaus it changes first, as any write does', async () => {
  const { sandbox, state } = await open(PILOT);
  const result = plain(sandbox.commitPlateauDelete('pilot'));
  assert.deepEqual(result, { pending: true, changed: ['marketplace'] });
  assert.equal(state.plateauTree.nodes.has('pilot'), true);
  assert.deepEqual(plain(state.pendingFileRemovals), []);
  assert.equal(run(sandbox, 'appDialog.kind'), 'layer-confirm');
  sandbox.submitAppDialog({});
  assert.equal(state.plateauTree.nodes.has('pilot'), false, 'said yes: deleted');
  assert.equal(parents(state).marketplace, 'inhouse');
});

// ---- what refuses it, and changes nothing ----

test('inhouse, in the middle of the shipped Brightcart, cannot go: marketplace patches what it declares. The dialog says so and nothing changes', async () => {
  const opened = await open(BRIGHTCART, { drawn: 'marketplace' });
  const { sandbox, state } = opened;
  const before = snapshot(state);
  const plan = plain(sandbox.plateauDeletion('inhouse'));
  assert.equal(plan.refusal, null);
  assert.deepEqual(plan.overriding, ['marketplace']);
  assert.equal(
    plan.breaks[0],
    'the plateau `marketplace` could no longer be resolved (plateau marketplace: patch 3 (ADD target commerce.checkout): selects nothing, there is no element commerce.checkout in the application layer)'
  );
  assert.ok(
    plan.breaks.some((s) =>
      s.startsWith(
        'in the plateau `marketplace`, `prod.cloud.cdn` is declared under `prod.cloud`, which does not exist'
      )
    ),
    plan.breaks.join('\n')
  );
  assert.equal(plan.above[0].lost, null, 'marketplace would not resolve: nothing is said of what it loses');
  sandbox.openPlateauDeleteDialog('inhouse');
  const html = sandbox.renderAppDialogHtml();
  assert.match(
    text(html),
    /It cannot be deleted yet: once it is gone, these sentences would be mistakes of the plateaus that stand on it, which the command line refuses\./
  );
  assert.doesNotMatch(html, /Delete plateau<\/button>/);
  assert.throws(
    () => sandbox.commitPlateauDelete('inhouse', { listed: true }),
    (e) =>
      e.message ===
      'The plateau `inhouse` cannot be deleted: 2 mistakes would appear in the plateaus that stand on it (the plateau `marketplace` could no longer be resolved (plateau marketplace: patch 3 (ADD target commerce.checkout): selects nothing, there is no element commerce.checkout in the application layer)). Repair them first, or give the plateaus that override `inhouse` another parent with Edit.'
  );
  sandbox.closeAppDialog();
  assert.deepEqual(snapshot(state), before);
  const out = await saved(opened);
  assert.deepEqual([out.changed, out.added, out.removed], [[], [], []]);
});

test('a plateau above whose patch names an element of the deleted plateau refuses the delete with that patch', async () => {
  const files = Object.assign({}, PILOT, {
    'beta/plateau.yaml': PLATEAU(
      'beta',
      '  override: "pilot"\n  patches:\n    - operator: SET\n      target: "loyalty"\n      field: description\n      value: "Points for every order."\n'
    )
  });
  const opened = await open(files);
  const { sandbox, state } = opened;
  const before = snapshot(state);
  const plan = plain(sandbox.plateauDeletion('pilot'));
  assert.deepEqual(plan.breaks, [
    'the plateau `beta` could no longer be resolved (plateau beta: patch 1 (SET target loyalty): selects nothing, there is no element loyalty in the application layer)'
  ]);
  assert.throws(
    () => sandbox.commitPlateauDelete('pilot', { listed: true }),
    /^Error: The plateau `pilot` cannot be deleted: a plateau that stands on it would no longer be valid \(the plateau `beta` could no longer be resolved .*\)\. Repair it first, or give the plateaus that override `pilot` another parent with Edit\.$/
  );
  assert.deepEqual(snapshot(state), before);
  // a relationship towards an element of the deleted plateau is the layer check's sentence
  const linked = await open(
    Object.assign({}, PILOT, {
      'marketplace/application/review.yaml': ELEMENT(
        'system',
        'marketplace',
        '  id: "review"\n  relationships:\n    - destination: "loyalty.points"\n'
      )
    })
  );
  assert.deepEqual(plain(linked.sandbox.plateauDeletion('pilot').breaks), [
    'in the plateau `marketplace`, `review` has a relationship towards `loyalty.points`, which does not exist, in `marketplace/application/review.yaml` at `relationships[0].destination`'
  ]);
});

test('a step told at a plateau above that would lose what it draws refuses the delete; a step with no plateau, or a map that keeps one of its pins, does not', async () => {
  const files = Object.assign({}, PILOT, {
    // another plateau beside pilot declares a `loyalty` of its own: the name exists in a plateau, so only the step told at marketplace is wrong
    'twin/plateau.yaml': PLATEAU('twin', '  override: "inhouse"\n'),
    'twin/application/loyalty.yaml': ELEMENT('system', 'twin', '  id: "loyalty"\n'),
    'stories/story.tour.yaml': STORY(
      'tour',
      '    - viewpoint: overview\n      properties:\n        element: loyalty\n      at: marketplace\n' +
        '    - viewpoint: overview\n      properties:\n        element: loyalty\n' +
        '    - viewpoint: map\n      properties:\n        pinned: [loyalty, customer]\n      at: marketplace\n' +
        '    - viewpoint: map\n      layer: technology\n      properties:\n        pinned: [lab]\n      at: marketplace\n'
    )
  });
  const opened = await open(files);
  const { sandbox, state } = opened;
  const before = snapshot(state);
  const plan = plain(sandbox.plateauDeletion('pilot'));
  assert.deepEqual(plan.breaks, []);
  assert.deepEqual(plan.blocking, [
    'the story `tour` (`stories/story.tour.yaml`) names `lab`, which exists in no plateau',
    'the story `tour` (`stories/story.tour.yaml`) step 1 is told at `marketplace`, which would no longer have `loyalty`',
    'the story `tour` (`stories/story.tour.yaml`) step 4 is told at `marketplace`, which would no longer have `lab`'
  ]);
  sandbox.openPlateauDeleteDialog('pilot');
  assert.match(
    text(sandbox.renderAppDialogHtml()),
    /It cannot be deleted yet: once these files are gone, these sentences would be a mistake/
  );
  assert.throws(
    () => sandbox.commitPlateauDelete('pilot', { listed: true }),
    /cannot be deleted: 3 views or story steps would no longer be valid/
  );
  sandbox.closeAppDialog();
  assert.deepEqual(snapshot(state), before);
});

test('a step that names the deleted plateau refuses it, as for a leaf', async () => {
  const files = Object.assign({}, PILOT, {
    'stories/story.tour.yaml': STORY(
      'tour',
      '    - viewpoint: overview\n      properties:\n        element: customer\n      at: marketplace\n      against: pilot\n'
    )
  });
  const { sandbox } = await open(files);
  assert.deepEqual(plain(sandbox.plateauDeletion('pilot').blocking), [
    'the story `tour` (`stories/story.tour.yaml`) step 1 says `against: pilot`, which is not a plateau of this workspace (the plateaus are `baseline`, `inhouse`, `marketplace`, `saas`)'
  ]);
});

test('a write the checks refuse puts everything back, the `override` rewritten too', async () => {
  const opened = await open(PILOT, { drawn: 'pilot' });
  const { sandbox, state } = opened;
  const before = snapshot(state);
  run(
    sandbox,
    'judgeLayerWrite = () => ({ broken: "the plateau `marketplace` could no longer be resolved (forced by the test)", changed: [] });'
  );
  assert.throws(
    () => sandbox.commitPlateauDelete('pilot', { listed: true }),
    /^Error: Not written: the plateau `marketplace` could no longer be resolved \(forced by the test\)\. Nothing was changed\.$/
  );
  assert.deepEqual(snapshot(state), before);
  assert.equal(state.manifestFiles.find((mf) => mf.relPath === 'marketplace/plateau.yaml').content.override, 'pilot');
  const out = await saved(opened);
  assert.deepEqual([out.changed, out.added, out.removed], [[], [], []], 'nothing on disk');
});

test('a change of a plateau the dialog did not list is still asked', async () => {
  const { sandbox, state } = await open(PILOT);
  const real = run(sandbox, 'judgeLayerWrite');
  sandbox.__realJudge = real;
  run(
    sandbox,
    'judgeLayerWrite = (a, b, c) => { const v = globalThis.__realJudge(a, b, c); return Object.assign(v, { changed: v.changed.concat(["saas"]) }); };'
  );
  const result = plain(sandbox.commitPlateauDelete('pilot', { listed: true }));
  assert.deepEqual(result, { pending: true, changed: ['marketplace', 'saas'] });
  assert.equal(state.plateauTree.nodes.has('pilot'), true);
});

test('the root still cannot go, and the kernel not loaded refuses a plateau in the middle but not a leaf', async () => {
  const { sandbox } = await open(PILOT);
  assert.match(sandbox.plateauDeletion('baseline').refusal, /is the root of the plateaus/);
  run(sandbox, 'loadedKernel = null;');
  assert.match(
    sandbox.plateauDeletion('pilot').refusal,
    /^The viewpoint kernel is not loaded yet, so what the plateaus that override `pilot` would lose cannot be worked out/
  );
  assert.equal(sandbox.plateauDeletion('saas').refusal, null);
});
