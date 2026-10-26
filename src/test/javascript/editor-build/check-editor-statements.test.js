'use strict';
// Tests of scripts/check-editor.mjs --statements and of the load-order check (wave 024, run 0183, step 5.2b): each case
// is a small page in a temporary git repository, committed as the page of a revision, then rebuilt from other parts.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { execFileSync, spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(REPO, 'scripts/check-editor.mjs');
const BUILD = path.join(REPO, 'scripts/build-editor.mjs');
const loadModule = () => import(SCRIPT);

const SKELETON =
  '<!DOCTYPE html>\n<style>\nbody { margin: 0; }\n</style>\n<script>\n<!--@parts-->\n</script>\n</html>\n';
const LAYERS = ['core', 'model', 'persistence', 'application', 'presentation', 'composition'];

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/** Replaces the sources of the tree: parts are { file: 'core/a.js', text }, the layer is the folder. */
function setSources(root, parts, skeleton = SKELETON) {
  fs.rmSync(path.join(root, 'src/main/editor'), { recursive: true, force: true });
  write(root, 'src/main/editor/page.html', skeleton);
  write(
    root,
    'src/main/editor/layers.json',
    JSON.stringify({ layers: LAYERS, parts: parts.map(({ file }) => ({ file, layer: file.split('/')[0] })) })
  );
  for (const { file, text } of parts) write(root, `src/main/editor/${file}`, text);
}

/** A git repository whose HEAD has the page assembled from `before`; the sources are then set to `after`. */
function scenario(before, after, { skeletonBefore = SKELETON, skeletonAfter = SKELETON } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-statements-'));
  const git = (...args) => execFileSync('git', args, { cwd: root, stdio: 'ignore' });
  git('init', '-q');
  git('config', 'user.email', 'test@example.com');
  git('config', 'user.name', 'Test');
  setSources(root, before, skeletonBefore);
  execFileSync(process.execPath, [BUILD, '--root', root], { stdio: 'ignore' });
  git('add', '-A');
  git('commit', '-q', '-m', 'base');
  setSources(root, after, skeletonAfter);
  return root;
}

function statements(root, rev = 'HEAD') {
  const result = spawnSync(process.execPath, [SCRIPT, '--statements', rev, '--root', root], {
    encoding: 'utf8',
    cwd: REPO
  });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const part = (file, ...lines) => ({ file, text: `${lines.join('\n')}\n` });

test('the same sources pass', () => {
  const parts = [part('core/a.js', 'const A = 1;', 'function f() { return A; }', 'f();')];
  const result = statements(scenario(parts, parts));
  assert.equal(result.code, 0, result.err);
  assert.match(result.out, /load order holds/);
});

test('a let moved before the const its initializer reads fails', () => {
  const before = [part('core/a.js', 'const A = 1;', 'let b = A + 1;')];
  const after = [part('core/a.js', 'let b = A + 1;', 'const A = 1;')];
  const result = statements(scenario(before, after));
  assert.equal(result.code, 1);
  assert.match(result.err, /load order: `b` \(line 6\) reads `A` at load time before its declaration at line 7/);
  assert.equal(result.out, '');
});

test('a function moved passes, whatever the declarations around it', () => {
  const before = [part('core/a.js', 'const A = 1;', 'function f() { return A; }', 'const B = f();')];
  const after = [part('core/a.js', 'function f() { return A; }', 'const A = 1;', 'const B = f();')];
  assert.equal(statements(scenario(before, after)).code, 0);
});

test('a call at load that reads a later const fails, naming the function', () => {
  const before = [part('core/a.js', 'const LATER = 1;', 'function f() { return LATER; }', 'const x = f();')];
  const after = [part('core/a.js', 'function f() { return LATER; }', 'const x = f();', 'const LATER = 1;')];
  const result = statements(scenario(before, after));
  assert.equal(result.code, 1);
  assert.match(result.err, /`x` \(line 7\) reads, through `f`, `LATER` at load time before its declaration/);
});

test('a call is followed through the functions it calls and through nested functions', () => {
  const before = [
    part(
      'core/a.js',
      'const LATER = 1;',
      'function inner() { return [1].map(() => LATER); }',
      'function outer() { return inner(); }',
      'outer();'
    )
  ];
  const after = [
    part(
      'core/a.js',
      'function inner() { return [1].map(() => LATER); }',
      'function outer() { return inner(); }',
      'outer();',
      'const LATER = 1;'
    )
  ];
  const result = statements(scenario(before, after));
  assert.equal(result.code, 1);
  assert.match(result.err, /reads, through `outer`, `LATER`/);
});

test('code that runs later is not read at load: a stored function and a listener passed by name', () => {
  const before = [
    part(
      'core/a.js',
      'const LATER = 1;',
      'const stored = () => LATER;',
      'function onClick() { return LATER; }',
      "document.addEventListener('click', onClick);",
      "document.addEventListener('keydown', () => LATER);",
      'setTimeout(function () { return LATER; }, 0);'
    )
  ];
  const after = [
    part(
      'core/a.js',
      'const stored = () => LATER;',
      'function onClick() { return LATER; }',
      "document.addEventListener('click', onClick);",
      "document.addEventListener('keydown', () => LATER);",
      'setTimeout(function () { return LATER; }, 0);',
      'const LATER = 1;'
    )
  ];
  const result = statements(scenario(before, after));
  assert.equal(result.code, 0, result.err);
});

test('a listener registered by the name of a const that is declared later fails', () => {
  const before = [part('core/a.js', 'const handler = () => 1;', "document.addEventListener('click', handler);")];
  const after = [part('core/a.js', "document.addEventListener('click', handler);", 'const handler = () => 1;')];
  const result = statements(scenario(before, after));
  assert.equal(result.code, 1);
  assert.match(result.err, /reads `handler` at load time before its declaration/);
});

test('a function relocated to another part passes', () => {
  const before = [
    part('core/a.js', 'const A = 1;', 'function f() { return A; }'),
    part('model/b.js', 'const B = f();')
  ];
  const after = [part('core/a.js', 'const A = 1;'), part('model/b.js', 'function f() { return A; }', 'const B = f();')];
  assert.equal(statements(scenario(before, after)).code, 0);
});

test('a comment directly above a declaration moves with it, and a comment left behind fails', () => {
  const before = [part('core/a.js', '// the lookup', 'function f() {}', '', '// a note', 'const A = 1;')];
  const moved = [part('core/a.js', '// a note', 'const A = 1;', '', '// the lookup', 'function f() {}')];
  assert.equal(statements(scenario(before, moved)).code, 0);
  const left = [part('core/a.js', '// the lookup', '// a note', 'const A = 1;', '', 'function f() {}')];
  const result = statements(scenario(before, left));
  assert.equal(result.code, 1);
  assert.match(result.err, /the top-level declarations differ/);
});

test('a function edited fails and the first difference is named', () => {
  const before = [part('core/a.js', 'function f() { return 1; }')];
  const after = [part('core/a.js', 'function f() { return 2; }')];
  const result = statements(scenario(before, after));
  assert.equal(result.code, 1);
  assert.match(result.err, /1 only in `HEAD`, 1 only in the assembly/);
  assert.match(result.err, /`function f\(\) \{ return 1; \}` \(line 6\)/);
  assert.match(result.err, /`function f\(\) \{ return 2; \}` \(line 6, produced by core\/a\.js:1\)/);
});

test('a declaration lost or duplicated fails', () => {
  const before = [part('core/a.js', 'function f() {}', 'function g() {}')];
  assert.equal(statements(scenario(before, [part('core/a.js', 'function f() {}')])).code, 1);
  assert.equal(
    statements(scenario(before, [part('core/a.js', 'function f() {}', 'function g() {}', 'function g() {}')])).code,
    1
  );
});

test('a comment lost fails, a comment moved passes', () => {
  const before = [part('core/a.js', 'const A = 1;', '', '// free note', '', 'const B = 2;')];
  const lost = [part('core/a.js', 'const A = 1;', '', 'const B = 2;')];
  const result = statements(scenario(before, lost));
  assert.equal(result.code, 1);
  assert.match(
    result.err,
    /the comments differ: 1 only in `HEAD`, 0 only in the assembly; first only in `HEAD`: `free note`/
  );
  const moved = [part('core/a.js', '// free note', '', 'const A = 1;', '', 'const B = 2;')];
  assert.equal(statements(scenario(before, moved)).code, 0);
});

test('a comment inside a function that is lost fails', () => {
  const before = [part('core/a.js', 'function f() {', '  // why', '  return 1;', '}')];
  const after = [part('core/a.js', 'function f() {', '  return 1;', '}')];
  assert.equal(statements(scenario(before, after)).code, 1);
});

test('a part outside the script changed fails, before and after the script', () => {
  const parts = [part('core/a.js', 'const A = 1;')];
  const style = SKELETON.replace('margin: 0', 'margin: 1px');
  const head = statements(scenario(parts, parts, { skeletonAfter: style }));
  assert.equal(head.code, 1);
  assert.match(head.err, /outside the main script: the page differs from `HEAD` at line 3, produced by page\.html:3/);
  const tail = statements(
    scenario(parts, parts, { skeletonAfter: SKELETON.replace('</html>', '<!-- x -->\n</html>') })
  );
  assert.equal(tail.code, 1);
  assert.match(tail.err, /outside the main script: the page differs from `HEAD` at line 8/);
});

test('an unknown revision, or an option for a revision, is one sentence', () => {
  const parts = [part('core/a.js', 'const A = 1;')];
  const root = scenario(parts, parts);
  const unknown = statements(root, 'nowhere');
  assert.equal(unknown.code, 1);
  assert.match(unknown.err, /^cannot read src\/main\/resources\/editor-webapp\/standalone\.html at `nowhere`/);
  assert.match(statements(root, '--stat').err, /^`--stat` is not a revision/);
});

test('statements needs a revision and cannot be mixed with another mode', () => {
  const noRev = spawnSync(process.execPath, [SCRIPT, '--statements'], { encoding: 'utf8' });
  assert.equal(noRev.status, 1);
  assert.match(noRev.stderr, /--statements needs a value/);
  const two = spawnSync(process.execPath, [SCRIPT, '--list', '--statements', 'HEAD'], { encoding: 'utf8' });
  assert.equal(two.status, 1);
  assert.match(two.stderr, /only one mode at a time/);
});

const page = (code) => `<html>\n<script>\n${code}</script>\n</html>\n`;

test('loadOrderProblems: the rule on single pages', async () => {
  const { analyse, loadOrderProblems } = await loadModule();
  const problems = (code) => loadOrderProblems(analyse(page(code)));
  // satisfied
  assert.deepEqual(problems('const a = 1;\nconst b = a;\n'), []);
  assert.deepEqual(problems('const b = f();\nfunction f() { return 1; }\n'), []);
  assert.deepEqual(problems('const { x, y = x } = o;\nvar v = v || {};\nlet u = 1, w = u;\n'), []);
  assert.deepEqual(problems('class A {}\nclass B extends A {}\n'), []);
  assert.deepEqual(problems('const o = { m() { return L; }, n: () => L };\nconst L = 1;\n'), []);
  assert.deepEqual(problems('class K { m() { return L; } x = L; }\nconst L = 1;\n'), []);
  // refused
  assert.equal(problems('const a = a + 1;\n').length, 1);
  assert.equal(problems('class B extends A {}\nclass A {}\n').length, 1);
  assert.equal(problems('class K { constructor() { this.v = L; } }\nconst k = new K();\nconst L = 1;\n').length, 1);
  assert.equal(problems('class K { static s = L; }\nconst L = 1;\n').length, 1);
  assert.equal(problems('[1].forEach((n) => L + n);\nconst L = 1;\n').length, 1);
  assert.equal(problems('(function () { return L; })();\nconst L = 1;\n').length, 1);
  assert.equal(problems('L = 2;\nlet L;\n').length, 1);
  assert.equal(problems('const g = () => L;\ng();\nconst L = 1;\n').length, 1);
  assert.equal(problems('function f() { return L; }\nconst p = f;\nconst L = 1;\n').length, 1);
  // a local that shadows a later top-level name is not a read of it
  assert.deepEqual(problems('function f(L) { return L; }\nf(1);\nconst L = 1;\n'), []);
});

test('loadOrderProblems: one sentence for each name, naming the line of the root', async () => {
  const { analyse, loadOrderProblems } = await loadModule();
  const found = loadOrderProblems(analyse(page('const x = L + L;\nconst y = M;\nconst L = 1;\nconst M = 2;\n')));
  assert.deepEqual(found, [
    'load order: `x` (line 3) reads `L` at load time before its declaration at line 5',
    'load order: `y` (line 4) reads `M` at load time before its declaration at line 6'
  ]);
});

test('the real page: --statements HEAD passes', () => {
  const result = spawnSync(process.execPath, [SCRIPT, '--statements', 'HEAD'], { encoding: 'utf8', cwd: REPO });
  assert.equal(result.status, 0, result.stderr);
});
