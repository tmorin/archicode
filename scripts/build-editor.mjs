#!/usr/bin/env node
// Assembles the editor page from its parts (wave 024, run 0183, step 5.1a; design: run 0182 RFC-001, this run's DEC-2).
//
// The skeleton src/main/editor/page.html is read line by line. A line that is exactly one of
//   <!--@include FILE-->   the content of FILE (relative to src/main/editor/) without its last newline
//   <!--@parts-->          the parts of layers.json in order, each verbatim, without the last newline of the last
//   <!--@wasm FILE-->      <script type="application/octet-stream" id="viewpoint-kernel-wasm">base64</script>
// is replaced; every other line is copied. The result is src/main/resources/editor-webapp/standalone.html.
//
// Usage: node scripts/build-editor.mjs [--check | --check-identical <rev> | --where <line> | --map] [--root <dir>]
//   (none)                    write the page, only when its bytes differ
//   --check                   exit 1 when the committed page is not the assembly
//   --check-identical <rev>   exit 1 when the assembly is not the page of the commit <rev>, byte for byte
//   --where <line>            print <file>:<line in file> for a line of the page
//   --map                     print the parts and files with their first and last line of the page, as JSON
//   --root <dir>              work on the tree at <dir> instead of the repository
//
// No dependency. Every failure is one line on the error output and exit 1.

import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PAGE_PATH = 'src/main/resources/editor-webapp/standalone.html';
const EDITOR_DIR = 'src/main/editor';
const LAYER_FOLDERS = ['core', 'model', 'persistence', 'application', 'presentation', 'composition', 'unsorted'];
const DIRECTIVE = /^<!--@([A-Za-z]+)(?: (.+))?-->$/;
const STALE = 'standalone.html is generated: edit src/main/editor and run `npm run editor:build`';

class EditorBuildError extends Error {}

function fail(message) {
  throw new EditorBuildError(message);
}

function readText(path, label) {
  if (!existsSync(path) || !statSync(path).isFile()) fail(`${label} is missing: ${path}`);
  const text = readFileSync(path, 'utf8');
  if (text.startsWith('﻿')) fail(`${label} starts with a byte-order mark: ${path}`);
  if (text.includes('\r')) fail(`${label} has a carriage return (the files are LF): ${path}`);
  return text;
}

function partsOnDisk(editorDir) {
  const found = [];
  const walk = (folder, prefix) => {
    for (const entry of readdirSync(folder, { withFileTypes: true })) {
      if (entry.isDirectory()) walk(join(folder, entry.name), `${prefix}${entry.name}/`);
      else found.push(`${prefix}${entry.name}`);
    }
  };
  for (const name of LAYER_FOLDERS) {
    const folder = join(editorDir, name);
    if (existsSync(folder)) walk(folder, `${name}/`);
  }
  return found;
}

function readParts(editorDir) {
  const listFile = join(editorDir, 'layers.json');
  let config;
  try {
    config = JSON.parse(readText(listFile, 'layers.json'));
  } catch (error) {
    if (error instanceof EditorBuildError) throw error;
    return fail(`layers.json is not valid JSON: ${error.message}`);
  }
  const layers = Array.isArray(config.layers) ? config.layers : [];
  const parts = Array.isArray(config.parts) ? config.parts : [];
  const seen = new Set();
  const listed = [];
  for (const part of parts) {
    const file = part?.file;
    if (typeof file !== 'string') fail('layers.json: a part has no `file`');
    if (seen.has(file)) fail(`layers.json lists the part \`${file}\` twice`);
    seen.add(file);
    if (part.layer !== 'unsorted' && !layers.includes(part.layer)) {
      fail(`layers.json: the layer \`${part.layer}\` of \`${file}\` is not in \`layers\` and is not \`unsorted\``);
    }
    if (file.split('/')[0] !== part.layer) {
      fail(`layers.json: the part \`${file}\` is not under the folder of its layer \`${part.layer}\``);
    }
    listed.push(file);
  }
  for (const file of listed) {
    const text = readText(join(editorDir, file), `the part \`${file}\``);
    if (!text.endsWith('\n')) fail(`the part \`${file}\` does not end with a newline`);
  }
  for (const file of partsOnDisk(editorDir)) {
    if (!seen.has(file)) fail(`the part \`${file}\` is in src/main/editor but not in layers.json: list it`);
  }
  return listed.map((file) => ({ file, text: readText(join(editorDir, file), file) }));
}

/** The lines of a text that ends with a newline, without that newline. */
function linesOf(text) {
  return text.slice(0, -1).split('\n');
}

/**
 * Assembles the page of the tree at `root`. Returns { text, origins, partFiles }: `origins[i]` is { file, line } of line i + 1.
 */
export function assemble(root) {
  const editorDir = join(root, EDITOR_DIR);
  const skeleton = readText(join(editorDir, 'page.html'), 'page.html');
  if (!skeleton.endsWith('\n')) fail('page.html does not end with a newline');
  const out = [];
  const origins = [];
  const partFiles = [];
  const push = (text, file, line) => {
    out.push(text);
    origins.push({ file, line });
  };
  linesOf(skeleton).forEach((raw, index) => {
    const here = index + 1;
    if (!raw.includes('<!--@')) return push(raw, 'page.html', here);
    const match = DIRECTIVE.exec(raw);
    if (!match) return fail(`page.html:${here}: a line with \`<!--@\` must be exactly one directive: ${raw}`);
    const [, name, argument] = match;
    if (name === 'include') {
      if (argument === undefined) fail(`page.html:${here}: @include needs a file`);
      const text = readText(join(editorDir, argument), `page.html:${here}: the included file \`${argument}\``);
      if (!text.endsWith('\n')) fail(`the included file \`${argument}\` does not end with a newline`);
      linesOf(text).forEach((line, i) => push(line, argument, i + 1));
    } else if (name === 'parts') {
      if (argument !== undefined) fail(`page.html:${here}: @parts takes no argument`);
      for (const part of readParts(editorDir)) {
        partFiles.push(part.file);
        linesOf(part.text).forEach((line, i) => push(line, part.file, i + 1));
      }
    } else if (name === 'wasm') {
      if (argument === undefined) fail(`page.html:${here}: @wasm needs a file`);
      const wasm = join(editorDir, argument);
      if (!existsSync(wasm)) fail(`page.html:${here}: the wasm file \`${argument}\` is missing`);
      const base64 = readFileSync(wasm).toString('base64');
      push(`<script type="application/octet-stream" id="viewpoint-kernel-wasm">${base64}</script>`, 'page.html', here);
    } else {
      fail(`page.html:${here}: unknown directive \`@${name}\``);
    }
  });
  return { text: `${out.join('\n')}\n`, origins, partFiles };
}

function groups(origins, keyOf) {
  const result = [];
  origins.forEach((origin, index) => {
    const key = keyOf(origin);
    if (key === null) return;
    const last = result[result.length - 1];
    if (last && last.file === key && last.last === index) last.last = index + 1;
    else result.push({ file: key, first: index + 1, last: index + 1 });
  });
  return result;
}

/** The parts and files of the page with their first and last line, as the input of check-editor.mjs. */
export function mapOf(root) {
  const assembled = assemble(root);
  const { origins } = assembled;
  const partFiles = new Set(assembled.partFiles);
  const skeleton = groups(origins, (o) => (o.file === 'page.html' ? o.file : null));
  const parts = groups(origins, (o) => (partFiles.has(o.file) ? o.file : null));
  const files = groups(origins, (o) => (o.file !== 'page.html' && !partFiles.has(o.file) ? o.file : null));
  return { lines: origins.length, skeleton, files, parts };
}

function describe(origins, line) {
  const origin = origins[line - 1];
  return origin ? `${origin.file}:${origin.line}` : `after the end of the page`;
}

function firstDifference(expected, actual) {
  const a = expected.split('\n');
  const b = actual.split('\n');
  const length = Math.max(a.length, b.length);
  for (let i = 0; i < length; i++) if (a[i] !== b[i]) return i + 1;
  return 0;
}

function sentenceOf(base, built, origins) {
  const line = firstDifference(built, base);
  return `${STALE} (first difference at line ${line} of the page, produced by ${describe(origins, line)})`;
}

function parse(argv) {
  const options = { root: resolve(dirname(fileURLToPath(import.meta.url)), '..'), mode: 'build' };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    const value = () => argv[++i] ?? fail(`${arg} needs a value`);
    if (arg === '--check') options.mode = 'check';
    else if (arg === '--check-identical') [options.mode, options.rev] = ['identical', value()];
    else if (arg === '--where') [options.mode, options.line] = ['where', Number(value())];
    else if (arg === '--map') options.mode = 'map';
    else if (arg === '--root') options.root = resolve(value());
    else fail(`unknown option \`${arg}\``);
  }
  return options;
}

function run(argv) {
  const options = parse(argv);
  const pagePath = join(options.root, PAGE_PATH);
  const { text, origins, partFiles } = assemble(options.root);
  const committed = existsSync(pagePath) ? readFileSync(pagePath, 'utf8') : null;
  switch (options.mode) {
    case 'check':
      if (committed === null) fail(`${STALE} (the page is missing)`);
      if (committed !== text) fail(sentenceOf(committed, text, origins));
      console.log(`standalone.html is the assembly of src/main/editor (${origins.length} lines)`);
      break;
    case 'identical': {
      let base;
      try {
        base = execFileSync('git', ['show', `${options.rev}:${PAGE_PATH}`], {
          cwd: options.root,
          encoding: 'utf8',
          maxBuffer: 1 << 28,
          stdio: ['ignore', 'pipe', 'ignore']
        });
      } catch {
        return fail(`cannot read ${PAGE_PATH} at \`${options.rev}\` (unknown revision or no such file)`);
      }
      if (base !== text) {
        const line = firstDifference(base, text);
        fail(
          `the assembly is not the page of \`${options.rev}\`: first difference at line ${line}, produced by ${describe(origins, line)}`
        );
      }
      console.log(`the assembly is the page of ${options.rev}, byte for byte`);
      break;
    }
    case 'where':
      if (!Number.isInteger(options.line) || options.line < 1 || options.line > origins.length) {
        fail(`--where needs a line between 1 and ${origins.length}`);
      }
      console.log(describe(origins, options.line));
      break;
    case 'map':
      console.log(JSON.stringify(mapOf(options.root), null, 2));
      break;
    default:
      if (committed !== text) {
        mkdirSync(dirname(pagePath), { recursive: true });
        writeFileSync(pagePath, text);
      }
      console.log(`${partFiles.length} parts, ${Buffer.byteLength(text)} bytes`);
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  try {
    run(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof EditorBuildError)) throw error;
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}
