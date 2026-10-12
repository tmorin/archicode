'use strict';
// The presentation page at the root of the published site: its links to the manual and to the editor must land somewhere.
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const PAGE = fs.readFileSync(path.resolve(__dirname, '../../site/index.html'), 'utf8');
const MANUAL = fs.readFileSync(path.resolve(__dirname, '../../doc/README.adoc'), 'utf8');

const STAMPED = ['../../site/index.html', '../../main/resources/editor-webapp/standalone.html'];

test('the pages that the CI stamps with the release carry the stamp it replaces, once', () => {
  for (const file of STAMPED) {
    const text = fs.readFileSync(path.resolve(__dirname, file), 'utf8');
    assert.equal(text.split('<meta name="archicode-version" content="dev">').length - 1, 1, file);
  }
});

/** Open the page at `hash` with the inline script of its head, and say where it was sent. */
function open(hash) {
  const script = PAGE.match(/<script>([\s\S]*?)<\/script>/)[1];
  const ids = new Set([...PAGE.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  const sent = [];
  const loaded = [];
  const document = {
    documentElement: {},
    getElementById: (id) => (ids.has(id) ? {} : null),
    addEventListener: (name, listener) => loaded.push(listener),
  };
  vm.runInNewContext(script, { document, location: { hash, replace: (url) => sent.push(url) } });
  loaded.forEach((listener) => listener());
  return sent;
}

test('a link to an anchor of the old manual is sent to the same anchor of docs/, an anchor of the page stays', () => {
  assert.deepEqual(open('#editor-map'), ['docs/#editor-map']);
  assert.deepEqual(open('#_domain'), ['docs/#_domain']);
  assert.deepEqual(open('#problem'), []);
  assert.deepEqual(open(''), []);
});

test('a malformed hash neither throws nor sends anywhere', () => {
  assert.deepEqual(open('#%'), []);
  assert.deepEqual(open('#%E0%A4%A'), []);
});

test('every link into the manual is the manual itself, or an anchor that the manual writes', () => {
  const hrefs = [...PAGE.matchAll(/href="docs\/([^"]*)"/g)].map((match) => match[1]);
  assert.ok(hrefs.length >= 1);
  for (const href of hrefs) {
    if (href === '') continue;
    assert.match(href, /^#[a-z-]+$/, href);
    assert.ok(MANUAL.includes('[[' + href.slice(1) + ']]'), 'the manual has no [[' + href.slice(1) + ']] anchor');
  }
});

test('every anchor of the page points at an id of the page', () => {
  const ids = new Set([...PAGE.matchAll(/\sid="([^"]+)"/g)].map((match) => match[1]));
  for (const [, anchor] of PAGE.matchAll(/href="#([^"]+)"/g)) assert.ok(ids.has(anchor), '#' + anchor);
});

test('the page links to the editor, which is published next to it', () => {
  assert.ok(PAGE.includes('href="editor/"'));
});

test('the footer shows the version that the release stamps into the page, and nothing for a development build', () => {
  const script = PAGE.slice(PAGE.lastIndexOf('<script>') + 8, PAGE.lastIndexOf('</script>'));
  const show = (version) => {
    const footer = { textContent: '' };
    vm.runInNewContext(script, {
      document: {
        querySelector: () => ({ getAttribute: () => version }),
        getElementById: () => footer,
        querySelectorAll: () => [],
      },
    });
    return footer.textContent;
  };
  assert.equal(show('1.2.3'), ' · v1.2.3');
  assert.equal(show('dev'), '');
});

test('the links to docs/ and editor/ are the folders that the CI assembles', () => {
  const workflow = fs.readFileSync(path.resolve(__dirname, '../../../.github/workflows/ci-build.yaml'), 'utf8');
  for (const target of ['target/site/index.html', 'target/site/docs/', 'target/site/editor/index.html']) {
    assert.ok(workflow.includes(target), 'the "Assemble website" step has no ' + target);
  }
});
