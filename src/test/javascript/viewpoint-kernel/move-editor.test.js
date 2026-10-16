'use strict';
// Moving an element under another parent in the editor (wave 009, run 0047). The element and everything inside it follow, the references that pointed at them
// are rewritten in every file by the machinery of an id rename, the files differ from the originals by the changed lines only (comments, quotes and blank lines
// are the author's), a refused move changes nothing, and the dialog offers to write `replaces` for the element and for each element inside it, so that the
// comparison reads one moved element with its children instead of removed and new. The kernel is the real embedded module.
// Everything here is invented: a bakery, a shop, a delivery service and two racks.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const HTML = fs.readFileSync(path.resolve(__dirname, '../../../main/resources/editor-webapp/standalone.html'), 'utf8');
const run = (sandbox, code) => vm.runInContext(code, sandbox);
const plain = (value) => JSON.parse(JSON.stringify(value === undefined ? null : value));
const text = (html) => html.replace(/<[^>]+>/g, ' ').replace(/&rarr;/g, '→').replace(/&times;/g, '×').replace(/\s+/g, ' ').trim();

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

// ---- an invented set of manifests: comments, quoted strings, a blank line, nested elements and elements with a file of their own ----

const BAKERY = [
  '# the bakery: everything that makes bread',
  'header:',
  '  kind: "archicode.morin.io/system"',
  '  version: "1"',
  '',
  'content:',
  '  id: "bakery"',
  '  name: "Bakery"',
  '  elements:',
  '    # the ovens come first',
  '    - kind: container',
  '      id: "oven"',
  '      name: "Oven"',
  '      description: "Bakes \\"the\\" bread: 220 degrees, no more."',
  '      elements:',
  '        - kind: component',
  '          id: "gauge"',
  '          name: "Gauge"',
  '          relationships:',
  '            - destination: "bakery.mixer"',
  '              label: "reads: the dough"',
  '        - kind: component',
  '          id: "timer"',
  '          name: "Timer"',
  '    # the mixer is on its own',
  '    - kind: container',
  '      id: "mixer"',
  '      name: "Mixer"',
  '      relationships:',
  '        - destination: "bakery.oven.gauge"',
  '          label: "checks"',
  '    - kind: container',
  '      id: "shelf"',
  '      name: "Shelf"',
  '    # a group of the bakery',
  '    - kind: group',
  '      id: "tools"',
  '      name: "Tools"',
  '# end of the bakery',
  ''
].join('\n');
const SHOP = element('system', null, 'shop', 'Shop');
const TILL = element('container', 'shop', 'till', 'Till', '  relationships:\n    - destination: "bakery.oven.timer"\n      label: "asks"\n    - destination: "bakery.oven"\n      label: "orders from"\n');
const SCREEN = element('component', 'shop.till', 'screen', 'Screen', '  relationships:\n    - destination: "bakery.oven.gauge"\n      label: "shows"\n');
const DELIVERY = element('system', null, 'delivery', 'Delivery');
const VAN = element('container', 'delivery', 'van', 'Van', '  relationships:\n    - destination: bakery.oven\n      label: "collects from"\n    - destination: "shop.till"\n      label: "delivers to"\n    - destination: shop.till.screen\n      label: "is read on"\n');
const PROD = [
  '# where the bakery runs',
  'header:',
  '  kind: "archicode.morin.io/environment"',
  '  version: "1"',
  '',
  'content:',
  '  id: "prod"',
  '  name: "Production"',
  '  elements:',
  '    - kind: node',
  '      id: "rack-a"',
  '      name: "Rack A"',
  '      applications:',
  '        - bakery.oven',
  '        - bakery.oven.timer',
  '      elements:',
  '        - kind: node',
  '          id: "blade"',
  '          name: "Blade"',
  '    - kind: node',
  '      id: "rack-b"',
  '      name: "Rack B"',
  '# end of prod',
  ''
].join('\n');
const STAGING = element('environment', null, 'staging', 'Staging', '  uses:\n    - prod.rack-a\n    - prod.rack-a.blade\n');
const MAP_VIEW = 'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "ovens"\n  name: "The ovens"\n  viewpoint: "overview"\n  layer: application\n  properties:\n    element: "bakery.oven"\n';

function element(kind, parent, id, name, extra) {
  return '# the manifest of ' + id + '\nheader:\n  kind: "archicode.morin.io/' + kind + '"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + '  version: "1"\n\ncontent:\n  id: "' + id + '"\n  name: "' + name + '"\n' + (extra || '') + '# end of ' + id + '\n';
}

const MANIFESTS = {
  'app.bakery.yaml': BAKERY,
  'app.shop.yaml': SHOP,
  'app.shop.till.yaml': TILL,
  'app.shop.till.screen.yaml': SCREEN,
  'app.delivery.yaml': DELIVERY,
  'app.delivery.van.yaml': VAN,
  'env.prod.yaml': PROD,
  'env.staging.yaml': STAGING,
  'view.ovens.yaml': MAP_VIEW
};
const PLATEAUS = '  plateaus:\n    - id: base\n      name: Base\n      path: plateaus/10_base\n    - id: target\n      name: Target\n      path: plateaus/20_target\n';
const folder = (dir, files) => Object.fromEntries(Object.entries(files).map(([name, body]) => ['plateaus/' + dir + '/' + name, body]));
const target = (name) => 'plateaus/20_target/' + name;

/** The workspace opened as the editor opens a folder, the target drawn (it is the last); compared with the base unless `compare` is false. `plateaus: false`: one plain folder. */
async function open(options = {}) {
  const manifests = options.manifests || MANIFESTS;
  const files = options.plateaus === false
    ? Object.assign({ 'workspace.yaml': 'settings:\n  manifests:\n    paths:\n      - manifests\n' }, Object.fromEntries(Object.entries(manifests).map(([name, body]) => ['manifests/' + name, body])))
    : Object.assign({ 'workspace.yaml': 'settings:\n' + PLATEAUS }, folder('10_base', options.base || manifests), folder('20_target', manifests));
  const mem = memFolder(files);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  if (options.plateaus !== false && options.compare !== false) await sandbox.setCompareTo('base');
  return { sandbox, state, mem };
}
const fileOf = (mem, name) => mem.files.get(target(name)).text;
const movedFiles = (mem) => mem.writes.slice().sort();
/** The texts of the target manifests as they are on disk now. */
const targetTexts = (mem) => Object.fromEntries(Object.keys(MANIFESTS).map((name) => [name, fileOf(mem, name)]));
/** The names of the files whose text is not the original. */
const changedFiles = (mem) => Object.keys(MANIFESTS).filter((name) => fileOf(mem, name) !== MANIFESTS[name]);
const move = (sandbox, reference, parent, writeReplaces, layer) =>
  sandbox.commitMoveElement(reference, layer || 'application', parent, { writeReplaces: !!writeReplaces });


// ---- 1. A nested element with its children, in one file: the block moves as it was written, every reference to it follows, in every file ----

test('moving a container with its children puts the block under the new parent as it was written, and rewrites each reference to it or inside it, in every file and nowhere else', async () => {
  const { sandbox, state, mem } = await open();
  const version = run(sandbox, 'modelVersion');
  assert.equal(state.relationshipStats.dangling, 0, 'the invented workspace has no dangling reference to begin with');
  const result = move(sandbox, 'bakery.oven', 'bakery.tools', false);
  assert.deepEqual(plain(result), { ok: true, reference: 'bakery.tools.oven', replaces: 0 });
  assert.ok(run(sandbox, 'modelVersion') > version, 'the models changed: the comparison is asked again');
  // the model: the element and its children are at their new references, the old ones are gone
  const references = Array.from(state.index.application.keys());
  for (const kept of ['bakery.tools.oven', 'bakery.tools.oven.gauge', 'bakery.tools.oven.timer', 'bakery.mixer', 'bakery.shelf', 'shop.till.screen']) assert.ok(references.includes(kept), kept);
  for (const gone of ['bakery.oven', 'bakery.oven.gauge', 'bakery.oven.timer']) assert.ok(!references.includes(gone), gone + ' is gone');
  assert.equal(state.index.application.get('bakery.tools.oven').children.length, 2);
  assert.equal(state.dirtyReferences.has('application:bakery.tools.oven'), true, 'marked as modified');
  // every reference that pointed at it resolves: the destinations of the other files, the deployment, the view
  assert.equal(state.relationshipStats.dangling, 0, 'no relationship points at nothing');
  assert.deepEqual(plain(state.index.application.get('shop.till').relationships.map((r) => r.destination)), ['bakery.tools.oven.timer', 'bakery.tools.oven']);
  assert.deepEqual(plain(state.index.technology.get('prod.rack-a').applications), ['bakery.tools.oven', 'bakery.tools.oven.timer']);
  // nothing is on disk until the user saves
  assert.deepEqual(changedFiles(mem), []);
  await sandbox.saveAllChanges();
  assert.equal(run(sandbox, 'saveStatus').state, 'success');
  assert.deepEqual(movedFiles(mem).map((p) => p.replace('plateaus/20_target/', '')), ['app.bakery.yaml', 'app.delivery.van.yaml', 'app.shop.till.screen.yaml', 'app.shop.till.yaml', 'env.prod.yaml', 'view.ovens.yaml']);
  assert.deepEqual(changedFiles(mem), ['app.bakery.yaml', 'app.delivery.van.yaml', 'app.shop.till.yaml', 'app.shop.till.screen.yaml', 'env.prod.yaml', 'view.ovens.yaml'].sort((a, b) => Object.keys(MANIFESTS).indexOf(a) - Object.keys(MANIFESTS).indexOf(b)));
  // the files that nothing pointed to are byte for byte what they were
  for (const name of ['app.shop.yaml', 'app.delivery.yaml', 'env.staging.yaml']) assert.equal(fileOf(mem, name), MANIFESTS[name], name);
  // the lines that changed in the files that point at it: the reference, nothing around it
  assert.deepEqual(lineDiff(MANIFESTS['app.shop.till.yaml'], fileOf(mem, 'app.shop.till.yaml')), {
    removed: ['    - destination: "bakery.oven.timer"', '    - destination: "bakery.oven"'],
    added: ['    - destination: "bakery.tools.oven.timer"', '    - destination: "bakery.tools.oven"']
  });
  assert.deepEqual(lineDiff(MANIFESTS['app.shop.till.screen.yaml'], fileOf(mem, 'app.shop.till.screen.yaml')), { removed: ['    - destination: "bakery.oven.gauge"'], added: ['    - destination: "bakery.tools.oven.gauge"'] });
  assert.deepEqual(lineDiff(MANIFESTS['app.delivery.van.yaml'], fileOf(mem, 'app.delivery.van.yaml')), { removed: ['    - destination: bakery.oven'], added: ['    - destination: bakery.tools.oven'] });
  assert.deepEqual(lineDiff(MANIFESTS['env.prod.yaml'], fileOf(mem, 'env.prod.yaml')), { removed: ['        - bakery.oven', '        - bakery.oven.timer'], added: ['        - bakery.tools.oven', '        - bakery.tools.oven.timer'] });
  assert.deepEqual(lineDiff(MANIFESTS['view.ovens.yaml'], fileOf(mem, 'view.ovens.yaml')), { removed: ['    element: "bakery.oven"'], added: ['    element: "bakery.tools.oven"'] });
  // the file of the bakery: the block left with its comment, its quotes and its escaped string, one level deeper; the rest is as it was (the comments of the others stay on theirs)
  const bakery = fileOf(mem, 'app.bakery.yaml');
  const block = BAKERY.split('\n').slice(9, 24); // the comment of the oven to its last line
  assert.equal(bakery, BAKERY
    .replace(block.join('\n') + '\n', '')
    .replace('        - destination: "bakery.oven.gauge"', '        - destination: "bakery.tools.oven.gauge"')
    .replace('      name: "Tools"\n', '      name: "Tools"\n      elements:\n' + block.map((line) => '    ' + line).join('\n') + '\n'));
  assert.ok(bakery.includes('        # the ovens come first\n        - kind: container\n          id: "oven"'), 'the comment above the block went with it');
  assert.ok(bakery.includes('          description: "Bakes \\"the\\" bread: 220 degrees, no more."'), 'quoted strings are the author\'s');
  assert.ok(bakery.startsWith('# the bakery: everything that makes bread\nheader:') && bakery.endsWith('# end of the bakery\n'));
  // and the files read back as the editor, and the command line, read them
  const again = createApp({});
  await again.loadWorkspace(mem.handle);
  assert.deepEqual(plain(Array.from(again.__state().index.application.keys()).sort()), plain(references.slice().sort()));
});

test('a manifest that is not nested changes one line, its header.parent, and the manifests attached below it follow', async () => {
  const { sandbox, state, mem } = await open();
  const result = move(sandbox, 'shop.till', 'delivery', false);
  assert.equal(result.ok, true);
  assert.deepEqual(Array.from(state.index.application.keys()).filter((r) => /till|screen/.test(r)).sort(), ['delivery.till', 'delivery.till.screen']);
  assert.equal(state.index.application.get('delivery.till.screen').sourceFile, 'plateaus/20_target/app.shop.till.screen.yaml', 'the file of the child did not move');
  await sandbox.saveAllChanges();
  assert.deepEqual(changedFiles(mem), ['app.shop.till.yaml', 'app.shop.till.screen.yaml', 'app.delivery.van.yaml']);
  assert.deepEqual(lineDiff(MANIFESTS['app.shop.till.yaml'], fileOf(mem, 'app.shop.till.yaml')), { removed: ['  parent: "shop"'], added: ['  parent: "delivery"'] });
  assert.deepEqual(lineDiff(MANIFESTS['app.shop.till.screen.yaml'], fileOf(mem, 'app.shop.till.screen.yaml')), { removed: ['  parent: "shop.till"'], added: ['  parent: "delivery.till"'] });
  assert.deepEqual(lineDiff(MANIFESTS['app.delivery.van.yaml'], fileOf(mem, 'app.delivery.van.yaml')), {
    removed: ['    - destination: "shop.till"', '    - destination: shop.till.screen'],
    added: ['    - destination: "delivery.till"', '    - destination: delivery.till.screen']
  });
  assert.equal(fileOf(mem, 'app.shop.yaml'), MANIFESTS['app.shop.yaml']);
  assert.equal(state.relationshipStats.dangling, 0);
});

test('a system goes under a solution: every reference to it and to what it holds follows, in every file', async () => {
  const withSolution = Object.assign({}, MANIFESTS, { 'app.suite.yaml': element('solution', null, 'suite', 'Suite') });
  const { sandbox, state, mem } = await open({ manifests: withSolution });
  assert.equal(sandbox.moveIsPossible('bakery', 'application'), true);
  assert.deepEqual(plain(sandbox.moveParentCandidates('bakery', 'application').parents.map((p) => p.reference)), ['suite']);
  assert.equal(move(sandbox, 'bakery', 'suite', true).ok, true);
  assert.ok(state.index.application.has('suite.bakery.oven.gauge') && !state.index.application.has('bakery'));
  assert.equal(state.relationshipStats.dangling, 0);
  await sandbox.saveAllChanges();
  const added = lineDiff(MANIFESTS['app.bakery.yaml'], fileOf(mem, 'app.bakery.yaml')).added;
  assert.ok(added.includes('  parent: "suite"'));
  assert.deepEqual(added.filter((l) => /^ +- "bakery/.test(l)).map((l) => l.trim()).sort(), ['- "bakery"', '- "bakery.mixer"', '- "bakery.oven"', '- "bakery.oven.gauge"', '- "bakery.oven.timer"', '- "bakery.shelf"', '- "bakery.tools"'], 'the system and each of the six elements inside it name their old reference');
  assert.deepEqual(lineDiff(withSolution['app.suite.yaml'], mem.files.get(target('app.suite.yaml')).text), { removed: [], added: [] }, 'the new parent is not touched');
  // the children inside the file of the system are told too: the comparison reads one moved system with what it holds
  const rows = Object.fromEntries(sandbox.comparisonState().changes.filter((r) => /bakery/.test(r.reference)).map((r) => [r.reference, r.change]));
  assert.equal(rows['suite.bakery'], 'moved');
  assert.equal(rows['suite.bakery.oven.timer'], 'moved');
  assert.equal(Object.values(rows).some((c) => c === 'removed' || c === 'new'), false);
});

test('a node of the technology layer moves, and what uses it follows; the application element with the same reference is not touched', async () => {
  const extra = Object.assign({}, MANIFESTS, {
    // an application element called like the node: only the technology layer's references may change
    'app.prod.yaml': element('system', null, 'prod', 'Prod, the application', ''),
    'app.prod.rack-a.yaml': element('container', 'prod', 'rack-a', 'The rack, the application', '  relationships:\n    - destination: "prod.rack-a.blade"\n      label: "is not a node"\n'),
    'app.prod.rack-a.blade.yaml': element('component', 'prod.rack-a', 'blade', 'Blade, the application', '')
  });
  const { sandbox, state, mem } = await open({ manifests: extra });
  assert.equal(move(sandbox, 'prod.rack-a.blade', 'prod.rack-b', false, 'technology').ok, true);
  assert.ok(state.index.technology.has('prod.rack-b.blade') && !state.index.technology.has('prod.rack-a.blade'));
  assert.ok(state.index.application.has('prod.rack-a.blade'), 'the application element of the same reference stayed');
  await sandbox.saveAllChanges();
  assert.deepEqual(changedFiles(mem).sort(), ['env.prod.yaml', 'env.staging.yaml']);
  // the node had no sibling: its parent loses its `elements` line, and the new parent gains one; the block is the author's, one level shallower
  assert.equal(fileOf(mem, 'env.prod.yaml'), MANIFESTS['env.prod.yaml']
    .replace('      elements:\n        - kind: node\n          id: "blade"\n          name: "Blade"\n', '')
    .replace('      name: "Rack B"\n', '      name: "Rack B"\n      elements:\n        - kind: node\n          id: "blade"\n          name: "Blade"\n'));
  assert.deepEqual(lineDiff(MANIFESTS['env.staging.yaml'], fileOf(mem, 'env.staging.yaml')), { removed: ['    - prod.rack-a.blade'], added: ['    - prod.rack-b.blade'] });
});

// ---- 2. replaces: for the element and for each element inside it, and what the comparison then says ----

test('a move alone reads as removed plus new in the comparison; the move with replaces reads as moved, for the element and for each element inside it', async () => {
  const rows = (page) => Object.fromEntries(page.sandbox.comparisonState().changes.filter((r) => /^bakery\.(tools\.)?oven/.test(r.reference)).map((r) => [r.reference, r.change]));
  // before: nothing differs
  const before = await open();
  assert.deepEqual(rows(before), {});

  const alone = await open();
  assert.equal(move(alone.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  assert.deepEqual(rows(alone), {
    'bakery.oven': 'removed', 'bakery.oven.gauge': 'removed', 'bakery.oven.timer': 'removed',
    'bakery.tools.oven': 'new', 'bakery.tools.oven.gauge': 'new', 'bakery.tools.oven.timer': 'new'
  });

  const both = await open();
  const version = run(both.sandbox, 'modelVersion');
  const result = move(both.sandbox, 'bakery.oven', 'bakery.tools', true);
  assert.deepEqual(plain(result), { ok: true, reference: 'bakery.tools.oven', replaces: 3 });
  assert.ok(run(both.sandbox, 'modelVersion') > version, 'the cache of the comparison is told');
  assert.deepEqual(rows(both), { 'bakery.tools.oven': 'moved', 'bakery.tools.oven.gauge': 'moved', 'bakery.tools.oven.timer': 'moved' }, 'one moved element with its children: no removed, no new');
  const comparison = both.sandbox.comparisonState();
  const row = comparison.changes.find((r) => r.reference === 'bakery.tools.oven.gauge');
  assert.deepEqual(plain(row.replaces), ['bakery.oven.gauge'], 'each with its own old reference');
  // the model says it too, and the written lines are the key and the reference, nothing else of the block
  assert.deepEqual(plain(both.state.index.application.get('bakery.tools.oven').replaces), ['bakery.oven']);
});

test('only the container told, its children read as removed: why a move writes replaces for each element inside it', async () => {
  const page = await open();
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  page.sandbox.commitElementEdit('bakery.tools.oven', (node) => { node.replaces = ['bakery.oven']; }, 'application');
  const rows = Object.fromEntries(page.sandbox.comparisonState().changes.filter((r) => /oven/.test(r.reference)).map((r) => [r.reference, r.change]));
  assert.equal(rows['bakery.tools.oven'], 'moved');
  assert.equal(rows['bakery.oven.gauge'], 'removed');
  assert.equal(rows['bakery.tools.oven.gauge'], 'new');
});

test('the lines "Move and write replaces" adds are the key and the old reference of each element, and nothing else of the block changes', async () => {
  const page = await open();
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', true).ok, true);
  await page.sandbox.saveAllChanges();
  const moved = fileOf(page.mem, 'app.bakery.yaml');
  const alone = await open();
  assert.equal(move(alone.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  await alone.sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(fileOf(alone.mem, 'app.bakery.yaml'), moved), {
    removed: [],
    added: [
      '              replaces:', '                - "bakery.oven.gauge"',
      '              replaces:', '                - "bakery.oven.timer"',
      '          replaces:', '            - "bakery.oven"'
    ]
  });
  // a manifest that is not nested gets the key at the end of its content, the others around it are as they were
  const root = await open();
  assert.equal(move(root.sandbox, 'shop.till', 'delivery', true).ok, true);
  await root.sandbox.saveAllChanges();
  assert.deepEqual(lineDiff(MANIFESTS['app.shop.till.yaml'], fileOf(root.mem, 'app.shop.till.yaml')), { removed: ['  parent: "shop"'], added: ['  parent: "delivery"', '  replaces:', '    - "shop.till"'] });
  assert.deepEqual(lineDiff(MANIFESTS['app.shop.till.screen.yaml'], fileOf(root.mem, 'app.shop.till.screen.yaml')), { removed: ['  parent: "shop.till"'], added: ['  parent: "delivery.till"', '  replaces:', '    - "shop.till.screen"'] });
});

test('replaces is added to the list the element already has, and an element the baseline does not have gets none', async () => {
  // the gauge already says it replaces something; the timer is new in the plateau drawn (the base does not have it)
  const withReplaces = BAKERY.replace('          id: "gauge"\n          name: "Gauge"\n', '          id: "gauge"\n          name: "Gauge"\n          replaces: [bakery.old-gauge]\n');
  const base = Object.assign({}, MANIFESTS, { 'app.bakery.yaml': BAKERY.replace('        - kind: component\n          id: "timer"\n          name: "Timer"\n', '') });
  const page = await open({ manifests: Object.assign({}, MANIFESTS, { 'app.bakery.yaml': withReplaces }), base });
  const plan = plain(page.sandbox.planMoveReplaces('bakery.oven', 'application', 'bakery.tools.oven'));
  assert.deepEqual(plan.entries.map((e) => e.from), ['bakery.oven', 'bakery.oven.gauge']);
  assert.deepEqual(plan.skipped, ['bakery.oven.timer']);
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', true).ok, true);
  assert.deepEqual(plain(page.state.index.application.get('bakery.tools.oven.gauge').replaces), ['bakery.old-gauge', 'bakery.oven.gauge']);
  assert.deepEqual(plain(page.state.index.application.get('bakery.tools.oven.timer').replaces), []);
  await page.sandbox.saveAllChanges();
  const saved = fileOf(page.mem, 'app.bakery.yaml');
  assert.ok(saved.includes('              replaces:\n                - "bakery.old-gauge"\n                - "bakery.oven.gauge"\n'), 'the file quotes its strings, and the lines the ordinary save writes here do too');
  assert.ok(saved.startsWith('# the bakery: everything that makes bread\nheader:') && saved.endsWith('# end of the bakery\n'));
});

// ---- 3. Refusals: a clear reason, and nothing changed ----

/** What a refused move must leave alone: every manifest (model and text), the version of the models, the modified markers, the disk. */
function snapshot(page) {
  const files = page.state.manifestFiles.map((f) => [f.relPath, f.rawText, f.dirty, JSON.stringify([f.header, f.content])]);
  return JSON.stringify([files, run(page.sandbox, 'modelVersion'), Array.from(page.state.dirtyReferences), page.mem.writes, page.state.selection]);
}

async function refusing(options, reference, parent, expected, extra = {}) {
  const page = await open(options);
  const before = snapshot(page);
  const result = move(page.sandbox, reference, parent, extra.replaces, extra.layer);
  assert.equal(result.ok, false);
  assert.match(result.message, expected);
  assert.match(result.message, /Nothing was changed\.$/);
  assert.equal(snapshot(page), before, 'nothing changed: not the models, not the text, not the markers, not the disk');
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  return page;
}

test('an element is not moved into itself, nor into something it contains', async () => {
  await refusing({}, 'bakery.oven', 'bakery.oven', /cannot be moved into itself/);
  await refusing({}, 'bakery.oven', 'bakery.oven.gauge', /“bakery\.oven\.gauge” is inside “bakery\.oven”/);
  await refusing({}, 'shop.till', 'shop.till.screen', /is inside “shop\.till”/);
  // the dialog does not offer them either
  const page = await open();
  const offered = page.sandbox.moveParentCandidates('bakery.oven', 'application').parents.map((p) => p.reference);
  assert.ok(!offered.includes('bakery.oven') && !offered.includes('bakery.oven.gauge'));
});

test('an element is not moved to the parent it has', async () => {
  await refusing({}, 'bakery.oven', 'bakery', /already under “bakery”/);
  await refusing({}, 'shop.till', 'shop', /already under “shop”/);
  await refusing({}, 'bakery.oven.timer', 'bakery.oven', /already under “bakery\.oven”/);
});

test('a parent that already holds an element with the same id refuses, and says which', async () => {
  const clash = Object.assign({}, MANIFESTS, { 'app.bakery.yaml': BAKERY.replace('      name: "Shelf"\n', '      name: "Shelf"\n      elements:\n        - kind: component\n          id: "timer"\n          name: "A spare timer"\n') });
  const page = await refusing({ manifests: clash }, 'bakery.oven.timer', 'bakery.shelf', /“bakery\.shelf” already holds an element with the id “timer” \(“bakery\.shelf\.timer”\)/);
  assert.ok(!page.sandbox.moveParentCandidates('bakery.oven.timer', 'application').parents.some((p) => p.reference === 'bakery.shelf'), 'not offered');
  // a clash with an element of a manifest of its own, in another file
  const own = Object.assign({}, MANIFESTS, { 'app.delivery.till.yaml': element('container', 'delivery', 'till', 'Another till') });
  await refusing({ manifests: own }, 'shop.till', 'delivery', /“delivery” already holds an element with the id “till”/);
});

test('a parent that cannot hold the kind refuses: a container goes under a system, never under a component', async () => {
  await refusing({}, 'bakery.mixer', 'bakery.oven.timer', /A container cannot be put under “bakery\.oven\.timer”, a component that holds nothing/);
  await refusing({}, 'bakery.oven.timer', 'bakery', /A component cannot be put under “bakery”, which holds container and group only/);
  await refusing({}, 'shop.till', 'shop.till.screen', /inside/);
  await refusing({}, 'prod.rack-a', 'bakery', /not an element of the workspace/, { layer: 'technology' }); // the other layer's reference is not a parent
  // an environment is never put under anything, nor is a system when the workspace has no solution: no Move button, no parent
  const page = await open();
  for (const [reference, layer] of [['prod', 'technology'], ['staging', 'technology'], ['bakery', 'application'], ['shop', 'application']]) {
    assert.equal(page.sandbox.moveIsPossible(reference, layer), false, reference);
  }
});

test('an element of the baseline, or a parent of the baseline, is read-only: the move is refused with the reason', async () => {
  const base = Object.assign({}, MANIFESTS, { 'app.bakery.cake.yaml': element('container', 'bakery', 'cake', 'Cake'), 'app.bakery.old.yaml': element('container', 'bakery', 'old', 'Old') });
  await refusing({ base }, 'bakery.cake', 'bakery.tools', /“bakery\.cake” belongs to “Base”, which is only read to compare and is never written; a move happens in “Target”/);
  await refusing({ base }, 'bakery.mixer', 'bakery.old', /“bakery\.old” belongs to “Base”, which is only read/);
  const page = await open({ base });
  assert.equal(page.sandbox.moveIsPossible('bakery.cake', 'application'), false);
  // the element is the plateau drawn's, and also the baseline's: the baseline copy is never touched
  assert.equal(move(page.sandbox, 'bakery.mixer', 'bakery.tools', false).ok, true);
  assert.ok(page.state.baseline.index.application.has('bakery.mixer') && !page.state.baseline.index.application.has('bakery.tools.mixer'));
});

test('a nested element cannot go to a parent in another file: the editor does not cut a block out of one file into another', async () => {
  const page = await refusing({}, 'bakery.oven', 'shop', /written inside “plateaus\/20_target\/app\.bakery\.yaml” and “shop” is declared in “plateaus\/20_target\/app\.shop\.yaml”: moving it would cut its block/);
  const { parents, otherFile } = page.sandbox.moveParentCandidates('bakery.oven', 'application');
  assert.deepEqual(plain(parents.map((p) => p.reference)), ['bakery.tools'], 'only the parent of the same file is offered');
  assert.ok(otherFile >= 1, 'the others are counted, to say why they are not listed');
});

test('a reference that cannot be rewritten as text, a manifest that cannot be read, and a reference declared twice refuse the move', async () => {
  // a destination written as a number names the element 8080 but cannot be rewritten as the reference of another one
  const numeric = Object.assign({}, MANIFESTS, {
    'app.gate.yaml': element('system', null, '8080', 'Gate', '  relationships:\n    - destination: 8080\n      label: "loops"\n'),
    'app.gate.door.yaml': element('container', '8080', 'door', 'Door')
  });
  const page = await open({ manifests: numeric });
  const scan = page.sandbox.scanMoveReferences('8080', 'application');
  assert.deepEqual(plain(scan.unsafe).length, 1);
  assert.match(scan.unsafe[0], /a destination of 8080 in .*app\.gate\.yaml is written as number 8080/);
  // an unreadable manifest could hold a reference nobody can rewrite
  await refusing({ manifests: Object.assign({}, MANIFESTS, { 'app.broken.yaml': 'header: [unclosed\n  kind: nope' }) }, 'bakery.oven', 'bakery.tools', /A manifest cannot be read \(plateaus\/20_target\/app\.broken\.yaml\)/);
  // two files declaring the same reference
  await refusing({ manifests: Object.assign({}, MANIFESTS, { 'app.bakery.mixer.yaml': element('container', 'bakery', 'mixer', 'Mixer, twice') }) }, 'bakery.mixer', 'bakery.tools', /“bakery\.mixer” is declared twice/);
});

test('replaces that is not a list refuses "Move and write replaces", and "Move only" still works', async () => {
  const odd = Object.assign({}, MANIFESTS, { 'app.shop.till.yaml': MANIFESTS['app.shop.till.yaml'].replace('  name: "Till"\n', '  name: "Till"\n  replaces: shop.till\n') });
  await refusing({ manifests: odd }, 'shop.till', 'delivery', /The replaces of “shop\.till” is not a list; fix it by hand/, { replaces: true });
  const page = await open({ manifests: odd });
  assert.equal(move(page.sandbox, 'shop.till', 'delivery', false).ok, true);
});

test('without a comparison, or without plateaus, replaces is not written, and asking for it is refused', async () => {
  const none = await refusing({ compare: false }, 'shop.till', 'delivery', /To write replaces, choose the plateau to compare with in Compare to/, { replaces: true });
  assert.equal(move(none.sandbox, 'shop.till', 'delivery', false).ok, true, 'the move itself does not need a comparison');
  const plain1 = await open({ plateaus: false });
  assert.deepEqual(plain(plain1.sandbox.planMoveReplaces('shop.till', 'application', 'delivery.till')), { offered: false, reason: null, entries: [], skipped: [] });
  assert.equal(move(plain1.sandbox, 'shop.till', 'delivery', false).ok, true);
  const refused = move((await open({ plateaus: false })).sandbox, 'shop.till', 'delivery', true);
  assert.equal(refused.ok, false);
});

test('a baseline that comes after the plateau drawn: the move is possible, replaces is refused with the reason of "Write replaces"', async () => {
  const page = await open({ compareTo: 'base' });
  // draw the first plateau and compare it with the second: replaces would go on the older plateau
  await page.sandbox.switchPlateau('base');
  await page.sandbox.setCompareTo('target');
  const plan = plain(page.sandbox.planMoveReplaces('shop.till', 'application', 'delivery.till'));
  assert.equal(plan.offered, false);
  assert.match(plan.reason, /“Base” comes before “Target” in the plateaus of this workspace/);
  assert.equal(move(page.sandbox, 'shop.till', 'delivery', false).ok, true);
});

// ---- 4. The panel and the dialog ----

/** A click as handleAppClick reads it: the nearest data-action element, with these attributes. */
function click(sandbox, attributes) {
  const target = { getAttribute: (name) => (name in attributes ? attributes[name] : null), closest: () => null };
  sandbox.handleAppClick({ target: { closest: (selector) => (selector === '[data-action]' ? target : null) }, preventDefault() {}, stopPropagation() {}, detail: 1 });
}

/** The element in the edit form of its panel, as a click on "Edit" leaves it. */
function edit(page, reference, layer = 'application') {
  page.state.selection = { kind: 'element', key: reference, layer, mode: 'edit' };
  page.sandbox.render();
}

test('the edit form of an element that can move has a Move button; one that never moves has none, and the read-only details never have it', async () => {
  const page = await open();
  edit(page, 'bakery.oven');
  const form = page.sandbox.renderElementEditionFormHtml('bakery.oven');
  assert.match(form, /<button type="button" data-action="open-move-dialog" data-ref="bakery\.oven"[^>]*>Move<\/button>/);
  assert.ok(form.indexOf('request-delete-element') < form.indexOf('open-move-dialog') && form.indexOf('open-move-dialog') < form.indexOf('open-create-child-form'), 'after Delete, before Add child');
  for (const reference of ['bakery', 'shop']) assert.doesNotMatch(page.sandbox.renderElementEditionFormHtml(reference), /open-move-dialog/, reference + ' is a system');
  assert.doesNotMatch(page.sandbox.renderElementEditionFormHtml('bakery').replace(/<[^>]*>/g, ''), /Move/);
  assert.doesNotMatch(page.sandbox.renderElementViewHtml('bakery.oven'), /open-move-dialog/);
});

test('"Move" opens a dialog that lists the valid parents only: same layer, able to hold the kind, not the element, not what it contains, not its parent, in its own file', async () => {
  const page = await open();
  edit(page, 'bakery.oven');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'bakery.oven' });
  const dialog = page.sandbox.renderAppDialogHtml();
  assert.match(dialog, /role="dialog"/);
  assert.match(dialog, /<h2 id="app-dialog-title">Move “Oven”<\/h2>/);
  const offered = Array.from(dialog.matchAll(/name="move-parent" value="([^"]*)"/g), (m) => m[1]);
  assert.deepEqual(offered, ['bakery.tools'], 'the group of the same file; not bakery (its parent), not the other systems (another file), not the technology layer');
  assert.match(dialog, /type="text" id="move-filter" data-dialog-filter/);
  assert.match(text(dialog), /bakery\.oven · container · the 2 elements inside it follow/);
  assert.match(text(dialog), /Its reference changes .*and 7 references to it or inside it are rewritten in 5 files, and 1 saved view of the workspace follows\./);
  assert.match(text(dialog), /2 more parents are not listed: “bakery\.oven” is written inside “plateaus\/20_target\/app\.bakery\.yaml”, and the editor does not cut a block out of one file into another\./);
  // the offer of replaces: both buttons, the number of elements it concerns, the plateau compared
  assert.match(dialog, /data-action="move-confirm" data-replaces="0">Move only<\/button>/);
  assert.match(dialog, /class="btn-primary" data-action="move-confirm" data-replaces="1">Move and write replaces<\/button>/);
  assert.match(text(dialog), /also writes replaces on 3 elements \(this one and the ones inside it\), each with its old reference, so that the comparison with “Base” reads one moved element with what it holds, not removed and new\./);
  // the dialog is the editor's own: the focus goes to the search, Escape and a click beside it cancel
  assert.match(dialog, /data-dialog-autofocus/);
});

test('a manifest of its own can go under any element able to hold it, in any file; the dialog lists them sorted', async () => {
  const page = await open();
  edit(page, 'shop.till');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'shop.till' });
  const offered = Array.from(page.sandbox.renderAppDialogHtml().matchAll(/name="move-parent" value="([^"]*)"/g), (m) => m[1]);
  assert.deepEqual(offered, ['bakery', 'bakery.tools', 'delivery']);
});

test('the search narrows the list by every word typed, in the name, the id, the reference or the kind, whatever the case', async () => {
  const sandbox = createApp({});
  assert.equal(sandbox.moveParentMatches('Tools tools bakery.tools group', ''), true);
  assert.equal(sandbox.moveParentMatches('Tools tools bakery.tools group', 'TOOL'), true);
  assert.equal(sandbox.moveParentMatches('Tools tools bakery.tools group', 'bakery group'), true);
  assert.equal(sandbox.moveParentMatches('Tools tools bakery.tools group', 'bakery container'), false);
  assert.equal(sandbox.moveParentMatches('Tools tools bakery.tools group', '  tools   '), true);
  // a search typed in the dialog is kept when the dialog is drawn again (a refusal), and hides what does not match
  const page = await open();
  edit(page, 'shop.till');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'shop.till' });
  run(page.sandbox, "appDialog.query = 'deliv'");
  const dialog = page.sandbox.renderAppDialogHtml();
  assert.match(dialog, /data-search="Delivery delivery delivery system"/);
  assert.match(dialog, /value="deliv"/);
  assert.equal((dialog.match(/class="app-dialog-choice move-parent"[^>]* hidden/g) || []).length, 2, 'the two others are hidden');
  run(page.sandbox, "appDialog.query = 'zzz'");
  assert.doesNotMatch(page.sandbox.renderAppDialogHtml(), /class="move-empty muted" hidden/, '“No parent matches.” shows');
});

test('with no comparison the dialog offers one button and says how to get replaces; with no plateaus it does not mention it', async () => {
  const none = await open({ compare: false });
  edit(none, 'shop.till');
  click(none.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'shop.till' });
  let dialog = none.sandbox.renderAppDialogHtml();
  assert.match(dialog, /data-replaces="0">Move<\/button>/);
  assert.doesNotMatch(dialog, /data-replaces="1"/);
  assert.match(text(dialog), /To write replaces, choose the plateau to compare with in Compare to/);
  const plateaus = await open({ plateaus: false });
  edit(plateaus, 'shop.till');
  click(plateaus.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'shop.till' });
  dialog = plateaus.sandbox.renderAppDialogHtml();
  assert.match(dialog, /data-replaces="0">Move<\/button>/);
  assert.doesNotMatch(text(dialog), /replaces/i);
});

test('confirming moves the element: the dialog closes, the panel follows the element at its new reference, the row is unfolded, and "Save all changes" lights', async () => {
  const page = await open();
  edit(page, 'bakery.oven');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'bakery.oven' });
  const result = page.sandbox.submitMoveDialog(true, { parent: 'bakery.tools' });
  assert.deepEqual(plain(result), { ok: true, reference: 'bakery.tools.oven', replaces: 3 });
  assert.equal(run(page.sandbox, 'appDialog'), null);
  assert.equal(page.state.selection.key, 'bakery.tools.oven');
  assert.equal(page.state.selection.mode, 'edit');
  assert.equal(page.state.expanded.has('application:bakery.tools'), true);
  assert.equal(page.state.expanded.has('application:bakery.tools.oven'), true);
  assert.notEqual(page.sandbox.countUnsavedChanges(), 0);
  assert.doesNotMatch(page.sandbox.renderSaveAllButtonHtml(), /save-all-changes" disabled/);
  assert.match(page.sandbox.renderElementEditionFormHtml('bakery.tools.oven'), /id="edit-id-input" value="oven"/);
});

test('a refusal in the dialog is told there, keeps what was chosen, and changes nothing; with no parent chosen it says so', async () => {
  const page = await open();
  edit(page, 'bakery.oven');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'bakery.oven' });
  const before = snapshot(page);
  assert.equal(page.sandbox.submitMoveDialog(false, { parent: '' }), null);
  assert.match(page.sandbox.renderAppDialogHtml(), /role="alert">Choose the new parent\.</);
  assert.equal(page.sandbox.submitMoveDialog(false, { parent: 'shop' }), null);
  const dialog = page.sandbox.renderAppDialogHtml();
  assert.match(dialog, /role="alert">[^<]*moving it would cut its block out of one file/);
  assert.ok(run(page.sandbox, 'appDialog') !== null, 'the dialog stays open');
  assert.equal(snapshot(page), before);
  // Cancel closes it, nothing changed
  click(page.sandbox, { 'data-action': 'dialog-cancel' });
  assert.equal(run(page.sandbox, 'appDialog'), null);
  assert.equal(snapshot(page), before);
});

test('opening the dialog applies what was typed in the form first (and keeps the dialog shut if the form is invalid)', async () => {
  const page = await open();
  edit(page, 'bakery.oven');
  let flushed = 0;
  run(page.sandbox, 'flushPendingDraft = () => { __flushed(); return true; }'.replace('__flushed()', 'globalThis.__flushed++'));
  run(page.sandbox, 'globalThis.__flushed = 0');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'bakery.oven' });
  assert.equal(run(page.sandbox, 'globalThis.__flushed'), 1, 'the form was applied once');
  assert.equal(run(page.sandbox, 'appDialog.reference'), 'bakery.oven');
  run(page.sandbox, 'closeAppDialog()');
  run(page.sandbox, 'flushPendingDraft = () => false');
  click(page.sandbox, { 'data-action': 'open-move-dialog', 'data-ref': 'bakery.oven' });
  assert.equal(run(page.sandbox, 'appDialog'), null, 'an invalid form shows its own errors and the dialog does not open');
  assert.equal(flushed, 0);
});

// ---- 5. Give up, save, and the layouts of the files ----

test('"Cancel" gives a move up like any other edit: the folder is read again, nothing was written', async () => {
  const page = await open();
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', true).ok, true);
  assert.notEqual(page.sandbox.countUnsavedChanges(), 0);
  const version = run(page.sandbox, 'modelVersion');
  page.sandbox.confirm = () => true;
  await page.sandbox.cancelChanges();
  assert.equal(page.sandbox.countUnsavedChanges(), 0);
  assert.deepEqual(page.mem.writes, []);
  const state = page.sandbox.__state();
  assert.ok(state.index.application.has('bakery.oven') && !state.index.application.has('bakery.tools.oven'));
  assert.ok(run(page.sandbox, 'modelVersion') > version, 'the cache of the comparison is told again');
  assert.deepEqual(Object.fromEntries(page.sandbox.comparisonState().changes.map((r) => [r.reference, r.change])), {});
  assert.deepEqual(changedFiles(page.mem), []);
});

test('a second move after the save, and a move then its undoing by a move back, leave consistent files', async () => {
  const page = await open();
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(move(page.sandbox, 'bakery.tools.oven', 'bakery', false).ok, true);
  await page.sandbox.saveAllChanges();
  // the block is back under the bakery (at the end of its elements), every reference is what it was
  const again = createApp({});
  await again.loadWorkspace(page.mem.handle);
  assert.equal(again.__state().relationshipStats.dangling, 0);
  for (const name of ['app.shop.till.yaml', 'app.shop.till.screen.yaml', 'app.delivery.van.yaml', 'env.prod.yaml', 'view.ovens.yaml']) {
    assert.equal(fileOf(page.mem, name).replace(/"/g, ''), MANIFESTS[name].replace(/"/g, ''), name + ' says what it said');
  }
  assert.ok(fileOf(page.mem, 'app.bakery.yaml').includes('    # the ovens come first\n    - kind: container\n      id: "oven"'), 'the comment went with the block, both ways');
});

test('the layouts of a file: a parent with no elements yet, the last child leaving, a file with Windows line breaks, a block the layout cannot follow', async () => {
  // a parent with no `elements` key gets one; the old parent keeps its other children
  let page = await open();
  assert.equal(move(page.sandbox, 'bakery.oven.timer', 'bakery.shelf', false).ok, true);
  await page.sandbox.saveAllChanges();
  assert.equal(fileOf(page.mem, 'app.bakery.yaml'), BAKERY
    .replace('        - kind: component\n          id: "timer"\n          name: "Timer"\n', '')
    .replace('      name: "Shelf"\n', '      name: "Shelf"\n      elements:\n        - kind: component\n          id: "timer"\n          name: "Timer"\n'));
  // windows line breaks stay windows line breaks, everywhere
  const crlf = BAKERY.replace(/\n/g, '\r\n');
  page = await open({ manifests: Object.assign({}, MANIFESTS, { 'app.bakery.yaml': crlf }) });
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  await page.sandbox.saveAllChanges();
  const saved = fileOf(page.mem, 'app.bakery.yaml');
  assert.equal(saved.split('\r\n').length, saved.split('\n').length, 'every line break is \\r\\n');
  assert.ok(saved.includes('        # the ovens come first\r\n        - kind: container\r\n          id: "oven"\r\n'));
  assert.ok(saved.startsWith('# the bakery: everything that makes bread\r\nheader:') && saved.endsWith('# end of the bakery\r\n'));
  // a one-line list or a map in the block the layout cannot follow: the move works, the file says the right thing (written as the emitter writes it)
  const flow = BAKERY.replace('          name: "Timer"\n', '          name: "Timer"\n          qualifiers: [Gear, Dial]\n          tags: {kind: round}\n');
  page = await open({ manifests: Object.assign({}, MANIFESTS, { 'app.bakery.yaml': flow }) });
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  await page.sandbox.saveAllChanges();
  const again = createApp({});
  await again.loadWorkspace(page.mem.handle);
  const timer = again.__state().index.application.get('bakery.tools.oven.timer');
  assert.deepEqual(plain(timer.qualifiers), ['Gear', 'Dial']);
  assert.deepEqual(plain(timer.tags), { kind: 'round' });
});

test('the comments on lines of their own inside the block go with it; the ones after its last line are the next element\'s', async () => {
  const commented = BAKERY
    .replace('        - kind: component\n          id: "timer"', '        # the timer, which counts\n        - kind: component\n          id: "timer"')
    .replace('          name: "Timer"\n', '          name: "Timer"\n        # after the oven\n');
  const page = await open({ manifests: Object.assign({}, MANIFESTS, { 'app.bakery.yaml': commented }) });
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  await page.sandbox.saveAllChanges();
  const saved = fileOf(page.mem, 'app.bakery.yaml');
  assert.ok(saved.includes('            # the timer, which counts\n            - kind: component\n              id: "timer"\n              name: "Timer"\n'), 'the comment between two children went with them, one level deeper');
  assert.ok(saved.includes('        - destination: "bakery.tools.oven.gauge"\n          label: "checks"\n'));
  assert.equal((saved.match(/# after the oven/g) || []).length, 1, 'the comment after the last line is not lost');
  assert.ok(saved.indexOf('# after the oven') < saved.indexOf('# the mixer is on its own'), 'it stays where it was, with what follows it');
});

test('a block with a text over several lines, an end-of-line comment and a blank line moves whole', async () => {
  const rich = BAKERY.replace('      description: "Bakes \\"the\\" bread: 220 degrees, no more."\n', '      description: |   # why\n        Bakes the bread.\n\n        No more than 220 degrees.\n      name2: x  # note\n');
  const page = await open({ manifests: Object.assign({}, MANIFESTS, { 'app.bakery.yaml': rich }) });
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  await page.sandbox.saveAllChanges();
  const saved = fileOf(page.mem, 'app.bakery.yaml');
  const again = createApp({});
  await again.loadWorkspace(page.mem.handle);
  assert.equal(again.__state().index.application.get('bakery.tools.oven').description, 'Bakes the bread.\n\nNo more than 220 degrees.\n');
  assert.ok(saved.includes('          description: |   # why\n            Bakes the bread.\n\n            No more than 220 degrees.\n          name2: x  # note\n          elements:\n'), 'the text over several lines, its blank line and the comments at the end of the lines, one level deeper');
});

test('the Move offered by the page ends in the choke point of the cache: a render without an edit does not serialise, a move does invalidate', async () => {
  const page = await open();
  page.sandbox.comparisonState();
  const first = run(page.sandbox, 'comparisonCache');
  page.sandbox.comparisonState();
  assert.equal(run(page.sandbox, 'comparisonCache'), first, 'same version, same answer');
  assert.equal(move(page.sandbox, 'bakery.oven', 'bakery.tools', false).ok, true);
  const second = page.sandbox.comparisonState();
  assert.notEqual(run(page.sandbox, 'comparisonCache'), first);
  assert.ok(second.changes.some((r) => r.reference === 'bakery.tools.oven' && r.change === 'new'));
});

test('the manual describes the move, and the texts about replaces and rename point at it', () => {
  const manual = fs.readFileSync(path.resolve(__dirname, '../../../doc/README.adoc'), 'utf8');
  assert.match(manual, /\[\[editor-move\]\]/);
  const section = manual.slice(manual.indexOf('[[editor-move]]'), manual.indexOf('[[editor-theme]]'));
  for (const phrase of ['Move and write replaces', 'Move only', 'header.parent', 'another file', 'Cancel']) assert.ok(section.includes(phrase), phrase);
  const replaces = manual.slice(manual.indexOf('[[editor-replaces]]'), manual.indexOf('[[editor-move]]'));
  assert.match(replaces, /<<editor-move>>/);
  assert.match(manual, /rename[^\n]*<<editor-move>>|<<editor-move>>[^\n]*rename/i);
});
