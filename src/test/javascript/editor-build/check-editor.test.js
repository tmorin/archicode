'use strict';
// Tests of scripts/check-editor.mjs (wave 024, run 0183, step 5.2a): the analysis, the counts, --list, --cut and
// --write-names, on synthetic pages and temporary trees; the page of af1ed2d is counted by cutCounts against run 0182's numbers.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const crypto = require('node:crypto');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(REPO, 'scripts/check-editor.mjs');
const CUT = path.join(
  REPO,
  'docs/wav/wav-024-fixes-and-editor-modules/run/run-0182-editor-modules-design/editor-cut.json'
);
const loadModule = () => import(SCRIPT);

const PAGE_PATH = 'src/main/resources/editor-webapp/standalone.html';
const SKELETON = '<!DOCTYPE html>\n<script>\n<!--@parts-->\n</script>\n</html>\n';

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** A tree whose parts are given as { file, layer, text }; the page is assembled by the real assembler. */
function makeTree(parts) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-editor-'));
  write(root, 'src/main/editor/page.html', SKELETON);
  write(
    root,
    'src/main/editor/layers.json',
    JSON.stringify({
      layers: ['core', 'model', 'persistence', 'application', 'presentation', 'composition'],
      parts: parts.map(({ file, layer }) => ({ file, layer }))
    })
  );
  for (const { file, text } of parts) write(root, `src/main/editor/${file}`, text);
  return root;
}

function run(args, root) {
  const result = spawnSync(process.execPath, [SCRIPT, ...args, ...(root ? ['--root', root] : [])], {
    encoding: 'utf8',
    cwd: REPO
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const page = (code) => `<html>\n<script>\n${code}</script>\n</html>\n`;

test('analyse: declarations, kinds and names', async () => {
  const { analyse, topLevelNames } = await loadModule();
  const a = analyse(page('function f() {}\nconst { x, y: [z] } = o;\nlet w = 1, v;\nclass K {}\nf();\n'));
  assert.deepEqual(
    a.decls.map((d) => [d.names, d.kind, d.start, d.end]),
    [
      [['f'], 'function', 3, 3],
      [['x', 'z'], 'const', 4, 4],
      [['w'], 'let', 5, 5],
      [['v'], 'let', 5, 5],
      [['K'], 'function', 6, 6],
      [[], 'statement', 7, 7]
    ]
  );
  assert.deepEqual(topLevelNames(a), { names: ['K', 'f', 'v', 'w', 'x', 'z'], unnamed: 1 });
});

test('analyse: a reference is a global variable, a shadowing local is not', async () => {
  const { analyse } = await loadModule();
  const a = analyse(
    page(
      [
        'function target() {}',
        'function caller() { return target(); }',
        'function shadow(target) { return target; }',
        'function inner() { const target = 1; return target; }',
        'let counter = 0;',
        'function writer() { counter = 2; }',
        'function reader() { return counter; }',
        ''
      ].join('\n')
    )
  );
  const edgesOf = (name) => [...a.edges[a.decls.findIndex((d) => d.names[0] === name)]].map((i) => a.decls[i].names[0]);
  assert.deepEqual(edgesOf('caller'), ['target']);
  assert.deepEqual(edgesOf('shadow'), []);
  assert.deepEqual(edgesOf('inner'), []);
  assert.deepEqual(edgesOf('writer'), ['counter']);
  assert.deepEqual(edgesOf('reader'), ['counter']);
  assert.deepEqual(edgesOf('target'), []);
});

test('analyse: a statement names declarations; a declaration does not name itself', async () => {
  const { analyse } = await loadModule();
  const a = analyse(page('function f() { return f; }\nf();\n'));
  assert.equal(a.edges[0].size, 0);
  assert.deepEqual([...a.edges[1]], [0]);
});

test('analyse: a page without a script, or a script that does not parse, is one sentence', async () => {
  const { analyse } = await loadModule();
  assert.throws(() => analyse('<html></html>'), /no bare <script>/);
  assert.throws(() => analyse(page('function (')), /cannot be parsed/);
});

test('countUpward: only pairs into a higher layer of another part count', async () => {
  const { analyse, countUpward } = await loadModule();
  const a = analyse(page('function low() { high(); }\nfunction high() { low(); }\nfunction same() { low(); }\n'));
  const layers = ['core', 'model'];
  const core = { layerN: 0 };
  const model = { layerN: 1 };
  const parts = [core, model, core];
  const result = countUpward(a, (i) => parts[i], layers);
  assert.equal(result.upward, 1);
  assert.deepEqual(result.byLayers, { 'core to model': 1 });
  assert.deepEqual([...result.named], [['high', 1]]);
  assert.equal(countUpward(a, (i) => parts[i], layers, 'high').upward, 0);
  assert.equal(countUpward(a, () => core, layers).upward, 0);
});

test('cutCounts: parts by first line, the relocation, and the pairs that name render', async () => {
  const { cutCounts } = await loadModule();
  const code = [
    'let state = 1;',
    'function render() { return state; }',
    'function view() { render(); }',
    'function model() { return state; }',
    ''
  ].join('\n');
  // the code starts at line 3 of the page
  const cut = {
    layers: ['core', 'model', 'presentation'],
    parts: [
      { first: 3, file: 'model/s.js', layer: 'model' },
      { first: 4, file: 'presentation/r.js', layer: 'presentation' },
      { first: 5, file: 'core/v.js', layer: 'core' },
      { first: 6, file: 'model/m.js', layer: 'model' }
    ],
    relocate: { to: 'model/ui-state.js', layer: 'model', names: ['state'] }
  };
  const counts = cutCounts(page(code), cut);
  // render (presentation) reads state (model): downward. view (core) names render (presentation): upward.
  // model() (model) reads state (model, other part): same layer, not upward. view -> render is the only pair.
  assert.equal(counts.asCut.upward, 1);
  assert.equal(counts.moved.upward, 1);
  assert.equal(counts.noRender.upward, 0);
  assert.equal(counts.relocated, 1);
});

test('--list: upward pairs by name, grouped by layers, unsorted parts left out', () => {
  const root = makeTree([
    { file: 'core/a.js', layer: 'core', text: 'function low() { return high(); }\n' },
    { file: 'application/b.js', layer: 'application', text: 'function high() { return 1; }\n' },
    { file: 'unsorted/c.js', layer: 'unsorted', text: 'function loose() { return high() + low(); }\n' }
  ]);
  const { code, out } = run(['--list'], root);
  assert.equal(code, 0);
  assert.deepEqual(out.trim().split('\n'), [
    'upward pairs: 1',
    'core to application: 1',
    '  low names high',
    'application/b.js: used by other parts: high',
    'core/a.js: used by other parts: low'
  ]);
});

test('--list: one part, no pair', () => {
  const root = makeTree([
    { file: 'unsorted/script.js', layer: 'unsorted', text: 'function a() { b(); }\nfunction b() {}\n' }
  ]);
  const { code, out } = run(['--list'], root);
  assert.equal(code, 0);
  assert.equal(out.trim(), 'upward pairs: 0');
});

test('--list is deterministic', () => {
  const root = makeTree([
    { file: 'core/a.js', layer: 'core', text: 'function low() { return high(); }\n' },
    { file: 'model/b.js', layer: 'model', text: 'function high() { return 1; }\n' }
  ]);
  assert.equal(run(['--list'], root).out, run(['--list'], root).out);
});

test('--write-names writes the sorted names and the number of unnamed statements', () => {
  const root = makeTree([
    {
      file: 'unsorted/script.js',
      layer: 'unsorted',
      text: 'const b = 1;\nfunction a() {}\nlet { c, d } = b;\na();\nb;\n'
    }
  ]);
  const { code, out } = run(['--write-names'], root);
  assert.equal(code, 0);
  assert.match(out, /4 names, 2 unnamed/);
  const written = fs.readFileSync(path.join(root, 'src/main/editor/names.json'), 'utf8');
  assert.deepEqual(JSON.parse(written), { names: ['a', 'b', 'c', 'd'], unnamed: 2 });
  assert.ok(written.endsWith('\n'));
  assert.equal(run(['--write-names'], root).code, 0);
  assert.equal(fs.readFileSync(path.join(root, 'src/main/editor/names.json'), 'utf8'), written);
});

test('--cut refuses a page the table is not for, with exit 2', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-editor-cut-'));
  const html = page('function f() {}\n');
  write(root, PAGE_PATH, html);
  const table = path.join(root, 'cut.json');
  fs.writeFileSync(
    table,
    JSON.stringify({
      page: PAGE_PATH,
      sha256Prefix: '0123456789abcdef',
      layers: ['core'],
      parts: [],
      relocate: { names: [] }
    })
  );
  const { code, err } = run(['--cut', table], root);
  assert.equal(code, 2);
  assert.match(err, /sha256 starts with 0123456789abcdef, not [0-9a-f]{16}/);
});

test('--cut evaluates a table on a synthetic page', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-editor-cut-'));
  const html = page('function low() { high(); }\nfunction high() {}\n');
  write(root, PAGE_PATH, html);
  const table = path.join(root, 'cut.json');
  const sha = crypto.createHash('sha256').update(html).digest('hex').slice(0, 16);
  fs.writeFileSync(
    table,
    JSON.stringify({
      page: PAGE_PATH,
      sha256Prefix: sha,
      layers: ['core', 'model'],
      parts: [
        { first: 3, file: 'core/a.js', layer: 'core' },
        { first: 4, file: 'model/b.js', layer: 'model' }
      ],
      relocate: { to: 'model/ui-state.js', layer: 'model', names: [] }
    })
  );
  const { code, out } = run(['--cut', table], root);
  assert.equal(code, 0);
  assert.deepEqual(
    out
      .trim()
      .split('\n')
      .map((l) => l.split(': ')[1]),
    ['1', '1', '1']
  );
});

test('--cut on the page of af1ed2d gives the 311, 162 and 100 of run 0182', async () => {
  const { cutCounts } = await loadModule();
  const html = execFileSync('git', ['show', `af1ed2d:${PAGE_PATH}`], {
    cwd: REPO,
    encoding: 'utf8',
    maxBuffer: 256 * 1024 * 1024
  });
  const cut = JSON.parse(fs.readFileSync(CUT, 'utf8'));
  const counts = cutCounts(html, cut);
  assert.equal(counts.asCut.upward, 311);
  assert.equal(counts.moved.upward, 162);
  assert.equal(counts.noRender.upward, 100);
});

test('command line: unknown option, no mode, two modes, a missing value', () => {
  assert.match(run(['--nope']).err, /unknown option `--nope`/);
  assert.match(run([]).err, /no mode/);
  assert.match(run(['--list', '--write-names']).err, /only one mode/);
  assert.match(run(['--cut']).err, /--cut needs a value/);
  assert.equal(run(['--nope']).code, 1);
});

test('an assembly error is one line and exit 1', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-editor-empty-'));
  const { code, err } = run(['--list'], root);
  assert.equal(code, 1);
  assert.equal(err.trim().split('\n').length, 1);
});
