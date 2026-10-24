#!/usr/bin/env node
// Extracts the inline scripts of the editor page for ESLint (wave 023, run 0169, #160 step 4).
//
// The editor is one HTML file whose JavaScript is inline (a script file of its own is #161), so ESLint cannot read it
// where it stands. This script copies each executable inline <script> block of
// src/main/resources/editor-webapp/standalone.html into its own file under target/eslint-editor/ (git-ignored, with
// target/), named after the block:
//
//   theme-boot.js    <script id="theme-boot">    a classic script
//   module.js        <script type="module">      the CodeMirror loader (an ES module)
//   page.js          <script>                    the editor itself, a classic script
//
// The data block <script type="application/octet-stream" id="viewpoint-kernel-wasm"> is not code and is left out.
//
// Each copy is padded with blank lines so that a line of the copy is the same line of the HTML: a finding
// "page.js:12345:7" is standalone.html line 12345. Nothing is written back to the page: the copies are read-only input.
//
// Usage: node scripts/extract-editor-script.mjs [html-file] [output-folder]

import { mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const html = resolve(process.argv[2] ?? join(root, 'src/main/resources/editor-webapp/standalone.html'));
const out = resolve(process.argv[3] ?? join(root, 'target/eslint-editor'));

const text = readFileSync(html, 'utf8');
// A block opens with a <script> tag alone on its line and closes with </script> at the start of a line (the page keeps
// to this; a "<script" inside a comment of the main script does not start a line).
const block = /^<script([^>\n]*)>\n([\s\S]*?)^<\/script>/gm;

rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });

let count = 0;
for (const match of text.matchAll(block)) {
  const attributes = match[1];
  const type = /\btype="([^"]*)"/.exec(attributes)?.[1];
  const id = /\bid="([^"]*)"/.exec(attributes)?.[1];
  if (type !== undefined && type !== 'module') continue; // data, not code
  const name = type === 'module' ? 'module' : (id ?? 'page');
  // the first line of the code is the line after the tag
  const tagLine = text.slice(0, match.index).split('\n').length;
  const padding = '\n'.repeat(tagLine);
  writeFileSync(join(out, `${name}.${type === 'module' ? 'mjs' : 'js'}`), padding + match[2]);
  count++;
}
if (count !== 3) {
  console.error(`expected 3 executable inline scripts in ${html}, found ${count}`);
  process.exit(1);
}
console.log(`extracted ${count} scripts into ${out}`);
