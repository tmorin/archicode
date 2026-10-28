'use strict';
// The browser feature floor of the editor page (wave 025, run 0192, task 009; TDD DEC-10, ASM-7).
// The page has to run in Chromium, Firefox and Safari. The floor (ASM-7) is the oldest release that has every feature in use:
// Chromium 111, Firefox 121 (`:has`), Safari 16.2 (`color-mix`, container queries). The rule of both lists below is one:
// a name enters a list when it was first released after that floor, or when only Chromium has it. A name the floor allows
// (`toSorted`, `findLast`, `structuredClone`, `navigator.locks`) is not listed: it would block a legitimate use.
// Adding a name to the page that is listed here means editing the list on purpose, with the reason.
// `ARCHICODE_EDITOR_SRC` points the scan at a scratch copy of src/main/editor (how the test is shown to fail).
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const SRC = process.env.ARCHICODE_EDITOR_SRC || path.resolve(__dirname, '../../../main/editor');
const PICKER_FILE = 'persistence/folder-access.js';

// [name, pattern, reason]
const DENIED_SCRIPT = [
  ['showOpenFilePicker', /\bshowOpenFilePicker\b/, 'File System Access, Chromium only'],
  ['showSaveFilePicker', /\bshowSaveFilePicker\b/, 'File System Access, Chromium only'],
  ['FileSystemObserver', /\bFileSystemObserver\b/, 'Chromium only'],
  ['navigator.userAgentData', /\buserAgentData\b/, 'Chromium only; test the feature, never the browser'],
  ['Array.fromAsync', /\bArray\.fromAsync\b/, 'Firefox 115, Safari 16.4, Chromium 121: after the floor'],
  ['Promise.withResolvers', /\bPromise\.withResolvers\b/, 'Firefox 121, Safari 17.4, Chromium 119: after the floor'],
  ['Object.groupBy', /\bObject\.groupBy\b/, 'Safari 17.4, Chromium 117: after the floor'],
  ['Map.groupBy', /\bMap\.groupBy\b/, 'Safari 17.4, Chromium 117: after the floor'],
  [
    'Set.prototype.union and siblings',
    /\.(union|intersection|difference|symmetricDifference|isSubsetOf|isSupersetOf|isDisjointFrom)\(/,
    'Chromium 122, Firefox 127, Safari 17: after the floor'
  ],
  ['Iterator helpers', /\bIterator\.(from|prototype)\b/, 'Chromium 122, Firefox 131, Safari 18.4: after the floor'],
  [
    'Iterator helper methods on an iterator',
    /\.(values|keys|entries)\(\)\.(map|filter|take|drop|flatMap|reduce|toArray|forEach|some|every|find)\(/,
    'Iterator helpers: Chromium 122, Firefox 131, Safari 18.4: after the floor'
  ]
];

const DENIED_STYLE = [
  ['@scope', /@scope\b/, 'Chromium 118, Safari 17.4, Firefox 146: after the floor'],
  ['@starting-style', /@starting-style\b/, 'Chromium 117, Safari 17.5, Firefox 129: after the floor'],
  ['anchor-name', /\banchor-name\s*:/, 'Chromium 125 only (anchor positioning)'],
  ['field-sizing', /\bfield-sizing\s*:/, 'Chromium 123 only'],
  [
    'text-wrap: balance',
    /\btext-wrap\s*:\s*(balance|pretty)\b/,
    'Chromium 114, Firefox 121 (pretty: Safari 26): after the floor'
  ],
  ['@property', /@property\b/, 'Firefox 128: after the floor'],
  [
    'nesting with &',
    /(^|[\s{;])&\s*[\s.:#[>+~{]/m,
    'CSS nesting: Chromium 120, Firefox 117, Safari 17.2: after the floor'
  ]
];

function walk(dir, out = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, out);
    else out.push(full);
  }
  return out;
}

const rel = (file) => path.relative(SRC, file).split(path.sep).join('/');
const stripBlockComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, ' ');
const stripScriptComments = (text) =>
  stripBlockComments(text)
    .split('\n')
    .filter((line) => !/^\s*\/\//.test(line))
    .join('\n');

const files = walk(SRC);
const scripts = files.filter((f) => /\.(m?js)$/.test(f));
const read = (f) => fs.readFileSync(f, 'utf8');

test('the scan finds the sources it is meant to scan', () => {
  assert.ok(scripts.length > 50, `scripts found: ${scripts.length}`);
  assert.ok(files.some((f) => rel(f) === 'style.css'));
  assert.ok(files.some((f) => rel(f) === PICKER_FILE));
});

test('no script names an API first released after the floor or only in Chromium', () => {
  const found = [];
  for (const file of scripts) {
    const code = stripScriptComments(read(file));
    for (const [name, pattern, reason] of DENIED_SCRIPT) {
      if (pattern.test(code)) found.push(`${rel(file)}: ${name} (${reason})`);
    }
  }
  assert.deepEqual(found, []);
});

test('no stylesheet names a feature first released after the floor or only in Chromium', () => {
  const found = [];
  for (const file of files.filter((f) => /\.css$/.test(f))) {
    const css = stripBlockComments(read(file));
    for (const [name, pattern, reason] of DENIED_STYLE) {
      if (pattern.test(css)) found.push(`${rel(file)}: ${name} (${reason})`);
    }
  }
  assert.deepEqual(found, []);
});

test('the markup holds no script or style that is not an include or the parts line', () => {
  const html = read(path.join(SRC, 'page.html'));
  for (const block of html.matchAll(/<(script|style)\b[^>]*>([\s\S]*?)<\/\1>/gi)) {
    const lines = block[2].split('\n').filter((line) => line.trim() !== '');
    assert.ok(
      lines.every((line) => /^<!--@(include \S+|parts|wasm \S+)-->$/.test(line.trim())),
      `a <${block[1]}> of page.html holds text outside the scan`
    );
  }
});

test('showDirectoryPicker is named in one file only, and that file tests for it first', () => {
  const users = scripts.filter((f) => /\bshowDirectoryPicker\b/.test(stripScriptComments(read(f)))).map(rel);
  assert.deepEqual(users, [PICKER_FILE]);
  const code = stripScriptComments(read(path.join(SRC, PICKER_FILE)));
  assert.match(code, /typeof window\.showDirectoryPicker === 'function'/);
});

test('a use of the Fullscreen API, of navigator.storage and of ResizeObserver tests for it first', () => {
  const player = stripScriptComments(read(path.join(SRC, 'presentation/story-player.js')));
  assert.match(player, /document\.fullscreenEnabled === true/);
  assert.match(player, /typeof root\.requestFullscreen === 'function'/);
  const store = stripScriptComments(read(path.join(SRC, 'persistence/browser-store.js')));
  assert.match(store, /typeof navigator\.storage\.persist !== 'function'/);
  for (const file of scripts.filter((f) => /\bnew ResizeObserver\b/.test(read(f)))) {
    assert.match(read(file), /typeof ResizeObserver (===|!==) '(function|undefined)'/, rel(file));
  }
});

test('the viewport unit 100dvh always follows a 100vh fallback in the same rule', () => {
  const css = stripBlockComments(read(path.join(SRC, 'style.css')));
  for (const match of css.matchAll(/[^;{}]*100dvh[^;{}]*;/g)) {
    const at = match.index;
    const before = css.slice(Math.max(0, at - 120), at);
    assert.match(before, /100vh;\s*$/, `no 100vh before: ${match[0].trim()}`);
  }
});
