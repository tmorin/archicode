#!/usr/bin/env node
// Assembles the editor page from its parts, and builds the assets that sit beside it.
//
// The skeleton src/main/editor/page.html is read line by line. A line that is exactly one of
//   <!--@include FILE-->   the content of FILE (relative to src/main/editor/) without its last newline
//   <!--@parts-->          the parts of layers.json in order, each verbatim, without the last newline of the last
//   <!--@assets-->          one <meta name="archicode-asset:NAME" content="./assets/NAME?v=8 hex"> per asset of assets.json, then per entry of its
//                          `encoded`, the 8 hex being the start of the SHA-256 of the committed file on disk
// is replaced; every other line is copied. The result is src/main/resources/editor-webapp/standalone.html.
//
// When src/main/editor/assets.json exists, the write mode also writes, in src/main/resources/editor-webapp/assets, each
// file it lists and the notice file THIRD-PARTY-NOTICES.txt, each only when its bytes differ. Every one is a CLASSIC script
// that the page adds with a <script src> (a page opened from a disk, file://, may not import a module or fetch a file, and
// may load a script): an `assets` entry is bundled with esbuild (in memory) as an IIFE that sets the global `global`; an
// `encoded` entry is a committed file of that folder (the kernel's .wasm, which Maven reads) written as the base64 string of
// the global `global`. assets.json and the @assets line go together: one without the other is an error.
//
// Usage: node scripts/build-editor.mjs [--check | --check-identical <rev> | --where <line> | --map] [--root <dir>]
//   (none)                    write the page, only when its bytes differ
//   --check                   exit 1 when the committed page, an asset or the notice file is not what the build gives
//   --check-identical <rev>   exit 1 when the assembly is not the page of the commit <rev>, byte for byte
//   --where <line>            print <file>:<line in file> for a line of the page
//   --map                     print the parts and files with their first and last line of the page, as JSON
//   --root <dir>              work on the tree at <dir> instead of the repository
//
// esbuild (npm ci) is needed only to build or check the assets; --where, --map and --check-identical need nothing.
// Every failure is one line on the error output and exit 1.

import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const PAGE_PATH = 'src/main/resources/editor-webapp/standalone.html';
const ASSETS_DIR = 'src/main/resources/editor-webapp/assets';
const EDITOR_DIR = 'src/main/editor';
const NOTICES = 'THIRD-PARTY-NOTICES.txt';
// fixed here so that a change of esbuild's defaults does not move the bytes
const TARGETS = ['chrome111', 'firefox121', 'safari16.2'];
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
      else if (entry.name !== 'CLAUDE.md') found.push(`${prefix}${entry.name}`); // the notes for agents sit beside the parts and are not parts
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
  const assets = readAssetList(editorDir);
  let assetsDirective = false;
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
    } else if (name === 'assets') {
      if (argument !== undefined) fail(`page.html:${here}: @assets takes no argument`);
      if (assets === null) fail(`page.html:${here}: @assets needs src/main/editor/assets.json`);
      assetsDirective = true;
      for (const asset of [...assets, ...assets.encoded]) {
        const file = join(root, ASSETS_DIR, asset.name);
        if (!existsSync(file)) fail(`the asset ${asset.name} is missing: ${ASSETS_DIR}/${asset.name}`);
        const hash = createHash('sha256').update(readFileSync(file)).digest('hex').slice(0, 8);
        push(
          `<meta name="archicode-asset:${asset.name}" content="./assets/${asset.name}?v=${hash}">`,
          'page.html',
          here
        );
      }
    } else {
      fail(`page.html:${here}: unknown directive \`@${name}\``);
    }
  });
  if (assets !== null && !assetsDirective)
    fail('src/main/editor/assets.json is there but page.html has no `<!--@assets-->` line');
  return { text: `${out.join('\n')}\n`, origins, partFiles };
}

/** The assets of assets.json as [{ name, entry, global }] with the `encoded` ones as a property, or null when the file does not exist. */
function readAssetList(editorDir) {
  const file = join(editorDir, 'assets.json');
  if (!existsSync(file)) return null;
  let config;
  try {
    config = JSON.parse(readText(file, 'assets.json'));
  } catch (error) {
    if (error instanceof EditorBuildError) throw error;
    return fail(`assets.json is not valid JSON: ${error.message}`);
  }
  const list = Array.isArray(config.assets) ? config.assets : fail('assets.json: `assets` must be a list');
  const names = new Set();
  const check = (item, what, needs) => {
    if (typeof item?.name !== 'string' || !/^[A-Za-z0-9][A-Za-z0-9._-]*\.js$/.test(item.name)) {
      fail(`assets.json: ${what} needs a \`name\` that is a file name ending in .js`);
    }
    if (typeof item[needs] !== 'string') fail(`assets.json: the ${what} \`${item.name}\` has no \`${needs}\``);
    if (typeof item.global !== 'string' || !/^[A-Za-z_$][A-Za-z0-9_$]*$/.test(item.global)) {
      fail(`assets.json: the ${what} \`${item.name}\` needs a \`global\` that is a JavaScript name`);
    }
    if (names.has(item.name)) fail(`assets.json lists \`${item.name}\` twice`);
    names.add(item.name);
  };
  for (const asset of list) check(asset, 'an asset', 'entry');
  const encoded =
    config.encoded === undefined
      ? []
      : Array.isArray(config.encoded)
        ? config.encoded
        : fail('assets.json: `encoded` must be a list');
  for (const item of encoded) check(item, 'an encoded file', 'from');
  list.encoded = encoded;
  return list;
}

/** The package a path of the metafile belongs to ("node_modules/@a/b/x.js" -> "@a/b"), or null for a file of the project. */
function packageOf(inputPath) {
  const marker = 'node_modules/';
  const at = inputPath.lastIndexOf(marker);
  if (at < 0) return null;
  const parts = inputPath.slice(at + marker.length).split('/');
  return parts[0].startsWith('@') ? `${parts[0]}/${parts[1]}` : parts[0];
}

/** The notice file: each package of the metafiles, sorted by name, with its version, licence and LICENSE* texts. */
function noticesOf(root, metafiles) {
  const names = new Set();
  for (const metafile of metafiles) {
    for (const input of Object.keys(metafile.inputs)) {
      const name = packageOf(input);
      if (name !== null) names.add(name);
    }
  }
  const blocks = [...names].sort().map((name) => {
    const folder = join(root, 'node_modules', name);
    const manifest = join(folder, 'package.json');
    if (!existsSync(manifest)) fail(`the package \`${name}\` is bundled but ${manifest} is missing: run npm ci`);
    const { version, license } = JSON.parse(readFileSync(manifest, 'utf8'));
    if (typeof license !== 'string') fail(`the package \`${name}\` declares no SPDX licence`);
    const texts = readdirSync(folder)
      .filter((file) => file.startsWith('LICENSE') && statSync(join(folder, file)).isFile())
      .sort()
      .map((file) => readFileSync(join(folder, file), 'utf8').replace(/\r\n?/g, '\n').trimEnd());
    if (texts.length === 0) fail(`the package \`${name}\` has no LICENSE file to put in ${NOTICES}`);
    return `${name} ${version}\nLicense: ${license}\n\n${texts.join('\n\n')}\n`;
  });
  const head =
    'Third-party software bundled into the files of this folder (generated by scripts/build-editor.mjs; do not edit).\n';
  return `${head}\n${blocks.join('\n--------------------------------------------------------------------------------\n\n')}`;
}

/**
 * Builds the assets of the tree at `root` in memory with esbuild: [{ name, bytes }], the notice file last.
 * Returns [] when the tree has no assets.json.
 */
export async function buildAssets(root) {
  const editorDir = join(root, EDITOR_DIR);
  const assets = readAssetList(editorDir);
  if (assets === null) return [];
  let esbuild;
  try {
    esbuild = await import('esbuild');
  } catch {
    return fail('esbuild is not installed: run npm ci');
  }
  const files = [];
  const metafiles = [];
  for (const asset of assets) {
    const entry = join(editorDir, asset.entry);
    if (!existsSync(entry)) fail(`the entry \`${asset.entry}\` of the asset \`${asset.name}\` is missing`);
    let result;
    try {
      result = await esbuild.build({
        entryPoints: [entry],
        absWorkingDir: root,
        bundle: true,
        format: 'iife',
        globalName: asset.global,
        platform: 'browser',
        target: TARGETS,
        minify: true,
        legalComments: 'none',
        charset: 'utf8',
        write: false,
        metafile: true,
        logLevel: 'silent',
        banner: {
          js: `/* ${asset.name}: bundled from ${asset.entry} by scripts/build-editor.mjs; licences in ${NOTICES} */`
        }
      });
    } catch (error) {
      const text = (error.errors?.[0]?.text ?? error.message).split('\n')[0];
      return fail(`cannot build the asset \`${asset.name}\` from \`${asset.entry}\`: ${text} (run npm ci)`);
    }
    files.push({ name: asset.name, bytes: Buffer.from(result.outputFiles[0].contents) });
    metafiles.push(result.metafile);
  }
  for (const item of assets.encoded) {
    const source = join(root, ASSETS_DIR, item.from);
    if (!existsSync(source))
      fail(`the file \`${item.from}\` of \`${item.name}\` is missing: ${ASSETS_DIR}/${item.from}`);
    const text =
      `/* ${item.name}: ${item.from} as base64, by scripts/build-editor.mjs */\n` +
      `globalThis.${item.global} = '${readFileSync(source).toString('base64')}';\n`;
    files.push({ name: item.name, bytes: Buffer.from(text, 'utf8') });
  }
  files.push({ name: NOTICES, bytes: Buffer.from(noticesOf(root, metafiles), 'utf8') });
  return files;
}

/** The built assets whose committed file is missing or different. */
function staleAssets(root, built) {
  return built.filter(({ name, bytes }) => {
    const file = join(root, ASSETS_DIR, name);
    return !existsSync(file) || !readFileSync(file).equals(bytes);
  });
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

async function run(argv) {
  const options = parse(argv);
  const pagePath = join(options.root, PAGE_PATH);
  if (options.mode === 'build' || options.mode === 'check') {
    const stale = staleAssets(options.root, await buildAssets(options.root));
    if (options.mode === 'check' && stale.length > 0) {
      fail(`editor-webapp/assets/${stale[0].name} is generated: edit src/main/editor and run \`npm run editor:build\``);
    }
    for (const { name, bytes } of stale) {
      mkdirSync(join(options.root, ASSETS_DIR), { recursive: true });
      writeFileSync(join(options.root, ASSETS_DIR, name), bytes);
    }
  }
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
    await run(process.argv.slice(2));
  } catch (error) {
    if (!(error instanceof EditorBuildError)) throw error;
    console.error(`error: ${error.message}`);
    process.exitCode = 1;
  }
}
