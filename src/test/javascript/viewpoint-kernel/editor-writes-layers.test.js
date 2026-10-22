'use strict';
// The editor writes layers (wave 014, run 0082, W-8): what an edit of a plateau writes, in which file and on which lines, and what it refuses. The layered Brightcart
// (src/test/resources/brightcart/layered/) is copied into an in-memory folder, an edit is made the way the page makes it, "Save all changes" writes the folder, and the
// files are compared with the originals line by line: the files that changed are the intended ones and the lines that changed are the intended ones. A write is kept only if
// the resolution of the plateau gives back the value that was edited (`guardedLayerWrite`); the refusals are one sentence and leave every file as it was. Everything else
// is invented (a ferry company).
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

/** The layered Brightcart as a path -> text object. */
const LAYERED_FILES = walk(LAYERED, LAYERED, {});

/** What changed between two texts, line by line (a longest common subsequence): the lines that went and the lines that came, each in order. */
function lineDiff(before, after) {
  const a = before.split('\n');
  const b = after.split('\n');
  const table = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) table[i][j] = a[i] === b[j] ? table[i + 1][j + 1] + 1 : Math.max(table[i + 1][j], table[i][j + 1]);
  }
  const removed = [];
  const added = [];
  let i = 0;
  let j = 0;
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) { i++; j++; }
    else if (j < b.length && (i === a.length || table[i][j + 1] >= table[i + 1][j])) added.push(b[j++]);
    else removed.push(a[i++]);
  }
  return { removed, added };
}

async function openIn(files, settings) {
  const mem = memFolder(Object.assign({ '.archicode.yaml': settings || 'settings:\n  manifests:\n    paths: ["./**"]\n' }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem, original: Object.assign({ '.archicode.yaml': settings || 'settings:\n  manifests:\n    paths: ["./**"]\n' }, files) };
}

/**
 * The layered Brightcart without the views and the stories it ships in `shared/` (run 0110, #115). They name `commerce-saas`, `shop` and `marketplace`, so they refuse to
 * delete these (that they do is tested on the shipped files in brightcart-views-and-stories.test.js); the tests that delete an element start from the elements and the plateaus.
 */
const LAYERED_ELEMENTS = Object.fromEntries(Object.entries(LAYERED_FILES).filter(([file]) => !file.startsWith('shared/')));

/** A copy of the layered Brightcart in memory, with the plateau `draw` drawn; `files` are the files of the copy (the whole fixture by default). */
async function openLayeredCopy(draw, files) {
  const opened = await openIn(Object.assign({}, files || LAYERED_FILES));
  opened.original = Object.assign({}, files || LAYERED_FILES);
  if (draw) opened.sandbox.drawPlateau(draw);
  return opened;
}

/** Saves the folder and tells what changed on disk: path -> { before, after, diff } for a file that changed, `before` null for a new file; `removed` lists the files that went. */
async function saved(opened) {
  await opened.sandbox.saveAllChanges();
  const out = { files: {}, removed: opened.mem.removals.slice() };
  for (const [p, f] of opened.mem.files) {
    if (!(p in opened.original)) out.files[p] = { before: null, after: f.text, diff: lineDiff('', f.text) };
    else if (f.text !== opened.original[p]) out.files[p] = { before: opened.original[p], after: f.text, diff: lineDiff(opened.original[p], f.text) };
  }
  return out;
}

const edit = (sandbox, reference, fn, layer, options) => sandbox.commitElementEdit(reference, fn, layer || 'application', options);
const dirtyFiles = (state) => Array.from(state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath)).sort();
const patchesOf = (state, plateau) => plain(state.plateauTree.nodes.get(plateau).patches);
const dialog = (sandbox) => plain(run(sandbox, 'appDialog'));

// ---- an edit of an inherited field is a patch of the plateau drawn ----

test('the name of an element the plateau inherits is a new SET at the end of the patches of the plateau, and nothing else is written', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  assert.equal(state.index.application.get('shop.web').declaredIn, 'baseline');
  assert.equal(edit(sandbox, 'shop.web', (n) => { n.name = 'Shop front'; }), undefined);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/plateau.yaml'], 'the files changed are the plateau\'s own');
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, {
    removed: [],
    added: ['    - operator: SET', '      target: "shop.web"', '      field: name', '      value: "Shop front"']
  });
  assert.equal(out.files['saas/plateau.yaml'].after, out.files['saas/plateau.yaml'].before + '    - operator: SET\n      target: "shop.web"\n      field: name\n      value: "Shop front"\n', 'the four lines are the end of the file; every other byte is the author\'s');
  assert.deepEqual(out.removed, []);
  assert.equal(state.index.application.get('shop.web').name, 'Shop front');
  assert.deepEqual(plain([...state.index.application.get('shop.web').patched.get('name').operator]).join(''), 'SET');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(state.index.application.get('shop.web'), 'name')), 'set by patch ' + patchesOf(state, 'saas').length + ' of saas (SET target shop.web)');
});

test('a second edit of the same target and field changes that patch: it does not add another', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const before = patchesOf(state, 'saas').length;
  edit(sandbox, 'shop.web', (n) => { n.name = 'Shop front'; });
  edit(sandbox, 'shop.web', (n) => { n.name = 'Shop window'; });
  assert.equal(patchesOf(state, 'saas').length, before + 1, 'one patch for the two edits');
  const out = await saved(opened);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, {
    removed: [],
    added: ['    - operator: SET', '      target: "shop.web"', '      field: name', '      value: "Shop window"']
  });
  // and a third edit, in a page that has already saved, changes the line of the value only
  edit(sandbox, 'shop.web', (n) => { n.name = 'Shop door'; });
  assert.equal(patchesOf(state, 'saas').length, before + 1);
  const mf = state.manifestFiles.find((f) => f.relPath === 'saas/plateau.yaml');
  assert.deepEqual(lineDiff(opened.mem.files.get('saas/plateau.yaml').text, mf.rawText), { removed: ['      value: "Shop window"'], added: ['      value: "Shop door"'] });
});

test('a value a patch of the plateau set is edited in that patch: one line changes', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const record = state.index.application.get('shop.web');
  const before = patchesOf(state, 'saas').length;
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(record, 'description')), 'set by patch 12 of saas (SET target shop.web)');
  edit(sandbox, 'shop.web', (n) => { n.description = 'A storefront that talks to the platform.'; });
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/plateau.yaml']);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, {
    removed: ['      value: "Headless storefront on the commerce platform."'],
    added: ['      value: "A storefront that talks to the platform."']
  });
  assert.equal(patchesOf(state, 'saas').length, before, 'no patch was added');
});

test('an edit that puts a field back to what the plateau inherits takes the patch out', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const before = patchesOf(state, 'saas').length;
  edit(sandbox, 'shop.web', (n) => { n.name = 'Shop front'; });
  assert.equal(patchesOf(state, 'saas').length, before + 1);
  edit(sandbox, 'shop.web', (n) => { n.name = 'Web storefront'; }); // the name baseline gives it
  assert.equal(patchesOf(state, 'saas').length, before);
  const out = await saved(opened);
  assert.deepEqual(out.files, {}, 'the file is as the author left it');
});

test('tags that only gain a key are a MERGE; a tag taken out sets the whole object', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const tags = state.index.application.get('shop.web').tags;
  edit(sandbox, 'shop.web', (n) => { n.tags = Object.assign({}, n.tags, { owner: 'web team' }); });
  let out = await saved(opened);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff.added, ['    - operator: MERGE', '      target: "shop.web"', '      field: tags', '      value:', '        owner: web team']);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff.removed, []);
  opened.original = Object.assign({}, opened.original, { 'saas/plateau.yaml': out.files['saas/plateau.yaml'].after });
  const key = Object.keys(plain(tags))[0];
  if (key !== undefined) {
    edit(sandbox, 'shop.web', (n) => { const next = Object.assign({}, n.tags); delete next[key]; n.tags = next; });
    out = await saved(opened);
    assert.match(out.files['saas/plateau.yaml'].after, /operator: SET\n\s+target: "shop.web"\n\s+field: tags/);
  }
});

test('a list the plateau sets whole stays a SET with the new list; a list it only adds to gains the item in the ADD it has', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const count = patchesOf(state, 'saas').length;
  edit(sandbox, 'shop.web', (n) => { n.qualifiers = n.qualifiers.concat(['PWA']); }); // saas SETs ["React", "Next.js"]
  edit(sandbox, 'backoffice.console', (n) => { n.relationships = n.relationships.concat([{ destination: 'psp', label: 'refunds through' }]); }); // saas ADDs one
  assert.equal(patchesOf(state, 'saas').length, count, 'no patch was added: the two that were there say the new lists');
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/plateau.yaml']);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, {
    removed: [
      '      value: ["React", "Next.js"]',
      '      value: {destination: "commerce-saas", label: "maintains products in", qualifiers: ["HTTPS"]}'
    ],
    added: [
      '      value:', '        - "React"', '        - "Next.js"', '        - "PWA"',
      '      value:', '        - destination: commerce-saas', '          label: maintains products in', '          qualifiers:', '            - "HTTPS"', '        - destination: psp', '          label: refunds through'
    ]
  }, 'a flow list that an edit changes becomes a block, and nothing else of the file moves');
  assert.deepEqual(patchesOf(state, 'saas').find((p) => p.target === 'shop.web' && p.field === 'qualifiers').value, ['React', 'Next.js', 'PWA']);
  const adds = patchesOf(state, 'saas').find((p) => p.target === 'backoffice.console' && p.field === 'relationships');
  assert.equal(adds.operator, 'ADD');
  assert.equal(adds.value.length, 2);
  assert.equal(state.index.application.get('backoffice.console').relationships.length, 4);
});

test('an item added to a list the plateau has no patch on is an ADD; one taken out of the front sets the whole list', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const before = plain(state.index.application.get('shop.app').qualifiers);
  assert.deepEqual(before, ['Java', 'Spring Boot']);
  const patches = () => patchesOf(state, 'saas').filter((p) => p.target === 'shop.app' && p.field === 'qualifiers');
  edit(sandbox, 'shop.app', (n) => { n.qualifiers = n.qualifiers.concat(['JDK 25']); });
  assert.deepEqual(patches(), [{ operator: 'ADD', target: 'shop.app', field: 'qualifiers', value: 'JDK 25' }]);
  // the item that was added is taken out again: the patch goes
  edit(sandbox, 'shop.app', (n) => { n.qualifiers = before; });
  assert.deepEqual(patches(), []);
  // an item of baseline goes: baseline's list cannot be shortened by adding to it, so the plateau sets the list
  edit(sandbox, 'shop.app', (n) => { n.qualifiers = before.slice(1); });
  assert.deepEqual(patches(), [{ operator: 'SET', target: 'shop.app', field: 'qualifiers', value: ['Spring Boot'] }]);
  const out = await saved(opened);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff.removed, []);
  assert.ok(out.files['saas/plateau.yaml'].after.endsWith('    - operator: SET\n      target: "shop.app"\n      field: qualifiers\n      value:\n        - Spring Boot\n'));
});

test('a relationship changed in place is a SET with where, found by its destination and its label', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const count = patchesOf(state, 'saas').length;
  const relabel = (label) => edit(sandbox, 'backoffice.console', (n) => { n.relationships = n.relationships.map((r, i) => (i === 0 ? Object.assign({}, r, { label }) : r)); });
  relabel('works on orders in');
  const out = await saved(opened);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff.removed, []);
  const block = '    - operator: SET\n      target: "backoffice.console"\n      field: relationships\n      where:\n        destination: shop.app.orders\n        label: handles orders in\n      value:\n        label: works on orders in\n';
  assert.equal(out.files['saas/plateau.yaml'].after, out.files['saas/plateau.yaml'].before + block, 'the patch is written at the end, never between a patch of the author\'s and the comment above the next one; the file is the author\'s everywhere else');
  assert.deepEqual(patchesOf(state, 'saas').filter((p) => p.target === 'backoffice.console' && p.field === 'relationships').pop(),
    { operator: 'SET', target: 'backoffice.console', field: 'relationships', where: { destination: 'shop.app.orders', label: 'handles orders in' }, value: { label: 'works on orders in' } });
  // the same relationship again, and again: the patch that finds it is the one that changes, and the ADD the plateau has is left as it was written
  relabel('follows orders in');
  relabel('watches orders in');
  assert.equal(patchesOf(state, 'saas').length, count + 1);
  assert.equal(patchesOf(state, 'saas').filter((p) => p.target === 'backoffice.console' && p.field === 'relationships').pop().value.label, 'watches orders in');
  assert.equal(state.index.application.get('backoffice.console').relationships[0].label, 'watches orders in');
});

test('a field of an element the plateau declares is edited in the manifest that declares it, as before', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const count = patchesOf(state, 'saas').length;
  assert.equal(state.index.application.get('commerce-saas').declaredIn, 'saas');
  edit(sandbox, 'commerce-saas', (n) => { n.description = 'The hosted platform.'; });
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/application/commerce-saas.yaml']);
  assert.deepEqual(out.files['saas/application/commerce-saas.yaml'].diff, { removed: ['  description: "Hosted catalog, cart, checkout and promotions."'], added: ['  description: "The hosted platform."'] });
  assert.equal(patchesOf(state, 'saas').length, count, 'no patch was added');
});

test('one edit that changes two fields of an inherited element writes each where it belongs: a patch that exists is changed, a missing one is added', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox } = opened;
  // `shop.app` is baseline's and saas has a SET patch on its name: the name is that patch, the qualifiers are a new one
  edit(sandbox, 'shop.app', (n) => { n.name = 'Accounts'; n.qualifiers = ['Kotlin']; });
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/plateau.yaml']);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, {
    removed: ['      value: "Account and order history"'],
    added: ['      value: "Accounts"', '    - operator: SET', '      target: "shop.app"', '      field: qualifiers', '      value:', '        - Kotlin']
  }, 'the name is the patch that sets it, changed in place; the qualifiers are a new patch');
});

// ---- removing an element ----

test('an inherited element is removed by a REMOVE at the end of the patches; the kernel takes what points at it', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const before = plain([...state.index.application.get('shop.web').relationships.map((r) => r.destination)]);
  assert.ok(before.length > 0);
  const toward = [...state.index.application.values()].filter((r) => r.relationships.some((x) => x.destination === 'psp')).map((r) => r.reference);
  assert.ok(toward.length > 0, 'something points at psp');
  sandbox.commitDeleteElement('psp', 'application', []);
  assert.equal(state.index.application.has('psp'), false);
  for (const reference of toward) assert.ok(!state.index.application.has(reference) || state.index.application.get(reference).relationships.every((r) => r.destination !== 'psp'), reference);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/plateau.yaml']);
  assert.equal(out.files['saas/plateau.yaml'].after, out.files['saas/plateau.yaml'].before + '    - operator: REMOVE\n      target: "psp"\n');
  assert.deepEqual(out.removed, [], 'no file goes: the element is still declared in baseline');
});

test('a technology element is removed with its layer in the patch', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  assert.ok(state.index.technology.has('staging.vm'));
  sandbox.commitDeleteElement('staging.vm', 'technology', []);
  const out = await saved(opened);
  assert.equal(out.files['saas/plateau.yaml'].after, out.files['saas/plateau.yaml'].before + '    - operator: REMOVE\n      target: "staging.vm"\n      layer: technology\n');
  assert.equal(state.index.technology.has('staging.vm'), false);
});

test('an element the plateau declares is deleted from its manifests, and the patches of the plateau that name it go with it', async () => {
  const opened = await openLayeredCopy('saas', LAYERED_ELEMENTS);
  const { sandbox, state } = opened;
  assert.equal(state.index.application.get('commerce-saas').declaredIn, 'saas');
  const impact = sandbox.computeDeleteImpact('commerce-saas', 'application');
  sandbox.commitDeleteElement('commerce-saas', 'application', impact.affected);
  assert.equal(state.index.application.has('commerce-saas'), false);
  assert.equal(state.layerProblems, null, 'saas still resolves, with no link to nothing');
  const out = await saved(opened);
  assert.deepEqual(out.removed, ['saas/application/commerce-saas.yaml']);
  assert.deepEqual(Object.keys(out.files).sort(), ['saas/plateau.yaml', 'saas/technology/partners.commerce-live.yaml', 'saas/technology/sandbox.commerce-sandbox.yaml']);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff.added, [], 'the patches that added a link to it are taken out; nothing is added');
  assert.equal(out.files['saas/plateau.yaml'].diff.removed.filter((l) => /destination: "commerce-saas"/.test(l)).length, 3);
  assert.deepEqual(out.files['saas/technology/partners.commerce-live.yaml'].diff, { removed: ['  applications:', '    - "commerce-saas"'], added: ['  applications: []'] }, 'and the node that deployed it does not');
});

// ---- adding ----

test('a new element is a manifest of the plateau, with `plateau:` in its header, in the folder of the plateau\'s own manifests', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const result = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'loyalty', name: 'Loyalty', description: 'Points.' });
  assert.equal(result.createdReference, 'loyalty');
  assert.equal(result.relPath, 'saas/application/app.loyalty.yaml');
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/application/app.loyalty.yaml']);
  assert.equal(out.files['saas/application/app.loyalty.yaml'].after, 'header:\n  kind: archicode.morin.io/system\n  version: "1"\n  plateau: saas\ncontent:\n  id: loyalty\n  name: Loyalty\n  description: Points.');
  assert.equal(state.index.application.get('loyalty').declaredIn, 'saas');
  sandbox.drawPlateau('baseline');
  assert.equal(state.index.application.has('loyalty'), false, 'baseline does not have it');
});

test('a new element of baseline has no `plateau:` and every plateau that stands on baseline has it (after the author said yes)', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  const pending = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'loyalty', name: 'Loyalty', description: '' });
  assert.equal(pending.pending, true);
  assert.deepEqual(Array.from(pending.changed), ['inhouse', 'marketplace', 'saas']);
  assert.deepEqual(dirtyFiles(state), [], 'nothing is written before the answer');
  sandbox.submitAppDialog({});
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['baseline/application/app.loyalty.yaml']);
  assert.equal(out.files['baseline/application/app.loyalty.yaml'].after, 'header:\n  kind: archicode.morin.io/system\n  version: "1"\ncontent:\n  id: loyalty\n  name: Loyalty');
  sandbox.drawPlateau('saas');
  assert.ok(state.index.application.has('loyalty'));
});

test('a group is no kind any more (#114): the creation form offers none, under a parent the plateau declares or one it inherits', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox } = opened;
  for (const level of ['solution', 'system', 'container', 'environment', 'node']) {
    assert.ok(!sandbox.childKindOptionsForLevel(level).includes('group'), level);
  }
  assert.deepEqual(plain(sandbox.childKindOptionsForLevel('container')), ['component']);
  assert.deepEqual(plain(sandbox.childKindOptionsForLevel('solution')), ['system']);
});

test('a child of an element the plateau inherits is a manifest of the plateau with `header.parent`; a child of an element it declares is written in the file of its parent', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const inherited = sandbox.commitCreateChildElement({ parentReference: 'shop', layer: 'application', kind: 'container', id: 'wishlist', name: 'Wishlist', description: '' });
  assert.deepEqual(plain(inherited), { ok: true, createdReference: 'shop.wishlist', layer: 'application' });
  const declared = sandbox.commitCreateChildElement({ parentReference: 'commerce-saas', layer: 'application', kind: 'container', id: 'coupons', name: 'Coupons', description: '' });
  assert.equal(declared.ok, true, declared.error);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files).sort(), ['saas/application/app.shop.wishlist.yaml', 'saas/application/commerce-saas.yaml']);
  assert.equal(out.files['saas/application/app.shop.wishlist.yaml'].after, 'header:\n  kind: archicode.morin.io/container\n  version: "1"\n  plateau: saas\n  parent: shop\ncontent:\n  id: wishlist\n  name: Wishlist');
  assert.deepEqual(out.files['saas/application/commerce-saas.yaml'].diff.removed, []);
  assert.match(out.files['saas/application/commerce-saas.yaml'].after, /elements:\n\s+- kind: "?container"?\n\s+id: "?coupons"?/);
  assert.equal(state.index.application.get('shop.wishlist').declaredIn, 'saas');
});

test('a new story and a new view belong to no plateau: no `plateau:` in their header, and they are not written in the folder of the plateau drawn', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [] });
  sandbox.createManifestEntry('view', { id: 'web_view', name: 'Web', viewpoint: 'overview', layer: 'application', properties: { element: 'shop.web' } });
  const out = await saved(opened);
  const files = Object.keys(out.files).sort();
  assert.deepEqual(files, ['story.tour.yaml', 'view.web_view.yaml'], 'the first folder of the manifests, not saas/');
  for (const file of files) assert.match(out.files[file].after, /^header:\n  kind: archicode\.morin\.io\/(story|view)\n  version: "1"\ncontent:\n/);
  // drawn in baseline, they are there too
  sandbox.drawPlateau('baseline');
  assert.notEqual(sandbox.findStory('tour'), null);
  assert.notEqual(sandbox.findSavedView('web_view'), null);
  // and one created in baseline is the same
  sandbox.createManifestEntry('story', { id: 'base_tour', name: 'Base tour', steps: [] });
  const file = state.manifestFiles.find((f) => f.header && f.content && f.content.id === 'base_tour');
  assert.equal('plateau' in file.header, false);
  assert.equal(file.relPath, 'story.base_tour.yaml');
});

// ---- asking first ----

test('editing baseline asks first and lists the plateaus it changes; yes writes the edit, no writes nothing', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  const result = edit(sandbox, 'shop.web', (n) => { n.qualifiers = ['React', 'Vite']; });
  assert.deepEqual(plain(result), { pending: true, changed: ['inhouse', 'marketplace', 'saas'].filter((id) => result.changed.includes(id)) });
  assert.ok(result.changed.length >= 1);
  assert.equal(dialog(sandbox).kind, 'layer-confirm');
  assert.deepEqual(dialog(sandbox).changed, plain(result.changed));
  assert.match(sandbox.renderAppDialogHtml(), new RegExp('<code>' + result.changed[0] + '</code>'));
  assert.deepEqual(dirtyFiles(state), [], 'nothing is written, and the page shows what it showed');
  assert.deepEqual(plain(state.index.application.get('shop.web').qualifiers), ['React']);
  // no
  sandbox.closeAppDialog();
  assert.deepEqual(dirtyFiles(state), []);
  // yes
  edit(sandbox, 'shop.web', (n) => { n.qualifiers = ['React', 'Vite']; });
  sandbox.submitAppDialog({});
  assert.equal(run(sandbox, 'appDialog'), null);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['baseline/application/shop.yaml']);
  assert.deepEqual(out.files['baseline/application/shop.yaml'].diff.removed.length > 0, true);
  assert.deepEqual(plain(state.index.application.get('shop.web').qualifiers), ['React', 'Vite']);
});

test('the plateaus listed are those whose resolution changes: one that sets the field itself is not', async () => {
  const opened = await openLayeredCopy();
  const { sandbox } = opened;
  // saas sets the qualifiers of shop.web with a patch and inhouse does not, so a new list in baseline reaches inhouse and not saas
  const result = edit(sandbox, 'shop.web', (n) => { n.qualifiers = ['React', 'Vite']; });
  assert.equal(result.pending, true);
  assert.ok(result.changed.includes('inhouse'), result.changed.join());
  assert.ok(!result.changed.includes('saas'), result.changed.join());
  // and one that every plateau sets itself is not asked about at all
  sandbox.closeAppDialog();
  const sets = edit(sandbox, 'shop.web', (n) => { n.description = 'The shop in the browser.'; });
  assert.equal(sets, undefined, 'inhouse and saas both set the description of shop.web: nothing else is changed');
  assert.equal(run(sandbox, 'appDialog'), null);
});

test('a plateau with plateaus on top of it asks, a plateau at the end of the chain does not', async () => {
  const opened = await openLayeredCopy('inhouse');
  const { sandbox, state } = opened;
  const asks = edit(sandbox, 'commerce.cart', (n) => { n.description = 'The basket service.'; });
  assert.equal(asks.pending, true);
  assert.deepEqual(plain(asks.changed), ['marketplace']);
  sandbox.closeAppDialog();
  sandbox.drawPlateau('marketplace');
  assert.equal(edit(sandbox, 'commerce.cart', (n) => { n.description = 'The basket service.'; }), undefined);
  assert.equal(run(sandbox, 'appDialog'), null);
  assert.deepEqual(dirtyFiles(state).length, 1);
});

// ---- what is refused ----

test('a value set by a patch written by hand with a free json-path is shown and not edited field by field: one sentence, nothing written', async () => {
  const opened = await openLayeredCopy('marketplace');
  const { sandbox, state } = opened;
  const reference = 'commerce.cart';
  const record = state.index.application.get(reference);
  assert.match(sandbox.originText(sandbox.fieldOriginOf(record, 'tags')), /^set by patch \d+ of marketplace \(MERGE json-path /);
  assert.throws(() => edit(sandbox, reference, (n) => { n.tags = Object.assign({}, n.tags, { owner: 'x' }); }), (e) => {
    assert.match(e.message, /^Not written: `tags` of `commerce\.cart` is set by patch \d+ of the plateau `marketplace` \(MERGE json-path .*\), which was written by hand with a free `json-path`: the editor shows it and does not edit it field by field\. Edit the patch in Files\. Nothing was changed\.$/);
    assert.ok(!e.message.includes('\n'));
    return true;
  });
  assert.deepEqual(dirtyFiles(state), []);
  // another field of the same element is fine
  edit(sandbox, reference, (n) => { n.name = 'Cart'; });
  assert.deepEqual(dirtyFiles(state), ['marketplace/plateau.yaml']);
});

test('Move is refused for an inherited element with one sentence, at the click and at the dialog', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const sentence = '“shop.web” is declared in the plateau `baseline`, and a patch never changes a parent: it is moved where it is declared. Draw `baseline` to move it.';
  const check = sandbox.validateMove('shop.web', 'application', 'shop');
  assert.equal(check.valid, false);
  assert.equal(check.error, sentence + ' Nothing was changed.');
  state.selection = { kind: 'element', key: 'shop.web', layer: 'application', mode: 'edit' };
  sandbox.openMoveDialog();
  assert.equal(run(sandbox, 'appDialog'), null, 'the dialog does not open');
  assert.equal(run(sandbox, 'saveStatus.message'), sentence);
  assert.deepEqual(dirtyFiles(state), []);
  const moved = sandbox.commitMoveElement('shop.web', 'application', 'shop', {});
  assert.equal(moved.ok, false);
});

test('an element the plateau declares moves as before (its header.parent changes in its own manifest, and what points at it follows in the plateaus that stand on it)', async () => {
  const opened = await openLayeredCopy('inhouse');
  const { sandbox, state } = opened;
  assert.equal(state.index.application.get('commerce.cart').declaredIn, 'inhouse');
  const asked = sandbox.commitMoveElement('commerce.cart', 'application', 'payments', {});
  assert.deepEqual(plain(asked), { ok: true, pending: true, reference: 'commerce.cart' }, 'marketplace stands on inhouse: the author is asked first');
  assert.deepEqual(dirtyFiles(state), []);
  sandbox.submitAppDialog({});
  assert.equal(state.index.application.has('payments.cart'), true);
  assert.equal(state.index.application.has('commerce.cart'), false);
  const out = await saved(opened);
  assert.ok(out.files['inhouse/application/commerce.cart.yaml'].diff.removed.includes('  parent: "commerce"'));
  assert.ok(out.files['inhouse/application/commerce.cart.yaml'].diff.added.includes('  parent: "payments"'));
  for (const id of ['inhouse', 'marketplace']) {
    sandbox.drawPlateau(id);
    assert.equal(state.layerProblems, null, id + ' still resolves');
    assert.equal(state.index.application.has('payments.cart'), true, id);
  }
  for (const file of Object.keys(out.files)) assert.ok(/^(inhouse|marketplace)\//.test(file), 'only the plateaus that stand on inhouse are written: ' + file);
});

test('a rename or a delete reaches the plateaus that stand on the one written, and not a plateau beside it that declares the same reference', async () => {
  const system = (id, plateau, extra) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n' + (plateau ? '  plateau: "' + plateau + '"\n' : '') + 'content:\n  id: "' + id + '"\n  name: "' + id + '"\n' + (extra || '');
  const container = (id, parent, plateau) => 'header:\n  kind: "archicode.morin.io/container"\n  version: "1"\n  plateau: "' + plateau + '"\n  parent: "' + parent + '"\ncontent:\n  id: "' + id + '"\n  name: "' + id + '"\n';
  const plateau = (id) => 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "' + id + '"\n';
  const files = {
    'app.base.yaml': system('base', null),
    'p1/plateau.yaml': plateau('p1'), 'p2/plateau.yaml': plateau('p2'),
    'p1/app.foo.yaml': system('foo', 'p1'), 'p1/app.foo.kid.yaml': container('kid', 'foo', 'p1'),
    'p2/app.foo.yaml': system('foo', 'p2'), 'p2/app.foo.kid.yaml': container('kid', 'foo', 'p2'),
    'p2/app.bar.yaml': system('bar', 'p2', '  relationships:\n    - destination: "foo"\n      label: "uses"\n')
  };
  const deleting = await openIn(files);
  deleting.sandbox.drawPlateau('p1');
  deleting.sandbox.commitDeleteElement('foo', 'application', []);
  const out = await saved(deleting);
  assert.deepEqual(out.removed.sort(), ['p1/app.foo.kid.yaml', 'p1/app.foo.yaml'], 'the files of p1 go, those of p2 stay');
  assert.deepEqual(Object.keys(out.files), []);
  const renaming = await openIn(files);
  renaming.sandbox.drawPlateau('p1');
  renaming.sandbox.commitElementEdit('foo', (n) => { n.id = 'foo2'; return { renamedTo: { from: 'foo', to: 'foo2' } }; }, 'application');
  const renamed = await saved(renaming);
  assert.deepEqual(Object.keys(renamed.files).sort(), ['p1/app.foo.kid.yaml', 'p1/app.foo.yaml'], 'p2 keeps its own foo, its kid and its link');
});

test('an inherited element is not renamed: a patch never changes an id', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  assert.throws(() => edit(sandbox, 'shop.web', (n) => { n.id = 'front'; return { renamedTo: { from: 'shop.web', to: 'shop.front' } }; }),
    (e) => e.message === 'Not written: `shop.web` is declared in the plateau `baseline`, and a patch never changes an id: it is renamed where it is declared. Draw `baseline` to rename it. Nothing was changed.');
  assert.deepEqual(dirtyFiles(state), []);
});

test('a text an inherited element has is taken out by a REMOVE patch of the plateau, one patch for the field (wave 017, run 0126, #94)', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  assert.throws(() => edit(sandbox, 'tax', (n) => { delete n.description; }) , () => true); // tax is removed in saas, so it is not there
  const reference = 'psp';
  assert.ok(state.index.application.get(reference).description);
  const before = patchesOf(state, 'saas').length;
  assert.equal(edit(sandbox, reference, (n) => { delete n.description; }), undefined);
  assert.equal(state.index.application.get(reference).description, null, 'the plateau resolves without the description');
  assert.equal(sandbox.originText(sandbox.fieldOriginOf(state.index.application.get(reference), 'description')), 'taken out by patch ' + (before + 1) + ' of saas (REMOVE target psp)');
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['saas/plateau.yaml'], 'the plateau written is the one drawn');
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, { removed: [], added: ['    - operator: REMOVE', '      target: "psp"', '      field: description'] });
  assert.equal(out.files['saas/plateau.yaml'].after, out.files['saas/plateau.yaml'].before + '    - operator: REMOVE\n      target: "psp"\n      field: description\n', 'the three lines are the end of the file; every other byte is the author\'s');
});

test('two patches on the same field of an element: none is rewritten, the last one takes an edit of its kind', async () => {
  const files = {
    'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n  qualifiers: ["Java"]\n',
    'later/plateau.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "later"\n  patches:\n    - operator: ADD\n      target: ferry\n      field: qualifiers\n      value: "Quarkus"\n    - operator: ADD\n      target: ferry\n      field: qualifiers\n      value: "Kotlin"\n'
  };
  const opened = await openIn(files);
  opened.sandbox.drawPlateau('later');
  edit(opened.sandbox, 'ferry', (n) => { n.qualifiers = n.qualifiers.concat(['Rust']); });
  assert.deepEqual(patchesOf(opened.state, 'later').map((p) => p.value), ['Quarkus', ['Kotlin', 'Rust']]);
  // an edit the last patch cannot say is a patch after it: the name is not a qualifier
  edit(opened.sandbox, 'ferry', (n) => { n.qualifiers = ['Rust']; });
  assert.deepEqual(patchesOf(opened.state, 'later').map((p) => [p.operator, p.field, JSON.stringify(p.value)]), [['ADD', 'qualifiers', '"Quarkus"'], ['ADD', 'qualifiers', '["Kotlin","Rust"]'], ['SET', 'qualifiers', '["Rust"]']]);
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['later/plateau.yaml']);
  assert.ok(out.files['later/plateau.yaml'].diff.removed.length <= 1, 'the author\'s lines stay: ' + out.files['later/plateau.yaml'].diff.removed.join('|'));
});

test('an edit that breaks a plateau that resolved is refused, and nothing is written: baseline deletes an element that the patches of another plateau name', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  const texts = () => plain(state.manifestFiles.map((f) => [f.relPath, f.rawText, f.dirty]));
  const before = texts();
  assert.throws(() => sandbox.commitDeleteElement('shop.web', 'application', [], { confirmed: true }), (e) => {
    assert.match(e.message, /^Not written: the plateau `inhouse` could no longer be resolved \(plateau inhouse: patch \d+ \(SET target shop\.web\): selects nothing, there is no element shop\.web in the application layer\)\. Nothing was changed\.$/);
    assert.ok(!e.message.includes('\n'));
    return true;
  });
  assert.deepEqual(texts(), before, 'every file, and its mark, is as it was');
  assert.ok(state.index.application.has('shop.web'), 'the page still has the element');
  assert.equal(state.plateauTree.nodes.size, 4);
  assert.equal(state.pendingFileRemovals.length, 0);
});

test('a rename in baseline reaches what names the element in the plateaus above it: relationships, lists, the patches and replaces', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  const result = edit(sandbox, 'shop.web', (n) => { n.id = 'front'; return { renamedTo: { from: 'shop.web', to: 'shop.front' } }; }, 'application');
  assert.equal(result.pending, true, 'the plateaus that stand on baseline are asked about first');
  assert.deepEqual(Array.from(result.changed).sort(), ['inhouse', 'marketplace', 'saas']);
  sandbox.submitAppDialog({});
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files).sort(), [
    'baseline/application/customer.yaml', 'baseline/application/shop.yaml', 'baseline/technology/prod.yaml', 'baseline/technology/staging.yaml',
    'inhouse/plateau.yaml', 'marketplace/application/storefront.yaml', 'saas/plateau.yaml']);
  assert.deepEqual(out.files['baseline/application/shop.yaml'].diff, { removed: ['      id: "web"'], added: ['      id: "front"'] });
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, { removed: Array(3).fill('      target: "shop.web"'), added: Array(3).fill('      target: "shop.front"') });
  assert.deepEqual(out.files['marketplace/application/storefront.yaml'].diff, { removed: ['        - "shop.web"'], added: ['        - "shop.front"'] });
  for (const id of ['baseline', 'inhouse', 'marketplace', 'saas']) {
    sandbox.drawPlateau(id);
    assert.equal(state.layerProblems, null, id + ' still resolves');
  }
  sandbox.drawPlateau('saas');
  assert.equal(state.index.application.get('shop.front').description, 'Headless storefront on the commerce platform.', 'and the patch of saas still sets what it set');
});

test('a rename in baseline reaches the replaces of an element of a plateau above it that sits under the renamed one (only the element renamed or moved in the plateau written keeps its own old reference: move-editor.test.js)', async () => {
  const el = (kind, parent, id, name, extra, plateau) => 'header:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + (plateau ? '  plateau: ' + plateau + '\n' : '') + '  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '');
  const mem = memFolder({
    '.archicode.yaml': 'settings:\n  manifests:\n    paths:\n      - m\n',
    'm/app.shop.yaml': el('system', null, 'shop', 'Shop'),
    'm/app.shop.till.yaml': el('container', 'shop', 'till', 'Till'),
    'm/app.shop.till.display.yaml': el('component', 'shop.till', 'display', 'Display'),
    'm/plateau.p1.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "p1"\n  name: "P1"\n',
    'm/app.shop.till.panel.yaml': el('component', 'shop.till', 'panel', 'Panel', '  replaces:\n    - shop.till.display\n', 'p1')
  });
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  // baseline is drawn: the plateau p1 stands on it and is asked about
  const result = edit(sandbox, 'shop.till', (n) => { n.id = 'till2'; return { renamedTo: { from: 'shop.till', to: 'shop.till2' } }; }, 'application');
  assert.equal(result.pending, true);
  sandbox.submitAppDialog({});
  const panel = state.manifestFiles.find((f) => f.relPath === 'm/app.shop.till.panel.yaml');
  assert.match(panel.rawText, /replaces:\n {4}- shop\.till2\.display\n/, 'the element of p1 that sits under the renamed one still replaces the display of the plateau below');
});

test('an edit is kept only if the resolution gives back the value that was edited', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const count = patchesOf(state, 'saas').length;
  // a patch writer that writes the wrong value: the resolution does not read back the edit
  const patchFor = sandbox.patchFor;
  sandbox.patchFor = () => ({ operator: 'SET', value: 'not what was typed' });
  assert.throws(() => edit(sandbox, 'shop.web', (n) => { n.name = 'Shop front'; }),
    (e) => e.message === 'Not written: the resolution of the plateau `saas` does not give back the new `name` of `shop.web` (it reads "not what was typed"). Nothing was changed.');
  sandbox.patchFor = patchFor;
  assert.deepEqual(dirtyFiles(state), []);
  assert.equal(state.index.application.get('shop.web').name, 'Web storefront');
  assert.equal(patchesOf(state, 'saas').length, count, 'no patch was added');
});

test('the clicks that write are allowed in the plateau drawn, and so is Move to manifests: it writes views and stories, which belong to no plateau', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const click = (action) => sandbox.handleAppClick({ target: { closest: () => ({ getAttribute: (name) => (name === 'data-action' ? action : null) }), classList: { contains: () => false } } });
  click('toggle-element-edit');
  assert.notEqual(run(sandbox, 'saveStatus.state'), 'denied');
  click('legacy-move');
  assert.notEqual(run(sandbox, 'saveStatus.state'), 'denied');
  assert.deepEqual(dirtyFiles(state), [], 'nothing to move in this workspace: nothing is written');
});

test('a story or a view is edited and deleted from any plateau: it belongs to none', async () => {
  const files = {
    'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n',
    'story.tour.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "tour"\n  name: "Tour"\n  steps: []\n',
    'later/plateau.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "later"\n',
    'later/story.speed.yaml': 'header:\n  kind: "archicode.morin.io/story"\n  version: "1"\ncontent:\n  id: "speed"\n  name: "Speed"\n  steps: []\n'
  };
  const { sandbox, state } = await openIn(files);
  for (const drawn of ['later', 'baseline']) {
    sandbox.drawPlateau(drawn);
    assert.deepEqual(plain(Array.from(sandbox.storiesList(), (story) => story.id).sort()), ['speed', 'tour'], drawn);
  }
  sandbox.drawPlateau('later');
  sandbox.removeEntry(sandbox.findStory('tour'), 'stories');
  assert.equal(state.manifestFiles.some((f) => f.relPath === 'story.tour.yaml'), false, 'the story of baseline is deleted from later');
  sandbox.drawPlateau('baseline');
  sandbox.removeEntry(sandbox.findStory('speed'), 'stories');
  assert.equal(state.manifestFiles.some((f) => f.relPath === 'later/story.speed.yaml'), false, 'and the one kept in the folder of later from baseline');
});

test('a delete that leaves a view naming an element that no plateau has is refused, as the command line would refuse the workspace', async () => {
  const files = {
    'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n',
    'later/plateau.yaml': 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "later"\n',
    'view.ferry.yaml': 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "v"\n  viewpoint: "overview"\n  layer: "application"\n  properties:\n    element: "ferry"\n'
  };
  const { sandbox, state } = await openIn(files);
  assert.throws(() => sandbox.commitDeleteElement('ferry', 'application', [], { confirmed: true }),
    (e) => e.message === 'Not written: the view `v` (`view.ferry.yaml`) names `ferry`, which exists in no plateau. Nothing was changed.');
  assert.deepEqual(dirtyFiles(state), []);
  assert.ok(state.index.application.has('ferry'), 'the element is still there');
});

// ---- plateaus ----

test('a successor plateau is a manifest of kind plateau with its id, name, horizon and the plateau it overrides', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const result = sandbox.commitPlateauCreate({ id: 'pilot', name: 'Pilot with the platform', horizon: '2027-Q1', parent: 'saas' });
  assert.equal(result.relPath, 'plateau.pilot.yaml');
  assert.equal(state.plateauTree.nodes.get('pilot').parent, 'saas');
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['plateau.pilot.yaml']);
  assert.equal(out.files['plateau.pilot.yaml'].after, 'header:\n  kind: archicode.morin.io/plateau\n  version: "1"\ncontent:\n  id: pilot\n  name: Pilot with the platform\n  horizon: 2027-Q1\n  override: saas');
  // a successor of baseline says no `override`
  const second = sandbox.commitPlateauCreate({ id: 'next', name: '', horizon: '', parent: 'baseline' });
  assert.equal(state.manifestFiles.find((f) => f.relPath === second.relPath).rawText, 'header:\n  kind: archicode.morin.io/plateau\n  version: "1"\ncontent:\n  id: next');
  assert.equal(state.plateauTree.nodes.get('next').parent, 'baseline');
  // and the plateau is a layer: what is written in it is its own
  sandbox.drawPlateau('pilot');
  assert.equal(sandbox.writingPlateau(), 'pilot');
  sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'pilot-sys', name: 'Pilot system', description: '' });
  assert.match(state.manifestFiles.find((f) => f.relPath.endsWith('app.pilot-sys.yaml')).rawText, /plateau: pilot/);
});

test('a plateau is refused with one sentence when its id is not valid, exists, or its parent does not', async () => {
  const { sandbox, state } = await openLayeredCopy('saas');
  assert.throws(() => sandbox.commitPlateauCreate({ id: '', parent: 'saas' }), (e) => e.message === 'A plateau needs an id.');
  assert.throws(() => sandbox.commitPlateauCreate({ id: 'Pilot.1', parent: 'saas' }), (e) => e.message === 'The id of a plateau uses lowercase letters, digits, `_` and `-` (no dot, no space).');
  assert.throws(() => sandbox.commitPlateauCreate({ id: 'saas', parent: 'baseline' }), (e) => e.message === 'The plateau `saas` exists already.');
  assert.throws(() => sandbox.commitPlateauCreate({ id: 'pilot', parent: 'nowhere' }), (e) => e.message === 'The plateau `nowhere` does not exist, so `pilot` cannot override it.');
  assert.deepEqual(dirtyFiles(state), []);
});

test('the name, the horizon and the parent of a plateau are written in its manifest, and nothing else', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  sandbox.commitPlateauEdit({ id: 'marketplace', name: 'Marketplace', horizon: '2027-Q4', parent: 'inhouse' });
  let out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['marketplace/plateau.yaml']);
  assert.deepEqual(out.files['marketplace/plateau.yaml'].diff, { removed: ['  name: "Marketplace and personalisation"'], added: ['  name: "Marketplace"'] });
  // a horizon where there was none goes between the name and the patches
  opened.original = Object.assign({}, opened.original, { 'marketplace/plateau.yaml': out.files['marketplace/plateau.yaml'].after });
  sandbox.commitPlateauEdit({ id: 'saas', name: 'Buy the commerce platform', horizon: '2026-Q4', parent: 'baseline' });
  assert.equal(sandbox.commitPlateauEdit({ id: 'saas', name: 'Buy the commerce platform', horizon: '2026-Q4', parent: 'baseline' }).unchanged, true);
  sandbox.commitPlateauEdit({ id: 'saas', name: 'Buy', horizon: '2026-Q4', parent: 'baseline' });
  out = await saved(opened);
  assert.deepEqual(out.files['saas/plateau.yaml'].diff, { removed: ['  name: "Buy the commerce platform"'], added: ['  name: "Buy"'] });
  assert.equal(state.plateauTree.nodes.get('saas').name, 'Buy');
});

test('a plateau that exists through headers only gets a manifest when it is named', async () => {
  const files = {
    'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n',
    'later/app.dock.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\n  plateau: later\ncontent:\n  id: "dock"\n  name: "Dock"\n'
  };
  const opened = await openIn(files);
  const { sandbox, state } = opened;
  assert.equal(state.plateauTree.nodes.get('later').manifest, null);
  const result = sandbox.commitPlateauEdit({ id: 'later', name: 'Later', horizon: '2030', parent: 'baseline' });
  assert.equal(result.relPath, 'later/plateau.later.yaml');
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['later/plateau.later.yaml']);
  assert.equal(out.files['later/plateau.later.yaml'].after, 'header:\n  kind: archicode.morin.io/plateau\n  version: "1"\ncontent:\n  id: later\n  name: Later\n  horizon: "2030"');
  assert.equal(state.plateauTree.nodes.get('later').name, 'Later');
});

test('a new parent for a plateau changes what it inherits: it asks first, and a plateau cannot go under itself or under what overrides it', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  assert.throws(() => sandbox.commitPlateauEdit({ id: 'inhouse', name: 'Build', horizon: '2026-Q4', parent: 'marketplace' }), (e) => e.message === 'The plateau `inhouse` cannot override `marketplace`: it would override itself.');
  assert.throws(() => sandbox.commitPlateauEdit({ id: 'inhouse', name: 'Build', horizon: '2026-Q4', parent: 'inhouse' }), (e) => e.message === 'The plateau `inhouse` cannot override `inhouse`: it would override itself.');
  // saas under inhouse: its patches name elements inhouse has already taken out, so the plateau would no longer resolve
  assert.throws(() => sandbox.commitPlateauEdit({ id: 'saas', name: 'Buy the commerce platform', horizon: '2026-Q4', parent: 'inhouse' }),
    (e) => /^Not written: the plateau `saas` could no longer be resolved \(plateau saas: patch 1 \(REMOVE target shop\.app\.catalog\): selects nothing/.test(e.message) && e.message.endsWith(' Nothing was changed.'));
  assert.deepEqual(dirtyFiles(state), []);
  assert.equal(state.plateauTree.nodes.get('saas').parent, 'baseline');
});

test('the page Plateaus says where a write goes and has the controls of a plateau; the band has none (wave 015, run 0097, #98)', async () => {
  const { sandbox } = await openLayeredCopy('saas');
  const band = sandbox.renderPlateauBandHtml();
  assert.doesNotMatch(band, /writing in|data-action="plateau-(create|edit)"|New plateau|Edit plateau/, 'the band chooses the plateau drawn and the comparison, and writes nothing');
  const timeline = sandbox.renderPlateausPageHtml();
  assert.match(timeline, /<span class="band-writing-label" role="status">writing in: <strong>Buy the commerce platform<\/strong> <code>saas<\/code><\/span>/);
  assert.match(timeline, /data-action="plateau-create" data-plateau="saas"[^>]*>New plateau</);
  assert.match(timeline, /data-action="plateau-edit" data-plateau="saas"[^>]*>Edit plateau</);
  assert.match(timeline, /data-action="plateau-create" data-plateau="baseline"[^>]*>New plateau after this</);
  assert.match(timeline, /data-action="plateau-edit" data-plateau="marketplace"[^>]*>Edit</);
  // a workspace with no plateau offers to make the first one, and does not say where it writes: it has one plateau
  const plain1 = await openIn({ 'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"\n' });
  const page1 = plain1.sandbox.renderPlateausPageHtml();
  assert.doesNotMatch(page1, /writing in:/);
  assert.match(page1, /data-action="plateau-create" data-plateau="baseline"/);
  assert.doesNotMatch(page1, /data-action="plateau-edit"/);
});

test('the form of a plateau creates it: the dialog reads its fields, refuses in place, and draws the new plateau', async () => {
  const { sandbox, state } = await openLayeredCopy('saas');
  sandbox.openPlateauDialog('create', 'saas');
  assert.equal(dialog(sandbox).kind, 'plateau-form');
  assert.equal(dialog(sandbox).values.parent, 'saas');
  assert.match(sandbox.renderAppDialogHtml(), /id="plateau-form-parent"/);
  sandbox.submitAppDialog({ fields: { id: 'BAD', name: '', horizon: '', parent: 'saas' } });
  assert.equal(run(sandbox, 'appDialog') !== null, true, 'the dialog stays open on a refusal');
  sandbox.submitAppDialog({ fields: { id: 'pilot', name: 'Pilot', horizon: '2027', parent: 'saas' } });
  assert.equal(run(sandbox, 'appDialog'), null);
  assert.equal(state.layers.current, 'pilot');
  assert.ok(state.plateauTree.nodes.has('pilot'));
  sandbox.openPlateauDialog('edit', 'pilot');
  assert.equal(dialog(sandbox).values.name, 'Pilot');
  sandbox.submitAppDialog({ fields: { name: 'Pilot two', horizon: '2027', parent: 'baseline' } });
  assert.equal(state.plateauTree.nodes.get('pilot').name, 'Pilot two');
  assert.equal(state.plateauTree.nodes.get('pilot').parent, 'baseline');
});

// ---- the old rules stay for what is not layered ----

test('a workspace with no plateau saves an edit exactly as before: the one line, and no guard', async () => {
  const files = {
    'app.ferry.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "ferry"\n  name: "Ferry"  # shown on the map\n  description: "Crosses the bay."\n'
  };
  const opened = await openIn(files);
  const { sandbox, state } = opened;
  assert.equal(sandbox.writingPlateau(), null);
  assert.equal(edit(sandbox, 'ferry', (n) => { n.name = 'Ferry company'; }), undefined);
  const out = await saved(opened);
  assert.deepEqual(out.files['app.ferry.yaml'].diff, { removed: ['  name: "Ferry"  # shown on the map'], added: ['  name: "Ferry company"  # shown on the map'] });
  // an element is created without `plateau:` and a story likewise
  const created = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'dock', name: 'Dock', description: '' });
  assert.equal(state.manifestFiles.find((f) => f.relPath === created.relPath).header.plateau, undefined);
  sandbox.createManifestEntry('story', { id: 'tour', name: 'Tour', steps: [] });
  assert.equal(state.manifestFiles.find((f) => f.content && f.content.id === 'tour').header.plateau, undefined);
});

test('baseline of a layered workspace saves its own edits as before, once the author said yes: the file it declares it in, the one line', async () => {
  const opened = await openLayeredCopy();
  const { sandbox } = opened;
  edit(sandbox, 'shop.db', (n) => { n.description = 'Products, accounts, orders and stock, in Postgres.'; }, 'application', { confirmed: true });
  const out = await saved(opened);
  assert.deepEqual(Object.keys(out.files), ['baseline/application/shop.yaml']);
  assert.deepEqual(out.files['baseline/application/shop.yaml'].diff, {
    removed: ['      description: "Products, accounts, orders and stock."'],
    added: ['      description: "Products, accounts, orders and stock, in Postgres."']
  });
});

test('a workspace that writes no plateau saves an edit as before: no layer written, no guard, no plateau header', async () => {
  const system = (id, name) => 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"  # as written\n';
  const files = {
    '.archicode.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
    'manifests/app.shop.yaml': system('shop', 'Shop as is'),
    'manifests/app.billing.yaml': system('billing', 'Billing')
  };
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, null);
  assert.equal(state.layers.current, 'baseline', 'the band has baseline alone');
  assert.equal(sandbox.writingPlateau(), null, 'and nothing is written in a plateau');
  assert.equal(sandbox.layerActionRefusal('toggle-element-edit'), null);
  assert.equal(edit(sandbox, 'shop', (n) => { n.name = 'Shop, later'; }), undefined);
  const created = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'crm', name: 'CRM', description: '' });
  assert.equal(state.manifestFiles.find((f) => f.relPath === created.relPath).header.plateau, undefined);
  await sandbox.saveAllChanges();
  assert.equal(mem.files.get('manifests/app.shop.yaml').text, system('shop', 'Shop, later'), 'the line, with its comment, and nothing else');
  assert.equal(mem.files.get('manifests/app.billing.yaml').text, files['manifests/app.billing.yaml'], 'the other file is not touched');
});

test('a refused write leaves the text of every file, and its mark, as it was; the page draws what it drew', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const snapshot = () => plain(state.manifestFiles.map((f) => [f.relPath, f.rawText, f.dirty, f.content]));
  const before = snapshot();
  const draws = plain([...state.index.application.keys()]);
  for (const refused of [
    () => edit(sandbox, 'shop.web', (n) => { n.id = 'front'; return { renamedTo: { from: 'shop.web', to: 'shop.front' } }; }),
    () => sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', id: 'shop', name: 'again', description: '' }),
    () => sandbox.commitPlateauCreate({ id: 'saas', parent: 'baseline' }),
    () => sandbox.commitPlateauEdit({ id: 'saas', parent: 'saas' })
  ]) assert.throws(refused);
  assert.deepEqual(snapshot(), before);
  assert.deepEqual(plain([...state.index.application.keys()]), draws);
  assert.equal(state.manifestFiles.length, before.length);
  assert.equal(state.dirtyReferences.size, 0);
});

// ---- what the review of the run found ----

test('deleting an element that a patch of the plateau lists as hosted or used takes it out of that patch, and the plateau still resolves', async () => {
  const opened = await openLayeredCopy('marketplace');
  const { sandbox, state } = opened;
  assert.equal(state.index.application.get('discovery.search').declaredIn, 'marketplace');
  sandbox.commitDeleteElement('discovery.search', 'application', []);
  assert.equal(state.layerProblems, null);
  assert.equal(state.index.application.has('discovery.search'), false);
  const named = JSON.stringify(patchesOf(state, 'marketplace'));
  assert.ok(!named.includes('discovery.search'), 'no patch of marketplace names it any more');
});

test('a plateau that no longer resolves after an edit is named with the kernel\'s sentence, not "no element"', async () => {
  const opened = await openLayeredCopy('marketplace');
  const { sandbox, state } = opened;
  assert.throws(() => edit(sandbox, 'marketplace.listing', (n) => { n.qualifiers = []; }),
    (e) => /^Not written: the plateau `marketplace` could no longer be resolved \(plateau marketplace: patch \d+ \(MERGE json-path .*\): selects 11 nodes, 12 expected\)\. Nothing was changed\.$/.test(e.message));
  assert.deepEqual(dirtyFiles(state), []);
});

test('a rename and a field a patch of the plateau sets in the same edit are two steps: one sentence', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  assert.equal(state.index.application.get('commerce-saas').declaredIn, 'saas');
  // a patch of saas on a field of an element saas declares (A9)
  edit(sandbox, 'commerce-saas', (n) => { n.description = 'one'; });
  sandbox.commitPlateauEdit({ id: 'saas', name: 'Buy the commerce platform', horizon: '2026-Q4', parent: 'baseline' });
  const mf = state.manifestFiles.find((f) => f.relPath === 'saas/plateau.yaml');
  mf.content.patches.push({ operator: 'SET', target: 'commerce-saas', field: 'description', value: 'two' });
  sandbox.commitFileEdit('saas/plateau.yaml', sandbox.serializeManifestFile(mf.header, mf.content));
  const before = dirtyFiles(state);
  assert.throws(() => edit(sandbox, 'commerce-saas', (n) => { n.id = 'commerce-saas2'; n.description = 'three'; return { renamedTo: { from: 'commerce-saas', to: 'commerce-saas2' } }; }),
    (e) => e.message === 'Not written: `commerce-saas` is renamed and a patch of the plateau `saas` sets a field in the same edit (description): save the rename, then the change. Nothing was changed.');
  assert.deepEqual(dirtyFiles(state), before);
});

test('a relationship relabeled and relabeled back leaves no patch behind, also when the plateau has several on the field', async () => {
  const opened = await openLayeredCopy('saas');
  const { sandbox, state } = opened;
  const relabel = (label) => edit(sandbox, 'backoffice.console', (n) => { n.relationships = n.relationships.map((r, i) => (i === 0 ? Object.assign({}, r, { label }) : r)); });
  const count = patchesOf(state, 'saas').length;
  relabel('works on orders in');
  relabel('handles orders in'); // the label baseline gives it
  assert.equal(patchesOf(state, 'saas').length, count, 'the SET with where is gone');
  const out = await saved(opened);
  assert.deepEqual(out.files, {});
});

test('after the author says yes to a create, the new element is the selection, as after the click', async () => {
  const opened = await openLayeredCopy();
  const { sandbox, state } = opened;
  const created = sandbox.commitCreateChildElement({ parentReference: 'shop', layer: 'application', kind: 'container', id: 'wishlist', name: 'Wishlist', description: '' });
  assert.equal(created.pending, true);
  assert.equal(dialog(sandbox).kind, 'layer-confirm');
  sandbox.submitAppDialog({});
  assert.deepEqual(plain(state.selection), { kind: 'element', key: 'shop.wishlist', layer: 'application', mode: 'edit' });
  assert.ok(state.index.application.has('shop.wishlist'));
});

test('a write that fails the guard after it changed the manifests puts back everything: text, content, marks, removals', async () => {
  const opened = await openLayeredCopy(undefined, LAYERED_ELEMENTS);
  const { sandbox, state } = opened;
  const everything = () => plain({
    files: state.manifestFiles.map((f) => [f.relPath, f.rawText, f.dirty, f.header, f.content]),
    removals: state.pendingFileRemovals, baselines: [...state.removedFileBaselines], dirty: [...state.dirtyReferences], top: state.workspace.topLevel, settingsDirty: state.workspace.settingsDirty
  });
  const before = everything();
  // the delete changes the manifests (it takes out files and prunes links in other plateaus), and the guard refuses it afterwards
  assert.throws(() => sandbox.commitDeleteElement('shop', 'application', [], { confirmed: true }), (e) => /^Not written: the plateau `\w+` could no longer be resolved/.test(e.message));
  assert.deepEqual(everything(), before);
  assert.ok(state.index.application.has('shop'));
});
