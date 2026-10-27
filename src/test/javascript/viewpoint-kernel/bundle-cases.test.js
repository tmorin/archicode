'use strict';
// The bundle codec (run 0191, #162 proposal 1): a workspace as one YAML text and back, byte for byte.
// The contract is data: src/test/resources/editor-bundle/bundle-cases.json (CTR-2 of the TDD of run 0191).
// A Uint8Array made here is of another realm than the page's (the page runs in a vm context), so bytes are
// handed over as Uint8Array and compared with Buffer.compare, never with deepStrictEqual on typed arrays.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp } = require('./harness');

const REPO = path.resolve(__dirname, '../../../..');
const CASES = JSON.parse(
  fs.readFileSync(path.join(REPO, 'src/test/resources/editor-bundle/bundle-cases.json'), 'utf8')
);
const app = createApp();

/** A value of the sandbox, brought into this realm. */
const plain = (value) => JSON.parse(JSON.stringify(value));
const bytesOf = (file) => Uint8Array.from(file.bytes ? file.bytes : Buffer.from(file.text, 'utf8'));
const same = (actual, expected) => Buffer.compare(Buffer.from(Array.from(actual)), Buffer.from(expected)) === 0;

test('the cases file holds both sections and the families of CTR-2', () => {
  assert.ok(CASES.bundle.length >= 40);
  assert.ok(CASES.unbundle.length >= 50);
  assert.equal(new Set(CASES.bundle.map((c) => c.name)).size, CASES.bundle.length, 'names are unique');
  assert.equal(new Set(CASES.unbundle.map((c) => c.name)).size, CASES.unbundle.length, 'names are unique');
});

for (const c of CASES.bundle) {
  test('bundle: ' + c.name, () => {
    const files = c.files.map((file) => ({ path: file.path, bytes: bytesOf(file) }));
    const result = app.bundleWorkspaceFiles(files);
    assert.equal(result.text, c.expect.text, 'text');
    assert.deepEqual(plain(result.carried.map((file) => file.path)), c.expect.carried, 'carried');
    for (const file of result.carried) {
      const given = files.find((candidate) => candidate.path === file.path);
      assert.ok(same(file.bytes, given.bytes), 'carried bytes of ' + file.path);
    }
    assert.deepEqual(plain(result.skipped), c.expect.skipped, 'skipped');
    assert.equal(app.bundleSkippedSentence(result.skipped), c.expect.sentence, 'sentence');
  });
}

for (const c of CASES.unbundle) {
  test('unbundle: ' + c.name, () => {
    const result = app.unbundleWorkspaceFiles(c.text, c.maxBytes === undefined ? undefined : { maxBytes: c.maxBytes });
    if (c.expect.problems) {
      assert.deepEqual(plain(result.problems), c.expect.problems, 'problems');
      assert.equal(result.files.length, 0, 'no file when there is a problem');
      return;
    }
    assert.deepEqual(plain(result.problems), [], 'problems');
    assert.deepEqual(
      plain(result.files.map((file) => file.path)),
      c.expect.files.map((file) => file.path),
      'paths'
    );
    c.expect.files.forEach((expected, index) => {
      assert.ok(same(result.files[index].bytes, Buffer.from(expected.text, 'utf8')), 'bytes of ' + expected.path);
    });
  });
}

test('every file the bundle carries comes back from its own text, byte for byte, whatever the order given', () => {
  for (const c of CASES.bundle) {
    const files = c.files.map((file) => ({ path: file.path, bytes: bytesOf(file) }));
    const forward = app.bundleWorkspaceFiles(files);
    const backward = app.bundleWorkspaceFiles([...files].reverse());
    if (!c.name.includes('twice') && !c.name.includes('same name')) {
      assert.equal(backward.text, forward.text, c.name + ': the order given does not change the text');
    }
    if (forward.carried.length === 0) continue;
    const back = app.unbundleWorkspaceFiles(forward.text);
    assert.deepEqual(plain(back.problems), [], c.name);
    assert.deepEqual(
      plain(back.files.map((file) => file.path)),
      plain(forward.carried.map((file) => file.path)),
      c.name
    );
    back.files.forEach((file, index) => assert.ok(same(file.bytes, forward.carried[index].bytes), c.name));
  }
});
