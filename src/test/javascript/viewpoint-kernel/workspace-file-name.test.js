'use strict';
// The workspace file is `.archicode.yaml`, with no alias (wave 019, run 0144, #133, decision T9). A folder that holds `workspace.yaml` and no
// `.archicode.yaml` is told with one sentence, the same as the command line's word for word; the cases are in workspace-file-name-cases.json,
// which the command line runs too (WorkspaceFileNameTest.java).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'workspace-file-name-cases.json'), 'utf8'));

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state };
}

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const { state } = await open(c.files);
    if (c.expect.error !== undefined) {
      assert.equal(state.fatalError, c.expect.error.replace('${sentence}', DOCUMENT.sentence));
      assert.equal(state.workspace, null);
    } else {
      assert.equal(state.fatalError, null);
      assert.ok(state.workspace);
    }
  });
}

test('a folder with neither file is the error it always was, not the sentence', async () => {
  const { state } = await open({ 'notes.yaml': 'a: 1\n' });
  assert.match(state.fatalError, /^Could not read\/parse \.archicode\.yaml: /);
});
