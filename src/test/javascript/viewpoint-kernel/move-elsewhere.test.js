'use strict';
// Moving an element wherever it can go (wave 015, run 0104; #43, #44 and #97): a nested element goes to a parent declared in another file (its block is cut out of one file
// and pasted in the other, with its comments and quotes, and both files are marked modified), to the top level (it gets a manifest of its own), and the dialog says why
// each place that is not offered is not. A move writes no `replaces`. Everything here is the real page, with the real kernel, on in-memory folders; the texts of the files are
// compared byte for byte. Everything is invented: an orchard, a market, a guild, a barn.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');
const { layeredFiles, openLayered, inPlateau } = require('./layered-folders');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
const TOP = ' top level'; // MOVE_TOP_LEVEL

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

// ---- an invented workspace: comments, quotes, flow lists, a text over several lines, files of every shape ----

const ORCHARD = [
  '# the orchard: everything that grows',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "orchard"',
  '  name: "Orchard"',
  '  elements:',
  '    # the press comes first',
  '    - kind: container',
  '      id: "press"',
  '      name: "Press"',
  '      description: "Presses \\"the\\" apples: 12 bars, no more."   # why',
  '      qualifiers: [Steel, "Oak"]',
  '      elements:',
  '        - kind: component',
  '          id: "screw"',
  '          name: "Screw"',
  '          relationships:',
  '            - destination: "orchard.cellar"',
  '              label: "feeds: the cellar"',
  '        # the vat, which holds',
  '        - kind: component',
  '          id: "vat"',
  "          name: 'Vat'",
  '    # the cellar is on its own',
  '    - kind: container',
  '      id: "cellar"',
  '      name: "Cellar"',
  '      relationships:',
  '        - destination: "orchard.press.screw"',
  '          label: "checks"',
  '# end of the orchard',
  ''
].join('\n');
const MARKET = [
  '# the market',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "market"',
  '  name: "Market"',
  '  elements:',
  '    # a stall',
  '    - kind: container',
  '      id: "stall"',
  '      name: "Stall"',
  '# end of the market',
  ''
].join('\n');
const GUILD = [
  '# the guild',
  'header:',
  '  kind: "archicode.morin.io/solution"',
  '  version: "1"',
  '',
  'content:',
  '  id: "guild"',
  '  name: "Guild"',
  '  elements:',
  '    # the kiosk, which sells',
  '    - kind: system',
  '      id: "kiosk"',
  '      name: "Kiosk"',
  '      description: |   # why',
  '        Sells the bread.',
  '',
  '        Cash only.',
  '      elements:',
  '        # the counter',
  '        - kind: container',
  '          id: "counter"',
  '          name: "Counter"',
  '          relationships:',
  '            - {destination: "guild.hall.door", label: "opens"}',
  '    - kind: system',
  '      id: "hall"',
  '      name: "Hall"',
  '      elements:',
  '        - kind: container',
  '          id: "door"',
  '          name: "Door"',
  '          relationships:',
  '            - destination: "guild.kiosk.counter"',
  '              label: "lets in"',
  '# end of the guild',
  ''
].join('\n');

function manifest(kind, parent, id, name, extra, eol) {
  return ('# the manifest of ' + id + '\nheader:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + '  version: "1"\n\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '') + '# end of ' + id + '\n').replace(/\n/g, eol || '\n');
}

const MANIFESTS = {
  'app.orchard.yaml': ORCHARD,
  'app.orchard.press.gasket.yaml': manifest('component', 'orchard.press', 'gasket', 'Gasket', '  relationships:\n    - destination: "orchard.cellar"\n      label: "seals"\n'),
  'app.market.yaml': MARKET,
  'app.market.till.yaml': manifest('container', 'market', 'till', 'Till', '', '\r\n'),
  'app.shipping.yaml': manifest('system', null, 'shipping', 'Shipping', '  relationships:\n    - destination: "orchard.press.screw"\n      label: "carries"\n    - destination: orchard.press\n      label: "loads"\n'),
  'app.guild.yaml': GUILD,
  'app.guild.annex.yaml': manifest('system', 'guild', 'annex', 'Annex'),
  'app.guild.annex.shed.yaml': manifest('container', 'guild.annex', 'shed', 'Shed', '  relationships:\n    - destination: "guild.kiosk"\n      label: "supplies"\n'),
  'env.barn.yaml': '# the barn\nheader:\n  kind: "archicode.morin.io/environment"\n  version: "1"\n\ncontent:\n  id: "barn"\n  name: "Barn"\n  elements:\n    - kind: node\n      id: "shelf"\n      name: "Shelf"\n      applications:\n        - orchard.press\n        - orchard.press.vat\n# end of the barn\n'
};

/** The workspace as the editor opens a folder: one plain folder of manifests, no plateau. */
async function openPlain(manifests) {
  const files = Object.assign({ 'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n' }, Object.fromEntries(Object.entries(manifests || MANIFESTS).map(([name, body]) => ['manifests/' + name, body])));
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem, original: files };
}
const fileOf = (page, name) => page.mem.files.get('manifests/' + name).text;
/** The names of the files whose text on disk is not the original. */
const changedFiles = (page) => Object.keys(MANIFESTS).filter((name) => page.mem.files.has('manifests/' + name) && fileOf(page, name) !== page.original['manifests/' + name]).concat(Array.from(page.mem.files.keys()).filter((p) => !(p in page.original)));
const move = (page, reference, parent, layer) => page.sandbox.commitMoveElement(reference, layer || 'application', parent);
/** What a refused move must leave alone: every manifest (model and text), the version of the models, the markers, the disk, the selection. */
function snapshot(page, options) {
  const files = page.state.manifestFiles.map((f) => [f.relPath, f.rawText, f.dirty, JSON.stringify([f.header, f.content])]);
  // a write the plateaus refuse is put back and the models are derived again: the version moves on, the caches are asked again; a move refused before it writes keeps it
  return JSON.stringify([files, options && options.version === false ? null : run(page.sandbox, 'modelVersion'), Array.from(page.state.dirtyReferences), page.mem.writes, page.state.selection, page.state.pendingFileRemovals]);
}
/** The workspace read again from the disk of `page`: what another session of the editor would see. */
async function reread(page, plateau) {
  const again = createApp({});
  await again.loadWorkspace(page.mem.handle);
  await again.loadViewpointKernel();
  if (plateau) again.drawPlateau(plateau);
  return again;
}

// ---- 1. A nested element goes to a parent declared in another file: the block is cut and pasted, both files are marked modified ----

test('a container goes to a system of another file: its block is cut out of one file and pasted in the other as it was written, comments, quotes and flow lists included', async () => {
  const page = await openPlain();
  const candidates = page.sandbox.moveParentCandidates('orchard.press', 'application');
  assert.deepEqual(plain(candidates.parents.map((p) => p.reference)), ['guild.annex', 'guild.hall', 'guild.kiosk', 'market', 'shipping'], 'every system, in any file');
  assert.deepEqual(plain(candidates.routes.market), { route: 'paste', file: 'manifests/app.market.yaml' });
  assert.deepEqual(plain(move(page, 'orchard.press', 'market')), { ok: true, reference: 'market.press' });
  // both files are marked modified, nothing is on disk yet
  const dirty = page.state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath).sort();
  assert.deepEqual(plain(dirty), ['manifests/app.market.yaml', 'manifests/app.orchard.press.gasket.yaml', 'manifests/app.orchard.yaml', 'manifests/app.shipping.yaml', 'manifests/env.barn.yaml']);
  assert.deepEqual(page.mem.writes, []);
  assert.equal(page.state.dirtyReferences.has('application:market.press'), true);
  await page.sandbox.saveAllChanges();
  assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  assert.deepEqual(changedFiles(page).sort(), ['app.market.yaml', 'app.orchard.press.gasket.yaml', 'app.orchard.yaml', 'app.shipping.yaml', 'env.barn.yaml']);
  // the file it left: the block and its own comment are gone, the comment of the next element stays on it, the reference that pointed inside follows
  assert.equal(fileOf(page, 'app.orchard.yaml'), [
    '# the orchard: everything that grows', 'header:', '  kind: "archicode.morin.io/system"', '  version: "1"', '', 'content:', '  id: "orchard"', '  name: "Orchard"', '  elements:',
    '    # the cellar is on its own', '    - kind: container', '      id: "cellar"', '      name: "Cellar"', '      relationships:', '        - destination: "market.press.screw"', '          label: "checks"',
    '# end of the orchard', ''
  ].join('\n'));
  // the file it joined: the block as the author wrote it (the comment above it, the escaped quotes, the comment at the end of the line, the flow list, the single quotes), last child of the market
  assert.equal(fileOf(page, 'app.market.yaml'), [
    '# the market', 'header:', '  kind: "archicode.morin.io/system"', '  version: "1"', '', 'content:', '  id: "market"', '  name: "Market"', '  elements:', '    # a stall', '    - kind: container', '      id: "stall"', '      name: "Stall"',
    '    # the press comes first', '    - kind: container', '      id: "press"', '      name: "Press"', '      description: "Presses \\"the\\" apples: 12 bars, no more."   # why', '      qualifiers: [Steel, "Oak"]', '      elements:',
    '        - kind: component', '          id: "screw"', '          name: "Screw"', '          relationships:', '            - destination: "orchard.cellar"', '              label: "feeds: the cellar"',
    '        # the vat, which holds', '        - kind: component', '          id: "vat"', "          name: 'Vat'",
    '# end of the market', ''
  ].join('\n'));
  // what pointed at the element or inside it, in the other files: the lines that changed are those, and only those
  assert.deepEqual(lineDiff(MANIFESTS['app.orchard.press.gasket.yaml'], fileOf(page, 'app.orchard.press.gasket.yaml')), { removed: ['  parent: "orchard.press"'], added: ['  parent: "market.press"'] });
  assert.deepEqual(lineDiff(MANIFESTS['app.shipping.yaml'], fileOf(page, 'app.shipping.yaml')), { removed: ['    - destination: "orchard.press.screw"', '    - destination: orchard.press'], added: ['    - destination: "market.press.screw"', '    - destination: market.press'] });
  assert.deepEqual(lineDiff(MANIFESTS['env.barn.yaml'], fileOf(page, 'env.barn.yaml')), { removed: ['        - orchard.press', '        - orchard.press.vat'], added: ['        - market.press', '        - market.press.vat'] });
  assert.equal(fileOf(page, 'app.market.till.yaml'), MANIFESTS['app.market.till.yaml'], 'a file nothing points from is not touched');
  // the model: the element and what is inside it, at their new references; nothing dangles; the workspace read again from the disk says the same
  assert.equal(page.state.relationshipStats.dangling, 0);
  const again = await reread(page);
  assert.deepEqual(plain(Array.from(again.__state().index.application.keys()).sort()), plain(Array.from(page.state.index.application.keys()).sort()));
  for (const kept of ['market.press', 'market.press.screw', 'market.press.vat', 'market.press.gasket']) assert.ok(again.__state().index.application.has(kept), kept);
  for (const gone of ['orchard.press', 'orchard.press.screw', 'orchard.press.vat', 'orchard.press.gasket']) assert.ok(!again.__state().index.application.has(gone), gone + ' is gone');
  assert.equal(again.__state().relationshipStats.dangling, 0);
});

test('the block is re-indented to its new depth, and takes the line breaks of the file it joins (a file with Windows line breaks stays one)', async () => {
  const page = await openPlain();
  assert.deepEqual(plain(move(page, 'orchard.press.vat', 'market.till')), { ok: true, reference: 'market.till.vat' });
  await page.sandbox.saveAllChanges();
  // the till is a manifest of its own, so its `elements` is two columns in: the block, which was eight, is four
  assert.equal(fileOf(page, 'app.market.till.yaml'), [
    '# the manifest of till', 'header:', '  kind: "archicode.morin.io/container"', '  parent: "market"', '  version: "1"', '', 'content:', '  id: "till"', '  name: "Till"', '  elements:',
    '    # the vat, which holds', '    - kind: component', '      id: "vat"', "      name: 'Vat'", '# end of till', ''
  ].join('\r\n'));
  assert.equal(fileOf(page, 'app.market.till.yaml').split('\r\n').length, fileOf(page, 'app.market.till.yaml').split('\n').length, 'every line break is \\r\\n');
  // the file it left: only the block (and the comment of the vat) went; the other children and the flow list stay as written
  assert.deepEqual(lineDiff(ORCHARD, fileOf(page, 'app.orchard.yaml')), { removed: ['        # the vat, which holds', '        - kind: component', '          id: "vat"', "          name: 'Vat'"], added: [] });
  // a parent deeper than the block is written the other way: one level in
  const deeper = await openPlain();
  assert.equal(move(deeper, 'orchard.press.vat', 'market.till').ok, true);
  assert.equal(move(deeper, 'orchard.press.screw', 'market.till').ok, true);
  await deeper.sandbox.saveAllChanges();
  assert.ok(!fileOf(deeper, 'app.orchard.yaml').includes('      elements:'), 'the last child leaving takes the `elements:` of its old parent with it: the container has no empty key');
  assert.ok(fileOf(deeper, 'app.market.till.yaml').includes('    - kind: component\r\n      id: "vat"\r\n') && fileOf(deeper, 'app.market.till.yaml').includes('    - kind: component\r\n      id: "screw"\r\n'));
});

test('a parent with no elements yet gets the key that opens the list, and a container with no children can go to another file as well', async () => {
  const withTools = Object.assign({}, MANIFESTS, { 'app.orchard.yaml': ORCHARD.replace('# end of the orchard', '    - kind: container\n      id: "tools"\n      name: "Tools"\n# end of the orchard') });
  const page = await openPlain(withTools);
  const first = move(page, 'orchard.tools', 'market');
  assert.deepEqual(plain(first), { ok: true, reference: 'market.tools' });
  const second = move(page, 'orchard.press.vat', 'market.stall');
  assert.deepEqual(plain(second), { ok: true, reference: 'market.stall.vat' });
  await page.sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(MARKET, fileOf(page, 'app.market.yaml')), {
    removed: [],
    added: ['      elements:', '        # the vat, which holds', '        - kind: component', '          id: "vat"', "          name: 'Vat'", '    - kind: container', '      id: "tools"', '      name: "Tools"']
  });
  const again = await reread(page);
  assert.ok(again.__state().index.application.has('market.stall.vat') && again.__state().index.application.has('market.tools'));
});

test('a layout the cut cannot follow (an anchor) is written as the emitter writes it: the move works, the files say the right thing, the comments of the block are the price', async () => {
  const anchored = Object.assign({}, MANIFESTS, { 'app.orchard.yaml': ORCHARD.replace('      name: "Press"\n', '      name: &n "Press"\n').replace('      id: "cellar"\n      name: "Cellar"', '      id: "cellar"\n      name: *n') });
  const page = await openPlain(anchored);
  assert.deepEqual(plain(move(page, 'orchard.press', 'market')), { ok: true, reference: 'market.press' });
  await page.sandbox.saveAllChanges();
  const again = await reread(page);
  const press = again.__state().index.application.get('market.press');
  assert.equal(press.name, 'Press');
  assert.deepEqual(plain(press.qualifiers), ['Steel', 'Oak']);
  assert.equal(press.description, 'Presses "the" apples: 12 bars, no more.');
  assert.deepEqual(plain(again.__state().index.application.get('market.press.screw').relationships.map((r) => r.destination)), ['orchard.cellar']);
  assert.equal(again.__state().relationshipStats.dangling, 0);
  assert.equal(fileOf(page, 'app.market.yaml').includes('# the press comes first'), false, 'the comment is not carried when the layout of a file cannot be followed: the emitter writes the block');
});

test('"Cancel" gives a move to another file up: both files are read again, nothing was written; a re-render after the move shows the element at its new place', async () => {
  const page = await openPlain();
  assert.equal(move(page, 'orchard.press', 'market').ok, true);
  const tree = page.sandbox.renderElementTreeHtml ? page.sandbox.renderElementTreeHtml() : null;
  if (tree !== null) assert.ok(tree.includes('market.press'), 'the tree draws the element under the market');
  assert.deepEqual(plain(page.state.index.application.get('market').children.map((c) => c.reference || c)).sort(), ['market.press', 'market.stall', 'market.till']);
  assert.ok(page.sandbox.countUnsavedChanges() > 0);
  page.sandbox.confirm = () => true;
  await page.sandbox.cancelChanges();
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  assert.deepEqual(page.mem.writes, []);
  assert.ok(page.state.index.application.has('orchard.press') && !page.state.index.application.has('market.press'));
  assert.deepEqual(changedFiles(page), []);
  assert.equal(page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.market.yaml').rawText, MARKET);
});

// ---- 2. To the top level: a manifest of its own for a nested element, one line less for an element that has one ----

test('a system nested in a solution goes to the top level: it gets a manifest of its own, written from its block, and what points at it follows', async () => {
  const page = await openPlain();
  const candidates = page.sandbox.moveParentCandidates('guild.kiosk', 'application');
  assert.deepEqual(plain(candidates.top), { route: 'extract', plateau: null });
  assert.deepEqual(plain(move(page, 'guild.kiosk', TOP)), { ok: true, reference: 'kiosk' });
  assert.ok(page.state.index.application.has('kiosk.counter') && !page.state.index.application.has('guild.kiosk'));
  assert.deepEqual(page.mem.writes, []);
  const created = page.state.manifestFiles.find((f) => f.relPath === 'manifests/app.kiosk.yaml');
  assert.equal(created.dirty, true);
  assert.equal(created.existedOnDisk, false);
  await page.sandbox.saveAllChanges();
  assert.equal(run(page.sandbox, 'saveStatus').state, 'success');
  // the new file: its block, with the comments, the text over several lines and the flow mapping it had, as the content of a manifest (the kind is in its header)
  assert.equal(fileOf(page, 'app.kiosk.yaml'), [
    'header:', '  kind: archicode.morin.io/system', '  version: "1"', 'content:', '  # the kiosk, which sells', '  id: "kiosk"', '  name: "Kiosk"', '  description: |   # why', '    Sells the bread.', '', '    Cash only.', '  elements:',
    '    # the counter', '    - kind: container', '      id: "counter"', '      name: "Counter"', '      relationships:', '        - {destination: "guild.hall.door", label: "opens"}', ''
  ].join('\n'));
  // the file it left: the block is gone, the reference of the next one follows
  const hall = GUILD.indexOf('    - kind: system\n      id: "hall"');
  assert.equal(fileOf(page, 'app.guild.yaml'), (GUILD.slice(0, GUILD.indexOf('    # the kiosk, which sells')) + GUILD.slice(hall)).replace('"guild.kiosk.counter"', '"kiosk.counter"'), 'the block goes with the comment above it, and the one line that pointed inside it follows');
  assert.ok(!fileOf(page, 'app.guild.yaml').includes('kiosk, which sells'));
  // an element attached to the system through a manifest of its own, and a destination in another file, follow
  assert.equal(page.state.relationshipStats.dangling, 0);
  const again = await reread(page);
  assert.deepEqual(plain(Array.from(again.__state().index.application.keys()).sort()), plain(Array.from(page.state.index.application.keys()).sort()));
  assert.equal(again.__state().index.application.get('kiosk').description, 'Sells the bread.\n\nCash only.\n');
  assert.deepEqual(plain(again.__state().index.application.get('guild.annex.shed').relationships.map((r) => r.destination)), ['kiosk']);
  assert.equal(again.__state().relationshipStats.dangling, 0);
});

test('an element with a manifest of its own goes to the top level by losing its header.parent line, and the manifests attached below it follow', async () => {
  const page = await openPlain();
  assert.deepEqual(plain(page.sandbox.moveParentCandidates('guild.annex', 'application').top), { route: 'header', plateau: null });
  assert.deepEqual(plain(move(page, 'guild.annex', TOP)), { ok: true, reference: 'annex' });
  await page.sandbox.saveAllChanges();
  assert.deepEqual(changedFiles(page).sort(), ['app.guild.annex.shed.yaml', 'app.guild.annex.yaml']);
  assert.deepEqual(lineDiff(MANIFESTS['app.guild.annex.yaml'], fileOf(page, 'app.guild.annex.yaml')), { removed: ['  parent: "guild"'], added: [] });
  assert.deepEqual(lineDiff(MANIFESTS['app.guild.annex.shed.yaml'], fileOf(page, 'app.guild.annex.shed.yaml')), { removed: ['  parent: "guild.annex"'], added: ['  parent: "annex"'] });
  // and back under the solution: the line comes back, and the references with it
  assert.equal(move(page, 'annex', 'guild').ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(fileOf(page, 'app.guild.annex.yaml'), MANIFESTS['app.guild.annex.yaml'].replace('  parent: "guild"\n  version: "1"\n', '  version: "1"\n  parent: "guild"\n'), 'the key goes after the lines the author wrote');
  assert.equal(fileOf(page, 'app.guild.annex.shed.yaml'), MANIFESTS['app.guild.annex.shed.yaml'], 'the shed is under guild.annex again, as it was');
});

test('the new manifest of a nested element has a name nothing uses, next to the file it left', async () => {
  const taken = Object.assign({}, MANIFESTS, { 'app.kiosk.yaml': manifest('person', null, 'visitor', 'Visitor') });
  const page = await openPlain(taken);
  assert.equal(move(page, 'guild.kiosk', TOP).ok, true);
  assert.ok(page.state.manifestFiles.some((f) => f.relPath === 'manifests/app.kiosk-2.yaml'), 'app.kiosk.yaml is taken by another element');
  await page.sandbox.saveAllChanges();
  assert.equal(fileOf(page, 'app.kiosk.yaml'), taken['app.kiosk.yaml'], 'the file that was there is not touched');
  assert.ok(fileOf(page, 'app.kiosk-2.yaml').startsWith('header:\n  kind: archicode.morin.io/system\n'));
});

test('what is never at the top level says so: a container, a component, a node; an element already there; an id the top level already holds', async () => {
  const page = await openPlain();
  const reason = (reference, layer) => plain(page.sandbox.moveParentCandidates(reference, layer || 'application').top.reason);
  assert.equal(reason('orchard.press'), 'A container is never at the top level: the application layer holds only person, solution and system there.');
  assert.equal(reason('orchard.press.vat'), 'A component is never at the top level: the application layer holds only person, solution and system there.');
  assert.equal(reason('barn.shelf', 'technology'), 'A node is never at the top level: the technology layer holds only environment there.');
  assert.equal(reason('orchard'), '“orchard” is already at the top level.');
  assert.equal(reason('barn', 'technology'), '“barn” is already at the top level.');
  const clash = await openPlain(Object.assign({}, MANIFESTS, { 'app.kiosk.yaml': manifest('person', null, 'kiosk', 'Another kiosk') }));
  assert.equal(plain(clash.sandbox.moveParentCandidates('guild.kiosk', 'application').top.reason), 'The top level already holds an element with the id “kiosk”; rename one of the two first.');
  // a move that is refused says it, changes nothing, and is not offered by the dialog
  for (const [reference, layer, sentence] of [['orchard.press', 'application', /^A container is never at the top level/], ['orchard', 'application', /^“orchard” is already at the top level\./], ['barn.shelf', 'technology', /^A node is never at the top level/]]) {
    const before = snapshot(page);
    const refused = move(page, reference, TOP, layer);
    assert.equal(refused.ok, false, reference);
    assert.match(refused.message, sentence);
    assert.match(refused.message, /Nothing was changed\.$/);
    assert.equal(snapshot(page), before, reference + ': nothing changed');
  }
  // the kinds that may be there are the ones the layer holds, and the creation form's table says the same
  assert.deepEqual(plain(run(page.sandbox, "topLevelKindsOf('application')")), ['person', 'solution', 'system']);
  assert.deepEqual(plain(run(page.sandbox, "topLevelKindsOf('technology')")), ['environment']);
  for (const layer of ['application', 'technology']) assert.deepEqual(plain(run(page.sandbox, "topLevelKindsOf('" + layer + "')")).sort(), plain(run(page.sandbox, 'TOP_LEVEL_BLANK_ATTACH_ALLOWED.' + layer)).slice().sort());
  assert.equal(run(page.sandbox, 'MOVE_TOP_LEVEL'), TOP);
});

test('an element whose id has a "/" or a "\\" in it cannot get a manifest of its own, whose name would be a folder: the sentence says so, and nothing is written', async () => {
  const odd = Object.assign({}, MANIFESTS, { 'app.guild.yaml': GUILD.replace('id: "kiosk"', 'id: "kiosk/2"').replace(/guild\.kiosk/g, 'guild.kiosk/2') });
  const page = await openPlain(odd);
  const { top } = page.sandbox.moveParentCandidates('guild.kiosk/2', 'application');
  assert.equal(plain(top.reason), 'A manifest of its own is needed for “guild.kiosk/2” there, and its reference “kiosk/2” has a “/” or a “\\” in it, which cannot be in the name of a file: rename the element first.');
  const before = snapshot(page);
  assert.equal(move(page, 'guild.kiosk/2', TOP).ok, false);
  assert.equal(snapshot(page), before);
});

// ---- 3. Why not: every place that is not offered says why, in one sentence ----

test('every element of the layer is offered as a parent or has one sentence that says why not, and the top level too', async () => {
  const page = await openPlain();
  let said = 0;
  for (const layer of ['application', 'technology']) {
    for (const reference of Array.from(page.state.index[layer].keys())) {
      const { parents, excluded, top } = page.sandbox.moveParentCandidates(reference, layer);
      const everything = Array.from(page.state.index[layer].keys()).sort();
      const listed = plain(parents.map((p) => p.reference).concat(excluded.map((e) => e.reference))).sort();
      assert.deepEqual(listed, everything, reference + ': nothing is left out without a word (' + layer + ')');
      assert.equal(new Set(listed).size, listed.length, reference + ': nothing is both offered and refused');
      for (const entry of excluded) {
        assert.match(entry.reason, /^[^\n]+\.$/, entry.reference + ': one sentence');
        assert.ok(entry.reason.includes(entry.reference) || entry.reason.includes(reference), 'the sentence names the place: ' + entry.reason);
        said++;
      }
      assert.ok(top.route ? !top.reason : /^[^\n]+\.$/.test(top.reason), reference + ': the top level is offered or says why not');
    }
  }
  assert.ok(said > 30);
});

test('each reason is the sentence of its rule: the element itself, what it contains, its parent now, a parent that cannot hold the kind, an id already held, a reference declared twice', async () => {
  const twice = Object.assign({}, MANIFESTS, { 'app.market.dup.yaml': manifest('container', 'market', 'stall', 'A second stall') });
  const page = await openPlain(Object.assign({}, MANIFESTS, { 'app.orchard.cart.yaml': manifest('component', 'orchard.press', 'cart', 'Cart') }));
  const reasons = (reference, layer) => Object.fromEntries(plain(page.sandbox.moveParentCandidates(reference, layer || 'application').excluded.map((e) => [e.reference, e.reason])));
  const press = reasons('orchard.press');
  assert.equal(press['orchard.press'], '“orchard.press” is the element itself: an element cannot be moved into itself.');
  assert.equal(press['orchard.press.screw'], '“orchard.press.screw” is inside “orchard.press”: an element cannot be moved into what it contains.');
  assert.equal(press.orchard, '“orchard.press” is already under “orchard”.');
  assert.equal(press['orchard.cellar'], 'A container cannot be put under “orchard.cellar”, which holds component only.');
  assert.equal(press['orchard.press.vat'], '“orchard.press.vat” is inside “orchard.press”: an element cannot be moved into what it contains.');
  const vat = reasons('orchard.press.vat');
  assert.equal(vat['guild.kiosk.counter'], undefined, 'a container can hold the component: it is offered');
  assert.equal(vat['orchard.press.screw'], 'A component cannot be put under “orchard.press.screw”, a component that holds nothing.');
  assert.equal(vat['orchard'], 'A component cannot be put under “orchard”, which holds container only.');
  // an id the new parent already holds
  const same = await openPlain(Object.assign({}, MANIFESTS, { 'app.market.yaml': MARKET.replace('      name: "Stall"\n', '      name: "Stall"\n      elements:\n        - kind: component\n          id: "vat"\n          name: "A vat of the stall"\n') }));
  assert.equal(plain(same.sandbox.moveParentCandidates('orchard.press.vat', 'application').excluded.find((e) => e.reference === 'market.stall').reason), '“market.stall” already holds an element with the id “vat” (“market.stall.vat”); rename one of the two first.');
  // a reference declared twice cannot be told from itself: not a parent
  const dup = await openPlain(twice);
  const dupReasons = Object.fromEntries(plain(dup.sandbox.moveParentCandidates('orchard.press.vat', 'application').excluded.map((e) => [e.reference, e.reason])));
  assert.match(dupReasons['market.stall'], /^“market\.stall” is declared twice \(.*app\.market\.dup\.yaml.*\): which of the two is the parent is not for the editor to guess\.$/);
  // the dialog tells the same sentences, under the list, and the search narrows them
  const shown = await openPlain();
  shown.state.selection = { kind: 'element', key: 'orchard.press', layer: 'application', mode: 'edit' };
  shown.sandbox.openMoveDialog();
  const dialog = shown.sandbox.renderAppDialogHtml();
  const { excluded } = shown.sandbox.moveParentCandidates('orchard.press', 'application');
  const topWords = text(dialog).includes('Top level: A container is never at the top level');
  assert.ok(topWords, 'the top level is in the list of what is not offered, with its reason');
  assert.match(text(dialog), new RegExp((excluded.length + 1) + ' places are not offered, and why'));
  for (const entry of excluded) assert.ok(text(dialog).includes(entry.reason.replace(/\s+/g, ' ')), entry.reason);
  assert.equal((dialog.match(/<li data-search/g) || []).length, excluded.length + 1);
  run(shown.sandbox, "appDialog.query = 'screw'");
  const narrowed = shown.sandbox.renderAppDialogHtml();
  assert.equal((narrowed.match(/<li data-search="[^"]*"( hidden)?>/g) || []).filter((tag) => !tag.endsWith('hidden>')).length, 1, 'only the sentence about the screw shows');
});

test('a container goes under a parent of another plateau as a manifest of its own, which has a kind of its own to say', async () => {
  // `later` overrides `early`; the container is declared by `later`, the system it could go under by `early`
  const plateaus = [{ id: 'early', name: 'Early', path: 'plateaus/10_early' }, { id: 'later', name: 'Later', path: 'plateaus/20_later', override: 'early' }];
  const files = layeredFiles(plateaus, { 'plateaus/10_early/app.market.yaml': MARKET, 'plateaus/20_later/app.orchard.yaml': ORCHARD });
  const page = await openLayered(createApp, memFolder, files, { drawn: 'later' });
  assert.equal(page.state.layerProblems, null);
  const press = page.sandbox.moveParentCandidates('orchard.press', 'application');
  assert.deepEqual(plain(press.routes.market), { route: 'extract', plateau: 'early' });
});

// ---- 4. The dialog ----

test('the dialog offers the top level first, says how each place is written, and moves there', async () => {
  const page = await openPlain();
  page.state.selection = { kind: 'element', key: 'guild.kiosk', layer: 'application', mode: 'edit' };
  page.sandbox.openMoveDialog();
  const dialog = page.sandbox.renderAppDialogHtml();
  const offered = Array.from(dialog.matchAll(/name="move-parent" value="([^"]*)"/g), (m) => m[1]);
  assert.deepEqual(offered, [TOP], 'only the top level: a system goes under a solution, and the guild is its solution already');
  assert.match(text(dialog), /Top level no parent · system at the root · in a manifest of its own/);
  assert.match(text(dialog), /“kiosk” is written inside “manifests\/app\.guild\.yaml”: at the top level, or under a parent of a plateau whose files are not written here, the element gets a manifest of its own\. Comments and quotes go with the block\./);
  const result = page.sandbox.submitMoveDialog({ parent: TOP });
  assert.deepEqual(plain(result), { ok: true, reference: 'kiosk' });
  assert.equal(run(page.sandbox, 'appDialog'), null);
  assert.equal(page.state.selection.key, 'kiosk', 'the panel follows the element');
  // the dialog of an element that has a manifest of its own offers the top level too, and says the file stays
  page.state.selection = { kind: 'element', key: 'guild.annex', layer: 'application', mode: 'edit' };
  page.sandbox.openMoveDialog();
  assert.match(text(page.sandbox.renderAppDialogHtml()), /“annex” has a manifest of its own: a move changes its header\.parent and the file stays\./);
  assert.match(page.sandbox.renderAppDialogHtml(), /name="move-parent" value=" top level"/);
});

test('a move that cannot be written says so at the top of the dialog and refuses; nothing is changed', async () => {
  const broken = Object.assign({}, MANIFESTS, { 'app.broken.yaml': 'header: [unclosed\n  kind: nope' });
  const page = await openPlain(broken);
  page.state.selection = { kind: 'element', key: 'orchard.press', layer: 'application', mode: 'edit' };
  page.sandbox.openMoveDialog();
  assert.match(text(page.sandbox.renderAppDialogHtml()), /No move can be written now\. A manifest cannot be read \(manifests\/app\.broken\.yaml\): a reference in it could not be rewritten\./);
  const before = snapshot(page);
  assert.equal(page.sandbox.submitMoveDialog({ parent: 'market' }), null);
  assert.match(page.sandbox.renderAppDialogHtml(), /role="alert">A manifest cannot be read \(manifests\/app\.broken\.yaml\)[^<]*Nothing was changed\.</);
  assert.equal(snapshot(page), before);
});

// ---- 5. A workspace without plateaus saves the moves that already worked byte for byte as before ----

test('the moves that already worked write the same bytes as before: inside one file, and a header.parent (the files are those the page wrote before run 0104)', async () => {
  const page = await openPlain(MANIFESTS);
  assert.deepEqual(plain(move(page, 'orchard.press.screw', 'orchard.cellar')), { ok: true, reference: 'orchard.cellar.screw' });
  assert.deepEqual(plain(move(page, 'market.till', 'orchard')), { ok: true, reference: 'orchard.till' });
  await page.sandbox.saveAllChanges();
  assert.deepEqual(changedFiles(page).sort(), Object.keys(GOLDEN).sort());
  for (const [name, expected] of Object.entries(GOLDEN)) assert.equal(fileOf(page, name), expected, name);
});

/** The files as the page before run 0104 wrote them after the two moves of the test (captured from the page at the commit before this run; since #114 the first move is a component into a container, a group being gone: the page of 0.16.0 writes the same bytes), `\n` or `\r\n` as the file has it. */
const GOLDEN = {
  'app.orchard.yaml': [
    '# the orchard: everything that grows',
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    '',
    'content:',
    '  id: "orchard"',
    '  name: "Orchard"',
    '  elements:',
    '    # the press comes first',
    '    - kind: container',
    '      id: "press"',
    '      name: "Press"',
    '      description: "Presses \\"the\\" apples: 12 bars, no more."   # why',
    '      qualifiers: [Steel, "Oak"]',
    '      elements:',
    '        # the vat, which holds',
    '        - kind: component',
    '          id: "vat"',
    '          name: \'Vat\'',
    '    # the cellar is on its own',
    '    - kind: container',
    '      id: "cellar"',
    '      name: "Cellar"',
    '      relationships:',
    '        - destination: "orchard.cellar.screw"',
    '          label: "checks"',
    '      elements:',
    '        - kind: component',
    '          id: "screw"',
    '          name: "Screw"',
    '          relationships:',
    '            - destination: "orchard.cellar"',
    '              label: "feeds: the cellar"',
    '# end of the orchard',
    ''
  ].join('\n'),
  'app.market.till.yaml': [
    '# the manifest of till',
    'header:',
    '  kind: "archicode.morin.io/container"',
    '  parent: "orchard"',
    '  version: "1"',
    '',
    'content:',
    '  id: "till"',
    '  name: "Till"',
    '# end of till',
    ''
  ].join('\r\n'),
  'app.shipping.yaml': [
    '# the manifest of shipping',
    'header:',
    '  kind: "archicode.morin.io/system"',
    '  version: "1"',
    '',
    'content:',
    '  id: "shipping"',
    '  name: "Shipping"',
    '  relationships:',
    '    - destination: "orchard.cellar.screw"',
    '      label: "carries"',
    '    - destination: orchard.press',
    '      label: "loads"',
    '# end of shipping',
    ''
  ].join('\n')
};

// ---- 6. Layered: the files of the plateau drawn only, the plateaus that stand on it asked first, a refused write changes nothing ----

const LATER = [{ id: 'early', name: 'Early', path: 'plateaus/10_early' }, { id: 'later', name: 'Later', path: 'plateaus/20_later', override: 'early' }];
const layerFolder = (dir, files) => Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));

test('in a layered workspace a nested element goes to a parent of its own plateau by cutting and pasting, and to a parent of the plateau it overrides as a manifest of its own', async () => {
  const files = layeredFiles(LATER, Object.assign({}, layerFolder('10_early', { 'app.market.yaml': MARKET }), layerFolder('20_later', { 'app.orchard.yaml': ORCHARD, 'app.dock.yaml': manifest('system', null, 'dock', 'Dock') })));
  const page = await openLayered(createApp, memFolder, files, { drawn: 'later' });
  assert.equal(page.state.layerProblems, null);
  const { routes } = page.sandbox.moveParentCandidates('orchard.press', 'application');
  assert.deepEqual(plain(routes.dock), { route: 'paste', file: 'plateaus/20_later/app.dock.yaml' });
  assert.deepEqual(plain(routes.market), { route: 'extract', plateau: 'early' });
  // to the system of its own plateau: both files are the plateau's, the block goes as it was written
  assert.deepEqual(plain(page.sandbox.commitMoveElement('orchard.press', 'application', 'dock')), { ok: true, reference: 'dock.press' });
  assert.deepEqual(plain(page.state.manifestFiles.filter((f) => f.dirty).map((f) => f.relPath).sort()), ['plateaus/20_later/app.dock.yaml', 'plateaus/20_later/app.orchard.yaml']);
  assert.ok(page.state.manifestFiles.find((f) => f.relPath === 'plateaus/20_later/app.dock.yaml').rawText.includes('    # the press comes first\n    - kind: container\n      id: "press"\n'));
  // to the system of the plateau it overrides: a file of that plateau is never written, the element gets a manifest of the plateau drawn
  assert.deepEqual(plain(page.sandbox.commitMoveElement('orchard.cellar', 'application', 'market')), { ok: true, reference: 'market.cellar' });
  await page.sandbox.saveAllChanges();
  assert.equal(page.mem.files.get('plateaus/10_early/app.market.yaml').text, inPlateau('early', MARKET), 'the file of the plateau overridden is as it was');
  const created = page.mem.files.get('plateaus/20_later/app.market.cellar.yaml').text;
  assert.ok(created.startsWith('header:\n  kind: archicode.morin.io/container\n  version: "1"\n  plateau: later\n  parent: market\ncontent:\n'), created);
  const again = await reread(page, 'later');
  assert.equal(again.__state().layerProblems, null);
  assert.ok(again.__state().index.application.has('market.cellar') && again.__state().index.application.has('dock.press.screw'));
  assert.equal(again.__state().index.application.get('market.cellar').declaredIn, 'later');
  again.drawPlateau('early');
  assert.ok(!again.__state().index.application.has('market.cellar'), 'the plateau overridden does not have it');
});

test('a move that a plateau standing on the one drawn refuses is refused whole: text, models, marks and disk are as they were', async () => {
  // `leaf` selects the press by a path written by hand, which does not follow a move: it would select nothing, and the plateau would no longer resolve
  const leaf = 'header:\n  kind: "archicode.morin.io/plateau"\n  version: "1"\ncontent:\n  id: "leaf"\n  name: "Leaf"\n  override: "mid"\n  patches:\n    - operator: SET\n      json-path: "$.application.elements[?(@.id == \'orchard\')].elements[?(@.id == \'press\')]"\n      field: name\n      value: "Big press"\n      expect: 1\n';
  const plateaus = [{ id: 'mid', name: 'Mid', path: 'plateaus/10_mid' }, { id: 'leaf', name: 'Leaf', path: 'plateaus/20_leaf', override: 'mid' }];
  const files = layeredFiles(plateaus, layerFolder('10_mid', { 'app.orchard.yaml': ORCHARD, 'app.market.yaml': MARKET }));
  files['plateaus/20_leaf/plateau.yaml'] = leaf;
  const page = await openLayered(createApp, memFolder, files, { drawn: 'mid' });
  assert.equal(page.state.layerProblems, null);
  const before = snapshot(page, { version: false });
  const refused = page.sandbox.commitMoveElement('orchard.press', 'application', 'market', { confirmed: true });
  assert.equal(refused.ok, false);
  assert.match(refused.message, /^Not written: the plateau `leaf` could no longer be resolved \(.*selects nothing, 1 node expected\)\. Nothing was changed\.$/);
  assert.equal(snapshot(page, { version: false }), before, 'not the text, not the models, not the marks, not the disk');
  assert.ok(page.state.index.application.has('orchard.press') && !page.state.index.application.has('market.press'));
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  // the same move to a parent of the same file is fine: the path still selects the press
  assert.equal(page.state.index.application.has('orchard.press'), true);
});

test('a move in a layered workspace asks first when a plateau that stands on the drawn one changes, and a no changes nothing', async () => {
  const plateaus = [{ id: 'mid', name: 'Mid', path: 'plateaus/10_mid' }, { id: 'leaf', name: 'Leaf', path: 'plateaus/20_leaf', override: 'mid' }];
  const files = layeredFiles(plateaus, layerFolder('10_mid', { 'app.orchard.yaml': ORCHARD, 'app.market.yaml': MARKET }));
  const page = await openLayered(createApp, memFolder, files, { drawn: 'mid' });
  const before = snapshot(page, { version: false });
  const asked = page.sandbox.commitMoveElement('orchard.press', 'application', 'market');
  assert.deepEqual(plain(asked), { ok: true, pending: true, reference: 'orchard.press' });
  assert.equal(snapshot(page, { version: false }), before, 'nothing is kept until the author says yes');
  assert.equal(plain(run(page.sandbox, 'appDialog')).kind, 'layer-confirm');
  page.sandbox.submitAppDialog({});
  assert.ok(page.state.index.application.has('market.press'));
  await page.sandbox.saveAllChanges();
  assert.ok(page.mem.files.get('plateaus/10_mid/app.market.yaml').text.includes('    # the press comes first\n'), 'the block went with its comment');
});

// ---- 7. What the move does not write any more (#97), and the code that went with it ----

test('the second button, the plan of replaces and the ancestor rule are gone from the page; Write replaces is untouched', () => {
  for (const gone of ['planMoveReplaces', 'replacesAncestorProblem', 'replacesDirectionProblem', 'writeReplaces', 'data-replaces', 'Move and write replaces', 'Move only']) {
    assert.ok(!HTML.includes(gone), gone + ' is not in the page any more');
  }
  const moving = HTML.slice(HTML.indexOf('function validateMove('), HTML.indexOf('function openMoveDialog('));
  assert.ok(!/replacesWith|\.replaces\b|\breplaces:/.test(moving), 'the move code does not write replaces');
  assert.match(HTML, /function replacesWith\(/, 'the writer that Write replaces and the replaces list use stays');
  assert.match(HTML, /data-action="accept-candidate"[^>]*>Write replaces</);
  assert.match(HTML, /<button type="button" class="btn-primary" data-action="move-confirm">Move<\/button>/);
});
