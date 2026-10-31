'use strict';
// The workspaces `archicode plateau fold` writes (wave 028, run 0208, DEC-10, issue #65): the editor opens them with no mistake, finds the plateaus that remain and
// not the one folded away. The cases are the hand-made write cases of fold-cases.json (a case with no `base`, so its files and its `expect.files` are whole texts): the
// folder before is `files`, the folder after is `files` with `expect.files` written over it (null deletes). The command line's side is PlateauFoldServiceTest and
// PlateauFoldCommandTest; the folded Brightcart is opened by the loader in PlateauFoldBeforeAfterTest, not here (RISK-6).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const CASES = JSON.parse(fs.readFileSync(path.join(__dirname, 'fold-cases.json'), 'utf8')).cases;

/** The plateaus the editor must find after the fold, by case: the root, the plateaus that stay. A TOML or a JSON manifest is a file the editor does not read (F25). */
const PLATEAUS_AFTER = {
  F20: ['b'],
  F21: ['p', 'r'],
  F22: ['b'],
  F23: ['b'],
  F25: []
};
const FOLDED = { F20: 'a', F21: 'q', F22: 'a', F23: 'a', F25: 'a' };

/** The folder the writer leaves: the files of the case, then the new texts, a null deleting the file. */
function folded(c) {
  const files = { ...c.files };
  for (const [file, text] of Object.entries(c.expect.files)) {
    if (text === null) delete files[file];
    else files[file] = text;
  }
  return files;
}

async function open(files) {
  const mem = memFolder(files);
  const sandbox = createApp();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'folded' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  await sandbox.loadViewpointKernel();
  return state;
}

const written = CASES.filter((c) => c.base === null && c.expect.files);

test('the cases of the test are the write cases of fold-cases.json with exact texts', () => {
  assert.deepEqual(written.map((c) => c.id).sort(), Object.keys(PLATEAUS_AFTER).sort());
  for (const c of written) {
    for (const text of Object.values(c.expect.files)) assert.notEqual(text, 'changed', c.id);
  }
});

for (const c of written) {
  test(`${c.id}: the editor opens the workspace before and after the fold of \`${FOLDED[c.id]}\``, async () => {
    const before = await open(c.files);
    assert.equal(before.fatalError, null, 'before');
    for (const f of before.manifestFiles) assert.equal(f.error, null, 'before ' + f.relPath);
    const state = await open(folded(c));
    assert.equal(state.fatalError, null);
    for (const f of state.manifestFiles) assert.equal(f.error, null, f.relPath);
    const ids = Array.from(state.plateauTree.ids);
    assert.deepEqual(ids, ['baseline', ...PLATEAUS_AFTER[c.id]]);
    assert.equal(state.plateauTree.nodes.has(FOLDED[c.id]), false, 'the folded plateau is gone');
    assert.deepEqual(JSON.parse(JSON.stringify(state.duplicateReferences)), []);
  });
}

test('F21: the plateau above overrides the plateau the folded one overrode', async () => {
  const c = written.find((x) => x.id === 'F21');
  const state = await open(folded(c));
  assert.equal(state.plateauTree.nodes.get('r').parent, 'p');
});
