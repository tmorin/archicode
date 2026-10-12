'use strict';
// The model operations of the editor — create, rename, delete, the element form, the kernel input and the save —
// played on in-memory workspaces (a copy of the fixture, or small ones built here) behind a writable shim of the
// File System Access API. Nothing touches the disk.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { FIXTURE, createApp } = require('./harness');

// ---- an in-memory, writable folder ----

function notFound(p) {
  const e = new Error('NotFoundError: ' + p);
  e.name = 'NotFoundError';
  return e;
}

function memFolder(initial) {
  const files = new Map(); // path -> { text, mtime }
  const dirs = new Set(['']);
  let clock = 1000;
  const mem = { files, dirs, writes: [], removals: [], onWrite: null, failGetFile: null };
  const addDirs = (p) => {
    const parts = p.split('/').slice(0, -1);
    for (let i = 1; i <= parts.length; i++) dirs.add(parts.slice(0, i).join('/'));
  };
  mem.put = (p, text) => { addDirs(p); files.set(p, { text, mtime: ++clock }); };
  for (const [p, text] of Object.entries(initial)) mem.put(p, text);

  const fileHandle = (p) => ({
    kind: 'file',
    name: p.split('/').pop(),
    async getFile() {
      if (mem.failGetFile) throw new Error(mem.failGetFile);
      const f = files.get(p);
      if (!f) throw notFound(p);
      return { lastModified: f.mtime, async text() { return f.text; } };
    },
    async createWritable() {
      let buffer = '';
      return {
        async write(data) { buffer += data; },
        async close() {
          if (mem.onWrite) await mem.onWrite(p);
          mem.writes.push(p);
          files.set(p, { text: buffer, mtime: ++clock });
        }
      };
    }
  });
  const dirHandle = (dirPath) => {
    const child = (name) => (dirPath ? dirPath + '/' + name : name);
    return {
      kind: 'directory',
      name: dirPath.split('/').pop() || 'ws',
      async queryPermission() { return 'granted'; },
      async requestPermission() { return 'granted'; },
      async *entries() {
        for (const p of Array.from(files.keys())) {
          if (p.slice(0, p.lastIndexOf('/') === -1 ? 0 : p.lastIndexOf('/')) === dirPath && (p.indexOf('/') === -1) === (dirPath === '')) yield [p.split('/').pop(), fileHandle(p)];
        }
        for (const d of Array.from(dirs)) {
          if (d !== '' && d.slice(0, d.lastIndexOf('/') === -1 ? 0 : d.lastIndexOf('/')) === dirPath) yield [d.split('/').pop(), dirHandle(d)];
        }
      },
      async getFileHandle(name, options) {
        const p = child(name);
        if (!files.has(p)) {
          if (!(options && options.create) || !dirs.has(dirPath)) throw notFound(p);
          files.set(p, { text: '', mtime: ++clock });
        }
        return fileHandle(p);
      },
      async getDirectoryHandle(name, options) {
        const p = child(name);
        if (!dirs.has(p)) {
          if (!(options && options.create)) throw notFound(p);
          dirs.add(p);
        }
        return dirHandle(p);
      },
      async removeEntry(name) {
        const p = child(name);
        if (!files.delete(p)) throw notFound(p);
        mem.removals.push(p);
      }
    };
  };
  mem.handle = dirHandle('');
  return mem;
}

/** The files of the fixture workspace (workspace.yaml and the manifests), as a path -> text object. */
function fixtureFiles() {
  const out = { 'workspace.yaml': fs.readFileSync(path.join(FIXTURE, 'workspace.yaml'), 'utf8') };
  for (const name of fs.readdirSync(path.join(FIXTURE, 'manifests'))) {
    out['manifests/' + name] = fs.readFileSync(path.join(FIXTURE, 'manifests', name), 'utf8');
  }
  return out;
}

async function openMem(files) {
  const mem = memFolder(files);
  const sandbox = createApp();
  await sandbox.loadWorkspace(mem.handle);
  const state = sandbox.__state();
  assert.equal(state.fatalError, null);
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  return { sandbox, state, mem };
}

const openFixtureMem = () => openMem(fixtureFiles());
const ev = (sandbox, code) => vm.runInContext(code, sandbox);
const manifest = (state, relPath) => state.manifestFiles.find((f) => f.relPath === relPath);
const sorted = (list) => Array.from(list).sort();
/** deepStrictEqual across the vm boundary: arrays and objects of the page have another prototype, so both sides go through JSON. */
const same = (actual, expected, message) => assert.deepStrictEqual(JSON.parse(JSON.stringify(actual)), JSON.parse(JSON.stringify(expected)), message);

const SOLUTION = (id, extra) => 'header:\n  kind: "archicode.morin.io/solution"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (extra || '');
const ENVIRONMENT = (id, extra) => 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "' + id + '"\n' + (extra || '');

// ---- 1. delete removes the whole subtree ----

test('deleting a solution removes the manifests attached below it and the links to what is deleted', async () => {
  const { sandbox, state } = await openFixtureMem();
  const impact = sandbox.computeDeleteImpact('shop', 'application');
  same(sorted(impact.files), ['manifests/app.shop.catalog.yaml', 'manifests/app.shop.web.yaml', 'manifests/app.shop.yaml']);
  assert.ok(impact.deletedReferences.includes('shop.web.frontend'));
  assert.ok(impact.affected.some((a) => a.ownerReference === 'customer' && a.destination === 'shop.web.frontend'));
  assert.ok(impact.affected.some((a) => a.ownerReference === 'prod.cluster.web.pod-a' && a.destination === 'shop.web.frontend'), 'the deployed applications are listed too');

  sandbox.commitDeleteElement('shop', 'application', impact.affected);

  same(sorted(state.pendingFileRemovals), sorted(impact.files));
  same(sorted(state.index.application.keys()), ['customer', 'mailer']);
  assert.equal(state.index.application.get('customer').relationships.length, 0);
  assert.equal(state.index.application.get('mailer').relationships.length, 1, 'a link to something that stays is kept');
  assert.equal(state.relationshipStats.dangling, 0, 'no orphan keeps a reference to the deleted solution');
  for (const record of state.index.technology.values()) {
    assert.ok(record.applications.every((a) => !a.startsWith('shop')), 'no node deploys a deleted application: ' + record.reference);
  }
  assert.ok(state.manifestFiles.every((f) => !f.relPath.includes('app.shop')));
});

test('a delete saved to the disk leaves a workspace that reads without a dangling link', async () => {
  const { sandbox, state, mem } = await openFixtureMem();
  sandbox.commitDeleteElement('shop', 'application', []);
  await sandbox.saveAllChanges();
  assert.equal(ev(sandbox, 'saveStatus').state, 'success');
  same(sorted(mem.removals), ['manifests/app.shop.catalog.yaml', 'manifests/app.shop.web.yaml', 'manifests/app.shop.yaml']);
  assert.equal(state.pendingFileRemovals.length, 0);

  const again = createApp();
  await again.loadWorkspace(mem.handle);
  const reloaded = again.__state();
  same(sorted(reloaded.index.application.keys()), ['customer', 'mailer']);
  assert.equal(reloaded.relationshipStats.dangling, 0);
});

test('deleting a manifest root keeps the siblings attached elsewhere; deleting a nested element removes no file', async () => {
  const { sandbox, state } = await openFixtureMem();
  sandbox.commitDeleteElement('shop.web', 'application', []);
  same(state.pendingFileRemovals, ['manifests/app.shop.web.yaml']);
  assert.ok(state.index.application.has('shop.catalog.service'), 'the catalog manifest is not below shop.web');
  assert.ok(state.index.application.has('shop'));
  assert.equal(state.relationshipStats.dangling, 0);

  const nested = await openFixtureMem();
  nested.sandbox.commitDeleteElement('shop.catalog.service', 'application', []);
  same(nested.state.pendingFileRemovals, []);
  assert.ok(!nested.state.index.application.has('shop.catalog.service.search'));
  assert.ok(nested.state.index.application.has('shop.catalog.db'));
  const apps = [...nested.state.index.technology.values()].flatMap((r) => r.applications);
  assert.ok(!apps.includes('shop.catalog.service'));
  assert.equal(nested.state.relationshipStats.dangling, 0);
});

test('a delete forgets the references of the map, the selection and the tree', async () => {
  const { sandbox, state } = await openFixtureMem();
  ev(sandbox, "mapPinned = ['shop.web.api', 'mailer']; mapHidden = ['shop.catalog']; mapOpened = new Set(['shop', 'shop.web']); navActiveRef = 'shop.web.api';");
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'edit' };
  state.expanded.add('shop');
  sandbox.commitDeleteElement('shop', 'application', []);
  same(ev(sandbox, 'mapPinned'), ['mailer']);
  same(ev(sandbox, 'mapHidden'), []);
  same(Array.from(ev(sandbox, 'mapOpened')), []);
  assert.equal(ev(sandbox, 'navActiveRef'), null);
  assert.equal(state.selection.kind, 'none');
  assert.ok(!state.expanded.has('shop'));
  // a later element with the same reference does not inherit a stale pin
  sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'solution', attachUnderReference: null, id: 'shop', name: null, description: null });
  same(ev(sandbox, 'mapPinned'), ['mailer']);
});

// ---- 2. rename rewrites every inbound reference ----

test('renaming a solution rewrites the links, the deployed applications and the parent of the attached manifests', async () => {
  const { sandbox, state } = await openFixtureMem();
  ev(sandbox, "mapPinned = ['shop.web.api', 'mailer']; mapHidden = ['shop.catalog']; mapOpened = new Set(['shop', 'shop.web']); navActiveRef = 'shop.web.api';");
  state.selection = { kind: 'element', key: 'shop.web.api', mode: 'view' };
  state.expanded.add('shop');
  state.expanded.add('shop.web');
  state.dirtyReferences.add('shop.catalog');

  sandbox.commitElementEdit('shop', (node) => { node.id = 'store'; return { renamedTo: { from: 'shop', to: 'store' } }; });

  assert.ok(state.index.application.has('store.web.api'));
  assert.ok(!state.index.application.has('shop'));
  assert.equal(state.relationshipStats.dangling, 0);
  for (const relPath of ['manifests/app.shop.web.yaml', 'manifests/app.shop.catalog.yaml']) {
    const mf = manifest(state, relPath);
    assert.equal(mf.header.parent, 'store');
    assert.equal(mf.dirty, true);
    assert.equal(sandbox.parseManifestText(mf.rawText).header.parent, 'store', 'the text to save is regenerated');
  }
  const customer = state.index.application.get('customer');
  same(customer.relationships.map((r) => r.destination), ['store.web.frontend', 'store.web.edge.gateway']);
  assert.equal(manifest(state, 'manifests/app.customer.yaml').dirty, true);
  same(state.index.technology.get('prod.cluster.web.pod-a').applications, ['store.web.frontend']);
  same(state.index.technology.get('psp.gateway').applications, ['store.payments']);
  assert.equal(manifest(state, 'manifests/app.mailer.yaml').dirty, false, 'a file that pointed nowhere near stays clean');

  assert.equal(state.selection.key, 'store.web.api');
  assert.ok(state.expanded.has('store') && state.expanded.has('store.web') && !state.expanded.has('shop'));
  assert.ok(state.dirtyReferences.has('store.catalog') && state.dirtyReferences.has('store'));
  assert.equal(ev(sandbox, 'navActiveRef'), 'store.web.api');
  same(ev(sandbox, 'mapPinned'), ['store.web.api', 'mailer']);
  same(ev(sandbox, 'mapHidden'), ['store.catalog']);
  same(sorted(ev(sandbox, 'mapOpened')), ['store', 'store.web']);
});

test('renaming a nested element, or a technology node, rewrites only what points at it', async () => {
  const { sandbox, state } = await openFixtureMem();
  sandbox.commitElementEdit('shop.web.api', (node) => { node.id = 'rest'; return { renamedTo: { from: 'shop.web.api', to: 'shop.web.rest' } }; });
  assert.equal(state.relationshipStats.dangling, 0);
  assert.equal(state.index.application.get('shop.web.frontend').relationships[0].destination, 'shop.web.rest');
  same(state.index.technology.get('prod.cluster.web.pod-b').applications, ['shop.web.rest']);

  sandbox.commitElementEdit('prod.cluster.web', (node) => { node.id = 'ns'; return { renamedTo: { from: 'prod.cluster.web', to: 'prod.cluster.ns' } }; });
  assert.equal(state.relationshipStats.dangling, 0);
  assert.equal(state.index.technology.get('prod.cluster.ns.pod-a').relationships[0].destination, 'prod.cluster.ns.pod-b');
  same(state.index.technology.get('prod.cluster.ns.pod-a').applications, ['shop.web.frontend'], 'the applications of a node are application references: untouched');
});

test('a reference is rewritten on the dot boundary only', async () => {
  const { sandbox } = await openFixtureMem();
  assert.equal(sandbox.rewriteReferenceValue('shop2.x', 'shop', 'store'), 'shop2.x');
  assert.equal(sandbox.rewriteReferenceValue('shop.x', 'shop', 'store'), 'store.x');
  assert.equal(sandbox.rewriteReferenceValue('shop', 'shop', 'store'), 'store');
  assert.equal(sandbox.rewriteReferenceValue(8080, 'shop', 'store'), 8080);
});

// ---- 3. manifest paths never collide ----

test('a new manifest takes a free path: beside a renamed element whose file kept its old name, and in any case', async () => {
  const { sandbox, state } = await openFixtureMem();
  sandbox.commitElementEdit('shop.web', (node) => { node.id = 'site'; return { renamedTo: { from: 'shop.web', to: 'shop.site' } }; });
  assert.ok(manifest(state, 'manifests/app.shop.web.yaml'), 'the file kept its name');
  const created = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', attachUnderReference: 'shop', id: 'web', name: null, description: null });
  assert.equal(created.relPath, 'manifests/app.shop.web-2.yaml');
  assert.equal(manifest(state, 'manifests/app.shop.web.yaml').content.id, 'site', 'the other file is untouched');

  const again = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'person', attachUnderReference: null, id: 'web', name: null, description: null });
  assert.equal(again.relPath, 'manifests/app.web.yaml');
});

test('path collisions are looked for case-insensitively, and a pending new file counts', async () => {
  const { sandbox, state } = await openFixtureMem();
  const upper = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'person', attachUnderReference: null, id: 'Customer', name: null, description: null });
  assert.equal(upper.relPath, 'manifests/app.Customer-2.yaml', 'app.customer.yaml exists, and a case-insensitive disk would call it the same file');
  const lower = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'person', attachUnderReference: null, id: 'CUSTOMER', name: null, description: null });
  assert.equal(lower.relPath, 'manifests/app.CUSTOMER-3.yaml');
  assert.equal(new Set(state.manifestFiles.map((f) => f.relPath.toLowerCase())).size, state.manifestFiles.length);
});

test('a file removed and recreated at the same path is written, not deleted', async () => {
  const { sandbox, state, mem } = await openFixtureMem();
  sandbox.commitDeleteElement('mailer', 'application', []);
  same(state.pendingFileRemovals, ['manifests/app.mailer.yaml']);
  const created = sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', attachUnderReference: null, id: 'mailer', name: 'New mailer', description: null });
  assert.equal(created.relPath, 'manifests/app.mailer.yaml');
  same(state.pendingFileRemovals, [], 'the removal is dropped: the new file replaces the old one');
  await sandbox.saveAllChanges();
  assert.equal(ev(sandbox, 'saveStatus').state, 'success');
  same(mem.removals, []);
  assert.match(mem.files.get('manifests/app.mailer.yaml').text, /New mailer/);
});

test('saving refuses to overwrite a file that appeared on disk and that the editor did not know', async () => {
  const { sandbox, state, mem } = await openFixtureMem();
  sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'system', attachUnderReference: null, id: 'newone', name: null, description: null });
  mem.put('manifests/app.newone.yaml', 'somebody else wrote this');
  await sandbox.saveAllChanges();
  const status = ev(sandbox, 'saveStatus');
  assert.equal(status.state, 'error');
  assert.match(status.message, /already exists/);
  assert.equal(mem.files.get('manifests/app.newone.yaml').text, 'somebody else wrote this');
  same(mem.writes, [], 'nothing was written');
  assert.equal(state.manifestFiles.find((f) => f.relPath === 'manifests/app.newone.yaml').dirty, true);
});

// ---- 4. the same reference in both layers ----

const TWO_LAYERS = {
  'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
  'manifests/app.epr.yaml': SOLUTION('epr', '  name: "App side"\n  elements:\n    - kind: "system"\n      id: "core"\n'),
  'manifests/env.epr.yaml': ENVIRONMENT('epr', '  name: "Env side"\n  elements:\n    - kind: "node"\n      id: "n1"\n      applications:\n        - "epr.core"\n')
};

test('a reference that exists in both layers is looked up by layer', async () => {
  const { sandbox, state } = await openMem(TWO_LAYERS);
  assert.equal(sandbox.findElementRecord('epr').layer, 'application', 'no layer asked: the application one, as before');
  assert.equal(sandbox.findElementRecord('epr', 'technology').layer, 'technology');
  assert.equal(sandbox.findElementRecord('epr', 'technology').name, 'Env side');
  state.selection = { kind: 'element', key: 'epr', layer: 'technology', mode: 'edit' };
  assert.equal(sandbox.findElementRecord('epr').layer, 'technology', 'the selection says which one it is');
  assert.equal(sandbox.locateContentNode('epr').mf.relPath, 'manifests/env.epr.yaml');
});

test('editing, adding a child, renaming and deleting act on the layer of the selection', async () => {
  const { sandbox, state } = await openMem(TWO_LAYERS);
  const envFile = () => manifest(state, 'manifests/env.epr.yaml');
  const appFile = () => manifest(state, 'manifests/app.epr.yaml');
  state.selection = { kind: 'element', key: 'epr', layer: 'technology', mode: 'edit' };

  sandbox.commitElementEdit('epr', (node) => { node.name = 'Renamed env'; });
  assert.equal(envFile().content.name, 'Renamed env');
  assert.equal(appFile().content.name, 'App side');
  assert.equal(appFile().dirty, false);

  const child = sandbox.commitCreateChildElement({ parentReference: 'epr', layer: 'technology', kind: 'node', id: 'n2', name: null, description: null });
  assert.equal(child.ok, true);
  assert.equal(child.layer, 'technology');
  same(envFile().content.elements.map((e) => e.id), ['n1', 'n2']);
  same(appFile().content.elements.map((e) => e.id), ['core']);

  sandbox.commitElementEdit('epr', (node) => { node.id = 'epr2'; return { renamedTo: { from: 'epr', to: 'epr2' } }; });
  assert.ok(state.index.technology.has('epr2.n1') && !state.index.technology.has('epr'));
  assert.ok(state.index.application.has('epr'), 'the application element is untouched');
  assert.equal(appFile().dirty, false);
  assert.equal(state.selection.key, 'epr2');
  assert.equal(state.selection.layer, 'technology');
  same(state.index.technology.get('epr2.n1').applications, ['epr.core'], 'the deployed applications are application references');

  sandbox.commitDeleteElement('epr2', 'technology', []);
  same(state.pendingFileRemovals, ['manifests/env.epr.yaml']);
  assert.ok(state.index.application.has('epr') && state.index.application.has('epr.core'));
});

test('deleting or renaming the application side of a shared reference leaves the technology element alone', async () => {
  const { sandbox, state } = await openMem(TWO_LAYERS);
  sandbox.commitDeleteElement('epr', 'application', []);
  assert.ok(state.index.technology.has('epr') && state.index.technology.has('epr.n1'));
  same(state.index.technology.get('epr.n1').applications, [], 'but the node no longer deploys the deleted application');
});

test('the route carries the layer only when both layers have the reference, and old links keep their meaning', async () => {
  const { sandbox, state } = await openMem(TWO_LAYERS);
  state.selection = { kind: 'element', key: 'epr', layer: 'technology', mode: 'view' };
  assert.match(sandbox.currentRouteHash(), /ref=epr&layer=technology/);
  state.selection = { kind: 'element', key: 'epr.core', mode: 'view' };
  assert.doesNotMatch(sandbox.currentRouteHash(), /layer=/);

  sandbox.location.hash = '#/elements?ref=epr&layer=technology';
  sandbox.applySelectionFromHashRef();
  assert.equal(state.selection.layer, 'technology');
  sandbox.location.hash = '#/elements?ref=epr';
  sandbox.applySelectionFromHashRef();
  assert.equal(state.selection.key, 'epr');
  assert.equal(sandbox.findElementRecord(state.selection.key, state.selection.layer).layer, 'application');
  sandbox.location.hash = '#/elements?ref=epr&layer=nonsense';
  sandbox.applySelectionFromHashRef();
  assert.equal(sandbox.findElementRecord('epr', state.selection.layer).layer, 'application');
});

test('the element form and the kernel input follow the layer of the selection', async () => {
  const { sandbox, state } = await openMem(TWO_LAYERS);
  state.selection = { kind: 'element', key: 'epr', layer: 'technology', mode: 'view' };
  assert.equal(sandbox.buildKernelInput('overview', 'epr').input.layer, 'technology');
  state.selection = { kind: 'element', key: 'epr', mode: 'view' };
  assert.equal(sandbox.buildKernelInput('overview', 'epr').input.layer, 'application');
});

// ---- 5. no *-group kind at the top ----

test('the editor does not offer the *-group kinds for a top-level manifest', async () => {
  const { sandbox } = await openMem(TWO_LAYERS);
  const kinds = ev(sandbox, 'TOP_LEVEL_KIND_OPTIONS');
  const blank = ev(sandbox, 'TOP_LEVEL_BLANK_ATTACH_ALLOWED');
  for (const list of [...Object.values(kinds), ...Object.values(blank)]) assert.ok(list.every((k) => !k.endsWith('-group')), list.join(','));
  same(Array.from(kinds.application), ['person', 'system', 'solution', 'container', 'component']);
});

test('a container-group manifest that exists is still read', async () => {
  const group = 'header:\n  kind: "archicode.morin.io/container-group"\n  version: "1"\n  parent: "epr.core"\ncontent:\n  id: "grp"\n';
  const { state } = await openMem(Object.assign({}, TWO_LAYERS, { 'manifests/app.epr.core.grp.yaml': group }));
  assert.ok(state.index.application.has('epr.core.grp'));
});

// ---- 6. ids ----

test('an id is a safe name, for a new element and for a rename', async () => {
  const { sandbox, state } = await openFixtureMem();
  for (const bad of ['a.b', 'a/b', 'a\\b', 'a b', '-a', '.a', 'a$', 'é', '']) {
    assert.equal(sandbox.validateElementId(bad).valid, false, JSON.stringify(bad));
  }
  for (const good of ['a', 'A_b-1', '0', 'pod-a']) assert.equal(sandbox.validateElementId(good).valid, true, good);

  assert.equal(sandbox.validateElementIdRename('a.b', 'shop.web', 'application').valid, false);
  assert.match(sandbox.validateElementIdRename('a b', 'shop.web', 'application').error, /space/);
  assert.equal(sandbox.validateElementIdRename('site', 'shop.web', 'application').valid, true);
  assert.equal(sandbox.validateElementIdRename('web', 'shop.web', 'application').valid, true, 'an id that does not change is fine');

  const rejected = sandbox.commitCreateChildElement({ parentReference: 'shop', kind: 'system', id: 'x.y', name: null, description: null });
  assert.equal(rejected.ok, false);
  assert.equal(rejected.field, 'id');
  assert.ok(!state.index.application.has('shop.x.y'));
  assert.throws(() => sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'person', attachUnderReference: null, id: '../evil', name: null, description: null }), /id/i);
  assert.equal(sandbox.commitCreateChildElement({ parentReference: 'shop', kind: 'system', id: 'ok-1', name: null, description: null }).ok, true);
  assert.equal(sandbox.commitCreateChildElement({ parentReference: 'shop', kind: 'system', id: 'ok-1', name: null, description: null }).ok, false, 'already used');
});

test('an unchanged id is not judged: a hand-written one the editor would refuse for a new element still saves', async () => {
  const files = Object.assign({}, TWO_LAYERS, { 'manifests/app.odd.yaml': SOLUTION('odd id') });
  const { sandbox } = await openMem(files);
  assert.equal(sandbox.validateElementIdRename('odd id', 'odd id', 'application').valid, true);
  assert.equal(sandbox.validateElementIdRename('odd id2', 'odd id', 'application').valid, false);
});

test('editing an element that cannot be located fails with a clear message, not a TypeError', async () => {
  const { sandbox } = await openFixtureMem();
  assert.throws(
    () => sandbox.commitElementEdit('nope.nothing', () => {}),
    (e) => e.name === 'Error' && /cannot be found/.test(e.message)
  );
  assert.throws(() => sandbox.commitDeleteElement('nope.nothing', 'application', []), (e) => e.name === 'Error' && /cannot be found/.test(e.message));
  assert.equal(sandbox.locateContentNode('nope.nothing'), null);
});

// ---- 7. the form changes only what the user changed ----

/** The inputs of the edit form for the element, as the page renders them, behind a fake `document`. */
function fakeForm(sandbox, reference, overrides) {
  const record = sandbox.findElementRecord(reference);
  const input = (value, initial) => ({ value, getAttribute: (n) => (n === 'data-initial' ? initial : null) });
  const rows = record.relationships.map((rel, i) => {
    const qualifiers = sandbox.formatCommaList(rel.qualifiers);
    const tags = sandbox.formatCommaKvList(rel.tags);
    const o = (overrides && overrides.rows && overrides.rows[i]) || {};
    const inputs = {
      '.rel-destination-input': input(o.destination !== undefined ? o.destination : String(rel.destination)),
      '.rel-label-input': input(o.label !== undefined ? o.label : (rel.rawLabel === null ? '' : String(rel.rawLabel))),
      '.rel-qualifiers-input': input(o.qualifiers !== undefined ? o.qualifiers : qualifiers, qualifiers),
      '.rel-tags-input': input(o.tags !== undefined ? o.tags : tags, tags)
    };
    return {
      getAttribute: (n) => (n === 'data-index' ? String(i) : null),
      querySelector: (selector) => inputs[selector] || null,
      __inputs: inputs
    };
  });
  const byId = {
    'edit-id-input': { value: overrides && overrides.id !== undefined ? overrides.id : String(record.id) },
    'edit-name-input': { value: overrides && overrides.name !== undefined ? overrides.name : (record.name === null ? '' : String(record.name)) },
    'edit-description-input': { value: overrides && overrides.description !== undefined ? overrides.description : (record.description === null ? '' : String(record.description)) }
  };
  const doc = sandbox.document;
  const original = { getElementById: doc.getElementById, querySelectorAll: doc.querySelectorAll };
  doc.getElementById = (id) => byId[id] || original.getElementById.call(doc, id);
  doc.querySelectorAll = (selector) => (selector.includes('relationship-edit-row') ? rows : original.querySelectorAll.call(doc, selector));
  return { rows, restore() { Object.assign(doc, original); } };
}

test('saving the form without touching it changes nothing in the manifests', async () => {
  const { sandbox, state } = await openFixtureMem();
  for (const reference of ['shop.web.api', 'customer', 'prod.cluster.web.pod-b', 'shop.catalog.service.indexer']) {
    const owner = sandbox.locateContentNode(reference);
    const before = JSON.stringify(owner.mf.content);
    const form = fakeForm(sandbox, reference);
    assert.equal(sandbox.commitElementWithDraft(reference, null), true, reference);
    form.restore();
    assert.equal(JSON.stringify(sandbox.locateContentNode(reference).mf.content), before, reference);
  }
  assert.ok(state.manifestFiles.some((f) => f.dirty), 'the commit itself still marks the file to save');
});

test('a relationship without a label is shown without one and saved without one', async () => {
  const { sandbox } = await openFixtureMem();
  const record = sandbox.findElementRecord('shop.web.api');
  const html = sandbox.renderRelationshipEditRowHtml('shop.web.api', record.relationships[0], 0);
  assert.equal(record.relationships[0].rawLabel, null);
  assert.match(html, /class="rel-label-input"[^>]*placeholder="label \(default: uses\)"[^>]*value=""/);
  assert.doesNotMatch(html, /value="uses"/);

  const form = fakeForm(sandbox, 'shop.web.api');
  sandbox.commitElementWithDraft('shop.web.api', null);
  form.restore();
  const rel = sandbox.locateContentNode('shop.web.api').node.relationships[0];
  assert.ok(!('label' in rel), 'no `label: uses` was written');
  assert.ok(!sandbox.locateContentNode('shop.web.api').mf.rawText.includes('uses'));
});

test('a label is written when typed and dropped when emptied', async () => {
  const { sandbox } = await openFixtureMem();
  let form = fakeForm(sandbox, 'shop.web.api', { rows: { 0: { label: ' reads ' }, 1: { label: '' } } });
  sandbox.commitElementWithDraft('shop.web.api', null);
  form.restore();
  const rels = sandbox.locateContentNode('shop.web.api').node.relationships;
  assert.equal(rels[0].label, 'reads');
  assert.ok(!('label' in rels[1]));
});

const COMMAS = {
  'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
  'manifests/app.a.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "a"\n  relationships:\n    - destination: "b"\n      label: "talks"\n      qualifiers:\n        - "A, B"\n        - "C"\n      tags:\n        ports: "80,443"\n        mode: "x"\n',
  'manifests/app.b.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "b"\n'
};

test('qualifiers and tags with commas in them survive a save of the form, and are split only when edited', async () => {
  const { sandbox } = await openMem(COMMAS);
  let form = fakeForm(sandbox, 'a');
  sandbox.commitElementWithDraft('a', null);
  form.restore();
  let rel = sandbox.locateContentNode('a').node.relationships[0];
  same(Array.from(rel.qualifiers), ['A, B', 'C']);
  assert.equal(rel.tags.ports, '80,443');

  form = fakeForm(sandbox, 'a', { rows: { 0: { qualifiers: 'X, Y' } } });
  sandbox.commitElementWithDraft('a', null);
  form.restore();
  rel = sandbox.locateContentNode('a').node.relationships[0];
  same(Array.from(rel.qualifiers), ['X', 'Y'], 'an edited field is parsed');
  assert.equal(rel.tags.ports, '80,443', 'the field that was not edited is not');

  form = fakeForm(sandbox, 'a', { rows: { 0: { qualifiers: '', tags: '' } } });
  sandbox.commitElementWithDraft('a', null);
  form.restore();
  rel = sandbox.locateContentNode('a').node.relationships[0];
  assert.ok(!('qualifiers' in rel) && !('tags' in rel), 'emptied fields leave no empty key');
});

test('a relationship added through the form carries only what was typed', async () => {
  const { sandbox } = await openMem(COMMAS);
  const built = sandbox.applyRelationshipDraft({}, { destination: 'b', label: undefined, qualifiers: [], tags: {} });
  same(JSON.parse(JSON.stringify(built)), { destination: 'b' });
  const full = sandbox.applyRelationshipDraft({}, { destination: 'b', label: 'x', qualifiers: ['Q'], tags: { k: 'v' } });
  same(JSON.parse(JSON.stringify(full)), { destination: 'b', label: 'x', qualifiers: ['Q'], tags: { k: 'v' } });
});

test('a tag key like __proto__ is kept as a key', async () => {
  const { sandbox } = await openMem(COMMAS);
  const parsed = sandbox.parseCommaKvList('__proto__=x, a=1');
  same(Object.keys(parsed), ['__proto__', 'a']);
  assert.equal(Object.getOwnPropertyDescriptor(parsed, '__proto__').value, 'x');
  const copy = sandbox.copyOwnKeys(parsed);
  same(Object.keys(copy), ['__proto__', 'a']);
  same(Object.keys(sandbox.kernelTagsOf(parsed)), ['__proto__', 'a']);
});

// ---- 8. the kernel input is made of strings ----

const NUMBERS = {
  'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
  'manifests/app.a.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "a"\n  elements:\n    - kind: "container"\n      id: "c1"\n      relationships:\n        - destination: "p.c2"\n          label: 5\n          qualifiers:\n            - 8080\n            - "x"\n          tags:\n            port: 8080\n            tls: true\n        - destination: 8080\n',
  'manifests/app.p.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "p"\n  elements:\n    - kind: "container"\n      id: "c2"\n',
  'manifests/app.8080.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: 8080\n',
  'manifests/env.e.yaml': 'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "e"\n  elements:\n    - kind: "node"\n      id: "n"\n      applications:\n        - "a.c1"\n        - 8080\n'
};

test('numbers and booleans of the YAML reach the kernel as strings, and the diagram is drawn', async () => {
  const { sandbox, state } = await openMem(NUMBERS);
  const kernel = await sandbox.loadViewpointKernel();
  assert.equal(state.relationshipStats.dangling, 0, 'a numeric destination names the element with that id');

  const overview = sandbox.buildKernelInput('overview', 'a.c1').input;
  const rels = overview.elements.find((e) => e.reference === 'a.c1').relationships;
  assert.equal(rels[0].label, '5');
  same(rels[0].qualifiers, ['8080', 'x']);
  same(rels[0].tags, { port: '8080', tls: 'true' });
  assert.equal(rels[1].destination, '8080');
  assert.equal(kernel.compute(overview).error, undefined);

  const deep = sandbox.buildKernelInput('deep', 'e.n').input;
  same(deep.elements.find((e) => e.reference === 'e.n').applications, ['a.c1', '8080']);
  assert.equal(kernel.compute(deep).error, undefined);
  assert.equal(kernel.compute(sandbox.buildKernelInput('map', null, {}).input).error, undefined);
});

// ---- 9. the save ----

async function editedCustomer(opened) {
  const ws = opened || await openFixtureMem();
  ws.sandbox.commitElementEdit('customer', (node) => { node.name = 'Customer, edited'; });
  return ws;
}

test('a save in flight ignores a second one, and the button is disabled meanwhile', async () => {
  const { sandbox, state, mem } = await editedCustomer();
  let busyDuringWrite = null;
  mem.onWrite = async () => {
    busyDuringWrite = ev(sandbox, 'saveInFlight');
    await new Promise((resolve) => setTimeout(resolve, 5));
  };
  const first = sandbox.saveAllChanges();
  const second = sandbox.saveAllChanges();
  await Promise.all([first, second]);
  assert.equal(busyDuringWrite, true);
  same(mem.writes, ['manifests/app.customer.yaml'], 'written once');
  assert.equal(ev(sandbox, 'saveInFlight'), false);
  assert.equal(ev(sandbox, 'saveStatus').state, 'success');
  assert.equal(manifest(state, 'manifests/app.customer.yaml').dirty, false);

  ev(sandbox, 'saveInFlight = true');
  assert.match(sandbox.renderTopPanelHtml(), /data-action="save-all-changes"[^>]*disabled/);
  ev(sandbox, 'saveInFlight = false');
});

test('an edit made while saving stays to be saved', async () => {
  const { sandbox, state, mem } = await editedCustomer();
  let edited = false;
  mem.onWrite = async () => {
    if (edited) return;
    edited = true;
    sandbox.commitElementEdit('customer', (node) => { node.name = 'Customer, edited again'; });
  };
  await sandbox.saveAllChanges();
  const file = manifest(state, 'manifests/app.customer.yaml');
  assert.equal(file.dirty, true, 'the second edit was not written');
  assert.match(file.rawText, /edited again/);
  assert.doesNotMatch(mem.files.get('manifests/app.customer.yaml').text, /edited again/);
  assert.match(ev(sandbox, 'saveStatus').message, /not saved yet/);
  assert.ok(sandbox.hasUnsavedChanges());

  mem.onWrite = null;
  await sandbox.saveAllChanges();
  assert.equal(ev(sandbox, 'saveStatus').state, 'success', 'the baseline of the first write is kept, so the second save is not a conflict');
  assert.match(mem.files.get('manifests/app.customer.yaml').text, /edited again/);
  assert.equal(file.dirty, false);
});

test('a failure while checking the files on disk is shown, and nothing is written', async () => {
  const { sandbox, mem } = await editedCustomer();
  mem.failGetFile = 'the server was restarted';
  await sandbox.saveAllChanges();
  const status = ev(sandbox, 'saveStatus');
  assert.equal(status.state, 'error');
  assert.match(status.message, /server was restarted/);
  assert.match(status.message, /Nothing was saved/);
  same(mem.writes, []);
  assert.equal(ev(sandbox, 'saveInFlight'), false);
});

test('a workspace without its manifests directory gets one when the first element is saved', async () => {
  const { sandbox, mem } = await openMem({ 'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n' });
  sandbox.commitCreateTopLevelElement({ category: 'application', headerKind: 'solution', attachUnderReference: null, id: 'first', name: 'First', description: null });
  await sandbox.saveAllChanges();
  assert.equal(ev(sandbox, 'saveStatus').state, 'success');
  assert.ok(mem.dirs.has('manifests'));
  assert.match(mem.files.get('manifests/app.first.yaml').text, /First/);
});

test('a manifests path such as ./manifests is normalised, and read once', async () => {
  const files = fixtureFiles();
  files['workspace.yaml'] = 'settings:\n  manifests:\n    paths:\n      - ./manifests\n      - manifests/\n';
  const { sandbox, state } = await openMem(files);
  assert.equal(state.manifestFiles.length, 7);
  assert.ok(state.manifestFiles.every((f) => f.relPath.startsWith('manifests/')));
  assert.equal(sandbox.normalizeRelDir('./a//b/'), 'a/b');
  assert.equal(sandbox.normalizeRelDir('.'), '');
  assert.equal(sandbox.normalizeRelDir('../x'), null);
  const created = sandbox.commitCreateTopLevelElement({ category: 'technology', headerKind: 'environment', attachUnderReference: null, id: 'dev', name: null, description: null });
  assert.equal(created.relPath, 'manifests/env.dev.yaml');
});

test('only .yaml and .yml are manifests, as the CLI reads them', async () => {
  const files = fixtureFiles();
  files['manifests/app.upper.YAML'] = SOLUTION('upper');
  files['manifests/app.other.yml'] = SOLUTION('other');
  files['manifests/app.old.yaml.bak'] = SOLUTION('old');
  const { state } = await openMem(files);
  assert.ok(state.index.application.has('other'));
  assert.ok(!state.index.application.has('upper'));
  assert.ok(!state.index.application.has('old'));
});

// ---- 5. the environments an environment uses ----

const USES = {
  'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
  'manifests/env.dev.yaml': ENVIRONMENT('dev', '  uses:\n    - "int"\n    - "int.n1"\n  elements:\n    - kind: "node"\n      id: "n"\n'),
  'manifests/env.int.yaml': ENVIRONMENT('int', '  elements:\n    - kind: "node"\n      id: "n1"\n    - kind: "node"\n      id: "n2"\n'),
  'manifests/env.prd.yaml': ENVIRONMENT('prd', '  elements:\n    - kind: "node"\n      id: "n1"\n')
};

test('what an environment uses is read, and is the kernel input of its environment only', async () => {
  const { sandbox, state } = await openMem(USES);
  same(state.index.technology.get('dev').uses, ['int', 'int.n1']);
  same(state.index.technology.get('int').uses, []);
  const input = sandbox.buildKernelInput('deep', 'dev', 'technology').input;
  same(input.elements.find((e) => e.reference === 'dev').uses, ['int', 'int.n1']);
  same(input.elements.find((e) => e.reference === 'prd').uses, []);
});

test('a new used environment has to be an environment or a node, not already used, and not inside the environment', async () => {
  const { sandbox } = await openMem(USES);
  const check = (value) => sandbox.validateNewUse('dev', value);
  same(check('  prd '), { valid: true, value: 'prd' });
  same(check('prd.n1'), { valid: true, value: 'prd.n1' });
  assert.equal(check('').valid, false);
  assert.match(check('nowhere').error, /No environment or node/);
  assert.match(check('int').error, /already used/);
  assert.match(check('dev').error, /itself/);
  assert.match(check('dev.n').error, /itself or what it contains/);
});

test('adding and removing a used environment edits the content of the environment', async () => {
  const { sandbox, state } = await openMem(USES);
  sandbox.commitElementEdit('dev', (node) => { node.uses = node.uses.concat(['prd']); });
  same(state.index.technology.get('dev').uses, ['int', 'int.n1', 'prd']);
  assert.equal(manifest(state, 'manifests/env.dev.yaml').dirty, true);
  assert.equal(manifest(state, 'manifests/env.prd.yaml').dirty, false);
  assert.match(sandbox.renderElementEditionFormHtml('dev'), /data-action="remove-use"[^>]*data-index="2"/);
  assert.doesNotMatch(sandbox.renderElementEditionFormHtml('int.n1'), /add-use-input/, 'only an environment has a Uses section');
});

test('renaming an environment or a node rewrites the uses that point to it', async () => {
  const { sandbox, state } = await openMem(USES);
  sandbox.commitElementEdit('int', (node) => { node.id = 'integration'; return { renamedTo: { from: 'int', to: 'integration' } }; });
  same(state.index.technology.get('dev').uses, ['integration', 'integration.n1']);
  assert.equal(manifest(state, 'manifests/env.dev.yaml').dirty, true);
  assert.equal(sandbox.parseManifestText(manifest(state, 'manifests/env.dev.yaml').rawText).content.uses[0], 'integration', 'the text to save is regenerated');
  assert.equal(state.relationshipStats.dangling, 0);
});

test('deleting an environment or a node takes it off the uses, and says so first', async () => {
  const { sandbox, state } = await openMem(USES);
  const impact = sandbox.computeDeleteImpact('int.n1', 'technology');
  assert.ok(impact.affected.some((a) => a.ownerReference === 'dev' && a.label === 'uses' && a.destination === 'int.n1'));
  sandbox.commitDeleteElement('int.n1', 'technology', impact.affected);
  same(state.index.technology.get('dev').uses, ['int']);

  sandbox.commitDeleteElement('int', 'technology', []);
  same(state.index.technology.get('dev').uses, []);
  assert.equal('uses' in manifest(state, 'manifests/env.dev.yaml').content, false, 'an empty list is not written');
});

test('the details of an element link to its parent, its children and, for an environment, what it uses', async () => {
  const { sandbox } = await openMem(USES);
  const link = (ref, layer) => new RegExp('data-action="goto-element" data-ref="' + ref + '" data-layer="' + layer + '"');

  const environment = sandbox.renderElementViewHtml('dev');
  assert.match(environment, /field-label">Parent<\/span><span class="field-value"><span class="muted">none<\/span>/, 'a root has no parent, and says so');
  assert.match(environment, link('dev.n', 'technology'), 'its child');
  assert.match(environment, link('int', 'technology'), 'what it uses');
  assert.match(environment, link('int.n1', 'technology'));

  const node = sandbox.renderElementViewHtml('int.n1');
  assert.match(node, /field-label">Parent<\/span><span class="field-value"><button[^>]*data-ref="int"[^>]*>int<\/button> <span class="element-kind-badge">environment</);
  assert.match(node, /field-label">Children<\/span><span class="field-value"><span class="muted">none/, 'a leaf has no children, and says so');
  assert.doesNotMatch(node, /field-label">Uses/, 'only an environment uses');
});

test('the details of an element of the application layer link to the application layer', async () => {
  const { sandbox } = await openFixtureMem();
  const html = sandbox.renderElementViewHtml('shop.web');
  assert.match(html, /data-ref="shop" data-layer="application"/, 'the parent, which a manifest attached with header.parent lands on');
  assert.match(html, /data-ref="shop.web.frontend" data-layer="application"/);
});

test('the title of the page is the editor, then the folder whose workspace is loaded', async () => {
  const { sandbox, state } = await openMem(USES);
  ev(sandbox, 'window.showDirectoryPicker = function () {}; window.indexedDB = {};'); // a browser that can open a folder
  state.folder.name = 'archi';
  ev(sandbox, 'render()');
  assert.equal(ev(sandbox, 'document.title'), 'ArchiCode Editor archi');

  state.workspace = null; // nothing loaded and the browser wants a click first: the landing screen, whatever folder is remembered
  state.permissionState = 'needs-click';
  ev(sandbox, 'render()');
  assert.equal(ev(sandbox, 'document.title'), 'ArchiCode Editor');
});

test('the details of a node link to the applications it hosts, and only to those', async () => {
  const { sandbox, state } = await openMem(Object.assign({}, TWO_LAYERS, {
    'manifests/env.big.yaml': ENVIRONMENT('big', '  elements:\n    - kind: "node"\n      id: "a"\n      applications:\n        - "epr.core"\n      elements:\n        - kind: "node"\n          id: "b"\n          applications:\n            - "nowhere"\n')
  }));
  const app = (ref) => new RegExp('data-ref="' + ref + '" data-layer="application"');

  state.selection = { kind: 'element', key: 'big.a', layer: 'technology', mode: 'view' };
  const node = sandbox.renderElementViewHtml('big.a');
  assert.match(node, /field-label">Applications/);
  assert.match(node, app('epr.core'), 'what the node hosts');
  assert.doesNotMatch(node, /nowhere/, 'not what the nodes inside it host');

  state.selection = { kind: 'element', key: 'big.a.b', layer: 'technology', mode: 'view' };
  assert.match(sandbox.renderElementViewHtml('big.a.b'), /nowhere<span class="dangling-badge">/, 'an application that does not exist is flagged');

  state.selection = { kind: 'element', key: 'big', layer: 'technology', mode: 'view' };
  assert.doesNotMatch(sandbox.renderElementViewHtml('big'), /field-label">Applications/, 'an environment hosts nothing itself, the row is not for it');

  state.selection = { kind: 'element', key: 'epr', layer: 'application', mode: 'view' };
  assert.doesNotMatch(sandbox.renderElementViewHtml('epr'), /field-label">Applications/, 'an application element has none');
});

test('the details of every element follow the same rules: the same rows in the same order, a reference is always a link and its kind', async () => {
  const { sandbox } = await openMem(Object.assign({}, TWO_LAYERS, {
    'manifests/env.big.yaml': ENVIRONMENT('big', '  uses:\n    - "epr"\n    - "gone"\n  elements:\n    - kind: "node"\n      id: "a"\n      applications:\n        - "epr.core"\n        - "nowhere"\n')
  }));
  const labels = (html) => [...html.matchAll(/field-label">([A-Za-z]+)/g)].map((m) => m[1]);
  const base = ['Id', 'Reference', 'Name', 'Description', 'Qualifiers', 'Tags', 'Parent', 'Children'];

  assert.deepEqual(labels(sandbox.renderElementViewHtml('big')), base.concat(['Uses', 'Relationships']));
  assert.deepEqual(labels(sandbox.renderElementViewHtml('big.a')), base.concat(['Applications', 'Relationships']));
  assert.deepEqual(labels(sandbox.renderElementViewHtml('epr')), base.concat(['Relationships']));
  assert.doesNotMatch(sandbox.renderElementViewHtml('big'), /element-quantitative|class="stat"/, 'the counts are in the labels');

  const environment = sandbox.renderElementViewHtml('big');
  assert.match(environment, /field-label">Children <span class="field-count">1</);
  assert.match(environment, /field-label">Uses <span class="field-count">2</);
  assert.match(environment, /data-ref="epr"[^>]*>epr<\/button> <span class="element-kind-badge">environment</, 'a link, then the kind of what it points at');
  assert.match(environment, /gone<span class="dangling-badge">dangling/, 'a reference that leads nowhere says so');

  const node = sandbox.renderElementViewHtml('big.a');
  assert.match(node, /data-ref="epr.core" data-layer="application">epr.core<\/button> <span class="element-kind-badge">/);
  assert.match(node, /nowhere<span class="dangling-badge">dangling/);
});

test('an element without any relationship has no Overview to open, while Detailed and Deep still have its content to show', async () => {
  const { sandbox, state } = await openMem(USES);
  state.selection = { kind: 'element', key: 'prd', layer: 'technology', mode: 'view' };
  ev(sandbox, "currentPerspective = 'elements'; elementTab = 'details'; diagramFacet = null;");
  const list = ['details', 'overview', 'detailed', 'deep'].map((tab) => ({ tab, disabled: false, title: '', getAttribute: () => tab }));
  sandbox.document.querySelector = () => ({ querySelectorAll: () => list });
  await sandbox.markElementTabs();
  assert.deepEqual(list.filter((b) => b.disabled).map((b) => b.tab), ['overview']);
});

test('the navigation sorts its rows by kind (solution, system, container, component...) then by name, wherever the manifests put them', async () => {
  const { sandbox } = await openMem({
    'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n',
    'manifests/sol.yaml': SOLUTION('zeta', '  elements:\n    - kind: "system"\n      id: "b"\n      name: "Beta"\n    - kind: "person"\n      id: "p"\n      name: "Pat"\n    - kind: "system"\n      id: "a"\n      name: "alpha"\n    - kind: "system"\n      id: "c"\n'),
    'manifests/sol2.yaml': SOLUTION('alpha'),
    'manifests/env.yaml': ENVIRONMENT('e2', '  elements:\n    - kind: "node"\n      id: "n2"\n    - kind: "node"\n      id: "n1"\n')
  });
  ev(sandbox, "treeExpandedApplications = true; treeExpandedEnvironments = true;");
  const rows = (html) => [...html.matchAll(/data-node="([^"]+)"/g)].map((m) => m[1]);
  const kinds = (ref) => ev(sandbox, 'AppState.index.application.get(' + JSON.stringify(ref) + ').kind');
  // top level: both solutions by name; then, once zeta is open, its children by kind then name
  ev(sandbox, "AppState.expanded.add('zeta'); AppState.expanded.add('e2');");
  const nav = sandbox.renderElementsNavHtml(true);
  assert.deepEqual(rows(nav), ['alpha', 'zeta', 'zeta.a', 'zeta.b', 'zeta.c', 'zeta.p', 'e2', 'e2.n1', 'e2.n2']);
  assert.equal(kinds('zeta.p'), 'person');
});

test('a facet that hides the elements with no link is read, given to the kernel, and written back only when it is on', async () => {
  const { sandbox, state } = await openMem(Object.assign({}, USES, {
    'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n  facets:\n    customs:\n      - name: "flow"\n        hide-unlinked: true\n        actions:\n          - operator: "REMOVE"\n            json-path: "$.application..relationships[?(@.tags.x != \'y\')]"\n      - name: "plain"\n        actions: []\n'
  }));
  const [flow, plain] = state.workspace.settings.facets.customs;
  assert.equal(flow.hideUnlinked, true);
  assert.equal(plain.hideUnlinked, false);
  assert.equal(sandbox.buildKernelInput('overview', 'dev', { facet: flow }).input.facet.hide_unlinked, true);
  assert.equal(sandbox.buildKernelInput('overview', 'dev', { facet: plain }).input.facet.hide_unlinked, false);

  const written = ev(sandbox, 'JSON.parse(JSON.stringify(serializeManagedSettings(AppState.workspace.settings).facets.customs))');
  assert.equal(written[0]['hide-unlinked'], true);
  assert.equal('hideUnlinked' in written[0], false, 'the key of the file, not the one of the model');
  assert.equal('hide-unlinked' in written[1], false, 'nothing written for the default');
  assert.equal(written[0].actions[0]['json-path'].startsWith('$.application'), true);
});
