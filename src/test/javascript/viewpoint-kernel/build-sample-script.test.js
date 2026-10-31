'use strict';
// Run 0193 (wave 025, W-5, task 002), DEC-1 and CTR-6: scripts/build-sample.mjs builds the Brightcart sample from the fixture folder and the page's codec,
// writes only when the bytes differ, and with --check writes nothing and says in one line what is wrong. Every case runs the script as a process on a copy of
// the three things it reads (the fixture, the sample, the page), given with --root.
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
const SAMPLE = 'src/main/resources/editor-webapp/samples/brightcart.yaml';
const MODEL = 'docs/architecture';
const MODEL_SAMPLE = 'src/main/resources/editor-webapp/samples/archicode.yaml';
const PAGE = 'src/main/resources/editor-webapp/standalone.html';

/** A tree with the same layout as the repository: the fixture, the page and (unless `withSample` is false) the committed sample. */
function copyTree(withSample) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-sample-'));
  fs.cpSync(path.join(REPO, FIXTURE), path.join(root, FIXTURE), { recursive: true });
  fs.cpSync(path.join(REPO, MODEL), path.join(root, MODEL), { recursive: true });
  fs.mkdirSync(path.join(root, path.dirname(PAGE)), { recursive: true });
  fs.copyFileSync(path.join(REPO, PAGE), path.join(root, PAGE));
  if (withSample !== false) {
    fs.mkdirSync(path.join(root, path.dirname(SAMPLE)), { recursive: true });
    fs.copyFileSync(path.join(REPO, SAMPLE), path.join(root, SAMPLE));
    fs.copyFileSync(path.join(REPO, MODEL_SAMPLE), path.join(root, MODEL_SAMPLE));
  }
  return root;
}

function script(root, ...args) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args, '--root', root], { encoding: 'utf8' });
  return { status: result.status, out: result.stdout, err: result.stderr };
}

test('--check on a tree whose sample is the bundle of its fixture exits 0 and says nothing', () => {
  const root = copyTree();
  const before = fs.readFileSync(path.join(root, SAMPLE));
  const result = script(root, '--check');
  assert.equal(result.status, 0, result.err);
  assert.equal(result.err, '');
  assert.ok(before.equals(fs.readFileSync(path.join(root, SAMPLE))), 'check wrote nothing');
});

test('--check on a sample with one byte changed exits 1 with one line that names the line and says to run the build', () => {
  const root = copyTree();
  const file = path.join(root, SAMPLE);
  const text = fs.readFileSync(file, 'utf8');
  const at = text.indexOf('Brightcart');
  fs.writeFileSync(file, text.slice(0, at) + 'Brightcarz' + text.slice(at + 'Brightcart'.length));
  const changed = fs.readFileSync(file);
  const result = script(root, '--check');
  assert.equal(result.status, 1);
  assert.equal(result.err.trim().split('\n').length, 1, 'one line');
  assert.match(result.err, /first difference at line 3\b/);
  assert.match(result.err, /npm run sample:build/);
  assert.ok(changed.equals(fs.readFileSync(file)), 'check wrote nothing');
});

test('--check on a tree with no sample exits 1 and says it is missing', () => {
  const root = copyTree(false);
  const result = script(root, '--check');
  assert.equal(result.status, 1);
  assert.match(result.err, /is missing/);
  assert.match(result.err, /npm run sample:build/);
  assert.ok(!fs.existsSync(path.join(root, SAMPLE)), 'check wrote nothing');
});

test('--check on a fixture that changed exits 1: the sample is a function of the fixture', () => {
  const root = copyTree();
  fs.appendFileSync(path.join(root, FIXTURE, '.archicode.yaml'), '# one more line\n');
  const result = script(root, '--check');
  assert.equal(result.status, 1);
  assert.match(result.err, /npm run sample:build/);
});

test('the build writes the sample when it is missing, and leaves a sample that is right untouched', () => {
  const root = copyTree(false);
  const file = path.join(root, SAMPLE);
  assert.equal(script(root).status, 0);
  assert.ok(
    fs.readFileSync(file).equals(fs.readFileSync(path.join(REPO, SAMPLE))),
    'same bytes as the committed sample'
  );
  const old = new Date(2020, 0, 1);
  fs.utimesSync(file, old, old);
  assert.equal(script(root).status, 0);
  assert.equal(fs.statSync(file).mtimeMs, old.getTime(), 'not written again when the bytes are the same');
  fs.writeFileSync(file, 'stale');
  assert.equal(script(root).status, 0);
  assert.ok(fs.readFileSync(file).equals(fs.readFileSync(path.join(REPO, SAMPLE))), 'a stale sample is rewritten');
  assert.equal(script(root, '--check').status, 0);
});

test('a file of the fixture that the bundle skips fails the script, in the build and in the check, naming the file', () => {
  const root = copyTree();
  fs.writeFileSync(path.join(root, FIXTURE, 'NOTES.md'), 'not a manifest\n');
  for (const args of [[], ['--check']]) {
    const result = script(root, ...args);
    assert.equal(result.status, 1);
    assert.match(result.err, /skips 1 file/);
    assert.match(result.err, /NOTES\.md/);
  }
  assert.ok(
    fs.readFileSync(path.join(root, SAMPLE)).equals(fs.readFileSync(path.join(REPO, SAMPLE))),
    'the sample is not touched'
  );
});

test('--check names the model sample when it is not the bundle of docs/architecture, and --only checks one sample', () => {
  const root = copyTree();
  fs.appendFileSync(path.join(root, MODEL, '.archicode.yaml'), '# one more line\n');
  const model = script(root, '--check', '--only', 'archicode');
  assert.equal(model.status, 1);
  assert.match(model.err, /archicode\.yaml is not the bundle of docs\/architecture/);
  assert.match(model.err, /npm run sample:build/);
  const brightcart = script(root, '--check', '--only', 'brightcart');
  assert.equal(brightcart.status, 0, brightcart.err);
});
