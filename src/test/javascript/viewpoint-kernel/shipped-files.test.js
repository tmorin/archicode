'use strict';
// Every workspace the repository ships, in the manual (src/doc/examples) or as a fixture (src/test/resources), opens in the editor, plateau by
// plateau: a shipped file the editor does not open is told by this test, with the reason, not found by opening it (wave 013, run 0065).
// `ShippedFilesTest.java` does the same for the command line. A workspace that is not meant to open is listed, with its reason, in
// src/test/resources/shipped-files/exceptions.json, which the Java test reads too: the file is the list, an entry that names no workspace or a
// workspace that opens although it is listed fails.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { createApp, makeDirHandle } = require('./harness');
const { memFolder } = require('./mem-folder');

const REPO = path.resolve(__dirname, '../../../..');
const ROOTS = ['src/doc/examples', 'src/test/resources'];
const EXCEPTIONS = path.join(REPO, 'src/test/resources/shipped-files/exceptions.json');

/** Every `workspace.yaml` under the roots, from the root of the repository, with `/`, sorted. */
function workspaces() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name === 'workspace.yaml') found.push(path.relative(REPO, full).split(path.sep).join('/'));
    }
  };
  for (const root of ROOTS) walk(path.join(REPO, root));
  return found.sort();
}

/**
 * The workspace files the manual includes under another name (the steps of the design example, the defaults, the parts of the configuration): each is
 * a workspace file, or a part of one, and is opened as the `workspace.yaml` of an empty folder. Every YAML file of the manual that is neither a
 * `workspace.yaml` nor in a manifests or plateau folder.
 */
function workspaceFilesUnderAnotherName() {
  const found = [];
  const walk = (dir) => {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.name.endsWith('.yaml')) found.push(path.relative(REPO, full).split(path.sep).join('/'));
    }
  };
  walk(path.join(REPO, 'src/doc/examples'));
  return found.filter((f) => !f.endsWith('/workspace.yaml') && !f.includes('/manifests/') && !f.includes('/plateaus/')).sort();
}

/** The exceptions that apply to the editor: workspace -> reason. */
function exceptions() {
  const result = new Map();
  for (const entry of JSON.parse(fs.readFileSync(EXCEPTIONS, 'utf8')).exceptions) {
    assert.ok(typeof entry.workspace === 'string' && entry.workspace !== '', 'an exception names a workspace: ' + JSON.stringify(entry));
    assert.ok(typeof entry.reason === 'string' && entry.reason.trim() !== '', 'the exception for ' + entry.workspace + ' has no reason');
    assert.ok(Array.isArray(entry.tools) && entry.tools.length > 0 && entry.tools.every((t) => t === 'cli' || t === 'editor'), 'the tools of the exception for ' + entry.workspace + ' are cli, editor or both');
    if (entry.tools.includes('editor')) result.set(entry.workspace, entry.reason);
  }
  return result;
}

/** What is wrong with the plateau the editor has just loaded, as sentences; none when it opened. */
function problemsOf(state) {
  const problems = [];
  if (state.fatalError) problems.push(state.fatalError);
  if (state.plateauProblem) problems.push(state.plateauProblem);
  if (state.layerProblems) problems.push(...state.layerProblems); // the first layer of the chain of the plateau drawn that the command line refuses
  for (const f of state.manifestFiles) if (f.error) problems.push('`' + f.relPath + '` is not valid: ' + f.error);
  for (const d of state.duplicateReferences) problems.push(d.message);
  if (state.plateauTree) problems.push(...state.plateauTree.problems, ...state.plateauTree.redeclared); // the tree of the layered plateaus (run 0077)
  for (const f of state.unreadManifestFiles) problems.push('`' + f + '` is read by the command line and not by the editor');
  if (state.baseline && state.baseline.problem) problems.push(state.baseline.problem);
  return problems;
}

/**
 * Opens the folder of a workspace as the editor opens it, and draws each of its plateaus (the root first), each compared with the plateau it
 * overrides; a workspace without plateaus is opened once. Returns `[label, problems]` for every one.
 */
async function openEveryPlateau(dir) {
  const sandbox = createApp();
  const state = sandbox.__state();
  const handle = makeDirHandle(dir);
  state.folder = { handle, name: path.basename(dir) };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(handle);
  await sandbox.loadViewpointKernel();
  const results = [];
  const ids = state.plateauTree && state.plateauTree.layered && !state.fatalError ? Array.from(state.plateauTree.nodes.keys()) : [];
  if (ids.length === 0) results.push(['the workspace', problemsOf(state)]);
  for (const id of ids) {
    sandbox.drawPlateau(id);
    if (state.layers && !state.layers.compare) sandbox.toggleCompareWithPast(); // the plateau it overrides, if it has one: its layers are read too
    results.push(['plateau `' + id + '`', problemsOf(state)]);
  }
  return results;
}

test('the repository ships the workspaces this test looks for', () => {
  const found = workspaces();
  assert.ok(found.length >= 17, 'the manual and the fixtures ship at least 17 workspaces: ' + found.join(', '));
  assert.ok(found.includes('src/test/resources/brightcart/layered/workspace.yaml'));
  assert.ok(found.includes('src/doc/examples/domain_plateaus/workspace.yaml'));
});

test('an exception names a workspace the repository ships', () => {
  const found = new Set(workspaces().concat(workspaceFilesUnderAnotherName()));
  for (const workspace of exceptions().keys()) assert.ok(found.has(workspace), 'the exception names no workspace of the repository: ' + workspace);
});

for (const workspace of workspaces()) {
  test(workspace + ' opens in the editor, on every plateau', async () => {
    const reason = exceptions().get(workspace);
    const failures = [];
    for (const [label, problems] of await openEveryPlateau(path.dirname(path.join(REPO, workspace)))) {
      for (const problem of problems) failures.push(label + ': ' + problem);
    }
    if (reason !== undefined) {
      assert.ok(failures.length > 0, workspace + ' is listed as an exception (' + reason + ') but opens');
    } else {
      assert.deepEqual(failures, [], workspace + ' does not open in the editor');
    }
  });
}

test('every plateau of a workspace that has plateaus is opened, each compared with its baseline', async () => {
  const opened = await openEveryPlateau(path.join(REPO, 'src/test/resources/brightcart/layered'));
  assert.deepEqual(opened.map(([label]) => label).sort(), ['plateau `baseline`', 'plateau `inhouse`', 'plateau `marketplace`', 'plateau `saas`']);
  assert.deepEqual(opened.flatMap(([, problems]) => problems), []);
});

for (const file of workspaceFilesUnderAnotherName()) {
  test(file + ' opens in the editor as a workspace.yaml', async () => {
    const reason = exceptions().get(file);
    const mem = memFolder({ 'workspace.yaml': fs.readFileSync(path.join(REPO, file), 'utf8') });
    const sandbox = createApp();
    const state = sandbox.__state();
    state.folder = { handle: mem.handle, name: 'ws' };
    state.permissionState = 'granted';
    await sandbox.loadWorkspace(mem.handle);
    const problems = problemsOf(state);
    if (reason !== undefined) assert.ok(problems.length > 0, file + ' is listed as an exception (' + reason + ') but opens');
    else assert.deepEqual(problems, [], file + ' does not open in the editor');
  });
}

test('the manual includes workspace files under other names', () => {
  assert.ok(workspaceFilesUnderAnotherName().length >= 10, workspaceFilesUnderAnotherName().join(', '));
});

// ---- the test is not vacuous: a shipped fixture altered fails it ----

/** A copy of a shipped workspace folder, outside the repository, whose first manifest `alter` rewrites. */
function altered(source, alter) {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'shipped-files-'));
  fs.cpSync(path.join(REPO, source), dir, { recursive: true });
  const manifest = 'manifests/' + fs.readdirSync(path.join(dir, 'manifests')).filter((n) => n.endsWith('.yaml')).sort()[0];
  fs.writeFileSync(path.join(dir, manifest), alter(fs.readFileSync(path.join(dir, manifest), 'utf8')));
  return { dir, manifest };
}

test('a shipped fixture whose manifest has a kind nobody knows does not open', async () => {
  const { dir, manifest } = altered('src/test/resources/hyphen-ids', (text) => text.replace(/kind: "archicode\.morin\.io\/\w+"/, 'kind: "archicode.morin.io/nothing"'));
  try {
    const [[, problems]] = await openEveryPlateau(dir);
    assert.deepEqual(problems, ['`' + manifest + '` is not valid: unrecognized `header.kind` "archicode.morin.io/nothing" (known: archicode.morin.io/component, archicode.morin.io/container, archicode.morin.io/container-group, archicode.morin.io/environment, archicode.morin.io/node, archicode.morin.io/person, archicode.morin.io/plateau, archicode.morin.io/solution, archicode.morin.io/solution-group, archicode.morin.io/story, archicode.morin.io/system, archicode.morin.io/system-group, archicode.morin.io/view)']);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test('a shipped fixture whose manifest names a plateau opens, and a plateau id that is not valid is told (run 0077)', async () => {
  const named = altered('src/test/resources/hyphen-ids', (text) => text.replace('version:', 'plateau: later\n  version:'));
  const wrong = altered('src/test/resources/hyphen-ids', (text) => text.replace('version:', 'plateau: v1.2\n  version:'));
  try {
    const [[, problems]] = await openEveryPlateau(named.dir);
    assert.deepEqual(problems, [], 'a plateau that headers name opens');
    const [[, mistakes]] = await openEveryPlateau(wrong.dir);
    assert.deepEqual(mistakes, ['the plateau id `v1.2` in `' + wrong.manifest + '` is not valid: use lowercase letters, digits, `_` and `-`']);
  } finally {
    fs.rmSync(named.dir, { recursive: true, force: true });
    fs.rmSync(wrong.dir, { recursive: true, force: true });
  }
});
