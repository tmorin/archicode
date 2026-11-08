'use strict';
// The workspace `archicode import likec4` writes from the sample: the golden folder src/test/resources/likec4-expected/. The editor
// opens it with no mistake, no duplicate reference and as many elements as the golden holds. The command line's side is LikeC4ImportIT.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const EXPECTED = path.resolve(__dirname, '../../resources/likec4-expected');

/** The golden folder as the files the user gets. */
function written() {
  const files = {};
  const walk = (rel) => {
    for (const entry of fs.readdirSync(path.join(EXPECTED, rel), { withFileTypes: true })) {
      const next = rel ? rel + '/' + entry.name : entry.name;
      if (entry.isDirectory()) walk(next);
      else files[next] = fs.readFileSync(path.join(EXPECTED, next), 'utf8');
    }
  };
  walk('');
  return files;
}

/** The elements the golden holds: one manifest file for each, named by its reference. */
function goldenElements(files) {
  return Object.keys(files).filter((name) => name.startsWith('manifests/') && name.endsWith('.yaml')).length;
}

test('the editor opens the workspace the import of the sample writes, with all its elements', async () => {
  const files = written();
  assert.ok(files['.archicode.yaml']);
  const expected = goldenElements(files);
  assert.ok(expected > 0);
  const mem = memFolder(files);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'cloud' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  assert.equal(state.fatalError, null);
  assert.ok(state.manifestFiles.length > 0);
  for (const f of state.manifestFiles) assert.equal(f.error, null, f.relPath);
  assert.deepEqual(JSON.parse(JSON.stringify(state.duplicateReferences)), []);
  assert.equal(state.index.application.size, expected);
});
