'use strict';
// The model of ArchiCode itself, `docs/architecture/` (wave 029, run 0209), opens in the editor: no problem, 35 to 45 elements, 4 or 5 saved
// views, and no error or warning on the console. `ArchitectureModelTest.java` loads the same folder with the command line. The test reads the
// folder and writes nothing into it.
// Run with: node --test src/test/javascript/architecture-model.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./viewpoint-kernel/harness');

const REPO = path.resolve(__dirname, '../../..');
const FOLDER = path.join(REPO, 'docs/architecture');

/** What is wrong with the workspace the editor has just loaded, as sentences; none when it opened (the rule of shipped-files.test.js). */
function problemsOf(state) {
  const problems = [];
  if (state.fatalError) problems.push(state.fatalError);
  if (state.layerProblems) problems.push(...state.layerProblems);
  for (const f of state.manifestFiles) if (f.error) problems.push('`' + f.relPath + '` is not valid: ' + f.error);
  for (const d of state.duplicateReferences) problems.push(d.message);
  if (state.plateauTree) problems.push(...state.plateauTree.problems, ...state.plateauTree.redeclared);
  for (const f of state.unreadManifestFiles)
    problems.push('`' + f + '` is read by the command line and not by the editor');
  if (state.baseline && state.baseline.problem) problems.push(state.baseline.problem);
  return problems;
}

test('the model has a workspace file', () => {
  assert.ok(fs.existsSync(path.join(FOLDER, '.archicode.yaml')), 'docs/architecture/.archicode.yaml is missing');
});

test('the model of ArchiCode opens in the editor with no problem and no console error', async (t) => {
  assert.ok(fs.existsSync(path.join(FOLDER, '.archicode.yaml')), 'docs/architecture/.archicode.yaml is missing');
  const error = t.mock.method(console, 'error', () => {});
  const warn = t.mock.method(console, 'warn', () => {});
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(FOLDER);
  state.folder = { handle, name: 'architecture' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();

  assert.deepEqual(problemsOf(state), [], 'the model does not open in the editor');
  const count = state.index.application.size + state.index.technology.size;
  assert.ok(count >= 35 && count <= 45, 'the model has 35 to 45 elements: ' + count);
  assert.ok(state.index.technology.size > 0, 'the model has a technology layer');
  const dangling = [];
  for (const layer of [state.index.application, state.index.technology])
    for (const record of layer.values())
      for (const relationship of record.relationships)
        if (!relationship.resolved)
          dangling.push(record.reference + ' points at ' + relationship.destination + ', which does not exist');
  assert.deepEqual(dangling, [], 'a relationship leads to no element');
  const views = sandbox.savedViews().map((view) => view.id);
  assert.ok(views.length >= 4 && views.length <= 5, 'the model has 4 or 5 saved views: ' + views.join(', '));
  assert.equal(error.mock.callCount(), 0, 'the console received an error');
  assert.equal(warn.mock.callCount(), 0, 'the console received a warning');
});

test('the model folder holds only YAML and no generated views folder', () => {
  assert.ok(fs.existsSync(FOLDER), 'docs/architecture is missing');
  const offenders = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const rel = path.relative(FOLDER, full).split(path.sep).join('/');
      if (entry.isDirectory()) {
        if (entry.name.startsWith('views') && rel !== 'manifests/views') offenders.push(rel);
        walk(full);
      } else if (!entry.name.endsWith('.yaml')) offenders.push(rel);
    }
  };
  if (fs.existsSync(FOLDER)) walk(FOLDER);
  assert.deepEqual(offenders, []);
});
