'use strict';
// editor-files.js names the folder `npm run editor:build` writes (target/editor-webapp) and reads the page from it, or says in one line to build it.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { PAGE, ASSETS_DIR, SAMPLES_DIR, readPage } = require('./editor-files');

const FOLDER = path.join('target', 'editor-webapp');

test('the exported paths are absolute and end with the three names of the folder', () => {
  assert.ok(path.isAbsolute(PAGE) && path.isAbsolute(ASSETS_DIR) && path.isAbsolute(SAMPLES_DIR));
  assert.ok(PAGE.endsWith(path.join(FOLDER, 'standalone.html')));
  assert.ok(ASSETS_DIR.endsWith(path.join(FOLDER, 'assets')));
  assert.ok(SAMPLES_DIR.endsWith(path.join(FOLDER, 'samples')));
});

test('readPage on a root with no build throws one line with the path and the command', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'editor-files-'));
  assert.throws(
    () => readPage(root),
    (e) => {
      assert.equal(e.message.split('\n').length, 1, 'one line');
      assert.equal(
        e.message,
        'the editor page is missing: target/editor-webapp/standalone.html (run npm run editor:build)'
      );
      return true;
    }
  );
});

test('readPage on a root that holds the page returns its text', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'editor-files-'));
  fs.mkdirSync(path.join(root, FOLDER), { recursive: true });
  fs.writeFileSync(path.join(root, FOLDER, 'standalone.html'), '<p>page</p>');
  assert.equal(readPage(root), '<p>page</p>');
});

test('readPage with no root reads the page of the repository', () => {
  assert.equal(readPage(), fs.readFileSync(PAGE, 'utf8'));
});
