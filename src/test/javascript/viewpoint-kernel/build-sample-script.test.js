'use strict';
// scripts/build-sample.mjs builds the samples from the fixture folders and the page's codec into target/editor-webapp/samples, writes only when the bytes differ,
// and says in one line what is wrong. Every case runs the script as a process on a copy of what it reads (the fixtures and the built page), given with --root.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { spawnSync } = require('node:child_process');

const REPO = path.resolve(__dirname, '..', '..', '..', '..');
const SCRIPT = path.join(REPO, 'scripts', 'build-sample.mjs');
const FIXTURE = 'src/test/resources/brightcart/layered';
const SAMPLE = 'target/editor-webapp/samples/brightcart.yaml';
const MODEL = 'docs/architecture';
const MODEL_SAMPLE = 'target/editor-webapp/samples/archicode.yaml';
const PAGE = 'target/editor-webapp/standalone.html';

/** A tree with the same layout as the repository: the fixtures and the built page, no sample. */
function copyTree(withPage) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-sample-'));
  fs.cpSync(path.join(REPO, FIXTURE), path.join(root, FIXTURE), { recursive: true });
  fs.cpSync(path.join(REPO, MODEL), path.join(root, MODEL), { recursive: true });
  if (withPage !== false) {
    fs.mkdirSync(path.join(root, path.dirname(PAGE)), { recursive: true });
    fs.copyFileSync(path.join(REPO, PAGE), path.join(root, PAGE));
  }
  return root;
}

function script(root, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8' });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

test('the build writes the samples when they are missing, as the samples of the folder, and leaves a sample that is right untouched', () => {
  const root = copyTree();
  const file = path.join(root, SAMPLE);
  assert.equal(script(root).status, 0);
  assert.ok(fs.readFileSync(file).equals(fs.readFileSync(path.join(REPO, SAMPLE))), 'same bytes as the built sample');
  assert.ok(fs.existsSync(path.join(root, MODEL_SAMPLE)), 'the model sample is written too');
  const old = new Date(2020, 0, 1);
  fs.utimesSync(file, old, old);
  assert.equal(script(root).status, 0);
  assert.equal(fs.statSync(file).mtimeMs, old.getTime(), 'not written again when the bytes are the same');
  fs.writeFileSync(file, 'stale');
  assert.equal(script(root).status, 0);
  assert.ok(fs.readFileSync(file).equals(fs.readFileSync(path.join(REPO, SAMPLE))), 'a stale sample is rewritten');
});

test('a tree with no built page fails in one line that names the page and the command', () => {
  const root = copyTree(false);
  const result = script(root);
  assert.equal(result.status, 1);
  assert.equal(result.err.trim().split('\n').length, 1, 'one line');
  assert.match(result.err, /target\/editor-webapp\/standalone\.html/);
  assert.match(result.err, /npm run editor:build/);
});

test('a file of the fixture that the bundle skips fails the script, naming the file, and writes no sample', () => {
  const root = copyTree();
  fs.writeFileSync(path.join(root, FIXTURE, 'NOTES.md'), 'not a manifest\n');
  const result = script(root);
  assert.equal(result.status, 1);
  assert.match(result.err, /skips 1 file/);
  assert.match(result.err, /NOTES\.md/);
  assert.ok(!fs.existsSync(path.join(root, SAMPLE)), 'the sample is not written');
});

test('--only builds one sample', () => {
  const root = copyTree();
  assert.equal(script(root, '--only', 'archicode').status, 0);
  assert.ok(fs.existsSync(path.join(root, MODEL_SAMPLE)));
  assert.ok(!fs.existsSync(path.join(root, SAMPLE)));
});
