'use strict';
// A reference that leads nowhere is told with the element that holds it, the file that declares it and the key (run 0165, wave 023, W-2, issue #159; V-B). The cases are in
// dangling-reference-cases.json, which the command line runs too (DanglingReferenceCasesTest.java): the two tools tell the same sentences. A workspace with no plateau is told
// without the plateau, a layered one with it.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'dangling-reference-cases.json'), 'utf8'));
const SETTINGS = 'settings:\n  manifests:\n    paths: ["manifests/**"]\n';
const plain = (value) => JSON.parse(JSON.stringify(value));

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const mem = memFolder(Object.assign({ '.archicode.yaml': SETTINGS }, c.files));
    const sandbox = createApp({});
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    await sandbox.loadViewpointKernel();
    assert.equal(state.fatalError, null, 'the folder opens: ' + state.fatalError);
    const model = sandbox.layerModelOf(c.plateau === null ? 'baseline' : c.plateau, state.workspace.settings);
    assert.deepEqual(plain(model.problems), c.editor.problems, 'the sentences');
    // the command line tells the same sentences, whichever command it fails on (and one it does not fail on is not a mistake of the page either)
    for (const [command, lines] of Object.entries(c.cli)) {
      if (lines !== null)
        assert.deepEqual(
          lines,
          c.editor.problems.filter((line) => lines.includes(line)),
          command + ': the page tells what the command line tells'
        );
    }
    // the page draws what it can all the same, so that the mistake can be repaired
    assert.equal(model.undrawable, false);
  });
}
