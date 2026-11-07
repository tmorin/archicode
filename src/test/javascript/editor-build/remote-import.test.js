'use strict';
// The page loads nothing from a remote address: no import( of an http(s) string, no `from` followed by one, no script
// tag with an http(s) src, in the sources of the editor and in the generated page. Each shape is proved on strings first.
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../../../..');
const SHAPES = {
  'a dynamic import of an http(s) address': /\bimport\s*\(\s*[`'"]https?:/,
  'a static import from an http(s) address': /\bfrom\s*[`'"]https?:/,
  'a script tag with an http(s) src': /<script\b[^>]*\bsrc\s*=\s*[`'"]?https?:/i
};

test('each shape matches what it names and not a neighbour', () => {
  const yes = {
    'a dynamic import of an http(s) address': [
      "import('https://esm.sh/x')",
      'import( "http://a/b" )',
      'await import(`https://a`)'
    ],
    'a static import from an http(s) address': ["import { a } from 'https://esm.sh/x';", 'export * from "http://a"'],
    'a script tag with an http(s) src': [
      '<script src="https://cdn.test/a.js"></script>',
      "<script type='module' src=http://a/b.js>"
    ]
  };
  const no = [
    'import(address)',
    "import('./assets/elk.js')",
    "import x from './https.js'",
    '<script src="./a.js"></script>',
    '<script>const url = "https://example.test";</script>',
    'a link to https://example.test in a comment'
  ];
  for (const [name, samples] of Object.entries(yes))
    for (const sample of samples) assert.ok(SHAPES[name].test(sample), `${name} should match: ${sample}`);
  for (const sample of no)
    for (const [name, shape] of Object.entries(SHAPES))
      assert.ok(!shape.test(sample), `${name} should not match: ${sample}`);
});

function filesUnder(dir) {
  const out = [];
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) out.push(...filesUnder(full));
    else if (/\.(js|mjs|html)$/.test(entry.name)) out.push(full);
  }
  return out;
}

test('the sources of the editor and the generated page import nothing remote', () => {
  const files = [
    ...filesUnder(path.join(ROOT, 'src/main/editor')),
    path.join(ROOT, 'src/main/resources/editor-webapp/standalone.html')
  ];
  assert.ok(files.length > 10, `read ${files.length} files`);
  const found = [];
  for (const file of files) {
    const lines = fs.readFileSync(file, 'utf8').split('\n');
    lines.forEach((line, i) => {
      for (const [name, shape] of Object.entries(SHAPES))
        if (shape.test(line)) found.push(`${path.relative(ROOT, file)}:${i + 1}: ${name}`);
    });
  }
  assert.deepEqual(found, []);
});

// A page opened from a disk (file://) may load a classic script but may not import a module or fetch a file: the assets beside the
// page are scripts that set a global, and nothing in the page may go back to `import(`. The bundles are built output, not read.
test('the sources of the editor and the page import no module at all (a page opened from a disk could not load it)', () => {
  const files = [
    ...filesUnder(path.join(ROOT, 'src/main/editor')).filter((file) => !file.includes(`${path.sep}bundles${path.sep}`)),
    path.join(ROOT, 'src/main/resources/editor-webapp/standalone.html')
  ];
  const found = [];
  for (const file of files) {
    fs.readFileSync(file, 'utf8')
      .split('\n')
      .forEach((line, i) => {
        if (/\bimport\s*\(/.test(line.replace(/\/\/.*$/, '').replace(/\/\*.*?\*\//g, '')))
          found.push(`${path.relative(ROOT, file)}:${i + 1}`);
      });
  }
  assert.deepEqual(found, []);
});
