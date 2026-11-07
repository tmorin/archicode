'use strict';
// The lock layout the bundles rely on: @codemirror/state and @codemirror/view exist once in package-lock.json, with no
// nested copy under another package. Two copies make CodeMirror throw "multiple instances of @codemirror/state" the
// moment the YAML language and the editor are loaded together. The test says what it read.

const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const LOCK = path.resolve(__dirname, '../../../../package-lock.json');
const SHARED = ['@codemirror/state', '@codemirror/view'];

function copiesOf(packages, name) {
  return Object.keys(packages).filter((key) => key === `node_modules/${name}` || key.endsWith(`/node_modules/${name}`));
}

test('package-lock.json holds one copy of @codemirror/state and of @codemirror/view, none nested', () => {
  const { packages, lockfileVersion } = JSON.parse(fs.readFileSync(LOCK, 'utf8'));
  const read = `read package-lock.json (lockfileVersion ${lockfileVersion}, ${Object.keys(packages).length} entries)`;
  for (const name of SHARED) {
    const copies = copiesOf(packages, name);
    assert.deepEqual(copies, [`node_modules/${name}`], `${read}: the copies of ${name} are ${JSON.stringify(copies)}`);
  }
});

test('the seven build inputs are pinned exactly in package.json', () => {
  const { devDependencies } = JSON.parse(fs.readFileSync(path.resolve(path.dirname(LOCK), 'package.json'), 'utf8'));
  assert.deepEqual(
    Object.fromEntries(
      [
        'esbuild',
        'codemirror',
        '@codemirror/lang-yaml',
        '@codemirror/lang-json',
        '@codemirror/language',
        '@lezer/highlight',
        'elkjs'
      ].map((name) => [name, devDependencies[name]])
    ),
    {
      esbuild: '0.28.2',
      codemirror: '6.0.1',
      '@codemirror/lang-yaml': '6.1.1',
      '@codemirror/lang-json': '6.0.1',
      '@codemirror/language': '6.13.1',
      '@lezer/highlight': '1.2.5',
      elkjs: '0.9.3'
    }
  );
});
