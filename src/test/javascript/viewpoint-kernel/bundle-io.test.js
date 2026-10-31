'use strict';
// The edges of the bundle in the page (wave 025, run 0193, task-005; TDD DEC-4, DEC-5, DEC-6, DEC-13, CTR-2, IMP-5, CON-8): the pure and
// near-pure functions of persistence/bundle-io.js that Export, Import and the sample use around the codec of persistence/bundle.js. The DOM
// and the network are touched in four small top-level functions (`fetchSampleBundle`, `bundleFilePicker`, `startBundleDownload`,
// `readBundleFile`); this file runs the two that need neither a picker nor a download, against a fake `fetch` and a stub file, and the
// e2e spec runs the real ones in two browsers.
//
// Written before the part exists: they fail now because the page has no `bundleFileName`, `readBundleFile`, `fetchSampleBundle`, ... (a "not a
// function" error that names them). Names and shapes this file fixes where the TDD leaves them open (task-008 writes to them, task-009 and
// the flows tests call them):
//   - `bundleFileName(workspaceName)` -> `<slug>-bundle.yaml`, the slug being the lowercased name with every run of characters outside
//     `a-z0-9` replaced by `-`, trimmed of `-`, cut at 60 characters, `workspace` when nothing is left (DEC-4: no transliteration).
//   - `readBundleFile(file)` (async; `file` has `size` and `arrayBuffer()`) -> `{ text, problem }`: `problem` is null and `text` the decoded text
//     (fatal UTF-8, a leading byte-order mark dropped, one inside the text kept), or `text` is '' and `problem` the sentence. A file over
//     BUNDLE_MAX_BYTES by `size` is refused without `arrayBuffer()` being called; invalid UTF-8 is `The file is not UTF-8 text.`
//   - `fetchSampleBundle(id)` (async) -> `{ files: [{ path, bytes }], problem }`: the sample unbundled, or no file and `problem` the whole
//     sentence `The <Name> sample could not be loaded: <reason>. Check your connection and try again.`; it never rejects.
//   - `bundleProblemsSentence(problems)` -> `The file cannot be imported: ` and the first three sentences joined by `; `, then ` (and N more)`.
//   - `bundleImportName(files, fileName)` -> the name an import proposes, before it is made unique against the names in the list (DEC-5).
//   - `BROWSER_SAMPLES`: the catalog, `brightcart` -> an entry that holds the name `Brightcart` and the relative URL `samples/brightcart.yaml`.
// Bytes are the page's: no assertion here prints a byte array, and none compares page bytes with a deep-equality assertion or a class test; bytes are
// compared by hash and by length (CON-8).
// Run with: node --test src/test/javascript/viewpoint-kernel/bundle-io.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const vm = require('node:vm');
const { createApp } = require('./harness');

const sha = (bytes) => crypto.createHash('sha256').update(Buffer.from(bytes)).digest('hex');
const shaOfText = (text) => sha(Buffer.from(text, 'utf8'));
const plain = (value) => JSON.parse(JSON.stringify(value)); // for sentences and lists of text; never for bytes
const pageValue = (sandbox, code) => vm.runInContext(code, sandbox);

const SAMPLE_URL = 'samples/brightcart.yaml';
const SENTENCE_START = 'The Brightcart sample could not be loaded: ';
const SENTENCE_END = 'Check your connection and try again.';

// a small workspace with what a bundle has to carry byte for byte: a mark, CRLF, and a line of three dashes
const SAMPLE_FILES = {
  '.archicode.yaml': 'settings:\n  name: Demo\n',
  'manifests/a.yaml': '﻿id: a\r\nnote: x\r\n',
  'manifests/b.yaml': 'one: 1\n---\ntwo: 2\n'
};

const codec = createApp(); // a page of its own, for the bundles the tests serve and the sentences they expect

/** The text of the bundle of `files` (path -> text), made by the page's own codec. */
function bundleOf(files) {
  const list = Object.entries(files).map(([path, text]) => ({
    path,
    bytes: Uint8Array.from(Buffer.from(text, 'utf8'))
  }));
  const result = codec.bundleWorkspaceFiles(list);
  assert.equal(result.skipped.length, 0, 'the files of the test are all carried');
  return result.text;
}

/** An answer of the fake fetch: what a browser's Response gives the page, as plain data. */
function answer(status, body) {
  const bytes = Buffer.isBuffer(body) ? body : Buffer.from(body === undefined ? '' : body, 'utf8');
  const buffer = () => {
    const copy = new Uint8Array(bytes.length);
    copy.set(bytes);
    return copy.buffer;
  };
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 404 ? 'Not Found' : status === 200 ? 'OK' : 'Error',
    headers: { get: () => null },
    arrayBuffer: async () => buffer(),
    text: async () => bytes.toString('utf8')
  };
}

/** A page whose `fetch` is logged and answers with `respond(url, init)`; `served` makes it a page served by `archicode editor serve`. */
function pageWithFetch(respond, served = false) {
  const requests = [];
  const fetch = async (url, init) => {
    const headers = {};
    for (const [key, value] of Object.entries((init && init.headers) || {})) headers[key.toLowerCase()] = value;
    requests.push({
      url: String(url),
      method: init && init.method ? String(init.method).toUpperCase() : 'GET',
      cache: init ? init.cache : undefined,
      headers
    });
    return respond(String(url), init);
  };
  const sandbox = createApp(served ? { serverToken: 'token-1', fetch } : { withFile: true, fetch });
  sandbox.console.error = () => {};
  return { sandbox, requests };
}

/** What the page makes of a stub file: `arrayBuffer` is counted so that "never read" can be asserted. */
function stubFile(content, claimedSize) {
  const bytes = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf8');
  const file = {
    name: 'picked.yaml',
    size: claimedSize === undefined ? bytes.length : claimedSize,
    reads: 0,
    arrayBuffer: async () => {
      file.reads += 1;
      const copy = new Uint8Array(bytes.length);
      copy.set(bytes);
      return copy.buffer;
    }
  };
  return file;
}

// ---- the catalog ----

test('the catalog of samples has the Brightcart sample, its name and its relative address', () => {
  const sandbox = createApp();
  const catalog = pageValue(sandbox, 'BROWSER_SAMPLES');
  assert.deepEqual(plain(Object.keys(catalog)), ['brightcart', 'archicode']);
  const values = Object.values(plain(catalog.brightcart));
  assert.ok(values.includes('Brightcart'), 'the name');
  assert.ok(values.includes(SAMPLE_URL), 'the relative URL, the same on the site and on `editor serve`');
});

// ---- bundleFileName ----

test('bundleFileName: the name of the workspace in lowercase, symbols as dashes, then -bundle.yaml', () => {
  const sandbox = createApp();
  assert.equal(sandbox.bundleFileName('Brightcart'), 'brightcart-bundle.yaml');
  assert.equal(sandbox.bundleFileName('Sample 2'), 'sample-2-bundle.yaml');
  assert.equal(
    sandbox.bundleFileName('My   Shop  /  v2'),
    'my-shop-v2-bundle.yaml',
    'a run of spaces and symbols is one dash'
  );
  assert.equal(sandbox.bundleFileName('  --Shop!! '), 'shop-bundle.yaml', 'dashes at the ends are trimmed');
});

test('bundleFileName: an accent is a symbol, as the TDD says (no transliteration), and a name with no letter is `workspace`', () => {
  const sandbox = createApp();
  assert.equal(sandbox.bundleFileName('Café Crème'), 'caf-cr-me-bundle.yaml');
  assert.equal(sandbox.bundleFileName('Écoute'), 'coute-bundle.yaml');
  assert.equal(sandbox.bundleFileName('???'), 'workspace-bundle.yaml');
  assert.equal(sandbox.bundleFileName('éé'), 'workspace-bundle.yaml');
  assert.equal(sandbox.bundleFileName('日本語'), 'workspace-bundle.yaml');
  assert.equal(sandbox.bundleFileName(''), 'workspace-bundle.yaml');
});

test('bundleFileName: the slug is at most 60 characters', () => {
  const sandbox = createApp();
  assert.equal(sandbox.bundleFileName('a'.repeat(60)), 'a'.repeat(60) + '-bundle.yaml');
  assert.equal(sandbox.bundleFileName('a'.repeat(61)), 'a'.repeat(60) + '-bundle.yaml');
  assert.equal(sandbox.bundleFileName('a'.repeat(80)), 'a'.repeat(60) + '-bundle.yaml');
  assert.equal(sandbox.bundleFileName('B'.repeat(80)), 'b'.repeat(60) + '-bundle.yaml', 'lowercase first');
});

// ---- readBundleFile ----

test('readBundleFile: a good file is its text, whole', async () => {
  const sandbox = createApp();
  const text = bundleOf(SAMPLE_FILES);
  const file = stubFile(text);

  const read = await sandbox.readBundleFile(file);

  assert.equal(read.problem, null);
  assert.equal(read.text, text);
  assert.equal(file.reads, 1);
});

test('readBundleFile: a file over the limit by its size is refused without being read', async () => {
  const sandbox = createApp();
  const limit = pageValue(sandbox, 'BUNDLE_MAX_BYTES');
  const file = stubFile('--- # file: a.yaml\nid: a\n', limit + 1);

  const read = await sandbox.readBundleFile(file);

  assert.equal(file.reads, 0, 'the bytes were never asked for');
  assert.equal(read.text, '');
  assert.equal(typeof read.problem, 'string');
  assert.ok(read.problem.includes(String(limit)), 'the sentence says the limit');
  assert.ok(read.problem.includes(String(limit + 1)), 'and the size of the file');
});

test('readBundleFile: a file of exactly the limit is not over it', async () => {
  const sandbox = createApp();
  const limit = pageValue(sandbox, 'BUNDLE_MAX_BYTES');
  const file = stubFile('--- # file: a.yaml\nid: a\n', limit);

  const read = await sandbox.readBundleFile(file);

  assert.equal(file.reads, 1);
  assert.equal(read.problem, null);
});

test('readBundleFile: bytes that are not UTF-8 are refused, not repaired with a replacement character', async () => {
  const sandbox = createApp();
  const file = stubFile(
    Buffer.concat([Buffer.from('--- # file: a.yaml\nid: '), Buffer.from([0xff, 0xfe, 0x80]), Buffer.from('\n')])
  );

  const read = await sandbox.readBundleFile(file);

  assert.equal(read.text, '');
  assert.equal(read.problem, 'The file is not UTF-8 text.');
});

test('readBundleFile: a leading byte-order mark is dropped, one inside the bundle stays', async () => {
  const sandbox = createApp();
  const body = '--- # file: a.yaml\n﻿id: a\r\n';
  const withMark = stubFile(Buffer.concat([Buffer.from([0xef, 0xbb, 0xbf]), Buffer.from(body, 'utf8')]));

  const read = await sandbox.readBundleFile(withMark);

  assert.equal(read.problem, null);
  assert.equal(read.text, body, 'the mark of the file is gone, the mark of the file inside the bundle is its own');
  const unbundled = sandbox.unbundleWorkspaceFiles(read.text);
  assert.deepEqual(plain(unbundled.problems), []);
  assert.equal(sha(unbundled.files[0].bytes), shaOfText('﻿id: a\r\n'));
});

// ---- fetchSampleBundle ----

test('fetchSampleBundle: a good answer is the sample unbundled, byte for byte, from the relative address', async () => {
  const { sandbox, requests } = pageWithFetch(() => answer(200, bundleOf(SAMPLE_FILES)));

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.problem, null);
  assert.deepEqual(plain(Array.from(result.files, (file) => file.path)), Object.keys(SAMPLE_FILES).sort());
  for (const file of result.files) {
    assert.equal(file.bytes.length, Buffer.byteLength(SAMPLE_FILES[file.path], 'utf8'), 'the length of ' + file.path);
    assert.equal(sha(file.bytes), shaOfText(SAMPLE_FILES[file.path]), 'the bytes of ' + file.path);
  }
  assert.equal(requests.length, 1, 'one request');
});

test('fetchSampleBundle: the request is a GET of samples/brightcart.yaml that skips the cache and sends no token on the hosted page', async () => {
  const { sandbox, requests } = pageWithFetch(() => answer(200, 'unused'));

  await sandbox.fetchSampleBundle('brightcart');

  assert.equal(requests.length, 1);
  assert.equal(
    requests[0].url,
    SAMPLE_URL,
    'relative, so it works under /editor/ on the site and at / on `editor serve`'
  );
  assert.equal(requests[0].method, 'GET');
  assert.equal(requests[0].cache, 'no-cache');
  assert.equal('x-archicode-token' in requests[0].headers, false, 'a hosted page has no token and sends none');
});

test('fetchSampleBundle: on a page served by `editor serve` the request carries the token of the server', async () => {
  const { sandbox, requests } = pageWithFetch(() => answer(200, 'unused'), true);

  await sandbox.fetchSampleBundle('brightcart');

  assert.equal(requests.length, 1);
  assert.equal(requests[0].url, SAMPLE_URL);
  assert.equal(requests[0].cache, 'no-cache');
  assert.equal(requests[0].headers['x-archicode-token'], 'token-1');
});

/** The whole sentence of a failure, checked at both ends, and the reason between them returned. */
function reasonOf(problem) {
  assert.equal(typeof problem, 'string');
  assert.ok(problem.startsWith(SENTENCE_START), 'begins with: ' + SENTENCE_START);
  assert.ok(problem.endsWith(SENTENCE_END), 'ends with: ' + SENTENCE_END);
  return problem.slice(SENTENCE_START.length, problem.length - SENTENCE_END.length);
}

test('fetchSampleBundle: a 404 is the sentence, with the status, and no file', async () => {
  const { sandbox } = pageWithFetch(() => answer(404, 'nothing here'));

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.ok(reasonOf(result.problem).includes('404'));
});

test('fetchSampleBundle: a fetch that rejects is turned into the sentence, with the reason, never thrown', async () => {
  const { sandbox } = pageWithFetch(() => Promise.reject(new TypeError('network down')));

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.ok(reasonOf(result.problem).includes('network down'));
});

test('fetchSampleBundle: a fetch that throws at once is turned into the sentence too', async () => {
  const { sandbox } = pageWithFetch(() => {
    throw new Error('blocked by the browser');
  });

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.ok(reasonOf(result.problem).includes('blocked by the browser'));
});

test('fetchSampleBundle: an empty body is the sentence', async () => {
  const { sandbox } = pageWithFetch(() => answer(200, ''));

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.match(reasonOf(result.problem), /empty/);
});

test('fetchSampleBundle: bytes that are not UTF-8 are the sentence, as for a file the visitor chooses', async () => {
  const { sandbox } = pageWithFetch(() => answer(200, Buffer.from([0x2d, 0x2d, 0x2d, 0xff, 0xfe, 0x0a])));

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.ok(reasonOf(result.problem).length > 0);
});

test('fetchSampleBundle: a body that does not unbundle is the sentence, with the first thing the codec says', async () => {
  const body = 'this is a web page, not a bundle\n';
  const { sandbox } = pageWithFetch(() => answer(200, body));
  const refused = codec.unbundleWorkspaceFiles(body);
  assert.ok(refused.problems.length > 0, 'the case is one the codec refuses');

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.ok(reasonOf(result.problem).includes(refused.problems[0]));
});

test('fetchSampleBundle: a bundle with no .archicode.yaml is not a workspace, and the sentence says so', async () => {
  const body = bundleOf({ 'manifests/a.yaml': 'id: a\n', 'manifests/b.yaml': 'id: b\n' });
  const { sandbox } = pageWithFetch(() => answer(200, body));

  const result = await sandbox.fetchSampleBundle('brightcart');

  assert.equal(result.files.length, 0);
  assert.ok(reasonOf(result.problem).includes('.archicode.yaml'));
});

test('fetchSampleBundle: an id that is not in the catalog is a sentence and no request', async () => {
  const { sandbox, requests } = pageWithFetch(() => answer(200, 'unused'));

  const result = await sandbox.fetchSampleBundle('nope');

  assert.equal(result.files.length, 0);
  assert.equal(typeof result.problem, 'string');
  assert.ok(result.problem.length > 0);
  assert.equal(requests.length, 0);
});

// ---- bundleProblemsSentence ----

test('bundleProblemsSentence: one sentence of the codec, then up to three joined, then how many more', () => {
  const sandbox = createApp();
  const make = (count) =>
    Array.from({ length: count }, (_, index) => 'line ' + (index + 1) + ': problem ' + (index + 1));
  const start = 'The file cannot be imported: ';

  assert.equal(sandbox.bundleProblemsSentence(make(1)), start + 'line 1: problem 1');
  assert.equal(sandbox.bundleProblemsSentence(make(2)), start + 'line 1: problem 1; line 2: problem 2');
  assert.equal(
    sandbox.bundleProblemsSentence(make(3)),
    start + 'line 1: problem 1; line 2: problem 2; line 3: problem 3'
  );
  assert.equal(
    sandbox.bundleProblemsSentence(make(7)),
    start + 'line 1: problem 1; line 2: problem 2; line 3: problem 3 (and 4 more)'
  );
  assert.equal(
    sandbox.bundleProblemsSentence(make(4)),
    start + 'line 1: problem 1; line 2: problem 2; line 3: problem 3 (and 1 more)'
  );
});

test('bundleProblemsSentence: the sentences are the codec’s own, whatever it says', () => {
  const sandbox = createApp();
  const refused = sandbox.unbundleWorkspaceFiles('--- # file: ../x.yaml\nid: x\n--- # file: /y.yaml\nid: y\n');
  assert.ok(refused.problems.length >= 2);

  const sentence = sandbox.bundleProblemsSentence(refused.problems);

  assert.equal(sentence, 'The file cannot be imported: ' + Array.from(refused.problems).join('; '));
});

// ---- bundleImportName ----

/** The unbundled files of a workspace whose root `.archicode.yaml` says `rootText`, plus `more` (path -> text). */
function importFiles(rootText, more = {}) {
  const files = Object.entries(Object.assign({}, rootText === null ? {} : { '.archicode.yaml': rootText }, more));
  return files.map(([path, text]) => ({ path, bytes: Uint8Array.from(Buffer.from(text, 'utf8')) }));
}

test('bundleImportName: settings.name of the root .archicode.yaml, when it is a valid name', () => {
  const sandbox = createApp();
  assert.equal(sandbox.bundleImportName(importFiles('settings:\n  name: Shop\n'), 'whatever.yaml'), 'Shop');
  assert.equal(sandbox.bundleImportName(importFiles('settings:\n  name: "Café — v2"\n'), 'x.yaml'), 'Café — v2');
  assert.equal(
    sandbox.bundleImportName(importFiles('settings:\n  name: ' + 'n'.repeat(80) + '\n'), 'x.yaml'),
    'n'.repeat(80)
  );
});

test('bundleImportName: a settings.name that is no valid name falls back to the name of the file', () => {
  const sandbox = createApp();
  const fallback = (text) => sandbox.bundleImportName(importFiles(text), 'my-shop.yaml');
  assert.equal(fallback('settings:\n  name: ' + 'n'.repeat(81) + '\n'), 'my-shop', 'over 80 characters');
  assert.equal(fallback('settings:\n  name: "two\\nlines"\n'), 'my-shop', 'a control character');
  assert.equal(fallback('settings:\n  name: ""\n'), 'my-shop', 'empty');
  assert.equal(fallback('settings:\n  name: "   "\n'), 'my-shop', 'only spaces');
  assert.equal(fallback('settings:\n  name: 5\n'), 'my-shop', 'not a text');
  assert.equal(fallback('settings:\n  name: [a, b]\n'), 'my-shop', 'a list');
  assert.equal(fallback('settings: {}\n'), 'my-shop', 'no name');
  assert.equal(fallback('id: nothing here\n'), 'my-shop', 'no settings');
  assert.equal(fallback(''), 'my-shop', 'an empty file');
});

test('bundleImportName: an error of parseYaml on the root .archicode.yaml is no refusal, it falls back to the file name', () => {
  const sandbox = createApp();
  assert.throws(() => sandbox.parseYaml('settings: ['), 'the case is one parseYaml refuses');
  assert.equal(sandbox.bundleImportName(importFiles('settings: ['), 'broken.yaml'), 'broken');
  assert.equal(sandbox.bundleImportName(importFiles("settings:\n  name: 'never closed\n"), 'broken2.yml'), 'broken2');
});

test('bundleImportName: only the root .archicode.yaml counts', () => {
  const sandbox = createApp();
  const elsewhere = importFiles(null, { 'manifests/x.yaml': 'settings:\n  name: Not This\n' });
  assert.equal(sandbox.bundleImportName(elsewhere, 'shop.yaml'), 'shop');
  const both = importFiles('settings:\n  name: Root\n', { 'manifests/x.yaml': 'settings:\n  name: Not This\n' });
  assert.equal(sandbox.bundleImportName(both, 'shop.yaml'), 'Root');
});

test('bundleImportName: the file name without its extension, then `Imported workspace`', () => {
  const sandbox = createApp();
  const root = importFiles('settings: {}\n');
  assert.equal(sandbox.bundleImportName(root, 'my-shop.yaml'), 'my-shop');
  assert.equal(sandbox.bundleImportName(root, 'my-shop.yml'), 'my-shop');
  assert.equal(sandbox.bundleImportName(root, 'shop.bundle.yaml'), 'shop.bundle', 'only the last extension goes');
  assert.equal(sandbox.bundleImportName(root, 'plain'), 'plain');
  assert.equal(sandbox.bundleImportName(root, '.yaml'), 'Imported workspace', 'nothing is left of the name');
  assert.equal(sandbox.bundleImportName(root, ''), 'Imported workspace');
  assert.equal(sandbox.bundleImportName(root, undefined), 'Imported workspace');
});
