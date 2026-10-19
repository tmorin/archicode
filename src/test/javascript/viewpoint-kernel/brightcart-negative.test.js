'use strict';
// The negative variants of the document that today's tools can run (wave 013, run 0070), in the editor: each case of
// src/test/resources/brightcart/negative-cases.json is the layered Brightcart with one alteration, built in a temporary folder from layered/
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
const LAYERED = path.join(ROOT, 'layered');
const CASES = JSON.parse(fs.readFileSync(path.join(ROOT, 'negative-cases.json'), 'utf8')).cases;

/** The alteration of a case, on a copy of layered/ in a temporary folder, which is returned. */
function altered(ops) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'brightcart-negative-'));
  fs.cpSync(LAYERED, dir, { recursive: true });
  for (const op of ops) {
    if (op.op === 'replace') {
      const file = path.join(dir, op.file);
      const text = fs.readFileSync(file, 'utf8');
      assert.ok(text.includes(op.from), 'the text to replace is not in ' + op.file + ': ' + op.from);
      fs.writeFileSync(file, op.all ? text.split(op.from).join(op.to) : text.replace(op.from, () => op.to));
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
  if (state.plateauTree && state.plateauTree.problems && state.plateauTree.problems.length) out.treeProblems = state.plateauTree.problems;
  if (state.plateauTree && state.plateauTree.redeclared && state.plateauTree.redeclared.length) out.redeclared = state.plateauTree.redeclared; // a reference declared in a plateau and again in its ancestor
  if (state.plateauTree && state.plateauTree.warnings && state.plateauTree.warnings.length) out.treeWarnings = state.plateauTree.warnings; // what the command line warns of when it reads the manifests
  if (state.layerProblems) out.layerProblems = state.layerProblems;
  const entries = state.workspace ? sandbox.entryProblemsOf(state.workspace.settings) : []; // a view or a story that names an element no plateau has (run 0100): not a mistake of the plateau drawn
  if (entries.length) out.entryProblems = entries;
  const viewProblems = {}; // a saved view the plateau drawn cannot draw (it lacks what the view names): the page says so in the view
  for (const view of state.workspace ? sandbox.savedViews() : []) {
    const problem = sandbox.viewProblem(view);
    if (problem) viewProblems[view.id] = problem;
  }
  if (Object.keys(viewProblems).length) out.viewProblems = viewProblems;
  const stepProblems = {}; // a step of a story that the plateau drawn cannot draw, or whose own plateau lacks what it names (run 0101): story -> step number -> the sentence of the page
  for (const story of state.workspace ? sandbox.storiesList() : []) {
    sandbox.storySteps(story).forEach((step, i) => {
      const problem = sandbox.stepProblem(step);
      if (problem) (stepProblems[story.id] = stepProblems[story.id] || {})[i + 1] = problem;
    });
  }
  if (Object.keys(stepProblems).length) out.stepProblems = stepProblems;
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
          if (step.plateau !== null) sandbox.drawPlateau(step.plateau);
          if (step.compareTo === '@past') sandbox.toggleCompareWithPast();
        }
        assert.deepEqual(said(sandbox, state, step.compareTo !== null), step.expect, label);
      }
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  });
}

test('the editor sentences are the command line sentences, up to the capital, the full stop, the heading of the plateau rules and the position of a file', () => {
  // the case table spells both; this keeps them from drifting apart
  const normal = (text) => text.replace(/^Could not read the plateaus of workspace\.yaml:\n/, '').replace(/^Could not read\/parse workspace\.yaml: /, '').replace(/^[A-Z]/, (l) => l.toLowerCase()).replace(/\.$/, '');
  const FILE = /^`[^`]+` is not valid: /;
  for (const c of CASES) {
    if (c.editor === null) continue;
    const lines = c.cli.flatMap((command) => command.stderr).map((line) => line.replace(/^(error|warning): /, '').replace(/ \(line \d+, column \d+\)$/, ''));
    const whole = new Set(lines.map(normal)); // the line as the command line says it
    const bare = new Set(lines.map((line) => normal(line.replace(FILE, '')))); // without the file: the editor's badge on a file says the sentence of the file alone
    for (const step of c.editor) {
      for (const [key, value] of Object.entries(step.expect)) {
        if (typeof value === 'number' || key === 'viewProblems' || key === 'stepProblems') continue; // a count, told by a badge and not by a sentence; what the page says in a view it cannot draw here
        const texts = typeof value === 'string' ? [value] : Array.isArray(value) ? value : Object.values(value);
        const known = key === 'manifestErrors' || key === 'fatalError' ? bare : whole; // the banner for workspace.yaml names the file in its heading
        for (const text of texts) assert.ok(known.has(normal(text)), c.id + ': the editor says (' + key + ') "' + text + '" and the command line does not say it');
      }
    }
  }
});

test('a plateau id the editor does not know changes nothing: it stays on the plateau it draws', async () => {
  const { sandbox, state } = await open(LAYERED);
  const before = state.layers.current;
  sandbox.drawPlateau('saaz');
  assert.equal(state.layers.current, before);
  assert.equal(state.fatalError, null);
  sandbox.compareWithPlateau('basline');
  assert.equal(state.layers.compare, null, 'a comparison it does not know is not made');
});

test('no sentence of the page tells the line and the column of a file: the command line does, the page reads a tree that has no positions (run 0092)', () => {
  const POSITION = /\(line \d+, column \d+\)/;
  let withPosition = 0;
  for (const c of CASES) {
    if (c.cli.some((command) => command.stderr.some((line) => POSITION.test(line)))) withPosition++;
    if (c.editor === null) continue;
    for (const step of c.editor) {
      for (const value of Object.values(step.expect)) {
        const texts = typeof value === 'string' ? [value] : Array.isArray(value) ? value : value !== null && typeof value === 'object' ? Object.values(value) : [];
        for (const text of texts) assert.ok(!POSITION.test(String(text)), c.id + ': the page says a position: ' + text);
      }
    }
  }
  assert.ok(withPosition > 10, 'the command line does say it for the sentences of a file: the difference is real (' + withPosition + ' cases)');
});
