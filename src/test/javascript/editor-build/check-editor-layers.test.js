'use strict';
// Tests of scripts/check-editor.mjs --layers (wave 024, run 0183, step 5.2c): the names, the Java names, the load
// order and the ratchet, on temporary trees; the real repository must pass.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { spawnSync } = require('node:child_process');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const SCRIPT = path.join(REPO, 'scripts/check-editor.mjs');
const SKELETON = '<!DOCTYPE html>\n<script>\n<!--@parts-->\n</script>\n</html>\n';
const LAYERS = ['core', 'model', 'persistence', 'application', 'presentation', 'composition'];

function write(root, file, content) {
  const target = path.join(root, file);
  fs.mkdirSync(path.dirname(target), { recursive: true });
  fs.writeFileSync(target, content);
}

/**
 * A tree: parts as { file, layer, text }; `names` and `javaNames` default to what the parts and no Java file say.
 */
function makeTree(parts, { max = 0, names, javaNames, java = {} } = {}) {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'check-layers-'));
  write(root, 'src/main/editor/page.html', SKELETON);
  write(
    root,
    'src/main/editor/layers.json',
    JSON.stringify({ layers: LAYERS, parts: parts.map(({ file, layer }) => ({ file, layer })), ratchet: { max } })
  );
  for (const { file, text } of parts) write(root, `src/main/editor/${file}`, text);
  write(root, 'src/main/editor/names.json', JSON.stringify(names ?? { names: ['a', 'b'], unnamed: 0 }));
  write(root, 'src/main/editor/java-names.json', JSON.stringify(javaNames ?? { names: {}, pathOnly: [] }));
  for (const [file, content] of Object.entries(java)) write(root, file, content);
  return root;
}

function run(root) {
  const result = spawnSync(process.execPath, [SCRIPT, '--layers', '--root', root], { encoding: 'utf8', cwd: REPO });
  return { code: result.status, out: result.stdout, err: result.stderr };
}

const AB = [
  { file: 'core/a.js', layer: 'core', text: 'function a() { return 1; }\n' },
  { file: 'model/b.js', layer: 'model', text: 'function b() { return a(); }\n' }
];

test('--layers passes and prints the ratchet line on a clean tree', () => {
  const { code, out } = run(makeTree(AB));
  assert.equal(code, 0);
  assert.match(out, /upward pairs: 0 \(max 0\)/);
});

test('--layers: names added and removed are listed, with the way to write them', () => {
  const { code, err } = run(makeTree(AB, { names: { names: ['a', 'gone'], unnamed: 0 } }));
  assert.equal(code, 1);
  assert.match(err, /added: b; removed: gone/);
  assert.match(err, /--write-names/);
});

test('--layers: a different number of statements without a name fails', () => {
  const { code, err } = run(makeTree(AB, { names: { names: ['a', 'b'], unnamed: 3 } }));
  assert.equal(code, 1);
  assert.match(err, /statements without a name: 0, names.json says 3/);
});

test('--layers: the ratchet counts an upward pair and fails above the maximum', () => {
  const upward = [
    { file: 'core/a.js', layer: 'core', text: 'function a() { return b(); }\n' },
    { file: 'model/b.js', layer: 'model', text: 'function b() { return 1; }\n' }
  ];
  const ok = run(makeTree(upward, { max: 1 }));
  assert.equal(ok.code, 0);
  assert.match(ok.out, /upward pairs: 1 \(max 1\)/);
  const bad = run(makeTree(upward, { max: 0 }));
  assert.equal(bad.code, 1);
  assert.match(bad.err, /upward pairs: 1 \(max 0\)/);
});

test('--layers: unsorted parts are left out of the ratchet', () => {
  const parts = [
    { file: 'unsorted/a.js', layer: 'unsorted', text: 'function a() { return b(); }\n' },
    { file: 'model/b.js', layer: 'model', text: 'function b() { return 1; }\n' }
  ];
  const { code, out } = run(makeTree(parts));
  assert.equal(code, 0);
  assert.match(out, /upward pairs: 0 \(max 0\)/);
});

test('--layers: a load-order mistake fails', () => {
  const parts = [{ file: 'core/a.js', layer: 'core', text: 'const a = b;\nconst b = 1;\n' }];
  const { code, err } = run(makeTree(parts, { names: { names: ['a', 'b'], unnamed: 0 } }));
  assert.equal(code, 1);
  assert.match(err, /load order: `a`.*reads `b`/);
});

test('--layers: layers.json refuses an unknown key, a part outside its layer and a bad ratchet', () => {
  const root = makeTree(AB);
  const file = 'src/main/editor/layers.json';
  const config = JSON.parse(fs.readFileSync(path.join(root, file), 'utf8'));
  write(root, file, JSON.stringify({ ...config, area: 1 }));
  assert.match(run(root).err, /unknown key `area`/);
  write(root, file, JSON.stringify({ ...config, parts: [{ file: 'core/a.js', layer: 'model' }] }));
  assert.match(run(root).err, /must be in a folder named like its layer/);
  write(root, file, JSON.stringify({ ...config, ratchet: {} }));
  assert.match(run(root).err, /ratchet\.max/);
});

const JAVA_OK = {
  names: { a: ['src/main/java/A.java'] },
  pathOnly: ['src/main/java/P.java']
};
const JAVA_FILES = {
  'src/main/java/A.java': '// a in standalone.html\nclass A {}\n',
  'src/main/java/P.java': '// "standalone.html"\nclass P {}\n'
};

test('--layers: Java names pass, with a pathOnly file', () => {
  const { code } = run(makeTree(AB, { javaNames: JAVA_OK, java: JAVA_FILES }));
  assert.equal(code, 0);
});

test('--layers: a listed Java name that is not a top-level name fails', () => {
  const javaNames = { names: { ...JAVA_OK.names, zzz: ['src/main/java/A.java'] }, pathOnly: JAVA_OK.pathOnly };
  const { code, err } = run(
    makeTree(AB, { javaNames, java: { ...JAVA_FILES, 'src/main/java/A.java': '// a zzz standalone.html\n' } })
  );
  assert.equal(code, 1);
  assert.match(err, /lists `zzz`, which is not a top-level name/);
});

test('--layers: a listed Java file that no longer names the word fails (a longer word does not count)', () => {
  const files = { ...JAVA_FILES, 'src/main/java/A.java': '// aa standalone.html\n' };
  const { code, err } = run(makeTree(AB, { javaNames: JAVA_OK, java: files }));
  assert.equal(code, 1);
  assert.match(err, /`src\/main\/java\/A.java` for `a`, which it no longer names/);
});

test('--layers: a new Java file that names the page fails, in main and in test', () => {
  for (const file of ['src/main/java/New.java', 'src/test/java/NewTest.java']) {
    const files = { ...JAVA_FILES, [file]: '// see standalone.html\nclass New {}\n' };
    const { code, err } = run(makeTree(AB, { javaNames: JAVA_OK, java: files }));
    assert.equal(code, 1);
    assert.ok(err.includes(`${file} names \`standalone.html\` and is not in java-names.json`));
  }
});

test('--layers: a Java file that does not name the page needs no entry', () => {
  const files = { ...JAVA_FILES, 'src/main/java/Other.java': 'class Other {}\n' };
  assert.equal(run(makeTree(AB, { javaNames: JAVA_OK, java: files })).code, 0);
});

test('--layers: a pathOnly file that is gone or no longer names the page fails', () => {
  const gone = run(
    makeTree(AB, { javaNames: JAVA_OK, java: { 'src/main/java/A.java': JAVA_FILES['src/main/java/A.java'] } })
  );
  assert.match(gone.err, /pathOnly, which does not exist/);
  const files = { ...JAVA_FILES, 'src/main/java/P.java': 'class P {}\n' };
  const stale = run(makeTree(AB, { javaNames: JAVA_OK, java: files }));
  assert.match(stale.err, /pathOnly, which no longer contains `standalone.html`/);
});

test('--layers passes on the repository', () => {
  const { code, out, err } = run(REPO);
  assert.equal(code, 0, err);
  const pairs = out.match(/upward pairs: (\d+) \(max 99\)/);
  assert.ok(pairs, out);
  assert.ok(Number(pairs[1]) <= 99, `${pairs[1]} upward pairs, above the ratchet`);
});

test('the layers.json of the repository has ratchet.max 99 and java-names.json lists the two path-only files', () => {
  const layers = JSON.parse(fs.readFileSync(path.join(REPO, 'src/main/editor/layers.json'), 'utf8'));
  assert.equal(layers.ratchet.max, 99);
  const java = JSON.parse(fs.readFileSync(path.join(REPO, 'src/main/editor/java-names.json'), 'utf8'));
  assert.equal(Object.keys(java.names).length, 21);
  assert.deepEqual(java.pathOnly.map((f) => path.basename(f)).sort(), [
    'EditorHttpServer.java',
    'NativeReflectionConfigTest.java'
  ]);
});
