'use strict';
// A saved view, or a story step with its own recipe, that has no element or names one that exists nowhere is told with the same sentence by both tools (run 0180, wave 024,
// W-3, issue #170). The cases are in view-problem-cases.json, which the command line runs too (ViewProblemCasesTest.java).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'view-problem-cases.json'), 'utf8'));
const SETTINGS = 'settings:\n  manifests:\n    paths: ["manifests/**"]\n';

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
    let problem;
    if (c.step === undefined) {
      const view = sandbox.findSavedView(c.view);
      assert.ok(view, 'the view is there');
      problem = sandbox.viewProblem(view);
    } else {
      const story = sandbox.findStory(c.view);
      assert.ok(story, 'the story is there');
      problem = sandbox.stepProblem(story.steps[c.step - 1], null, c.step);
    }
    assert.equal(problem, c.editor.problem, 'the sentence of the page');
    // the command line tells the same sentence, whichever command it fails on
    for (const [command, lines] of Object.entries(c.cli)) {
      assert.deepEqual(lines, [problem], command + ': the page tells what the command line tells');
    }
  });
}
