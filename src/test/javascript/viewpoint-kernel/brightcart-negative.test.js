'use strict';
// The negative variants of the document that today's tools can run (wave 013, run 0070), in the editor: each case of
// src/test/resources/brightcart/negative-cases.json is the folders of Brightcart with one alteration, built in a temporary folder from folders/
// (nothing negative is committed as a workspace), opened as the editor opens a folder, and the page says the sentence of the command line
// (`BrightcartNegativeCasesTest.java` runs the same file) or its stated equivalent: the editor's banners start with a capital and end with a
// full stop, the plateau rules come under "Could not read the plateaus of workspace.yaml:", and the keys and shapes of workspace.yaml under "Could not read/parse workspace.yaml: " (run 0072).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');

const ROOT = path.resolve(__dirname, '../../resources/brightcart');
const FOLDERS = path.join(ROOT, 'folders');
const CASES = JSON.parse(fs.readFileSync(path.join(ROOT, 'negative-cases.json'), 'utf8')).cases;

/** The alteration of a case, on a copy of folders/ in a temporary folder, which is returned. */
function altered(ops) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcart-negative-'));
  fs.cpSync(FOLDERS, dir, { recursive: true });
  for (const op of ops) {
    if (op.op === 'replace') {
      const file = path.join(dir, op.file);
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(text.includes(op.from), 'the text to replace is not in ' + op.file + ': ' + op.from);
      fs.writeFileSync(file, text.replace(op.from, () => op.to));
    } else if (op.op === 'write') {
      fs.mkdirSync(path.dirname(path.join(dir, op.file)), { recursive: true });
      fs.writeFileSync(path.join(dir, op.file), op.text);
    } else if (op.op === 'copy') {
      fs.cpSync(path.join(dir, op.from), path.join(dir, op.to), { recursive: true });
    } else if (op.op === 'delete') {
      fs.rmSync(path.join(dir, op.path), { recursive: true });
    } else {
      assert.fail('unknown operation ' + op.op);
    }
  }
  return dir;
}

async function open(dir) {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(dir);
  state.folder = { handle, name: path.basename(dir) };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  return { sandbox, state };
}

/** What the page says about the plateau it has drawn, as the fields of a case's `expect`; only what is not empty. */
function said(sandbox, state, compared) {
  const out = {};
  if (state.fatalError) out.fatalError = state.fatalError;
  if (state.plateauProblem) out.plateauProblem = state.plateauProblem;
  if (state.baseline && state.baseline.problem) out.baselineProblem = state.baseline.problem;
  const errors = state.manifestFiles.filter((f) => f.error);
  if (errors.length) out.manifestErrors = Object.fromEntries(errors.map((f) => [f.relPath, f.error]));
  if (state.relationshipStats.dangling) out.danglingRelationships = state.relationshipStats.dangling; // told by a badge on the relationship, not by a sentence
  if (state.duplicateReferences.length) out.duplicates = state.duplicateReferences.map((d) => d.message);
  if (compared && state.baseline && !state.baseline.problem) {
    const warnings = sandbox.comparisonState().warnings;
    if (warnings.length) out.warnings = warnings;
  }
  return JSON.parse(JSON.stringify(out)); // the page's arrays come from another realm
}

for (const c of CASES) {
  if (c.editor === null) {
    test(c.id + ' ' + c.title + ': nothing to type in the editor', () => {
      assert.ok(typeof c.reason === 'string' && c.reason.trim() !== '', 'a case the editor does not run says why');
    });
    continue;
  }
  test(c.id + ' ' + c.title, async () => {
    const dir = altered(c.ops);
    try {
      const { sandbox, state } = await open(dir);
      for (const step of c.editor) {
        const label = c.id + ' plateau ' + step.plateau + ' compare ' + step.compareTo;
        if (!state.fatalError) {
          if (step.plateau !== null && state.plateau.id !== step.plateau) await sandbox.switchPlateau(step.plateau);
          if (step.compareTo !== null) await sandbox.setCompareTo(step.compareTo);
        }
        const expect = Object.assign({}, step.expect);
        const comparedWith = expect.comparedWith;
        delete expect.comparedWith;
        assert.deepEqual(said(sandbox, state, step.compareTo !== null), expect, label);
        if (comparedWith !== undefined) {
          assert.equal(state.baseline.plateau.id, comparedWith, label + ': the plateau it is compared with');
          assert.equal(state.baseline.problem, null, label);
        }
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('the editor sentences are the command line sentences, up to the capital, the full stop and the heading of the plateau rules', () => {
  // the case table spells both; this keeps them from drifting apart
  const normal = (text) => text.replace(/^Could not read the plateaus of workspace\.yaml:\n/, '').replace(/^Could not read\/parse workspace\.yaml: /, '').replace(/^[A-Z]/, (l) => l.toLowerCase()).replace(/\.$/, '');
  for (const c of CASES) {
    if (c.editor === null) continue;
    const cliLines = new Set(c.cli.flatMap((command) => command.stderr).map((line) => normal(line.replace(/^(error|warning): /, '').replace(/ \(line \d+, column \d+\)$/, '').replace(/^`[^`]+` is not valid: /, ''))));
    for (const step of c.editor) {
      const texts = [];
      for (const [key, value] of Object.entries(step.expect)) {
        if (key === 'comparedWith' || typeof value === 'number') continue;
        if (typeof value === 'string') texts.push(value);
        else if (Array.isArray(value)) texts.push(...value);
        else texts.push(...Object.values(value));
      }
      for (const text of texts) assert.ok(cliLines.has(normal(text)), c.id + ': the editor says "' + text + '" and the command line does not say it');
    }
  }
});

test('a plateau id the editor does not know changes nothing: it offers the ones the workspace has', async () => {
  const { sandbox, state } = await open(FOLDERS);
  const before = state.plateau.id;
  const compareBefore = state.compareTo;
  await sandbox.switchPlateau('saaz');
  assert.equal(state.plateau.id, before);
  assert.equal(state.plateauProblem, null);
  assert.equal(state.fatalError, null);
  await sandbox.setCompareTo('basline');
  assert.equal(state.compareTo, compareBefore, 'a comparison it does not know does not replace the choice');
});
