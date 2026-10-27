'use strict';
// The "Confirm delete" block that the form of an element shows while a delete waits for its yes (TDD-0010 DEC-4): what it says of a REMOVE
// patch, of the elements and the manifest files that go with the element, and of the links elsewhere that are removed with it.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');
const { memFolder } = require('./mem-folder');

const HEADER = (kind) => 'header:\n  kind: "archicode.morin.io/' + kind + '"\n  version: "1"\n';
const FILES = {
  '.archicode.yaml': 'settings:\n  manifests:\n    paths: [m]\n',
  'm/s.yaml': HEADER('system') + 'content:\n  id: s\n'
};

async function open() {
  const mem = memFolder(FILES);
  const sandbox = createApp({});
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return sandbox;
}

/** The block of the form for `s` while the given delete waits for its yes. */
function confirmationOf(sandbox, pending) {
  vm.runInContext('pendingDeleteConfirmation = ' + JSON.stringify({ reference: 's', ...pending }), sandbox);
  const html = sandbox.renderElementEditionFormHtml('s');
  const start = html.indexOf('<div class="edition-section delete-confirmation">');
  assert.ok(start >= 0, 'the form shows the confirmation of the delete');
  return html.slice(start, html.indexOf('data-action="confirm-delete-element"', start));
}

test('a delete that affects nothing else says so and offers Cancel and Confirm delete', async () => {
  const sandbox = await open();
  const block = confirmationOf(sandbox, { affected: [] });
  assert.match(block, /<h3>Confirm delete<\/h3>/);
  assert.match(block, /No other relationship is affected\./);
  assert.match(block, /data-action="cancel-delete-element">Cancel<\/button>/);
  assert.doesNotMatch(block, /This also deletes/);
  assert.doesNotMatch(block, /manifest file/);
  assert.doesNotMatch(block, /delete-removal/);
});

test('a delete of an inherited element says it adds a REMOVE patch to the plateau', async () => {
  const sandbox = await open();
  const block = confirmationOf(sandbox, { affected: [], removal: { plateau: 'to-be', declaredIn: 'm/s.yaml' } });
  assert.match(block, /This adds a <code>REMOVE<\/code> patch to the plateau <code>to-be<\/code>/);
  assert.match(block, /The element stays in <code>m\/s\.yaml<\/code>/);
});

test('the elements nested inside are listed, with the singular for one and the plural for more', async () => {
  const sandbox = await open();
  const one = confirmationOf(sandbox, { affected: [], deletedReferences: ['s', 's.a'] });
  assert.match(one, /This also deletes 1 element inside it:/);
  assert.match(one, /<li>s\.a<\/li>/);
  assert.doesNotMatch(one, /<li>s<\/li>/, 'the element itself is not listed among those inside it');
  const two = confirmationOf(sandbox, { affected: [], deletedReferences: ['s', 's.a', 's.b'] });
  assert.match(two, /This also deletes 2 elements inside it:/);
  assert.match(two, /<li>s\.a<\/li><li>s\.b<\/li>/);
});

test('the manifest files that go are listed, one or several', async () => {
  const sandbox = await open();
  const one = confirmationOf(sandbox, { affected: [], files: ['m/s.yaml'] });
  assert.match(one, /This manifest file is removed when you save:/);
  assert.match(one, /<li>m\/s\.yaml<\/li>/);
  const two = confirmationOf(sandbox, { affected: [], files: ['m/s.yaml', 'm/t.yaml'] });
  assert.match(two, /These 2 manifest files are removed when you save:/);
  assert.match(two, /<li>m\/s\.yaml<\/li><li>m\/t\.yaml<\/li>/);
});

test('the links elsewhere that point at what goes are listed with their owner, label and destination', async () => {
  const sandbox = await open();
  const block = confirmationOf(sandbox, {
    affected: [{ ownerSourceFile: 'm/c.yaml', ownerReference: 'c', label: 'uses <it>', destination: 's' }]
  });
  assert.match(block, /These links elsewhere point at what is deleted, and are removed with it:/);
  assert.match(block, /<li>m\/c\.yaml \(c\): uses &lt;it&gt; &rarr; s<\/li>/);
  assert.doesNotMatch(block, /No other relationship is affected/);
});

test('a delete waiting for another element shows no confirmation in this form', async () => {
  const sandbox = await open();
  vm.runInContext("pendingDeleteConfirmation = { reference: 'other', affected: [] }", sandbox);
  assert.doesNotMatch(sandbox.renderElementEditionFormHtml('s'), /delete-confirmation/);
});
