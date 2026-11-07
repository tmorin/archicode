'use strict';
// assetAddress(name) reads the <meta name="archicode-asset:NAME"> of the page; loadElk() gives null when there is none.
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);

/** A page whose document holds the given metas (name -> content) and the given base address. */
function pageWith(metas, baseURI) {
  const sandbox = createApp();
  sandbox.URL = URL; // the harness has no URL; a browser has
  sandbox.document.baseURI = baseURI;
  sandbox.document.querySelector = (selector) => {
    const match = /^meta\[name="(.*)"\]$/.exec(selector);
    if (!match || !(match[1] in metas)) return null;
    return { getAttribute: (attribute) => (attribute === 'content' ? metas[match[1]] : null) };
  };
  return sandbox;
}

test('no meta gives a null address', () => {
  const sandbox = pageWith({}, 'https://example.test/editor/');
  assert.equal(run(sandbox, 'assetAddress("elk.js")'), null);
});

test('an empty content gives a null address', () => {
  const sandbox = pageWith({ 'archicode-asset:elk.js': '' }, 'https://example.test/editor/');
  assert.equal(run(sandbox, 'assetAddress("elk.js")'), null);
});

test('no document gives a null address', () => {
  const sandbox = createApp();
  sandbox.document = undefined;
  assert.equal(run(sandbox, 'assetAddress("elk.js")'), null);
});

test('a querySelector that throws gives a null address', () => {
  const sandbox = createApp();
  sandbox.document.querySelector = () => {
    throw new Error('no');
  };
  assert.equal(run(sandbox, 'assetAddress("elk.js")'), null);
});

test('a valid content is resolved against document.baseURI', () => {
  const sandbox = pageWith({ 'archicode-asset:elk.js': './assets/elk.js?v=0a1b2c3d' }, 'https://example.test/editor/');
  assert.equal(run(sandbox, 'assetAddress("elk.js")'), 'https://example.test/editor/assets/elk.js?v=0a1b2c3d');
  assert.equal(run(sandbox, 'assetAddress("codemirror.js")'), null);
});

test('loadElk() gives null when the page names no ELK asset', async () => {
  const sandbox = pageWith({}, 'https://example.test/editor/');
  assert.equal(await run(sandbox, 'loadElk()'), null);
});
