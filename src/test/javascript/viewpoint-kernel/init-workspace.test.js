'use strict';
// The workspace `archicode init` writes (wave 022, run 0160, T5, issue #144): the files are the resources of src/main/resources/init, and the
// editor opens them with no mistake, finds the person, the system, its container and the relationship, and the saved view. The command line's
// side (it loads and draws, the refusals) is InitTest and InitIT; this is the editor's, as CLAUDE.md requires of a form the repository ships.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const INIT = path.resolve(__dirname, '../../../main/resources/init');

/** The files `init` writes, as the folder the user gets: `archicode.yaml` is written as `.archicode.yaml`. */
function written() {
  const files = { '.archicode.yaml': fs.readFileSync(path.join(INIT, 'archicode.yaml'), 'utf8') };
  for (const name of fs.readdirSync(path.join(INIT, 'manifests'))) {
    files['manifests/' + name] = fs.readFileSync(path.join(INIT, 'manifests', name), 'utf8');
  }
  return files;
}

test('the editor opens the workspace init writes, with the elements, the relationship and the view', async () => {
  const files = written();
  assert.equal(Object.keys(files).length, 4);
  const mem = memFolder(files);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'fresh' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  for (const f of state.manifestFiles) assert.equal(f.error, null, f.relPath);
  assert.deepEqual(JSON.parse(JSON.stringify(state.duplicateReferences)), []);
  assert.deepEqual(Array.from(state.index.application.keys()).sort(), ['customer', 'shop', 'shop.web']);
  assert.equal(state.index.application.get('customer').relationships[0].resolved, true);
  assert.equal(state.index.application.get('customer').relationships[0].destination, 'shop.web');
  const views = JSON.stringify(state.manifestFiles.map((f) => f.relPath));
  assert.ok(views.includes('view.shop_overview.yaml'), views);
  // the input the editor hands the kernel to draw the system of the view
  const input = sandbox.buildKernelInput('overview', 'shop');
  assert.ok(input && input.input, 'a kernel input for the view');
});
