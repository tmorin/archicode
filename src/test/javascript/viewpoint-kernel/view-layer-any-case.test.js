'use strict';
// The layer of a saved view is read in any case by the editor, as the command line reads it (wave 016, run 0108, issue #108): `layer: Technology` and `layer: TECHNOLOGY` are the
// technology layer, wherever the page reads the layer of a view (the problem of a view, the page a view opens, the recipe of its diagram, its definition, the rename of an element),
// and what is written is never changed because of the case. The case both tools run is N86 of src/test/resources/brightcart/negative-cases.json (on the layered Brightcart).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const view = (id, viewpoint, layer, properties) =>
  'header:\n  kind: "archicode.morin.io/view"\n  version: "1"\ncontent:\n  id: "' +
  id +
  '"\n  viewpoint: "' +
  viewpoint +
  '"\n  layer: ' +
  layer +
  '\n  properties:\n' +
  properties;
const FILES = {
  '.archicode.yaml': 'settings:\n  manifests:\n    paths: ["manifests"]\n',
  'manifests/shop.yaml': 'header:\n  kind: "archicode.morin.io/system"\n  version: "1"\ncontent:\n  id: "shop"\n',
  'manifests/prod.yaml':
    'header:\n  kind: "archicode.morin.io/environment"\n  version: "1"\ncontent:\n  id: "prod"\n  name: "Production"\n',
  'manifests/v-title.yaml': view('v_title', 'overview', 'Technology', '    element: "prod"\n'),
  'manifests/v-upper.yaml': view('v_upper', 'detailed', 'TECHNOLOGY', '    element: "prod"\n'),
  'manifests/v-map.yaml': view('v_map', 'map', '"Technology"', '    pinned: ["prod"]\n'),
  'manifests/v-app.yaml': view('v_app', 'overview', 'Application', '    element: "shop"\n'),
  'manifests/v-wrong.yaml': view('v_wrong', 'overview', 'Technology', '    element: "shop"\n')
};

async function open() {
  const mem = memFolder(FILES);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  return { sandbox, state, mem };
}

test('the layer of a view is the technology layer in any case, and the application layer for anything else', async () => {
  const { sandbox } = await open();
  for (const spelled of ['technology', 'Technology', 'TECHNOLOGY', 'tEcHnOlOgY'])
    assert.equal(sandbox.viewLayerOf({ layer: spelled }), 'technology', spelled);
  for (const spelled of ['application', 'Application', 'APPLICATION', undefined, null, '', 7, 'nope'])
    assert.equal(sandbox.viewLayerOf({ layer: spelled }), 'application', String(spelled));
  assert.equal(sandbox.viewLayerOf(undefined), 'application');
  assert.equal(
    sandbox.entryLayerOf('Technology'),
    sandbox.viewLayerOf({ layer: 'Technology' }),
    'the check of the names and the rest of the page read it the same way'
  );
});

test('a view of the technology layer in capitals can be drawn: no problem, the page it opens, its recipe, its definition', async () => {
  const { sandbox, state } = await open();
  for (const id of ['v_title', 'v_upper', 'v_map']) {
    const saved = sandbox.findSavedView(id);
    assert.equal(sandbox.viewProblem(saved), null, id);
    const recipe = sandbox.libraryDiagramRecipe(saved);
    assert.ok(recipe, id + ' has a recipe');
    assert.equal(recipe.layer, 'technology', id);
    assert.equal(sandbox.canonicalViewDefinition(saved).layer, 'technology', id);
  }
  assert.equal(
    sandbox.libraryDiagramRecipe(sandbox.findSavedView('v_title')).record.reference,
    'prod',
    'the element is looked up in the technology layer'
  );
  assert.equal(sandbox.applySavedView(sandbox.findSavedView('v_map')), null);
  assert.equal(
    vm.runInContext('currentPerspective', sandbox),
    'environments',
    'a map of the technology layer is the page Environments'
  );
  assert.equal(sandbox.applySavedView(sandbox.findSavedView('v_upper')), null);
  assert.equal(vm.runInContext('currentPerspective', sandbox), 'elements');
  assert.equal(state.selection.layer, 'technology');
  assert.equal(state.selection.key, 'prod');
  assert.equal(sandbox.viewProblem(sandbox.findSavedView('v_app')), null, 'Application is the application layer');
});

test('a view of the technology layer that names an application element is broken, whatever the case of its layer', async () => {
  const { sandbox } = await open();
  assert.equal(
    sandbox.viewProblem(sandbox.findSavedView('v_wrong')),
    'the view `v_wrong` names `shop`, which does not exist'
  );
});

test('the diagram on screen is the view whose layer is in capitals: no second view is made for it', async () => {
  const { sandbox } = await open();
  const before = sandbox.savedViews().length;
  const definition = sandbox.canonicalViewDefinition(sandbox.findSavedView('v_title'));
  assert.equal(sandbox.viewForDefinition(definition, 'Another name').id, 'v_title');
  assert.equal(sandbox.savedViews().length, before);
});

test('what is written is not changed because of the case: the layer is rewritten only when the author changes it, and a rename follows a view whatever its case', async () => {
  const { sandbox, mem } = await open();
  const map = sandbox.findSavedView('v_map');
  assert.equal(sandbox.setViewLayer(map, 'technology'), false, 'the layer it already has is not set again');
  assert.equal(map.layer, 'Technology');
  assert.equal(sandbox.setViewLayer(map, 'application'), true, 'a change of layer is a change');
  assert.equal(map.layer, 'application');
  const title = sandbox.findSavedView('v_title');
  assert.equal(
    sandbox.rewriteRecipeReferences(title, 'prod', 'live', 'technology'),
    true,
    'a rename in the technology layer follows a view of Technology'
  );
  assert.equal(title.properties.element, 'live');
  assert.equal(
    sandbox.rewriteRecipeReferences(sandbox.findSavedView('v_upper'), 'prod', 'live', 'application'),
    false,
    'and not one of the application layer'
  );
  assert.deepEqual(mem.writes, [], 'nothing was saved by reading them');
});
