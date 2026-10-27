'use strict';
// The six YAML parts of the editor (wave 024, run 0184, DEC-5) name nothing outside the six that is not declared in a
// part of layer core (run 0185, DEC-7). The check runs over a root folder, so it is shown to
// fail on a temporary copy of the tree where a YAML part names a function of a part that is not of layer core (run 0186: no part is `unsorted` any more).

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');

const REPO = path.resolve(__dirname, '../../../..');
const BUILD = path.join(REPO, 'scripts/build-editor.mjs');
const CHECK = path.join(REPO, 'scripts/check-editor.mjs');

const YAML_PARTS = [
  'core/yaml-parser.js',
  'core/yaml-serializer.js',
  'core/yaml-patch-text.js',
  'core/yaml-patch-flow.js',
  'core/yaml-patch-lines.js',
  'core/yaml-block-moves.js'
];
const MAX_LINES = 3000;

/** The names outside the six that the declarations of the six parts name, as "name (declared in file)" lines. */
async function namesOutsideTheSix(root) {
  const { assemble, mapOf } = await import(BUILD);
  const { analyse } = await import(CHECK);
  const allParts = mapOf(root).parts;
  const ranges = allParts.filter((p) => YAML_PARTS.includes(p.file));
  const layerOf = Object.fromEntries(
    JSON.parse(fs.readFileSync(path.join(root, 'src/main/editor/layers.json'), 'utf8')).parts.map((p) => [
      p.file,
      p.layer
    ])
  );
  const analysis = analyse(assemble(root).text);
  const rangeOf = (decl) => ranges.find((r) => r.first <= decl.start && decl.start <= r.last) ?? null;
  const problems = [];
  analysis.decls.forEach((decl, i) => {
    const from = rangeOf(decl);
    if (!from) return;
    for (const target of analysis.edges[i]) {
      const to = analysis.decls[target];
      if (rangeOf(to)) continue;
      const owner = allParts.find((r) => r.first <= to.start && to.start <= r.last);
      if (owner && layerOf[owner.file] === 'core') continue;
      const names = to.names;
      if (names.length === 0) continue;
      problems.push(`${from.file}: ${decl.names.join(',') || 'a statement'} names ${names.join(',')}`);
    }
  });
  return { problems, ranges };
}

test('the six YAML parts name nothing outside the six that is not declared in a part of layer core', async () => {
  const { problems, ranges } = await namesOutsideTheSix(REPO);
  assert.deepEqual(
    ranges.map((r) => r.file),
    YAML_PARTS,
    'the six parts are in the page, in this order'
  );
  assert.deepEqual(problems, []);
});

test('the six YAML parts are layer core, in order, the parser first with use strict, none over 3000 lines', () => {
  const config = JSON.parse(fs.readFileSync(path.join(REPO, 'src/main/editor/layers.json'), 'utf8'));
  const files = config.parts.map((p) => p.file);
  assert.deepEqual(files.slice(0, YAML_PARTS.length), YAML_PARTS);
  for (const part of config.parts.slice(0, YAML_PARTS.length)) assert.equal(part.layer, 'core', part.file);
  for (const file of YAML_PARTS) {
    const text = fs.readFileSync(path.join(REPO, 'src/main/editor', file), 'utf8');
    assert.ok(text.split('\n').length <= MAX_LINES, `${file} is over ${MAX_LINES} lines`);
  }
  const first = fs.readFileSync(path.join(REPO, 'src/main/editor', YAML_PARTS[0]), 'utf8');
  assert.ok(first.startsWith("'use strict';"), 'core/yaml-parser.js starts with use strict');
});

test('the check fails on a copy where a YAML part names a function of a part that is not of layer core', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'yaml-parts-'));
  try {
    fs.cpSync(path.join(REPO, 'src/main/editor'), path.join(root, 'src/main/editor'), { recursive: true });
    fs.cpSync(path.join(REPO, 'src/main/wasm'), path.join(root, 'src/main/wasm'), { recursive: true });
    const { mapOf, assemble } = await import(BUILD);
    const { analyse } = await import(CHECK);
    const layers = JSON.parse(fs.readFileSync(path.join(root, 'src/main/editor/layers.json'), 'utf8'));
    const outsideCore = new Set(layers.parts.filter((p) => p.layer !== 'core').map((p) => p.file));
    const outside = mapOf(root).parts.filter((p) => outsideCore.has(p.file));
    const analysis = analyse(assemble(root).text);
    const target = analysis.decls.find(
      (d) => d.kind === 'function' && outside.some((u) => u.first <= d.start && d.start <= u.last)
    );
    assert.ok(target, 'a part outside core holds a function');
    const file = path.join(root, 'src/main/editor', YAML_PARTS[1]);
    fs.appendFileSync(file, `\nfunction yamlPartsProbe() {\n  return ${target.names[0]};\n}\n`);
    const { problems } = await namesOutsideTheSix(root);
    assert.deepEqual(problems, [`${YAML_PARTS[1]}: yamlPartsProbe names ${target.names[0]}`]);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});
