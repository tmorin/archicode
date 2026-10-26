'use strict';
// Tests of scripts/build-editor.mjs (wave 024, run 0183, step 5.1a): every directive, refusal and mode of DEC-2,
// on temporary trees.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const SCRIPT = path.resolve(__dirname, '../../../../scripts/build-editor.mjs');
const PAGE = 'src/main/resources/editor-webapp/standalone.html';
const SKELETON = [
  '<!DOCTYPE html>',
  '<script id="theme-boot">',
  '<!--@include theme-boot.js-->',
  '</script>',
  '<script>',
  '<!--@parts-->',
  '</script>',
  '<!--@wasm ../wasm/viewpoint_kernel.wasm-->',
  '</html>',
  ''
].join('\n');
const WASM = Buffer.from([0, 97, 115, 109, 1, 0, 0, 0, 255]);

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

function makeTree(options = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'build-editor-'));
  const editor = 'src/main/editor';
  write(root, `${editor}/page.html`, options.skeleton ?? SKELETON);
  write(root, `${editor}/theme-boot.js`, 'boot();\n');
  write(root, `${editor}/layers.json`, JSON.stringify(options.layers ?? defaultLayers()));
  write(root, `${editor}/core/a.js`, 'const a = 1;\n');
  write(root, `${editor}/unsorted/b.js`, 'const b = 2;\nconst c = 3;\n');
  write(root, 'src/main/wasm/viewpoint_kernel.wasm', WASM);
  return root;
}

function defaultLayers() {
  return {
    layers: ['core', 'model'],
    parts: [
      { file: 'core/a.js', layer: 'core' },
      { file: 'unsorted/b.js', layer: 'unsorted' }
    ]
  };
}

function expectedPage() {
  const wasm = `<script type="application/octet-stream" id="viewpoint-kernel-wasm">${WASM.toString('base64')}</script>`;
  return `<!DOCTYPE html>\n<script id="theme-boot">\nboot();\n</script>\n<script>\nconst a = 1;\nconst b = 2;\nconst c = 3;\n</script>\n${wasm}\n</html>\n`;
}

function run(root, ...args) {
  const result = spawnSync('node', [SCRIPT, '--root', root, ...args], { encoding: 'utf8' });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

function refused(root, sentence, ...args) {
  const result = run(root, ...args);
  assert.equal(result.code, 1, result.err);
  assert.match(result.err, sentence);
  assert.equal(result.err.trim().split('\n').length, 1, 'one line');
  assert.doesNotMatch(result.err, /\n\s+at /, 'no stack trace');
}

test('assembles include, parts and wasm, and writes the page', () => {
  const root = makeTree();
  const result = run(root);
  assert.equal(result.code, 0, result.err);
  assert.equal(fs.readFileSync(path.join(root, PAGE), 'utf8'), expectedPage());
  assert.match(result.out, /^2 parts, \d+ bytes$/m);
});

test('writes only on a difference: the modification time is kept', () => {
  const root = makeTree();
  run(root);
  const page = path.join(root, PAGE);
  const old = new Date(2020, 0, 1);
  fs.utimesSync(page, old, old);
  assert.equal(run(root).code, 0);
  assert.equal(fs.statSync(page).mtimeMs, old.getTime());
  fs.writeFileSync(page, 'hand edit\n');
  run(root);
  assert.equal(fs.readFileSync(page, 'utf8'), expectedPage());
});

test('exports assemble and mapOf and does not run the command line when imported', async () => {
  const root = makeTree();
  const { assemble, mapOf } = await import(SCRIPT);
  assert.equal(assemble(root).text, expectedPage());
  assert.deepEqual(mapOf(root).parts, [
    { file: 'core/a.js', first: 6, last: 6 },
    { file: 'unsorted/b.js', first: 7, last: 8 }
  ]);
  assert.equal(fs.existsSync(path.join(root, PAGE)), false);
});

test('--map prints parts, files and skeleton with their lines as JSON', () => {
  const map = JSON.parse(run(makeTree(), '--map').out);
  assert.equal(map.lines, 11);
  assert.deepEqual(map.files, [{ file: 'theme-boot.js', first: 3, last: 3 }]);
  assert.deepEqual(map.parts, [
    { file: 'core/a.js', first: 6, last: 6 },
    { file: 'unsorted/b.js', first: 7, last: 8 }
  ]);
  assert.deepEqual(
    map.skeleton.map((s) => [s.first, s.last]),
    [
      [1, 2],
      [4, 5],
      [9, 11]
    ]
  );
});

test('--where names the part and the line in it, or the skeleton', () => {
  const root = makeTree();
  assert.equal(run(root, '--where', '8').out.trim(), 'unsorted/b.js:2');
  assert.equal(run(root, '--where', '3').out.trim(), 'theme-boot.js:1');
  assert.equal(run(root, '--where', '4').out.trim(), 'page.html:4');
  assert.equal(run(root, '--where', '10').out.trim(), 'page.html:8');
  refused(root, /--where needs a line between 1 and 11/, '--where', '99');
});

test('--check passes on the assembly and fails on one changed byte with the sentence', () => {
  const root = makeTree();
  run(root);
  assert.equal(run(root, '--check').code, 0);
  const page = path.join(root, PAGE);
  fs.writeFileSync(page, fs.readFileSync(page, 'utf8').replace('const b = 2;', 'const b = 3;'));
  refused(
    root,
    /standalone\.html is generated: edit src\/main\/editor and run `npm run editor:build`.*line 7.*unsorted\/b\.js:1/,
    '--check'
  );
});

test('--check fails when the page is missing', () => {
  refused(makeTree(), /standalone\.html is generated/, '--check');
});

test('--check does not write', () => {
  const root = makeTree();
  run(root, '--check');
  assert.equal(fs.existsSync(path.join(root, PAGE)), false);
});

test('--check-identical compares with the page of a revision, byte for byte', () => {
  const root = makeTree();
  run(root);
  const git = (...args) =>
    assert.equal(
      spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root }).status,
      0,
      args.join(' ')
    );
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'one');
  assert.equal(run(root, '--check-identical', 'HEAD').code, 0);
  write(root, 'src/main/editor/core/a.js', 'const a = 9;\n');
  refused(root, /not the page of `HEAD`.*line 6.*core\/a\.js:1/, '--check-identical', 'HEAD');
  refused(root, /cannot read .* at `nope`/, '--check-identical', 'nope');
});

test('refuses an unknown directive', () => {
  const root = makeTree({ skeleton: SKELETON.replace('<!--@parts-->', '<!--@nope-->') });
  refused(root, /page\.html:6: unknown directive `@nope`/);
});

test('refuses a stray <!--@ that is not exactly a directive', () => {
  const root = makeTree({ skeleton: SKELETON.replace('<!--@parts-->', '  <!--@parts-->') });
  refused(root, /page\.html:6: a line with `<!--@` must be exactly one directive/);
  const text = makeTree({ skeleton: SKELETON.replace('<!DOCTYPE html>', 'x <!--@parts--> y') });
  refused(text, /page\.html:1: a line with `<!--@`/);
});

test('refuses a directive without its file, or with an argument it does not take', () => {
  refused(
    makeTree({ skeleton: SKELETON.replace('<!--@include theme-boot.js-->', '<!--@include-->') }),
    /unknown|needs/
  );
  refused(makeTree({ skeleton: SKELETON.replace('<!--@parts-->', '<!--@parts x-->') }), /@parts takes no argument/);
});

test('refuses a part missing from disk', () => {
  const root = makeTree();
  fs.rmSync(path.join(root, 'src/main/editor/core/a.js'));
  refused(root, /the part `core\/a\.js` is missing/);
});

test('refuses a part on disk that layers.json does not list', () => {
  const root = makeTree();
  write(root, 'src/main/editor/model/extra.js', 'x\n');
  refused(root, /the part `model\/extra\.js` is in src\/main\/editor but not in layers\.json/);
});

test('refuses a part listed twice', () => {
  const layers = defaultLayers();
  layers.parts.push(layers.parts[0]);
  refused(makeTree({ layers }), /lists the part `core\/a\.js` twice/);
});

test('refuses a part whose first path segment is not its layer', () => {
  const layers = defaultLayers();
  layers.parts[0].layer = 'model';
  refused(makeTree({ layers }), /`core\/a\.js` is not under the folder of its layer `model`/);
});

test('refuses a layer that is not in layers and is not unsorted', () => {
  const layers = defaultLayers();
  layers.parts[0] = { file: 'presentation/a.js', layer: 'presentation' };
  refused(makeTree({ layers }), /the layer `presentation` of `presentation\/a\.js` is not in `layers`/);
});

test('refuses a carriage return in any file', () => {
  for (const file of ['page.html', 'theme-boot.js', 'core/a.js']) {
    const root = makeTree();
    const target = path.join(root, 'src/main/editor', file);
    fs.writeFileSync(target, fs.readFileSync(target, 'utf8').replace('\n', '\r\n'));
    refused(root, /carriage return/);
  }
});

test('refuses a byte-order mark in any file', () => {
  for (const file of ['page.html', 'theme-boot.js', 'unsorted/b.js']) {
    const root = makeTree();
    const target = path.join(root, 'src/main/editor', file);
    fs.writeFileSync(target, String.fromCodePoint(0xfeff) + fs.readFileSync(target, 'utf8'));
    refused(root, /byte-order mark/);
  }
});

test('refuses a file with no final newline: skeleton, included file and part', () => {
  const skeleton = makeTree({ skeleton: SKELETON.slice(0, -1) });
  refused(skeleton, /page\.html does not end with a newline/);
  const included = makeTree();
  write(included, 'src/main/editor/theme-boot.js', 'boot();');
  refused(included, /included file `theme-boot\.js` does not end with a newline/);
  const part = makeTree();
  write(part, 'src/main/editor/core/a.js', 'const a = 1;');
  refused(part, /the part `core\/a\.js` does not end with a newline/);
});

test('refuses an unknown option and a missing value', () => {
  refused(makeTree(), /unknown option `--nope`/, '--nope');
  refused(makeTree(), /--where needs a value/, '--where');
});
