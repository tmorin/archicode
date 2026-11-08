'use strict';
// The folder `npm run editor:build` writes: the page, its assets and the samples. The node tests read the page from it, never from src.
const fs = require('node:fs');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const FOLDER = 'target/editor-webapp';
const PAGE = path.join(REPO, FOLDER, 'standalone.html');
const ASSETS_DIR = path.join(REPO, FOLDER, 'assets');
const SAMPLES_DIR = path.join(REPO, FOLDER, 'samples');

/** The text of the page of `root` (the repository by default), or one line of advice when it was not built. */
function readPage(root = REPO) {
  const file = path.join(root, FOLDER, 'standalone.html');
  if (!fs.existsSync(file)) {
    throw new Error(`the editor page is missing: ${FOLDER}/standalone.html (run npm run editor:build)`);
  }
  return fs.readFileSync(file, 'utf8');
}

module.exports = { PAGE, ASSETS_DIR, SAMPLES_DIR, readPage };
