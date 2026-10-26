'use strict';
// Wave 024, run 0179 (W-2), issue #167: no step of a shipped story draws nothing. The rule is the editor's own, `diagramHasNothingToDraw`: a diagram with one box or none and no
// link says "Nothing to show" (`diagram-empty`). The stories are discovered in the shipped workspaces, not listed; the steps that are empty on purpose are listed, with a reason,
// in `src/test/resources/stories/empty-steps.json` (an array of `{ story, step, reason }`, `step` counted from 1), which the Java invariant reads too.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { run, startPage } = require('./library-page');

const REPO = path.resolve(__dirname, '../../../..');
const WORKSPACES = [
  path.join(REPO, 'src/doc/examples/domain_plateaus'),
  path.join(REPO, 'src/test/resources/brightcart/layered')
];
const EMPTY_STEPS = path.join(REPO, 'src/test/resources/stories/empty-steps.json');

function filesOf(dir, prefix = '') {
  const out = {};
  for (const entry of fs.readdirSync(path.join(dir, prefix), { withFileTypes: true })) {
    const rel = prefix ? prefix + '/' + entry.name : entry.name;
    if (entry.isDirectory()) Object.assign(out, filesOf(dir, rel));
    else out[rel] = fs.readFileSync(path.join(dir, rel), 'utf8');
  }
  return out;
}

test('every step of every shipped story draws something, or is listed as empty on purpose', async () => {
  const exceptions = JSON.parse(fs.readFileSync(EMPTY_STEPS, 'utf8'));
  assert.ok(Array.isArray(exceptions), 'the exceptions are an array');
  for (const entry of exceptions) {
    assert.equal(typeof entry.story, 'string', 'an exception names a story');
    assert.ok(Number.isInteger(entry.step) && entry.step >= 1, 'an exception names a step, from 1');
    assert.ok(typeof entry.reason === 'string' && entry.reason.trim() !== '', 'an exception has a reason');
  }
  const listed = new Set(exceptions.map((entry) => entry.story + '/' + entry.step));
  const seen = new Set();
  const empty = [];
  let steps = 0;
  let checked = 0;
  let stories = 0;
  for (const dir of WORKSPACES) {
    const page = await startPage({ only: filesOf(dir) });
    await page.show();
    const sandbox = page.sandbox;
    const found = JSON.parse(
      JSON.stringify(
        run(sandbox, 'storiesList()').map((story) => ({ id: story.id, count: sandbox.storySteps(story).length }))
      )
    );
    assert.ok(found.length > 0, 'the workspace ' + path.basename(dir) + ' has stories');
    for (const { id, count } of found) {
      stories++;
      steps += count;
      for (let i = 0; i < count; i++) {
        // the home is the plateau and the comparison on screen when the reader starts: the root, and the step names its own plateau when it has one
        const home = JSON.parse(JSON.stringify(run(sandbox, 'storyHomeNow()')));
        const scene = await sandbox.storyStepScene(id, i, { home });
        assert.equal(scene.problem, null, id + ' step ' + (i + 1) + ' can be drawn');
        checked++;
        const key = id + '/' + (i + 1);
        const nothing = /diagram-empty/.test(scene.diagram.html);
        if (nothing && listed.has(key)) seen.add(key);
        else if (nothing) empty.push(key);
        else if (listed.has(key))
          assert.fail(key + ' is listed as empty but draws something: take it out of empty-steps.json');
      }
    }
  }
  assert.deepEqual(empty, [], 'steps that draw nothing and are not listed in empty-steps.json');
  for (const key of listed) assert.ok(seen.has(key), key + ' is listed but is not a step of a shipped story');
  assert.equal(checked, steps, 'every step was checked, none skipped');
  assert.ok(stories >= 4, 'the four shipped stories were found, got ' + stories);
  assert.ok(checked >= 17, 'the steps of the shipped stories were counted, got ' + checked);
});
