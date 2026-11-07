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
  return `<!DOCTYPE html>\n<script id="theme-boot">\nboot();\n</script>\n<script>\nconst a = 1;\nconst b = 2;\nconst c = 3;\n</script>\n</html>\n`;
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

test('assembles include and parts, and writes the page', () => {
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
  assert.equal(map.lines, 10);
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
      [9, 10]
    ]
  );
});

test('--where names the part and the line in it, or the skeleton', () => {
  const root = makeTree();
  assert.equal(run(root, '--where', '8').out.trim(), 'unsorted/b.js:2');
  assert.equal(run(root, '--where', '3').out.trim(), 'theme-boot.js:1');
  assert.equal(run(root, '--where', '4').out.trim(), 'page.html:4');
  assert.equal(run(root, '--where', '9').out.trim(), 'page.html:7');
  refused(root, /--where needs a line between 1 and 10/, '--where', '99');
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

test('a CLAUDE.md beside the parts is a note for agents, not a part', () => {
  const root = makeTree();
  write(root, 'src/main/editor/model/CLAUDE.md', 'rules of this layer\n');
  const result = run(root);
  assert.equal(result.code, 0, result.err);
  assert.equal(fs.readFileSync(path.join(root, PAGE), 'utf8'), expectedPage(), 'the page is the one without it');
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

// ---- assets: assets.json, <!--@assets-->, the esbuild step, the notice file and --check ----

const { createHash } = require('node:crypto');
const ASSETS = 'src/main/resources/editor-webapp/assets';
const ASSET_SKELETON = SKELETON.replace('<!DOCTYPE html>', '<!DOCTYPE html>\n<!--@assets-->');

function makeAssetTree() {
  const root = makeTree({ skeleton: ASSET_SKELETON });
  const editor = 'src/main/editor';
  write(
    root,
    `${editor}/assets.json`,
    JSON.stringify({ assets: [{ name: 'lib.js', entry: 'bundles/lib.mjs', global: 'Lib' }] })
  );
  write(root, `${editor}/bundles/lib.mjs`, "export { answer } from 'fakepkg';\n");
  write(root, 'node_modules/fakepkg/index.js', 'export const answer = 42;\n');
  write(
    root,
    'node_modules/fakepkg/package.json',
    JSON.stringify({ name: 'fakepkg', version: '1.2.3', license: 'MIT' })
  );
  write(root, 'node_modules/fakepkg/LICENSE', 'Fake licence text\n');
  return root;
}

const sha8 = (file) => createHash('sha256').update(fs.readFileSync(file)).digest('hex').slice(0, 8);

test('builds the asset and the notice file, and the <meta> hash is the SHA-256 of the written file', () => {
  const root = makeAssetTree();
  const result = run(root);
  assert.equal(result.code, 0, result.err);
  const asset = path.join(root, ASSETS, 'lib.js');
  assert.match(fs.readFileSync(asset, 'utf8'), /^\/\* lib\.js: bundled from bundles\/lib\.mjs/);
  assert.match(fs.readFileSync(asset, 'utf8'), /42/);
  const page = fs.readFileSync(path.join(root, PAGE), 'utf8');
  assert.ok(page.includes(`<meta name="archicode-asset:lib.js" content="./assets/lib.js?v=${sha8(asset)}">`), page);
  const notices = fs.readFileSync(path.join(root, ASSETS, 'THIRD-PARTY-NOTICES.txt'), 'utf8');
  assert.match(notices, /^fakepkg 1\.2\.3\nLicense: MIT\n\nFake licence text$/m);
});

test('the notice file lists the packages of the metafile sorted by name', () => {
  const root = makeAssetTree();
  write(root, 'src/main/editor/bundles/lib.mjs', "export { answer } from 'zeta';\nexport { b } from 'alpha';\n");
  for (const [name, license] of [
    ['zeta', 'MIT'],
    ['alpha', 'EPL-2.0']
  ]) {
    write(root, `node_modules/${name}/index.js`, `export const ${name === 'zeta' ? 'answer' : 'b'} = 1;\n`);
    write(root, `node_modules/${name}/package.json`, JSON.stringify({ name, version: '0.0.1', license }));
    write(root, `node_modules/${name}/LICENSE.md`, `${name} text\n`);
  }
  assert.equal(run(root).code, 0);
  const notices = fs.readFileSync(path.join(root, ASSETS, 'THIRD-PARTY-NOTICES.txt'), 'utf8');
  assert.ok(notices.indexOf('alpha 0.0.1\nLicense: EPL-2.0') < notices.indexOf('zeta 0.0.1\nLicense: MIT'));
  assert.doesNotMatch(notices, /fakepkg/);
});

test('a second build writes nothing: the files keep their modification time', () => {
  const root = makeAssetTree();
  run(root);
  const files = ['lib.js', 'THIRD-PARTY-NOTICES.txt'].map((name) => path.join(root, ASSETS, name));
  const old = new Date(2020, 0, 1);
  for (const file of [...files, path.join(root, PAGE)]) fs.utimesSync(file, old, old);
  assert.equal(run(root).code, 0);
  for (const file of [...files, path.join(root, PAGE)]) assert.equal(fs.statSync(file).mtimeMs, old.getTime(), file);
});

test('--check passes on a built tree, writes nothing, and names an edited asset or notice file', () => {
  const root = makeAssetTree();
  assert.equal(run(root, '--check').code, 1, 'nothing is built yet');
  assert.equal(fs.existsSync(path.join(root, ASSETS)), false, '--check does not write');
  run(root);
  assert.equal(run(root, '--check').code, 0);
  const asset = path.join(root, ASSETS, 'lib.js');
  fs.appendFileSync(asset, '//\n');
  refused(
    root,
    /^error: editor-webapp\/assets\/lib\.js is generated: edit src\/main\/editor and run `npm run editor:build`\n$/,
    '--check'
  );
  run(root);
  fs.appendFileSync(path.join(root, ASSETS, 'THIRD-PARTY-NOTICES.txt'), 'x\n');
  refused(root, /editor-webapp\/assets\/THIRD-PARTY-NOTICES\.txt is generated: edit src\/main\/editor/, '--check');
});

test('a page with @assets and no assets.json is an error, and so is assets.json with no @assets', () => {
  const none = makeAssetTree();
  fs.rmSync(path.join(none, 'src/main/editor/assets.json'));
  refused(none, /page\.html:2: @assets needs src\/main\/editor\/assets\.json/);
  const noDirective = makeAssetTree();
  write(noDirective, 'src/main/editor/page.html', SKELETON);
  refused(noDirective, /assets\.json is there but page\.html has no `<!--@assets-->` line/);
});

test('--where, --map and --check-identical need no esbuild: a copy of the script with no node_modules runs them', () => {
  const root = makeAssetTree();
  run(root);
  const lone = fs.mkdtempSync(path.join(os.tmpdir(), 'build-editor-script-'));
  const copy = path.join(lone, 'build-editor.mjs');
  fs.copyFileSync(SCRIPT, copy);
  const go = (...args) => spawnSync('node', [copy, '--root', root, ...args], { encoding: 'utf8' });
  assert.equal(go('--where', '2').stdout.trim(), 'page.html:2');
  assert.equal(go('--where', '3').status, 0);
  assert.equal(JSON.parse(go('--map').stdout).lines, 11);
  const git = (...args) =>
    spawnSync('git', ['-c', 'user.name=t', '-c', 'user.email=t@t', ...args], { cwd: root, encoding: 'utf8' });
  git('init', '-q');
  git('add', '-A');
  git('commit', '-q', '-m', 'one');
  assert.equal(go('--check-identical', 'HEAD').status, 0, go('--check-identical', 'HEAD').stderr);
  const built = go();
  assert.equal(built.status, 1);
  assert.equal(built.stderr, 'error: esbuild is not installed: run npm ci\n');
  assert.equal(go('--check').stderr, 'error: esbuild is not installed: run npm ci\n');
});

test('an entry that does not resolve is one error line naming the asset and the entry', () => {
  const root = makeAssetTree();
  write(root, 'src/main/editor/bundles/lib.mjs', "export { x } from 'nowhere-at-all';\n");
  refused(root, /cannot build the asset `lib\.js` from `bundles\/lib\.mjs`: .*(nowhere-at-all).*run npm ci/);
});

test('a tree without assets.json builds as before, with no assets folder', () => {
  const root = makeTree();
  assert.equal(run(root).code, 0);
  assert.equal(fs.existsSync(path.join(root, ASSETS)), false);
});

// ---- the `encoded` files of assets.json: a committed file beside the bundles, written as the base64 string of a global ----

function makeEncodedTree(
  encoded = [{ name: 'kernel.js', from: 'kernel.wasm', global: 'KernelBytes' }],
  { present = true } = {}
) {
  const root = makeAssetTree();
  const editor = 'src/main/editor';
  write(
    root,
    `${editor}/assets.json`,
    JSON.stringify({ assets: [{ name: 'lib.js', entry: 'bundles/lib.mjs', global: 'Lib' }], encoded })
  );
  if (present) write(root, `${ASSETS}/kernel.wasm`, WASM);
  return root;
}

test('a bundle is a classic script that sets its global, not a module', () => {
  const root = makeAssetTree();
  assert.equal(run(root).code, 0);
  const text = fs.readFileSync(path.join(root, ASSETS, 'lib.js'), 'utf8');
  assert.match(text, /var Lib=/, 'an IIFE that names the global');
  assert.doesNotMatch(text, /^export |\bexport\s*\{/m, 'no module export: a page opened from a disk cannot import it');
});

test('an encoded file is a script that sets the base64 of its source on its global, and has a <meta> with its hash', () => {
  const root = makeEncodedTree();
  const result = run(root);
  assert.equal(result.code, 0, result.err);
  const written = path.join(root, ASSETS, 'kernel.js');
  assert.equal(
    fs.readFileSync(written, 'utf8'),
    `/* kernel.js: kernel.wasm as base64, by scripts/build-editor.mjs */\nglobalThis.KernelBytes = '${WASM.toString('base64')}';\n`
  );
  assert.ok(
    fs.readFileSync(path.join(root, ASSETS, 'kernel.wasm')).equals(WASM),
    'the build does not touch the source'
  );
  const page = fs.readFileSync(path.join(root, PAGE), 'utf8');
  const lib = `<meta name="archicode-asset:lib.js" content="./assets/lib.js?v=${sha8(path.join(root, ASSETS, 'lib.js'))}">`;
  const meta = `<meta name="archicode-asset:kernel.js" content="./assets/kernel.js?v=${sha8(written)}">`;
  assert.ok(page.includes(`${lib}\n${meta}\n`), page);
  assert.ok(!page.includes(WASM.toString('base64')), 'the bytes are not inlined in the page');
  assert.equal(run(root, '--check').code, 0);
});

test('an encoded file whose source does not exist is one line', () => {
  const root = makeEncodedTree(undefined, { present: false });
  refused(root, /^error: the file `kernel\.wasm` of `kernel\.js` is missing/);
});

test('a name listed twice, or an entry with no global, is refused', () => {
  refused(makeEncodedTree([{ name: 'lib.js', from: 'kernel.wasm', global: 'K' }]), /lists `lib\.js` twice/);
  refused(
    makeEncodedTree([
      { name: 'kernel.js', from: 'kernel.wasm', global: 'K' },
      { name: 'kernel.js', from: 'kernel.wasm', global: 'K' }
    ]),
    /lists `kernel\.js` twice/
  );
  refused(makeEncodedTree([{ name: 'kernel.js', from: 'kernel.wasm' }]), /needs a `global` that is a JavaScript name/);
});

test('--where and --map work on a tree with encoded files', () => {
  const root = makeEncodedTree();
  assert.equal(run(root).code, 0);
  assert.equal(run(root, '--where', '1').code, 0);
  assert.equal(run(root, '--map').code, 0);
});
