'use strict';
// Tests of src/main/rust/viewpoint-kernel/embed.sh: the one-line failure without rustup and the unknown option.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(REPO, 'src/main/rust/viewpoint-kernel/embed.sh');

const rustupOnPath = () => spawnSync('bash', ['-c', 'command -v rustup'], { encoding: 'utf8' }).status === 0;

test('without rustup on the PATH the script prints one error line naming rustup and exits 1', () => {
  const empty = fs.mkdtempSync(path.join(os.tmpdir(), 'embed-empty-'));
  try {
    const run = spawnSync('/bin/bash', [SCRIPT], { encoding: 'utf8', env: { PATH: empty } });
    assert.equal(run.status, 1);
    assert.equal(run.stdout, '');
    const lines = run.stderr.trim().split('\n');
    assert.equal(lines.length, 1);
    assert.match(lines[0], /^error: rustup is not installed/);
    assert.match(lines[0], /https:\/\/rustup\.rs/);
  } finally {
    fs.rmSync(empty, { recursive: true, force: true });
  }
});

test('an unknown option exits 2 with one error line', { skip: !rustupOnPath() && 'rustup is not on the PATH' }, () => {
  const run = spawnSync('bash', [SCRIPT, '--nope'], { encoding: 'utf8' });
  assert.equal(run.status, 2);
  assert.equal(run.stdout, '');
  assert.match(run.stderr.trim(), /^error: unknown option/);
});
