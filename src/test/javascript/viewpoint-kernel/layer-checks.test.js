'use strict';
// The checks of a layer and the nesting rule in the editor (run 0093, wave 015, W-5; issues #90 and #87). The cases are in layer-checks-cases.json, which the command line runs too
// (LayerLoaderTest.java): the two tools tell the same sentences in the same order. The command line stops at the first layer that is wrong and draws nothing; the editor tells the
// sentences of that layer and draws the plateau all the same, so that it can be repaired: the cases say which of the two each tool does. The rule "which kind a parent holds" is
// the table of the cases, which the classes of the command line are compared with (LayerLoaderTest.theClassesSayWhichKindEachParentHolds) and the page derives from READ_SCHEMA.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'layer-checks-cases.json'), 'utf8'));
const SETTINGS = 'settings:\n  manifests:\n    paths: ["manifests/**"]\n';
const plain = (value) => JSON.parse(JSON.stringify(value));

async function open(files) {
  const mem = memFolder(Object.assign({ 'workspace.yaml': SETTINGS }, files));
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel(); // the patches of a layer are applied by the kernel
  assert.equal(state.fatalError, null, 'the folder opens: ' + state.fatalError);
  return { sandbox, state };
}

const referencesOf = (map) => Array.from(map.keys()).sort();

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const { sandbox, state } = await open(c.files);
    for (const f of state.manifestFiles) assert.equal(f.error, null, f.relPath + ' is read');
    const model = sandbox.layerModelOf(c.plateau === null ? 'baseline' : c.plateau, state.workspace.settings);
    const expect = c.editor;
    // the sentences of the first layer of the chain that is wrong, or none
    assert.deepEqual(plain(model.problems), expect.problems, 'the sentences');
    assert.equal(model.failedAt, expect.failedAt, 'the plateau that is wrong');
    // what a view and a story name is not a mistake of a layer: the page tells it apart, whatever plateau is drawn (run 0100, issue #100)
    assert.deepEqual(plain(sandbox.entryProblemsOf(state.workspace.settings)), expect.entryProblems || [], 'what the views and the stories name');
    // the editor draws the plateau all the same
    assert.equal(model.undrawable, false);
    assert.deepEqual({ application: referencesOf(model.index.application), technology: referencesOf(model.index.technology) }, expect.drawn, 'what is drawn');
    // and the command line tells the same sentences when it stops (the cases of the command line are the same sentences, in the same order): those of the first layer that is
    // wrong, else those of the views and stories, which it checks once the layers are loaded
    if (c.cli.error !== undefined) assert.deepEqual(plain(model.problems || sandbox.entryProblemsOf(state.workspace.settings)), c.cli.error, 'the command line says what the page says');
    else assert.deepEqual(expect.drawn, c.cli.loaded, 'a plateau that is fine is drawn by both');
  });
}

// ---- the nesting rule

const HOLDS = DOCUMENT.nesting.holds;

test('the page derives the kinds a parent holds from READ_SCHEMA, and they are the table of the cases', () => {
  const sandbox = createApp({});
  for (const [level, kinds] of Object.entries(HOLDS)) {
    const options = Array.from(sandbox.childKindOptionsForLevel(level));
    assert.deepEqual(options.slice().sort(), kinds.slice().sort(), 'the kinds a ' + level + ' holds');
  }
  for (const level of ['group', 'application', 'technology', 'view', 'unknown', '', null, undefined, 7]) assert.deepEqual(Array.from(sandbox.childKindOptionsForLevel(level)), [], 'a level that is no parent holds nothing: ' + String(level));
});

test('every parent of READ_SCHEMA that holds elements is in the table of the cases, with the same kinds', () => {
  const sandbox = createApp({});
  const schema = vm.runInContext('READ_SCHEMA', sandbox);
  const holders = Object.entries(schema.types).filter(([name, def]) => def.fields && def.fields.elements && /^(Solution|System|Container|Environment|Node)$/.test(name));
  assert.deepEqual(holders.map(([name]) => name.toLowerCase()).sort(), Object.keys(HOLDS).filter((kind) => HOLDS[kind].length).sort());
  for (const [name, def] of holders) {
    const iface = def.fields.elements.slice(2, -1);
    assert.deepEqual(Object.keys(schema.kinds[iface]).sort(), HOLDS[name.toLowerCase()].slice().sort(), name);
  }
});

const APPLICATION = ['solution', 'system', 'container', 'component', 'person'];
const TECHNOLOGY = ['environment', 'node'];
const manifest = (kind, id, parent, body) => 'header:\n  kind: "archicode.morin.io/' + kind + '"\n  version: "1"\n' + (parent ? '  parent: "' + parent + '"\n' : '') + 'content:\n  id: "' + id + '"\n' + (body || '');

for (const layer of [APPLICATION, TECHNOLOGY]) {
  for (const parentKind of layer) {
    {
      for (const childKind of layer) {
        test('a ' + childKind + ' under a ' + parentKind + ' is ' + (HOLDS[parentKind].includes(childKind) ? 'accepted' : 'told'), async () => {
          const under = 'p';
          const { sandbox, state } = await open({
            'manifests/parent.yaml': manifest(parentKind, 'p', null),
            'manifests/child.yaml': manifest(childKind, 'c', under)
          });
          const model = sandbox.layerModelOf('baseline', state.workspace.settings);
          const allowed = HOLDS[parentKind];
          if (allowed.includes(childKind)) {
            assert.equal(model.problems, null);
            const index = layer === APPLICATION ? model.index.application : model.index.technology;
            assert.ok(index.get(under + '.c'), 'the child is drawn');
            assert.deepEqual(plain(index.get(under).children.map((child) => child.reference)), [under + '.c'], 'under its parent');
          } else {
            assert.deepEqual(plain(model.problems), ['`manifests/child.yaml` is not valid: unknown kind `' + childKind + '` under `' + under + '` (known: ' + (allowed.length ? allowed.join(', ') : 'none') + ') at `header.kind`']);
          }
        });
      }
    }
  }
}

// ---- the kinds a layer holds at its top (issue #106, wave 016 run 0108)

const TOP = DOCUMENT.nesting.top;
const PLATEAU = manifest('plateau', 'p1');

test('the page derives the kinds a layer holds at its top from READ_SCHEMA, and they are the table of the cases', () => {
  const sandbox = createApp({});
  assert.deepEqual(plain(sandbox.topLevelKindsOf('application')), TOP.application);
  assert.deepEqual(plain(sandbox.topLevelKindsOf('technology')), TOP.technology);
});

for (const layered of [true, false]) {
  for (const [layer, kinds] of [['application', APPLICATION], ['technology', TECHNOLOGY]]) {
    for (const kind of kinds) {
      const held = TOP[layer].includes(kind);
      test('a ' + kind + ' with no header.parent is ' + (layered && !held ? 'told' : 'accepted') + ' in a workspace with' + (layered ? '' : 'out') + ' plateaus', async () => {
        const { sandbox, state } = await open(Object.assign({ 'manifests/r.yaml': manifest(kind, 'r') }, layered ? { 'manifests/p1/plateau.yaml': PLATEAU } : {}));
        const model = sandbox.layerModelOf('baseline', state.workspace.settings);
        if (layered && !held) {
          assert.deepEqual(plain(model.problems), ['`manifests/r.yaml` is not valid: unknown kind `' + kind + '` with no `header.parent` (known: ' + TOP[layer].join(', ') + ') at `header.kind`']);
        } else {
          assert.equal(model.problems, null);
        }
        assert.ok(model.index[layer].get('r'), 'it is drawn where its manifest puts it, so that it can be repaired');
      });
    }
  }
}
