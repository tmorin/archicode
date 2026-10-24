'use strict';
// Wave 023, run 0173 (W-10): the checks the editor's forms make before anything is written, and the question "would reloading this file lose something?".
// They are small functions of the page that no other test called by name; each test below says what the function answers, so a change to a sentence, to the
// trimming or to the order of the checks fails here. Nothing is opened: the page is loaded by the harness and the functions are called on it.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const { createApp } = require('./harness');

const run = (sandbox, code) => vm.runInContext(code, sandbox);
/** The answer of a page function, across the vm boundary, as plain data. */
const plain = (value) => JSON.parse(JSON.stringify(value));

test('a qualifier or an application to add is trimmed, and nothing, a blank or a non-text is refused', () => {
  const sandbox = createApp();
  assert.deepEqual(plain(sandbox.validateNewListEntry('  edge ')), { valid: true, value: 'edge' });
  for (const value of ['', '   \t', undefined, null, 5, {}]) {
    assert.deepEqual(plain(sandbox.validateNewListEntry(value)), { valid: false, error: 'Value is required.' });
  }
});

test('a new tag needs a key that is not blank and is not one of the element’s tags; its spelling is kept and the key is trimmed', () => {
  const sandbox = createApp();
  assert.deepEqual(plain(sandbox.validateNewTagKey(' owner ', { team: 'a' })), { valid: true, key: 'owner' });
  assert.deepEqual(plain(sandbox.validateNewTagKey('owner', undefined)), { valid: true, key: 'owner' });
  assert.deepEqual(
    plain(sandbox.validateNewTagKey('Owner', { owner: 'a' })),
    { valid: true, key: 'Owner' },
    'a key is case sensitive'
  );
  for (const key of ['', '  ', null, 3]) {
    assert.deepEqual(plain(sandbox.validateNewTagKey(key, {})), { valid: false, error: 'Tag key is required.' });
  }
  assert.deepEqual(plain(sandbox.validateNewTagKey(' owner', { owner: 'a' })), {
    valid: false,
    error: 'Tag key "owner" already exists — edit it instead.'
  });
});

test('a tag key that is the name of a property of every object is a key like another: it is free, then taken once it is a tag', () => {
  const sandbox = createApp();
  assert.deepEqual(plain(sandbox.validateNewTagKey('toString', {})), { valid: true, key: 'toString' });
  assert.equal(sandbox.validateNewTagKey('toString', { toString: 'x' }).valid, false);
});

test('the path of an action of a facet is trimmed and cannot be blank', () => {
  const sandbox = createApp();
  assert.deepEqual(plain(sandbox.validateFacetActionDraft("  $..elements[?(@.id == 'a')]  ")), {
    valid: true,
    jsonPath: "$..elements[?(@.id == 'a')]"
  });
  for (const path of ['', ' ', undefined, null, 7]) {
    assert.deepEqual(plain(sandbox.validateFacetActionDraft(path)), { valid: false, error: 'JSON path is required.' });
  }
});

test('a file has unsaved changes when it was edited, when a rejected text waits for it, or when its editor holds other text; a file that is not known has none', () => {
  const sandbox = createApp();
  const state = sandbox.__state();
  state.manifestFiles = [
    { relPath: 'a.yaml', dirty: false, rawText: 'id: a\n' },
    { relPath: 'b.yaml', dirty: true, rawText: 'id: b\n' }
  ];
  const textareaOf = (value) => {
    sandbox.document.getElementById = (id) => (id === 'file-edit-textarea' ? { value } : null);
  };
  assert.equal(sandbox.fileHasUnsavedChanges('nowhere.yaml'), false, 'unknown file');
  assert.equal(sandbox.fileHasUnsavedChanges('a.yaml'), false, 'nothing edited, no editor open');
  assert.equal(sandbox.fileHasUnsavedChanges('b.yaml'), true, 'edited in memory');

  run(sandbox, "rawYamlEditDraft = { relPath: 'a.yaml', text: 'id: ?' };");
  assert.equal(sandbox.fileHasUnsavedChanges('a.yaml'), true, 'a rejected draft waits');
  assert.equal(sandbox.fileHasUnsavedChanges('c.yaml'), false);
  run(sandbox, 'rawYamlEditDraft = null;');

  textareaOf('id: a\n');
  assert.equal(
    sandbox.currentFileEditorText(),
    'id: a\n',
    'the textarea is the editor when there is no CodeMirror view'
  );
  assert.equal(sandbox.fileHasUnsavedChanges('a.yaml'), false, 'the editor holds the text of the file');
  textareaOf('id: changed\n');
  assert.equal(sandbox.fileHasUnsavedChanges('a.yaml'), true, 'text typed and not applied');

  run(sandbox, "activeFileEditorView = { state: { doc: { toString: () => 'id: a\\n' } } };");
  assert.equal(sandbox.currentFileEditorText(), 'id: a\n', 'the live CodeMirror document comes before the textarea');
  assert.equal(sandbox.fileHasUnsavedChanges('a.yaml'), false);
  run(sandbox, 'activeFileEditorView = null;');

  sandbox.document.getElementById = () => null;
  assert.equal(sandbox.currentFileEditorText(), null, 'no file is being edited');
});
