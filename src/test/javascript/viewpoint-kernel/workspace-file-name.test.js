'use strict';
// The workspace file is `.archicode.yaml`, with no alias (wave 019, run 0144, #133, decision T9). A folder that holds `workspace.yaml` and no
// `.archicode.yaml` is told with one sentence, the same as the command line's word for word; the cases are in workspace-file-name-cases.json,
// which the command line runs too (WorkspaceFileNameTest.java). Wave 020, run 0147 (#146): the failures are typed (`fatalErrorKind`), and the landing card and the list of
// the remembered folders read the type, not a file name found in a message.
// Run with: node --test "src/test/javascript/**/*.test.js"
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { createApp, fakeIndexedDB } = require('./harness');
const { memFolder } = require('./mem-folder');

const DOCUMENT = JSON.parse(fs.readFileSync(path.join(__dirname, 'workspace-file-name-cases.json'), 'utf8'));

/** A page in a browser that can pick folders (otherwise the landing card is the "unsupported" one). */
function app() {
  const sandbox = createApp({ indexedDB: fakeIndexedDB() });
  sandbox.console.error = () => {};
  sandbox.window.showDirectoryPicker = async () => null;
  return sandbox;
}

async function open(files, directories) {
  const mem = memFolder(files);
  for (const directory of directories || []) mem.mkdir(directory);
  const sandbox = app();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  return { sandbox, state };
}

// what the page keeps of each kind of failure, the same names as `expect.failure` (wave 020, run 0147, #146)
const KIND_OF_FAILURE = { unreadable: 'unreadable', renamed: 'renamed', content: null };

for (const c of DOCUMENT.cases) {
  test(c.id + ': ' + c.what, async () => {
    const { sandbox, state } = await open(c.files, c.directories);
    if (c.expect.error !== undefined) {
      assert.equal(state.fatalError, c.expect.error.replace('${sentence}', DOCUMENT.sentence));
      assert.equal(state.workspace, null);
    } else if (c.expect.loads) {
      assert.equal(state.fatalError, null);
      assert.equal(state.fatalErrorKind, null);
      assert.ok(state.workspace);
    }
    if (c.expect.failure) {
      assert.ok(state.fatalError, 'the folder does not open');
      assert.equal(state.workspace, null);
      assert.equal(state.fatalErrorKind, KIND_OF_FAILURE[c.expect.failure]);
      const card = sandbox.landingScreenConfig();
      assert.equal(card.kind, 'error');
      if (c.expect.failure === 'unreadable') {
        assert.equal(card.text, '.archicode.yaml could not be read in “ws”.');
        assert.equal(card.error, state.fatalError);
        assert.match(card.hint, /^Choose the workspace root/);
      } else {
        // the sentence as it is: the former name, or what is wrong with the file, whichever file name it holds
        assert.equal(card.text, state.fatalError);
        assert.equal(card.error, null);
        assert.equal(card.hint, null);
      }
    }
  });
}

test('a folder with neither file is the error it always was, not the sentence', async () => {
  const { state } = await open({ 'notes.yaml': 'a: 1\n' });
  assert.match(state.fatalError, /^Could not read\/parse \.archicode\.yaml: /);
});

test('a workspace file the browser refuses to give is the unreadable failure, with the message of the refusal', async () => {
  const mem = memFolder({ '.archicode.yaml': 'settings: {}\n' });
  mem.failGetFile = 'NotAllowedError: the file cannot be read';
  const sandbox = app();
  const state = sandbox.__state();
  state.folder = { handle: mem.handle, name: 'ws' };
  state.permissionState = 'granted';
  await sandbox.loadWorkspace(mem.handle);
  assert.equal(state.fatalError, 'Could not read/parse .archicode.yaml: NotAllowedError: the file cannot be read');
  assert.equal(state.fatalErrorKind, 'unreadable');
  assert.equal(sandbox.landingScreenConfig().text, '.archicode.yaml could not be read in “ws”.');
});

test('the card reads the type of the failure, not the words: a message that names the file for another reason is told as it is', () => {
  const sandbox = app();
  const state = sandbox.__state();
  state.folder = { name: 'ws' };
  // the same words, one with the type and one without
  sandbox.setFatalError('Could not read/parse .archicode.yaml: unknown key `foo` at `settings.foo`');
  let card = sandbox.landingScreenConfig();
  assert.equal(card.text, state.fatalError);
  assert.equal(card.error, null);
  assert.equal(card.hint, null);
  sandbox.setFatalError('Could not read/parse .archicode.yaml: unknown key `foo` at `settings.foo`', 'unreadable');
  card = sandbox.landingScreenConfig();
  assert.equal(card.text, '.archicode.yaml could not be read in “ws”.');
  assert.equal(card.error, state.fatalError);
  // no file name in the message at all: the type is what words it
  sandbox.setFatalError('NotAllowedError', 'unreadable');
  assert.equal(sandbox.landingScreenConfig().text, '.archicode.yaml could not be read in “ws”.');
  // the sentence of the former name is not an exception to an equality test any more: it is its own type
  sandbox.setFatalError(DOCUMENT.sentence, 'renamed');
  card = sandbox.landingScreenConfig();
  assert.equal(card.text, DOCUMENT.sentence);
  assert.equal(card.error, null);
  sandbox.setFatalError(DOCUMENT.sentence);
  assert.equal(sandbox.landingScreenConfig().text, DOCUMENT.sentence, 'no type, no rewording');
  // a new failure clears the type of the last one
  sandbox.setFatalError('Failed to open folder: x');
  assert.equal(state.fatalErrorKind, null);
  sandbox.setFatalError(null);
  assert.equal(state.fatalError, null);
  assert.equal(state.fatalErrorKind, null);
});
