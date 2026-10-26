'use strict';
// Tests of scripts/check-editor-moves.sh (wave 024, run 0183, step 5.3a): each case is a small temporary git repository
// with a page assembled from parts; the script under test is the one of the repository, run in that repository.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(REPO, 'scripts/check-editor-moves.sh');
const BUILD = path.join(REPO, 'scripts/build-editor.mjs');

const SKELETON = '<!DOCTYPE html>\n<script>\n<!--@parts-->\n</script>\n</html>\n';
const LAYERS = ['core', 'model', 'persistence', 'application', 'presentation', 'composition'];
const ONE = 'function one() {\n  return 1;\n}\n';
const TWO = 'function two() {\n  return 2;\n}\n';

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function git(root, ...args) {
  return execFileSync('git', ['-c', 'user.name=Test', '-c', 'user.email=test@example.com', ...args], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'ignore']
  }).trim();
}

/** Replaces the sources with `parts` ({ file, text }), rebuilds the page and commits with `subject`. */
function commit(root, subject, parts, { skeleton = SKELETON } = {}) {
  fs.rmSync(path.join(root, 'src/main/editor'), { recursive: true, force: true });
  write(root, 'src/main/editor/page.html', skeleton);
  write(
    root,
    'src/main/editor/layers.json',
    JSON.stringify({ layers: LAYERS, parts: parts.map(({ file }) => ({ file, layer: file.split('/')[0] })) })
  );
  for (const { file, text } of parts) write(root, `src/main/editor/${file}`, text);
  execFileSync(process.execPath, [BUILD, '--root', root], { stdio: 'ignore' });
  git(root, 'add', '-A');
  git(root, 'commit', '-q', '-m', subject);
  return git(root, 'rev-parse', 'HEAD');
}

/** A repository whose first commit holds the page of one part with both functions. */
function repository() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-moves-'));
  git(root, 'init', '-q');
  const base = commit(root, 'chore: the page', [{ file: 'unsorted/script.js', text: ONE + TWO }]);
  return { root, base };
}

function check(root, base, head = 'HEAD') {
  const result = spawnSync('bash', [SCRIPT, base, head], { cwd: root, encoding: 'utf8' });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const SPLIT = [
  { file: 'core/one.js', text: ONE },
  { file: 'model/two.js', text: TWO }
];

test('a pure move commit passes and is listed', () => {
  const { root, base } = repository();
  commit(root, 'refactor: move the functions to their layers', SPLIT);
  const result = check(root, base);
  assert.equal(result.code, 0, result.err);
  assert.match(result.out, /^[0-9a-f]+ refactor: move the functions to their layers ok$/m);
  assert.equal(git(root, 'worktree', 'list').split('\n').length, 1, 'the worktree is removed');
});

test('a move commit that edits a byte fails and is named', () => {
  const { root, base } = repository();
  const head = commit(root, 'refactor: move the functions to their layers', [
    SPLIT[0],
    { file: 'model/two.js', text: TWO.replace('return 2', 'return 3') }
  ]);
  const result = check(root, base);
  assert.equal(result.code, 1);
  assert.match(result.err, new RegExp(`^error: the commit ${head.slice(0, 7)}`));
  assert.match(result.err, /refactor: move the functions to their layers/);
  assert.match(result.err, /not the page of/);
  assert.equal(git(root, 'worktree', 'list').split('\n').length, 1, 'the worktree is removed');
});

test('a relocate commit passes, and one that edits a function fails', () => {
  const { root, base } = repository();
  commit(root, 'refactor: relocate two before one', [
    { file: 'core/two.js', text: TWO },
    { file: 'model/one.js', text: ONE }
  ]);
  const ok = check(root, base);
  assert.equal(ok.code, 0, ok.err);
  assert.match(ok.out, /refactor: relocate two before one ok/);

  const bad = commit(root, 'refactor: relocate one to the model', [
    { file: 'core/two.js', text: TWO },
    { file: 'model/one.js', text: ONE.replace('return 1', 'return 9') }
  ]);
  const result = check(root, base);
  assert.equal(result.code, 1);
  assert.match(result.err, new RegExp(`the commit ${bad.slice(0, 7)}`));
  assert.match(result.err, /declarations differ/);
});

test('other subjects are not checked, even when they change the page', () => {
  const { root, base } = repository();
  commit(root, 'feat: another function', [{ file: 'unsorted/script.js', text: ONE + TWO + 'function three() {}\n' }]);
  commit(root, 'refactor: tidy the names', [{ file: 'unsorted/script.js', text: ONE + 'function three() {}\n' }]);
  const result = check(root, base);
  assert.equal(result.code, 0, result.err);
  assert.doesNotMatch(result.out, / ok$/m);
  assert.match(result.out, /no refactor: move or refactor: relocate commit/);
});

test('only the commits after the base are checked', () => {
  const { root } = repository();
  commit(root, 'refactor: move the functions to their layers', [SPLIT[0], { file: 'model/two.js', text: 'x\n' }]);
  const base = git(root, 'rev-parse', 'HEAD');
  commit(root, 'chore: more', [SPLIT[0], { file: 'model/two.js', text: 'y\n' }]);
  assert.equal(check(root, base).code, 0);
});

test('a base that is not in the clone is one sentence', () => {
  const { root } = repository();
  const result = check(root, '0123456789abcdef0123456789abcdef01234567');
  assert.equal(result.code, 1);
  assert.equal(result.err.trim().split('\n').length, 1);
  assert.match(result.err, /^error: the base `0123456789abcdef0123456789abcdef01234567` is not in this clone/);
  assert.equal(result.out, '');
});

test('an option in place of a revision is refused, and so are missing arguments', () => {
  const { root } = repository();
  assert.match(check(root, '--help').err, /must be revisions, not options/);
  const none = spawnSync('bash', [SCRIPT], { cwd: root, encoding: 'utf8' });
  assert.equal(none.status, 1);
  assert.match(none.stderr, /usage:/);
});
